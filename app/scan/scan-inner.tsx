"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabaseClient";
import QrScannerRaw from "react-qr-scanner";
const QrScanner: any = QrScannerRaw;

export const dynamic = "force-dynamic";

interface Spa {
  id: string;
  name: string;
}

export default function ScanInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const supabase = createClient();

  // On accepte ?code= ou ?m= pour être compatible avec /scan
  const initialCode =
    searchParams.get("code") || searchParams.get("m") || null;

  const [scanned, setScanned] = useState(false);
  const [merchantCode, setMerchantCode] = useState<string | null>(initialCode);
  const [merchantFound, setMerchantFound] = useState<any>(null);
  const [loadingMerchant, setLoadingMerchant] = useState(false);

  const [amount, setAmount] = useState("");
  const [spas, setSpas] = useState<Spa[]>([]);
  const [selectedSpaId, setSelectedSpaId] = useState("");
  // Choix limité : 50% ou 100%
  const [donationPercent, setDonationPercent] = useState<50 | 100>(50);

  // errorMsg: erreurs de validation (montant vide, SPA non choisie, etc.)
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  // error: erreurs venant de Supabase (RPC / trigger 2h / autres)
  const [error, setError] = useState<string | null>(null);

  // =========================
  // Chargement des SPAs
  // =========================
  useEffect(() => {
    const load = async () => {
      const { data, error } = await supabase
        .from("spas")
        .select("id, name")
        .order("name", { ascending: true });

      if (error) {
        console.error(error);
        setError("Erreur lors du chargement des refuges.");
        return;
      }

      setSpas(data || []);
    };
    load();
  }, [supabase]);

  // =========================
  // Chargement du commerçant
  // =========================
  useEffect(() => {
    if (!merchantCode) return;

    const loadMerchant = async () => {
      setLoadingMerchant(true);
      setError(null);
      setErrorMsg(null);

      const { data, error } = await supabase
        .from("merchants")
        .select("*")
        .eq("qr_token", merchantCode)
        .single();

      if (error) {
        console.error(error);
        setMerchantFound(null);
        setError("Commerçant introuvable.");
      } else {
        setMerchantFound(data || null);
      }

      setLoadingMerchant(false);
    };

    loadMerchant();
  }, [merchantCode, supabase]);

  // =========================
  // Scan QR interne (si on vient directement sur /scan-inner)
  // =========================
  const handleScan = (result: any) => {
    if (!result || scanned) return;

    const code = (result.text || "").trim();
    if (!code) return;

    setScanned(true);
    setMerchantCode(code);

    const currentCode =
      searchParams.get("code") || searchParams.get("m") || null;

    if (currentCode !== code) {
      // On normalise sur ?m= pour être cohérent avec /scan
      router.push(`/scan?m=${encodeURIComponent(code)}`);
    }
  };

  // =========================
  // Soumission du formulaire (création transaction)
  // =========================
  const handleSubmit = async (e: any) => {
    e.preventDefault();
    setErrorMsg(null);
    setError(null);

    if (!merchantFound) {
      setErrorMsg("Commerçant introuvable.");
      return;
    }
    if (!amount) {
      setErrorMsg("Montant invalide.");
      return;
    }
    if (!selectedSpaId) {
      setErrorMsg("Choisissez une SPA.");
      return;
    }

    const { data: auth } = await supabase.auth.getUser();
    if (!auth?.user) {
      router.push(
        `/register?from=scan&code=${merchantCode ?? ""}&amount=${amount}`
      );
      return;
    }

    const { error: rpcError } = await supabase.rpc(
      "apply_cashback_transaction",
      {
        p_merchant_code: merchantCode,
        p_amount: parseFloat(amount),
        p_spa_id: selectedSpaId,
        p_use_wallet: false,
        p_wallet_spent: 0,
        p_donation_percent: donationPercent,
        // très important : on envoie explicitement null pour choisir
        // la version de la fonction qui a p_receipt_image_url
        p_receipt_image_url: null,
      }
    );

    if (rpcError) {
      console.error(rpcError);

      // Cas spécifique : trigger de protection "double scan < 2h"
      if (
        rpcError.message &&
        rpcError.message.toUpperCase().includes("DOUBLE_SCAN_2H")
      ) {
        setError(
          "Vous avez déjà enregistré un achat chez ce commerçant il y a moins de 2 heures. " +
            "Pour éviter les abus, un seul scan est autorisé toutes les 2 heures pour un même commerçant."
        );
        return;
      }

      // Autres erreurs Supabase : on affiche le message brut pour debug
      setError(
        `Erreur lors de l'enregistrement de la transaction : ${rpcError.message}`
      );
      return;
    }

    // Succès : retour au tableau de bord
    router.push("/dashboard");
  };

  // =========================
  // Rendu
  // =========================
  return (
    <div style={{ padding: 20 }}>
      <h1>Scanner un commerçant</h1>

      {(error || errorMsg) && (
        <p style={{ color: "red", marginTop: 8 }}>
          {error || errorMsg}
        </p>
      )}

      {/* Si aucun code marchand → scanner interne */}
      {!merchantCode && (
        <QrScanner
          delay={250}
          style={{ width: "100%", marginTop: 16 }}
          constraints={{
            video: { facingMode: { ideal: "environment" } },
          }}
          onScan={handleScan}
          onError={(err: any) => {
            console.error("QR error:", err);
            setError("Erreur du scanner QR.");
          }}
        />
      )}

      {/* Chargement commerçant */}
      {merchantCode && loadingMerchant && (
        <p style={{ marginTop: 16 }}>Chargement commerçant…</p>
      )}

      {/* Formulaire d'achat si commerçant trouvé */}
      {merchantCode && merchantFound && !loadingMerchant && (
        <form onSubmit={handleSubmit} style={{ marginTop: 20 }}>
          <h2>{merchantFound.name}</h2>

          <input
            type="number"
            placeholder="Montant"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            style={{ width: "100%", padding: 10, marginTop: 10 }}
          />

          <label
            style={{
              fontWeight: 600,
              marginTop: 10,
              display: "block",
            }}
          >
            Refuge bénéficiaire
          </label>

          <select
            value={selectedSpaId}
            onChange={(e) => setSelectedSpaId(e.target.value)}
            style={{ width: "100%", padding: 10 }}
          >
            <option value="">Choisir…</option>
            {spas.map((spa) => (
              <option key={spa.id} value={spa.id}>
                {spa.name}
              </option>
            ))}
          </select>

          <label
            style={{
              display: "block",
              marginTop: 15,
              marginBottom: 8,
              fontWeight: 600,
            }}
          >
            Pourcentage de don
          </label>
          <div
            style={{
              display: "flex",
              gap: 8,
            }}
          >
            <button
              type="button"
              onClick={() => setDonationPercent(50)}
              style={{
                flex: 1,
                padding: "10px 0",
                borderRadius: 8,
                border:
                  donationPercent === 50
                    ? "2px solid #0A8F44"
                    : "1px solid #ccc",
                backgroundColor:
                  donationPercent === 50 ? "#0A8F44" : "white",
                color: donationPercent === 50 ? "white" : "#111827",
                fontWeight: 600,
              }}
            >
              50%
            </button>
            <button
              type="button"
              onClick={() => setDonationPercent(100)}
              style={{
                flex: 1,
                padding: "10px 0",
                borderRadius: 8,
                border:
                  donationPercent === 100
                    ? "2px solid #0A8F44"
                    : "1px solid #ccc",
                backgroundColor:
                  donationPercent === 100 ? "#0A8F44" : "white",
                color: donationPercent === 100 ? "white" : "#111827",
                fontWeight: 600,
              }}
            >
              100%
            </button>
          </div>

          <button
            type="submit"
            style={{
              marginTop: 20,
              padding: "10px 20px",
              background: "#0A8F44",
              color: "white",
              borderRadius: 8,
            }}
          >
            Valider
          </button>
        </form>
      )}

      {/* Cas commerçant introuvable */}
      {merchantCode && !merchantFound && !loadingMerchant && !error && (
        <p style={{ marginTop: 16 }}>Commerçant introuvable.</p>
      )}
    </div>
  );
}
