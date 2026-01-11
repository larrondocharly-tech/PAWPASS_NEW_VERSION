// app/cgu/page.tsx

export const dynamic = "force-dynamic";

export default function CguPage() {
  return (
    <main
      className="container"
      style={{ maxWidth: 800, margin: "24px auto", padding: "0 16px" }}
    >
      <section className="card" style={{ marginBottom: 24 }}>
        <h1>Conditions Générales d&apos;Utilisation</h1>
        <p className="helper">
          Dernière mise à jour : 11/01/2026
        </p>
      </section>

      <section className="card" style={{ marginBottom: 24 }}>
        <h2>1. Objet</h2>
        <p>
          Ces Conditions Générales d&apos;Utilisation (CGU) encadrent
          l&apos;utilisation de l&apos;application PawPass par les
          utilisateurs particuliers et les commerçants partenaires.
        </p>
      </section>

      <section className="card" style={{ marginBottom: 24 }}>
        <h2>2. Fonctionnement de PawPass</h2>
        <p>
          PawPass permet aux utilisateurs de cumuler du cashback chez les
          commerçants partenaires et de reverser une partie de ce cashback à
          des associations de protection animale.
        </p>
      </section>

      <section className="card" style={{ marginBottom: 24 }}>
        <h2>3. Responsabilités</h2>
        <p>
          PawPass met tout en œuvre pour assurer le bon fonctionnement du
          service mais ne peut être tenu responsable des interruptions liées
          à des problèmes techniques indépendants de sa volonté.
        </p>
      </section>

      <section className="card" style={{ marginBottom: 24 }}>
        <h2>4. Données personnelles</h2>
        <p>
          Les données collectées via l&apos;application sont utilisées
          uniquement pour le fonctionnement du service et ne sont pas
          revendues à des tiers. Vous pouvez demander la suppression de vos
          données à tout moment.
        </p>
      </section>

      <section className="card" style={{ marginBottom: 24 }}>
        <h2>5. Contact</h2>
        <p>
          Pour toute question liée aux présentes CGU, vous pouvez contacter
          l&apos;équipe PawPass via l&apos;adresse indiquée dans l&apos;application.
        </p>
      </section>
    </main>
  );
}
