"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabaseClient";

export const dynamic = "force-dynamic";

interface Spa {
  id: string;
  name: string;
}

type DonationPercent = 50 | 100;

export default function ScanInner() {
  const router = useRouter();
  const searchParams = useSearchParams();

  // ✅ Ne pas recréer supabase à chaque render
  const supabase = useMemo(() => createClient(), []);

  // Paramètres
  const mode = (searchParams.get("mode") || "").trim().toLowerCase();
  const isRedeem = mode === "redeem";

  // QR token (compat ?m= ou ?code=)
  const merchantCodeRaw = searchParams.get("m") || searchParams.get("code") || null;
  const merchantCode = merchantCodeRaw ? merchantCodeRaw.trim() : null;

  // Merchant
  const [merchant, setMerchant] = useState<any>(null);
  const [loadingMerchant, setLoadingMerchant] = useState(false);

  // Wallet
  const [walletBalance, setWalletBalance] = useState<number>(0);
  const [walletLoadError, setWalletLoadError] = useState<string | null>(null);

  // Mode normal (achat)
  const [amount, setAmount] = useState("");
  const [spas, setSpas] = useState<Spa[]>([]);
  const [selectedSpaId, setSelectedSpaId] = useState("");
  const [donationPercent, setDonationPercent] = useState<DonationPercent>(50);

  // Ticket
  const [receiptFile, setReceiptFile] = useState<File | null>(null);
  const [isUploadingReceipt, setIsUploadingReceipt] = useState(false);

  // Erreurs + modal
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showThankYou, setShowThankYou] = useState(false);

  // Mode redeem (utilisation wallet)
  const [totalPurchase, setTotalPurchase] = useState(""); // total de l'achat (avant réduction)
  const [walletSpent, setWalletSpent] = useState(""); // montant utilisé depuis le wallet

  // ✅ Rescan hard (reset total)
  const goRescan = () => {
    window.location.assign("/scan");
  };

  // =========================
  // Helpers
  // =========================
  const parseEuro = (v: string): number => {
    const n = parseFloat((v || "").toString().replace(",", "."));
    return Number.isFinite(n) ? n : NaN;
  };

  const clamp = (n: number, min: number, max: number) => Math.min(Math.max(n, min), max);

  const getMinReceiptAmount = (): number => {
    if (!merchant) return 20;

    if (typeof merchant.receipt_threshold === "number" && !Number.isNaN(merchant.receipt_threshold)) {
      return merchant.receipt_threshold;
    }

    if (typeof merchant.min_receipt_amount === "number" && !Number.isNaN(merchant.min_receipt_amount)) {
      return merchant.min_receipt_amount;
    }

    return 20;
  };

  // =========================
  // Wallet load (wallets + profiles fallback)
  // =========================
  const loadWalletBalance = async () => {
    setWalletLoadError(null);

    const { data: auth } = await supabase.auth.getUser();
    if (!auth?.user) {
      setWalletBalance(0);
      setWalletLoadError("Connectez-vous pour voir votre solde.");
      return;
    }

    const userId = auth.user.id;

    // 1) PRIORITÉ: table wallets
    const walletCols = ["balance", "balance_eur", "wallet_balance", "amount"];

    for (const col of walletCols) {
      const { data, error } = await supabase.from("wallets").select(`${col}`).eq("user_id", userId).single();

      if (!error && data && typeof (data as any)[col] !== "undefined") {
        const raw = (data as any)[col];
        const num = typeof raw === "number" ? raw : parseFloat(String(raw));
        setWalletBalance(Number.isFinite(num) ? num : 0);
        return;
      }

      const msg = (error?.message || "").toLowerCase();
      if (msg.includes("column") && msg.includes("does not exist")) continue;

      if (
        msg.includes("permission denied") ||
        msg.includes("not allowed") ||
        msg.includes("violates row-level security") ||
        msg.includes("row level security")
      ) {
        setWalletBalance(0);
        setWalletLoadError("Impossible de récupérer le solde (RLS/permissions sur wallets).");
        return;
      }
    }

    // 2) Fallback: profiles
    const candidates = ["wallet_balance", "wallet_eur", "wallet", "balance"];

    for (const col of candidates) {
      const { data, error } = await supabase.from("profiles").select(`${col}`).eq("id", userId).single();

      if (!error && data && typeof (data as any)[col] !== "undefined") {
        const raw = (data as any)[col];
        const num = typeof raw === "number" ? raw : parseFloat(String(raw));
        setWalletBalance(Number.isFinite(num) ? num : 0);
        return;
      }

      const msg = (error?.message || "").toLowerCase();
      if (msg.includes("column") && msg.includes("does not exist")) continue;

      if (
        msg.includes("permission denied") ||
        msg.includes("not allowed") ||
        msg.includes("violates row-level security") ||
        msg.includes("row level security")
      ) {
        setWalletBalance(0);
        setWalletLoadError("Impossible de récupérer le solde (RLS/permissions sur profiles).");
        return;
      }
    }

    setWalletBalance(0);
    setWalletLoadError(
      "Impossible de récupérer le solde (wallets/profiles : colonne non trouvée ou non accessible)."
    );
  };

  useEffect(() => {
    loadWalletBalance();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [supabase]);

  // =========================
  // Chargement des SPAs
  // =========================
  useEffect(() => {
    const load = async () => {
      const { data, error } = await supabase.from("spas").select("id, name").order("name", { ascending: true });

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
    if (!merchantCode) {
      setMerchant(null);
      return;
    }

    const loadMerchant = async () => {
      setLoadingMerchant(true);
      setError(null);
      setErrorMsg(null);

      const { data, error } = await supabase.from("merchants").select("*").eq("qr_token", merchantCode).single();

      if (error) {
        console.error(error);
        setMerchant(null);
        setError("Commerçant introuvable.");
      } else {
        setMerchant(data || null);
      }

      setLoadingMerchant(false);
    };

    loadMerchant();
  }, [merchantCode, supabase]);

  // =========================
  // Upload du ticket
  // =========================
  const uploadReceiptIfNeeded = async (
    userId: string,
    amountNumber: number,
    minReceiptAmount: number
  ): Promise<string | null> => {
    // règle: ticket obligatoire > seuil
    if (amountNumber > minReceiptAmount && !receiptFile) {
      setErrorMsg(`Ticket de caisse obligatoire pour les achats > ${minReceiptAmount} €`);
      return null;
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
  // Soumission (mode normal)
  // =========================
  const handleSubmitNormal = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setErrorMsg(null);
    setError(null);

    if (!merchantCode) {
      setErrorMsg("QR commerçant manquant.");
      return;
    }
    if (!merchant) {
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

    const amountNumber = parseEuro(amount);
    if (Number.isNaN(amountNumber) || amountNumber <= 0) {
      setErrorMsg("Montant invalide.");
      return;
    }

    const { data: auth } = await supabase.auth.getUser();
    if (!auth?.user) {
      router.push(
        `/register?from=scan&m=${encodeURIComponent(merchantCode)}&amount=${encodeURIComponent(amount)}`
      );
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
        setError(`Ticket requis pour les achats de plus de ${minReceiptAmount} €.`);
        return;
      }

      setError(`Erreur lors de l'enregistrement : ${rpcError.message}`);
      return;
    }

    setShowThankYou(true);
  };

  // =========================
  // Soumission (mode redeem)
  // =========================
  const handleSubmitRedeem = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setErrorMsg(null);
    setError(null);

    if (!merchantCode) {
      setErrorMsg("QR commerçant manquant.");
      return;
    }
    if (!merchant) {
      setErrorMsg("Commerçant introuvable.");
      return;
    }

    // Si tu veux garder SPA obligatoire en redeem, on la valide.
    // Si tu veux l’enlever plus tard, il suffira de retirer ce bloc + p_spa_id dans le RPC.
    if (!selectedSpaId) {
      setErrorMsg("Choisissez une SPA.");
      return;
    }

    // Règle mini solde
    if (walletBalance < 5) {
      setErrorMsg("Vous pouvez utiliser vos crédits dès que votre cagnotte atteint 5,00 €.");
      return;
    }

    const total = parseEuro(totalPurchase);
    const spent = parseEuro(walletSpent);

    if (Number.isNaN(total) || total <= 0) {
      setErrorMsg("Montant total de l'achat invalide.");
      return;
    }
    if (Number.isNaN(spent) || spent <= 0) {
      setErrorMsg("Montant à utiliser invalide.");
      return;
    }

    if (spent > total) {
      setErrorMsg("La réduction ne peut pas dépasser le total de l'achat.");
      return;
    }

    const spentClamped = clamp(spent, 0, walletBalance);
    if (spentClamped !== spent) {
      setErrorMsg("Le montant utilisé dépasse votre solde.");
      return;
    }

    const { data: auth } = await supabase.auth.getUser();
    if (!auth?.user) {
      router.push(`/register?from=scan&m=${encodeURIComponent(merchantCode)}&mode=redeem`);
      return;
    }

    const minReceiptAmount = getMinReceiptAmount();

    // ⚠️ ticket demandé sur le TOTAL de l'achat
    const receiptPath = await uploadReceiptIfNeeded(auth.user.id, total, minReceiptAmount);
    if (total > minReceiptAmount && !receiptPath) return;

    const { error: rpcError } = await supabase.rpc("apply_cashback_transaction", {
      p_merchant_code: merchantCode,
      p_amount: total,
      p_spa_id: selectedSpaId,
      p_use_wallet: true,
      p_wallet_spent: spent,
      p_donation_percent: donationPercent,
      p_receipt_image_url: receiptPath ?? null,
    });

    if (rpcError) {
      console.error(rpcError);
      setError(`Erreur : ${rpcError.message}`);
      return;
    }

    await loadWalletBalance();
    setShowThankYou(true);
  };

  const minReceiptAmountForUI = getMinReceiptAmount();
  const redeemDisabled = walletBalance < 5 || isUploadingReceipt;

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
              {isRedeem ? "RÉDUCTION INSTANTANÉE" : "SCAN CONFIRMÉ"}
            </p>
            <h1 style={{ fontSize: 22, margin: "6px 0 0", color: "#0f172a" }}>
              {isRedeem ? "Utiliser mes crédits" : "Enregistrer un achat"}
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

          {walletLoadError && (
            <div
              style={{
                background: "#fff7ed",
                color: "#92400E",
                padding: 10,
                borderRadius: 12,
                fontSize: 13,
                marginBottom: 12,
                border: "1px solid #fed7aa",
              }}
            >
              {walletLoadError}
              <div style={{ marginTop: 6, fontSize: 12, opacity: 0.9 }}>
                Si tu es bien connecté et que tu vois ça, c’est probablement une policy RLS sur{" "}
                <b>wallets</b> ou <b>profiles</b>.
              </div>
            </div>
          )}

          {loadingMerchant && <p style={{ marginTop: 10 }}>Chargement commerçant…</p>}

          {!merchantCode && !loadingMerchant && (
            <div style={{ marginTop: 12 }}>
              <p style={{ margin: 0 }}>Aucun QR commerçant détecté. Merci de rescanner.</p>
              <button
                type="button"
                onClick={goRescan}
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

          {merchantCode && !merchant && !loadingMerchant && (
            <div style={{ marginTop: 12 }}>
              <p style={{ margin: 0 }}>Commerçant introuvable.</p>
              <button
                type="button"
                onClick={goRescan}
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

          {merchantCode && merchant && !loadingMerchant && (
            <>
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
                  marginBottom: 12,
                }}
              >
                <div style={{ minWidth: 0 }}>
                  <div
                    style={{
                      fontWeight: 800,
                      color: "#111827",
                      fontSize: 14,
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {merchant.name}
                  </div>
                  <div style={{ fontSize: 12, color: "#92400E" }}>QR: {merchantCode}</div>
                </div>

                <button
                  type="button"
                  onClick={goRescan}
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

              {/* Switch modes */}
              <div style={{ display: "flex", gap: 10, marginBottom: 12 }}>
                <button
                  type="button"
                  onClick={() => router.push(`/scan?m=${encodeURIComponent(merchantCode)}`)}
                  style={{
                    flex: 1,
                    padding: "10px 0",
                    borderRadius: 14,
                    border: !isRedeem ? "2px solid #0A8F44" : "1px solid rgba(0,0,0,0.14)",
                    background: !isRedeem ? "#0A8F44" : "rgba(255,255,255,0.9)",
                    color: !isRedeem ? "white" : "#111827",
                    fontWeight: 900,
                    cursor: "pointer",
                  }}
                >
                  Achat
                </button>

                <button
                  type="button"
                  onClick={() => router.push(`/scan?mode=redeem&m=${encodeURIComponent(merchantCode)}`)}
                  style={{
                    flex: 1,
                    padding: "10px 0",
                    borderRadius: 14,
                    border: isRedeem ? "2px solid #FF7A3C" : "1px solid rgba(0,0,0,0.14)",
                    background: isRedeem ? "#FF7A3C" : "rgba(255,255,255,0.9)",
                    color: isRedeem ? "white" : "#111827",
                    fontWeight: 900,
                    cursor: "pointer",
                  }}
                >
                  Utiliser crédits
                </button>
              </div>

              {/* MODE REDEEM */}
              {isRedeem ? (
                <form onSubmit={handleSubmitRedeem} style={{ display: "grid", gap: 12 }}>
                  <div
                    style={{
                      background: "rgba(2,132,199,0.08)",
                      border: "1px solid rgba(2,132,199,0.18)",
                      borderRadius: 14,
                      padding: 12,
                    }}
                  >
                    <div style={{ fontWeight: 900, color: "#0f172a" }}>Solde disponible</div>
                    <div style={{ fontSize: 20, fontWeight: 900 }}>{walletBalance.toFixed(2)} €</div>
                    <div style={{ fontSize: 12, color: "#475569" }}>
                      Rappel : vous pouvez utiliser vos crédits dès que votre cagnotte atteint 5,00 €.
                    </div>
                  </div>

                  <div>
                    <label
                      style={{
                        display: "block",
                        fontWeight: 800,
                        fontSize: 13,
                        marginBottom: 6,
                        color: "#0f172a",
                      }}
                    >
                      Total de l’achat (€)
                    </label>
                    <input
                      inputMode="decimal"
                      type="number"
                      step="0.01"
                      placeholder="Ex : 10,00"
                      value={totalPurchase}
                      onChange={(e) => setTotalPurchase(e.target.value)}
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
                    <label
                      style={{
                        display: "block",
                        fontWeight: 800,
                        fontSize: 13,
                        marginBottom: 6,
                        color: "#0f172a",
                      }}
                    >
                      Montant de la réduction (wallet) (€)
                    </label>
                    <input
                      inputMode="decimal"
                      type="number"
                      step="0.01"
                      placeholder="Ex : 2,00"
                      value={walletSpent}
                      onChange={(e) => setWalletSpent(e.target.value)}
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
                    <label
                      style={{
                        display: "block",
                        fontWeight: 800,
                        fontSize: 13,
                        marginBottom: 6,
                        color: "#0f172a",
                      }}
                    >
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
                    <label
                      style={{
                        display: "block",
                        fontWeight: 800,
                        fontSize: 13,
                        marginBottom: 8,
                        color: "#0f172a",
                      }}
                    >
                      Pourcentage de don
                    </label>
                    <div style={{ display: "flex", gap: 10 }}>
                      {[50, 100].map((p) => (
                        <button
                          key={p}
                          type="button"
                          onClick={() => setDonationPercent(p as DonationPercent)}
                          style={{
                            flex: 1,
                            padding: "12px 0",
                            borderRadius: 14,
                            border:
                              donationPercent === p
                                ? "2px solid #0A8F44"
                                : "1px solid rgba(0,0,0,0.14)",
                            background:
                              donationPercent === p ? "#0A8F44" : "rgba(255,255,255,0.9)",
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
                    <label
                      style={{
                        display: "block",
                        fontWeight: 800,
                        fontSize: 13,
                        marginBottom: 6,
                        color: "#0f172a",
                      }}
                    >
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
                    disabled={redeemDisabled}
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
                      opacity: redeemDisabled ? 0.6 : 1,
                      cursor: redeemDisabled ? "not-allowed" : "pointer",
                    }}
                  >
                    {isUploadingReceipt ? "Envoi du ticket..." : "Valider la réduction"}
                  </button>

                  {walletBalance < 5 && (
                    <div
                      style={{
                        marginTop: 6,
                        background: "#fff7ed",
                        border: "1px solid #fed7aa",
                        color: "#92400E",
                        padding: 10,
                        borderRadius: 12,
                        fontSize: 13,
                      }}
                    >
                      Solde insuffisant : vous pourrez utiliser vos crédits à partir de 5,00 €.
                    </div>
                  )}
                </form>
              ) : (
                // MODE NORMAL
                <form onSubmit={handleSubmitNormal} style={{ display: "grid", gap: 12 }}>
                  <div>
                    <label
                      style={{
                        display: "block",
                        fontWeight: 800,
                        fontSize: 13,
                        marginBottom: 6,
                        color: "#0f172a",
                      }}
                    >
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
                    <label
                      style={{
                        display: "block",
                        fontWeight: 800,
                        fontSize: 13,
                        marginBottom: 6,
                        color: "#0f172a",
                      }}
                    >
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
                    <label
                      style={{
                        display: "block",
                        fontWeight: 800,
                        fontSize: 13,
                        marginBottom: 8,
                        color: "#0f172a",
                      }}
                    >
                      Pourcentage de don
                    </label>
                    <div style={{ display: "flex", gap: 10 }}>
                      {[50, 100].map((p) => (
                        <button
                          key={p}
                          type="button"
                          onClick={() => setDonationPercent(p as DonationPercent)}
                          style={{
                            flex: 1,
                            padding: "12px 0",
                            borderRadius: 14,
                            border:
                              donationPercent === p
                                ? "2px solid #0A8F44"
                                : "1px solid rgba(0,0,0,0.14)",
                            background:
                              donationPercent === p ? "#0A8F44" : "rgba(255,255,255,0.9)",
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
                    <label
                      style={{
                        display: "block",
                        fontWeight: 800,
                        fontSize: 13,
                        marginBottom: 6,
                        color: "#0f172a",
                      }}
                    >
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
            </>
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

            <p
              style={{
                fontWeight: 900,
                fontSize: 18,
                margin: "0 0 6px",
                color: "#0f172a",
              }}
            >
              Merci !
            </p>
            <p style={{ fontSize: 14, margin: 0, color: "#475569" }}>
              Votre action a bien été enregistrée.
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
