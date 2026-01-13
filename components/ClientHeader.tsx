"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export function ClientHeader() {
  const pathname = usePathname();

  // Pages "espace client" -> on affiche Accueil / Scanner / Mon compte
  const isClientArea =
    pathname.startsWith("/dashboard") ||
    pathname.startsWith("/scan") ||
    pathname.startsWith("/account");

  // Pages d'auth -> on affiche Connexion / Créer un compte
  const isAuthPage =
    pathname === "/login" ||
    pathname === "/register";

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

        {/* --- MENU CLIENT (dashboard / scan / account) --- */}
        {isClientArea && (
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

        {/* --- MENU AUTH (login / register) --- */}
        {isAuthPage && (
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

        {/* Sur les autres pages (homepage marketing, cgu, etc.),
            on peut ne pas afficher de boutons, ou tu pourras en ajouter plus tard.
        */}
      </div>
    </header>
  );
}
