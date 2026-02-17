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

const infoBoxStyle = (kind: "blue" | "red"): React.CSSProperties => {
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
  }[kind];

  return {
    ...map,
    padding: 12,
    borderRadius: 14,
    margin: "12px 0",
  };
};

export default function SpaDashboardPage() {
  const supabase = useMemo(() => createClient(), []);

  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      setLoading(true);
      setErr(null);

      try {
        // 1) user connecté
        const { data: uData, error: uErr } = await supabase.auth.getUser();
        if (uErr) throw uErr;

        const user = uData?.user;
        if (!user) {
          if (!cancelled) setErr("Vous devez être connecté.");
          return;
        }

        // 2) vérifier role sur profiles (source de vérité)
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

        // 3) spa.id lié à auth_user_id
        const { data: spaRow, error: spaErr } = await supabase
          .from("spas")
          .select("id")
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

        const spaId = String(spaRow.id);

        // 4) lire la vue mensuelle
        const { data, error } = await supabase
          .from("v_spa_monthly_summary")
          .select("spa_id, month_start, gross_amount, fee_amount, net_amount, tx_count")
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
      <hr style={{ border: 0, borderTop: "1px solid rgba(15,23,42,0.08)", margin: "12px 0" }} />
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
        <h1 style={{ margin: 0, fontSize: 32, letterSpacing: "-0.02em" }}>Espace SPA</h1>

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
              {card(`Ce mois (${current ? monthLabel(current.month_start) : "—"})`, current)}
              {card(`Mois précédent (${last ? monthLabel(last.month_start) : "—"})`, last)}
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
              <div style={{ padding: 14, borderBottom: "1px solid rgba(15,23,42,0.08)" }}>
                <h3 style={{ margin: 0 }}>Historique mensuel</h3>
                <small style={{ color: "rgba(15,23,42,0.65)" }}>
                  Vue : v_spa_monthly_summary
                </small>
              </div>

              {rows.length === 0 ? (
                <div style={{ padding: 14 }}>
                  <div style={infoBoxStyle("blue")}>Aucun mois trouvé pour le moment.</div>
                </div>
              ) : (
                <div style={{ overflowX: "auto" }}>
                  <table style={{ width: "100%", borderCollapse: "collapse" }}>
                    <thead>
                      <tr style={{ textAlign: "left" }}>
                        <th style={{ padding: 12, borderBottom: "1px solid rgba(15,23,42,0.08)" }}>
                          Mois
                        </th>
                        <th style={{ padding: 12, borderBottom: "1px solid rgba(15,23,42,0.08)" }}>
                          Dons
                        </th>
                        <th style={{ padding: 12, borderBottom: "1px solid rgba(15,23,42,0.08)" }}>
                          Frais
                        </th>
                        <th style={{ padding: 12, borderBottom: "1px solid rgba(15,23,42,0.08)" }}>
                          À recevoir
                        </th>
                        <th style={{ padding: 12, borderBottom: "1px solid rgba(15,23,42,0.08)" }}>
                          Tx
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {rows.map((r) => (
                        <tr key={`${r.spa_id}-${r.month_start}`}>
                          <td style={{ padding: 12, borderBottom: "1px solid rgba(15,23,42,0.06)" }}>
                            {monthLabel(r.month_start)}
                          </td>
                          <td style={{ padding: 12, borderBottom: "1px solid rgba(15,23,42,0.06)" }}>
                            <b>{eur(r.gross_amount)}</b>
                          </td>
                          <td style={{ padding: 12, borderBottom: "1px solid rgba(15,23,42,0.06)" }}>
                            {eur(r.fee_amount)}
                          </td>
                          <td style={{ padding: 12, borderBottom: "1px solid rgba(15,23,42,0.06)" }}>
                            <b>{eur(r.net_amount)}</b>
                          </td>
                          <td style={{ padding: 12, borderBottom: "1px solid rgba(15,23,42,0.06)" }}>
                            {toNum(r.tx_count)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
