"use client";

import React, { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Image from "next/image";
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

  // Ticket de caisse (photo / pdf)
  const [receiptFile, setReceiptFile] = useState<File | null>(null);
  const [isUploadingReceipt, setIsUploadingReceipt] = useState(false);

  // errorMsg: erreurs de validation (montant vide, SPA non choisie, etc.)
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  // error: erreurs venant de Supabase (RPC / trigger 2h / autres)
  const [error, setError] = useState<string | null>(null);

  // Popup de remerciement
  const [showThankYou, setShowThankYou] = useState(false);

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
  // Upload du ticket dans le bucket "receipts"
  // =========================
  const uploadReceiptIfNeeded = async (
    userId: string,
    amountNumber: number
  ): Promise<string | null> => {
    // Si montant <= 50€ → ticket facultatif
    if (amountNumber <= 50) {
      // S'il n'y a pas de fichier, on ne fait rien
      if (!receiptFile) return null;
      // S'il y a un fichier même pour < 50€, on peut l'uploader quand même
    } else {
      // Montant > 50€ → ticket obligatoire
      if (!receiptFile) {
        setErrorMsg("Ticket de caisse obligatoire pour les achats > 50€.");
        return null;
      }
    }

    if (!receiptFile) {
      return null;
    }

    setIsUploadingReceipt(true);

    const ext = receiptFile.name.split(".").pop() || "jpg";
    const fileName = `${Date.now()}.${ext}`;
    const filePath = `${userId}/${fileName}`;

    const { data, error: uploadError } = await supabase.storage
      .from("receipts")
      .upload(filePath, receiptFile, {
        cacheControl: "3600",
        upsert: false,
      });

    setIsUploadingReceipt(false);

    if (uploadError || !data) {
      console.error("Upload ticket error:", uploadError);
      setError(
        "Impossible d'envoyer le ticket. Vérifiez le fichier et réessayez."
      );
      return null;
    }

    // On stocke simplement le path (admin pourra générer une URL signée)
    return data.path;
  };

  // =========================
  // Soumission du formulaire (création transaction)
  // =========================
  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
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

    const amountNumber = parseFloat(amount.replace(",", "."));
    if (Number.isNaN(amountNumber) || amountNumber <= 0) {
      setErrorMsg("Montant invalide.");
      return;
    }

    const { data: auth } = await supabase.auth.getUser();
    if (!auth?.user) {
      router.push(
        `/register?from=scan&code=${merchantCode ?? ""}&amount=${amount}`
      );
      return;
    }

    // Gestion du ticket de caisse / upload
    const receiptPath = await uploadReceiptIfNeeded(auth.user.id, amountNumber);
    if (amountNumber > 50 && !receiptPath) {
      // erreur déjà affichée (absence de fichier ou upload raté)
      return;
    }

    const { error: rpcError } = await supabase.rpc(
      "apply_cashback_transaction",
      {
        p_merchant_code: merchantCode,
        p_amount: amountNumber,
        p_spa_id: selectedSpaId,
        p_use_wallet: false,
        p_wallet_spent: 0,
        p_donation_percent: donationPercent,
        p_receipt_image_url: receiptPath ?? null,
      }
    );

    if (rpcError) {
      console.error(rpcError);

      const msg = rpcError.message.toUpperCase();

      if (msg.includes("DOUBLE_SCAN_2H")) {
        setError(
          "Vous avez déjà enregistré un achat chez ce commerçant il y a moins de 2 heures. " +
            "Pour éviter les abus, un seul scan est autorisé toutes les 2 heures pour un même commerçant."
        );
        return;
      }

      if (msg.includes("RECEIPT_REQUIRED")) {
        setError(
          "Ticket requis pour les achats de plus de 50€. Merci d'ajouter une photo ou un PDF."
        );
        return;
      }

      setError(
        `Erreur lors de l'enregistrement de la transaction : ${rpcError.message}`
      );
      return;
    }

    // =========================
    // Succès : popup de remerciement (plus de redirection automatique)
    // =========================
    setShowThankYou(true);
  };

  // =========================
  // Rendu
  // =========================
  return (
    <div style={{ padding: 20 }}>
      <h1>Scanner un commerçant</h1>

      {(error || errorMsg) && (
        <p style={{ color: "red", marginTop: 8 }}>{error || errorMsg}</p>
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

          {/* Montant */}
          <input
            type="number"
            placeholder="Montant"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            style={{ width: "100%", padding: 10, marginTop: 10 }}
          />

          {/* Ticket de caisse */}
          <div style={{ marginTop: 16 }}>
            <label
              style={{
                display: "block",
                fontWeight: 600,
                marginBottom: 8,
              }}
            >
              Ticket de caisse (photo ou PDF)
            </label>
            <input
              type="file"
              accept="image/*,application/pdf"
              onChange={(e) => {
                const file = e.target.files?.[0] ?? null;
                setReceiptFile(file);
              }}
              style={{ marginBottom: 4 }}
            />
            <p
              style={{
                fontSize: 12,
                color: "#92400E",
                marginTop: 4,
              }}
            >
              Obligatoire pour les achats &gt; 50 €.
            </p>
          </div>

          {/* Refuge */}
          <label
            style={{
              fontWeight: 600,
              marginTop: 16,
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

          {/* Don 50 / 100 % */}
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
            disabled={isUploadingReceipt}
            style={{
              marginTop: 20,
              padding: "10px 20px",
              background: "#0A8F44",
              color: "white",
              borderRadius: 8,
              opacity: isUploadingReceipt ? 0.7 : 1,
            }}
          >
            {isUploadingReceipt ? "Envoi du ticket..." : "Valider"}
          </button>
        </form>
      )}

      {/* Cas commerçant introuvable */}
      {merchantCode && !merchantFound && !loadingMerchant && !error && (
        <p style={{ marginTop: 16 }}>Commerçant introuvable.</p>
      )}

      {/* =========================
          POPUP "Meeeeh-rciiii pour votre don !"
      ========================== */}
      {showThankYou && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            backgroundColor: "rgba(0,0,0,0.45)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 9999,
          }}
        >
          <div
            style={{
              backgroundColor: "#FFFFFB",
              borderRadius: "20px",
              padding: "20px 18px 18px",
              width: "90%",
              maxWidth: "360px",
              boxShadow: "0 10px 30px rgba(0,0,0,0.15)",
              textAlign: "center",
            }}
          >
            <div style={{ marginBottom: 12 }}>
              <Image
                src="/goat-thankyou.gif"
                alt="Merci pour votre don"
                width={260}
                height={260}
                unoptimized
                style={{
                  borderRadius: 16,
                  objectFit: "cover",
                }}
              />
            </div>

            <p
              style={{
                fontWeight: 700,
                fontSize: 18,
                margin: "0 0 6px",
                color: "#222222",
              }}
            >
              Meeeeh-rciiii pour votre don !
            </p>

            <p
              style={{
                fontSize: 14,
                margin: 0,
                color: "#555555",
              }}
            >
              Grâce à vous, les animaux des refuges locaux sont un peu mieux
              soutenus.
            </p>

            <button
              onClick={() => router.push("/dashboard")}
              style={{
                marginTop: 16,
                padding: "10px 18px",
                borderRadius: 10,
                fontWeight: 600,
                backgroundColor: "#0A8F44",
                color: "white",
                border: "none",
                width: "100%",
              }}
            >
              Retour au tableau de bord
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
