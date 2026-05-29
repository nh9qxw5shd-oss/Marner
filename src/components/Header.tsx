'use client';

import { Calculator, Database, SlidersHorizontal, Wallet } from 'lucide-react';
import { TAX_YEAR_LABEL } from '@/lib/tax/constants';

type Tab = 'bills' | 'pay' | 'soundboard' | 'data';

export function Header({ tab, setTab }: { tab: Tab; setTab: (t: Tab) => void }) {
  return (
    <div
      style={{
        borderBottom: '1px solid rgba(74, 111, 165, 0.18)',
        background: 'rgba(11, 18, 38, 0.85)',
        backdropFilter: 'blur(8px)',
        position: 'sticky',
        top: 0,
        zIndex: 10,
      }}
    >
      <div
        style={{
          maxWidth: 1280,
          margin: '0 auto',
          padding: '0 24px',
          display: 'flex',
          alignItems: 'stretch',
          gap: 0,
        }}
      >
        {/* Logo — fixed width, vertically centred */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '14px 0', marginRight: 24, flexShrink: 0 }}>
          <div style={{ width: 10, height: 10, background: '#E05206', borderRadius: 1 }} />
          <div>
            <div
              className="num"
              style={{ fontWeight: 600, fontSize: 20, letterSpacing: '-0.01em' }}
            >
              Marner Finances
            </div>
            <div className="lab" style={{ marginTop: 2 }}>
              Insight · FY {TAX_YEAR_LABEL}
            </div>
          </div>
        </div>
        {/* Tab bar — scrolls horizontally on narrow viewports */}
        <div className="tab-bar" style={{ flex: 1, minWidth: 0 }}>
          <button
            className={`tab ${tab === 'bills' ? 'active' : ''}`}
            onClick={() => setTab('bills')}
          >
            <Wallet size={14} />
            Bills
          </button>
          <button
            className={`tab ${tab === 'pay' ? 'active' : ''}`}
            onClick={() => setTab('pay')}
          >
            <Calculator size={14} />
            Take-home
          </button>
          <button
            className={`tab ${tab === 'soundboard' ? 'active' : ''}`}
            onClick={() => setTab('soundboard')}
          >
            <SlidersHorizontal size={14} />
            Soundboard
          </button>
          <button
            className={`tab ${tab === 'data' ? 'active' : ''}`}
            onClick={() => setTab('data')}
          >
            <Database size={14} />
            Data
          </button>
        </div>
      </div>
    </div>
  );
}
