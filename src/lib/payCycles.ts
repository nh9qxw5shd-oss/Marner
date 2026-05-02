import type { BillFrequency } from './types';

export interface PayPeriod {
  index: number;       // 0-based within the generated window
  payDate: Date;       // the pay date itself
  end: Date;           // last day of the period (day before next pay date)
  payLabel: string;    // e.g. "22 May"
  rangeLabel: string;  // e.g. "22 May – 18 Jun"
}

function addDays(d: Date, n: number): Date {
  const r = new Date(d);
  r.setDate(r.getDate() + n);
  return r;
}

function fmtShort(d: Date): string {
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
}

function parseISO(iso: string): Date {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(y, m - 1, d);
}

export function generatePayPeriods(
  nextPayDateISO: string,
  intervalDays: number,
  count = 13,
): PayPeriod[] {
  const base = parseISO(nextPayDateISO);
  return Array.from({ length: count }, (_, i) => {
    const payDate = addDays(base, i * intervalDays);
    const end = addDays(base, (i + 1) * intervalDays - 1);
    return {
      index: i,
      payDate,
      end,
      payLabel: fmtShort(payDate),
      rangeLabel: `${fmtShort(payDate)} – ${fmtShort(end)}`,
    };
  });
}

// Returns all dates on which a bill falls within [start, end] inclusive.
function occurrencesInRange(
  start: Date,
  end: Date,
  ddDay: number,
  frequency: BillFrequency,
  ddMonth: number | null,
): Date[] {
  const results: Date[] = [];
  const clamp = (day: number, yr: number, mo: number) =>
    Math.min(day, new Date(yr, mo, 0).getDate()); // days in that month

  if (frequency === 'monthly') {
    const cur = new Date(start.getFullYear(), start.getMonth(), 1);
    const endBound = new Date(end.getFullYear(), end.getMonth(), 1);
    while (cur <= endBound) {
      const d = new Date(cur.getFullYear(), cur.getMonth(), clamp(ddDay, cur.getFullYear(), cur.getMonth() + 1));
      if (d >= start && d <= end) results.push(d);
      cur.setMonth(cur.getMonth() + 1);
    }
  } else if (frequency === 'quarterly') {
    // Use ddMonth (1-based) as the first quarter month; repeat every 3 months.
    // If ddMonth not set, default to January (month 1).
    const firstMo = ((ddMonth ?? 1) - 1) % 3; // 0-based offset: 0,1, or 2
    for (let yr = start.getFullYear(); yr <= end.getFullYear() + 1; yr++) {
      for (let mo = firstMo; mo <= 11; mo += 3) {
        const d = new Date(yr, mo, clamp(ddDay, yr, mo + 1));
        if (d >= start && d <= end) results.push(d);
      }
    }
  } else if (frequency === 'annual') {
    const mo = (ddMonth ?? 1) - 1; // 0-based
    for (let yr = start.getFullYear(); yr <= end.getFullYear() + 1; yr++) {
      const d = new Date(yr, mo, clamp(ddDay, yr, mo + 1));
      if (d >= start && d <= end) results.push(d);
    }
  } else if (frequency === 'weekly') {
    // Find first occurrence on or after start
    // Assume the DD day is a day-of-week (0=Sun...6=Sat) for weekly, but we
    // only have a day-of-month number. Treat as: occurs every 7 days from
    // the first occurrence in/after start. Use ddDay as just "day 1" offset.
    // Simpler: just mark weekly as always due (every period has 4 occurrences).
    results.push(start); // placeholder — weekly always appears in every period
  } else if (frequency === 'fortnightly') {
    results.push(start); // placeholder — fortnightly always appears in every period
  }

  return results;
}

export function billDueInPeriod(
  period: PayPeriod,
  ddDay: number,
  frequency: BillFrequency,
  ddMonth: number | null,
): boolean {
  return occurrencesInRange(period.payDate, period.end, ddDay, frequency, ddMonth).length > 0;
}

// Returns periods (within the given window) that contain no payment for this bill.
export function freePeriodsFor(
  periods: PayPeriod[],
  ddDay: number,
  frequency: BillFrequency,
  ddMonth: number | null,
): PayPeriod[] {
  if (frequency === 'weekly' || frequency === 'fortnightly') return [];
  return periods.filter(p => !billDueInPeriod(p, ddDay, frequency, ddMonth));
}

// Returns the index of the period that contains today, or -1 if none.
export function currentPeriodIndex(periods: PayPeriod[]): number {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return periods.findIndex(p => today >= p.payDate && today <= p.end);
}

// Monthly-equivalent amount for display in totals.
export function toMonthly(amount: number, frequency: BillFrequency): number {
  switch (frequency) {
    case 'weekly':      return (amount * 52) / 12;
    case 'fortnightly': return (amount * 26) / 12;
    case 'monthly':     return amount;
    case 'quarterly':   return amount / 3;
    case 'annual':      return amount / 12;
  }
}

// Per-4-weekly-period equivalent amount.
export function toPeriod(amount: number, frequency: BillFrequency): number {
  switch (frequency) {
    case 'weekly':      return amount * 4;
    case 'fortnightly': return amount * 2;
    case 'monthly':     return (amount * 12) / 13;
    case 'quarterly':   return (amount * 4) / 13;
    case 'annual':      return amount / 13;
  }
}

export const FREQ_LABELS: Record<BillFrequency, string> = {
  monthly:      'monthly',
  quarterly:    'quarterly',
  annual:       'annual',
  weekly:       'weekly',
  fortnightly:  'fortnightly',
};

export const MONTH_NAMES = [
  'Jan','Feb','Mar','Apr','May','Jun',
  'Jul','Aug','Sep','Oct','Nov','Dec',
];

export function ordinal(n: number): string {
  const s = ['th','st','nd','rd'];
  const v = n % 100;
  return n + (s[(v - 20) % 10] ?? s[v] ?? s[0]);
}
