"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabaseClient";

type Role = "client" | "merchant" | "admin" | null;

export function ClientHeader() {
  const supabase = createClient();
  const pathname = usePathname();

  const [role, setRole] = useState<Role>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        setRole(null);
        setLoading(false);
        return;
      }

      const { data: profile } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", user.id)
        .single();

      setRole((profile?.role as Role) ?? null);
      setLoading(false);
    };

    load();
  }, [supabase]);

  const isActive = (href: string) => pathname === href;

  return (
    <header
      style={{
        position: "sticky",
        top: 0,
        zIndex: 20,
        backgroundColor: "#ffffff",
        borderBottom: "1px solid #E5E7EB",
      }}
    >
      <div
        style={{
          maxWidth: "1040px",
          margin: "0 auto",
          padding: "10px 16px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: "12px",
        }}
      >
        {/* Logo / titre */}
        <Link
          href="/"
          style={{
            fontWeight: 700,
            fontSize: "20px",
            letterSpacing: "0.03em",
            textDecoration: "none",
            color: "#111827",
          }}
        >
          PawPass
        </Link>

        {/* --- MENU SI CONNECTÉE EN CLIENT --- */}
        {role === "client" && (
          <nav
            style={{
              display: "flex",
              gap: "8px",
              flexShrink: 0,
            }}
          >
            {[
              { href: "/dashboard", label: "Accueil" },
              { href: "/scan", label: "Scanner" },
              { href: "/account", label: "Mon compte" },
            ].map((link) => (
              <Link
                key={link.href}
                href={link.href}
                style={{
                  padding: "6px 14px",
                  borderRadius: "999px",
                  fontSize: "14px",
                  fontWeight: 600,
                  border: "1px solid rgba(15, 23, 42, 0.08)",
                  backgroundColor: isActive(link.href) ? "#111827" : "#FFFFFF",
                  color: isActive(link.href) ? "#FFFFFF" : "#111827",
                  textDecoration: "none",
                  whiteSpace: "nowrap",
                }}
              >
                {link.label}
              </Link>
            ))}
          </nav>
        )}

        {/* --- SI NON CONNECTÉE --- */}
        {role === null && !loading && (
          <nav
            style={{
              display: "flex",
              gap: "8px",
              marginLeft: "auto",
            }}
          >
            <Link href="/login" style={{ fontSize: "14px" }}>
              Connexion
            </Link>
            <Link
              href="/register"
              style={{ fontSize: "14px", fontWeight: 600 }}
            >
              Créer un compte
            </Link>
          </nav>
        )}

        {/* Tu pourras plus tard ajouter un menu spécifique merchant / admin si besoin */}
      </div>
    </header>
  );
}
