"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabaseClient";

interface Merchant {
  id: string;
  name: string | null;
  city: string | null;
  address: string | null;
  is_active: boolean | null;
  cashback_rate: number | null; // ex : 0.05 pour 5 %
}

export default function MerchantsPublicPage() {
  const supabase = createClient();
  const [merchants, setMerchants] = useState<Merchant[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      setErrorMsg(null);

      const { data, error } = await supabase
        .from("merchants")
        .select("id, name, city, address, is_active, cashback_rate")
        .order("created_at", { ascending: true });

      if (error) {
        console.error("Erreur Supabase /commerces :", error);
        setErrorMsg(error.message);
        setLoading(false);
        return;
      }

      const rows = (data || []) as Merchant[];
      const active = rows.filter((m) => m.is_active === true);

      setMerchants(active);
      setLoading(false);
    };

    void loadData();
  }, [supabase]);

  if (loading) {
    return (
      <div style={{ padding: 40, textAlign: "center" }}>
        Chargement des commerçants…
      </div>
    );
  }

  if (errorMsg) {
    return (
      <div style={{ padding: 40 }}>
        <div
          style={{
            marginBottom: 20,
            padding: 10,
            borderRadius: 8,
            background: "#ffe5e5",
            color: "#b00000",
          }}
        >
          Erreur Supabase : {errorMsg}
        </div>
      </div>
    );
  }

  if (merchants.length === 0) {
    return (
      <div style={{ padding: 40, textAlign: "center" }}>
        Aucun commerçant partenaire pour le moment.
      </div>
    );
  }

  return (
    <div style={{ maxWidth: 900, margin: "0 auto", padding: "40px 20px" }}>
      <h1
        style={{
          fontSize: 28,
          fontWeight: 600,
          marginBottom: 20,
          textAlign: "center",
        }}
      >
        Commerçants partenaires
      </h1>

      <p style={{ marginBottom: 30, color: "#555", textAlign: "center" }}>
        Liste des commerçants partenaires PawPass.
      </p>

      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: 20,
        }}
      >
        {merchants.map((m) => {
          let cashbackText = "Non précisé";

          if (typeof m.cashback_rate === "number") {
            const pct = (m.cashback_rate * 100)
              .toFixed(1)
              .replace(/\.0$/, "");
            cashbackText = `${pct} %`;
          }

          return (
            <a
              key={m.id}
              href={`/commerces/${m.id}`}
              style={{ textDecoration: "none", color: "inherit" }}
            >
              <div
                style={{
                  background: "white",
                  padding: 20,
                  borderRadius: 12,
                  boxShadow: "0 2px 10px rgba(0,0,0,0.05)",
                  cursor: "pointer",
                }}
              >
                <h2 style={{ margin: 0, fontSize: 20, fontWeight: 600 }}>
                  {m.name}
                </h2>

                <p style={{ margin: "6px 0 4px", color: "#444" }}>
                  {m.address || ""} {m.city || ""}
                </p>

                <p style={{ margin: 0, color: "#0b675b", fontWeight: 500 }}>
                  Cashback PawPass : {cashbackText}
                </p>
              </div>
            </a>
          );
        })}
      </div>
    </div>
  );
}
