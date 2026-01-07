'use client';

import Link from 'next/link';
import TopNav from '@/components/TopNav';

export default function HelpPage() {
  return (
    <div className="container">
      <TopNav title="Comment fonctionne PawPass ?" />

      <div className="grid grid-2">
        <div className="card">
          <h2>Après paiement</h2>
          <p className="helper">💳 Cashback après l’achat</p>
          <ol>
            <li>Vous payez normalement chez le commerçant.</li>
            <li>Vous scannez le QR PawPass.</li>
            <li>Vous saisissez le montant.</li>
            <li>Vous recevez du cashback en crédits PawPass.</li>
          </ol>
        </div>

        <div className="card">
          <h2>Avant paiement</h2>
          <p className="helper">🎟️ Réduction immédiate</p>
          <ol>
            <li>Vous scannez le QR avant de payer.</li>
            <li>Vous choisissez combien utiliser de votre cagnotte.</li>
            <li>Un écran de réduction s’affiche avec un timer.</li>
            <li>Vous montrez l’écran au commerçant, qui applique la remise.</li>
          </ol>
        </div>

        <div className="card">
          <h2>Dons aux SPA</h2>
          <p className="helper">🐾 Soutenir les associations</p>
          <p>
            Vous pouvez choisir de donner une partie ou la totalité de vos crédits à une SPA
            partenaire. PawPass collecte les crédits et les reverse aux associations dans un second
            temps.
          </p>
        </div>
      </div>

      <div style={{ marginTop: 24 }}>
        <Link className="button" href="/scan">
          Revenir au scan
        </Link>
      </div>
    </div>
  );
}
