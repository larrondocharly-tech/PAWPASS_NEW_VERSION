"use client";

export default function CommentCaMarchePage() {
  return (
    <div
      style={{
        maxWidth: 960,
        margin: "0 auto",
        padding: "32px 20px",
      }}
    >
      <h1 style={{ fontSize: 28, fontWeight: 700, marginBottom: 16 }}>
        Comment ça marche ?
      </h1>

      <p style={{ marginBottom: 28, fontSize: 16, lineHeight: 1.6 }}>
        PawPass transforme vos achats du quotidien en soutien pour les refuges animaliers,
        tout en vous permettant d'accumuler du cashback.
      </p>

      <Section
        title="1. Scannez le QR Code du commerçant"
        text="Lors de votre passage en caisse, scannez le QR Code PawPass du commerce partenaire. Cela enregistre automatiquement votre achat."
      />

      <Section
        title="2. Gagnez du cashback sur chaque achat"
        text="Chaque commerçant offre un pourcentage de cashback. Ce montant est ajouté à votre cagnotte PawPass."
      />

      <Section
        title="3. Soutenez une SPA locale"
        text="À chaque scan, vous choisissez automatiquement de donner 50% ou 100% de votre cashback à une SPA partenaire de votre choix."
      />

      <Section
        title="4. Utilisez vos crédits chez les commerçants"
        text="Vous pouvez utiliser votre cagnotte pour réduire votre prochain achat. Le commerçant valide la réduction sur sa page dédiée."
      />

      <Section
        title="5. Suivez vos dons et vos achats"
        text="Votre tableau de bord récapitule vos transactions, le cashback gagné, les dons envoyés aux SPA et toutes vos réductions."
      />
    </div>
  );
}

function Section({ title, text }: { title: string; text: string }) {
  return (
    <div style={{ marginBottom: 32 }}>
      <h2 style={{ fontSize: 20, fontWeight: 700, marginBottom: 8 }}>
        {title}
      </h2>
      <p style={{ fontSize: 15, lineHeight: 1.6 }}>{text}</p>
    </div>
  );
}
