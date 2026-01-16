"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabaseClient";

export const dynamic = "force-dynamic";

interface Merchant {
  id: string;
  name: string;
  address: string | null;
  city: string | null;
  cashback_rate: number | null;
  description: string | null;
  services: string | null;
  opening_hours: string | null;
  google_maps_url: string | null;
}

export default function MerchantDetailPage({
  params,
}: {
  params: { id: string };
}) {
  const supabase = createClient();
  const router = useRouter();

  const [merchant, setMerchant] = useState<Merchant | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadMerchant = async () => {
      setLoading(true);
      setError(null);

      const { data, error: merchantError } = await supabase
        .from("merchants")
        .select(
          "id, name, address, city, cashback_rate, description, services, opening_hours, google_maps_url"
        )
        .eq("id", params.id)
        .eq("is_active", true)
        .maybeSingle();

      if (merchantError) {
        console.error("Erreur chargement commerçant :", merchantError);
        setError("Impossible de charger ce commerçant.");
      } else if (!data) {
        setError("Commerçant introuvable ou inactif.");
      } else {
        setMerchant(data as Merchant);
      }

      setLoading(false);
    };

    void loadMerchant();
  }, [params.id, supabase]);

  const mapsUrl = useMemo(() => {
    if (!merchant) return null;

    // 1) Si le commerçant a mis un lien Google Maps / fiche Google, on l'utilise
    if (
      merchant.google_maps_url &&
      merchant.google_maps_url.trim().length > 0
    ) {
      return merchant.google_maps_url.trim();
    }

    // 2) Sinon, on peut éventuellement retomber sur une recherche par adresse
    const location = `${merchant.address ?? ""} ${merchant.city ?? ""}`
      .trim()
      .replace(/\s+/g, " ");
    if (!location) return null;
    const query = encodeURIComponent(location);
    return `https://www.google.com/maps/search/?api=1&query=${query}`;
  }, [merchant]);

  if (loading) {
    return (
      <main className="container" style={{ paddingTop: 24, paddingBottom: 24 }}>
        <div className="card">
          <p>Chargement du commerçant…</p>
        </div>
      </main>
    );
  }

  if (error || !merchant) {
    return (
      <main className="container" style={{ paddingTop: 24, paddingBottom: 24 }}>
        <div className="card">
          <p className="error">{error ?? "Commerçant introuvable."}</p>
          <button
            type="button"
            onClick={() => router.push("/commerces")}
            style={{
              marginTop: 16,
              padding: "8px 14px",
              borderRadius: 999,
              border: "none",
              backgroundColor: "#111827",
              color: "#F9FAFB",
              fontSize: 14,
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            Retour aux commerçants partenaires
          </button>
        </div>
      </main>
    );
  }

  let cashbackText = "Non précisé";
  if (typeof merchant.cashback_rate === "number") {
    const pct = (merchant.cashback_rate * 100)
      .toFixed(1)
      .replace(/\.0$/, "");
    cashbackText = `${pct} %`;
  }

  return (
    <main className="container" style={{ paddingTop: 24, paddingBottom: 24 }}>
      <div className="card">
        {/* Titre + infos principales */}
        <h1 style={{ fontSize: 22, fontWeight: 700, marginBottom: 4 }}>
          {merchant.name}
        </h1>

        {(merchant.address || merchant.city) && (
          <p style={{ marginBottom: 4, color: "#4B5563", fontSize: 14 }}>
            {merchant.address && <span>{merchant.address}</span>}
            {merchant.city && (
              <>
                {" "}
                – <span>{merchant.city}</span>
              </>
            )}
          </p>
        )}

        <p style={{ marginBottom: 16, color: "#047857", fontWeight: 600 }}>
          Cashback PawPass : {cashbackText}
        </p>

        {mapsUrl && (
          <a
            href={mapsUrl}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              display: "inline-block",
              marginBottom: 20,
              padding: "8px 14px",
              borderRadius: 999,
              border: "none",
              backgroundColor: "#111827",
              color: "#F9FAFB",
              fontSize: 14,
              fontWeight: 500,
              textDecoration: "none",
              cursor: "pointer",
            }}
          >
            Voir sur Google Maps
          </a>
        )}

        {/* Description */}
        <section style={{ marginBottom: 16 }}>
          <h2 style={{ fontSize: 16, fontWeight: 600, marginBottom: 6 }}>
            Description
          </h2>
          <p style={{ fontSize: 14, color: "#111827", lineHeight: 1.5 }}>
            {merchant.description && merchant.description.trim().length > 0
              ? merchant.description
              : "Ce commerçant n'a pas encore renseigné de description."}
          </p>
        </section>

        {/* Services */}
        <section style={{ marginBottom: 16 }}>
          <h2 style={{ fontSize: 16, fontWeight: 600, marginBottom: 6 }}>
            Services proposés
          </h2>
          <p style={{ fontSize: 14, color: "#111827", lineHeight: 1.5 }}>
            {merchant.services && merchant.services.trim().length > 0
              ? merchant.services
              : "Services non renseignés."}
          </p>
        </section>

        {/* Horaires */}
        <section style={{ marginBottom: 16 }}>
          <h2 style={{ fontSize: 16, fontWeight: 600, marginBottom: 6 }}>
            Horaires d&apos;ouverture
          </h2>
          <p
            style={{
              fontSize: 14,
              color: "#111827",
              lineHeight: 1.5,
              whiteSpace: "pre-wrap",
            }}
          >
            {merchant.opening_hours &&
            merchant.opening_hours.trim().length > 0
              ? merchant.opening_hours
              : "Horaires non renseignés."}
          </p>
        </section>

        <button
          type="button"
          onClick={() => router.push("/commerces")}
          style={{
            marginTop: 8,
            padding: "8px 14px",
            borderRadius: 999,
            border: "none",
            backgroundColor: "#F3F4F6",
            color: "#111827",
            fontSize: 14,
            fontWeight: 500,
            cursor: "pointer",
          }}
        >
          ← Retour à la liste des commerçants
        </button>
      </div>
    </main>
  );
}
