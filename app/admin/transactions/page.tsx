"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabaseClient";
import TopNav from "@/components/TopNav";

export const dynamic = "force-dynamic";

interface Transaction {
  id: string;
  created_at: string;
  amount: number | null;
  cashback_amount: number | null;
  donation_amount: number | null;
  spa_name: string | null;
  merchant_name: string | null;
}

export default function AdminTransactionsPage() {
  const supabase = createClient();

  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      setError(null);

      const { data, error } = await supabase
        .from("admin_transactions_detailed")
        .select(
          "id, created_at, amount, cashback_amount, donation_amount, spa_name, merchant_name"
        )
        .order("created_at", { ascending: false });

      if (error) {
        console.error("Erreur chargement transactions admin:", error);
        setError(error.message);
        setLoading(false);
        return;
      }

      setTransactions(data ?? []);
      setLoading(false);
    };

    loadData();
  }, [supabase]);

  const formatEuro = (value: number | null | undefined) => {
    const safe = typeof value === "number" && !isNaN(value) ? value : 0;
    return safe.toFixed(2) + " €";
  };

  const formatDateTime = (iso: string) => {
    if (!iso) return "";
    const d = new Date(iso);
    return d.toLocaleString("fr-FR", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });
  };

  return (
    <div>
      <TopNav />

      <main style={{ padding: "24px", maxWidth: 1100, margin: "0 auto" }}>
        <h1 style={{ fontSize: 24, marginBottom: 16 }}>
          Transactions détaillées
        </h1>

        {loading && <p>Chargement des transactions…</p>}

        {error && (
          <p style={{ color: "red", marginBottom: 16 }}>
            Erreur : {error}
          </p>
        )}

        {!loading && !error && transactions.length === 0 && (
          <p>Aucune transaction pour le moment.</p>
        )}

        {!loading && !error && transactions.length > 0 && (
          <div style={{ overflowX: "auto" }}>
            <table
              style={{
                width: "100%",
                borderCollapse: "collapse",
                background: "white",
                borderRadius: 12,
                overflow: "hidden",
              }}
            >
              <thead
                style={{
                  background: "#f4f4f4",
                  textAlign: "left",
                  fontSize: 14,
                }}
              >
                <tr>
                  <th style={{ padding: 12 }}>Date</th>
                  <th style={{ padding: 12 }}>Commerçant</th>
                  <th style={{ padding: 12 }}>SPA</th>
                  <th style={{ padding: 12 }}>Montant achat</th>
                  <th style={{ padding: 12 }}>Cashback client</th>
                  <th style={{ padding: 12 }}>Don SPA</th>
                </tr>
              </thead>
              <tbody>
                {transactions.map((tx) => (
                  <tr key={tx.id} style={{ borderTop: "1px solid #eee" }}>
                    <td style={{ padding: 12 }}>
                      {formatDateTime(tx.created_at)}
                    </td>
                    <td style={{ padding: 12 }}>
                      {tx.merchant_name ?? "—"}
                    </td>
                    <td style={{ padding: 12 }}>{tx.spa_name ?? "Sans SPA"}</td>
                    <td style={{ padding: 12 }}>{formatEuro(tx.amount)}</td>
                    <td style={{ padding: 12 }}>
                      {formatEuro(tx.cashback_amount)}
                    </td>
                    <td style={{ padding: 12 }}>
                      {formatEuro(tx.donation_amount)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </main>
    </div>
  );
}
