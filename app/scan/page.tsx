"use client";

import React, { Suspense, useEffect, useState } from "react";
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
  cashback_rate: number | null; // taux défini dans l'admin pour ce commerçant
}

interface Wallet {
  balance: number;
}

type Mode = "purchase" | "redeem";

const MIN_REDEEM_BALANCE = 5; // minimum 5€
const POPUP_DURATION_SECONDS = 5 * 60; // 5 minutes

// ===== Wrapper avec Suspense (exigé par Next pour useSearchParams) =====
export default function ScanPage() {
  return (
    <Suspense fallback={<div style={{ padding: 24 }}>Chargement...</div>}>
      <ScanPageInner />
    </Suspense>
  );
}

// ===== Composant réel de la page (toute la logique est ici) =====
function ScanPageInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const supabase = createClient();

  const [mode, setMode] = useState<Mode>("purchase");
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

  // bascule avant / arrière pour Chrome / Safari
  const [useBackCamera, setUseBackCamera] = useState(true);

  // DEBUG : dernière chaîne brute lue par le scanner
  const [debugRaw, setDebugRaw] = useState<string | null>(null);

  // 1) mode = redeem ou purchase, lu depuis l'URL (?mode=redeem|purchase)
  useEffect(() => {
    const m = searchParams.get("mode");
    if (m === "redeem") setMode("redeem");
    else setMode("purchase");
  }, [searchParams]);

  // 2) charger la session + wallet
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

  // 3) si on arrive avec un paramètre ?m= dans l'URL, on charge automatiquement le commerçant
  useEffect(() => {
    const tokenFromUrl = searchParams.get("m");
    if (!tokenFromUrl) {
      return;
    }

    const loadMerchantFromUrl = async () => {
      setScanError(null);

      const { data: merchantRow, error: merchantError } = await supabase
        .from("merchants")
        .select("id, name, qr_token, cashback_rate")
        .eq("qr_token", tokenFromUrl)
        .maybeSingle();

      if (merchantError || !merchantRow) {
        console.error(merchantError);
        setScanError("Commerçant introuvable. Veuillez réessayer.");
        setMerchant(null);
        return;
      }

      setMerchant(merchantRow);
    };

    loadMerchantFromUrl();
  }, [searchParams, supabase]);

  // 4) timer popup (utiliser mes crédits)
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

  // 5) quand un QR est scanné dans l'appli
  const handleScan = async (result: any) => {
    if (!result || !result.text) return;

    const raw = String(result.text).trim();
    setDebugRaw(raw); // debug
    setScanError(null);

    let token: string | null = null;

    // 1) Chercher explicitement un paramètre m= dans la chaine
    const mMatch = raw.match(/[?&]m=([^&]+)/);
    if (mMatch && mMatch[1]) {
      token = decodeURIComponent(mMatch[1]);
    }

    // 2) Sinon, si c'est une URL sans m=, on prend le dernier segment de path
    if (!token && (raw.startsWith("http://") || raw.startsWith("https://"))) {
      try {
        const urlObj = new URL(raw);
        const segments = urlObj.pathname.split("/").filter(Boolean);
        if (segments.length > 0) {
          token = segments[segments.length - 1];
        }
      } catch (e) {
        console.error("Erreur parsing URL de QR:", e);
      }
    }

    // 3) Sinon, on prend tout brut comme token
    if (!token) {
      token = raw;
    }

    if (!token) {
      setScanError("QR code invalide.");
      return;
    }

    try {
      const { data: merchantRow, error: merchantError } = await supabase
        .from("merchants")
        .select("id, name, qr_token, cashback_rate")
        .eq("qr_token", token)
        .maybeSingle();

      if (merchantError || !merchantRow) {
        console.error(merchantError);
        setScanError("Commerçant introuvable. Vérifiez le QR code.");
        setMerchant(null);
        return;
      }

      setMerchant(merchantRow);

      // Optionnel : mettre l'URL propre /scan?m=TOKEN&mode=...
      try {
        const params = new URLSearchParams(window.location.search);
        params.set("m", token);
        params.set("mode", mode);
        const newUrl = `/scan?${params.toString()}`;
        window.history.replaceState(null, "", newUrl);
      } catch (e) {
        console.error("Erreur lors de la mise à jour de l'URL:", e);
      }
    } catch (err) {
      console.error(err);
      setScanError("Erreur lors de la reconnaissance du commerçant.");
    }
  };

  const handleError = (err: any) => {
    console.error(err);
    setScanError("Erreur avec la caméra. Vérifiez les autorisations.");
  };

  // 6) validation d'une réduction (mode REDEEM)
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

  // 7) validation d'un achat (mode PURCHASE) – AVEC TAUX PAR COMMERÇANT
  const handleSubmitPurchase = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!merchant) {
      setFormError("Commerçant manquant.");
      return;
    }

    const amount = Number(amountInput.replace(",", "."));

    if (isNaN(amount) || amount <= 0) {
      setFormError("Montant invalide.");
      return;
    }

    // On récupère le taux depuis le commerçant.
    // Exemple :
    //  - si en base tu stockes 0.05  → 5 %
    //  - si en base tu stockes 5     → 5 % (on divise par 100)
    // On met 5 % par défaut si null.
    const merchantRateRaw = merchant.cashback_rate ?? 0.05;
    const effectiveRate =
      merchantRateRaw > 1 ? merchantRateRaw / 100 : merchantRateRaw;

    // Calcul du cashback
    const totalCashback = parseFloat((amount * effectiveRate).toFixed(2));
    const cashbackToUser = parseFloat((totalCashback * 0.5).toFixed(2));
    const cashbackToSpa = parseFloat(
      (totalCashback - cashbackToUser).toFixed(2)
    );

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

      const { error: insertError } = await supabase.from("transactions").insert({
        user_id: session.user.id,
        merchant_id: merchant.id,
        amount,
        cashback_total: totalCashback,
        cashback_amount: cashbackToUser,
        cashback_to_user: cashbackToUser,
        donation_amount: cashbackToSpa,
      });

      if (insertError) {
        console.error("ERROR INSERT :", insertError);
        setFormError(`Erreur Supabase : ${insertError.message}`);
        setSubmitting(false);
        return;
      }

      setAmountInput("");
      setSubmitting(false);
      router.push("/dashboard");
    } catch (err: any) {
      console.error("UNEXPECTED ERROR:", err);
      setFormError("Erreur inattendue.");
      setSubmitting(false);
    }
  };

  // 8) contenu quand on est en mode "utiliser mes crédits"
  const renderRedeemContent = () => {
    const solde = wallet?.balance ?? 0;

    if (!merchant) {
      return (
        <>
          <p>Scannez le QR code du commerçant pour utiliser vos crédits.</p>
          {wallet && solde < MIN_REDEEM_BALANCE && (
            <p style={{ color: "red", marginTop: 8 }}>
              Il faut au moins {MIN_REDEEM_BALANCE.toFixed(2)} € de cagnotte
              pour utiliser vos crédits. Solde actuel : {solde.toFixed(2)} €.
            </p>
          )}
          {scanError && <p style={{ color: "red" }}>{scanError}</p>}

          <div style={{ maxWidth: 400, marginTop: 20 }}>
            <QrScanner
              key={useBackCamera ? "back-redeem" : "front-redeem"}
              delay={300}
              onScan={handleScan}
              onError={handleError}
              style={{ width: "100%" }}
              constraints={{
                video: {
                  facingMode: useBackCamera ? "environment" : "user",
                },
              }}
            />
          </div>

          {debugRaw && (
            <p
              style={{
                marginTop: 8,
                fontSize: 12,
                wordBreak: "break-all",
              }}
            >
              Dernier QR lu : <code>{debugRaw}</code>
            </p>
          )}

          <button
            type="button"
            style={{ marginTop: 12 }}
            onClick={() => setUseBackCamera((prev) => !prev)}
          >
            {useBackCamera
              ? "Utiliser la caméra avant"
              : "Utiliser la caméra arrière"}
          </button>
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

        {renderPopup()}
      </>
    );
  };

  // 9) mode achat : si commerçant trouvé, on affiche le formulaire d'achat
  const renderPurchaseContent = () => {
    if (!merchant) {
      return (
        <>
          <p>Mode achat : scannez le QR code pour enregistrer un achat.</p>
          {scanError && <p style={{ color: "red" }}>{scanError}</p>}

          <div style={{ maxWidth: 400, marginTop: 20 }}>
            <QrScanner
              key={useBackCamera ? "back-purchase" : "front-purchase"}
              delay={300}
              onScan={handleScan}
              onError={handleError}
              style={{ width: "100%" }}
              constraints={{
                video: {
                  facingMode: useBackCamera ? "environment" : "user",
                },
              }}
            />
          </div>

          {debugRaw && (
            <p
              style={{
                marginTop: 8,
                fontSize: 12,
                wordBreak: "break-all",
              }}
            >
              Dernier QR lu : <code>{debugRaw}</code>
            </p>
          )}

          <button
            type="button"
            style={{ marginTop: 12 }}
            onClick={() => setUseBackCamera((prev) => !prev)}
          >
            {useBackCamera
              ? "Utiliser la caméra avant"
              : "Utiliser la caméra arrière"}
          </button>
        </>
      );
    }

    // Ici, on a bien trouvé un commerçant → on demande le montant du ticket
    return (
      <>
        <h2>Commerçant reconnu</h2>
        <p>
          Vous êtes chez <strong>{merchant.name}</strong>.
        </p>

        <form onSubmit={handleSubmitPurchase} style={{ marginTop: 20 }}>
          <label>
            Montant du ticket (en €) :
            <input
              type="number"
              step="0.01"
              min="0"
              value={amountInput}
              onChange={(e) => setAmountInput(e.target.value)}
              style={{ display: "block", marginTop: 8, padding: 8 }}
            />
          </label>

          {formError && (
            <p style={{ color: "red", marginTop: 8 }}>{formError}</p>
          )}

          <p style={{ marginTop: 8, fontSize: 14 }}>
            Le cashback et le don seront calculés automatiquement en fonction du
            taux de ce commerçant.
          </p>

          <button
            type="submit"
            disabled={submitting}
            style={{ marginTop: 16 }}
          >
            Valider l&apos;achat
          </button>
        </form>

        <button
          type="button"
          style={{ marginTop: 16 }}
          onClick={() => {
            setMerchant(null);
            setDebugRaw(null);
            setScanError(null);
            setAmountInput("");
          }}
        >
          Scanner un autre commerçant
        </button>
      </>
    );
  };

  // 10) popup de confirmation + compte à rebours (utiliser crédits)
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

  // 11) rendu global
  return (
    <div style={{ padding: 24 }}>
      <h1>
        {mode === "redeem" ? "Utiliser mes crédits" : "Scanner un commerçant"}
      </h1>

      {mode === "redeem" ? renderRedeemContent() : renderPurchaseContent()}
    </div>
  );
}
