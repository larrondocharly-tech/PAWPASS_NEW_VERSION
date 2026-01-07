'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabaseClient';
import type { UserRole } from '@/lib/types';
import Loader from './Loader';

interface AuthFormProps {
  mode: 'login' | 'register';
}

const roleOptions: UserRole[] = ['user', 'merchant'];

export default function AuthForm({ mode }: AuthFormProps) {
  const router = useRouter();
  const supabase = createClient();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<UserRole>('user');
  const [referralCode, setReferralCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);
    setLoading(true);

    if (mode === 'register') {
      const normalizedRole = role === 'merchant' ? 'merchant' : 'user';
      console.log('REGISTER role', role, 'normalized', normalizedRole);
      const { data, error: signUpError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            role: normalizedRole
          }
        }
      });

      if (signUpError) {
        setError(signUpError.message);
        setLoading(false);
        return;
      }

      console.log('signup user_metadata:', data.user?.user_metadata);

      let session = data.session ?? null;
      if (!session) {
        const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
          email,
          password
        });

        if (signInError) {
          setError(signInError.message);
          setLoading(false);
          return;
        }

        session = signInData.session;
      }

      if (!session) {
        setError('Impossible de démarrer une session.');
        setLoading(false);
        return;
      }

      const { error: roleError } = await supabase.rpc('set_my_role', {
        p_role: normalizedRole
      });

      if (roleError) {
        console.error('set_my_role error', roleError);
        setError('Impossible de mettre à jour le rôle.');
        setLoading(false);
        return;
      }

      const trimmedReferral = referralCode.trim();
      if (trimmedReferral) {
        const { error: referralError } = await supabase
          .from('profiles')
          .update({ referral_code_used: trimmedReferral })
          .eq('id', session.user.id);

        if (referralError) {
          console.error('referral_code_used update error', referralError);
          setError('Impossible d’enregistrer le code de parrainage.');
          setLoading(false);
          return;
        }
      }

      console.log('RPC set_my_role done', normalizedRole);
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
    const profileRole = profile.role?.toLowerCase();
    if (profileRole === 'merchant') {
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
        <label className="label" htmlFor="referralCode">
          Code de parrainage (optionnel)
          <input
            id="referralCode"
            className="input"
            type="text"
            value={referralCode}
            onChange={(event) => setReferralCode(event.target.value)}
            placeholder="Ex : PAWPASS-ABCD1234"
          />
        </label>
      )}
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
                {option === 'user' ? 'Client' : 'Commerçant'}
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
