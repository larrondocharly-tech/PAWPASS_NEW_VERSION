// app/scan/coupon-start.tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabaseClient";

export default function CouponStart() {
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);

  const [amount, setAmount] = useState("");
  const [lastMerchant, setLastMerchant] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    try {
      const m = localStorage.getItem("pp_last_merchant");
      setLastMerchant(m ? m : null);
    } catch {
      setLastMerchant(null);
    }
  }, []);

  const parseEuro = (v: string) => {
    const n = parseFloat((v || "").replace(",", "."));
    return Number.isFinite(n) ? n : NaN;
  };

  const goScanMerchant = () => {
    router.replace("/scan?mode=coupon&scan=1"); // scanner pour récupérer le merchant (via ScanPageClient si tu veux)
    // Astuce: si tu préfères scanner directement: router.replace("/scan?mode=coupon&scan=1");
  };

  const createCoupon = async () => {
    setErr(null);

    if (!lastMerchant) {
      setErr("Aucun commerçant sélectionné. Scanne d'abord un QR commerçant.");
      return;
    }

    const amt = parseEuro(amount);
    if (Number.isNaN(amt) || amt <= 0) {
      setErr("Montant invalide.");
      return;
    }

    setLoading(true);
    const { data, error } = await supabase.rpc("pp_create_coupon", {
      p_merchant_code: lastMerchant,
      p_amount: amt,
    });
    setLoading(false);

    if (error) {
      setErr(error.message);
      return;
    }

    // On redirige vers /scan avec mode=coupon et merchant pour afficher le coupon (dans ScanInner)
    router.replace(`/scan?mode=coupon&m=${encodeURIComponent(lastMerchant)}`);
  };

  return (
    <main style={{ minHeight: "100vh", background: "transparent", padding: "16px 0 28px" }}>
      <div className="container" style={{ maxWidth: 560 }}>
        <section
          className="card"
          style={{
            borderRadius: 20,
            padding: 16,
            background: "rgba(255,255,255,0.88)",
            backdropFilter: "blur(10px)",
            WebkitBackdropFilter: "blur(10px)",
            border: "1px solid rgba(0,0,0,0.06)",
            boxShadow: "0 14px 30px rgba(0,0,0,0.08)",
          }}
        >
          <p
            style={{
              fontSize: 12,
              fontWeight: 700,
              textTransform: "uppercase",
              letterSpacing: "0.08em",
              color: "#FF7A3C",
              margin: 0,
            }}
          >
            RÉDUCTION INSTANTANÉE — ÉTAPE 1
          </p>
          <h1 style={{ fontSize: 22, margin: "6px 0 0", color: "#0f172a", fontWeight: 900 }}>
            Générer un coupon de réduction
          </h1>

          <div style={{ marginTop: 12 }}>
            <div
              style={{
                background: "rgba(15, 23, 42, 0.04)",
                border: "1px solid rgba(15, 23, 42, 0.08)",
                borderRadius: 14,
                padding: 12,
              }}
            >
              <div style={{ fontWeight: 900, color: "#0f172a" }}>Commerçant</div>
              <div style={{ marginTop: 4, color: "#334155", fontSize: 13 }}>
                {lastMerchant ? `QR: ${lastMerchant}` : "Aucun commerçant sélectionné"}
              </div>

              <button
                type="button"
                onClick={goScanMerchant}
                style={{
                  marginTop: 10,
                  padding: "10px 12px",
                  borderRadius: 12,
                  border: "1px solid rgba(0,0,0,0.12)",
                  background: "white",
                  fontWeight: 900,
                  cursor: "pointer",
                  width: "100%",
                }}
              >
                {lastMerchant ? "Changer de commerçant (scanner)" : "Scanner un commerçant"}
              </button>
            </div>
          </div>

          {err && (
            <div
              style={{
                marginTop: 12,
                background: "#fee2e2",
                color: "#b91c1c",
                padding: 10,
                borderRadius: 12,
                fontSize: 13,
              }}
            >
              {err}
            </div>
          )}

          <div style={{ marginTop: 12 }}>
            <label style={{ display: "block", fontWeight: 900, fontSize: 13, marginBottom: 6, color: "#0f172a" }}>
              Montant de la réduction demandée (€)
            </label>
            <input
              type="number"
              step="0.01"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="Ex : 2,00"
              style={{
                width: "100%",
                padding: 12,
                borderRadius: 14,
                border: "1px solid rgba(0,0,0,0.12)",
                fontSize: 16,
                background: "rgba(255,255,255,0.9)",
              }}
            />
            <div style={{ marginTop: 6, fontSize: 12, color: "#64748b" }}>
              Le commerçant verra le coupon + un timer de 5 minutes.
            </div>
          </div>

          <button
            type="button"
            onClick={createCoupon}
            disabled={loading}
            style={{
              marginTop: 14,
              width: "100%",
              padding: "12px 16px",
              borderRadius: 14,
              border: "none",
              fontWeight: 900,
              fontSize: 16,
              background: "#0A8F44",
              color: "white",
              opacity: loading ? 0.7 : 1,
              cursor: loading ? "not-allowed" : "pointer",
            }}
          >
            {loading ? "Génération..." : "Générer mon coupon"}
          </button>

          <button
            type="button"
            onClick={() => router.replace("/dashboard")}
            style={{
              marginTop: 10,
              width: "100%",
              padding: "12px 16px",
              borderRadius: 14,
              border: "1px solid rgba(0,0,0,0.12)",
              fontWeight: 900,
              fontSize: 16,
              background: "white",
              cursor: "pointer",
            }}
          >
            Annuler
          </button>
        </section>
      </div>
    </main>
  );
}
