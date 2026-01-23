"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabaseClient";

type FeedItem = {
  id: string;
  spa_id: string;
  amount_cents: number;
  occurred_at: string;
};

export default function DonationFeedSimple() {
  const supabase = createClient();
  const [items, setItems] = useState<FeedItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // 1️⃣ Chargement initial
    async function loadFeed() {
      const { data, error } = await supabase
        .from("donation_feed_events")
        .select("id, spa_id, amount_cents, occurred_at")
        .order("occurred_at", { ascending: false })
        .limit(10);

      if (!error && data) {
        setItems(data);
      }
      setLoading(false);
    }

    loadFeed();

    // 2️⃣ 👇 ÉTAPE 3 — écoute des nouvelles lignes (OPTIONNEL)
    const channel = supabase
      .channel("donation-feed")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "donation_feed_events",
        },
        () => {
          loadFeed(); // on recharge la liste
        }
      )
      .subscribe();

    // 3️⃣ Nettoyage quand on quitte la page
    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  if (loading) {
    return <div>Chargement des dons…</div>;
  }

  return (
    <div
      style={{
        marginTop: 16,
        padding: 16,
        borderRadius: 16,
        background: "#fff",
        boxShadow: "0 10px 25px rgba(0,0,0,0.08)",
      }}
    >
      <h3 style={{ marginBottom: 12 }}>Derniers dons aux SPA 🐾</h3>

      {items.length === 0 ? (
        <p>Aucun don pour le moment.</p>
      ) : (
        <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
          {items.map((item) => (
            <li
              key={item.id}
              style={{
                padding: "8px 0",
                borderBottom: "1px solid #eee",
                fontSize: 14,
              }}
            >
              <strong>{(item.amount_cents / 100).toFixed(2)} €</strong>{" "}
              versé à une SPA
              <br />
              <span style={{ fontSize: 12, color: "#666" }}>
                {new Date(item.occurred_at).toLocaleString("fr-FR")}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
