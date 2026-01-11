"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import { createClient } from "@/lib/supabaseClient";

const navItems = [
  { href: "/", label: "Accueil" },
  { href: "/scan", label: "Scanner" },
  { href: "/dashboard", label: "Mon compte" },
];

export default function TopNav() {
  const pathname = usePathname();
  const router = useRouter();
  const supabase = createClient();

  const [panelOpen, setPanelOpen] = useState(false);

  const handleLogout = async () => {
    try {
      await supabase.auth.signOut();
    } catch (e) {
      console.error("Erreur déconnexion", e);
    } finally {
      setPanelOpen(false);
      router.push("/");
    }
  };

  return (
    <>
      <header
        style={{
          position: "sticky",
          top: 0,
          zIndex: 50,
          backgroundColor: "#FFFFFF",
          borderBottom: "1px solid #E5E7EB",
        }}
      >
        <nav
          style={{
            maxWidth: 960,
            margin: "0 auto",
            padding: "8px 16px",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 16,
          }}
        >
          {/* Logo / titre */}
          <Link
            href="/"
            style={{
              fontWeight: 700,
              fontSize: 20,
              textDecoration: "none",
              color: "#111827",
            }}
          >
            PawPass
          </Link>

          {/* Liens + bouton "Mon compte" */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 12,
              fontSize: 14,
            }}
          >
            {navItems.map((item) => {
              const isActive =
                item.href === "/"
                  ? pathname === "/"
                  : pathname?.startsWith(item.href);

              // On ne rend pas le lien "Mon compte" en double : il sera dans le panneau
              if (item.href === "/dashboard") {
                return null;
              }

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  style={{
                    padding: "6px 10px",
                    borderRadius: 999,
                    textDecoration: "none",
                    border: isActive
                      ? "1px solid #111827"
                      : "1px solid transparent",
                    backgroundColor: isActive ? "#111827" : "transparent",
                    color: isActive ? "#FFFFFF" : "#374151",
                    fontWeight: isActive ? 600 : 400,
                    transition:
                      "background-color 0.15s ease, color 0.15s ease",
                    whiteSpace: "nowrap",
                  }}
                >
                  {item.label}
                </Link>
              );
            })}

            {/* Bouton pour ouvrir le panneau "Mon compte" */}
            <button
              type="button"
              onClick={() => setPanelOpen(true)}
              style={{
                padding: "6px 14px",
                borderRadius: 999,
                border: "1px solid #111827",
                backgroundColor: pathname?.startsWith("/dashboard")
                  ? "#111827"
                  : "#F9FAFB",
                color: pathname?.startsWith("/dashboard")
                  ? "#FFFFFF"
                  : "#111827",
                cursor: "pointer",
                fontSize: 14,
                fontWeight: 600,
              }}
            >
              Mon compte
            </button>
          </div>
        </nav>
      </header>

      {/* Panneau latéral "Mon compte" */}
      {panelOpen && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 60,
            display: "flex",
            justifyContent: "flex-end",
            backgroundColor: "rgba(15,23,42,0.35)",
          }}
          onClick={() => setPanelOpen(false)}
        >
          <div
            style={{
              width: "100%",
              maxWidth: 400,
              backgroundColor: "#FFFFFF",
              height: "100%",
              boxShadow: "0 20px 40px rgba(0,0,0,0.25)",
              display: "flex",
              flexDirection: "column",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header du panneau */}
            <div
              style={{
                padding: "16px 20px",
                borderBottom: "1px solid #E5E7EB",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
              }}
            >
              <h2
                style={{
                  margin: 0,
                  fontSize: 18,
                  fontWeight: 700,
                }}
              >
                Mon compte
              </h2>
              <button
                type="button"
                onClick={() => setPanelOpen(false)}
                style={{
                  border: "none",
                  background: "transparent",
                  fontSize: 20,
                  cursor: "pointer",
                }}
              >
                ×
              </button>
            </div>

            {/* Contenu du panneau */}
            <div
              style={{
                padding: "12px 16px",
                overflowY: "auto",
                flex: 1,
              }}
            >
              {/* Dashboard */}
              <Link
                href="/dashboard"
                onClick={() => setPanelOpen(false)}
                style={rowStyle}
              >
                <span>🏠</span>
                <span>Tableau de bord</span>
              </Link>

{/* QR Code */}
              <Link
  href="/merchant"
  onClick={() => setPanelOpen(false)}
  style={rowStyle}
>
  <span>📱</span>
  <span>Mon QR Code</span>
</Link>

              <Link
                href="/commerces"
                onClick={() => setPanelOpen(false)}
                style={rowStyle}
              >
                <span>🛍️</span>
                <span>Commerçants partenaires</span>
              </Link>

              <Link
                href="/parrainage"
                onClick={() => setPanelOpen(false)}
                style={rowStyle}
              >
                <span>🤝</span>
                <span>Parrainer un ami</span>
              </Link>

              <Link
                href="/comment-ca-marche"
                onClick={() => setPanelOpen(false)}
                style={rowStyle}
              >
                <span>❓</span>
                <span>Comment ça marche ?</span>
              </Link>

              <Link
                href="/faq"
                onClick={() => setPanelOpen(false)}
                style={rowStyle}
              >
                <span>📚</span>
                <span>FAQ</span>
              </Link>

              <Link
                href="/contact"
                onClick={() => setPanelOpen(false)}
                style={rowStyle}
              >
                <span>✉️</span>
                <span>Contact</span>
              </Link>

              <Link
                href="/mentions-legales"
                onClick={() => setPanelOpen(false)}
                style={rowStyle}
              >
                <span>📄</span>
                <span>Mentions légales</span>
              </Link>
            </div>

            {/* Bouton de déconnexion */}
            <div
              style={{
                padding: "12px 16px 16px 16px",
                borderTop: "1px solid #F3F4F6",
              }}
            >
              <button
                type="button"
                onClick={handleLogout}
                style={{
                  width: "100%",
                  padding: "10px 12px",
                  borderRadius: 10,
                  border: "none",
                  backgroundColor: "#FEE2E2",
                  color: "#B91C1C",
                  fontWeight: 600,
                  cursor: "pointer",
                }}
              >
                Déconnexion
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

const rowStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 10,
  padding: "10px 12px",
  borderRadius: 10,
  textDecoration: "none",
  color: "#111827",
  fontSize: 14,
  fontWeight: 600,
  marginBottom: 6,
  backgroundColor: "#F9FAFB",
};
