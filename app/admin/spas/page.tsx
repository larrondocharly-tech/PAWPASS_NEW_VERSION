import Link from "next/link";
import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { createServerClient } from "@supabase/ssr";
import { createClient } from "@supabase/supabase-js";
import { DeleteSpaButton } from "./DeleteSpaButton";

export const dynamic = "force-dynamic";

interface SpaRow {
  id: string;
  name: string | null;
  city: string | null;
  email: string | null;
  iban: string | null;
  auth_user_id: string | null;
  created_at: string;
}

// ----- Supabase server-side pour lire la session depuis les cookies -----
function createSupabaseServerClient() {
  const cookieStore = cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value;
        },
        // pour cette page on ne modifie pas les cookies → no-op
        set() {},
        remove() {},
      },
    }
  );
}

// ----- Vérification admin côté serveur -----
const requireAdmin = async () => {
  const supabase = createSupabaseServerClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: profile, error } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();

  if (error) {
    console.error("Erreur chargement profil admin:", error);
    redirect("/login");
  }

  if (profile?.role?.toLowerCase() !== "admin") {
    redirect("/dashboard");
  }

  return { supabase, userId: user.id };
};

const fetchSpas = async (supabase: ReturnType<typeof createSupabaseServerClient>) => {
  const { data, error } = await supabase
    .from("spas")
    .select("id,name,city,email,iban,auth_user_id,created_at")
    .order("created_at", { ascending: false });

  if (error) {
    return { data: [] as SpaRow[], error: error.message };
  }

  return { data: (data ?? []) as SpaRow[], error: null as string | null };
};

function normalizeBaseUrl(url: string) {
  return url.replace(/\/+$/, "");
}

function getSiteUrl() {
  // 1) URL canonique (à mettre dans Vercel): https://pawpass.fr
  const envSite = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  if (envSite) return normalizeBaseUrl(envSite);

  // 2) Vercel URL (sans scheme) => https://xxx.vercel.app
  const vercel = process.env.VERCEL_URL?.trim();
  if (vercel) {
    const withScheme = vercel.startsWith("http") ? vercel : `https://${vercel}`;
    return normalizeBaseUrl(withScheme);
  }

  // 3) fallback local
  return "http://localhost:3000";
}

// ---------------------------
// Server Action : créer une SPA + envoyer email d’invitation
// ---------------------------
async function createSpaAction(formData: FormData) {
  "use server";

  await requireAdmin(); // protège l’action côté serveur

  const name = String(formData.get("name") ?? "").trim();
  const city = String(formData.get("city") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim().toLowerCase();

  const ibanRaw = formData.get("iban");
  const iban = typeof ibanRaw === "string" && ibanRaw.trim() ? ibanRaw.trim() : null;

  if (!name || !city || !email) {
    redirect("/admin/spas?err=missing_fields");
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceKey) {
    console.error("Env manquantes: NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY");
    redirect("/admin/spas?err=missing_env");
  }

  // Service role (bypass RLS) — serveur uniquement
  const admin = createClient(supabaseUrl, serviceKey, {
    auth: { persistSession: false },
  });

  const siteUrl = getSiteUrl();

  // ✅ LE POINT CLÉ: on passe par /auth/callback (pas /reset-password direct)
  const redirectTo = `${siteUrl}/auth/callback?next=/reset-password`;

  // 1) Invite Auth user
  const { data: invited, error: iErr } = await admin.auth.admin.inviteUserByEmail(email, {
    redirectTo,
    data: { role: "spa", name },
  });

  if (iErr || !invited?.user) {
    console.error("inviteUserByEmail error:", iErr?.message);
    redirect(`/admin/spas?err=${encodeURIComponent(iErr?.message || "invite_failed")}`);
  }

  const spaUserId = invited.user.id;

  // ✅ créer le profile avec le rôle (utile pour les redirects & guards)
  const { error: pErr } = await admin.from("profiles").upsert({
    id: spaUserId,
    role: "spa",
  });

  if (pErr) {
    console.error("profiles upsert error:", pErr.message);
    await admin.auth.admin.deleteUser(spaUserId);
    redirect(`/admin/spas?err=${encodeURIComponent(pErr.message)}`);
  }

  // 2) Insert spas row
  const { error: sErr } = await admin.from("spas").insert({
    auth_user_id: spaUserId,
    name,
    city,
    email,
    iban,
  });

  if (sErr) {
    console.error("Insert spa error:", sErr.message);
    // rollback
    await admin.from("profiles").delete().eq("id", spaUserId);
    await admin.auth.admin.deleteUser(spaUserId);
    redirect(`/admin/spas?err=${encodeURIComponent(sErr.message)}`);
  }

  revalidatePath("/admin/spas");
  redirect("/admin/spas?ok=spa_invited");
}

export default async function AdminSpasPage({
  searchParams,
}: {
  searchParams?: { ok?: string; err?: string };
}) {
  const { supabase } = await requireAdmin();
  const { data: spas, error } = await fetchSpas(supabase);

  const ok = searchParams?.ok;
  const err = searchParams?.err;

  return (
    <div className="container">
      <nav
        style={{
          marginBottom: 24,
          display: "flex",
          gap: 8,
          flexWrap: "wrap",
        }}
      >
        <Link
          href="/admin"
          style={{
            padding: "8px 12px",
            borderRadius: 999,
            fontSize: 14,
            fontWeight: 500,
            backgroundColor: "#e5e7eb",
            color: "#111827",
            textDecoration: "none",
          }}
        >
          Vue d’ensemble
        </Link>
        <Link
          href="/admin/transactions"
          style={{
            padding: "8px 12px",
            borderRadius: 999,
            fontSize: 14,
            fontWeight: 500,
            backgroundColor: "#e5e7eb",
            color: "#111827",
            textDecoration: "none",
          }}
        >
          Transactions
        </Link>
        <Link
          href="/admin/merchants"
          style={{
            padding: "8px 12px",
            borderRadius: 999,
            fontSize: 14,
            fontWeight: 500,
            backgroundColor: "#e5e7eb",
            color: "#111827",
            textDecoration: "none",
          }}
        >
          Gérer les commerçants
        </Link>
        <Link
          href="/admin/merchant-applications"
          style={{
            padding: "8px 12px",
            borderRadius: 999,
            fontSize: 14,
            fontWeight: 500,
            backgroundColor: "#e5e7eb",
            color: "#111827",
            textDecoration: "none",
          }}
        >
          Demandes commerçants
        </Link>
        <Link
          href="/admin/spas"
          style={{
            padding: "8px 12px",
            borderRadius: 999,
            fontSize: 14,
            fontWeight: 700,
            backgroundColor: "#059669",
            color: "#ffffff",
            textDecoration: "none",
          }}
        >
          Gérer les SPA
        </Link>
        <Link
          href="/dashboard"
          style={{
            padding: "8px 12px",
            borderRadius: 999,
            fontSize: 14,
            fontWeight: 500,
            backgroundColor: "#e5e7eb",
            color: "#111827",
            textDecoration: "none",
          }}
        >
          Retour à l’application
        </Link>
      </nav>

      <div className="card" style={{ marginBottom: 24 }}>
        <h2>Gestion des SPA</h2>
        <p className="helper">Ajoutez, mettez à jour ou supprimez les SPA partenaires.</p>

        {ok === "spa_invited" && (
          <p
            className="helper"
            style={{
              marginTop: 10,
              padding: 10,
              borderRadius: 12,
              border: "1px solid rgba(22,163,74,0.25)",
              background: "rgba(22,163,74,0.08)",
              color: "#0f172a",
            }}
          >
            ✅ SPA créée. Email d’invitation envoyé.
          </p>
        )}

        {(err || error) && (
          <p className="error" style={{ marginTop: 10 }}>
            ❌ {error || decodeURIComponent(err || "")}
          </p>
        )}
      </div>

      <div className="card" style={{ marginBottom: 24 }}>
        <h3>Ajouter une SPA</h3>

        <form action={createSpaAction}>
          <label className="label" htmlFor="spaName">
            Nom
            <input id="spaName" className="input" name="name" required />
          </label>

          <label className="label" htmlFor="spaCity">
            Ville
            <input id="spaCity" className="input" name="city" required />
          </label>

          <label className="label" htmlFor="spaEmail">
            Email (login)
            <input
              id="spaEmail"
              className="input"
              name="email"
              type="email"
              required
              placeholder="spa@exemple.fr"
            />
          </label>

          <label className="label" htmlFor="spaIban">
            IBAN (optionnel)
            <input id="spaIban" className="input" name="iban" placeholder="FR76 ..." />
          </label>

          <button className="button" type="submit" style={{ marginTop: 12 }}>
            Créer la SPA + envoyer l’email
          </button>

          <p className="helper" style={{ marginTop: 10 }}>
            La SPA recevra un email pour choisir un mot de passe, puis pourra se connecter et accéder
            à <b>/spa</b>.
          </p>
        </form>
      </div>

      <div className="card">
        <h3>Liste des SPA</h3>

        {spas.length === 0 ? (
          <p className="helper">Aucune SPA trouvée.</p>
        ) : (
          <table className="table">
            <thead>
              <tr>
                <th>Nom</th>
                <th>Ville</th>
                <th>Email</th>
                <th>Liée à un compte</th>
                <th>Date</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {spas.map((spa) => (
                <tr key={spa.id}>
                  <td>{spa.name ?? "—"}</td>
                  <td>{spa.city ?? "—"}</td>
                  <td>{spa.email ?? "—"}</td>
                  <td>{spa.auth_user_id ? "✅" : "❌"}</td>
                  <td>{new Date(spa.created_at).toLocaleString("fr-FR")}</td>
                  <td>
                    <DeleteSpaButton id={spa.id} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
