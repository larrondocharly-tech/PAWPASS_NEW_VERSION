"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabaseClient";

export const dynamic = "force-dynamic";

interface MerchantApplication {
  id: string;
  user_id: string;
  business_name: string;
  city: string;
  address: string | null;
  postal_code: string | null;
  phone: string | null;
  responsible_name: string | null;
  siret: string | null;
  message: string | null;
  created_at: string;
}

const buildMerchantToken = (userId: string) => {
  const prefix = userId.replace(/-/g, "").slice(0, 8);
  const random = Math.random().toString(36).slice(2, 8);
  return `PP_${prefix}_${random}`.toUpperCase();
};

export default function AdminMerchantApplicationsPage() {
  const supabase = createClient();
  const router = useRouter();

  const [applications, setApplications] = useState<MerchantApplication[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [actionId, setActionId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadApplications = async () => {
      setIsLoading(true);
      setError(null);

      // 1) Vérifier la session
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        router.replace("/login");
        return;
      }

      // 2) Vérifier le rôle admin
      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", user.id)
        .maybeSingle();

      if (profileError) {
        setError(profileError.message);
        setIsLoading(false);
        return;
      }

      if (!profile || profile.role?.toLowerCase() !== "admin") {
        router.replace("/dashboard");
        return;
      }

      // 3) Charger les demandes en attente
      const { data, error: fetchError } = await supabase
        .from("merchant_applications")
        .select(
          "id,user_id,business_name,city,address,postal_code,phone,responsible_name,siret,message,created_at"
        )
        .eq("status", "pending")
        .order("created_at", { ascending: true });

      if (fetchError) {
        setError(fetchError.message);
        setIsLoading(false);
        return;
      }

      setApplications(data ?? []);
      setIsLoading(false);
    };

    void loadApplications();
  }, [router, supabase]);

  const handleApprove = async (application: MerchantApplication) => {
    setError(null);
    setActionId(application.id);

    // 1) Vérifier si un commerçant existe déjà avec même nom + ville
    const {
      data: existingMerchant,
      error: existingError,
    } = await supabase
      .from("merchants")
      .select("id, qr_token")
      .eq("name", application.business_name)
      .eq("city", application.city)
      .maybeSingle();

    if (existingError) {
      setError(existingError.message);
      setActionId(null);
      return;
    }

    let merchantId: string;
    let qrToken: string;

    if (existingMerchant) {
      // On réutilise le commerçant existant (évite les doublons)
      merchantId = existingMerchant.id;
      qrToken = existingMerchant.qr_token;
    } else {
      // 2) Création du commerçant
      qrToken = buildMerchantToken(application.user_id);
      const { data: merchant, error: merchantError } = await supabase
        .from("merchants")
        .insert({
          name: application.business_name,
          city: application.city,
          address: application.address,
          qr_token: qrToken,
          is_active: true,
        })
        .select("id")
        .single();

      if (merchantError || !merchant) {
        setError(
          merchantError?.message ?? "Impossible de créer le commerçant."
        );
        setActionId(null);
        return;
      }

      merchantId = merchant.id;
    }

    // 3) Mise à jour du profil utilisateur -> rôle merchant
    const { error: profileUpdateError } = await supabase
      .from("profiles")
      .update({
        role: "merchant",
        merchant_id: merchantId,
        merchant_code: qrToken,
      })
      .eq("id", application.user_id);

    if (profileUpdateError) {
      setError(profileUpdateError.message);
      setActionId(null);
      return;
    }

    // 4) Marquer la demande comme approuvée
    const { error: applicationUpdateError } = await supabase
      .from("merchant_applications")
      .update({
        status: "approved",
        reviewed_at: new Date().toISOString(),
      })
      .eq("id", application.id);

    if (applicationUpdateError) {
      setError(applicationUpdateError.message);
      setActionId(null);
      return;
    }

    // 5) Retirer la demande de la liste
    setApplications((prev) =>
      prev.filter((item) => item.id !== application.id)
    );
    setActionId(null);
  };

  const handleReject = async (application: MerchantApplication) => {
    setError(null);
    setActionId(application.id);

    const { error: updateError } = await supabase
      .from("merchant_applications")
      .update({
        status: "rejected",
        reviewed_at: new Date().toISOString(),
      })
      .eq("id", application.id);

    if (updateError) {
      setError(updateError.message);
      setActionId(null);
      return;
    }

    setApplications((prev) =>
      prev.filter((item) => item.id !== application.id)
    );
    setActionId(null);
  };

  return (
    <div className="container">
      <div className="card" style={{ marginBottom: 24 }}>
        <h2>Demandes commerçants</h2>
        <p className="helper">Consultez et traitez les demandes en attente.</p>
      </div>

      {isLoading ? (
        <div className="card">
          <p className="helper">Chargement...</p>
        </div>
      ) : error ? (
        <div className="card">
          <p className="error">{error}</p>
        </div>
      ) : applications.length === 0 ? (
        <div className="card">
          <p className="helper">Aucune demande en attente.</p>
        </div>
      ) : (
        <div style={{ display: "grid", gap: 16 }}>
          {applications.map((application) => (
            <div key={application.id} className="card" style={{ padding: 16 }}>
              <h3 style={{ marginTop: 0 }}>{application.business_name}</h3>

              {application.responsible_name && (
                <p className="helper" style={{ marginTop: 4 }}>
                  Responsable : {application.responsible_name}
                </p>
              )}

              <p className="helper" style={{ marginTop: 4 }}>
                {application.postal_code} {application.city}
              </p>

              {application.address && (
                <p
                  className="helper"
                  style={{ marginTop: 4, fontSize: "0.9rem" }}
                >
                  {application.address}
                </p>
              )}

              {application.phone && (
                <p className="helper" style={{ marginTop: 4 }}>
                  Téléphone : {application.phone}
                </p>
              )}

              {application.siret && (
                <p className="helper" style={{ marginTop: 4 }}>
                  SIRET : {application.siret}
                </p>
              )}

              {application.message && (
                <p style={{ marginTop: 8 }}>{application.message}</p>
              )}

              <p className="helper" style={{ marginTop: 8 }}>
                Demande créée le{" "}
                {new Date(application.created_at).toLocaleString("fr-FR")}
              </p>

              <div
                style={{
                  display: "flex",
                  gap: 12,
                  flexWrap: "wrap",
                  marginTop: 12,
                }}
              >
                <button
                  className="button"
                  type="button"
                  onClick={() => void handleApprove(application)}
                  disabled={actionId === application.id}
                >
                  {actionId === application.id ? "Validation..." : "Accepter"}
                </button>
                <button
                  className="button secondary"
                  type="button"
                  onClick={() => void handleReject(application)}
                  disabled={actionId === application.id}
                >
                  {actionId === application.id ? "Mise à jour..." : "Refuser"}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
