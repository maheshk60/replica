import { useState, useEffect, useMemo } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Select } from 'antd';
import { MCModal } from '../MCModal';
import { useAuth } from '../../../contexts/AuthContext';
import { api } from '../../../services/api';

const { Option } = Select;

const MUT = '#7A7F99';
const BRD = '#E8EAF0';
const WH = '#FFFFFF';
const P = '#1A2F5A';
const PL = '#EEF3FC';

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
      padding: '3px 10px', borderRadius: 4, fontSize: 10, fontWeight: 700,
      letterSpacing: '.04em', textTransform: 'uppercase',
      background: m.bg, color: m.color, whiteSpace: 'nowrap',
      border: `1px solid ${m.color}35`,
    }}>
      {m.label}
    </span>
  );
}

// ═════════════════════════════════════════════════════════════════
// GRID VIEW COMPONENT
// ═════════════════════════════════════════════════════════════════
function JobCard({ job, onOpen, onAssign, canAssign }) {
  const [hov, setHov] = useState(false);
  const makerNames = (job.makers || []).map(m => (m.name || '?').split(' ')[0]);
  const checkerNames = (job.checkers || []).map(m => (m.name || '?').split(' ')[0]);
  const periodDisplay = job.task_period || job.financial_year || job.period;

  const isOverdue = job.due_date && new Date(job.due_date).setHours(0,0,0,0) < new Date().setHours(0,0,0,0) && job.status !== 'closed';

  return (
    <div
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      onClick={onOpen}
      style={{
        background: WH, border: `1.5px solid ${hov ? '#c7d2fe' : BRD}`,
        borderRadius: 10, padding: '14px 16px', cursor: 'pointer',
        transition: 'all .15s', display: 'flex', flexDirection: 'column',
        boxShadow: hov ? '0 4px 14px rgba(26,47,90,.08)' : '0 1px 2px rgba(0,0,0,.03)',
        minHeight: 140,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8, marginBottom: 2 }}>
        <div style={{
          fontSize: 13.5, fontWeight: 700, color: '#1C1E2E',
          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
          flex: 1, minWidth: 0,
        }} title={job.client_name}>
          {job.client_name}
        </div>
        <Pill status={job.status} />
      </div>

      <div style={{
        fontSize: 11.5, color: MUT, marginBottom: 8,
        overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
      }}>
        {job.sub_service_name || '—'}
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12, flexWrap: 'wrap' }}>
        {periodDisplay && (
          <span style={{
            display: 'inline-flex', alignItems: 'center', gap: 5,
            fontSize: 11, color: '#0891b2', fontWeight: 600,
          }}>
            <span style={{ width: 18, height: 18, borderRadius: 4, background: '#E0F2FE', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10 }}>📅</span>
            {periodDisplay}
          </span>
        )}
        
        {isOverdue && (
          <span style={{ fontSize: 9.5, fontWeight: 800, background: '#FEE2E2', color: '#DC2626', padding: '3px 6px', borderRadius: 4 }}>
            OVERDUE
          </span>
        )}

        {job.task_id && (
          <span style={{ fontSize: 10.5, color: MUT, fontFamily: 'monospace' }}>{job.task_id}</span>
        )}
      </div>

      <div style={{
        borderTop: `1px solid ${BRD}`, paddingTop: 8, marginTop: 'auto',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 6,
      }}>
        <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', flex: 1, minWidth: 0 }}>
          {makerNames.map((name, i) => <span key={`m-${i}`} style={{ fontSize: 10, padding: '2px 7px', borderRadius: 4, background: '#E0F2FE', color: '#0369A1', fontWeight: 600 }}>M:{name}</span>)}
          {checkerNames.map((name, i) => <span key={`c-${i}`} style={{ fontSize: 10, padding: '2px 7px', borderRadius: 4, background: '#E8F7F3', color: '#0D6B52', fontWeight: 600 }}>C:{name}</span>)}
          {makerNames.length === 0 && checkerNames.length === 0 && <span style={{ fontSize: 10, color: MUT }}>No team</span>}
        </div>
        {canAssign && (
          <button onClick={(e) => { e.stopPropagation(); onAssign(); }}
            style={{ padding: '4px 12px', borderRadius: 6, border: `1px solid ${BRD}`, background: WH, fontSize: 11, fontWeight: 600, cursor: 'pointer', color: '#374151', fontFamily: 'inherit' }}
          >👤 M/C</button>
        )}
      </div>
    </div>
  );
}

// ═════════════════════════════════════════════════════════════════
// ROW / LIST VIEW COMPONENT
// ═════════════════════════════════════════════════════════════════
function JobRow({ job, onOpen, onAssign, canAssign }) {
  const [hov, setHov] = useState(false);
  const makerNames = (job.makers || []).map((m) => (m.name || '?').split(' ')[0]);
  const checkerNames = (job.checkers || []).map((m) => (m.name || '?').split(' ')[0]);
  const periodDisplay = job.task_period || job.financial_year || job.period;

  const isOverdue = job.due_date && new Date(job.due_date).setHours(0,0,0,0) < new Date().setHours(0,0,0,0) && job.status !== 'closed';

  return (
    <div
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      onClick={onOpen}
      style={{
        background: WH, border: `1px solid ${hov ? '#c7d2fe' : BRD}`, borderRadius: 8,
        padding: '10px 14px', cursor: 'pointer', display: 'flex', alignItems: 'center',
        gap: 12, transition: 'all .15s',
      }}
    >
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 13, fontWeight: 600, color: '#1C1E2E', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {job.client_name}
        </div>
        <div style={{ fontSize: 11, color: MUT, marginTop: 2, display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
          <span>{job.sub_service_name || '—'}</span>
          {job.task_id && <span style={{ fontFamily: 'monospace', fontSize: 10 }}>{job.task_id}</span>}
          {periodDisplay && <span>📅 {periodDisplay}</span>}
          {isOverdue && <span style={{ fontSize: 9.5, fontWeight: 800, background: '#FEE2E2', color: '#DC2626', padding: '2px 6px', borderRadius: 4 }}>OVERDUE</span>}
        </div>
      </div>
      <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', flexShrink: 0 }}>
        {makerNames.map((n, i) => <span key={`m-${i}`} style={{ fontSize: 10, padding: '2px 6px', borderRadius: 4, background: '#E0F2FE', color: '#0369A1', fontWeight: 600 }}>M:{n}</span>)}
        {checkerNames.map((n, i) => <span key={`c-${i}`} style={{ fontSize: 10, padding: '2px 6px', borderRadius: 4, background: '#E8F7F3', color: '#0D6B52', fontWeight: 600 }}>C:{n}</span>)}
      </div>
      {canAssign && (
        <button onClick={(e) => { e.stopPropagation(); onAssign(); }} style={{ padding: '4px 10px', borderRadius: 6, border: `1px solid ${BRD}`, background: WH, fontSize: 11, cursor: 'pointer', color: '#374151', fontFamily: 'inherit', flexShrink: 0, fontWeight: 600 }}>
          👤 M/C
        </button>
      )}
      <Pill status={job.status} />
    </div>
  );
}

export default function MCAJobListView({
  title = 'MCA Filings',
  subtitle = 'Auto-created from tasks',
  mainService,                 // 'company' | 'llp'
  workspacePath,
  dashboardPath,
  breadcrumbs = [],
}) {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [searchParams] = useSearchParams();

  const displayTitle = title || (mainService === 'llp' ? 'LLP Filings' : 'Company Filings');

  // State
  const [cases, setCases] = useState([]);
  const [dbSubServices, setDbSubServices] = useState([]); // Store subservices from backend
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [mcCase, setMcCase] = useState(null);

  // Filters & View Mode
  const [statusFilter, setStatusFilter] = useState(() => searchParams.get('status') || 'All');
  const [search, setSearch] = useState('');
  const [subServiceFilter, setSubServiceFilter] = useState('All');
  const [viewMode, setViewMode] = useState('grid');
  const [periodFilter, setPeriodFilter] = useState('All'); 

  // ── FETCH CASES ──
  const fetchCases = async () => {
    try {
      const params = {};
      if (mainService) params.main_service = mainService;
      const res = await api.get('/legal-services/mca-cases/', { params });
      const data = res.data?.results ?? res.data ?? [];
      setCases(Array.isArray(data) ? data : []);
      setError(null);
    } catch (e) {
      setCases([]);
      setError(e?.response?.data?.detail || e?.response?.data?.error || 'Failed to load MCA cases.');
    }
  };

  

  useEffect(() => {
    setLoading(true);
    Promise.all([fetchCases(), fetchSubServices()]).finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mainService]);

  const canAssignMC = () => ['Founder', 'Manager', 'Team Lead', 'Admin'].includes(user?.role);

  // Status Filter Counts
  const STS = ['All', 'wip', 'under_review', 'open', 'closed'];
  const counts = {};
  STS.forEach((s) => { counts[s] = s === 'All' ? cases.length : cases.filter((c) => c.status === s).length; });


  // ── 1. FETCH ALL SUBSERVICES FROM BACKEND ──
  const fetchSubServices = async () => {
    try {
      const res = await api.get('/clients/subservices/');
      const data = res.data?.results || res.data || [];
      // Accepts 'mca', 'mca-company', or 'mca-llp'
      setDbSubServices(data.filter(s => (s.job_category || '').toLowerCase().startsWith('mca')));
    } catch (e) {
      console.error("Failed to load subservices for dropdown", e);
    }
  };

  // ── 2. DYNAMIC SUBSERVICE DROPDOWN OPTIONS ──
  const subServiceOptions = useMemo(() => {
    let list = dbSubServices.filter((s) => {
      const jc = (s.job_category || '').toLowerCase();

      // Must be an MCA subservice
      if (!jc.startsWith('mca')) return false;

      // Identify if this subservice is for LLP (checks main_service, job_category, or name)
      const ms = (s.main_service_name || '').toUpperCase();
      const name = (s.name || '').toUpperCase();
      const isLlp = ms.includes('LLP') || jc === 'mca-llp' || name.includes('LLP');

      if (mainService === 'llp') {
        // LLP page → ONLY show LLP subservices
        if (!isLlp) return false;
      } else if (mainService === 'company') {
        // Company page → Exclude LLP subservices
        if (isLlp) return false;
      }

      // Period filter matching (case-insensitive & trimmed)
      if (periodFilter !== 'All') {
        const sPeriod = (s.period || '').trim().toLowerCase();
        const pFilter = periodFilter.trim().toLowerCase();
        if (sPeriod !== pFilter) return false;
      }

      return true;
    });

    return ['All', ...Array.from(new Set(list.map((s) => s.name))).sort()];
  }, [dbSubServices, mainService, periodFilter]);

  // ── 3. FILTER CASES ──
  const filteredCases = cases.filter((c) => {
    if (statusFilter !== 'All' && c.status !== statusFilter) return false;
    if (subServiceFilter !== 'All' && c.sub_service_name !== subServiceFilter) return false;
    
    // Period filter matching (case-insensitive & trimmed)
    if (periodFilter !== 'All') {
      const cPeriod = (c.sub_service_period || '').trim().toLowerCase();
      const pFilter = periodFilter.trim().toLowerCase();
      if (cPeriod !== pFilter) return false;
    }

    const sq = search.toLowerCase();
    if (
      sq &&
      !(c.client_name || '').toLowerCase().includes(sq) &&
      !(c.task_id || '').toLowerCase().includes(sq) &&
      !(c.sub_service_name || '').toLowerCase().includes(sq) &&
      !(c.reference_no || '').toLowerCase().includes(sq)
    ) {
      return false;
    }
    return true;
  });

  const goToCase = (c) => {
    const base = workspacePath || (mainService === 'llp' ? '/legal-services/mca/llp/clients' : '/legal-services/mca/company/clients');
    navigate(`${base}/${c.client}?caseId=${c.id}`);
  };

  return (
    <div style={{ padding: '2px 14px 32px', minHeight: '100%', boxSizing: 'border-box', background: '#f8f9fc' }}>

      {/* Breadcrumb */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 10, flexWrap: 'wrap' }}>
        <span style={{ fontSize: 13, color: MUT, cursor: 'pointer' }} onClick={() => navigate('/legal-services')}>
          Legal Services
        </span>
        <span style={{ color: '#d1d5db', fontSize: 11 }}>›</span>
        <span style={{ fontSize: 13, color: MUT, cursor: 'pointer' }} onClick={() => navigate('/legal-services/mca')}>
          MCA
        </span>
        <span style={{ color: '#d1d5db', fontSize: 11 }}>›</span>
        <span style={{ fontSize: 13, color: MUT, cursor: 'pointer' }} onClick={() => navigate(dashboardPath || '/legal-services/mca')}>
          Dashboard
        </span>
        <span style={{ color: '#d1d5db', fontSize: 11 }}>›</span>
        <span style={{ fontSize: 13, fontWeight: 700, color: '#1C1E2E' }}>
          {mainService === 'llp' ? 'LLP Services' : 'Company Services'}
        </span>
      </div>

      {/* ══════════ TITLE & TOGGLE ROW ══════════ */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4, flexWrap: 'wrap', gap: 16 }}>
        
        {/* Left Side: Title & Count */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <h1 style={{ fontSize: 20, fontWeight: 900, color: '#111827', margin: 0 }}>{displayTitle}</h1>
          <span style={{
            fontSize: 11, fontWeight: 700, padding: '2px 10px', borderRadius: 99,
            background: PL, color: P, border: `1px solid ${BRD}`,
          }}>
            {filteredCases.length} case{filteredCases.length !== 1 ? 's' : ''}
          </span>
        </div>

        {/* Right Side: DYNAMIC PERIOD TOGGLES */}
        <div style={{ display: 'flex', gap: 4, background: '#F1F5F9', padding: 4, borderRadius: 8 }}>
          {/* Dynamic array based on mainService */}
          {(mainService === 'company' 
            ? ['All', 'Annually', 'Half-Yearly', 'Event-Based'] 
            : ['All', 'Annually', 'Event-Based']
          ).map(p => {
            // Display label nicely
            const label = p === 'All' ? 'All Types' : (p === 'Annually' ? 'Annual' : p);
            
            return (
              <button
                key={p}
                onClick={() => { setPeriodFilter(p); setSubServiceFilter('All'); }}
                style={{
                  padding: '6px 14px', border: 'none', borderRadius: 6,
                  background: periodFilter === p ? '#fff' : 'transparent',
                  color: periodFilter === p ? '#0F172A' : '#64748B',
                  fontWeight: 600, fontSize: 12, cursor: 'pointer', fontFamily: 'inherit',
                  boxShadow: periodFilter === p ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
                  transition: 'all 0.2s'
                }}
              >
                {label}
              </button>
            );
          })}
        </div>
      </div>

      <div style={{ fontSize: 12, color: MUT, marginBottom: 16 }}>{subtitle}</div>

      {/* ══════════ FILTERS & VIEW TOGGLE ══════════ */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 16, flexWrap: 'wrap', alignItems: 'center' }}>
        
        <Select value={statusFilter} onChange={setStatusFilter} style={{ minWidth: 200 }}>
          {STS.map((s) => (
            <Option key={s} value={s}>
              {s === 'All'
                ? `All Statuses (${counts.All})`
                : `${CASE_STATUS_META[s]?.label || s} (${counts[s] || 0})`}
            </Option>
          ))}
        </Select>

        <Select 
          value={subServiceFilter} 
          onChange={setSubServiceFilter} 
          showSearch
          style={{ minWidth: 260 }}
        >
          {subServiceOptions.map((s) => (
            <Option key={s} value={s}>{s}</Option>
          ))}
        </Select>

        <div style={{ position: 'relative', flex: 1, minWidth: 200, maxWidth: 320 }}>
          <span style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: MUT, fontSize: 13, pointerEvents: 'none' }}>🔍</span>
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search client, task ID, sub-service..."
            style={{
              width: '100%', boxSizing: 'border-box', padding: '8px 12px 8px 32px',
              borderRadius: 8, border: `1px solid ${BRD}`, fontSize: 13,
              background: WH, outline: 'none', fontFamily: 'inherit',
            }}
          />
        </div>

        <div style={{ display: 'flex', background: '#F1F5F9', padding: 4, borderRadius: 8, gap: 4, marginLeft: 'auto' }}>
          <button onClick={() => setViewMode('grid')} style={{ padding: '6px 12px', border: 'none', borderRadius: 6, cursor: 'pointer', background: viewMode === 'grid' ? '#fff' : 'transparent', color: viewMode === 'grid' ? '#0F172A' : '#64748B', boxShadow: viewMode === 'grid' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none', fontSize: 13, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 6, transition: 'all 0.15s' }}>
            <span style={{ fontSize: 14 }}>⊞</span> Grid
          </button>
          <button onClick={() => setViewMode('row')} style={{ padding: '6px 12px', border: 'none', borderRadius: 6, cursor: 'pointer', background: viewMode === 'row' ? '#fff' : 'transparent', color: viewMode === 'row' ? '#0F172A' : '#64748B', boxShadow: viewMode === 'row' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none', fontSize: 13, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 6, transition: 'all 0.15s' }}>
            <span style={{ fontSize: 14 }}>☰</span> List
          </button>
        </div>
      </div>

      {loading && <div style={{ textAlign: 'center', padding: '4rem 2rem', color: MUT, background: WH, border: `1.5px solid ${BRD}`, borderRadius: 12 }}>Loading cases...</div>}
      {error && !loading && <div style={{ textAlign: 'center', padding: '3rem', color: '#dc2626', background: '#fef2f2', border: '1.5px solid #fecaca', borderRadius: 12 }}>{error}</div>}

      {!loading && !error && filteredCases.length === 0 && (
        <div style={{ textAlign: 'center', padding: '4rem 2rem', color: MUT, background: WH, border: `1.5px solid ${BRD}`, borderRadius: 12 }}>
          <div style={{ fontSize: 36, opacity: 0.25, marginBottom: 12 }}>📂</div>
          <div style={{ fontSize: 14, fontWeight: 600 }}>
            {search || statusFilter !== 'All' || subServiceFilter !== 'All' || periodFilter !== 'All'
              ? 'No cases match your filters'
              : `No cases yet. Create an STT task under this stream to see jobs here.`}
          </div>
        </div>
      )}

      {!loading && !error && filteredCases.length > 0 && viewMode === 'grid' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 12, alignItems: 'stretch' }}>
          {filteredCases.map((job) => <JobCard key={job.id} job={job} onOpen={() => goToCase(job)} onAssign={() => setMcCase(job)} canAssign={canAssignMC()} />)}
        </div>
      )}

      {!loading && !error && filteredCases.length > 0 && viewMode === 'row' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {filteredCases.map((job) => <JobRow key={job.id} job={job} onOpen={() => goToCase(job)} onAssign={() => setMcCase(job)} canAssign={canAssignMC()} />)}
        </div>
      )}

      {mcCase && (
        <MCModal job={{ id: mcCase.id, makers: mcCase.makers, checkers: mcCase.checkers, client_name: mcCase.client_name, caseType: 'mca-cases' }} onClose={() => setMcCase(null)} onAssigned={() => { setMcCase(null); fetchCases(); }} />
      )}
    </div>
  );
}