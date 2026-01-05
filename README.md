# PawPass

Application Next.js (App Router) pour un cashback solidaire avec Supabase (Auth + Postgres + RLS).

## Prérequis

- Node.js 18+
- Supabase project configuré

## Configuration

Copiez `.env.example` vers `.env.local` et renseignez :

```
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
```

## Lancer en local

```bash
npm install
npm run dev
```

## SQL Supabase

Collez le SQL de schéma, RLS, fonctions SECURITY DEFINER et policies directement dans :

- Supabase Dashboard → **SQL Editor** → new query → exécuter.

Le SQL doit créer les tables `profiles`, `merchants`, `transactions`, `wallets`, `associations`, `receipts` et la fonction RPC `create_transaction` utilisée par l’app.
