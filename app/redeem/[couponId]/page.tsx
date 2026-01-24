"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabaseClient";

type Spa = { id: string; name: string };

export default function RedeemFinalizePage() {
  const params = useParams<{ couponId: string }>();
  const couponId = params?.couponId;
  const router = useRouter();
  const supabase = createClient();

  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  const [merchantName, setMerchantName] = useState<string>("Commerce");
  const [expiresAt, setExpiresAt] = useState<string>("");

  const [remaining, setRemaining] = useState<number>(0);
  const [spas, setSpas] = useState<Spa[]>([]);
  const [spaId, setSpaId] = useState<string>("");
  const [donPct, setDonPct] = useState<50 | 100>(50);
  const [saving, setSaving] = useState(false);

  const expired = useMemo(() => {
    if (!expiresAt) return false;
    return new Date(expiresAt).getTime() <= Date.now();
  }, [expiresAt]);

  useEffect(() => {
    const run = async () => {
      try {
        setLoading(true);
        setErr(null);

        const { data: coupon, error: cErr } = await supabase
          .from("redeem_coupons")
          .select("id, status, merchant_name, expires_at")
          .eq("id", couponId)
          .maybeSingle();

        if (cErr) throw cErr;
        if (!coupon) {
          setErr("Coupon introuvable.");
          return;
        }

        setMerchantName(coupon.merchant_name || "Commerce");
        setExpiresAt(coupon.expires_at);

        if (coupon.status !== "confirmed") {
          setErr("Coupon non validé. Reviens à l’étape précédente.");
          return;
        }

        const { data: spasData, error: sErr } = await supabase
          .from("spas")
          .select("id, name")
          .order("name", { ascending: true });

        if (sErr) throw sErr;

        const list = (spasData || []).map((x: any) => ({ id: x.id, name: x.name }));
        setSpas(list);
        if (list[0]?.id) setSpaId(list[0].id);
      } catch (e: any) {
        setErr(e?.message || "Erreur inconnue");
      } finally {
        setLoading(false);
      }
    };

    if (couponId) run();
  }, [couponId, supabase]);

  const finalize = async () => {
    if (!couponId) return;

    if (!spaId) {
      setErr("Choisis une SPA.");
      return;
    }
    if (remaining < 0) {
      setErr("Le reste à payer ne peut pas être négatif.");
      return;
    }
    if (expired) {
      setErr("Coupon expiré. Rescan le QR et recommence.");
      return;
    }

    setSaving(true);
    setErr(null);

    try {
      const { error: upErr } = await supabase
        .from("redeem_coupons")
        .update({
          remaining_to_pay_eur: remaining,
          spa_id: spaId,
          donation_percent: donPct,
          status: "completed",
        })
        .eq("id", couponId);

      if (upErr) throw upErr;

      router.push("/dashboard");
      router.refresh();
    } catch (e: any) {
      setErr(e?.message || "Erreur finalisation");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div style={{ maxWidth: 720, margin: "0 auto", padding: 16 }}>
        <div style={{ padding: 16, borderRadius: 16, background: "rgba(255,255,255,0.9)", border: "1px solid rgba(0,0,0,0.06)" }}>
          Chargement...
        </div>
      </div>
    );
  }

  if (err) {
    return (
      <div style={{ maxWidth: 720, margin: "0 auto", padding: 16 }}>
        <div style={{ padding: 16, borderRadius: 16, background: "rgba(255,255,255,0.9)", border: "1px solid rgba(0,0,0,0.06)" }}>
          <div style={{ fontWeight: 900, color: "#b91c1c" }}>{err}</div>
          <div style={{ marginTop: 10 }}>
            <button
              onClick={() => router.push("/scan?mode=redeem")}
              style={{ padding: "10px 14px", borderRadius: 12, border: "none", background: "#111827", color: "#fff", fontWeight: 800, cursor: "pointer" }}
            >
              Re-scanner
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: 720, margin: "0 auto", padding: 16 }}>
      <div style={{ padding: 16, borderRadius: 18, background: "rgba(255,255,255,0.92)", border: "1px solid rgba(0,0,0,0.06)", boxShadow: "0 18px 40px rgba(0,0,0,0.08)" }}>
        <div style={{ fontSize: 12, fontWeight: 900, color: "#fb7185", letterSpacing: "0.08em" }}>ÉTAPE 2</div>
        <div style={{ fontSize: 22, fontWeight: 950, color: "#111827" }}>Finaliser chez {merchantName}</div>
        <div style={{ marginTop: 6, fontSize: 13, color: "#6b7280" }}>
          Indique uniquement le reste à payer et choisis la SPA à soutenir.
        </div>

        <div style={{ marginTop: 14, display: "grid", gap: 12 }}>
          <label style={{ display: "grid", gap: 6 }}>
            <div style={{ fontSize: 13, fontWeight: 800, color: "#111827" }}>Reste à payer (€)</div>
            <input
              type="number"
              step="0.01"
              value={Number.isFinite(remaining) ? remaining : 0}
              onChange={(e) => setRemaining(Number(e.target.value))}
              style={{ width: "100%", padding: "10px 12px", borderRadius: 12, border: "1px solid rgba(0,0,0,0.12)" }}
            />
          </label>

          <label style={{ display: "grid", gap: 6 }}>
            <div style={{ fontSize: 13, fontWeight: 800, color: "#111827" }}>Refuge bénéficiaire</div>
            <select
              value={spaId}
              onChange={(e) => setSpaId(e.target.value)}
              style={{ width: "100%", padding: "10px 12px", borderRadius: 12, border: "1px solid rgba(0,0,0,0.12)" }}
            >
              {spas.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </label>

          <div style={{ display: "grid", gap: 8 }}>
            <div style={{ fontSize: 13, fontWeight: 800, color: "#111827" }}>Pourcentage de don</div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
              <button
                type="button"
                onClick={() => setDonPct(50)}
                style={{
                  padding: "10px 12px",
                  borderRadius: 12,
                  border: "1px solid rgba(0,0,0,0.10)",
                  background: donPct === 50 ? "#16a34a" : "#ffffff",
                  color: donPct === 50 ? "#ffffff" : "#111827",
                  fontWeight: 900,
                  cursor: "pointer",
                }}
              >
                50%
              </button>
              <button
                type="button"
                onClick={() => setDonPct(100)}
                style={{
                  padding: "10px 12px",
                  borderRadius: 12,
                  border: "1px solid rgba(0,0,0,0.10)",
                  background: donPct === 100 ? "#16a34a" : "#ffffff",
                  color: donPct === 100 ? "#ffffff" : "#111827",
                  fontWeight: 900,
                  cursor: "pointer",
                }}
              >
                100%
              </button>
            </div>
          </div>

          <button
            type="button"
            onClick={finalize}
            disabled={saving || expired}
            style={{
              marginTop: 4,
              width: "100%",
              padding: "12px 14px",
              borderRadius: 14,
              border: "none",
              background: expired ? "#e5e7eb" : "#111827",
              color: expired ? "#6b7280" : "#ffffff",
              fontWeight: 950,
              cursor: saving || expired ? "not-allowed" : "pointer",
            }}
          >
            {expired ? "Coupon expiré — re-scan" : saving ? "Finalisation..." : "Finaliser"}
          </button>
        </div>
      </div>
    </div>
  );
}
