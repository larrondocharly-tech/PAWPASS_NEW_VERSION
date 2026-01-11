// app/contact/page.tsx

export const dynamic = "force-dynamic";

export default function ContactPage() {
  return (
    <main
      className="container"
      style={{ maxWidth: 800, margin: "24px auto", padding: "0 16px" }}
    >
      <section className="card" style={{ marginBottom: 24 }}>
        <h1>Contact</h1>
        <p className="helper">
          Une question sur PawPass, un partenariat commerçant ou une
          suggestion&nbsp;? Vous pouvez nous contacter via les informations
          ci-dessous.
        </p>
      </section>

      <section className="card" style={{ marginBottom: 24 }}>
        <h2>Par email</h2>
        <p>
          Écrivez-nous à&nbsp;:
          <br />
          <strong>contact.pawpass@gmail.com</strong>
        </p>
      </section>

      <section className="card" style={{ marginBottom: 24 }}>
        <h2>Commerçants partenaires</h2>
        <p>
          Si vous êtes commerçant et que vous souhaitez rejoindre PawPass,
          vous pouvez aussi utiliser le formulaire &laquo;&nbsp;Devenir
          commerçant partenaire&nbsp;&raquo; dans l&apos;application.
        </p>
      </section>
    </main>
  );
}
