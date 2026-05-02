import type { PayConfig } from './tax/calc';

export type BillFrequency = 'monthly' | 'quarterly' | 'annual' | 'weekly' | 'fortnightly';

export interface Bill {
  id: string;
  description: string;
  amount: number;
  category: string;
  paid: boolean;
  position: number;
  frequency: BillFrequency;
  ddDay: number | null;    // day of month (1–31), maps to due_day in DB
  ddMonth: number | null;  // month (1–12) for quarterly/annual, maps to dd_month
  isBudget: boolean;       // food/spending budget tracked separately
  spent: number;           // running spend for budget items
}

export type { PayConfig };
