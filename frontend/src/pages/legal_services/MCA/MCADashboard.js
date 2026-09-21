import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../../contexts/AuthContext';
import { api } from '../../../services/api';

const P = '#1A2F5A';
const MUT = '#7A7F99';
const BRD = '#E8EAF0';
const WH = '#FFFFFF';

// ── STATUS META FOR PILLS ──
const CASE_STATUS_META = {
  wip:          { label: 'WIP',          color: '#f59e0b', bg: '#FEF3C7' },
  under_review: { label: 'Under Review', color: '#6D28D9', bg: '#F1E8FE' },
  open:         { label: 'Open',         color: '#0ea5e9', bg: '#E0F2FE' },
  closed:       { label: 'Closed',       color: '#10b981', bg: '#D1FAE5' },
};

function Pill({ status }) {
  const m = CASE_STATUS_META[status] || CASE_STATUS_META.wip;
  return (
    <span style={{
      padding: '2px 9px', borderRadius: 99, fontSize: 10, fontWeight: 700,
      letterSpacing: '.04em', textTransform: 'uppercase',
      background: m.bg, color: m.color, whiteSpace: 'nowrap',
    }}>
      {m.label}
    </span>
  );
}

// ── LITIGATION STYLE LIST PANEL ──
function DashboardListPanel({ cases, onCaseClick, emptyIcon = '✅', emptyText = 'All caught up!', color = '#dc2626' }) {
  if (cases.length === 0) {
    return (
      <div style={{ textAlign: 'center', padding: '24px 0', color: MUT }}>
        <div style={{ fontSize: 28, opacity: 0.3, marginBottom: 8 }}>{emptyIcon}</div>
        <div style={{ fontSize: 12, fontWeight: 500 }}>{emptyText}</div>
      </div>
    );
  }

  // Dynamic light background for hover state
  const hoverBg = color === '#dc2626' ? '#FEF2F2' : color === '#f59e0b' ? '#FFFBEB' : color === '#10b981' ? '#ECFDF5' : '#E0F2FE'; 

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      {cases.map((c) => {
        const status = c.computed_status || c.status || 'wip';
        const periodDisplay = c.task_period || c.financial_year || c.period || '';

        return (
          <div
            key={c.id}
            onClick={() => onCaseClick(c.id, c.client)}
            style={{
              display: 'flex', alignItems: 'center', gap: 10,
              padding: '9px 12px', borderRadius: 10,
              border: `1px solid ${BRD}`, background: WH,
              cursor: 'pointer', transition: 'all .15s',
            }}
            onMouseEnter={(e) => { e.currentTarget.style.borderColor = color; e.currentTarget.style.background = hoverBg; }}
            onMouseLeave={(e) => { e.currentTarget.style.borderColor = BRD; e.currentTarget.style.background = WH; }}
          >
            <div style={{ width: 6, height: 6, borderRadius: '50%', background: color, flexShrink: 0 }} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{
                fontSize: 12, fontWeight: 600, color: '#1C1E2E',
                overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
              }}>
                {c.client_name || 'Unknown Client'}
              </div>
              <div style={{ fontSize: 10, color: MUT, marginTop: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {c.sub_service_name || 'MCA Filing'} {periodDisplay ? `· ${periodDisplay}` : ''}
              </div>
            </div>
            <Pill status={status} />
          </div>
        );
      })}
    </div>
  );
}

// ── SUMMARY CARD ──
function SummaryCard({ card }) {
  return (
    <div
      onClick={card.onClick}
      style={{
        background: WH, border: `1.5px solid ${BRD}`, borderRadius: 16,
        padding: '18px 20px', cursor: 'pointer', transition: 'all .2s',
        position: 'relative', overflow: 'hidden', display: 'flex', flexDirection: 'column', justifyContent: 'center', minHeight: 120,
      }}
      onMouseEnter={(e) => { e.currentTarget.style.borderColor = card.color; e.currentTarget.style.boxShadow = `0 6px 20px ${card.color}18`; }}
      onMouseLeave={(e) => { e.currentTarget.style.borderColor = BRD; e.currentTarget.style.boxShadow = 'none'; }}
    >
      <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 4, background: card.color, borderRadius: '16px 16px 0 0' }} />
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}><span style={{ fontSize: 22 }}>{card.icon}</span></div>
      <div style={{ fontSize: 34, fontWeight: 900, color: card.color, lineHeight: 1, marginBottom: 5 }}>{card.value}</div>
      <div style={{ fontSize: 13, fontWeight: 600, color: '#1C1E2E' }}>{card.label}</div>
    </div>
  );
}

// Helper to determine status
const getStatus = (c) => c.computed_status || c.status || 'wip';

// ══════════════════════════════════════════════════════════════════════
// MAIN DASHBOARD COMPONENT
// ══════════════════════════════════════════════════════════════════════
export default function MCADashboard({
  title = 'MCA Filing', subtitle = 'MCA compliance and filings', mainService, jobListPath, breadcrumbs = [],
}) {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [cases, setCases] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    const params = mainService ? { main_service: mainService } : {};
    api.get('/legal-services/mca-cases/', { params })
      .then(res => setCases(Array.isArray(res.data) ? res.data : (res.data.results || [])))
      .catch(() => setCases([]))
      .finally(() => setLoading(false));
  }, [mainService]);

  const goToWorkspace = (id, clientId) => {
    const base = mainService === 'llp' ? '/legal-services/mca/llp/clients' : '/legal-services/mca/company/clients';
    navigate(`${base}/${clientId}?caseId=${id}`);
  };

  // Roles
  const isCEO = ['Founder', 'Admin'].includes(user?.role);

  // Role-based logic for "My Pending"
  const pendingCases = cases.filter(c => {
    const status = getStatus(c);
    if (status === 'closed' || status === 'open') return false;
    
    const isMaker = c.makers?.some(m => m.id === user?.id);
    const isChecker = c.checkers?.some(ch => ch.id === user?.id);

    // ✅ MAKER TURN: Case is WIP
    if (status === 'wip') {
      return isMaker;
    }
    
    // ✅ CHECKER / CEO TURN: Case is Under Review
    if (status === 'under_review') {
      
      // We must check if any document is explicitly "escalated" to CEO
      const hasEscalatedDocs = (c.filings || []).some(filing => 
        (filing.documents || []).some(doc => doc.review_status === 'escalated')
      );

      // If it has escalated docs, it belongs to the CEO
      if (hasEscalatedDocs) {
        return isCEO;
      }
      
      // Otherwise, it is just pending, so it belongs ONLY to the Checker
      return isChecker;
    }
    
    return false;
  });

  const openCasesList = cases.filter(c => getStatus(c) === 'open');
  const closedCasesList = cases.filter(c => getStatus(c) === 'closed');

  // Stats for Cards
  const wipCount = cases.filter(c => getStatus(c) === 'wip').length;
  const reviewCount = cases.filter(c => getStatus(c) === 'under_review').length;

  const CARDS = [
    { label: 'Total Cases', value: cases.length, color: P, icon: '📊', onClick: () => navigate(jobListPath) },
    { label: 'WIP', value: wipCount, color: '#f59e0b', icon: '🔄', onClick: () => navigate(`${jobListPath}?status=wip`) },
    { label: 'Under Review', value: reviewCount, color: '#6D28D9', icon: '🔎', onClick: () => navigate(`${jobListPath}?status=under_review`) },
    { label: 'Open', value: openCasesList.length, color: '#0ea5e9', icon: '📂', onClick: () => navigate(`${jobListPath}?status=open`) },
    { label: 'Closed', value: closedCasesList.length, color: '#10b981', icon: '✅', onClick: () => navigate(`${jobListPath}?status=closed`) },
  ];

  if (loading) {
    return (
      <div style={{ padding: '2px 14px 32px', minHeight: '100%', boxSizing: 'border-box', background: '#f8f9fc' }}>
        <style>{`
          @keyframes skelShine { 0% { background-position: 100% 50% } 100% { background-position: 0 50% } }
          .skel { background: linear-gradient(90deg, #EEF0F5 25%, #F7F8FB 37%, #EEF0F5 63%); background-size: 400% 100%; animation: skelShine 1.4s ease-in-out infinite; border-radius: 8px; }
        `}</style>
        <div className="skel" style={{ width: 220, height: 14, marginBottom: 20 }} />
        <div className="skel" style={{ width: 280, height: 26, marginBottom: 8 }} />
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 16, marginBottom: 20, marginTop: 24 }}>
          {[0, 1, 2, 3, 4].map(i => (
            <div key={i} style={{ background: WH, border: `1.5px solid ${BRD}`, borderRadius: 16, padding: '18px 20px', minHeight: 120 }}>
              <div className="skel" style={{ width: 28, height: 28, borderRadius: 8, marginBottom: 14 }} />
              <div className="skel" style={{ width: 60, height: 30, marginBottom: 8 }} />
              <div className="skel" style={{ width: 90, height: 13 }} />
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div style={{ padding: '2px 14px 32px', minHeight: '100%', boxSizing: 'border-box', background: '#f8f9fc' }}>

      {/* Breadcrumbs */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 10 }}>
        <span style={{ fontSize: 13, color: MUT, cursor: 'pointer' }} onClick={() => navigate('/legal-services')}>Legal Services</span>
        <span style={{ color: '#d1d5db', fontSize: 11 }}>›</span>
        <span style={{ fontSize: 13, color: MUT, cursor: 'pointer' }} onClick={() => navigate('/legal-services/mca')}>MCA</span>
        {breadcrumbs.map((crumb, i) => (
          <span key={i} style={{ display: 'contents' }}>
            <span style={{ color: '#d1d5db', fontSize: 11 }}>›</span>
            <span style={{ fontSize: 13, color: MUT, cursor: 'pointer' }} onClick={() => navigate(crumb.path)}>{crumb.label}</span>
          </span>
        ))}
        <span style={{ color: '#d1d5db', fontSize: 11 }}>›</span>
        <span style={{ fontSize: 13, fontWeight: 700, color: '#1C1E2E' }}>Dashboard</span>
      </div>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 24, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 900, color: '#111827', margin: 0, letterSpacing: '-.03em' }}>{title}</h1>
          <p style={{ fontSize: 13, color: MUT, margin: '5px 0 0' }}>{subtitle}</p>
        </div>
        {jobListPath && (
          <button onClick={() => navigate(jobListPath)} style={{ padding: '8px 16px', borderRadius: 10, border: `1.5px solid ${P}`, background: P, fontSize: 13, fontWeight: 600, cursor: 'pointer', color: WH }}>
            📋 View All Filings
          </button>
        )}
      </div>

      {/* Summary Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16, marginBottom: 24 }}>
        {CARDS.map((card) => <SummaryCard key={card.label} card={card} />)}
      </div>

      {/* ═══════════ BOTTOM PANELS ═══════════ */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 16 }}>
        
        {/* ── 1. My Pending Task ── */}
        <div style={{ background: WH, border: `1.5px solid ${BRD}`, borderRadius: 16, padding: 22, display: 'flex', flexDirection: 'column', height: 430 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14, flexShrink: 0 }}>
            <div>
              <div style={{ fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.08em', color: '#1C1E2E' }}>My Pending Task</div>
              <div style={{ fontSize: 10.5, color: MUT, marginTop: 3, fontWeight: 500 }}>Filings waiting for your action</div>
            </div>
            {pendingCases.length > 0 && (
              <span style={{ background: '#f59e0b', color: WH, borderRadius: 99, padding: '3px 10px', fontSize: 12, fontWeight: 700 }}>
                {pendingCases.length}
              </span>
            )}
          </div>
          <div style={{ overflowY: 'auto', flex: 1 }}>
            <DashboardListPanel cases={pendingCases} onCaseClick={goToWorkspace} color="#f59e0b" emptyText="No pending filings" emptyIcon="🙌" />
          </div>
        </div>

        {/* ── 2. Open Cases ── */}
        <div style={{ background: WH, border: `1.5px solid ${BRD}`, borderRadius: 16, padding: 22, display: 'flex', flexDirection: 'column', height: 430 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14, flexShrink: 0 }}>
            <div>
              <div style={{ fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.08em', color: '#1C1E2E' }}>Open Cases</div>
              <div style={{ fontSize: 10.5, color: MUT, marginTop: 3, fontWeight: 500 }}>SRN approved, pending final closure</div>
            </div>
            {openCasesList.length > 0 && (
              <span style={{ background: '#0ea5e9', color: WH, borderRadius: 99, padding: '3px 10px', fontSize: 12, fontWeight: 700 }}>
                {openCasesList.length}
              </span>
            )}
          </div>
          <div style={{ overflowY: 'auto', flex: 1 }}>
            <DashboardListPanel cases={openCasesList} onCaseClick={goToWorkspace} color="#0ea5e9" emptyIcon="📂" emptyText="No open filings" />
          </div>
        </div>

        {/* ── 3. Closed Cases ── */}
        <div style={{ background: WH, border: `1.5px solid ${BRD}`, borderRadius: 16, padding: 22, display: 'flex', flexDirection: 'column', height: 430 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14, flexShrink: 0 }}>
            <div>
              <div style={{ fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.08em', color: '#1C1E2E' }}>Closed Cases</div>
              <div style={{ fontSize: 10.5, color: MUT, marginTop: 3, fontWeight: 500 }}>Successfully completed filings</div>
            </div>
            {closedCasesList.length > 0 && (
              <span style={{ background: '#10b981', color: WH, borderRadius: 99, padding: '3px 10px', fontSize: 12, fontWeight: 700 }}>
                {closedCasesList.length}
              </span>
            )}
          </div>
          <div style={{ overflowY: 'auto', flex: 1 }}>
            <DashboardListPanel cases={closedCasesList} onCaseClick={goToWorkspace} color="#10b981" emptyIcon="✅" emptyText="No closed filings" />
          </div>
        </div>

      </div>
    </div>
  );
}