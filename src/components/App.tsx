'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { Header } from './Header';
import { Bills } from './Bills';
import { PayCalculator } from './PayCalculator';
import { DataTab } from './DataTab';
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

type Tab = 'bills' | 'pay' | 'data';

export function App() {
  const [tab, setTab] = useState<Tab>('bills');
  const [loaded, setLoaded] = useState(false);
  const [bills, setBills] = useState<Bill[]>([]);
  const [balance, setBalanceState] = useState(0);
  const [pay, setPayState] = useState<PayConfig>(DEFAULT_PAY);
  const [error, setError] = useState<string | null>(null);

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

  const total = useMemo(() => bills.reduce((s, b) => s + Number(b.amount || 0), 0), [bills]);

  return (
    <>
      <Header tab={tab} setTab={setTab} />
      <div
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
              fontFamily: 'JetBrains Mono, monospace',
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
                total={total}
                onSetBalance={updateBalance}
                onAdd={addBill}
                onToggle={togglePaid}
                onEdit={editBill}
                onRemove={removeBill}
                onSetAllPaid={setAllPaid}
              />
            )}
            {tab === 'pay' && <PayCalculator pay={pay} onChange={updatePay} />}
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
