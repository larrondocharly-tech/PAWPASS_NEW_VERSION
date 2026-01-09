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
          password,
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
          password,
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
    <form
      onSubmit={handleSubmit}
      className="mt-6 bg-white shadow-md rounded-xl p-6 space-y-4 max-w-md"
    >
      <div className="space-y-1">
        <label className="block text-sm font-medium text-slate-700">
          Email
        </label>
        <input
          type="email"
          required
          className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400 focus:border-emerald-400"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="vous@exemple.fr"
        />
      </div>

      <div className="space-y-1">
        <label className="block text-sm font-medium text-slate-700">
          Mot de passe
        </label>
        <input
          type="password"
          required
          minLength={6}
          className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400 focus:border-emerald-400"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="••••••••"
        />
        <p className="text-xs text-slate-500">
          6 caractères minimum. Tu pourras le modifier plus tard.
        </p>
      </div>

      {error && (
        <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
          {error}
        </p>
      )}

      <button
        type="submit"
        disabled={isSubmitting}
        className="w-full rounded-full px-4 py-2.5 bg-emerald-500 hover:bg-emerald-600 text-white font-semibold text-sm transition disabled:opacity-60 disabled:cursor-not-allowed"
      >
        {isSubmitting
          ? isLogin
            ? 'Connexion en cours...'
            : 'Inscription en cours...'
          : isLogin
          ? 'Se connecter'
          : "Créer mon compte"}
      </button>

      <p className="text-xs text-slate-500 text-center pt-1">
        En continuant, vous acceptez les CGU de PawPass.
      </p>
    </form>
  );
}
