"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabaseClient";

export const dynamic = "force-dynamic";

interface SpaSummary {
  spa_name: string;
  spa_id: string | null;
  nb_transactions: number;
  total_achats: number;
  total_dons: number;
  total_cashback: number;
}

interface Tab {
  href: string;
  label: string;
}

export default function AdminDashboardPage() {
  const supabase = createClient();
  const pathname = usePathname();
  const currentPath = pathname || "/";
  const router = useRouter();

  const [summary, setSummary] = useState<SpaSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sectionsOpen, setSectionsOpen] = useState(false);

  // Tabs de navigation admin
  const tabs: Tab[] = [
    { href: "/admin", label: "Vue d’ensemble" },
    { href: "/admin/analytics", label: "Analytics" },
    { href: "/admin/transactions", label: "Transactions" },
    { href: "/admin/merchants", label: "Gérer les commerçants" },
    { href: "/admin/merchant-applications", label: "Demandes commerçants" },
    { href: "/admin/spas", label: "Gérer les SPA" },
    { href: "/dashboard", label: "Retour à l’application" },
  ];

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      setError(null);

      // 1) Vérifier que l'utilisateur est connecté
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        router.replace("/login");
        return;
      }

      // 2) Vérifier que c'est bien un admin
      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", user.id)
        .single();

      if (profileError || !profile || profile.role?.toLowerCase() !== "admin") {
        // Pas admin → on renvoie vers le dashboard normal
        router.replace("/dashboard");
        return;
      }

      // 3) Charger les stats admin
      const { data, error } = await supabase
        .from("admin_transactions_summary_by_spa")
        .select("*")
        .order("nb_transactions", { ascending: false });

      if (error) {
        console.error("Erreur chargement résumé SPA :", error);
        setError("Impossible de charger les statistiques.");
      } else {
        setSummary((data || []) as SpaSummary[]);
      }

      setLoading(false);
    };

    loadData();
  }, [supabase, router]);

  // Calcul du total de tous les dons
  const totalDonsToutesSpa = summary.reduce(
    (sum, row) => sum + (row.total_dons || 0),
    0
  );

  const renderTabs = () => {
    // On cherche l’onglet le plus spécifique qui matche l’URL courante
    const activeTab = tabs.reduce<Tab | null>((best, tab) => {
      if (currentPath.startsWith(tab.href)) {
        if (!best || tab.href.length > best.href.length) {
          return tab;
        }
      }
      return best;
    }, null);

    const activeLabel = activeTab ? activeTab.label : "Sections admin";

    return (
      <div
        style={{
          marginBottom: 24,
          position: "relative",
          display: "inline-block",
        }}
      >
        {/* Bouton principal "Sections admin" */}
        <button
          type="button"
          onClick={() => setSectionsOpen((prev) => !prev)}
          style={{
            padding: "8px 14px",
            borderRadius: 999,
            border: "1px solid #D1D5DB",
            backgroundColor: "#FFFFFF",
            cursor: "pointer",
            fontSize: 14,
            fontWeight: 600,
            display: "flex",
            alignItems: "center",
            gap: 8,
            boxShadow: "0 1px 2px rgba(15, 23, 42, 0.08)",
          }}
        >
          <span>{activeLabel}</span>
          <span
            style={{
              fontSize: 12,
            }}
          >
            ▾
          </span>
        </button>

        {/* Dropdown des sections admin */}
        {sectionsOpen && (
          <div
            style={{
              position: "absolute",
              top: "100%",
              left: 0,
              marginTop: 6,
              backgroundColor: "#FFFFFF",
              borderRadius: 16,
              boxShadow: "0 10px 25px rgba(15, 23, 42, 0.18)",
              padding: "8px 6px",
              minWidth: 260,
              zIndex: 30,
            }}
          >
            {tabs.map((tab) => {
              const isActive = activeTab?.href === tab.href;
              return (
                <Link
                  key={tab.href}
                  href={tab.href}
                  onClick={() => setSectionsOpen(false)}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    padding: "8px 12px",
                    borderRadius: 10,
                    fontSize: 14,
                    textDecoration: "none",
                    color: isActive ? "#059669" : "#111827",
                    backgroundColor: isActive ? "#ECFDF3" : "transparent",
                  }}
                >
                  <span
                    style={{
                      fontWeight: isActive ? 700 : 500,
                    }}
                  >
                    {tab.label}
                  </span>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    );
  };

  if (loading) {
    return (
      <main style={{ padding: 24 }}>
        <h1 style={{ fontSize: 24, fontWeight: 700, marginBottom: 16 }}>
          Tableau de bord admin – Transactions par SPA
        </h1>
        {renderTabs()}
        <p>Chargement des statistiques...</p>
      </main>
    );
  }

  if (error) {
    return (
      <main style={{ padding: 24 }}>
        <h1 style={{ fontSize: 24, fontWeight: 700, marginBottom: 16 }}>
          Tableau de bord admin – Transactions par SPA
        </h1>
        {renderTabs()}
        <p style={{ color: "red" }}>{error}</p>
      </main>
    );
  }

  return (
    <main style={{ padding: 24 }}>
      <h1 style={{ fontSize: 24, fontWeight: 700, marginBottom: 16 }}>
        Tableau de bord admin – Transactions par SPA
      </h1>

      {renderTabs()}

      {/* Carte total dons */}
      <section
        style={{
          marginBottom: 24,
          padding: 24,
          borderRadius: 16,
          backgroundColor: "#ffffff",
          boxShadow: "0 4px 12px rgba(0, 0, 0, 0.06)",
        }}
      >
        <h2 style={{ fontSize: 18, fontWeight: 600, marginBottom: 8 }}>
          Total des dons (toutes SPA)
        </h2>
        <p style={{ fontSize: 24, fontWeight: 700 }}>
          {totalDonsToutesSpa.toFixed(2).replace(".", ",")} €
        </p>
      </section>

      {/* Tableau récap par SPA */}
      <section
        style={{
          padding: 24,
          borderRadius: 16,
          backgroundColor: "#ffffff",
          boxShadow: "0 4px 12px rgba(0, 0, 0, 0.06)",
        }}
      >
        <h2 style={{ fontSize: 18, fontWeight: 600, marginBottom: 16 }}>
          Résumé par SPA
        </h2>

        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr>
                <th style={{ textAlign: "left", padding: "8px 12px" }}>SPA</th>
                <th style={{ textAlign: "right", padding: "8px 12px" }}>
                  Transactions
                </th>
                <th style={{ textAlign: "right", padding: "8px 12px" }}>
                  Total achats
                </th>
                <th style={{ textAlign: "right", padding: "8px 12px" }}>
                  Total dons
                </th>
                <th style={{ textAlign: "right", padding: "8px 12px" }}>
                  Total cashback
                </th>
              </tr>
            </thead>
            <tbody>
              {summary.map((row) => {
                const spaName = row.spa_name;

                return (
                  <tr key={row.spa_id ?? spaName}>
                    <td
                      style={{
                        padding: "8px 12px",
                        borderTop: "1px solid #eee",
                      }}
                    >
                      {spaName}
                    </td>
                    <td
                      style={{
                        padding: "8px 12px",
                        borderTop: "1px solid #eee",
                        textAlign: "right",
                      }}
                    >
                      {row.nb_transactions}
                    </td>
                    <td
                      style={{
                        padding: "8px 12px",
                        borderTop: "1px solid #eee",
                        textAlign: "right",
                      }}
                    >
                      {row.total_achats.toFixed(2).replace(".", ",")} €
                    </td>
                    <td
                      style={{
                        padding: "8px 12px",
                        borderTop: "1px solid #eee",
                        textAlign: "right",
                      }}
                    >
                      {row.total_dons.toFixed(2).replace(".", ",")} €
                    </td>
                    <td
                      style={{
                        padding: "8px 12px",
                        borderTop: "1px solid #eee",
                        textAlign: "right",
                      }}
                    >
                      {row.total_cashback.toFixed(2).replace(".", ",")} €
                    </td>
                  </tr>
                );
              })}
              {summary.length === 0 && (
                <tr>
                  <td colSpan={5} style={{ padding: 12, color: "#6b7280" }}>
                    Aucune donnée.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </main>
  );
}
