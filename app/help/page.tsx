import Link from 'next/link';

export default function HelpPage() {
  return (
    <div className="container">
      <div className="nav">
        <strong>Comment ça marche ?</strong>
        <div className="nav-links">
          <Link href="/dashboard">Tableau de bord</Link>
          <Link href="/scan">Scanner</Link>
        </div>
      </div>

      <div className="grid grid-2">
        <div className="card">
          <h2>Recevoir du cashback (après paiement)</h2>
          <ul>
            <li>Payez normalement chez le commerçant.</li>
            <li>Scannez le QR après paiement et saisissez le montant.</li>
            <li>Ticket obligatoire au-delà de 50€.</li>
            <li>Choisissez : garder votre cashback ou le reverser.</li>
            <li>Anti-triche : 2h entre deux achats chez le même commerçant.</li>
          </ul>
        </div>
        <div className="card">
          <h2>Utiliser mes crédits (avant paiement)</h2>
          <ul>
            <li>Scannez le QR avant de payer.</li>
            <li>Choisissez le montant à utiliser.</li>
            <li>Un écran “Montrez au commerçant” s’affiche.</li>
            <li>Timer 3 minutes pour validation commerçant.</li>
            <li>Le commerçant approuve puis consomme la réduction.</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
