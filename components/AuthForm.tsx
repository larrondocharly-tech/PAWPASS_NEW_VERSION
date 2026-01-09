'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabaseClient';

type Mode = 'login' | 'register';

interface AuthFormProps {
  mode: Mode;
}

export default function AuthForm({ mode }: AuthFormProps) {
  const router = useRouter();
  const supabase = createClient();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isLogin = mode === 'login';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);

    try {
      if (isLogin) {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password
        });

        if (error) {
          setError(error.message);
          setIsSubmitting(false);
          return;
        }

        router.push('/dashboard');
      } else {
        const { error } = await supabase.auth.signUp({
          email,
          password
        });

        if (error) {
          setError(error.message);
          setIsSubmitting(false);
          return;
        }

        router.push('/dashboard');
      }
    } catch (err: any) {
      setError(err?.message ?? 'Une erreur est survenue.');
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} style={{ marginTop: '24px' }}>
      {/* Email */}
      <label className="label">
        Email
        <input
          type="email"
          required
          className="input"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="vous@exemple.fr"
        />
      </label>

      {/* Mot de passe */}
      <label className="label">
        Mot de passe
        <input
          type="password"
          required
          minLength={6}
          className="input"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="••••••••"
        />
      </label>

      <p className="helper">
        6 caractères minimum. Tu pourras le modifier plus tard.
      </p>

      {/* Erreur */}
      {error && <p className="error">{error}</p>}

      {/* Bouton */}
      <button
        type="submit"
        disabled={isSubmitting}
        className="button"
        style={{
          width: '100%',
          marginTop: '20px',
          opacity: isSubmitting ? 0.7 : 1,
          cursor: isSubmitting ? 'not-allowed' : 'pointer'
        }}
      >
        {isSubmitting
          ? isLogin
            ? 'Connexion en cours...'
            : 'Inscription en cours...'
          : isLogin
          ? 'Se connecter'
          : 'Créer mon compte'}
      </button>

      <p className="helper" style={{ textAlign: 'center', marginTop: '8px' }}>
        En continuant, vous acceptez les CGU de PawPass.
      </p>
    </form>
  );
}
