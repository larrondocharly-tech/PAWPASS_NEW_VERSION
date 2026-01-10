"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabaseClient";

export const dynamic = "force-dynamic";

interface Wallet {
  balance: number;
}

interface Transaction {
  cashback_to_user: number | null;
  donation_amount: number | null;
}

const MIN_REDEEM_BALANCE = 5; // il faut au moins 5€ de cagnotte pour utiliser ses crédits

export default function DashboardPage() {
  const supabase = createClient();
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [wallet, setWallet] = useState<Wallet | null>(null);
  const [totalCashback, setTotalCashback] = useState(0);
  const [totalDonation, setTotalDonation] = useState(0);
  const [txCount, setTxCount] = useState(0);

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);

      // 1) Récupérer la session
      const {
        data: { session },
        error,
      } = await supabase.auth.getSession();

      if (error) {
        console.error(error);
        setLoading(false);
        return;
      }

      if (!session) {
        router.push("/login");
        return;
      }

      const userId = session.user.id;

      // 2) Récupérer le wallet
      const { data: walletData, error: walletError } = await supabase
        .from("wallets")
        .select("balance")
        .eq("user_id", userId)
        .maybeSingle();

      if (walletError) {
        console.error(walletError);
      } else {
        setWallet(walletData);
      }

      // 3) Récupérer les transactions pour stats
      const { data: txData, error: txError } = await supabase
        .from("transactions")
        .select("cashback_to_user, donation_amount")
        .eq("user_id", userId);

      if (txError) {
        console.error(txError);
      } else if (txData) {
        setTxCount(txData.length);

        const totalCB = txData.reduce(
          (sum, t: Transaction) =>
            sum + (t.cashback_to_user || 0) + (t.donation_amount || 0),
          0
        );
        const totalDon = txData.reduce(
          (sum, t: Transaction) => sum + (t.donation_amount || 0),
          0
        );

        setTotalCashback(totalCB);
        setTotalDonation(totalDon);
      }

      setLoading(false);
    };

    loadData();
  }, [supabase, router]);

  if (loading) {
    return <div style={{ padding: 24 }}>Chargement...</div>;
  }

  const solde = wallet?.balance ?? 0;
  const canRedeem = solde >= MIN_REDEEM_BALANCE;

  return (
    <div style={{ padding: "24px" }}>
      <h1 style={{ marginBottom: 24 }}>Tableau de bord</h1>

      <div
        style={{
          display: "grid",
          gap: "24px",
          gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
        }}
      >
        {/* Carte bienvenue */}
        <div
          style={{
            background: "white",
            borderRadius: 16,
            padding: 24,
            boxShadow: "0 8px 20px rgba(0,0,0,0.05)",
          }}
        >
          <h2>Bienvenue</h2>
          <p style={{ marginTop: 12 }}>
            Scannez un QR commerçant pour enregistrer vos achats et accumuler
            du cashback solidaire.
          </p>
        </div>

        {/* Carte cagnotte */}
        <div
          style={{
            background: "white",
            borderRadius: 16,
            padding: 24,
            boxShadow: "0 8px 20px rgba(0,0,0,0.05)",
          }}
        >
          <h2>Ma cagnotte PawPass</h2>
          <p style={{ marginTop: 12, color: "#555" }}>
            Solde disponible pour vos réductions :
          </p>
          <p style={{ marginTop: 8, fontSize: 32, fontWeight: 700 }}>
            {solde.toFixed(2)} €
          </p>

          <div
            style={{
              marginTop: 16,
              padding: 12,
              borderRadius: 12,
              background: "#F3FFF5",
            }}
          >
            <p style={{ margin: 0 }}>
              Total donné aux SPA :{" "}
              <strong>{totalDonation.toFixed(2)} €</strong>
            </p>
          </div>

          <div style={{ marginTop: 16, fontSize: 14, color: "#555" }}>
            <p style={{ margin: 0 }}>
              Total cashback gagné : {totalCashback.toFixed(2)} €
            </p>
            <p style={{ margin: 0 }}>Transactions réalisées : {txCount}</p>
          </div>
        </div>

        {/* Carte réductions */}
        <div
          style={{
            background: "white",
            borderRadius: 16,
            padding: 24,
            boxShadow: "0 8px 20px rgba(0,0,0,0.05)",
          }}
        >
          <h2>Réductions disponibles</h2>
          <p style={{ marginTop: 12 }}>
            Solde cashback : <strong>{solde.toFixed(2)} €</strong>
          </p>

          <button
            style={{
              marginTop: 16,
              padding: "10px 18px",
              borderRadius: 9999,
              border: "none",
              cursor: canRedeem ? "pointer" : "not-allowed",
              opacity: canRedeem ? 1 : 0.5,
              fontWeight: 600,
            }}
            onClick={() => router.push("/scan?mode=redeem")}
            disabled={!canRedeem}
          >
            Utiliser mes crédits
          </button>

          <p style={{ marginTop: 16, fontSize: 14, color: "#555" }}>
            {canRedeem ? (
              <>
                Vous pouvez utiliser une partie de vos{" "}
                {solde.toFixed(2)} € de cagnotte dès maintenant.
              </>
            ) : (
              <>
                Il vous faut au moins {MIN_REDEEM_BALANCE.toFixed(2)} € de
                cagnotte pour utiliser vos crédits. Solde actuel :{" "}
                {solde.toFixed(2)} €.
              </>
            )}
          </p>
        </div>
      </div>
    </div>
  );
}
