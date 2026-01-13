"use client";

import Link from "next/link";
import Image from "next/image";
export const dynamic = "force-dynamic";

// Landing publique PawPass (accessible sans connexion)
export default function LandingPage() {
  const currentYear = new Date().getFullYear();

  return (
    <main style={{ background: "#FAFAF5" }}>
      <div className="container" style={{ maxWidth: 1120 }}>
        {/* ========= VERSION MOBILE ========= */}
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

          <section
            style={{
              padding: "8px 0 24px",
              textAlign: "center",
              display: "flex",
              flexDirection: "column",
              gap: 16,
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
                  color: "#222222",
                  fontSize: "1.7rem",
                  lineHeight: 1.2,
                  marginBottom: 8,
                }}
              >
                Gagnez en soutenant les animaux
              </h1>
              <p
                className="helper"
                style={{
                  fontSize: "0.95rem",
                  color: "#666666",
                  margin: "0 auto",
                  maxWidth: 340,
                }}
              >
                PawPass transforme vos achats chez les commerçants partenaires
                en cashback solidaire, utilisable en réduction ou en don à une
                SPA locale.
              </p>
            </div>

            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: 10,
                marginTop: 8,
              }}
            >
              <Link
                className="button"
                href="/register"
                style={{
                  background: "#FF7A3C",
                  color: "white",
                  width: "100%",
                }}
              >
                Créer mon compte
              </Link>
              <Link
                className="button secondary"
                href="/login"
                style={{ width: "100%" }}
              >
                Connexion
              </Link>
              <a
                className="button secondary"
                href="#comment-ca-marche"
                style={{
                  width: "100%",
                  borderStyle: "dashed",
                  borderColor: "#4CAF50",
                  background: "transparent",
                }}
              >
                Voir comment ça marche
              </a>
            </div>

            <p
              className="helper"
              style={{
                marginTop: 8,
                color: "#666666",
              }}
            >
              Pas encore de compte ? Scannez un commerçant, validez votre achat
              et créez votre compte après.
            </p>
          </section>
        </div>

        {/* ========= VERSION DESKTOP ========= */}
        <div className="desktop-only">
          <header
            style={{
              display: "flex",
              flexWrap: "wrap",
              alignItems: "center",
              justifyContent: "space-between",
              gap: 16,
              padding: "12px 0 24px",
            }}
          >
            <Image
              src="/pawpass-logo.jpg"
              alt="PawPass"
              width={160}
              height={80}
              priority
            />
            <nav
              style={{ display: "flex", gap: 16, flexWrap: "wrap", fontSize: 14 }}
            >
              <a href="#avantages">Avantages</a>
              <a href="#comment-ca-marche">Comment ça marche ?</a>
              <a href="#commercants">Commerçants</a>
              <a href="#telecharger">Télécharger l’application</a>
            </nav>
            <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
              <Link className="button secondary" href="/login">
                Connexion
              </Link>
              <Link
                className="button"
                href="/register"
                style={{ background: "#FF7A3C", color: "white" }}
              >
                Inscription
              </Link>
            </div>
          </header>

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
              <div>
                <p
                  style={{
                    fontSize: 12,
                    fontWeight: 600,
                    textTransform: "uppercase",
                    letterSpacing: "0.08em",
                    color: "#FF7A3C",
                    marginBottom: 8,
                  }}
                >
                  Cashback solidaire
                </p>
                <h1 style={{ color: "#222222", fontSize: "2.2rem" }}>
                  Gagnez en soutenant les animaux
                </h1>
                <p
                  className="helper"
                  style={{ fontSize: "1rem", color: "#666666" }}
                >
                  PawPass transforme vos achats chez les commerçants partenaires
                  en cashback solidaire, utilisable en réduction ou en don à une
                  SPA locale.
                </p>
              </div>
              <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
                <Link
                  className="button"
                  href="/register"
                  style={{ background: "#FF7A3C", color: "white" }}
                >
                  Créer mon compte
                </Link>
                <a className="button secondary" href="#comment-ca-marche">
                  Voir comment ça marche
                </a>
                <Link
                  className="button secondary"
                  href="/scan"
                  style={{
                    borderColor: "#4CAF50",
                    color: "#1B5E20",
                    background: "transparent",
                  }}
                >
                  📱 Scanner pour la première fois
                </Link>
              </div>
              <p className="helper" style={{ marginTop: 4, color: "#666666" }}>
                Pas encore de compte ? Scannez un commerçant, validez votre achat
                et créez votre compte après.
              </p>
            </div>
            <div className="card" style={{ minHeight: 220, borderRadius: 16 }}>
              <h3>Aperçu de votre cagnotte</h3>
              <p className="helper">Solde disponible</p>
              <p
                style={{
                  fontSize: "2rem",
                  fontWeight: 700,
                  margin: "8px 0",
                }}
              >
                18,40 €
              </p>
              <div className="grid" style={{ gap: 8 }}>
                <div className="badge">+2,10 € cashback aujourd’hui</div>
                <div className="badge">3 dons SPA ce mois-ci</div>
              </div>
            </div>
          </section>
        </div>

        {/* ========= SECTIONS COMMUNES (mobile + desktop) ========= */}

        <section id="avantages" style={{ marginTop: 48 }}>
          <h2>Pourquoi utiliser PawPass ?</h2>
          <div className="grid grid-2" style={{ marginTop: 16 }}>
            {[
              {
                icon: "💸",
                title: "Du cashback à chaque achat",
                text: "Gagnez des crédits PawPass chez les commerçants partenaires.",
              },
              {
                icon: "⚡️",
                title: "Réduction immédiate",
                text: "Utilisez votre cagnotte avant de payer pour réduire la note.",
              },
              {
                icon: "🐾",
                title: "Soutien aux SPA",
                text: "Partagez votre cashback avec les associations locales en un clic.",
              },
              {
                icon: "📊",
                title: "Suivi clair",
                text: "Visualisez vos gains et vos dons dans un tableau de bord simple.",
              },
            ].map((item) => (
              <div
                key={item.title}
                className="card"
                style={{ padding: 20, borderRadius: 16 }}
              >
                <div style={{ fontSize: "1.6rem" }}>{item.icon}</div>
                <h3 style={{ marginTop: 8 }}>{item.title}</h3>
                <p className="helper">{item.text}</p>
              </div>
            ))}
          </div>
        </section>

        <section id="comment-ca-marche" style={{ marginTop: 48 }}>
          <h2>Comment ça marche ?</h2>
          <div
            className="grid"
            style={{
              marginTop: 16,
              gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
            }}
          >
            {[
              "Créez votre compte PawPass.",
              "Scannez le QR du commerçant après avoir payé, ou avant pour utiliser votre cagnotte.",
              "Recevez des crédits de cashback sur votre compte PawPass.",
              "Choisissez : réduction immédiate ou don à une SPA partenaire.",
            ].map((step, index) => (
              <div key={step} className="card" style={{ borderRadius: 16 }}>
                <div className="badge">Étape {index + 1}</div>
                <p style={{ marginTop: 12 }}>{step}</p>
              </div>
            ))}
          </div>
          <div style={{ marginTop: 16 }}>
            <Link
              className="button"
              href="/register"
              style={{ background: "#FF7A3C", color: "white" }}
            >
              Commencer avec PawPass
            </Link>
          </div>
        </section>

        <section id="commercants" style={{ marginTop: 48 }}>
          <div className="card" style={{ borderRadius: 16 }}>
            <h2>Vous êtes commerçant ?</h2>
            <p className="helper">
              PawPass vous aide à fidéliser vos clients tout en valorisant un
              engagement pour les animaux. Suivez le chiffre d’affaires généré
              depuis votre espace dédié.
            </p>
            <div className="grid grid-2" style={{ marginTop: 16 }}>
              {[
                "Attirez et fidélisez de nouveaux clients",
                "Valorisez un engagement pour les animaux",
                "Suivez les performances sur un tableau de bord simple",
              ].map((item) => (
                <div
                  key={item}
                  className="card"
                  style={{ padding: 16, borderRadius: 16 }}
                >
                  {item}
                </div>
              ))}
            </div>
            <div style={{ marginTop: 16 }}>
              <Link className="button secondary" href="/merchant">
                Découvrir PawPass pour les commerçants
              </Link>
            </div>
          </div>
        </section>

        <section id="telecharger" style={{ marginTop: 48 }}>
          <div className="card" style={{ borderRadius: 16 }}>
            <h2>Installez PawPass sur votre téléphone</h2>
            <p className="helper">
              L’application arrive bientôt sur iOS et Android pour un accès
              instantané à vos crédits.
            </p>
            <div
              style={{
                display: "flex",
                gap: 12,
                flexWrap: "wrap",
                marginTop: 16,
              }}
            >
              <a className="button" href="#">
                Disponible prochainement sur l’App Store
              </a>
              <a className="button secondary" href="#">
                Disponible prochainement sur Google Play
              </a>
            </div>
          </div>
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
            alignItems: "center",
          }}
        >
          <div>
            <p style={{ margin: 0, fontWeight: 600 }}>
              PawPass – Le cashback qui aide les animaux.
            </p>
            <p className="helper" style={{ marginTop: 6 }}>
              © PawPass {currentYear}
            </p>
          </div>
          <div style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
            <Link href="/faq">FAQ</Link>
            <Link href="/contact">Contact</Link>
            <Link href="/mentions-legales">Mentions légales</Link>
            <Link href="/politique-confidentialite">
              Politique de confidentialité
            </Link>
          </div>
        </footer>
      </div>
    </main>
  );
}
