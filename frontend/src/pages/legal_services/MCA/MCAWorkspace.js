import React, { useEffect, useRef, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { api } from '../../../services/api';
import { useAuth } from '../../../contexts/AuthContext';
import { MCModal } from '../MCModal';
import MCAActivityTab from './MCAActivityTab';
import MCAReviewTab from './MCAReviewTab';
import MCAAuditTrailTab from './MCAAuditTrailTab';


// ══════════════════════════════════════════════════════════════════════
// GLOBAL INLINE STYLES (Identical to LegalWorkSpace)
// ══════════════════════════════════════════════════════════════════════
const GLOBAL_CSS = `
@keyframes cdvPageIn { from { opacity: 0; transform: translateY(6px); } to { opacity: 1; transform: translateY(0); } }
@keyframes cdvPanelIn { from { opacity: 0; transform: translateY(4px); } to { opacity: 1; transform: translateY(0); } }
@keyframes cdvShimmer { 100% { transform: translateX(280%); } }
@keyframes cdvFadeIn { from { opacity: 0; } to { opacity: 1; } }
@keyframes cdvSlideUp { from { opacity: 0; transform: translateY(30px) scale(0.95); } to { opacity: 1; transform: translateY(0) scale(1); } }
@keyframes cdvSpin { to { transform: rotate(360deg); } }

.cdv-hover-row:hover { background: #f8f9ff; }
.cdv-input-focus:focus { outline: none; border-color: #1A2F5A !important; box-shadow: 0 0 0 2px rgba(26,47,90,0.1); }
.cdv-tab-btn { position: relative; transition: all 0.2s ease; }
.cdv-tab-btn:hover { color: #1a1a2e; }

.cdv-skeleton { overflow: hidden; border-radius: 14px; background: #e9edf3; position: relative; }
.cdv-skeleton::after {
  content: ''; display: block; width: 45%; height: 100%; transform: translateX(-120%);
  background: linear-gradient(90deg, transparent, rgba(255,255,255,0.6), transparent);
  animation: cdvShimmer 1.3s infinite;
}
.client-field-label { font-size: 11px; font-weight: 700; color: #7A7F99; text-transform: uppercase; letter-spacing: 0.05em; display: flex; align-items: center; }
.client-field-value { font-size: 13px; font-weight: 600; color: #1C1E2E; word-break: break-word; }
.client-field-empty { font-size: 13px; font-weight: 400; color: #C2C8D2; font-style: italic; }
`;

// ── CONSTANTS ──
const FIELD_LABELS = [
  ['email', 'Email'], ['phone', 'Phone'], ['contact_person', 'Contact Person'],
  ['nature_of_business', 'Nature of Business'], ['constitution_display', 'Constitution'],
  ['group_name', 'Client Group'], ['address', 'Address'],
];

const STATUS_META = {
  wip:          { label: 'WIP',          color: '#f59e0b', bg: '#FEF3C7' },
  under_review: { label: 'Under Review', color: '#6D28D9', bg: '#F1E8FE' },
  closed:       { label: 'Closed',       color: '#10b981', bg: '#D1FAE5' },
};

const TASK_STATUS_META = {
  'To Do':       { label: 'TO DO',        bg: '#ecfdf3', color: '#027a48' },
  'In Progress': { label: 'IN PROGRESS',  bg: '#eff6ff', color: '#1d4ed8' },
  'Done':        { label: 'DONE',         bg: '#f3f4f6', color: '#374151' },
  'Over Due':    { label: 'OVER DUE',     bg: '#fef2f2', color: '#dc2626' },
};

function fmtDate(d) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}

function fmtDateTime(value) {
  if (!value) return '—';
  return new Date(value).toLocaleString('en-IN', {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

function getFYandAY() {
  const today = new Date();
  const month = today.getMonth() + 1;
  const year = today.getFullYear();
  let fyStart, fyEnd;
  if (month >= 4) { fyStart = year; fyEnd = year + 1; }
  else { fyStart = year - 1; fyEnd = year; }
  const fy = `FY ${fyStart}-${String(fyEnd).slice(-2)}`;
  const ay = `AY ${fyEnd}-${String(fyEnd + 1).slice(-2)}`;
  return { fy, ay };
}

// ══════════════════════════════════════════════════════════════════════
// STYLE OBJECTS (Shared with LegalWorkSpace)
// ══════════════════════════════════════════════════════════════════════
const S = {
  container: { padding: '2px 14px 32px', minHeight: '100%', boxSizing: 'border-box', background: '#f8f9fc' },
  content: { animation: 'cdvPageIn 0.3s ease both' },

  clientHeader: {
    background: '#ffffff',
    border: '1px solid #eef0f5',
    borderRadius: 14,
    marginBottom: 16,
    boxShadow: '0 2px 8px rgba(20,20,40,0.05)',
    overflow: 'hidden',
  },

  tabsBar: {
    display: 'flex',
    alignItems: 'center',
    gap: 2,
    borderTop: '1px solid #f0f2f6',
    padding: '0 12px',
    background: '#fbfcfd',
  },
  tabBtn: (active) => ({
    display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 6,
    padding: '11px 18px', border: 'none',
    borderBottom: `2px solid ${active ? '#214274' : 'transparent'}`,
    borderRadius: 0, background: 'transparent',
    color: active ? '#1a1a2e' : '#6b7280',
    fontSize: 12.5, fontWeight: active ? 700 : 600,
    cursor: 'pointer', whiteSpace: 'nowrap',
  }),
  tabCount: (active) => ({
    display: 'inline-grid', placeItems: 'center', minWidth: 18, height: 18,
    padding: '0 5px', borderRadius: 999,
    background: active ? '#214274' : '#e5e7eb',
    color: active ? '#fff' : '#4b5563',
    fontSize: 9.5, fontWeight: 700,
  }),
  tabContent: { animation: 'cdvPanelIn 0.2s ease both' },

  state: { padding: 40, textAlign: 'center', color: '#6b7280', fontSize: 14.5, background: '#ffffff', borderRadius: 14, border: '1px solid #eef0f5' },
  error: { padding: 40, textAlign: 'center', fontSize: 14.5, background: '#fef2f2', borderRadius: 14, border: '1px solid #fecaca', color: '#dc2626' },
  empty: { display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '60px 20px', background: '#ffffff', borderRadius: 14, border: '1px solid #eef0f5', color: '#6b7280', fontSize: 14.5, boxShadow: '0 2px 8px rgba(20,20,40,0.05)' },
  emptyIcon: { fontSize: 40, marginBottom: 12, opacity: 0.7 },

  loading: { display: 'grid', gap: 14 },
  skelCrumb: { height: 18, width: 220 },
  skelHeader: { height: 68 },
  skelCard: { height: 300 },
};

export default function MCAWorkspace() {
  const { clientId } = useParams();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user } = useAuth();

  const isInvalidClient = !clientId || clientId === 'undefined' || clientId === 'null';
  const caseId = searchParams.get('caseId');

  const [client, setClient] = useState(null);
  const [caseData, setCaseData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [teamLoading, setTeamLoading] = useState(false);

  const [activeTab, setActiveTab] = useState(() => {
    return searchParams.get('tab') || 'details';
  });

  const [refreshTick, setRefreshTick] = useState(0);
  const bumpRefresh = () => setRefreshTick((t) => t + 1);

  // Sync Tab with URL
  useEffect(() => {
    const params = new URLSearchParams(searchParams);
    params.set('tab', activeTab);
    const newSearch = params.toString();
    const newUrl = `${window.location.pathname}${newSearch ? '?' + newSearch : ''}`;
    window.history.replaceState(null, '', newUrl);
    // eslint-disable-next-line
  }, [activeTab]);

  const [constitutions, setConstitutions] = useState([]);
  useEffect(() => {
    api.get('/clients/constitutions/')
      .then((res) => setConstitutions(res.data.results || res.data || []))
      .catch(() => setConstitutions([]));
  }, []);

  // Fetch Client
  useEffect(() => {
    if (isInvalidClient) return;

    let active = true;
    setLoading(true);
    setError(null);

    api.get(`/legal-services/client/${clientId}/`)
      .then((res) => {
        if (active) setClient(res.data);
      })
      .catch(() => {
        if (!active) return;
        api.get(`/clients/clients/${clientId}/`)
          .then((res) => { if (active) setClient(res.data); })
          .catch(() => { if (active) setError('Failed to load client details.'); });
      })
      .finally(() => { if (active) setLoading(false); });

    return () => { active = false; };
  }, [clientId]);

  // Fetch MCA Case Data
  useEffect(() => {
    if (isInvalidClient || !clientId) return;
    setTeamLoading(true);

    const fetchUrl = caseId
      ? `/legal-services/mca-cases/${caseId}/`
      : `/legal-services/mca-cases/?client=${clientId}`;

    api.get(fetchUrl)
      .then((res) => {
        if (caseId) {
          const c = res.data;
          setCaseData({
            ...c,
            makers: c.makers || [],
            checkers: c.checkers || [],
          });
        } else {
          const cases = Array.isArray(res.data) ? res.data : (res.data.results || []);
          if (cases && cases.length > 0) {
            setCaseData({
              ...cases[0],
              makers: cases[0].makers || [],
              checkers: cases[0].checkers || [],
            });
          } else {
            setCaseData(null);
          }
        }
      })
      .catch(() => setCaseData(null))
      .finally(() => setTeamLoading(false));
  }, [clientId, caseId, refreshTick]);

  // ── Client Info Editing Logic (Exact same as LegalWorkSpace) ──
  const [editingInfo, setEditingInfo] = useState(false);
  const [infoForm, setInfoForm] = useState(null);
  const [infoSaving, setInfoSaving] = useState(false);
  const [infoSaveError, setInfoSaveError] = useState(null);

  const canEditClientInfo = (caseData?.makers || []).some((m) => m.id === user?.id);

  const startEditInfo = () => {
    setInfoForm({
      name: client.name || '', email: client.email || '', phone: client.phone || '',
      address: client.address || '', nature_of_business: client.nature_of_business || '',
      contact_person: client.contact_person || '', constitution: client.constitution || '',
      cin: client.cin || '', pan: client.pan || '', gstin: client.gstin || '',
      iec: client.iec || '', ksea: client.ksea || '', udyam: client.udyam || '',
      apt: client.apt || '', ept: client.ept || '', tan: client.tan || '', lei: client.lei || '',
    });
    setInfoSaveError(null);
    setEditingInfo(true);
  };

  const handleInfoFormChange = (e) => {
    const { name, value } = e.target;
    setInfoForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleInfoSave = async () => {
    setInfoSaving(true);
    setInfoSaveError(null);
    try {
      await api.patch(
        `/clients/clients/${clientId}/`,
        infoForm,
        {
          headers: {
            'X-Litigation-Type': 'mca',
            'X-Job-Id': caseData?.id?.toString() || '',
          },
        }
      );

      const freshRes = await api.get(`/legal-services/client/${clientId}/`);
      setClient(freshRes.data);

      setEditingInfo(false);
      bumpRefresh();
    } catch (err) {
      setInfoSaveError(
        err.response?.data
          ? JSON.stringify(err.response.data)
          : 'Failed to save changes.'
      );
    } finally {
      setInfoSaving(false);
    }
  };

  if (isInvalidClient) {
    return (
      <div style={{ padding: '60px 20px', textAlign: 'center', fontFamily: 'inherit', background: '#f8f9fc', minHeight: '100vh' }}>
        <h2 style={{ color: '#dc2626', marginBottom: 8 }}>Invalid MCA Case Link</h2>
        <p style={{ color: '#6b7280', marginBottom: 20 }}>We couldn&apos;t find valid client details for this link.</p>
        <button 
          onClick={() => navigate('/legal-services/mca/aoc-4/jobs')}
          style={{ padding: '10px 20px', background: '#1A2F5A', color: 'white', border: 'none', borderRadius: 8, cursor: 'pointer', fontWeight: 600 }}
        >
          Return to MCA Filings
        </button>
      </div>
    );
  }

  if (loading) return (
    <div style={S.container}>
      <style>{GLOBAL_CSS}</style>
      <div style={S.loading}>
        <div className="cdv-skeleton" style={S.skelCrumb} />
        <div className="cdv-skeleton" style={S.skelHeader} />
        <div className="cdv-skeleton" style={S.skelCard} />
      </div>
    </div>
  );
  if (error) return <div style={S.container}><style>{GLOBAL_CSS}</style><div style={S.error}>{error}</div></div>;
  if (!client) return <div style={S.container}><style>{GLOBAL_CSS}</style><div style={S.state}>No client data found</div></div>;

  const { fy, ay } = getFYandAY();
  const activityStatus = caseData?.computed_status || caseData?.status || 'wip';
  const statusMeta = STATUS_META[activityStatus] || STATUS_META.wip;

  const constitutionDisplay = (() => {
    if (client.constitution_name) return client.constitution_name;
    if (client.constitution) {
      const found = constitutions.find(
        (x) => x.id === client.constitution || x.id === Number(client.constitution)
      );
      return found ? found.name : '';
    }
    return '';
  })();

  const clientDisplay = { ...client, constitution_display: constitutionDisplay };
  const linkedTask = caseData?.linked_task || null;

  
  return (
    <main style={S.container}>
      <style>{GLOBAL_CSS}</style>
      <div style={S.content}>
        
        {/* Breadcrumb: Legal Services › MCA › Dashboard › Company Services (or LLP Services) › Client Name */}
        {(() => {
          const isLLP =
            window.location.pathname.includes('/mca/llp/') ||
            caseData?.service_group === 'llp' ||
            (caseData?.main_service_name || '').toUpperCase().includes('LLP');

          const dashPath = isLLP ? '/legal-services/mca/llp' : '/legal-services/mca/company';
          const jobsPath = `${dashPath}/jobs`;
          const streamLabel = isLLP ? 'LLP Services' : 'Company Services';

          return (
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 10, flexWrap: 'wrap' }}>
              <span style={{ fontSize: 13, color: '#7A7F99', cursor: 'pointer' }} onClick={() => navigate('/legal-services')}>
                Legal Services
              </span>
              <span style={{ color: '#d1d5db', fontSize: 11 }}>›</span>

              <span style={{ fontSize: 13, color: '#7A7F99', cursor: 'pointer' }} onClick={() => navigate('/legal-services/mca')}>
                MCA
              </span>
              <span style={{ color: '#d1d5db', fontSize: 11 }}>›</span>

              <span style={{ fontSize: 13, color: '#7A7F99', cursor: 'pointer' }} onClick={() => navigate(dashPath)}>
                Dashboard
              </span>
              <span style={{ color: '#d1d5db', fontSize: 11 }}>›</span>

              <span style={{ fontSize: 13, color: '#7A7F99', cursor: 'pointer' }} onClick={() => navigate(jobsPath)}>
                {streamLabel}
              </span>
              <span style={{ color: '#d1d5db', fontSize: 11 }}>›</span>

              <span style={{ fontSize: 13, fontWeight: 700, color: '#1C1E2E' }}>
                {client?.name}
              </span>
            </div>
          );
        })()}


        {/* ══════════ CLIENT HEADER ══════════ */}
        <section style={S.clientHeader}>
          <div style={{ padding: '14px 20px 12px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
              <h1 style={{
                margin: 0, color: '#1a1a2e', fontSize: 19, fontWeight: 800,
                letterSpacing: '-0.01em', lineHeight: 1.2,
              }} title={client.name}>
                {client.name}
              </h1>

              <span style={{
                display: 'inline-flex', alignItems: 'center', gap: 5,
                fontSize: 10, fontWeight: 700, padding: '3px 10px', borderRadius: 99,
                background: statusMeta.bg, color: statusMeta.color,
                textTransform: 'uppercase', letterSpacing: '.04em',
                border: `1px solid ${statusMeta.color}35`,
              }}>
                {statusMeta.label}
              </span>

              {caseData?.sub_service_name && (
                <span style={{
                  marginLeft: 'auto', fontSize: 11, fontWeight: 600, color: '#214274',
                  background: '#EEF3FC', border: '1px solid #C5D5EF',
                  padding: '3px 10px', borderRadius: 6,
                }}>
                  📄 {caseData.sub_service_name}
                </span>
              )}
            </div>

            <div style={{ fontSize: 11, color: '#7A7F99', marginTop: 3, display: 'flex', gap: 10, flexWrap: 'wrap' }}>
              <span>{fy}</span>
              <span>{ay}</span>
              {(caseData?.task_id_display || caseData?.task_id) && (
                <span>{caseData.task_id_display || caseData.task_id}</span>
              )}
              {caseData?.financial_year && <span>FY: {caseData.financial_year}</span>}
            </div>
          </div>

          <nav style={S.tabsBar}>
            {[
              { key: 'details', label: 'Client Details', icon: '👤' },
              { key: 'activity', label: 'Activity', icon: '⚖️' },
              { key: 'review', label: 'Review', icon: '🔍' },
              { key: 'team', label: 'Team', icon: '👥' },
              { key: 'audit', label: 'Audit Trail', icon: '🕐' },
            ].map((tab) => (
              <button
                key={tab.key}
                className="cdv-tab-btn"
                style={S.tabBtn(activeTab === tab.key)}
                onClick={() => setActiveTab(tab.key)}
              >
                <span style={{ fontSize: 12 }}>{tab.icon}</span>
                {tab.label}
              </button>
            ))}
          </nav>
        </section>

        {/* ══════════ TAB CONTENT ══════════ */}
        <section style={S.tabContent}>

          {/* 1. DETAILS TAB */}
          {activeTab === 'details' && (
            <div style={{ padding: 18, background: '#F8F9FB', fontFamily: 'inherit' }}>
              {infoSaveError && (
                <div style={{ background: '#FEF2F2', borderLeft: '3px solid #C62828', borderRadius: '0 8px 8px 0', padding: '10px 14px', fontSize: 12, color: '#C62828', marginBottom: 16 }}>
                  ⚠️ {infoSaveError}
                </div>
              )}

              {/* ── Summary Stats Row ── */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 20 }}>
                {[
                  { label: 'Task ID', value: caseData?.task_id_display || caseData?.task_id, mono: true },
                  { label: 'Period', value: caseData?.task_period || caseData?.financial_year || caseData?.period },
                  { label: 'Sub-Service', value: caseData?.sub_service_name },
                  { label: 'Due Date', value: fmtDate(caseData?.due_date) },
                ].map((s) => (
                  <div key={s.label} style={{ background: '#fff', border: '1px solid #E8EAF0', borderRadius: 10, padding: '12px 16px' }}>
                    <div style={{ fontSize: 11, color: '#7A7F99', marginBottom: 3 }}>{s.label}</div>
                    <div style={{ fontSize: 14, fontWeight: 700, color: '#1A2F5A', fontFamily: s.mono ? 'monospace' : 'inherit' }}>
                      {s.value || '—'}
                    </div>
                  </div>
                ))}
              </div>

              {/* ── Info Banner ── */}
              <div style={{ background: '#EEF3FC', borderLeft: '3px solid #1A2F5A', borderRadius: '0 8px 8px 0', padding: '10px 14px', fontSize: 12, color: '#1A2F5A', marginBottom: 16, fontWeight: 500 }}>
                ℹ️ {canEditClientInfo ? 'Auto-filled from client master. Edit to update.' : 'Read-only, Assigned Maker can edit.'}
              </div>

              {/* ── Client Information Card ── */}
              <div style={{ background: '#fff', border: '1px solid #E8EAF0', borderRadius: 12, marginBottom: 16, overflow: 'hidden' }}>
                <div style={{ padding: '10px 18px', borderBottom: '1px solid #E8EAF0', background: '#F2F4F8', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: 12, fontWeight: 700, color: '#1C1E2E', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                    Client Information
                  </span>
                  {canEditClientInfo && !editingInfo && (
                    <button onClick={startEditInfo} style={{ background: 'transparent', border: '1.5px solid #1A2F5A', color: '#1A2F5A', padding: '4px 12px', borderRadius: 6, fontSize: 11, fontWeight: 700, cursor: 'pointer' }}>
                      ✏ Edit
                    </button>
                  )}
                </div>

                <div style={{ padding: 20 }}>
                  <div style={{ display: 'grid', gridTemplateColumns: '160px 1fr 160px 1fr', gap: '14px 24px' }}>
                    {FIELD_LABELS.map(([key, label]) => {
                      const value = clientDisplay[key];
                      const isEmpty = !value || value === '—';
                      const isAddress = key === 'address';
                      const isMono = ['pan', 'gstin', 'tan', 'cin', 'iec', 'lei', 'ksea', 'udyam', 'apt', 'ept'].includes(key);

                      return (
                        <React.Fragment key={key}>
                          <div className="client-field-label" style={{ paddingTop: editingInfo ? 8 : 0 }}>{label}</div>
                          <div style={{ gridColumn: isAddress ? 'span 3' : 'span 1' }}>
                            {editingInfo ? (
                              isAddress ? (
                                <textarea name={key} value={infoForm[key] || ''} onChange={handleInfoFormChange} rows={2} className="cdv-input-focus" style={{ width: '100%', padding: '8px 12px', borderRadius: 8, border: '1px solid #E8EAF0', fontSize: 13, fontFamily: 'inherit', resize: 'vertical', boxSizing: 'border-box' }} />
                              ) : (
                                <input name={key} value={infoForm[key] || ''} onChange={handleInfoFormChange} className="cdv-input-focus" style={{ width: '100%', padding: '8px 12px', borderRadius: 8, border: '1px solid #E8EAF0', fontSize: 13, fontFamily: isMono ? 'monospace' : 'inherit', boxSizing: 'border-box' }} />
                              )
                            ) : (
                              <div className={isEmpty ? 'client-field-empty' : 'client-field-value'} style={{ fontFamily: isMono ? 'monospace' : 'inherit', whiteSpace: isAddress ? 'pre-wrap' : 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                {value || '—'}
                              </div>
                            )}
                          </div>
                        </React.Fragment>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* ── Edit Actions ── */}
              {editingInfo && (
                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 20 }}>
                  <button onClick={() => setEditingInfo(false)} style={{ padding: '8px 20px', borderRadius: 8, border: '1px solid #E8EAF0', background: '#fff', color: '#7A7F99', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
                    Cancel
                  </button>
                  <button onClick={handleInfoSave} disabled={infoSaving} style={{ padding: '8px 20px', borderRadius: 8, border: 'none', background: '#1A2F5A', color: '#fff', fontSize: 13, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8 }}>
                    {infoSaving && <span style={{ width: 12, height: 12, border: '2px solid rgba(255,255,255,0.3)', borderTopColor: '#fff', borderRadius: '50%', animation: 'cdvSpin 0.6s linear infinite' }} />}
                    {infoSaving ? 'Saving...' : 'Save & Continue →'}
                  </button>
                </div>
              )}
            </div>
          )}

          

          {/* 3. ACTIVITY TAB (Ready for MCA Activity Workflow) */}
          {activeTab === 'activity' && (
            <MCAActivityTab
              caseData={caseData}
              filing={caseData?.filings?.[0] || null}
              user={user}
              onUpdated={bumpRefresh}
            />
          )}

          {/* 4. REVIEW TAB (Ready for MCA Review Workflow) */}
          {activeTab === 'review' && (
            <MCAReviewTab
              mcaCase={caseData}
              refreshTick={refreshTick}
              onUpdated={bumpRefresh}
            />
          )}

          {/* 5. TEAM TAB (Identical to LegalWorkSpace) */}
          {activeTab === 'team' && (
            <div>
              {teamLoading ? (
                <div style={S.state}>Loading team information...</div>
              ) : caseData ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

                  {/* Assigned Team Card */}
                  <div style={{
                    background: '#fff',
                    border: '1px solid #e9edf4',
                    borderRadius: 14,
                    overflow: 'hidden',
                    boxShadow: '0 2px 8px rgba(20,20,40,0.05)',
                  }}>
                    <div style={{
                      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                      padding: '14px 20px',
                      background: 'linear-gradient(90deg, #f5f7fb, #eef2ff)',
                      borderBottom: '1px solid #e9edf4',
                    }}>
                      <div>
                        <div style={{ fontSize: 14, fontWeight: 800, color: '#1a1a2e', letterSpacing: '-0.01em' }}>
                          Assigned Team
                        </div>
                        <div style={{ fontSize: 11, color: '#6b7280', marginTop: 1, fontWeight: 500 }}>
                          {(caseData.makers?.length || 0) + (caseData.checkers?.length || 0)} member{((caseData.makers?.length || 0) + (caseData.checkers?.length || 0)) !== 1 ? 's' : ''}
                        </div>
                      </div>
                    </div>

                    <div style={{ padding: '4px 20px 16px' }}>
                      {(() => {
                        const allMembers = [
                          ...(caseData.makers || []).map(u => ({ u, role: 'maker' })),
                          ...(caseData.checkers || []).map(u => ({ u, role: 'checker' })),
                        ];

                        if (allMembers.length === 0) {
                          return (
                            <div style={{
                              textAlign: 'center', padding: '28px 16px',
                              color: '#9ca3af', fontSize: 13, fontStyle: 'italic',
                              background: '#f8f9fc', borderRadius: 8,
                              border: '1px dashed #e5e7eb', marginTop: 12,
                            }}>
                              No team assigned yet. Click &quot;MC&quot; in the filings list to assign Maker &amp; Checker.
                            </div>
                          );
                        }

                        return allMembers.map((m, i) => {
                          const isC = m.role === 'checker';
                          const name = m.u.name || m.u.full_name || 'Unknown';
                          const email = m.u.email || '';
                          const initials = name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();

                          return (
                            <div key={`${m.role}-${m.u.id || i}`} style={{
                              display: 'flex', alignItems: 'center', gap: 12,
                              padding: '12px 0',
                              borderBottom: i < allMembers.length - 1 ? '1px solid #f0f2f6' : 'none',
                            }}>
                              <div style={{
                                width: 36, height: 36, borderRadius: '50%', flexShrink: 0,
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                fontSize: 13, fontWeight: 700,
                                background: isC ? '#EDEAFB' : '#E8F7F3',
                                color: isC ? '#4A3FA8' : '#0D6B52',
                                border: `2px solid ${isC ? '#A9A3E2' : '#8ECEBF'}`,
                              }}>
                                {initials}
                              </div>

                              <div style={{ flex: 1, minWidth: 0 }}>
                                <div style={{
                                  fontSize: 13, fontWeight: 600, color: '#1a1a2e',
                                  overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                                }}>
                                  {name}
                                </div>
                                {email && (
                                  <div style={{
                                    fontSize: 11, color: '#7A7F99', marginTop: 1,
                                    overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                                  }}>
                                    {email}
                                  </div>
                                )}
                              </div>

                              <span style={{
                                fontSize: 10, padding: '3px 10px', borderRadius: 99,
                                fontWeight: 700,
                                background: isC ? '#EDEAFB' : '#E8F7F3',
                                color: isC ? '#4A3FA8' : '#0D6B52',
                                flexShrink: 0,
                                textTransform: 'uppercase',
                                letterSpacing: '0.04em',
                              }}>
                                {isC ? 'Checker' : 'Maker'}
                              </span>
                            </div>
                          );
                        });
                      })()}
                    </div>
                  </div>

                  {/* Linked Task Card */}
                  <div style={{
                    background: '#fff',
                    border: '1px solid #e9edf4',
                    borderRadius: 14,
                    overflow: 'hidden',
                    boxShadow: '0 2px 8px rgba(20,20,40,0.05)',
                  }}>
                    <div style={{
                      display: 'flex', alignItems: 'center', gap: 10,
                      padding: '14px 20px',
                      background: 'linear-gradient(90deg, #f5f7fb, #eef2ff)',
                      borderBottom: '1px solid #e9edf4',
                    }}>
                      <div>
                        <div style={{ fontSize: 14, fontWeight: 800, color: '#1a1a2e', letterSpacing: '-0.01em' }}>
                          Linked Task
                        </div>
                        <div style={{ fontSize: 11, color: '#6b7280', marginTop: 1, fontWeight: 500 }}>
                          Reference details for this MCA filing
                        </div>
                      </div>
                    </div>

                    <div style={{ padding: '4px 20px 12px' }}>
                      {(linkedTask
                        ? [
                            ['Task ID',     linkedTask.task_id],
                            ['Client',      linkedTask.client_name],
                            ['Sub-Service', linkedTask.sub_service_name],
                            ['SPOC',        linkedTask.spoc_name],
                            ['Team',        linkedTask.team_name],
                            ['Status', (() => {
                              const meta = TASK_STATUS_META[linkedTask.status];
                              return meta ? (
                                <span style={{
                                  fontSize: 10, padding: '2px 9px', borderRadius: 99,
                                  fontWeight: 700, background: meta.bg, color: meta.color,
                                }}>
                                  {meta.label}
                                </span>
                              ) : '—';
                            })()],
                            ['Period',      linkedTask.period],
                            ['Due Date',    fmtDate(linkedTask.due_date)],
                            ['Created By',  linkedTask.created_by_name],
                            ['Created At',  fmtDateTime(linkedTask.created_at)],
                          ]
                        : [
                            ['Reference No.',   caseData.reference_no],
                            ['Sub-Service',     caseData.sub_service_name || caseData.filing_type],
                            ['Status', (() => {
                              const s = caseData.computed_status || caseData.status || 'wip';
                              const meta = STATUS_META[s] || STATUS_META.wip;
                              return (
                                <span style={{
                                  fontSize: 10, padding: '2px 9px', borderRadius: 99,
                                  fontWeight: 700, background: meta.bg, color: meta.color,
                                }}>
                                  {meta.label}
                                </span>
                              );
                            })()],
                            ['Created By',      caseData.created_by_name],
                            ['Financial Year',  caseData.financial_year || '—'],
                            ['Period',          caseData.period || '—'],
                            ['Due Date',        fmtDate(caseData.due_date)],
                          ]
                      ).map(([label, value], idx, arr) => (
                        <div key={label} style={{
                          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                          padding: '11px 0',
                          borderBottom: idx < arr.length - 1 ? '1px solid #f0f2f6' : 'none',
                        }}>
                          <span style={{ fontSize: 12.5, color: '#7A7F99', fontWeight: 600 }}>
                            {label}
                          </span>
                          <span style={{
                            fontSize: 13, fontWeight: 600,
                            color: (!value || value === '—') ? '#c2c8d2' : '#1a1a2e',
                            textAlign: 'right',
                            maxWidth: '55%',
                            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                          }}>
                            {typeof value === 'string' || typeof value === 'number' ? (value || '—') : value}
                          </span>
                        </div>
                      ))}
                    </div>

                  </div>
                </div>
              ) : (
                <div style={S.empty}>
                  <div style={S.emptyIcon}>👥</div>
                  <p>No MCA case data available for this client.</p>
                </div>
              )}
            </div>
          )}

          {/* AUDIT TAB */}
          {activeTab === 'audit' && (
            <MCAAuditTrailTab
              clientId={clientId}
              jobId={caseData?.id}
              refreshTick={refreshTick}
            />
          )}

        </section>
      </div>
    </main>
  );
}