import { createBrowserClient } from "@supabase/ssr";

type CreateClientOptions = {
  remember?: boolean; // true = rester connecté (localStorage), false = session non persistée
};

export function createClient(options?: CreateClientOptions) {
  const remember = options?.remember ?? true;

  // Storage "mémoire" si on ne veut pas persister la session
  const memoryStorage: Storage = {
    getItem: () => null,
    setItem: () => {},
    removeItem: () => {},
    clear: () => {},
    key: () => null,
    length: 0,
  };

  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      auth: {
        persistSession: remember,
        autoRefreshToken: true,
        detectSessionInUrl: true,
        storage: remember ? undefined : memoryStorage,
      },
    }
  );
}
