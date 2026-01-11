"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabaseClient";

export const dynamic = "force-dynamic";

interface Profile {
  role: string | null;
  merchant_id: string | null;
  merchant_code: string | null;
}

interface MerchantInfo {
  id: string;
  name: string | null;
  city: string | null;
  address: string | null;
  qr_token: string | null;
  cashback_rate: number | null;
}

interface ExistingApplication {
  id: string;
  status: string | null;
  created_at: string;
}

type ViewMode = "merchant" | "applicationStatus" | "form";

export default function MerchantPage() {
  const supabase = createClient();
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const [profile, setProfile] = useState<Profile | null>(null);
  const [merchant, setMerchant] = useState<MerchantInfo | null>(null);
  const [existingApp, setExistingApp] = useState<ExistingApplication | null>(
    null
  );

  const [businessName, setBusinessName] = useState("");
  const [city, setCity] = useState("");
  const [address, setAddress] = useState("");
  const [phone, setPhone] = useState("");
  const [message, setMessage] = useState("");

  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // ------------------------
  // CHARGEMENT INITIAL
  // ------------------------
  useEffect(() => {
    const load = async () => {
      setLoading(true);
      setError(null);

      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError || !user) {
        router.replace("/login");
        return;
      }

      // 1) Charger le profil
      const { data: profileData, error: profileError } = await supabase
        .from("profiles")
        .select("role, merchant_id, merchant_code")
        .eq("id", user.id)
        .maybeSingle();

      if (profileError) {
        console.error(profileError);
        setError("Erreur lors du chargement de votre profil.");
        setLoading(false);
        return;
      }

      const currentProfile: Profile = {
        role: profileData?.role ?? null,
        merchant_id: profileData?.merchant_id ?? null,
        merchant_code: profileData?.merchant_code ?? null,
      };

      setProfile(currentProfile);

      // 2) Si déjà commerçant → on charge le commerce
      if (
        currentProfile.role?.toLowerCase() === "merchant" &&
        currentProfile.merchant_id
      ) {
        const { data: merchantData, error: merchantError } = await supabase
          .from("merchants")
          .select(
            "id, name, city, address, qr_token, cashback_rate"
          )
          .eq("id", currentProfile.merchant_id)
          .maybeSingle();

        if (merchantError) {
          console.error(merchantError);
          setError("Erreur lors du chargement des informations commerçant.");
          setLoading(false);
          return;
        }

        if (merchantData) {
          setMerchant(merchantData as MerchantInfo);
          setLoading(false);
          return; // on reste en "merchant view"
        }
      }

      // 3) Sinon, vérifier s'il existe déjà une demande
      const { data: appData, error: appError } = await supabase
        .from("merchant_applications")
        .select("id,status,created_at")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (appError && appError.code !== "PGRST116") {
        console.error(appError);
      }

      if (appData) {
        setExistingApp({
          id: appData.id,
          status: appData.status ?? null,
          created_at: appData.created_at,
        });
      }

      setLoading(false);
    };

    void load();
  }, [router, supabase]);

  // ------------------------
  // SOUMISSION DEMANDE
  // ------------------------
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    if (!businessName.trim() || !city.trim()) {
      setError("Nom du commerce et ville sont obligatoires.");
      return;
    }

    setSubmitting(true);

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      setError("Vous devez être connecté pour faire une demande.");
      setSubmitting(false);
      return;
    }

    const { error: insertError } = await supabase
      .from("merchant_applications")
      .insert({
        user_id: user.id,
        business_name: businessName.trim(),
        city: city.trim(),
        address: address.trim() || null,
        phone: phone.trim() || null,
        message: message.trim() || null,
        status: "pending",
      });

    if (insertError) {
      console.error(insertError);
      setError("Erreur lors de l'envoi de la demande commerçant.");
      setSubmitting(false);
      return;
    }

    setSuccess(
      "Votre demande a été envoyée. Elle est maintenant en attente de validation par l'équipe PawPass."
    );
    setExistingApp({
      id: "new",
      status: "pending",
      created_at: new Date().toISOString(),
    });
    setSubmitting(false);
  };

  // ------------------------
  // DÉTERMINER LA VUE
  // ------------------------
  let view: ViewMode = "form";

  if (
    profile?.role?.toLowerCase() === "merchant" &&
    merchant
  ) {
    view = "merchant";
  } else if (existingApp) {
    view = "applicationStatus";
  }

  // ------------------------
  // RENDUS
  // ------------------------

  if (loading) {
    return (
      <div className="container">
        <div
          className="card"
          style={{ maxWidth: 520, margin: "40px auto" }}
        >
          <p className="helper">Chargement…</p>
        </div>
      </div>
    );
  }

  // --- VUE COMMERÇANT DÉJÀ VALIDÉ ---
  if (view === "merchant" && merchant) {
    const code = merchant.qr_token || profile?.merchant_code || "—";
    const scanUrl =
      code && code !== "—"
        ? `https://pawpass.fr/scan?m=${encodeURIComponent(code)}`
        : null;
    const qrImageUrl = scanUrl
      ? `https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=${encodeURIComponent(
          scanUrl
        )}`
      : null;

    return (
      <div className="container">
        <div
          className="card"
          style={{ maxWidth: 620, margin: "40px auto" }}
        >
          <h1 style={{ fontSize: 24, marginBottom: 8 }}>
            Espace commerçant
          </h1>
          <p className="helper" style={{ marginBottom: 16 }}>
            Vous êtes déjà commerçant partenaire PawPass. Utilisez ce code
            pour vos affiches et pour permettre à vos clients de scanner
            votre QR code en boutique.
          </p>

          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: 16,
            }}
          >
            <div>
              <h2 style={{ fontSize: 18, marginBottom: 4 }}>
                {merchant.name || "Commerce sans nom"}
              </h2>
              <p className="helper">
                {merchant.city || "Ville inconnue"}
                {merchant.address ? ` · ${merchant.address}` : ""}
              </p>
            </div>

            <div
              style={{
                display: "flex",
                flexWrap: "wrap",
                gap: 24,
                alignItems: "center",
              }}
            >
              {qrImageUrl && (
                <div>
                  <img
                    src={qrImageUrl}
                    alt="QR code PawPass"
                    style={{
                      width: 220,
                      height: 220,
                      borderRadius: 16,
                      backgroundColor: "#fff",
                      padding: 8,
                      boxShadow: "0 4px 10px rgba(0,0,0,0.08)",
                    }}
                  />
                </div>
              )}

              <div style={{ flex: 1, minWidth: 220 }}>
                <p style={{ marginBottom: 8 }}>
                  <strong>Code commerçant :</strong>
                </p>
                <p
                  style={{
                    fontFamily: "monospace",
                    padding: "8px 12px",
                    borderRadius: 999,
                    backgroundColor: "#f3f4f6",
                    display: "inline-block",
                    marginBottom: 12,
                  }}
                >
                  {code}
                </p>

                {scanUrl && (
                  <>
                    <p style={{ marginBottom: 8 }}>
                      <strong>URL à encoder dans le QR :</strong>
                    </p>
                    <p
                      style={{
                        fontFamily: "monospace",
                        padding: "8px 12px",
                        borderRadius: 12,
                        backgroundColor: "#f3f4f6",
                        wordBreak: "break-all",
                      }}
                    >
                      {scanUrl}
                    </p>
                  </>
                )}

                {typeof merchant.cashback_rate === "number" && (
                  <p className="helper" style={{ marginTop: 12 }}>
                    Taux de cashback actuel :{" "}
                    <strong>{merchant.cashback_rate}%</strong>
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // --- VUE STATUT DE DEMANDE ---
  if (view === "applicationStatus" && existingApp) {
    return (
      <div className="container">
        <div
          className="card"
          style={{ maxWidth: 520, margin: "40px auto" }}
        >
          <h1 style={{ fontSize: 24, marginBottom: 12 }}>
            Devenir commerçant partenaire
          </h1>
          <p className="helper">
            Votre demande a été enregistrée le{" "}
            {new Date(existingApp.created_at).toLocaleString("fr-FR")}.
          </p>

          <p style={{ marginTop: 16 }}>
            Statut de votre demande :{" "}
            <strong>
              {existingApp.status === "approved"
                ? "Approuvée"
                : existingApp.status === "rejected"
                ? "Refusée"
                : "En attente de validation"}
            </strong>
          </p>

          <p className="helper" style={{ marginTop: 12 }}>
            Vous serez informé dès qu&apos;un administrateur aura traité votre
            demande. En attendant, vous pouvez continuer à utiliser PawPass en
            tant que client.
          </p>
        </div>
      </div>
    );
  }

  // --- FORMULAIRE DE DEMANDE ---
  return (
    <div className="container">
      <div
        className="card"
        style={{ maxWidth: 520, margin: "40px auto" }}
      >
        <h1 style={{ fontSize: 24, marginBottom: 8 }}>
          Devenir commerçant partenaire
        </h1>
        <p className="helper" style={{ marginBottom: 16 }}>
          Remplissez ce formulaire pour demander la création d&apos;un compte
          commerçant PawPass. Un administrateur validera votre demande et vous
          recevrez un QR code à afficher dans votre boutique.
        </p>

        {error && (
          <p className="error" style={{ marginBottom: 12 }}>
            {error}
          </p>
        )}
        {success && (
          <p className="success" style={{ marginBottom: 12 }}>
            {success}
          </p>
        )}

        <form onSubmit={handleSubmit}>
          <label className="label" htmlFor="businessName">
            Nom du commerce
            <input
              id="businessName"
              name="business_name"
              className="input"
              value={businessName}
              onChange={(e) => setBusinessName(e.target.value)}
              placeholder="Ex : Boulangerie du Marché"
              required
            />
          </label>

          <label className="label" htmlFor="city">
            Ville
            <input
              id="city"
              name="city"
              className="input"
              value={city}
              onChange={(e) => setCity(e.target.value)}
              placeholder="Ex : Bayonne"
              required
            />
          </label>

          <label className="label" htmlFor="address">
            Adresse (optionnel)
            <input
              id="address"
              name="address"
              className="input"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder="Ex : 12 rue des Commerces"
            />
          </label>

          <label className="label" htmlFor="phone">
            Téléphone (optionnel)
            <input
              id="phone"
              name="phone"
              className="input"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="Ex : 06 12 34 56 78"
            />
          </label>

          <label className="label" htmlFor="message">
            Message (optionnel)
            <textarea
              id="message"
              name="message"
              className="input"
              style={{ minHeight: 90, resize: "vertical" }}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Ex : Horaires, précisions sur votre activité…"
            />
          </label>

          <button
            className="button"
            type="submit"
            disabled={submitting}
            style={{ marginTop: 16, width: "100%" }}
          >
            {submitting ? "Envoi de la demande…" : "Envoyer ma demande"}
          </button>
        </form>
      </div>
    </div>
  );
}
