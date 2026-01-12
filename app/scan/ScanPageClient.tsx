"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import dynamicImport from "next/dynamic";
import { createClient } from "@/lib/supabaseClient";
import ScanInner from "./scan-inner"; // flux normal (montant achat, SPA, etc.)

// On importe le scanner en dynamique pour éviter les problèmes SSR
const QrScanner = dynamicImport(() => import("react-qr-scanner"), {
  ssr: false,
}) as any;

// Contraintes vidéo : on force la caméra arrière sur mobile
const videoConstraints = {
  video: {
    facingMode: { ideal: "environment" },
  },
};

type Mode = "scan" | "redeem";

interface Merchant {
  id: string;
  name: string;
  cashback_rate?: number;
}

const RECEIPT_THRESHOLD = 50; // seuil à partir duquel on demande une validation admin

export default function ScanPageClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const supabase = createClient();

  // =========================
  // MODE & CODE MARCHAND
  // =========================
  const modeParam = searchParams.get("mode");
  const mode: Mode = modeParam === "redeem" ? "redeem" : "scan";
  const merchantCode = searchParams.get("m");

  // =========================
  // ÉTATS GÉNÉRAUX
  // =========================
  const [merchant, setMerchant] = useState<Merchant | null>(null);
  const [walletBalance, setWalletBalance] = useState<number | null>(null);
  const [minRedeemAmount, setMinRedeemAmount] = useState<number>(5); // utilisé pour l'info, plus pour le blocage
  const [userId, setUserId] = useState<string | null>(null);

  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Pour éviter plusieurs scans dans la même session
  const [scanned, setScanned] = useState(false);

  // =========================
  // UTILISATION DES CRÉDITS
  // =========================
  const [redeemAmount, setRedeemAmount] = useState<string>("");
  const [showRedeemConfirmation, setShowRedeemConfirmation] =
    useState<boolean>(false);
  const [redeemStep, setRedeemStep] = useState<"CONFIRM" | "REMAINING">(
    "CONFIRM"
  );
  const [remainingAmount, setRemainingAmount] = useState<string>("");
  const [remainingCashback, setRemainingCashback] = useState<number>(0);
  const [actionLoading, setActionLoading] = useState<boolean>(false);

  // =========================
  // CHARGEMENT CONTEXTE (mode=redeem)
  // =========================
  useEffect(() => {
    const loadContext = async () => {
      if (mode !== "redeem" || !merchantCode) return;

      setLoading(true);
      setError(null);

      try {
        const {
          data: { user },
          error: userError,
        } = await supabase.auth.getUser();

        if (userError || !user) {
          setError("Vous devez être connecté pour utiliser vos crédits.");
          setLoading(false);
          return;
        }

        setUserId(user.id);

        const { data: merchantData, error: merchantError } = await supabase
          .from("merchants")
          .select("id, name, cashback_rate, min_redeem_amount")
          .eq("merchant_code", merchantCode)
          .maybeSingle();

        if (merchantError) {
          console.error(merchantError);
        }

        if (merchantData) {
          setMerchant({
            id: merchantData.id,
            name: merchantData.name,
            cashback_rate: merchantData.cashback_rate ?? undefined,
          });

          if (merchantData.min_redeem_amount) {
            setMinRedeemAmount(merchantData.min_redeem_amount);
          }
        } else {
          setMerchant({
            id: "",
            name: "Commerçant inconnu",
          });
        }

        const { data: walletData, error: walletError } = await supabase
          .from("wallets")
          .select("balance")
          .eq("user_id", user.id)
          .maybeSingle();

        if (walletError) {
          console.error(walletError);
        }

        if (walletData && typeof walletData.balance === "number") {
          setWalletBalance(walletData.balance);
        } else {
          setWalletBalance(0);
        }
      } finally {
        setLoading(false);
      }
    };

    loadContext();
  }, [mode, merchantCode, supabase]);

  // =========================
  // CALCUL CASHBACK (prix restant)
  // =========================
  useEffect(() => {
    if (!merchant || !merchant.cashback_rate) {
      setRemainingCashback(0);
      return;
    }

    const raw = remainingAmount.replace(",", ".");
    const val = Number(raw);

    if (isNaN(val) || val <= 0) {
      setRemainingCashback(0);
      return;
    }

    const rate = merchant.cashback_rate;
    const cashback = (val * rate) / 100;
    setRemainingCashback(Number(cashback.toFixed(2)));
  }, [remainingAmount, merchant]);

  // =========================
  // GESTION DU SCAN QR
  // =========================
  const handleScan = (data: any) => {
    if (!data || scanned) return;

    const text =
      typeof data === "string"
        ? data
        : data?.text || data?.data || data?.qrCodeMessage;

    if (!text) return;

    setScanned(true);

    try {
      if (text.startsWith("http://") || text.startsWith("https://")) {
        const url = new URL(text);
        const m =
          url.searchParams.get("m") || url.searchParams.get("code") || "";

        if (mode === "redeem") {
          const codeToUse = m || text;
          router.push(`/scan?mode=redeem&m=${encodeURIComponent(codeToUse)}`);
        } else {
          const codeToUse = m || text;
          router.push(`/scan?m=${encodeURIComponent(codeToUse)}`);
        }
        return;
      }

      if (mode === "redeem") {
        router.push(`/scan?mode=redeem&m=${encodeURIComponent(text)}`);
      } else {
        router.push(`/scan?m=${encodeURIComponent(text)}`);
      }
    } catch (e) {
      console.error(e);
      setError("Erreur lors de la lecture du QR code.");
      setScanned(false);
    }
  };

  const handleScanError = (err: any) => {
    console.error(err);
    setError("Erreur du scanner QR.");
  };

  // =========================
  // VALIDATION RÉDUCTION (crédits)
  // =========================
  const handleValidateRedeem = async () => {
    if (!redeemAmount) return;

    const raw = redeemAmount.replace(",", ".");
    const amount = Number(raw);

    if (isNaN(amount) || amount <= 0) {
      setError("Veuillez saisir un montant de réduction valide.");
      return;
    }

    if (walletBalance === null) {
      setError("Votre cagnotte n'a pas pu être chargée.");
      return;
    }

    // NOUVELLE RÈGLE : seuil sur la cagnotte, pas sur le montant de réduction
    if (walletBalance < 5) {
      setError(
        "Vous devez avoir au moins 5 € dans votre cagnotte pour utiliser vos crédits."
      );
      return;
    }

    if (amount > walletBalance) {
      setError("Montant supérieur à votre solde disponible.");
      return;
    }

    if (!userId) {
      setError("Utilisateur introuvable. Veuillez vous reconnecter.");
      return;
    }

    setError(null);
    setActionLoading(true);

    try {
      // On débite immédiatement la cagnotte du montant de la réduction
      const newBalance = Number((walletBalance - amount).toFixed(2));

      const { error: walletUpdateError } = await supabase
        .from("wallets")
        .update({ balance: newBalance })
        .eq("user_id", userId);

      if (walletUpdateError) {
        console.error(walletUpdateError);
        setError("Erreur lors de la mise à jour de votre cagnotte.");
        return;
      }

      setWalletBalance(newBalance);
      setRedeemStep("CONFIRM");
      setShowRedeemConfirmation(true);
    } finally {
      setActionLoading(false);
    }
  };

  // =========================
  // VALIDATION DU MONTANT RESTANT À PAYER
  // =========================
  const handleConfirmRemaining = async () => {
    const raw = remainingAmount.replace(",", ".");
    const val = Number(raw);

    if (isNaN(val) || val <= 0) {
      setError("Veuillez saisir un montant restant valide.");
      return;
    }

    if (!userId) {
      setError("Utilisateur introuvable. Veuillez vous reconnecter.");
      return;
    }

    if (!merchant || !merchant.id) {
      setError("Commerçant introuvable.");
      return;
    }

    setError(null);
    setActionLoading(true);

    try {
      if (val >= RECEIPT_THRESHOLD) {
        // CAS 1 : montant restant >= 50 €
        // → on crée une transaction en attente de validation admin
        const { error: txError } = await supabase.from("transactions").insert({
          user_id: userId,
          merchant_id: merchant.id,
          amount: val,
          cashback_amount: 0,
          donation_amount: 0,
          status: "pending_admin", // à adapter si ton statut est différent
        });

        if (txError) {
          console.error(txError);
          setError(
            "Erreur lors de l'enregistrement de la transaction. Votre réduction a bien été appliquée, mais le cashback n'a pas pu être enregistré."
          );
          return;
        }

        // Ici, tu pourras plus tard rediriger vers une page d'upload de ticket si tu en as une
        // ex: router.push(`/upload-ticket?amount=${val}&merchant=${merchant.id}`);
      } else {
        // CAS 2 : montant restant < 50 €
        // → cashback automatique

        const cashbackRate = merchant.cashback_rate ?? 2; // % par défaut si non défini
        const cashback = Number(((val * cashbackRate) / 100).toFixed(2));
        const donation = Number((cashback / 2).toFixed(2));

        // 1) Crédite la cagnotte du cashback
        let currentBalance = walletBalance ?? 0;
        const newBalance = Number((currentBalance + cashback).toFixed(2));

        const { error: walletUpdateError } = await supabase
          .from("wallets")
          .update({ balance: newBalance })
          .eq("user_id", userId);

        if (walletUpdateError) {
          console.error(walletUpdateError);
          setError(
            "Erreur lors de la mise à jour de votre cagnotte après cashback."
          );
          return;
        }

        setWalletBalance(newBalance);

        // 2) Enregistre la transaction
        const { error: txError } = await supabase.from("transactions").insert({
          user_id: userId,
          merchant_id: merchant.id,
          amount: val,
          cashback_amount: cashback,
          donation_amount: donation,
          status: "validated_auto", // à adapter si besoin
        });

        if (txError) {
          console.error(txError);
          setError(
            "Erreur lors de l'enregistrement de la transaction. La cagnotte a été mise à jour, mais le détail n'a pas été sauvegardé."
          );
          return;
        }
      }

      setShowRedeemConfirmation(false);
      router.push("/dashboard");
    } finally {
      setActionLoading(false);
    }
  };

  // =========================
  // RENDU
  // =========================

  // --------- MODE REDEEM, SANS CODE → SCANNER ----------
  if (mode === "redeem" && !merchantCode) {
    return (
      <main
        style={{
          minHeight: "100vh",
          background: "#FAFAF5",
        }}
      >
        <div
          className="container"
          style={{
            maxWidth: 560,
            display: "flex",
            flexDirection: "column",
            gap: 20,
          }}
        >
          <header style={{ textAlign: "center" }}>
            <p
              style={{
                fontSize: 13,
                fontWeight: 600,
                textTransform: "uppercase",
                letterSpacing: "0.08em",
                color: "#FF7A3C",
                marginBottom: 6,
              }}
            >
              Scan sécurisé
            </p>
            <h1 style={{ fontSize: 28, fontWeight: 700 }}>
              Utiliser mes crédits
            </h1>
            <p style={{ color: "#666666", marginTop: 6 }}>
              Scannez le QR code du commerçant pour appliquer votre réduction.
            </p>
          </header>

          {error && (
            <div
              style={{
                backgroundColor: "#fee2e2",
                color: "#b91c1c",
                padding: 12,
                borderRadius: 12,
                fontSize: 14,
              }}
            >
              {error}
            </div>
          )}

          <section className="card" style={{ borderRadius: 16 }}>
            <div style={{ display: "grid", gap: 12 }}>
              <div>
                <p style={{ fontWeight: 600, marginBottom: 8 }}>
                  Suivez ces étapes :
                </p>
                <ol
                  style={{
                    margin: 0,
                    paddingLeft: 20,
                    color: "#666666",
                    display: "grid",
                    gap: 6,
                  }}
                >
                  <li>Autorisez l’accès à la caméra si demandé.</li>
                  <li>Placez le QR code dans le cadre.</li>
                </ol>
              </div>

              <div
                style={{
                  background: "#ffffff",
                  borderRadius: 16,
                  border: "1px solid #f0f0e6",
                  padding: 12,
                  boxShadow: "0 10px 24px rgba(0,0,0,0.06)",
                }}
              >
                <div style={{ width: "100%", maxWidth: 360, margin: "0 auto" }}>
                  <QrScanner
                    delay={300}
                    onError={handleScanError}
                    onScan={handleScan}
                    constraints={videoConstraints}
                    style={{ width: "100%" }}
                  />
                </div>
              </div>

              <p style={{ fontSize: 13, color: "#666666", marginBottom: 0 }}>
                Astuce : si la luminosité est faible, rapprochez-vous d’une
                source de lumière.
              </p>
            </div>
          </section>
        </div>
      </main>
    );
  }

  // --------- MODE REDEEM, AVEC CODE → FORMULAIRE + POPUPS ----------
  if (mode === "redeem" && merchantCode) {
    return (
      <main style={{ minHeight: "100vh", background: "#FAFAF5" }}>
        <div
          className="container"
          style={{
            maxWidth: 640,
            display: "flex",
            flexDirection: "column",
            gap: 20,
          }}
        >
          <header style={{ textAlign: "center" }}>
            <p
              style={{
                fontSize: 13,
                fontWeight: 600,
                textTransform: "uppercase",
                letterSpacing: "0.08em",
                color: "#FF7A3C",
                marginBottom: 6,
              }}
            >
              Réduction instantanée
            </p>
            <h1 style={{ fontSize: 28, fontWeight: 700 }}>
              Utiliser mes crédits chez{" "}
              {merchant ? merchant.name : "Commerçant"}
            </h1>
            <p style={{ color: "#666666", marginTop: 6 }}>
              Indiquez le montant à déduire, puis validez avec le commerçant.
            </p>
          </header>

          <section className="card" style={{ borderRadius: 16 }}>
            <div style={{ display: "grid", gap: 12 }}>
              {loading && <p>Chargement…</p>}

              {walletBalance !== null && (
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    background: "#FFF4EC",
                    borderRadius: 12,
                    padding: "10px 12px",
                    fontWeight: 600,
                  }}
                >
                  <span>Solde disponible</span>
                  <span>{walletBalance.toFixed(2)} €</span>
                </div>
              )}

              <p style={{ color: "#666666" }}>
                Vous pouvez utiliser vos crédits dès que votre cagnotte atteint{" "}
                <strong>5,00 €</strong>. Le montant de la réduction peut être
                inférieur (1 €, 2 €, …) tant qu&apos;il ne dépasse pas votre
                solde.
              </p>

              <p style={{ fontSize: 13, color: "#64748b", marginBottom: 4 }}>
                Paramètre marchand (info) : montant minimum recommandé pour une
                réduction :{" "}
                <strong>{minRedeemAmount.toFixed(2)} €</strong>
              </p>

              {error && (
                <div
                  style={{
                    backgroundColor: "#fee2e2",
                    color: "#b91c1c",
                    padding: 12,
                    borderRadius: 12,
                    fontSize: 14,
                  }}
                >
                  {error}
                </div>
              )}

              <div>
                <label
                  className="label"
                  style={{ marginTop: 0, fontSize: 14 }}
                >
                  Montant de la réduction (€)
                </label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={redeemAmount}
                  onChange={(e) => setRedeemAmount(e.target.value)}
                  placeholder="Ex : 1.00"
                  className="input"
                  style={{ borderRadius: 14 }}
                />
              </div>

              <button
                onClick={handleValidateRedeem}
                disabled={actionLoading}
                className="button"
                style={{
                  marginTop: 4,
                  backgroundColor: "#FF7A3C",
                  color: "#ffffff",
                  width: "100%",
                  opacity: actionLoading ? 0.7 : 1,
                }}
              >
                {actionLoading ? "Validation..." : "Valider la réduction"}
              </button>
            </div>
          </section>

        {/* POPUP 1 : RÉDUCTION VALIDÉE */}
        {showRedeemConfirmation && redeemStep === "CONFIRM" && (
          <div
            style={{
              position: "fixed",
              inset: 0,
              backgroundColor: "rgba(0,0,0,0.4)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              zIndex: 50,
            }}
          >
            <div
              style={{
                width: "90%",
                maxWidth: 420,
                backgroundColor: "white",
                borderRadius: 20,
                padding: 28,
                textAlign: "center",
                boxShadow: "0 20px 50px rgba(0,0,0,0.18)",
              }}
            >
              <h2
                style={{
                  fontSize: 22,
                  fontWeight: 700,
                  marginBottom: 16,
                  color: "#0f172a",
                }}
              >
                Réduction validée
              </h2>

              <p style={{ marginBottom: 4 }}>
                Commerçant :{" "}
                <strong>{merchant ? merchant.name : "Commerçant"}</strong>
              </p>

              <p style={{ marginBottom: 4 }}>
                Montant de la réduction :{" "}
                <strong>
                  {redeemAmount
                    ? Number(redeemAmount.replace(",", ".")).toFixed(
                        2
                      )
                    : "0.00"}{" "}
                  €
                </strong>
              </p>

              <p style={{ marginTop: 24, marginBottom: 16 }}>
                Appuyez sur « Continuer » pour saisir le{" "}
                <strong>prix restant à payer</strong> en caisse.
              </p>

              <button
                onClick={() => setRedeemStep("REMAINING")}
                style={{
                  padding: "12px 20px",
                  borderRadius: 14,
                  border: "none",
                  fontWeight: 600,
                  fontSize: 16,
                  cursor: "pointer",
                  backgroundColor: "#FF7A3C",
                  color: "white",
                }}
              >
                Continuer
              </button>
            </div>
          </div>
        )}

        {/* POPUP 2 : PRIX RESTANT À PAYER */}
        {showRedeemConfirmation && redeemStep === "REMAINING" && (
          <div
            style={{
              position: "fixed",
              inset: 0,
              backgroundColor: "rgba(0,0,0,0.4)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              zIndex: 50,
            }}
          >
            <div
              style={{
                width: "90%",
                maxWidth: 420,
                backgroundColor: "white",
                borderRadius: 20,
                padding: 28,
                boxShadow: "0 20px 50px rgba(0,0,0,0.18)",
              }}
            >
              <h2
                style={{
                  fontSize: 22,
                  fontWeight: 700,
                  marginBottom: 16,
                  textAlign: "center",
                  color: "#0f172a",
                }}
              >
                Prix restant à payer
              </h2>

              <p style={{ marginBottom: 12 }}>
                Indiquez le montant qui reste à payer après application de
                votre réduction chez{" "}
                <strong>{merchant ? merchant.name : "le commerçant"}</strong>.
              </p>

              <label
                className="label"
                style={{ fontSize: 14, marginTop: 0 }}
              >
                Montant restant (€)
              </label>
              <input
                type="number"
                min="0"
                step="0.01"
                value={remainingAmount}
                onChange={(e) => setRemainingAmount(e.target.value)}
                placeholder="Ex : 8.50"
                className="input"
                style={{ marginBottom: 12 }}
              />

              {remainingCashback > 0 && (
                <p style={{ fontSize: 14, marginBottom: 16 }}>
                  Vous gagnerez environ{" "}
                  <strong>{remainingCashback.toFixed(2)} €</strong> de
                  cashback sur ce paiement (dont une partie pourra être
                  reversée à l&apos;association).
                </p>
              )}

              {error && (
                <p
                  style={{
                    color: "#b91c1c",
                    fontSize: 13,
                    marginBottom: 8,
                  }}
                >
                  {error}
                </p>
              )}

              <button
                onClick={handleConfirmRemaining}
                disabled={actionLoading}
                style={{
                  width: "100%",
                  padding: "12px 18px",
                  borderRadius: 14,
                  border: "none",
                  fontWeight: 600,
                  fontSize: 16,
                  cursor: actionLoading ? "not-allowed" : "pointer",
                  backgroundColor: "#4CAF50",
                  color: "white",
                  marginTop: 8,
                  opacity: actionLoading ? 0.7 : 1,
                }}
              >
                {actionLoading
                  ? "Enregistrement..."
                  : "Valider et retourner au tableau de bord"}
              </button>
            </div>
          </div>
        )}
        </div>
      </main>
    );
  }

  // --------- MODE SCAN NORMAL ----------
  if (mode === "scan") {
    // Si on a déjà un code marchand dans l'URL → on laisse ScanInner gérer tout le flux
    if (merchantCode) {
      // ScanInner lit lui-même le ?m= dans l’URL comme avant
      return <ScanInner />;
    }

    // Sinon : simple scanner
    return (
      <main
        style={{
          minHeight: "100vh",
          background: "#FAFAF5",
        }}
      >
        <div
          className="container"
          style={{
            maxWidth: 560,
            display: "flex",
            flexDirection: "column",
            gap: 20,
          }}
        >
          <header style={{ textAlign: "center" }}>
            <p
              style={{
                fontSize: 13,
                fontWeight: 600,
                textTransform: "uppercase",
                letterSpacing: "0.08em",
                color: "#FF7A3C",
                marginBottom: 6,
              }}
            >
              Scan rapide
            </p>
            <h1 style={{ fontSize: 28, fontWeight: 700 }}>
              Scanner un ticket
            </h1>
            <p style={{ color: "#666666", marginTop: 6 }}>
              Scannez le QR code du ticket ou du commerçant.
            </p>
          </header>

          {error && (
            <div
              style={{
                backgroundColor: "#fee2e2",
                color: "#b91c1c",
                padding: 12,
                borderRadius: 12,
                fontSize: 14,
              }}
            >
              {error}
            </div>
          )}

          <section className="card" style={{ borderRadius: 16 }}>
            <div style={{ display: "grid", gap: 12 }}>
              <div>
                <p style={{ fontWeight: 600, marginBottom: 8 }}>
                  Suivez ces étapes :
                </p>
                <ol
                  style={{
                    margin: 0,
                    paddingLeft: 20,
                    color: "#666666",
                    display: "grid",
                    gap: 6,
                  }}
                >
                  <li>Autorisez l’accès à la caméra si demandé.</li>
                  <li>Placez le QR code dans le cadre.</li>
                </ol>
              </div>

              <div
                style={{
                  background: "#ffffff",
                  borderRadius: 16,
                  border: "1px solid #f0f0e6",
                  padding: 12,
                  boxShadow: "0 10px 24px rgba(0,0,0,0.06)",
                }}
              >
                <div style={{ width: "100%", maxWidth: 360, margin: "0 auto" }}>
                  <QrScanner
                    delay={300}
                    onError={handleScanError}
                    onScan={handleScan}
                    constraints={videoConstraints}
                    style={{ width: "100%" }}
                  />
                </div>
              </div>

              <p style={{ fontSize: 13, color: "#666666", marginBottom: 0 }}>
                Astuce : si la luminosité est faible, rapprochez-vous d’une
                source de lumière.
              </p>
            </div>
          </section>
        </div>
      </main>
    );
  }

  return null;
}
