'use server';

import { createClient } from '@/lib/supabaseServer';

export async function addSpaAction(formData: FormData) {
  const supabase = createClient();

  const name = String(formData.get('name') ?? '').trim();
  const city = String(formData.get('city') ?? '').trim();

  if (!name) {
    throw new Error("Le nom du refuge est obligatoire.");
  }

  const { error } = await supabase
    .from('spas')
    .insert([{ name, city }]);

  if (error) throw error;

  return true;
}
