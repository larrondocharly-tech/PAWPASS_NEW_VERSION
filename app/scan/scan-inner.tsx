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

  const scannedCode = searchParams.get("code") || null;
  const [scanned, setScanned] = useState(false);
  const [merchantCode, setMerchantCode] = useState(scannedCode);
  const [merchantFound, setMerchantFound] = useState<any>(null);
  const [loadingMerchant, setLoadingMerchant] = useState(false);

  const [amount, setAmount] = useState("");
  const [spas, setSpas] = useState<Spa[]>([]);
  const [selectedSpaId, setSelectedSpaId] = useState("");
  const [donationPercent, setDonationPercent] = useState(50);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Load SPAs
  useEffect(() => {
    const load = async () => {
      const { data } = await supabase
        .from("spas")
        .select("id, name")
        .order("name", { ascending: true });
      setSpas(data || []);
    };
    load();
  }, []);

  // Load merchant once we have code
  useEffect(() => {
    if (!merchantCode) return;
    const loadMerchant = async () => {
      setLoadingMerchant(true);
      const { data } = await supabase
        .from("merchants")
        .select("*")
        .eq("merchant_code", merchantCode)
        .single();
      setMerchantFound(data || null);
      setLoadingMerchant(false);
    };
    loadMerchant();
  }, [merchantCode]);

  const handleScan = (result: any) => {
    if (!result || scanned) return;
    const code = result.text;
    setScanned(true);
    router.push(`/scan?code=${code}`);
  };

  const handleSubmit = async (e: any) => {
    e.preventDefault();
    setErrorMsg(null);

    if (!merchantFound) {
      setErrorMsg("Commerçant introuvable");
      return;
    }
    if (!amount) {
      setErrorMsg("Montant invalide");
      return;
    }
    if (!selectedSpaId) {
      setErrorMsg("Choisissez une SPA");
      return;
    }

    const { data: auth } = await supabase.auth.getUser();
    if (!auth?.user) {
      router.push(
        `/register?from=scan&code=${merchantCode}&amount=${amount}`
      );
      return;
    }

    const { error } = await supabase.rpc("apply_cashback_transaction", {
      p_merchant_code: merchantCode,
      p_amount: parseFloat(amount),
      p_spa_id: selectedSpaId,
      p_donation_percent: donationPercent,
      p_use_wallet: false,
      p_wallet_spent: 0
    });

    if (error) {
      setErrorMsg(error.message);
      return;
    }

    router.push("/dashboard");
  };

  return (
    <div style={{ padding: 20 }}>
      <h1>Scanner un commerçant</h1>

      {errorMsg && <p style={{ color: "red" }}>{errorMsg}</p>}

      {!merchantCode && (
        <QrScanner
          delay={250}
          style={{ width: "100%" }}
          constraints={{
            video: { facingMode: { ideal: "environment" } }
          }}
          onScan={handleScan}
          onError={(err: any) => console.error("QR error:", err)}
        />
      )}

      {merchantCode && loadingMerchant && <p>Chargement commerçant…</p>}

      {merchantFound && (
        <form onSubmit={handleSubmit} style={{ marginTop: 20 }}>
          <h2>{merchantFound.name}</h2>

          <input
            type="number"
            placeholder="Montant"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            style={{ width: "100%", padding: 10, marginTop: 10 }}
          />

          <label style={{ fontWeight: 600, marginTop: 10, display: "block" }}>
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

          <label style={{ display: "block", marginTop: 15 }}>
            Pourcentage de don : {donationPercent}%
          </label>
          <input
            type="range"
            min="0"
            max="100"
            value={donationPercent}
            onChange={(e) => setDonationPercent(parseInt(e.target.value))}
            style={{ width: "100%" }}
          />

          <button
            type="submit"
            style={{
              marginTop: 20,
              padding: "10px 20px",
              background: "#0A8F44",
              color: "white",
              borderRadius: 8
            }}
          >
            Valider
          </button>
        </form>
      )}

      {merchantCode && !merchantFound && !loadingMerchant && (
        <p>Commerçant introuvable.</p>
      )}
    </div>
  );
}
