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
  const [merchantName, setMerchantName] = useState('');
  const [merchantCity, setMerchantCity] = useState('');
  const [merchantAddress, setMerchantAddress] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);
    setLoading(true);

    if (mode === 'register') {
      const normalizedRole = role === 'merchant' ? 'merchant' : 'user';
      const isMerchant = normalizedRole === 'merchant';
      const trimmedMerchantName = merchantName.trim();
      const trimmedMerchantCity = merchantCity.trim();
      const trimmedMerchantAddress = merchantAddress.trim();

      if (isMerchant && (!trimmedMerchantName || !trimmedMerchantCity)) {
        setError('Veuillez renseigner le nom et la ville du commerce.');
        setLoading(false);
        return;
      }

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
=======
    // 🔹 INSCRIPTION
    if (mode === 'register') {
      try {
        const normalizedRole = role === 'merchant' ? 'merchant' : 'user';
        const trimmedReferral = referralCode.trim() || null;


        console.log('REGISTER role', role, 'normalized', normalizedRole);

        // 1) Création du compte auth
        const { data, error: signUpError } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: {
              role: normalizedRole,
            },
          },
        });

        console.log('signUp data:', data, 'error:', signUpError);

        if (signUpError) {
          // Message plus clair si email déjà utilisé
          if (signUpError.message.includes('Database error saving new user')) {
            setError("Cet email est déjà utilisé ou une erreur est survenue lors de la création du compte.");
          } else {
            setError(signUpError.message);
          }
          setLoading(false);
          return;
        }

        const user = data.user;
        if (!user) {
          setError('Impossible de créer le compte utilisateur.');
          setLoading(false);
          return;
        }

        // 2) Création / mise à jour du profil dans public.profiles
        const { error: profileError } = await supabase
          .from('profiles')
          .upsert(
            {
              id: user.id,
              role: normalizedRole,
              referral_code_used: trimmedReferral,
              created_at: new Date().toISOString(),
            },
            { onConflict: 'id' }
          );

        console.log('profile upsert error:', profileError);

        if (profileError) {
          setError("Le compte a été créé mais le profil n'a pas pu être enregistré.");
          setLoading(false);
          return;
        }

      console.log('RPC set_my_role done', normalizedRole);

      if (normalizedRole === 'merchant') {
        const { data: profileData, error: profileError } = await supabase
          .from('profiles')
          .select('merchant_code')
          .eq('id', session.user.id)
          .single();

        if (profileError) {
          setError(profileError.message);
          setLoading(false);
          return;
        }

        let merchantCode = profileData?.merchant_code ?? null;

        if (!merchantCode) {
          merchantCode = `PP_${session.user.id.slice(0, 8)}_${Math.random()
            .toString(36)
            .slice(2, 8)}`.toUpperCase();

          const { error: merchantCodeError } = await supabase
            .from('profiles')
            .update({ merchant_code: merchantCode })
            .eq('id', session.user.id);

          if (merchantCodeError) {
            setError(merchantCodeError.message);
            setLoading(false);
            return;
          }
        }

        const { data: existingMerchant, error: existingError } = await supabase
          .from('merchants')
          .select('id')
          .eq('qr_token', merchantCode)
          .maybeSingle();

        if (existingError) {
          setError(existingError.message);
          setLoading(false);
          return;
        }

        if (existingMerchant) {
          const { error: merchantUpdateError } = await supabase
            .from('merchants')
            .update({
              name: trimmedMerchantName,
              city: trimmedMerchantCity,
              address: trimmedMerchantAddress || null
            })
            .eq('qr_token', merchantCode);

          if (merchantUpdateError) {
            setError(merchantUpdateError.message);
            setLoading(false);
            return;
          }
        } else {
          const { error: merchantInsertError } = await supabase.from('merchants').insert({
            id: crypto.randomUUID(),
            name: trimmedMerchantName,
            city: trimmedMerchantCity,
            address: trimmedMerchantAddress || null,
            qr_token: merchantCode,
            is_active: true
          });

          if (merchantInsertError) {
            setError(merchantInsertError.message);
            setLoading(false);
            return;
          }
        }
      }

      setLoading(false);
      router.push('/login');
      return;
    }

    // -----------------------
    // CONNEXION
    // -----------------------
=======
        setLoading(false);
        router.push('/login');
        return;
      } catch (e: any) {
        console.error('Unexpected register error:', e);
        setError('Erreur inattendue lors de la création du compte.');
        setLoading(false);
        return;
      }
    }

    // 🔹 CONNEXION
    const { data, error: signInError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (signInError) {
      setError(signInError.message);
      setLoading(false);
      return;
    }

    const nextSession = data.session ?? (await supabase.auth.getSession()).data.session;
    if (!nextSession) {
      setError('Impossible de démarrer une session.');
      setLoading(false);
      return;
    }

    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('role,merchant_id,merchant_code')
      .eq('id', nextSession.user.id)
      .maybeSingle();

    if (profileError) {
      setError(profileError.message);
      setLoading(false);
      return;
    }

    setLoading(false);

    const userRole =
      (nextSession.user.user_metadata?.role as string | undefined)?.toLowerCase() ?? 'user';

    const role = profile?.role?.toLowerCase() ?? 'user';


    if (userRole === 'admin') {
      router.push('/admin');

    } else if (userRole === 'merchant') {
      router.push('/merchant');
    } else if (userRole === 'refuge') {

    const sessionRole =
      (nextSession.user.user_metadata?.role as string | undefined)?.toLowerCase() ?? 'user';

    if (sessionRole === 'admin') {
      router.push('/admin');
    } else if (sessionRole === 'merchant') {
      router.push('/merchant');
    } else if (sessionRole === 'refuge') {

    } else if (role === 'merchant') {
      if (profile?.merchant_id) {
        router.push('/merchant');
      } else {
        router.push('/dashboard');
      }
    } else if (role === 'refuge') {
      router.push('/refuge');
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

      {mode === 'register' && role === 'merchant' && (
        <>
          <label className="label" htmlFor="merchantName">
            Nom du commerce
            <input
              id="merchantName"
              className="input"
              type="text"
              value={merchantName}
              onChange={(event) => setMerchantName(event.target.value)}
              required
            />
          </label>
          <label className="label" htmlFor="merchantCity">
            Ville
            <input
              id="merchantCity"
              className="input"
              type="text"
              value={merchantCity}
              onChange={(event) => setMerchantCity(event.target.value)}
              required
            />
          </label>
          <label className="label" htmlFor="merchantAddress">
            Adresse (optionnelle)
            <input
              id="merchantAddress"
              className="input"
              type="text"
              value={merchantAddress}
              onChange={(event) => setMerchantAddress(event.target.value)}
            />
          </label>
        </>
      )}

      {error && <p className="error">{error}</p>}

      <button className="button" type="submit" disabled={loading}>
        {loading ? (
          <Loader label="Chargement..." />
        ) : mode === 'login' ? (
          'Se connecter'
        ) : (
          'Créer le compte'
        )}
      </button>
    </form>
  );
}
