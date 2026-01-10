'use client';

import React, { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import dynamicImport from "next/dynamic";
import { createClient } from "@/lib/supabaseClient";

// Scanner chargé uniquement côté client
const QrScanner: any = dynamicImport(() => import("react-qr-scanner"), {
  ssr: false,
});

export const dynamic = "force-dynamic";

interface Spa {
  id: string;
  name: string;
}

function ScanInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const supabase = createClient();

  const merchantCode = searchParams.get("m");

  const [scanned, setScanned] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [amount, setAmount] = useState<string>("");
  const [spas, setSpas] = useState<Spa[]>([]);
  const [selectedSpaId, setSelectedSpaId] = useState<string | null>(null);
  const [loadingSpas, setLoadingSpas] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Toggle 100% don
  const [donateAll, setDonateAll] = useState(false);

  // Charger la liste des refuges
  useEffect(() => {
    const loadSpas = async () => {
      if (!merchantCode) return;

      setLoadingSpas(true);

      const { data, error } = await supabase
        .from("spas")
        .select("id, name")
        .order("name", { ascending: true });

      if (error) {
        console.error(error);
        setError("Impossible de charger la liste des refuges.");
      } else {
        setSpas(data || []);
        if (data && data.length > 0) {
          setSelectedSpaId(data[0].id);
        }
      }

      setLoadingSpas(false);
    };

    loadSpas();
  }, [merchantCode, supabase]);

  /** 📌 Gestion du scan QR */
  const handleScan = (data: any) => {
    if (!data || scanned) return;

    const text = typeof data === "string" ? data : data.text || "";
    if (!text) return;

    console.log("QR scanné :", text);

    let extractedMerchantCode: string | null = null;

    // Extraction depuis une URL
    try {
      const url = new URL(text);
      const m = url.searchParams.get("m");
      if (m) extractedMerchantCode = m;
    } catch {}

    // Extraction d'un code brut PP_XXXX_YYYY
    if (!extractedMerchantCode) {
      const match = text.match(/PP_[A-Z0-9]+_[A-Z0-9]+/);
      if (match) extractedMerchantCode = match[0];
    }

    if (!extractedMerchantCode) {
      setError("QR code invalide.");
      return;
    }

    setScanned(true);
    router.push(`/scan?m=${encodeURIComponent(extractedMerchantCode)}`);
  };

  const handleError = (err: any) => {
    console.error(err);
    setError("Impossible d'accéder à la caméra.");
  };

  /** 📌 Soumission de la transaction */
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!merchantCode) return;

    const numericAmount = parseFloat(amount.replace(",", "."));
    if (isNaN(numericAmount) || numericAmount <= 0) {
      setError("Montant invalide.");
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session) {
        router.push(`/login?redirect=${encodeURIComponent(`/scan?m=${merchantCode}`)}`);
        return;
      }

      const { error: txError } = await supabase.rpc(
        "create_transaction_from_scan",
        {
          p_merchant_code: merchantCode,
          p_amount: numericAmount,
          p_spa_id: selectedSpaId,
          p_donate_all: donateAll, // 👈 toggle 100% don
        }
      );

      if (txError) {
        console.error(txError);
        setError("Erreur lors de la validation : " + txError.message);
      } else {
        router.push("/dashboard");
      }
    } finally {
      setSubmitting(false);
    }
  };

  /** 🔹 Si PAS de merchantCode → affichage du SCANNER */
  if (!merchantCode) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center px-4">
        <h1 className="text-2xl font-bold mb-4">Scanner un commerçant</h1>

        <div className="w-full max-w-xs aspect-square mb-4">
          <QrScanner
            delay={300}
            onError={handleError}
            onScan={handleScan}
            style={{ width: "100%", height: "100%" }}
            constraints={{
              audio: false,
              video: { facingMode: { ideal: "environment" } },
            }}
          />
        </div>

        {error && <p className="text-red-500 mt-2">{error}</p>}
      </div>
    );
  }

  /** 🔹 Si merchantCode présent → affichage du FORMULAIRE */
  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4">
      <h1 className="text-2xl font-bold">Valider votre achat</h1>

      <p className="mt-2 text-sm">Commerçant : <b>{merchantCode}</b></p>

      <form onSubmit={handleSubmit} className="w-full max-w-sm mt-6 space-y-4">
        <div>
          <label className="block text-sm mb-1">Montant (€)</label>
          <input
            type="number"
            step="0.01"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            className="w-full border rounded px-3 py-2"
            required
          />
        </div>

        <div>
          <label className="block text-sm mb-1">Refuge à soutenir</label>
          <select
            value={selectedSpaId || ""}
            onChange={(e) => setSelectedSpaId(e.target.value)}
            className="w-full border rounded px-3 py-2"
          >
            {spas.map((spa) => (
              <option key={spa.id} value={spa.id}>
                {spa.name}
              </option>
            ))}
          </select>
        </div>

        {/* Toggle 50/50 ou 100% don */}
        <div className="flex items-center space-x-2">
          <input
            type="checkbox"
            checked={donateAll}
            onChange={(e) => setDonateAll(e.target.checked)}
          />
          <label className="text-sm">
            Donner 100% du cashback au refuge (décoché = 50% don / 50% cagnotte client)
          </label>
        </div>

        {error && (
          <p className="text-red-500 text-sm">{error}</p>
        )}

        <button
          type="submit"
          disabled={submitting}
          className="w-full bg-black text-white py-2 rounded disabled:opacity-60"
        >
          {submitting ? "Validation..." : "Valider et générer le cashback"}
        </button>
      </form>
    </div>
  );
}

export default function ScanPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center">Chargement...</div>}>
      <ScanInner />
    </Suspense>
  );
}
