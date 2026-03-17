import { createClient } from "@/lib/supabaseServer";

export const dynamic = "force-dynamic";

type Spa = {
  id: string;
  name: string;
  city: string | null;
  slug: string;
  short_description: string | null;
  logo_url: string | null;
};

export default async function AssociationsPage() {
  const supabase = createClient();

  const { data: spas } = await supabase
    .from("spas")
    .select("id, name, city, slug, short_description, logo_url")
    .eq("is_public", true)
    .order("created_at", { ascending: false });

  return (
    <div style={{ padding: 16 }}>
      <div style={{ maxWidth: 1100, margin: "0 auto" }}>
        <h1 style={{ fontSize: 32, marginBottom: 20 }}>
          Associations partenaires 🐾
        </h1>

        {!spas || spas.length === 0 && (
          <p>Aucune association pour le moment.</p>
        )}

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
            gap: 16,
          }}
        >
          {spas?.map((spa) => (
            <a
              key={spa.id}
              href={`/spa/${spa.slug}`}
              style={{
                textDecoration: "none",
                color: "inherit",
              }}
            >
              <div
                style={{
                  background: "rgba(255,255,255,0.9)",
                  borderRadius: 20,
                  padding: 16,
                  border: "1px solid rgba(15,23,42,0.08)",
                  boxShadow: "0 10px 20px rgba(0,0,0,0.05)",
                  transition: "0.2s",
                }}
              >
                {/* Logo */}
                <div
                  style={{
                    width: 60,
                    height: 60,
                    borderRadius: 16,
                    background: "#f1f5f9",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    marginBottom: 12,
                    overflow: "hidden",
                  }}
                >
                  {spa.logo_url ? (
                    <img
                      src={spa.logo_url}
                      alt={spa.name}
                      style={{ width: "100%", height: "100%", objectFit: "cover" }}
                    />
                  ) : (
                    <span>🐾</span>
                  )}
                </div>

                {/* Nom */}
                <h3 style={{ margin: 0 }}>{spa.name}</h3>

                {/* Ville */}
                {spa.city && (
                  <p style={{ margin: "4px 0", opacity: 0.7 }}>
                    📍 {spa.city}
                  </p>
                )}

                {/* Description */}
                {spa.short_description && (
                  <p style={{ marginTop: 8, fontSize: 14, opacity: 0.8 }}>
                    {spa.short_description}
                  </p>
                )}

                {/* CTA */}
                <div
                  style={{
                    marginTop: 12,
                    fontWeight: 600,
                    color: "#16a34a",
                  }}
                >
                  Voir la fiche →
                </div>
              </div>
            </a>
          ))}
        </div>
      </div>
    </div>
  );
}