import Link from 'next/link';

export default function LandingPage() {
  return (
    <div className="container">
      <div className="nav">
        <strong>PawPass</strong>
        <div className="nav-links">
          <Link href="/login">Connexion</Link>
          <Link href="/register">Créer un compte</Link>
        </div>
      </div>
      <div className="card">
        <h1>Le cashback solidaire, simple et transparent.</h1>
        <p>
          PawPass permet aux clients de scanner le QR code fixe d’un commerçant, saisir un
          montant et choisir de garder leur cashback ou le reverser à une association.
        </p>
        <div style={{ display: 'flex', gap: 12, marginTop: 20 }}>
          <Link className="button" href="/register">
            Commencer
          </Link>
          <Link className="button secondary" href="/login">
            J’ai déjà un compte
          </Link>
        </div>
      </div>
    </div>
  );
}
