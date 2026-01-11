"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabaseClient";
import QRCode from "react-qr-code";

export default function MerchantDashboard() {
  const supabase = createClient();

  const [merchant, setMerchant] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // Stats
  const [totalAmount, setTotalAmount] = useState(0);
  const [totalGenerated, setTotalGenerated] = useState(0);
  const [totalCount, setTotalCount] = useState(0);

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);

      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      // 1) Charger le profil
      const { data: profile } = await supabase
        .from("profiles")
        .select("merchant_id")
        .eq("id", user.id)
        .single();

      if (!profile?.merchant_id) {
        setMerchant(null);
        setLoading(false);
        return;
      }

      // 2) Charger les infos du commerçant
      const { data: merchantData } = await supabase
        .from("merchants")
        .select("*")
        .eq("id", profile.merchant_id)
        .single();

      setMerchant(merchantData);

      // 3) Charger les transactions liées à ce commerçant
      const { data: tx } = await supabase
        .from("transactions")
        .select("amount, cashback_amount, donation_amount")
        .eq("merchant_id", profile.merchant_id)
        .eq("status", "approved");

      if (tx && tx.length > 0) {
        let total = 0;
        let generated = 0;

        tx.forEach((t) => {
          total += t.amount || 0;
          generated += (t.cashback_amount || 0) + (t.donation_amount || 0);
        });

        setTotalAmount(total);
        setTotalGenerated(generated);
        setTotalCount(tx.length);
      }

      setLoading(false);
    };

    loadData();
  }, []);

  if (loading) return <p style={{ padding: 20 }}>Chargement...</p>;

  if (!merchant)
    return (
      <div style={{ padding: 20 }}>
        <h2>Devenir commerçant partenaire</h2>
        <p>Votre compte n’est pas encore validé comme commerçant.</p>
      </div>
    );

  const scanUrl = `https://pawpass.fr/scan?m=${merchant.qr_token}`;

  return (
    <div style={{ padding: "20px", maxWidth: 900, margin: "0 auto" }}>
      <h1>Espace commerçant</h1>

      <p>
        Vous êtes déjà commerçant partenaire PawPass. Utilisez ce code pour vos
        affiches et pour permettre à vos clients de scanner votre QR code en
        boutique.
      </p>

      <div style={{ display: "flex", gap: 30 }}>
        <QRCode value={scanUrl} size={180} />
        <div>
          <h2>{merchant.name}</h2>
          <p>
            {merchant.city} · {merchant.address}
          </p>

          <p>
            <strong>Code commerçant :</strong> {merchant.qr_token}
          </p>

          <p>
            <strong>URL à encoder dans le QR :</strong>
          </p>
          <input
            type="text"
            value={scanUrl}
            readOnly
            style={{
              width: "100%",
              padding: "8px",
              borderRadius: "6px",
              border: "1px solid #ccc",
            }}
          />

          <p style={{ marginTop: 10 }}>
            <strong>Taux de cashback actuel :</strong>{" "}
            {merchant.cashback_rate * 100}%
          </p>
        </div>
      </div>

      <h2 style={{ marginTop: 40 }}>Statistiques PawPass</h2>

      <div style={{ display: "flex", gap: 20 }}>
        <div
          style={{
            flex: 1,
            padding: 15,
            borderRadius: 10,
            background: "#E5F8E8",
          }}
        >
          <h3>CA généré avec PawPass</h3>
          <p style={{ fontSize: 26, fontWeight: "bold" }}>
            {totalAmount.toFixed(2)} €
          </p>
        </div>

        <div
          style={{
            flex: 1,
            padding: 15,
            borderRadius: 10,
            background: "#E8F0FF",
          }}
        >
          <h3>Cashback + dons générés</h3>
          <p style={{ fontSize: 26, fontWeight: "bold" }}>
            {totalGenerated.toFixed(2)} €
          </p>
        </div>

        <div
          style={{
            flex: 1,
            padding: 15,
            borderRadius: 10,
            background: "#FFF5D6",
          }}
        >
          <h3>Nombre de transactions</h3>
          <p style={{ fontSize: 26, fontWeight: "bold" }}>{totalCount}</p>
        </div>
      </div>
    </div>
  );
}
