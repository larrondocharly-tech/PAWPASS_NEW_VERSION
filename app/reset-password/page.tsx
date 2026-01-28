"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabaseClient";

export const dynamic = "force-dynamic";

export default function ResetPasswordPage() {
  const supabase = useMemo(() => createClient(), []);
  const router = useRouter();
  const searchParams = useSearchParams();

  const [ready, setReady] = useState(false);
  const [sessionError, setSessionError] = useState<string | null>(null);

  const [password, setPassword] = useState("");
  const [password2, setPassword2] = useState("");

  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // ✅ Supporte les deux formats:
  // - /reset-password?code=... (PKCE) → on échange le code contre une session
  // - /reset-password#access_token=... (implicit) → supabase récupère la session via getSession()
  useEffect(() => {
    let cancelled = false;

    const init = async () => {
      setSessionError(null);
      setReady(false);

      try {
        // 1) Si on a un ?code=..., on l’échange contre une session
        const code = searchParams.get("code");
        if (code) {
          const { error: exchErr } = await supabase.auth.exchangeCodeForSession(code);
          if (exchErr) {
            console.error("exchangeCodeForSession error:", exchErr.message);
            if (cancelled) return;
            setSessionError("Lien invalide ou expiré. Refaites « mot de passe oublié ».");
            return;
          }
        }

        // 2) Vérifie qu’on a bien une session "recovery"
        const { data, error } = await supabase.auth.getSession();
        if (cancelled) return;

        if (error || !data.session) {
          setSessionError("Lien invalide ou expiré. Refaites « mot de passe oublié ».");
          return;
        }

        setReady(true);
      } catch (e) {
        console.error("reset-password init error:", e);
        if (!cancelled) setSessionError("Lien invalide ou expiré. Refaites « mot de passe oublié ».");
      }
    };

    init();

    return () => {
      cancelled = true;
    };
  }, [supabase, searchParams]);

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (password.length < 6) {
      setErrorMsg("Mot de passe trop court (6 caractères minimum).");
      return;
    }
    if (password !== password2) {
      setErrorMsg("Les mots de passe ne correspondent pas.");
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({ password });

      if (error) {
        setErrorMsg(error.message || "Impossible de modifier le mot de passe.");
        return;
      }

      setDone(true);

      // Optionnel : on déconnecte pour forcer une reconnexion propre
      await supabase.auth.signOut();

      setTimeout(() => router.push("/login"), 700);
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
        <h1 style={{ fontSize: 28, fontWeight: 700, marginBottom: 8, color: "#0f172a" }}>
          Nouveau mot de passe
        </h1>

        {!ready && !done && (
          <>
            <p style={{ color: "#64748b", marginBottom: 16 }}>Vérification du lien…</p>

            {sessionError && (
              <div
                style={{
                  borderRadius: 14,
                  padding: 12,
                  background: "rgba(185, 28, 28, 0.08)",
                  border: "1px solid rgba(185, 28, 28, 0.18)",
                  color: "#b91c1c",
                  fontSize: 13,
                  lineHeight: 1.4,
                }}
              >
                {sessionError}
              </div>
            )}

            <p style={{ marginTop: 16, fontSize: 14 }}>
              <Link
                href="/forgot-password"
                style={{ color: "#059669", fontWeight: 600, textDecoration: "none" }}
              >
                Refaire « mot de passe oublié »
              </Link>
            </p>
          </>
        )}

        {ready && !done && (
          <>
            <p style={{ color: "#64748b", marginBottom: 24 }}>
              Choisissez un nouveau mot de passe (6 caractères minimum).
            </p>

            <form onSubmit={handleUpdate}>
              <label style={{ fontWeight: 600 }}>Nouveau mot de passe</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={6}
                autoComplete="new-password"
                style={{
                  width: "100%",
                  padding: 12,
                  borderRadius: 8,
                  border: "1px solid #cbd5e1",
                  marginBottom: 12,
                }}
              />

              <label style={{ fontWeight: 600 }}>Confirmer le mot de passe</label>
              <input
                type="password"
                value={password2}
                onChange={(e) => setPassword2(e.target.value)}
                required
                minLength={6}
                autoComplete="new-password"
                style={{
                  width: "100%",
                  padding: 12,
                  borderRadius: 8,
                  border: "1px solid #cbd5e1",
                  marginBottom: 12,
                }}
              />

              {errorMsg && <p style={{ color: "#b91c1c", marginBottom: 12 }}>{errorMsg}</p>}

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
                {loading ? "Validation..." : "Valider le nouveau mot de passe"}
              </button>
            </form>

            <p style={{ marginTop: 12, fontSize: 14 }}>
              <Link href="/login" style={{ color: "#059669", fontWeight: 600, textDecoration: "none" }}>
                Retour à la connexion
              </Link>
            </p>
          </>
        )}

        {done && (
          <div
            style={{
              borderRadius: 14,
              padding: 12,
              background: "rgba(22, 163, 74, 0.10)",
              border: "1px solid rgba(22, 163, 74, 0.18)",
              color: "#0f172a",
              fontSize: 13,
              lineHeight: 1.4,
            }}
          >
            Mot de passe modifié ✅ Redirection vers la connexion…
          </div>
        )}
      </div>
    </div>
  );
}
