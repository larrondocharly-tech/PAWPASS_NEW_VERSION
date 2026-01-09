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
        // Connexion
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });

        if (error) {
          setError(error.message);
          setIsSubmitting(false);
          return;
        }

        // Redirection vers le dashboard
        router.push('/dashboard');
      } else {
        // Inscription
        const { error } = await supabase.auth.signUp({
          email,
          password,
        });

        if (error) {
          setError(error.message);
          setIsSubmitting(false);
          return;
        }

        // Après inscription, on envoie aussi vers le dashboard
        router.push('/dashboard');
      }
    } catch (err: any) {
      setError(err?.message ?? 'Une erreur est survenue.');
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block mb-1 text-sm font-medium">Email</label>
        <input
          type="email"
          required
          className="w-full border rounded px-3 py-2"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="votre@email.fr"
        />
      </div>

      <div>
        <label className="block mb-1 text-sm font-medium">Mot de passe</label>
        <input
          type="password"
          required
          minLength={6}
          className="w-full border rounded px-3 py-2"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="••••••••"
        />
      </div>

      {error && (
        <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded px-3 py-2">
          {error}
        </p>
      )}

      <button
        type="submit"
        disabled={isSubmitting}
        className="w-full rounded px-4 py-2 bg-emerald-500 text-white font-semibold disabled:opacity-60"
      >
        {isSubmitting
          ? isLogin
            ? 'Connexion en cours...'
            : 'Inscription en cours...'
          : isLogin
          ? 'Se connecter'
          : "S'inscrire"}
      </button>
    </form>
  );
}
