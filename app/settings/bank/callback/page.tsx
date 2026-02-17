"use client";

import { useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";

export default function BankCallbackPage() {
  const params = useSearchParams();
  const router = useRouter();
  const [status, setStatus] = useState("Connexion en cours…");

  useEffect(() => {
    const run = async () => {
      const requisition_id = params.get("requisition_id");
      if (!requisition_id) {
        setStatus("Erreur: requisition_id manquant.");
        return;
      }

      const res = await fetch(`/api/bank/callback?requisition_id=${encodeURIComponent(requisition_id)}`);
      const json = await res.json().catch(() => ({}));

      if (!res.ok) {
        setStatus(`Erreur callback: ${json?.error || res.statusText}`);
        return;
      }

      setStatus(`✅ Banque connectée (comptes: ${json.accounts_count || 0}). Redirection…`);
      setTimeout(() => router.push("/settings"), 800);
    };

    run();
  }, [params, router]);

  return (
    <main style={{ padding: 20 }}>
      <h1 style={{ fontSize: 18, fontWeight: 900 }}>Connexion bancaire</h1>
      <p style={{ marginTop: 10 }}>{status}</p>
    </main>
  );
}
