// @ts-nocheck

"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import NextDynamic from "next/dynamic";
import { createClient } from "@/lib/supabaseClient";

// Import dynamique du lecteur QR (empêche l’erreur côté serveur)
const QrScanner = NextDynamic(() => import("react-qr-scanner"), {
  ssr: false,
});

// Force la page en dynamique (Next.js App Router)
export const dynamic = "force-dynamic";

interface Spa {
  id: string;
  name: string;
}

export default function ScanPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const supabase = createClient();

  const [scanned, setScanned] = useState(false);
  const [merchantCode, setMerchantCode] = useState<string | null>(null);
  const [amount, setAmount] = useState("");
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState("");
  const merchantCodeFromQuery = searchParams.get("m");
  const resolvedMerchantCode = merchantCodeFromQuery ?? merchantCode;

  useEffect(() => {
    if (merchantCodeFromQuery && !merchantCode) {
      setMerchantCode(merchantCodeFromQuery);
      setShowScanner(false);
    }
  }, [merchantCodeFromQuery, merchantCode]);

  // Charger la liste des refuges (table "spas")
  useEffect(() => {
    const loadSpas = async () => {
      const { data, error } = await supabase
        .from("spas")
        .select("id, name")
        .order("name", { ascending: true });

      if (!error && data) {
        setSpas(data as Spa[]);
      } else {
        console.error("Erreur chargement SPAs :", error);
      }
    };

    loadSpas();
  }, [supabase]);

  // Callback quand le QR est scanné
  const handleScan = (data: any) => {
    if (!data) return;

    // selon la lib, ça peut être { text: "..."} ou directement une string
    const text = typeof data === "string" ? data : data.text || "";
    if (!text) return;

    setMerchantCode(text);
    setShowScanner(false); // on cache le scanner une fois le code lu
    setErrorMsg(null);
  };

  const handleError = (err: any) => {
    console.error("Erreur QR Scanner :", err);
  };

  // Soumission du formulaire de transaction
  const handleValidateTransaction = async (
    e?: React.FormEvent | React.MouseEvent
  ) => {
    if (e && "preventDefault" in e) e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg("");
    setLoading(true);

    if (!resolvedMerchantCode) {
      setErrorMsg("Merci de scanner le QR commerçant avant de valider.");
      setLoading(false);
      return;
    }

    const normalizedAmount = amount.replace(",", ".");
    const parsedAmount = Number.parseFloat(normalizedAmount);
    if (!Number.isFinite(parsedAmount) || parsedAmount <= 0) {
      setErrorMsg("Montant invalide.");
      setLoading(false);
      return;
    }

    if (!selectedSpaId) {
      setErrorMsg("Merci de choisir un refuge bénéficiaire.");
      setLoading(false);
      return;
    }

    const { data: authData, error: authError } = await supabase.auth.getUser();
    if (authError) {
      console.error("Erreur récupération utilisateur :", authError);
    }

    if (!authData?.user) {
      const redirectParams = new URLSearchParams({
        from: "scan",
        m: resolvedMerchantCode,
        amount: normalizedAmount,
      });
      router.push(`/register?${redirectParams.toString()}`);
      setLoading(false);
      return;
    }

    try {
      // Appel à ta fonction Supabase (adaptée à ton schéma)
      // Ici je suppose que tu as la RPC apply_cashback_transaction
      const { data, error } = await supabase.rpc(
        "apply_cashback_transaction",
        {
          p_merchant_code: resolvedMerchantCode,
          p_amount: parsedAmount,
          p_spa_id: selectedSpaId,
          p_use_wallet: false,
          p_wallet_spent: 0,
          p_donation_percent: donationPercent,
        }
      );

      if (error) {
        console.error("Erreur RPC :", error);
        setErrorMsg(
          error.message ||
            "Une erreur est survenue lors de l'enregistrement de la transaction."
        );
        setLoading(false);
        return;
      }

      setSuccessMsg("Transaction enregistrée, merci pour votre don !");
      setAmount("");
      setDonationPercent(50);
      setSelectedSpaId("");
      router.push("/dashboard");
    } catch (err: any) {
      console.error(err);
      setErrorMsg(
        "Une erreur est survenue lors de l'enregistrement de la transaction."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        padding: 16,
        display: "flex",
        justifyContent: "center",
      }}
    >
      <div style={{ width: "100%", maxWidth: 600 }}>
        <h1
          style={{
            fontSize: 24,
            fontWeight: 700,
            marginBottom: 12,
          }}
        >
          Scanner un ticket PawPass
        </h1>

        <p style={{ marginBottom: 16, color: "#6b7280" }}>
          Scannez le QR code du commerçant, entrez le montant de votre achat et
          choisissez le refuge bénéficiaire.
        </p>

        {errorMsg && (
          <p style={{ color: "#b91c1c", marginBottom: 12 }}>{errorMsg}</p>
        )}
        {successMsg && (
          <p style={{ color: "#047857", marginBottom: 12 }}>{successMsg}</p>
        )}

        {/* SCANNER */}
        {showScanner && (
          <div
            style={{
              marginBottom: 16,
              display: "flex",
              justifyContent: "center",
            }}
          >
            <div style={scannerStyle}>
              <QrScanner
                delay={300}
                onScan={handleScan}
                onError={handleError}
                constraints={{
                  video: {
                    facingMode: { ideal: "environment" },
                  },
                }}
              />
            </div>
          </div>
        )}

        {!showScanner && (
          <button
            type="button"
            onClick={() => setShowScanner(true)}
            style={{
              marginBottom: 16,
              padding: 8,
              borderRadius: 999,
              border: "1px solid #d1d5db",
              backgroundColor: "white",
              cursor: "pointer",
            }}
          >
            Re-scanner un QR code
          </button>
        )}

        {/* FORMULAIRE */}
        <form onSubmit={handleValidateTransaction}>
          <label style={{ fontWeight: 600 }}>Code commerçant</label>
          <input
            type="text"
            value={merchantCode}
            onChange={(e) => setMerchantCode(e.target.value)}
            placeholder="Code ou QR scanné"
            style={{
              width: "100%",
              padding: 10,
              borderRadius: 8,
              border: "1px solid #d1d5db",
              marginBottom: 12,
            }}
          />

          <input
            type="number"
            placeholder="Montant de l'achat"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            style={{
              padding: "10px",
              width: "100%",
              margin: "10px 0",
              fontSize: "16px",
            }}
          />

          <button
            onClick={handleSubmit}
            disabled={loading}
            style={{
              padding: "10px 20px",
              background: "#0A8F44",
              color: "white",
              borderRadius: "6px",
              fontSize: "18px",
            }}
          >
            Valider
          </button>
          {errorMsg && (
            <p style={{ marginTop: 8, color: "#b00020", fontSize: "0.9rem" }}>
              {errorMsg}
            </p>
          )}
        </form>
      </div>
    </div>
  );
}
