"use client";

import Link from "next/link";
import Image from "next/image";
export const dynamic = "force-dynamic";

export default function LandingPage() {
  const currentYear = new Date().getFullYear();

  return (
    <main style={{ background: "#FAFAF5" }}>
      <div className="container" style={{ maxWidth: 1120 }}>
        {/* ======== VERSION MOBILE ======== */}
        <div className="mobile-only">
          <header
            style={{
              paddingTop: 8,
              paddingBottom: 16,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: 12,
            }}
          >
            <Image
              src="/pawpass-logo.jpg"
              alt="PawPass"
              width={140}
              height={70}
              priority
            />

            <div
              style={{
                display: "flex",
                gap: 8,
                flexWrap: "wrap",
                justifyContent: "center",
                marginTop: 4,
              }}
            >
              <Link
                href="/login"
                className="button secondary"
                style={{
                  padding: "8px 14px",
                  borderRadius: 999,
                  fontSize: 14,
                }}
              >
                Connexion
              </Link>
              <Link
                href="/register"
                className="button"
                style={{
                  padding: "8px 14px",
                  borderRadius: 999,
                  fontSize: 14,
                  background: "#FF7A3C",
                  color: "white",
                  boxShadow: "0 6px 14px rgba(255,122,60,0.35)",
                }}
              >
                Inscription
              </Link>
            </div>
          </header>

          {/* ==== HERO MOBILE ==== */}
          <section
            className="hero-card"
            style={{
              background: "#FFFFFF",
              borderRadius: 24,
              padding: "26px 18px 28px",
              boxShadow: "0 16px 40px rgba(15,23,42,0.12)",
              textAlign: "center",
              display: "flex",
              flexDirection: "column",
              gap: 18,
            }}
          >
            <div>
              <p
                style={{
                  fontSize: 11,
                  fontWeight: 600,
                  textTransform: "uppercase",
                  letterSpacing: "0.08em",
                  color: "#FF7A3C",
                  marginBottom: 8,
                }}
              >
                Cashback solidaire
              </p>

              <h1
                style={{
                  color: "#222",
                  fontSize: "1.8rem",
                  lineHeight: 1.25,
                  marginBottom: 8,
                }}
              >
                Soutenez les animaux<br />en faisant vos achats
              </h1>

              <p
                style={{
                  fontSize: "0.95rem",
                  color: "#666",
                  margin: "0 auto",
                  maxWidth: 320,
                }}
              >
                Cumulez du cashback en aidant les refuges locaux.
              </p>
            </div>

            {/* Illustration SPA */}
            <div style={{ marginTop: 8 }}>
              <Image
                src="/hero-spa.png"
                alt="Chien et chat devant une SPA"
                width={260}
                height={180}
                style={{
                  width: "100%",
                  height: "auto",
                  display: "block",
                  margin: "0 auto",
                }}
              />
            </div>

            {/* CTA */}
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: 10,
                marginTop: 10,
              }}
            >
              <Link
                className="button"
                href="/register"
                style={{ background: "#FF7A3C", color: "white", width: "100%" }}
              >
                Créer mon compte
              </Link>
              <Link className="button secondary" href="/login" style={{ width: "100%" }}>
                Connexion
              </Link>
            </div>
          </section>
        </div>

        {/* ======== VERSION DESKTOP ======== */}
        <div className="desktop-only">
          <header
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              padding: "12px 0 24px",
            }}
          >
            <Image src="/pawpass-logo.jpg" alt="PawPass" width={160} height={80} priority />

            <nav style={{ display: "flex", gap: 16, flexWrap: "wrap", fontSize: 14 }}>
              <a href="#avantages">Avantages</a>
              <a href="#comment-ca-marche">Comment ça marche ?</a>
              <a href="#commercants">Commerçants</a>
              <a href="#telecharger">Télécharger l’application</a>
            </nav>

            <div style={{ display: "flex", gap: 12 }}>
              <Link className="button secondary" href="/login">Connexion</Link>
              <Link
                className="button"
                href="/register"
                style={{ background: "#FF7A3C", color: "white" }}
              >
                Inscription
              </Link>
            </div>
          </header>

          {/* Desktop hero */}
          <section
            style={{
              display: "grid",
              gap: 32,
              gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
              alignItems: "center",
              padding: 8,
            }}
          >
            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              <p
                style={{
                  fontSize: 12,
                  fontWeight: 600,
                  textTransform: "uppercase",
                  color: "#FF7A3C",
                  marginBottom: 8,
                }}
              >
                Cashback solidaire
              </p>

              <h1 style={{ color: "#222", fontSize: "2.2rem" }}>
                Gagnez en soutenant les animaux
              </h1>

              <p style={{ fontSize: "1rem", color: "#666" }}>
                PawPass transforme vos achats en cashback solidaire, utilisable en réduction ou en
                don à une SPA locale.
              </p>

              <div style={{ display: "flex", gap: 12 }}>
                <Link className="button" href="/register" style={{ background: "#FF7A3C", color: "white" }}>
                  Créer mon compte
                </Link>
                <a className="button secondary" href="#comment-ca-marche">Voir comment ça marche</a>
              </div>
            </div>

            <Image
              src="/hero-spa.png"
              alt="SPA illustration"
              width={340}
              height={240}
              style={{ width: "100%", height: "auto" }}
            />
          </section>
        </div>

        {/* ======== SECTIONS COMMUNES ======== */}

        <section id="avantages" style={{ marginTop: 48 }}>
          <h2>Pourquoi utiliser PawPass ?</h2>
        </section>

        <footer
          style={{
            marginTop: 48,
            borderTop: "1px solid #e2e8f0",
            paddingTop: 24,
            paddingBottom: 24,
            display: "flex",
            flexWrap: "wrap",
            gap: 16,
            justifyContent: "space-between",
          }}
        >
          <div>
            <p style={{ margin: 0, fontWeight: 600 }}>
              PawPass – Le cashback qui aide les animaux.
            </p>
            <p style={{ marginTop: 6, color: "#666" }}>© PawPass {currentYear}</p>
          </div>

          <div style={{ display: "flex", gap: 16 }}>
            <Link href="/faq">FAQ</Link>
            <Link href="/contact">Contact</Link>
          </div>
        </footer>
      </div>
    </main>
  );
}
