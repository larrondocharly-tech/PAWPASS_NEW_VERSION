"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { createClient } from "@/lib/supabaseClient";

type FeedRow = {
  id: string;
  spa_name: string;
  amount_cents: number;
  occurred_at: string;
  transaction_id?: string;
};

function formatEuroFromCents(cents: number) {
  return new Intl.NumberFormat("fr-FR", {
    style: "currency",
    currency: "EUR",
    maximumFractionDigits: 2,
  }).format((cents ?? 0) / 100);
}

function formatDateTime(iso: string) {
  return new Intl.DateTimeFormat("fr-FR", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(new Date(iso));
}

export default function DonationFeedTicker({ limit = 6 }: { limit?: number }) {
  const supabase = useMemo(() => createClient(), []);
  const [items, setItems] = useState<FeedRow[]>([]);
  const [loading, setLoading] = useState(true);

  const seen = useRef<Set<string>>(new Set());
  const [justAddedKey, setJustAddedKey] = useState<string | null>(null);
  const justAddedTimer = useRef<number | null>(null);

  const lastOccurredAt = useRef<string | null>(null);
  const pollTimer = useRef<number | null>(null);

  async function loadLatest(max = limit) {
    const { data, error } = await supabase
      .from("donation_feed")
      .select("id, spa_name, amount_cents, occurred_at, transaction_id")
      .order("occurred_at", { ascending: false })
      .limit(max);

    if (error || !data) return null;
    return data as FeedRow[];
  }

  async function loadInitial() {
    setLoading(true);
    const rows = await loadLatest(limit);
    if (rows) {
      setItems(rows);
      rows.forEach((r) => seen.current.add(r.transaction_id ?? r.id));
      lastOccurredAt.current = rows[0]?.occurred_at ?? null;
    }
    setLoading(false);
  }

  async function prependIfNew() {
    const rows = await loadLatest(1);
    if (!rows || !rows[0]) return;

    const row = rows[0];
    const key = row.transaction_id ?? row.id;

    if (seen.current.has(key)) return;
    seen.current.add(key);

    setJustAddedKey(key);
    if (justAddedTimer.current) window.clearTimeout(justAddedTimer.current);
    justAddedTimer.current = window.setTimeout(() => setJustAddedKey(null), 600);

    setItems((prev) => [row, ...prev].slice(0, limit));
    lastOccurredAt.current = row.occurred_at;
  }

  useEffect(() => {
    loadInitial();

    const channel = supabase
      .channel("donation-feed-ticker")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "donation_feed_events" },
        () => prependIfNew()
      )
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "donation_feed_events" },
        () => prependIfNew()
      )
      .subscribe();

    pollTimer.current = window.setInterval(async () => {
      const rows = await loadLatest(1);
      const latest = rows?.[0];
      if (!latest) return;
      if (lastOccurredAt.current && latest.occurred_at <= lastOccurredAt.current) return;
      await prependIfNew();
    }, 6000);

    return () => {
      if (pollTimer.current) window.clearInterval(pollTimer.current);
      if (justAddedTimer.current) window.clearTimeout(justAddedTimer.current);
      supabase.removeChannel(channel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [supabase, limit]);

  return (
    <div className="card" style={{ borderRadius: 16, padding: 16 }}>
      <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between" }}>
        <h2 style={{ fontSize: 18, margin: 0, color: "#111827" }}>Quelques dons du jour</h2>
        <span style={{ fontSize: 12, color: "#6B7280" }}>Activité globale (sans données clients)</span>
      </div>

      <div style={{ height: 10 }} />

      {loading ? (
        <div style={{ padding: 10, opacity: 0.7 }}>Chargement…</div>
      ) : items.length === 0 ? (
        <div style={{ padding: 10, opacity: 0.7 }}>Pas encore d’activité.</div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column" }}>
          {items.map((it, idx) => {
            const key = it.transaction_id ?? it.id;
            const isNew = justAddedKey === key;

            return (
              <div
                key={key}
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: 12,
                  padding: "12px 4px",
                  borderTop: idx === 0 ? "none" : "1px solid #F3F4F6",
                  animation: isNew ? "ppFeedIn 280ms ease-out" : undefined,
                }}
              >
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontSize: 14, color: "#111827" }}>
                    Un don de{" "}
                    <b style={{ color: "#2563EB" }}>{formatEuroFromCents(it.amount_cents)}</b> a été
                    attribué à <b>{it.spa_name}</b>
                  </div>
                  <div style={{ fontSize: 12, color: "#6B7280", marginTop: 2 }}>
                    {formatDateTime(it.occurred_at)}
                  </div>
                </div>

                <div
                  style={{
                    fontSize: 12,
                    fontWeight: 800,
                    color: "#16A34A",
                    background: "#ECFDF3",
                    padding: "6px 10px",
                    borderRadius: 999,
                    whiteSpace: "nowrap",
                  }}
                >
                  {formatEuroFromCents(it.amount_cents)}
                </div>
              </div>
            );
          })}
        </div>
      )}

      <style jsx global>{`
        @keyframes ppFeedIn {
          from {
            opacity: 0;
            transform: translateY(-10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `}</style>
    </div>
  );
}
