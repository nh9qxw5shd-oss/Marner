'use client';

import { getSupabase } from '@/lib/supabase/client';
import type { Bill } from '@/lib/types';

export async function loadSandbox(): Promise<Bill[] | null> {
  const sb = getSupabase();
  const { data, error } = await sb
    .from('soundboard')
    .select('bills')
    .eq('id', 1)
    .single();
  if (error) throw error;
  const raw = (data as { bills: unknown })?.bills;
  if (!Array.isArray(raw)) return null;
  return raw as Bill[];
}

export async function saveSandbox(bills: Bill[]): Promise<void> {
  const sb = getSupabase();
  const { error } = await sb
    .from('soundboard')
    .upsert({ id: 1, bills });
  if (error) throw error;
}
