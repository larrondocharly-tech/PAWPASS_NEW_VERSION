// app/dashboard/page.tsx
"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabaseClient";

export const dynamic = "force-dynamic";

interface Wallet {
  balance: number;
}

interface StatTransaction {
  cashback_amount: number | null;
  donation_amount: number | null;
}

interface RecentTransaction {
  id: string;
  created_at: string;
  merchant_name: string | null;
  purchase_amount: number;
  cashback_to_user: number;
  donation_amount: number;
}

export default function DashboardPage() {
  const supabase = createClient();
  const router = useRouter();

  const [wallet, setWallet] = useState<Wallet | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [totalCashback, setTotalCashback] = useState(0);
  const [totalDonation, setTotalDonation] = useState(0);
  const [txCount, setTxCount] = useState(0);
  const [isAdmin, setIsAdmin] = useState(false);

  const [recentTx, setRecentTx] = useState<RecentTransaction[]>([]);

  const formatEuro = (value: number) => value.toFixed(2) + " €";

  const availableBalance = wallet?.balance ?? 0;

  const formatDate = (value: string) => {
    try {
      return new Date(value).toLocaleDateString("fr-FR", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
      });
    } catch {
      return value;
    }
  };

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      setError(null);

      // 1) Récupération de l'utilisateur connecté
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError || !user) {
        setError("Vous devez être connecté pour accéder à votre tableau de bord.");
        setLoading(false);
        router.push("/login");
        return;
      }

      // 2) Wallet
      const { data: walletData, error: walletError } = await supabase
        .from("wallets")
        .select("balance")
        .eq("user_id", user.id)
        .maybeSingle();

      if (walletError) {
        console.error(walletError);
      } else if (walletData) {
        setWallet(walletData);
      }

      // 3) Statistiques globales sur la table transactions
      const { data: txData, error: txError } = await supabase
        .from("transactions")
        .select("cashback_amount, donation_amount")
        .eq("user_id", user.id);

      if (txError) {
        console.error(txError);
      } else if (txData) {
        const list = txData as StatTransaction[];

        const totalCb = list.reduce((sum, tx) => {
          const v = typeof tx.cashback_amount === "number" ? tx.cashback_amount : 0;
          return sum + v;
        }, 0);

        const totalDon = list.reduce((sum, tx) => {
          const v = typeof tx.donation_amount === "number" ? tx.donation_amount : 0;
          return sum + v;
        }, 0);

        setTotalCashback(totalCb);
        setTotalDonation(totalDon);
        setTxCount(list.length);
      }

      // 4) Rôle admin
      const { data: profileData, error: profileError } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", user.id)
        .maybeSingle();

      if (!profileError && profileData?.role === "admin") {
        setIsAdmin(true);
      }

      // 5) 5 dernières transactions - vue client_transactions_history
      const { data: historyData, error: historyError } = await supabase
        .from("client_transactions_history")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(5);

      if (historyError) {
        console.error(historyError);
      } else if (historyData) {
        const mapped: RecentTransaction[] =
          historyData?.map((row: any) => ({
            id: row.id,
            created_at: row.created_at,
            merchant_name: row.merchant_name ?? null,
            purchase_amount: Number(row.purchase_amount ?? row.amount ?? 0),
            cashback_to_user: Number(
              row.cashback_to_user ?? row.cashback_amount ?? 0
            ),
            donation_amount: Number(row.donation_amount ?? row.donation ?? 0),
          })) ?? [];

        setRecentTx(mapped);
      }

      setLoading(false);
    };

    loadData();
  }, [supabase, router]);

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
            paddingTop: 16,
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
              Suivez votre cagnotte, vos dons et vos réductions en un coup d&apos;œil.
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
          <>
            {/* Cartes principales */}
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
                <h2
                  style={{
                    fontSize: 20,
                    marginBottom: 10,
                    color: "#222222",
                  }}
                >
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
                  <h2
                    style={{
                      fontSize: 20,
                      marginBottom: 4,
                      color: "#222222",
                    }}
                  >
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
                      <p
                        style={{
                          margin: 0,
                          fontSize: 12,
                          color: "#666666",
                        }}
                      >
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
                      <p
                        style={{
                          margin: 0,
                          fontSize: 12,
                          color: "#666666",
                        }}
                      >
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

            {/* 5 dernières transactions */}
            {recentTx.length > 0 && (
              <section
                style={{
                  marginTop: 36,
                  maxWidth: 900,
                  marginLeft: "auto",
                  marginRight: "auto",
                }}
              >
                <div
                  className="card"
                  style={{
                    borderRadius: 16,
                    padding: 16,
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      marginBottom: 8,
                    }}
                  >
                    <h2
                      style={{
                        fontSize: 18,
                        margin: 0,
                        color: "#111827",
                      }}
                    >
                      Dernières transactions
                    </h2>
                    <Link
                      href="/transactions"
                      style={{
                        fontSize: 13,
                        textDecoration: "underline",
                        color: "#2563EB",
                        fontWeight: 500,
                      }}
                    >
                      Voir tout l&apos;historique
                    </Link>
                  </div>

                  <div>
                    {recentTx.map((tx) => (
                      <div
                        key={tx.id}
                        style={{
                          display: "grid",
                          gridTemplateColumns: "2.2fr 1fr 1fr 1fr",
                          fontSize: 14,
                          padding: "8px 4px",
                          borderBottom: "1px solid #F3F4F6",
                          alignItems: "center",
                          columnGap: 8,
                        }}
                      >
                        {/* Commerçant + prix payé */}
                        <div
                          style={{
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                            whiteSpace: "nowrap",
                          }}
                        >
                          <span style={{ fontWeight: 600 }}>
                            {tx.merchant_name || "Commerçant"}
                          </span>
                          <span
                            style={{
                              marginLeft: 6,
                              color: "#9CA3AF",
                              fontSize: 12,
                            }}
                          >
                            • Achat {formatEuro(tx.purchase_amount)}
                          </span>
                        </div>

                        {/* Date */}
                        <span style={{ fontSize: 13, color: "#6B7280" }}>
                          {formatDate(tx.created_at)}
                        </span>

                        {/* Cashback reçu */}
                        <span
                          style={{
                            textAlign: "right",
                            fontWeight: 600,
                          }}
                        >
                          {formatEuro(tx.cashback_to_user)}
                        </span>

                        {/* Don SPA */}
                        <span
                          style={{
                            textAlign: "right",
                            fontWeight: 500,
                            color: "#16A34A",
                          }}
                        >
                          {formatEuro(tx.donation_amount)}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </section>
            )}
          </>
        )}
      </div>
    </main>
  );
}
