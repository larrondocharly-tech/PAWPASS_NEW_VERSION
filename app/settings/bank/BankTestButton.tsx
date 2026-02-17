"use client";

import { useState } from "react";

export default function BankTestButton() {
  const [msg, setMsg] = useState<string>("");

  const connect = async () => {
    setMsg("Connexion…");

    const res = await fetch("/api/bank/connect", { method: "POST" });
    const json = await res.json().catch(() => ({}));

    if (!res.ok) {
      setMsg(`Erreur: ${json?.error || res.statusText}`);
      return;
    }

    // redirect vers callback (mock)
    window.location.href = json.link;
  };

  return (
    <div style={{ display: "grid", gap: 10, marginTop: 14 }}>
      <button
        onClick={connect}
        style={{
          padding: "12px 14px",
          borderRadius: 14,
          border: "none",
          background: "#111827",
          color: "white",
          fontWeight: 900,
          cursor: "pointer",
        }}
      >
        Connecter ma banque (TEST)
      </button>

      {msg && (
        <div
          style={{
            fontSize: 13,
            background: "rgba(0,0,0,0.05)",
            padding: 10,
            borderRadius: 12,
          }}
        >
          {msg}
        </div>
      )}
    </div>
  );
}
