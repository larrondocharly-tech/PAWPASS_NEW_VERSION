'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabaseServer';

export async function deleteSpaAction(formData: FormData): Promise<void> {
  const supabase = createClient();
  const id = String(formData.get('id') ?? '').trim();

  if (!id) {
    return;
  }

  const { error } = await supabase.from('spas').delete().eq('id', id);

  if (error) throw error;

  revalidatePath('/admin/spas');

}
