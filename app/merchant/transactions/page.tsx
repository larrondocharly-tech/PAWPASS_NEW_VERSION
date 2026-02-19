"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabaseClient";
import { formatCurrency } from "@/lib/utils";

export const dynamic = "force-dynamic";

interface MerchantProfile {
  id: string;
  role: string | null;
  merchant_id: string | null;
}

interface MerchantTransaction {
  id: string;
  amount: number;
  cashback_to_user: number | null;
  donation_amount: number | null;
  created_at: string;
  receipt_image_url: string | null;
  receipt_url: string | null;
  status: string | null;
}

function normalizeReceiptPath(raw: string | null): string | null {
  if (!raw) return null;
  const v = raw.trim();
  if (!v) return null;

  // ✅ Déjà un path (ex: "uuid/123.jpg" ou "receipts/uuid/123.jpg")
  if (!v.startsWith("http://") && !v.startsWith("https://")) {
    return v.replace(/^\/+/, "").replace(/^receipts\/+/, "");
  }

  // ✅ URL complète -> on extrait le morceau après /receipts/
  try {
    const u = new URL(v);
    const parts = u.pathname.split("/").filter(Boolean);
    const idx = parts.findIndex((p) => p === "receipts");
    if (idx >= 0 && idx + 1 < parts.length) return parts.slice(idx + 1).join("/");
  } catch {
    // noop
  }

  return null;
}

function isPdfPath(path: string) {
  return path.toLowerCase().endsWith(".pdf");
}

export default function MerchantTransactionsPage() {
  const router = useRouter();

  // ✅ IMPORTANT: instancier 1 seule fois
  const supabase = useMemo(() => createClient(), []);

  const [profile, setProfile] = useState<MerchantProfile | null>(null);
  const [transactions, setTransactions] = useState<MerchantTransaction[]>([]);
  const [receiptThreshold, setReceiptThreshold] = useState<number>(50);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);

  // Modal
  const [receiptModalUrl, setReceiptModalUrl] = useState<string | null>(null);
  const [receiptModalIsPdf, setReceiptModalIsPdf] = useState<boolean>(false);

  const loadTransactions = async (merchantId: string, threshold: number) => {
    const { data, error: transactionError } = await supabase
      .from("transactions")
      .select("id, amount, cashback_to_user, donation_amount, created_at, receipt_image_url, receipt_url, status")
      .eq("merchant_id", merchantId)
      .gte("amount", threshold)
      .eq("status", "pending_review")
      .order("created_at", { ascending: false });

    if (transactionError) throw transactionError;
    setTransactions((data ?? []) as MerchantTransaction[]);
  };

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      setError(null);

      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        router.replace("/login");
        return;
      }

      const { data: profileData, error: profileError } = await supabase
        .from("profiles")
        .select("id, role, merchant_id")
        .eq("id", user.id)
        .single();

      if (profileError) {
        setError(profileError.message);
        setLoading(false);
        return;
      }

      if (!profileData || profileData.role?.toLowerCase() !== "merchant" || !profileData.merchant_id) {
        router.replace("/dashboard");
        return;
      }

      setProfile(profileData);

      let threshold = 50;
      const { data: merchant, error: merchantError } = await supabase
        .from("merchants")
        .select("receipt_threshold")
        .eq("id", profileData.merchant_id)
        .single();

      if (merchantError) {
        console.error("Erreur chargement seuil commerçant :", merchantError);
      } else if (typeof merchant?.receipt_threshold === "number") {
        threshold = merchant.receipt_threshold;
      }

      setReceiptThreshold(threshold);

      try {
        await loadTransactions(profileData.merchant_id, threshold);
      } catch (e: any) {
        setError(e?.message ?? "Erreur chargement transactions");
      } finally {
        setLoading(false);
      }
    };

    void loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [router, supabase]);

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

  const getReceiptPath = (tx: MerchantTransaction) => {
    // ✅ priorité à receipt_image_url (nouveau)
    const raw = tx.receipt_image_url ?? tx.receipt_url ?? null;
    return normalizeReceiptPath(raw);
  };

  /**
   * ✅ FIX PRINCIPAL
   * - On tente d’abord createSignedUrl(path)
   * - si "Object not found" => on tente createSignedUrl("receipts/"+path) (cas où la DB a stocké "receipts/...")
   * - Support PDF: affiche dans <iframe> au lieu de <img>
   */
  const getSignedUrlSmart = async (path: string, expiresSec = 60 * 60) => {
    // 1) path direct
    const try1 = await supabase.storage.from("receipts").createSignedUrl(path, expiresSec);
    if (try1.data?.signedUrl) return { signedUrl: try1.data.signedUrl, usedPath: path };

    const msg1 = (try1.error?.message || "").toLowerCase();
    const notFound = msg1.includes("object not found") || msg1.includes("not found");

    // 2) fallback "receipts/..."
    if (notFound && !path.startsWith("receipts/")) {
      const p2 = `receipts/${path.replace(/^\/+/, "")}`;
      const try2 = await supabase.storage.from("receipts").createSignedUrl(p2, expiresSec);
      if (try2.data?.signedUrl) return { signedUrl: try2.data.signedUrl, usedPath: p2 };
      return { signedUrl: null as string | null, usedPath: p2, error: try2.error ?? try1.error };
    }

    return { signedUrl: null as string | null, usedPath: path, error: try1.error };
  };

  const handleViewReceipt = async (tx: MerchantTransaction) => {
    const receiptPath = getReceiptPath(tx);

    console.log("[receipt] raw =", tx.receipt_image_url ?? tx.receipt_url, "-> normalized =", receiptPath);

    if (!receiptPath) {
      alert("Aucun ticket attaché à cette transaction.");
      return;
    }

    const { signedUrl, usedPath, error } = await getSignedUrlSmart(receiptPath, 60 * 60);

    if (!signedUrl) {
      console.error("Erreur URL ticket:", error, "usedPath:", usedPath);

      // ✅ message actionnable
      const details = error?.message ? `\n\nDétail: ${error.message}` : "";
      alert(`Impossible d'afficher le ticket.${details}`);
      return;
    }

    console.log("[receipt] signed ok, usedPath =", usedPath);
    setReceiptModalIsPdf(isPdfPath(receiptPath) || isPdfPath(usedPath));
    setReceiptModalUrl(signedUrl);
  };

  // ✅ VALIDER ticket : pending_review -> approved + crédite wallet en pending
  const handleConfirm = async (txId: string) => {
    try {
      setActionLoadingId(txId);
      setError(null);

      const { data, error } = await supabase.rpc("approve_transaction", { p_tx_id: txId });

      if (error) {
        console.error("Erreur validation (RPC approve_transaction):", error);
        setError(error.message);
        return;
      }

      if (data && typeof data === "object" && (data as any).ok === false) {
        setError((data as any).error ?? "Validation impossible");
        return;
      }

      setTransactions((prev) => prev.filter((tx) => tx.id !== txId));
      router.refresh();
    } finally {
      setActionLoadingId(null);
    }
  };

  // ❌ REFUSER ticket : pending_review -> rejected
  const handleReject = async (txId: string) => {
    try {
      setActionLoadingId(txId);
      setError(null);

      const { data, error } = await supabase.rpc("reject_transaction", { p_tx_id: txId });

      if (error) {
        console.error("Erreur refus (RPC reject_transaction):", error);
        setError(error.message);
        return;
      }

      if (data && typeof data === "object" && (data as any).ok === false) {
        setError((data as any).error ?? "Refus impossible");
        return;
      }

      setTransactions((prev) => prev.filter((tx) => tx.id !== txId));
      router.refresh();
    } finally {
      setActionLoadingId(null);
    }
  };

  return (
    <div className="container" style={{ paddingTop: 24, paddingBottom: 24 }}>
      <div className="card">
        <h2>Transactions à valider (≥ {receiptThreshold} €)</h2>

        {profile && (
          <p className="helper" style={{ marginTop: 4 }}>
            Seules les transactions de {receiptThreshold} € et plus apparaissent ici. Vous devez les valider ou les refuser après vérification du ticket de caisse.
          </p>
        )}

        {loading ? (
          <p className="helper">Chargement des transactions…</p>
        ) : error ? (
          <p className="error">Erreur : {error}</p>
        ) : transactions.length === 0 ? (
          <p className="helper">Aucune transaction à valider pour le moment (≥ {receiptThreshold} €).</p>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table className="table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Montant achat</th>
                  <th>Cashback client</th>
                  <th>Don SPA</th>
                  <th>Ticket</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {transactions.map((tx) => {
                  const isLoadingRow = actionLoadingId === tx.id;
                  const receiptPath = getReceiptPath(tx);

                  return (
                    <tr key={tx.id}>
                      <td>{formatDateTime(tx.created_at)}</td>
                      <td>{formatCurrency(tx.amount)}</td>
                      <td>{formatCurrency(tx.cashback_to_user ?? 0)}</td>
                      <td>{formatCurrency(tx.donation_amount ?? 0)}</td>
                      <td>
                        {receiptPath ? (
                          <button
                            type="button"
                            onClick={() => handleViewReceipt(tx)}
                            style={{
                              padding: "4px 8px",
                              borderRadius: 6,
                              border: "1px solid #ccc",
                              background: "#f9fafb",
                              cursor: "pointer",
                              fontSize: 13,
                            }}
                          >
                            Voir le ticket
                          </button>
                        ) : (
                          <span style={{ color: "#6b7280" }}>Aucun</span>
                        )}
                      </td>
                      <td>
                        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                          <button
                            type="button"
                            onClick={() => handleConfirm(tx.id)}
                            disabled={isLoadingRow}
                            style={{
                              padding: "4px 8px",
                              borderRadius: 6,
                              border: "none",
                              background: "#16a34a",
                              color: "white",
                              cursor: "pointer",
                              fontSize: 13,
                              opacity: isLoadingRow ? 0.7 : 1,
                            }}
                          >
                            {isLoadingRow ? "Validation…" : "Valider"}
                          </button>

                          <button
                            type="button"
                            onClick={() => handleReject(tx.id)}
                            disabled={isLoadingRow}
                            style={{
                              padding: "4px 8px",
                              borderRadius: 6,
                              border: "none",
                              background: "#dc2626",
                              color: "white",
                              cursor: "pointer",
                              fontSize: 13,
                              opacity: isLoadingRow ? 0.7 : 1,
                            }}
                          >
                            {isLoadingRow ? "Traitement…" : "Refuser"}
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

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
            onClick={() => {
              setReceiptModalUrl(null);
              setReceiptModalIsPdf(false);
            }}
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
              width: "min(980px, 100%)",
            }}
          >
            {receiptModalIsPdf ? (
              <iframe
                src={receiptModalUrl}
                title="Ticket PDF"
                style={{
                  width: "min(940px, 100%)",
                  height: "80vh",
                  border: "none",
                  borderRadius: 8,
                }}
              />
            ) : (
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
            )}
          </div>
        </div>
      )}
    </div>
  );
}
