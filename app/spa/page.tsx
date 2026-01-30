"use client";

import { useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabaseClient";

type Row = {
  spa_id: string;
  month_start: string; // dans ta vue c'est "date"
  gross_amount: number;
  fee_amount: number;
  net_amount: number;
  tx_count: number;
};

const eur = (n: number) =>
  (Number(n) || 0).toLocaleString("fr-FR", { style: "currency", currency: "EUR" });

function monthLabel(isoDate: string) {
  // isoDate genre "2026-01-01"
  if (!isoDate) return "";
  const d = new Date(isoDate + "T00:00:00");
  return d.toLocaleDateString("fr-FR", { year: "numeric", month: "long" });
}

export default function SpaDashboard() {
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
        const userId = uData?.user?.id;

        if (uErr || !userId) {
          if (!cancelled) setErr("Vous devez être connecté en tant que SPA.");
          return;
        }

        // 2) retrouver le spa.id lié à auth_user_id
        const { data: spaRow, error: spaErr } = await supabase
          .from("spas")
          .select("id")
          .eq("auth_user_id", userId)
          .single();

        if (spaErr || !spaRow?.id) {
          if (!cancelled) {
            setErr(
              "Compte SPA non trouvé. Vérifie que ton utilisateur est bien relié à la table 'spas' (auth_user_id)."
            );
          }
          return;
        }

        const spaId = spaRow.id as string;

        // 3) récupérer UNIQUEMENT les lignes de la SPA connectée
        const { data, error } = await supabase
          .from("v_spa_monthly_summary")
          .select("spa_id, month_start, gross_amount, fee_amount, net_amount, tx_count")
          .eq("spa_id", spaId)
          .order("month_start", { ascending: false });

        if (error) {
          if (!cancelled) setErr(error.message);
          return;
        }

        if (!cancelled) setRows((data as Row[]) || []);
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

  if (loading) return <div style={{ padding: 20 }}>Chargement…</div>;

  if (err) {
    return (
      <div style={{ maxWidth: 900, margin: "0 auto", padding: 16 }}>
        <h1>Espace SPA</h1>
        <div
          style={{
            marginTop: 12,
            background: "rgba(185, 28, 28, 0.08)",
            border: "1px solid rgba(185, 28, 28, 0.18)",
            color: "#b91c1c",
            borderRadius: 14,
            padding: 12,
          }}
        >
          {err}
        </div>
      </div>
    );
  }

  const current = rows[0];
  const last = rows[1];

  const card = (title: string, r?: Row) => (
    <div
      style={{
        background: "#fff",
        padding: 16,
        borderRadius: 14,
        border: "1px solid #e6e7df",
      }}
    >
      <h3 style={{ margin: 0, marginBottom: 10 }}>{title}</h3>
      <p style={{ margin: "6px 0" }}>
        Dons collectés : <b>{eur(r?.gross_amount || 0)}</b>
      </p>
      <p style={{ margin: "6px 0" }}>Frais de gestion : {eur(r?.fee_amount || 0)}</p>
      <hr style={{ border: 0, borderTop: "1px solid #eee", margin: "12px 0" }} />
      <p style={{ margin: "6px 0" }}>
        <b>Montant à recevoir : {eur(r?.net_amount || 0)}</b>
      </p>
      <small style={{ color: "#64748b" }}>{r?.tx_count || 0} transactions</small>
    </div>
  );

  return (
    <div style={{ maxWidth: 900, margin: "0 auto", padding: 16 }}>
      <h1 style={{ marginTop: 0 }}>Espace SPA</h1>

      {rows.length === 0 ? (
        <div
          style={{
            marginTop: 12,
            background: "rgba(2, 132, 199, 0.08)",
            border: "1px solid rgba(2, 132, 199, 0.18)",
            color: "#0f172a",
            borderRadius: 14,
            padding: 12,
          }}
        >
          Aucune donnée pour le moment (pas encore de dons attribués à cette SPA).
        </div>
      ) : (
        <>
          <div
            style={{
              display: "grid",
              gap: 12,
              gridTemplateColumns: "repeat(auto-fit,minmax(260px,1fr))",
              marginTop: 12,
            }}
          >
            {card(`Ce mois-ci (${current ? monthLabel(current.month_start) : "—"})`, current)}
            {card(`Mois dernier (${last ? monthLabel(last.month_start) : "—"})`, last)}
          </div>

          <h2 style={{ marginTop: 24 }}>Historique</h2>

          <div style={{ overflowX: "auto" }}>
            <table width="100%" cellPadding={10} style={{ borderCollapse: "collapse", background: "#fff" }}>
              <thead>
                <tr style={{ textAlign: "left", borderBottom: "1px solid #eee" }}>
                  <th>Mois</th>
                  <th>Dons</th>
                  <th>Frais</th>
                  <th>Net</th>
                  <th>Tx</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.month_start} style={{ borderBottom: "1px solid #f1f5f9" }}>
                    <td>{monthLabel(r.month_start)}</td>
                    <td>{eur(r.gross_amount)}</td>
                    <td>{eur(r.fee_amount)}</td>
                    <td>
                      <b>{eur(r.net_amount)}</b>
                    </td>
                    <td>{r.tx_count}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}
