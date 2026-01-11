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

export async function deleteSpaAction(formData: FormData) {
  const id = formData.get("id") as string | null;

  if (!id) {
    console.error("deleteSpaAction: id manquant");
    revalidatePath("/admin/spas");
    return;
  }

  const supabase = createSupabaseServerClient();

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    console.error("deleteSpaAction: utilisateur non connecté", userError);
    redirect("/login");
  }

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user!.id)
    .maybeSingle();

  if (profileError) {
    console.error("deleteSpaAction: erreur profil admin", profileError);
    redirect("/login");
  }

  if (!profile || profile.role?.toLowerCase() !== "admin") {
    console.error("deleteSpaAction: accès non admin");
    redirect("/dashboard");
  }

  const { error: deleteError } = await supabase
    .from("spas")
    .delete()
    .eq("id", id);

  if (deleteError) {
    console.error("deleteSpaAction: erreur delete SPA", deleteError);
    revalidatePath("/admin/spas");
    return;
  }

  revalidatePath("/admin/spas");
}
