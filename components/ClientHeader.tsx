"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabaseClient";

export function ClientHeader() {
  const pathname = usePathname();
  const router = useRouter();
  const supabase = createClient();

  const [menuOpen, setMenuOpen] = useState(false);
  const [logoutError, setLogoutError] = useState<string | null>(null);

  // Pages "espace client" => Accueil / Scanner / Menu
  const isClientArea =
    pathname.startsWith("/dashboard") ||
    pathname.startsWith("/scan") ||
    pathname.startsWith("/account");

  const isLogin = pathname === "/login";
  const isRegister = pathname === "/register";

  const isActive = (href: string) => pathname === href;

  useEffect(() => {
    // On ferme le menu quand on change de page
    setMenuOpen(false);
  }, [pathname]);

  const handleLogout = async () => {
    setLogoutError(null);
    const { error } = await supabase.auth.signOut();

    if (error) {
      console.error("Erreur signOut depuis le header :", error.message);
      setLogoutError("Déconnexion impossible pour le moment.");
      return;
    }

    // Retour à la page d'accueil après déconnexion
    router.push("/");
    router.refresh();
  };

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
          position: "relative",
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

        {/* ===========================
            MENU CLIENT (Dashboard / Scan / Account)
           ============================ */}
        {isClientArea && (
          <nav
            style={{
              display: "flex",
              gap: "8px",
              flexShrink: 0,
            }}
          >
            {/* Accueil */}
            <Link
              href="/dashboard"
              style={{
                padding: "6px 14px",
                borderRadius: "999px",
                fontSize: "14px",
                fontWeight: 600,
                border: "1px solid rgba(15, 23, 42, 0.08)",
                backgroundColor: isActive("/dashboard") ? "#111827" : "#FFFFFF",
                color: isActive("/dashboard") ? "#FFFFFF" : "#111827",
                textDecoration: "none",
                whiteSpace: "nowrap",
              }}
            >
              Accueil
            </Link>

            {/* Scanner */}
            <Link
              href="/scan"
              style={{
                padding: "6px 14px",
                borderRadius: "999px",
                fontSize: "14px",
                fontWeight: 600,
                border: "1px solid rgba(15, 23, 42, 0.08)",
                backgroundColor: isActive("/scan") ? "#111827" : "#FFFFFF",
                color: isActive("/scan") ? "#FFFFFF" : "#111827",
                textDecoration: "none",
                whiteSpace: "nowrap",
              }}
            >
              Scanner
            </Link>

            {/* Menu (overlay) */}
            <button
              type="button"
              onClick={() => setMenuOpen((prev) => !prev)}
              style={{
                padding: "6px 14px",
                borderRadius: "999px",
                fontSize: "14px",
                fontWeight: 600,
                border: "1px solid rgba(15, 23, 42, 0.08)",
                backgroundColor: "#FFFFFF",
                color: "#111827",
                whiteSpace: "nowrap",
                cursor: "pointer",
              }}
            >
              Menu
            </button>

            {/* Overlay menu */}
            {menuOpen && (
              <div
                style={{
                  position: "absolute",
                  top: "46px",
                  right: "16px",
                  backgroundColor: "#ffffff",
                  borderRadius: "16px",
                  boxShadow: "0 12px 30px rgba(15, 23, 42, 0.18)",
                  padding: "12px 8px",
                  minWidth: "210px",
                  display: "flex",
                  flexDirection: "column",
                  gap: "4px",
                }}
              >
                <Link
                  href="/commerces"
                  onClick={() => setMenuOpen(false)}
                  style={{
                    padding: "8px 12px",
                    borderRadius: "10px",
                    fontSize: "14px",
                    textDecoration: "none",
                    color: "#111827",
                  }}
                >
                  Commerces partenaires
                </Link>

                <Link
                  href="/comment-ca-marche"
                  onClick={() => setMenuOpen(false)}
                  style={{
                    padding: "8px 12px",
                    borderRadius: "10px",
                    fontSize: "14px",
                    textDecoration: "none",
                    color: "#111827",
                  }}
                >
                  Comment ça marche
                </Link>

                <Link
                  href="/faq"
                  onClick={() => setMenuOpen(false)}
                  style={{
                    padding: "8px 12px",
                    borderRadius: "10px",
                    fontSize: "14px",
                    textDecoration: "none",
                    color: "#111827",
                  }}
                >
                  FAQ
                </Link>

                <div
                  style={{
                    borderTop: "1px solid #E5E7EB",
                    margin: "6px 0 4px",
                  }}
                />

                <button
                  type="button"
                  onClick={handleLogout}
                  style={{
                    padding: "8px 12px",
                    borderRadius: "10px",
                    fontSize: "14px",
                    textAlign: "left",
                    border: "none",
                    background: "transparent",
                    color: "#b91c1c",
                    cursor: "pointer",
                  }}
                >
                  Se déconnecter
                </button>

                {logoutError && (
                  <div
                    style={{
                      marginTop: "4px",
                      fontSize: "11px",
                      color: "#b91c1c",
                    }}
                  >
                    {logoutError}
                  </div>
                )}
              </div>
            )}
          </nav>
        )}

        {/* ===========================
            PAGES D'AUTH
           ============================ */}

        {/* Sur /login -> seulement "Créer un compte" */}
        {isLogin && (
          <nav
            style={{
              display: "flex",
              gap: "8px",
              marginLeft: "auto",
            }}
          >
            <Link
              href="/register"
              style={{ fontSize: "14px", fontWeight: 600 }}
            >
              Créer un compte
            </Link>
          </nav>
        )}

        {/* Sur /register -> seulement "Connexion" */}
        {isRegister && (
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
          </nav>
        )}
      </div>
    </header>
  );
}
