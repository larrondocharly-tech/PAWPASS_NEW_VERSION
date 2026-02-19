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

  function normalizeReceiptPath(raw: string | null): string | null {
  if (!raw) return null;
  const v = raw.trim();
  if (!v) return null;

  if (!v.startsWith("http://") && !v.startsWith("https://")) {
    return v.replace(/^\/+/, "").replace(/^receipts\/+/, "");
  }

  try {
    const u = new URL(v);
    const parts = u.pathname.split("/").filter(Boolean);
    const idx = parts.findIndex((p) => p === "receipts");
    if (idx >= 0 && idx + 1 < parts.length) return parts.slice(idx + 1).join("/");
  } catch {}

  return null;
}

  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);

  // URL du ticket affiché dans la modale
  const [receiptModalUrl, setReceiptModalUrl] = useState<string | null>(null);

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

  // On gère aussi d'anciens statuts "validated" / "refused"
  const translateStatus = (status: string | null) => {
    switch (status) {
      case "approved":
      case "validated":
        return "Validée";
      case "rejected":
      case "refused":
        return "Refusée";
      case "pending":
      default:
        return "En attente";
    }
  };

  const statusColor = (status: string | null) => {
    switch (status) {
      case "approved":
      case "validated":
        return "#16a34a"; // vert
      case "rejected":
      case "refused":
        return "#dc2626"; // rouge
      case "pending":
      default:
        return "#92400e"; // orange/brun
    }
  };

  // Voir le ticket — on ouvre une modale avec l'image
  const handleViewReceipt = async (tx: Transaction) => {
  const receiptPath = normalizeReceiptPath(tx.receipt_image_url);
  console.log("[admin receipt]", tx.receipt_image_url, "->", receiptPath);
  if (!receiptPath) return;

  const { data, error } = await supabase.storage
    .from("receipts")
    .createSignedUrl(receiptPath, 60 * 60);

  if (error || !data?.signedUrl) {
    console.error("Erreur URL ticket:", error);
    alert("Impossible d'afficher le ticket. Réessayez plus tard.");
    return;
  }

  setReceiptModalUrl(data.signedUrl);
};


  // Validation / refus par l'admin
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

      // Mise à jour locale du statut
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
                const status = tx.status ?? "pending";
                const isPending = tx.status === "pending" || tx.status === "pending_review";
                const isLoadingRow = actionLoadingId === tx.id;

                // IMPORTANT :
                // - si la transaction n'est PAS validée (pending / refusée),
                //   on affiche 0 € en cashback et don, même si un montant théorique existe.
                const effectiveCashback =
                  status === "approved" || status === "validated"
                    ? tx.cashback_amount
                    : 0;
                const effectiveDonation =
                  status === "approved" || status === "validated"
                    ? tx.donation_amount
                    : 0;

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
                      {formatEuro(effectiveCashback)}
                    </td>
                    <td style={{ padding: 12 }}>
                      {formatEuro(effectiveDonation)}
                    </td>
                    <td
                      style={{
                        padding: 12,
                      }}
                    >
                      {tx.receipt_image_url ? (
                        <button
                          type="button"
                          onClick={() => handleViewReceipt(tx)}
                          style={{
                            padding: "6px 10px",
                            borderRadius: 6,
                            border: "1px solid #D1D5DB",
                            background: "#F9FAFB",
                            cursor: "pointer",
                            fontSize: 13,
                            color: "#2563EB",
                            fontWeight: 500,
                          }}
                        >
                          Voir le ticket
                        </button>
                      ) : (
                        <span style={{ color: "#6b7280", fontSize: 13 }}>
                          Aucun
                        </span>
                      )}
                    </td>
                    <td style={{ padding: 12 }}>
                      <span
                        style={{
                          padding: "3px 8px",
                          borderRadius: 999,
                          backgroundColor: "#f9fafb",
                          color: statusColor(status),
                          border: `1px solid ${statusColor(status)}`,
                          fontSize: 12,
                          fontWeight: 600,
                        }}
                      >
                        {translateStatus(status)}
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

      {/* MODALE D'AFFICHAGE DU TICKET */}
      {receiptModalUrl && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            backgroundColor: "rgba(15, 23, 42, 0.7)",
            zIndex: 50,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "16px",
          }}
        >
          {/* Bouton X pour fermer */}
          <button
            type="button"
            onClick={() => setReceiptModalUrl(null)}
            style={{
              position: "absolute",
              top: 16,
              right: 16,
              width: 32,
              height: 32,
              borderRadius: "999px",
              border: "none",
              backgroundColor: "rgba(15, 23, 42, 0.85)",
              color: "#F9FAFB",
              fontSize: 18,
              fontWeight: 700,
              cursor: "pointer",
            }}
          >
            ×
          </button>

          <div
            style={{
              maxWidth: "100%",
              maxHeight: "100%",
              backgroundColor: "#FFFFFF",
              borderRadius: 12,
              padding: 8,
              boxShadow: "0 20px 40px rgba(0,0,0,0.35)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <img
              src={receiptModalUrl}
              alt="Ticket de caisse"
              style={{
                maxWidth: "100%",
                maxHeight: "80vh",
                borderRadius: 8,
                objectFit: "contain",
              }}
            />
          </div>
        </div>
      )}
    </div>
  );
}
