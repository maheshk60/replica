// LitigationDashboard.js — Reusable dashboard with summary cards
// Used by: TDS, Income Tax, MCA sub-services, FEMA, Partnership

import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { api } from '../../services/api';

// ══════════════════════════════════════════════════════════════════════
// TOKENS
// ══════════════════════════════════════════════════════════════════════
const P = '#1A2F5A';
const GR = '#0D6B52';
const MUT = '#7A7F99';
const BRD = '#E8EAF0';
const WH = '#FFFFFF';
const PURPLE = '#6D28D9';
const PURPLE_BG = '#F1E8FE';
const RED = '#C62828';
const REDL = '#FEF2F2';

const STATUS_META = {
  wip: { label: 'WIP', color: '#f59e0b', bg: '#FEF3C7', icon: '🔄' },
  open: { label: 'Open', color: '#0ea5e9', bg: '#E0F2FE', icon: '📂' },
  closed: { label: 'Closed', color: '#10b981', bg: '#D1FAE5', icon: '✅' },
  attention_required: { label: 'Attention Required', color: '#dc2626', bg: '#FEE2E2', icon: '⏰' },
  under_review: { label: 'Under Review', color: PURPLE, bg: PURPLE_BG, icon: '🔎' },
};

const noticeApi = {
  list: (params) => api.get('legal-services/notices/', { params }),
};

function Pill({ status }) {
  const meta = STATUS_META[status] || STATUS_META.wip;
  return (
    <span style={{
      padding: '2px 9px', borderRadius: 99, fontSize: 10, fontWeight: 700,
      letterSpacing: '.04em', textTransform: 'uppercase',
      background: meta.bg, color: meta.color, whiteSpace: 'nowrap',
    }}>
      {meta.label}
    </span>
  );
}

// ══════════════════════════════════════════════════════════════════════
// NOTICE LIST PANEL — Unified panel for Notices (Pending, Attention, Open)
// ══════════════════════════════════════════════════════════════════════
function NoticeListPanel({ notices, onNoticeClick, emptyIcon = '✅', emptyText = 'All caught up!', color = '#dc2626' }) {
  if (notices.length === 0) {
    return (
      <div style={{ textAlign: 'center', padding: '24px 0', color: MUT }}>
        <div style={{ fontSize: 28, opacity: 0.3, marginBottom: 8 }}>{emptyIcon}</div>
        <div style={{ fontSize: 12, fontWeight: 500 }}>{emptyText}</div>
      </div>
    );
  }

  // Dynamic light background for hover state
  const hoverBg = color === '#dc2626' ? '#FEF2F2' : color === '#f59e0b' ? '#FFFBEB' : '#E0F2FE'; 

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      {notices.map((notice) => {
        return (
          <div
            key={notice.id}
            onClick={() => onNoticeClick(notice)}
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
                {notice.client_name || 'Unknown Client'}
              </div>
              <div style={{ fontSize: 10, color: MUT, marginTop: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {notice.sub_service_name || '—'} · DIN: {notice.din_number || 'Not added'}
              </div>
            </div>
            <Pill status={notice.status || 'wip'} />
          </div>
        );
      })}
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════
// SECTION HEADER
// ══════════════════════════════════════════════════════════════════════
function SectionHeader({ label, icon }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 8,
      marginBottom: 12, paddingBottom: 8,
      borderBottom: `1.5px solid ${BRD}`,
    }}>
      <span style={{ fontSize: 18 }}>{icon}</span>
      <h2 style={{
        fontSize: 15, fontWeight: 800, color: '#1C1E2E',
        margin: 0, letterSpacing: '-.01em',
      }}>
        {label}
      </h2>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════
// SUMMARY CARD (reusable for Cases and Notices)
// ══════════════════════════════════════════════════════════════════════
function SummaryCard({ card }) {
  return (
    <div
      onClick={card.onClick}
      style={{
        background: WH, border: `1.5px solid ${BRD}`, borderRadius: 16,
        padding: '18px 20px', cursor: 'pointer', transition: 'all .2s',
        position: 'relative', overflow: 'hidden',
        display: 'flex', flexDirection: 'column', justifyContent: 'center',
        minHeight: 120,
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.borderColor = card.color;
        e.currentTarget.style.boxShadow = `0 6px 20px ${card.color}18`;
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.borderColor = BRD;
        e.currentTarget.style.boxShadow = 'none';
      }}
    >
      <div style={{
        position: 'absolute', top: 0, left: 0, right: 0, height: 4,
        background: card.color, borderRadius: '16px 16px 0 0',
      }} />
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
        <span style={{ fontSize: 22 }}>{card.icon}</span>
      </div>
      <div style={{
        fontSize: 34, fontWeight: 900, color: card.color,
        lineHeight: 1, marginBottom: 5,
      }}>
        {card.value}
      </div>
      <div style={{ fontSize: 13, fontWeight: 600, color: '#1C1E2E' }}>{card.label}</div>
      <div style={{ fontSize: 10, color: MUT, marginTop: 2 }}>{card.sub}</div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════
// MAIN DASHBOARD
// ══════════════════════════════════════════════════════════════════════
export default function LitigationDashboard({
  title, subtitle, api: caseApi, CaseModal, breadcrumbs, clientPath,
  caseType, jobListPath, onCreated, emptyMessage,
}) {
  const navigate = useNavigate();
  const { user } = useAuth();

  // ── Core case state ──
  const [cases, setCases] = useState([]);
  const [notices, setNotices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [modalOpen, setModalOpen] = useState(false);

  const getEffectiveStatus = (c) => c.computed_status || c.activity_status || 'wip';
  const litigationTypeForReviews = caseType === 'income-tax-litigations' ? 'income-tax' : 'tds';

  // ✅ Fetch notices safely (catch errors, ignore corrupted rows without clients)
  const fetchNotices = async () => {
    try {
      const res = await noticeApi.list({ litigation_type: litigationTypeForReviews });
      const data = Array.isArray(res.data) ? res.data : (res.data.results || []);
      // Filter out bad data so UI doesn't crash on "Unknown Client"
      setNotices(data.filter((n) => n.client_id || n.court_case?.client_id));
    } catch (err) { 
      console.error("Failed to load notices", err);
      setNotices([]); // Don't fail silently, set empty state
    }
  };

  const fetchCases = async () => {
    try {
      const res = await caseApi.get();
      setCases(res.data.results || res.data);
    } catch { setError(`Failed to load ${title.toLowerCase()}.`); }
  };

  useEffect(() => {
    setLoading(true); setError(null);
    Promise.all([fetchCases(), fetchNotices()]).finally(() => setLoading(false));
    // eslint-disable-next-line
  }, []);

  const isNoticeAttention = (n) => {
    if (n.status === 'open' || n.status === 'closed') return false;
    
    // // ✅ NEW: If CEO is logged in, an escalated notice is ALWAYS urgent
    // if (user?.role === 'Founder' && n.has_escalated_items) {
    //   return true;
    // }

    const due = n.extended_due_date || n.due_date;
    if (!due) return false;
    
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const d = new Date(due); d.setHours(0, 0, 0, 0);
    const daysLeft = Math.ceil((d - today) / (1000 * 60 * 60 * 24));
    
    return daysLeft <= 5; 
  };


    // ✅ Helper: Checks if user is explicitly assigned to a job (Maker or Checker)
  const isUserAssignedToJob = (jobId) => {
    const parentJob = cases.find(c => Number(c.id) === Number(jobId));
    if (!parentJob) return false;
    const isMaker = (parentJob.makers || []).some(m => (m.id ?? m) === user?.id);
    const isChecker = (parentJob.checkers || []).some(c => (c.id ?? c) === user?.id);
    return isMaker || isChecker;
  };

  const isNoticeMyTurn = (notice) => {
    const userId = user?.id;
    const parentJob = cases.find(c => Number(c.id) === Number(notice.job_id)) || {};

    // 1. Founder Turn (Escalated items only)
    // ✅ We ONLY change this one line to check the backend flag we created
    if (user?.role === 'Founder' && notice.has_escalated_items) {
      return true; 
    }
    
    // 2. Checker Turn (Under Review / Pending Review)
    if (notice.status === 'under_review' || notice.review_status === 'pending') {
      const checkers = parentJob.checkers || notice.checkers || [];
      return checkers.some(ch => (typeof ch === 'object' ? ch.id : ch) === userId);
    }
    
    // 3. Maker Turn (WIP status)
    if (notice.status === 'wip') {
      const makers = parentJob.makers || notice.makers || [];
      return makers.some(m => (typeof m === 'object' ? m.id : m) === userId);
    }

    return false;
  };





  // ✅ 1. Pending Notices (My Turn, Not Urgent)
  const pendingNotices = useMemo(() => {
    return notices.filter(n => {
      if (n.status === 'open' || n.status === 'closed') return false; 
      if (isNoticeAttention(n)) return false; // Urgent goes to attention panel
      return isNoticeMyTurn(n);
    });
  }, [notices, cases, user]);

  // ✅ 2. Attention Notices (My Turn, Urgent)
  const attentionNotices = useMemo(() => {
    return notices.filter(n => {
      if (n.status === 'open' || n.status === 'closed') return false; 
      if (!isNoticeAttention(n)) return false; 
      return isNoticeMyTurn(n);
    });
  }, [notices, cases, user]);

  // ✅ 3. Open Notices (Completed - ONLY if explicitly assigned to the job)
  const openNoticesList = useMemo(() => {
    return notices.filter(n => n.status === 'open' && isUserAssignedToJob(n.job_id));
  }, [notices, cases, user]);

  const canAddNewCase = ['Founder', 'Manager', 'Team Lead', 'Admin'].includes(user?.role);

  const handleCreated = (createdCase) => {
    fetchCases();
    fetchNotices();
    if (onCreated) onCreated(createdCase);
  };

  // ✅ Navigate safely with required parameters
  const goToNoticeActivity = (notice) => {
    const clientId = notice.client_id || notice.court_case?.client_id;
    const jobId = notice.job_id;

    if (!clientId) {
      alert("This notice is missing client details. Please wait for sync or contact admin.");
      return;
    }

    const type = litigationTypeForReviews;
    const params = new URLSearchParams();
    params.set('type', type);
    if (jobId) params.set('caseId', String(jobId)); // Add job ID!
    params.set('tab', 'activity');
    params.set('notice', String(notice.id));
    
    navigate(`/legal-services/clients/${clientId}?${params.toString()}`);
  };

  // ✅ Navigate to filtered job list (Cases view)
  const goToFilteredCases = (status) => {
    if (jobListPath) {
      const params = new URLSearchParams();
      params.set('view', 'cases');
      
      if (status) {
        params.set('status', status);
      }
      navigate(`${jobListPath}?${params.toString()}`);
    }
  };

  // ✅ Navigate to filtered notices list (Notices view)
  const goToFilteredNotices = (status) => {
    if (jobListPath) {
      const params = new URLSearchParams();
      params.set('view', 'notices');
      
      if (status) {
        params.set('status', status);
      }
      navigate(`${jobListPath}?${params.toString()}`);
    }
  };



  // ── Case Counts ──
  const totalJobs = cases.length;
  const wipJobs = cases.filter(c => getEffectiveStatus(c) === 'wip').length;
  const openCases = cases.filter(c => getEffectiveStatus(c) === 'open');
  const openJobs = openCases.length;
  const closedJobs = cases.filter(c => getEffectiveStatus(c) === 'closed').length;
  const attentionJobs = cases.filter(c => getEffectiveStatus(c) === 'attention_required');
  const activeJobs = cases.filter(c => getEffectiveStatus(c) !== 'closed').length;

  // ── Notice Counts ──
  const totalNotices = notices.length;
  const wipNotices = notices.filter(n => n.status === 'wip' && !isNoticeAttention(n)).length;
  const underReviewNotices = notices.filter(n => n.status === 'under_review' && !isNoticeAttention(n)).length;
  const openNoticesCount = notices.filter(n => n.status === 'open').length;
  const attentionNoticesCount = notices.filter(n => isNoticeAttention(n)).length;

  // ── Cases Cards Config ──
  const CASE_CARDS = [
    { label: 'All Cases', value: totalJobs, color: P, icon: '📊', sub: 'all cases', onClick: () => goToFilteredCases() },
    { label: 'WIP', value: wipJobs, color: '#f59e0b', icon: '🔄', sub: 'work in progress', onClick: () => goToFilteredCases('wip') },
    { label: 'Open', value: openJobs, color: '#0ea5e9', icon: '📂', sub: 'all notices acknowledged', onClick: () => goToFilteredCases('open') },
    { label: 'Closed', value: closedJobs, color: GR, icon: '✅', sub: 'completed cases', onClick: () => goToFilteredCases('closed') },
    { label: 'Attention Required', value: attentionJobs.length, color: attentionJobs.length > 0 ? RED : MUT, icon: '⏰', sub: 'needs immediate action', onClick: () => goToFilteredCases('attention_required') },
  ];

  // ── Notice Cards Config ──
  const NOTICE_CARDS = [
    { label: 'All Notices', value: totalNotices, color: P, icon: '🔔', sub: 'all notices across cases', onClick: () => goToFilteredNotices() },
    { label: 'WIP', value: wipNotices, color: '#f59e0b', icon: '🔄', sub: 'awaiting maker work', onClick: () => goToFilteredNotices('wip') },
    { label: 'Under Review', value: underReviewNotices, color: PURPLE, icon: '🔎', sub: 'pending checker review', onClick: () => goToFilteredNotices('under_review') },
    { label: 'Open', value: openNoticesCount, color: '#0ea5e9', icon: '📂', sub: 'acknowledged', onClick: () => goToFilteredNotices('open') },
    { label: 'Attention Required', value: attentionNoticesCount, color: attentionNoticesCount > 0 ? RED : MUT, icon: '⏰', sub: 'due ≤ 5 days or overdue', onClick: () => goToFilteredNotices('attention_required') },
  ];

  // Skeleton
  if (loading) {
    return (
      <div style={{ padding: '2px 14px 32px', minHeight: '100%', boxSizing: 'border-box', background: '#f8f9fc' }}>
        <style>{`
          @keyframes skelShine { 0% { background-position: 100% 50% } 100% { background-position: 0 50% } }
          .skel { background: linear-gradient(90deg, #EEF0F5 25%, #F7F8FB 37%, #EEF0F5 63%);
                  background-size: 400% 100%; animation: skelShine 1.4s ease-in-out infinite; border-radius: 8px; }
        `}</style>
        <div className="skel" style={{ width: 220, height: 14, marginBottom: 20 }} />
        <div className="skel" style={{ width: 280, height: 26, marginBottom: 8 }} />
        <div className="skel" style={{ width: 180, height: 14, marginBottom: 24 }} />
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 16, marginBottom: 20 }}>
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
      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.5; transform: scale(1.2); }
        }
      `}</style>

      {/* Breadcrumb */}
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
        <span style={{ fontSize: 13, fontWeight: 700, color: '#1C1E2E' }}>Dashboard</span>
      </div>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 24, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 900, color: '#111827', margin: 0, letterSpacing: '-.03em' }}>{title}</h1>
          <p style={{ fontSize: 13, color: MUT, margin: '5px 0 0' }}>
            {totalJobs} case{totalJobs !== 1 ? 's' : ''} · {activeJobs} active · {totalNotices} notice{totalNotices !== 1 ? 's' : ''}
          </p>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
          {jobListPath && (
            <button onClick={() => navigate(jobListPath)} style={{ padding: '8px 16px', borderRadius: 10, border: `1.5px solid ${P}`, background: P, fontSize: 13, fontWeight: 600, cursor: 'pointer', color: WH, fontFamily: 'inherit' }}>
              📋 All Jobs
            </button>
          )}
          {canAddNewCase && CaseModal && (
            <button onClick={() => setModalOpen(true)} style={{ padding: '8px 16px', borderRadius: 10, border: `1.5px solid ${P}`, background: P, fontSize: 13, fontWeight: 600, cursor: 'pointer', color: WH, fontFamily: 'inherit' }}>
              + New Case
            </button>
          )}
        </div>
      </div>

      {error && <div style={{ padding: '14px 18px', background: REDL, border: '1.5px solid #fecaca', borderRadius: 12, color: RED, fontSize: 13, fontWeight: 600, marginBottom: 16 }}>{error}</div>}

      {/* ═══════════ CASES SECTION ═══════════ */}
      <div style={{ marginBottom: 24 }}>
        <SectionHeader label="Cases" icon="📄" />
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 16, alignItems: 'stretch' }}>
          {CASE_CARDS.map((card) => <SummaryCard key={card.label} card={card} />)}
        </div>
      </div>

      {/* ═══════════ NOTICES SECTION ═══════════ */}
      <div style={{ marginBottom: 24 }}>
        <SectionHeader label="Notices" icon="🔔" />
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 16, alignItems: 'stretch' }}>
          {NOTICE_CARDS.map((card) => <SummaryCard key={card.label} card={card} />)}
        </div>
      </div>

      {/* ═══════════ BOTTOM PANELS (NOTICE-SPECIFIC) ═══════════ */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 16 }}>
        
        {/* ── 1. My Pending Task (Notices assigned to me) ── */}
        <div style={{ background: WH, border: `1.5px solid ${BRD}`, borderRadius: 16, padding: 22, display: 'flex', flexDirection: 'column', height: 380 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14, flexShrink: 0 }}>
            <div>
              <div style={{ fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.08em', color: '#1C1E2E' }}>My Pending Task</div>
              <div style={{ fontSize: 10.5, color: MUT, marginTop: 3, fontWeight: 500 }}>Notices waiting for your action</div>
            </div>
            {pendingNotices.length > 0 && (
              <span style={{ background: '#f59e0b', color: WH, borderRadius: 99, padding: '3px 10px', fontSize: 12, fontWeight: 700 }}>
                {pendingNotices.length}
              </span>
            )}
          </div>
          <div style={{ overflowY: 'auto', flex: 1 }}>
            <NoticeListPanel notices={pendingNotices} onNoticeClick={goToNoticeActivity} color="#f59e0b" emptyText="No pending notices" />
          </div>
        </div>

        {/* ── 2. Attention Required (My urgent notices) ── */}
        <div style={{ background: WH, border: `1.5px solid ${attentionNotices.length > 0 ? '#fecaca' : BRD}`, borderRadius: 16, padding: 22, display: 'flex', flexDirection: 'column', height: 380, boxShadow: attentionNotices.length > 0 ? '0 0 0 3px rgba(220,38,38,0.05)' : 'none' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14, flexShrink: 0 }}>
            <div>
              <div style={{ fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.08em', color: attentionNotices.length > 0 ? RED : '#1C1E2E', display: 'flex', alignItems: 'center', gap: 6 }}>
                {attentionNotices.length > 0 && <span style={{ width: 8, height: 8, borderRadius: '50%', background: RED, animation: 'pulse 2s infinite', display: 'inline-block' }} />}
                Attention Required
              </div>
              <div style={{ fontSize: 10.5, color: MUT, marginTop: 3, fontWeight: 500 }}>Urgent — due ≤ 5 days or overdue</div>
            </div>
            {attentionNotices.length > 0 && (
              <span style={{ background: RED, color: WH, borderRadius: 99, padding: '3px 10px', fontSize: 12, fontWeight: 700 }}>
                {attentionNotices.length}
              </span>
            )}
          </div>
          <div style={{ overflowY: 'auto', flex: 1 }}>
            <NoticeListPanel notices={attentionNotices} onNoticeClick={goToNoticeActivity} color="#dc2626" emptyText="No urgent notices" />
          </div>
        </div>

        {/* ── 3. Open Jobs (Completed Notices) ── */}
        <div style={{ background: WH, border: `1.5px solid ${BRD}`, borderRadius: 16, padding: 22, display: 'flex', flexDirection: 'column', height: 380 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14, flexShrink: 0 }}>
            <div>
              <div style={{ fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.08em', color: '#1C1E2E' }}>Open Jobs</div>
              <div style={{ fontSize: 10.5, color: MUT, marginTop: 3, fontWeight: 500 }}>All notices acknowledged</div>
            </div>
            {openNoticesList.length > 0 && (
              <span style={{ background: '#0ea5e9', color: WH, borderRadius: 99, padding: '3px 10px', fontSize: 12, fontWeight: 700 }}>
                {openNoticesList.length}
              </span>
            )}
          </div>
          <div style={{ overflowY: 'auto', flex: 1 }}>
            <NoticeListPanel notices={openNoticesList} onNoticeClick={goToNoticeActivity} color="#0ea5e9" emptyIcon="📂" emptyText="No open notices" />
          </div>
        </div>

      </div>

      {CaseModal && (
        <CaseModal open={modalOpen} editCase={null} onClose={() => setModalOpen(false)} onCreated={handleCreated} />
      )}
    </div>
  );
}