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

  // ✅ hover (PC) — on grise UNIQUEMENT au survol
  const [hoveredHref, setHoveredHref] = useState<string | null>(null);

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

    loadProfile();

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

  const logoHref =
    isAuthPage || isHome
      ? "/"
      : isMerchant
      ? "/merchant"
      : isAdmin
      ? "/admin"
      : "/dashboard";

  const homeHref = isMerchant ? "/merchant" : isAdmin ? "/admin" : "/dashboard";

  const isActive = (href: string) => currentPath === href;

  const menuItemStyle = (hovered: boolean) => ({
    padding: "8px 12px",
    borderRadius: "10px",
    fontSize: "14px",
    textDecoration: "none",
    color: "#111827",
    display: "flex",
    alignItems: "center",
    gap: "8px",
    backgroundColor: hovered ? "rgba(17, 24, 39, 0.08)" : "transparent",
    transition: "background-color 0.12s ease",
  });

  const itemHandlers = (href: string) => ({
    onMouseEnter: () => setHoveredHref(href),
    onMouseLeave: () => setHoveredHref(null),
    onFocus: () => setHoveredHref(href),
    onBlur: () => setHoveredHref(null),
  });

  useEffect(() => {
    setMenuOpen(false);
    setHoveredHref(null);
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

        {isClientArea && (
          <nav style={{ display: "flex", gap: "8px", flexShrink: 0 }}>
            {/* ✅ On garde uniquement Accueil + Menu */}
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

            {menuOpen && (
              <div
                data-dropdown
                style={{
                  position: "absolute",
                  top: "46px",
                  right: "16px",
                  background: "rgba(255, 255, 255, 0.94)",
                  borderRadius: "16px",
                  boxShadow: "0 20px 50px rgba(0, 0, 0, 0.18)",
                  border: "1px solid rgba(0, 0, 0, 0.06)",
                  backdropFilter: "blur(10px)",
                  WebkitBackdropFilter: "blur(10px)",
                  padding: "12px 8px",
                  minWidth: "260px",
                  display: "flex",
                  flexDirection: "column",
                  gap: "4px",
                  zIndex: 40,
                }}
              >
                {/* ✅ Scanner pour tout le monde */}
                <Link
                  href="/scan"
                  onClick={() => setMenuOpen(false)}
                  {...itemHandlers("/scan")}
                  style={menuItemStyle(hoveredHref === "/scan")}
                >
                  <span>📷</span>
                  <span>Scanner</span>
                </Link>

                {/* ✅ Transactions uniquement commerçant */}
                {isMerchant && (
                  <Link
                    href="/merchant/transactions"
                    onClick={() => setMenuOpen(false)}
                    {...itemHandlers("/merchant/transactions")}
                    style={menuItemStyle(
                      hoveredHref === "/merchant/transactions"
                    )}
                  >
                    <span>📊</span>
                    <span>Transactions</span>
                  </Link>
                )}

                {/* === SECTION COMMERCANT : QR + Paramètres === */}
                {isMerchant && (
                  <>
                    <Link
                      href="/merchant"
                      onClick={() => setMenuOpen(false)}
                      {...itemHandlers("/merchant")}
                      style={menuItemStyle(hoveredHref === "/merchant")}
                    >
                      <span>📌</span>
                      <span>Mon QR code commerçant</span>
                    </Link>

                    <Link
                      href="/merchant/settings"
                      onClick={() => setMenuOpen(false)}
                      {...itemHandlers("/merchant/settings")}
                      style={menuItemStyle(hoveredHref === "/merchant/settings")}
                    >
                      <span>⚙️</span>
                      <span>Paramètres commerçant</span>
                    </Link>
                  </>
                )}

                <Link
                  href="/commerces"
                  onClick={() => setMenuOpen(false)}
                  {...itemHandlers("/commerces")}
                  style={menuItemStyle(hoveredHref === "/commerces")}
                >
                  <span>🏪</span>
                  <span>Commerçants partenaires</span>
                </Link>

                <Link
                  href="/parrainage"
                  onClick={() => setMenuOpen(false)}
                  {...itemHandlers("/parrainage")}
                  style={menuItemStyle(hoveredHref === "/parrainage")}
                >
                  <span>🤝</span>
                  <span>Parrainer un ami</span>
                </Link>

                <Link
                  href="/comment-ca-marche"
                  onClick={() => setMenuOpen(false)}
                  {...itemHandlers("/comment-ca-marche")}
                  style={menuItemStyle(hoveredHref === "/comment-ca-marche")}
                >
                  <span>📖</span>
                  <span>Comment ça marche ?</span>
                </Link>

                <Link
                  href="/faq"
                  onClick={() => setMenuOpen(false)}
                  {...itemHandlers("/faq")}
                  style={menuItemStyle(hoveredHref === "/faq")}
                >
                  <span>❓</span>
                  <span>FAQ</span>
                </Link>

                <Link
                  href="/contact"
                  onClick={() => setMenuOpen(false)}
                  {...itemHandlers("/contact")}
                  style={menuItemStyle(hoveredHref === "/contact")}
                >
                  <span>✉️</span>
                  <span>Contact</span>
                </Link>

                <Link
                  href="/mentions-legales"
                  onClick={() => setMenuOpen(false)}
                  {...itemHandlers("/mentions-legales")}
                  style={menuItemStyle(hoveredHref === "/mentions-legales")}
                >
                  <span>📄</span>
                  <span>Mentions légales</span>
                </Link>

                <Link
                  href="/cgu"
                  onClick={() => setMenuOpen(false)}
                  {...itemHandlers("/cgu")}
                  style={menuItemStyle(hoveredHref === "/cgu")}
                >
                  <span>📜</span>
                  <span>CGU</span>
                </Link>

                <div
                  style={{
                    borderTop: "1px solid rgba(0,0,0,0.08)",
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

        {isLogin && (
          <nav style={{ display: "flex", gap: "8px", marginLeft: "auto" }}>
            <Link href="/register" style={{ fontSize: "14px", fontWeight: 600 }}>
              Créer un compte
            </Link>
          </nav>
        )}

        {isRegister && (
          <nav style={{ display: "flex", gap: "8px", marginLeft: "auto" }}>
            <Link href="/login" style={{ fontSize: "14px" }}>
              Connexion
            </Link>
          </nav>
        )}
      </div>
    </header>
  );
}
