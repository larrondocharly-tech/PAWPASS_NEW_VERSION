"use client";

import Link from 'next/link';
import TopNav from '@/components/TopNav';
export const dynamic = "force-dynamic";

export default function HowItWorksPage() {
  return (
    <main className="container">

      <section className="card" style={{ marginBottom: 24 }}>
        <h1>Comment fonctionne PawPass ?</h1>
        <p className="helper">
          PawPass vous permet de gagner du cashback, de l’utiliser en réduction, et de soutenir des
          SPA partenaires.
        </p>
      </section>

      <section
        className="grid"
        style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))' }}
      >
        <div className="card">
          <h2>Après paiement</h2>
          <ol>
            <li>Payez normalement chez un commerçant partenaire.</li>
            <li>Scannez le QR PawPass à la caisse.</li>
            <li>Saisissez le montant payé.</li>
            <li>Recevez du cashback en crédits PawPass sur votre cagnotte.</li>
          </ol>
        </div>
        <div className="card">
          <h2>Avant paiement (réduction immédiate)</h2>
          <ol>
            <li>Scannez le QR avant de payer.</li>
            <li>Choisissez le montant de réduction à utiliser depuis votre cagnotte.</li>
            <li>Un écran de réduction s’affiche avec un compte à rebours de 3 minutes.</li>
            <li>Montrez l’écran au commerçant, qui applique la remise.</li>
          </ol>
        </div>
        <div className="card">
          <h2>Dons aux SPA</h2>
          <ol>
            <li>
              À chaque cashback, vous pouvez choisir de reverser une partie ou la totalité à une SPA
              partenaire.
            </li>
            <li>PawPass agrège vos dons en crédits, puis les reverse aux associations.</li>
            <li>Vous pouvez suivre le total donné aux SPA dans votre tableau de bord.</li>
          </ol>
        </div>
      </section>

      <section style={{ marginTop: 24, display: 'flex', gap: 12, flexWrap: 'wrap' }}>
        <Link className="button" href="/scan">
          Aller au scanner
        </Link>
        <Link className="button secondary" href="/dashboard">
          Voir mon tableau de bord
        </Link>
      </section>
    </main>
  );
}
