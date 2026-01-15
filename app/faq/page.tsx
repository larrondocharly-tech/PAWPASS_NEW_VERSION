// app/faq/page.tsx

export const dynamic = "force-dynamic";

export default function FaqPage() {
  return (
    <main
      className="container"
      style={{ maxWidth: 800, margin: "24px auto", padding: "0 16px" }}
    >
      <section className="card" style={{ marginBottom: 24 }}>
        <h1>FAQ - Questions fréquentes</h1>
        <p className="helper">
          Retrouvez ici les réponses aux questions les plus fréquentes sur
          l&apos;utilisation de PawPass.
        </p>
      </section>

      <section className="card" style={{ marginBottom: 24 }}>
        <h2>Comment je gagne du cashback ?</h2>
        <p>
          En scannant le QR code d&apos;un commerçant partenaire avant de
          payer ou en enregistrant vos achats via l&apos;application, vous
          cumulez du cashback sur votre cagnotte PawPass.
        </p>
      </section>

      <section className="card" style={{ marginBottom: 24 }}>
        <h2>Comment fonctionnent les dons aux SPA ?</h2>
        <p>
          À chaque achat, une partie de votre cashback peut être reversée à
          une SPA partenaire. Vous choisissez l&apos;association et le
          pourcentage reversé dans l&apos;application.
        </p>
      </section>

      <section className="card" style={{ marginBottom: 24 }}>
        <h2>Quand puis-je utiliser ma cagnotte ?</h2>
        <p>
          Dès que votre cagnotte atteint le montant minimum défini dans
          l&apos;application, vous pouvez l&apos;utiliser chez les
          commerçants partenaires pour obtenir une réduction immédiate en
          caisse.
        </p>
      </section>

      <section className="card" style={{ marginBottom: 24 }}>
  <h2>Je suis commerçant, comment devenir partenaire ?</h2>
  <p>
    Lors de la création de votre compte sur PawPass, vous devez simplement
    cocher la case « Devenir commerçant partenaire ». Votre compte sera alors
    enregistré comme compte commerçant, puis placé en attente de validation
    par un administrateur. Une fois votre demande approuvée, vous aurez accès
    à votre QR code et à l’ensemble de votre espace commerçant.
  </p>
</section>


    </main>
  );
}
