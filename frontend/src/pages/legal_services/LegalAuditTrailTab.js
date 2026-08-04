
import React, { useState, useEffect, useCallback } from 'react';
import { api } from '../../services/api';
import ReactDOM from 'react-dom';

/* ─── LOCAL API DEFINITIONS (used only by this file) ─── */
const auditTrailApi = {
  list: (params) => api.get('/legal-services/audit-trail/', { params }),
};

// ── Design Tokens (matching reference) ──
const P = '#1A2F5A';
const PL = '#EEF3FC';
const GR = '#0D6B52';
const GL = '#E8F7F3';
const AMB = '#92400E';
const AMBL = '#FFF8E8';
const RED = '#C62828';
const MUT = '#7A7F99';
const BRD = '#E8EAF0';
const BG = '#F8F9FB';

const css = `
@keyframes latFadeIn { from { opacity: 0; transform: translateY(4px); } to { opacity: 1; transform: translateY(0); } }
@keyframes latSpin { to { transform: rotate(360deg); } }
@keyframes latShimmer {
  0% { background-position: -200% 0; }
  100% { background-position: 200% 0; }
}
.lat-skeleton {
  background: linear-gradient(90deg, #EEF0F5 25%, #F7F8FB 37%, #EEF0F5 63%);
  background-size: 400% 100%;
  animation: latShimmer 1.4s ease-in-out infinite;
  border-radius: 6px;
}
`;

const ACTION_COLORS = {
  // Case
  'case_created':     { bg: GL,       color: GR  },
  'info_update':      { bg: PL,       color: P   },
  'activity_update':  { bg: PL,       color: P   },

  // Documents
  'doc_upload':       { bg: AMBL,     color: AMB },
  'doc_delete':       { bg: '#FEF2F2', color: RED },

  // Status
  'status_change':    { bg: '#F3F3F3', color: '#666' },

  // Team
  'assignment':       { bg: GL,       color: GR  },

  // Fallback
  'note':             { bg: BG,       color: MUT },
};


const AUDIT_CATEGORIES = [
  { id: 'all',         label: 'All',            types: null },
  { id: 'case',        label: 'Case',           types: ['case_created', 'info_update', 'activity_update'] },
  { id: 'documents',   label: 'Documents',      types: ['doc_upload', 'doc_delete'] },
  { id: 'status',      label: 'Status Changes', types: ['status_change'] },
  { id: 'assignments', label: 'Assignments',    types: ['assignment'] },
];

/**
 * Legal Services Audit Trail — scoped strictly to one client + one
 * litigation_type ('tds' | 'income-tax'). TDS and Income Tax data never
 * mix because the backend query filters by both client and
 * litigation_type, and this component only ever requests one type at a
 * time (whichever the parent's ?type= currently points to).
 *
 * Props:
 *   clientId        - the client's id
 *   litigationType  - 'tds' | 'income-tax'
 *   courtCaseId     - optional court case id
 *   refreshTick     - optional trigger to reload
 */
export default function LegalAuditTrailTab({ clientId, litigationType, courtCaseId, jobId, refreshTick }) {
  const [loading, setLoading]   = useState(true);
  const [events, setEvents]     = useState([]);
  const [error, setError]       = useState(null);

  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('all');
  const [categoryOpen, setCategoryOpen] = useState(false);

  const load = useCallback(async () => {
    if (!clientId || !litigationType) return;
    setLoading(true);
    setError(null);
    try {
      const params = { client: clientId, litigation_type: litigationType };
      if (jobId) {
        params.job_id = jobId;
      } else if (courtCaseId) {
        params.court_case = courtCaseId;
      }

      const res = await auditTrailApi.list(params);
      const data = Array.isArray(res.data) ? res.data : (res.data.results || []);
      setEvents(data);
    } catch (e) {
      console.error(e);
      setError('Failed to load audit trail');
    } finally {
      setLoading(false);
    }
  }, [clientId, litigationType, courtCaseId, jobId]);

  useEffect(() => { load(); }, [load, refreshTick]);

  const label = litigationType === 'income-tax' ? 'Income Tax' : 'TDS';

  const filteredEvents = events.filter((e) => {
    if (category !== 'all') {
      const cat = AUDIT_CATEGORIES.find((c) => c.id === category);
      if (cat?.types && !cat.types.includes(e.event_type)) return false;
    }
    if (search) {
      const q = search.toLowerCase();
      if (
        !(e.title || '').toLowerCase().includes(q) &&
        !(e.description || '').toLowerCase().includes(q) &&
        !(e.by_name || '').toLowerCase().includes(q) &&
        !(e.event_type || '').toLowerCase().includes(q)
      ) return false;
    }
    return true;
  });


  if (loading) return (
    <div>
      <style>{css}</style>
      <LoadingState />
    </div>
  );

  if (error) return (
    <div>
      <style>{css}</style>
      <ErrorState message={error} onRetry={load} />
    </div>
  );

  return (
    <div>
      <style>{css}</style>

      {/* ── Card wrapper ── */}
      <div style={{
        background: '#fff',
        border: `1px solid ${BRD}`,
        borderRadius: 14,
        overflow: 'hidden',
        boxShadow: '0 2px 8px rgba(20,20,40,0.05)',
        animation: 'latFadeIn 0.3s ease both',
      }}>

        {/* Card Header */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '14px 20px',
          background: 'linear-gradient(90deg, #f5f7fb, #eef2ff)',
          borderBottom: `1px solid ${BRD}`,
          flexWrap: 'wrap', gap: 10,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div>
              <div style={{ fontSize: 14, fontWeight: 800, color: '#1a1a2e', letterSpacing: '-0.01em' }}>
                Audit Trail — {label}
              </div>
              <div style={{ fontSize: 11, color: MUT, marginTop: 1, fontWeight: 500 }}>
                {filteredEvents.length} {filteredEvents.length === 1 ? 'entry' : 'entries'}
              </div>
            </div>
          </div>

          {/* ✅ Category dropdown + Search + Refresh */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>

            {/* Category dropdown */}
            <div style={{ position: 'relative' }}>
              <button
                id="audit-category-trigger"
                onClick={() => setCategoryOpen((o) => !o)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 6, padding: '6px 12px',
                  borderRadius: 7, border: `1px solid ${category !== 'all' ? P : BRD}`,
                  background: category !== 'all' ? PL : '#fff',
                  color: category !== 'all' ? P : MUT,
                  fontSize: 11.5, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit',
                }}
              >
                🔽 {AUDIT_CATEGORIES.find((c) => c.id === category)?.label || 'All'}
              </button>

              {categoryOpen && (
                <CategoryDropdownPortal
                  category={category}
                  events={events}
                  setCategory={setCategory}
                  setCategoryOpen={setCategoryOpen}
                />
              )}
            </div>

            {/* Search */}
            <div style={{ position: 'relative' }}>
              <span style={{
                position: 'absolute', left: 9, top: '50%', transform: 'translateY(-50%)',
                fontSize: 11, color: MUT, pointerEvents: 'none',
              }}>🔍</span>
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search…"
                style={{
                  padding: '6px 26px', borderRadius: 7,
                  border: `1px solid ${search ? P : BRD}`,
                  background: search ? PL : '#fff',
                  fontSize: 12, fontFamily: 'inherit', outline: 'none', width: 160, color: '#1C1E2E',
                }}
              />
              {search && (
                <button
                  onClick={() => setSearch('')}
                  style={{
                    position: 'absolute', right: 6, top: '50%', transform: 'translateY(-50%)',
                    background: 'none', border: 'none', cursor: 'pointer', color: MUT, fontSize: 14, padding: 0,
                  }}
                >×</button>
              )}
            </div>

            {/* Refresh button — unchanged */}
            <button
              onClick={load}
              disabled={loading}
              style={{
                display: 'flex', alignItems: 'center', gap: 5,
                padding: '6px 12px', borderRadius: 7,
                border: `1px solid ${BRD}`, background: '#fff',
                fontSize: 11, fontWeight: 600, color: MUT,
                cursor: loading ? 'wait' : 'pointer',
                fontFamily: 'inherit',
                transition: 'all 0.15s ease',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = PL;
                e.currentTarget.style.borderColor = P;
                e.currentTarget.style.color = P;
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = '#fff';
                e.currentTarget.style.borderColor = BRD;
                e.currentTarget.style.color = MUT;
              }}
            >
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none"
                stroke="currentColor" strokeWidth="2.2"
                style={{ animation: loading ? 'latSpin 0.7s linear infinite' : 'none' }}>
                <polyline points="23 4 23 10 17 10" />
                <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10" />
              </svg>
              Refresh
            </button>
          </div>
        </div>

        {/* ── Timeline Body ── */}
        <div style={{ padding: '12px 20px' }}>
          {filteredEvents.length === 0 ? (
            <div style={{
              textAlign: 'center', padding: '32px 16px',
              color: MUT, fontSize: 12,
            }}>
              No activity logged yet.
            </div>
          ) : (
            filteredEvents.map((event, i) => {
              const ac = ACTION_COLORS[event.event_type] || ACTION_COLORS.note;
              const time = new Date(event.created_at).toLocaleString('en-IN', {
                day: '2-digit', month: 'short', year: 'numeric',
                hour: '2-digit', minute: '2-digit', hour12: true,
              });

              // Format event type label
              const typeLabel = (event.event_type || 'note')
                .replace(/_/g, ' ')
                .replace(/\b\w/g, (c) => c.toUpperCase());

              return (
                <div key={event.id || i} style={{
                  display: 'flex', gap: 12,
                  padding: '10px 0',
                  borderBottom: i < events.length - 1 ? `1px solid ${BRD}` : 'none',
                  animation: `latFadeIn 0.3s ease ${Math.min(i * 0.03, 0.2)}s both`,
                }}>
                  {/* Timeline dot + connector */}
                  <div style={{
                    display: 'flex', flexDirection: 'column',
                    alignItems: 'center', flexShrink: 0,
                  }}>
                    <div style={{
                      width: 10, height: 10, borderRadius: '50%',
                      background: ac.color, marginTop: 4,
                      boxShadow: `0 0 0 3px ${ac.bg}`,
                    }} />
                    {i < events.length - 1 && (
                      <div style={{
                        width: 1, flex: 1,
                        background: BRD, marginTop: 3,
                      }} />
                    )}
                  </div>

                  {/* Event content */}
                  <div style={{ flex: 1, minWidth: 0 }}>

                    {/* Top row: action badge + section + user + time */}
                    <div style={{
                      display: 'flex', alignItems: 'center',
                      gap: 8, marginBottom: 3, flexWrap: 'wrap',
                    }}>
                      {/* Action badge */}
                      <span style={{
                        fontSize: 10, padding: '2px 8px', borderRadius: 99,
                        fontWeight: 600,
                        background: ac.bg, color: ac.color,
                      }}>
                        {typeLabel}
                      </span>

                      {/* Section badge (if title exists) */}
                      {event.title && (
                        <span style={{
                          fontSize: 10, padding: '1px 7px', borderRadius: 99,
                          background: BG, color: MUT,
                          border: `1px solid ${BRD}`,
                          overflow: 'hidden', textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap', maxWidth: 200,
                        }}>
                          {event.title}
                        </span>
                      )}

                      {/* User name */}
                      <span style={{
                        fontSize: 11, fontWeight: 600, color: '#1C1E2E',
                      }}>
                        {event.by_name || 'System'}
                      </span>

                      {/* Timestamp */}
                      <span style={{
                        fontSize: 10, color: MUT, marginLeft: 'auto',
                        whiteSpace: 'nowrap',
                      }}>
                        {time}
                      </span>
                    </div>

                    {/* Description / Note */}
                    {event.description && (
                      <div style={{
                        fontSize: 12, color: '#1C1E2E',
                        lineHeight: 1.6, wordBreak: 'break-word',
                      }}>
                        {event.description}
                      </div>
                    )}

                    {/* Changed fields (old → new) as purple pills */}
                    {event.old_values && event.new_values && (
                      <div style={{
                        marginTop: 4,
                        display: 'flex', flexWrap: 'wrap', gap: 4,
                      }}>
                        {Object.keys(event.new_values).slice(0, 8).map((field) => (
                          <span key={field} style={{
                            fontSize: 10, padding: '1px 6px', borderRadius: 4,
                            background: '#F0F4FF', color: '#4A3FA8',
                            border: '1px solid #C4B5FD',
                          }}>
                            {field}
                          </span>
                        ))}
                        {Object.keys(event.new_values).length > 8 && (
                          <span style={{ fontSize: 10, color: MUT }}>
                            +{Object.keys(event.new_values).length - 8} more
                          </span>
                        )}
                      </div>
                    )}

                    {/* Expandable: old → new values on hover/detail */}
                    {event.old_values && event.new_values && (
                      <div style={{
                        marginTop: 4, fontSize: 10.5, color: '#475569',
                      }}>
                        {Object.keys(event.new_values).slice(0, 5).map((field) => {
                          const oldVal = Array.isArray(event.old_values[field])
                            ? event.old_values[field].join(', ')
                            : event.old_values[field];
                          const newVal = Array.isArray(event.new_values[field])
                            ? event.new_values[field].join(', ')
                            : event.new_values[field];
                          return (
                            <div key={field} style={{
                              display: 'flex', gap: 4, marginBottom: 1,
                            }}>
                              <span style={{ fontWeight: 700, color: '#1C1E2E' }}>
                                {field}:
                              </span>
                              <span style={{
                                color: RED, textDecoration: 'line-through',
                              }}>
                                {oldVal || 'None'}
                              </span>
                              <span>→</span>
                              <span style={{
                                color: GR, fontWeight: 600,
                              }}>
                                {newVal || 'None'}
                              </span>
                            </div>
                          );
                        })}
                        {Object.keys(event.new_values).length > 5 && (
                          <div style={{ fontSize: 10, color: MUT, marginTop: 2 }}>
                            +{Object.keys(event.new_values).length - 5} more fields changed
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}

// ── Loading Skeleton ──
function LoadingState() {
  return (
    <div style={{
      background: '#fff',
      border: `1px solid ${BRD}`,
      borderRadius: 14,
      overflow: 'hidden',
      boxShadow: '0 2px 8px rgba(20,20,40,0.05)',
    }}>
      {/* Skeleton header */}
      <div style={{
        padding: '14px 20px',
        background: 'linear-gradient(90deg, #f5f7fb, #eef2ff)',
        borderBottom: `1px solid ${BRD}`,
        display: 'flex', alignItems: 'center', gap: 10,
      }}>
        <div className="lat-skeleton" style={{ width: 32, height: 32, borderRadius: 8 }} />
        <div>
          <div className="lat-skeleton" style={{ width: 140, height: 13, marginBottom: 5 }} />
          <div className="lat-skeleton" style={{ width: 80, height: 10 }} />
        </div>
      </div>

      {/* Skeleton rows */}
      <div style={{ padding: '12px 20px' }}>
        {[1, 2, 3, 4, 5].map((i) => (
          <div key={i} style={{
            display: 'flex', gap: 12, padding: '10px 0',
            borderBottom: i < 5 ? `1px solid ${BRD}` : 'none',
          }}>
            <div style={{
              display: 'flex', flexDirection: 'column',
              alignItems: 'center', flexShrink: 0,
            }}>
              <div className="lat-skeleton" style={{
                width: 10, height: 10, borderRadius: '50%', marginTop: 4,
              }} />
              {i < 5 && (
                <div className="lat-skeleton" style={{
                  width: 1, height: 30, marginTop: 3,
                }} />
              )}
            </div>
            <div style={{ flex: 1 }}>
              <div style={{
                display: 'flex', gap: 8, marginBottom: 6,
              }}>
                <div className="lat-skeleton" style={{
                  width: 70, height: 16, borderRadius: 99,
                }} />
                <div className="lat-skeleton" style={{
                  width: 100, height: 16, borderRadius: 99,
                }} />
                <div style={{ flex: 1 }} />
                <div className="lat-skeleton" style={{
                  width: 80, height: 12,
                }} />
              </div>
              <div className="lat-skeleton" style={{
                width: '70%', height: 11, marginBottom: 4,
              }} />
              <div style={{ display: 'flex', gap: 4 }}>
                <div className="lat-skeleton" style={{
                  width: 50, height: 14, borderRadius: 4,
                }} />
                <div className="lat-skeleton" style={{
                  width: 60, height: 14, borderRadius: 4,
                }} />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Error State ──
function ErrorState({ message, onRetry }) {
  return (
    <div style={{
      background: '#fff',
      border: `1px solid ${BRD}`,
      borderRadius: 14,
      overflow: 'hidden',
      boxShadow: '0 2px 8px rgba(20,20,40,0.05)',
    }}>
      <div style={{
        padding: '40px 20px', textAlign: 'center',
      }}>
        <div style={{ fontSize: 32, marginBottom: 10, opacity: 0.6 }}>⚠️</div>
        <div style={{
          fontSize: 14, fontWeight: 700, color: RED,
          marginBottom: 12,
        }}>
          {message}
        </div>
        <button
          onClick={onRetry}
          style={{
            padding: '8px 20px', borderRadius: 8, border: 'none',
            background: 'linear-gradient(135deg, #214274, #205995)',
            color: 'white', fontSize: 12.5, fontWeight: 700,
            cursor: 'pointer', fontFamily: 'inherit',
            boxShadow: '0 2px 8px rgba(33,66,116,0.25)',
            transition: 'all 0.15s ease',
          }}
        >
          Retry
        </button>
      </div>
    </div>
  );
}


function CategoryDropdownPortal({ category, events, setCategory, setCategoryOpen }) {
  const [position, setPosition] = useState({ top: 0, left: 0 });

  useEffect(() => {
    const trigger = document.getElementById('audit-category-trigger');
    if (trigger) {
      const rect = trigger.getBoundingClientRect();
      setPosition({ top: rect.bottom + 6, left: rect.right - 200 });
    }
  }, []);

  return ReactDOM.createPortal(
    <>
      <div style={{ position: 'fixed', inset: 0, zIndex: 9998 }} onClick={() => setCategoryOpen(false)} />
      <div style={{
        position: 'fixed', top: position.top, left: position.left, minWidth: 200,
        background: '#fff', border: `1px solid ${BRD}`, borderRadius: 10,
        boxShadow: '0 8px 24px rgba(0,0,0,0.12)', zIndex: 9999, padding: 4,
      }}>
        {AUDIT_CATEGORIES.map((cat) => {
          const active = category === cat.id;
          const count = cat.types
            ? events.filter((e) => cat.types.includes(e.event_type)).length
            : events.length;
          return (
            <button
              key={cat.id}
              onClick={() => { setCategory(cat.id); setCategoryOpen(false); }}
              style={{
                display: 'flex', alignItems: 'center', gap: 8, width: '100%',
                padding: '8px 10px', background: active ? PL : 'transparent',
                border: 'none', borderRadius: 6, cursor: 'pointer',
                fontSize: 12, fontWeight: active ? 700 : 500,
                color: active ? P : '#1C1E2E', fontFamily: 'inherit', textAlign: 'left',
              }}
            >
              <span style={{ flex: 1 }}>{cat.label}</span>
              <span style={{
                fontSize: 10, fontWeight: 700, padding: '2px 7px', borderRadius: 99,
                background: active ? P : BG, color: active ? '#fff' : MUT,
              }}>{count}</span>
            </button>
          );
        })}
      </div>
    </>,
    document.body
  );
}