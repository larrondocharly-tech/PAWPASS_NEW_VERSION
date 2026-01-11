// app/dashboard/page.tsx
"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabaseClient";

export const dynamic = "force-dynamic";

interface Wallet {
  balance: number;
}

interface Transaction {
  cashback_amount: number | null;
  donation_amount: number | null;
}

export default function DashboardPage() {
  const supabase = createClient();
  const router = useRouter();

  const [wallet, setWallet] = useState<Wallet | null>(null);
  const [totalCashback, setTotalCashback] = useState(0);
  const [totalDonation, setTotalDonation] = useState(0);
  const [txCount, setTxCount] = useState(0);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      setError(null);

      // 1) Récupérer la session
      const {
        data: { session },
        error: sessionError,
      } = await supabase.auth.getSession();

      if (sessionError) {
        console.error(sessionError);
        setError("Erreur lors de la récupération de la session.");
        setLoading(false);
        return;
      }

      if (!session) {
        router.push("/login");
        return;
      }

      // 2) Rôle utilisateur (pour afficher le bouton admin)
      const { data: userData, error: userError } = await supabase.auth.getUser();
      if (!userError && userData?.user) {
        const role = (userData.user.user_metadata as any)?.role;
        if (role === "admin") {
          setIsAdmin(true);
        }
      }

      const userId = session.user.id;

      // 3) Récupérer le wallet
      const { data: walletData, error: walletError } = await supabase
        .from("wallets")
        .select("balance")
        .eq("user_id", userId)
        .maybeSingle();

      if (walletError) {
        console.error(walletError);
        setError("Erreur lors du chargement de la cagnotte.");
        setLoading(false);
        return;
      }

      setWallet(walletData);

      // 4) Récupérer les transactions de l'utilisateur
      const { data: txData, error: txError } = await supabase
        .from("transactions")
        .select("cashback_amount, donation_amount")
        .eq("user_id", userId);

      if (txError) {
        console.error(txError);
        setError("Erreur lors du chargement des transactions.");
        setLoading(false);
        return;
      }

      const list = txData as Transaction[];

      const totalCb = list.reduce((sum, tx) => {
        const v = typeof tx.cashback_amount === "number" ? tx.cashback_amount : 0;
        return sum + v;
      }, 0);

      const totalDon = list.reduce((sum, tx) => {
        const v =
          typeof tx.donation_amount === "number" ? tx.donation_amount : 0;
        return sum + v;
      }, 0);

      setTotalCashback(totalCb);
      setTotalDonation(totalDon);
      setTxCount(list.length);

      setLoading(false);
    };

    loadData();
  }, [supabase, router]);

  const formatEuro = (value: number) => value.toFixed(2) + " €";

  const availableBalance = wallet?.balance ?? 0;

  return (
    <div style={{ padding: 24, maxWidth: 1100, margin: "0 auto" }}>
      {/* En-tête + bouton admin */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 24,
        }}
      >
        <h1 style={{ fontSize: 24, margin: 0 }}>Tableau de bord</h1>

        {isAdmin && (
          <button
            onClick={() => router.push("/admin")}
            style={{
              padding: "8px 16px",
              borderRadius: 999,
              border: "1px solid #0f766e",
              background: "#0f766e",
              color: "white",
              cursor: "pointer",
              fontSize: 14,
              whiteSpace: "nowrap",
            }}
          >
            Accéder à l&apos;admin
          </button>
        )}
      </div>

      {loading && <p>Chargement…</p>}

      {error && (
        <p style={{ color: "red", marginBottom: 16 }}>
          {error}
        </p>
      )}

      {!loading && !error && (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
            gap: 20,
          }}
        >
          {/* Carte bienvenue */}
          <div
            style={{
              background: "white",
              borderRadius: 16,
              padding: 20,
              boxShadow: "0 2px 6px rgba(0,0,0,0.06)",
            }}
          >
            <h2 style={{ fontSize: 18, marginBottom: 8 }}>Bienvenue</h2>
            <p style={{ margin: 0 }}>
              Scannez un QR commerçant pour enregistrer vos achats et accumuler
              du cashback solidaire.
            </p>
          </div>

          {/* Carte cagnotte */}
          <div
            style={{
              background: "white",
              borderRadius: 16,
              padding: 20,
              boxShadow: "0 2px 6px rgba(0,0,0,0.06)",
            }}
          >
            <h2 style={{ fontSize: 18, marginBottom: 12 }}>
              Ma cagnotte PawPass
            </h2>
            <p style={{ margin: 0, color: "#64748b", fontSize: 14 }}>
              Solde disponible pour vos réductions :
            </p>
            <p
              style={{
                fontSize: 28,
                fontWeight: 700,
                marginTop: 4,
                marginBottom: 12,
              }}
            >
              {formatEuro(availableBalance)}
            </p>

            <div
              style={{
                background: "#ecfdf3",
                borderRadius: 999,
                padding: "6px 12px",
                fontSize: 14,
                display: "inline-block",
              }}
            >
              Total donné aux SPA :{" "}
              <strong>{formatEuro(totalDonation)}</strong>
            </div>

            <p style={{ marginTop: 12, fontSize: 14, color: "#64748b" }}>
              Total cashback gagné : {formatEuro(totalCashback)}
              <br />
              Transactions réalisées : {txCount}
            </p>
          </div>

          {/* Carte réductions */}
          <div
            style={{
              background: "white",
              borderRadius: 16,
              padding: 20,
              boxShadow: "0 2px 6px rgba(0,0,0,0.06)",
            }}
          >
            <h2 style={{ fontSize: 18, marginBottom: 12 }}>
              Réductions disponibles
            </h2>
            <p style={{ margin: 0, color: "#64748b", fontSize: 14 }}>
              Solde cashback : {formatEuro(availableBalance)}
            </p>

            <button
              onClick={() => router.push("/scan?mode=redeem")}
              style={{
                marginTop: 16,
                padding: "10px 18px",
                borderRadius: 999,
                border: "none",
                background: "#0f766e",
                color: "white",
                cursor: "pointer",
                fontSize: 14,
              }}
            >
              Utiliser mes crédits
            </button>

            <p style={{ marginTop: 12, fontSize: 13, color: "#64748b" }}>
              Vous pouvez utiliser une partie de votre cagnotte dès maintenant
              chez les commerçants partenaires.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
