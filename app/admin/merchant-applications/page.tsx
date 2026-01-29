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

      // 1) session
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

      // 2) rôle admin
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

      // 3) demandes pending
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
      // A) Recharger la demande (idempotence)
      const { data: freshApp, error: freshErr } = await supabase
        .from("merchant_applications")
        .select(
          "id,status,merchant_id,category_slugs,user_id,business_name,city,address"
        )
        .eq("id", application.id)
        .maybeSingle();

      if (freshErr) throw new Error(freshErr.message);
      if (!freshApp) throw new Error("Demande introuvable.");

      const status = String(freshApp.status || "").toLowerCase();
      if (status !== "pending") {
        // déjà traité : on retire de la liste côté UI
        setApplications((prev) => prev.filter((x) => x.id !== application.id));
        return;
      }

      const userId = freshApp.user_id as string;

      // B) Vérifier le profil : si déjà relié, ne recrée rien
      const { data: existingProfile, error: existingProfileError } =
        await supabase
          .from("profiles")
          .select("role, merchant_id, merchant_code")
          .eq("id", userId)
          .maybeSingle();

      if (existingProfileError) throw new Error(existingProfileError.message);

      if (existingProfile?.merchant_id) {
        // Marquer la demande approved + relier merchant_id
        const { error: applicationUpdateError } = await supabase
          .from("merchant_applications")
          .update({
            status: "approved",
            reviewed_at: new Date().toISOString(),
            merchant_id: existingProfile.merchant_id,
          })
          .eq("id", freshApp.id)
          .eq("status", "pending");

        if (applicationUpdateError) throw new Error(applicationUpdateError.message);

        setApplications((prev) => prev.filter((x) => x.id !== application.id));
        return;
      }

      // C) Créer/Upsert le merchant (nécessite index unique sur merchants.user_id)
      const qrToken = buildMerchantToken(userId);

      const { data: merchant, error: merchantError } = await supabase
        .from("merchants")
        .upsert(
          {
            user_id: userId,
            name: freshApp.business_name,
            city: freshApp.city,
            address: freshApp.address,
            qr_token: qrToken,
            is_active: true,
          },
          { onConflict: "user_id" }
        )
        .select("id, qr_token")
        .single();

      if (merchantError || !merchant) {
        throw new Error(
          merchantError?.message ??
            "Impossible de créer le commerçant à partir de cette demande."
        );
      }

      const merchantId = merchant.id as string;
      const finalQrToken = (merchant.qr_token as string) || qrToken;

      // D) Associer les catégories choisies à l'inscription
      const slugs = (freshApp.category_slugs ?? []) as string[];

      if (Array.isArray(slugs) && slugs.length > 0) {
        const { data: cats, error: catsErr } = await supabase
          .from("categories")
          .select("id, slug")
          .in("slug", slugs);

        if (catsErr) throw new Error(catsErr.message);

        if (cats && cats.length > 0) {
          const links = cats.map((cat) => ({
            merchant_id: merchantId,
            category_id: cat.id,
          }));

          // nécessite unique index (merchant_id, category_id)
          const { error: linkErr } = await supabase
            .from("merchant_category_links")
            .upsert(links, { onConflict: "merchant_id,category_id" });

          if (linkErr) throw new Error(linkErr.message);
        }
      }

      // E) Update profile -> rôle merchant
      const { error: profileUpdateError } = await supabase
        .from("profiles")
        .update({
          role: "merchant",
          merchant_id: merchantId,
          merchant_code: finalQrToken,
        })
        .eq("id", userId);

      if (profileUpdateError) throw new Error(profileUpdateError.message);

      // F) Marquer la demande approved (idempotent)
      const { error: applicationUpdateError } = await supabase
        .from("merchant_applications")
        .update({
          status: "approved",
          reviewed_at: new Date().toISOString(),
          merchant_id: merchantId,
        })
        .eq("id", freshApp.id)
        .eq("status", "pending");

      if (applicationUpdateError) throw new Error(applicationUpdateError.message);

      setApplications((prev) => prev.filter((x) => x.id !== application.id));
    } catch (e: any) {
      setError(e?.message ?? "Erreur inconnue.");
    } finally {
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
