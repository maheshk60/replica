// // LegalPages.js — every Legal Services route page except the workspaces.
// //
// // Replaces 14 files:
// //   shared:      LitigationDashboard.js, LitigationJobListView.js
// //   litigations: Litigations.js, TDSDashboard.js, TDSLitigations.js,
// //                IncomeTaxDashboard.js, IncomeTaxLitigations.js
// //   mca:         MCAMainSelector.js, MCADashboard.js, MCAJobListView.js,
// //                MCACompanyDashboard.js, MCACompanyJobListView.js,
// //                MCALLPDashboard.js, MCALLPJobListView.js
// //
// // Most of those were 10-line wrappers that only passed a config key; here
// // they are one-line named exports. All colours come from JobUiCommon and
// // all loaders from JobWorkspaceCommon, same as ITR / TDS / GST / PT.
// //
// // Router: import { Litigations, TDSDashboard, … } from '<this folder>/LegalPages'.
// // LitigationDashboard / LitigationJobListView are also exported for any
// // future litigation type (FEMA, Partnership…) that needs them.

// import { useState, useEffect, useMemo, useRef } from 'react';
// import { useNavigate, useSearchParams } from 'react-router-dom';
// import { Select, Input } from 'antd';
// import { useAuth } from '../../../contexts/AuthContext';
// import { api } from '../../../services/api';
// import Table from '../../../components/Table';
// import SubServiceSelector from '../SubServiceSelector';
// import {
//   Breadcrumb, PageHeader, ListHeader, JobCard, JobSummaryList, TeamBadges, StatCard, Panel, EmptyState, ErrorBanner, Segmented,
//   toList, daysUntil, idOf, fmtDate, P, PL, BRD, MUT, INK, AMB, RED, PUR, PURL, GR, SKY,
// } from '../../IncomeTaxPage/JobUiCommon';
// import { Loader } from '../../IncomeTaxPage/JobWorkspaceCommon';
// import {
//   LITIGATION_TYPES, legalApi, noticeDueDate, DueChip, NOTICE_CARD_CONFIG, CASE_CARD_CONFIG,
//   getCaseStatus, getNoticeEffectiveStatus, isNoticeAttention, isNoticeMyTurn, litigationTypeOf,
//   MCA_SERVICES, MCA_CARD_CONFIG, CASE_STATUS, LEGAL_MANAGER_ROLES, StatusPill, MCModal,
//   mcaApi, getMcaStatus, isMcaMyTurn, isMcaOverdue,
// } from '../LegalModals';

// // ═══════════════════════════════════════════════════════════════════
// // Landing-page tiles (Litigations / MCA) — one shared helper
// // ═══════════════════════════════════════════════════════════════════

// // Loads one list per tile in parallel; a failed list counts as empty.
// function useTileLists(keys, fetchList) {
//   const [lists, setLists] = useState({});
//   const [loading, setLoading] = useState(true);
//   useEffect(() => {
//     Promise.all(keys.map((k) => fetchList(k).then(toList).catch(() => [])))
//       .then((ls) => setLists(Object.fromEntries(keys.map((k, i) => [k, ls[i]]))))
//       .finally(() => setLoading(false));
//     // eslint-disable-next-line react-hooks/exhaustive-deps
//   }, []);
//   return { lists, loading };
// }

// // The four counts every tile shows: All · WIP · Open · Overdue.
// const tileStats = (rows, { allLabel, color, isWip, isOpen, isOverdue }, loading) => {
//   const v = (x) => (loading ? '…' : x);
//   return [
//     { label: allLabel, value: v(rows.length), color },
//     { label: 'WIP', value: v(rows.filter(isWip).length), color: AMB },
//     { label: 'Open', value: v(rows.filter(isOpen).length), color: SKY },
//     { label: 'Overdue', value: v(rows.filter(isOverdue).length), color: RED, hint: 'Past due date' },
//   ];
// };

// const LITIGATION_TILES = [
//   { type: 'tds', label: 'TDS Litigations', icon: '📄', color: P, light: PL,
//     description: 'Tax Deducted at Source case management, appeals & dispute tracking' },
//   { type: 'income-tax', label: 'Income Tax Litigations', icon: '📊', color: PUR, light: PURL,
//     description: 'Income tax dispute, appeal tracking & assessment proceedings' },
// ];

// const isNoticeWip = (n) => n.status === 'wip' || n.status === 'under_review';
// // Still being worked on and the due / extended due date has passed.
// const isNoticeOverdue = (n) => isNoticeWip(n) && (daysUntil(noticeDueDate(n)) ?? 0) < 0;

// export function Litigations() {
//   const { lists, loading } = useTileLists(LITIGATION_TILES.map((t) => t.type),
//     (type) => legalApi.notices.list({ litigation_type: type }));
//   const items = LITIGATION_TILES.map((t) => ({
//     ...t,
//     path: `/legal-services/litigations/${t.type}`,
//     stats: tileStats(lists[t.type] || [], {
//       allLabel: 'All Notices', color: t.color,
//       isWip: isNoticeWip, isOpen: (n) => n.status === 'open', isOverdue: isNoticeOverdue,
//     }, loading),
//   }));
//   return <SubServiceSelector title="Litigations" subtitle="Select a service to get started" items={items} backPath="/legal-services" backLabel="Legal Services" />;
// }

// export function MCAMainSelector() {
//   const services = Object.values(MCA_SERVICES);
//   const { lists, loading } = useTileLists(services.map((s) => s.key),
//     (key) => mcaApi.cases({ main_service: key }));
//   const items = services.map((s) => ({
//     label: s.title, description: s.description, path: s.dashboardPath, icon: s.icon, color: s.color, light: s.light,
//     stats: tileStats(lists[s.key] || [], {
//       allLabel: 'All Cases', color: s.color,
//       isWip: (c) => getMcaStatus(c) === 'wip', isOpen: (c) => getMcaStatus(c) === 'open', isOverdue: isMcaOverdue,
//     }, loading),
//   }));
//   return <SubServiceSelector title="MCA Services" subtitle="Select a service category to get started" items={items} backPath="/legal-services" backLabel="Legal Services" />;
// }

// // ═══════════════════════════════════════════════════════════════════
// // Litigation dashboard — Cases + Notices summary for one litigation type
// // (formerly LitigationDashboard.js)
// // ═══════════════════════════════════════════════════════════════════
// function LitSection({ icon, label, children }) {
//   return (
//     <div style={{ marginBottom: 24 }}>
//       <h2 style={{ fontSize: 15, fontWeight: 800, color: INK, margin: '0 0 12px', paddingBottom: 8, borderBottom: `1.5px solid ${BRD}` }}>
//         {icon} {label}
//       </h2>
//       <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 16 }}>{children}</div>
//     </div>
//   );
// }

// export function LitigationDashboard({ title, api: caseApi, CaseModal, breadcrumbs, caseType, jobListPath, onCreated }) {
//   const navigate = useNavigate();
//   const { user } = useAuth();
//   const litigationType = litigationTypeOf(caseType);

//   const [cases, setCases] = useState([]);
//   const [notices, setNotices] = useState([]);
//   const [loading, setLoading] = useState(true);
//   const [error, setError] = useState(null);
//   const [modalOpen, setModalOpen] = useState(false);

//   const fetchCases = async () => {
//     try {
//       const res = await caseApi.get();
//       setCases(res.data.results || res.data);
//     } catch {
//       setError(`Failed to load ${title.toLowerCase()}.`);
//     }
//   };

//   // Rows without a client can't be opened, so they're left out of the dashboard.
//   const fetchNotices = async () => {
//     try {
//       const res = await legalApi.notices.list({ litigation_type: litigationType });
//       setNotices(toList(res).filter((n) => n.client_id || n.court_case?.client_id));
//     } catch {
//       setNotices([]);
//     }
//   };

//   useEffect(() => {
//     Promise.all([fetchCases(), fetchNotices()]).finally(() => setLoading(false));
//     // eslint-disable-next-line react-hooks/exhaustive-deps
//   }, []);

//   // ── Whose turn is it on a notice? ──
//   const caseById = useMemo(() => Object.fromEntries(cases.map((c) => [Number(c.id), c])), [cases]);
//   const { pendingNotices, attentionNotices, openNotices } = useMemo(() => {
//     const has = (list, id) => (list || []).some((m) => idOf(m) === id);
//     const isMyTurn = (n) => isNoticeMyTurn(n, caseById[Number(n.job_id)] || {}, user);
//     const isAssigned = (n) => {
//       const job = caseById[Number(n.job_id)];
//       return !!job && (has(job.makers, user?.id) || has(job.checkers, user?.id));
//     };
//     const active = notices.filter(isMyTurn);
//     return {
//       pendingNotices: active.filter((n) => !isNoticeAttention(n)),
//       attentionNotices: active.filter(isNoticeAttention),
//       openNotices: notices.filter((n) => n.status === 'open' && isAssigned(n)),
//     };
//   }, [notices, caseById, user]);

//   // ── Counts ──
//   const countCases = (s) => cases.filter((c) => getCaseStatus(c) === s).length;
//   const activeCases = cases.filter((c) => getCaseStatus(c) !== 'closed').length;
//   const attentionCases = countCases('attention_required');
//   const attentionNoticeCount = notices.filter(isNoticeAttention).length;

//   const goTo = (view, status) => {
//     if (!jobListPath) return;
//     const params = new URLSearchParams({ view });
//     if (status) params.set('status', status);
//     navigate(`${jobListPath}?${params.toString()}`);
//   };

//   const goToNotice = (notice) => {
//     const clientId = notice.client_id || notice.court_case?.client_id;
//     if (!clientId) return;
//     const params = new URLSearchParams({ type: litigationType, tab: 'activity', notice: String(notice.id) });
//     if (notice.job_id) params.set('caseId', String(notice.job_id));
//     navigate(`/legal-services/clients/${clientId}?${params.toString()}`);
//   };

//   const canAddNewCase = LEGAL_MANAGER_ROLES.includes(user?.role);

//   const caseCards = [
//     { label: 'All Cases', value: cases.length, color: P, icon: '📊', sub: 'all cases', onClick: () => goTo('cases') },
//     { label: 'WIP', value: countCases('wip'), color: AMB, icon: '🔄', sub: 'work in progress', onClick: () => goTo('cases', 'wip') },
//     { label: 'Open', value: countCases('open'), color: SKY, icon: '📂', sub: 'all notices acknowledged', onClick: () => goTo('cases', 'open') },
//     { label: 'Closed', value: countCases('closed'), color: GR, icon: '✅', sub: 'completed cases', onClick: () => goTo('cases', 'closed') },
//     { label: 'Attention Required', value: attentionCases, color: attentionCases ? RED : MUT, icon: '⏰', sub: 'needs immediate action', onClick: () => goTo('cases', 'attention_required') },
//   ];

//   const noticeCards = [
//     { label: 'All Notices', value: notices.length, color: P, icon: '🔔', sub: 'all notices across cases', onClick: () => goTo('notices') },
//     { label: 'WIP', value: notices.filter((n) => n.status === 'wip' && !isNoticeAttention(n)).length, color: AMB, icon: '🔄', sub: 'awaiting maker work', onClick: () => goTo('notices', 'wip') },
//     { label: 'Under Review', value: notices.filter((n) => n.status === 'under_review' && !isNoticeAttention(n)).length, color: PUR, icon: '🔎', sub: 'pending checker review', onClick: () => goTo('notices', 'under_review') },
//     { label: 'Open', value: notices.filter((n) => n.status === 'open').length, color: SKY, icon: '📂', sub: 'acknowledged', onClick: () => goTo('notices', 'open') },
//     { label: 'Attention Required', value: attentionNoticeCount, color: attentionNoticeCount ? RED : MUT, icon: '⏰', sub: 'due ≤ 5 days or overdue', onClick: () => goTo('notices', 'attention_required') },
//   ];

//   const steps = [
//     { label: 'Legal Services', onClick: () => navigate('/legal-services') },
//     ...(breadcrumbs || []).map((c) => ({ label: c.label, onClick: () => navigate(c.path) })),
//     { label: 'Dashboard' },
//   ];

//   return (
//     <div className="page-container">
//       <Breadcrumb steps={steps} />

//       <PageHeader
//         title={title}
//         subtitle={loading ? 'Loading…' : `${cases.length} case${cases.length !== 1 ? 's' : ''} · ${activeCases} active · ${notices.length} notice${notices.length !== 1 ? 's' : ''}`}
//         right={(
//           <div style={{ display: 'flex', gap: 8 }}>
//             {jobListPath && <button className="btn btn-primary" onClick={() => navigate(jobListPath)}>📋 All Jobs</button>}
//             {/* {canAddNewCase && CaseModal && <button className="btn btn-primary" onClick={() => setModalOpen(true)}>+ New Case</button>} */}
//           </div>
//         )}
//       />

//       <ErrorBanner>{error}</ErrorBanner>

//       <LitSection icon="📄" label="Cases">
//         {caseCards.map((c) => <StatCard key={c.label} {...c} value={loading ? '–' : c.value} />)}
//       </LitSection>

//       <LitSection icon="🔔" label="Notices">
//         {noticeCards.map((c) => <StatCard key={c.label} {...c} value={loading ? '–' : c.value} />)}
//       </LitSection>

//       {loading ? <Loader label="Loading dashboard…" /> : (
//       <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 16 }}>
//         <Panel title="My Pending Tasks" subtitle="Notices waiting for your action" count={pendingNotices.length} countColor={AMB}>
//           <JobSummaryList jobs={pendingNotices} cardConfig={NOTICE_CARD_CONFIG} onJobClick={goToNotice} emptyIcon="✅" emptyText="No pending notices" />
//         </Panel>
//         <Panel title="Attention Required" subtitle="Due in 5 days or overdue" count={attentionNotices.length} countColor={RED} highlight={attentionNotices.length > 0}>
//           <JobSummaryList jobs={attentionNotices} cardConfig={NOTICE_CARD_CONFIG} onJobClick={goToNotice} emptyIcon="✅" emptyText="No urgent notices" />
//         </Panel>
//         <Panel title="Open Jobs" subtitle="All notices acknowledged" count={openNotices.length} countColor={SKY}>
//           <JobSummaryList jobs={openNotices} cardConfig={NOTICE_CARD_CONFIG} onJobClick={goToNotice} emptyIcon="📂" emptyText="No open notices" />
//         </Panel>
//       </div>
//       )}

//       {CaseModal && (
//         <CaseModal
//           open={modalOpen} editCase={null} onClose={() => setModalOpen(false)}
//           onCreated={(created) => { fetchCases(); fetchNotices(); onCreated?.(created); }}
//         />
//       )}
//     </div>
//   );
// }

// // ═══════════════════════════════════════════════════════════════════
// // Litigation Cases / Notices list — grid (JobCard) or list (Table)
// // (formerly LitigationJobListView.js)
// // ═══════════════════════════════════════════════════════════════════
// const LIT_SUBSERVICES = {
//   'income-tax': [
//     'Income Tax Appeal', 'Income Tax Assessment', 'Income Tax Summons', 'Income Tax Tribunal Appeal',
//     'IT Assessment Assignment', 'IT Bank Attachment Withdrawal', 'IT Penalty Notice JC Appeal',
//     'IT Penalty Notice Reply', 'IT Penalty Notice Tribunal', 'OGE Order',
//   ],
//   tds: ['TDS Appeal Tribunal', 'TDS Appeal Assignment', 'TDS Assessment'],
// };

// const LIT_STATUS_OPTIONS = {
//   cases: ['wip', 'attention_required', 'open', 'closed'],
//   notices: ['wip', 'under_review', 'attention_required', 'open'],
// };

// const dateSort = (get) => (a, b) => new Date(get(a) || 0) - new Date(get(b) || 0);

// export function LitigationJobListView({ title, api: caseApi, CaseModal, breadcrumbs, clientPath, caseType, onCreated, emptyMessage }) {
//   const navigate = useNavigate();
//   const { user } = useAuth();
//   const litigationType = litigationTypeOf(caseType);
//   const initialParams = useRef(new URLSearchParams(window.location.search)).current;

//   const [cases, setCases] = useState([]);
//   const [notices, setNotices] = useState([]);
//   const [loading, setLoading] = useState(true);
//   const [error, setError] = useState(null);

//   // Dashboard links here with ?view=cases|notices&status=…
//   const [dataMode, setDataMode] = useState(initialParams.get('view') === 'notices' ? 'notices' : 'cases');
//   const [statusFilter, setStatusFilter] = useState(() => {
//     const st = initialParams.get('status');
//     return st && [...LIT_STATUS_OPTIONS.cases, ...LIT_STATUS_OPTIONS.notices].includes(st) ? st : 'All';
//   });
//   const [viewMode, setViewMode] = useState('grid');
//   const [search, setSearch] = useState('');
//   const [subServiceFilter, setSubServiceFilter] = useState('All');
//   const [pageSize, setPageSize] = useState(25);
//   const [modalOpen, setModalOpen] = useState(false);
//   const [mcCase, setMcCase] = useState(null);

//   const fetchCases = async () => {
//     try {
//       const res = await caseApi.get('');
//       setCases(res.data.results || res.data);
//     } catch {
//       setError(`Failed to load ${title.toLowerCase()}.`);
//     }
//   };

//   const fetchNotices = async () => {
//     try {
//       setNotices(toList(await legalApi.notices.list({ litigation_type: litigationType })));
//     } catch {
//       setError('Failed to load notices.');
//     }
//   };

//   useEffect(() => {
//     Promise.all([fetchCases(), fetchNotices()]).finally(() => setLoading(false));
//     // eslint-disable-next-line react-hooks/exhaustive-deps
//   }, []);

//   // Switching Cases ↔ Notices resets the status filter (they use different statuses),
//   // but the very first render keeps whatever came in from the dashboard link.
//   const firstRender = useRef(true);
//   useEffect(() => {
//     if (firstRender.current) { firstRender.current = false; return; }
//     setStatusFilter('All');
//   }, [dataMode]);

//   const isCases = dataMode === 'cases';
//   const statusOf = isCases ? getCaseStatus : getNoticeEffectiveStatus;
//   const source = isCases ? cases : notices;

//   const subServiceOptions = useMemo(() => {
//     const set = new Set(LIT_SUBSERVICES[litigationType]);
//     [...cases, ...notices].forEach((x) => x.sub_service_name && set.add(x.sub_service_name));
//     return [...set].sort();
//   }, [cases, notices, litigationType]);

//   const filtered = useMemo(() => {
//     const q = search.trim().toLowerCase();
//     const haystack = isCases
//       ? (c) => [c.client_name, c.task_id, c.sub_service_name]
//       : (n) => [n.client_name, n.sub_service_name, n.din_number, n.officer];
//     return source.filter((x) => {
//       if (statusFilter !== 'All' && statusOf(x) !== statusFilter) return false;
//       if (subServiceFilter !== 'All' && x.sub_service_name !== subServiceFilter) return false;
//       if (q && !haystack(x).some((v) => (v || '').toLowerCase().includes(q))) return false;
//       return true;
//     });
//   }, [source, isCases, statusOf, statusFilter, subServiceFilter, search]);

//   const statusCount = (s) => source.filter((x) => statusOf(x) === s).length;

//   const goToCase = (c) => navigate(typeof clientPath === 'function' ? clientPath(c) : `/legal-services/clients/${c.client}`);

//   const goToNotice = (n) => {
//     const clientId = n.client_id || n.court_case?.client_id;
//     if (!clientId) return;
//     const params = new URLSearchParams({ type: litigationType, tab: 'activity', notice: String(n.id) });
//     if (n.job_id) params.set('caseId', String(n.job_id));
//     navigate(`/legal-services/clients/${clientId}?${params.toString()}`);
//   };

//   const canManage = LEGAL_MANAGER_ROLES.includes(user?.role);

//   // ── Table columns (list view) ──
//   const caseColumns = [
//     { key: 'sl', label: '#', width: 48, render: (_, i) => i + 1 },
//     { key: 'client_name', label: 'Client', sortable: true, width: 240, align: 'left' },
//     { key: 'sub_service_name', label: 'Sub-service', sortable: true, width: 200, align: 'left' },
//     { key: 'period', label: 'Period', render: (c) => c.task_period || c.assessment_year || '—' },
//     { key: 'task_id', label: 'Task ID', sortable: true, render: (c) => <span style={{ fontFamily: 'monospace', fontSize: 12 }}>{c.task_id || '—'}</span> },
//     { key: 'team', label: 'Team', render: (c) => <TeamBadges makers={c.makers || []} checkers={c.checkers || []} /> },
//     { key: 'status', label: 'Status', sortable: true, sortFn: (a, b) => getCaseStatus(a).localeCompare(getCaseStatus(b)), render: (c) => <StatusPill status={getCaseStatus(c)} /> },
//     ...(canManage ? [{
//       key: 'actions', label: 'Assign',
//       render: (c) => (
//         <button className="icon-btn icon-btn-primary" title="Assign makers / checkers"
//           onClick={(e) => { e.stopPropagation(); setMcCase(c); }}>👤</button>
//       ),
//     }] : []),
//   ];

//   const noticeColumns = [
//     { key: 'sl', label: '#', width: 48, render: (_, i) => i + 1 },
//     { key: 'client_name', label: 'Client', sortable: true, width: 220, align: 'left' },
//     { key: 'sub_service_name', label: 'Sub-service', sortable: true, width: 180, align: 'left' },
//     { key: 'din_number', label: 'DIN', sortable: true, render: (n) => <span style={{ fontFamily: 'monospace', fontSize: 12 }}>{n.din_number || '—'}</span> },
//     { key: 'officer', label: 'Officer', sortable: true, width: 180, align: 'left' },
//     { key: 'section', label: 'Section' },
//     {
//       key: 'due', label: 'Due', sortable: true, sortFn: dateSort(noticeDueDate),
//       render: (n) => (
//         <span style={{ display: 'inline-flex', gap: 6, alignItems: 'center' }}>
//           {fmtDate(noticeDueDate(n))} <DueChip notice={n} />
//         </span>
//       ),
//     },
//     { key: 'status', label: 'Status', sortable: true, sortFn: (a, b) => getNoticeEffectiveStatus(a).localeCompare(getNoticeEffectiveStatus(b)), render: (n) => <StatusPill status={getNoticeEffectiveStatus(n)} /> },
//   ];

//   const steps = [
//     { label: 'Legal Services', onClick: () => navigate('/legal-services') },
//     ...(breadcrumbs || []).map((c) => ({ label: c.label, onClick: () => navigate(c.path) })),
//     { label: `${title}${statusFilter !== 'All' ? ` — ${CASE_STATUS[statusFilter]?.label}` : ''}` },
//   ];

//   const noun = isCases ? 'case' : 'notice';

//   return (
//     <div className="page-container">
//       <Breadcrumb steps={steps} />

//       <ListHeader title={title} count={source.length} noun={noun} right={(
//         <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
//           <Segmented value={dataMode} onChange={setDataMode} options={[{ key: 'cases', label: '📄 Cases' }, { key: 'notices', label: '🔔 Notices' }]} />
//           <Segmented value={viewMode} onChange={setViewMode} options={[{ key: 'grid', label: '⊞ Grid' }, { key: 'list', label: '≡ List' }]} />
//         </div>
//       )} />

//       <div className="filter-bar">
//         <div className="filter-field">
//           <Select value={statusFilter} onChange={setStatusFilter} options={[
//             { value: 'All', label: `All statuses (${source.length})` },
//             ...LIT_STATUS_OPTIONS[dataMode].map((s) => ({ value: s, label: `${CASE_STATUS[s].label} (${statusCount(s)})` })),
//           ]} />
//         </div>
//         <div className="filter-field">
//           <Select value={subServiceFilter} onChange={setSubServiceFilter} showSearch options={[
//             { value: 'All', label: 'All sub-services' },
//             ...subServiceOptions.map((s) => ({ value: s, label: s })),
//           ]} />
//         </div>
//         <div className="filter-field filter-field--grow">
//           <Input
//             allowClear value={search} onChange={(e) => setSearch(e.target.value)} prefix={<span style={{ color: MUT }}>🔍</span>}
//             placeholder={isCases ? 'Search client, task ID, sub-service…' : 'Search client, DIN, officer, sub-service…'}
//           />
//         </div>
//         <span style={{ fontSize: 12, color: MUT, whiteSpace: 'nowrap' }}>{filtered.length} of {source.length}</span>
//         {/* {isCases && canManage && CaseModal && (
//           <button className="btn btn-primary" onClick={() => setModalOpen(true)}>+ New Case</button>
//         )} */}
//       </div>

//       <ErrorBanner>{!loading && error}</ErrorBanner>

//       {loading ? (
//         <Loader label={`Loading ${dataMode}…`} />
//       ) : filtered.length === 0 ? (
//         <EmptyState icon={isCases ? '📂' : '🔔'} text={search || statusFilter !== 'All' || subServiceFilter !== 'All' ? `No ${dataMode} match your filters` : emptyMessage || `No ${dataMode} yet.`} />
//       ) : viewMode === 'grid' ? (
//         <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(268px, 1fr))', gap: 12, alignItems: 'stretch' }}>
//           {filtered.map((item) => isCases ? (
//             <JobCard key={item.id} job={item} cardConfig={CASE_CARD_CONFIG} canAssign={canManage}
//               onOpen={() => goToCase(item)} onAssign={() => setMcCase(item)} />
//           ) : (
//             <JobCard key={item.id} job={item} cardConfig={NOTICE_CARD_CONFIG} onOpen={() => goToNotice(item)} />
//           ))}
//         </div>
//       ) : (
//         <Table
//           columns={isCases ? caseColumns : noticeColumns}
//           rows={filtered}
//           getRowId={(r) => r.id}
//           onRowClick={isCases ? goToCase : goToNotice}
//           getRowClassName={(r) => (!isCases && getNoticeEffectiveStatus(r) === 'attention_required' ? 'row-highlight' : '')}
//           pageSize={pageSize}
//           pageSizeOptions={[25, 50, 100]}
//           onPageSizeChange={setPageSize}
//         />
//       )}

//       {CaseModal && (
//         <CaseModal
//           open={modalOpen} editCase={null} onClose={() => setModalOpen(false)}
//           onCreated={(created) => { fetchCases(); fetchNotices(); onCreated?.(created); }}
//         />
//       )}

//       {mcCase && (
//         <MCModal
//           job={{ id: mcCase.id, makers: mcCase.makers, checkers: mcCase.checkers, client_name: mcCase.client_name, ...(caseType ? { caseType } : {}) }}
//           onClose={() => setMcCase(null)}
//           onAssigned={() => { setMcCase(null); fetchCases(); }}
//         />
//       )}
//     </div>
//   );
// }

// // ═══════════════════════════════════════════════════════════════════
// // Litigation dashboard + job list — config from LITIGATION_TYPES
// // ═══════════════════════════════════════════════════════════════════
// const LITIGATIONS_CRUMB = { label: 'Litigations', path: '/legal-services/litigations' };

// function LitigationDashboardPage({ type }) {
//   const T = LITIGATION_TYPES[type];
//   return (
//     <LitigationDashboard title={T.title} subtitle={T.subtitle} api={T.api} CaseModal={T.CaseModal} caseType={T.caseType}
//       breadcrumbs={[LITIGATIONS_CRUMB]} clientPath={T.clientPath} jobListPath={T.jobListPath} />
//   );
// }

// function LitigationListPage({ type }) {
//   const T = LITIGATION_TYPES[type];
//   return (
//     <LitigationJobListView title={T.title} subtitle={T.listSubtitle} api={T.api} CaseModal={T.CaseModal} caseType={T.caseType}
//       breadcrumbs={[LITIGATIONS_CRUMB, { label: 'Dashboard', path: T.dashboardPath }]} clientPath={T.clientPath} />
//   );
// }

// export const TDSDashboard         = () => <LitigationDashboardPage type="tds" />;
// export const TDSLitigations       = () => <LitigationListPage type="tds" />;
// export const IncomeTaxDashboard   = () => <LitigationDashboardPage type="income-tax" />;
// export const IncomeTaxLitigations = () => <LitigationListPage type="income-tax" />;

// // ═══════════════════════════════════════════════════════════════════
// // MCA dashboard (Company / LLP) — stat cards + 3 panels
// // ═══════════════════════════════════════════════════════════════════
// const MCA_CRUMBS = (navigate) => [
//   { label: 'Legal Services', onClick: () => navigate('/legal-services') },
//   { label: 'MCA', onClick: () => navigate('/legal-services/mca') },
// ];

// // One fetch of this stream's cases, shared by the dashboard and the list.
// function useMcaCases(mainService) {
//   const [cases, setCases] = useState([]);
//   const [loading, setLoading] = useState(true);
//   const [error, setError] = useState(null);
//   const [tick, setTick] = useState(0);
//   useEffect(() => {
//     let alive = true;
//     setLoading(true);
//     mcaApi.cases({ main_service: mainService })
//       .then((res) => { if (alive) { setCases(toList(res)); setError(null); } })
//       .catch((e) => { if (alive) { setCases([]); setError(e?.response?.data?.detail || e?.response?.data?.error || 'Failed to load MCA cases.'); } })
//       .finally(() => { if (alive) setLoading(false); });
//     return () => { alive = false; };
//   }, [mainService, tick]);
//   return { cases, loading, error, reload: () => setTick((t) => t + 1) };
// }

// export function MCADashboard({ mainService = 'company' }) {
//   const S = MCA_SERVICES[mainService];
//   const navigate = useNavigate();
//   const { user } = useAuth();
//   const { cases, loading } = useMcaCases(mainService);

//   // Same "whose turn" rule the main Dashboard uses (isMcaMyTurn).
//   const { pending, open, closed } = useMemo(() => ({
//     pending: cases.filter((c) => isMcaMyTurn(c, user)),
//     open: cases.filter((c) => getMcaStatus(c) === 'open'),
//     closed: cases.filter((c) => getMcaStatus(c) === 'closed'),
//   }), [cases, user]);

//   const count = (s) => cases.filter((c) => getMcaStatus(c) === s).length;
//   const goList = (status) => navigate(status ? `${S.jobListPath}?status=${status}` : S.jobListPath);
//   const openCase = (c) => navigate(S.casePath(c));

//   const cards = [
//     { label: 'Total Cases', value: cases.length, color: P, icon: '📊', onClick: () => goList() },
//     { label: 'WIP', value: count('wip'), color: AMB, icon: '🔄', onClick: () => goList('wip') },
//     { label: 'Under Review', value: count('under_review'), color: PUR, icon: '🔎', onClick: () => goList('under_review') },
//     { label: 'Open', value: count('open'), color: SKY, icon: '📂', onClick: () => goList('open') },
//     { label: 'Closed', value: count('closed'), color: GR, icon: '✅', onClick: () => goList('closed') },
//   ];

//   return (
//     <div className="page-container">
//       <Breadcrumb steps={[...MCA_CRUMBS(navigate), { label: 'Dashboard' }]} />

//       <PageHeader title={S.title} subtitle={S.subtitle}
//         right={<button className="btn btn-primary" onClick={() => goList()}>📋 View All Filings</button>} />

//       {loading ? <Loader label="Loading dashboard…" /> : (
//         <>
//           <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 16, marginBottom: 24 }}>
//             {cards.map((c) => <StatCard key={c.label} {...c} />)}
//           </div>
//           <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 16 }}>
//             <Panel title="My Pending Tasks" subtitle="Filings waiting for your action" count={pending.length} countColor={AMB} height={430}>
//               <JobSummaryList jobs={pending} cardConfig={MCA_CARD_CONFIG} onJobClick={openCase} emptyIcon="🙌" emptyText="No pending filings" />
//             </Panel>
//             <Panel title="Open Cases" subtitle="SRN approved, pending final closure" count={open.length} countColor={SKY} height={430}>
//               <JobSummaryList jobs={open} cardConfig={MCA_CARD_CONFIG} onJobClick={openCase} emptyIcon="📂" emptyText="No open filings" />
//             </Panel>
//             <Panel title="Closed Cases" subtitle="Successfully completed filings" count={closed.length} countColor={GR} height={430}>
//               <JobSummaryList jobs={closed} cardConfig={MCA_CARD_CONFIG} onJobClick={openCase} emptyIcon="✅" emptyText="No closed filings" />
//             </Panel>
//           </div>
//         </>
//       )}
//     </div>
//   );
// }

// // ═══════════════════════════════════════════════════════════════════
// // MCA filings list (Company / LLP) — grid (JobCard) or list (Table)
// // ═══════════════════════════════════════════════════════════════════
// const MCA_STATUSES = ['wip', 'under_review', 'open', 'closed'];
// const PERIOD_LABEL = { All: 'All Types', Annually: 'Annual' };
// const same = (a, b) => (a || '').trim().toLowerCase() === (b || '').trim().toLowerCase();

// // Is this sub-service an LLP one? (main service, category or name says so)
// const isLlpSubService = (s) => {
//   const jc = (s.job_category || '').toLowerCase();
//   return (s.main_service_name || '').toUpperCase().includes('LLP') || jc === 'mca-llp' || (s.name || '').toUpperCase().includes('LLP');
// };

// export function MCAJobListView({ mainService = 'company' }) {
//   const S = MCA_SERVICES[mainService];
//   const navigate = useNavigate();
//   const { user } = useAuth();
//   const [searchParams] = useSearchParams();
//   const { cases, loading, error, reload } = useMcaCases(mainService);

//   const [subServices, setSubServices] = useState([]);
//   const [mcCase, setMcCase] = useState(null);
//   const [statusFilter, setStatusFilter] = useState(() => searchParams.get('status') || 'All');
//   const [search, setSearch] = useState('');
//   const [subServiceFilter, setSubServiceFilter] = useState('All');
//   const [periodFilter, setPeriodFilter] = useState('All');
//   const [viewMode, setViewMode] = useState('grid');
//   const [pageSize, setPageSize] = useState(25);

//   useEffect(() => {
//     api.get('/clients/subservices/')
//       .then((res) => setSubServices(toList(res).filter((s) => (s.job_category || '').toLowerCase().startsWith('mca'))))
//       .catch(() => {});
//   }, []);

//   // Sub-service dropdown: only this stream's (Company excludes LLP ones) and the chosen period.
//   const subServiceOptions = useMemo(() => {
//     const names = subServices
//       .filter((s) => (mainService === 'llp' ? isLlpSubService(s) : !isLlpSubService(s)))
//       .filter((s) => periodFilter === 'All' || same(s.period, periodFilter))
//       .map((s) => s.name);
//     return [...new Set(names)].sort();
//   }, [subServices, mainService, periodFilter]);

//   const filtered = useMemo(() => {
//     const q = search.trim().toLowerCase();
//     return cases.filter((c) => {
//       if (statusFilter !== 'All' && getMcaStatus(c) !== statusFilter) return false;
//       if (subServiceFilter !== 'All' && c.sub_service_name !== subServiceFilter) return false;
//       if (periodFilter !== 'All' && !same(c.sub_service_period, periodFilter)) return false;
//       if (q && ![c.client_name, c.task_id, c.sub_service_name, c.reference_no].some((v) => (v || '').toLowerCase().includes(q))) return false;
//       return true;
//     });
//   }, [cases, statusFilter, subServiceFilter, periodFilter, search]);

//   const canAssign = LEGAL_MANAGER_ROLES.includes(user?.role);
//   const openCase = (c) => navigate(S.casePath(c));
//   const statusCount = (s) => cases.filter((c) => getMcaStatus(c) === s).length;
//   const filtersActive = search || statusFilter !== 'All' || subServiceFilter !== 'All' || periodFilter !== 'All';

//   const columns = [
//     { key: 'sl', label: '#', width: 48, render: (_, i) => i + 1 },
//     { key: 'client_name', label: 'Client', sortable: true, width: 240, align: 'left' },
//     { key: 'sub_service_name', label: 'Sub-service', sortable: true, width: 200, align: 'left' },
//     { key: 'period', label: 'Period', render: (c) => c.task_period || c.financial_year || c.period || '—' },
//     { key: 'task_id', label: 'Task ID', sortable: true, render: (c) => <span style={{ fontFamily: 'monospace', fontSize: 12 }}>{c.task_id || '—'}</span> },
//     { key: 'team', label: 'Team', render: (c) => <TeamBadges makers={c.makers || []} checkers={c.checkers || []} /> },
//     {
//       key: 'status', label: 'Status', sortable: true, sortFn: (a, b) => getMcaStatus(a).localeCompare(getMcaStatus(b)),
//       render: (c) => <span style={{ display: 'inline-flex', gap: 6 }}><StatusPill status={getMcaStatus(c)} />{isMcaOverdue(c) && <span className="status-pill danger">Overdue</span>}</span>,
//     },
//     ...(canAssign ? [{
//       key: 'assign', label: 'Assign',
//       render: (c) => <button className="icon-btn icon-btn-primary" title="Assign makers / checkers" onClick={(e) => { e.stopPropagation(); setMcCase(c); }}>👤</button>,
//     }] : []),
//   ];

//   return (
//     <div className="page-container">
//       <Breadcrumb steps={[...MCA_CRUMBS(navigate), { label: 'Dashboard', onClick: () => navigate(S.dashboardPath) }, { label: S.label }]} />

//       <ListHeader title={S.listTitle} count={filtered.length} noun="case" subtitle={S.listSubtitle} right={(
//         <Segmented
//           value={periodFilter}
//           onChange={(p) => { setPeriodFilter(p); setSubServiceFilter('All'); }}
//           options={S.periods.map((p) => ({ key: p, label: PERIOD_LABEL[p] || p }))}
//         />
//       )} />

//       <div className="filter-bar">
//         <div className="filter-field">
//           <Select value={statusFilter} onChange={setStatusFilter} options={[
//             { value: 'All', label: `All statuses (${cases.length})` },
//             ...MCA_STATUSES.map((s) => ({ value: s, label: `${CASE_STATUS[s].label} (${statusCount(s)})` })),
//           ]} />
//         </div>
//         <div className="filter-field">
//           <Select value={subServiceFilter} onChange={setSubServiceFilter} showSearch
//             options={[{ value: 'All', label: 'All sub-services' }, ...subServiceOptions.map((s) => ({ value: s, label: s }))]} />
//         </div>
//         <div className="filter-field filter-field--grow">
//           <Input allowClear value={search} onChange={(e) => setSearch(e.target.value)} prefix={<span style={{ color: MUT }}>🔍</span>}
//             placeholder="Search client, task ID, sub-service…" />
//         </div>
//         <Segmented value={viewMode} onChange={setViewMode} options={[{ key: 'grid', label: '⊞ Grid' }, { key: 'list', label: '≡ List' }]} />
//       </div>

//       <ErrorBanner>{!loading && error}</ErrorBanner>

//       {loading ? <Loader label="Loading cases…" />
//         : error ? null
//         : filtered.length === 0 ? (
//           <EmptyState icon="📂" text={filtersActive ? 'No cases match your filters' : 'No cases yet. Create an STT task under this stream to see jobs here.'} />
//         ) : viewMode === 'grid' ? (
//           <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(268px, 1fr))', gap: 12, alignItems: 'stretch' }}>
//             {filtered.map((c) => (
//               <JobCard key={c.id} job={c} cardConfig={MCA_CARD_CONFIG} canAssign={canAssign} onOpen={() => openCase(c)} onAssign={() => setMcCase(c)} />
//             ))}
//           </div>
//         ) : (
//           <Table columns={columns} rows={filtered} getRowId={(c) => c.id} onRowClick={openCase}
//             getRowClassName={(c) => (isMcaOverdue(c) ? 'row-highlight' : '')}
//             pageSize={pageSize} pageSizeOptions={[25, 50, 100]} onPageSizeChange={setPageSize} />
//         )}

//       {mcCase && (
//         <MCModal
//           job={{ id: mcCase.id, makers: mcCase.makers, checkers: mcCase.checkers, client_name: mcCase.client_name, caseType: 'mca-cases' }}
//           onClose={() => setMcCase(null)}
//           onAssigned={() => { setMcCase(null); reload(); }}
//         />
//       )}
//     </div>
//   );
// }

// // Route pages — Company / LLP share the same components.
// export const MCACompanyDashboard   = () => <MCADashboard mainService="company" />;
// export const MCALLPDashboard       = () => <MCADashboard mainService="llp" />;
// export const MCACompanyJobListView = () => <MCAJobListView mainService="company" />;
// export const MCALLPJobListView     = () => <MCAJobListView mainService="llp" />;