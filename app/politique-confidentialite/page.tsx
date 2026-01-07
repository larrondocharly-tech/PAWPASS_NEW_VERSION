'use client';

import TopNav from '@/components/TopNav';

export default function PolitiqueConfidentialitePage() {
  return (
    <main className="container" style={{ maxWidth: 800 }}>
      <TopNav title="Politique de confidentialité" />

      <section className="card" style={{ marginBottom: 24 }}>
        <h1>Politique de confidentialité</h1>
        <p className="helper">
          Cette politique décrit la manière dont PawPass collecte et traite vos données.
        </p>
      </section>

      <section className="card" style={{ marginBottom: 16 }}>
        <h2>Données collectées</h2>
        <p>
          Les données nécessaires à la création du compte, au suivi des transactions et à la gestion
          des crédits PawPass peuvent être collectées.
        </p>
      </section>

      <section className="card" style={{ marginBottom: 16 }}>
        <h2>Finalité des données</h2>
        <p>
          Les informations sont utilisées pour fournir le service, améliorer l’expérience utilisateur
          et communiquer des informations importantes liées à PawPass.
        </p>
      </section>

      <section className="card" style={{ marginBottom: 16 }}>
        <h2>Conservation</h2>
        <p>
          Les données sont conservées pendant la durée nécessaire à la fourniture du service et en
          conformité avec les obligations légales.
        </p>
      </section>

      <section className="card">
        <h2>Vos droits</h2>
        <p>
          Vous disposez de droits d’accès, de rectification et de suppression de vos données, ainsi
          que d’un droit d’opposition ou de limitation du traitement.
        </p>
      </section>
    </main>
  );
}
