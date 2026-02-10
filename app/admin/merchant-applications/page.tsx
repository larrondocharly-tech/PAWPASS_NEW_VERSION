"use client";

import { useEffect, useMemo, useState } from "react";
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

  // colonnes optionnelles (selon ton schéma)
  merchant_id?: string | null;
  category_slugs?: string[] | null;
  status?: string | null;
}

const buildMerchantToken = (userId: string) => {
  const prefix = userId.replace(/-/g, "").slice(0, 8);
  const random = Math.random().toString(36).slice(2, 8);
  return `PP_${prefix}_${random}`.toUpperCase();
};

export default function AdminMerchantApplicationsPage() {
  const supabase = useMemo(() => createClient(), []);
  const router = useRouter();

  const [applications, setApplications] = useState<MerchantApplication[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [actionId, setActionId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    const loadApplications = async () => {
      setIsLoading(true);
      setError(null);

      const {
        data: { user },
        error: userErr,
      } = await supabase.auth.getUser();

      if (userErr) {
        if (!cancelled) {
          setError(userErr.message);
          setIsLoading(false);
        }
        return;
      }

      if (!user) {
        router.replace("/login");
        return;
      }

      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", user.id)
        .maybeSingle();

      if (profileError) {
        if (!cancelled) {
          setError(profileError.message);
          setIsLoading(false);
        }
        return;
      }

      if (!profile || String(profile.role || "").toLowerCase() !== "admin") {
        router.replace("/dashboard");
        return;
      }

      const { data, error: fetchError } = await supabase
        .from("merchant_applications")
        .select(
          "id,user_id,business_name,city,address,postal_code,phone,responsible_name,siret,message,created_at,merchant_id,category_slugs,status"
        )
        .eq("status", "pending")
        .order("created_at", { ascending: true });

      if (fetchError) {
        if (!cancelled) {
          setError(fetchError.message);
          setIsLoading(false);
        }
        return;
      }

      if (!cancelled) {
        setApplications((data ?? []) as MerchantApplication[]);
        setIsLoading(false);
      }
    };

    void loadApplications();

    return () => {
      cancelled = true;
    };
  }, [router, supabase]);

  const handleApprove = async (application: MerchantApplication) => {
    // anti double-clic
    if (actionId) return;

    setError(null);
    setActionId(application.id);

    try {
      // 0) Lire le profil du demandeur
      const { data: existingProfile, error: existingProfileError } =
        await supabase
          .from("profiles")
          .select("role, merchant_id, merchant_code")
          .eq("id", application.user_id)
          .maybeSingle();

      if (existingProfileError) throw new Error(existingProfileError.message);

      // Si le profil est déjà relié à un merchant -> on valide juste la demande
      if (existingProfile?.merchant_id) {
        const { error: applicationUpdateError } = await supabase
          .from("merchant_applications")
          .update({
            status: "approved",
            reviewed_at: new Date().toISOString(),
          })
          .eq("id", application.id);

        if (applicationUpdateError) throw new Error(applicationUpdateError.message);

        setApplications((prev) => prev.filter((item) => item.id !== application.id));
        setActionId(null);
        return;
      }

      // 1) Trouver le merchant EXISTANT par user_id (c’est ça qui empêche les doublons)
      const { data: existingMerchant, error: existingMerchantError } =
        await supabase
          .from("merchants")
          .select("id, qr_token, is_active")
          .eq("user_id", application.user_id)
          .maybeSingle();

      if (existingMerchantError) throw new Error(existingMerchantError.message);

      let merchantId: string | null = existingMerchant?.id ?? null;
      let finalQrToken: string | null = existingMerchant?.qr_token ?? null;

      // 2) Si le merchant existe => UPDATE (activation + compléter champs si besoin)
      if (merchantId) {
        const { error: updateMerchantError } = await supabase
          .from("merchants")
          .update({
            // on active seulement
            is_active: true,
            // optionnel: mettre à jour les infos depuis la demande si tu veux
            name: application.business_name,
            city: application.city,
            address: application.address,
          })
          .eq("id", merchantId);

        if (updateMerchantError) throw new Error(updateMerchantError.message);

        // si pas de qr_token (rare), on en génère 1 et on le pose
        if (!finalQrToken) {
          const generated = buildMerchantToken(application.user_id);
          const { data: updated, error: qrUpdateError } = await supabase
            .from("merchants")
            .update({ qr_token: generated })
            .eq("id", merchantId)
            .select("qr_token")
            .single();

          if (qrUpdateError) throw new Error(qrUpdateError.message);
          finalQrToken = updated?.qr_token ?? generated;
        }
      } else {
        // 3) Si le merchant N’EXISTE PAS (cas rare) => création UNIQUE par user_id
        const qrToken = buildMerchantToken(application.user_id);

        const { data: created, error: createMerchantError } = await supabase
          .from("merchants")
          .insert({
            user_id: application.user_id, // <-- IMPORTANT: lien unique
            name: application.business_name,
            city: application.city,
            address: application.address,
            qr_token: qrToken,
            is_active: true,
          })
          .select("id, qr_token")
          .single();

        if (createMerchantError || !created) {
          throw new Error(
            createMerchantError?.message ??
              "Impossible de créer le commerçant à partir de cette demande."
          );
        }

        merchantId = created.id;
        finalQrToken = created.qr_token ?? qrToken;
      }

      if (!merchantId || !finalQrToken) {
        throw new Error("MerchantId / QR token manquant après approbation.");
      }

      // 4) Mise à jour du profil utilisateur -> rôle merchant
      const { error: profileUpdateError } = await supabase
        .from("profiles")
        .update({
          role: "merchant",
          merchant_id: merchantId,
          merchant_code: finalQrToken,
        })
        .eq("id", application.user_id);

      if (profileUpdateError) throw new Error(profileUpdateError.message);

      // 5) Marquer la demande comme approuvée
      const { error: applicationUpdateError } = await supabase
        .from("merchant_applications")
        .update({
          status: "approved",
          reviewed_at: new Date().toISOString(),
        })
        .eq("id", application.id);

      if (applicationUpdateError) throw new Error(applicationUpdateError.message);

      // 6) Retirer la demande de la liste
      setApplications((prev) => prev.filter((item) => item.id !== application.id));
      setActionId(null);
    } catch (e: any) {
      setError(e?.message ?? "Erreur inconnue lors de l’approbation.");
      setActionId(null);
    }
  };

  const handleReject = async (application: MerchantApplication) => {
    if (actionId) return;

    setError(null);
    setActionId(application.id);

    try {
      const { error: updateError } = await supabase
        .from("merchant_applications")
        .update({
          status: "rejected",
          reviewed_at: new Date().toISOString(),
        })
        .eq("id", application.id)
        .eq("status", "pending");

      if (updateError) throw new Error(updateError.message);

      setApplications((prev) => prev.filter((x) => x.id !== application.id));
    } catch (e: any) {
      setError(e?.message ?? "Erreur inconnue.");
    } finally {
      setActionId(null);
    }

    setApplications((prev) => prev.filter((item) => item.id !== application.id));
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
                <p className="helper" style={{ marginTop: 4, fontSize: "0.9rem" }}>
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

              {application.message && <p style={{ marginTop: 8 }}>{application.message}</p>}

              <p className="helper" style={{ marginTop: 8 }}>
                Demande créée le {new Date(application.created_at).toLocaleString("fr-FR")}
              </p>

              <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginTop: 12 }}>
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
