"use client";

import Image from "next/image";
import Link from "next/link";

export default function HomePage() {
  return (
    <main>
      {/* ===========================
          VERSION MOBILE – NE PAS TOUCHER
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
              marginBottom: 8,
              color: "#4c6b76",
            }}
          >
            Cumulez du cashback en aidant les refuges locaux.
          </p>

          <p
            style={{
              textAlign: "center",
              marginBottom: 18,
              color: "#7a8e96",
              fontSize: "0.85rem",
              fontStyle: "italic",
            }}
          >
            « Les petits ruisseaux font les grandes rivières. »
          </p>

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
          VERSION DESKTOP – OPTION 3
      ============================ */}
      <section className="desktop-only" style={{ padding: "48px 20px" }}>
        <div
          className="container"
          style={{
            maxWidth: 1120,
            margin: "0 auto",
            display: "flex",
            alignItems: "center",
            gap: "48px",
          }}
        >
          {/* Colonne texte */}
          <div style={{ flex: 1, marginTop: "-40px" }}>
            <p
              style={{
                color: "#ff6f2c",
                fontWeight: 700,
                fontSize: "0.9rem",
                letterSpacing: "0.08em",
                textTransform: "uppercase",
                marginBottom: 8,
              }}
            >
              CASHBACK SOLIDAIRE
            </p>

            <h1
              style={{
                fontSize: "2.35rem",
                lineHeight: 1.2,
                marginBottom: 16,
              }}
            >
              Gagnez en soutenant
              <br />
              les animaux locaux
            </h1>

            <p
              style={{
                maxWidth: 520,
                marginBottom: 12,
                color: "#4c6b76",
                fontSize: "1rem",
              }}
            >
              PawPass transforme vos achats du quotidien en cashback solidaire,
              utilisable en réduction lors de vos prochaines visites ou reversé
              à une SPA partenaire de votre région.
            </p>

            <p
              style={{
                marginBottom: 24,
                color: "#7a8e96",
                fontSize: "0.95rem",
                fontStyle: "italic",
              }}
            >
              « Les petits ruisseaux font les grandes rivières. »
            </p>

            <div style={{ display: "flex", gap: "16px" }}>
              <Link
                href="/register"
                className="button"
                style={{
                  padding: "14px 22px",
                  borderRadius: "18px",
                  fontWeight: 700,
                }}
              >
                Créer mon compte
              </Link>

              <Link
                href="/comment-ca-marche"
                className="button secondary"
                style={{
                  padding: "14px 22px",
                  borderRadius: "18px",
                  fontWeight: 600,
                }}
              >
                Voir comment ça marche
              </Link>
            </div>
          </div>

          {/* Colonne image */}
          <div style={{ flex: 1 }}>
            <div
              style={{
                borderRadius: 28,
                overflow: "hidden",
                boxShadow: "0 24px 60px rgba(0,0,0,0.08)",
                maxWidth: "500px",
                margin: "0 auto",
              }}
            >
              <Image
                src="/hero-spa-full.png"
                alt="PawPass - Refuges et animaux"
                width={500}
                height={680}
                style={{
                  width: "100%",
                  height: "auto",
                  display: "block",
                }}
                priority
              />
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
