"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import dynamicImport from "next/dynamic";
import { createClient } from "@/lib/supabaseClient";
import ScanInner from "./scan-inner"; // composant pour le flux normal

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
  cashback_rate?: number; // en %, si tu l'as dans la BDD
}

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
  const [minRedeemAmount, setMinRedeemAmount] = useState<number>(5); // seuil par défaut : 5€

  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Pour éviter plusieurs scans dans la même session
  const [scanned, setScanned] = useState(false);

  // =========================
  // UTILISATION DES CRÉDITS
  // =========================

  // Montant que le commerçant saisit comme réduction
  const [redeemAmount, setRedeemAmount] = useState<string>("");

  // Popup après validation de la réduction
  const [showRedeemConfirmation, setShowRedeemConfirmation] =
    useState<boolean>(false);

  // Étapes dans le flux "utiliser mes crédits"
  // 1) CONFIRM = popup "Réduction validée"
  // 2) REMAINING = popup "Prix restant à payer"
  const [redeemStep, setRedeemStep] = useState<"CONFIRM" | "REMAINING">(
    "CONFIRM"
  );

  // Montant restant à payer après réduction
  const [remainingAmount, setRemainingAmount] = useState<string>("");

  // Cashback calculé sur le montant restant
  const [remainingCashback, setRemainingCashback] = useState<number>(0);

  // =========================
  // CHARGEMENT DU CONTEXTE (UTILISATEUR + MARCHAND + WALLET)
  // uniquement quand on est en mode redeem ET qu'on a un code m=
  // =========================
  useEffect(() => {
    const loadContext = async () => {
      if (mode !== "redeem" || !merchantCode) return;

      setLoading(true);
      setError(null);

      try {
        // 1) Récupérer l'utilisateur
        const {
          data: { user },
          error: userError,
        } = await supabase.auth.getUser();

        if (userError || !user) {
          setError("Vous devez être connecté pour utiliser vos crédits.");
          setLoading(false);
          return;
        }

        // 2) Récupérer le marchand à partir du code
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

        // 3) Récupérer le wallet de l'utilisateur
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
        }
      } finally {
        setLoading(false);
      }
    };

    loadContext();
  }, [mode, merchantCode, supabase]);

  // =========================
  // CALCUL DU CASHBACK SUR LE MONTANT RESTANT
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
      // Si le QR code pointe déjà vers une URL
      if (text.startsWith("http://") || text.startsWith("https://")) {
        const url = new URL(text);
        const m =
          url.searchParams.get("m") || url.searchParams.get("code") || "";

        if (mode === "redeem") {
          // Utiliser mes crédits : on reste sur /scan et on passe mode=redeem&m=
          const codeToUse = m || text;
          router.push(
            `/scan?mode=redeem&m=${encodeURIComponent(codeToUse)}`
          );
        } else {
          // Scan normal : on reste sur /scan et on passe m=
          const codeToUse = m || text;
          router.push(`/scan?m=${encodeURIComponent(codeToUse)}`);
        }
        return;
      }

      // Sinon on considère que le QR contient directement le code marchand
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
  // VALIDATION DE LA RÉDUCTION (UTILISER MES CRÉDITS)
  // =========================

  const handleValidateRedeem = () => {
    if (!redeemAmount) return;

    const raw = redeemAmount.replace(",", ".");
    const amount = Number(raw);

    if (isNaN(amount) || amount <= 0) return;

    if (amount < minRedeemAmount) {
      setError(
        `Montant minimum pour utiliser vos crédits : ${minRedeemAmount.toFixed(
          2
        )} €`
      );
      return;
    }

    if (walletBalance !== null && amount > walletBalance) {
      setError("Montant supérieur à votre solde disponible.");
      return;
    }

    setError(null);
    setRedeemStep("CONFIRM");
    setShowRedeemConfirmation(true);
  };

  // =========================
  // RENDU
  // =========================

  // 1) MODE REDEEM, SANS CODE → SCANNER
  if (mode === "redeem" && !merchantCode) {
    return (
      <div
        style={{
          minHeight: "100vh",
          padding: 16,
          display: "flex",
          flexDirection: "column",
          gap: 16,
        }}
      >
        <h1 style={{ fontSize: 22, fontWeight: 700, textAlign: "center" }}>
          Utiliser mes crédits
        </h1>
        <p style={{ textAlign: "center", marginBottom: 8 }}>
          Scannez le QR code du commerçant pour utiliser vos crédits.
        </p>

        {error && (
          <div
            style={{
              backgroundColor: "#fee2e2",
              color: "#b91c1c",
              padding: 8,
              borderRadius: 8,
              fontSize: 14,
            }}
          >
            {error}
          </div>
        )}

        <div
          style={{
            flex: 1,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <div style={{ width: "100%", maxWidth: 360 }}>
            <QrScanner
              delay={300}
              onError={handleScanError}
              onScan={handleScan}
              constraints={videoConstraints}
              style={{ width: "100%" }}
            />
          </div>
        </div>
      </div>
    );
  }

  // 2) MODE REDEEM, AVEC CODE → FORMULAIRE UTILISATION CRÉDITS + POPUPS
  if (mode === "redeem" && merchantCode) {
    return (
      <div
        style={{
          minHeight: "100vh",
          padding: 16,
          display: "flex",
          flexDirection: "column",
          gap: 16,
        }}
      >
        <h1 style={{ fontSize: 22, fontWeight: 700, textAlign: "center" }}>
          Utiliser mes crédits chez{" "}
          {merchant ? merchant.name : "Commerçant"}
        </h1>

        {loading && <p>Chargement…</p>}

        {walletBalance !== null && (
          <p style={{ textAlign: "center" }}>
            Solde disponible :{" "}
            <strong>{walletBalance.toFixed(2)} €</strong>
          </p>
        )}

        <p style={{ textAlign: "center", marginTop: -8 }}>
          Montant minimum pour utiliser vos crédits :{" "}
          <strong>{minRedeemAmount.toFixed(2)} €</strong>
        </p>

        {error && (
          <div
            style={{
              backgroundColor: "#fee2e2",
              color: "#b91c1c",
              padding: 8,
              borderRadius: 8,
              fontSize: 14,
            }}
          >
            {error}
          </div>
        )}

        <div style={{ marginTop: 8 }}>
          <label
            style={{
              display: "block",
              fontSize: 14,
              marginBottom: 6,
              fontWeight: 500,
            }}
          >
            Montant de la réduction (€)
          </label>
          <input
            type="number"
            min="0"
            step="0.01"
            value={redeemAmount}
            onChange={(e) => setRedeemAmount(e.target.value)}
            placeholder="Ex : 5.00"
            style={{
              width: "100%",
              padding: "10px 12px",
              borderRadius: 999,
              border: "1px solid #cbd5f5",
              fontSize: 16,
            }}
          />
        </div>

        <button
          onClick={handleValidateRedeem}
          style={{
            marginTop: 16,
            padding: "10px 18px",
            borderRadius: 999,
            border: "none",
            fontWeight: 600,
            fontSize: 16,
            cursor: "pointer",
            backgroundColor: "#0f766e",
            color: "white",
          }}
        >
          Valider la réduction
        </button>

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
                borderRadius: 16,
                padding: 24,
                textAlign: "center",
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
                    ? Number(
                        redeemAmount.replace(",", ".")
                      ).toFixed(2)
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
                  padding: "10px 18px",
                  borderRadius: 999,
                  border: "none",
                  fontWeight: 600,
                  fontSize: 16,
                  cursor: "pointer",
                  backgroundColor: "#0f766e",
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
                borderRadius: 16,
                padding: 24,
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
                style={{
                  display: "block",
                  fontSize: 14,
                  marginBottom: 6,
                  fontWeight: 500,
                }}
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
                style={{
                  width: "100%",
                  padding: "10px 12px",
                  borderRadius: 999,
                  border: "1px solid #cbd5f5",
                  marginBottom: 12,
                  fontSize: 16,
                }}
              />

              {remainingCashback > 0 && (
                <p style={{ fontSize: 14, marginBottom: 16 }}>
                  Vous gagnerez environ{" "}
                  <strong>{remainingCashback.toFixed(2)} €</strong> de
                  cashback sur ce paiement (dont une partie pourra être
                  reversée à l&apos;association).
                </p>
              )}

              <button
                onClick={() => {
                  setShowRedeemConfirmation(false);
                  router.push("/dashboard");
                }}
                style={{
                  width: "100%",
                  padding: "10px 18px",
                  borderRadius: 999,
                  border: "none",
                  fontWeight: 600,
                  fontSize: 16,
                  cursor: "pointer",
                  backgroundColor: "#0f766e",
                  color: "white",
                  marginTop: 8,
                }}
              >
                Valider et retourner au tableau de bord
              </button>
            </div>
          </div>
        )}
      </div>
    );
  }

  // 3) MODE SCAN NORMAL
  if (mode === "scan") {
    // Si on a déjà un code marchand dans l'URL → on affiche ton composant existant
    if (merchantCode) {
      // scan-inner.tsx gère la suite (montant de l'achat, choix SPA, etc.)
      return <ScanInner />;
    }

    // Sinon on affiche le scanner
    return (
      <div
        style={{
          minHeight: "100vh",
          padding: 16,
          display: "flex",
          flexDirection: "column",
          gap: 16,
        }}
      >
        <h1 style={{ fontSize: 22, fontWeight: 700, textAlign: "center" }}>
          Scanner un ticket
        </h1>
        <p style={{ textAlign: "center", marginBottom: 8 }}>
          Scannez le QR code du ticket ou du commerçant.
        </p>

        {error && (
          <div
            style={{
              backgroundColor: "#fee2e2",
              color: "#b91c1c",
              padding: 8,
              borderRadius: 8,
              fontSize: 14,
            }}
          >
            {error}
          </div>
        )}

        <div
          style={{
            flex: 1,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <div style={{ width: "100%", maxWidth: 360 }}>
            <QrScanner
              delay={300}
              onError={handleScanError}
              onScan={handleScan}
              constraints={videoConstraints}
              style={{ width: "100%" }}
            />
          </div>
        </div>
      </div>
    );
  }

  // Sécurité : au cas où
  return null;
}
