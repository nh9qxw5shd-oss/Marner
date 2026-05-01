'use client';

import { useState } from 'react';
import { FileDown, Trash2, Upload } from 'lucide-react';
import { SEED_BILLS } from '@/lib/defaults';
import type { Bill, PayConfig } from '@/lib/types';

interface DataTabProps {
  bills: Bill[];
  balance: number;
  pay: PayConfig;
  onSeed: (rows: Omit<Bill, 'id'>[]) => Promise<void> | void;
  onWipe: () => Promise<void> | void;
  onImport: (data: { bills?: Omit<Bill, 'id'>[]; balance?: number; pay?: PayConfig }) => Promise<void> | void;
}

export function DataTab({ bills, balance, pay, onSeed, onWipe, onImport }: DataTabProps) {
  const [importText, setImportText] = useState('');
  const [msg, setMsg] = useState('');
  const [busy, setBusy] = useState(false);

  function exportAll() {
    const data = JSON.stringify(
      {
        bills: bills.map((b) => ({
          description: b.description,
          amount: b.amount,
          category: b.category,
          paid: b.paid,
          position: b.position,
        })),
        balance,
        pay,
        _v: 1,
        _exportedAt: new Date().toISOString(),
      },
      null,
      2
    );
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `marner-finances-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  async function importFromText() {
    setBusy(true);
    setMsg('');
    try {
      const d = JSON.parse(importText);
      await onImport(d);
      setMsg('Imported.');
      setImportText('');
    } catch {
      setMsg('Could not parse JSON.');
    } finally {
      setBusy(false);
    }
  }

  async function seed() {
    setBusy(true);
    try {
      await onSeed(SEED_BILLS);
      setMsg(`Seeded ${SEED_BILLS.length} line items.`);
    } finally {
      setBusy(false);
    }
  }

  async function wipe() {
    if (!confirm('Wipe all bills? This cannot be undone.')) return;
    setBusy(true);
    try {
      await onWipe();
      setMsg('Bills cleared.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div style={{ display: 'grid', gap: 20, gridTemplateColumns: '1fr 1fr' }}>
      <div className="panel" style={{ padding: 20 }}>
        <div className="lab" style={{ marginBottom: 12 }}>Seed</div>
        <p style={{ color: '#A9B5C9', fontSize: 13, lineHeight: 1.55, margin: '0 0 14px' }}>
          Pre-populate bills from your existing spreadsheet (Mortgage, Council Tax, Octopus, Tesla
          PCPs, etc.) You can edit or delete any of them after seeding.
        </p>
        <button className="btn primary" onClick={seed} disabled={busy}>
          <Upload size={14} />
          Seed from spreadsheet
        </button>
        <div className="divider" />
        <div className="lab" style={{ marginBottom: 12 }}>Reset</div>
        <button className="btn danger" onClick={wipe} disabled={busy}>
          <Trash2 size={14} />
          Wipe all bills
        </button>
      </div>

      <div className="panel" style={{ padding: 20 }}>
        <div className="lab" style={{ marginBottom: 12 }}>Export · Import</div>
        <p style={{ color: '#A9B5C9', fontSize: 13, lineHeight: 1.55, margin: '0 0 14px' }}>
          Export everything as JSON for backup, or paste a previous export below to restore. Import
          will replace existing bills.
        </p>
        <button className="btn" onClick={exportAll}>
          <FileDown size={14} />
          Export JSON
        </button>
        <div style={{ marginTop: 14 }}>
          <textarea
            value={importText}
            onChange={(e) => setImportText(e.target.value)}
            placeholder="Paste exported JSON here…"
            rows={6}
            style={{ resize: 'vertical', fontFamily: "'JetBrains Mono', ui-monospace, monospace", fontSize: 12 }}
          />
          <button
            className="btn"
            style={{ marginTop: 8 }}
            onClick={importFromText}
            disabled={busy || !importText.trim()}
          >
            <Upload size={14} />
            Import
          </button>
        </div>
        {msg && (
          <div
            style={{
              marginTop: 12,
              fontSize: 12,
              color: '#F39C12',
              fontFamily: "'JetBrains Mono', ui-monospace, monospace",
            }}
          >
            {msg}
          </div>
        )}
      </div>
    </div>
  );
}
