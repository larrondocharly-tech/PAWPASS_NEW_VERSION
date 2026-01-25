"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabaseClient";

export const dynamic = "force-dynamic";

interface Spa {
  id: string;
  name: string;
}
type DonationPercent = 50 | 100;

type MerchantLite = { id: string; name: string };

type CouponStep = "choose_discount" | "present_to_merchant" | "finalize_purchase";

function format2(n: number) {
  const safe = Number.isFinite(n) ? n : 0;
  return safe.toLocaleString("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function nowFrDateTime() {
  const d = new Date();
  const date = d.toLocaleDateString("fr-FR");
  const time = d.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });
  return { date, time };
}

export default function ScanInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const supabase = useMemo(() => createClient(), []);

  const mode = (searchParams.get("mode") || "").trim().toLowerCase();
  // ✅ compat: mode=redeem => coupon
  const isCoupon = mode === "coupon" || mode === "redeem";

  const merchantCodeRaw = searchParams.get("m") || searchParams.get("code") || null;
  const merchantCode = merchantCodeRaw ? merchantCodeRaw.trim() : null;

  // Merchant
  const [merchant, setMerchant] = useState<any>(null);
  const [loadingMerchant, setLoadingMerchant] = useState(false);

  // Wallet (affichage)
  const [walletBalance, setWalletBalance] = useState<number>(0);
  const [walletLoadError, setWalletLoadError] = useState<string | null>(null);

  // Achat (scan normal)
  const [amount, setAmount] = useState("");
  const [spas, setSpas] = useState<Spa[]>([]);
  const [selectedSpaId, setSelectedSpaId] = useState("");
  const [donationPercent, setDonationPercent] = useState<DonationPercent>(50);

  // Ticket
  const [receiptFile, setReceiptFile] = useState<File | null>(null);
  const [isUploadingReceipt, setIsUploadingReceipt] = useState(false);

  // Erreurs + modal merci
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showThankYou, setShowThankYou] = useState(false);

  // -----------------------------
  // COUPON FLOW (nouveau)
  // -----------------------------
  const [couponStep, setCouponStep] = useState<CouponStep>("choose_discount");

  // 1) réduction demandée
  const [discountEur, setDiscountEur] = useState<number>(0);

  // 2) coupon réservé + timer
  const [busyCoupon, setBusyCoupon] = useState(false);
  const [couponId, setCouponId] = useState<string | null>(null);
  const [couponExpiresAtIso, setCouponExpiresAtIso] = useState<string>("");
  const [couponCreatedAt, setCouponCreatedAt] = useState<{ date: string; time: string } | null>(null);

  // 3) finalisation : montant total + reste à payer
  const [purchaseTotal, setPurchaseTotal] = useState<string>("");

  // Compte à rebours
  const [remainingSec, setRemainingSec] = useState<number>(0);
  const timerRef = useRef<number | null>(null);

  const parseEuro = (v: string): number => {
    const n = parseFloat((v || "").toString().replace(",", "."));
    return Number.isFinite(n) ? n : NaN;
  };

  const getMinReceiptAmount = (): number => {
    if (!merchant) return 20;
    if (typeof merchant.receipt_threshold === "number" && !Number.isNaN(merchant.receipt_threshold)) return merchant.receipt_threshold;
    if (typeof merchant.min_receipt_amount === "number" && !Number.isNaN(merchant.min_receipt_amount)) return merchant.min_receipt_amount;
    return 20;
  };

  const buildUrl = (opts: { mode: "scan" | "coupon"; m?: string | null; scan?: 0 | 1 }) => {
    const params = new URLSearchParams();
    params.set("mode", opts.mode);
    if (opts.m) params.set("m", opts.m);
    if (opts.scan === 1) params.set("scan", "1");
    return `/scan?${params.toString()}`;
  };

  const goRescan = () => {
    window.location.assign(buildUrl({ mode: isCoupon ? "coupon" : "scan", scan: 1 }));
  };
  const goAchat = () => {
    if (!merchantCode) return router.replace(buildUrl({ mode: "scan", scan: 1 }));
    router.replace(buildUrl({ mode: "scan", m: merchantCode }));
  };
  const goCoupon = () => {
    if (!merchantCode) return router.replace(buildUrl({ mode: "coupon", scan: 1 }));
    router.replace(buildUrl({ mode: "coupon", m: merchantCode }));
  };

  // Wallet load
  const loadWalletBalance = async () => {
    setWalletLoadError(null);

    const { data: auth } = await supabase.auth.getUser();
    if (!auth?.user) {
      setWalletBalance(0);
      setWalletLoadError("Connectez-vous pour voir votre solde.");
      return;
    }

    const userId = auth.user.id;

    const walletCols = ["balance", "balance_eur", "wallet_balance", "amount"];
    for (const col of walletCols) {
      const { data, error } = await supabase.from("wallets").select(col).eq("user_id", userId).maybeSingle();

      if (!error && data && typeof (data as any)[col] !== "undefined") {
        const raw = (data as any)[col];
        const num = typeof raw === "number" ? raw : parseFloat(String(raw));
        setWalletBalance(Number.isFinite(num) ? num : 0);
        return;
      }

      const msg = (error?.message || "").toLowerCase();
      if (msg.includes("column") && msg.includes("does not exist")) continue;

      if (msg.includes("permission denied") || msg.includes("violates row-level security") || msg.includes("row level security")) {
        setWalletBalance(0);
        setWalletLoadError("Impossible de récupérer le solde (RLS/permissions sur wallets).");
        return;
      }
    }

    const candidates = ["wallet_balance", "wallet_eur", "wallet", "balance"];
    for (const col of candidates) {
      const { data, error } = await supabase.from("profiles").select(col).eq("id", userId).maybeSingle();

      if (!error && data && typeof (data as any)[col] !== "undefined") {
        const raw = (data as any)[col];
        const num = typeof raw === "number" ? raw : parseFloat(String(raw));
        setWalletBalance(Number.isFinite(num) ? num : 0);
        return;
      }

      const msg = (error?.message || "").toLowerCase();
      if (msg.includes("column") && msg.includes("does not exist")) continue;

      if (msg.includes("permission denied") || msg.includes("violates row-level security") || msg.includes("row level security")) {
        setWalletBalance(0);
        setWalletLoadError("Impossible de récupérer le solde (RLS/permissions sur profiles).");
        return;
      }
    }

    setWalletBalance(0);
    setWalletLoadError("Impossible de récupérer le solde (wallets/profiles : colonne non trouvée ou non accessible).");
  };

  useEffect(() => {
    loadWalletBalance();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [supabase]);

  // Load SPAs
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

  // Load merchant
  useEffect(() => {
    setError(null);
    setErrorMsg(null);
    setShowThankYou(false);

    // reset coupon flow when merchant changes or mode changes
    setCouponStep("choose_discount");
    setCouponId(null);
    setCouponExpiresAtIso("");
    setCouponCreatedAt(null);
    setRemainingSec(0);
    setDiscountEur(0);
    setPurchaseTotal("");
    setSelectedSpaId("");
    setDonationPercent(50);
    setReceiptFile(null);

    if (!merchantCode) {
      setMerchant(null);
      return;
    }

    const loadMerchant = async () => {
      setLoadingMerchant(true);

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
  }, [merchantCode, supabase, isCoupon]);

  // Timer management
  const stopTimer = () => {
    if (timerRef.current) window.clearInterval(timerRef.current);
    timerRef.current = null;
  };

  useEffect(() => {
    stopTimer();

    if (couponStep !== "present_to_merchant") return;
    if (!couponExpiresAtIso) return;

    const tick = () => {
      const end = new Date(couponExpiresAtIso).getTime();
      const now = Date.now();
      const sec = Math.max(0, Math.floor((end - now) / 1000));
      setRemainingSec(sec);
      if (sec <= 0) stopTimer();
    };

    tick();
    timerRef.current = window.setInterval(tick, 250);

    return () => stopTimer();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [couponStep, couponExpiresAtIso]);

  // Upload ticket helper
  const uploadReceiptIfNeeded = async (userId: string, amountNumber: number, minReceiptAmount: number): Promise<string | null> => {
    if (amountNumber > minReceiptAmount && !receiptFile) {
      setErrorMsg(`Ticket de caisse obligatoire pour les achats > ${minReceiptAmount} €`);
      return null;
    }
    if (!receiptFile) return null;

    setIsUploadingReceipt(true);

    const ext = receiptFile.name.split(".").pop() || "jpg";
    const fileName = `${Date.now()}.${ext}`;
    const filePath = `${userId}/${fileName}`;

    const { data, error: uploadError } = await supabase.storage.from("receipts").upload(filePath, receiptFile, {
      cacheControl: "3600",
      upsert: false,
    });

    setIsUploadingReceipt(false);

    if (uploadError || !data) {
      console.error("Upload ticket error:", uploadError);
      setError("Impossible d'envoyer le ticket. Vérifiez le fichier et réessayez.");
      return null;
    }

    return data.path;
  };

  // -----------------------------
  // ACHAT MODE (inchangé)
  // -----------------------------
  const handleSubmitNormal = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setErrorMsg(null);
    setError(null);

    if (!merchantCode) return setErrorMsg("QR commerçant manquant.");
    if (!merchant) return setErrorMsg("Commerçant introuvable.");
    if (!amount) return setErrorMsg("Montant invalide.");
    if (!selectedSpaId) return setErrorMsg("Choisissez une SPA.");

    const amountNumber = parseEuro(amount);
    if (Number.isNaN(amountNumber) || amountNumber <= 0) return setErrorMsg("Montant invalide.");

    const { data: auth } = await supabase.auth.getUser();
    if (!auth?.user) {
      router.push(`/register?from=scan&m=${encodeURIComponent(merchantCode)}&amount=${encodeURIComponent(amount)}&mode=scan`);
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

  // -----------------------------
  // COUPON MODE (nouveau flow)
  // -----------------------------
  const canValidateDiscount = useMemo(() => {
    if (!merchant) return false;
    if (!Number.isFinite(discountEur)) return false;
    if (discountEur <= 0) return false;
    // Optionnel : ne pas dépasser le wallet
    if (walletLoadError == null && walletBalance > 0 && discountEur > walletBalance) return false;
    return true;
  }, [merchant, discountEur, walletBalance, walletLoadError]);

  const createCouponAndStartTimer = async () => {
    if (!merchant) return;
    if (!merchantCode) return;

    setBusyCoupon(true);
    setError(null);
    setErrorMsg(null);

    try {
      const { data: u } = await supabase.auth.getUser();
      if (!u?.user) {
        router.push(`/register?from=scan&m=${encodeURIComponent(merchantCode)}&mode=coupon`);
        return;
      }

      // 1) crée le coupon (réserve/déduit selon ta logique SQL)
      const { data, error } = await supabase.rpc("create_redeem_coupon", {
        p_merchant_id: (merchant as MerchantLite).id ?? merchant.id,
        p_requested_discount_eur: discountEur,
        p_merchant_name: merchant.name,
        p_qr_token: merchantCode,
      });
      if (error) throw error;

      const id = data as string;
      setCouponId(id);

      // 2) récupère expires_at (timer 5 min côté DB)
      const { data: c, error: cErr } = await supabase.from("redeem_coupons").select("expires_at").eq("id", id).maybeSingle();
      if (cErr) throw cErr;

      const expires = c?.expires_at ?? new Date(Date.now() + 5 * 60 * 1000).toISOString();
      setCouponExpiresAtIso(expires);

      // Date/heure affichées au commerçant
      setCouponCreatedAt(nowFrDateTime());

      // 3) passe à l'écran “Présenter au commerçant”
      setCouponStep("present_to_merchant");

      await loadWalletBalance();
    } catch (e: any) {
      setError(e?.message || "Erreur génération coupon");
    } finally {
      setBusyCoupon(false);
    }
  };

  const merchantRefuseCoupon = () => {
    // On n’annule pas côté DB faute de RPC dédiée; on revient à l’étape 1.
    // Si tu as un RPC "cancel_redeem_coupon", dis-moi son nom et je l’appelle ici.
    setError(null);
    setErrorMsg(null);
    setCouponId(null);
    setCouponExpiresAtIso("");
    setCouponCreatedAt(null);
    setRemainingSec(0);
    setCouponStep("choose_discount");
  };

  const merchantAcceptCoupon = async () => {
    if (!couponId) return;

    setBusyCoupon(true);
    setError(null);
    setErrorMsg(null);

    try {
      if (remainingSec <= 0) {
        setError("Coupon expiré. Recommencez.");
        merchantRefuseCoupon();
        return;
      }

      // “Accepté” => on confirme côté DB (ton RPC existant)
      const { error } = await supabase.rpc("confirm_redeem_coupon", { p_coupon_id: couponId });
      if (error) throw error;

      // Puis on passe à l’étape finalisation (reste à payer + SPA + 50/100)
      setCouponStep("finalize_purchase");
    } catch (e: any) {
      setError(e?.message || "Erreur validation commerçant");
    } finally {
      setBusyCoupon(false);
    }
  };

  const remainingToPay = useMemo(() => {
    const total = parseEuro(purchaseTotal);
    if (!Number.isFinite(total) || total <= 0) return null;
    const rest = Math.max(0, total - (Number.isFinite(discountEur) ? discountEur : 0));
    return { total, rest };
  }, [purchaseTotal, discountEur]);

  const finalizePurchaseWithCoupon = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setErrorMsg(null);
    setError(null);

    if (!merchantCode) return setErrorMsg("QR commerçant manquant.");
    if (!merchant) return setErrorMsg("Commerçant introuvable.");
    if (!couponId) return setErrorMsg("Coupon manquant.");
    if (!selectedSpaId) return setErrorMsg("Choisissez une SPA.");
    if (!purchaseTotal) return setErrorMsg("Entrez le montant total de l'achat.");

    const total = parseEuro(purchaseTotal);
    if (Number.isNaN(total) || total <= 0) return setErrorMsg("Montant total invalide.");

    if (!Number.isFinite(discountEur) || discountEur <= 0) return setErrorMsg("Réduction invalide.");
    if (discountEur > total) return setErrorMsg("La réduction ne peut pas être supérieure au montant total.");

    const { data: auth } = await supabase.auth.getUser();
    if (!auth?.user) {
      router.push(`/register?from=scan&m=${encodeURIComponent(merchantCode)}&mode=coupon`);
      return;
    }

    const minReceiptAmount = getMinReceiptAmount();
    const receiptPath = await uploadReceiptIfNeeded(auth.user.id, total, minReceiptAmount);
    if (total > minReceiptAmount && !receiptPath) return;

    // ✅ On enregistre l'achat en utilisant le wallet (réduction)
    const { error: rpcError } = await supabase.rpc("apply_cashback_transaction", {
      p_merchant_code: merchantCode,
      p_amount: total,
      p_spa_id: selectedSpaId,
      p_use_wallet: true,
      p_wallet_spent: discountEur,
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

    await loadWalletBalance();
    setShowThankYou(true);
  };

  const minReceiptAmountForUI = getMinReceiptAmount();

  // UI helpers
  const Pill = ({ children }: { children: React.ReactNode }) => (
    <div
      style={{
        background: "rgba(2,132,199,0.08)",
        border: "1px solid rgba(2,132,199,0.18)",
        borderRadius: 14,
        padding: 12,
      }}
    >
      {children}
    </div>
  );

  const formatRemaining = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  };

  return (
    <main style={{ minHeight: "100vh", background: "transparent", padding: "16px 0 28px" }}>
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
              {isCoupon ? "RÉDUCTION INSTANTANÉE" : "SCAN CONFIRMÉ"}
            </p>
            <h1 style={{ fontSize: 22, margin: "6px 0 0", color: "#0f172a" }}>
              {isCoupon ? "Utiliser mes crédits" : "Enregistrer un achat"}
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
                Si tu es bien connecté et que tu vois ça, c’est probablement une policy RLS sur <b>wallets</b> / <b>profiles</b>.
              </div>
            </div>
          )}

          {loadingMerchant && <p style={{ marginTop: 10 }}>Chargement commerçant…</p>}

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

              {/* Switch Achat / Coupon */}
              <div style={{ display: "flex", gap: 10, marginBottom: 12 }}>
                <button
                  type="button"
                  onClick={goAchat}
                  style={{
                    flex: 1,
                    padding: "10px 0",
                    borderRadius: 14,
                    border: !isCoupon ? "2px solid #0A8F44" : "1px solid rgba(0,0,0,0.14)",
                    background: !isCoupon ? "#0A8F44" : "rgba(255,255,255,0.9)",
                    color: !isCoupon ? "white" : "#111827",
                    fontWeight: 900,
                    cursor: "pointer",
                  }}
                >
                  Achat
                </button>

                <button
                  type="button"
                  onClick={goCoupon}
                  style={{
                    flex: 1,
                    padding: "10px 0",
                    borderRadius: 14,
                    border: isCoupon ? "2px solid #FF7A3C" : "1px solid rgba(0,0,0,0.14)",
                    background: isCoupon ? "#FF7A3C" : "rgba(255,255,255,0.9)",
                    color: isCoupon ? "white" : "#111827",
                    fontWeight: 900,
                    cursor: "pointer",
                  }}
                >
                  Utiliser crédits
                </button>
              </div>

              {/* -------------------------
                  COUPON MODE (3 étapes)
                 ------------------------- */}
              {isCoupon ? (
                <>
                  {/* ÉTAPE 1 : choix réduction */}
                  {couponStep === "choose_discount" && (
                    <div style={{ display: "grid", gap: 12 }}>
                      <Pill>
                        <div style={{ fontWeight: 900, color: "#0f172a" }}>Solde disponible</div>
                        <div style={{ fontSize: 20, fontWeight: 900 }}>{format2(walletBalance)} €</div>
                        <div style={{ fontSize: 12, color: "#475569" }}>
                          Choisis la réduction, puis tu la présentes au commerçant (timer 5 minutes).
                        </div>
                      </Pill>

                      <label style={{ display: "grid", gap: 6 }}>
                        <div style={{ fontSize: 13, fontWeight: 900, color: "#111827" }}>Réduction souhaitée (€)</div>
                        <input
                          type="number"
                          step="0.01"
                          value={Number.isFinite(discountEur) ? discountEur : 0}
                          onChange={(e) => setDiscountEur(Number(e.target.value))}
                          placeholder="Ex : 5"
                          style={{
                            width: "100%",
                            padding: "10px 12px",
                            borderRadius: 12,
                            border: "1px solid rgba(0,0,0,0.12)",
                          }}
                        />
                        <div style={{ fontSize: 12, color: "#6b7280" }}>
                          Solde : <b>{format2(walletBalance)} €</b>
                        </div>
                      </label>

                      <button
                        type="button"
                        onClick={createCouponAndStartTimer}
                        disabled={!canValidateDiscount || busyCoupon}
                        style={{
                          width: "100%",
                          padding: "12px 14px",
                          borderRadius: 14,
                          border: "none",
                          background: !canValidateDiscount ? "#e5e7eb" : "#111827",
                          color: !canValidateDiscount ? "#6b7280" : "#fff",
                          fontWeight: 950,
                          cursor: !canValidateDiscount || busyCoupon ? "not-allowed" : "pointer",
                        }}
                      >
                        {busyCoupon ? "Validation..." : `Valider la réduction (${format2(discountEur || 0)} €)`}
                      </button>

                      <button
                        type="button"
                        onClick={() => router.push("/dashboard")}
                        style={{
                          width: "100%",
                          padding: "10px 14px",
                          borderRadius: 14,
                          border: "1px solid rgba(0,0,0,0.12)",
                          background: "#fff",
                          color: "#111827",
                          fontWeight: 900,
                          cursor: "pointer",
                        }}
                      >
                        Annuler
                      </button>
                    </div>
                  )}

                  {/* ÉTAPE 2 : présenter au commerçant */}
                  {couponStep === "present_to_merchant" && (
                    <div style={{ display: "grid", gap: 12 }}>
                      <div
                        style={{
                          background: "rgba(16,185,129,0.10)",
                          border: "1px solid rgba(16,185,129,0.25)",
                          borderRadius: 16,
                          padding: 14,
                        }}
                      >
                        <div style={{ fontSize: 12, fontWeight: 900, letterSpacing: "0.08em", textTransform: "uppercase", color: "#065f46" }}>
                          À montrer au commerçant
                        </div>

                        <div style={{ marginTop: 8, fontSize: 18, fontWeight: 950, color: "#0f172a" }}>{merchant.name}</div>

                        <div style={{ marginTop: 10, fontSize: 28, fontWeight: 950, color: "#111827" }}>
                          Réduction : {format2(discountEur)} €
                        </div>

                        <div style={{ display: "flex", gap: 10, marginTop: 10, flexWrap: "wrap" }}>
                          <div style={{ fontSize: 13, color: "#065f46", fontWeight: 800 }}>
                            Date : {couponCreatedAt?.date ?? nowFrDateTime().date}
                          </div>
                          <div style={{ fontSize: 13, color: "#065f46", fontWeight: 800 }}>
                            Heure : {couponCreatedAt?.time ?? nowFrDateTime().time}
                          </div>
                        </div>

                        <div
                          style={{
                            marginTop: 12,
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "space-between",
                            gap: 10,
                            background: "rgba(0,0,0,0.04)",
                            borderRadius: 12,
                            padding: "10px 12px",
                          }}
                        >
                          <div style={{ fontSize: 13, fontWeight: 900, color: "#0f172a" }}>Valable encore</div>
                          <div
                            style={{
                              fontSize: 18,
                              fontWeight: 950,
                              color: remainingSec > 0 ? "#0f172a" : "#b91c1c",
                            }}
                          >
                            {formatRemaining(remainingSec)}
                          </div>
                        </div>

                        {remainingSec <= 0 && (
                          <div style={{ marginTop: 10, fontSize: 13, fontWeight: 900, color: "#b91c1c" }}>
                            Coupon expiré. Recommencez.
                          </div>
                        )}
                      </div>

                      <div style={{ display: "flex", gap: 10 }}>
                        <button
                          type="button"
                          onClick={merchantRefuseCoupon}
                          disabled={busyCoupon}
                          style={{
                            flex: 1,
                            padding: "12px 12px",
                            borderRadius: 14,
                            border: "1px solid rgba(0,0,0,0.12)",
                            background: "#fff",
                            fontWeight: 900,
                            cursor: busyCoupon ? "not-allowed" : "pointer",
                          }}
                        >
                          Refuser
                        </button>

                        <button
                          type="button"
                          onClick={merchantAcceptCoupon}
                          disabled={busyCoupon || remainingSec <= 0}
                          style={{
                            flex: 1,
                            padding: "12px 12px",
                            borderRadius: 14,
                            border: "none",
                            background: busyCoupon || remainingSec <= 0 ? "#e5e7eb" : "#0A8F44",
                            color: busyCoupon || remainingSec <= 0 ? "#6b7280" : "#fff",
                            fontWeight: 950,
                            cursor: busyCoupon || remainingSec <= 0 ? "not-allowed" : "pointer",
                          }}
                        >
                          {busyCoupon ? "Validation..." : "Accepter"}
                        </button>
                      </div>

                      <button
                        type="button"
                        onClick={() => router.push("/dashboard")}
                        style={{
                          width: "100%",
                          padding: "10px 14px",
                          borderRadius: 14,
                          border: "1px solid rgba(0,0,0,0.12)",
                          background: "#fff",
                          color: "#111827",
                          fontWeight: 900,
                          cursor: "pointer",
                        }}
                      >
                        Annuler
                      </button>
                    </div>
                  )}

                  {/* ÉTAPE 3 : reste à payer + SPA + 50/100 */}
                  {couponStep === "finalize_purchase" && (
                    <form onSubmit={finalizePurchaseWithCoupon} style={{ display: "grid", gap: 12 }}>
                      <Pill>
                        <div style={{ fontWeight: 900, color: "#0f172a" }}>Récap réduction</div>
                        <div style={{ marginTop: 6, fontSize: 14, color: "#475569" }}>
                          Réduction validée chez <b>{merchant.name}</b> : <b>{format2(discountEur)} €</b>
                        </div>
                      </Pill>

                      <div>
                        <label style={{ display: "block", fontWeight: 900, fontSize: 13, marginBottom: 6, color: "#0f172a" }}>
                          Montant total de l’achat (€)
                        </label>
                        <input
                          inputMode="decimal"
                          type="number"
                          step="0.01"
                          placeholder="Ex : 25,00"
                          value={purchaseTotal}
                          onChange={(e) => setPurchaseTotal(e.target.value)}
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

                      {remainingToPay && (
                        <div
                          style={{
                            background: "rgba(2,132,199,0.08)",
                            border: "1px solid rgba(2,132,199,0.18)",
                            borderRadius: 14,
                            padding: 12,
                          }}
                        >
                          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, color: "#0f172a", fontWeight: 900 }}>
                            <span>Total</span>
                            <span>{format2(remainingToPay.total)} €</span>
                          </div>
                          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, color: "#0f172a", fontWeight: 900, marginTop: 6 }}>
                            <span>Réduction PawPass</span>
                            <span>-{format2(discountEur)} €</span>
                          </div>
                          <div style={{ height: 1, background: "rgba(0,0,0,0.08)", margin: "10px 0" }} />
                          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 16, color: "#0f172a", fontWeight: 950 }}>
                            <span>Reste à payer</span>
                            <span>{format2(remainingToPay.rest)} €</span>
                          </div>
                        </div>
                      )}

                      <div>
                        <label style={{ display: "block", fontWeight: 900, fontSize: 13, marginBottom: 6, color: "#0f172a" }}>
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
                        <label style={{ display: "block", fontWeight: 900, fontSize: 13, marginBottom: 8, color: "#0f172a" }}>
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
                                border: donationPercent === p ? "2px solid #0A8F44" : "1px solid rgba(0,0,0,0.14)",
                                background: donationPercent === p ? "#0A8F44" : "rgba(255,255,255,0.9)",
                                color: donationPercent === p ? "white" : "#111827",
                                fontWeight: 900,
                                cursor: "pointer",
                              }}
                            >
                              {p}%
                            </button>
                          ))}
                        </div>
                      </div>

                      <div>
                        <label style={{ display: "block", fontWeight: 900, fontSize: 13, marginBottom: 6, color: "#0f172a" }}>
                          Ticket de caisse (photo ou PDF)
                        </label>
                        <input type="file" accept="image/*,application/pdf" onChange={(e) => setReceiptFile(e.target.files?.[0] ?? null)} />
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
                          fontWeight: 950,
                          fontSize: 16,
                          background: "#0A8F44",
                          color: "white",
                          opacity: isUploadingReceipt ? 0.7 : 1,
                          cursor: isUploadingReceipt ? "not-allowed" : "pointer",
                        }}
                      >
                        {isUploadingReceipt ? "Envoi du ticket..." : "Valider l’achat"}
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          // retour step 2 (ex: si mauvais montant)
                          setCouponStep("present_to_merchant");
                        }}
                        style={{
                          width: "100%",
                          padding: "10px 14px",
                          borderRadius: 14,
                          border: "1px solid rgba(0,0,0,0.12)",
                          background: "#fff",
                          color: "#111827",
                          fontWeight: 900,
                          cursor: "pointer",
                        }}
                      >
                        Retour
                      </button>
                    </form>
                  )}
                </>
              ) : (
                // -------------------------
                // ACHAT MODE (scan normal)
                // -------------------------
                <form onSubmit={handleSubmitNormal} style={{ display: "grid", gap: 12 }}>
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
                          onClick={() => setDonationPercent(p as DonationPercent)}
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
                    <input type="file" accept="image/*,application/pdf" onChange={(e) => setReceiptFile(e.target.files?.[0] ?? null)} />
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

            <p style={{ fontWeight: 900, fontSize: 18, margin: "0 0 6px", color: "#0f172a" }}>Merci !</p>
            <p style={{ fontSize: 14, margin: 0, color: "#475569" }}>Votre action a bien été enregistrée.</p>

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
