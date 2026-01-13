"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabaseClient";

interface Profile {
  role: string | null;
  merchant_id: string | null;
}

export function ClientHeader() {
  const pathname = usePathname();
  const currentPath = pathname || "/";
  const router = useRouter();
  const supabase = createClient();

  const [menuOpen, setMenuOpen] = useState(false);
  const [logoutError, setLogoutError] = useState<string | null>(null);
  const [isMerchant, setIsMerchant] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);

  // Chargement du profil + écoute des changements de session
  useEffect(() => {
    let isMounted = true;

    const applyNoUser = () => {
      if (!isMounted) return;
      setIsMerchant(false);
      setIsAdmin(false);
    };

    const loadProfile = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        applyNoUser();
        return;
      }

      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("role, merchant_id")
        .eq("id", user.id)
        .single<Profile>();

      if (!isMounted) return;

      if (profileError || !profile) {
        console.error("Erreur chargement profil header :", profileError);
        applyNoUser();
        return;
      }

      const role = profile.role?.toLowerCase() || null;

      setIsMerchant(role === "merchant" || profile.merchant_id !== null);
      setIsAdmin(role === "admin");
    };

    // 1) premier chargement
    loadProfile();

    // 2) rechargement à chaque changement d'état d'auth (login / logout)
    const { data: sub } = supabase.auth.onAuthStateChange(() => {
      loadProfile();
    });

    return () => {
      isMounted = false;
      sub?.subscription?.unsubscribe();
    };
  }, [supabase]);

  const isMerchantArea = currentPath.startsWith("/merchant");
  const isAdminArea = currentPath.startsWith("/admin");

  // Pages où on affiche Accueil / Scanner / Menu
  const isClientArea =
    currentPath.startsWith("/dashboard") ||
    currentPath.startsWith("/scan") ||
    currentPath.startsWith("/account") ||
    currentPath.startsWith("/commerces") ||
    currentPath.startsWith("/parrainage") ||
    currentPath.startsWith("/comment-ca-marche") ||
    currentPath.startsWith("/faq") ||
    currentPath.startsWith("/contact") ||
    currentPath.startsWith("/mentions-legales") ||
    currentPath.startsWith("/cgu") ||
    isMerchantArea ||
    isAdminArea;

  const isLogin = currentPath === "/login";
  const isRegister = currentPath === "/register";
  const isHome = currentPath === "/";
  const isAuthPage = isLogin || isRegister;

  // Où pointe le logo :
  // - /, /login, /register -> /
  // - commerçant -> /merchant
  // - admin -> /admin
  // - sinon -> /dashboard
  const logoHref =
    isAuthPage || isHome
      ? "/"
      : isMerchant
      ? "/merchant"
      : isAdmin
      ? "/admin"
      : "/dashboard";

  const homeHref = isMerchant
    ? "/merchant"
    : isAdmin
    ? "/admin"
    : "/dashboard";

  const isActive = (href: string) => currentPath === href;

  useEffect(() => {
    // On ferme le menu quand on change de page
    setMenuOpen(false);
  }, [currentPath]);

  const handleLogout = async () => {
    setLogoutError(null);
    const { error } = await supabase.auth.signOut();

    if (error) {
      console.error("Erreur signOut depuis le header :", error.message);
      setLogoutError("Déconnexion impossible pour le moment.");
      return;
    }

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
          href={logoHref}
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
            MENU CLIENT / COMMERCANT / ADMIN
           ============================ */}
        {isClientArea && (
          <nav
            style={{
              display: "flex",
              gap: "8px",
              flexShrink: 0,
            }}
          >
            {/* Accueil (client / commerçant / admin) */}
            <Link
              href={homeHref}
              style={{
                padding: "6px 14px",
                borderRadius: "999px",
                fontSize: "14px",
                fontWeight: 600,
                border: "1px solid rgba(15, 23, 42, 0.08)",
                backgroundColor: isActive(homeHref) ? "#111827" : "#FFFFFF",
                color: isActive(homeHref) ? "#FFFFFF" : "#111827",
                textDecoration: "none",
                whiteSpace: "nowrap",
              }}
            >
              Accueil
            </Link>

            {/* Bouton Transactions – UNIQUEMENT pour les comptes commerçants */}
            {isMerchant && (
              <Link
                href="/merchant/transactions"
                style={{
                  padding: "6px 14px",
                  borderRadius: "999px",
                  fontSize: "14px",
                  fontWeight: 600,
                  border: "1px solid rgba(15, 23, 42, 0.08)",
                  backgroundColor: isActive("/merchant/transactions")
                    ? "#111827"
                    : "#FFFFFF",
                  color: isActive("/merchant/transactions")
                    ? "#FFFFFF"
                    : "#111827",
                  textDecoration: "none",
                  whiteSpace: "nowrap",
                }}
              >
                Transactions
              </Link>
            )}

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
                  minWidth: "260px",
                  display: "flex",
                  flexDirection: "column",
                  gap: "4px",
                  zIndex: 40,
                }}
              >
                {/* === SECTION COMMERCANT : QR + Paramètres === */}
                {isMerchant && (
                  <>
                    {/* QR Code commerçant */}
                    <Link
                      href="/merchant"
                      onClick={() => setMenuOpen(false)}
                      style={{
                        padding: "8px 12px",
                        borderRadius: "10px",
                        fontSize: "14px",
                        textDecoration: "none",
                        color: "#111827",
                        display: "flex",
                        alignItems: "center",
                        gap: "8px",
                      }}
                    >
                      <span>📌</span>
                      <span>Mon QR code commerçant</span>
                    </Link>

                    {/* Paramètres commerçant */}
                    <Link
                      href="/merchant/settings"
                      onClick={() => setMenuOpen(false)}
                      style={{
                        padding: "8px 12px",
                        borderRadius: "10px",
                        fontSize: "14px",
                        textDecoration: "none",
                        color: "#111827",
                        display: "flex",
                        alignItems: "center",
                        gap: "8px",
                      }}
                    >
                      <span>⚙️</span>
                      <span>Paramètres commerçant</span>
                    </Link>
                  </>
                )}

                {/* Liens généraux */}
                <Link
                  href="/commerces"
                  onClick={() => setMenuOpen(false)}
                  style={{
                    padding: "8px 12px",
                    borderRadius: "10px",
                    fontSize: "14px",
                    textDecoration: "none",
                    color: "#111827",
                    display: "flex",
                    alignItems: "center",
                    gap: "8px",
                  }}
                >
                  <span>🏪</span>
                  <span>Commerçants partenaires</span>
                </Link>

                <Link
                  href="/parrainage"
                  onClick={() => setMenuOpen(false)}
                  style={{
                    padding: "8px 12px",
                    borderRadius: "10px",
                    fontSize: "14px",
                    textDecoration: "none",
                    color: "#111827",
                    display: "flex",
                    alignItems: "center",
                    gap: "8px",
                  }}
                >
                  <span>🤝</span>
                  <span>Parrainer un ami</span>
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
                    display: "flex",
                    alignItems: "center",
                    gap: "8px",
                  }}
                >
                  <span>📖</span>
                  <span>Comment ça marche ?</span>
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
                    display: "flex",
                    alignItems: "center",
                    gap: "8px",
                  }}
                >
                  <span>❓</span>
                  <span>FAQ</span>
                </Link>

                <Link
                  href="/contact"
                  onClick={() => setMenuOpen(false)}
                  style={{
                    padding: "8px 12px",
                    borderRadius: "10px",
                    fontSize: "14px",
                    textDecoration: "none",
                    color: "#111827",
                    display: "flex",
                    alignItems: "center",
                    gap: "8px",
                  }}
                >
                  <span>✉️</span>
                  <span>Contact</span>
                </Link>

                <Link
                  href="/mentions-legales"
                  onClick={() => setMenuOpen(false)}
                  style={{
                    padding: "8px 12px",
                    borderRadius: "10px",
                    fontSize: "14px",
                    textDecoration: "none",
                    color: "#111827",
                    display: "flex",
                    alignItems: "center",
                    gap: "8px",
                  }}
                >
                  <span>📄</span>
                  <span>Mentions légales</span>
                </Link>

                <Link
                  href="/cgu"
                  onClick={() => setMenuOpen(false)}
                  style={{
                    padding: "8px 12px",
                    borderRadius: "10px",
                    fontSize: "14px",
                    textDecoration: "none",
                    color: "#111827",
                    display: "flex",
                    alignItems: "center",
                    gap: "8px",
                  }}
                >
                  <span>📜</span>
                  <span>CGU</span>
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
                    display: "flex",
                    alignItems: "center",
                    gap: "8px",
                  }}
                >
                  <span>🚪</span>
                  <span>Se déconnecter</span>
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
