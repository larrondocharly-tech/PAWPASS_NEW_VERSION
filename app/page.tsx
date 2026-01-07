// Landing publique PawPass (accessible sans connexion)
import Link from 'next/link';
import Image from 'next/image';

export default function LandingPage() {
  return (
    <main className="container" style={{ maxWidth: 1120 }}>
      <header
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 16,
          padding: '12px 0 24px'
        }}
      >
        <Image src="/pawpass-logo.svg" alt="PawPass" width={160} height={80} priority />
        <nav style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
          <a href="#avantages">Avantages</a>
          <a href="#comment-ca-marche">Comment ça marche ?</a>
          <a href="#commercants">Commerçants</a>
          <a href="#telecharger">Télécharger l’application</a>
        </nav>
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
          <Link href="/login">Connexion</Link>
          <Link className="button" href="/register">
            Inscription
          </Link>
        </div>
      </header>

      <section
        style={{
          display: 'grid',
          gap: 24,
          gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
          alignItems: 'center',
          background: '#f8fafc',
          borderRadius: 20,
          padding: 32
        }}
      >
        <div>
          <h1>Gagnez en soutenant les animaux</h1>
          <p className="helper" style={{ fontSize: '1rem' }}>
            PawPass transforme vos achats chez les commerçants partenaires en cashback solidaire.
            Utilisez vos crédits en réduction immédiate ou reversez-les à une SPA locale.
          </p>
          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginTop: 16 }}>
            <Link className="button" href="/register">
              Créer mon compte
            </Link>
            <a className="button secondary" href="#comment-ca-marche">
              Voir comment ça marche
            </a>
          </div>
          <p className="helper" style={{ marginTop: 12 }}>
            Pas de synchronisation bancaire, uniquement des crédits PawPass.
          </p>
        </div>
        <div className="card" style={{ minHeight: 220 }}>
          <h3>Aperçu de votre cagnotte</h3>
          <p className="helper">Solde disponible</p>
          <p style={{ fontSize: '2rem', fontWeight: 700, margin: '8px 0' }}>18,40 €</p>
          <div className="grid" style={{ gap: 8 }}>
            <div className="badge">+2,10 € cashback aujourd’hui</div>
            <div className="badge">3 dons SPA ce mois-ci</div>
          </div>
        </div>
      </section>

      <section id="avantages" style={{ marginTop: 48 }}>
        <h2>Pourquoi utiliser PawPass ?</h2>
        <div className="grid grid-2" style={{ marginTop: 16 }}>
          {[
            {
              icon: '💸',
              title: 'Du cashback à chaque achat',
              text: 'Gagnez des crédits PawPass chez les commerçants partenaires.'
            },
            {
              icon: '⚡️',
              title: 'Réduction immédiate',
              text: 'Utilisez votre cagnotte avant de payer pour réduire la note.'
            },
            {
              icon: '🐾',
              title: 'Soutien aux SPA',
              text: 'Partagez votre cashback avec les associations locales en un clic.'
            },
            {
              icon: '📊',
              title: 'Suivi clair',
              text: 'Visualisez vos gains et vos dons dans un tableau de bord simple.'
            }
          ].map((item) => (
            <div key={item.title} className="card" style={{ padding: 20 }}>
              <div style={{ fontSize: '1.6rem' }}>{item.icon}</div>
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
            gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))'
          }}
        >
          {[
            'Créez votre compte PawPass.',
            'Scannez le QR du commerçant après avoir payé, ou avant pour utiliser votre cagnotte.',
            'Recevez des crédits de cashback sur votre compte PawPass.',
            'Choisissez : réduction immédiate ou don à une SPA partenaire.'
          ].map((step, index) => (
            <div key={step} className="card">
              <div className="badge">Étape {index + 1}</div>
              <p style={{ marginTop: 12 }}>{step}</p>
            </div>
          ))}
        </div>
        <div style={{ marginTop: 16 }}>
          <Link className="button" href="/register">
            Commencer avec PawPass
          </Link>
        </div>
      </section>

      <section id="commercants" style={{ marginTop: 48 }}>
        <div className="card">
          <h2>Vous êtes commerçant ?</h2>
          <p className="helper">
            PawPass vous aide à fidéliser vos clients tout en valorisant un engagement pour les
            animaux. Suivez le chiffre d’affaires généré depuis votre espace dédié.
          </p>
          <div className="grid grid-2" style={{ marginTop: 16 }}>
            {[
              'Attirez et fidélisez de nouveaux clients',
              'Valorisez un engagement pour les animaux',
              'Suivez les performances sur un tableau de bord simple'
            ].map((item) => (
              <div key={item} className="card" style={{ padding: 16 }}>
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
        <div className="card">
          <h2>Installez PawPass sur votre téléphone</h2>
          <p className="helper">
            L’application arrive bientôt sur iOS et Android pour un accès instantané à vos crédits.
          </p>
          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginTop: 16 }}>
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
          borderTop: '1px solid #e2e8f0',
          paddingTop: 24,
          paddingBottom: 24,
          display: 'flex',
          flexWrap: 'wrap',
          gap: 16,
          justifyContent: 'space-between',
          alignItems: 'center'
        }}
      >
        <div>
          <p style={{ margin: 0, fontWeight: 600 }}>PawPass – Le cashback qui aide les animaux.</p>
          <p className="helper" style={{ marginTop: 6 }}>
            © PawPass {new Date().getFullYear()}
          </p>
        </div>
        <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
          <Link href="/faq">FAQ</Link>
          <Link href="/contact">Contact</Link>
          <Link href="/mentions-legales">Mentions légales</Link>
          <Link href="/cgu">CGU</Link>
          <Link href="/politique-confidentialite">Politique de confidentialité</Link>
        </div>
      </footer>
    </main>
  );
}
