"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabaseClient";

export const dynamic = "force-dynamic";

interface ExistingApplication {
  id: string;
  status: string | null;
  created_at: string;
}

export default function MerchantRegistrationPage() {
  const supabase = createClient();
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [existingApp, setExistingApp] = useState<ExistingApplication | null>(
    null
  );

  const [businessName, setBusinessName] = useState("");
  const [city, setCity] = useState("");
  const [address, setAddress] = useState("");
  const [phone, setPhone] = useState("");
  const [message, setMessage] = useState("");

  // Charger éventuelle demande déjà existante
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

  if (loading) {
    return (
      <div className="container">
        <div
          className="card"
          style={{
            maxWidth: 520,
            margin: "40px auto",
          }}
        >
          <p className="helper">Chargement…</p>
        </div>
      </div>
    );
  }

  // Si une demande existe déjà : on affiche juste le statut
  if (existingApp) {
    return (
      <div className="container">
        <div
          className="card"
          style={{
            maxWidth: 520,
            margin: "40px auto",
          }}
        >
          <h1 style={{ fontSize: 24, marginBottom: 8 }}>
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

  // Formulaire principal
  return (
    <div className="container">
      <div
        className="card"
        style={{
          maxWidth: 520,
          margin: "40px auto",
        }}
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
          <p
            className="error"
            style={{ marginBottom: 12 }}
          >
            {error}
          </p>
        )}
        {success && (
          <p
            className="success"
            style={{ marginBottom: 12 }}
          >
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
