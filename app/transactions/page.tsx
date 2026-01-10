"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabaseClient";
export const dynamic = "force-dynamic";

interface Transaction {
  id: string;
  purchase_amount: number;
  cashback_to_user: number;
  donation_amount: number;
  cashback_total: number;
  created_at: string;
  merchant_name: string | null;
  spa_name: string | null;
}

export default function TransactionsPage() {
  const supabase = createClient();
  const [loading, setLoading] = useState(true);
  const [transactions, setTransactions] = useState<Transaction[]>([]);

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);

      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError || !user) {
        setLoading(false);
        return;
      }

      const { data, error } = await supabase
        .from("client_transactions_history")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      if (error) {
        console.error("Erreur chargement transactions :", error);
        setLoading(false);
        return;
      }

      const mapped =
        data?.map((row: any) => ({
          id: row.id,
          purchase_amount: Number(row.purchase_amount) || 0,
          cashback_to_user: Number(row.cashback_to_user) || 0,
          donation_amount: Number(row.donation_amount) || 0,
          cashback_total: Number(row.cashback_total) || 0,
          created_at: row.created_at,
          merchant_name: row.merchant_name ?? null,
          spa_name: row.spa_name ?? null,
        })) ?? [];

      setTransactions(mapped);
      setLoading(false);
    };

    loadData();
  }, [supabase]);

  if (loading) {
    return (
      <div style={{ padding: 24 }}>
        <p>Chargement de vos transactions...</p>
      </div>
    );
  }

  return (
    <div style={{ padding: "32px 16px", maxWidth: 900, margin: "0 auto" }}>
      <h1 style={{ fontSize: 26, fontWeight: 700, marginBottom: 16 }}>
        Historique de vos transactions
      </h1>

      {transactions.length === 0 && (
        <p style={{ color: "#6b7280" }}>Vous n&apos;avez pas encore de transactions.</p>
      )}

      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        {transactions.map((tx) => (
          <div
            key={tx.id}
            style={{
              backgroundColor: "white",
              borderRadius: 16,
              padding: 16,
              boxShadow: "0 4px 12px rgba(15,23,42,0.06)",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              gap: 12,
            }}
          >
            <div>
              <p style={{ fontWeight: 600 }}>
                {tx.merchant_name || "Commerçant inconnu"}
              </p>
              <p style={{ fontSize: 14, color: "#6b7280" }}>
                {new Date(tx.created_at).toLocaleString("fr-FR")}
              </p>
              {tx.spa_name && (
                <p style={{ fontSize: 13, color: "#16a34a", marginTop: 4 }}>
                  Refuge bénéficiaire : {tx.spa_name}
                </p>
              )}
            </div>

            <div style={{ textAlign: "right" }}>
              <p style={{ fontWeight: 700 }}>
                {tx.purchase_amount.toFixed(2)} €
              </p>
              <p style={{ fontSize: 13, color: "#0ea5e9" }}>
                Cashback reçu : {tx.cashback_to_user.toFixed(2)} €
              </p>
              <p style={{ fontSize: 13, color: "#16a34a" }}>
                Don SPA : {tx.donation_amount.toFixed(2)} €
              </p>
              <p style={{ fontSize: 12, color: "#6b7280", marginTop: 4 }}>
                Cashback total généré : {tx.cashback_total.toFixed(2)} €
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
