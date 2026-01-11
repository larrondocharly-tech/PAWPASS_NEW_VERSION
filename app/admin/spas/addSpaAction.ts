"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";

function createSupabaseServerClient() {
  const cookieStore = cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value;
        },
        set() {
          // pas de modif cookies ici
        },
        remove() {
          // pas de modif cookies ici
        },
      },
    }
  );
}

export async function addSpaAction(formData: FormData) {
  const name = (formData.get("name") as string | null)?.trim();
  const cityRaw = (formData.get("city") as string | null)?.trim();
  const city = cityRaw && cityRaw.length > 0 ? cityRaw : null;

  if (!name || name.length === 0) {
    // on ne throw pas d'erreur, on revalide juste la page
    console.error("addSpaAction: nom de SPA manquant");
    revalidatePath("/admin/spas");
    return;
  }

  const supabase = createSupabaseServerClient();

  // Vérifier que l’utilisateur est bien connecté
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    console.error("addSpaAction: utilisateur non connecté", userError);
    redirect("/login");
  }

  // Vérifier que c'est un admin (comme dans requireAdmin)
  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user!.id)
    .maybeSingle();

  if (profileError) {
    console.error("addSpaAction: erreur profil admin", profileError);
    redirect("/login");
  }

  if (!profile || profile.role?.toLowerCase() !== "admin") {
    console.error("addSpaAction: accès non admin");
    redirect("/dashboard");
  }

  // Insert dans la table spas
  const { error: insertError } = await supabase.from("spas").insert({
    name,
    city,
  });

  if (insertError) {
    console.error("addSpaAction: erreur insert SPA", insertError);
    // On revalide quand même la page pour éviter de bloquer l'UI
    revalidatePath("/admin/spas");
    return;
  }

  // Rechargement server-side de la page /admin/spas
  revalidatePath("/admin/spas");
}
