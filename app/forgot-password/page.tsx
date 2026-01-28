"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabaseClient";

export const dynamic = "force-dynamic";

function isValidEmail(v: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.trim());
}

export default function ForgotPasswordPage() {
  const supabase = useMemo(() => createClient(), []);
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);

  // On reste volontairement vague (sécurité)
  const [sent, setSent] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    const clean = email.trim().toLowerCase();
    if (!isValidEmail(clean)) {
      setErrorMsg("Veuillez entrer une adresse email valide.");
      return;
    }

    setLoading(true);
    try {
      const redirectTo =
        typeof window !== "undefined"
          ? `${window.location.origin}/reset-password`
          : undefined;

      const { error } = await supabase.auth.resetPasswordForEmail(clean, {
        redirectTo,
      });

      // Important: ne jamais révéler si l'email existe
      if (error) {
        console.error("resetPasswordForEmail error:", error.message);
      }

      setSent(true);
    } finally {
      setLoading(false);
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
          Mot de passe oublié
        </h1>

        {!sent ? (
          <>
            <p style={{ color: "#64748b", marginBottom: 24 }}>
              Entrez votre email. Si un compte existe, nous vous enverrons un lien
              pour choisir un nouveau mot de passe.
            </p>

            <form onSubmit={handleSend}>
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
                  marginBottom: 12,
                }}
              />

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
                {loading ? "Envoi..." : "Envoyer le lien"}
              </button>
            </form>

            <p style={{ marginTop: 12, fontSize: 14 }}>
              <Link
                href="/login"
                style={{
                  color: "#059669",
                  fontWeight: 600,
                  textDecoration: "none",
                }}
              >
                Retour à la connexion
              </Link>
            </p>
          </>
        ) : (
          <>
            <p style={{ color: "#64748b", marginBottom: 18 }}>
              Si un compte existe avec <b>{email.trim()}</b>, un email vient d’être envoyé
              avec un lien de réinitialisation.
            </p>

            <div
              style={{
                borderRadius: 14,
                padding: 12,
                background: "rgba(2, 132, 199, 0.08)",
                border: "1px solid rgba(2, 132, 199, 0.18)",
                color: "#0f172a",
                fontSize: 13,
                lineHeight: 1.4,
              }}
            >
              Astuce : vérifiez vos spams et attendez 1–2 minutes. Le lien expire
              au bout d’un moment.
            </div>

            <p style={{ marginTop: 16, fontSize: 14 }}>
              <Link
                href="/login"
                style={{
                  color: "#059669",
                  fontWeight: 600,
                  textDecoration: "none",
                }}
              >
                Retour à la connexion
              </Link>
            </p>
          </>
        )}
      </div>
    </div>
  );
}
