"use client";


import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabaseClient";
export const dynamic = "force-dynamic";

interface Wallet {
  balance: number;
}

interface Transaction {
  cashback_amount: number;
  donation_amount: number;
}

export default function DashboardPage() {
  const supabase = createClient();

  const [loading, setLoading] = useState(true);
  const [wallet, setWallet] = useState<Wallet | null>(null);
  const [totalCashback, setTotalCashback] = useState(0);
  const [totalDonation, setTotalDonation] = useState(0);
  const [txCount, setTxCount] = useState(0);
  const CASHBACK_THRESHOLD = 5; // ex : 5€ pour pouvoir utiliser une réduction

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);

      // 1) Récupérer l'utilisateur
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError || !user) {
        console.error("Erreur récupération user :", userError);
        setLoading(false);
        return;
      }

      const userId = user.id;

      // 2) Récupérer la cagnotte
      const { data: walletData } = await supabase
        .from("wallets")
        .select("balance")
        .eq("user_id", userId)
        .maybeSingle();

      if (walletData) {
        setWallet({ balance: Number(walletData.balance) || 0 });
      } else {
        setWallet({ balance: 0 });
      }

      // 3) Récupérer les transactions de l'utilisateur
      const { data: txData, error: txError } = await supabase
        .from("transactions")
        .select("cashback_amount, donation_amount")
        .eq("user_id", userId);

      if (txError) {
        console.error("Erreur chargement transactions :", txError);
        setLoading(false);
        return;
      }

      if (txData && txData.length > 0) {
        let sumCashback = 0;
        let sumDonation = 0;

        txData.forEach((tx: Transaction) => {
          sumCashback += Number(tx.cashback_amount) || 0;
          sumDonation += Number(tx.donation_amount) || 0;
        });

        setTotalCashback(sumCashback);
        setTotalDonation(sumDonation);
        setTxCount(txData.length);
      } else {
        setTotalCashback(0);
        setTotalDonation(0);
        setTxCount(0);
      }

      setLoading(false);
    };

    loadData();
  }, [supabase]);

  const balance = wallet?.balance ?? 0;
  const progress =
    balance >= CASHBACK_THRESHOLD
      ? 1
      : Math.min(balance / CASHBACK_THRESHOLD, 1);
  const remaining =
    balance >= CASHBACK_THRESHOLD ? 0 : CASHBACK_THRESHOLD - balance;

  // 👉 Etat "chargement" (le header vient du layout)
  if (loading) {
    return (
      <main style={{ padding: 24 }}>
        <p>Chargement du tableau de bord...</p>
      </main>
    );
  }

  // 👉 Etat normal (le header vient du layout)
  return (
    <main style={{ padding: "32px 16px" }}>
      <div
        style={{
          maxWidth: 1100,
          margin: "0 auto",
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
          gap: 24,
        }}
      >
        {/* Carte bienvenue */}
        <div
          style={{
            backgroundColor: "white",
            borderRadius: 24,
            padding: 24,
            boxShadow: "0 10px 25px rgba(15, 23, 42, 0.08)",
          }}
        >
          <h2 style={{ fontSize: 22, fontWeight: 700, marginBottom: 8 }}>
            Bienvenue
          </h2>
          <p style={{ marginBottom: 16 }}>
            Scannez un QR commerçant pour enregistrer vos achats.
          </p>
          <p style={{ fontSize: 48, opacity: 0.2 }}>🐾</p>
        </div>

        {/* Carte cagnotte */}
        <div
          style={{
            backgroundColor: "white",
            borderRadius: 24,
            padding: 24,
            boxShadow: "0 10px 25px rgba(15, 23, 42, 0.08)",
          }}
        >
          <h2 style={{ fontSize: 22, fontWeight: 700, marginBottom: 8 }}>
            Ma cagnotte PawPass
          </h2>
          <p style={{ color: "#64748b", marginBottom: 12 }}>
            Solde disponible pour vos réductions.
          </p>

          <p
            style={{
              fontSize: 32,
              fontWeight: 700,
              color: "#059669",
              marginBottom: 16,
            }}
          >
            {balance.toFixed(2)} €
          </p>

          <div
            style={{
              backgroundColor: "#ecfdf3",
              padding: 12,
              borderRadius: 12,
              marginBottom: 12,
            }}
          >
            <p style={{ fontSize: 14, color: "#14532d" }}>
              Total donné aux SPA : {totalDonation.toFixed(2)} €
            </p>
          </div>

          <p style={{ fontSize: 14, color: "#64748b", marginBottom: 4 }}>
            Total cashback gagné : {totalCashback.toFixed(2)} €
          </p>
          <p style={{ fontSize: 14, color: "#64748b" }}>
            Transactions réalisées : {txCount}
          </p>
        </div>

        {/* Carte réductions */}
        <div
          style={{
            backgroundColor: "white",
            borderRadius: 24,
            padding: 24,
            boxShadow: "0 10px 25px rgba(15, 23, 42, 0.08)",
          }}
        >
          <h2 style={{ fontSize: 22, fontWeight: 700, marginBottom: 8 }}>
            Réductions disponibles
          </h2>
          <p style={{ color: "#64748b", marginBottom: 12 }}>
            Solde cashback : {balance.toFixed(2)} €
          </p>

          <button
            type="button"
            style={{
              backgroundColor:
                balance >= CASHBACK_THRESHOLD ? "#059669" : "#9ca3af",
              color: "white",
              border: "none",
              padding: "10px 18px",
              borderRadius: 999,
              fontWeight: 600,
              cursor: balance >= CASHBACK_THRESHOLD ? "pointer" : "default",
              marginBottom: 16,
            }}
          >
            Utiliser mes crédits
          </button>

          <div
            style={{
              width: "100%",
              height: 8,
              borderRadius: 999,
              backgroundColor: "#e5e7eb",
              overflow: "hidden",
              marginBottom: 8,
            }}
          >
            <div
              style={{
                width: `${progress * 100}%`,
                height: "100%",
                backgroundColor: "#22c55e",
              }}
            />
          </div>

          <p style={{ fontSize: 14, color: "#64748b" }}>
            Encore {remaining.toFixed(2)} € pour pouvoir utiliser vos
            réductions.
          </p>
        </div>
      </div>
    </main>
  );
}
