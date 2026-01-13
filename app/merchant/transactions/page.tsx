"use client";

import { useEffect, useState } from "react";
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
  cashback_amount: number | null;
  donation_amount: number | null;
  created_at: string;
  receipt_image_url: string | null;
  status: string | null;
}

export default function MerchantTransactionsPage() {
  const supabase = createClient();
  const router = useRouter();

  const [profile, setProfile] = useState<MerchantProfile | null>(null);
  const [transactions, setTransactions] = useState<MerchantTransaction[]>([]);
  const [receiptThreshold, setReceiptThreshold] = useState<number>(50);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);

  // URL du ticket affiché dans la modale
  const [receiptModalUrl, setReceiptModalUrl] = useState<string | null>(null);

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      setError(null);

      // 1) Utilisateur connecté
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        router.replace("/login");
        return;
      }

      // 2) Profil commerçant
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

      if (
        !profileData ||
        profileData.role?.toLowerCase() !== "merchant" ||
        !profileData.merchant_id
      ) {
        router.replace("/dashboard");
        return;
      }

      setProfile(profileData);

      // 3) Charger le seuil de ticket depuis la table merchants
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

      // 4) Transactions de CE commerçant, uniquement :
      // - montant >= threshold
      // - statut "pending" (en attente)
      const { data: transactionData, error: transactionError } = await supabase
        .from("transactions")
        .select(
          "id, amount, cashback_amount, donation_amount, created_at, receipt_image_url, status"
        )
        .eq("merchant_id", profileData.merchant_id)
        .gte("amount", threshold)
        .eq("status", "pending")
        .order("created_at", { ascending: false });

      if (transactionError) {
        setError(transactionError.message);
        setLoading(false);
        return;
      }

      setTransactions((transactionData ?? []) as MerchantTransaction[]);
      setLoading(false);
    };

    void loadData();
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

  // Voir le ticket (via URL signée du bucket "receipts") → modale
  const handleViewReceipt = async (tx: MerchantTransaction) => {
    if (!tx.receipt_image_url) return;

    const { data, error } = await supabase.storage
      .from("receipts")
      .createSignedUrl(tx.receipt_image_url, 60 * 60); // 1h

    if (error || !data?.signedUrl) {
      console.error("Erreur URL ticket:", error);
      alert("Impossible d'afficher le ticket. Réessayez plus tard.");
      return;
    }

    // On affiche l'image dans une modale sur la même page
    setReceiptModalUrl(data.signedUrl);
  };

  // Validation / refus par le commerçant
  const handleUpdateStatus = async (
    txId: string,
    newStatus: "approved" | "rejected"
  ) => {
    try {
      setActionLoadingId(txId);
      setError(null);

      const { error } = await supabase.rpc("merchant_set_transaction_status", {
        p_tx_id: txId,
        p_new_status: newStatus,
      });

      if (error) {
        console.error("Erreur mise à jour statut marchand (RPC):", error);
        setError(error.message);
        return;
      }

      // On retire la transaction de la liste après traitement
      setTransactions((prev) => prev.filter((tx) => tx.id !== txId));
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
            Seules les transactions de {receiptThreshold} € et plus
            apparaissent ici. Vous devez les valider ou les refuser après
            vérification du ticket de caisse.
          </p>
        )}

        {loading ? (
          <p className="helper">Chargement des transactions…</p>
        ) : error ? (
          <p className="error">Erreur : {error}</p>
        ) : transactions.length === 0 ? (
          <p className="helper">
            Aucune transaction à valider pour le moment (≥ {receiptThreshold} €).
          </p>
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

                  return (
                    <tr key={tx.id}>
                      <td>{formatDateTime(tx.created_at)}</td>
                      <td>{formatCurrency(tx.amount)}</td>
                      <td>{formatCurrency(tx.cashback_amount ?? 0)}</td>
                      <td>{formatCurrency(tx.donation_amount ?? 0)}</td>
                      <td>
                        {tx.receipt_image_url ? (
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
                        <div
                          style={{
                            display: "flex",
                            gap: 8,
                            flexWrap: "wrap",
                          }}
                        >
                          <button
                            type="button"
                            onClick={() =>
                              handleUpdateStatus(tx.id, "approved")
                            }
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
                            onClick={() =>
                              handleUpdateStatus(tx.id, "rejected")
                            }
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

      {/* MODALE D'AFFICHAGE DU TICKET POUR LE COMMERÇANT */}
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
