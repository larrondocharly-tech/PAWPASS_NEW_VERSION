"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabaseClient";

export const dynamic = "force-dynamic";

interface Profile {
  role: string | null;
}

interface ExistingApplication {
  id: string;
  status: string | null;
  created_at: string;
}

export default function MerchantPage() {
  const supabase = createClient();
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [existingApp, setExistingApp] = useState<ExistingApplication | null>(
    null
  );
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const [businessName, setBusinessName] = useState("");
  const [city, setCity] = useState("");
  const [address, setAddress] = useState("");
  const [phone, setPhone] = useState("");
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);

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

      const { data: profileData, error: profileError } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", user.id)
        .maybeSingle();

      if (profileError) {
        setError(profileError.message);
        setLoading(false);
        return;
      }

      setProfile({ role: profileData?.role ?? null });

      // Si déjà merchant → on peut rediriger vers un dashboard commerçant
      if (profileData?.role === "merchant") {
        router.replace("/dashboard");
        return;
      }

      // Vérifier s'il existe déjà une demande
      const { data: appData, error: appError } = await supabase
        .from("merchant_applications")
        .select("id,status,created_at")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (appError && appError.code !== "PGRST116") {
        // PGRST116 = no rows found
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
  }, [supabase, router]);

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

    // Insertion dans merchant_applications avec statut pending
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

    // Optionnel : marquer le profil comme "pending_merchant"
    const { error: profileUpdateError } = await supabase
      .from("profiles")
      .update({ role: "pending_merchant" })
      .eq("id", user.id);

    if (profileUpdateError) {
      console.error(profileUpdateError);
    }

    setSuccess("Votre demande a été envoyée. Elle est en attente de validation.");
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
        <div className="card">
          <p className="helper">Chargement...</p>
        </div>
      </div>
    );
  }

  // Si une demande existe déjà
  if (existingApp) {
    return (
      <div className="container">
        <div className="card">
          <h2>Demande commerçant</h2>
          <p className="helper">
            Votre demande a été enregistrée le{" "}
            {new Date(existingApp.created_at).toLocaleString("fr-FR")}.
          </p>
          <p style={{ marginTop: 8 }}>
            Statut :{" "}
            <strong>
              {existingApp.status === "approved"
                ? "Approuvée"
                : existingApp.status === "rejected"
                ? "Refusée"
                : "En attente"}
            </strong>
          </p>
          <p className="helper" style={{ marginTop: 12 }}>
            Vous serez informé dès qu&apos;un administrateur aura traité votre
            demande.
          </p>
        </div>
      </div>
    );
  }

  // Formulaire de demande
  return (
    <div className="container">
      <div className="card">
        <h2>Devenir commerçant partenaire</h2>
        <p className="helper">
          Remplissez ce formulaire pour demander la création d&apos;un compte
          commerçant. Un administrateur validera votre demande.
        </p>

        {error && <p className="error" style={{ marginTop: 12 }}>{error}</p>}
        {success && (
          <p className="success" style={{ marginTop: 12 }}>{success}</p>
        )}

        <form onSubmit={handleSubmit} style={{ marginTop: 16 }}>
          <label className="label" htmlFor="businessName">
            Nom du commerce
            <input
              id="businessName"
              className="input"
              value={businessName}
              onChange={(e) => setBusinessName(e.target.value)}
              required
            />
          </label>

          <label className="label" htmlFor="city">
            Ville
            <input
              id="city"
              className="input"
              value={city}
              onChange={(e) => setCity(e.target.value)}
              required
            />
          </label>

          <label className="label" htmlFor="address">
            Adresse (optionnel)
            <input
              id="address"
              className="input"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
            />
          </label>

          <label className="label" htmlFor="phone">
            Téléphone (optionnel)
            <input
              id="phone"
              className="input"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
            />
          </label>

          <label className="label" htmlFor="message">
            Message (optionnel)
            <textarea
              id="message"
              className="input"
              style={{ minHeight: 80, resize: "vertical" }}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
            />
          </label>

          <button
            className="button"
            type="submit"
            disabled={submitting}
            style={{ marginTop: 16 }}
          >
            {submitting ? "Envoi en cours..." : "Envoyer ma demande"}
          </button>
        </form>
      </div>
    </div>
  );
}
