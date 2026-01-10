import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabaseClient";
import TopNav from "@/components/TopNav";
import { addSpaAction } from "./addSpaAction";
import { deleteSpaAction } from "./deleteSpaAction";

export const dynamic = "force-dynamic";

interface SpaRow {
  id: string;
  name: string | null;
  city: string | null;
  created_at: string;
}

const requireAdmin = async () => {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();

  if (profile?.role?.toLowerCase() !== "admin") {
    redirect("/dashboard");
  }

  return supabase;
};

const fetchSpas = async (supabase: ReturnType<typeof createClient>) => {
  const { data, error } = await supabase
    .from("spas")
    .select("id,name,city,created_at")
    .order("created_at", { ascending: false });

  if (error) {
    return { data: [] as SpaRow[], error: error.message };
  }

  return { data: (data ?? []) as SpaRow[], error: null as string | null };
};

export default async function AdminSpasPage() {
  const supabase = await requireAdmin();
  const { data: spas, error } = await fetchSpas(supabase);

  return (
    <div className="container">
      <TopNav title="Admin PawPass" />

      {/* barre d’onglets admin globale */}
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
        <p className="helper">
          Ajoutez, mettez à jour ou supprimez les SPA partenaires.
        </p>
      </div>

      <div className="card" style={{ marginBottom: 24 }}>
        <h3>Ajouter une SPA</h3>
        <form action={addSpaAction}>
          <label className="label" htmlFor="spaName">
            Nom
            <input id="spaName" className="input" name="name" required />
          </label>
          <label className="label" htmlFor="spaCity">
            Ville
            <input id="spaCity" className="input" name="city" required />
          </label>
          <button
            className="button"
            type="submit"
            style={{ marginTop: 12 }}
          >
            Ajouter la SPA
          </button>
        </form>
      </div>

      <div className="card">
        <h3>Liste des SPA</h3>
        {error ? (
          <p className="error">{error}</p>
        ) : spas.length === 0 ? (
          <p className="helper">Aucune SPA trouvée.</p>
        ) : (
          <table className="table">
            <thead>
              <tr>
                <th>Nom</th>
                <th>Ville</th>
                <th>Date</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {spas.map((spa) => (
                <tr key={spa.id}>
                  <td>{spa.name ?? "—"}</td>
                  <td>{spa.city ?? "—"}</td>
                  <td>
                    {new Date(spa.created_at).toLocaleString("fr-FR")}
                  </td>
                  <td>
                    <form action={deleteSpaAction}>
                      <input type="hidden" name="id" value={spa.id} />
                      <button
                        className="button secondary"
                        type="submit"
                      >
                        Supprimer
                      </button>
                    </form>
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
