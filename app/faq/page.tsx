'use client';

import TopNav from '@/components/TopNav';

const faqItems = [
  {
    question: 'PawPass, c’est quoi ?',
    answer:
      'PawPass est une app de cashback solidaire qui permet de gagner des crédits et de soutenir des SPA partenaires.'
  },
  {
    question: 'D’où vient l’argent du cashback ?',
    answer:
      'Le cashback est financé par les commerçants partenaires, comme une remise fidélité. PawPass ne prélève rien sur le compte bancaire des utilisateurs.'
  },
  {
    question: 'Est-ce que PawPass est gratuit pour les utilisateurs ?',
    answer:
      'Oui, l’inscription et l’utilisation sont gratuites pour les clients (hors éventuelle offre premium à venir).'
  },
  {
    question: 'Comment sont reversés les dons aux SPA ?',
    answer:
      'Les dons sont cumulés en crédits, puis PawPass organise un reversement périodique et transparent aux associations partenaires.'
  },
  {
    question: 'Est-ce que je peux utiliser ma cagnotte en réduction ?',
    answer:
      'Oui, avec le mode « Avant paiement », vous pouvez transformer vos crédits en réduction immédiate chez les commerçants partenaires.'
  },
  {
    question: 'Que se passe-t-il si mon coupon de réduction expire ?',
    answer:
      'Le coupon expiré n’est plus utilisable. Vos crédits restent disponibles tant que la réduction n’a pas été consommée.'
  }
];

export default function FaqPage() {
  return (
    <main className="container">
      <TopNav title="FAQ" />

      <section className="card" style={{ marginBottom: 24 }}>
        <h1>FAQ – Questions fréquentes</h1>
        <p className="helper">Trouvez rapidement les réponses aux questions les plus courantes.</p>
      </section>

      <section className="grid" style={{ gap: 16 }}>
        {faqItems.map((item) => (
          <div key={item.question} className="card">
            <h3 style={{ marginTop: 0 }}>{item.question}</h3>
            <p className="helper" style={{ margin: 0 }}>
              {item.answer}
            </p>
          </div>
        ))}
      </section>
    </main>
  );
}
