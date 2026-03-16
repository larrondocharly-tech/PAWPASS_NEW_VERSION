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
        const source = params.get("source");
        const success = params.get("success");
        const user_uuid = params.get("user_uuid");
const requisition_id =
  params.get("requisition_id") ||
  params.get("req");
        let url = "";

        if (source === "connect") {
          if (success !== "true") {
            if (!cancelled) {
              setStatus("Erreur : connexion bancaire non finalisée.");
            }
            return;
          }

          if (!user_uuid) {
            if (!cancelled) {
              setStatus("Erreur : user_uuid manquant.");
            }
            return;
          }

          url = `/api/bank/callback?source=connect&success=${encodeURIComponent(
            success
          )}&user_uuid=${encodeURIComponent(user_uuid)}`;
        } else {
          if (!requisition_id) {
            if (!cancelled) {
              setStatus("Erreur : requisition_id manquant.");
            }
            return;
          }

          url = `/api/bank/callback?requisition_id=${encodeURIComponent(
            requisition_id
          )}`;
        }

        const res = await fetch(url, { method: "GET" });
        const json = await res.json().catch(() => ({} as any));

        if (!res.ok) {
          const msg = (json as any)?.error || res.statusText || "Erreur callback";
          if (!cancelled) {
            setStatus(`Erreur callback : ${msg}`);
          }
          return;
        }

        const accountsCount = Number((json as any)?.accounts_count ?? 0) || 0;

        if (!cancelled) {
          setStatus(`✅ Banque connectée (comptes: ${accountsCount}). Redirection…`);
          setTimeout(() => {
            router.replace("/settings");
          }, 1000);
        }
      } catch (e: any) {
        if (!cancelled) {
          setStatus(e?.message || "Erreur inconnue");
        }
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