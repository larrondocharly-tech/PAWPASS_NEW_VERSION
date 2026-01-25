"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabaseClient";

export const dynamic = "force-dynamic";

export default function CouponInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const supabase = useMemo(() => createClient(), []);

  const merchantCodeRaw = searchParams.get("m") || searchParams.get("code") || "";
  const merchantCode = merchantCodeRaw.trim();

  const [merchant, setMerchant] = useState<any>(null);
  const [loadingMerchant, setLoadingMerchant] = useState(false);

  const [walletBalance, setWalletBalance] = useState<number>(0);
  const [walletLoadError, setWalletLoadError] = useState<string | null>(null);

  const [amount, setAmount] = useState<string>("0");
  const [error, setError] = useState<string | null>(null);

  const goRescan = () => {
    router.replace("/scan?mode=coupon&scan=1");
  };

  // Charge merchant
  useEffect(() => {
    const loadMerchant = async () => {
      if (!merchantCode) return;
      setLoadingMerchant(true);
      setError(null);

      const { data, error } = await supabase.from("merchants").select("*").eq("qr_token", merchantCode).maybeSingle();

      if (error || !data) {
        console.error(error);
        setMerchant(null);
        setError("Commerçant introuvable.");
      } else {
        setMerchant(data);
      }

      setLoadingMerchant(false);
    };

    loadMerchant();
  }, [merchantCode, supabase]);

  // Charge wallet
  useEffect(() => {
    const loadWallet = async () => {
      setWalletLoadError(null);

      const { data: auth } = await supabase.auth.getUser();
      if (!auth?.user) {
        setWalletBalance(0);
        setWalletLoadError("Connectez-vous pour voir votre solde.");
        return;
      }

      const userId = auth.user.id;

      // wallets.balance fallback rapide
      const { data, error } = await supabase.from("wallets").select("balance").eq("user_id", userId).maybeSingle();
      if (!error && data && typeof (data as any).balance !== "undefined") {
        const num = typeof (data as any).balance === "number" ? (data as any).balance : parseFloat(String((data as any).balance));
        setWalletBalance(Number.isFinite(num) ? num : 0);
        return;
      }

      // fallback profiles.wallet_balance
      const { data: p, error: pe } = await supabase.from("profiles").select("wallet_balance").eq("id", userId).maybeSingle();
      if (!pe && p && typeof (p as any).wallet_balance !== "undefined") {
        const num = typeof (p as any).wallet_balance === "number" ? (p as any).wallet_balance : parseFloat(String((p as any).wallet_balance));
        setWalletBalance(Number.isFinite(num) ? num : 0);
        return;
      }

      setWalletBalance(0);
      setWalletLoadError("Impossible de récupérer le solde.");
    };

    loadWallet();
  }, [supabase]);

  const parseEuro = (v: string) => {
    const n = parseFloat((v || "").replace(",", "."));
    return Number.isFinite(n) ? n : NaN;
  };

  const amt = parseEuro(amount);
  const disabled = !merchantCode || !merchant || Number.isNaN(amt) || amt <= 0 || amt > walletBalance;

  return (
    <main style={{ minHeight: "100vh", background: "transparent", padding: "16px 0 28px" }}>
      <div className="container" style={{ maxWidth: 720 }}>
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
          <header style={{ marginBottom: 12 }}>
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
            <h1 style={{ fontSize: 26, fontWeight: 900, margin: "6px 0 0", color: "#0f172a" }}>
              Générer un coupon de réduction
            </h1>
          </header>

          {(error || walletLoadError) && (
            <div
              style={{
                background: "#fee2e2",
                color: "#b91c1c",
                padding: 10,
                borderRadius: 12,
                fontSize: 13,
                marginBottom: 12,
              }}
            >
              {error || walletLoadError}
            </div>
          )}

          {loadingMerchant && <p>Chargement commerçant…</p>}

          {merchantCode && merchant && (
            <div
              style={{
                background: "rgba(255,255,255,0.95)",
                border: "1px solid rgba(0,0,0,0.08)",
                borderRadius: 16,
                padding: 14,
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: 12,
                marginBottom: 12,
              }}
            >
              <div>
                <div style={{ fontWeight: 900, fontSize: 16 }}>{merchant.name}</div>
                <div style={{ fontSize: 12, color: "#64748b" }}>QR : {merchantCode}</div>
              </div>

              <button
                type="button"
                onClick={goRescan}
                style={{
                  padding: "8px 12px",
                  borderRadius: 999,
                  border: "1px solid rgba(0,0,0,0.12)",
                  background: "white",
                  fontWeight: 800,
                  cursor: "pointer",
                }}
              >
                Rescanner
              </button>
            </div>
          )}

          <div style={{ display: "grid", gap: 10 }}>
            <div style={{ fontSize: 13, color: "#64748b" }}>
              Le commerçant verra le coupon + un timer de 5 minutes.
            </div>

            <label style={{ fontWeight: 900, fontSize: 13, color: "#0f172a" }}>
              Montant de la réduction demandée (€)
            </label>

            <input
              inputMode="decimal"
              type="number"
              step="0.01"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              style={{
                width: "100%",
                padding: 12,
                borderRadius: 14,
                border: "1px solid rgba(0,0,0,0.12)",
                outline: "none",
                fontSize: 16,
                background: "rgba(255,255,255,0.95)",
              }}
            />

            <div style={{ fontSize: 12, color: "#64748b" }}>
              Solde disponible : <b>{walletBalance.toFixed(2)} €</b>
            </div>

            <button
              type="button"
              disabled={disabled}
              onClick={() => {
                // IMPORTANT: ici tu brancheras ton RPC "create_coupon" quand tu voudras.
                // Pour l’instant, on garde uniquement l’UI et la navigation propre.
                alert("OK (UI). Prochaine étape: brancher le RPC côté Supabase si nécessaire.");
              }}
              style={{
                marginTop: 6,
                width: "100%",
                padding: "12px 16px",
                borderRadius: 14,
                border: "none",
                fontWeight: 900,
                fontSize: 16,
                background: "#0A8F44",
                color: "white",
                opacity: disabled ? 0.45 : 1,
                cursor: disabled ? "not-allowed" : "pointer",
              }}
            >
              Générer mon coupon ({Number.isFinite(amt) ? amt.toFixed(2) : "0.00"} €)
            </button>

            <button
              type="button"
              onClick={() => router.replace("/scan")}
              style={{
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
          </div>
        </section>
      </div>
    </main>
  );
}
