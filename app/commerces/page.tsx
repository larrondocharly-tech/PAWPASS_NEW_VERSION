"use client";

import { useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabaseClient";

type Category = {
  id: string;
  slug: string;
  label: string;
};

interface MerchantRow {
  id: string;
  name: string | null;
  city: string | null;
  address: string | null;
  is_active: boolean | null;
  cashback_rate: number | null; // ex : 0.05 pour 5 %
  categories?: Category[] | null; // via merchants_public_view
}

function normalizeCity(s: string) {
  return s.trim();
}

function formatCashback(rate: number | null) {
  if (typeof rate !== "number" || !Number.isFinite(rate)) return "Non précisé";
  const pct = (rate * 100).toFixed(1).replace(/\.0$/, "");
  return `${pct} %`;
}

function uniqById<T extends { id: string }>(items: T[]) {
  const map = new Map<string, T>();
  for (const it of items) {
    if (!map.has(it.id)) map.set(it.id, it);
  }
  return Array.from(map.values());
}

export default function MerchantsPublicPage() {
  const supabase = useMemo(() => createClient(), []);

  const [merchants, setMerchants] = useState<MerchantRow[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);

  const [selectedCity, setSelectedCity] = useState("");
  const [selectedCategorySlugs, setSelectedCategorySlugs] = useState<string[]>([]);

  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    const loadData = async () => {
      setLoading(true);
      setErrorMsg(null);

      // 1) Charger les catégories (chips)
      const { data: catData, error: catErr } = await supabase
        .from("categories")
        .select("id,slug,label")
        .order("label", { ascending: true });

      if (!cancelled) {
        if (catErr) {
          setCategories([]);
          setErrorMsg(catErr.message);
        } else {
          setCategories((catData as Category[]) ?? []);
        }
      }

      // 2) Charger les merchants avec catégories (vue)
      const { data: merchData, error: merchErr } = await supabase
        .from("merchants_public_view")
        .select("id,name,city,address,is_active,cashback_rate,categories")
        .order("created_at", { ascending: true });

      if (cancelled) return;

      if (merchErr) {
        console.error("Erreur Supabase /commerces :", merchErr);
        setErrorMsg(merchErr.message);
        setMerchants([]);
        setLoading(false);
        return;
      }

      const rows = ((merchData || []) as MerchantRow[]) ?? [];
      const active = rows.filter((m) => m.is_active === true);

      // NOTE: la vue devrait déjà grouper par m.id,
      // mais par sécurité on stocke tel quel et on déduplique plus bas.
      setMerchants(active);
      setLoading(false);
    };

    void loadData();

    return () => {
      cancelled = true;
    };
  }, [supabase]);

  const cities = useMemo(() => {
    const distinct = new Set(
      merchants
        .map((m) => (m.city ? normalizeCity(m.city) : ""))
        .filter((c) => Boolean(c))
    );
    return Array.from(distinct).sort((a, b) => a.localeCompare(b, "fr"));
  }, [merchants]);

  const filteredMerchants = useMemo(() => {
    let list = merchants;

    // Filtre ville
    if (selectedCity) {
      list = list.filter((m) => (m.city ?? "").trim() === selectedCity);
    }

    // Filtre catégories (ANY match)
    if (selectedCategorySlugs.length > 0) {
      const wanted = new Set(selectedCategorySlugs);
      list = list.filter((m) => {
        const cats = (m.categories ?? []) as Category[];
        if (!Array.isArray(cats) || cats.length === 0) return false;
        return cats.some((c) => c?.slug && wanted.has(c.slug));
      });
    }

    return list;
  }, [merchants, selectedCity, selectedCategorySlugs]);

  // ✅ FIX doublons d'affichage (si la vue/join renvoie une ligne par catégorie)
  const visibleMerchants = useMemo(() => {
    return uniqById(filteredMerchants);
  }, [filteredMerchants]);

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

  if (loading) {
    return <div style={{ padding: 40, textAlign: "center" }}>Chargement des commerçants…</div>;
  }

  if (errorMsg) {
    return (
      <div style={{ padding: 40 }}>
        <div
          style={{
            marginBottom: 20,
            padding: 10,
            borderRadius: 8,
            background: "#ffe5e5",
            color: "#b00000",
          }}
        >
          Erreur Supabase : {errorMsg}
        </div>

        <div style={{ color: "#555", fontSize: 14, lineHeight: 1.5 }}>
          <div style={{ fontWeight: 600, marginBottom: 6 }}>Checklist rapide :</div>
          <ul style={{ marginTop: 0 }}>
            <li>
              SQL appliqué : <code>categories</code>, <code>merchant_category_links</code>, vue{" "}
              <code>merchants_public_view</code>
            </li>
            <li>RLS : policies SELECT pour anon/auth sur ces tables</li>
            <li>
              La table <code>merchants</code> a bien la colonne <code>is_active</code>
            </li>
          </ul>
        </div>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: 900, margin: "0 auto", padding: "40px 20px" }}>
      <h1 style={{ fontSize: 28, fontWeight: 600, marginBottom: 14, textAlign: "center" }}>
        Commerçants partenaires
      </h1>

      <p style={{ marginBottom: 26, color: "#555", textAlign: "center" }}>
        Filtre par ville et par type de commerce pour trouver rapidement où utiliser PawPass.
      </p>

      {/* Filtres */}
      <div
        style={{
          background: "white",
          padding: 18,
          borderRadius: 12,
          boxShadow: "0 2px 10px rgba(0,0,0,0.05)",
          marginBottom: 18,
        }}
      >
        {/* Ville */}
        <div style={{ marginBottom: 14 }}>
          <div style={{ fontWeight: 600, marginBottom: 8 }}>Ville</div>
          <select
            value={selectedCity}
            onChange={(e) => setSelectedCity(e.target.value)}
            style={{
              width: "100%",
              padding: "10px 12px",
              borderRadius: 10,
              border: "1px solid rgba(0,0,0,0.12)",
              outline: "none",
            }}
          >
            <option value="">Toutes les villes</option>
            {cities.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </div>

        {/* Catégories */}
        <div>
          <div style={{ fontWeight: 600, marginBottom: 8 }}>Catégories</div>

          <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
            {categories.length === 0 ? (
              <span style={{ color: "#666" }}>Aucune catégorie disponible.</span>
            ) : (
              categories.map((cat) => {
                const active = selectedCategorySlugs.includes(cat.slug);
                return (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => toggleCategory(cat.slug)}
                    aria-pressed={active}
                    style={{
                      padding: "8px 12px",
                      borderRadius: 999,
                      border: "1px solid rgba(0,0,0,0.12)",
                      background: active ? "#0b675b" : "white",
                      color: active ? "white" : "#1a1a1a",
                      cursor: "pointer",
                      fontSize: 14,
                      lineHeight: 1,
                    }}
                    title={`Filtrer : ${cat.label}`}
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
                  borderRadius: 10,
                  border: "1px solid rgba(0,0,0,0.12)",
                  background: "white",
                  color: "#1a1a1a",
                  cursor: "pointer",
                  fontSize: 14,
                }}
              >
                Réinitialiser les filtres
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Compteur */}
      <div style={{ marginBottom: 14, color: "#666", fontSize: 14 }}>
        {visibleMerchants.length} commerce{visibleMerchants.length > 1 ? "s" : ""} trouvé
        {visibleMerchants.length > 1 ? "s" : ""}.
      </div>

      {visibleMerchants.length === 0 ? (
        <div style={{ padding: 20, textAlign: "center", color: "#666" }}>
          Aucun commerce ne correspond à tes filtres.
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
          {visibleMerchants.map((m) => {
            const cashbackText = formatCashback(m.cashback_rate);
            const cats = (m.categories ?? []) as Category[];

            return (
              <a
                key={m.id}
                href={`/commerces/${m.id}`}
                style={{ textDecoration: "none", color: "inherit" }}
              >
                <div
                  style={{
                    background: "white",
                    padding: 20,
                    borderRadius: 12,
                    boxShadow: "0 2px 10px rgba(0,0,0,0.05)",
                    cursor: "pointer",
                  }}
                >
                  <h2 style={{ margin: 0, fontSize: 20, fontWeight: 600 }}>
                    {m.name ?? "Commerçant partenaire"}
                  </h2>

                  <p style={{ margin: "6px 0 4px", color: "#444" }}>
                    {(m.address ?? "").trim()} {(m.city ?? "").trim()}
                  </p>

                  <p style={{ margin: 0, color: "#0b675b", fontWeight: 600 }}>
                    Cashback PawPass : {cashbackText}
                  </p>

                  {/* Badges catégories */}
                  {Array.isArray(cats) && cats.length > 0 && (
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 12 }}>
                      {cats.slice(0, 6).map((c) => (
                        <span
                          key={c.id}
                          style={{
                            padding: "6px 10px",
                            borderRadius: 999,
                            border: "1px solid rgba(0,0,0,0.12)",
                            background: "#f4f4f4",
                            color: "#222",
                            fontSize: 13,
                          }}
                        >
                          {c.label}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </a>
            );
          })}
        </div>
      )}
    </div>
  );
}
