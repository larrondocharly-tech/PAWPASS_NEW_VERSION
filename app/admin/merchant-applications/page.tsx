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

  merchant_id?: string | null;
  category_slugs?: string[] | null;
  status?: string | null;

  // ✅ nouveaux champs pour la reconnaissance bancaire
  bank_descriptor_hint?: string | null;
  bank_aliases?: string[] | null;
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
          "id,user_id,business_name,city,address,postal_code,phone,responsible_name,siret,message,created_at,merchant_id,category_slugs,status,bank_descriptor_hint,bank_aliases"
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
    if (actionId) return;

    setError(null);
    setActionId(application.id);

    try {
      const { data: existingProfile, error: existingProfileError } = await supabase
        .from("profiles")
        .select("role, merchant_id, merchant_code")
        .eq("id", application.user_id)
        .maybeSingle();

      if (existingProfileError) {
        throw new Error(existingProfileError.message);
      }

      if (existingProfile?.merchant_id) {
        const { error: applicationUpdateError } = await supabase
          .from("merchant_applications")
          .update({
            status: "approved",
            reviewed_at: new Date().toISOString(),
          })
          .eq("id", application.id);

        if (applicationUpdateError) {
          throw new Error(applicationUpdateError.message);
        }

        setApplications((prev) => prev.filter((item) => item.id !== application.id));
        setActionId(null);
        return;
      }

      const { data: existingMerchant, error: existingMerchantError } = await supabase
        .from("merchants")
        .select("id, qr_token, is_active")
        .eq("user_id", application.user_id)
        .maybeSingle();

      if (existingMerchantError) {
        throw new Error(existingMerchantError.message);
      }

      let merchantId: string | null = existingMerchant?.id ?? null;
      let finalQrToken: string | null = existingMerchant?.qr_token ?? null;

      if (merchantId) {
        const { error: updateMerchantError } = await supabase
          .from("merchants")
          .update({
            is_active: true,
            name: application.business_name,
            city: application.city,
            address: application.address,

            // ✅ nouveaux champs copiés depuis la demande
            bank_descriptor_hint: application.bank_descriptor_hint ?? null,
            bank_aliases: application.bank_aliases ?? [],
          })
          .eq("id", merchantId);

        if (updateMerchantError) {
          throw new Error(updateMerchantError.message);
        }

        if (!finalQrToken) {
          const generated = buildMerchantToken(application.user_id);

          const { data: updated, error: qrUpdateError } = await supabase
            .from("merchants")
            .update({ qr_token: generated })
            .eq("id", merchantId)
            .select("qr_token")
            .single();

          if (qrUpdateError) {
            throw new Error(qrUpdateError.message);
          }

          finalQrToken = updated?.qr_token ?? generated;
        }
      } else {
        const qrToken = buildMerchantToken(application.user_id);

        const { data: created, error: createMerchantError } = await supabase
          .from("merchants")
          .insert({
            user_id: application.user_id,
            name: application.business_name,
            city: application.city,
            address: application.address,
            qr_token: qrToken,
            is_active: true,

            // ✅ nouveaux champs copiés depuis la demande
            bank_descriptor_hint: application.bank_descriptor_hint ?? null,
            bank_aliases: application.bank_aliases ?? [],
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

      const { error: profileUpdateError } = await supabase
        .from("profiles")
        .update({
          role: "merchant",
          merchant_id: merchantId,
          merchant_code: finalQrToken,
        })
        .eq("id", application.user_id);

      if (profileUpdateError) {
        throw new Error(profileUpdateError.message);
      }

      const { error: applicationUpdateError } = await supabase
        .from("merchant_applications")
        .update({
          status: "approved",
          reviewed_at: new Date().toISOString(),
        })
        .eq("id", application.id);

      if (applicationUpdateError) {
        throw new Error(applicationUpdateError.message);
      }

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

      if (updateError) {
        throw new Error(updateError.message);
      }

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

              {application.bank_descriptor_hint && (
                <p className="helper" style={{ marginTop: 8 }}>
                  Libellé bancaire principal : {application.bank_descriptor_hint}
                </p>
              )}

              {application.bank_aliases && application.bank_aliases.length > 0 && (
                <p className="helper" style={{ marginTop: 4 }}>
                  Alias bancaires : {application.bank_aliases.join(", ")}
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