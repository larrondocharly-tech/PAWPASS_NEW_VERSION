import { notFound } from "next/navigation";
import { createClient as createServerSupabase } from "@/lib/supabaseServer";

export const dynamic = "force-dynamic";

type SpaRow = {
  id: string;
  name: string | null;
  city: string | null;
  region: string | null;
  slug: string | null;
  short_description: string | null;
  description: string | null;
  logo_url: string | null;
  hero_image_url: string | null;
  website_url: string | null;
  instagram_url: string | null;
  phone: string | null;
  is_public: boolean | null;
};

type TxRow = {
  donation_amount: number | string | null;
};

export default async function SpaPublicPage({
  params,
}: {
  params: { slug: string };
}) {
  const supabase = createServerSupabase();

  const { data: spa, error } = await supabase
    .from("spas")
    .select(
      "id,name,city,region,slug,short_description,description,logo_url,hero_image_url,website_url,instagram_url,phone,is_public"
    )
    .eq("slug", params.slug)
    .eq("is_public", true)
    .maybeSingle();

  if (error || !spa) {
    notFound();
  }

  const typedSpa = spa as SpaRow;

  const { data: stats } = await supabase
    .from("transactions")
    .select("donation_amount")
    .eq("spa_id", typedSpa.id)
    .in("status", ["approved", "validated"]);

  const totalCollected = ((stats || []) as TxRow[]).reduce(
    (sum, row) => sum + Number(row.donation_amount || 0),
    0
  );

  return (
    <main style={{ padding: 20 }}>
      <div style={{ maxWidth: 920, margin: "0 auto" }}>
        <section
          style={{
            height: 260,
            borderRadius: 24,
            background: typedSpa.hero_image_url
              ? `url(${typedSpa.hero_image_url}) center / cover no-repeat`
              : "linear-gradient(135deg, #bae6fd, #bbf7d0)",
            border: "1px solid rgba(15,23,42,0.08)",
            boxShadow: "0 12px 28px rgba(15,23,42,0.08)",
          }}
        />

        <section
          style={{
            marginTop: 18,
            padding: 20,
            borderRadius: 24,
            background: "rgba(255,255,255,0.9)",
            border: "1px solid rgba(15,23,42,0.08)",
            boxShadow: "0 12px 28px rgba(15,23,42,0.08)",
          }}
        >
          <div
            style={{
              display: "flex",
              gap: 16,
              alignItems: "center",
              flexWrap: "wrap",
              marginBottom: 16,
            }}
          >
            {typedSpa.logo_url ? (
              <img
                src={typedSpa.logo_url}
                alt={typedSpa.name || "Logo SPA"}
                style={{
                  width: 84,
                  height: 84,
                  objectFit: "cover",
                  borderRadius: 18,
                  border: "1px solid rgba(15,23,42,0.08)",
                  background: "#fff",
                }}
              />
            ) : (
              <div
                style={{
                  width: 84,
                  height: 84,
                  borderRadius: 18,
                  border: "1px solid rgba(15,23,42,0.08)",
                  background: "#f8fafc",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: 30,
                }}
              >
                🐾
              </div>
            )}

            <div>
              <h1 style={{ margin: 0, fontSize: 34, lineHeight: 1.1 }}>
                {typedSpa.name || "SPA"}
              </h1>
              <p style={{ margin: "8px 0 0", color: "#475569", fontSize: 16 }}>
                📍 {typedSpa.city || "Ville non renseignée"}
                {typedSpa.region ? ` • ${typedSpa.region}` : ""}
              </p>
              {typedSpa.short_description && (
                <p style={{ margin: "10px 0 0", color: "#0f172a" }}>
                  {typedSpa.short_description}
                </p>
              )}
            </div>
          </div>

          <div
            style={{
              padding: 16,
              borderRadius: 18,
              background: "#f0fdf4",
              border: "1px solid #bbf7d0",
              marginBottom: 18,
            }}
          >
            <div style={{ fontSize: 14, color: "#166534", marginBottom: 6 }}>
              Total collecté via PawPass
            </div>
            <div style={{ fontSize: 30, fontWeight: 800, color: "#166534" }}>
              {totalCollected.toLocaleString("fr-FR", {
                style: "currency",
                currency: "EUR",
              })}
            </div>
          </div>

          {typedSpa.description && (
            <section style={{ marginBottom: 18 }}>
              <h2 style={{ fontSize: 22, marginBottom: 10 }}>À propos</h2>
              <p style={{ lineHeight: 1.7, color: "#334155", margin: 0 }}>
                {typedSpa.description}
              </p>
            </section>
          )}

          <section
            style={{
              display: "flex",
              gap: 10,
              flexWrap: "wrap",
              marginTop: 20,
            }}
          >
            {typedSpa.website_url && (
              <a
                href={typedSpa.website_url}
                target="_blank"
                rel="noreferrer"
                style={{
                  padding: "10px 14px",
                  borderRadius: 999,
                  textDecoration: "none",
                  background: "#111827",
                  color: "#fff",
                  fontWeight: 600,
                }}
              >
                Site web
              </a>
            )}

            {typedSpa.instagram_url && (
              <a
                href={typedSpa.instagram_url}
                target="_blank"
                rel="noreferrer"
                style={{
                  padding: "10px 14px",
                  borderRadius: 999,
                  textDecoration: "none",
                  background: "#fff",
                  color: "#111827",
                  fontWeight: 600,
                  border: "1px solid rgba(15,23,42,0.12)",
                }}
              >
                Instagram
              </a>
            )}

            {typedSpa.phone && (
              <a
                href={`tel:${typedSpa.phone}`}
                style={{
                  padding: "10px 14px",
                  borderRadius: 999,
                  textDecoration: "none",
                  background: "#fff",
                  color: "#111827",
                  fontWeight: 600,
                  border: "1px solid rgba(15,23,42,0.12)",
                }}
              >
                Appeler
              </a>
            )}
          </section>
        </section>
      </div>
    </main>
  );
}