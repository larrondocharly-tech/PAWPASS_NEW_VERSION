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
    <main style={{ minHeight: "100vh", background: "#FAFAF5" }}>
      <div className="container" style={{ maxWidth: 1100 }}>
        {/* En-tête + bouton admin */}
        <header
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 12,
            marginBottom: 24,
          }}
        >
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: 6,
            }}
          >
            <h1 style={{ fontSize: 28, margin: 0, color: "#222222" }}>
              Tableau de bord
            </h1>
            <p style={{ margin: 0, color: "#666666" }}>
              Suivez votre cagnotte, vos dons et vos réductions en un coup
              d&apos;œil.
            </p>
          </div>

          {isAdmin && (
            <div>
              <button
                onClick={() => router.push("/admin")}
                className="button secondary"
                style={{
                  borderRadius: 999,
                  padding: "8px 16px",
                  fontSize: 14,
                  whiteSpace: "nowrap",
                }}
              >
                Accéder à l&apos;admin
              </button>
            </div>
          )}
        </header>

        {loading && <p>Chargement…</p>}

        {error && (
          <p style={{ color: "red", marginBottom: 16 }}>
            {error}
          </p>
        )}

        {!loading && !error && (
          <section
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
              gap: 20,
            }}
          >
            {/* Carte bienvenue */}
            <div className="card" style={{ borderRadius: 16 }}>
              <p
                style={{
                  fontSize: 12,
                  fontWeight: 600,
                  textTransform: "uppercase",
                  letterSpacing: "0.08em",
                  color: "#FF7A3C",
                  marginBottom: 8,
                }}
              >
                Bienvenue
              </p>
              <h2 style={{ fontSize: 20, marginBottom: 10, color: "#222222" }}>
                Un scan, et votre cashback démarre
              </h2>
              <p style={{ margin: 0, color: "#666666" }}>
                Scannez un QR commerçant pour enregistrer vos achats et accumuler
                du cashback solidaire.
              </p>
            </div>

            {/* Carte cagnotte */}
            <div className="card" style={{ borderRadius: 16 }}>
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: 10,
                }}
              >
                <h2 style={{ fontSize: 20, marginBottom: 4, color: "#222222" }}>
                  Ma cagnotte PawPass
                </h2>
                <p style={{ margin: 0, color: "#666666", fontSize: 14 }}>
                  Solde disponible pour vos réductions
                </p>
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 12,
                    flexWrap: "wrap",
                  }}
                >
                  <span
                    style={{
                      fontSize: 32,
                      fontWeight: 700,
                      color: "#222222",
                    }}
                  >
                    {formatEuro(availableBalance)}
                  </span>
                  <span
                    style={{
                      background: "#ECFDF3",
                      color: "#1B5E20",
                      borderRadius: 999,
                      padding: "6px 12px",
                      fontSize: 13,
                      fontWeight: 600,
                    }}
                  >
                    Total donné aux SPA : {formatEuro(totalDonation)}
                  </span>
                </div>
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))",
                    gap: 12,
                    marginTop: 8,
                  }}
                >
                  <div
                    style={{
                      background: "#FFF7ED",
                      borderRadius: 12,
                      padding: 12,
                    }}
                  >
                    <p style={{ margin: 0, fontSize: 12, color: "#666666" }}>
                      Cashback gagné
                    </p>
                    <p
                      style={{
                        margin: 0,
                        fontWeight: 700,
                        fontSize: 16,
                        color: "#222222",
                      }}
                    >
                      {formatEuro(totalCashback)}
                    </p>
                  </div>
                  <div
                    style={{
                      background: "#F1F5F9",
                      borderRadius: 12,
                      padding: 12,
                    }}
                  >
                    <p style={{ margin: 0, fontSize: 12, color: "#666666" }}>
                      Transactions
                    </p>
                    <p
                      style={{
                        margin: 0,
                        fontWeight: 700,
                        fontSize: 16,
                        color: "#222222",
                      }}
                    >
                      {txCount}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Carte réductions */}
            <div className="card" style={{ borderRadius: 16 }}>
              <h2 style={{ fontSize: 20, marginBottom: 8, color: "#222222" }}>
                Réductions disponibles
              </h2>
              <p style={{ margin: 0, color: "#666666", fontSize: 14 }}>
                Solde cashback : {formatEuro(availableBalance)}
              </p>

              <button
                onClick={() => router.push("/scan?mode=redeem")}
                className="button"
                style={{
                  marginTop: 16,
                  width: "100%",
                  borderRadius: 14,
                  background: "#4CAF50",
                  color: "white",
                  fontSize: 15,
                }}
              >
                Utiliser mes crédits
              </button>

              <p style={{ marginTop: 12, fontSize: 13, color: "#666666" }}>
                Vous pouvez utiliser une partie de votre cagnotte dès maintenant
                chez les commerçants partenaires.
              </p>
            </div>
          </section>
        )}
      </div>
    </main>
  );
}
