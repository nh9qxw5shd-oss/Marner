'use client';

import { useMemo } from 'react';
import { NumericInput } from './NumericInput';
import { calcTakeHome } from '@/lib/tax/calc';
import { fmtGBP, fmtPct } from '@/lib/format';
import type { PayConfig } from '@/lib/types';

export function PayCalculator({
  pay,
  onChange,
}: {
  pay: PayConfig;
  onChange: (patch: Partial<PayConfig>) => void;
}) {
  const r = useMemo(() => calcTakeHome(pay), [pay]);

  const breakdown = [
    { label: 'Base salary', value: pay.baseSalary, accent: '#E8EDF5' },
    {
      label: 'Ops allowance',
      value: r.opsAllowanceAnnual,
      accent: r.opsAllowanceAnnual > 0 ? '#4A9ECC' : '#7A8BA8',
      hint: `${pay.opsAllowancePct}%`,
    },
    {
      label: 'Competence payment',
      value: r.competencePaymentAnnual,
      accent: r.competencePaymentAnnual > 0 ? '#4A9ECC' : '#7A8BA8',
      hint: `£${pay.competencePayment4W}/period`,
    },
    {
      label: 'Rest day / Sunday pay',
      value: r.restDaySundayAnnual,
      accent: r.restDaySundayAnnual > 0 ? '#4A9ECC' : '#7A8BA8',
    },
    { label: 'Annual bonus (gross)', value: pay.bonusAnnual, accent: pay.bonusAnnual > 0 ? '#E8EDF5' : '#7A8BA8' },
    {
      label: 'Cycle to work',
      value: -r.cycleToWorkAnnual,
      accent: r.cycleToWorkAnnual > 0 ? '#7A8BA8' : '#7A8BA8',
      hint: 'pre-tax sacrifice',
    },
    {
      label: 'Healthcare',
      value: -r.healthcareAnnual,
      accent: r.healthcareAnnual > 0 ? '#7A8BA8' : '#7A8BA8',
      hint: 'pre-tax',
    },
    {
      label: 'Pension contribution',
      value: -r.pensionContrib,
      accent: r.pensionContrib > 0 ? '#F39C12' : '#7A8BA8',
      hint: pay.pensionType.replace(/_/g, ' '),
    },
    { label: 'Income tax', value: -r.incomeTax, accent: '#E74C3C' },
    { label: 'National Insurance', value: -r.ni, accent: '#E74C3C' },
    {
      label: 'Student loan',
      value: -r.studentLoan,
      accent: r.studentLoan > 0 ? '#F39C12' : '#7A8BA8',
    },
    { label: 'Regular take-home (annual, excl. bonus)', value: r.cashAnnual - r.netBonus, accent: '#4A9ECC', bold: false },
    ...(pay.bonusAnnual > 0 ? [
      { label: 'Net bonus (after tax/NI — paid as single lump sum)', value: r.netBonus, accent: '#27AE60', hint: 'one-off payment' },
      { label: 'Total take-home (annual)', value: r.cashAnnual, accent: '#27AE60', bold: true },
    ] : [
      { label: 'Take-home (annual)', value: r.cashAnnual, accent: '#27AE60', bold: true },
    ]),
  ];

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(300px, 100%), 1fr))', gap: 24, alignItems: 'start' }}>
      <div className="panel" style={{ padding: 20 }}>
        <div className="lab" style={{ marginBottom: 14 }}>Inputs</div>

        <Field label="Annual headline salary">
          <NumericInput
            value={pay.baseSalary}
            onChange={(n) => onChange({ baseSalary: n })}
          />
        </Field>

        <Field label="Contract hours / week">
          <NumericInput
            step="0.5"
            value={pay.contractHoursPerWeek}
            onChange={(n) => onChange({ contractHoursPerWeek: n })}
            fallback={35}
          />
        </Field>

        <Field label="Ops allowance %">
          <NumericInput
            step="1"
            value={pay.opsAllowancePct}
            onChange={(n) => onChange({ opsAllowancePct: n })}
          />
          <div style={{ fontSize: 11, color: '#7A8BA8', marginTop: 4 }}>
            % of base salary, paid each period
          </div>
        </Field>

        <Field label="Rest day hours per period (1.25×)">
          <NumericInput
            step="1"
            value={pay.restDayHoursPer4W}
            onChange={(n) => onChange({ restDayHoursPer4W: n })}
          />
        </Field>

        <Field label="Sunday rest day hours per period (1.5×)">
          <NumericInput
            step="1"
            value={pay.sundayRestDayHoursPer4W}
            onChange={(n) => onChange({ sundayRestDayHoursPer4W: n })}
          />
        </Field>

        <Field label="Competence payment per period (£)">
          <NumericInput
            step="0.01"
            value={pay.competencePayment4W}
            onChange={(n) => onChange({ competencePayment4W: n })}
          />
        </Field>

        <div className="divider" />

        <Field label="Cycle to work repayment per period (£)">
          <NumericInput
            step="0.01"
            value={pay.cycleToWork4W}
            onChange={(n) => onChange({ cycleToWork4W: n })}
          />
          <div style={{ fontSize: 11, color: '#7A8BA8', marginTop: 4 }}>
            Salary sacrifice — reduces tax &amp; NI
          </div>
        </Field>

        <Field label="Healthcare deduction per period (£)">
          <NumericInput
            step="0.01"
            value={pay.healthcare4W}
            onChange={(n) => onChange({ healthcare4W: n })}
          />
          <div style={{ fontSize: 11, color: '#7A8BA8', marginTop: 4 }}>
            Pre-tax — reduces tax &amp; NI
          </div>
        </Field>

        <Field label="Annual bonus (gross)">
          <NumericInput
            value={pay.bonusAnnual}
            onChange={(n) => onChange({ bonusAnnual: n })}
          />
        </Field>

        <Field label="Tax code">
          <input
            value={pay.taxCode}
            onChange={(e) => onChange({ taxCode: e.target.value.toUpperCase() })}
            placeholder="1257L"
          />
          <div style={{ fontSize: 11, color: '#7A8BA8', marginTop: 4 }}>
            Standard, BR, D0, D1, D2, NT, 0T, K codes supported
          </div>
        </Field>

        <Field label="Region">
          <select value={pay.region} onChange={(e) => onChange({ region: e.target.value as PayConfig['region'] })}>
            <option value="rUK">England / Wales / NI</option>
            <option value="scotland">Scotland</option>
          </select>
        </Field>

        <div className="divider" />

        <Field label="Pension contribution %">
          <NumericInput
            step="0.5"
            value={pay.pensionPct}
            onChange={(n) => onChange({ pensionPct: n })}
          />
        </Field>

        <Field label="Pension treatment">
          <select
            value={pay.pensionType}
            onChange={(e) => onChange({ pensionType: e.target.value as PayConfig['pensionType'] })}
          >
            <option value="salary_sacrifice">Salary sacrifice</option>
            <option value="net_pay">Net pay (occupational)</option>
            <option value="relief_at_source">Relief at source</option>
          </select>
        </Field>

        <div className="divider" />

        <Field label="Student loan plan">
          <select
            value={pay.studentLoanPlan}
            onChange={(e) =>
              onChange({ studentLoanPlan: e.target.value as PayConfig['studentLoanPlan'] })
            }
          >
            <option value="NONE">None</option>
            <option value="PLAN_1">Plan 1</option>
            <option value="PLAN_2">Plan 2</option>
            <option value="PLAN_4">Plan 4 (Scotland)</option>
            <option value="PLAN_5">Plan 5</option>
          </select>
        </Field>

        <label
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            marginTop: 6,
            fontSize: 13,
            color: '#A9B5C9',
            cursor: 'pointer',
          }}
        >
          <input
            type="checkbox"
            checked={pay.hasPostgrad}
            onChange={(e) => onChange({ hasPostgrad: e.target.checked })}
          />
          Also has Postgraduate Loan
        </label>
      </div>

      <div style={{ display: 'grid', gap: 20, alignContent: 'start' }}>
        <div className="card tick" style={{ padding: 28 }}>
          <div className="lab">4-weekly take-home{pay.bonusAnnual > 0 ? ' (regular periods)' : ''}</div>
          <div
            className="num"
            style={{ fontSize: 64, color: '#27AE60', lineHeight: 1, marginTop: 12, fontWeight: 500 }}
          >
            {fmtGBP(r.cash4Weekly, { decimals: 0 })}
          </div>
          <div style={{ display: 'flex', gap: 24, marginTop: 18, flexWrap: 'wrap' }}>
            <Stat label="Annual (incl. bonus)" value={fmtGBP(r.cashAnnual)} />
            <Stat label="Monthly" value={fmtGBP(r.cashMonthly)} />
            <Stat label="Weekly" value={fmtGBP(r.cashWeekly)} />
            {pay.bonusAnnual > 0 && (
              <Stat label="Net bonus (lump sum)" value={fmtGBP(r.netBonus)} accent="#F39C12" />
            )}
            {pay.bonusAnnual > 0 && (
              <Stat label="Bonus period take-home" value={fmtGBP(r.cash4WeeklyBonusPeriod, { decimals: 0 })} accent="#F39C12" />
            )}
            <Stat label="Effective tax" value={fmtPct(r.effectiveTaxRate, 1)} />
            <Stat label="Marginal rate" value={fmtPct(r.marginal, 0)} />
            <Stat label="Allowance applied" value={fmtGBP(r.allowance)} />
          </div>
        </div>

        <div className="panel" style={{ padding: 20 }}>
          <div className="lab" style={{ marginBottom: 14 }}>Breakdown · annual</div>
          <div style={{ display: 'grid', gap: 0 }}>
            {breakdown.map((b, i) => (
              <div
                key={i}
                style={{
                  display: 'grid',
                  gridTemplateColumns: '1fr auto auto',
                  gap: 16,
                  alignItems: 'baseline',
                  padding: '12px 0',
                  borderBottom:
                    i < breakdown.length - 1 ? '1px solid rgba(74,111,165,0.18)' : 'none',
                }}
              >
                <div style={{ color: '#A9B5C9', fontSize: 13 }}>
                  {b.label}
                  {b.hint && (
                    <span
                      style={{
                        marginLeft: 8,
                        fontSize: 11,
                        color: '#7A8BA8',
                        fontStyle: 'italic',
                      }}
                    >
                      · {b.hint}
                    </span>
                  )}
                </div>
                <div
                  className="num"
                  style={{
                    fontSize: b.bold ? 22 : 16,
                    color: b.accent,
                    fontWeight: b.bold ? 600 : 400,
                    textAlign: 'right',
                  }}
                >
                  {b.value < 0 ? `−${fmtGBP(Math.abs(b.value))}` : fmtGBP(b.value)}
                </div>
                <div style={{ width: 12 }} />
              </div>
            ))}
          </div>
        </div>

        <div className="panel" style={{ padding: 20 }}>
          <div className="lab" style={{ marginBottom: 14 }}>Where your gross goes</div>
          <BreakdownBar
            gross={r.grossAnnualPreSac}
            slices={[
              { label: 'Cycle to work', value: r.cycleToWorkAnnual, color: '#2980B9' },
              { label: 'Healthcare', value: r.healthcareAnnual, color: '#1A5276' },
              { label: 'Pension', value: r.pensionContrib + r.pensionFromNet, color: '#F39C12' },
              { label: 'Income tax', value: r.incomeTax, color: '#E74C3C' },
              { label: 'NI', value: r.ni, color: '#C0392B' },
              { label: 'Student loan', value: r.studentLoan, color: '#8E44AD' },
              { label: 'Take-home', value: r.cashAnnual, color: '#27AE60' },
            ]}
          />
        </div>

        <div
          style={{
            fontSize: 11,
            color: '#7A8BA8',
            fontFamily: "'JetBrains Mono', ui-monospace, monospace",
            letterSpacing: '0.04em',
          }}
        >
          Estimates only. UK 2026/27 thresholds: PA £12,570 · NI 8% / 2% · Higher rate £50,270 ·
          Additional £125,140. 13 × 4-weekly periods per year. Rest day 1.25× · Sunday rest day 1.5× ordinary
          time rate. Ops allowance on base salary only. Pension on base salary only. Salary sacrifice
          reduces both tax &amp; NI base.
        </div>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 14 }}>
      <div className="lab" style={{ marginBottom: 6 }}>{label}</div>
      {children}
    </div>
  );
}

function Stat({ label, value, accent }: { label: string; value: string; accent?: string }) {
  return (
    <div>
      <div className="lab">{label}</div>
      <div className="num" style={{ fontSize: 20, marginTop: 4, fontWeight: 500, color: accent }}>{value}</div>
    </div>
  );
}

function BreakdownBar({
  gross,
  slices,
}: {
  gross: number;
  slices: { label: string; value: number; color: string }[];
}) {
  const total = slices.reduce((s, x) => s + Math.max(0, x.value), 0);
  if (total <= 0) {
    return <div style={{ color: '#7A8BA8', fontSize: 13 }}>Enter a salary to see breakdown.</div>;
  }
  return (
    <div>
      <div
        style={{
          display: 'flex',
          height: 32,
          borderRadius: 2,
          overflow: 'hidden',
          border: '1px solid rgba(74,111,165,0.18)',
        }}
      >
        {slices.map((s, i) => {
          const pct = (Math.max(0, s.value) / total) * 100;
          if (pct < 0.5) return null;
          return (
            <div
              key={i}
              title={`${s.label}: ${fmtGBP(s.value)}`}
              style={{ width: `${pct}%`, background: s.color, transition: 'width 0.25s ease' }}
            />
          );
        })}
      </div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 16, marginTop: 14 }}>
        {slices.map((s, i) => (
          <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{ width: 10, height: 10, background: s.color, borderRadius: 1 }} />
            <span style={{ fontSize: 12, color: '#A9B5C9' }}>{s.label}</span>
            <span className="num" style={{ fontSize: 13 }}>{fmtGBP(s.value)}</span>
            <span style={{ fontSize: 11, color: '#7A8BA8' }}>
              ({((s.value / gross) * 100).toFixed(1)}%)
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
