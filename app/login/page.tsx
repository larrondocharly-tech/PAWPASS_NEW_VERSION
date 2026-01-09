'use client';

import Link from 'next/link';
import AuthForm from '@/components/AuthForm';

export default function LoginPage() {
  return (
    <main>
      <div className="container">
        <div className="card">
          <Link href="/" className="text-sm">
            ← Retour
          </Link>

          <h1 style={{ marginTop: '16px', fontSize: '2rem', fontWeight: 700 }}>
            Connexion
          </h1>

          <p className="helper" style={{ marginTop: '4px', maxWidth: '480px' }}>
            Retrouvez votre cagnotte PawPass et vos dons aux refuges.
          </p>

          {/* Formulaire */}
          <div style={{ marginTop: '24px' }}>
            <AuthForm mode="login" />
          </div>

          <p className="helper" style={{ marginTop: '16px' }}>
            Pas encore de compte ?{' '}
            <Link href="/register">
              <span style={{ color: 'var(--primary)', fontWeight: 600 }}>
                Créer un compte
              </span>
            </Link>
          </p>
        </div>
      </div>
    </main>
  );
}
