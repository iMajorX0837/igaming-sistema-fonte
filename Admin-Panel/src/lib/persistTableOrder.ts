import { supabase } from './supabase';

export async function persistTableOrder(table: string, ids: string[]) {
  const updatedAt = new Date().toISOString();
  const updates = ids.map((id, index) =>
    supabase
      .from(table)
      .update({ ordem: index + 1, updated_at: updatedAt })
      .eq('id', id)
  );

  const results = await Promise.all(updates);
  const failed = results.find((result) => result.error);
  if (failed?.error) throw failed.error;
}
