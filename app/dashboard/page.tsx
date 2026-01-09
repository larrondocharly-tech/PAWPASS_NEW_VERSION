'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabaseClient';

type Status = 'loading' | 'no-user' | 'ok' | 'error';

interface DebugState {
  status: Status;
  userEmail?: string | null;
  errorMessage?: string;
  envInfo?: {
    url?: string;
    hasAnonKey: boolean;
  };
}

export default function DashboardPage() {
  const [state, setState] = useState<DebugState>({
    status: 'loading',
  });

  useEffect(() => {
    const run = async () => {
      const envInfo = {
        url: process.env.NEXT_PUBLIC_SUPABASE_URL,
        hasAnonKey: !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      };

      try {
        const supabase = createClient();

        const {
          data: { user },
          error,
        } = await supabase.auth.getUser();

        if (error) {
          console.error('Erreur getUser:', error);
          setState({
            status: 'error',
            errorMessage: error.message,
            envInfo,
          });
          return;
        }

        if (!user) {
          setState({
            status: 'no-user',
            envInfo,
          });
          return;
        }

        // Ici on pourrait charger tes vraies données de dashboard.
        setState({
          status: 'ok',
          userEmail: user.email,
          envInfo,
        });
      } catch (err: any) {
        console.error('Erreur Dashboard:', err);
        setState({
          status: 'error',
          errorMessage: err?.message ?? String(err),
          envInfo,
        });
      }
    };

    run();
  }, []);

  return (
    <main className="max-w-2xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-semibold mb-4">Dashboard (mode debug)</h1>

      {state.status === 'loading' && <p>Chargement…</p>}

      {state.status === 'no-user' && (
        <div className="space-y-2">
          <p className="font-medium">
            Aucun utilisateur Supabase détecté (user = null).
          </p>
          <p>
            Ça veut dire que Supabase ne te voit pas connecté sur cette URL.
            Essaie de retourner sur la page <strong>Connexion</strong>, de te
            reconnecter, puis de revenir ici.
          </p>
        </div>
      )}

      {state.status === 'ok' && (
        <div className="space-y-2">
          <p>Connecté en tant que :</p>
          <p className="font-bold">{state.userEmail}</p>
          <p className="text-sm text-gray-600 mt-4">
            Le dashboard réel pourra être remis ici une fois qu’on a vérifié que
            tout fonctionne en production.
          </p>
        </div>
      )}

      {state.status === 'error' && (
        <div className="space-y-2">
          <p className="font-medium text-red-600">
            Erreur lors du chargement du dashboard :
          </p>
          <pre className="bg-gray-100 p-2 rounded text-sm whitespace-pre-wrap">
            {state.errorMessage}
          </pre>
        </div>
      )}

      <hr className="my-6" />

      <h2 className="font-semibold mb-2">Infos environnement (debug)</h2>
      <pre className="bg-gray-100 p-2 rounded text-xs whitespace-pre-wrap">
        {JSON.stringify(state.envInfo, null, 2)}
      </pre>
    </main>
  );
}
