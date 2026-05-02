import type { Bill, PayConfig } from './types';

export const DEFAULT_PAY: PayConfig = {
  baseSalary: 70933,
  contractHoursPerWeek: 35,
  opsAllowancePct: 20,
  restDayHoursPer4W: 0,
  sundayRestDayHoursPer4W: 0,
  competencePayment4W: 100,
  cycleToWork4W: 162.06,
  healthcare4W: 104.38,
  bonusAnnual: 0,
  pensionPct: 5,
  pensionType: 'salary_sacrifice',
  taxCode: '845T',
  region: 'rUK',
  studentLoanPlan: 'NONE',
  hasPostgrad: false,
  nextPayDate: '2026-05-22',
  payIntervalDays: 28,
};

export const SEED_BILLS: Omit<Bill, 'id'>[] = [
  // ── Housing ──────────────────────────────────────────────────────────────
  { description: 'Mortgage',            amount: 1591, category: 'Housing',       paid: false, position:  0, frequency: 'monthly',  ddDay:  1, ddMonth: null, isBudget: false, spent: 0 },
  { description: 'Council Tax',         amount:  267, category: 'Housing',       paid: false, position:  1, frequency: 'monthly',  ddDay:  1, ddMonth: null, isBudget: false, spent: 0 },
  // ── Insurance ────────────────────────────────────────────────────────────
  { description: 'Home Insurance',      amount:   31, category: 'Insurance',     paid: false, position:  2, frequency: 'monthly',  ddDay:  1, ddMonth: null, isBudget: false, spent: 0 },
  { description: 'Life Insurance',      amount:  120, category: 'Insurance',     paid: false, position:  3, frequency: 'monthly',  ddDay:  1, ddMonth: null, isBudget: false, spent: 0 },
  // ── Utilities ────────────────────────────────────────────────────────────
  { description: 'Electric (Octopus)',  amount:  275, category: 'Utilities',     paid: false, position:  4, frequency: 'monthly',  ddDay:  1, ddMonth: null, isBudget: false, spent: 0 },
  { description: 'Water',               amount:   80, category: 'Utilities',     paid: false, position:  5, frequency: 'monthly',  ddDay:  1, ddMonth: null, isBudget: false, spent: 0 },
  { description: 'Gas (EDF)',           amount:   61, category: 'Utilities',     paid: false, position:  6, frequency: 'monthly',  ddDay:  1, ddMonth: null, isBudget: false, spent: 0 },
  { description: 'Broadband',           amount:   66, category: 'Utilities',     paid: false, position:  7, frequency: 'monthly',  ddDay:  1, ddMonth: null, isBudget: false, spent: 0 },
  // ── Living ───────────────────────────────────────────────────────────────
  { description: 'Food / Shopping',     amount:  600, category: 'Living',        paid: false, position:  8, frequency: 'monthly',  ddDay: null, ddMonth: null, isBudget: true,  spent: 0 },
  { description: 'NMC (Quarterly)',     amount:   30, category: 'Living',        paid: false, position:  9, frequency: 'quarterly', ddDay:  1, ddMonth:  1,   isBudget: false, spent: 0 },
  { description: 'Boots',               amount:   47, category: 'Living',        paid: false, position: 21, frequency: 'monthly',  ddDay:  1, ddMonth: null, isBudget: false, spent: 0 },
  // ── Subscriptions ────────────────────────────────────────────────────────
  { description: 'Netflix',             amount:   18, category: 'Subscriptions', paid: false, position: 10, frequency: 'monthly',  ddDay:  1, ddMonth: null, isBudget: false, spent: 0 },
  { description: 'Spotify',             amount:   17, category: 'Subscriptions', paid: false, position: 11, frequency: 'monthly',  ddDay: 15, ddMonth: null, isBudget: false, spent: 0 },
  { description: 'Amazon Prime',        amount:    8, category: 'Subscriptions', paid: false, position: 12, frequency: 'monthly',  ddDay: 15, ddMonth: null, isBudget: false, spent: 0 },
  { description: 'Stripe',              amount:   16, category: 'Subscriptions', paid: false, position: 13, frequency: 'monthly',  ddDay:  1, ddMonth: null, isBudget: false, spent: 0 },
  // ── Vehicles ─────────────────────────────────────────────────────────────
  { description: 'Multi-car Insurance', amount:  147, category: 'Vehicles',      paid: false, position: 14, frequency: 'monthly',  ddDay:  1, ddMonth: null, isBudget: false, spent: 0 },
  { description: 'Car PCP — Tesla Y',   amount:  486, category: 'Vehicles',      paid: false, position: 15, frequency: 'monthly',  ddDay:  1, ddMonth: null, isBudget: false, spent: 0 },
  { description: 'Car PCP — Tesla 3',   amount:  391, category: 'Vehicles',      paid: false, position: 16, frequency: 'monthly',  ddDay: 15, ddMonth: null, isBudget: false, spent: 0 },
  { description: 'GAP M3',              amount:   12, category: 'Vehicles',      paid: false, position: 17, frequency: 'monthly',  ddDay:  1, ddMonth: null, isBudget: false, spent: 0 },
  { description: 'PSL (GAP)',           amount:   12, category: 'Vehicles',      paid: false, position: 18, frequency: 'monthly',  ddDay:  1, ddMonth: null, isBudget: false, spent: 0 },
  // ── Mobile ───────────────────────────────────────────────────────────────
  { description: 'Brad Mobile (O2)',    amount:   50, category: 'Mobile',        paid: false, position: 19, frequency: 'monthly',  ddDay:  1, ddMonth: null, isBudget: false, spent: 0 },
  { description: 'Lottie Mobile',       amount:   42, category: 'Mobile',        paid: false, position: 20, frequency: 'monthly',  ddDay:  1, ddMonth: null, isBudget: false, spent: 0 },
];
