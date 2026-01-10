"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabaseClient";
import TopNav from "@/components/TopNav";

export const dynamic = "force-dynamic";

interface Transaction {
  id: string;
  amount: number;
  cashback_amount: number;
  donation_amount: number;
  created_at: string;
  spa_name: string | null;
  merchant_name: string | null;
}

export default function AdminTransactionsPage() {
  const supabase = createClient();
  const router = useRouter();

  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true); // chargement des transactions
  const [error, setError] = useState<string | null>(null);

  const [hasCheckedAccess, setHasCheckedAccess] = useState(false);
  const [isAuthorized, setIsAuthorized] = useState(false);

  const loadTransactions = async () => {
    setLoading(true);
    setError(null);

    const { data, error } = await supabase
      .from("admin_transactions_detailed")
      .select(
        "id, amount, cashback_amount, donation_amount, created_at, spa_name, merchant_name"
      )
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Erreur chargement transactions :", error);
      setError("Impossible de charger les transactions.");
    } else {
      setTransactions((data || []) as Transaction[]);
    }

    setLoading(false);
  };

  useEffect(() => {
    const checkAccessAndLoad = async () => {
      setHasCheckedAccess(false);
      setIsAuthorized(false);

      // 1) Vérifier la session
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        setHasCheckedAccess(true);
        router.replace("/login");
        return;
      }

      // 2) Vérifier le rôle admin
      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", user.id)
        .maybeSingle();

      if (profileError) {
        console.error(profileError);
        setError(profileError.message);
        setHasCheckedAccess(true);
        return;
      }

      if (!profile || profile.role?.toLowerCase() !== "admin") {
        setHasCheckedAccess(true);
        router.replace("/dashboard");
        return;
      }

      // 3) Autorisé : charger les transactions
      setHasCheckedAccess(true);
      setIsAuthorized(true);
      await loadTransactions();
    };

    void checkAccessAndLoad();
  }, [router, supabase]);

  const renderTabs = () => (
    <nav
      style={{
        marginBottom: 24,
        display: "flex",
        gap: 8,
        flexWrap: "wrap",
      }}
    >
      <Link
        href="/admin"
        style={{
          padding: "8px 12px",
          borderRadius: 999,
          fontSize: 14,
          fontWeight: 500,
          backgroundColor: "#e5e7eb",
          color: "#111827",
          textDecoration: "none",
        }}
      >
        Vue d’ensemble
      </Link>
      <Link
        href="/admin/transactions"
        style={{
          padding: "8px 12px",
          borderRadius: 999,
          fontSize: 14,
          fontWeight: 700,
          backgroundColor: "#059669",
          color: "#ffffff",
          textDecoration: "none",
        }}
      >
        Transactions
      </Link>
      <Link
        href="/admin/merchants"
        style={{
          padding: "8px 12px",
          borderRadius: 999,
          fontSize: 14,
          fontWeight: 500,
          backgroundColor: "#e5e7eb",
          color: "#111827",
          textDecoration: "none",
        }}
      >
        Gérer les commerçants
      </Link>
      <Link
        href="/admin/merchant-applications"
        style={{
          padding: "8px 12px",
          borderRadius: 999,
          fontSize: 14,
          fontWeight: 500,
          backgroundColor: "#e5e7eb",
          color: "#111827",
          textDecoration: "none",
        }}
      >
        Demandes commerçants
      </Link>
      <Link
        href="/admin/spas"
        style={{
          padding: "8px 12px",
          borderRadius: 999,
          fontSize: 14,
          fontWeight: 500,
          backgroundColor: "#e5e7eb",
          color: "#111827",
          textDecoration: "none",
        }}
      >
        Gérer les SPA
      </Link>
      <Link
        href="/dashboard"
        style={{
          padding: "8px 12px",
          borderRadius: 999,
          fontSize: 14,
          fontWeight: 500,
          backgroundColor: "#e5e7eb",
          color: "#111827",
          textDecoration: "none",
        }}
      >
        Retour à l’application
      </Link>
    </nav>
  );

  return (
    <>
      <TopNav title="PawPass – Admin" />

      <main style={{ padding: 24 }}>
        <h1 style={{ fontSize: 24, fontWeight: 700, marginBottom: 16 }}>
          Transactions – Admin
        </h1>

        {renderTabs()}

        {!hasCheckedAccess ? (
          <p>Vérification des droits...</p>
        ) : !isAuthorized ? (
          error ? <p style={{ color: "red" }}>{error}</p> : null
        ) : loading ? (
          <p>Chargement des transactions...</p>
        ) : error ? (
          <p style={{ color: "red" }}>{error}</p>
        ) : (
          <section
            style={{
              padding: 24,
              borderRadius: 16,
              backgroundColor: "#ffffff",
              boxShadow: "0 4px 12px rgba(0, 0, 0, 0.06)",
            }}
          >
            <h2
              style={{ fontSize: 18, fontWeight: 600, marginBottom: 16 }}
            >
              Liste des transactions
            </h2>

            <div style={{ overflowX: "auto" }}>
              <table
                style={{ width: "100%", borderCollapse: "collapse" }}
              >
                <thead>
                  <tr>
                    <th
                      style={{
                        textAlign: "left",
                        padding: "8px 12px",
                      }}
                    >
                      Date
                    </th>
                    <th
                      style={{
                        textAlign: "left",
                        padding: "8px 12px",
                      }}
                    >
                      Commerçant
                    </th>
                    <th
                      style={{
                        textAlign: "left",
                        padding: "8px 12px",
                      }}
                    >
                      SPA
                    </th>
                    <th
                      style={{
                        textAlign: "right",
                        padding: "8px 12px",
                      }}
                    >
                      Montant achat
                    </th>
                    <th
                      style={{
                        textAlign: "right",
                        padding: "8px 12px",
                      }}
                    >
                      Don
                    </th>
                    <th
                      style={{
                        textAlign: "right",
                        padding: "8px 12px",
                      }}
                    >
                      Cashback
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {transactions.map((tx) => (
                    <tr key={tx.id}>
                      <td
                        style={{
                          padding: "8px 12px",
                          borderTop: "1px solid #eee",
                        }}
                      >
                        {new Date(tx.created_at).toLocaleString("fr-FR")}
                      </td>
                      <td
                        style={{
                          padding: "8px 12px",
                          borderTop: "1px solid #eee",
                        }}
                      >
                        {tx.merchant_name || "—"}
                      </td>
                      <td
                        style={{
                          padding: "8px 12px",
                          borderTop: "1px solid #eee",
                        }}
                      >
                        {tx.spa_name || "Sans SPA"}
                      </td>
                      <td
                        style={{
                          padding: "8px 12px",
                          borderTop: "1px solid #eee",
                          textAlign: "right",
                        }}
                      >
                        {tx.amount.toFixed(2).replace(".", ",")} €
                      </td>
                      <td
                        style={{
                          padding: "8px 12px",
                          borderTop: "1px solid #eee",
                          textAlign: "right",
                        }}
                      >
                        {tx.donation_amount
                          .toFixed(2)
                          .replace(".", ",")}{" "}
                        €
                      </td>
                      <td
                        style={{
                          padding: "8px 12px",
                          borderTop: "1px solid #eee",
                          textAlign: "right",
                        }}
                      >
                        {(tx.cashback_amount ?? 0)
                          .toFixed(2)
                          .replace(".", ",")}{" "}
                        €
                      </td>
                    </tr>
                  ))}

                  {transactions.length === 0 && (
                    <tr>
                      <td
                        colSpan={6}
                        style={{
                          padding: "12px",
                          textAlign: "center",
                          color: "#6b7280",
                          borderTop: "1px solid #eee",
                        }}
                      >
                        Aucune transaction pour le moment.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </section>
        )}
      </main>
    </>
  );
}
