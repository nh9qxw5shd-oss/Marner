'use client';

import { getSupabase } from '@/lib/supabase/client';
import type { Bill } from '@/lib/types';

const TABLE = 'bills';

const SELECT_COLS =
  'id, description, amount, category, paid, position, ' +
  'due_day, dd_month, frequency, is_budget, spent';

function mapRow(b: Record<string, unknown>): Bill {
  return {
    id:          b.id as string,
    description: b.description as string,
    amount:      Number(b.amount),
    category:    (b.category as string) ?? 'Uncategorised',
    paid:        Boolean(b.paid),
    position:    Number(b.position ?? 0),
    frequency:   (b.frequency as Bill['frequency']) ?? 'monthly',
    ddDay:       b.due_day  != null ? Number(b.due_day)  : null,
    ddMonth:     b.dd_month != null ? Number(b.dd_month) : null,
    isBudget:    Boolean(b.is_budget),
    spent:       Number(b.spent ?? 0),
  };
}

function toRow(bill: Partial<Omit<Bill, 'id'>>) {
  const row: Record<string, unknown> = {};
  if (bill.description !== undefined) row.description = bill.description;
  if (bill.amount      !== undefined) row.amount      = bill.amount;
  if (bill.category    !== undefined) row.category    = bill.category;
  if (bill.paid        !== undefined) row.paid        = bill.paid;
  if (bill.position    !== undefined) row.position    = bill.position;
  if (bill.frequency   !== undefined) row.frequency   = bill.frequency;
  if ('ddDay'   in bill)              row.due_day     = bill.ddDay;
  if ('ddMonth' in bill)              row.dd_month    = bill.ddMonth;
  if (bill.isBudget    !== undefined) row.is_budget   = bill.isBudget;
  if (bill.spent       !== undefined) row.spent       = bill.spent;
  return row;
}

export async function listBills(): Promise<Bill[]> {
  const sb = getSupabase();
  const { data, error } = await sb
    .from(TABLE)
    .select(SELECT_COLS)
    .order('position', { ascending: true })
    .order('created_at', { ascending: true });
  if (error) throw error;
  return ((data ?? []) as unknown as Record<string, unknown>[]).map(mapRow);
}

export async function insertBill(bill: Omit<Bill, 'id'>): Promise<Bill> {
  const sb = getSupabase();
  const { data, error } = await sb
    .from(TABLE)
    .insert(toRow(bill))
    .select(SELECT_COLS)
    .single();
  if (error) throw error;
  return mapRow(data as unknown as Record<string, unknown>);
}

export async function updateBill(
  id: string,
  patch: Partial<Omit<Bill, 'id'>>,
): Promise<void> {
  const sb = getSupabase();
  const { error } = await sb.from(TABLE).update(toRow(patch)).eq('id', id);
  if (error) throw error;
}

export async function deleteBill(id: string): Promise<void> {
  const sb = getSupabase();
  const { error } = await sb.from(TABLE).delete().eq('id', id);
  if (error) throw error;
}

export async function bulkInsertBills(bills: Omit<Bill, 'id'>[]): Promise<Bill[]> {
  const sb = getSupabase();
  const { data, error } = await sb
    .from(TABLE)
    .insert(bills.map(toRow))
    .select(SELECT_COLS);
  if (error) throw error;
  return ((data ?? []) as unknown as Record<string, unknown>[]).map(mapRow);
}

export async function deleteAllBills(): Promise<void> {
  const sb = getSupabase();
  const { error } = await sb.from(TABLE).delete().not('id', 'is', null);
  if (error) throw error;
}
