'use client';

import { getSupabase } from '@/lib/supabase/client';
import type { Bill } from '@/lib/types';

const TABLE = 'bills';

export async function listBills(): Promise<Bill[]> {
  const sb = getSupabase();
  const { data, error } = await sb
    .from(TABLE)
    .select('id, description, amount, category, paid, position')
    .order('position', { ascending: true })
    .order('created_at', { ascending: true });
  if (error) throw error;
  return (data ?? []).map((b) => ({ ...b, amount: Number(b.amount) })) as Bill[];
}

export async function insertBill(bill: Omit<Bill, 'id'>): Promise<Bill> {
  const sb = getSupabase();
  const { data, error } = await sb
    .from(TABLE)
    .insert({
      description: bill.description,
      amount: bill.amount,
      category: bill.category,
      paid: bill.paid,
      position: bill.position,
    })
    .select('id, description, amount, category, paid, position')
    .single();
  if (error) throw error;
  return { ...data, amount: Number(data.amount) } as Bill;
}

export async function updateBill(
  id: string,
  patch: Partial<Omit<Bill, 'id'>>
): Promise<void> {
  const sb = getSupabase();
  const { error } = await sb.from(TABLE).update(patch).eq('id', id);
  if (error) throw error;
}

export async function deleteBill(id: string): Promise<void> {
  const sb = getSupabase();
  const { error } = await sb.from(TABLE).delete().eq('id', id);
  if (error) throw error;
}

export async function bulkInsertBills(bills: Omit<Bill, 'id'>[]): Promise<Bill[]> {
  const sb = getSupabase();
  const rows = bills.map((b) => ({
    description: b.description,
    amount: b.amount,
    category: b.category,
    paid: b.paid,
    position: b.position,
  }));
  const { data, error } = await sb
    .from(TABLE)
    .insert(rows)
    .select('id, description, amount, category, paid, position');
  if (error) throw error;
  return (data ?? []).map((b) => ({ ...b, amount: Number(b.amount) })) as Bill[];
}

export async function deleteAllBills(): Promise<void> {
  const sb = getSupabase();
  // .delete() requires a filter; use a tautology so it matches all rows
  const { error } = await sb.from(TABLE).delete().not('id', 'is', null);
  if (error) throw error;
}
