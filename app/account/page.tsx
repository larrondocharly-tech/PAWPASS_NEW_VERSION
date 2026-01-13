"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabaseClient";

interface SupaUser {
  id: string;
  email?: string;
}

export default function AccountPage() {
  const supabase = createClient();
  const router = useRouter();

  const [user, setUser] = useState<SupaUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      const { data, error } = await supabase.auth.getUser();

      if (error) {
        console.error("Erreur getUser /account :", error.message);
      }

      if (!data?.user) {
        // Pas connecté -> on renvoie vers la page de login
        router.push("/login");
        return;
      }

      setUser(data.user as SupaUser);
      setLoading(false);
    };

    load();
  }, [supabase, router]);

  const handleLogout = async () => {
    setError(null);
    const { error } = await supabase.auth.signOut();

    if (error) {
      console.error("Erreur signOut :", error.message);
      setError("Impossible de vous déconnecter. Réessayez dans un instant.");
      return;
    }

    // Session Supabase vidée -> retour à l'accueil
    router.push("/");
    router.refresh();
  };

  if (loading) {
    return (
      <main style={{ maxWidth: 960, margin: "0 auto", padding: "32px 20px" }}>
        Chargement de votre compte…
      </main>
    );
  }

  return (
    <main style={{ maxWidth: 960, margin: "0 auto", padding: "32px 20px" }}>
      <h1>Mon compte</h1>
      <p>
        Vous êtes connecté
        {user?.email ? ` en tant que ${user.email}` : ""}.
      </p>

      <button
        onClick={handleLogout}
        style={{
          marginTop: "24px",
          padding: "12px 18px",
          borderRadius: "999px",
          border: "none",
          backgroundColor: "#111827",
          color: "#ffffff",
          fontWeight: 600,
          cursor: "pointer",
        }}
      >
        Se déconnecter
      </button>

      {error && (
        <p style={{ marginTop: "12px", color: "#b91c1c" }}>{error}</p>
      )}
    </main>
  );
}
