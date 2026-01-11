"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabaseClient";

export default function TopNav() {
  const pathname = usePathname();
  const supabase = createClient();

  const [role, setRole] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadProfile = async () => {
      setLoading(true);

      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        setRole(null);
        setLoading(false);
        return;
      }

      const { data: profile, error } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", user.id)
        .maybeSingle();

      if (!error && profile?.role) {
        setRole(profile.role.toLowerCase());
      } else {
        setRole(null);
      }

      setLoading(false);
    };

    void loadProfile();
  }, [supabase]);

  const linkStyle = (active: boolean): React.CSSProperties => ({
    textDecoration: "none",
    fontSize: 14,
    fontWeight: active ? 600 : 400,
    color: active ? "#0f172a" : "#4b5563",
  });

  return (
    <nav
      style={{
        width: "100%",
        padding: "12px 24px",
        borderBottom: "1px solid #e5e7eb",
        backgroundColor: "white",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        position: "sticky",
        top: 0,
        zIndex: 30,
      }}
    >
      {/* Logo / titre */}
      <Link href="/" style={{ textDecoration: "none" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <img
            src="/pawpass-logo.png"
            alt="PawPass"
            style={{ width: 32, height: 32 }}
          />
          <span
            style={{
              fontSize: 18,
              fontWeight: 600,
              color: "#111827",
              letterSpacing: -0.3,
            }}
          >
            PawPass
          </span>
        </div>
      </Link>

      {/* Liens de navigation */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 20,
        }}
      >
        <Link href="/dashboard" style={linkStyle(pathname === "/dashboard")}>
          Tableau de bord
        </Link>

        <Link href="/scan" style={linkStyle(pathname.startsWith("/scan"))}>
          Scanner
        </Link>

        <Link
          href="/history"
          style={linkStyle(pathname.startsWith("/history"))}
        >
          Historique
        </Link>

        {/* ----- NOUVEL ONGLET : MON QR CODE (comptes marchands seulement) ----- */}
        {!loading && role === "merchant" && (
          <Link
            href="/merchant"
            style={{
              ...linkStyle(pathname.startsWith("/merchant")),
              color: "#0f766e", // un peu plus vert pour le différencier
            }}
          >
            Mon QR code
          </Link>
        )}

        {/* Bouton Menu existant (tu peux l'adapter plus tard) */}
        <button
          type="button"
          style={{
            fontSize: 14,
            padding: "6px 12px",
            borderRadius: 999,
            border: "1px solid #e5e7eb",
            backgroundColor: "#f9fafb",
            cursor: "pointer",
          }}
        >
          Menu
        </button>
      </div>
    </nav>
  );
}
