// app/transactions/page.tsx
"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabaseClient";

export const dynamic = "force-dynamic";

interface HistoryRow {
  id: string;
  created_at: string;
  merchant_name: string | null;
  purchase_amount: number;
  cashback_to_user: number;
  donation_amount: number;
}

const formatEuro = (value: number) => value.toFixed(2) + " €";

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

export default function TransactionsPage() {
  const supabase = createClient();
  const router = useRouter();

  const [rows, setRows] = useState<HistoryRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      setError(null);

      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError || !user) {
        setError("Vous devez être connecté pour voir vos transactions.");
        setLoading(false);
        router.push("/login");
        return;
      }

      const { data, error } = await supabase
        .from("client_transactions_history")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      if (error) {
        console.error(error);
        setError("Impossible de charger l'historique des transactions.");
      } else if (data) {
        const mapped: HistoryRow[] = data.map((row: any) => ({
          id: row.id,
          created_at: row.created_at,
          merchant_name: row.merchant_name ?? null,
          purchase_amount: Number(row.purchase_amount ?? row.amount ?? 0),
          cashback_to_user: Number(
            row.cashback_to_user ?? row.cashback_amount ?? 0
          ),
          donation_amount: Number(row.donation_amount ?? row.donation ?? 0),
        }));

        setRows(mapped);
      }

      setLoading(false);
    };

    loadData();
  }, [supabase, router]);

  return (
    <main style={{ minHeight: "100vh", background: "#FAFAF5" }}>
      <div className="container" style={{ maxWidth: 1100, paddingTop: 24 }}>
        <header
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: 24,
          }}
        >
          <div>
            <h1 style={{ margin: 0, fontSize: 26, color: "#111827" }}>
              Historique des transactions
            </h1>
            <p style={{ margin: 0, color: "#6B7280", fontSize: 14 }}>
              Retrouvez l&apos;ensemble de vos achats, cashback et dons.
            </p>
          </div>

          <Link
            href="/dashboard"
            style={{
              fontSize: 13,
              textDecoration: "underline",
              color: "#2563EB",
              fontWeight: 500,
            }}
          >
            Retour au tableau de bord
          </Link>
        </header>

        {loading && <p>Chargement…</p>}

        {error && (
          <p style={{ color: "red", marginBottom: 16 }}>
            {error}
          </p>
        )}

        {!loading && !error && (
          <div
            className="card"
            style={{
              borderRadius: 16,
              padding: 16,
              overflowX: "auto",
            }}
          >
            {rows.length === 0 ? (
              <p style={{ fontSize: 14, color: "#6B7280" }}>
                Aucune transaction pour le moment.
              </p>
            ) : (
              <table
                style={{
                  width: "100%",
                  borderCollapse: "collapse",
                  fontSize: 14,
                }}
              >
                <thead>
                  <tr style={{ textAlign: "left", borderBottom: "1px solid #E5E7EB" }}>
                    <th style={{ padding: "8px 4px" }}>Date</th>
                    <th style={{ padding: "8px 4px" }}>Commerçant</th>
                    <th style={{ padding: "8px 4px" }}>Montant achat</th>
                    <th style={{ padding: "8px 4px" }}>Cashback</th>
                    <th style={{ padding: "8px 4px" }}>Don SPA</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((tx) => (
                    <tr
                      key={tx.id}
                      style={{ borderBottom: "1px solid #F3F4F6" }}
                    >
                      <td style={{ padding: "8px 4px", whiteSpace: "nowrap" }}>
                        {formatDate(tx.created_at)}
                      </td>
                      <td
                        style={{
                          padding: "8px 4px",
                          maxWidth: 200,
                          whiteSpace: "nowrap",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                        }}
                      >
                        {tx.merchant_name || "Commerçant"}
                      </td>
                      <td style={{ padding: "8px 4px" }}>
                        {formatEuro(tx.purchase_amount)}
                      </td>
                      <td style={{ padding: "8px 4px" }}>
                        {formatEuro(tx.cashback_to_user)}
                      </td>
                      <td style={{ padding: "8px 4px" }}>
                        {formatEuro(tx.donation_amount)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}
      </div>
    </main>
  );
}
