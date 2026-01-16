"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabaseClient";

export const dynamic = "force-dynamic";

interface MerchantRow {
  id: string;
  name: string | null;
  city: string | null;
  address: string | null;
  qr_token: string | null;
  cashback_rate: number | null;
  is_active: boolean | null;
  created_at: string;
}

export default function AdminMerchantsPage() {
  const supabase = createClient();
  const router = useRouter();

  const [merchants, setMerchants] = useState<MerchantRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // =========================
  // CHARGEMENT + VÉRIF ADMIN
  // =========================
  useEffect(() => {
    const load = async () => {
      setLoading(true);
      setError(null);

      // 1) Vérifier l'utilisateur
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError || !user) {
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
        console.error(profileError);
        setError("Erreur lors du chargement du profil.");
        setLoading(false);
        return;
      }

      if (!profile || profile.role?.toLowerCase() !== "admin") {
        router.replace("/dashboard");
        return;
      }

      // 3) Charger la liste des commerçants
      const { data, error: merchantsError } = await supabase
        .from("merchants")
        .select(
          "id,name,city,address,qr_token,cashback_rate,is_active,created_at"
        )
        .order("created_at", { ascending: false });

      if (merchantsError) {
        console.error(merchantsError);
        setError("Erreur lors du chargement des commerçants.");
        setLoading(false);
        return;
      }

      // On ne garde en mémoire que les commerçants actifs
      const rows = (data ?? []) as MerchantRow[];
      const activeOnly = rows.filter((m) => m.is_active === true);

      setMerchants(activeOnly);
      setLoading(false);
    };

    void load();
  }, [router, supabase]);

  // =========================
  // MÀJ TAUX DE CASHBACK
  // =========================
  const handleUpdateCashback = async (id: string, newRateStr: string) => {
    const newRate = Number(newRateStr.replace(",", "."));
    if (isNaN(newRate) || newRate < 0) {
      setError("Taux de cashback invalide.");
      return;
    }

    setError(null);
    setSavingId(id);

    const { error: updateError } = await supabase
      .from("merchants")
      .update({ cashback_rate: newRate })
      .eq("id", id);

    if (updateError) {
      console.error(updateError);
      setError("Erreur lors de la mise à jour du cashback.");
      setSavingId(null);
      return;
    }

    setMerchants((prev) =>
      prev.map((m) => (m.id === id ? { ...m, cashback_rate: newRate } : m))
    );
    setSavingId(null);
  };

  // =========================
  // ACTIVER / DÉSACTIVER
  // =========================
  const handleToggleActive = async (
    id: string,
    currentActive: boolean | null
  ) => {
    const nextActive = !currentActive;

    setError(null);
    setSavingId(id);

    const { error: updateError } = await supabase
      .from("merchants")
      .update({ is_active: nextActive })
      .eq("id", id);

    if (updateError) {
      console.error(updateError);
      setError("Erreur lors de la mise à jour de l'état du commerçant.");
      setSavingId(null);
      return;
    }

    // Si on vient de le désactiver → on le retire de la liste admin
    if (!nextActive) {
      setMerchants((prev) => prev.filter((m) => m.id !== id));
    } else {
      // Cas théorique d'une réactivation à partir d'ailleurs :
      // on pourrait recharger mais pour l'instant on ne gère que la désactivation depuis cette page.
    }

    setSavingId(null);
  };

  // =========================
  // SUPPRIMER (SOFT DELETE) UN COMMERÇANT
  // =========================
  const handleDeleteMerchant = async (id: string) => {
    const ok = window.confirm(
      "Es-tu sûr de vouloir supprimer ce commerçant ? Il ne sera plus visible dans l'application (soft delete)."
    );
    if (!ok) return;

    setError(null);
    setSavingId(id);

    // Soft delete : on met is_active = false
    const { error: updateError } = await supabase
      .from("merchants")
      .update({ is_active: false })
      .eq("id", id);

    if (updateError) {
      console.error(updateError);
      setError("Erreur lors de la suppression du commerçant.");
      setSavingId(null);
      return;
    }

    // On enlève le commerçant de la liste locale
    setMerchants((prev) => prev.filter((m) => m.id !== id));
    setSavingId(null);
  };

  // =========================
  // RENDU
  // =========================
  return (
    <div className="container">
      <div className="card" style={{ marginBottom: 24 }}>
        <h2>Gérer les commerçants</h2>
        <p className="helper">
          Activez/désactivez les comptes, ajustez le pourcentage de cashback et
          supprimez les commerces si nécessaire.
        </p>
      </div>

      {loading ? (
        <div className="card">
          <p className="helper">Chargement…</p>
        </div>
      ) : error ? (
        <div className="card">
          <p className="error">{error}</p>
        </div>
      ) : merchants.length === 0 ? (
        <div className="card">
          <p className="helper">Aucun commerçant trouvé.</p>
        </div>
      ) : (
        <div className="card">
          <table className="table">
            <thead>
              <tr>
                <th>Nom</th>
                <th>Ville</th>
                <th>Adresse</th>
                <th>QR / Code</th>
                <th>Cashback (%)</th>
                <th>Actif ?</th>
                <th>Créé le</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {merchants.map((m) => {
                const rateStr =
                  typeof m.cashback_rate === "number"
                    ? m.cashback_rate.toString()
                    : "";
                const active = !!m.is_active;

                return (
                  <tr key={m.id}>
                    <td>{m.name ?? "—"}</td>
                    <td>{m.city ?? "—"}</td>
                    <td>{m.address ?? "—"}</td>
                    <td style={{ fontSize: 12 }}>{m.qr_token ?? "—"}</td>
                    <td>
                      <div
                        style={{
                          display: "flex",
                          gap: 8,
                          alignItems: "center",
                        }}
                      >
                        <input
                          defaultValue={rateStr}
                          onBlur={(e) =>
                            handleUpdateCashback(m.id, e.target.value)
                          }
                          style={{
                            width: 70,
                            padding: "4px 6px",
                            borderRadius: 8,
                            border: "1px solid #cbd5f5",
                            fontSize: 13,
                          }}
                        />
                        <span style={{ fontSize: 13 }}>%</span>
                      </div>
                    </td>
                    <td>
                      <button
                        className="button secondary"
                        type="button"
                        disabled={savingId === m.id}
                        onClick={() => handleToggleActive(m.id, m.is_active)}
                      >
                        {savingId === m.id
                          ? "Mise à jour…"
                          : active
                          ? "Désactiver"
                          : "Activer"}
                      </button>
                    </td>
                    <td>
                      {new Date(m.created_at).toLocaleString("fr-FR")}
                    </td>
                    <td>
                      <button
                        type="button"
                        disabled={savingId === m.id}
                        onClick={() => handleDeleteMerchant(m.id)}
                        style={{
                          backgroundColor: "#dc2626",
                          color: "#fff",
                          border: "none",
                          padding: "6px 10px",
                          borderRadius: 8,
                          fontSize: 13,
                          cursor: "pointer",
                        }}
                      >
                        {savingId === m.id ? "Suppression…" : "Supprimer"}
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
