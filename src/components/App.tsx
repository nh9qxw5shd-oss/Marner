'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { Header } from './Header';
import { Bills } from './Bills';
import { PayCalculator } from './PayCalculator';
import { DataTab } from './DataTab';
import { Soundboard } from './Soundboard';
import { DEFAULT_PAY } from '@/lib/defaults';
import {
  bulkInsertBills,
  deleteAllBills,
  deleteBill,
  insertBill,
  listBills,
  updateBill,
} from '@/lib/store/bills';
import { getConfig, setBalance, setPayConfig } from '@/lib/store/config';
import type { Bill, PayConfig } from '@/lib/types';

type Tab = 'bills' | 'pay' | 'soundboard' | 'data';

const SANDBOX_KEY = 'marner_soundboard_v1';

export function App() {
  const [tab, setTab] = useState<Tab>('bills');
  const [loaded, setLoaded] = useState(false);
  const [bills, setBills] = useState<Bill[]>([]);
  const [balance, setBalanceState] = useState(0);
  const [pay, setPayState] = useState<PayConfig>(DEFAULT_PAY);
  const [error, setError] = useState<string | null>(null);

  // Sandbox state — lives in App so it survives tab switches
  const [sandbox, setSandbox] = useState<Bill[]>([]);
  const [sandboxReady, setSandboxReady] = useState(false);

  // Initial load
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [bs, cfg] = await Promise.all([listBills(), getConfig()]);
        if (cancelled) return;
        setBills(bs);
        if (cfg) {
          setBalanceState(cfg.balance ?? 0);
          setPayState({ ...DEFAULT_PAY, ...(cfg.pay_config as PayConfig) });
        }
        // Restore sandbox from localStorage, falling back to a copy of current bills
        try {
          const raw = localStorage.getItem(SANDBOX_KEY);
          setSandbox(raw ? (JSON.parse(raw) as Bill[]) : [...bs]);
        } catch {
          setSandbox([...bs]);
        }
        setSandboxReady(true);
      } catch (e) {
        console.error('Load failed:', e);
        if (!cancelled) setError(e instanceof Error ? e.message : 'Failed to load.');
      } finally {
        if (!cancelled) setLoaded(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // Persist sandbox to localStorage whenever it changes
  useEffect(() => {
    if (!sandboxReady) return;
    try {
      localStorage.setItem(SANDBOX_KEY, JSON.stringify(sandbox));
    } catch {
      // storage quota or private-browse — silently ignore
    }
  }, [sandbox, sandboxReady]);

  // ---------- Bill actions ----------
  const addBill = useCallback(
    async (bill: Omit<Bill, 'id' | 'position'>) => {
      const position = bills.length;
      const inserted = await insertBill({ ...bill, position });
      setBills((prev) => [...prev, inserted]);
    },
    [bills.length]
  );

  const togglePaid = useCallback(
    async (id: string) => {
      const current = bills.find((b) => b.id === id);
      if (!current) return;
      const next = !current.paid;
      setBills((prev) => prev.map((b) => (b.id === id ? { ...b, paid: next } : b)));
      try {
        await updateBill(id, { paid: next });
      } catch (e) {
        setBills((prev) => prev.map((b) => (b.id === id ? { ...b, paid: current.paid } : b)));
        console.error(e);
      }
    },
    [bills]
  );

  const editBill = useCallback(
    async (id: string, patch: Partial<Omit<Bill, 'id'>>) => {
      const prev = bills;
      setBills((cur) => cur.map((b) => (b.id === id ? { ...b, ...patch } : b)));
      try {
        await updateBill(id, patch);
      } catch (e) {
        setBills(prev);
        console.error(e);
      }
    },
    [bills]
  );

  const removeBill = useCallback(
    async (id: string) => {
      const prev = bills;
      setBills((cur) => cur.filter((b) => b.id !== id));
      try {
        await deleteBill(id);
      } catch (e) {
        setBills(prev);
        console.error(e);
      }
    },
    [bills]
  );

  const setAllPaid = useCallback(
    async (value: boolean) => {
      const prev = bills;
      const next = bills.map((b) => ({ ...b, paid: value }));
      setBills(next);
      try {
        await Promise.all(next.map((b) => updateBill(b.id, { paid: value })));
      } catch (e) {
        setBills(prev);
        console.error(e);
      }
    },
    [bills]
  );

  // ---------- Soundboard apply ----------
  const applySandbox = useCallback(
    async (sandboxBills: Bill[]): Promise<Bill[]> => {
      const baseMap     = new Map(bills.map(b => [b.id, b]));
      const sandboxIds  = new Set(sandboxBills.map(b => b.id));
      const toRemove    = bills.filter(b => !sandboxIds.has(b.id));
      const toAdd       = sandboxBills.filter(b => !baseMap.has(b.id));
      const toUpdate    = sandboxBills.filter(b => {
        const base = baseMap.get(b.id);
        if (!base) return false;
        return (
          base.amount      !== b.amount      ||
          base.description !== b.description ||
          base.frequency   !== b.frequency   ||
          base.category    !== b.category    ||
          base.ddDay       !== b.ddDay       ||
          base.ddMonth     !== b.ddMonth
        );
      });

      await Promise.all([
        ...toRemove.map(b => deleteBill(b.id)),
        ...toUpdate.map(b =>
          updateBill(b.id, {
            amount:      b.amount,
            description: b.description,
            frequency:   b.frequency,
            category:    b.category,
            ddDay:       b.ddDay,
            ddMonth:     b.ddMonth,
          })
        ),
      ]);

      const inserted = toAdd.length > 0
        ? await bulkInsertBills(
            toAdd.map((b, i) => ({ ...b, position: bills.length + i }))
          )
        : [];

      let newBills: Bill[] = [];
      setBills(prev => {
        const removedIds  = new Set(toRemove.map(b => b.id));
        const updatedMap  = new Map(toUpdate.map(b => [b.id, b]));
        const kept = prev
          .filter(b => !removedIds.has(b.id))
          .map(b    => ({ ...(updatedMap.get(b.id) ?? b) }));
        newBills = [...kept, ...inserted];
        return newBills;
      });
      return newBills;
    },
    [bills]
  );

  // ---------- Balance ----------
  const updateBalance = useCallback(async (b: number) => {
    setBalanceState(b);
    try {
      await setBalance(b);
    } catch (e) {
      console.error('Balance save failed:', e);
    }
  }, []);

  // ---------- Pay config (debounced save) ----------
  const updatePay = useCallback((patch: Partial<PayConfig>) => {
    setPayState((p) => ({ ...p, ...patch }));
  }, []);

  useEffect(() => {
    if (!loaded) return;
    const t = setTimeout(() => {
      setPayConfig(pay).catch((e) => console.error('Pay save failed:', e));
    }, 400);
    return () => clearTimeout(t);
  }, [pay, loaded]);

  // ---------- Data tab actions ----------
  const seedBills = useCallback(async (rows: Omit<Bill, 'id'>[]) => {
    const inserted = await bulkInsertBills(rows);
    setBills((prev) => [...prev, ...inserted]);
  }, []);

  const wipeBills = useCallback(async () => {
    await deleteAllBills();
    setBills([]);
  }, []);

  const importAll = useCallback(
    async (data: { bills?: Omit<Bill, 'id'>[]; balance?: number; pay?: PayConfig }) => {
      if (Array.isArray(data.bills)) {
        await deleteAllBills();
        const inserted = await bulkInsertBills(data.bills);
        setBills(inserted);
      }
      if (typeof data.balance === 'number') {
        await setBalance(data.balance);
        setBalanceState(data.balance);
      }
      if (data.pay && typeof data.pay === 'object') {
        const next = { ...DEFAULT_PAY, ...data.pay };
        await setPayConfig(next);
        setPayState(next);
      }
    },
    []
  );

  return (
    <>
      <Header tab={tab} setTab={setTab} />
      <div
        className="page-content"
        style={{
          maxWidth: 1280,
          margin: '0 auto',
          padding: '28px 24px 80px',
          position: 'relative',
          zIndex: 1,
        }}
      >
        {error && (
          <div
            style={{
              padding: 16,
              border: '1px solid #E74C3C',
              borderRadius: 3,
              color: '#E74C3C',
              fontSize: 13,
              marginBottom: 20,
              fontFamily: "'JetBrains Mono', ui-monospace, monospace",
            }}
          >
            {error} — check that the migration has run and the `marner` schema is exposed.
          </div>
        )}
        {!loaded ? (
          <div style={{ padding: 60, textAlign: 'center', color: '#7A8BA8' }}>Loading…</div>
        ) : (
          <>
            {tab === 'bills' && (
              <Bills
                bills={bills}
                balance={balance}
                nextPayDate={pay.nextPayDate}
                payIntervalDays={pay.payIntervalDays}
                onSetBalance={updateBalance}
                onAdd={addBill}
                onToggle={togglePaid}
                onEdit={editBill}
                onRemove={removeBill}
                onSetAllPaid={setAllPaid}
              />
            )}
            {tab === 'pay' && <PayCalculator pay={pay} onChange={updatePay} />}
            {tab === 'soundboard' && (
              <Soundboard
                bills={bills}
                sandbox={sandbox}
                balance={balance}
                onSandboxChange={setSandbox}
                onApply={applySandbox}
              />
            )}
            {tab === 'data' && (
              <DataTab
                bills={bills}
                balance={balance}
                pay={pay}
                onSeed={seedBills}
                onWipe={wipeBills}
                onImport={importAll}
              />
            )}
          </>
        )}
      </div>
    </>
  );
}
