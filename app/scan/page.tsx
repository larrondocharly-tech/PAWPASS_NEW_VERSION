"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabaseClient";

// Scanner normal (achats)
import ScanPageClient from "./ScanPageClient";

// Redeem modal
import RedeemCouponModal from "../redeem/RedeemCouponModal";

type MerchantLite = {
  id: string;
  name: string;
};

function format2(n: number) {
  return n.toLocaleString("fr-FR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

/**
 * Wrapper: décide quel mode afficher, sans casser les hooks.
 */
export default function ScanPage() {
  const search = useSearchParams();
  const mode = (search.get("mode") || "").toLowerCase();
  const isRedeem = mode === "redeem";

  // ✅ aucun hook conditionnel : on choisit juste quel composant render
  return isRedeem ? <RedeemScanPage /> : <ScanPageClient />;
}

/**
 * Mode Redeem uniquement (avec tous ses hooks à l’intérieur).
 */
function RedeemScanPage() {
  const router = useRouter();
  const search = useSearchParams();
  const supabase = useMemo(() => createClient(), []);

  const token = search.get("m") || search.get("code") || "";
  const scanFlag = search.get("scan") === "1";

  const [forceScan, setForceScan] = useState(false);

  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [merchant, setMerchant] = useState<MerchantLite | null>(null);

  // Étape 1
  const [discountEur, setDiscountEur] = useState<number>(0);
  const [busyCoupon, setBusyCoupon] = useState(false);

  // Modal coupon
  const [couponOpen, setCouponOpen] = useState(false);
  const [couponId, setCouponId] = useState<string | null>(null);
  const [couponExpiresAt, setCouponExpiresAt] = useState<string>("");

  const canGenerate = useMemo(() => {
    return !!merchant && discountEur > 0 && Number.isFinite(discountEur);
  }, [merchant, discountEur]);

  useEffect(() => {
    let cancelled = false;

    const run = async () => {
      try {
        setLoading(true);
        setErr(null);
        setForceScan(false);

        // Si on arrive via /scan?mode=redeem&scan=1 SANS token:
        // => on renvoie vers /scan normal (ta caméra) et il devra rediriger ensuite.
        if (!token) {
          if (scanFlag) {
            setForceScan(true);
            return;
          }
          setErr("QR manquant. Re-scanner le QR commerçant.");
          return;
        }

        // login
        const { data: u } = await supabase.auth.getUser();
        if (!u?.user) {
          setErr("Connecte-toi pour utiliser tes crédits.");
          return;
        }

        let found: MerchantLite | null = null;

        // 1) RPC
        const rpcTry = await supabase.rpc("merchant_lookup_by_qr_token", {
          p_token: token,
        });

        if (!rpcTry.error && rpcTry.data) {
          const m = Array.isArray(rpcTry.data) ? rpcTry.data[0] : rpcTry.data;
          if (m?.id && m?.name) found = { id: m.id, name: m.name };
        }

        // 2) fallback merchants.qr_token
        if (!found) {
          const q1 = await supabase
            .from("merchants")
            .select("id, name")
            .eq("qr_token", token)
            .maybeSingle();

          if (!q1.error && q1.data?.id) {
            found = { id: q1.data.id, name: q1.data.name };
          }
        }

        // 3) fallback merchants.code
        if (!found) {
          const q2 = await supabase
            .from("merchants")
            .select("id, name")
            .eq("code", token)
            .maybeSingle();

          if (!q2.error && q2.data?.id) {
            found = { id: q2.data.id, name: q2.data.name };
          }
        }

        if (!found) {
          setErr("Commerce introuvable pour ce QR. Vérifie le code ou le mapping merchant.");
          return;
        }

        if (!cancelled) setMerchant(found);
      } catch (e: any) {
        if (!cancelled) setErr(e?.message || "Erreur scan redeem");
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    run();
    return () => {
      cancelled = true;
    };
  }, [token, scanFlag, supabase]);

  // Redirection vers le scanner normal si scan=1 sans token
  useEffect(() => {
    if (!forceScan) return;
    router.push("/scan"); // scanner normal
  }, [forceScan, router]);

  const generateCoupon = async () => {
    if (!merchant) return;
    if (!canGenerate) return;

    setBusyCoupon(true);
    setErr(null);

    try {
      const { data, error } = await supabase.rpc("create_redeem_coupon", {
        p_merchant_id: merchant.id,
        p_requested_discount_eur: discountEur,
        p_merchant_name: merchant.name,
        p_qr_token: token,
      });

      if (error) throw error;

      const id = data as string;
      setCouponId(id);

      const { data: c, error: cErr } = await supabase
        .from("redeem_coupons")
        .select("expires_at")
        .eq("id", id)
        .maybeSingle();

      if (cErr) throw cErr;

      setCouponExpiresAt(
        c?.expires_at ?? new Date(Date.now() + 5 * 60 * 1000).toISOString()
      );
      setCouponOpen(true);
    } catch (e: any) {
      setErr(e?.message || "Erreur génération coupon");
    } finally {
      setBusyCoupon(false);
    }
  };

  const confirmCoupon = async () => {
    if (!couponId) return;

    const { error } = await supabase.rpc("confirm_redeem_coupon", {
      p_coupon_id: couponId,
    });

    if (error) {
      setErr(error.message);
      return;
    }

    router.push(`/redeem/${couponId}`);
    router.refresh();
  };

  // UI loading
  if (loading) {
    return (
      <div style={{ maxWidth: 760, margin: "0 auto", padding: 16 }}>
        <div
          style={{
            padding: 16,
            borderRadius: 16,
            background: "rgba(255,255,255,0.92)",
            border: "1px solid rgba(0,0,0,0.06)",
          }}
        >
          Chargement...
        </div>
      </div>
    );
  }

  // On laisse l’effet de redirection faire le job
  if (forceScan) return null;

  // UI error
  if (err) {
    return (
      <div style={{ maxWidth: 760, margin: "0 auto", padding: 16 }}>
        <div
          style={{
            padding: 16,
            borderRadius: 16,
            background: "rgba(255,255,255,0.92)",
            border: "1px solid rgba(0,0,0,0.06)",
          }}
        >
          <div style={{ fontWeight: 950, color: "#b91c1c" }}>{err}</div>

          <div style={{ marginTop: 10, display: "flex", gap: 10, flexWrap: "wrap" }}>
            <button
              onClick={() => router.push("/dashboard")}
              style={{
                padding: "10px 14px",
                borderRadius: 12,
                border: "none",
                background: "#111827",
                color: "#fff",
                fontWeight: 900,
                cursor: "pointer",
              }}
            >
              Retour dashboard
            </button>

            <button
              onClick={() => router.push("/scan?mode=redeem&scan=1")}
              style={{
                padding: "10px 14px",
                borderRadius: 12,
                border: "1px solid rgba(0,0,0,0.12)",
                background: "#fff",
                color: "#111827",
                fontWeight: 900,
                cursor: "pointer",
              }}
            >
              Re-scanner
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!merchant) return null;

  return (
    <div style={{ maxWidth: 760, margin: "0 auto", padding: 16 }}>
      <div
        style={{
          padding: 16,
          borderRadius: 18,
          background: "rgba(255,255,255,0.92)",
          border: "1px solid rgba(0,0,0,0.06)",
          boxShadow: "0 18px 40px rgba(0,0,0,0.08)",
        }}
      >
        <div style={{ fontSize: 12, fontWeight: 950, color: "#fb7185", letterSpacing: "0.08em" }}>
          RÉDUCTION INSTANTANÉE — ÉTAPE 1
        </div>

        <div style={{ fontSize: 22, fontWeight: 950, color: "#111827" }}>
          Générer un coupon de réduction
        </div>

        <div
          style={{
            marginTop: 10,
            padding: 12,
            borderRadius: 14,
            border: "1px solid rgba(0,0,0,0.08)",
            background: "#fff",
          }}
        >
          <div style={{ fontWeight: 900, color: "#111827" }}>{merchant.name}</div>
          <div style={{ marginTop: 4, fontSize: 12, color: "#6b7280" }}>QR : {token}</div>
        </div>

        <div style={{ marginTop: 14, display: "grid", gap: 12 }}>
          <label style={{ display: "grid", gap: 6 }}>
            <div style={{ fontSize: 13, fontWeight: 900, color: "#111827" }}>
              Montant de la réduction demandée (€)
            </div>

            <input
              type="number"
              step="0.01"
              value={Number.isFinite(discountEur) ? discountEur : 0}
              onChange={(e) => setDiscountEur(Number(e.target.value))}
              placeholder="Ex : 2"
              style={{
                width: "100%",
                padding: "10px 12px",
                borderRadius: 12,
                border: "1px solid rgba(0,0,0,0.12)",
              }}
            />

            <div style={{ fontSize: 12, color: "#6b7280" }}>
              Le commerçant verra le coupon + un timer de 5 minutes.
            </div>
          </label>

          <button
            type="button"
            onClick={generateCoupon}
            disabled={!canGenerate || busyCoupon}
            style={{
              width: "100%",
              padding: "12px 14px",
              borderRadius: 14,
              border: "none",
              background: !canGenerate ? "#e5e7eb" : "#111827",
              color: !canGenerate ? "#6b7280" : "#fff",
              fontWeight: 950,
              cursor: !canGenerate || busyCoupon ? "not-allowed" : "pointer",
            }}
          >
            {busyCoupon ? "Génération..." : `Générer mon coupon (${format2(discountEur || 0)} €)`}
          </button>

          <button
            type="button"
            onClick={() => router.push("/dashboard")}
            style={{
              width: "100%",
              padding: "10px 14px",
              borderRadius: 14,
              border: "1px solid rgba(0,0,0,0.12)",
              background: "#fff",
              color: "#111827",
              fontWeight: 900,
              cursor: "pointer",
            }}
          >
            Annuler
          </button>
        </div>
      </div>

      <RedeemCouponModal
        open={couponOpen}
        onClose={() => setCouponOpen(false)}
        onConfirm={confirmCoupon}
        merchantName={merchant.name}
        discountEur={discountEur}
        expiresAtIso={couponExpiresAt}
      />
    </div>
  );
}
