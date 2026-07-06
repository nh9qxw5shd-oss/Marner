/**
 * UK 2026/27 tax-year constants.
 * Frozen until 2031 per Autumn Budget 2025.
 *
 * When April 2027 arrives, change the values here and update the label.
 */

export const TAX_YEAR_LABEL = '2026/27';

export const PERSONAL_ALLOWANCE = 12_570;
export const PA_TAPER_START     = 100_000;
export const PA_TAPER_END       = 125_140;

/**
 * rUK income tax bands, expressed as cumulative caps of TAXABLE income
 * (income after allowances). These are the statutory limits: basic rate
 * limit £37,700, higher rate limit £125,140. Note the higher rate limit is
 * NOT £125,140 − PA: the personal allowance is fully tapered away before
 * income reaches £125,140, so the additional rate starts at £125,140 of
 * taxable income (e.g. £130k income → £130k taxable → £4,860 at 45%).
 *  Basic 20%:    first £37,700 of taxable income (£12,571 – £50,270 with full PA)
 *  Higher 40%:   £37,701 – £125,140 taxable
 *  Additional:   above £125,140 taxable
 */
export const RUK_BANDS = [
  { rate: 0.20, upTo: 37_700 },
  { rate: 0.40, upTo: 125_140 },
  { rate: 0.45, upTo: Infinity },
] as const;

/**
 * Scottish income tax bands, cumulative caps of TAXABLE income (after
 * allowances). As with rUK, the top-rate limit is £125,140 of taxable
 * income — the PA is fully tapered away before that point.
 *  Starter 19%:        £12,571 – £15,397 with full PA  → first 2,827 taxable
 *  Basic 20%:          £15,398 – £29,526               → to 16,956
 *  Intermediate 21%:   £29,527 – £43,662               → to 31,092
 *  Higher 42%:         £43,663 – £75,000               → to 62,430
 *  Advanced 45%:       to £125,140 taxable
 *  Top 48%:            above £125,140 taxable
 */
export const SCOTLAND_BANDS = [
  { rate: 0.19, upTo: 2_827 },
  { rate: 0.20, upTo: 16_956 },
  { rate: 0.21, upTo: 31_092 },
  { rate: 0.42, upTo: 62_430 },
  { rate: 0.45, upTo: 125_140 },
  { rate: 0.48, upTo: Infinity },
] as const;

export const NI = {
  primaryThreshold: 12_570,
  upperEarningsLimit: 50_270,
  mainRate: 0.08,
  upperRate: 0.02,
} as const;

export type StudentLoanPlan =
  | 'NONE' | 'PLAN_1' | 'PLAN_2' | 'PLAN_4' | 'PLAN_5';

export const STUDENT_LOANS: Record<StudentLoanPlan, { threshold: number; rate: number }> = {
  NONE:    { threshold: Infinity, rate: 0 },
  PLAN_1:  { threshold: 26_900, rate: 0.09 },
  PLAN_2:  { threshold: 29_385, rate: 0.09 },
  PLAN_4:  { threshold: 33_795, rate: 0.09 },
  PLAN_5:  { threshold: 25_000, rate: 0.09 },
};

export const POSTGRAD = { threshold: 21_000, rate: 0.06 } as const;

export type Region = 'rUK' | 'scotland';
export type PensionType = 'salary_sacrifice' | 'net_pay' | 'relief_at_source';
