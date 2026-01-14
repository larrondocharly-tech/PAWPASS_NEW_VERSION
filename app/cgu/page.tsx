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
        <p className="helper">Dernière mise à jour : 14/01/2026</p>
      </section>

      {/* 1. OBJET */}
      <section className="card" style={{ marginBottom: 24 }}>
        <h2>1. Objet</h2>
        <p>
          Les présentes Conditions Générales d&apos;Utilisation (CGU) ont pour objet
          d&apos;encadrer l&apos;accès et l&apos;usage de l&apos;application PawPass par les
          utilisateurs particuliers et les commerçants partenaires.
        </p>
        <p>
          En utilisant PawPass, vous acceptez pleinement les présentes CGU.
        </p>
      </section>

      {/* 2. DESCRIPTION DU SERVICE */}
      <section className="card" style={{ marginBottom: 24 }}>
        <h2>2. Fonctionnement du service PawPass</h2>
        <p>
          PawPass est une application permettant aux utilisateurs de cumuler du
          cashback lors de leurs achats chez les commerçants partenaires. Une
          partie de ce cashback peut être utilisée comme réduction lors de futurs
          achats, ou être reversée à une association de protection animale
          partenaire.
        </p>

        <p>
          PawPass agit en tant qu&apos;intermédiaire technique permettant la gestion
          du cashback solidaire, de la répartition définie par l&apos;utilisateur, et
          du suivi des montants destinés aux associations.
        </p>

        <p>
          Il est expressément indiqué que :
          <strong>
            {" "}
            Les contributions solidaires générées via PawPass ne constituent pas
            des dons ouvrant droit à déduction fiscale. Il s’agit d’un mécanisme
            commercial solidaire géré par PawPass.
          </strong>
        </p>

        <p>
          PawPass ne fournit aucun reçu fiscal et n’a pas le statut d’organisme
          permettant la délivrance d’attestations de dons ouvrant droit à
          réduction d’impôt.
        </p>
      </section>

      {/* 3. COMPORTEMENT UTILISATEURS */}
      <section className="card" style={{ marginBottom: 24 }}>
        <h2>3. Engagements des utilisateurs</h2>
        <p>
          Les utilisateurs s&apos;engagent à utiliser PawPass dans le respect des lois
          en vigueur et à fournir des informations exactes lors de leur
          inscription. Toute tentative de fraude, manipulation ou utilisation
          abusive du système pourra entraîner la suspension ou la suppression du
          compte.
        </p>
      </section>

      {/* 4. RESPONSABILITÉS */}
      <section className="card" style={{ marginBottom: 24 }}>
        <h2>4. Responsabilités</h2>
        <p>
          PawPass s’efforce d’assurer un service fiable et disponible. Toutefois,
          la société ne saurait être tenue responsable :
        </p>
        <ul>
          <li>des interruptions liées à des opérations techniques,</li>
          <li>des indisponibilités dues à des services tiers,</li>
          <li>des erreurs causées par une mauvaise utilisation de l&apos;application,</li>
          <li>
            des actions ou omissions des commerçants partenaires ou des
            associations.
          </li>
        </ul>
      </section>

      {/* 5. DONNÉES PERSONNELLES */}
      <section className="card" style={{ marginBottom: 24 }}>
        <h2>5. Données personnelles</h2>
        <p>
          PawPass collecte les données strictement nécessaires au fonctionnement
          du service. Ces données ne sont en aucun cas revendues à des tiers.
        </p>
        <p>
          Conformément à la réglementation, vous disposez d’un droit d’accès, de
          rectification et de suppression de vos données personnelles. Vous
          pouvez exercer ce droit via le formulaire de contact présent dans
          l&apos;application.
        </p>
      </section>

      {/* 6. MODIFICATION DES CGU */}
      <section className="card" style={{ marginBottom: 24 }}>
        <h2>6. Modification des CGU</h2>
        <p>
          PawPass se réserve le droit de modifier les présentes CGU à tout
          moment. Les utilisateurs seront informés en cas de modification
          substantielle.
        </p>
      </section>

      {/* 7. CONTACT */}
      <section className="card" style={{ marginBottom: 24 }}>
        <h2>7. Contact</h2>
        <p>
          Pour toute question concernant les présentes CGU ou l&apos;utilisation du
          service, vous pouvez contacter l&apos;équipe PawPass via l’adresse e-mail
          indiquée dans l&apos;application ou depuis la page Contact.
        </p>
      </section>
    </main>
  );
}
