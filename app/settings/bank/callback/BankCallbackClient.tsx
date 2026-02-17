"use client";

import { useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";

export default function BankCallbackClient() {
  const params = useSearchParams();
  const router = useRouter();
  const [status, setStatus] = useState("Connexion en cours…");

  useEffect(() => {
    let cancelled = false;

    const run = async () => {
      try {
        const requisition_id = params.get("requisition_id");

        if (!requisition_id) {
          if (!cancelled) setStatus("Erreur : requisition_id manquant.");
          return;
        }

        const url = `/api/bank/callback?requisition_id=${encodeURIComponent(requisition_id)}`;
        const res = await fetch(url, { method: "GET" });

        // On essaye de lire du JSON, mais sans casser si ce n’est pas du JSON
        const json = await res.json().catch(() => ({} as any));

        if (!res.ok) {
          const msg = (json as any)?.error || res.statusText || "Erreur callback";
          if (!cancelled) setStatus(`Erreur callback : ${msg}`);
          return;
        }

        const accountsCount = Number((json as any)?.accounts_count ?? 0) || 0;

        if (!cancelled) {
          setStatus(`✅ Banque connectée (comptes: ${accountsCount}). Redirection…`);
          setTimeout(() => {
            // replace = évite de revenir sur la page callback avec "retour"
            router.replace("/settings");
          }, 800);
        }
      } catch (e: any) {
        if (!cancelled) setStatus(e?.message || "Erreur inconnue");
      }
    };

    run();

    return () => {
      cancelled = true;
    };
  }, [params, router]);

  return (
    <main style={{ padding: 20 }}>
      <h1 style={{ fontSize: 18, fontWeight: 900 }}>Connexion bancaire</h1>
      <p style={{ marginTop: 10 }}>{status}</p>
    </main>
  );
}
