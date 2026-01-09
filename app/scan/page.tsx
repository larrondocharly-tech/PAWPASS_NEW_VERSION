"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import NextDynamic from "next/dynamic";
import { createClient } from "@/lib/supabaseClient";

type QrScannerProps = {
  delay: number;
  onScan: (data: any) => void;
  onError: (err: any) => void;
};

const QrScanner = NextDynamic<QrScannerProps>(
  () => import("react-qr-scanner"),
  {
    ssr: false,
  }
);

export const dynamic = "force-dynamic";


interface Spa {
  id: string;
  name: string;
}

export default function ScanPage() {
  const router = useRouter();
  const supabase = createClient();

  const [merchantCode, setMerchantCode] = useState("");
  const [amount, setAmount] = useState("");
  const [spas, setSpas] = useState<Spa[]>([]);
  const [selectedSpaId, setSelectedSpaId] = useState("");
  const [donationPercent, setDonationPercent] = useState(50);
  const [showScanner, setShowScanner] = useState(true);

  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

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
    setErrorMsg("");
  };

  // Callback en cas d'erreur du scanner
  const handleError = (err: any) => {
    console.error("Erreur scanner QR :", err);
    setErrorMsg("Impossible d'accéder à la caméra ou de lire le QR.");
  };

  // Soumission du formulaire de transaction
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg("");
    setSuccessMsg("");

    if (!merchantCode) {
      setErrorMsg("Merci de scanner le QR commerçant avant de valider.");
      return;
    }

    if (!amount || Number(amount) <= 0) {
      setErrorMsg("Montant invalide.");
      return;
    }

    if (!selectedSpaId) {
      setErrorMsg("Merci de choisir un refuge bénéficiaire.");
      return;
    }

    setLoading(true);

    try {
      // Appel à ta fonction Supabase (adaptée à ton schéma)
      // Ici je suppose que tu as la RPC apply_cashback_transaction
      const { data, error } = await supabase.rpc(
        "apply_cashback_transaction",
        {
          p_merchant_code: merchantCode,
          p_amount: Number(amount),
          p_spa_id: selectedSpaId,
          p_use_wallet: false,
          p_wallet_spent: 0,
          p_donation_percent: donationPercent,
        }
      );

      if (error) {
        console.error("Erreur RPC :", error);
        setErrorMsg(error.message || "Erreur lors de l'enregistrement.");
      } else {
        setSuccessMsg("Transaction enregistrée, merci pour votre don !");
        setAmount("");
        setDonationPercent(50);
        setSelectedSpaId("");
        // tu peux rediriger si tu veux
        // router.push("/dashboard");
      }
    } catch (err: any) {
      console.error(err);
      setErrorMsg("Erreur inconnue lors de l'enregistrement.");
    } finally {
      setLoading(false);
    }
  };

  const scannerStyle = {
    width: "100%",
    maxWidth: 320,
    borderRadius: 12,
    overflow: "hidden",
  } as const;

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
        <form onSubmit={handleSubmit}>
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

          <label style={{ fontWeight: 600 }}>Montant de l&apos;achat (€)</label>
          <input
            type="number"
            min="0"
            step="0.01"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            style={{
              width: "100%",
              padding: 10,
              borderRadius: 8,
              border: "1px solid #d1d5db",
              marginBottom: 12,
            }}
          />

          <label style={{ fontWeight: 600 }}>Refuge bénéficiaire</label>
          <select
            value={selectedSpaId}
            onChange={(e) => setSelectedSpaId(e.target.value)}
            style={{
              width: "100%",
              padding: 10,
              borderRadius: 8,
              border: "1px solid #d1d5db",
              marginBottom: 12,
            }}
          >
            <option value="">Sélectionner un refuge</option>
            {spas.map((spa) => (
              <option key={spa.id} value={spa.id}>
                {spa.name}
              </option>
            ))}
          </select>

          {/* CHOIX 50% / 100% */}
          <div style={{ marginBottom: 16, marginTop: 8 }}>
            <label
              style={{
                fontWeight: 600,
                display: "block",
                marginBottom: 8,
              }}
            >
              Pourcentage de don au refuge
            </label>

            <div style={{ display: "flex", gap: 8 }}>
              <button
                type="button"
                onClick={() => setDonationPercent(50)}
                style={{
                  flex: 1,
                  padding: 10,
                  borderRadius: 999,
                  border:
                    donationPercent === 50
                      ? "2px solid #059669"
                      : "1px solid #d1d5db",
                  backgroundColor:
                    donationPercent === 50 ? "#059669" : "white",
                  color: donationPercent === 50 ? "white" : "black",
                  fontWeight: 600,
                  cursor: "pointer",
                }}
              >
                50%
              </button>

              <button
                type="button"
                onClick={() => setDonationPercent(100)}
                style={{
                  flex: 1,
                  padding: 10,
                  borderRadius: 999,
                  border:
                    donationPercent === 100
                      ? "2px solid #059669"
                      : "1px solid #d1d5db",
                  backgroundColor:
                    donationPercent === 100 ? "#059669" : "white",
                  color: donationPercent === 100 ? "white" : "black",
                  fontWeight: 600,
                  cursor: "pointer",
                }}
              >
                100%
              </button>
            </div>

            <p
              style={{
                marginTop: 8,
                fontSize: 14,
                color: "#4b5563",
              }}
            >
              Vous donnez {donationPercent}% de votre cashback au refuge.
            </p>
          </div>

          <button
            type="submit"
            disabled={loading}
            style={{
              width: "100%",
              padding: 12,
              borderRadius: 999,
              border: "none",
              fontWeight: 600,
              backgroundColor: "#059669",
              color: "white",
              cursor: loading ? "default" : "pointer",
              opacity: loading ? 0.7 : 1,
              marginTop: 4,
            }}
          >
            {loading ? "Validation..." : "Valider la transaction"}
          </button>
        </form>
      </div>
    </div>
  );
}
