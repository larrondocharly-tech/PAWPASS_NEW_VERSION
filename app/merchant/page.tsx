"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabaseClient";

export const dynamic = "force-dynamic";

export default function MerchantRegistrationPage() {
  const router = useRouter();
  const supabase = createClient();

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: any) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const form = new FormData(e.target);
    const business_name = form.get("business_name")?.toString() || "";
    const city = form.get("city")?.toString() || "";
    const address = form.get("address")?.toString() || null;
    const phone = form.get("phone")?.toString() || null;
    const message = form.get("message")?.toString() || null;

    // Vérifier session
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      setError("Vous devez être connecté.");
      setLoading(false);
      return;
    }

    // INSERT DEMANDE DANS merchant_applications
    const { error: insertError } = await supabase
      .from("merchant_applications")
      .insert({
        user_id: user.id,
        business_name,
        city,
        address,
        phone,
        message,
        status: "pending",
      });

    if (insertError) {
      console.error(insertError);
      setError(
        "Erreur lors de l’envoi de la demande : " + insertError.message
      );
      setLoading(false);
      return;
    }

    setLoading(false);
    router.replace("/dashboard?merchant_request=sent");
  };

  return (
    <div className="container">
      <h1>Devenir commerçant partenaire</h1>

      {error && <p style={{ color: "red" }}>{error}</p>}

      <form onSubmit={handleSubmit}>
        <label>
          Nom du commerce
          <input name="business_name" required />
        </label>

        <label>
          Ville
          <input name="city" required />
        </label>

        <label>
          Adresse (optionnel)
          <input name="address" />
        </label>

        <label>
          Téléphone (optionnel)
          <input name="phone" />
        </label>

        <label>
          Message (optionnel)
          <textarea name="message" />
        </label>

        <button type="submit" disabled={loading}>
          {loading ? "Envoi..." : "Envoyer ma demande"}
        </button>
      </form>
    </div>
  );
}
