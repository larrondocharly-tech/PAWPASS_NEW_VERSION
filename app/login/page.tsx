"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabaseClient";
export const dynamic = "force-dynamic";



// --- composant interne qui utilise useSearchParams ---
function LoginPageInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const supabase = createClient();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg("");
    setLoading(true);

    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    setLoading(false);

    if (error) {
      setErrorMsg(error.message);
      return;
    }

    const user = data.user;
    const userMeta = (user?.user_metadata ?? {}) as any;
    const appMeta = (user?.app_metadata ?? {}) as any;

    let role: string | undefined = userMeta.role || appMeta.role;

    if (!role && appMeta.is_admin) {
      role = "admin";
    }

    if (!role && user?.email === "admin@admin.com") {
      role = "admin";
    }

    if (role !== "merchant" && role !== "admin") {
      role = "user";
    }

    const redirectTo = searchParams.get("redirectTo");

    if (role === "merchant") {
      router.push("/merchant");
    } else if (role === "admin") {
      router.push("/admin");
    } else if (redirectTo) {
      router.push(redirectTo);
    } else {
      router.push("/dashboard");
    }
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        padding: 16,
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: 520,
          backgroundColor: "white",
          borderRadius: 24,
          padding: 32,
          boxShadow: "0 12px 30px rgba(15,23,42,0.15)",
        }}
      >
        <h1
          style={{
            fontSize: 28,
            fontWeight: 700,
            marginBottom: 8,
            color: "#0f172a",
          }}
        >
          Connexion
        </h1>
        <p style={{ color: "#64748b", marginBottom: 24 }}>
          Retrouvez votre cagnotte PawPass et vos dons aux refuges.
        </p>

        <form onSubmit={handleLogin}>
          <label style={{ fontWeight: 600 }}>Email</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            placeholder="vous@exemple.fr"
            style={{
              width: "100%",
              padding: 12,
              borderRadius: 8,
              border: "1px solid #cbd5e1",
              marginBottom: 16,
            }}
          />

          <label style={{ fontWeight: 600 }}>Mot de passe</label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength={6}
            style={{
              width: "100%",
              padding: 12,
              borderRadius: 8,
              border: "1px solid #cbd5e1",
              marginBottom: 8,
            }}
          />
          <p style={{ fontSize: 12, color: "#6b7280", marginBottom: 16 }}>
            6 caractères minimum. Tu pourras le modifier plus tard.
          </p>

          {errorMsg && (
            <p style={{ color: "#b91c1c", marginBottom: 12 }}>{errorMsg}</p>
          )}

          <button
            type="submit"
            disabled={loading}
            style={{
              width: "100%",
              padding: 12,
              borderRadius: 999,
              border: "none",
              fontWeight: 600,
              backgroundColor: "#059669",
              color: "white",
              cursor: loading ? "default" : "pointer",
              opacity: loading ? 0.7 : 1,
              marginBottom: 12,
            }}
          >
            {loading ? "Connexion..." : "Se connecter"}
          </button>
        </form>

        <p style={{ marginTop: 12, fontSize: 14 }}>
          Pas encore de compte ?{" "}
          <a
            href="/register"
            style={{
              color: "#059669",
              fontWeight: 600,
              textDecoration: "none",
            }}
          >
            Créer un compte
          </a>
        </p>
      </div>
    </div>
  );
}

// --- composant exporté, entouré d'une Suspense ---
export default function LoginPage() {
  return (
    <Suspense fallback={<div>Chargement...</div>}>
      <LoginPageInner />
    </Suspense>
  );
}
