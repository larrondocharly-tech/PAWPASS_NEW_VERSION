import { createBrowserClient } from "@supabase/ssr";

type CreateClientOptions = { remember?: boolean };

function getBrowserStorage(remember: boolean) {
  // ✅ Pendant le build / SSR (Vercel), window n’existe pas
  if (typeof window === "undefined") return undefined;

  return remember ? window.localStorage : window.sessionStorage;
}

export function createClient(options: CreateClientOptions = {}) {
  const remember = options.remember ?? true;

  const storage = getBrowserStorage(remember);

  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
        // ✅ IMPORTANT : ne mets storage que si on est bien dans le navigateur
        ...(storage ? { storage } : {}),
      },
    }
  );
}
