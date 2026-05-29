'use client';

import { useCallback, useMemo, useState } from 'react';
import { Check, Edit2, Plus, RotateCcw, SlidersHorizontal, Trash2, X } from 'lucide-react';
import { fmtGBP } from '@/lib/format';
import type { Bill, BillFrequency } from '@/lib/types';
import { FREQ_LABELS, MONTH_NAMES, toMonthly } from '@/lib/payCycles';

// ─── Category colours ─────────────────────────────────────────────────────────
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

// ─── Props ────────────────────────────────────────────────────────────────────
interface SoundboardProps {
  bills: Bill[];
  balance: number;
  onApply: (sandbox: Bill[]) => Promise<Bill[]>;
}

// ─── Main component ───────────────────────────────────────────────────────────
export function Soundboard({ bills, balance, onApply }: SoundboardProps) {
  const [sandbox, setSandbox] = useState<Bill[]>(() => [...bills]);
  const [editId, setEditId] = useState<string | null>(null);
  const [showAdd, setShowAdd] = useState(false);
  const [applying, setApplying] = useState(false);

  const baseMap = useMemo(() => new Map(bills.map(b => [b.id, b])), [bills]);

  const diff = useMemo(() => {
    const sandboxIds = new Set(sandbox.map(b => b.id));
    const added   = sandbox.filter(b => !baseMap.has(b.id));
    const removed = bills.filter(b => !sandboxIds.has(b.id));
    const changed = sandbox.filter(b => {
      const base = baseMap.get(b.id);
      return base && (
        base.amount      !== b.amount      ||
        base.description !== b.description ||
        base.frequency   !== b.frequency   ||
        base.category    !== b.category    ||
        base.ddDay       !== b.ddDay       ||
        base.ddMonth     !== b.ddMonth
      );
    });
    return { added, removed, changed };
  }, [bills, sandbox, baseMap]);

  const isDirty = diff.added.length > 0 || diff.removed.length > 0 || diff.changed.length > 0;

  const baseMonthly    = useMemo(() => bills.reduce((s, b) => s + toMonthly(b.amount, b.frequency), 0),   [bills]);
  const sandboxMonthly = useMemo(() => sandbox.reduce((s, b) => s + toMonthly(b.amount, b.frequency), 0), [sandbox]);
  const monthlyDelta   = sandboxMonthly - baseMonthly;
  const sandboxProjected = balance - sandboxMonthly;

  const reset = useCallback(() => {
    setSandbox([...bills]);
    setEditId(null);
    setShowAdd(false);
  }, [bills]);

  const handleApply = useCallback(async () => {
    setApplying(true);
    try {
      const newBills = await onApply(sandbox);
      setSandbox([...newBills]);
    } finally {
      setApplying(false);
    }
  }, [onApply, sandbox]);

  // ── Sandbox mutations ──
  const addBill = useCallback((bill: Omit<Bill, 'id' | 'position'>) => {
    setSandbox(prev => [...prev, { ...bill, id: `__sb_${Date.now()}`, position: prev.length }]);
  }, []);

  const editBill = useCallback((id: string, patch: Partial<Omit<Bill, 'id'>>) => {
    setSandbox(prev => prev.map(b => b.id === id ? { ...b, ...patch } : b));
  }, []);

  const removeBill = useCallback((id: string) => {
    setSandbox(prev => prev.filter(b => b.id !== id));
  }, []);

  const categories = useMemo(() => {
    const m = new Map<string, Bill[]>();
    sandbox.forEach(b => {
      const k = b.category || 'Uncategorised';
      if (!m.has(k)) m.set(k, []);
      m.get(k)!.push(b);
    });
    const order = ['Housing', 'Insurance', 'Utilities', 'Vehicles', 'Mobile', 'Living', 'Subscriptions'];
    return Array.from(m.entries()).sort((a, b) =>
      (order.indexOf(a[0]) === -1 ? 99 : order.indexOf(a[0])) -
      (order.indexOf(b[0]) === -1 ? 99 : order.indexOf(b[0]))
    );
  }, [sandbox]);

  return (
    <div style={{ display: 'grid', gap: 20 }}>

      {/* ── Header ── */}
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, flexWrap: 'wrap' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
            <SlidersHorizontal size={15} color="#E05206" />
            <span
              className="lab"
              style={{ color: '#E8EDF5', fontSize: 13, letterSpacing: '0.06em' }}
            >
              Soundboard
            </span>
          </div>
          <div style={{ fontSize: 12, color: '#7A8BA8' }}>
            Experiment with bill changes. Nothing here affects your saved bills until you apply.
          </div>
        </div>
        <div style={{ flex: 1 }} />
        <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
          <button
            className="btn ghost"
            onClick={reset}
            disabled={!isDirty}
            style={{ fontSize: 12, opacity: isDirty ? 1 : 0.4 }}
          >
            <RotateCcw size={12} /> Reset to saved
          </button>
          {isDirty && (
            <button
              className="btn primary"
              onClick={handleApply}
              disabled={applying}
              style={{ fontSize: 12 }}
            >
              <Check size={12} /> {applying ? 'Applying…' : 'Apply to bills'}
            </button>
          )}
        </div>
      </div>

      {/* ── Summary tiles ── */}
      <div style={{ display: 'grid', gap: 14, gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))' }}>

        {/* Monthly total */}
        <div className="card tick" style={{ padding: 16 }}>
          <div className="lab">Monthly total</div>
          <div className="num" style={{ fontSize: 28, marginTop: 8, fontWeight: 500 }}>
            {fmtGBP(sandboxMonthly)}
          </div>
          {isDirty ? (
            <div style={{ marginTop: 4, fontSize: 12, color: monthlyDelta > 0 ? '#E74C3C' : '#27AE60' }}>
              {monthlyDelta > 0 ? '+' : ''}{fmtGBP(monthlyDelta, { decimals: 0 })} vs saved
            </div>
          ) : (
            <div style={{ marginTop: 4, fontSize: 11, color: '#3B5270' }}>same as saved</div>
          )}
        </div>

        {/* Projected balance */}
        <div className="card tick" style={{ padding: 16 }}>
          <div className="lab">Projected balance</div>
          <div
            className="num"
            style={{
              fontSize: 34,
              marginTop: 8,
              fontWeight: 500,
              lineHeight: 1.1,
              color: sandboxProjected < 0 ? '#E74C3C' : sandboxProjected < 200 ? '#F39C12' : '#27AE60',
            }}
          >
            {fmtGBP(sandboxProjected)}
          </div>
          {isDirty ? (
            <div style={{ marginTop: 4, fontSize: 12, color: -monthlyDelta > 0 ? '#27AE60' : '#E74C3C' }}>
              {-monthlyDelta > 0 ? '+' : ''}{fmtGBP(-monthlyDelta, { decimals: 0 })} vs saved
            </div>
          ) : (
            <div style={{ marginTop: 4, fontSize: 11, color: '#3B5270' }}>same as saved</div>
          )}
        </div>

        {/* Changes summary */}
        <div className="card tick" style={{ padding: 16 }}>
          <div className="lab">Changes</div>
          {!isDirty ? (
            <div style={{ marginTop: 12, fontSize: 13, color: '#7A8BA8' }}>No changes yet</div>
          ) : (
            <div style={{ marginTop: 8, display: 'grid', gap: 5 }}>
              {diff.added.length > 0 && (
                <div style={{ fontSize: 12, color: '#27AE60' }}>
                  +{diff.added.length} bill{diff.added.length !== 1 ? 's' : ''} added
                </div>
              )}
              {diff.removed.length > 0 && (
                <div style={{ fontSize: 12, color: '#E74C3C' }}>
                  −{diff.removed.length} bill{diff.removed.length !== 1 ? 's' : ''} removed
                </div>
              )}
              {diff.changed.length > 0 && (
                <div style={{ fontSize: 12, color: '#F39C12' }}>
                  ~{diff.changed.length} bill{diff.changed.length !== 1 ? 's' : ''} modified
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* ── Diff panel ── */}
      {isDirty && (
        <div className="panel" style={{ padding: 0, overflow: 'hidden' }}>
          <div style={{
            padding: '8px 14px',
            borderBottom: '1px solid rgba(74,111,165,0.18)',
            display: 'flex',
            alignItems: 'center',
            gap: 8,
          }}>
            <span className="lab">Changes summary</span>
          </div>
          {diff.added.map(b => (
            <DiffRow
              key={b.id}
              kind="added"
              description={b.description}
              amount={b.amount}
              frequency={b.frequency}
            />
          ))}
          {diff.removed.map(b => (
            <DiffRow
              key={b.id}
              kind="removed"
              description={b.description}
              amount={b.amount}
              frequency={b.frequency}
            />
          ))}
          {diff.changed.map(b => {
            const base = baseMap.get(b.id)!;
            return (
              <DiffRow
                key={b.id}
                kind="changed"
                description={b.description}
                amount={b.amount}
                frequency={b.frequency}
                baseAmount={base.amount}
              />
            );
          })}
        </div>
      )}

      {/* ── Bill list ── */}
      <div style={{ display: 'grid', gap: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div className="lab">Bills</div>
          <div style={{ flex: 1 }} />
          <button className="btn ghost" style={{ fontSize: 12 }} onClick={() => setShowAdd(v => !v)}>
            <Plus size={12} /> Add
          </button>
        </div>

        {showAdd && (
          <AddForm
            onAdd={b => { addBill(b); setShowAdd(false); }}
            onCancel={() => setShowAdd(false)}
          />
        )}

        {sandbox.length === 0 ? (
          <div className="panel" style={{ padding: 40, textAlign: 'center', color: '#7A8BA8' }}>
            No bills in sandbox. Click Add above or Reset to load saved bills.
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
                <span style={{ fontSize: 12, fontWeight: 600, color: catColour(cat), letterSpacing: '0.06em', textTransform: 'uppercase' }}>
                  {cat}
                </span>
                <span style={{ fontSize: 11, color: '#7A8BA8', marginLeft: 'auto' }}>
                  {fmtGBP(catBills.reduce((s, b) => s + toMonthly(b.amount, b.frequency), 0))}/mo
                </span>
              </div>
              {catBills.map(b => (
                editId === b.id
                  ? <EditTile
                      key={b.id}
                      bill={b}
                      onSave={p => { editBill(b.id, p); setEditId(null); }}
                      onCancel={() => setEditId(null)}
                    />
                  : <SandboxBillRow
                      key={b.id}
                      bill={b}
                      baseBill={baseMap.get(b.id) ?? null}
                      onEdit={() => setEditId(b.id)}
                      onRemove={() => removeBill(b.id)}
                      onAmountChange={amt => editBill(b.id, { amount: Math.max(0, amt) })}
                    />
              ))}
            </div>
          ))
        )}
      </div>
    </div>
  );
}

// ─── Diff row ─────────────────────────────────────────────────────────────────
function DiffRow({ kind, description, amount, frequency, baseAmount }: {
  kind: 'added' | 'removed' | 'changed';
  description: string;
  amount: number;
  frequency: BillFrequency;
  baseAmount?: number;
}) {
  const colour  = kind === 'added' ? '#27AE60' : kind === 'removed' ? '#E74C3C' : '#F39C12';
  const bgColour = kind === 'added' ? 'rgba(39,174,96,0.15)' : kind === 'removed' ? 'rgba(231,76,60,0.15)' : 'rgba(243,156,18,0.15)';
  const label   = kind === 'added' ? 'NEW' : kind === 'removed' ? 'REMOVED' : 'CHANGED';
  const amtDelta = kind === 'changed' && baseAmount !== undefined ? amount - baseAmount : null;

  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      gap: 12,
      padding: '7px 14px',
      borderBottom: '1px solid rgba(74,111,165,0.10)',
      borderLeft: `2px solid ${colour}`,
      background: kind !== 'added' && kind !== 'removed' ? 'rgba(243,156,18,0.02)' : undefined,
    }}>
      <span style={{
        fontSize: 9,
        padding: '1px 5px',
        background: bgColour,
        color: colour,
        borderRadius: 2,
        fontFamily: "'JetBrains Mono', ui-monospace, monospace",
        letterSpacing: '0.06em',
        flexShrink: 0,
      }}>
        {label}
      </span>
      <span style={{
        flex: 1,
        fontSize: 13,
        color: kind === 'removed' ? '#7A8BA8' : '#E8EDF5',
        textDecoration: kind === 'removed' ? 'line-through' : 'none',
      }}>
        {description}
      </span>
      {kind === 'changed' && baseAmount !== undefined && (
        <>
          <span className="num" style={{ fontSize: 12, color: '#7A8BA8', textDecoration: 'line-through' }}>
            {fmtGBP(baseAmount)}
          </span>
          <span style={{ color: '#7A8BA8', fontSize: 11 }}>→</span>
        </>
      )}
      <span className="num" style={{ fontSize: 13, color: kind === 'removed' ? '#7A8BA8' : '#E8EDF5' }}>
        {fmtGBP(amount)}
      </span>
      {amtDelta !== null && (
        <span style={{ fontSize: 11, color: amtDelta > 0 ? '#E74C3C' : '#27AE60', minWidth: 56, textAlign: 'right' }}>
          {amtDelta > 0 ? '+' : ''}{fmtGBP(amtDelta, { decimals: 0 })}
        </span>
      )}
      {kind !== 'changed' && (
        <span style={{ fontSize: 11, color: '#7A8BA8' }}>{FREQ_LABELS[frequency]}</span>
      )}
    </div>
  );
}

// ─── Sandbox bill row ─────────────────────────────────────────────────────────
function SandboxBillRow({ bill, baseBill, onEdit, onRemove, onAmountChange }: {
  bill: Bill;
  baseBill: Bill | null;
  onEdit: () => void;
  onRemove: () => void;
  onAmountChange: (amt: number) => void;
}) {
  const isNew     = !baseBill;
  const isChanged = baseBill && baseBill.amount !== bill.amount;
  const borderCol = isNew ? '#27AE60' : isChanged ? '#F39C12' : 'transparent';

  return (
    <div
      className="row-hover"
      style={{
        borderBottom: '1px solid rgba(74,111,165,0.12)',
        borderLeft: `2px solid ${borderCol}`,
        background: isNew ? 'rgba(39,174,96,0.025)' : isChanged ? 'rgba(243,156,18,0.025)' : 'transparent',
      }}
    >
      {/* Main row */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '9px 14px 3px' }}>
        {isNew && (
          <span style={{
            fontSize: 9, padding: '1px 4px',
            background: 'rgba(39,174,96,0.15)', color: '#27AE60',
            borderRadius: 2, fontFamily: "'JetBrains Mono', ui-monospace, monospace",
            flexShrink: 0, letterSpacing: '0.06em',
          }}>
            NEW
          </span>
        )}
        <span style={{ flex: 1, fontSize: 14, color: '#E8EDF5' }}>{bill.description}</span>
        {/* Quick-adjust buttons */}
        <button
          className="btn ghost"
          style={{ fontSize: 11, padding: '2px 6px', color: '#7A8BA8' }}
          onClick={() => onAmountChange(bill.amount - 10)}
        >
          −10
        </button>
        <span className="num" style={{ fontSize: 15, minWidth: 60, textAlign: 'right' }}>
          {fmtGBP(bill.amount)}
        </span>
        <button
          className="btn ghost"
          style={{ fontSize: 11, padding: '2px 6px', color: '#7A8BA8' }}
          onClick={() => onAmountChange(bill.amount + 10)}
        >
          +10
        </button>
        <button className="btn ghost" onClick={onEdit} style={{ padding: '2px 5px' }}>
          <Edit2 size={12} />
        </button>
        <button className="btn ghost danger" onClick={onRemove} style={{ padding: '2px 5px' }}>
          <Trash2 size={12} />
        </button>
      </div>
      {/* Meta row */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '0 14px 8px 14px' }}>
        <span style={{ fontSize: 11, color: '#7A8BA8' }}>{FREQ_LABELS[bill.frequency]}</span>
        {isChanged && baseBill && (
          <span style={{ fontSize: 11, color: '#F39C12' }}>
            · was {fmtGBP(baseBill.amount)}
            <span style={{ color: bill.amount > baseBill.amount ? '#E74C3C' : '#27AE60' }}>
              {' '}({bill.amount > baseBill.amount ? '+' : ''}{fmtGBP(bill.amount - baseBill.amount, { decimals: 0 })})
            </span>
          </span>
        )}
      </div>
    </div>
  );
}

// ─── Edit tile ────────────────────────────────────────────────────────────────
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
    <div style={{
      padding: '10px 14px',
      borderBottom: '1px solid rgba(74,111,165,0.18)',
      background: 'rgba(224,82,6,0.04)',
    }}>
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
          type="number" value={d.ddDay}
          onChange={e => setD({ ...d, ddDay: e.target.value })}
          placeholder="DD day" min={1} max={31}
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
  onAdd: (b: Omit<Bill, 'id' | 'position'>) => void;
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

  function add() {
    const amt = parseFloat(d.amount);
    if (!d.description.trim() || !isFinite(amt)) return;
    onAdd({
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
