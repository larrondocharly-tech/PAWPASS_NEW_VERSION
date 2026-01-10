"use client";

import React, { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import dynamicImport from "next/dynamic";
import { createClient } from "@/lib/supabaseClient";

export const dynamic = "force-dynamic";

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

const MIN_REDEEM_BALANCE = 5;
const POPUP_DURATION_SECONDS = 5 * 60;

export default function ScanPage() {
  return (
    <Suspense fallback={<div style={{ padding: 24 }}>Chargement...</div>}>
      <ScanPageInner />
    </Suspense>
  );
}

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

  const [useBackCamera, setUseBackCamera] = useState(true);

  // DEBUG : pour afficher ce que le QR lit
  const [debugRaw, setDebugRaw] = useState<string | null>(null);

  // =============== MODE ==================
  useEffect(() => {
    const m = searchParams.get("mode");
    if (m === "redeem") setMode("redeem");
    else setMode("purchase");
  }, [searchParams]);

  // =============== WALLET ==================
  useEffect(() => {
    const loadWallet = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session) {
        router.push("/login");
        return;
      }

      const { data } = await supabase
        .from("wallets")
        .select("balance")
        .eq("user_id", session.user.id)
        .maybeSingle();

      setWallet(data);
    };

    loadWallet();
  }, [supabase, router]);

  // =============== CHARGER COMMERÇANT DE L'URL ==================
  useEffect(() => {
    const token = searchParams.get("m");
    if (!token) return;

    const loadMerchant = async () => {
      const { data, error } = await supabase
        .from("merchants")
        .select("id, name, qr_token")
        .eq("qr_token", token)
        .maybeSingle();

      if (error || !data) {
        setScanError("Commerçant introuvable.");
        setMerchant(null);
        return;
      }

      setMerchant(data);
    };

    loadMerchant();
  }, [searchParams, supabase]);

  // =============== TIMER POPUP ==================
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

  // =============== SCAN ==================
  const handleScan = async (result: any) => {
    if (!result || !result.text) return;

    const raw = String(result.text).trim();
    setDebugRaw(raw);
    setScanError(null);

    let token: string | null = null;

    // Extraire paramètre m=xxx
    const mMatch = raw.match(/[?&]m=([^&]+)/);
    if (mMatch && mMatch[1]) token = decodeURIComponent(mMatch[1]);

    // Sinon, dernière partie du path
    if (!token && (raw.startsWith("http://") || raw.startsWith("https://"))) {
      try {
        const urlObj = new URL(raw);
        const parts = urlObj.pathname.split("/").filter(Boolean);
        if (parts.length > 0) token = parts[parts.length - 1];
      } catch (_) {}
    }

    // Sinon brut
    if (!token) token = raw;

    // Requête DB
    const { data, error } = await supabase
      .from("merchants")
      .select("id, name, qr_token")
      .eq("qr_token", token)
      .maybeSingle();

    if (error || !data) {
      setScanError("Commerçant introuvable.");
      setMerchant(null);
      return;
    }

    setMerchant(data);

    // Mettre l’URL propre (mais sans reload)
    try {
      const params = new URLSearchParams(window.location.search);
      params.set("m", token);
      params.set("mode", mode);
      window.history.replaceState(null, "", `/scan?${params.toString()}`);
    } catch (_) {}
  };

  const handleError = () => {
    setScanError("Erreur caméra");
  };

  // =============== MODE REDEEM ==================
  const renderRedeemContent = () => {
    const solde = wallet?.balance ?? 0;

    if (!merchant) {
      return (
        <>
          <p>Scannez le QR code du commerçant pour utiliser vos crédits.</p>

          <div style={{ maxWidth: 400, marginTop: 20 }}>
            <QrScanner
              key={useBackCamera ? "redeem-back" : "redeem-front"}
              delay={300}
              onScan={handleScan}
              onError={handleError}
              style={{ width: "100%" }}
              constraints={{
                video: { facingMode: useBackCamera ? "environment" : "user" },
              }}
            />
          </div>

          {debugRaw && (
            <p style={{ marginTop: 8, fontSize: 12, wordBreak: "break-all" }}>
              Dernier QR lu : <code>{debugRaw}</code>
            </p>
          )}

          <button
            onClick={() => setUseBackCamera((v) => !v)}
            style={{ marginTop: 12 }}
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
        {/* reste inchangé */}
      </>
    );
  };

  // =============== MODE PURCHASE (FIXÉ) ==================
  const renderPurchaseContent = () => {
    // SI COMMERÇANT TROUVÉ → AFFICHER DIRECT
    if (merchant) {
      return (
        <>
          <h2>Commerçant reconnu</h2>
          <p>
            Vous êtes chez <strong>{merchant.name}</strong>.
          </p>

          <button
            style={{ marginTop: 16 }}
            onClick={() => {
              setMerchant(null);
              setDebugRaw(null);
              setScanError(null);
            }}
          >
            Scanner un autre commerçant
          </button>
        </>
      );
    }

    // Sinon → scanner
    return (
      <>
        <p>Mode achat : scannez le QR code pour enregistrer un achat.</p>

        <div style={{ maxWidth: 400, marginTop: 20 }}>
          <QrScanner
            key={useBackCamera ? "purchase-back" : "purchase-front"}
            delay={300}
            onScan={handleScan}
            onError={handleError}
            style={{ width: "100%" }}
            constraints={{
              video: { facingMode: useBackCamera ? "environment" : "user" },
            }}
          />
        </div>

        {debugRaw && (
          <p style={{ marginTop: 8, fontSize: 12, wordBreak: "break-all" }}>
            Dernier QR lu : <code>{debugRaw}</code>
          </p>
        )}

        <button
          onClick={() => setUseBackCamera((v) => !v)}
          style={{ marginTop: 12 }}
        >
          {useBackCamera
            ? "Utiliser la caméra avant"
            : "Utiliser la caméra arrière"}
        </button>
      </>
    );
  };

  // =============== RENDER ==================
  return (
    <div style={{ padding: 24 }}>
      <h1>
        {mode === "redeem" ? "Utiliser mes crédits" : "Scanner un commerçant"}
      </h1>

      {mode === "redeem"
        ? renderRedeemContent()
        : renderPurchaseContent()}
    </div>
  );
}
