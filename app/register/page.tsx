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

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
    });

    if (error) {
      alert(error.message);
      setLoading(false);
      return;
    }

    if (data.user) {
      await supabase.from("profiles").insert({
        id: data.user.id,
        role: isMerchant ? "merchant_pending" : "user",
      });
    }

    router.push("/dashboard");
  };

  return (
    <div
      style={{
        minHeight: "calc(100vh - 80px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "24px",
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: "480px",
          backgroundColor: "#ffffff",
          borderRadius: "16px",
          boxShadow: "0 10px 30px rgba(0,0,0,0.08)",
          padding: "24px",
        }}
      >
        <a href="/" style={{ color: "#059669", fontSize: "14px" }}>
          ← Retour
        </a>

        <h1 style={{ fontSize: "28px", fontWeight: 700, marginTop: 16 }}>
          Créer un compte
        </h1>
        <p style={{ color: "#4b5563", marginTop: 8, marginBottom: 24 }}>
          Gagnez du cashback chez les commerçants partenaires et soutenez les
          refuges locaux.
        </p>

        <form onSubmit={handleRegister}>
          <div style={{ marginBottom: 16 }}>
            <label style={{ display: "block", fontWeight: 500, marginBottom: 4 }}>
              Email
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              style={{
                width: "100%",
                border: "1px solid #d1d5db",
                borderRadius: 8,
                padding: "8px 12px",
              }}
            />
          </div>

          <div style={{ marginBottom: 16 }}>
            <label style={{ display: "block", fontWeight: 500, marginBottom: 4 }}>
              Mot de passe
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              style={{
                width: "100%",
                border: "1px solid #d1d5db",
                borderRadius: 8,
                padding: "8px 12px",
              }}
            />
          </div>

          <div style={{ marginBottom: 16, display: "flex", alignItems: "center", gap: 8 }}>
            <input
              type="checkbox"
              checked={isMerchant}
              onChange={(e) => setIsMerchant(e.target.checked)}
            />
            <span style={{ fontSize: 14 }}>
              Je suis commerçant et je souhaite proposer PawPass
            </span>
          </div>

          <button
            type="submit"
            disabled={loading}
            style={{
              width: "100%",
              border: "none",
              borderRadius: 8,
              padding: "10px 0",
              backgroundColor: "#059669",
              color: "#ffffff",
              fontWeight: 600,
              cursor: loading ? "default" : "pointer",
              opacity: loading ? 0.7 : 1,
            }}
          >
            {loading ? "Création..." : "Créer mon compte"}
          </button>
        </form>

        <p style={{ marginTop: 16, fontSize: 14, textAlign: "center" }}>
          Déjà un compte ?{" "}
          <a href="/login" style={{ color: "#059669", fontWeight: 600 }}>
            Se connecter
          </a>
        </p>
      </div>
    </div>
  );
}
