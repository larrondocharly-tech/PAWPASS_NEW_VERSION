// @ts-nocheck

"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
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
  const supabase = createClient();

  const [scanned, setScanned] = useState(false);
  const [merchantCode, setMerchantCode] = useState<string | null>(null);
  const [amount, setAmount] = useState("");
  const [loading, setLoading] = useState(false);

  // Callback du scanner QR
  const handleScan = (result: any) => {
    if (result && !scanned) {
      setScanned(true);
      setMerchantCode(result?.text ?? null);
    }
  };

  const handleError = (err: any) => {
    console.error("Erreur QR Scanner :", err);
  };

  // Validation du montant et redirection
  const handleSubmit = () => {
    if (!amount || !merchantCode) return;

    router.push(
      `/scan?merchant=${encodeURIComponent(merchantCode)}&amount=${encodeURIComponent(
        amount
      )}`
    );
  };

  return (
    <main style={{ padding: "20px" }}>
      <h1>Scanner un commerçant</h1>

      {!scanned && (
        <div style={{ width: "100%", maxWidth: "500px" }}>
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
      )}

      {scanned && (
        <div style={{ marginTop: "20px" }}>
          <p>Code commerçant détecté : <strong>{merchantCode}</strong></p>

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
        </div>
      )}
    </main>
  );
}
