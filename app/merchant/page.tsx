"use client";

import { useEffect, useState, useRef } from "react";
import { createClient } from "@/lib/supabaseClient";
import QRCode from "react-qr-code";
import jsPDF from "jspdf";
import html2canvas from "html2canvas";

export default function MerchantDashboard() {
  const supabase = createClient();

  const [merchant, setMerchant] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // Stats
  const [totalAmount, setTotalAmount] = useState(0);
  const [totalCashback, setTotalCashback] = useState(0);
  const [totalDonations, setTotalDonations] = useState(0);
  const [totalCount, setTotalCount] = useState(0);

  // Référence pour le chevalet (zone cachée pour le PDF)
  const chevaletRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);

      // 1) Utilisateur connecté
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError || !user) {
        setLoading(false);
        return;
      }

      // 2) Profil client → merchant_id
      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("merchant_id")
        .eq("id", user.id)
        .single();

      if (profileError || !profile?.merchant_id) {
        setMerchant(null);
        setLoading(false);
        return;
      }

      // 3) Charger les infos commerçant
      const { data: merchantData, error: merchantError } = await supabase
        .from("merchants")
        .select("*")
        .eq("id", profile.merchant_id)
        .single();

      if (merchantError || !merchantData) {
        setMerchant(null);
        setLoading(false);
        return;
      }

      setMerchant(merchantData);

      // 4) Charger les transactions du commerçant
      const { data: tx, error: txError } = await supabase
        .from("admin_transactions_detailed")
        .select("amount, cashback_amount, donation_amount, merchant_name")
        .eq("merchant_name", merchantData.name); // comme avant, pas de filtre status

      if (!txError && tx && tx.length > 0) {
        let total = 0;
        let cb = 0;
        let dons = 0;

        tx.forEach((t: any) => {
          total += t.amount || 0;
          cb += t.cashback_amount || 0;
          dons += t.donation_amount || 0;
        });

        setTotalAmount(total);
        setTotalCashback(cb);
        setTotalDonations(dons);
        setTotalCount(tx.length);
      } else {
        setTotalAmount(0);
        setTotalCashback(0);
        setTotalDonations(0);
        setTotalCount(0);
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

  // =======================
  //  Téléchargement PDF chevalet
  // =======================
  const handleDownloadChevalet = async () => {
    if (!chevaletRef.current) return;

    try {
      const element = chevaletRef.current;

      const canvas = await html2canvas(element, {
        scale: 2,
        useCORS: true,
      });

      const imgData = canvas.toDataURL("image/png");

      const pdf = new jsPDF({
        orientation: "portrait",
        unit: "mm",
        format: "a5",
      });

      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = pdf.internal.pageSize.getHeight();

      pdf.addImage(imgData, "PNG", 0, 0, pdfWidth, pdfHeight);

      const safeName = (merchant.name || "Commerce").replace(
        /[^a-z0-9]+/gi,
        "_"
      );
      pdf.save(`PawPass_Chevalet_${safeName}.pdf`);
    } catch (err) {
      console.error(err);
      alert(
        "Une erreur est survenue lors de la génération du chevalet. Réessayez plus tard."
      );
    }
  };

  return (
    <>
      {/* ZONE CACHÉE : modèle du chevalet pour le PDF */}
      <div
        style={{
          position: "absolute",
          left: "-9999px",
          top: 0,
          opacity: 0,
          pointerEvents: "none",
        }}
      >
        <div
          ref={chevaletRef}
          style={{
            width: "600px",
            minHeight: "850px",
            padding: "32px",
            backgroundColor: "#FAFAF5",
            borderRadius: "24px",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "flex-start",
            fontFamily: "system-ui, -apple-system, BlinkMacSystemFont",
            boxSizing: "border-box",
          }}
        >
          {/* Logo PawPass – en <img> pour html2canvas */}
          <div
            style={{
              marginBottom: "24px",
              textAlign: "center",
            }}
          >
            <img
              src="/pawpass-logo.jpg"
              alt="PawPass"
              style={{
                width: "220px",
                height: "auto",
                objectFit: "contain",
              }}
            />
          </div>

          {/* Titre */}
          <h1
            style={{
              fontSize: "28px",
              margin: "0 0 12px 0",
              textAlign: "center",
              color: "#14323A",
            }}
          >
            Scannez ce QR code
          </h1>
          <p
            style={{
              fontSize: "18px",
              margin: "0 0 24px 0",
              textAlign: "center",
              color: "#36545B",
              maxWidth: "480px",
            }}
          >
            Après chaque achat, flashez ce code pour{" "}
            <strong>gagner du cashback</strong> et{" "}
            <strong>soutenir les refuges animaliers</strong> du Pays
            Basque.
          </p>

          {/* QR code au centre */}
          <div
            style={{
              backgroundColor: "#FFFFFF",
              padding: "18px",
              borderRadius: "16px",
              boxShadow: "0 10px 25px rgba(0,0,0,0.06)",
              marginBottom: "24px",
            }}
          >
            <QRCode value={scanUrl} size={220} />
          </div>

          {/* Nom du commerce */}
          <p
            style={{
              fontSize: "20px",
              fontWeight: 600,
              margin: "0 0 4px 0",
              textAlign: "center",
              color: "#14323A",
            }}
          >
            {merchant.name}
          </p>
          <p
            style={{
              fontSize: "16px",
              margin: "0 0 24px 0",
              textAlign: "center",
              color: "#4B5F64",
            }}
          >
            {merchant.city} · {merchant.address}
          </p>

          {/* Explications bas de page */}
          <div
            style={{
              marginTop: "auto",
              textAlign: "center",
              fontSize: "14px",
              color: "#526A6F",
              maxWidth: "520px",
            }}
          >
            <p style={{ marginBottom: "8px" }}>
              À chaque achat, une partie du montant est reversée en
              cashback sur votre cagnotte PawPass, et une autre
              partie est envoyée aux{" "}
              <strong>refuges partenaires</strong>.
            </p>
            <p style={{ marginBottom: "4px" }}>
              Application gratuite, compatible iPhone &amp; Android.
            </p>
            <p style={{ fontSize: "12px", marginTop: "8px" }}>
              Plus d&apos;infos sur <strong>pawpass.fr</strong>
            </p>
          </div>
        </div>
      </div>

      {/* CONTENU VISIBLE : espace commerçant */}
      <div style={{ padding: "20px", maxWidth: 900, margin: "0 auto" }}>
        <h1>Espace commerçant</h1>

        <p>
          Vous êtes déjà commerçant partenaire PawPass. Utilisez ce code pour
          vos affiches et pour permettre à vos clients de scanner votre QR code
          en boutique.
        </p>

        <div style={{ display: "flex", gap: 30, flexWrap: "wrap" }}>
          {/* QR + bouton téléchargement */}
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: 12,
              alignItems: "center",
            }}
          >
            <QRCode value={scanUrl} size={180} />

            <button
              onClick={handleDownloadChevalet}
              style={{
                marginTop: 8,
                padding: "10px 18px",
                borderRadius: 999,
                border: "none",
                fontWeight: 600,
                cursor: "pointer",
                backgroundColor: "#5FD3B3",
                color: "#0F2530",
                boxShadow: "0 4px 10px rgba(0,0,0,0.12)",
              }}
            >
              Télécharger votre QR code
              <br />
              <span style={{ fontWeight: 400, fontSize: 12 }}>
                (chevalet PDF prêt à imprimer)
              </span>
            </button>
          </div>

          {/* Infos commerçant */}
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

        <div style={{ display: "flex", gap: 20, flexWrap: "wrap" }}>
          {/* CA */}
          <div
            style={{
              flex: 1,
              minWidth: 200,
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

          {/* Cashback généré */}
          <div
            style={{
              flex: 1,
              minWidth: 200,
              padding: 15,
              borderRadius: 10,
              background: "#E8F0FF",
            }}
          >
            <h3>Cashback généré</h3>
            <p style={{ fontSize: 26, fontWeight: "bold" }}>
              {totalCashback.toFixed(2)} €
            </p>
          </div>

          {/* Dons générés */}
          <div
            style={{
              flex: 1,
              minWidth: 200,
              padding: 15,
              borderRadius: 10,
              background: "#E8F0FF",
            }}
          >
            <h3>Dons générés</h3>
            <p style={{ fontSize: 26, fontWeight: "bold" }}>
              {totalDonations.toFixed(2)} €
            </p>
          </div>

          {/* Nombre de transactions */}
          <div
            style={{
              flex: 1,
              minWidth: 200,
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
    </>
  );
}
