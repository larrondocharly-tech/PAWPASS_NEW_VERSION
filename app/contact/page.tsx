"use client";

import { useState } from 'react';
import TopNav from '@/components/TopNav';
export const dynamic = "force-dynamic";





interface ContactFormState {
  name: string;
  email: string;
  subject: string;
  message: string;
}

export default function ContactPage() {
  const [formState, setFormState] = useState<ContactFormState>({
    name: '',
    email: '',
    subject: '',
    message: ''
  });
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);

  const handleChange = (field: keyof ContactFormState, value: string) => {
    setFormState((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);
    setStatus(null);

    const trimmedName = formState.name.trim();
    const trimmedEmail = formState.email.trim();
    const trimmedMessage = formState.message.trim();

    if (!trimmedName || !trimmedEmail || !trimmedMessage) {
      setError('Veuillez renseigner votre nom, email et message.');
      return;
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail)) {
      setError('Veuillez saisir une adresse e-mail valide.');
      return;
    }

    console.log('[Contact] message', {
      name: trimmedName,
      email: trimmedEmail,
      subject: formState.subject.trim(),
      message: trimmedMessage
    });

    setStatus('Merci, votre message a été envoyé.');
    setFormState({ name: '', email: '', subject: '', message: '' });
  };

  return (
    <main className="container">
      <TopNav title="Contact" />

      <section className="card" style={{ marginBottom: 24 }}>
        <h1>Contact</h1>
        <p className="helper">Une question, une idée, un problème ? Écrivez-nous.</p>
      </section>

      <section className="grid grid-2" style={{ alignItems: 'start' }}>
        <div className="card">
          <h2>Envoyer un message</h2>
          <form onSubmit={handleSubmit}>
            <label className="label" htmlFor="contactName">
              Nom
              <input
                id="contactName"
                className="input"
                value={formState.name}
                onChange={(event) => handleChange('name', event.target.value)}
                required
              />
            </label>
            <label className="label" htmlFor="contactEmail">
              Adresse e-mail
              <input
                id="contactEmail"
                className="input"
                type="email"
                value={formState.email}
                onChange={(event) => handleChange('email', event.target.value)}
                required
              />
            </label>
            <label className="label" htmlFor="contactSubject">
              Sujet
              <input
                id="contactSubject"
                className="input"
                value={formState.subject}
                onChange={(event) => handleChange('subject', event.target.value)}
              />
            </label>
            <label className="label" htmlFor="contactMessage">
              Message
              <textarea
                id="contactMessage"
                className="input"
                rows={6}
                value={formState.message}
                onChange={(event) => handleChange('message', event.target.value)}
                required
              />
            </label>
            {error && <p className="error">{error}</p>}
            {status && <p>{status}</p>}
            <button className="button" type="submit" style={{ marginTop: 12 }}>
              Envoyer le message
            </button>
          </form>
        </div>
        <div className="card">
          <h2>Autres moyens de contact</h2>
          <p className="helper" style={{ marginTop: 0 }}>
            Vous pouvez également nous contacter par e-mail :
          </p>
          <p>
            <strong>contact@pawpass.app</strong>
          </p>
          <p className="helper">Nous répondons généralement sous 48h ouvrées.</p>
        </div>
      </section>
    </main>
  );
}
