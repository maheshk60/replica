
// MCADashboard.js — Company / LLP dashboard (stat cards + 3 panels).
// Now filters data dynamically if a specific sub-service is chosen.

import { useState, useEffect, useMemo } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../../../contexts/AuthContext';
import {
  Breadcrumb, JobSummaryList, StatCard, Panel, EmptyState, toList, P, AMB, PUR, GR, MUT,
} from '../../IncomeTaxPage/JobUiCommon';
import { MCA_SERVICES, MCA_CARD_CONFIG, mcaApi, getMcaStatus, isMcaMyTurn, SKY } from '../LegalModals';

export default function MCADashboard({ mainService = 'company' }) {
  const S = MCA_SERVICES[mainService];
  const navigate = useNavigate();
  const { user } = useAuth();
  const [searchParams] = useSearchParams();
  
  // Extract specific sub-service filter from URL if present
  const subServiceName = searchParams.get('subService');

  const [cases, setCases] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    // Fetch cases, applying backend sub_service_slug filter if present
    mcaApi.cases({ 
      main_service: mainService, 
      ...(subServiceName ? { sub_service_slug: subServiceName } : {}) 
    })
      .then((res) => setCases(toList(res)))
      .catch(() => setCases([]))
      .finally(() => setLoading(false));
  }, [mainService, subServiceName]);

  const { pending, open, closed } = useMemo(() => {
    return {
      pending: cases.filter((c) => isMcaMyTurn(c, user)),
      open: cases.filter((c) => getMcaStatus(c) === 'open'),
      closed: cases.filter((c) => getMcaStatus(c) === 'closed'),
    };
  }, [cases, user]);

  const count = (s) => cases.filter((c) => getMcaStatus(c) === s).length;
  
  // Navigate to Jobs List retaining the subService filter
  const toList_ = (status) => {
    const p = new URLSearchParams();
    if (status) p.set('status', status);
    if (subServiceName) p.set('subService', subServiceName);
    navigate(`${S.jobListPath}?${p.toString()}`);
  };

  const openCase = (c) => {
    const basePath = S.casePath(c);
    const sep = basePath.includes('?') ? '&' : '?';
    navigate(`${basePath}${subServiceName ? `${sep}subService=${encodeURIComponent(subServiceName)}` : ''}`);
  };

  const cards = [
    { label: 'Total Cases', value: cases.length, color: P, icon: '📊', onClick: () => toList_() },
    { label: 'WIP', value: count('wip'), color: AMB, icon: '🔄', onClick: () => toList_('wip') },
    { label: 'Under Review', value: count('under_review'), color: PUR, icon: '🔎', onClick: () => toList_('under_review') },
    { label: 'Open', value: count('open'), color: SKY, icon: '📂', onClick: () => toList_('open') },
    { label: 'Closed', value: count('closed'), color: GR, icon: '✅', onClick: () => toList_('closed') },
  ];

  return (
    <div className="page-container">
      {/* Dashboard Breadcrumb */}
      <Breadcrumb steps={[
        { label: 'Legal Services', onClick: () => navigate('/legal-services') },
        { label: 'MCA', onClick: () => navigate('/legal-services/mca') },
        { label: S.label, onClick: () => navigate(S.dashboardPath) }, // Back to Sub-Service Selector
        { label: 'Dashboard' }, // Just says "Dashboard"
      ]} />

      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 24, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 900, color: '#111827', margin: 0, letterSpacing: '-.03em' }}>
            {subServiceName ? `${subServiceName} Filings` : S.title}
          </h1>
          <p style={{ fontSize: 13, color: MUT, margin: '5px 0 0' }}>{S.subtitle}</p>
        </div>
        <button className="btn btn-primary" onClick={() => toList_()}>📋 View All Filings</button>
      </div>

      {loading ? <EmptyState icon="⏳" text="Loading dashboard…" /> : (
        <>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 16, marginBottom: 24 }}>
            {cards.map((c) => <StatCard key={c.label} {...c} />)}
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 16 }}>
            <Panel title="My Pending Tasks" subtitle="Filings waiting for your action" count={pending.length} countColor={AMB} height={430}>
              <JobSummaryList jobs={pending} cardConfig={MCA_CARD_CONFIG} onJobClick={openCase} emptyIcon="🙌" emptyText="No pending filings" />
            </Panel>
            <Panel title="Open Cases" subtitle="SRN approved, pending final closure" count={open.length} countColor={SKY} height={430}>
              <JobSummaryList jobs={open} cardConfig={MCA_CARD_CONFIG} onJobClick={openCase} emptyIcon="📂" emptyText="No open filings" />
            </Panel>
            <Panel title="Closed Cases" subtitle="Successfully completed filings" count={closed.length} countColor={GR} height={430}>
              <JobSummaryList jobs={closed} cardConfig={MCA_CARD_CONFIG} onJobClick={openCase} emptyIcon="✅" emptyText="No closed filings" />
            </Panel>
          </div>
        </>
      )}
    </div>
  );
}