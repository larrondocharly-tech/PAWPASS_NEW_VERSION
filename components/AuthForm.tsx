'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabaseClient';
import Loader from './Loader';

interface PendingCashback {
  merchantCode: string;
  amount: number;
  spaId: string | null;
  donationPercent: number;
}

interface AuthFormProps {
  mode: 'login' | 'register';
  pendingCashback?: PendingCashback | null;
}

export default function AuthForm({ mode, pendingCashback }: AuthFormProps) {
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
  const [infoMessage, setInfoMessage] = useState<string | null>(null);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);
    setInfoMessage(null);
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
            role: normalizedRole,
          },
        },
      });

      if (signUpError) {
        setError(signUpError.message);
        setLoading(false);
        return;
      }

      let session = data.session ?? null;
      if (!session) {
        const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
          email,
          password,
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

      // Si tu utilises toujours la RPC set_my_role, on la garde
      const { error: roleError } = await supabase.rpc('set_my_role', {
        p_role: normalizedRole,
      });

      if (roleError) {
        console.error('set_my_role error', roleError);
        setError('Impossible de mettre à jour le rôle.');
        setLoading(false);
        return;
      }

      // Code parrainage
      const trimmedReferral = referralCode.trim();
      if (trimmedReferral) {
        const { error: referralError } = await supabase
          .from('profiles')
          .update({ referral_code_used: trimmedReferral })
          .eq('id', session.user.id);

        if (referralError) {
          console.error('referral_code_used update error', referralError);
          setError("Impossible d’enregistrer le code de parrainage.");
          setLoading(false);
          return;
        }
      }

      // Demande commerçant
      if (wantsMerchantAccount) {
        const { data: existingApplication, error: existingApplicationError } = await supabase
          .from('merchant_applications')
          .select('id')
          .eq('user_id', session.user.id)
          .eq('status', 'pending')
          .maybeSingle();

        if (existingApplicationError) {
          setError(existingApplicationError.message);
          setLoading(false);
          return;
        }

        if (existingApplication) {
          setInfoMessage(
            'Votre demande de partenariat a bien été envoyée. Elle est en attente de validation.'
          );
          setLoading(false);
          return;
        }

        const { error: applicationError } = await supabase.from('merchant_applications').insert({
          user_id: session.user.id,
          business_name: trimmedBusinessName,
          city: trimmedBusinessCity,
          address: trimmedBusinessAddress || null,
          phone: trimmedBusinessPhone || null,
          message: trimmedMerchantMessage || null,
          status: 'pending',
        });

        if (existingApplication) {
          setInfoMessage(
            'Votre demande de partenariat a bien été envoyée. Elle est en attente de validation.'
          );
          setLoading(false);
          return;
        }

      if (pendingCashback && pendingCashback.amount > 0) {
        const { merchantCode, amount, spaId, donationPercent } = pendingCashback;
        const { error: cashbackError } = await supabase.rpc('apply_cashback_transaction', {
          p_merchant_code: merchantCode,
          p_amount: amount,
          p_spa_id: spaId,
          p_use_wallet: false,
          p_wallet_spent: 0,
          p_donation_percent: donationPercent ?? 0,
        });

        if (cashbackError) {
          console.error('apply_cashback_transaction error', cashbackError);
        }
      }

      setLoading(false);
      router.push('/dashboard');
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

    if (role === 'admin') {
      router.push('/admin');
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
      {infoMessage && <p className="helper">{infoMessage}</p>}

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
