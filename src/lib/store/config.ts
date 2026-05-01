'use client';

import { getSupabase } from '@/lib/supabase/client';
import type { PayConfig } from '@/lib/tax/calc';

interface ConfigRow {
  balance: number;
  pay_config: Partial<PayConfig>;
}

const ROW_ID = 1 as const;

export async function getConfig(): Promise<ConfigRow | null> {
  const sb = getSupabase();
  const { data, error } = await sb
    .from('config')
    .select('balance, pay_config')
    .eq('id', ROW_ID)
    .single();
  if (error) {
    if ((error as { code?: string }).code === 'PGRST116') return null;
    throw error;
  }
  return { balance: Number(data.balance), pay_config: data.pay_config ?? {} };
}

export async function setBalance(balance: number): Promise<void> {
  const sb = getSupabase();
  const { error } = await sb
    .from('config')
    .upsert({ id: ROW_ID, balance }, { onConflict: 'id' });
  if (error) throw error;
}

export async function setPayConfig(payConfig: PayConfig): Promise<void> {
  const sb = getSupabase();
  const { error } = await sb
    .from('config')
    .upsert({ id: ROW_ID, pay_config: payConfig }, { onConflict: 'id' });
  if (error) throw error;
}
