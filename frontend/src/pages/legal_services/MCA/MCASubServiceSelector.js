
// MCASubServiceSelector.js — Sub-service picker for Company / LLP
// Matches the exact visual style of MCAMainSelector.
// Pure white inside, thick colored top border, with search & period filters.
// Includes WIP, Open, and Closed live case counts for each sub-service.

import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Input } from 'antd';
import { api } from '../../../services/api';
import {
  Breadcrumb, EmptyState, Segmented, toList, P, BRD, MUT, AMB, GR,
} from '../../IncomeTaxPage/JobUiCommon';
import { MCA_SERVICES, mcaApi, getMcaStatus, SKY } from '../LegalModals';

const PERIOD_LABEL = {
  All: 'All',
  Annually: 'Annually',
  'Half-Yearly': 'Half-Yearly',
  'Event-Based': 'Event-Based',
};

// Same palette, used strictly for the top border
const CARD_PALETTE = [
  { color: '#0369A1', light: '#E0F2FE' }, // sky
  { color: '#7C3AED', light: '#EDE9FE' }, // violet
  { color: '#0F766E', light: '#CCFBF1' }, // teal
  { color: '#C2410C', light: '#FFEDD5' }, // orange
  { color: '#BE123C', light: '#FFE4E6' }, // rose
  { color: '#1D4ED8', light: '#DBEAFE' }, // blue
  { color: '#A16207', light: '#FEF9C3' }, // amber
  { color: '#047857', light: '#D1FAE5' }, // green
  { color: '#6D28D9', light: '#EDE9FE' }, // purple
  { color: '#0E7490', light: '#CFFAFE' }, // cyan
  { color: '#B45309', light: '#FFEDD5' }, // bronze
  { color: '#334155', light: '#F1F5F9' }, // slate
];

const same = (a, b) => (a || '').trim().toLowerCase() === (b || '').trim().toLowerCase();

const isLlpSubService = (s) => {
  const jc = (s.job_category || '').toLowerCase();
  return (
    (s.main_service_name || '').toUpperCase().includes('LLP') ||
    jc === 'mca-llp' ||
    (s.name || '').toUpperCase().includes('LLP')
  );
};

function colorForName(name, index) {
  if (!name) return CARD_PALETTE[index % CARD_PALETTE.length];
  let hash = 0;
  for (let i = 0; i < name.length; i += 1) {
    hash = (hash * 31 + name.charCodeAt(i)) >>> 0;
  }
  return CARD_PALETTE[hash % CARD_PALETTE.length];
}

export default function MCASubServiceSelector({ mainService = 'company' }) {
  const S = MCA_SERVICES[mainService];
  const navigate = useNavigate();

  const [cases, setCases] = useState([]);
  const [subServices, setSubServices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [periodFilter, setPeriodFilter] = useState('All');

  useEffect(() => {
    setLoading(true);
    // Fetch both cases (for counts) and subservices simultaneously
    Promise.all([
      mcaApi.cases({ main_service: mainService }).then(toList).catch(() => []),
      api.get('/clients/subservices/').then((res) => {
        const mca = toList(res).filter((s) => (s.job_category || '').toLowerCase().startsWith('mca'));
        return mca.filter((s) => (mainService === 'llp' ? isLlpSubService(s) : !isLlpSubService(s)));
      }).catch(() => [])
    ])
      .then(([casesList, subList]) => {
        setCases(casesList);
        setSubServices(subList);
      })
      .finally(() => setLoading(false));
  }, [mainService]);

  // Filter SubServices based on search and period
  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return subServices
      .filter((s) => periodFilter === 'All' || same(s.period, periodFilter))
      .filter((s) => !q || (s.name || '').toLowerCase().includes(q))
      .slice()
      .sort((a, b) => (a.name || '').localeCompare(b.name || ''));
  }, [subServices, periodFilter, search]);

  // Calculate WIP, Open, and Closed stats per sub-service
  const statsMap = useMemo(() => {
    const map = {};
    cases.forEach((c) => {
      const name = c.sub_service_name || 'Other';
      if (!map[name]) map[name] = { wip: 0, open: 0, closed: 0 };
      
      const st = getMcaStatus(c);
      if (st === 'wip' || st === 'under_review') map[name].wip += 1;
      else if (st === 'open') map[name].open += 1;
      else if (st === 'closed') map[name].closed += 1;
    });
    return map;
  }, [cases]);

  const openDashboard = (name) => {
    navigate(
      name
        ? `${S.dashboardPath}/dashboard?subService=${encodeURIComponent(name)}`
        : `${S.dashboardPath}/dashboard`
    );
  };

  return (
    <div className="page-container">
      <Breadcrumb
        steps={[
          { label: 'Legal Services', onClick: () => navigate('/legal-services') },
          { label: 'MCA', onClick: () => navigate('/legal-services/mca') },
          { label: S.label },
        ]}
      />

      <div
        style={{
          display: 'flex',
          alignItems: 'flex-start',
          justifyContent: 'space-between',
          marginBottom: 20,
          flexWrap: 'wrap',
          gap: 12,
        }}
      >
        <div>
          <h1
            style={{
              fontSize: 24,
              fontWeight: 900,
              color: '#111827',
              margin: 0,
              letterSpacing: '-.03em',
            }}
          >
            {S.title}
          </h1>
          <p style={{ fontSize: 13, color: MUT, margin: '5px 0 0' }}>
            Select a form to open its dashboard
          </p>
        </div>
        {/* <button type="button" className="btn btn-primary" onClick={() => openDashboard(null)}>
          📊 All {S.label}
        </button> */}
      </div>

      <div className="filter-bar" style={{ marginBottom: 24 }}>
        <Segmented
          value={periodFilter}
          onChange={setPeriodFilter}
          options={(S.periods || ['All', 'Annually', 'Half-Yearly', 'Event-Based']).map((p) => ({
            key: p,
            label: PERIOD_LABEL[p] || p,
          }))}
        />
        <div className="filter-field filter-field--grow" style={{ minWidth: 220, flex: 1 }}>
          <Input
            allowClear
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            prefix={<span style={{ color: MUT }}>🔍</span>}
            placeholder="Search forms…"
          />
        </div>
        <span style={{ fontSize: 13, color: MUT, whiteSpace: 'nowrap' }}>
          {filtered.length} form{filtered.length !== 1 ? 's' : ''}
        </span>
      </div>

      {loading ? (
        <EmptyState icon="⏳" text="Loading forms…" />
      ) : filtered.length === 0 ? (
        <EmptyState
          icon="📂"
          text={
            search || periodFilter !== 'All'
              ? 'No forms match your filters'
              : 'No MCA sub-services found for this stream'
          }
        />
      ) : (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', // Standard layout
            gap: 16,
            alignItems: 'stretch',
          }}
        >
          {filtered.map((s, index) => {
            const { color, light } = colorForName(s.name, index);
            const stats = statsMap[s.name] || { wip: 0, open: 0, closed: 0 };

            return (
              <button
                key={s.id || s.name}
                type="button"
                onClick={() => openDashboard(s.name)}
                style={{
                  margin: 0,
                  textAlign: 'left',
                  cursor: 'pointer',
                  background: '#ffffff', // Pure white background
                  border: `1px solid ${BRD}`,
                  borderTop: `3px solid ${color}`, // Thick top border
                  borderRadius: 8,
                  padding: '16px 20px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 10,
                  minHeight: 120, // slightly taller to accommodate the stats row
                  transition: 'border-color .15s ease, box-shadow .15s ease',
                  boxShadow: '0 1px 2px rgba(15,23,42,.03)', 
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = color;
                  e.currentTarget.style.boxShadow = '0 4px 12px rgba(15,23,42,.06)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = BRD;
                  e.currentTarget.style.borderTopColor = color; 
                  e.currentTarget.style.boxShadow = '0 1px 2px rgba(15,23,42,.03)';
                }}
              >
                <div
                  style={{
                    fontSize: 14.5,
                    fontWeight: 800,
                    color: '#111827',
                    lineHeight: 1.4,
                    letterSpacing: '-.01em',
                  }}
                >
                  {s.name}
                </div>

                {/* Bottom Stats Row */}
                <div style={{ 
                  marginTop: 'auto', // Pushes stats to the bottom
                  display: 'flex', 
                  justifyContent: 'space-between', 
                  borderTop: `1px solid #F1F5F9`, 
                  paddingTop: 12,
                  width: '100%'
                }}>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
                    <span style={{ fontSize: 10, color: MUT, fontWeight: 700 }}>WIP</span>
                    <span style={{ fontSize: 15, color: AMB, fontWeight: 800 }}>{loading ? '–' : stats.wip}</span>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                    <span style={{ fontSize: 10, color: MUT, fontWeight: 700 }}>OPEN</span>
                    <span style={{ fontSize: 15, color: SKY, fontWeight: 800 }}>{loading ? '–' : stats.open}</span>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
                    <span style={{ fontSize: 10, color: MUT, fontWeight: 700 }}>CLOSED</span>
                    <span style={{ fontSize: 15, color: GR, fontWeight: 800 }}>{loading ? '–' : stats.closed}</span>
                  </div>
                </div>

              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}