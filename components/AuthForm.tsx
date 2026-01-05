'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabaseClient';
import type { UserRole } from '@/lib/types';
import Loader from './Loader';

interface AuthFormProps {
  mode: 'login' | 'register';
}

const roleOptions: UserRole[] = ['client', 'merchant'];

export default function AuthForm({ mode }: AuthFormProps) {
  const router = useRouter();
  const supabase = createClient();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<UserRole>('client');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);
    setLoading(true);

    if (mode === 'register') {
      const { error: signUpError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            role
          }
        }
      });

      if (signUpError) {
        setError(signUpError.message);
        setLoading(false);
        return;
      }

      setLoading(false);
      router.push('/login');
      return;
    }

    const { data, error: signInError } = await supabase.auth.signInWithPassword({
      email,
      password
    });

    if (signInError) {
      setError(signInError.message);
      setLoading(false);
      return;
    }

    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', data.user.id)
      .single();

    if (profileError) {
      setError(profileError.message);
      setLoading(false);
      return;
    }

    setLoading(false);
    if (profile.role === 'merchant') {
      router.push('/merchant');
    } else {
      router.push('/dashboard');
    }
  };

  return (
    <form className="card" onSubmit={handleSubmit}>
      <h2>{mode === 'login' ? 'Connexion' : 'Créer un compte'}</h2>
      <label className="label" htmlFor="email">
        Email
        <input
          id="email"
          className="input"
          type="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          required
        />
      </label>
      <label className="label" htmlFor="password">
        Mot de passe
        <input
          id="password"
          className="input"
          type="password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          required
        />
      </label>
      {mode === 'register' && (
        <label className="label" htmlFor="role">
          Rôle
          <select
            id="role"
            className="select"
            value={role}
            onChange={(event) => setRole(event.target.value as UserRole)}
          >
            {roleOptions.map((option) => (
              <option key={option} value={option}>
                {option === 'client' ? 'Client' : 'Commerçant'}
              </option>
            ))}
          </select>
          <p className="helper">Le rôle est enregistré dans public.profiles.role.</p>
        </label>
      )}
      {error && <p className="error">{error}</p>}
      <button className="button" type="submit" disabled={loading}>
        {loading ? <Loader label="Chargement..." /> : mode === 'login' ? 'Se connecter' : 'Créer le compte'}
      </button>
    </form>
  );
}
