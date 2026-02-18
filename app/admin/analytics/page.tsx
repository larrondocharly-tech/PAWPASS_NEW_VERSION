"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabaseClient";

export const dynamic = "force-dynamic";

type Num = number | null;

type SpaSummary = {
  spa_name: string;
  spa_id: string | null;
  nb_transactions: number;
  total_achats: number;
  total_dons: number;
  total_cashback: number;
};

type MerchantSummary = {
  merchant_id: string;
  merchant_name: string | null;
  nb_transactions: number;
  total_achats: number;
  total_dons: number;
  total_cashback: number;
};

type MerchantSpaSummary = {
  merchant_id: string;
  merchant_name: string | null;
  spa_id: string | null;
  spa_name: string | null;
  nb_transactions: number;
  total_achats: number;
  total_dons: number;
  total_cashback: number;
};

type Tab = { href: string; label: string };

const toNum = (v: unknown) => {
  const n = typeof v === "number" ? v : Number(v ?? 0);
  return Number.isFinite(n) ? n : 0;
};

const eur = (v: unknown) =>
  toNum(v).toLocaleString("fr-FR", { style: "currency", currency: "EUR" });

export default function AdminAnalyticsPage() {
  const supabase = createClient();
  const router = useRouter();
  const pathname = usePathname();
  const currentPath = pathname || "/";

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [bySpa, setBySpa] = useState<SpaSummary[]>([]);
  const [byMerchant, setByMerchant] = useState<MerchantSummary[]>([]);
  const [byMerchantSpa, setByMerchantSpa] = useState<MerchantSpaSummary[]>([]);

  const [sectionsOpen, setSectionsOpen] = useState(false);

  // Tabs admin (ajoute Analytics)
  const tabs: Tab[] = [
    { href: "/admin", label: "Vue d’ensemble" },
    { href: "/admin/analytics", label: "Analytics" },
    { href: "/admin/transactions", label: "Transactions" },
    { href: "/admin/merchants", label: "Gérer les commerçants" },
    { href: "/admin/merchant-applications", label: "Demandes commerçants" },
    { href: "/admin/spas", label: "Gérer les SPA" },
    { href: "/dashboard", label: "Retour à l’application" },
  ];

  const activeTab = useMemo(() => {
    return tabs.reduce<Tab | null>((best, tab) => {
      if (currentPath.startsWith(tab.href)) {
        if (!best || tab.href.length > best.href.length) return tab;
      }
      return best;
    }, null);
  }, [currentPath, tabs]);

  const renderTabs = () => {
    const activeLabel = activeTab ? activeTab.label : "Sections admin";

    return (
      <div style={{ marginBottom: 24, position: "relative", display: "inline-block" }}>
        <button
          type="button"
          onClick={() => setSectionsOpen((p) => !p)}
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
          <span style={{ fontSize: 12 }}>▾</span>
        </button>

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
                  <span style={{ fontWeight: isActive ? 700 : 500 }}>{tab.label}</span>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    );
  };

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      setError(null);

      // 1) Auth
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        router.replace("/login");
        return;
      }

      // 2) Role admin
      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", user.id)
        .single();

      if (profileError || !profile || profile.role?.toLowerCase() !== "admin") {
        router.replace("/dashboard");
        return;
      }

      // 3) Load datasets (3 queries)
      const [spaRes, merRes, msRes] = await Promise.all([
        supabase
          .from("admin_transactions_summary_by_spa")
          .select("*")
          .order("total_dons", { ascending: false }),
        supabase
          .from("admin_transactions_summary_by_merchant")
          .select("*")
          .order("total_dons", { ascending: false }),
        supabase
          .from("admin_transactions_summary_merchant_spa")
          .select("*")
          .order("total_dons", { ascending: false }),
      ]);

      if (spaRes.error) {
        console.error("SPA summary error:", spaRes.error);
        setError("Impossible de charger les stats par SPA.");
        setLoading(false);
        return;
      }
      if (merRes.error) {
        console.error("Merchant summary error:", merRes.error);
        setError("Impossible de charger les stats par commerçant.");
        setLoading(false);
        return;
      }
      if (msRes.error) {
        console.error("Merchant×SPA summary error:", msRes.error);
        setError("Impossible de charger les stats commerçant × SPA.");
        setLoading(false);
        return;
      }

      setBySpa((spaRes.data ?? []) as SpaSummary[]);
      setByMerchant((merRes.data ?? []) as MerchantSummary[]);
      setByMerchantSpa((msRes.data ?? []) as MerchantSpaSummary[]);

      setLoading(false);
    };

    load();
  }, [supabase, router]);

  const kpis = useMemo(() => {
    const totals = {
      nbTx: 0,
      achats: 0,
      dons: 0,
      cashback: 0,
      activeMerchants: 0,
      activeSpas: 0,
    };

    totals.activeMerchants = byMerchant.length;
    totals.activeSpas = bySpa.length;

    // On somme à partir de byMerchant (évite double comptage)
    for (const r of byMerchant) {
      totals.nbTx += toNum(r.nb_transactions);
      totals.achats += toNum(r.total_achats);
      totals.dons += toNum(r.total_dons);
      totals.cashback += toNum(r.total_cashback);
    }

    return totals;
  }, [byMerchant, bySpa]);

  if (loading) {
    return (
      <main style={{ padding: 24 }}>
        <h1 style={{ fontSize: 24, fontWeight: 700, marginBottom: 16 }}>
          Admin – Analytics
        </h1>
        {renderTabs()}
        <p>Chargement…</p>
      </main>
    );
  }

  if (error) {
    return (
      <main style={{ padding: 24 }}>
        <h1 style={{ fontSize: 24, fontWeight: 700, marginBottom: 16 }}>
          Admin – Analytics
        </h1>
        {renderTabs()}
        <p style={{ color: "red" }}>{error}</p>
      </main>
    );
  }

  return (
    <main style={{ padding: 24 }}>
      <h1 style={{ fontSize: 24, fontWeight: 700, marginBottom: 16 }}>
        Admin – Analytics
      </h1>

      {renderTabs()}

      {/* KPIs */}
      <section
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
          gap: 12,
          marginBottom: 24,
        }}
      >
        {[
          { label: "Transactions validées", value: kpis.nbTx },
          { label: "Total achats", value: eur(kpis.achats) },
          { label: "Total dons", value: eur(kpis.dons) },
          { label: "Total cashback", value: eur(kpis.cashback) },
          { label: "Commerçants actifs", value: kpis.activeMerchants },
          { label: "SPA actives", value: kpis.activeSpas },
        ].map((card) => (
          <div
            key={card.label}
            style={{
              padding: 18,
              borderRadius: 16,
              backgroundColor: "#ffffff",
              boxShadow: "0 4px 12px rgba(0, 0, 0, 0.06)",
            }}
          >
            <div style={{ fontSize: 13, color: "#6b7280", marginBottom: 6 }}>
              {card.label}
            </div>
            <div style={{ fontSize: 20, fontWeight: 800, color: "#111827" }}>
              {String(card.value)}
            </div>
          </div>
        ))}
      </section>

      {/* Par commerçant */}
      <section
        style={{
          padding: 24,
          borderRadius: 16,
          backgroundColor: "#ffffff",
          boxShadow: "0 4px 12px rgba(0, 0, 0, 0.06)",
          marginBottom: 24,
        }}
      >
        <h2 style={{ fontSize: 18, fontWeight: 700, marginBottom: 12 }}>
          Résumé par commerçant
        </h2>

        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr>
                <th style={{ textAlign: "left", padding: "8px 12px" }}>Commerçant</th>
                <th style={{ textAlign: "right", padding: "8px 12px" }}>Transactions</th>
                <th style={{ textAlign: "right", padding: "8px 12px" }}>Total achats</th>
                <th style={{ textAlign: "right", padding: "8px 12px" }}>Total dons</th>
                <th style={{ textAlign: "right", padding: "8px 12px" }}>Total cashback</th>
              </tr>
            </thead>
            <tbody>
              {byMerchant.map((r) => (
                <tr key={r.merchant_id}>
                  <td style={{ padding: "8px 12px", borderTop: "1px solid #eee" }}>
                    {r.merchant_name ?? "—"}
                  </td>
                  <td style={{ padding: "8px 12px", borderTop: "1px solid #eee", textAlign: "right" }}>
                    {toNum(r.nb_transactions)}
                  </td>
                  <td style={{ padding: "8px 12px", borderTop: "1px solid #eee", textAlign: "right" }}>
                    {eur(r.total_achats)}
                  </td>
                  <td style={{ padding: "8px 12px", borderTop: "1px solid #eee", textAlign: "right" }}>
                    {eur(r.total_dons)}
                  </td>
                  <td style={{ padding: "8px 12px", borderTop: "1px solid #eee", textAlign: "right" }}>
                    {eur(r.total_cashback)}
                  </td>
                </tr>
              ))}
              {byMerchant.length === 0 && (
                <tr>
                  <td colSpan={5} style={{ padding: 12, color: "#6b7280" }}>
                    Aucun résultat.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      {/* Par SPA */}
      <section
        style={{
          padding: 24,
          borderRadius: 16,
          backgroundColor: "#ffffff",
          boxShadow: "0 4px 12px rgba(0, 0, 0, 0.06)",
          marginBottom: 24,
        }}
      >
        <h2 style={{ fontSize: 18, fontWeight: 700, marginBottom: 12 }}>
          Résumé par SPA
        </h2>

        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr>
                <th style={{ textAlign: "left", padding: "8px 12px" }}>SPA</th>
                <th style={{ textAlign: "right", padding: "8px 12px" }}>Transactions</th>
                <th style={{ textAlign: "right", padding: "8px 12px" }}>Total achats</th>
                <th style={{ textAlign: "right", padding: "8px 12px" }}>Total dons</th>
                <th style={{ textAlign: "right", padding: "8px 12px" }}>Total cashback</th>
              </tr>
            </thead>
            <tbody>
              {bySpa.map((r) => (
                <tr key={r.spa_id ?? r.spa_name}>
                  <td style={{ padding: "8px 12px", borderTop: "1px solid #eee" }}>
                    {r.spa_name}
                  </td>
                  <td style={{ padding: "8px 12px", borderTop: "1px solid #eee", textAlign: "right" }}>
                    {toNum(r.nb_transactions)}
                  </td>
                  <td style={{ padding: "8px 12px", borderTop: "1px solid #eee", textAlign: "right" }}>
                    {eur(r.total_achats)}
                  </td>
                  <td style={{ padding: "8px 12px", borderTop: "1px solid #eee", textAlign: "right" }}>
                    {eur(r.total_dons)}
                  </td>
                  <td style={{ padding: "8px 12px", borderTop: "1px solid #eee", textAlign: "right" }}>
                    {eur(r.total_cashback)}
                  </td>
                </tr>
              ))}
              {bySpa.length === 0 && (
                <tr>
                  <td colSpan={5} style={{ padding: 12, color: "#6b7280" }}>
                    Aucun résultat.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      {/* Merchant × SPA */}
      <section
        style={{
          padding: 24,
          borderRadius: 16,
          backgroundColor: "#ffffff",
          boxShadow: "0 4px 12px rgba(0, 0, 0, 0.06)",
        }}
      >
        <h2 style={{ fontSize: 18, fontWeight: 700, marginBottom: 12 }}>
          Dons par commerçant et par SPA
        </h2>

        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr>
                <th style={{ textAlign: "left", padding: "8px 12px" }}>Commerçant</th>
                <th style={{ textAlign: "left", padding: "8px 12px" }}>SPA</th>
                <th style={{ textAlign: "right", padding: "8px 12px" }}>Transactions</th>
                <th style={{ textAlign: "right", padding: "8px 12px" }}>Total achats</th>
                <th style={{ textAlign: "right", padding: "8px 12px" }}>Total dons</th>
                <th style={{ textAlign: "right", padding: "8px 12px" }}>Total cashback</th>
              </tr>
            </thead>
            <tbody>
              {byMerchantSpa.map((r, idx) => (
                <tr key={`${r.merchant_id}-${r.spa_id ?? "none"}-${idx}`}>
                  <td style={{ padding: "8px 12px", borderTop: "1px solid #eee" }}>
                    {r.merchant_name ?? "—"}
                  </td>
                  <td style={{ padding: "8px 12px", borderTop: "1px solid #eee" }}>
                    {r.spa_name ?? "Sans SPA"}
                  </td>
                  <td style={{ padding: "8px 12px", borderTop: "1px solid #eee", textAlign: "right" }}>
                    {toNum(r.nb_transactions)}
                  </td>
                  <td style={{ padding: "8px 12px", borderTop: "1px solid #eee", textAlign: "right" }}>
                    {eur(r.total_achats)}
                  </td>
                  <td style={{ padding: "8px 12px", borderTop: "1px solid #eee", textAlign: "right" }}>
                    {eur(r.total_dons)}
                  </td>
                  <td style={{ padding: "8px 12px", borderTop: "1px solid #eee", textAlign: "right" }}>
                    {eur(r.total_cashback)}
                  </td>
                </tr>
              ))}
              {byMerchantSpa.length === 0 && (
                <tr>
                  <td colSpan={6} style={{ padding: 12, color: "#6b7280" }}>
                    Aucun résultat.
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
