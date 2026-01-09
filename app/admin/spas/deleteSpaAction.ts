'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabaseServer';

export async function deleteSpaAction(formData: FormData) {
  const supabase = createClient();
  const id = String(formData.get('id') ?? '').trim();

  if (!id) {
    return false;
  }

  const { error } = await supabase.from('spas').delete().eq('id', id);

  if (error) throw error;

  revalidatePath('/admin/spas');

  return true;
}
