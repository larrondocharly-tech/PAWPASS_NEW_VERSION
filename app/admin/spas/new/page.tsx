"use client";

import React, { useMemo, useState } from "react";
import { createClient } from "@/lib/supabaseClient";

type ApiOk = { ok: true; spa?: { id?: string; name: string; email: string; auth_user_id?: string } ; msg?: string };
type ApiErr = { error?: string; message?: string };

export default function AdminCreateSpaPage() {
  const supabase = useMemo(() => createClient(), []);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [iban, setIban] = useState("");
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setMsg(null);
    setLoading(true);

    try {
      // 1) session
      const { data: sessionData, error: sessErr } = await supabase.auth.getSession();
      const token = sessionData?.session?.access_token;

      if (sessErr) {
        setMsg(`❌ Session: ${sessErr.message}`);
        setLoading(false);
        return;
      }
      if (!token) {
        setMsg("❌ Vous devez être connecté.");
        setLoading(false);
        return;
      }

      // 2) call API
      const res = await fetch("/api/admin/create-spa", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          name: name.trim(),
          email: email.trim().toLowerCase(),
          iban: iban.trim() ? iban.trim() : null,
        }),
      });

      // 3) robust parsing (API might return empty body / html / etc.)
      const text = await res.text();
      let json: ApiOk | ApiErr | null = null;

      if (text) {
        try {
          json = JSON.parse(text);
        } catch {
          // Not JSON => show a helpful debug message instead of crashing
          setMsg(`❌ Réponse non-JSON (${res.status}). Début: ${text.slice(0, 120)}`);
          setLoading(false);
          return;
        }
      }

      // 4) handle errors
      if (!res.ok) {
        const errMsg =
          (json as ApiErr | null)?.error ||
          (json as ApiErr | null)?.message ||
          `Erreur serveur (${res.status})`;
        setMsg(`❌ ${errMsg}`);
        setLoading(false);
        return;
      }

      // 5) handle success (some versions of the endpoint may return {msg} only)
      const ok = json as ApiOk | null;
      if (!ok?.spa) {
        setMsg(`✅ ${ok?.msg || "OK"} (endpoint répond, mais sans objet spa)`);
        setLoading(false);
        return;
      }

      setMsg(`✅ SPA créée : ${ok.spa.name} (${ok.spa.email})`);
      setName("");
      setEmail("");
      setIban("");
      setLoading(false);
    } catch (err: any) {
      setMsg(`❌ ${err?.message || "Erreur inconnue"}`);
      setLoading(false);
    }
  }

  return (
    <div style={{ maxWidth: 720, margin: "0 auto", padding: 16 }}>
      <h1 style={{ fontSize: 22, color: "#0e3a4a" }}>Créer une SPA</h1>

      <form onSubmit={onSubmit} style={{ marginTop: 12, display: "grid", gap: 10 }}>
        <label style={{ display: "grid", gap: 6 }}>
          <span>Nom SPA</span>
          <input value={name} onChange={(e) => setName(e.target.value)} required />
        </label>

        <label style={{ display: "grid", gap: 6 }}>
          <span>Email (login)</span>
          <input
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            inputMode="email"
            autoComplete="email"
          />
        </label>

        <label style={{ display: "grid", gap: 6 }}>
          <span>IBAN (optionnel)</span>
          <input value={iban} onChange={(e) => setIban(e.target.value)} />
        </label>

        <button type="submit" disabled={loading} style={{ padding: 10, borderRadius: 12 }}>
          {loading ? "Création..." : "Créer"}
        </button>

        {msg ? (
          <div style={{ marginTop: 6, color: msg.startsWith("✅") ? "green" : "crimson" }}>{msg}</div>
        ) : null}
      </form>

      <div style={{ marginTop: 10, fontSize: 12, opacity: 0.75 }}>
        Astuce: si tu vois “Réponse non-JSON”, regarde Network → la réponse est probablement une page 404/403/500.
      </div>
    </div>
  );
}
