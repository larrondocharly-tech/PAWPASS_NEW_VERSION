'use client';

import TopNav from '@/components/TopNav';

export default function MentionsLegalesPage() {
  return (
    <main className="container" style={{ maxWidth: 800 }}>
      <TopNav title="Mentions légales" />

      <section className="card" style={{ marginBottom: 24 }}>
        <h1>Mentions légales</h1>
        <p className="helper">Informations légales et contact PawPass.</p>
      </section>

      <section className="card" style={{ marginBottom: 16 }}>
        <h2>Éditeur du site</h2>
        <p>PawPass SAS (placeholder) – 123 rue des Animaux, 75000 Paris.</p>
      </section>

      <section className="card" style={{ marginBottom: 16 }}>
        <h2>Responsable de la publication</h2>
        <p>Direction PawPass (placeholder).</p>
      </section>

      <section className="card" style={{ marginBottom: 16 }}>
        <h2>Hébergement</h2>
        <p>Vercel / Supabase (placeholder) – infrastructure cloud sécurisée.</p>
      </section>

      <section className="card" style={{ marginBottom: 16 }}>
        <h2>Contact</h2>
        <p>contact@pawpass.app</p>
      </section>

      <section className="card">
        <h2>Informations complémentaires</h2>
        <p>
          PawPass gère uniquement des crédits de fidélité et de cashback. Aucun flux bancaire direct
          n’est traité par la plateforme.
        </p>
      </section>
    </main>
  );
}
