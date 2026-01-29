"use client";

import { useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabaseClient";
import TopNav from "@/components/TopNav";

export const dynamic = "force-dynamic";

type Category = {
  id: string;
  slug: string;
  label: string;
};

interface MerchantPartner {
  id: string;
  name?: string | null;
  city?: string | null;
  address?: string | null;
  categories?: Category[] | null; // via merchants_public_view
}

function normalizeCity(s: string) {
  return s.trim();
}

export default function PartnersPage() {
  const supabase = useMemo(() => createClient(), []);

  const [partners, setPartners] = useState<MerchantPartner[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);

  const [selectedCity, setSelectedCity] = useState("");
  const [selectedCategorySlugs, setSelectedCategorySlugs] = useState<string[]>([]);

  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      setError(null);
      setLoading(true);

      // 1) Charger catégories (chips)
      const { data: catData, error: catErr } = await supabase
        .from("categories")
        .select("id,slug,label")
        .order("label", { ascending: true });

      if (!cancelled) {
        if (catErr) {
          // On n’empêche pas la page de fonctionner si les catégories plantent,
          // mais on affiche une erreur pour que tu voies vite le problème RLS/SQL.
          setError(catErr.message);
          setCategories([]);
        } else {
          setCategories((catData as Category[]) ?? []);
        }
      }

      // 2) Charger commerces (avec catégories via la vue)
      const { data: merchData, error: merchErr } = await supabase
        .from("merchants_public_view")
        .select("id,name,city,address,categories,is_active")
        .eq("is_active", true)
        .order("name", { ascending: true });

      if (cancelled) return;

      if (merchErr) {
        setError(merchErr.message);
        setPartners([]);
        setLoading(false);
        return;
      }

      setPartners(((merchData as any[]) ?? []) as MerchantPartner[]);
      setLoading(false);
    };

    void load();

    return () => {
      cancelled = true;
    };
  }, [supabase]);

  const cities = useMemo(() => {
    const distinct = new Set(
      partners
        .map((p) => (p.city ? normalizeCity(p.city) : ""))
        .filter((c) => Boolean(c))
    );
    return Array.from(distinct).sort((a, b) => a.localeCompare(b, "fr"));
  }, [partners]);

  const visiblePartners = useMemo(() => {
    let list = partners;

    // Filtre ville
    if (selectedCity) {
      list = list.filter((p) => (p.city ?? "").trim() === selectedCity);
    }

    // Filtre catégories (ANY match)
    if (selectedCategorySlugs.length > 0) {
      const wanted = new Set(selectedCategorySlugs);
      list = list.filter((p) => {
        const cats = (p.categories ?? []) as Category[];
        if (!Array.isArray(cats) || cats.length === 0) return false;
        return cats.some((c) => c?.slug && wanted.has(c.slug));
      });
    }

    return list;
  }, [partners, selectedCity, selectedCategorySlugs]);

  function toggleCategory(slug: string) {
    setSelectedCategorySlugs((prev) => {
      if (prev.includes(slug)) return prev.filter((s) => s !== slug);
      return [...prev, slug];
    });
  }

  function clearFilters() {
    setSelectedCity("");
    setSelectedCategorySlugs([]);
  }

  const hasFilters = selectedCity !== "" || selectedCategorySlugs.length > 0;

  return (
    <main className="container">
      <TopNav />

      <section className="card" style={{ marginBottom: 24 }}>
        <h1>Nos commerçants partenaires</h1>
        <p className="helper">
          Découvrez les commerces qui participent au programme PawPass et vous permettent de gagner
          des crédits ou de soutenir les SPA.
        </p>
      </section>

      <section className="card" style={{ marginBottom: 24 }}>
        <div className="grid" style={{ gap: 12 }}>
          {/* Ville */}
          <label className="label" htmlFor="cityFilter">
            Ville
            <select
              id="cityFilter"
              className="select"
              value={selectedCity}
              onChange={(event) => setSelectedCity(event.target.value)}
            >
              <option value="">Toutes les villes</option>
              {cities.map((city) => (
                <option key={city} value={city}>
                  {city}
                </option>
              ))}
            </select>
          </label>

          {/* Catégories */}
          <div className="label" style={{ display: "block" }}>
            Catégories
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 10 }}>
              {categories.length === 0 ? (
                <span className="helper">Aucune catégorie disponible.</span>
              ) : (
                categories.map((cat) => {
                  const active = selectedCategorySlugs.includes(cat.slug);
                  return (
                    <button
                      key={cat.id}
                      type="button"
                      onClick={() => toggleCategory(cat.slug)}
                      style={{
                        padding: "8px 12px",
                        borderRadius: 999,
                        border: "1px solid var(--border)",
                        background: active ? "var(--primary)" : "var(--card)",
                        color: active ? "white" : "var(--text)",
                        cursor: "pointer",
                        fontSize: "0.95rem",
                        lineHeight: 1,
                      }}
                      aria-pressed={active}
                      title={`Filtrer: ${cat.label}`}
                    >
                      {cat.label}
                    </button>
                  );
                })
              )}
            </div>

            {hasFilters && (
              <div style={{ marginTop: 12 }}>
                <button
                  type="button"
                  onClick={clearFilters}
                  style={{
                    padding: "10px 12px",
                    borderRadius: 12,
                    border: "1px solid var(--border)",
                    background: "var(--card)",
                    color: "var(--text)",
                    cursor: "pointer",
                    fontSize: "0.95rem",
                  }}
                >
                  Réinitialiser les filtres
                </button>
              </div>
            )}
          </div>
        </div>
      </section>

      {loading && <p className="helper">Chargement des partenaires…</p>}
      {error && <p className="error">{error}</p>}

      {!loading && !error && (
        <p className="helper" style={{ marginBottom: 12 }}>
          {visiblePartners.length} commerce{visiblePartners.length > 1 ? "s" : ""} trouvé
          {visiblePartners.length > 1 ? "s" : ""}.
        </p>
      )}

      {!loading && !error && visiblePartners.length === 0 && (
        <p className="helper">Aucun commerce ne correspond à tes filtres.</p>
      )}

      <section
        className="grid"
        style={{ gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))" }}
      >
        {visiblePartners.map((partner) => {
          const cats = (partner.categories ?? []) as Category[];
          return (
            <div key={partner.id} className="card" style={{ padding: 20 }}>
              <h3 style={{ marginTop: 0 }}>{partner.name ?? "Commerçant partenaire"}</h3>

              <p className="helper" style={{ marginTop: 4 }}>
                {partner.city?.trim() || "Ville non renseignée"}
              </p>

              {partner.address && (
                <p className="helper" style={{ marginTop: 6, fontSize: "0.9rem" }}>
                  {partner.address}
                </p>
              )}

              {/* Badges catégories */}
              {Array.isArray(cats) && cats.length > 0 && (
                <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 10 }}>
                  {cats.slice(0, 6).map((c) => (
                    <span
                      key={c.id}
                      style={{
                        padding: "6px 10px",
                        borderRadius: 999,
                        border: "1px solid var(--border)",
                        background: "var(--bg)",
                        color: "var(--text)",
                        fontSize: "0.85rem",
                      }}
                    >
                      {c.label}
                    </span>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </section>
    </main>
  );
}
