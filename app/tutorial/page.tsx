"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabaseClient";

export const dynamic = "force-dynamic";

export default function TutorialPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const supabase = createClient();

  const next = useMemo(() => {
    const n = searchParams.get("next");
    return n && n.startsWith("/") ? n : "/dashboard";
  }, [searchParams]);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    const run = async () => {
      const { data, error } = await supabase.auth.getUser();

      if (cancelled) return;

      if (error || !data?.user) {
        router.push(`/login?redirectTo=${encodeURIComponent("/tutorial")}`);
        return;
      }

      const hasSeen = Boolean((data.user.user_metadata as any)?.has_seen_tutorial);
      if (hasSeen) {
        router.push(next);
        return;
      }

      setLoading(false);
    };

    run();

    return () => {
      cancelled = true;
    };
  }, [router, supabase, next]);

  const markSeenAndGo = async () => {
    setSaving(true);
    setErrorMsg(null);

    const { error } = await supabase.auth.updateUser({
      data: { has_seen_tutorial: true },
    });

    if (error) {
      setErrorMsg(error.message || "Impossible d'enregistrer l'état du tutoriel.");
      setSaving(false);
      return;
    }

    router.push(next);
  };

  if (loading) {
    return (
      <div
        style={{
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: 16,
        }}
      >
        <div>Chargement...</div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: "100vh", padding: 16, display: "flex", justifyContent: "center" }}>
      <div style={{ width: "100%", maxWidth: 980 }}>
        <div
          style={{
            background: "white",
            borderRadius: 24,
            padding: 20,
            boxShadow: "0 12px 30px rgba(15,23,42,0.15)",
          }}
        >
          <div style={{ padding: "6px 6px 12px" }}>
            <h1 style={{ fontSize: 24, fontWeight: 800, marginBottom: 6, color: "#0f172a" }}>
              Tutoriel PawPass
            </h1>
            <p style={{ color: "#64748b", marginBottom: 10 }}>
              Découvrez le fonctionnement en moins d’une minute. Vous pouvez ignorer à tout moment.
            </p>
          </div>

          {/* Vidéo responsive sans rognage */}
          <div
            style={{
              borderRadius: 18,
              overflow: "hidden",
              background: "#0b1220",
              border: "1px solid rgba(226,232,240,0.8)",
              display: "flex",
              justifyContent: "center",
              alignItems: "center",
              padding: 10,
              // limite la place occupée sans imposer un ratio faux
              maxHeight: "60vh",
            }}
          >
            <video
              src="/tutorial.mp4"
              controls
              autoPlay
              muted
              playsInline
              preload="metadata"
              style={{
                width: "100%",
                height: "auto",      // ✅ laisse la vidéo garder son ratio
                maxHeight: "56vh",   // ✅ empêche de prendre tout l'écran
                maxWidth: 520,       // ✅ sur PC, évite le “géant”
                display: "block",
                background: "#0b1220",
              }}
            />
          </div>

          {/* Actions */}
          <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginTop: 14 }}>
            <button
              onClick={markSeenAndGo}
              disabled={saving}
              style={{
                padding: "12px 16px",
                borderRadius: 999,
                border: "none",
                fontWeight: 700,
                backgroundColor: "#059669",
                color: "white",
                cursor: saving ? "default" : "pointer",
                opacity: saving ? 0.7 : 1,
              }}
            >
              {saving ? "Redirection..." : "Ignorer le tutoriel"}
            </button>

            <button
              onClick={markSeenAndGo}
              disabled={saving}
              style={{
                padding: "12px 16px",
                borderRadius: 999,
                border: "1px solid #cbd5e1",
                fontWeight: 700,
                backgroundColor: "white",
                color: "#0f172a",
                cursor: saving ? "default" : "pointer",
                opacity: saving ? 0.7 : 1,
              }}
            >
              J’ai compris, aller au dashboard
            </button>
          </div>

          {errorMsg && (
            <div
              style={{
                marginTop: 10,
                padding: 10,
                borderRadius: 10,
                backgroundColor: "#ffe5e5",
                color: "#b00020",
                fontSize: "0.95rem",
              }}
            >
              {errorMsg}
            </div>
          )}

          <p style={{ marginTop: 10, fontSize: 12, color: "#6b7280" }}>
            Astuce : vous pourrez revoir ce tutoriel plus tard depuis votre dashboard (si vous ajoutez un bouton).
          </p>

          <style jsx>{`
            @media (max-width: 480px) {
              /* Sur téléphone, on limite un peu plus la hauteur */
              video {
                max-height: 48vh !important;
                max-width: 100% !important;
              }
              div[style*="maxHeight: 60vh"] {
                max-height: 52vh !important;
              }
            }
          `}</style>
        </div>
      </div>
    </div>
  );
}
