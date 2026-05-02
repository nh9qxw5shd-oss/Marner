'use client';

import { useMemo, useState } from 'react';
import { NumericInput } from './NumericInput';
import { Check, Edit2, Plus, RotateCcw, Trash2, X } from 'lucide-react';
import { fmtGBP } from '@/lib/format';
import type { Bill, BillFrequency } from '@/lib/types';
import {
  generatePayPeriods,
  billDueInPeriod,
  freePeriodsFor,
  currentPeriodIndex,
  toMonthly,
  toPeriod,
  FREQ_LABELS,
  MONTH_NAMES,
  ordinal,
  type PayPeriod,
} from '@/lib/payCycles';

// ─── Category colours ────────────────────────────────────────────────────────
const CAT_COLOURS: Record<string, string> = {
  Housing:       '#4A9ECC',
  Insurance:     '#8E44AD',
  Utilities:     '#E67E22',
  Living:        '#27AE60',
  Subscriptions: '#2980B9',
  Vehicles:      '#E74C3C',
  Mobile:        '#16A085',
};
function catColour(cat: string) { return CAT_COLOURS[cat] ?? '#7A8BA8'; }

// ─── Props ───────────────────────────────────────────────────────────────────
interface BillsProps {
  bills: Bill[];
  balance: number;
  nextPayDate: string;
  payIntervalDays: number;
  onSetBalance: (n: number) => void;
  onAdd: (b: Omit<Bill, 'id' | 'position'>) => Promise<void> | void;
  onToggle: (id: string) => void;
  onEdit: (id: string, patch: Partial<Omit<Bill, 'id'>>) => void;
  onRemove: (id: string) => void;
  onSetAllPaid: (v: boolean) => void;
}

// ─── Main component ──────────────────────────────────────────────────────────
export function Bills({
  bills, balance, nextPayDate, payIntervalDays,
  onSetBalance, onAdd, onToggle, onEdit, onRemove, onSetAllPaid,
}: BillsProps) {
  const [editId, setEditId] = useState<string | null>(null);
  const [showAdd, setShowAdd] = useState(false);

  const periods = useMemo(
    () => generatePayPeriods(nextPayDate, payIntervalDays, 13),
    [nextPayDate, payIntervalDays],
  );

  const curIdx = useMemo(() => currentPeriodIndex(periods), [periods]);

  // Monthly-equivalent totals
  const totals = useMemo(() => {
    const monthly = bills.reduce((s, b) => s + toMonthly(b.isBudget ? b.amount : b.amount, b.frequency), 0);
    const paidMonthly = bills.filter(b => b.paid).reduce((s, b) => s + toMonthly(b.amount, b.frequency), 0);
    const outstanding = bills.reduce((s, b) => {
      if (b.isBudget) return s + toMonthly(Math.max(0, b.amount - (b.spent || 0)), b.frequency);
      return b.paid ? s : s + toMonthly(b.amount, b.frequency);
    }, 0);
    const projected = Number(balance || 0) - outstanding;
    return { monthly, paidMonthly, outstanding, projected };
  }, [bills, balance]);

  // Group by category
  const categories = useMemo(() => {
    const m = new Map<string, Bill[]>();
    bills.forEach(b => {
      const k = b.category || 'Uncategorised';
      if (!m.has(k)) m.set(k, []);
      m.get(k)!.push(b);
    });
    return Array.from(m.entries()).sort((a, b) => {
      const order = ['Housing', 'Insurance', 'Utilities', 'Vehicles', 'Mobile', 'Living', 'Subscriptions'];
      return (order.indexOf(a[0]) ?? 99) - (order.indexOf(b[0]) ?? 99);
    });
  }, [bills]);

  return (
    <div style={{ display: 'grid', gap: 20 }}>
      {/* ── Summary tiles ── */}
      <div style={{ display: 'grid', gap: 14, gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))' }}>
        <div className="card tick" style={{ padding: 16 }}>
          <div className="lab">Current balance</div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 4, marginTop: 8 }}>
            <span className="num" style={{ fontSize: 18, color: '#7A8BA8' }}>£</span>
            <NumericInput
              value={balance}
              onChange={onSetBalance}
              style={{ fontFamily: "'Fraunces', Georgia, serif", fontSize: 28, fontWeight: 500, background: 'transparent', border: 'none', padding: 0, width: '100%' }}
            />
          </div>
        </div>
        <SummaryTile label="Monthly equivalent" value={fmtGBP(totals.monthly)} sub={`${bills.length} line items`} />
        <SummaryTile
          label="Outstanding"
          value={fmtGBP(totals.outstanding)}
          accent={totals.outstanding > 0 ? '#F39C12' : '#27AE60'}
          sub={`${bills.filter(b => !b.paid).length} unpaid`}
        />
        <SummaryTile
          label="Projected after bills"
          value={fmtGBP(totals.projected)}
          accent={totals.projected < 0 ? '#E74C3C' : totals.projected < 200 ? '#F39C12' : '#27AE60'}
          big
          sub={totals.projected < 0 ? 'Shortfall' : 'Headroom'}
        />
      </div>

      {/* ── Pay cycle panel ── */}
      <PayCyclePanel periods={periods} bills={bills} curIdx={curIdx} />

      {/* ── Bill groups ── */}
      <div style={{ display: 'grid', gap: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div className="lab">Outgoings</div>
          <div style={{ flex: 1 }} />
          <button className="btn ghost" style={{ fontSize: 12 }} onClick={() => setShowAdd(v => !v)}>
            <Plus size={12} /> Add
          </button>
          <button className="btn ghost" style={{ fontSize: 12 }} onClick={() => onSetAllPaid(true)}>
            <Check size={12} /> All paid
          </button>
          <button className="btn ghost" style={{ fontSize: 12 }} onClick={() => onSetAllPaid(false)}>
            <RotateCcw size={12} /> Reset
          </button>
        </div>

        {showAdd && (
          <AddForm onAdd={async b => { await onAdd(b); setShowAdd(false); }} onCancel={() => setShowAdd(false)} />
        )}

        {bills.length === 0 ? (
          <div className="panel" style={{ padding: 40, textAlign: 'center', color: '#7A8BA8' }}>
            No bills yet. Click Add above, or seed defaults via the Data tab.
          </div>
        ) : (
          categories.map(([cat, catBills]) => (
            <div key={cat} className="panel" style={{ overflow: 'hidden' }}>
              <div style={{
                padding: '8px 14px',
                borderBottom: '1px solid rgba(74,111,165,0.18)',
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                borderLeft: `3px solid ${catColour(cat)}`,
              }}>
                <span style={{ fontSize: 12, fontWeight: 600, color: catColour(cat), letterSpacing: '0.06em', textTransform: 'uppercase' }}>{cat}</span>
                <span style={{ fontSize: 11, color: '#7A8BA8', marginLeft: 'auto' }}>
                  {fmtGBP(catBills.reduce((s, b) => s + toMonthly(b.amount, b.frequency), 0))}/mo
                </span>
              </div>
              {catBills.map(b => (
                editId === b.id
                  ? <EditTile key={b.id} bill={b} onSave={patch => { onEdit(b.id, patch); setEditId(null); }} onCancel={() => setEditId(null)} />
                  : b.isBudget
                    ? <BudgetTile key={b.id} bill={b} periods={periods} onToggle={() => onToggle(b.id)} onEdit={() => setEditId(b.id)} onRemove={() => onRemove(b.id)} onUpdateSpent={s => onEdit(b.id, { spent: s })} />
                    : <BillTile key={b.id} bill={b} periods={periods} onToggle={() => onToggle(b.id)} onEdit={() => setEditId(b.id)} onRemove={() => onRemove(b.id)} />
              ))}
            </div>
          ))
        )}
      </div>
    </div>
  );
}

// ─── Pay cycle panel ─────────────────────────────────────────────────────────
function PayCyclePanel({ periods, bills, curIdx }: { periods: PayPeriod[]; bills: Bill[]; curIdx: number }) {
  const monthlyBills = bills.filter(b => !b.isBudget && b.ddDay);

  const rows = periods.map((p, i) => {
    const due = monthlyBills.filter(b =>
      billDueInPeriod(p, b.ddDay!, b.frequency, b.ddMonth)
    );
    return { period: p, due, isFree: due.length === 0, isCurrent: i === curIdx };
  });

  const freeCount = rows.filter(r => r.isFree).length;

  return (
    <div className="panel" style={{ padding: 0, overflow: 'hidden' }}>
      <div style={{ padding: '10px 14px', borderBottom: '1px solid rgba(74,111,165,0.18)', display: 'flex', alignItems: 'center', gap: 8 }}>
        <span className="lab">4-weekly pay schedule</span>
        <span style={{ fontSize: 11, color: '#7A8BA8' }}>· 13 periods · {freeCount} free {freeCount === 1 ? 'period' : 'periods'}</span>
      </div>
      <div style={{ display: 'grid', gap: 0 }}>
        {rows.map(({ period, due, isFree, isCurrent }, i) => (
          <div
            key={i}
            style={{
              display: 'grid',
              gridTemplateColumns: '90px 1fr auto',
              gap: 12,
              padding: '7px 14px',
              alignItems: 'center',
              borderBottom: i < rows.length - 1 ? '1px solid rgba(74,111,165,0.10)' : 'none',
              background: isCurrent
                ? 'rgba(74,158,204,0.08)'
                : isFree
                  ? 'rgba(39,174,96,0.06)'
                  : 'transparent',
            }}
          >
            <span style={{
              fontFamily: "'JetBrains Mono', ui-monospace, monospace",
              fontSize: 12,
              color: isCurrent ? '#4A9ECC' : '#A9B5C9',
              fontWeight: isCurrent ? 600 : 400,
            }}>
              {period.payLabel}
              {isCurrent && <span style={{ marginLeft: 6, fontSize: 10, color: '#4A9ECC' }}>← now</span>}
            </span>
            {isFree ? (
              <span style={{ fontSize: 11, color: '#27AE60' }}>✓ No direct debits</span>
            ) : (
              <span style={{ fontSize: 11, color: '#7A8BA8', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {due.map(b => b.description).join(' · ')}
              </span>
            )}
            {isFree && (
              <span style={{
                fontSize: 10,
                padding: '2px 6px',
                background: 'rgba(39,174,96,0.15)',
                color: '#27AE60',
                borderRadius: 2,
                fontFamily: "'JetBrains Mono', ui-monospace, monospace",
                letterSpacing: '0.04em',
              }}>
                FREE
              </span>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Regular bill tile ────────────────────────────────────────────────────────
function BillTile({ bill, periods, onToggle, onEdit, onRemove }: {
  bill: Bill; periods: PayPeriod[];
  onToggle: () => void; onEdit: () => void; onRemove: () => void;
}) {
  const freePeriods = useMemo(() =>
    bill.ddDay ? freePeriodsFor(periods, bill.ddDay, bill.frequency, bill.ddMonth) : [],
    [periods, bill.ddDay, bill.frequency, bill.ddMonth]
  );
  const nextFree = freePeriods[0];

  return (
    <div
      className="row-hover"
      style={{
        borderBottom: '1px solid rgba(74,111,165,0.12)',
        borderLeft: `2px solid ${bill.paid ? 'transparent' : catColour(bill.category)}`,
        background: bill.paid ? 'rgba(122,139,168,0.04)' : 'transparent',
      }}
    >
      {/* Main row */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '9px 14px 4px' }}>
        <span
          className={`check ${bill.paid ? 'checked' : ''}`}
          onClick={onToggle}
          style={{ flexShrink: 0 }}
        >
          {bill.paid && <Check size={12} color="#fff" />}
        </span>
        <span style={{
          flex: 1,
          fontSize: 14,
          color: bill.paid ? '#7A8BA8' : '#E8EDF5',
          textDecoration: bill.paid ? 'line-through' : 'none',
        }}>
          {bill.description}
        </span>
        <span className="num" style={{ fontSize: 15, color: bill.paid ? '#7A8BA8' : '#E8EDF5' }}>
          {fmtGBP(bill.amount)}
        </span>
        <button className="btn ghost" onClick={onEdit} style={{ padding: '2px 5px' }}><Edit2 size={12} /></button>
        <button className="btn ghost danger" onClick={onRemove} style={{ padding: '2px 5px' }}><Trash2 size={12} /></button>
      </div>
      {/* Meta row */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '0 14px 8px', paddingLeft: 42 }}>
        <span style={{ fontSize: 11, color: '#7A8BA8' }}>{FREQ_LABELS[bill.frequency]}</span>
        {bill.ddDay && (
          <span style={{ fontSize: 11, color: '#7A8BA8' }}>· {ordinal(bill.ddDay)}{bill.ddMonth ? ` ${MONTH_NAMES[bill.ddMonth - 1]}` : ''}</span>
        )}
        {bill.frequency !== 'monthly' && bill.frequency !== 'weekly' && bill.frequency !== 'fortnightly' && (
          <span style={{ fontSize: 11, color: '#7A8BA8' }}>
            · {fmtGBP(toMonthly(bill.amount, bill.frequency), { decimals: 0 })}/mo
          </span>
        )}
        {nextFree && (
          <span style={{ marginLeft: 'auto', fontSize: 11, color: '#27AE60' }}>
            ↓ free {nextFree.payLabel}
          </span>
        )}
      </div>
    </div>
  );
}

// ─── Budget tile (food / spending) ───────────────────────────────────────────
function BudgetTile({ bill, onToggle, onEdit, onRemove, onUpdateSpent }: {
  bill: Bill; periods: PayPeriod[];
  onToggle: () => void; onEdit: () => void; onRemove: () => void;
  onUpdateSpent: (n: number) => void;
}) {
  const [customInput, setCustomInput] = useState('');
  const pct = bill.amount > 0 ? Math.min(bill.spent / bill.amount, 1) : 0;
  const remaining = bill.amount - bill.spent;
  const over = remaining < 0;

  function addSpend(n: number) {
    onUpdateSpent(Math.max(0, bill.spent + n));
  }

  return (
    <div
      style={{
        borderBottom: '1px solid rgba(74,111,165,0.12)',
        borderLeft: `2px solid ${over ? '#E74C3C' : '#F39C12'}`,
        padding: '10px 14px',
      }}
    >
      {/* Header row */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <span
          className={`check ${bill.paid ? 'checked' : ''}`}
          onClick={onToggle}
          style={{ flexShrink: 0 }}
        >
          {bill.paid && <Check size={12} color="#fff" />}
        </span>
        <span style={{ flex: 1, fontSize: 14, color: '#E8EDF5' }}>{bill.description}</span>
        <span className="num" style={{ fontSize: 15 }}>
          <span style={{ color: over ? '#E74C3C' : pct > 0.8 ? '#F39C12' : '#E8EDF5' }}>{fmtGBP(bill.spent)}</span>
          <span style={{ color: '#7A8BA8' }}> / {fmtGBP(bill.amount)}</span>
        </span>
        <button className="btn ghost" onClick={onEdit} style={{ padding: '2px 5px' }}><Edit2 size={12} /></button>
        <button className="btn ghost danger" onClick={onRemove} style={{ padding: '2px 5px' }}><Trash2 size={12} /></button>
      </div>

      {/* Progress bar */}
      <div style={{ margin: '8px 0 8px 26px', background: 'rgba(74,111,165,0.15)', height: 5, borderRadius: 2, overflow: 'hidden' }}>
        <div style={{ width: `${pct * 100}%`, height: '100%', background: over ? '#E74C3C' : pct > 0.8 ? '#F39C12' : '#27AE60', transition: 'width 0.2s ease' }} />
      </div>

      {/* Spend controls */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, paddingLeft: 26 }}>
        <span style={{ fontSize: 11, color: '#7A8BA8' }}>budget · monthly</span>
        <div style={{ marginLeft: 'auto', display: 'flex', gap: 5, alignItems: 'center' }}>
          {[25, 50, 100].map(n => (
            <button key={n} className="btn ghost" style={{ fontSize: 11, padding: '2px 7px' }} onClick={() => addSpend(n)}>
              +{n}
            </button>
          ))}
          <input
            type="number"
            placeholder="£"
            value={customInput}
            onChange={e => setCustomInput(e.target.value)}
            onKeyDown={e => {
              if (e.key === 'Enter' && customInput) {
                addSpend(parseFloat(customInput) || 0);
                setCustomInput('');
              }
            }}
            style={{ width: 52, fontSize: 12, padding: '2px 5px', textAlign: 'right' }}
          />
          <button
            className="btn ghost"
            style={{ fontSize: 11, padding: '2px 6px' }}
            disabled={!customInput}
            onClick={() => { addSpend(parseFloat(customInput) || 0); setCustomInput(''); }}
          >
            Add
          </button>
          {bill.spent > 0 && (
            <button className="btn ghost" style={{ fontSize: 11, padding: '2px 6px', color: '#7A8BA8' }} onClick={() => onUpdateSpent(0)}>
              Reset
            </button>
          )}
        </div>
        <span style={{ fontSize: 11, color: over ? '#E74C3C' : '#27AE60', minWidth: 70, textAlign: 'right' }}>
          {over ? `${fmtGBP(Math.abs(remaining))} over` : `${fmtGBP(remaining)} left`}
        </span>
      </div>
    </div>
  );
}

// ─── Edit tile ───────────────────────────────────────────────────────────────
function EditTile({ bill, onSave, onCancel }: {
  bill: Bill;
  onSave: (patch: Partial<Omit<Bill, 'id'>>) => void;
  onCancel: () => void;
}) {
  const [d, setD] = useState({
    description: bill.description,
    amount:      String(bill.amount),
    category:    bill.category,
    frequency:   bill.frequency as BillFrequency,
    ddDay:       bill.ddDay != null ? String(bill.ddDay) : '',
    ddMonth:     bill.ddMonth != null ? String(bill.ddMonth) : '',
    isBudget:    bill.isBudget,
  });

  function save() {
    onSave({
      description: d.description.trim() || bill.description,
      amount:      parseFloat(d.amount) || 0,
      category:    d.category.trim() || 'Uncategorised',
      frequency:   d.frequency,
      ddDay:       d.ddDay ? parseInt(d.ddDay) : null,
      ddMonth:     d.ddMonth ? parseInt(d.ddMonth) : null,
      isBudget:    d.isBudget,
    });
  }

  const needsMonth = d.frequency === 'quarterly' || d.frequency === 'annual';

  return (
    <div style={{ padding: '10px 14px', borderBottom: '1px solid rgba(74,111,165,0.18)', background: 'rgba(224,82,6,0.04)' }}>
      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr', gap: 8, marginBottom: 8 }}>
        <input value={d.description} onChange={e => setD({ ...d, description: e.target.value })} placeholder="Description" />
        <input type="number" value={d.amount} onChange={e => setD({ ...d, amount: e.target.value })} placeholder="Amount £" />
        <input value={d.category} onChange={e => setD({ ...d, category: e.target.value })} placeholder="Category" />
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 80px 80px auto', gap: 8, alignItems: 'center' }}>
        <select value={d.frequency} onChange={e => setD({ ...d, frequency: e.target.value as BillFrequency })}>
          <option value="monthly">Monthly</option>
          <option value="quarterly">Quarterly</option>
          <option value="annual">Annual</option>
          <option value="weekly">Weekly</option>
          <option value="fortnightly">Fortnightly</option>
        </select>
        <input
          type="number"
          value={d.ddDay}
          onChange={e => setD({ ...d, ddDay: e.target.value })}
          placeholder="DD day"
          min={1} max={31}
        />
        {needsMonth ? (
          <select value={d.ddMonth} onChange={e => setD({ ...d, ddMonth: e.target.value })}>
            <option value="">Month…</option>
            {MONTH_NAMES.map((m, i) => <option key={i} value={i + 1}>{m}</option>)}
          </select>
        ) : (
          <div />
        )}
        <div style={{ display: 'flex', gap: 4 }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 12, color: '#A9B5C9', cursor: 'pointer' }}>
            <input type="checkbox" checked={d.isBudget} onChange={e => setD({ ...d, isBudget: e.target.checked })} />
            Budget
          </label>
          <button className="btn ghost" onClick={save}><Check size={14} /></button>
          <button className="btn ghost" onClick={onCancel}><X size={14} /></button>
        </div>
      </div>
    </div>
  );
}

// ─── Add form ─────────────────────────────────────────────────────────────────
function AddForm({ onAdd, onCancel }: {
  onAdd: (b: Omit<Bill, 'id' | 'position'>) => Promise<void> | void;
  onCancel: () => void;
}) {
  const [d, setD] = useState({
    description: '',
    amount:      '',
    category:    '',
    frequency:   'monthly' as BillFrequency,
    ddDay:       '',
    ddMonth:     '',
    isBudget:    false,
  });

  async function add() {
    const amt = parseFloat(d.amount);
    if (!d.description.trim() || !isFinite(amt)) return;
    await onAdd({
      description: d.description.trim(),
      amount:      amt,
      category:    d.category.trim() || 'Uncategorised',
      paid:        false,
      frequency:   d.frequency,
      ddDay:       d.ddDay ? parseInt(d.ddDay) : null,
      ddMonth:     d.ddMonth ? parseInt(d.ddMonth) : null,
      isBudget:    d.isBudget,
      spent:       0,
    });
  }

  const needsMonth = d.frequency === 'quarterly' || d.frequency === 'annual';

  return (
    <div className="panel" style={{ padding: 14 }}>
      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr', gap: 8, marginBottom: 8 }}>
        <input
          placeholder="Description (e.g. Mortgage)"
          value={d.description}
          onChange={e => setD({ ...d, description: e.target.value })}
          onKeyDown={e => e.key === 'Enter' && add()}
          autoFocus
        />
        <input
          type="number" placeholder="Amount £"
          value={d.amount}
          onChange={e => setD({ ...d, amount: e.target.value })}
          onKeyDown={e => e.key === 'Enter' && add()}
        />
        <input
          placeholder="Category"
          value={d.category}
          onChange={e => setD({ ...d, category: e.target.value })}
          onKeyDown={e => e.key === 'Enter' && add()}
        />
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 80px 90px 1fr auto', gap: 8, alignItems: 'center' }}>
        <select value={d.frequency} onChange={e => setD({ ...d, frequency: e.target.value as BillFrequency })}>
          <option value="monthly">Monthly</option>
          <option value="quarterly">Quarterly</option>
          <option value="annual">Annual</option>
          <option value="weekly">Weekly</option>
          <option value="fortnightly">Fortnightly</option>
        </select>
        <input
          type="number" placeholder="DD day" min={1} max={31}
          value={d.ddDay}
          onChange={e => setD({ ...d, ddDay: e.target.value })}
        />
        {needsMonth ? (
          <select value={d.ddMonth} onChange={e => setD({ ...d, ddMonth: e.target.value })}>
            <option value="">Month…</option>
            {MONTH_NAMES.map((m, i) => <option key={i} value={i + 1}>{m}</option>)}
          </select>
        ) : (
          <div />
        )}
        <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: '#A9B5C9', cursor: 'pointer' }}>
          <input type="checkbox" checked={d.isBudget} onChange={e => setD({ ...d, isBudget: e.target.checked })} />
          Spending budget
        </label>
        <div style={{ display: 'flex', gap: 6 }}>
          <button className="btn primary" onClick={add}><Plus size={13} /> Add</button>
          <button className="btn ghost" onClick={onCancel}><X size={13} /></button>
        </div>
      </div>
    </div>
  );
}

// ─── Summary tile ─────────────────────────────────────────────────────────────
function SummaryTile({ label, value, sub, accent, big }: {
  label: string; value: string; sub?: string; accent?: string; big?: boolean;
}) {
  return (
    <div className="card tick" style={{ padding: 16, minHeight: 100 }}>
      <div className="lab">{label}</div>
      <div className="num" style={{ fontSize: big ? 34 : 26, marginTop: 8, color: accent ?? '#E8EDF5', lineHeight: 1.1, fontWeight: 500 }}>
        {value}
      </div>
      {sub && <div style={{ marginTop: 4, fontSize: 11, color: '#A9B5C9' }}>{sub}</div>}
    </div>
  );
}
