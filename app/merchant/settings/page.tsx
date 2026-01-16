"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabaseClient";

export const dynamic = "force-dynamic";

interface MerchantProfile {
  id: string;
  role: string | null;
  merchant_id: string | null;
}

export default function MerchantSettingsPage() {
  const supabase = createClient();
  const router = useRouter();

  const [profile, setProfile] = useState<MerchantProfile | null>(null);

  // Seuil ticket
  const [threshold, setThreshold] = useState<number>(50);

  // Description / services / horaires / lien maps
  const [merchantDescription, setMerchantDescription] = useState<string>("");
  const [merchantServices, setMerchantServices] = useState<string>("");
  const [openingHours, setOpeningHours] = useState<string>("");
  const [googleMapsUrl, setGoogleMapsUrl] = useState<string>("");

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      setError(null);

      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        router.replace("/login");
        return;
      }

      // Profil commerçant
      const { data: profileData, error: profileError } = await supabase
        .from("profiles")
        .select("id, role, merchant_id")
        .eq("id", user.id)
        .single();

      if (profileError) {
        setError(profileError.message);
        setLoading(false);
        return;
      }

      if (
        !profileData ||
        profileData.role?.toLowerCase() !== "merchant" ||
        !profileData.merchant_id
      ) {
        router.replace("/dashboard");
        return;
      }

      setProfile(profileData);

      // Paramètres commerçant
      const { data: merchant, error: merchantError } = await supabase
        .from("merchants")
        .select(
          "receipt_threshold, description, services, opening_hours, google_maps_url"
        )
        .eq("id", profileData.merchant_id)
        .single();

      if (merchantError) {
        console.error("Erreur chargement paramètres commerçant :", merchantError);
        setError("Impossible de charger les paramètres du commerçant.");
      } else {
        const value =
          typeof merchant?.receipt_threshold === "number"
            ? merchant.receipt_threshold
            : 50;
        setThreshold(value);

        setMerchantDescription(merchant?.description ?? "");
        setMerchantServices(merchant?.services ?? "");
        setOpeningHours(merchant?.opening_hours ?? "");
        setGoogleMapsUrl(merchant?.google_maps_url ?? "");
      }

      setLoading(false);
    };

    void loadData();
  }, [router, supabase]);

  const handleSave = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!profile?.merchant_id) return;

    setSaving(true);
    setError(null);
    setSuccess(null);

    const min = 0;
    const max = 10000;

    if (isNaN(threshold) || threshold < min || threshold > max) {
      setError(`Le montant doit être compris entre ${min} € et ${max} €.`);
      setSaving(false);
      return;
    }

    const { error: updateError } = await supabase
      .from("merchants")
      .update({
        receipt_threshold: threshold,
        description: merchantDescription || null,
        services: merchantServices || null,
        opening_hours: openingHours || null,
        google_maps_url: googleMapsUrl || null,
      })
      .eq("id", profile.merchant_id);

    if (updateError) {
      console.error("Erreur mise à jour paramètres commerçant :", updateError);
      setError("Impossible d'enregistrer les paramètres pour le moment.");
    } else {
      setSuccess("Paramètres mis à jour avec succès.");
    }

    setSaving(false);
  };

  if (loading) {
    return (
      <main className="container" style={{ paddingTop: 24, paddingBottom: 24 }}>
        <div className="card">
          <h2>Paramètres du commerçant</h2>
          <p className="helper">Chargement des paramètres…</p>
        </div>
      </main>
    );
  }

  if (error && !profile) {
    return (
      <main className="container" style={{ paddingTop: 24, paddingBottom: 24 }}>
        <div className="card">
          <h2>Paramètres du commerçant</h2>
          <p className="error">Erreur : {error}</p>
        </div>
      </main>
    );
  }

  return (
    <main className="container" style={{ paddingTop: 24, paddingBottom: 24 }}>
      <div className="card">
        <h2>Paramètres du commerçant</h2>

        <p className="helper" style={{ marginTop: 4 }}>
          Vous pouvez personnaliser votre fiche commerçant telle qu’elle sera
          affichée aux utilisateurs dans l&apos;onglet &laquo; Commerces partenaires &raquo;,
          et choisir à partir de quel montant un ticket de caisse est demandé.
        </p>

        {error && (
          <p className="error" style={{ marginTop: 8 }}>
            {error}
          </p>
        )}
        {success && (
          <p
            style={{
              marginTop: 8,
              color: "#16a34a",
              fontSize: 14,
              fontWeight: 500,
            }}
          >
            {success}
          </p>
        )}

        <form onSubmit={handleSave} style={{ marginTop: 16 }}>
          {/* DESCRIPTION */}
          <div style={{ marginBottom: 16 }}>
            <label
              htmlFor="merchant-description"
              style={{ display: "block", marginBottom: 6, fontSize: 14 }}
            >
              Description du commerce
            </label>
            <textarea
              id="merchant-description"
              value={merchantDescription}
              onChange={(e) => setMerchantDescription(e.target.value)}
              rows={4}
              placeholder="Ex : Boulangerie artisanale familiale, pains au levain, pâtisseries maison, petit déjeuner sur place..."
              style={{
                width: "100%",
                padding: "8px 10px",
                borderRadius: 8,
                border: "1px solid #D1D5DB",
                fontSize: 14,
                resize: "vertical",
              }}
            />
            <p className="helper" style={{ marginTop: 4, fontSize: 12 }}>
              Ce texte sera visible par les utilisateurs sur votre fiche
              commerçant.
            </p>
          </div>

          {/* SERVICES */}
          <div style={{ marginBottom: 16 }}>
            <label
              htmlFor="merchant-services"
              style={{ display: "block", marginBottom: 6, fontSize: 14 }}
            >
              Services proposés (optionnel)
            </label>
            <textarea
              id="merchant-services"
              value={merchantServices}
              onChange={(e) => setMerchantServices(e.target.value)}
              rows={3}
              placeholder="Ex : Salon de thé, vente à emporter, options végétariennes, chiens acceptés..."
              style={{
                width: "100%",
                padding: "8px 10px",
                borderRadius: 8,
                border: "1px solid #D1D5DB",
                fontSize: 14,
                resize: "vertical",
              }}
            />
          </div>

          {/* HORAIRES D'OUVERTURE */}
          <div style={{ marginBottom: 16 }}>
            <label
              htmlFor="opening-hours"
              style={{ display: "block", marginBottom: 6, fontSize: 14 }}
            >
              Horaires d&apos;ouverture
            </label>
            <textarea
              id="opening-hours"
              value={openingHours}
              onChange={(e) => setOpeningHours(e.target.value)}
              rows={3}
              placeholder={`Ex :\nLun–Ven : 7h30 – 19h30\nSam : 8h – 13h\nDimanche : fermé`}
              style={{
                width: "100%",
                padding: "8px 10px",
                borderRadius: 8,
                border: "1px solid #D1D5DB",
                fontSize: 14,
                resize: "vertical",
                whiteSpace: "pre-wrap",
              }}
            />
            <p className="helper" style={{ marginTop: 4, fontSize: 12 }}>
              Ces horaires seront affichés aux utilisateurs sur votre fiche
              commerçant.
            </p>
          </div>

          {/* LIEN GOOGLE MAPS */}
          <div style={{ marginBottom: 16 }}>
            <label
              htmlFor="google-maps-url"
              style={{ display: "block", marginBottom: 6, fontSize: 14 }}
            >
              Lien Google Maps / fiche Google (optionnel)
            </label>
            <input
              id="google-maps-url"
              type="url"
              value={googleMapsUrl}
              onChange={(e) => setGoogleMapsUrl(e.target.value)}
              placeholder="Ex : https://maps.app.goo.gl/XXXXX"
              style={{
                width: "100%",
                padding: "8px 10px",
                borderRadius: 8,
                border: "1px solid #D1D5DB",
                fontSize: 14,
              }}
            />
            <p className="helper" style={{ marginTop: 4, fontSize: 12 }}>
              Si vous renseignez ce lien, le bouton &laquo; Voir sur Google Maps &raquo;
              enverra directement vers votre fiche Google (et non vers l’adresse
              saisie).
            </p>
          </div>

          {/* SEUIL TICKET */}
          <div style={{ marginBottom: 16 }}>
            <label
              htmlFor="receipt-threshold"
              style={{ display: "block", marginBottom: 8, fontSize: 14 }}
            >
              Montant minimum (en €) pour demander un ticket de caisse
            </label>
            <input
              id="receipt-threshold"
              type="number"
              step="0.01"
              min={0}
              max={10000}
              value={threshold}
              onChange={(e) => setThreshold(parseFloat(e.target.value || "0"))}
              style={{
                padding: "8px 10px",
                borderRadius: 8,
                border: "1px solid #D1D5DB",
                fontSize: 14,
                width: "160px",
              }}
            />
            <p className="helper" style={{ marginTop: 4, fontSize: 12 }}>
              Au-dessus de ce montant, le client devra envoyer son ticket
              et la transaction devra être validée manuellement.
            </p>
          </div>

          <div style={{ marginTop: 16 }}>
            <button
              type="submit"
              disabled={saving}
              style={{
                padding: "8px 14px",
                borderRadius: 999,
                border: "none",
                backgroundColor: "#111827",
                color: "#F9FAFB",
                fontSize: 14,
                fontWeight: 600,
                cursor: "pointer",
                opacity: saving ? 0.7 : 1,
              }}
            >
              {saving ? "Enregistrement…" : "Enregistrer"}
            </button>
          </div>
        </form>
      </div>
    </main>
  );
}
