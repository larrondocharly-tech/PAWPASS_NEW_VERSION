"use client";

import { useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabaseClient";

export const dynamic = "force-dynamic";

type Row = {
  spa_id: string;
  month_start: string; // YYYY-MM-DD
  gross_amount: number | string | null;
  fee_amount: number | string | null;
  net_amount: number | string | null;
  tx_count: number | string | null;
};

type SpaForm = {
  id: string;
  slug: string;
  name: string;
  city: string;
  region: string;
  short_description: string;
  description: string;
  logo_url: string;
  hero_image_url: string;
  website_url: string;
  instagram_url: string;
  phone: string;
  is_public: boolean;
};

const toNum = (v: unknown) => {
  const n = typeof v === "number" ? v : Number(v ?? 0);
  return Number.isFinite(n) ? n : 0;
};

const eur = (v: unknown) =>
  toNum(v).toLocaleString("fr-FR", { style: "currency", currency: "EUR" });

function monthLabel(isoDate: string) {
  if (!isoDate) return "";
  const d = new Date(`${isoDate}T00:00:00`);
  return d.toLocaleDateString("fr-FR", { year: "numeric", month: "long" });
}

const infoBoxStyle = (
  kind: "blue" | "red" | "green"
): React.CSSProperties => {
  const map = {
    blue: {
      border: "1px solid rgba(59,130,246,0.25)",
      background: "rgba(59,130,246,0.08)",
      color: "rgba(30,58,138,0.95)",
    },
    red: {
      border: "1px solid rgba(239,68,68,0.25)",
      background: "rgba(239,68,68,0.08)",
      color: "rgba(127,29,29,0.95)",
    },
    green: {
      border: "1px solid rgba(34,197,94,0.25)",
      background: "rgba(34,197,94,0.08)",
      color: "rgba(20,83,45,0.95)",
    },
  }[kind];

  return {
    ...map,
    padding: 12,
    borderRadius: 14,
    margin: "12px 0",
  };
};

const inputStyle: React.CSSProperties = {
  width: "100%",
  padding: "10px 12px",
  borderRadius: 12,
  border: "1px solid rgba(15,23,42,0.12)",
  background: "#fff",
  fontSize: 14,
};

const labelStyle: React.CSSProperties = {
  display: "block",
  fontSize: 13,
  fontWeight: 700,
  marginBottom: 6,
  color: "#0f172a",
};

export default function SpaDashboardPage() {
  const supabase = useMemo(() => createClient(), []);

  const [rows, setRows] = useState<Row[]>([]);
  const [slug, setSlug] = useState<string | null>(null);
  const [spaForm, setSpaForm] = useState<SpaForm | null>(null);

  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  const [saving, setSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState<string | null>(null);
  const [saveErr, setSaveErr] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      setLoading(true);
      setErr(null);

      try {
        const { data: uData, error: uErr } = await supabase.auth.getUser();
        if (uErr) throw uErr;

        const user = uData?.user;
        if (!user) {
          if (!cancelled) setErr("Vous devez être connecté.");
          return;
        }

        const { data: pRow, error: pErr } = await supabase
          .from("profiles")
          .select("role")
          .eq("id", user.id)
          .maybeSingle();

        if (pErr) throw pErr;

        const role = (pRow?.role || "").toString().toLowerCase().trim();
        if (role && role !== "spa") {
          if (!cancelled) setErr("Ce compte n’est pas un compte SPA.");
          return;
        }

        const { data: spaRow, error: spaErr } = await supabase
          .from("spas")
          .select(
            "id, slug, name, city, region, short_description, description, logo_url, hero_image_url, website_url, instagram_url, phone, is_public"
          )
          .eq("auth_user_id", user.id)
          .maybeSingle();

        if (spaErr) throw spaErr;

        if (!spaRow?.id) {
          if (!cancelled) {
            setErr(
              "Compte SPA non trouvé. Vérifie la table 'spas' : auth_user_id doit être égal à l’UUID du compte SPA."
            );
          }
          return;
        }

        if (!cancelled) {
          setSlug(spaRow.slug || null);
          setSpaForm({
            id: String(spaRow.id),
            slug: spaRow.slug || "",
            name: spaRow.name || "",
            city: spaRow.city || "",
            region: spaRow.region || "",
            short_description: spaRow.short_description || "",
            description: spaRow.description || "",
            logo_url: spaRow.logo_url || "",
            hero_image_url: spaRow.hero_image_url || "",
            website_url: spaRow.website_url || "",
            instagram_url: spaRow.instagram_url || "",
            phone: spaRow.phone || "",
            is_public: Boolean(spaRow.is_public),
          });
        }

        const spaId = String(spaRow.id);

        const { data, error } = await supabase
          .from("v_spa_monthly_summary")
          .select(
            "spa_id, month_start, gross_amount, fee_amount, net_amount, tx_count"
          )
          .eq("spa_id", spaId)
          .order("month_start", { ascending: false });

        if (error) throw error;

        const mapped: Row[] = (data || []).map((r: any) => ({
          spa_id: String(r.spa_id),
          month_start: String(r.month_start),
          gross_amount: r.gross_amount ?? null,
          fee_amount: r.fee_amount ?? null,
          net_amount: r.net_amount ?? null,
          tx_count: r.tx_count ?? null,
        }));

        if (!cancelled) setRows(mapped);
      } catch (e: any) {
        if (!cancelled) setErr(e?.message || "Erreur inconnue");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [supabase]);

  const current = rows[0];
  const last = rows[1];

  const updateField = (field: keyof SpaForm, value: string | boolean) => {
    setSpaForm((prev) => {
      if (!prev) return prev;
      return { ...prev, [field]: value };
    });
  };

  const handleSave = async () => {
    if (!spaForm) return;

    setSaving(true);
    setSaveMsg(null);
    setSaveErr(null);

    try {
      const payload = {
        slug: spaForm.slug.trim() || null,
        name: spaForm.name.trim() || null,
        city: spaForm.city.trim() || null,
        region: spaForm.region.trim() || null,
        short_description: spaForm.short_description.trim() || null,
        description: spaForm.description.trim() || null,
        logo_url: spaForm.logo_url.trim() || null,
        hero_image_url: spaForm.hero_image_url.trim() || null,
        website_url: spaForm.website_url.trim() || null,
        instagram_url: spaForm.instagram_url.trim() || null,
        phone: spaForm.phone.trim() || null,
        is_public: spaForm.is_public,
      };

      const { error } = await supabase
        .from("spas")
        .update(payload)
        .eq("id", spaForm.id);

      if (error) throw error;

      setSlug(spaForm.slug.trim() || null);
      setSaveMsg("Page publique mise à jour.");
    } catch (e: any) {
      setSaveErr(e?.message || "Erreur lors de l’enregistrement.");
    } finally {
      setSaving(false);
    }
  };

  const card = (title: string, r?: Row) => (
    <div
      style={{
        background: "rgba(255,255,255,0.86)",
        backdropFilter: "blur(10px)",
        padding: 16,
        borderRadius: 18,
        border: "1px solid rgba(15,23,42,0.08)",
        boxShadow: "0 10px 28px rgba(15, 23, 42, 0.10)",
      }}
    >
      <h3 style={{ margin: 0, marginBottom: 10 }}>{title}</h3>
      <p style={{ margin: "6px 0" }}>
        Dons collectés : <b>{eur(r?.gross_amount)}</b>
      </p>
      <p style={{ margin: "6px 0" }}>Frais de gestion : {eur(r?.fee_amount)}</p>
      <hr
        style={{
          border: 0,
          borderTop: "1px solid rgba(15,23,42,0.08)",
          margin: "12px 0",
        }}
      />
      <p style={{ margin: "6px 0" }}>
        <b>Montant à recevoir : {eur(r?.net_amount)}</b>
      </p>
      <small style={{ color: "rgba(15,23,42,0.65)" }}>
        {toNum(r?.tx_count)} transaction{toNum(r?.tx_count) > 1 ? "s" : ""}
      </small>
    </div>
  );

  return (
    <div style={{ padding: 16 }}>
      <div style={{ maxWidth: 1000, margin: "0 auto" }}>
        <h1 style={{ margin: 0, fontSize: 32, letterSpacing: "-0.02em" }}>
          Espace SPA
        </h1>

        {slug && !loading && !err && (
          <div style={{ marginTop: 12 }}>
            <a
              href={`/spa/${slug}`}
              target="_blank"
              rel="noreferrer"
              style={{
                display: "inline-block",
                padding: "10px 16px",
                borderRadius: 12,
                background: "#16a34a",
                color: "white",
                fontWeight: 700,
                textDecoration: "none",
              }}
            >
              Voir ma page publique →
            </a>
          </div>
        )}

        {loading && <div style={infoBoxStyle("blue")}>Chargement…</div>}

        {!loading && err && (
          <div style={infoBoxStyle("red")}>
            <b>Erreur :</b> {err}
          </div>
        )}

        {!loading && !err && (
          <>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
                gap: 12,
                marginTop: 12,
              }}
            >
              {card(
                `Ce mois (${current ? monthLabel(current.month_start) : "—"})`,
                current
              )}
              {card(
                `Mois précédent (${last ? monthLabel(last.month_start) : "—"})`,
                last
              )}
            </div>

            <div
              style={{
                marginTop: 14,
                background: "rgba(255,255,255,0.86)",
                borderRadius: 18,
                border: "1px solid rgba(15,23,42,0.08)",
                boxShadow: "0 10px 28px rgba(15, 23, 42, 0.10)",
                overflow: "hidden",
              }}
            >
              <div
                style={{
                  padding: 14,
                  borderBottom: "1px solid rgba(15,23,42,0.08)",
                }}
              >
                <h3 style={{ margin: 0 }}>Historique mensuel</h3>
                <small style={{ color: "rgba(15,23,42,0.65)" }}>
                  Vue : v_spa_monthly_summary
                </small>
              </div>

              {rows.length === 0 ? (
                <div style={{ padding: 14 }}>
                  <div style={infoBoxStyle("blue")}>
                    Aucun mois trouvé pour le moment.
                  </div>
                </div>
              ) : (
                <div style={{ overflowX: "auto" }}>
                  <table style={{ width: "100%", borderCollapse: "collapse" }}>
                    <thead>
                      <tr style={{ textAlign: "left" }}>
                        <th
                          style={{
                            padding: 12,
                            borderBottom: "1px solid rgba(15,23,42,0.08)",
                          }}
                        >
                          Mois
                        </th>
                        <th
                          style={{
                            padding: 12,
                            borderBottom: "1px solid rgba(15,23,42,0.08)",
                          }}
                        >
                          Dons
                        </th>
                        <th
                          style={{
                            padding: 12,
                            borderBottom: "1px solid rgba(15,23,42,0.08)",
                          }}
                        >
                          Frais
                        </th>
                        <th
                          style={{
                            padding: 12,
                            borderBottom: "1px solid rgba(15,23,42,0.08)",
                          }}
                        >
                          À recevoir
                        </th>
                        <th
                          style={{
                            padding: 12,
                            borderBottom: "1px solid rgba(15,23,42,0.08)",
                          }}
                        >
                          Tx
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {rows.map((r) => (
                        <tr key={`${r.spa_id}-${r.month_start}`}>
                          <td
                            style={{
                              padding: 12,
                              borderBottom: "1px solid rgba(15,23,42,0.06)",
                            }}
                          >
                            {monthLabel(r.month_start)}
                          </td>
                          <td
                            style={{
                              padding: 12,
                              borderBottom: "1px solid rgba(15,23,42,0.06)",
                            }}
                          >
                            <b>{eur(r.gross_amount)}</b>
                          </td>
                          <td
                            style={{
                              padding: 12,
                              borderBottom: "1px solid rgba(15,23,42,0.06)",
                            }}
                          >
                            {eur(r.fee_amount)}
                          </td>
                          <td
                            style={{
                              padding: 12,
                              borderBottom: "1px solid rgba(15,23,42,0.06)",
                            }}
                          >
                            <b>{eur(r.net_amount)}</b>
                          </td>
                          <td
                            style={{
                              padding: 12,
                              borderBottom: "1px solid rgba(15,23,42,0.06)",
                            }}
                          >
                            {toNum(r.tx_count)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {spaForm && (
              <div
                style={{
                  marginTop: 14,
                  background: "rgba(255,255,255,0.86)",
                  borderRadius: 18,
                  border: "1px solid rgba(15,23,42,0.08)",
                  boxShadow: "0 10px 28px rgba(15, 23, 42, 0.10)",
                  overflow: "hidden",
                }}
              >
                <div
                  style={{
                    padding: 14,
                    borderBottom: "1px solid rgba(15,23,42,0.08)",
                  }}
                >
                  <h3 style={{ margin: 0 }}>Modifier ma page publique</h3>
                </div>

                <div style={{ padding: 14 }}>
                  {saveMsg && <div style={infoBoxStyle("green")}>{saveMsg}</div>}
                  {saveErr && <div style={infoBoxStyle("red")}>{saveErr}</div>}

                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
                      gap: 14,
                    }}
                  >
                    <div>
                      <label style={labelStyle}>Nom</label>
                      <input
                        value={spaForm.name}
                        onChange={(e) => updateField("name", e.target.value)}
                        style={inputStyle}
                      />
                    </div>

                    <div>
                      <label style={labelStyle}>Slug</label>
                      <input
                        value={spaForm.slug}
                        onChange={(e) => updateField("slug", e.target.value)}
                        style={inputStyle}
                      />
                    </div>

                    <div>
                      <label style={labelStyle}>Ville</label>
                      <input
                        value={spaForm.city}
                        onChange={(e) => updateField("city", e.target.value)}
                        style={inputStyle}
                      />
                    </div>

                    <div>
                      <label style={labelStyle}>Région</label>
                      <input
                        value={spaForm.region}
                        onChange={(e) => updateField("region", e.target.value)}
                        style={inputStyle}
                      />
                    </div>

                    <div style={{ gridColumn: "1 / -1" }}>
                      <label style={labelStyle}>Description courte</label>
                      <input
                        value={spaForm.short_description}
                        onChange={(e) =>
                          updateField("short_description", e.target.value)
                        }
                        style={inputStyle}
                      />
                    </div>

                    <div style={{ gridColumn: "1 / -1" }}>
                      <label style={labelStyle}>Description complète</label>
                      <textarea
                        value={spaForm.description}
                        onChange={(e) =>
                          updateField("description", e.target.value)
                        }
                        style={{
                          ...inputStyle,
                          minHeight: 130,
                          resize: "vertical",
                        }}
                      />
                    </div>

                    <div>
                      <label style={labelStyle}>URL logo</label>
                      <input
                        value={spaForm.logo_url}
                        onChange={(e) => updateField("logo_url", e.target.value)}
                        style={inputStyle}
                      />
                    </div>

                    <div>
                      <label style={labelStyle}>URL image bannière</label>
                      <input
                        value={spaForm.hero_image_url}
                        onChange={(e) =>
                          updateField("hero_image_url", e.target.value)
                        }
                        style={inputStyle}
                      />
                    </div>

                    <div>
                      <label style={labelStyle}>Site web</label>
                      <input
                        value={spaForm.website_url}
                        onChange={(e) =>
                          updateField("website_url", e.target.value)
                        }
                        style={inputStyle}
                      />
                    </div>

                    <div>
                      <label style={labelStyle}>Instagram</label>
                      <input
                        value={spaForm.instagram_url}
                        onChange={(e) =>
                          updateField("instagram_url", e.target.value)
                        }
                        style={inputStyle}
                      />
                    </div>

                    <div>
                      <label style={labelStyle}>Téléphone</label>
                      <input
                        value={spaForm.phone}
                        onChange={(e) => updateField("phone", e.target.value)}
                        style={inputStyle}
                      />
                    </div>

                    <div
                      style={{
                        display: "flex",
                        alignItems: "end",
                      }}
                    >
                      <label
                        style={{
                          display: "flex",
                          gap: 10,
                          alignItems: "center",
                          fontWeight: 700,
                          color: "#0f172a",
                        }}
                      >
                        <input
                          type="checkbox"
                          checked={spaForm.is_public}
                          onChange={(e) =>
                            updateField("is_public", e.target.checked)
                          }
                        />
                        Page publique visible
                      </label>
                    </div>
                  </div>

                  <div style={{ marginTop: 16 }}>
                    <button
                      type="button"
                      onClick={handleSave}
                      disabled={saving}
                      style={{
                        padding: "10px 16px",
                        borderRadius: 12,
                        border: "none",
                        background: saving ? "#94a3b8" : "#111827",
                        color: "white",
                        fontWeight: 700,
                        cursor: saving ? "not-allowed" : "pointer",
                      }}
                    >
                      {saving ? "Enregistrement..." : "Enregistrer"}
                    </button>
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}