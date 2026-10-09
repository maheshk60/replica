// LitigationDashboard.js — Cases + Notices summary for one litigation type.
// Used by: TDS, Income Tax (and future MCA / FEMA / Partnership sub-services).
// Props are unchanged.

import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import {
  Breadcrumb, JobSummaryList, StatCard, Panel, ErrorBanner, P, GR, RED, AMB, PUR, MUT, toList, idOf,
} from '../IncomeTaxPage/JobUiCommon';
import {
  SKY, NOTICE_CARD_CONFIG, LEGAL_MANAGER_ROLES, legalApi, getCaseStatus, isNoticeAttention, litigationTypeOf, isNoticeMyTurn,
} from './LegalModals';

function Section({ icon, label, children }) {
  return (
    <div style={{ marginBottom: 24 }}>
      <h2 style={{ fontSize: 15, fontWeight: 800, color: '#1C1E2E', margin: '0 0 12px', paddingBottom: 8, borderBottom: '1.5px solid var(--color-slate-200)' }}>
        {icon} {label}
      </h2>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 16 }}>{children}</div>
    </div>
  );
}

export default function LitigationDashboard({ title, api: caseApi, CaseModal, breadcrumbs, caseType, jobListPath, onCreated }) {
  const navigate = useNavigate();
  const { user } = useAuth();
  const litigationType = litigationTypeOf(caseType);

  const [cases, setCases] = useState([]);
  const [notices, setNotices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [modalOpen, setModalOpen] = useState(false);

  const fetchCases = async () => {
    try {
      const res = await caseApi.get();
      setCases(res.data.results || res.data);
    } catch {
      setError(`Failed to load ${title.toLowerCase()}.`);
    }
  };

  // Rows without a client can't be opened, so they're left out of the dashboard.
  const fetchNotices = async () => {
    try {
      const res = await legalApi.notices.list({ litigation_type: litigationType });
      setNotices(toList(res).filter((n) => n.client_id || n.court_case?.client_id));
    } catch {
      setNotices([]);
    }
  };

  useEffect(() => {
    Promise.all([fetchCases(), fetchNotices()]).finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Whose turn is it on a notice? ──
  const caseById = useMemo(() => Object.fromEntries(cases.map((c) => [Number(c.id), c])), [cases]);
  const { pendingNotices, attentionNotices, openNotices } = useMemo(() => {
    const has = (list, id) => (list || []).some((m) => idOf(m) === id);
    const isMyTurn = (n) => isNoticeMyTurn(n, caseById[Number(n.job_id)] || {}, user);
    const isAssigned = (n) => {
      const job = caseById[Number(n.job_id)];
      return !!job && (has(job.makers, user?.id) || has(job.checkers, user?.id));
    };
    const active = notices.filter(isMyTurn);
    return {
      pendingNotices: active.filter((n) => !isNoticeAttention(n)),
      attentionNotices: active.filter(isNoticeAttention),
      openNotices: notices.filter((n) => n.status === 'open' && isAssigned(n)),
    };
  }, [notices, caseById, user]);

  // ── Counts ──
  const countCases = (s) => cases.filter((c) => getCaseStatus(c) === s).length;
  const activeCases = cases.filter((c) => getCaseStatus(c) !== 'closed').length;
  const attentionCases = countCases('attention_required');
  const attentionNoticeCount = notices.filter(isNoticeAttention).length;

  const goTo = (view, status) => {
    if (!jobListPath) return;
    const params = new URLSearchParams({ view });
    if (status) params.set('status', status);
    navigate(`${jobListPath}?${params.toString()}`);
  };

  const goToNotice = (notice) => {
    const clientId = notice.client_id || notice.court_case?.client_id;
    if (!clientId) return;
    const params = new URLSearchParams({ type: litigationType, tab: 'activity', notice: String(notice.id) });
    if (notice.job_id) params.set('caseId', String(notice.job_id));
    navigate(`/legal-services/clients/${clientId}?${params.toString()}`);
  };

  const canAddNewCase = LEGAL_MANAGER_ROLES.includes(user?.role);

  const caseCards = [
    { label: 'All Cases', value: cases.length, color: P, icon: '📊', sub: 'all cases', onClick: () => goTo('cases') },
    { label: 'WIP', value: countCases('wip'), color: AMB, icon: '🔄', sub: 'work in progress', onClick: () => goTo('cases', 'wip') },
    { label: 'Open', value: countCases('open'), color: SKY, icon: '📂', sub: 'all notices acknowledged', onClick: () => goTo('cases', 'open') },
    { label: 'Closed', value: countCases('closed'), color: GR, icon: '✅', sub: 'completed cases', onClick: () => goTo('cases', 'closed') },
    { label: 'Attention Required', value: attentionCases, color: attentionCases ? RED : MUT, icon: '⏰', sub: 'needs immediate action', onClick: () => goTo('cases', 'attention_required') },
  ];

  const noticeCards = [
    { label: 'All Notices', value: notices.length, color: P, icon: '🔔', sub: 'all notices across cases', onClick: () => goTo('notices') },
    { label: 'WIP', value: notices.filter((n) => n.status === 'wip' && !isNoticeAttention(n)).length, color: AMB, icon: '🔄', sub: 'awaiting maker work', onClick: () => goTo('notices', 'wip') },
    { label: 'Under Review', value: notices.filter((n) => n.status === 'under_review' && !isNoticeAttention(n)).length, color: PUR, icon: '🔎', sub: 'pending checker review', onClick: () => goTo('notices', 'under_review') },
    { label: 'Open', value: notices.filter((n) => n.status === 'open').length, color: SKY, icon: '📂', sub: 'acknowledged', onClick: () => goTo('notices', 'open') },
    { label: 'Attention Required', value: attentionNoticeCount, color: attentionNoticeCount ? RED : MUT, icon: '⏰', sub: 'due ≤ 5 days or overdue', onClick: () => goTo('notices', 'attention_required') },
  ];

  const steps = [
    { label: 'Legal Services', onClick: () => navigate('/legal-services') },
    ...(breadcrumbs || []).map((c) => ({ label: c.label, onClick: () => navigate(c.path) })),
    { label: 'Dashboard' },
  ];

  return (
    <div className="page-container">
      <Breadcrumb steps={steps} />

      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 24, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 900, color: '#111827', margin: 0, letterSpacing: '-.03em' }}>{title}</h1>
          <p style={{ fontSize: 13, color: MUT, margin: '5px 0 0' }}>
            {loading ? 'Loading…' : `${cases.length} case${cases.length !== 1 ? 's' : ''} · ${activeCases} active · ${notices.length} notice${notices.length !== 1 ? 's' : ''}`}
          </p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          {jobListPath && <button className="btn btn-primary" onClick={() => navigate(jobListPath)}>📋 All Jobs</button>}
        </div>
      </div>

      <ErrorBanner>{error}</ErrorBanner>

      <Section icon="📄" label="Cases">
        {caseCards.map((c) => <StatCard key={c.label} {...c} value={loading ? '–' : c.value} />)}
      </Section>

      <Section icon="🔔" label="Notices">
        {noticeCards.map((c) => <StatCard key={c.label} {...c} value={loading ? '–' : c.value} />)}
      </Section>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 16 }}>
        <Panel title="My Pending Tasks" subtitle="Notices waiting for your action" count={pendingNotices.length} countColor={AMB}>
          <JobSummaryList jobs={pendingNotices} cardConfig={NOTICE_CARD_CONFIG} onJobClick={goToNotice} emptyIcon="✅" emptyText="No pending notices" />
        </Panel>
        <Panel title="Attention Required" subtitle="Due in 5 days or overdue" count={attentionNotices.length} countColor={RED} highlight={attentionNotices.length > 0}>
          <JobSummaryList jobs={attentionNotices} cardConfig={NOTICE_CARD_CONFIG} onJobClick={goToNotice} emptyIcon="✅" emptyText="No urgent notices" />
        </Panel>
        <Panel title="Open Jobs" subtitle="All notices acknowledged" count={openNotices.length} countColor={SKY}>
          <JobSummaryList jobs={openNotices} cardConfig={NOTICE_CARD_CONFIG} onJobClick={goToNotice} emptyIcon="📂" emptyText="No open notices" />
        </Panel>
      </div>

      {CaseModal && (
        <CaseModal
          open={modalOpen} editCase={null} onClose={() => setModalOpen(false)}
          onCreated={(created) => { fetchCases(); fetchNotices(); onCreated?.(created); }}
        />
      )}
    </div>
  );
}