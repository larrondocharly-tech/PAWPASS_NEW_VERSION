"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabaseClient";

export const dynamic = "force-dynamic";

interface Spa {
  id: string;
  name: string;
}

export default function ScanInner() {
  const router = useRouter();
  const searchParams = useSearchParams();

  // ✅ ne pas recréer supabase à chaque render
  const supabase = useMemo(() => createClient(), []);

  const merchantCode = searchParams.get("m") || searchParams.get("code") || null;

  const [merchantFound, setMerchantFound] = useState<any>(null);
  const [loadingMerchant, setLoadingMerchant] = useState(false);

  const [amount, setAmount] = useState("");
  const [spas, setSpas] = useState<Spa[]>([]);
  const [selectedSpaId, setSelectedSpaId] = useState("");
  const [donationPercent, setDonationPercent] = useState<50 | 100>(50);

  const [receiptFile, setReceiptFile] = useState<File | null>(null);
  const [isUploadingReceipt, setIsUploadingReceipt] = useState(false);

  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [showThankYou, setShowThankYou] = useState(false);

  // =========================
  // Chargement des SPAs
  // =========================
  useEffect(() => {
    const load = async () => {
      const { data, error } = await supabase
        .from("spas")
        .select("id, name")
        .order("name", { ascending: true });

      if (error) {
        console.error(error);
        setError("Erreur lors du chargement des refuges.");
        return;
      }

      setSpas(data || []);
    };
    load();
  }, [supabase]);

  // =========================
  // Chargement du commerçant
  // =========================
  useEffect(() => {
    if (!merchantCode) return;

    const loadMerchant = async () => {
      setLoadingMerchant(true);
      setError(null);
      setErrorMsg(null);

      const { data, error } = await supabase
        .from("merchants")
        .select("*")
        .eq("qr_token", merchantCode)
        .single();

      if (error) {
        console.error(error);
        setMerchantFound(null);
        setError("Commerçant introuvable.");
      } else {
        setMerchantFound(data || null);
      }

      setLoadingMerchant(false);
    };

    loadMerchant();
  }, [merchantCode, supabase]);

  const getMinReceiptAmount = (): number => {
    if (!merchantFound) return 20;

    if (typeof merchantFound.receipt_threshold === "number" && !Number.isNaN(merchantFound.receipt_threshold)) {
      return merchantFound.receipt_threshold;
    }

    if (typeof merchantFound.min_receipt_amount === "number" && !Number.isNaN(merchantFound.min_receipt_amount)) {
      return merchantFound.min_receipt_amount;
    }

    return 20;
  };

  // =========================
  // Upload du ticket
  // =========================
  const uploadReceiptIfNeeded = async (
    userId: string,
    amountNumber: number,
    minReceiptAmount: number
  ): Promise<string | null> => {
    if (amountNumber <= minReceiptAmount) {
      if (!receiptFile) return null;
    } else {
      if (!receiptFile) {
        setErrorMsg(`Ticket de caisse obligatoire pour les achats > ${minReceiptAmount} €.`);
        return null;
      }
    }

    if (!receiptFile) return null;

    setIsUploadingReceipt(true);

    const ext = receiptFile.name.split(".").pop() || "jpg";
    const fileName = `${Date.now()}.${ext}`;
    const filePath = `${userId}/${fileName}`;

    const { data, error: uploadError } = await supabase.storage
      .from("receipts")
      .upload(filePath, receiptFile, { cacheControl: "3600", upsert: false });

    setIsUploadingReceipt(false);

    if (uploadError || !data) {
      console.error("Upload ticket error:", uploadError);
      setError("Impossible d'envoyer le ticket. Vérifiez le fichier et réessayez.");
      return null;
    }

    return data.path;
  };

  // =========================
  // Soumission (RPC)
  // =========================
  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setErrorMsg(null);
    setError(null);

    if (!merchantCode) {
      setErrorMsg("QR commerçant manquant.");
      return;
    }
    if (!merchantFound) {
      setErrorMsg("Commerçant introuvable.");
      return;
    }
    if (!amount) {
      setErrorMsg("Montant invalide.");
      return;
    }
    if (!selectedSpaId) {
      setErrorMsg("Choisissez une SPA.");
      return;
    }

    const amountNumber = parseFloat(amount.replace(",", "."));
    if (Number.isNaN(amountNumber) || amountNumber <= 0) {
      setErrorMsg("Montant invalide.");
      return;
    }

    const { data: auth } = await supabase.auth.getUser();
    if (!auth?.user) {
      router.push(`/register?from=scan&m=${encodeURIComponent(merchantCode)}&amount=${encodeURIComponent(amount)}`);
      return;
    }

    const minReceiptAmount = getMinReceiptAmount();

    const receiptPath = await uploadReceiptIfNeeded(auth.user.id, amountNumber, minReceiptAmount);
    if (amountNumber > minReceiptAmount && !receiptPath) return;

    const { error: rpcError } = await supabase.rpc("apply_cashback_transaction", {
      p_merchant_code: merchantCode,
      p_amount: amountNumber,
      p_spa_id: selectedSpaId,
      p_use_wallet: false,
      p_wallet_spent: 0,
      p_donation_percent: donationPercent,
      p_receipt_image_url: receiptPath ?? null,
    });

    if (rpcError) {
      console.error(rpcError);
      const msg = (rpcError.message || "").toUpperCase();

      if (msg.includes("DOUBLE_SCAN_2H")) {
        setError(
          "Vous avez déjà enregistré un achat chez ce commerçant il y a moins de 2 heures. " +
            "Pour éviter les abus, un seul scan est autorisé toutes les 2 heures pour un même commerçant."
        );
        return;
      }

      if (msg.includes("RECEIPT_REQUIRED")) {
        setError(`Ticket requis pour les achats de plus de ${minReceiptAmount} €. Merci d'ajouter une photo ou un PDF.`);
        return;
      }

      setError(`Erreur lors de l'enregistrement : ${rpcError.message}`);
      return;
    }

    setShowThankYou(true);
  };

  const minReceiptAmountForUI = getMinReceiptAmount();

  // =========================
  // UI
  // =========================
  return (
    <main
      style={{
        minHeight: "100vh",
        background: "transparent",
        padding: "16px 0 28px",
      }}
    >
      <div className="container" style={{ maxWidth: 560 }}>
        <section
          className="card"
          style={{
            borderRadius: 20,
            padding: 16,
            background: "rgba(255,255,255,0.88)",
            backdropFilter: "blur(10px)",
            WebkitBackdropFilter: "blur(10px)",
            border: "1px solid rgba(0,0,0,0.06)",
            boxShadow: "0 14px 30px rgba(0,0,0,0.08)",
          }}
        >
          <header style={{ marginBottom: 12 }}>
            <p
              style={{
                fontSize: 12,
                fontWeight: 700,
                textTransform: "uppercase",
                letterSpacing: "0.08em",
                color: "#FF7A3C",
                margin: 0,
              }}
            >
              Scan confirmé
            </p>
            <h1 style={{ fontSize: 22, margin: "6px 0 0", color: "#0f172a" }}>
              Enregistrer un achat
            </h1>
          </header>

          {(error || errorMsg) && (
            <div
              style={{
                background: "#fee2e2",
                color: "#b91c1c",
                padding: 10,
                borderRadius: 12,
                fontSize: 13,
                marginBottom: 12,
              }}
            >
              {error || errorMsg}
            </div>
          )}

          {loadingMerchant && <p style={{ marginTop: 10 }}>Chargement commerçant…</p>}

          {merchantCode && merchantFound && !loadingMerchant && (
            <form onSubmit={handleSubmit} style={{ display: "grid", gap: 12 }}>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: 10,
                  background: "#FFF7ED",
                  border: "1px solid #FED7AA",
                  padding: "10px 12px",
                  borderRadius: 14,
                }}
              >
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontWeight: 800, color: "#111827", fontSize: 14, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {merchantFound.name}
                  </div>
                  <div style={{ fontSize: 12, color: "#92400E" }}>
                    QR: {merchantCode}
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => router.push("/scan")}
                  style={{
                    border: "1px solid rgba(0,0,0,0.12)",
                    background: "white",
                    borderRadius: 999,
                    padding: "8px 10px",
                    fontWeight: 700,
                    fontSize: 12,
                    cursor: "pointer",
                    whiteSpace: "nowrap",
                  }}
                >
                  Rescanner
                </button>
              </div>

              <div>
                <label style={{ display: "block", fontWeight: 800, fontSize: 13, marginBottom: 6, color: "#0f172a" }}>
                  Montant de l’achat (€)
                </label>
                <input
                  inputMode="decimal"
                  type="number"
                  step="0.01"
                  placeholder="Ex : 12,50"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  style={{
                    width: "100%",
                    padding: 12,
                    borderRadius: 14,
                    border: "1px solid rgba(0,0,0,0.12)",
                    outline: "none",
                    fontSize: 16,
                    background: "rgba(255,255,255,0.9)",
                  }}
                />
              </div>

              <div>
                <label style={{ display: "block", fontWeight: 800, fontSize: 13, marginBottom: 6, color: "#0f172a" }}>
                  Refuge bénéficiaire
                </label>
                <select
                  value={selectedSpaId}
                  onChange={(e) => setSelectedSpaId(e.target.value)}
                  style={{
                    width: "100%",
                    padding: 12,
                    borderRadius: 14,
                    border: "1px solid rgba(0,0,0,0.12)",
                    background: "rgba(255,255,255,0.9)",
                    fontSize: 15,
                  }}
                >
                  <option value="">Choisir…</option>
                  {spas.map((spa) => (
                    <option key={spa.id} value={spa.id}>
                      {spa.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label style={{ display: "block", fontWeight: 800, fontSize: 13, marginBottom: 8, color: "#0f172a" }}>
                  Pourcentage de don
                </label>
                <div style={{ display: "flex", gap: 10 }}>
                  {[50, 100].map((p) => (
                    <button
                      key={p}
                      type="button"
                      onClick={() => setDonationPercent(p as 50 | 100)}
                      style={{
                        flex: 1,
                        padding: "12px 0",
                        borderRadius: 14,
                        border: donationPercent === p ? "2px solid #0A8F44" : "1px solid rgba(0,0,0,0.14)",
                        background: donationPercent === p ? "#0A8F44" : "rgba(255,255,255,0.9)",
                        color: donationPercent === p ? "white" : "#111827",
                        fontWeight: 800,
                        cursor: "pointer",
                      }}
                    >
                      {p}%
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label style={{ display: "block", fontWeight: 800, fontSize: 13, marginBottom: 6, color: "#0f172a" }}>
                  Ticket de caisse (photo ou PDF)
                </label>
                <input
                  type="file"
                  accept="image/*,application/pdf"
                  onChange={(e) => setReceiptFile(e.target.files?.[0] ?? null)}
                />
                <div style={{ fontSize: 12, color: "#92400E", marginTop: 6 }}>
                  Obligatoire pour les achats &gt; {minReceiptAmountForUI} €.
                </div>
              </div>

              <button
                type="submit"
                disabled={isUploadingReceipt}
                style={{
                  marginTop: 4,
                  width: "100%",
                  padding: "12px 16px",
                  borderRadius: 14,
                  border: "none",
                  fontWeight: 900,
                  fontSize: 16,
                  background: "#0A8F44",
                  color: "white",
                  opacity: isUploadingReceipt ? 0.7 : 1,
                  cursor: isUploadingReceipt ? "not-allowed" : "pointer",
                }}
              >
                {isUploadingReceipt ? "Envoi du ticket..." : "Valider l’achat"}
              </button>
            </form>
          )}

          {merchantCode && !merchantFound && !loadingMerchant && !error && (
            <div style={{ marginTop: 12 }}>
              <p style={{ margin: 0 }}>Commerçant introuvable.</p>
              <button
                type="button"
                onClick={() => router.push("/scan")}
                style={{
                  marginTop: 10,
                  padding: "10px 14px",
                  borderRadius: 12,
                  border: "1px solid rgba(0,0,0,0.12)",
                  background: "white",
                  fontWeight: 800,
                  cursor: "pointer",
                }}
              >
                Rescanner
              </button>
            </div>
          )}
        </section>
      </div>

      {showThankYou && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            backgroundColor: "rgba(0,0,0,0.45)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 9999,
            padding: 16,
          }}
        >
          <div
            style={{
              backgroundColor: "rgba(255,255,255,0.92)",
              backdropFilter: "blur(10px)",
              WebkitBackdropFilter: "blur(10px)",
              borderRadius: 22,
              padding: "18px 16px 16px",
              width: "100%",
              maxWidth: 380,
              boxShadow: "0 16px 40px rgba(0,0,0,0.18)",
              textAlign: "center",
              border: "1px solid rgba(0,0,0,0.06)",
            }}
          >
            <div style={{ marginBottom: 10 }}>
              <img
                src="/goat-thankyou.gif?v=3"
                alt="Merci !"
                style={{
                  width: "100%",
                  maxWidth: 260,
                  height: "auto",
                  borderRadius: 16,
                  objectFit: "contain",
                  display: "block",
                  margin: "0 auto",
                }}
              />
            </div>

            <p style={{ fontWeight: 900, fontSize: 18, margin: "0 0 6px", color: "#0f172a" }}>
              Merci pour votre don !
            </p>
            <p style={{ fontSize: 14, margin: 0, color: "#475569" }}>
              Grâce à vous, les animaux des refuges locaux sont un peu mieux soutenus.
            </p>

            <button
              onClick={() => router.push("/dashboard")}
              style={{
                marginTop: 14,
                padding: "12px 16px",
                borderRadius: 14,
                fontWeight: 900,
                backgroundColor: "#0A8F44",
                color: "white",
                border: "none",
                width: "100%",
                cursor: "pointer",
              }}
            >
              Retour au tableau de bord
            </button>
          </div>
        </div>
      )}
    </main>
  );
}
