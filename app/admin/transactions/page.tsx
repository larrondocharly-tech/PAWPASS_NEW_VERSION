"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabaseClient";

export const dynamic = "force-dynamic";

interface Transaction {
  id: string;
  created_at: string;
  amount: number | null;
  cashback_amount: number | null;
  donation_amount: number | null;
  spa_name: string | null;
  merchant_name: string | null;
  receipt_image_url: string | null;
  status: string | null;
}

export default function AdminTransactionsPage() {
  const supabase = createClient();

  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);

  const loadData = async () => {
    setLoading(true);
    setError(null);

    const { data, error } = await supabase
      .from("admin_transactions_detailed")
      .select(
        `
        id,
        created_at,
        amount,
        cashback_amount,
        donation_amount,
        receipt_image_url,
        status,
        spa_name,
        merchant_name
      `
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

  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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

  const translateStatus = (status: string | null) => {
    switch (status) {
      case "approved":
        return "Validée";
      case "rejected":
        return "Refusée";
      case "pending":
      default:
        return "En attente";
    }
  };

  const statusColor = (status: string | null) => {
    switch (status) {
      case "approved":
        return "#16a34a"; // vert
      case "rejected":
        return "#dc2626"; // rouge
      case "pending":
      default:
        return "#92400e"; // orange/brun
    }
  };

  // Voir le ticket : génère une URL signée et ouvre dans un nouvel onglet
  const handleViewReceipt = async (tx: Transaction) => {
    if (!tx.receipt_image_url) return;

    const { data, error } = await supabase.storage
      .from("receipts")
      .createSignedUrl(tx.receipt_image_url, 60 * 60); // 1h

    if (error || !data?.signedUrl) {
      console.error("Erreur URL ticket:", error);
      alert("Impossible d'afficher le ticket. Réessayez plus tard.");
      return;
    }

    window.open(data.signedUrl, "_blank", "noopener,noreferrer");
  };

  // Validation / refus d'une transaction par l'admin
  // -> appelle la fonction SQL admin_set_transaction_status
  const handleUpdateStatus = async (
    txId: string,
    newStatus: "approved" | "rejected"
  ) => {
    try {
      setActionLoadingId(txId);
      setError(null);

      const { error } = await supabase.rpc("admin_set_transaction_status", {
        p_tx_id: txId,
        p_new_status: newStatus,
      });

      if (error) {
        console.error("Erreur mise à jour statut (RPC):", error);
        setError(error.message);
        return;
      }

      // Met à jour localement sans recharger la page
      setTransactions((prev) =>
        prev.map((tx) =>
          tx.id === txId ? { ...tx, status: newStatus } : tx
        )
      );
    } finally {
      setActionLoadingId(null);
    }
  };

  return (
    <div style={{ padding: "24px", maxWidth: 1200, margin: "0 auto" }}>
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
              fontSize: 14,
            }}
          >
            <thead
              style={{
                background: "#f4f4f4",
                textAlign: "left",
              }}
            >
              <tr>
                <th style={{ padding: 12 }}>Date</th>
                <th style={{ padding: 12 }}>Commerçant</th>
                <th style={{ padding: 12 }}>SPA</th>
                <th style={{ padding: 12 }}>Montant achat</th>
                <th style={{ padding: 12 }}>Cashback client</th>
                <th style={{ padding: 12 }}>Don SPA</th>
                <th style={{ padding: 12 }}>Ticket</th>
                <th style={{ padding: 12 }}>Statut</th>
                <th style={{ padding: 12 }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {transactions.map((tx) => {
                const isPending = (tx.status ?? "pending") === "pending";
                const isLoadingRow = actionLoadingId === tx.id;

                return (
                  <tr key={tx.id} style={{ borderTop: "1px solid #eee" }}>
                    <td style={{ padding: 12 }}>
                      {formatDateTime(tx.created_at)}
                    </td>
                    <td style={{ padding: 12 }}>
                      {tx.merchant_name ?? "—"}
                    </td>
                    <td style={{ padding: 12 }}>
                      {tx.spa_name ?? "Sans SPA"}
                    </td>
                    <td style={{ padding: 12 }}>
                      {formatEuro(tx.amount)}
                    </td>
                    <td style={{ padding: 12 }}>
                      {formatEuro(tx.cashback_amount)}
                    </td>
                    <td style={{ padding: 12 }}>
                      {formatEuro(tx.donation_amount)}
                    </td>
                    <td style={{ padding: 12 }}>
                      {tx.receipt_image_url ? (
                        <button
                          type="button"
                          onClick={() => handleViewReceipt(tx)}
                          style={{
                            padding: "6px 10px",
                            borderRadius: 6,
                            border: "1px solid #ccc",
                            background: "#f9fafb",
                            cursor: "pointer",
                          }}
                        >
                          Voir le ticket
                        </button>
                      ) : (
                        <span style={{ color: "#6b7280" }}>Aucun</span>
                      )}
                    </td>
                    <td style={{ padding: 12 }}>
                      <span
                        style={{
                          padding: "3px 8px",
                          borderRadius: 999,
                          backgroundColor: "#f9fafb",
                          color: statusColor(tx.status ?? "pending"),
                          border: `1px solid ${statusColor(
                            tx.status ?? "pending"
                          )}`,
                          fontSize: 12,
                          fontWeight: 600,
                        }}
                      >
                        {translateStatus(tx.status ?? "pending")}
                      </span>
                    </td>
                    <td style={{ padding: 12 }}>
                      {isPending ? (
                        <div style={{ display: "flex", gap: 8 }}>
                          <button
                            type="button"
                            onClick={() =>
                              handleUpdateStatus(tx.id, "approved")
                            }
                            disabled={isLoadingRow}
                            style={{
                              padding: "6px 10px",
                              borderRadius: 6,
                              border: "none",
                              background: "#16a34a",
                              color: "white",
                              cursor: "pointer",
                              opacity: isLoadingRow ? 0.7 : 1,
                            }}
                          >
                            Valider
                          </button>
                          <button
                            type="button"
                            onClick={() =>
                              handleUpdateStatus(tx.id, "rejected")
                            }
                            disabled={isLoadingRow}
                            style={{
                              padding: "6px 10px",
                              borderRadius: 6,
                              border: "none",
                              background: "#dc2626",
                              color: "white",
                              cursor: "pointer",
                              opacity: isLoadingRow ? 0.7 : 1,
                            }}
                          >
                            Refuser
                          </button>
                        </div>
                      ) : (
                        <span style={{ color: "#6b7280", fontSize: 12 }}>
                          Aucune action
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}