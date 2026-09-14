/**
 * Pure UK PAYE calculator. No React, no I/O — just numbers.
 */

import {
  K_CODE_MAX_DEDUCTION,
  NI,
  PA_TAPER_END,
  PA_TAPER_START,
  PERSONAL_ALLOWANCE,
  POSTGRAD,
  RUK_BANDS,
  SCOTLAND_BANDS,
  STUDENT_LOANS,
  TAX_YEAR_LABEL,
  type PensionType,
  type Region,
  type StudentLoanPlan,
} from './constants';

export interface PayConfig {
  baseSalary: number;
  contractHoursPerWeek: number;
  opsAllowancePct: number;
  restDayHoursPer4W: number;         // typical rest-day hours per period (recurs all year)
  sundayRestDayHoursPer4W: number;   // typical Sunday hours per period (recurs all year)
  restDayHoursThisPeriod: number | null;       // one-off override for the next period; null = same as typical
  sundayRestDayHoursThisPeriod: number | null; // one-off override for the next period; null = same as typical
  competencePayment4W: number;
  cycleToWork4W: number;
  healthcare4W: number;
  bonusAnnual: number;
  pensionPct: number;
  pensionType: PensionType;
  taxCode: string;
  region: Region;
  studentLoanPlan: StudentLoanPlan;
  hasPostgrad: boolean;
  nextPayDate: string;     // 'YYYY-MM-DD' — first/next 4-weekly pay date
  payIntervalDays: number; // 28 for 4-weekly
}

export interface PayResult {
  grossAnnualPreSac: number;
  opsAllowanceAnnual: number;
  restDaySundayAnnual: number;
  competencePaymentAnnual: number;
  cycleToWorkAnnual: number;
  healthcareAnnual: number;
  grossForTax: number;
  grossForNI: number;
  pensionContrib: number;
  pensionFromNet: number;
  incomeTax: number;
  ni: number;
  studentLoan: number;
  oneOffExtraGross: number; // gross one-off overtime for the coming period (this-period hours − typical)
  cashAnnual: number;       // total annual take-home including bonus & one-off overtime
  cash4Weekly: number;      // regular per-period take-home WITHOUT bonus/one-offs
  cashMonthly: number;      // regular monthly take-home WITHOUT bonus/one-offs
  cashWeekly: number;       // regular weekly take-home WITHOUT bonus/one-offs
  netBonus: number;         // net after-tax one-off payment (bonus + one-off overtime, single period)
  cash4WeeklyBonusPeriod: number; // take-home in the period the bonus/one-off overtime is received
  effectiveTaxRate: number;
  marginal: number;
  allowance: number;
  kCodeAddition: number;    // annual amount a K code ADDS to taxable pay (0 for non-K codes)
  nonCumulative: boolean;   // true when the tax code carries a W1/M1 ("X") marker
  taxYear: string;
}

type TaxCodeRule = 'STANDARD' | 'BR' | 'D0' | 'D1' | 'D2' | 'NT';

export interface ParsedTaxCode {
  allowance: number;      // negative for K codes (the amount ADDED to taxable pay)
  rule: TaxCodeRule;
  nonCumulative: boolean; // Week 1 / Month 1 basis — each period taxed in isolation
}

/**
 * Trailing non-cumulative markers as they appear on a P2 / payslip:
 * "1257L X", "K386 X", "845T W1/M1", "BR M1", "K386 NONCUM". Whitespace is
 * stripped before matching, so "W1/M1" and "W1M1" are the same thing.
 */
const NON_CUMULATIVE_SUFFIX = /(W1\/M1|W1M1|M1|W1|NONCUMULATIVE|NONCUM|X)$/;

export function parseTaxCode(code: string): ParsedTaxCode {
  if (!code) return { allowance: PERSONAL_ALLOWANCE, rule: 'STANDARD', nonCumulative: false };
  let c = String(code).toUpperCase().trim().replace(/\s+/g, '');
  const nonCumulative = NON_CUMULATIVE_SUFFIX.test(c);
  if (nonCumulative) c = c.replace(NON_CUMULATIVE_SUFFIX, '');
  const parsed = parseTaxCodeBody(c);
  return { ...parsed, nonCumulative };
}

function parseTaxCodeBody(c: string): Omit<ParsedTaxCode, 'nonCumulative'> {
  if (!c) return { allowance: PERSONAL_ALLOWANCE, rule: 'STANDARD' };
  if (c === 'BR') return { allowance: 0, rule: 'BR' };
  if (c === 'D0') return { allowance: 0, rule: 'D0' };
  if (c === 'D1') return { allowance: 0, rule: 'D1' };
  if (c === 'D2') return { allowance: 0, rule: 'D2' };
  if (c === 'NT') return { allowance: 0, rule: 'NT' };
  if (c === '0T') return { allowance: 0, rule: 'STANDARD' };
  // K codes: prefix indicates negative allowance (additional taxable income).
  // Same "× 10 + 9" convention as suffix codes — HMRC's Pay Adjustment Tables
  // are used for both, just added to pay instead of subtracted.
  if (c.startsWith('K')) {
    const n = parseInt(c.slice(1).replace(/[^0-9]/g, ''), 10) || 0;
    return { allowance: -(n * 10 + 9), rule: 'STANDARD' };
  }
  // Standard form e.g. 1257L, 1100M, 1383N — leading digits × 10 + 9
  const digits = c.match(/^(\d+)/);
  if (digits) return { allowance: parseInt(digits[1], 10) * 10 + 9, rule: 'STANDARD' };
  return { allowance: PERSONAL_ALLOWANCE, rule: 'STANDARD' };
}

function calcBandsTax(
  taxableAbovePA: number,
  bands: readonly { rate: number; upTo: number }[]
): number {
  if (taxableAbovePA <= 0) return 0;
  let remaining = taxableAbovePA;
  let prevCap = 0;
  let tax = 0;
  for (const b of bands) {
    const slice = Math.min(remaining, b.upTo - prevCap);
    if (slice > 0) tax += slice * b.rate;
    remaining -= slice;
    prevCap = b.upTo;
    if (remaining <= 0) break;
  }
  return tax;
}

function calcNI(annualEarnings: number): number {
  if (annualEarnings <= NI.primaryThreshold) return 0;
  const middle = Math.min(annualEarnings, NI.upperEarningsLimit) - NI.primaryThreshold;
  const top = Math.max(0, annualEarnings - NI.upperEarningsLimit);
  return middle * NI.mainRate + top * NI.upperRate;
}

function effectivePA(grossForPA: number, baseAllowance: number): number {
  if (grossForPA <= PA_TAPER_START) return baseAllowance;
  if (grossForPA >= PA_TAPER_END) return Math.min(baseAllowance, 0);
  const reduction = (grossForPA - PA_TAPER_START) / 2;
  return Math.max(0, baseAllowance - reduction);
}

function calcStudentLoan(
  annualEarnings: number,
  plan: StudentLoanPlan,
  hasPostgrad: boolean
): number {
  let total = 0;
  if (plan && plan !== 'NONE') {
    const p = STUDENT_LOANS[plan];
    if (annualEarnings > p.threshold) {
      total += (annualEarnings - p.threshold) * p.rate;
    }
  }
  if (hasPostgrad && annualEarnings > POSTGRAD.threshold) {
    total += (annualEarnings - POSTGRAD.threshold) * POSTGRAD.rate;
  }
  return total;
}

/**
 * The allowance the tax code yields against a given annual taxable pay.
 * K codes are never tapered — HMRC has already priced the taper (or whatever
 * else) into the code. Returned negative for K codes.
 */
function resolveAllowance(code: ParsedTaxCode, grossForTax: number): number {
  return code.allowance < 0 ? code.allowance : effectivePA(grossForTax, code.allowance);
}

/** Annual income tax on `grossForTax` given an already-resolved allowance. */
function incomeTaxWithAllowance(
  grossForTax: number,
  allowance: number,
  rule: TaxCodeRule,
  region: Region
): number {
  if (rule === 'NT') return 0;
  if (rule === 'BR') return grossForTax * 0.20;
  if (rule === 'D0') return grossForTax * 0.40;
  if (rule === 'D1') return grossForTax * 0.45;
  if (rule === 'D2') return grossForTax * 0.48;
  const taxableForBands =
    Math.max(0, grossForTax - Math.max(0, allowance)) + (allowance < 0 ? Math.abs(allowance) : 0);
  const bands = region === 'scotland' ? SCOTLAND_BANDS : RUK_BANDS;
  return calcBandsTax(taxableForBands, bands);
}

function incomeTaxFor(grossForTax: number, code: ParsedTaxCode, region: Region): number {
  return incomeTaxWithAllowance(grossForTax, resolveAllowance(code, grossForTax), code.rule, region);
}

/**
 * Total income tax for the year on annual taxable pay `grossForTax`, of which
 * `oneOffLump` lands in a single period and the rest is spread evenly over
 * `periods` pay periods.
 *
 * Cumulative basis: PAYE self-corrects over the year, so the annual figure is
 * exact regardless of when the lump is paid.
 *
 * Non-cumulative (W1/M1, "X") basis: every period is taxed in isolation using
 * 1/periods of the allowance (or K-code addition) and 1/periods of each band,
 * with no reference to earlier periods. Even pay comes out identical to
 * cumulative; a lump does not — it is stacked on one period's bands only, so
 * more of it hits the higher rates and nothing is refunded later. On a K code
 * the deduction in any period is also capped at 50% of that period's taxable
 * pay (the regulatory limit). The code's allowance is fixed for the year, so
 * the taper is resolved on regular pay, not on the lump-inflated period.
 */
function incomeTaxTotal(
  grossForTax: number,
  oneOffLump: number,
  code: ParsedTaxCode,
  region: Region,
  periods: number
): number {
  if (!code.nonCumulative) return incomeTaxFor(grossForTax, code, region);

  const regularAnnual = grossForTax - oneOffLump;
  const allowance = resolveAllowance(code, regularAnnual);
  const periodTax = (periodPay: number) => {
    const tax = incomeTaxWithAllowance(periodPay * periods, allowance, code.rule, region) / periods;
    return code.allowance < 0
      ? Math.min(tax, Math.max(0, periodPay) * K_CODE_MAX_DEDUCTION)
      : tax;
  };
  const regularPeriod = regularAnnual / periods;
  return periodTax(regularPeriod) * (periods - 1) + periodTax(regularPeriod + oneOffLump);
}

export function calcTakeHome(cfg: PayConfig): PayResult {
  const PERIODS_PER_YEAR = 13; // 52 weeks / 4-weekly

  const base = cfg.baseSalary || 0;
  const hourlyRate = base / 52 / (cfg.contractHoursPerWeek || 35);
  const opsAllowanceAnnual = base * ((cfg.opsAllowancePct || 0) / 100);
  const restDayExtra   = hourlyRate * 1.25 * (cfg.restDayHoursPer4W || 0) * PERIODS_PER_YEAR;
  const sundayExtra    = hourlyRate * 1.50 * (cfg.sundayRestDayHoursPer4W || 0) * PERIODS_PER_YEAR;

  // One-off overtime for the coming period: the difference between "this
  // period" hours (if set) and the typical recurring hours. It is earned once,
  // not 13 times, and lands in the same period as the bonus.
  const restThis = cfg.restDayHoursThisPeriod ?? (cfg.restDayHoursPer4W || 0);
  const sunThis  = cfg.sundayRestDayHoursThisPeriod ?? (cfg.sundayRestDayHoursPer4W || 0);
  const oneOffExtraGross =
    hourlyRate * 1.25 * (restThis - (cfg.restDayHoursPer4W || 0)) +
    hourlyRate * 1.50 * (sunThis - (cfg.sundayRestDayHoursPer4W || 0));

  const restDaySundayAnnual = restDayExtra + sundayExtra + oneOffExtraGross;
  const competencePaymentAnnual = (cfg.competencePayment4W || 0) * PERIODS_PER_YEAR;
  const cycleToWorkAnnual = (cfg.cycleToWork4W || 0) * PERIODS_PER_YEAR;
  const healthcareAnnual  = (cfg.healthcare4W  || 0) * PERIODS_PER_YEAR;

  const grossAnnualPreSac =
    base + opsAllowanceAnnual + restDaySundayAnnual + competencePaymentAnnual + (cfg.bonusAnnual || 0);

  // Pension calculated on base salary only (ops allowance and extras are non-pensionable)
  const pensionContrib = base * ((cfg.pensionPct || 0) / 100);

  let grossForTax = grossAnnualPreSac;
  let grossForNI  = grossAnnualPreSac;
  let pensionFromNet = 0;

  if (cfg.pensionType === 'salary_sacrifice') {
    grossForTax -= pensionContrib;
    grossForNI  -= pensionContrib;
  } else if (cfg.pensionType === 'net_pay') {
    grossForTax -= pensionContrib;
  } else {
    pensionFromNet = pensionContrib;
  }

  // Cycle to work and healthcare are pre-tax salary sacrifice — reduce both tax and NI bases
  grossForTax -= cycleToWorkAnnual + healthcareAnnual;
  grossForNI  -= cycleToWorkAnnual + healthcareAnnual;

  const parsedCode = parseTaxCode(cfg.taxCode);
  const oneOffLump = (cfg.bonusAnnual || 0) + oneOffExtraGross;

  const baseAllowance = resolveAllowance(
    parsedCode,
    parsedCode.nonCumulative ? grossForTax - oneOffLump : grossForTax
  );

  // Income tax: annual (exact) on a cumulative code; period-by-period on a
  // non-cumulative (W1/M1) code — see incomeTaxTotal.
  const incomeTax = incomeTaxTotal(grossForTax, oneOffLump, parsedCode, cfg.region, PERIODS_PER_YEAR);

  // NI and student loan are non-cumulative, per-pay-period deductions on
  // NI-able (post-sacrifice) earnings. Regular pay is even across 13 periods;
  // the bonus and any one-off overtime land together in one period, where only
  // the slice up to that period's upper earnings limit pays the main rate.
  // Per-period thresholds are the annual thresholds / 13, so
  // periodDeduction(x) = annualDeduction(13x) / 13.
  const grossForNINoLump = grossForNI - oneOffLump;
  const perPeriodTotal = (annualFn: (g: number) => number) =>
    (annualFn(grossForNINoLump) * 12) / PERIODS_PER_YEAR +
    annualFn(grossForNINoLump + oneOffLump * PERIODS_PER_YEAR) / PERIODS_PER_YEAR;

  const ni = perPeriodTotal(calcNI);
  const studentLoan = perPeriodTotal((g) =>
    calcStudentLoan(g, cfg.studentLoanPlan, cfg.hasPostgrad)
  );

  // grossForTax already has pension (if salary_sacrifice) + cycle-to-work + healthcare deducted.
  // For other pension types we subtract the non-sacrifice items explicitly.
  const preTaxExtra = cycleToWorkAnnual + healthcareAnnual;
  let cashAnnual: number;
  if (cfg.pensionType === 'salary_sacrifice') {
    cashAnnual = grossForTax - incomeTax - ni - studentLoan;
  } else if (cfg.pensionType === 'net_pay') {
    cashAnnual = grossAnnualPreSac - pensionContrib - preTaxExtra - incomeTax - ni - studentLoan;
  } else {
    cashAnnual = grossAnnualPreSac - preTaxExtra - incomeTax - ni - studentLoan - pensionFromNet;
  }

  // Isolate the net one-off payment (bonus + one-off overtime) — recalculate
  // without it to find regular pay. The recursive call is safe: it zeroes the
  // bonus and the this-period overrides, so it will not recurse further.
  const cashAnnualNoLump = oneOffLump !== 0
    ? calcTakeHome({
        ...cfg,
        bonusAnnual: 0,
        restDayHoursThisPeriod: null,
        sundayRestDayHoursThisPeriod: null,
      }).cashAnnual
    : cashAnnual;
  const netLumpPayment = cashAnnual - cashAnnualNoLump;
  const regularPeriodCash = cashAnnualNoLump / PERIODS_PER_YEAR;

  // Marginal rate on the next £1 of regular (evenly spread) gross pay, derived
  // from the actual model so tax-code allowances, the taper window and student
  // loans are all reflected.
  const deductionsAt = (extra: number) =>
    incomeTaxTotal(grossForTax + extra, oneOffLump, parsedCode, cfg.region, PERIODS_PER_YEAR) +
    calcNI(grossForNI + extra) +
    calcStudentLoan(grossForNI + extra, cfg.studentLoanPlan, cfg.hasPostgrad);
  const marginal = deductionsAt(1) - deductionsAt(0);

  return {
    grossAnnualPreSac,
    opsAllowanceAnnual,
    restDaySundayAnnual,
    competencePaymentAnnual,
    cycleToWorkAnnual,
    healthcareAnnual,
    grossForTax,
    grossForNI,
    pensionContrib,
    pensionFromNet,
    incomeTax,
    ni,
    studentLoan,
    oneOffExtraGross,
    cashAnnual,
    cash4Weekly: regularPeriodCash,
    cashMonthly: cashAnnualNoLump / 12,
    cashWeekly: cashAnnualNoLump / 52,
    netBonus: netLumpPayment,
    cash4WeeklyBonusPeriod: regularPeriodCash + netLumpPayment,
    effectiveTaxRate:
      grossAnnualPreSac > 0 ? (incomeTax + ni + studentLoan) / grossAnnualPreSac : 0,
    marginal,
    allowance: Math.max(0, baseAllowance),
    kCodeAddition: baseAllowance < 0 ? -baseAllowance : 0,
    nonCumulative: parsedCode.nonCumulative,
    taxYear: TAX_YEAR_LABEL,
  };
}
