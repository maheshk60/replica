
// MCAJobListView.js — Individual Sub-Service filings list: grid (JobCard) or list (shared Table).

import { useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Select, Input } from 'antd';
import { useAuth } from '../../../contexts/AuthContext';
import Table from '../../../components/Table';
import {
  Breadcrumb, JobCard, TeamBadges, EmptyState, ErrorBanner, Segmented, toList, P, PL, BRD, MUT,
} from '../../IncomeTaxPage/JobUiCommon';
import {
  MCA_SERVICES, MCA_CARD_CONFIG, CASE_STATUS, LEGAL_MANAGER_ROLES, StatusPill, MCModal, mcaApi, getMcaStatus, isMcaOverdue,
} from '../LegalModals';

const STATUSES = ['wip', 'under_review', 'open', 'closed'];

export default function MCAJobListView({ mainService = 'company' }) {
  const S = MCA_SERVICES[mainService];
  const navigate = useNavigate();
  const { user } = useAuth();
  const [searchParams] = useSearchParams();

  // The specific sub-service we are viewing (passed from Dashboard)
  const subServiceName = searchParams.get('subService');

  const [cases, setCases] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [mcCase, setMcCase] = useState(null);

  const [statusFilter, setStatusFilter] = useState(() => searchParams.get('status') || 'All');
  const [search, setSearch] = useState('');
  const [viewMode, setViewMode] = useState('grid');
  const [pageSize, setPageSize] = useState(25);

  // Defined as a reusable callback so MCModal can refresh cases on assignment
  const fetchCases = useCallback(() => {
    setLoading(true);
    mcaApi.cases({ main_service: mainService })
      .then((res) => {
        let list = toList(res);
        // Strictly filter to the specific sub-service
        if (subServiceName) {
          list = list.filter((c) => c.sub_service_name === subServiceName);
        }
        setCases(list);
        setError(null);
      })
      .catch((e) => {
        setCases([]);
        setError(e?.response?.data?.detail || e?.response?.data?.error || 'Failed to load MCA cases.');
      })
      .finally(() => setLoading(false));
  }, [mainService, subServiceName]);

  useEffect(() => {
    fetchCases();
  }, [fetchCases]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return cases.filter((c) => {
      if (statusFilter !== 'All' && getMcaStatus(c) !== statusFilter) return false;
      if (q && ![c.client_name, c.task_id, c.sub_service_name, c.reference_no].some((v) => (v || '').toLowerCase().includes(q))) return false;
      return true;
    });
  }, [cases, statusFilter, search]);

  const canAssign = LEGAL_MANAGER_ROLES.includes(user?.role);
  
  // Ensure the workspace link retains the subService in the URL for breadcrumbs
  const openCase = (c) => {
    const basePath = S.casePath(c);
    const sep = basePath.includes('?') ? '&' : '?';
    navigate(`${basePath}${subServiceName ? `${sep}subService=${encodeURIComponent(subServiceName)}` : ''}`);
  };

  const statusCount = (s) => cases.filter((c) => getMcaStatus(c) === s).length;

  const columns = [
    { key: 'sl', label: '#', width: 48, render: (_, i) => i + 1 },
    { key: 'client_name', label: 'Client', sortable: true, width: 240, align: 'left' },
    { key: 'sub_service_name', label: 'Sub-service', sortable: true, width: 200, align: 'left' },
    { key: 'period', label: 'Period', render: (c) => c.task_period || c.financial_year || c.period || '—' },
    { key: 'task_id', label: 'Task ID', sortable: true, render: (c) => <span style={{ fontFamily: 'monospace', fontSize: 12 }}>{c.task_id || '—'}</span> },
    { key: 'team', label: 'Team', render: (c) => <TeamBadges makers={c.makers || []} checkers={c.checkers || []} /> },
    {
      key: 'status', label: 'Status', sortable: true, sortFn: (a, b) => getMcaStatus(a).localeCompare(getMcaStatus(b)),
      render: (c) => <span style={{ display: 'inline-flex', gap: 6 }}><StatusPill status={getMcaStatus(c)} />{isMcaOverdue(c) && <span className="status-pill danger">Overdue</span>}</span>,
    },
    ...(canAssign ? [{
      key: 'assign', label: 'Assign',
      render: (c) => <button className="icon-btn icon-btn-primary" title="Assign makers / checkers" onClick={(e) => { e.stopPropagation(); setMcCase(c); }}>👤</button>,
    }] : []),
  ];

  const filtersActive = search || statusFilter !== 'All';

  return (
    <div className="page-container">
      {/* Job List Breadcrumb */}
      <Breadcrumb steps={[
        { label: 'Legal Services', onClick: () => navigate('/legal-services') },
        { label: 'MCA', onClick: () => navigate('/legal-services/mca') },
        { label: S.label, onClick: () => navigate(S.dashboardPath) },
        { 
          label: 'Dashboard', 
          onClick: () => navigate(`${S.dashboardPath}/dashboard${subServiceName ? `?subService=${encodeURIComponent(subServiceName)}` : ''}`) 
        },
        { label: subServiceName || 'Jobs' },
      ]} />

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4, flexWrap: 'wrap', gap: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <h2 style={{ fontSize: 20, fontWeight: 800, color: '#111827', margin: 0 }}>
            {subServiceName ? `${subServiceName} Filings` : S.listTitle}
          </h2>
          <span style={{ fontSize: 11, fontWeight: 700, padding: '2px 10px', borderRadius: 99, background: PL, color: P, border: `1px solid ${BRD}` }}>
            {filtered.length} case{filtered.length !== 1 ? 's' : ''}
          </span>
        </div>
      </div>
      <div style={{ fontSize: 12, color: MUT, marginBottom: 16 }}>
        {subServiceName ? `Manage all cases under ${subServiceName}` : S.listSubtitle}
      </div>

      <div className="filter-bar">
        <div className="filter-field">
          <Select value={statusFilter} onChange={setStatusFilter} options={[
            { value: 'All', label: `All statuses (${cases.length})` },
            ...STATUSES.map((s) => ({ value: s, label: `${CASE_STATUS[s].label} (${statusCount(s)})` })),
          ]} />
        </div>
        <div className="filter-field filter-field--grow">
          <Input allowClear value={search} onChange={(e) => setSearch(e.target.value)} prefix={<span style={{ color: MUT }}>🔍</span>}
            placeholder="Search client, task ID, reference no…" />
        </div>
        <Segmented value={viewMode} onChange={setViewMode} options={[{ key: 'grid', label: '⊞ Grid' }, { key: 'list', label: '≡ List' }]} />
      </div>

      <ErrorBanner>{!loading && error}</ErrorBanner>

      {loading ? <EmptyState icon="⏳" text="Loading cases…" />
        : error ? null
        : filtered.length === 0 ? (
          <EmptyState icon="📂" text={filtersActive ? 'No cases match your filters' : 'No cases yet for this specific form.'} />
        ) : viewMode === 'grid' ? (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(268px, 1fr))', gap: 12, alignItems: 'stretch' }}>
            {filtered.map((c) => (
              <JobCard key={c.id} job={c} cardConfig={MCA_CARD_CONFIG} canAssign={canAssign} onOpen={() => openCase(c)} onAssign={() => setMcCase(c)} />
            ))}
          </div>
        ) : (
          <Table columns={columns} rows={filtered} getRowId={(c) => c.id} onRowClick={openCase}
            getRowClassName={(c) => (isMcaOverdue(c) ? 'row-highlight' : '')}
            pageSize={pageSize} pageSizeOptions={[25, 50, 100]} onPageSizeChange={setPageSize} />
        )}

      {mcCase && (
        <MCModal
          job={{ id: mcCase.id, makers: mcCase.makers, checkers: mcCase.checkers, client_name: mcCase.client_name, caseType: 'mca-cases' }}
          onClose={() => setMcCase(null)}
          onAssigned={() => { setMcCase(null); fetchCases(); }}
        />
      )}
    </div>
  );
}