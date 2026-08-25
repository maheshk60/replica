// LitigationJobListView.js — Cases + Notices toggle view
// Reusable for TDS, Income Tax, MCA, FEMA, Partnership

import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Select } from 'antd';
import { MCModal } from './MCModal';
import { useAuth } from '../../contexts/AuthContext';
import { api } from '../../services/api';
const { Option } = Select;

// ══════════════════════════════════════════════════════════════════════
// TOKENS
// ══════════════════════════════════════════════════════════════════════
const MUT = '#7A7F99';
const BRD = '#E8EAF0';
const WH = '#FFFFFF';
const P = '#1A2F5A';
const PL = '#EEF3FC';
const RED = '#C62828';

const CASE_STATUS_META = {
  wip: { label: 'WIP', color: '#f59e0b', bg: '#FEF3C7' },
  open: { label: 'Open', color: '#0ea5e9', bg: '#E0F2FE' },
  closed: { label: 'Closed', color: '#10b981', bg: '#D1FAE5' },
  attention_required: { label: 'Attention Required', color: '#dc2626', bg: '#FEE2E2' },
};

const NOTICE_STATUS_META = {
  wip: { label: 'WIP', color: '#f59e0b', bg: '#FEF3C7' },
  under_review: { label: 'Under Review', color: '#6D28D9', bg: '#F1E8FE' },
  open: { label: 'Open', color: '#0ea5e9', bg: '#E0F2FE' },
  attention_required: { label: 'Attention Required', color: '#dc2626', bg: '#FEE2E2' },
};

const INCOME_TAX_SUBSERVICES = [
  'Income Tax Appeal',
  'Income Tax Assessment',
  'Income Tax Summons',
  'Income Tax Tribunal Appeal',
  'IT Assessment Assignment',
  'IT Bank Attachment Withdrawal',
  'IT Penalty Notice JC Appeal',
  'IT Penalty Notice Reply',
  'IT Penalty Notice Tribunal',
  'OGE Order'
].sort();

const TDS_SUBSERVICES = [
  'TDS Appeal Tribunal',
  'TDS Appeal Assignment',
  'TDS Assessment'
].sort();

// ══════════════════════════════════════════════════════════════════════
// UTILITIES
// ══════════════════════════════════════════════════════════════════════
function fmtDate(d) {
  if (!d) return null;
  return new Date(d).toLocaleDateString('en-IN', {
    day: '2-digit', month: 'short', year: 'numeric',
  });
}

function getDaysInfo(dueDate, noticeStatus) {
  if (!dueDate) return null;
  if (noticeStatus === 'open') return null;   // Hide urgency for open notices
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const due = new Date(dueDate); due.setHours(0, 0, 0, 0);
  const diff = Math.ceil((due - today) / (1000 * 60 * 60 * 24));
  if (diff < 0) return { text: `${Math.abs(diff)}d overdue`, urgent: true, color: RED };
  if (diff === 0) return { text: 'Due today', urgent: true, color: RED };
  if (diff <= 5) return { text: `${diff}d left`, urgent: true, color: RED };
  if (diff <= 15) return { text: `${diff}d left`, urgent: false, color: '#f59e0b' };
  return { text: `${diff}d left`, urgent: false, color: MUT };
}

// Compute if a notice is attention_required
function isNoticeAttention(notice) {
  if (notice.status !== 'wip' && notice.status !== 'under_review') return false;
  const due = notice.extended_due_date || notice.due_date;
  if (!due) return false;
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const d = new Date(due); d.setHours(0, 0, 0, 0);
  return Math.ceil((d - today) / (1000 * 60 * 60 * 24)) <= 5;
}

function getNoticeEffectiveStatus(notice) {
  if (isNoticeAttention(notice)) return 'attention_required';
  return notice.status;
}

// ══════════════════════════════════════════════════════════════════════
// PILL
// ══════════════════════════════════════════════════════════════════════
function Pill({ status, meta }) {
  const m = meta[status] || meta.wip;
  return (
    <span style={{
      padding: '3px 10px', borderRadius: 4, fontSize: 10, fontWeight: 700,
      letterSpacing: '.04em', textTransform: 'uppercase',
      background: m.bg, color: m.color, whiteSpace: 'nowrap',
    }}>
      {m.label}
    </span>
  );
}

// ══════════════════════════════════════════════════════════════════════
// JOB CARD (Cases view)
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
        <Pill status={effectiveStatus} meta={CASE_STATUS_META} />
      </div>

      <div style={{
        fontSize: 11.5, color: MUT, marginBottom: 8,
        overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
      }}>
        {job.sub_service_name || '—'}
      </div>

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
            }}>M:{name}</span>
          ))}
          {checkerNames.map((name, i) => (
            <span key={`c-${i}`} style={{
              fontSize: 10, padding: '2px 7px', borderRadius: 4,
              background: '#E8F7F3', color: '#0D6B52', fontWeight: 600,
              whiteSpace: 'nowrap',
            }}>C:{name}</span>
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
// JOB ROW (Cases list view)
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
      <Pill status={effectiveStatus} meta={CASE_STATUS_META} />
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════
// NOTICE CARD (Notices grid view)
// ══════════════════════════════════════════════════════════════════════
function NoticeCard({ notice, onOpen }) {
  const [hov, setHov] = useState(false);
  const effectiveStatus = getNoticeEffectiveStatus(notice);
  const dueInfo = getDaysInfo(notice.extended_due_date || notice.due_date, notice.status);
  const isAttention = effectiveStatus === 'attention_required';

  return (
    <div
      style={{
        background: WH,
        border: `1.5px solid ${isAttention ? '#fecaca' : (hov ? '#c7d2fe' : BRD)}`,
        borderRadius: 10,
        padding: '14px 16px',
        cursor: 'pointer',
        transition: 'all .15s',
        display: 'flex',
        flexDirection: 'column',
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
        }} title={notice.client_name}>
          {notice.client_name}
        </div>
        <Pill status={effectiveStatus} meta={NOTICE_STATUS_META} />
      </div>

      {/* Row 2: Sub-service + DIN */}
      <div style={{
        fontSize: 11.5, color: MUT, marginBottom: 8,
        display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap',
      }}>
        <span style={{
          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
          minWidth: 0,
        }}>{notice.sub_service_name || '—'}</span>
        {notice.din_number && (
          <>
            <span style={{ color: '#d1d5db' }}>·</span>
            <span style={{
              fontSize: 10.5, fontWeight: 700, color: P,
              background: PL, padding: '1px 7px', borderRadius: 4,
              border: `1px solid ${BRD}`,
              fontFamily: 'monospace', letterSpacing: '0.02em',
            }}>
              DIN: {notice.din_number}
            </span>
          </>
        )}
      </div>

      {/* Row 3: Officer + Section */}
      {(notice.officer || notice.section) && (
        <div style={{
          fontSize: 11, color: '#4b5563', marginBottom: 8,
          display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap',
        }}>
          {notice.officer && (
            <span style={{
              overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
              maxWidth: 200,
            }} title={notice.officer}>
              👤 {notice.officer}
            </span>
          )}
          {notice.section && (
            <span style={{
              fontSize: 10, color: MUT, fontFamily: 'monospace',
            }}>
              sec {notice.section}
            </span>
          )}
        </div>
      )}

      {/* Row 4: Due date + task id */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 10,
        marginBottom: 12, flexWrap: 'wrap',
      }}>
        {dueInfo && (
          <span style={{
            display: 'inline-flex', alignItems: 'center', gap: 5,
            fontSize: 11, color: dueInfo.color, fontWeight: 700,
          }}>
            <span style={{
              width: 18, height: 18, borderRadius: 4,
              background: dueInfo.urgent ? '#FEE2E2' : '#E0F2FE',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 10, flexShrink: 0,
            }}>⏰</span>
            {dueInfo.text}
          </span>
        )}
        {notice.task_id && (
          <span style={{
            fontSize: 10.5, color: MUT, fontFamily: 'monospace',
          }}>
            {notice.task_id}
          </span>
        )}
      </div>

      {/* Footer: due date raw display */}
      <div style={{
        borderTop: `1px solid ${BRD}`, paddingTop: 8, marginTop: 'auto',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        gap: 6, fontSize: 10.5, color: MUT,
      }}>
        <span>
          Due: <b style={{ color: '#1C1E2E' }}>{fmtDate(notice.extended_due_date || notice.due_date) || '—'}</b>
        </span>
        {notice.replies_count > 0 && (
          <span style={{
            fontSize: 10, padding: '2px 7px', borderRadius: 4,
            background: '#E8F7F3', color: '#0D6B52', fontWeight: 700,
          }}>
            💬 {notice.replies_count} {notice.replies_count === 1 ? 'reply' : 'replies'}
          </span>
        )}
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════
// NOTICE ROW (Notices list view)
// ══════════════════════════════════════════════════════════════════════
function NoticeRow({ notice, onOpen }) {
  const [hov, setHov] = useState(false);
  const effectiveStatus = getNoticeEffectiveStatus(notice);
  const dueInfo = getDaysInfo(notice.extended_due_date || notice.due_date, notice.status);
  const isAttention = effectiveStatus === 'attention_required';

  return (
    <div
      style={{
        background: WH,
        border: `1px solid ${isAttention ? '#fecaca' : (hov ? '#c7d2fe' : BRD)}`,
        borderRadius: 8,
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
          display: 'flex', alignItems: 'center', gap: 6,
        }}>
          <span style={{
            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
          }}>{notice.client_name}</span>
          {notice.din_number && (
            <span style={{
              fontSize: 10, fontWeight: 700, color: P,
              background: PL, padding: '1px 6px', borderRadius: 3,
              fontFamily: 'monospace', flexShrink: 0,
            }}>
              DIN: {notice.din_number}
            </span>
          )}
        </div>
        <div style={{ fontSize: 11, color: MUT, marginTop: 2, display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
          <span>{notice.sub_service_name || '—'}</span>
          {notice.officer && <span>· 👤 {notice.officer}</span>}
          {notice.section && <span>· sec {notice.section}</span>}
        </div>
      </div>

      {dueInfo && (
        <span style={{
          fontSize: 11, color: dueInfo.color, fontWeight: 700,
          padding: '2px 8px', borderRadius: 4,
          background: dueInfo.urgent ? '#FEE2E2' : '#F3F4F6',
          flexShrink: 0,
        }}>
          {dueInfo.text}
        </span>
      )}

      <Pill status={effectiveStatus} meta={NOTICE_STATUS_META} />
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ══════════════════════════════════════════════════════════════════════
export default function LitigationJobListView({
  title, subtitle, api: caseApi, CaseModal, breadcrumbs, clientPath,
  caseType, onCreated, emptyMessage, tableColumns,
}) {
  const navigate = useNavigate();
  const { user } = useAuth();

  // ✅ Determine litigation_type from caseType (used for notices API)
  const litigationType = caseType === 'income-tax-litigations' ? 'income-tax' : 'tds';

  // ── State ──
  const [cases, setCases] = useState([]);
  const [notices, setNotices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [viewMode, setViewMode] = useState('grid');
  // ✅ Read view from URL param (dashboard navigates with ?view=cases or ?view=notices)
  const [dataMode, setDataMode] = useState(() => {
    const params = new URLSearchParams(window.location.search);
    const view = params.get('view');
    return view === 'notices' ? 'notices' : 'cases';
  });
  const [modalOpen, setModalOpen] = useState(false);
  const [mcCase, setMcCase] = useState(null);
  const [editCase, setEditCase] = useState(null);

  const [statusFilter, setStatusFilter] = useState(() => {
    const params = new URLSearchParams(window.location.search);
    const st = params.get('status');
    return st && ['wip', 'open', 'closed', 'attention_required', 'under_review'].includes(st) ? st : 'All';
  });

  const [search, setSearch] = useState('');
  const [subServiceFilter, setSubServiceFilter] = useState('All');

  // ── Fetchers ──
  const fetchCases = async () => {
    try {
      const res = await caseApi.get('');
      setCases(res.data.results || res.data);
    } catch { setError(`Failed to load ${title.toLowerCase()}.`); }
  };

  const fetchNotices = async () => {
    try {
      const res = await api.get('/legal-services/notices/', {
        params: { litigation_type: litigationType }
      });
      const data = Array.isArray(res.data) ? res.data : (res.data.results || []);
      setNotices(data);
    } catch { setError('Failed to load notices.'); }
  };

  useEffect(() => {
    setLoading(true); setError(null);
    Promise.all([fetchCases(), fetchNotices()])
      .finally(() => setLoading(false));
    // eslint-disable-next-line
  }, []);

  
  const isInitialMount = useRef(true);

  // ── Reset status filter when switching mode (since notices have different statuses) ──
  useEffect(() => {
    if (isInitialMount.current) {
      // Don't reset the filter on the first page load! Keep what came from the Dashboard URL.
      isInitialMount.current = false;
    } else {
      // Only reset to 'All' when the user manually clicks between Cases and Notices tabs
      setStatusFilter('All');
    }
  }, [dataMode]);

  // ── Derived data ──
  const allCases = cases;
  const allNotices = notices;

  const getEffectiveStatus = (c) => c.computed_status || c.activity_status || 'wip';

  // Status options depend on mode
  const STS = dataMode === 'cases'
    ? ['All', 'wip', 'attention_required', 'open', 'closed']
    : ['All', 'wip', 'under_review', 'attention_required', 'open'];

  const STATUS_META = dataMode === 'cases' ? CASE_STATUS_META : NOTICE_STATUS_META;

    // ✅ Sub-service options based on Litigation Type (Fixed lists)
  const activeSubServices = litigationType === 'income-tax' ? INCOME_TAX_SUBSERVICES : TDS_SUBSERVICES;
  
  // Create options array, combine with any edge-case ones from DB just in case, but keep fixed list primary
  const dbSubServices = new Set([
    ...allCases.map(c => c.sub_service_name).filter(Boolean),
    ...allNotices.map(n => n.sub_service_name).filter(Boolean),
  ]);
  
  activeSubServices.forEach(s => dbSubServices.add(s));
  const subServiceOptions = ['All', ...Array.from(dbSubServices).sort()];

  // Filter cases
  const filteredCases = allCases.filter((c) => {
    if (statusFilter !== 'All' && getEffectiveStatus(c) !== statusFilter) return false;
    if (subServiceFilter !== 'All' && c.sub_service_name !== subServiceFilter) return false;
    const sq = search.toLowerCase();
    if (sq && !(c.client_name || '').toLowerCase().includes(sq)
      && !(c.task_id || '').toLowerCase().includes(sq)
      && !(c.sub_service_name || '').toLowerCase().includes(sq)) return false;
    return true;
  });

  // Filter notices
  const filteredNotices = allNotices.filter((n) => {
    const effStatus = getNoticeEffectiveStatus(n);
    if (statusFilter !== 'All' && effStatus !== statusFilter) return false;
    if (subServiceFilter !== 'All' && n.sub_service_name !== subServiceFilter) return false;
    const sq = search.toLowerCase();
    if (sq
      && !(n.client_name || '').toLowerCase().includes(sq)
      && !(n.sub_service_name || '').toLowerCase().includes(sq)
      && !(n.din_number || '').toLowerCase().includes(sq)
      && !(n.officer || '').toLowerCase().includes(sq)
    ) return false;
    return true;
  });

  const filtered = dataMode === 'cases' ? filteredCases : filteredNotices;
  const totalCount = dataMode === 'cases' ? allCases.length : allNotices.length;

  // Counts for status filter dropdown
  const counts = {};
  STS.forEach(s => {
    if (dataMode === 'cases') {
      counts[s] = s === 'All' ? allCases.length : allCases.filter(c => getEffectiveStatus(c) === s).length;
    } else {
      counts[s] = s === 'All' ? allNotices.length : allNotices.filter(n => getNoticeEffectiveStatus(n) === s).length;
    }
  });

  // ── Navigation ──
  const goToCase = (c) => {
    const path = typeof clientPath === 'function' ? clientPath(c) : `/legal-services/clients/${c.client}`;
    navigate(path);
  };

  const goToNotice = (n) => {
    const clientId = n.client_id || n.court_case?.client_id;
    if (!clientId) {
      alert("This notice is missing client details.");
      return;
    }
    
    const params = new URLSearchParams();
    params.set('type', litigationType);
    if (n.job_id) params.set('caseId', String(n.job_id));
    params.set('tab', 'activity');
    params.set('notice', String(n.id));
    
    navigate(`/legal-services/clients/${clientId}?${params.toString()}`);
  };

  const canAddNewCase = ['Founder', 'Manager', 'Team Lead','Admin'].includes(user?.role);
  const canAssignMC = () => ['Founder', 'Manager', 'Team Lead','Admin'].includes(user?.role);

  const handleCreated = (createdCase) => {
    fetchCases();
    fetchNotices();
    if (onCreated) onCreated(createdCase);
  };

  const getPageLabel = (filter) => {
    if (filter === 'All') return '';
    return STATUS_META[filter]?.label || '';
  };

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
            {totalCount} {dataMode === 'cases' ? `case${totalCount !== 1 ? 's' : ''}` : `notice${totalCount !== 1 ? 's' : ''}`}
          </span>
        </div>

        {/* ✅ NEW: Toggle group — Cases/Notices + Grid/List */}
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
          {/* Cases / Notices toggle */}
          <div style={{
            display: 'flex', gap: 4, border: `1.5px solid ${BRD}`,
            borderRadius: 8, overflow: 'hidden', background: WH,
          }}>
            <button onClick={() => setDataMode('cases')}
              style={{
                padding: '6px 14px', fontSize: 12, cursor: 'pointer', border: 'none', fontFamily: 'inherit',
                background: dataMode === 'cases' ? PL : WH,
                color: dataMode === 'cases' ? P : MUT,
                fontWeight: 600,
                display: 'flex', alignItems: 'center', gap: 5,
              }}>📄 Cases</button>
            <button onClick={() => setDataMode('notices')}
              style={{
                padding: '6px 14px', fontSize: 12, cursor: 'pointer', border: 'none', fontFamily: 'inherit',
                background: dataMode === 'notices' ? PL : WH,
                color: dataMode === 'notices' ? P : MUT,
                fontWeight: 600,
                display: 'flex', alignItems: 'center', gap: 5,
              }}>🔔 Notices</button>
          </div>

          {/* Grid / List toggle */}
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
            placeholder={dataMode === 'cases'
              ? "Search client, STT ID..."
              : "Search client, DIN, officer, sub-service..."}
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
          {filtered.length} of {totalCount} {dataMode === 'cases' ? 'jobs' : 'notices'}
        </span>

        {/* ✅ New Case button — only in Cases mode */}
        {dataMode === 'cases' && canAddNewCase && CaseModal && (
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
          Loading {dataMode}...
        </div>
      )}
      {error && !loading && (
        <div style={{ textAlign: 'center', padding: '3rem', color: '#dc2626', background: '#fef2f2', border: '1.5px solid #fecaca', borderRadius: 12 }}>
          {error}
        </div>
      )}
      {!loading && !error && filtered.length === 0 && (
        <div style={{ textAlign: 'center', padding: '4rem 2rem', color: MUT, background: WH, border: `1.5px solid ${BRD}`, borderRadius: 12 }}>
          <div style={{ fontSize: 36, opacity: .25, marginBottom: 12 }}>
            {dataMode === 'cases' ? '📂' : '🔔'}
          </div>
          <div style={{ fontSize: 14, fontWeight: 600 }}>
            {search || statusFilter !== 'All'
              ? `No ${dataMode} match your filters`
              : (emptyMessage || `No ${dataMode} yet.`)}
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
          {dataMode === 'cases'
            ? filtered.map((job) => (
                <JobCard
                  key={job.id}
                  job={job}
                  onOpen={() => goToCase(job)}
                  onAssign={() => setMcCase(job)}
                  canAssign={canAssignMC()}
                />
              ))
            : filtered.map((notice) => (
                <NoticeCard
                  key={notice.id}
                  notice={notice}
                  onOpen={() => goToNotice(notice)}
                />
              ))
          }
        </div>
      )}

      {/* ── List view ── */}
      {!loading && !error && filtered.length > 0 && viewMode === 'list' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {dataMode === 'cases'
            ? filtered.map((job) => (
                <JobRow
                  key={job.id}
                  job={job}
                  onOpen={() => goToCase(job)}
                  onAssign={() => setMcCase(job)}
                  canAssign={canAssignMC()}
                />
              ))
            : filtered.map((notice) => (
                <NoticeRow
                  key={notice.id}
                  notice={notice}
                  onOpen={() => goToNotice(notice)}
                />
              ))
          }
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