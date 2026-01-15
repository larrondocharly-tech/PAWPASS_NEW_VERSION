"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabaseClient";

interface DeleteSpaButtonProps {
  id: string;
}

export function DeleteSpaButton({ id }: DeleteSpaButtonProps) {
  const supabase = createClient();
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const handleDelete = () => {
    const ok = window.confirm("Voulez-vous vraiment supprimer cette SPA ?");
    if (!ok) return;

    startTransition(async () => {
      const { error } = await supabase.from("spas").delete().eq("id", id);

      if (error) {
        console.error("Erreur delete SPA (client):", error);
        alert("Impossible de supprimer cette SPA. Regarde la console.");
        return;
      }

      // On recharge la page pour re-fetcher la liste côté serveur
      router.refresh();
    });
  };

  return (
    <button
      type="button"
      onClick={handleDelete}
      className="button secondary"
      disabled={isPending}
    >
      {isPending ? "Suppression..." : "Supprimer"}
    </button>
  );
}
