"use client";

import { useEffect, useMemo, useState } from "react";
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

interface MonthlyClosure {
  id: string;
  month: string;
  date_from: string;
  date_to: string;
  nb_transactions: number;
  total_amount: number;
  total_cashback: number;
  total_donations: number;
  created_at: string;
}

function getCurrentMonthValue() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  return `${year}-${month}`;
}

function getMonthRange(monthValue: string) {
  const [yearStr, monthStr] = monthValue.split("-");
  const year = Number(yearStr);
  const month = Number(monthStr);

  if (!year || !month) {
    return null;
  }

  const start = new Date(year, month - 1, 1);
  const end = new Date(year, month, 0);

  const dateFrom = `${yearStr}-${monthStr}-01`;
  const dateTo = `${yearStr}-${monthStr}-${String(end.getDate()).padStart(2, "0")}`;

  return {
    dateFrom,
    dateTo,
    label: start.toLocaleDateString("fr-FR", {
      month: "long",
      year: "numeric",
    }),
  };
}

export default function AdminTransactionsPage() {
  const supabase = createClient();

  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [closures, setClosures] = useState<MonthlyClosure[]>([]);
  const [selectedMonth, setSelectedMonth] = useState<string>(getCurrentMonthValue());

  const [loading, setLoading] = useState(true);
  const [loadingClosures, setLoadingClosures] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);
  const [closingMonth, setClosingMonth] = useState(false);

  const [receiptModalUrl, setReceiptModalUrl] = useState<string | null>(null);

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

  const monthInfo = useMemo(() => getMonthRange(selectedMonth), [selectedMonth]);

  const loadTransactions = async () => {
    const { data, error } = await supabase
      .from("admin_transactions_detailed")
      .select(`
        id,
        created_at,
        amount,
        cashback_amount,
        donation_amount,
        receipt_image_url,
        status,
        spa_name,
        merchant_name
      `)
      .order("created_at", { ascending: false });

    if (error) {
      throw error;
    }

    setTransactions((data ?? []) as Transaction[]);
  };

  const loadClosures = async () => {
    setLoadingClosures(true);

    const { data, error } = await supabase
      .from("monthly_closures")
      .select("*")
      .order("date_from", { ascending: false });

    if (error) {
      throw error;
    }

    setClosures((data ?? []) as MonthlyClosure[]);
    setLoadingClosures(false);
  };

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);

      await Promise.all([loadTransactions(), loadClosures()]);
    } catch (e: any) {
      console.error("Erreur chargement admin transactions:", e);
      setError(e?.message || "Erreur de chargement.");
    } finally {
      setLoading(false);
      setLoadingClosures(false);
    }
  };

  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const formatEuro = (value: number | null | undefined) => {
    const safe =
      typeof value === "number"
        ? value
        : value != null
        ? Number(value)
        : 0;

    const finalValue = Number.isFinite(safe) ? safe : 0;

    return finalValue.toFixed(2).replace(".", ",") + " €";
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

  const formatDate = (iso: string) => {
    if (!iso) return "";
    return new Date(iso).toLocaleDateString("fr-FR");
  };

  const translateStatus = (status: string | null) => {
    switch (status) {
      case "approved":
        return "Approuvée";
      case "validated":
        return "Validée mensuellement";
      case "rejected":
      case "refused":
        return "Refusée";
      case "pending_review":
        return "À vérifier";
      case "pending":
      default:
        return "En attente";
    }
  };

  const statusColor = (status: string | null) => {
    switch (status) {
      case "validated":
        return "#166534";
      case "approved":
        return "#16a34a";
      case "rejected":
      case "refused":
        return "#dc2626";
      case "pending_review":
        return "#c2410c";
      case "pending":
      default:
        return "#92400e";
    }
  };

  const handleViewReceipt = async (tx: Transaction) => {
    const receiptPath = normalizeReceiptPath(tx.receipt_image_url);
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

      setTransactions((prev) =>
        prev.map((tx) =>
          tx.id === txId ? { ...tx, status: newStatus } : tx
        )
      );
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleCloseMonth = async () => {
    if (!monthInfo) {
      alert("Mois invalide.");
      return;
    }

    const alreadyClosed = closures.some((c) => c.month === selectedMonth);
    if (alreadyClosed) {
      alert("Ce mois est déjà validé.");
      return;
    }

    const ok = window.confirm(
      `Valider le mois de ${monthInfo.label} (${monthInfo.dateFrom} au ${monthInfo.dateTo}) ?`
    );

    if (!ok) return;

    try {
      setClosingMonth(true);
      setError(null);

      const { error } = await supabase.rpc("close_month", {
        p_date_from: monthInfo.dateFrom,
        p_date_to: monthInfo.dateTo,
      });

      if (error) {
        console.error("Erreur close_month:", error);
        setError(error.message);
        return;
      }

      await Promise.all([loadTransactions(), loadClosures()]);
      alert("Mois validé avec succès.");
    } finally {
      setClosingMonth(false);
    }
  };

  const currentMonthAlreadyClosed = closures.some((c) => c.month === selectedMonth);

  return (
    <div style={{ padding: "24px", maxWidth: 1280, margin: "0 auto" }}>
      <h1 style={{ fontSize: 24, marginBottom: 16 }}>Transactions détaillées</h1>

      {error && (
        <p style={{ color: "red", marginBottom: 16 }}>
          Erreur : {error}
        </p>
      )}

      {/* Bloc clôture mensuelle */}
      <section
        style={{
          marginBottom: 24,
          padding: 20,
          borderRadius: 16,
          background: "#ffffff",
          boxShadow: "0 4px 12px rgba(0,0,0,0.06)",
          border: "1px solid #E5E7EB",
        }}
      >
        <h2 style={{ fontSize: 18, fontWeight: 700, marginBottom: 14 }}>
          Clôture mensuelle
        </h2>

        <div
          style={{
            display: "flex",
            gap: 12,
            flexWrap: "wrap",
            alignItems: "end",
          }}
        >
          <div style={{ minWidth: 220 }}>
            <label
              style={{
                display: "block",
                fontSize: 13,
                fontWeight: 600,
                marginBottom: 6,
              }}
            >
              Choisir un mois
            </label>
            <input
              type="month"
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              style={{
                width: "100%",
                padding: "10px 12px",
                borderRadius: 10,
                border: "1px solid #D1D5DB",
                background: "#fff",
              }}
            />
          </div>

          <div style={{ minWidth: 260 }}>
            <div
              style={{
                fontSize: 13,
                color: "#374151",
                marginBottom: 6,
                fontWeight: 600,
              }}
            >
              Période
            </div>
            <div
              style={{
                padding: "10px 12px",
                borderRadius: 10,
                background: "#F9FAFB",
                border: "1px solid #E5E7EB",
                minHeight: 42,
                display: "flex",
                alignItems: "center",
              }}
            >
              {monthInfo
                ? `${monthInfo.label} — du ${monthInfo.dateFrom} au ${monthInfo.dateTo}`
                : "Mois invalide"}
            </div>
          </div>

          <button
            type="button"
            onClick={handleCloseMonth}
            disabled={!monthInfo || currentMonthAlreadyClosed || closingMonth}
            style={{
              padding: "10px 16px",
              borderRadius: 10,
              border: "none",
              background:
                !monthInfo || currentMonthAlreadyClosed || closingMonth
                  ? "#D1D5DB"
                  : "#111827",
              color: "#FFFFFF",
              cursor:
                !monthInfo || currentMonthAlreadyClosed || closingMonth
                  ? "not-allowed"
                  : "pointer",
              fontWeight: 700,
            }}
          >
            {closingMonth
              ? "Validation en cours..."
              : currentMonthAlreadyClosed
              ? "Mois déjà validé"
              : "Valider le mois"}
          </button>
        </div>
      </section>

      {/* Historique clôtures */}
      <section
        style={{
          marginBottom: 24,
          padding: 20,
          borderRadius: 16,
          background: "#ffffff",
          boxShadow: "0 4px 12px rgba(0,0,0,0.06)",
          border: "1px solid #E5E7EB",
        }}
      >
        <h2 style={{ fontSize: 18, fontWeight: 700, marginBottom: 14 }}>
          Historique des mois validés
        </h2>

        {loadingClosures ? (
          <p>Chargement de l’historique…</p>
        ) : closures.length === 0 ? (
          <p style={{ color: "#6B7280" }}>Aucun mois validé pour le moment.</p>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table
              style={{
                width: "100%",
                borderCollapse: "collapse",
                background: "white",
                fontSize: 14,
              }}
            >
              <thead style={{ background: "#F9FAFB", textAlign: "left" }}>
                <tr>
                  <th style={{ padding: 12 }}>Mois</th>
                  <th style={{ padding: 12 }}>Période</th>
                  <th style={{ padding: 12, textAlign: "right" }}>Transactions</th>
                  <th style={{ padding: 12, textAlign: "right" }}>Total achats</th>
                  <th style={{ padding: 12, textAlign: "right" }}>Cashback validé</th>
                  <th style={{ padding: 12, textAlign: "right" }}>Dons validés</th>
                  <th style={{ padding: 12 }}>Validé le</th>
                </tr>
              </thead>
              <tbody>
                {closures.map((closure) => (
                  <tr key={closure.id} style={{ borderTop: "1px solid #EEE" }}>
                    <td style={{ padding: 12, fontWeight: 600 }}>{closure.month}</td>
                    <td style={{ padding: 12 }}>
                      {formatDate(closure.date_from)} → {formatDate(closure.date_to)}
                    </td>
                    <td style={{ padding: 12, textAlign: "right" }}>
                      {closure.nb_transactions}
                    </td>
                    <td style={{ padding: 12, textAlign: "right" }}>
                      {formatEuro(closure.total_amount)}
                    </td>
                    <td style={{ padding: 12, textAlign: "right" }}>
                      {formatEuro(closure.total_cashback)}
                    </td>
                    <td style={{ padding: 12, textAlign: "right" }}>
                      {formatEuro(closure.total_donations)}
                    </td>
                    <td style={{ padding: 12 }}>{formatDateTime(closure.created_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* Transactions */}
      <section
        style={{
          padding: 20,
          borderRadius: 16,
          background: "#ffffff",
          boxShadow: "0 4px 12px rgba(0,0,0,0.06)",
          border: "1px solid #E5E7EB",
        }}
      >
        {loading ? (
          <p>Chargement des transactions…</p>
        ) : transactions.length === 0 ? (
          <p>Aucune transaction pour le moment.</p>
        ) : (
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
                  const isPendingReview =
                    tx.status === "pending" || tx.status === "pending_review";
                  const isLoadingRow = actionLoadingId === tx.id;

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
                      <td style={{ padding: 12 }}>
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
                        {isPendingReview ? (
                          <div style={{ display: "flex", gap: 8 }}>
                            <button
                              type="button"
                              onClick={() => handleUpdateStatus(tx.id, "approved")}
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
                              onClick={() => handleUpdateStatus(tx.id, "rejected")}
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
      </section>

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