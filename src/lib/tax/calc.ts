/**
 * Pure UK PAYE calculator. No React, no I/O — just numbers.
 */

import {
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
  restDayHoursPer4W: number;
  sundayRestDayHoursPer4W: number;
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
  cashAnnual: number;       // total annual take-home including bonus
  cash4Weekly: number;      // regular per-period take-home WITHOUT bonus
  cashMonthly: number;      // regular monthly take-home WITHOUT bonus
  cashWeekly: number;       // regular weekly take-home WITHOUT bonus
  netBonus: number;         // net after-tax bonus (paid as one lump sum)
  cash4WeeklyBonusPeriod: number; // take-home in the period the bonus is received
  effectiveTaxRate: number;
  marginal: number;
  allowance: number;
  taxYear: string;
}

type TaxCodeRule = 'STANDARD' | 'BR' | 'D0' | 'D1' | 'D2' | 'NT';

interface ParsedTaxCode {
  allowance: number;
  rule: TaxCodeRule;
}

export function parseTaxCode(code: string): ParsedTaxCode {
  if (!code) return { allowance: PERSONAL_ALLOWANCE, rule: 'STANDARD' };
  const c = String(code).toUpperCase().trim().replace(/\s+/g, '');
  if (c === 'BR') return { allowance: 0, rule: 'BR' };
  if (c === 'D0') return { allowance: 0, rule: 'D0' };
  if (c === 'D1') return { allowance: 0, rule: 'D1' };
  if (c === 'D2') return { allowance: 0, rule: 'D2' };
  if (c === 'NT') return { allowance: 0, rule: 'NT' };
  if (c === '0T') return { allowance: 0, rule: 'STANDARD' };
  // K codes: prefix indicates negative allowance (additional taxable income)
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

function computeMarginalRate(grossForTax: number, region: Region): number {
  let income = 0;
  if (region === 'scotland') {
    if (grossForTax >= 125_140) income = 0.48;
    else if (grossForTax >= 75_000) income = 0.45;
    else if (grossForTax >= 43_662) income = 0.42;
    else if (grossForTax >= 29_526) income = 0.21;
    else if (grossForTax >= 15_397) income = 0.20;
    else if (grossForTax >= 12_570) income = 0.19;
  } else {
    if (grossForTax >= 125_140) income = 0.45;
    else if (grossForTax >= 100_000) income = 0.60; // PA taper
    else if (grossForTax >= 50_270) income = 0.40;
    else if (grossForTax >= 12_570) income = 0.20;
  }
  let niM = 0;
  if (grossForTax >= 50_270) niM = 0.02;
  else if (grossForTax >= 12_570) niM = 0.08;
  return income + niM;
}

export function calcTakeHome(cfg: PayConfig): PayResult {
  const PERIODS_PER_YEAR = 13; // 52 weeks / 4-weekly

  const base = cfg.baseSalary || 0;
  const hourlyRate = base / 52 / (cfg.contractHoursPerWeek || 35);
  const opsAllowanceAnnual = base * ((cfg.opsAllowancePct || 0) / 100);
  const restDayExtra   = hourlyRate * 1.25 * (cfg.restDayHoursPer4W || 0) * PERIODS_PER_YEAR;
  const sundayExtra    = hourlyRate * 1.50 * (cfg.sundayRestDayHoursPer4W || 0) * PERIODS_PER_YEAR;
  const restDaySundayAnnual = restDayExtra + sundayExtra;
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

  const { allowance: codeAllowance, rule } = parseTaxCode(cfg.taxCode);

  const baseAllowance =
    codeAllowance < 0 ? codeAllowance : effectivePA(grossForTax, codeAllowance);

  const taxableForBands =
    Math.max(0, grossForTax - Math.max(0, baseAllowance)) +
    (baseAllowance < 0 ? Math.abs(baseAllowance) : 0);

  let incomeTax: number;
  if (rule === 'NT') incomeTax = 0;
  else if (rule === 'BR') incomeTax = grossForTax * 0.20;
  else if (rule === 'D0') incomeTax = grossForTax * 0.40;
  else if (rule === 'D1') incomeTax = grossForTax * 0.45;
  else if (rule === 'D2') incomeTax = grossForTax * 0.48;
  else {
    const bands = cfg.region === 'scotland' ? SCOTLAND_BANDS : RUK_BANDS;
    incomeTax = calcBandsTax(taxableForBands, bands);
  }

  const ni = calcNI(grossForNI);
  const studentLoan = calcStudentLoan(grossAnnualPreSac, cfg.studentLoanPlan, cfg.hasPostgrad);

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

  // Isolate the net bonus as a single payment — recalculate without bonus to find regular pay.
  // The recursive call is safe: it passes bonusAnnual=0 so will not recurse further.
  const cashAnnualNoBonus = cfg.bonusAnnual
    ? calcTakeHome({ ...cfg, bonusAnnual: 0 }).cashAnnual
    : cashAnnual;
  const netBonusPayment = cashAnnual - cashAnnualNoBonus;
  const regularPeriodCash = cashAnnualNoBonus / PERIODS_PER_YEAR;

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
    cashAnnual,
    cash4Weekly: regularPeriodCash,
    cashMonthly: cashAnnualNoBonus / 12,
    cashWeekly: cashAnnualNoBonus / 52,
    netBonus: netBonusPayment,
    cash4WeeklyBonusPeriod: regularPeriodCash + netBonusPayment,
    effectiveTaxRate:
      grossAnnualPreSac > 0 ? (incomeTax + ni + studentLoan) / grossAnnualPreSac : 0,
    marginal: computeMarginalRate(grossForTax, cfg.region),
    allowance: Math.max(0, baseAllowance),
    taxYear: TAX_YEAR_LABEL,
  };
}
