// LitigationDashboard.js — Reusable dashboard with summary cards
// Used by: TDS, Income Tax, MCA sub-services, FEMA, Partnership

import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { MCModal } from './MCModal';
import { useAuth } from '../../contexts/AuthContext';
import { api } from '../../services/api';

// ══════════════════════════════════════════════════════════════════════
// TOKENS
// ══════════════════════════════════════════════════════════════════════
const P = '#1A2F5A';
const PL = '#EEF3FC';
const GR = '#0D6B52';
const GRL = '#E8F7F3';
const AMB = '#92400E';
const AMBL = '#FFF8E8';
const RED = '#C62828';
const REDL = '#FEF2F2';
const MUT = '#7A7F99';
const BRD = '#E8EAF0';
const WH = '#FFFFFF';

const STATUS_META = {
  wip: { label: 'WIP', color: '#f59e0b', bg: '#FEF3C7', icon: '🔄' },
  open: { label: 'Open', color: '#0ea5e9', bg: '#E0F2FE', icon: '📂' },
  closed: { label: 'Closed', color: '#10b981', bg: '#D1FAE5', icon: '✅' },
  attention_required: { label: 'Attention Required', color: '#dc2626', bg: '#FEE2E2', icon: '⏰' },
};

const reviewApi = {
  list: (params) => api.get('legal-services/reviews/', { params }),
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
// ATTENTION REQUIRED PANEL — shows cases needing action
// ══════════════════════════════════════════════════════════════════════
function AttentionPanel({ jobs, onJobClick }) {
  if (jobs.length === 0) {
    return (
      <div style={{ textAlign: 'center', padding: '24px 0', color: MUT }}>
        <div style={{ fontSize: 28, opacity: 0.3, marginBottom: 8 }}>✅</div>
        <div style={{ fontSize: 12, fontWeight: 500 }}>No cases need attention</div>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      {jobs.map((job) => {
        const effectiveStatus = job.computed_status || job.activity_status || 'wip';
        return (
          <div
            key={job.id || job.client}
            onClick={() => onJobClick(job)}
            style={{
              display: 'flex', alignItems: 'center', gap: 10,
              padding: '9px 12px', borderRadius: 10,
              border: `1px solid ${BRD}`, background: WH,
              cursor: 'pointer', transition: 'all .15s',
            }}
            onMouseEnter={(e) => { e.currentTarget.style.borderColor = RED; e.currentTarget.style.background = REDL; }}
            onMouseLeave={(e) => { e.currentTarget.style.borderColor = BRD; e.currentTarget.style.background = WH; }}
          >
            <div style={{
              width: 6, height: 6, borderRadius: '50%', background: RED, flexShrink: 0,
            }} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{
                fontSize: 12, fontWeight: 600, color: '#1C1E2E',
                overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
              }}>
                {job.client_name}
              </div>
              <div style={{ fontSize: 10, color: MUT, marginTop: 1 }}>
                {job.sub_service_name || '—'}
              </div>
            </div>
            <Pill status={effectiveStatus} />
          </div>
        );
      })}
    </div>
  );
}


// ══════════════════════════════════════════════════════════════════════
// open JOBS PANEL
// ══════════════════════════════════════════════════════════════════════


function OpenJobsPanel({ jobs, onJobClick }) {
  if (jobs.length === 0) {
    return (
      <div style={{ textAlign: 'center', padding: '24px 0', color: MUT }}>
        <div style={{ fontSize: 28, opacity: 0.3, marginBottom: 8 }}>📂</div>
        <div style={{ fontSize: 12, fontWeight: 500 }}>No open cases</div>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      {jobs.map((job) => (
        <div
          key={job.id || job.client}
          onClick={() => onJobClick(job)}
          style={{
            display: 'flex', alignItems: 'center', gap: 10,
            padding: '9px 12px', borderRadius: 10,
            border: `1px solid ${BRD}`, background: WH,
            cursor: 'pointer', transition: 'all .15s',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.borderColor = '#0ea5e9';
            e.currentTarget.style.background = '#E0F2FE';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.borderColor = BRD;
            e.currentTarget.style.background = WH;
          }}
        >
          <div style={{
            width: 6, height: 6, borderRadius: '50%',
            background: '#0ea5e9', flexShrink: 0,
          }} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{
              fontSize: 12, fontWeight: 600, color: '#1C1E2E',
              overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
            }}>
              {job.client_name}
            </div>
            <div style={{ fontSize: 10, color: MUT, marginTop: 1 }}>
              {job.sub_service_name || '—'}
              {job.next_hearing_date && (
                <span style={{ marginLeft: 6, color: '#0ea5e9', fontWeight: 600 }}>
                  📅 {new Date(job.next_hearing_date).toLocaleDateString('en-IN', {
                    day: '2-digit', month: 'short', year: 'numeric'
                  })}
                </span>
              )}
            </div>
          </div>
          <Pill status="open" />
        </div>
      ))}
    </div>
  );
}



// ══════════════════════════════════════════════════════════════════════
// RECENT JOBS PANEL
// ══════════════════════════════════════════════════════════════════════
function RecentJobs({ jobs, onJobClick }) {
  const recent = [...jobs]
    .sort((a, b) => new Date(b.updated_at || b.created_at || 0) - new Date(a.updated_at || a.created_at || 0))
    .slice(0, 8);

  if (recent.length === 0) {
    return (
      <div style={{ textAlign: 'center', padding: '24px 0', color: MUT }}>
        <div style={{ fontSize: 28, opacity: 0.3, marginBottom: 8 }}>📂</div>
        <div style={{ fontSize: 12, fontWeight: 500 }}>No recent jobs</div>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      {recent.map((job) => {
        const effectiveStatus = job.computed_status || job.activity_status || 'wip';
        return (
          <div
            key={job.id || job.client}
            onClick={() => onJobClick(job)}
            style={{
              display: 'flex', alignItems: 'center', gap: 10,
              padding: '9px 12px', borderRadius: 10,
              border: `1px solid ${BRD}`, background: WH,
              cursor: 'pointer', transition: 'all .15s',
            }}
            onMouseEnter={(e) => { e.currentTarget.style.borderColor = P; e.currentTarget.style.background = PL; }}
            onMouseLeave={(e) => { e.currentTarget.style.borderColor = BRD; e.currentTarget.style.background = WH; }}
          >
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{
                fontSize: 12, fontWeight: 600, color: '#1C1E2E',
                overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
              }}>
                {job.client_name}
              </div>
              <div style={{ fontSize: 10, color: MUT, marginTop: 1 }}>
                {job.sub_service_name || '—'}
              </div>
            </div>
            <Pill status={effectiveStatus} />
          </div>
        );
      })}
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════
// MAIN DASHBOARD
// ══════════════════════════════════════════════════════════════════════
export default function LitigationDashboard({
  title, subtitle, api, CaseModal, breadcrumbs, clientPath,
  caseType, jobListPath, onCreated, emptyMessage,
}) {
  const navigate = useNavigate();
  const { user } = useAuth();

  // ── Core case state (moved to top, before anything that depends on it) ──
  const [cases, setCases] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [modalOpen, setModalOpen] = useState(false);

  const getEffectiveStatus = (c) => c.computed_status || c.activity_status || 'wip';

  // ── Reviews lookup (for user-specific "My pending task") ──
  const [reviewsByJob, setReviewsByJob] = useState({});
  const litigationTypeForReviews = caseType === 'income-tax-litigations' ? 'income-tax' : 'tds';

  const fetchReviews = async () => {
    try {
      const res = await reviewApi.list({ litigation_type: litigationTypeForReviews });
      const data = Array.isArray(res.data) ? res.data : (res.data.results || []);
      const byJob = {};
      data.forEach((r) => {
        if (!r.job_id) return;
        if (['pending', 'escalated', 'rejected'].includes(r.status)) {
          const existing = byJob[r.job_id];
          if (!existing || new Date(r.submitted_at) > new Date(existing.submitted_at)) {
            byJob[r.job_id] = r;
          }
        }
      });
      setReviewsByJob(byJob);
    } catch { /* silent — dashboard still works without review data */ }
  };

  const myPendingTasks = useMemo(() => {
    const userId = user?.id;
    const isCeoRole = user?.role === 'Admin' || user?.role === 'Founder';

    return cases.filter((c) => {
      const status = getEffectiveStatus(c);
      if (status !== 'wip' && status !== 'attention_required') return false;

      const review = reviewsByJob[c.id];

      if (review) {
        if (review.status === 'escalated') return isCeoRole;
        if (review.status === 'pending') return (c.checkers || []).some((ch) => ch.id === userId);
        if (review.status === 'rejected') return (c.makers || []).some((m) => m.id === userId);
      }

      // No review at all → Maker's turn
      return (c.makers || []).some((m) => m.id === userId);
    });
  }, [cases, reviewsByJob, user]);

  const fetchCases = async () => {
    setLoading(true); setError(null);
    try {
      const res = await api.get();
      setCases(res.data.results || res.data);
    } catch { setError(`Failed to load ${title.toLowerCase()}.`); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchCases(); fetchReviews(); // eslint-disable-next-line
  }, []);

  const canAddNewCase = ['Founder', 'Manager', 'Team Lead'].includes(user?.role);

  const handleCreated = (createdCase) => {
    fetchCases();
    if (onCreated) onCreated(createdCase);
  };

  const goToClient = (c) => {
    const path = typeof clientPath === 'function' ? clientPath(c) : `/legal-services/clients/${c.client}`;
    navigate(path);
  };

  const goToFilteredJobs = (status) => {
    if (jobListPath) {
      const url = status ? `${jobListPath}?status=${status}` : jobListPath;
      navigate(url);
    }
  };

  // Counts
  const totalJobs = cases.length;
  const wipJobs = cases.filter(c => getEffectiveStatus(c) === 'wip').length;
  const openCases = cases.filter(c => getEffectiveStatus(c) === 'open');
  const openJobs = openCases.length;

  const closedJobs = cases.filter(c => getEffectiveStatus(c) === 'closed').length;
  const attentionJobs = cases.filter(c => getEffectiveStatus(c) === 'attention_required');
  const activeJobs = cases.filter(c => getEffectiveStatus(c) !== 'closed').length;

  // Cards config
  const CARDS = [
    {
      label: 'All Jobs', value: totalJobs, color: P, icon: '📊',
      sub: 'all cases', onClick: () => goToFilteredJobs(),
    },
    {
      label: 'WIP', value: wipJobs, color: '#f59e0b', icon: '🔄',
      sub: 'work in progress', onClick: () => goToFilteredJobs('wip'),
    },
    {
      label: 'Open', value: openJobs, color: '#0ea5e9', icon: '📂',
      sub: 'hearing scheduled', onClick: () => goToFilteredJobs('open'),
    },
    {
      label: 'Closed', value: closedJobs, color: GR, icon: '✅',
      sub: 'completed cases', onClick: () => goToFilteredJobs('closed'),
    },
    {
      label: 'Attention Required', value: attentionJobs.length,
      color: attentionJobs.length > 0 ? RED : MUT, icon: '⏰',
      sub: 'needs immediate action', onClick: () => goToFilteredJobs('attention_required'),
    },
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
      <div style={{
        display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between',
        marginBottom: 24, flexWrap: 'wrap', gap: 12,
      }}>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 900, color: '#111827', margin: 0, letterSpacing: '-.03em' }}>
            {title}
          </h1>
          <p style={{ fontSize: 13, color: MUT, margin: '5px 0 0' }}>
            {totalJobs} job{totalJobs !== 1 ? 's' : ''} · {activeJobs} active
          </p>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
          {jobListPath && (
            <button onClick={() => navigate(jobListPath)}
              style={{
                padding: '8px 16px', borderRadius: 10, border: `1.5px solid ${P}`,
                background: P, fontSize: 13, fontWeight: 600, cursor: 'pointer',
                color: WH, fontFamily: 'inherit',
              }}>
              📋 All Jobs
            </button>
          )}
          {canAddNewCase && CaseModal && (
            <button onClick={() => setModalOpen(true)}
              style={{
                padding: '8px 16px', borderRadius: 10, border: `1.5px solid ${P}`,
                background: P, fontSize: 13, fontWeight: 600, cursor: 'pointer',
                color: WH, fontFamily: 'inherit',
              }}>
              + New Case
            </button>
          )}
        </div>
      </div>

      {/* Error */}
      {error && (
        <div style={{
          padding: '14px 18px', background: REDL, border: '1.5px solid #fecaca',
          borderRadius: 12, color: RED, fontSize: 13, fontWeight: 600, marginBottom: 16,
        }}>
          {error}
        </div>
      )}

      {/* 5 Summary Cards */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
        gap: 16, marginBottom: 20, alignItems: 'stretch',
      }}>
        {CARDS.map((card) => (
          <div
            key={card.label}
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
        ))}
      </div>

      {/* Bottom Panels */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',  // ← auto fit 3
        gap: 16,
      }}>
        {/* My Pending Task */}
        <div style={{
          background: WH, border: `1.5px solid ${BRD}`, borderRadius: 16,
          padding: 22, display: 'flex', flexDirection: 'column', height: 360,
        }}>
          <div style={{
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            marginBottom: 14, flexShrink: 0,
          }}>
            <div style={{
              fontSize: 11, fontWeight: 700, textTransform: 'uppercase',
              letterSpacing: '.08em', color: MUT,
            }}>
              My Pending Task
            </div>
            {myPendingTasks.length > 0 && (
              <span style={{
                background: RED, color: WH, borderRadius: 99,
                padding: '2px 9px', fontSize: 11, fontWeight: 700,
              }}>
                {myPendingTasks.length}
              </span>
            )}
          </div>
          <div style={{ overflowY: 'auto', flex: 1 }}>
            <AttentionPanel jobs={myPendingTasks} onJobClick={goToClient} />
          </div>
        </div>

        {/* ✅ NEW — Open Jobs */}
        <div style={{
          background: WH, border: `1.5px solid ${BRD}`, borderRadius: 16,
          padding: 22, display: 'flex', flexDirection: 'column', height: 360,
        }}>
          <div style={{
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            marginBottom: 14, flexShrink: 0,
          }}>
            <div style={{
              fontSize: 11, fontWeight: 700, textTransform: 'uppercase',
              letterSpacing: '.08em', color: MUT,
            }}>
              Open Jobs
            </div>
            {openCases.length > 0 && (
              <span style={{
                background: '#0ea5e9', color: WH, borderRadius: 99,
                padding: '2px 9px', fontSize: 11, fontWeight: 700,
              }}>
                {openCases.length}
              </span>
            )}
          </div>
          <div style={{ overflowY: 'auto', flex: 1 }}>
            <OpenJobsPanel jobs={openCases} onJobClick={goToClient} />
          </div>
        </div>

        {/* Recent Jobs */}
        <div style={{
          background: WH, border: `1.5px solid ${BRD}`, borderRadius: 16,
          padding: 22, display: 'flex', flexDirection: 'column', height: 360,
        }}>
          <div style={{
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            marginBottom: 14, flexShrink: 0,
          }}>
            <div style={{
              fontSize: 11, fontWeight: 700, textTransform: 'uppercase',
              letterSpacing: '.08em', color: MUT,
            }}>
              Recent Jobs
            </div>
            {jobListPath && (
              <button onClick={() => navigate(jobListPath)}
                style={{
                  fontSize: 11, color: P, background: 'none', border: 'none',
                  cursor: 'pointer', fontFamily: 'inherit', textDecoration: 'underline',
                }}>
                View all
              </button>
            )}
          </div>
          <div style={{ overflowY: 'auto', flex: 1 }}>
            <RecentJobs jobs={cases} onJobClick={goToClient} />
          </div>
        </div>
      </div>

      {/* Modals */}
      {CaseModal && (
        <CaseModal
          open={modalOpen} editCase={null}
          onClose={() => setModalOpen(false)}
          onCreated={handleCreated}
        />
      )}
    </div>
  );
}