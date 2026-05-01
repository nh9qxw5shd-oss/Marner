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
  bonusAnnual: number;
  pensionPct: number;
  pensionType: PensionType;
  taxCode: string;
  region: Region;
  studentLoanPlan: StudentLoanPlan;
  hasPostgrad: boolean;
}

export interface PayResult {
  grossAnnualPreSac: number;
  opsAllowanceAnnual: number;
  restDaySundayAnnual: number;
  grossForTax: number;
  grossForNI: number;
  pensionContrib: number;
  pensionFromNet: number;
  incomeTax: number;
  ni: number;
  studentLoan: number;
  cashAnnual: number;
  cash4Weekly: number;
  cashMonthly: number;
  cashWeekly: number;
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

  const grossAnnualPreSac = base + opsAllowanceAnnual + restDaySundayAnnual + (cfg.bonusAnnual || 0);

  // Pension calculated on base salary only (ops allowance and extras are non-pensionable)
  const pensionContrib = base * ((cfg.pensionPct || 0) / 100);

  let grossForTax = grossAnnualPreSac;
  let grossForNI = grossAnnualPreSac;
  let pensionFromNet = 0;

  if (cfg.pensionType === 'salary_sacrifice') {
    grossForTax -= pensionContrib;
    grossForNI -= pensionContrib;
  } else if (cfg.pensionType === 'net_pay') {
    grossForTax -= pensionContrib;
  } else {
    pensionFromNet = pensionContrib;
  }

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

  let cashAnnual: number;
  if (cfg.pensionType === 'salary_sacrifice') {
    cashAnnual = grossForTax - incomeTax - ni - studentLoan;
  } else if (cfg.pensionType === 'net_pay') {
    cashAnnual = grossAnnualPreSac - pensionContrib - incomeTax - ni - studentLoan;
  } else {
    cashAnnual = grossAnnualPreSac - incomeTax - ni - studentLoan - pensionFromNet;
  }

  return {
    grossAnnualPreSac,
    opsAllowanceAnnual,
    restDaySundayAnnual,
    grossForTax,
    grossForNI,
    pensionContrib,
    pensionFromNet,
    incomeTax,
    ni,
    studentLoan,
    cashAnnual,
    cash4Weekly: cashAnnual / PERIODS_PER_YEAR,
    cashMonthly: cashAnnual / 12,
    cashWeekly: cashAnnual / 52,
    effectiveTaxRate:
      grossAnnualPreSac > 0 ? (incomeTax + ni + studentLoan) / grossAnnualPreSac : 0,
    marginal: computeMarginalRate(grossForTax, cfg.region),
    allowance: Math.max(0, baseAllowance),
    taxYear: TAX_YEAR_LABEL,
  };
}
