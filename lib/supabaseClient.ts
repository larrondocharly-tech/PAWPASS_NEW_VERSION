import { createBrowserClient } from "@supabase/ssr";

type CreateClientOptions = {
  remember?: boolean; // true = reste connecté, false = session uniquement
};

export function createClient(options: CreateClientOptions = {}) {
  const remember = options.remember ?? true;

  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
        storage: remember ? window.localStorage : window.sessionStorage,
      },
    }
  );
}
