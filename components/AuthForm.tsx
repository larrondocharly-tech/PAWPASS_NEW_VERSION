'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabaseClient';
import Loader from './Loader';

interface AuthFormProps {
  mode: 'login' | 'register';
}

export default function AuthForm({ mode }: AuthFormProps) {
  const router = useRouter();
  const supabase = createClient();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [referralCode, setReferralCode] = useState('');
  const [wantsMerchantAccount, setWantsMerchantAccount] = useState(false);
  const [businessName, setBusinessName] = useState('');
  const [businessCity, setBusinessCity] = useState('');
  const [businessAddress, setBusinessAddress] = useState('');
  const [businessPhone, setBusinessPhone] = useState('');
  const [merchantMessage, setMerchantMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);
    setLoading(true);

    // 🔹 INSCRIPTION
    if (mode === 'register') {
      const normalizedRole = 'user';
      const trimmedBusinessName = businessName.trim();
      const trimmedBusinessCity = businessCity.trim();
      const trimmedBusinessAddress = businessAddress.trim();
      const trimmedBusinessPhone = businessPhone.trim();
      const trimmedMerchantMessage = merchantMessage.trim();

      if (wantsMerchantAccount && (!trimmedBusinessName || !trimmedBusinessCity)) {
        setError('Veuillez renseigner le nom et la ville du commerce.');
        setLoading(false);
        return;
      }

      const { data, error: signUpError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            role: normalizedRole
          }
        }
      });

        const trimmedMerchantName = merchantName.trim();
        const trimmedMerchantCity = merchantCity.trim();
        const trimmedMerchantAddress = merchantAddress.trim();

      let session = data.session ?? null;
      if (!session) {
        const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
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
          if (signUpError.message.includes('Database error saving new user')) {
            setError(
              "Cet email est déjà utilisé ou une erreur est survenue lors de la création du compte."
            );
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

        // 2) Création / mise à jour du profil
        const { error: profileError } = await supabase.from('profiles').upsert(
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

      if (wantsMerchantAccount) {
        const { error: applicationError } = await supabase.from('merchant_applications').insert({
          user_id: session.user.id,
          business_name: trimmedBusinessName,
          city: trimmedBusinessCity,
          address: trimmedBusinessAddress || null,
          phone: trimmedBusinessPhone || null,
          message: trimmedMerchantMessage || null,
          status: 'pending'
        });

        if (applicationError) {
          setError(applicationError.message);
          setLoading(false);
          return;
        }
      }

      if (wantsMerchantAccount) {
        const { error: applicationError } = await supabase.from('merchant_applications').insert({
          user_id: session.user.id,
          business_name: trimmedBusinessName,
          city: trimmedBusinessCity,
          address: trimmedBusinessAddress || null,
          phone: trimmedBusinessPhone || null,
          message: trimmedMerchantMessage || null,
          status: 'pending'
        });

        if (applicationError) {
          setError(applicationError.message);
          setLoading(false);
          return;
        }
      }

      setLoading(false);
      router.push('/login');
      return;
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
    const role = profile?.role?.toLowerCase() ?? 'user';

    // Priorité au rôle stocké dans user_metadata (admin, etc.)
    if (sessionRole === 'admin') {
      router.push('/admin');
    } else if (role === 'merchant') {
      if (profile?.merchant_id) {
        router.push('/merchant');
      } else {
        router.push('/dashboard');
      }
    } else if (role === 'refuge') {
      router.push('/refuge');
      return;
    }

    // Par défaut : client
    router.push('/dashboard');
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
        <label className="label" htmlFor="merchantOptIn">
          <input
            id="merchantOptIn"
            type="checkbox"
            checked={wantsMerchantAccount}
            onChange={(event) => setWantsMerchantAccount(event.target.checked)}
            style={{ marginRight: 8 }}
          />
          Je souhaite devenir partenaire commerçant
        </label>
      )}
      {mode === 'register' && wantsMerchantAccount && (
        <>
          <label className="label" htmlFor="businessName">
            Nom du commerce
            <input
              id="businessName"
              className="input"
              type="text"
              value={businessName}
              onChange={(event) => setBusinessName(event.target.value)}
              required
            />
          </label>
          <label className="label" htmlFor="businessCity">
            Ville du commerce
            <input
              id="businessCity"
              className="input"
              type="text"
              value={businessCity}
              onChange={(event) => setBusinessCity(event.target.value)}
              required
            />
          </label>
          <label className="label" htmlFor="businessAddress">
            Adresse (optionnelle)
            <input
              id="businessAddress"
              className="input"
              type="text"
              value={businessAddress}
              onChange={(event) => setBusinessAddress(event.target.value)}
            />
          </label>
          <label className="label" htmlFor="businessPhone">
            Téléphone (optionnel)
            <input
              id="businessPhone"
              className="input"
              type="text"
              value={businessPhone}
              onChange={(event) => setBusinessPhone(event.target.value)}
            />
          </label>
          <label className="label" htmlFor="merchantMessage">
            Message (optionnel)
            <textarea
              id="merchantMessage"
              className="input"
              rows={4}
              value={merchantMessage}
              onChange={(event) => setMerchantMessage(event.target.value)}
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
