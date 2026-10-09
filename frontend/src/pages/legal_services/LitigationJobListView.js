// LitigationJobListView.js — Cases / Notices list with grid (JobCard) and
// list (shared Table) views. Props are unchanged.

import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Select, Input } from 'antd';
import { useAuth } from '../../contexts/AuthContext';
import { MCModal } from './LegalModals';
import {
  Breadcrumb, JobCard, TeamBadges, Table, EmptyState, ErrorBanner, Segmented, StatusPill, DueChip,
  P, PL, BRD, MUT, CASE_STATUS, CASE_CARD_CONFIG, NOTICE_CARD_CONFIG, LEGAL_MANAGER_ROLES,
  legalApi, toList, fmtDate, getCaseStatus, getNoticeEffectiveStatus, noticeDueDate, litigationTypeOf,
} from './legalCommon';

const SUBSERVICES = {
  'income-tax': [
    'Income Tax Appeal', 'Income Tax Assessment', 'Income Tax Summons', 'Income Tax Tribunal Appeal',
    'IT Assessment Assignment', 'IT Bank Attachment Withdrawal', 'IT Penalty Notice JC Appeal',
    'IT Penalty Notice Reply', 'IT Penalty Notice Tribunal', 'OGE Order',
  ],
  tds: ['TDS Appeal Tribunal', 'TDS Appeal Assignment', 'TDS Assessment'],
};

const STATUS_OPTIONS = {
  cases: ['wip', 'attention_required', 'open', 'closed'],
  notices: ['wip', 'under_review', 'attention_required', 'open'],
};

const dateSort = (get) => (a, b) => new Date(get(a) || 0) - new Date(get(b) || 0);

export default function LitigationJobListView({ title, api: caseApi, CaseModal, breadcrumbs, clientPath, caseType, onCreated, emptyMessage }) {
  const navigate = useNavigate();
  const { user } = useAuth();
  const litigationType = litigationTypeOf(caseType);
  const initialParams = useRef(new URLSearchParams(window.location.search)).current;

  const [cases, setCases] = useState([]);
  const [notices, setNotices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Dashboard links here with ?view=cases|notices&status=…
  const [dataMode, setDataMode] = useState(initialParams.get('view') === 'notices' ? 'notices' : 'cases');
  const [statusFilter, setStatusFilter] = useState(() => {
    const st = initialParams.get('status');
    return st && [...STATUS_OPTIONS.cases, ...STATUS_OPTIONS.notices].includes(st) ? st : 'All';
  });
  const [viewMode, setViewMode] = useState('grid');
  const [search, setSearch] = useState('');
  const [subServiceFilter, setSubServiceFilter] = useState('All');
  const [pageSize, setPageSize] = useState(25);
  const [modalOpen, setModalOpen] = useState(false);
  const [mcCase, setMcCase] = useState(null);

  const fetchCases = async () => {
    try {
      const res = await caseApi.get('');
      setCases(res.data.results || res.data);
    } catch {
      setError(`Failed to load ${title.toLowerCase()}.`);
    }
  };

  const fetchNotices = async () => {
    try {
      setNotices(toList(await legalApi.notices.list({ litigation_type: litigationType })));
    } catch {
      setError('Failed to load notices.');
    }
  };

  useEffect(() => {
    Promise.all([fetchCases(), fetchNotices()]).finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Switching Cases ↔ Notices resets the status filter (they use different statuses),
  // but the very first render keeps whatever came in from the dashboard link.
  const firstRender = useRef(true);
  useEffect(() => {
    if (firstRender.current) { firstRender.current = false; return; }
    setStatusFilter('All');
  }, [dataMode]);

  const isCases = dataMode === 'cases';
  const statusOf = isCases ? getCaseStatus : getNoticeEffectiveStatus;
  const source = isCases ? cases : notices;

  const subServiceOptions = useMemo(() => {
    const set = new Set(SUBSERVICES[litigationType]);
    [...cases, ...notices].forEach((x) => x.sub_service_name && set.add(x.sub_service_name));
    return [...set].sort();
  }, [cases, notices, litigationType]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    const haystack = isCases
      ? (c) => [c.client_name, c.task_id, c.sub_service_name]
      : (n) => [n.client_name, n.sub_service_name, n.din_number, n.officer];
    return source.filter((x) => {
      if (statusFilter !== 'All' && statusOf(x) !== statusFilter) return false;
      if (subServiceFilter !== 'All' && x.sub_service_name !== subServiceFilter) return false;
      if (q && !haystack(x).some((v) => (v || '').toLowerCase().includes(q))) return false;
      return true;
    });
  }, [source, isCases, statusOf, statusFilter, subServiceFilter, search]);

  const statusCount = (s) => source.filter((x) => statusOf(x) === s).length;

  const goToCase = (c) => navigate(typeof clientPath === 'function' ? clientPath(c) : `/legal-services/clients/${c.client}`);

  const goToNotice = (n) => {
    const clientId = n.client_id || n.court_case?.client_id;
    if (!clientId) return;
    const params = new URLSearchParams({ type: litigationType, tab: 'activity', notice: String(n.id) });
    if (n.job_id) params.set('caseId', String(n.job_id));
    navigate(`/legal-services/clients/${clientId}?${params.toString()}`);
  };

  const canManage = LEGAL_MANAGER_ROLES.includes(user?.role);

  // ── Table columns (list view) ──
  const caseColumns = [
    { key: 'sl', label: '#', width: 48, render: (_, i) => i + 1 },
    { key: 'client_name', label: 'Client', sortable: true, width: 240, align: 'left' },
    { key: 'sub_service_name', label: 'Sub-service', sortable: true, width: 200, align: 'left' },
    { key: 'period', label: 'Period', render: (c) => c.task_period || c.assessment_year || '—' },
    { key: 'task_id', label: 'Task ID', sortable: true, render: (c) => <span style={{ fontFamily: 'monospace', fontSize: 12 }}>{c.task_id || '—'}</span> },
    { key: 'team', label: 'Team', render: (c) => <TeamBadges makers={c.makers || []} checkers={c.checkers || []} /> },
    { key: 'status', label: 'Status', sortable: true, sortFn: (a, b) => getCaseStatus(a).localeCompare(getCaseStatus(b)), render: (c) => <StatusPill status={getCaseStatus(c)} /> },
    ...(canManage ? [{
      key: 'actions', label: 'Assign',
      render: (c) => (
        <button className="icon-btn icon-btn-primary" title="Assign makers / checkers"
          onClick={(e) => { e.stopPropagation(); setMcCase(c); }}>👤</button>
      ),
    }] : []),
  ];

  const noticeColumns = [
    { key: 'sl', label: '#', width: 48, render: (_, i) => i + 1 },
    { key: 'client_name', label: 'Client', sortable: true, width: 220, align: 'left' },
    { key: 'sub_service_name', label: 'Sub-service', sortable: true, width: 180, align: 'left' },
    { key: 'din_number', label: 'DIN', sortable: true, render: (n) => <span style={{ fontFamily: 'monospace', fontSize: 12 }}>{n.din_number || '—'}</span> },
    { key: 'officer', label: 'Officer', sortable: true, width: 180, align: 'left' },
    { key: 'section', label: 'Section' },
    {
      key: 'due', label: 'Due', sortable: true, sortFn: dateSort(noticeDueDate),
      render: (n) => (
        <span style={{ display: 'inline-flex', gap: 6, alignItems: 'center' }}>
          {fmtDate(noticeDueDate(n))} <DueChip notice={n} />
        </span>
      ),
    },
    { key: 'status', label: 'Status', sortable: true, sortFn: (a, b) => getNoticeEffectiveStatus(a).localeCompare(getNoticeEffectiveStatus(b)), render: (n) => <StatusPill status={getNoticeEffectiveStatus(n)} /> },
  ];

  const steps = [
    { label: 'Legal Services', onClick: () => navigate('/legal-services') },
    ...(breadcrumbs || []).map((c) => ({ label: c.label, onClick: () => navigate(c.path) })),
    { label: `${title}${statusFilter !== 'All' ? ` — ${CASE_STATUS[statusFilter]?.label}` : ''}` },
  ];

  const noun = isCases ? 'case' : 'notice';

  return (
    <div className="page-container">
      <Breadcrumb steps={steps} />

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16, flexWrap: 'wrap', gap: 10 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <h2 style={{ fontSize: 20, fontWeight: 800, color: '#111827', margin: 0 }}>{title}</h2>
          <span style={{ fontSize: 11, fontWeight: 700, padding: '2px 10px', borderRadius: 99, background: PL, color: P, border: `1px solid ${BRD}` }}>
            {source.length} {noun}{source.length !== 1 ? 's' : ''}
          </span>
        </div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <Segmented value={dataMode} onChange={setDataMode} options={[{ key: 'cases', label: '📄 Cases' }, { key: 'notices', label: '🔔 Notices' }]} />
          <Segmented value={viewMode} onChange={setViewMode} options={[{ key: 'grid', label: '⊞ Grid' }, { key: 'list', label: '≡ List' }]} />
        </div>
      </div>

      <div className="filter-bar">
        <div className="filter-field">
          <Select value={statusFilter} onChange={setStatusFilter} options={[
            { value: 'All', label: `All statuses (${source.length})` },
            ...STATUS_OPTIONS[dataMode].map((s) => ({ value: s, label: `${CASE_STATUS[s].label} (${statusCount(s)})` })),
          ]} />
        </div>
        <div className="filter-field">
          <Select value={subServiceFilter} onChange={setSubServiceFilter} showSearch options={[
            { value: 'All', label: 'All sub-services' },
            ...subServiceOptions.map((s) => ({ value: s, label: s })),
          ]} />
        </div>
        <div className="filter-field filter-field--grow">
          <Input
            allowClear value={search} onChange={(e) => setSearch(e.target.value)} prefix={<span style={{ color: MUT }}>🔍</span>}
            placeholder={isCases ? 'Search client, task ID, sub-service…' : 'Search client, DIN, officer, sub-service…'}
          />
        </div>
        <span style={{ fontSize: 12, color: MUT, whiteSpace: 'nowrap' }}>{filtered.length} of {source.length}</span>
        
      </div>

      <ErrorBanner>{!loading && error}</ErrorBanner>

      {loading ? (
        <EmptyState icon="⏳" text={`Loading ${dataMode}…`} />
      ) : filtered.length === 0 ? (
        <EmptyState icon={isCases ? '📂' : '🔔'} text={search || statusFilter !== 'All' || subServiceFilter !== 'All' ? `No ${dataMode} match your filters` : emptyMessage || `No ${dataMode} yet.`} />
      ) : viewMode === 'grid' ? (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(268px, 1fr))', gap: 12, alignItems: 'stretch' }}>
          {filtered.map((item) => isCases ? (
            <JobCard key={item.id} job={item} cardConfig={CASE_CARD_CONFIG} canAssign={canManage}
              onOpen={() => goToCase(item)} onAssign={() => setMcCase(item)} />
          ) : (
            <JobCard key={item.id} job={item} cardConfig={NOTICE_CARD_CONFIG} onOpen={() => goToNotice(item)} />
          ))}
        </div>
      ) : (
        <Table
          columns={isCases ? caseColumns : noticeColumns}
          rows={filtered}
          getRowId={(r) => r.id}
          onRowClick={isCases ? goToCase : goToNotice}
          getRowClassName={(r) => (!isCases && getNoticeEffectiveStatus(r) === 'attention_required' ? 'row-highlight' : '')}
          pageSize={pageSize}
          pageSizeOptions={[25, 50, 100]}
          onPageSizeChange={setPageSize}
        />
      )}

      {CaseModal && (
        <CaseModal
          open={modalOpen} editCase={null} onClose={() => setModalOpen(false)}
          onCreated={(created) => { fetchCases(); fetchNotices(); onCreated?.(created); }}
        />
      )}

      {mcCase && (
        <MCModal
          job={{ id: mcCase.id, makers: mcCase.makers, checkers: mcCase.checkers, client_name: mcCase.client_name, ...(caseType ? { caseType } : {}) }}
          onClose={() => setMcCase(null)}
          onAssigned={() => { setMcCase(null); fetchCases(); }}
        />
      )}
    </div>
  );
}
