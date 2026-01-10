"use client";

import React, { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import dynamicImport from "next/dynamic";
import { createClient } from "@/lib/supabaseClient";

export const dynamic = "force-dynamic";

// import du scanner en dynamique (évite les erreurs côté serveur)
const QrScanner: any = dynamicImport(() => import("react-qr-scanner"), {
  ssr: false,
});


interface Merchant {
  id: string;
  name: string;
  qr_token: string;
}

interface Wallet {
  balance: number;
}

type Mode = "purchase" | "redeem";

const MIN_REDEEM_BALANCE = 5; // minimum 5€
const POPUP_DURATION_SECONDS = 5 * 60; // 5 minutes

export default function ScanPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const supabase = createClient();

  const [mode, setMode] = useState<Mode>("purchase");
  const [scanned, setScanned] = useState(false);
  const [scanError, setScanError] = useState<string | null>(null);

  const [merchant, setMerchant] = useState<Merchant | null>(null);
  const [wallet, setWallet] = useState<Wallet | null>(null);
  const [amountInput, setAmountInput] = useState("");
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const [showPopup, setShowPopup] = useState(false);
  const [remainingSeconds, setRemainingSeconds] = useState(
    POPUP_DURATION_SECONDS
  );
  const [popupAmount, setPopupAmount] = useState<number>(0);
  const [popupDate, setPopupDate] = useState<string>("");

  // mode = redeem ou purchase
  useEffect(() => {
    const m = searchParams.get("mode");
    if (m === "redeem") setMode("redeem");
    else setMode("purchase");
  }, [searchParams]);

  // charger la session + wallet
  useEffect(() => {
    const loadUserAndWallet = async () => {
      const {
        data: { session },
        error,
      } = await supabase.auth.getSession();
      if (error) {
        console.error(error);
        return;
      }
      if (!session) {
        router.push("/login");
        return;
      }

      const { data: walletData, error: walletError } = await supabase
        .from("wallets")
        .select("balance")
        .eq("user_id", session.user.id)
        .maybeSingle();

      if (walletError) {
        console.error(walletError);
      } else {
        setWallet(walletData);
      }
    };

    loadUserAndWallet();
  }, [supabase, router]);

  // timer popup
  useEffect(() => {
    if (!showPopup) return;

    setRemainingSeconds(POPUP_DURATION_SECONDS);
    const interval = setInterval(() => {
      setRemainingSeconds((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [showPopup]);

  // quand un QR est scanné
  const handleScan = async (result: any) => {
    if (!result || !result.text || scanned) return;

    setScanned(true);
    setScanError(null);

    const code = String(result.text).trim();

    try {
      const { data: merchantRow, error: merchantError } = await supabase
        .from("merchants")
        .select("id, name, qr_token")
        .eq("qr_token", code)
        .maybeSingle();

      if (merchantError || !merchantRow) {
        console.error(merchantError);
        setScanError("Commerçant introuvable. Veuillez réessayer.");
        setScanned(false);
        return;
      }

      setMerchant(merchantRow);
    } catch (err) {
      console.error(err);
      setScanError("Erreur lors de la reconnaissance du commerçant.");
      setScanned(false);
    }
  };

  const handleError = (err: any) => {
    console.error(err);
    setScanError("Erreur avec la caméra. Vérifiez les autorisations.");
  };

  // validation d'une réduction (mode REDEEM)
  const handleSubmitRedeem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!merchant || !wallet) {
      setFormError("Données manquantes (commerçant ou cagnotte).");
      return;
    }

    const solde = wallet.balance;

    if (solde < MIN_REDEEM_BALANCE) {
      setFormError(
        `Il faut au moins ${MIN_REDEEM_BALANCE.toFixed(
          2
        )} € de cagnotte pour utiliser vos crédits.`
      );
      return;
    }

    const amount = Number(amountInput.replace(",", "."));

    if (isNaN(amount) || amount <= 0) {
      setFormError("Montant invalide.");
      return;
    }

    if (amount > solde) {
      setFormError("Montant supérieur à votre solde disponible.");
      return;
    }

    setFormError(null);
    setSubmitting(true);

    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session) {
        router.push("/login");
        return;
      }

      const expiresAt = new Date(
        Date.now() + POPUP_DURATION_SECONDS * 1000
      ).toISOString();

      const { error: insertError } = await supabase
        .from("credit_redemptions")
        .insert({
          user_id: session.user.id,
          merchant_id: merchant.id,
          amount,
          expires_at: expiresAt,
        });

      if (insertError) {
        console.error(insertError);
        setFormError("Erreur lors de l'enregistrement de la remise.");
        setSubmitting(false);
        return;
      }

      // maj locale de la cagnotte (le trigger l'a fait côté DB)
      setWallet((w) =>
        w ? { ...w, balance: Math.max(0, w.balance - amount) } : w
      );

      // préparer le popup
      setPopupAmount(amount);
      setPopupDate(
        new Date().toLocaleString("fr-FR", {
          day: "2-digit",
          month: "2-digit",
          year: "numeric",
          hour: "2-digit",
          minute: "2-digit",
        })
      );
      setShowPopup(true);
      setSubmitting(false);
    } catch (err) {
      console.error(err);
      setFormError("Erreur inattendue.");
      setSubmitting(false);
    }
  };

  // contenu quand on est en mode "utiliser mes crédits"
  const renderRedeemContent = () => {
    const solde = wallet?.balance ?? 0;

    if (!merchant) {
      return (
        <>
          <p>
            Scannez le QR code du commerçant pour utiliser vos crédits.
          </p>
          {wallet && solde < MIN_REDEEM_BALANCE && (
            <p style={{ color: "red", marginTop: 8 }}>
              Il faut au moins {MIN_REDEEM_BALANCE.toFixed(2)} € de cagnotte
              pour utiliser vos crédits. Solde actuel : {solde.toFixed(2)} €.
            </p>
          )}
          {scanError && <p style={{ color: "red" }}>{scanError}</p>}
          <div style={{ maxWidth: 400, marginTop: 20 }}>
            <QrScanner
              delay={300}
              onScan={handleScan}
              onError={handleError}
              style={{ width: "100%" }}
            />
          </div>
        </>
      );
    }

    return (
      <>
        <h2>Utiliser mes crédits chez {merchant.name}</h2>
        <p>Solde disponible : {solde.toFixed(2)} €</p>
        <p>
          Montant minimum pour utiliser vos crédits :{" "}
          {MIN_REDEEM_BALANCE.toFixed(2)} €
        </p>

        <form onSubmit={handleSubmitRedeem} style={{ marginTop: 20 }}>
          <label>
            Montant de la réduction que vous souhaitez utiliser :
            <input
              type="number"
              step="0.01"
              min="0"
              max={solde}
              value={amountInput}
              onChange={(e) => setAmountInput(e.target.value)}
              style={{ display: "block", marginTop: 8, padding: 8 }}
            />
          </label>

          {formError && (
            <p style={{ color: "red", marginTop: 8 }}>{formError}</p>
          )}

          <button
            type="submit"
            disabled={submitting}
            style={{ marginTop: 16 }}
          >
            Valider la remise
          </button>
        </form>
      </>
    );
  };

  // mode achat classique (placeholder)
  const renderPurchaseContent = () => {
    return (
      <>
        <p>Mode achat : scannez le QR code pour enregistrer un achat.</p>
        <div style={{ maxWidth: 400, marginTop: 20 }}>
          <QrScanner
            delay={300}
            onScan={handleScan}
            onError={handleError}
            style={{ width: "100%" }}
          />
        </div>
        {scanError && <p style={{ color: "red" }}>{scanError}</p>}
      </>
    );
  };

  // popup de confirmation + compte à rebours
  const renderPopup = () => {
    if (!showPopup || !merchant) return null;

    const minutes = Math.floor(remainingSeconds / 60);
    const seconds = remainingSeconds % 60;

    return (
      <div
        style={{
          position: "fixed",
          inset: 0,
          backgroundColor: "rgba(0,0,0,0.5)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          zIndex: 9999,
        }}
      >
        <div
          style={{
            background: "white",
            borderRadius: 12,
            padding: 24,
            maxWidth: 420,
            width: "90%",
            textAlign: "center",
          }}
        >
          <h2>Réduction validée</h2>
          <p style={{ marginTop: 8 }}>
            Commerçant : <strong>{merchant.name}</strong>
          </p>
          <p>
            Montant de la réduction :{" "}
            <strong>{popupAmount.toFixed(2)} €</strong>
          </p>
          <p>Date : {popupDate}</p>

          <p style={{ marginTop: 16 }}>
            Vous avez{" "}
            <strong>
              {minutes}:{seconds.toString().padStart(2, "0")}
            </strong>{" "}
            pour bénéficier de cette réduction en caisse.
          </p>

          <button
            style={{ marginTop: 20 }}
            onClick={() => {
              setShowPopup(false);
              router.push("/dashboard");
            }}
          >
            Retour au tableau de bord
          </button>
        </div>
      </div>
    );
  };

  return (
    <div style={{ padding: 24 }}>
      <h1>
        {mode === "redeem" ? "Utiliser mes crédits" : "Scanner un commerçant"}
      </h1>

      {mode === "redeem" ? renderRedeemContent() : renderPurchaseContent()}

      {renderPopup()}
    </div>
  );
}
