'use client';

import React, { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import dynamicImport from "next/dynamic";
import { createClient } from "@/lib/supabaseClient";

// Chargement du scanner uniquement côté client
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

  // code commerçant dans l'URL : /scan?m=PP_...
  const merchantCode = searchParams.get("m");

  const [scanned, setScanned] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [amount, setAmount] = useState<string>("");
  const [spas, setSpas] = useState<Spa[]>([]);
  const [selectedSpaId, setSelectedSpaId] = useState<string | null>(null);
  const [loadingSpas, setLoadingSpas] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Toggle 100% don (true) ou 50/50 (false)
  const [donateAll, setDonateAll] = useState(false);

  // Charger la liste des refuges quand on a un code commerçant
  useEffect(() => {
    const loadSpas = async () => {
      if (!merchantCode) return;

      setLoadingSpas(true);

      const { data, error } = await supabase
        .from("spas")
        .select("id, name")
        .order("name", { ascending: true });

      if (error) {
        console.error("Erreur chargement SPAs :", error);
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

  /** 🔹 Gestion du résultat du scanner */
  const handleScan = (data: any) => {
    if (!data || scanned) return;

    const text = typeof data === "string" ? data : data.text || "";
    if (!text) return;

    console.log("QR scanné :", text);

    let extractedMerchantCode: string | null = null;

    // 1) Essayer de lire comme URL (https://.../scan?m=...)
    try {
      const url = new URL(text);
      const mParam = url.searchParams.get("m");
      if (mParam) {
        extractedMerchantCode = mParam;
      }
    } catch {
      // pas une URL → on continue
    }

    // 2) Sinon matcher un code brut PP_XXXX_YYYY
    if (!extractedMerchantCode) {
      const match = text.match(/PP_[A-Z0-9]+_[A-Z0-9]+/);
      if (match) {
        extractedMerchantCode = match[0];
      }
    }

    if (!extractedMerchantCode) {
      setError("QR code invalide. Merci de scanner le QR fourni par le commerçant.");
      return;
    }

    setScanned(true);
    setError(null);

    // Redirection vers /scan?m=CODE
    router.push(`/scan?m=${encodeURIComponent(extractedMerchantCode)}`);
  };

  /** 🔹 Erreur caméra */
  const handleError = (err: any) => {
    console.error("Erreur scanner QR :", err);
    setError("Impossible d'accéder à la caméra. Vérifie les autorisations.");
  };

  /** 🔹 Soumission du formulaire */
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!merchantCode) return;

    const numericAmount = parseFloat(amount.replace(",", "."));
    if (Number.isNaN(numericAmount) || numericAmount <= 0) {
      setError("Merci d'entrer un montant valide.");
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      const {
        data: { session },
        error: sessionError,
      } = await supabase.auth.getSession();

      if (sessionError || !session) {
        const redirectUrl = `/scan?m=${encodeURIComponent(merchantCode)}`;
        router.push(`/login?redirect=${encodeURIComponent(redirectUrl)}`);
        return;
      }

      const { error: txError } = await supabase.rpc(
        "create_transaction_from_scan",
        {
          p_merchant_code: merchantCode,
          p_amount: numericAmount,
          p_spa_id: selectedSpaId,
          p_donate_all: donateAll, // 👈 100% don ou 50/50
        }
      );

      if (txError) {
        console.error("Erreur création transaction :", txError);
        setError(
          "Erreur lors de la validation : " +
            (txError.message || "Erreur inconnue.")
        );
      } else {
        // ✅ Message de remerciement avant redirection
        const msg = donateAll
          ? "Merci ! Vous avez donné 100% de votre cashback au refuge 🐾"
          : "Merci ! Votre don et votre cashback ont bien été pris en compte 🐾";

        alert(msg);
        router.push("/dashboard");
      }
    } finally {
      setSubmitting(false);
    }
  };

  /** 🔹 S'il n'y a PAS de code commerçant → on affiche le SCANNER */
  if (!merchantCode) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center px-4">
        <h1 className="text-2xl font-bold mb-4">Scanner un commerçant</h1>
        <p className="mb-4 text-center">
          Place le QR code du commerçant dans le cadre pour commencer.
        </p>

        <div className="w-full max-w-xs aspect-square mb-4">
          <QrScanner
            delay={300}
            onError={handleError}
            onScan={handleScan}
            style={{ width: "100%", height: "100%" }}
            constraints={{
              audio: false,
              video: {
                facingMode: { ideal: "environment" }, // caméra arrière
              },
            }}
          />
        </div>

        {error && (
          <p className="text-red-500 text-center mt-2">
            {error}
          </p>
        )}
      </div>
    );
  }

  /** 🔹 S'il y a un code commerçant → on affiche le FORMULAIRE */
  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4">
      <h1 className="text-2xl font-bold mb-2">Valider votre achat</h1>
      <p className="mb-1 text-center text-sm text-gray-600">
        Commerçant : <span className="font-mono">{merchantCode}</span>
      </p>

      {loadingSpas ? (
        <p className="mt-4">Chargement des refuges...</p>
      ) : (
        <form onSubmit={handleSubmit} className="w-full max-w-sm mt-4 space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">
              Montant de votre achat (€)
            </label>
            <input
              type="number"
              step="0.01"
              min="0"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="w-full border rounded px-3 py-2"
              placeholder="Ex : 23,50"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">
              Refuge à soutenir
            </label>
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

          {/* Choix 50/50 ou 100% don */}
          <div className="flex items-center gap-2">
            <input
              id="donate-all"
              type="checkbox"
              checked={donateAll}
              onChange={(e) => setDonateAll(e.target.checked)}
            />
            <label htmlFor="donate-all" className="text-sm">
              Donner <strong>100% du cashback</strong> au refuge{" "}
              <span className="block text-xs text-gray-500">
                (décoché = 50% don / 50% cagnotte client)
              </span>
            </label>
          </div>

          {error && (
            <p className="text-red-500 text-sm">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={submitting}
            className="w-full bg-black text-white rounded py-2 font-semibold disabled:opacity-60"
          >
            {submitting ? "Validation en cours..." : "Valider et générer le cashback"}
          </button>
        </form>
      )}
    </div>
  );
}

export default function ScanPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center">
          Chargement...
        </div>
      }
    >
      <ScanInner />
    </Suspense>
  );
}
