"use client";

import TopNav from '@/components/TopNav';
export const dynamic = "force-dynamic";





export default function CguPage() {
  return (
    <main className="container" style={{ maxWidth: 800 }}>
      <TopNav title="CGU" />

      <section className="card" style={{ marginBottom: 24 }}>
        <h1>Conditions Générales d’Utilisation</h1>
        <p className="helper">
          Ces conditions régissent l’utilisation de PawPass et de ses fonctionnalités.
        </p>
      </section>

      <section className="card" style={{ marginBottom: 16 }}>
        <h2>Objet du service</h2>
        <p>
          PawPass permet aux utilisateurs de collecter des crédits de cashback chez des commerçants
          partenaires et de les utiliser en réduction ou en don à des SPA.
        </p>
      </section>

      <section className="card" style={{ marginBottom: 16 }}>
        <h2>Utilisation du service</h2>
        <p>
          L’utilisateur s’engage à fournir des informations exactes et à utiliser l’application de
          manière conforme à la réglementation en vigueur.
        </p>
      </section>

      <section className="card" style={{ marginBottom: 16 }}>
        <h2>Responsabilité</h2>
        <p>
          PawPass met tout en œuvre pour assurer la disponibilité du service, sans pouvoir garantir
          une continuité absolue. Les crédits restent des avantages de fidélité et ne constituent pas
          une monnaie.
        </p>
      </section>

      <section className="card">
        <h2>Modifications</h2>
        <p>
          PawPass se réserve le droit de modifier les présentes conditions. Toute modification sera
          communiquée aux utilisateurs.
        </p>
      </section>
    </main>
  );
}
