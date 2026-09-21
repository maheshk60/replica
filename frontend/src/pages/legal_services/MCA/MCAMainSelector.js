import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../../../services/api';

const P = '#1A2F5A';
const MUT = '#7A7F99';
const BRD = '#E8EAF0';
const WH = '#FFFFFF';

// ✅ Same status-resolution method as MCADashboard.jsx
const getStatus = (c) => c.computed_status || c.status || 'wip';

const isOverdue = (c) => {
  if (!c.due_date) return false;
  const status = getStatus(c);
  if (status === 'closed') return false; // don't count completed cases as overdue
  return new Date(c.due_date) < new Date();
};



export default function MCAMainSelector() {
  const navigate = useNavigate();
  const [stats, setStats] = useState({
    company: { total: 0, wip: 0, open: 0, overdue: 0 },
    llp: { total: 0, wip: 0, open: 0, overdue: 0 },
  });

  // ✅ Fetch real counts per main_service, using the same filter pattern as MCADashboard
  useEffect(() => {
    const fetchStatsFor = (mainService) =>
      api.get('/legal-services/mca-cases/', { params: { main_service: mainService } })
        .then((res) => {
          const cases = Array.isArray(res.data) ? res.data : (res.data.results || []);
          const total = cases.length;
          const wip = cases.filter((c) => getStatus(c) === 'wip').length;
          const open = cases.filter((c) => getStatus(c) === 'open').length;
          // TODO: no due-date/overdue field available on MCACase in current code —
          // wire this up once an "attention_required"-style computed status or due_date
          // exists for MCA cases (same as Litigation's attention_required logic).
          const overdue = cases.filter(isOverdue).length;
          return { total, wip, open, overdue };
        })
        .catch(() => ({ total: 0, wip: 0, open: 0, overdue: 0 }));

    Promise.all([fetchStatsFor('company'), fetchStatsFor('llp')]).then(
      ([companyStats, llpStats]) => {
        setStats({ company: companyStats, llp: llpStats });
      }
    );
  }, []);

  const cards = [
    {
      id: 'company',
      title: 'MCA Company Services',
      description: 'Annual returns, Board resolutions, Event-based amendments, and Company closures.',
      icon: '🏢',
      path: '/legal-services/mca/company',
      color: '#1A2F5A',
    },
    {
      id: 'llp',
      title: 'MCA LLP Services',
      description: 'Form 11, Form 8, Registration, and Amendment tracking for LLPs.',
      icon: '🤝',
      path: '/legal-services/mca/llp',
      color: '#6D28D9',
    }
  ];

  return (
    <div style={{ padding: '2px 14px 32px', minHeight: '100%', boxSizing: 'border-box', background: '#f8f9fc' }}>
      {/* Breadcrumb */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 10 }}>
        <span style={{ fontSize: 13, color: MUT, cursor: 'pointer' }} onClick={() => navigate('/legal-services')}>
          Legal Services
        </span>
        <span style={{ color: '#d1d5db', fontSize: 11 }}>›</span>
        <span style={{ fontSize: 13, fontWeight: 700, color: '#1C1E2E' }}>MCA</span>
      </div>

      <div style={{ marginBottom: 30 }}>
        <h1 style={{ fontSize: 24, fontWeight: 900, color: '#111827', margin: 0, letterSpacing: '-.03em' }}>
          MCA Services
        </h1>
        <p style={{ fontSize: 13, color: MUT, margin: '5px 0 0' }}>
          Select a service category to get started
        </p>
      </div>

      <div style={{ display: 'flex', gap: 20, flexWrap: 'wrap' }}>
        {cards.map((card) => (
          <div
            key={card.id}
            onClick={() => navigate(card.path)}
            style={{
              background: WH,
              borderRadius: 16,
              border: `1px solid ${BRD}`,
              width: 340,
              cursor: 'pointer',
              boxShadow: '0 4px 6px rgba(0,0,0,0.02)',
              position: 'relative',
              overflow: 'hidden',
              transition: 'all 0.2s ease',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = 'translateY(-4px)';
              e.currentTarget.style.boxShadow = '0 12px 24px rgba(0,0,0,0.06)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'translateY(0)';
              e.currentTarget.style.boxShadow = '0 4px 6px rgba(0,0,0,0.02)';
            }}
          >
            {/* Top Color Bar */}
            <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 4, background: card.color }} />

            <div style={{ padding: 24 }}>
              <div style={{ fontSize: 32, marginBottom: 12, opacity: 0.9 }}>{card.icon}</div>
              <h2 style={{ fontSize: 18, fontWeight: 800, color: '#111827', margin: '0 0 8px 0' }}>{card.title}</h2>
              <p style={{ fontSize: 12.5, color: MUT, lineHeight: 1.5, margin: 0, minHeight: 40 }}>
                {card.description}
              </p>

              {/* Stats Row */}
              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 24, paddingTop: 16, borderTop: `1px solid ${BRD}` }}>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: 18, fontWeight: 800, color: card.color }}>{stats[card.id].total}</div>
                  <div style={{ fontSize: 10, color: MUT, fontWeight: 600, textTransform: 'uppercase' }}>All Cases</div>
                </div>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: 18, fontWeight: 800, color: '#f59e0b' }}>{stats[card.id].wip}</div>
                  <div style={{ fontSize: 10, color: MUT, fontWeight: 600, textTransform: 'uppercase' }}>WIP</div>
                </div>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: 18, fontWeight: 800, color: '#0ea5e9' }}>{stats[card.id].open}</div>
                  {/* ✅ CHANGED: label "Review" → "Open" to match the key it actually displays */}
                  <div style={{ fontSize: 10, color: MUT, fontWeight: 600, textTransform: 'uppercase' }}>Open</div>
                </div>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: 18, fontWeight: 800, color: '#dc2626' }}>{stats[card.id].overdue}</div>
                  <div style={{ fontSize: 10, color: MUT, fontWeight: 600, textTransform: 'uppercase' }}>Overdue</div>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}