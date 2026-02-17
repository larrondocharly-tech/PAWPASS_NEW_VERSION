"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useLayoutEffect, useRef, useState } from "react";
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
  const [isSpa, setIsSpa] = useState(false); // ✅ NEW

  const [hoveredHref, setHoveredHref] = useState<string | null>(null);

  const loadingRef = useRef(false);

  const dropdownRef = useRef<HTMLDivElement | null>(null);
  const menuBtnRef = useRef<HTMLButtonElement | null>(null);

  // ✅ mesure automatique de la hauteur du header pour le spacer
  const headerRef = useRef<HTMLElement | null>(null);
  const [headerH, setHeaderH] = useState<number>(0);

  useLayoutEffect(() => {
    const el = headerRef.current;
    if (!el) return;

    const measure = () => {
      const h = el.offsetHeight || 0;
      setHeaderH(h);
    };

    measure();

    const ro = new ResizeObserver(() => measure());
    ro.observe(el);

    window.addEventListener("resize", measure);

    return () => {
      ro.disconnect();
      window.removeEventListener("resize", measure);
    };
  }, []);

  useEffect(() => {
    let isMounted = true;

    const applyNoUser = () => {
      if (!isMounted) return;
      setIsMerchant(false);
      setIsAdmin(false);
      setIsSpa(false);
    };

    const loadProfile = async () => {
      if (loadingRef.current) return;
      loadingRef.current = true;

      try {
        const {
          data: { user },
          error: userError,
        } = await supabase.auth.getUser();

        if (userError || !user) {
          applyNoUser();
          return;
        }

        const { data: profile, error: profileError } = await supabase
          .from("profiles")
          .select("role, merchant_id")
          .eq("id", user.id)
          .maybeSingle<Profile>();

        if (!isMounted) return;

        if (profileError || !profile) {
          if (profileError) console.error("Erreur chargement profil header :", profileError);
          applyNoUser();
          return;
        }

        const role = profile.role?.toLowerCase() || null;

        // ✅ NEW : détection SPA
        setIsSpa(role === "spa");

        // inchangé
        setIsMerchant(role === "merchant" || profile.merchant_id !== null);
        setIsAdmin(role === "admin");
      } finally {
        loadingRef.current = false;
      }
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
  const isSpaArea = currentPath.startsWith("/spa"); // ✅ NEW

  // ✅ NEW: inclure /spa pour afficher le header/menu sur l’espace SPA
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
    isAdminArea ||
    isSpaArea;

  const isLogin = currentPath === "/login";
  const isRegister = currentPath === "/register";
  const isHome = currentPath === "/";
  const isAuthPage = isLogin || isRegister;

  // ✅ NEW : logo/home pour SPA
  const logoHref = isAuthPage || isHome ? "/" : isSpa ? "/spa" : isMerchant ? "/merchant" : isAdmin ? "/admin" : "/dashboard";
  const homeHref = isSpa ? "/spa" : isMerchant ? "/merchant" : isAdmin ? "/admin" : "/dashboard";

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

  useEffect(() => {
    if (!menuOpen) return;

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setMenuOpen(false);
    };

    const onPointerDown = (e: MouseEvent | PointerEvent) => {
      const target = e.target as Node | null;
      if (!target) return;

      if (menuBtnRef.current && menuBtnRef.current.contains(target)) return;
      if (dropdownRef.current && dropdownRef.current.contains(target)) return;

      setMenuOpen(false);
    };

    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("pointerdown", onPointerDown);

    return () => {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("pointerdown", onPointerDown);
    };
  }, [menuOpen]);

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
    <>
      <header
        ref={headerRef}
        className="pp-header"
        style={{
          position: "fixed",
          top: 0,
          left: 0,
          right: 0,
          zIndex: 1000,

          background: "rgba(255, 255, 255, 0.72)",
          backdropFilter: "blur(10px)",
          WebkitBackdropFilter: "blur(10px)",
          borderBottom: "1px solid rgba(0,0,0,0.06)",

          paddingTop: 6,
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
              textShadow: "0 1px 0 rgba(255,255,255,0.35)",
            }}
          >
            PawPass
          </Link>

          {isClientArea && (
            <nav style={{ display: "flex", gap: "8px", flexShrink: 0 }}>
              {/* ✅ SPA: bouton "Accueil" devient "Tableau SPA" */}
              <Link
                href={homeHref}
                style={{
                  padding: "6px 14px",
                  borderRadius: "999px",
                  fontSize: "14px",
                  fontWeight: 600,
                  border: "1px solid rgba(15, 23, 42, 0.08)",
                  backgroundColor: isActive(homeHref) ? "#111827" : "rgba(255,255,255,0.92)",
                  color: isActive(homeHref) ? "#FFFFFF" : "#111827",
                  textDecoration: "none",
                  whiteSpace: "nowrap",
                  backdropFilter: "blur(8px)",
                  WebkitBackdropFilter: "blur(8px)",
                }}
              >
                {isSpa ? "Tableau SPA" : "Accueil"}
              </Link>

              <button
                ref={menuBtnRef}
                type="button"
                onClick={() => setMenuOpen((prev) => !prev)}
                aria-label="Ouvrir le menu"
                aria-expanded={menuOpen}
                style={{
                  width: 44,
                  height: 38,
                  borderRadius: 999,
                  border: "1px solid rgba(15, 23, 42, 0.08)",
                  backgroundColor: "rgba(255,255,255,0.92)",
                  color: "#111827",
                  cursor: "pointer",
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  backdropFilter: "blur(8px)",
                  WebkitBackdropFilter: "blur(8px)",
                }}
              >
                <span className="ppHamburger" aria-hidden="true">
                  <span />
                  <span />
                  <span />
                </span>
              </button>

              {menuOpen && (
                <div
                  ref={dropdownRef}
                  data-dropdown
                  style={{
                    position: "absolute",
                    top: "46px",
                    right: "16px",
                    background: "rgba(255, 255, 255, 0.98)",
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
                    zIndex: 2000,
                  }}
                >
                  {/* ✅ SPA MENU MINIMAL */}
                  {isSpa ? (
                    <>
                      <Link
                        href="/spa"
                        onClick={() => setMenuOpen(false)}
                        {...itemHandlers("/spa")}
                        style={menuItemStyle(hoveredHref === "/spa")}
                      >
                        <span>📊</span>
                        <span>Tableau SPA</span>
                      </Link>

                      <div style={{ borderTop: "1px solid rgba(0,0,0,0.08)", margin: "6px 0 4px" }} />

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
                        <div style={{ marginTop: "4px", fontSize: "11px", color: "#b91c1c" }}>
                          {logoutError}
                        </div>
                      )}
                    </>
                  ) : (
                    <>
                      {/* ✅ MENU EXISTANT (inchangé) */}
                      <Link
                        href="/scan"
                        onClick={() => setMenuOpen(false)}
                        {...itemHandlers("/scan")}
                        style={menuItemStyle(hoveredHref === "/scan")}
                      >
                        <span>📷</span>
                        <span>Scanner (achat)</span>
                      </Link>

                      <Link
                        href="/scan?mode=coupon"
                        onClick={() => setMenuOpen(false)}
                        {...itemHandlers("/scan?mode=coupon")}
                        style={menuItemStyle(hoveredHref === "/scan?mode=coupon")}
                      >
                        <span>🎟️</span>
                        <span>Utiliser mes crédits</span>
                      </Link>

                      {isMerchant && (
                        <Link
                          href="/merchant/transactions"
                          onClick={() => setMenuOpen(false)}
                          {...itemHandlers("/merchant/transactions")}
                          style={menuItemStyle(hoveredHref === "/merchant/transactions")}
                        >
                          <span>📊</span>
                          <span>Transactions</span>
                        </Link>
                      )}

                      {isMerchant && (
                        <Link
                          href="/dashboard"
                          onClick={() => setMenuOpen(false)}
                          {...itemHandlers("/dashboard")}
                          style={menuItemStyle(hoveredHref === "/dashboard")}
                        >
                          <span>👤</span>
                          <span>Mon tableau de bord (client)</span>
                        </Link>
                      )}

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

                      <div style={{ borderTop: "1px solid rgba(0,0,0,0.08)", margin: "6px 0 4px" }} />

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
                        <div style={{ marginTop: "4px", fontSize: "11px", color: "#b91c1c" }}>
                          {logoutError}
                        </div>
                      )}
                    </>
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

        <style jsx global>{`
          .ppHamburger {
            width: 18px;
            height: 12px;
            display: inline-flex;
            flex-direction: column;
            justify-content: space-between;
          }
          .ppHamburger span {
            height: 2px;
            border-radius: 999px;
            background: #111827;
            display: block;
            opacity: 0.9;
          }
        `}</style>
      </header>

      {/* ✅ Spacer auto (hauteur exacte du header) */}
      <div aria-hidden="true" style={{ height: headerH }} />
    </>
  );
}
