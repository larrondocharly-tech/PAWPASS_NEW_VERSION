"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabaseClient";

export const dynamic = "force-dynamic";

interface Wallet {
  balance: number;
}

export default function DashboardPage() {
  const supabase = createClient();

  const [wallet, setWallet] = useState<Wallet | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadData = async () => {
      // Récupérer la session côté client uniquement
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session) {
        // Pas connecté → redirection côté client
        window.location.href = "/login";
        return;
      }

      // Exemple simple : lire le solde dans la table wallets
      const { data, error } = await supabase
        .from("wallets")
        .select("balance")
        .eq("user_id", session.user.id)
        .single();

      if (error) {
        console.error("Erreur chargement wallet :", error);
      } else {
        setWallet(data as Wallet);
      }

      setLoading(false);
    };

    loadData();
  }, [supabase]);

  if (loading) {
    return (
      <div style={{ padding: 24 }}>
        <p>Chargement...</p>
      </div>
    );
  }

  return (
    <div style={{ padding: 24 }}>
      <h1 style={{ fontSize: 24, fontWeight: 700, marginBottom: 16 }}>
        Tableau de bord
      </h1>
      <p>Solde de ta cagnotte : {wallet?.balance ?? 0} €</p>
    </div>
  );
}
