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

Le fichier `supabase/sql/fix_schema.sql` contient des policies RLS minimales pour `profiles`, `spas` et `transactions`. Exécutez-le en priorité si vous voyez des erreurs RLS.

Exécutez également `supabase/sql/fix_schema.sql` dans Supabase pour créer/mettre à jour le trigger `handle_new_user` (création du profil avec `role`).

### Configuration Netlify / Supabase

Pour que l'auth fonctionne en production :

- Sur Netlify (Site settings → Build & deploy → Environment variables), définir :
  - NEXT_PUBLIC_SUPABASE_URL
  - NEXT_PUBLIC_SUPABASE_ANON_KEY
  Avec EXACTEMENT les mêmes valeurs que dans .env.local.

- Dans Supabase (Authentication → URL de redirection), ajouter :
  - https://rainbow-chimera-120e5d.netlify.app
  - https://rainbow-chimera-120e5d.netlify.app/*

Sans cette configuration, la session ne sera pas reconnue en production
et les utilisateurs resteront bloqués sur la page de connexion.
