'use client';

import { useMemo, useState } from 'react';
import { Check, Edit2, Plus, RotateCcw, Trash2, X } from 'lucide-react';
import { fmtGBP, fmtPct } from '@/lib/format';
import type { Bill } from '@/lib/types';

interface BillsProps {
  bills: Bill[];
  balance: number;
  total: number;
  onSetBalance: (n: number) => void;
  onAdd: (b: Omit<Bill, 'id' | 'position'>) => Promise<void> | void;
  onToggle: (id: string) => void;
  onEdit: (id: string, patch: Partial<Omit<Bill, 'id'>>) => void;
  onRemove: (id: string) => void;
  onSetAllPaid: (v: boolean) => void;
}

export function Bills({
  bills, balance, onSetBalance, onAdd, onToggle, onEdit, onRemove, onSetAllPaid,
}: BillsProps) {
  const [draft, setDraft] = useState({ description: '', amount: '', category: '' });
  const [editId, setEditId] = useState<string | null>(null);

  const totals = useMemo(() => {
    const total = bills.reduce((s, b) => s + Number(b.amount || 0), 0);
    const paid = bills.filter((b) => b.paid).reduce((s, b) => s + Number(b.amount || 0), 0);
    const outstanding = total - paid;
    const projected = Number(balance || 0) - outstanding;
    return { total, paid, outstanding, projected };
  }, [bills, balance]);

  const byCat = useMemo(() => {
    const m = new Map<string, number>();
    bills.forEach((b) => {
      const k = b.category || 'Uncategorised';
      m.set(k, (m.get(k) ?? 0) + Number(b.amount || 0));
    });
    return Array.from(m, ([category, amount]) => ({ category, amount })).sort(
      (a, b) => b.amount - a.amount
    );
  }, [bills]);

  async function add() {
    const amt = parseFloat(draft.amount);
    if (!draft.description.trim() || !isFinite(amt)) return;
    await onAdd({
      description: draft.description.trim(),
      amount: amt,
      category: draft.category.trim() || 'Uncategorised',
      paid: false,
    });
    setDraft({ description: '', amount: '', category: '' });
  }

  return (
    <div style={{ display: 'grid', gap: 20 }}>
      <div
        style={{
          display: 'grid',
          gap: 16,
          gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
        }}
      >
        <div className="card tick" style={{ padding: 18 }}>
          <div className="lab">Current Balance</div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 6, marginTop: 8 }}>
            <span className="num" style={{ fontSize: 22, color: '#7A8BA8' }}>£</span>
            <input
              type="number"
              value={balance}
              onChange={(e) => onSetBalance(parseFloat(e.target.value) || 0)}
              style={{
                fontFamily: 'Fraunces, Georgia, serif',
                fontSize: 32,
                fontWeight: 500,
                background: 'transparent',
                border: 'none',
                padding: 0,
              }}
            />
          </div>
          <div style={{ marginTop: 6, fontSize: 12, color: '#A9B5C9' }}>Type to update</div>
        </div>

        <Metric label="Total Monthly" value={fmtGBP(totals.total)} sub={`${bills.length} line items`} />
        <Metric
          label="Outstanding"
          value={fmtGBP(totals.outstanding)}
          accent={totals.outstanding > 0 ? '#F39C12' : '#27AE60'}
          sub={`${bills.filter((b) => !b.paid).length} unpaid`}
        />
        <Metric
          label="Projected after bills"
          value={fmtGBP(totals.projected)}
          accent={totals.projected < 0 ? '#E74C3C' : totals.projected < 200 ? '#F39C12' : '#27AE60'}
          big
          sub={totals.projected < 0 ? 'Shortfall' : 'Headroom remaining'}
        />
      </div>

      <div className="panel" style={{ padding: 16 }}>
        <div className="lab" style={{ marginBottom: 10 }}>Add line item</div>
        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr auto', gap: 10 }}>
          <input
            placeholder="Description (e.g. Mortgage)"
            value={draft.description}
            onChange={(e) => setDraft({ ...draft, description: e.target.value })}
            onKeyDown={(e) => e.key === 'Enter' && add()}
          />
          <input
            placeholder="Amount £"
            type="number"
            value={draft.amount}
            onChange={(e) => setDraft({ ...draft, amount: e.target.value })}
            onKeyDown={(e) => e.key === 'Enter' && add()}
          />
          <input
            placeholder="Category"
            value={draft.category}
            onChange={(e) => setDraft({ ...draft, category: e.target.value })}
            onKeyDown={(e) => e.key === 'Enter' && add()}
          />
          <button className="btn primary" onClick={add}>
            <Plus size={14} />
            Add
          </button>
        </div>
      </div>

      <div className="panel" style={{ padding: 0, overflow: 'hidden' }}>
        <div
          style={{
            padding: '14px 18px',
            borderBottom: '1px solid rgba(74,111,165,0.18)',
            display: 'flex',
            alignItems: 'center',
            gap: 12,
          }}
        >
          <div className="lab">Monthly Outgoings</div>
          <div style={{ flex: 1 }} />
          <button className="btn ghost" onClick={() => onSetAllPaid(true)}>
            <Check size={12} />
            All paid
          </button>
          <button className="btn ghost" onClick={() => onSetAllPaid(false)}>
            <RotateCcw size={12} />
            Reset
          </button>
        </div>

        {bills.length === 0 ? (
          <div style={{ padding: 60, textAlign: 'center', color: '#7A8BA8' }}>
            No bills yet. Add one above, or seed defaults via the Data tab.
          </div>
        ) : (
          <>
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: '40px 2fr 1fr 1fr 80px',
                gap: 10,
                padding: '10px 18px',
                borderBottom: '1px solid rgba(74,111,165,0.18)',
              }}
            >
              <div className="lab" style={{ textAlign: 'center' }}>Paid</div>
              <div className="lab">Description</div>
              <div className="lab">Category</div>
              <div className="lab" style={{ textAlign: 'right' }}>Amount</div>
              <div />
            </div>
            {bills.map((b) => (
              <BillRow
                key={b.id}
                bill={b}
                isEditing={editId === b.id}
                onToggle={() => onToggle(b.id)}
                onRemove={() => onRemove(b.id)}
                onEdit={() => setEditId(b.id)}
                onSave={(patch) => {
                  onEdit(b.id, patch);
                  setEditId(null);
                }}
                onCancel={() => setEditId(null)}
              />
            ))}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: '40px 2fr 1fr 1fr 80px',
                gap: 10,
                padding: '14px 18px',
                borderTop: '1px solid rgba(74,111,165,0.32)',
                background: 'rgba(224,82,6,0.04)',
              }}
            >
              <div />
              <div className="lab">Total</div>
              <div />
              <div
                className="num"
                style={{ textAlign: 'right', fontSize: 18, color: '#E05206', fontWeight: 500 }}
              >
                {fmtGBP(totals.total)}
              </div>
              <div />
            </div>
          </>
        )}
      </div>

      {byCat.length > 0 && (
        <div className="panel" style={{ padding: 18 }}>
          <div className="lab" style={{ marginBottom: 14 }}>By category</div>
          <div style={{ display: 'grid', gap: 10 }}>
            {byCat.map((c) => {
              const pct = totals.total > 0 ? c.amount / totals.total : 0;
              return (
                <div
                  key={c.category}
                  style={{
                    display: 'grid',
                    gridTemplateColumns: '160px 1fr 140px',
                    gap: 14,
                    alignItems: 'center',
                  }}
                >
                  <div style={{ fontSize: 13, color: '#A9B5C9' }}>{c.category}</div>
                  <div
                    style={{
                      background: '#0A1020',
                      height: 6,
                      borderRadius: 1,
                      overflow: 'hidden',
                    }}
                  >
                    <div style={{ width: `${pct * 100}%`, height: '100%', background: '#E05206' }} />
                  </div>
                  <div className="num" style={{ textAlign: 'right', fontSize: 14 }}>
                    {fmtGBP(c.amount)}{' '}
                    <span style={{ color: '#7A8BA8', fontSize: 11 }}>· {fmtPct(pct, 0)}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

function Metric({
  label, value, sub, accent, big,
}: { label: string; value: string; sub?: string; accent?: string; big?: boolean }) {
  return (
    <div className="card tick" style={{ padding: 18, minHeight: 112 }}>
      <div className="lab">{label}</div>
      <div
        className="num"
        style={{
          fontSize: big ? 38 : 30,
          marginTop: 8,
          color: accent ?? '#E8EDF5',
          lineHeight: 1.05,
          fontWeight: 500,
        }}
      >
        {value}
      </div>
      {sub && <div style={{ marginTop: 6, fontSize: 12, color: '#A9B5C9' }}>{sub}</div>}
    </div>
  );
}

function BillRow({
  bill, isEditing, onToggle, onRemove, onEdit, onSave, onCancel,
}: {
  bill: Bill;
  isEditing: boolean;
  onToggle: () => void;
  onRemove: () => void;
  onEdit: () => void;
  onSave: (patch: Partial<Omit<Bill, 'id'>>) => void;
  onCancel: () => void;
}) {
  const [d, setD] = useState({
    description: bill.description,
    amount: String(bill.amount),
    category: bill.category,
  });

  if (isEditing) {
    return (
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '40px 2fr 1fr 1fr 80px',
          gap: 10,
          padding: '10px 18px',
          borderBottom: '1px solid rgba(74,111,165,0.18)',
          alignItems: 'center',
          background: 'rgba(224,82,6,0.04)',
        }}
      >
        <div />
        <input value={d.description} onChange={(e) => setD({ ...d, description: e.target.value })} />
        <input value={d.category} onChange={(e) => setD({ ...d, category: e.target.value })} />
        <input
          type="number"
          value={d.amount}
          onChange={(e) => setD({ ...d, amount: e.target.value })}
          style={{ textAlign: 'right' }}
        />
        <div style={{ display: 'flex', gap: 4 }}>
          <button
            className="btn ghost"
            onClick={() =>
              onSave({
                description: d.description,
                amount: parseFloat(d.amount) || 0,
                category: d.category || 'Uncategorised',
              })
            }
          >
            <Check size={14} />
          </button>
          <button className="btn ghost" onClick={onCancel}>
            <X size={14} />
          </button>
        </div>
      </div>
    );
  }

  return (
    <div
      className="row-hover"
      style={{
        display: 'grid',
        gridTemplateColumns: '40px 2fr 1fr 1fr 80px',
        gap: 10,
        padding: '10px 18px',
        borderBottom: '1px solid rgba(74,111,165,0.18)',
        alignItems: 'center',
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'center' }}>
        <span className={`check ${bill.paid ? 'checked' : ''}`} onClick={onToggle}>
          {bill.paid && <Check size={14} color="#fff" />}
        </span>
      </div>
      <div
        style={{
          fontSize: 14,
          color: bill.paid ? '#7A8BA8' : '#E8EDF5',
          textDecoration: bill.paid ? 'line-through' : 'none',
        }}
      >
        {bill.description}
      </div>
      <div>
        <span className="pill">{bill.category}</span>
      </div>
      <div
        className="num"
        style={{
          textAlign: 'right',
          fontSize: 16,
          color: bill.paid ? '#7A8BA8' : '#E8EDF5',
        }}
      >
        {fmtGBP(bill.amount, { decimals: 2 })}
      </div>
      <div style={{ display: 'flex', gap: 4 }}>
        <button className="btn ghost" onClick={onEdit}>
          <Edit2 size={13} />
        </button>
        <button className="btn ghost danger" onClick={onRemove}>
          <Trash2 size={13} />
        </button>
      </div>
    </div>
  );
}
