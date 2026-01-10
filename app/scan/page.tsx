'use client';

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import dynamicImport from "next/dynamic";
import { createClient } from "@/lib/supabaseClient";

const QrScanner: any = dynamicImport(() => import("react-qr-scanner"), {
  ssr: false,
});

export const dynamic = "force-dynamic";

interface Spa {
  id: string;
  name: string;
}

export default function ScanPage() {
  const router = useRouter();
  const supabase = createClient();

  // code commerçant dans l'URL : /scan?m=PP_...
  const [merchantCode, setMerchantCode] = useState<string | null>(null);

  const [scanned, setScanned] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [amount, setAmount] = useState<string>("");
  const [spas, setSpas] = useState<Spa[]>([]);
  const [selectedSpaId, setSelectedSpaId] = useState<string | null>(null);
  const [loadingSpas, setLoadingSpas] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // 🔹 On lit ?m= dans l'URL côté client
  useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    const m = params.get("m");
    setMerchantCode(m);
  }, []);

  // 🔹 Quand on a un merchantCode, on charge la liste des refuges
  useEffect(() => {
    if (!merchantCode) return;

    const loadSpas = async () => {
      setLoadingSpas(true);

      const {
        data: spasData,
        error: spasError,
      } = await supabase
        .from("spas")
        .select("id, name")
        .order("name", { ascending: true });

      if (spasError) {
        console.error("Erreur chargement SPAs :", spasError);
        setError("Impossible de charger la liste des refuges.");
      } else {
        setSpas(spasData || []);
        if (spasData && spasData.length > 0) {
          setSelectedSpaId(spasData[0].id);
        }
      }

      setLoadingSpas(false);
    };

    loadSpas();
  }, [merchantCode, supabase]);

  // 🔹 Gestion du résultat du scanner
  const handleScan = (data: any) => {
    if (!data || scanned) return;

    const text = typeof data === "string" ? data : data.text || "";
    if (!text) return;

    console.log("QR scanné :", text);

    let extractedMerchantCode: string | null = null;

    // 1) Si c'est une URL complète (https://.../scan?m=...)
    try {
      const url = new URL(text);
      const mParam = url.searchParams.get("m");
      if (mParam) {
        extractedMerchantCode = mParam;
      }
    } catch {
      // pas une URL → on continue
    }

    // 2) Sinon, un code brut type PP_XXXX_YYYY
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

    const newUrl = `/scan?m=${encodeURIComponent(extractedMerchantCode)}`;

    // On change l'URL → au prochain render, useEffect relira ?m= et on passera en mode formulaire
    router.push(newUrl);
    if (typeof window !== "undefined") {
      window.history.replaceState(null, "", newUrl);
    }
  };

  const handleError = (err: any) => {
    console.error("Erreur scanner QR :", err);
    setError("Impossible d'accéder à la caméra. Vérifie les autorisations.");
  };

  // 🔹 Soumission du formulaire quand on a déjà le merchantCode
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
        }
      );

      if (txError) {
        console.error("Erreur création transaction :", txError);
        setError(
          "Erreur lors de la validation : " +
            (txError.message || "Erreur inconnue.")
        );
      } else {
        router.push("/dashboard");
      }
    } finally {
      setSubmitting(false);
    }
  };

  // 🔹 Si PAS de merchantCode → on affiche le SCANNER (caméra arrière)
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

  // 🔹 Si merchantCode présent → on affiche le FORMULAIRE (plus de scanner)
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
