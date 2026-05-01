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
 * rUK income tax bands, expressed as cumulative caps ABOVE the personal allowance.
 *  Basic 20%:    £12,571 – £50,270   → 37,700 above PA
 *  Higher 40%:   £50,271 – £125,140  → 112,570 above PA
 *  Additional:   £125,141+
 */
export const RUK_BANDS = [
  { rate: 0.20, upTo: 37_700 },
  { rate: 0.40, upTo: 112_570 },
  { rate: 0.45, upTo: Infinity },
] as const;

/**
 * Scottish income tax bands, cumulative caps ABOVE the personal allowance.
 *  Starter 19%:        £12,571 – £15,397    → 2,827
 *  Basic 20%:          £15,398 – £29,526    → 16,956
 *  Intermediate 21%:   £29,527 – £43,662    → 31,092
 *  Higher 42%:         £43,663 – £75,000    → 62,430
 *  Advanced 45%:       £75,001 – £125,140   → 112,570
 *  Top 48%:            £125,141+
 */
export const SCOTLAND_BANDS = [
  { rate: 0.19, upTo: 2_827 },
  { rate: 0.20, upTo: 16_956 },
  { rate: 0.21, upTo: 31_092 },
  { rate: 0.42, upTo: 62_430 },
  { rate: 0.45, upTo: 112_570 },
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
