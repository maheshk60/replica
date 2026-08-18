// LitigationJobListView.js — Job cards page matching IDT/GST reference design
// Reusable for TDS, Income Tax, MCA, FEMA, Partnership
// Each case = its own card (no client grouping)

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Select } from 'antd'; 
import { MCModal } from './MCModal';
import { useAuth } from '../../contexts/AuthContext';
const { Option } = Select; 
// ══════════════════════════════════════════════════════════════════════
// TOKENS
// ══════════════════════════════════════════════════════════════════════
const MUT = '#7A7F99';
const BRD = '#E8EAF0';
const WH = '#FFFFFF';
const P = '#1A2F5A';
const PL = '#EEF3FC';

const STATUS_META = {
  wip: { label: 'WIP', color: '#f59e0b', bg: '#FEF3C7' },
  open: { label: 'Open', color: '#0ea5e9', bg: '#E0F2FE' },
  closed: { label: 'Closed', color: '#10b981', bg: '#D1FAE5' },
  //attention_required: { label: 'Attention Required', color: '#dc2626', bg: '#FEE2E2' },
};




function Pill({ status }) {
  const meta = STATUS_META[status] || STATUS_META.wip;
  return (
    <span style={{
      padding: '3px 10px', borderRadius: 4, fontSize: 10, fontWeight: 700,
      letterSpacing: '.04em', textTransform: 'uppercase',
      background: meta.bg, color: meta.color, whiteSpace: 'nowrap',
    }}>
      {meta.label}
    </span>
  );
}

// ══════════════════════════════════════════════════════════════════════
// JOB CARD
// ══════════════════════════════════════════════════════════════════════
function JobCard({ job, onOpen, onAssign, canAssign }) {
  const [hov, setHov] = useState(false);
  const effectiveStatus = job.computed_status || job.activity_status || 'wip';
  const makerNames = (job.makers || []).map(m => (m.name || '?').split(' ')[0]);
  const checkerNames = (job.checkers || []).map(m => (m.name || '?').split(' ')[0]);
  const periodDisplay = job.task_period || job.assessment_year;

  return (
    <div
      style={{
        background: WH,
        border: `1.5px solid ${hov ? '#c7d2fe' : BRD}`,
        borderRadius: 10,
        padding: '14px 16px',
        cursor: 'pointer',
        transition: 'all .15s',
        display: 'flex',
        flexDirection: 'column',
        gap: 0,
        boxShadow: hov ? '0 4px 14px rgba(26,47,90,.08)' : '0 1px 2px rgba(0,0,0,.03)',
        position: 'relative',
        minHeight: 140,
      }}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      onClick={onOpen}
    >
      {/* Row 1: Client Name + Status */}
      <div style={{
        display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between',
        gap: 8, marginBottom: 2,
      }}>
        <div style={{
          fontSize: 13.5, fontWeight: 700, color: '#1C1E2E', lineHeight: 1.3,
          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
          flex: 1, minWidth: 0,
        }} title={job.client_name}>
          {job.client_name}
        </div>
        <Pill status={effectiveStatus} />
      </div>

      {/* Row 2: Sub-service name */}
      <div style={{
        fontSize: 11.5, color: MUT, marginBottom: 8,
        overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
      }}>
        {job.sub_service_name || '—'}
      </div>

      {/* Row 3: Period Covered + STT ID */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 10,
        marginBottom: 12, flexWrap: 'wrap',
      }}>
        {periodDisplay && (
          <span style={{
            display: 'inline-flex', alignItems: 'center', gap: 5,
            fontSize: 11, color: '#0891b2', fontWeight: 600,
          }}>
            <span style={{
              width: 18, height: 18, borderRadius: 4,
              background: '#E0F2FE', display: 'flex', alignItems: 'center',
              justifyContent: 'center', fontSize: 10, flexShrink: 0,
            }}>📅</span>
            {periodDisplay}
          </span>
        )}
        {job.task_id && (
          <span style={{
            fontSize: 10.5, color: MUT, fontFamily: 'monospace',
            letterSpacing: '0.02em',
          }}>
            {job.task_id}
          </span>
        )}
      </div>

      {/* Divider + Footer */}
      <div style={{
        borderTop: `1px solid ${BRD}`, paddingTop: 8, marginTop: 'auto',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        gap: 6,
      }}>
        <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', flex: 1, minWidth: 0 }}>
          {makerNames.map((name, i) => (
            <span key={`m-${i}`} style={{
              fontSize: 10, padding: '2px 7px', borderRadius: 4,
              background: '#E0F2FE', color: '#0369A1', fontWeight: 600,
              whiteSpace: 'nowrap',
            }}>
              M:{name}
            </span>
          ))}
          {checkerNames.map((name, i) => (
            <span key={`c-${i}`} style={{
              fontSize: 10, padding: '2px 7px', borderRadius: 4,
              background: '#E8F7F3', color: '#0D6B52', fontWeight: 600,
              whiteSpace: 'nowrap',
            }}>
              C:{name}
            </span>
          ))}
          {makerNames.length === 0 && checkerNames.length === 0 && (
            <span style={{ fontSize: 10, color: MUT }}>No team</span>
          )}
        </div>

        {canAssign && (
          <button
            onClick={(e) => { e.stopPropagation(); onAssign(); }}
            style={{
              padding: '4px 12px', borderRadius: 6,
              border: `1px solid ${BRD}`, background: WH,
              fontSize: 11, fontWeight: 600, cursor: 'pointer',
              color: '#374151', fontFamily: 'inherit',
              display: 'flex', alignItems: 'center', gap: 4,
              flexShrink: 0, transition: 'all .15s',
            }}
            onMouseEnter={(e) => { e.currentTarget.style.borderColor = P; e.currentTarget.style.color = P; }}
            onMouseLeave={(e) => { e.currentTarget.style.borderColor = BRD; e.currentTarget.style.color = '#374151'; }}
          >
            👤 M/C
          </button>
        )}
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════
// LIST ROW
// ══════════════════════════════════════════════════════════════════════
function JobRow({ job, onOpen, onAssign, canAssign }) {
  const [hov, setHov] = useState(false);
  const effectiveStatus = job.computed_status || job.activity_status || 'wip';
  const makerNames = (job.makers || []).map(m => (m.name || '?').split(' ')[0]);
  const checkerNames = (job.checkers || []).map(m => (m.name || '?').split(' ')[0]);
  const periodDisplay = job.task_period || job.assessment_year;

  return (
    <div
      style={{
        background: WH, border: `1px solid ${hov ? '#c7d2fe' : BRD}`, borderRadius: 8,
        padding: '10px 14px', cursor: 'pointer', display: 'flex', alignItems: 'center',
        gap: 12, transition: 'all .15s',
      }}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      onClick={onOpen}
    >
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{
          fontSize: 13, fontWeight: 600, color: '#1C1E2E',
          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
        }}>
          {job.client_name}
        </div>
        <div style={{ fontSize: 11, color: MUT, marginTop: 2, display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
          <span>{job.sub_service_name || '—'}</span>
          {job.task_id && <span style={{ fontFamily: 'monospace', fontSize: 10 }}>{job.task_id}</span>}
          {periodDisplay && <span>📅 {periodDisplay}</span>}
        </div>
      </div>
      <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', flexShrink: 0 }}>
        {makerNames.map((n, i) => (
          <span key={`m-${i}`} style={{ fontSize: 10, padding: '2px 6px', borderRadius: 4, background: '#E0F2FE', color: '#0369A1', fontWeight: 600 }}>M:{n}</span>
        ))}
        {checkerNames.map((n, i) => (
          <span key={`c-${i}`} style={{ fontSize: 10, padding: '2px 6px', borderRadius: 4, background: '#E8F7F3', color: '#0D6B52', fontWeight: 600 }}>C:{n}</span>
        ))}
      </div>
      {canAssign && (
        <button onClick={(e) => { e.stopPropagation(); onAssign(); }}
          style={{
            padding: '4px 10px', borderRadius: 6, border: `1px solid ${BRD}`,
            background: WH, fontSize: 11, cursor: 'pointer', color: '#374151',
            fontFamily: 'inherit', flexShrink: 0, fontWeight: 600,
          }}>
          👤 M/C
        </button>
      )}
      <Pill status={effectiveStatus} />
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ══════════════════════════════════════════════════════════════════════
export default function LitigationJobListView({
  title, subtitle, api, CaseModal, breadcrumbs, clientPath,
  caseType, onCreated, emptyMessage, tableColumns,
}) {
  const navigate = useNavigate();
  const { user } = useAuth();

  const [cases, setCases] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [viewMode, setViewMode] = useState('grid');
  const [modalOpen, setModalOpen] = useState(false);
  const [mcCase, setMcCase] = useState(null);
  const [editCase, setEditCase] = useState(null);

  const [statusFilter, setStatusFilter] = useState(() => {
    const params = new URLSearchParams(window.location.search);
    const st = params.get('status');
    return st && ['wip', 'open', 'closed'].includes(st) ? st : 'All';
  });

  const getPageLabel = (filter) => {
    if (filter === 'All') return '';
    if (STATUS_META[filter]) return STATUS_META[filter].label;
    return '';
  };

  const [search, setSearch] = useState('');

  useEffect(() => { fetchCases(); }, []);

  const fetchCases = async () => {
    setLoading(true); setError(null);
    try {
      const res = await api.get('');
      setCases(res.data.results || res.data);
    } catch { setError(`Failed to load ${title.toLowerCase()}.`); }
    finally { setLoading(false); }
  };

  // ✅ NO GROUPING — each case is its own card
  const allCases = cases;
  const subServiceOptions = ['All', ...new Set(allCases.map(c => c.sub_service_name).filter(Boolean))];

  const getEffectiveStatus = (c) => c.computed_status || c.activity_status || 'wip';

  const STS = ['All', 'wip', 'open', 'closed'];

  const [subServiceFilter, setSubServiceFilter] = useState('All');

  const filtered = allCases.filter((c) => {
    if (statusFilter !== 'All' && getEffectiveStatus(c) !== statusFilter) return false;
    if (subServiceFilter !== 'All' && c.sub_service_name !== subServiceFilter) return false; // ADD THIS
    const sq = search.toLowerCase();
    if (sq && !(c.client_name || '').toLowerCase().includes(sq)
      && !(c.task_id || '').toLowerCase().includes(sq)
      && !(c.sub_service_name || '').toLowerCase().includes(sq)) return false;
    return true;
  });

  const goToClient = (c) => {
    const path = typeof clientPath === 'function' ? clientPath(c) : `/legal-services/clients/${c.client}`;
    navigate(path);
  };

  const canAddNewCase = ['Founder', 'Manager', 'Team Lead'].includes(user?.role);
  const canAssignMC = () => ['Founder', 'Manager', 'Team Lead'].includes(user?.role);

  const handleCreated = (createdCase) => { fetchCases(); if (onCreated) onCreated(createdCase); };

  const counts = {};
  STS.forEach(s => {
    counts[s] = s === 'All' ? allCases.length : allCases.filter(c => getEffectiveStatus(c) === s).length;
  });

  return (
    <div style={{ padding: '2px 14px 32px', minHeight: '100%', boxSizing: 'border-box', background: '#f8f9fc' }}>

      {/* ── Breadcrumb ── */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 10 }}>
        <span style={{ fontSize: 13, color: MUT, cursor: 'pointer' }} onClick={() => navigate('/legal-services')}>
          Legal Services
        </span>
        {(breadcrumbs || []).map((crumb, i) => (
          <span key={i} style={{ display: 'contents' }}>
            <span style={{ color: '#d1d5db', fontSize: 11 }}>›</span>
            <span style={{ fontSize: 13, color: MUT, cursor: 'pointer' }} onClick={() => navigate(crumb.path)}>
              {crumb.label}
            </span>
          </span>
        ))}
        <span style={{ color: '#d1d5db', fontSize: 11 }}>›</span>
        <span style={{ fontSize: 13, fontWeight: 700, color: '#1C1E2E' }}>
          {title}{getPageLabel(statusFilter) ? ` — ${getPageLabel(statusFilter)}` : ''}
        </span>
      </div>

      {/* ── Title row ── */}
      <div style={{
        display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between',
        marginBottom: 6, flexWrap: 'wrap', gap: 10,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <h1 style={{ fontSize: 20, fontWeight: 900, color: '#111827', margin: 0, letterSpacing: '-.02em' }}>
            {title}
          </h1>
          <span style={{
            fontSize: 11, fontWeight: 700, padding: '2px 10px', borderRadius: 99,
            background: PL, color: P, border: `1px solid ${BRD}`,
          }}>
            {allCases.length} case{allCases.length !== 1 ? 's' : ''}
          </span>
        </div>
        <div style={{ display: 'flex', gap: 4, border: `1.5px solid ${BRD}`, borderRadius: 8, overflow: 'hidden', background: WH }}>
          <button onClick={() => setViewMode('grid')}
            style={{
              padding: '6px 14px', fontSize: 12, cursor: 'pointer', border: 'none', fontFamily: 'inherit',
              background: viewMode === 'grid' ? PL : WH, color: viewMode === 'grid' ? P : MUT, fontWeight: 600,
            }}>⊞ Grid</button>
          <button onClick={() => setViewMode('list')}
            style={{
              padding: '6px 14px', fontSize: 12, cursor: 'pointer', border: 'none', fontFamily: 'inherit',
              background: viewMode === 'list' ? PL : WH, color: viewMode === 'list' ? P : MUT, fontWeight: 600,
            }}>≡ List</button>
        </div>
      </div>

      <div style={{ fontSize: 12, color: MUT, marginBottom: 16 }}>
        Showing {statusFilter === 'All' ? 'all statuses' : STATUS_META[statusFilter]?.label}
      </div>

      {/* ── Filters row ── */}
      <div style={{
        display: 'flex', gap: 10, marginBottom: 16, flexWrap: 'wrap', alignItems: 'center',
      }}>
        <Select
          value={statusFilter}
          onChange={(val) => setStatusFilter(val)}
          style={{ minWidth: 200 }}
          size="middle"
        >
          {STS.map(s => (
            <Option key={s} value={s}>
              {s === 'All' ? `All Statuses (${counts.All})` : `${STATUS_META[s]?.label} (${counts[s] || 0})`}
            </Option>
          ))}
        </Select>

        <Select
          showSearch
          value={subServiceFilter}
          onChange={(val) => setSubServiceFilter(val)}
          optionFilterProp="children"
          style={{ minWidth: 200 }}
          size="middle"
        >
          {subServiceOptions.map(s => (
            <Option key={s} value={s}>
              {s === 'All' ? 'All Subservices' : s}
            </Option>
          ))}
        </Select>


        <div style={{ position: 'relative', flex: 1, minWidth: 200, maxWidth: 320 }}>
          <span style={{
            position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)',
            color: MUT, fontSize: 13, pointerEvents: 'none',
          }}>🔍</span>
          <input
            value={search} onChange={(e) => setSearch(e.target.value)}
            placeholder="Search client, STT ID..."
            style={{
              width: '100%', boxSizing: 'border-box', padding: '8px 12px 8px 32px',
              borderRadius: 8, border: `1.5px solid ${BRD}`, fontSize: 13,
              background: WH, outline: 'none', fontFamily: 'inherit',
            }}
          />
          {search && (
            <button onClick={() => setSearch('')}
              style={{
                position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)',
                border: 'none', background: 'none', color: MUT, cursor: 'pointer', fontSize: 14, padding: 0,
              }}>✕</button>
          )}
        </div>

        <span style={{ fontSize: 12, color: MUT, marginLeft: 'auto' }}>
          {filtered.length} of {allCases.length} jobs
        </span>

        {canAddNewCase && CaseModal && (
          <button onClick={() => setModalOpen(true)}
            style={{
              padding: '8px 16px', borderRadius: 8, border: `1.5px solid ${P}`,
              background: P, fontSize: 13, fontWeight: 700, cursor: 'pointer',
              color: WH, fontFamily: 'inherit',
            }}>
            + New Case
          </button>
        )}
      </div>

      {/* ── States ── */}
      {loading && (
        <div style={{ textAlign: 'center', padding: '4rem 2rem', color: MUT, background: WH, border: `1.5px solid ${BRD}`, borderRadius: 12 }}>
          Loading cases...
        </div>
      )}
      {error && !loading && (
        <div style={{ textAlign: 'center', padding: '3rem', color: '#dc2626', background: '#fef2f2', border: '1.5px solid #fecaca', borderRadius: 12 }}>
          {error}
        </div>
      )}
      {!loading && !error && filtered.length === 0 && (
        <div style={{ textAlign: 'center', padding: '4rem 2rem', color: MUT, background: WH, border: `1.5px solid ${BRD}`, borderRadius: 12 }}>
          <div style={{ fontSize: 36, opacity: .25, marginBottom: 12 }}>📂</div>
          <div style={{ fontSize: 14, fontWeight: 600 }}>
            {search || statusFilter !== 'All' ? 'No jobs match your filters' : (emptyMessage || `No ${title.toLowerCase()} yet.`)}
          </div>
        </div>
      )}

      {/* ── Grid view ── */}
      {!loading && !error && filtered.length > 0 && viewMode === 'grid' && (
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))',
          gap: 12,
          alignItems: 'stretch',
        }}>
          {filtered.map((job) => (
            <JobCard
              key={job.id}
              job={job}
              onOpen={() => goToClient(job)}
              onAssign={() => setMcCase(job)}
              canAssign={canAssignMC()}
            />
          ))}
        </div>
      )}

      {/* ── List view ── */}
      {!loading && !error && filtered.length > 0 && viewMode === 'list' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {filtered.map((job) => (
            <JobRow
              key={job.id}
              job={job}
              onOpen={() => goToClient(job)}
              onAssign={() => setMcCase(job)}
              canAssign={canAssignMC()}
            />
          ))}
        </div>
      )}

      {/* ── Modals ── */}
      {CaseModal && (
        <CaseModal
          open={modalOpen} editCase={editCase}
          onClose={() => { setModalOpen(false); setEditCase(null); }}
          onCreated={handleCreated}
        />
      )}

      {mcCase && (
        <MCModal
          job={{
            id: mcCase.id, makers: mcCase.makers, checkers: mcCase.checkers,
            client_name: mcCase.client_name,
            ...(caseType ? { caseType } : {}),
          }}
          onClose={() => setMcCase(null)}
          onAssigned={() => { setMcCase(null); fetchCases(); }}
        />
      )}
    </div>
  );
}