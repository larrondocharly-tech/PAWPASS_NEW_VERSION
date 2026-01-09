"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabaseClient";

export const dynamic = "force-dynamic";

export default function RegisterPage() {
  const router = useRouter();
  const supabase = createClient();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isMerchant, setIsMerchant] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg("");
    setLoading(true);

    const role = isMerchant ? "merchant" : "user";

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          role,
        },
      },
    });

    setLoading(false);

    if (error) {
      setErrorMsg(error.message);
      return;
    }

    // Selon ton setup, l'email peut avoir besoin de confirmation.
    // On suppose ici que le user est directement connecté.
    const newRole = (data.user?.user_metadata as any)?.role || role;

    if (newRole === "merchant") {
      router.push("/merchant");
    } else if (newRole === "admin") {
      router.push("/admin");
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
          Créer un compte
        </h1>
        <p style={{ color: "#64748b", marginBottom: 24 }}>
          Gagnez du cashback chez les commerçants partenaires et soutenez les
          refuges locaux.
        </p>

        <form onSubmit={handleRegister}>
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

          <label
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              marginBottom: 16,
            }}
          >
            <input
              type="checkbox"
              checked={isMerchant}
              onChange={(e) => setIsMerchant(e.target.checked)}
            />
            <span>Je suis commerçant et je souhaite proposer PawPass</span>
          </label>

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
            {loading ? "Création..." : "Créer mon compte"}
          </button>
        </form>

        <p style={{ marginTop: 12, fontSize: 14 }}>
          Déjà un compte ?{" "}
          <a
            href="/login"
            style={{ color: "#059669", fontWeight: 600, textDecoration: "none" }}
          >
            Se connecter
          </a>
        </p>
      </div>
    </div>
  );
}
