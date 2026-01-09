"use client";
export const dynamic = "force-dynamic";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabaseClient";
import { QrReader } from "react-qr-reader";

export default function ScanPage() {
  const router = useRouter();
  const supabase = createClient();

  const [merchantCode, setMerchantCode] = useState("");
  const [amount, setAmount] = useState("");
  const [spas, setSpas] = useState<any[]>([]);
  const [selectedSpa, setSelectedSpa] = useState("");
  const [donationPercent, setDonationPercent] = useState(50);
  const [submitting, setSubmitting] = useState(false);
  const [showScanner, setShowScanner] = useState(false);

  const [walletBalance, setWalletBalance] = useState(0);
  const [useWallet, setUseWallet] = useState(false);
  const [walletToUse, setWalletToUse] = useState("");

  useEffect(() => {
    const loadData = async () => {
      // user
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();
      if (userError || !user) return;

      const userId = user.id;

      // refuges
      const { data: spasData } = await supabase
        .from("spas")
        .select("*")
        .order("name");
      if (spasData) {
        setSpas(spasData);
        if (spasData.length > 0) setSelectedSpa(spasData[0].id);
      }

      // wallet
      const { data: walletData } = await supabase
        .from("wallets")
        .select("balance")
        .eq("user_id", userId)
        .maybeSingle();

      if (walletData) setWalletBalance(Number(walletData.balance) || 0);
    };

    loadData();
  }, [supabase]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!merchantCode.trim()) {
      alert("Merci de renseigner le code commerçant.");
      return;
    }
    if (!amount || Number(amount) <= 0) {
      alert("Merci de renseigner un montant valide.");
      return;
    }
    if (!selectedSpa) {
      alert("Merci de choisir un refuge bénéficiaire.");
      return;
    }

    const amountNumber = Number(amount);
    let walletSpent = 0;
    let useWalletFlag = false;

    if (useWallet) {
      const wanted = Number(walletToUse || "0");
      if (wanted <= 0) {
        alert("Merci de renseigner un montant de crédits à utiliser.");
        return;
      }
      walletSpent = Math.min(wanted, walletBalance, amountNumber);
      useWalletFlag = walletSpent > 0;
    }

    setSubmitting(true);

    const { error } = await supabase.rpc("apply_cashback_transaction", {
      p_merchant_code: merchantCode.trim(),
      p_amount: amountNumber,
      p_spa_id: selectedSpa,
      p_use_wallet: useWalletFlag,
      p_wallet_spent: walletSpent,
      p_donation_percent: donationPercent,
      p_receipt_image_url: null,
    });

    setSubmitting(false);

    if (error) {
      alert("Erreur : " + error.message);
      return;
    }

    router.push("/dashboard");
  };

  return (
    <div style={{ padding: "32px 16px", maxWidth: 700, margin: "0 auto" }}>
      <h1 style={{ fontSize: 28, fontWeight: 700, color: "#0f172a", marginBottom: 12 }}>
        Scanner un commerçant
      </h1>

      <p style={{ marginBottom: 24, color: "#475569" }}>
        Dans la version finale, vous pourrez scanner directement le QR code à la caisse.
        Pour cette version en ligne, scannez ou saisissez le <b>code commerçant</b> et le
        <b> montant</b> de votre achat.
      </p>

      {/* BOUTON CAMÉRA */}
      <div style={{ marginBottom: 24 }}>
        {!showScanner && (
          <button
            type="button"
            onClick={() => setShowScanner(true)}
            style={{
              backgroundColor: "#059669",
              color: "white",
              padding: "10px 16px",
              borderRadius: 6,
              fontWeight: 600,
              border: "none",
              cursor: "pointer",
            }}
          >
            📷 Scanner le QR code
          </button>
        )}

        {showScanner && (
          <div
            style={{
              width: "100%",
              maxWidth: 320,
              borderRadius: 12,
              overflow: "hidden",
            }}
          >
            <QrReader
              onResult={(result, error) => {
                if (!!result) {
                  const text = (result as any)?.text;
                  if (text) {
                    setMerchantCode(text);
                    setShowScanner(false);
                  }
                }
              }}
              constraints={{ facingMode: "environment" }}
            />
          </div>
        )}
      </div>

      {/* FORMULAIRE */}
      <form onSubmit={handleSubmit}>
        {/* Code commerçant */}
        <label style={{ fontWeight: 600 }}>Code commerçant</label>
        <input
          type="text"
          placeholder="Ex : BGLN-001"
          value={merchantCode}
          onChange={(e) => setMerchantCode(e.target.value)}
          style={{
            width: "100%",
            padding: 12,
            borderRadius: 6,
            border: "1px solid #cbd5e1",
            marginBottom: 18,
          }}
        />

        {/* Montant */}
        <label style={{ fontWeight: 600 }}>Montant de l&apos;achat</label>
        <input
          type="number"
          step="0.01"
          placeholder="Ex : 23.50"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          style={{
            width: "100%",
            padding: 12,
            borderRadius: 6,
            border: "1px solid #cbd5e1",
            marginBottom: 18,
          }}
        />

        {/* Refuge */}
        <label style={{ fontWeight: 600 }}>Refuge bénéficiaire</label>
        <select
          value={selectedSpa}
          onChange={(e) => setSelectedSpa(e.target.value)}
          style={{
            width: "100%",
            padding: 12,
            borderRadius: 6,
            border: "1px solid #cbd5e1",
            marginBottom: 18,
          }}
        >
          {spas.map((spa) => (
            <option key={spa.id} value={spa.id}>
              {spa.name}
            </option>
          ))}
        </select>

        {/* Pourcentage don */}
        <label style={{ fontWeight: 600, display: "block", marginBottom: 8 }}>
          Part du cashback donnée au refuge
        </label>

        <div style={{ display: "flex", gap: 12, marginBottom: 24 }}>
          <button
            type="button"
            onClick={() => setDonationPercent(50)}
            style={{
              padding: "8px 12px",
              borderRadius: 6,
              border: donationPercent === 50 ? "2px solid #059669" : "1px solid #cbd5e1",
              backgroundColor: donationPercent === 50 ? "#ecfdf5" : "white",
            }}
          >
            50 % pour le refuge
          </button>

          <button
            type="button"
            onClick={() => setDonationPercent(100)}
            style={{
              padding: "8px 12px",
              borderRadius: 6,
              border: donationPercent === 100 ? "2px solid #059669" : "1px solid #cbd5e1",
              backgroundColor: donationPercent === 100 ? "#ecfdf5" : "white",
            }}
          >
            100 % pour le refuge
          </button>
        </div>

        {/* Utiliser mes crédits */}
        <div
          style={{
            borderRadius: 12,
            border: "1px solid #e5e7eb",
            padding: 16,
            marginBottom: 24,
            backgroundColor: "#f9fafb",
          }}
        >
          <label style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <input
              type="checkbox"
              checked={useWallet}
              onChange={(e) => setUseWallet(e.target.checked)}
            />
            <span style={{ fontWeight: 600 }}>
              Utiliser mes crédits (solde : {walletBalance.toFixed(2)} €)
            </span>
          </label>

          {useWallet && (
            <div style={{ marginTop: 12 }}>
              <label style={{ fontSize: 14 }}>
                Montant de crédits à utiliser
              </label>
              <input
                type="number"
                step="0.01"
                value={walletToUse}
                onChange={(e) => setWalletToUse(e.target.value)}
                placeholder="Ex : 5.00"
                style={{
                  width: "100%",
                  padding: 10,
                  borderRadius: 6,
                  border: "1px solid #cbd5e1",
                  marginTop: 4,
                }}
              />
              <p style={{ fontSize: 12, color: "#6b7280", marginTop: 4 }}>
                Maximum : min(montant de l&apos;achat, solde disponible).
              </p>
            </div>
          )}
        </div>

        {/* Submit */}
        <button
          type="submit"
          disabled={submitting}
          style={{
            width: "100%",
            backgroundColor: "#059669",
            color: "white",
            padding: "12px 16px",
            borderRadius: 6,
            fontWeight: 600,
            border: "none",
            opacity: submitting ? 0.7 : 1,
            cursor: submitting ? "default" : "pointer",
          }}
        >
          {submitting ? "Enregistrement..." : "Valider mon achat"}
        </button>
      </form>
    </div>
  );
}
