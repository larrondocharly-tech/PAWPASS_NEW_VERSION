"use client";

import Image from "next/image";
import Link from "next/link";

export default function HomePage() {
  return (
    <main>

      {/* ===========================
          VERSION MOBILE – MOCKUP EXACT
      ============================ */}
      <section className="mobile-only" style={{ padding: "16px" }}>

        {/* Logo */}
        <div style={{ textAlign: "center", marginBottom: "14px" }}>
          <Image
            src="/pawpass-logo.jpg"
            alt="PawPass"
            width={150}
            height={70}
            style={{ margin: "0 auto" }}
          />
        </div>

        {/* Boutons mobile */}
        <div
          style={{
            display: "flex",
            justifyContent: "center",
            gap: "16px",
            marginBottom: "24px",
          }}
        >
          <Link
            href="/login"
            className="button secondary"
            style={{
              padding: "10px 22px",
              borderRadius: "18px",
              fontWeight: 600,
              color: "#0e3a4a",
            }}
          >
            Connexion
          </Link>

          <Link
            href="/register"
            className="button"
            style={{
              padding: "10px 22px",
              borderRadius: "18px",
              background: "#ff8a42",
              color: "white",
              fontWeight: 600,
              boxShadow: "0 6px 16px rgba(255,138,66,0.4)",
            }}
          >
            Inscription
          </Link>
        </div>

        {/* HERO MOBILE */}
        <div
          className="hero-card"
          style={{
            padding: "24px",
            borderRadius: "24px",
            background: "white",
            marginBottom: "32px",
            position: "relative",
            overflow: "hidden",
          }}
        >
          <p
            style={{
              textAlign: "center",
              color: "#ff6f2c",
              fontWeight: 700,
              fontSize: "0.9rem",
              marginBottom: "8px",
            }}
          >
            CASHBACK SOLIDAIRE
          </p>

          <h1
            style={{
              textAlign: "center",
              fontSize: "1.9rem",
              fontWeight: 800,
              marginBottom: "12px",
              lineHeight: 1.25,
            }}
          >
            Soutenez les animaux <br />
            en faisant vos achats
          </h1>

          <p
            style={{
              textAlign: "center",
              marginBottom: "20px",
              color: "#4c6b76",
            }}
          >
            Cumulez du cashback en aidant les refuges locaux.
          </p>

          {/* Illustration mobile */}
          <div style={{ textAlign: "center" }}>
            <Image
              src="/hero-spa.png.jpg"
              alt="Chien et chat devant une SPA"
              width={380}
              height={380}
              priority
              className="hero-illustration"
              style={{
                width: "82%",
                height: "auto",
                margin: "0 auto 24px auto",
                display: "block",
                borderRadius: "16px",
              }}
            />
          </div>

          {/* CTA */}
          <div style={{ marginTop: "14px" }}>
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
                marginBottom: "16px",
                textAlign: "center",
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

          <h1 style={{ marginTop: "16px" }}>Gagnez en soutenant les animaux</h1>

          <p style={{ maxWidth: "480px", marginBottom: "32px" }}>
            PawPass transforme vos achats en cashback solidaire, utilisable en réduction ou en don à une SPA locale.
          </p>

          <div style={{ display: "flex", gap: "16px" }}>
            <Link href="/register" className="button" style={{ padding: "14px 20px", borderRadius: "16px" }}>
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
