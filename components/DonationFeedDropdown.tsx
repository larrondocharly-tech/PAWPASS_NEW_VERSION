"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { createClient } from "@/lib/supabaseClient";

type FeedRow = {
  id: string;
  spa_id: string;
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
  }).format(cents / 100);
}

function formatDateTime(iso: string) {
  return new Intl.DateTimeFormat("fr-FR", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(new Date(iso));
}

export default function DonationFeedDropdown() {
  const supabase = useMemo(() => createClient(), []);
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<FeedRow[]>([]);
  const [loading, setLoading] = useState(true);

  // 🔔 notif UI
  const [unseen, setUnseen] = useState(0);
  const [toast, setToast] = useState<FeedRow | null>(null);
  const toastTimer = useRef<number | null>(null);

  async function loadLatest() {
    setLoading(true);
    const { data, error } = await supabase
      .from("donation_feed")
      .select("id, spa_id, spa_name, amount_cents, occurred_at, transaction_id")
      .order("occurred_at", { ascending: false })
      .limit(10);

    if (!error && data) setItems(data as FeedRow[]);
    setLoading(false);
  }

  function showToast(row: FeedRow) {
    setToast(row);
    if (toastTimer.current) window.clearTimeout(toastTimer.current);
    toastTimer.current = window.setTimeout(() => setToast(null), 4500);
  }

  useEffect(() => {
    loadLatest();

    // ✅ Realtime: notif quand un event arrive
    const channel = supabase
      .channel("donation-feed-events-notifs")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "donation_feed_events" },
        async () => {
          // On recharge la vue join pour récupérer spa_name
          const { data, error } = await supabase
            .from("donation_feed")
            .select("id, spa_id, spa_name, amount_cents, occurred_at, transaction_id")
            .order("occurred_at", { ascending: false })
            .limit(1);

          if (!error && data && data[0]) {
            const latest = data[0] as FeedRow;

            // Incrémente les non-vues seulement si dropdown fermé
            if (!open) setUnseen((n) => n + 1);

            // Toast immédiat
            showToast(latest);

            // Mets à jour la liste (top)
            await loadLatest();
          } else {
            // fallback
            await loadLatest();
            if (!open) setUnseen((n) => n + 1);
          }
        }
      )
      .subscribe();

    return () => {
      if (toastTimer.current) window.clearTimeout(toastTimer.current);
      supabase.removeChannel(channel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [supabase, open]);

  // Quand on ouvre, on considère qu'on a "vu"
  useEffect(() => {
    if (open) setUnseen(0);
  }, [open]);

  return (
    <div style={{ position: "relative", width: "100%" }}>
      {/* 🔔 TOAST NOTIF */}
      {toast && (
        <div
          style={{
            position: "fixed",
            right: 18,
            bottom: 18,
            width: 360,
            maxWidth: "92vw",
            borderRadius: 16,
            border: "1px solid rgba(0,0,0,0.12)",
            background: "white",
            boxShadow: "0 18px 40px rgba(0,0,0,0.18)",
            padding: 14,
            zIndex: 9999,
          }}
          role="status"
          aria-live="polite"
        >
          <div style={{ fontSize: 12, opacity: 0.65, marginBottom: 6 }}>
            Nouvelle activité PawPass
          </div>

          <div style={{ fontSize: 14 }}>
            <b>{formatEuroFromCents(toast.amount_cents)}</b>{" "}
            <span style={{ opacity: 0.9 }}>
              attribué à <b>{toast.spa_name}</b>
            </span>
          </div>

          <div style={{ fontSize: 12, opacity: 0.65, marginTop: 4 }}>
            {formatDateTime(toast.occurred_at)}
          </div>

          <button
            type="button"
            onClick={() => {
              setOpen(true);
              setToast(null);
            }}
            style={{
              marginTop: 10,
              width: "100%",
              borderRadius: 12,
              border: "1px solid rgba(0,0,0,0.12)",
              background: "rgba(0,0,0,0.03)",
              padding: "8px 10px",
              cursor: "pointer",
              fontWeight: 700,
            }}
          >
            Voir
          </button>
        </div>
      )}

      {/* Bouton dropdown + badge notif */}
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        style={{
          width: "100%",
          padding: "12px 14px",
          borderRadius: 14,
          border: "1px solid rgba(0,0,0,0.12)",
          background: "white",
          cursor: "pointer",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          fontWeight: 700,
          gap: 12,
        }}
        aria-expanded={open}
      >
        <span style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <span>Derniers dons aux SPA</span>

          {unseen > 0 && (
            <span
              style={{
                fontSize: 12,
                fontWeight: 800,
                padding: "2px 8px",
                borderRadius: 999,
                background: "#EF4444",
                color: "white",
                lineHeight: "18px",
                minWidth: 22,
                textAlign: "center",
              }}
              aria-label={`${unseen} nouvelles notifications`}
            >
              {unseen}
            </span>
          )}
        </span>

        <span style={{ fontWeight: 900 }}>{open ? "▲" : "▼"}</span>
      </button>

      {/* Dropdown */}
      {open && (
        <div
          style={{
            position: "absolute",
            top: "calc(100% + 10px)",
            left: 0,
            right: 0,
            borderRadius: 16,
            border: "1px solid rgba(0,0,0,0.12)",
            background: "white",
            boxShadow: "0 18px 40px rgba(0,0,0,0.12)",
            overflow: "hidden",
            zIndex: 50,
          }}
        >
          <div style={{ padding: 12, borderBottom: "1px solid rgba(0,0,0,0.08)" }}>
            <div style={{ fontSize: 13, opacity: 0.7 }}>
              Activité globale PawPass (sans données clients)
            </div>
          </div>

          <div style={{ maxHeight: 320, overflow: "auto" }}>
            {loading ? (
              <div style={{ padding: 12, opacity: 0.7 }}>Chargement…</div>
            ) : items.length === 0 ? (
              <div style={{ padding: 12, opacity: 0.7 }}>Pas encore d’activité.</div>
            ) : (
              items.map((it) => (
                <div
                  key={it.id}
                  style={{
                    padding: 12,
                    borderBottom: "1px solid rgba(0,0,0,0.06)",
                  }}
                >
                  <div style={{ fontSize: 14 }}>
                    <b>{formatEuroFromCents(it.amount_cents)}</b>{" "}
                    <span style={{ opacity: 0.85 }}>
                      attribué à <b>{it.spa_name}</b>
                    </span>
                  </div>
                  <div style={{ fontSize: 12, opacity: 0.65 }}>
                    {formatDateTime(it.occurred_at)}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
