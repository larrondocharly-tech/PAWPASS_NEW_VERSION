// app/help/page.tsx

export const dynamic = "force-dynamic";

export default function HelpPage() {
  return (
    <main
      className="container"
      style={{ maxWidth: 900, margin: "24px auto", padding: "0 16px" }}
    >
      <section className="card" style={{ marginBottom: 24 }}>
        <h1>Comment fonctionne PawPass ?</h1>
        <p className="helper">
          PawPass vous permet de gagner du cashback chez les commerçants
          partenaires et de soutenir des refuges pour animaux à chaque achat.
        </p>
      </section>

      <div className="grid grid-2" style={{ gap: 16 }}>
        <div className="card">
          <h2>1. Créez votre compte</h2>
          <p>
            Inscrivez-vous gratuitement sur PawPass, puis connectez-vous pour
            accéder à votre tableau de bord, scanner les QR codes et suivre
            votre cagnotte.
          </p>
        </div>

        <div className="card">
          <h2>2. Scannez chez les commerçants</h2>
          <p>
            En caisse, scannez le QR code du commerce avec l&apos;onglet
            &laquo;&nbsp;Scanner&nbsp;&raquo; de l&apos;application pour
            enregistrer vos achats et déclencher le cashback.
          </p>
        </div>

        <div className="card">
          <h2>3. Gagnez du cashback</h2>
          <p>
            Une partie du montant de vos achats est reversée sur votre cagnotte
            PawPass. Le pourcentage dépend du commerçant partenaire.
          </p>
        </div>

        <div className="card">
          <h2>4. Soutenez une SPA</h2>
          <p>
            À chaque transaction, une partie de votre cashback peut être donnée
            à une SPA partenaire. Vous choisissez à qui vous souhaitez donner.
          </p>
        </div>

        <div className="card">
          <h2>5. Utilisez vos crédits</h2>
          <p>
            Quand votre cagnotte atteint le seuil minimum, utilisez
            l&apos;onglet &laquo;&nbsp;Utiliser mes crédits&nbsp;&raquo; pour
            obtenir une réduction immédiate chez un commerçant partenaire.
          </p>
        </div>

        <div className="card">
          <h2>6. Suivez votre historique</h2>
          <p>
            Dans l&apos;onglet &laquo;&nbsp;Historique&nbsp;&raquo;, retrouvez
            toutes vos transactions, le cashback gagné et les dons effectués aux
            refuges.
          </p>
        </div>
      </div>
    </main>
  );
}
