"use client";

import Image from "next/image";
import Link from "next/link";

export default function HomePage() {
  return (
    <main>
      {/* ===========================
          VERSION MOBILE – NOUVELLE VERSION
      ============================ */}
      <section className="mobile-only" style={{ padding: "16px" }}>
        <div
          className="hero-card"
          style={{
            borderRadius: 24,
            backgroundColor: "#ffffff",
            padding: "24px 24px 28px",
            boxShadow: "0 18px 40px rgba(0,0,0,0.06)",
          }}
        >
          {/* Texte principal */}
          <p
            style={{
              textAlign: "center",
              color: "#ff6f2c",
              fontWeight: 700,
              fontSize: "0.9rem",
              marginBottom: 8,
              letterSpacing: "0.08em",
              textTransform: "uppercase",
            }}
          >
            CASHBACK SOLIDAIRE
          </p>

          <h1
            style={{
              textAlign: "center",
              fontSize: "1.9rem",
              fontWeight: 800,
              marginBottom: 12,
              lineHeight: 1.25,
            }}
          >
            Soutenez les animaux <br />
            en faisant vos achats
          </h1>

          <p
            style={{
              textAlign: "center",
              marginBottom: 18,
              color: "#4c6b76",
            }}
          >
            Cumulez du cashback en aidant les refuges locaux.
          </p>

          {/* Illustration unique : logo + SPA + chien & chat */}
          <div style={{ marginBottom: 22 }}>
            <Image
              src="/hero-spa-full.png"
              alt="PawPass - SPA, chien et chat"
              width={768}
              height={1152}
              priority
              className="hero-illustration"
              style={{
                width: "100%",
                height: "auto",
                borderRadius: 22,
                display: "block",
              }}
            />
          </div>

          {/* CTA – une seule paire de boutons */}
          <div>
            <Link
              href="/register"
              className="button"
              style={{
                display: "block",
                width: "100%",
                padding: "14px 0",
                borderRadius: "18px",
                fontSize: "1.15rem",
                background: "#ff8a42",
                color: "white",
                marginBottom: "14px",
                textAlign: "center",
                fontWeight: 700,
                boxShadow: "0 10px 22px rgba(255,138,66,0.45)",
              }}
            >
              Créer mon compte
            </Link>

            <Link
              href="/login"
              className="button secondary"
              style={{
                display: "block",
                width: "100%",
                padding: "14px 0",
                borderRadius: "18px",
                border: "2px solid #2e7d66",
                fontSize: "1.15rem",
                textAlign: "center",
                color: "#0e3a4a",
                fontWeight: 700,
              }}
            >
              Connexion
            </Link>
          </div>
        </div>
      </section>

      {/* ===========================
          VERSION DESKTOP – NE PAS TOUCHER
      ============================ */}
      <section className="desktop-only" style={{ padding: "48px 20px" }}>
        <div className="container">
          <span
            style={{
              color: "#ff6f2c",
              fontWeight: 700,
              fontSize: "0.9rem",
            }}
          >
            CASHBACK SOLIDAIRE
          </span>

          <h1 style={{ marginTop: "16px" }}>
            Gagnez en soutenant les animaux
          </h1>

          <p style={{ maxWidth: "480px", marginBottom: "32px" }}>
            PawPass transforme vos achats en cashback solidaire, utilisable en
            réduction ou en don à une SPA locale.
          </p>

          <div style={{ display: "flex", gap: "16px" }}>
            <Link
              href="/register"
              className="button"
              style={{ padding: "14px 20px", borderRadius: "16px" }}
            >
              Créer mon compte
            </Link>

            <Link
              href="/how-it-works"
              className="button secondary"
              style={{ padding: "14px 20px", borderRadius: "16px" }}
            >
              Voir comment ça marche
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}
