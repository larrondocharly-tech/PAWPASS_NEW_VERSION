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
  const [threshold, setThreshold] = useState<number>(50);
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

      // Charger le seuil actuel dans la table merchants
      const { data: merchant, error: merchantError } = await supabase
        .from("merchants")
        .select("receipt_threshold")
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
      setError(
        `Le montant doit être compris entre ${min} € et ${max} €.`
      );
      setSaving(false);
      return;
    }

    const { error: updateError } = await supabase
      .from("merchants")
      .update({ receipt_threshold: threshold })
      .eq("id", profile.merchant_id);

    if (updateError) {
      console.error("Erreur mise à jour seuil commerçant :", updateError);
      setError("Impossible d'enregistrer ce montant pour le moment.");
    } else {
      setSuccess("Montant mis à jour avec succès.");
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
          Vous pouvez choisir à partir de quel montant un client doit fournir un ticket de caisse
          pour que la transaction soit à valider manuellement.
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
