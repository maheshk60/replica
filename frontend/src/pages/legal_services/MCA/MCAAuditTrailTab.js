import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { api } from '../../../services/api';
import ReactDOM from 'react-dom';

const auditTrailApi = {
  list: (params) => api.get('/legal-services/audit-trail/', { params }),
};

// ── COLORS ──
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
const INK = '#1C1E2E';
const PURPLE = '#6D28D9';
const PURPLE_BG = '#F3E8FF';

const css = `
@keyframes latFadeIn { from { opacity: 0; transform: translateY(4px); } to { opacity: 1; transform: translateY(0); } }
@keyframes latSpin { to { transform: rotate(360deg); } }
@keyframes latShimmer { 0% { background-position: -200% 0; } 100% { background-position: 200% 0; } }
.lat-skeleton { background: linear-gradient(90deg, #EEF0F5 25%, #F7F8FB 37%, #EEF0F5 63%); background-size: 400% 100%; animation: latShimmer 1.4s ease-in-out infinite; border-radius: 6px; }
`;

// ── VISIBLE EVENT TYPES ──
const VISIBLE_TYPES = new Set([
  'case_created', 
  'info_update',
  'mca_docs_submitted',
  'mca_docs_approved',
  'mca_docs_rejected',
  'mca_docs_escalated',
  'mca_srn_uploaded', // Used for SRN "Send for review"
  'mca_srn_approved',
  'mca_srn_rejected',
  'mca_srn_escalated',
  'mca_outcome_approved',
  'mca_outcome_rejected',
  'mca_outcome_resubmit'
]);

const AUDIT_COLORS = {
  'case_created':         { bg: GL,       color: GR,     label: 'Job Created' },
  'info_update':          { bg: PL,       color: P,      label: 'Info Updated' },
  'mca_docs_submitted':   { bg: AMBL,     color: AMB,    label: 'Sent for Review' },
  'mca_docs_approved':    { bg: GL,       color: GR,     label: 'Draft Approved' },
  'mca_docs_rejected':    { bg: '#FEF2F2',color: RED,    label: 'Draft Rejected' },
  'mca_docs_escalated':   { bg: PURPLE_BG,color: PURPLE, label: 'Moved to CEO' },
  
  'mca_srn_uploaded':     { bg: AMBL,     color: AMB,    label: 'SRN Sent for Review' },
  'mca_srn_approved':     { bg: GL,       color: GR,     label: 'SRN Verified' },
  'mca_srn_rejected':     { bg: '#FEF2F2',color: RED,    label: 'SRN Rejected' },
  'mca_srn_escalated':    { bg: PURPLE_BG,color: PURPLE, label: 'SRN Moved to CEO' },
  
  'mca_outcome_approved': { bg: GL,       color: GR,     label: 'Approved' },
  'mca_outcome_rejected': { bg: '#FEF2F2',color: RED,    label: 'Rejected' },
  'mca_outcome_resubmit': { bg: AMBL,     color: AMB,    label: 'Resubmission' },
};

// ── CATEGORY FILTERS ──
const AUDIT_CATEGORIES = [
  { id: 'all',       label: 'All Events' },
  { id: 'client',    label: 'Client Info' },
  { id: 'submitted', label: 'Submissions' },
  { id: 'approved',  label: 'Approved' },
  { id: 'rejected',  label: 'Rejected' },
  { id: 'escalated', label: 'Moved to CEO' },
];

export default function MCAAuditTrailTab({ clientId, jobId, refreshTick }) {
  const [loading, setLoading] = useState(true);
  const [events, setEvents] = useState([]);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('all');
  const [categoryOpen, setCategoryOpen] = useState(false);

  const load = useCallback(async () => {
    if (!clientId || !jobId) return;
    setLoading(true);
    setError(null);
    try {
      const res = await auditTrailApi.list({ client: clientId, litigation_type: 'mca', job_id: jobId });
      const data = Array.isArray(res.data) ? res.data : (res.data.results || []);
      setEvents(data);
    } catch (e) {
      setError('Failed to load audit trail');
    } finally { setLoading(false); }
  }, [clientId, jobId]);

  useEffect(() => { load(); }, [load, refreshTick]);

  const filteredEvents = useMemo(() => {
    return events.filter(e => {
      const type = e.event_type || '';
      
      if (!VISIBLE_TYPES.has(type)) return false;

      // HIDE raw uploads that haven't been submitted yet.
      // (The title for raw upload contains "uploaded", the submit title contains "submitted")
      if (type === 'mca_srn_uploaded' && (e.title || '').toLowerCase().includes('uploaded')) {
        return false;
      }

      // Category filter
      if (category !== 'all') {
        if (category === 'client' && type !== 'info_update') return false;
        if (category === 'submitted' && !type.includes('submitted') && type !== 'mca_srn_uploaded') return false;
        if (category === 'approved' && !type.includes('approved')) return false;
        if (category === 'rejected' && !type.includes('rejected')) return false;
        if (category === 'escalated' && !type.includes('escalated')) return false;
      }

      // Search filter
      if (search) {
        const q = search.toLowerCase();
        const t = (e.title || '').toLowerCase();
        const fname = (e.new_values?.file_name || '').toLowerCase();
        const byName = (e.by_name || '').toLowerCase();
        if (!t.includes(q) && !fname.includes(q) && !byName.includes(q)) return false;
      }

      return true;
    });
  }, [events, category, search]);

  if (loading) return <div><style>{css}</style><LoadingState /></div>;
  if (error) return <div style={{ padding: 40, textAlign: 'center', color: RED }}>{error}</div>;

  return (
    <div>
      <style>{css}</style>
      <div style={{ background: '#fff', border: `1px solid ${BRD}`, borderRadius: 14, overflow: 'hidden' }}>
        
        {/* Header with Search and Dropdown */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 20px', background: '#F8FAFC', borderBottom: `1px solid ${BRD}`, flexWrap: 'wrap', gap: 10 }}>
          <div>
            <div style={{ fontSize: 14, fontWeight: 800, color: INK }}>MCA Audit Trail</div>
            <div style={{ fontSize: 11, color: MUT, marginTop: 1, fontWeight: 500 }}>{filteredEvents.length} events logged</div>
          </div>
          
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            
            {/* Filter Dropdown */}
            <div style={{ position: 'relative' }}>
              <button id="audit-category-trigger" type="button" onClick={(e) => { e.stopPropagation(); e.preventDefault(); setCategoryOpen(o => !o); }} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '6px 12px', borderRadius: 7, border: `1px solid ${category !== 'all' ? P : BRD}`, background: category !== 'all' ? PL : '#fff', color: category !== 'all' ? P : MUT, fontSize: 11.5, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>
                🔽 {AUDIT_CATEGORIES.find(c => c.id === category)?.label || 'All Events'}
              </button>
              {categoryOpen && <CategoryDropdownPortal category={category} setCategory={setCategory} setCategoryOpen={setCategoryOpen} />}
            </div>

            {/* Search Input */}
            <div style={{ position: 'relative' }}>
              <span style={{ position: 'absolute', left: 9, top: '50%', transform: 'translateY(-50%)', fontSize: 11, color: MUT, pointerEvents: 'none' }}>🔍</span>
              <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search…" style={{ padding: '6px 26px', borderRadius: 7, border: `1px solid ${search ? P : BRD}`, background: search ? PL : '#fff', fontSize: 12, fontFamily: 'inherit', outline: 'none', width: 160, color: INK }} />
              {search && <button onClick={() => setSearch('')} style={{ position: 'absolute', right: 6, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: MUT, fontSize: 14, padding: 0 }}>×</button>}
            </div>

            {/* Refresh Button */}
            <button onClick={load} style={{ padding: '6px 12px', borderRadius: 7, border: `1px solid ${BRD}`, background: '#fff', fontSize: 11, fontWeight: 600, color: MUT, cursor: 'pointer' }}>
              Refresh
            </button>
          </div>
        </div>

        {/* Timeline Body */}
        <div style={{ padding: '12px 20px' }}>
          {filteredEvents.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '32px 16px', color: MUT, fontSize: 12 }}>
              {category !== 'all' || search ? 'No events match your filters.' : 'No activity logged yet.'}
            </div>
          ) : (
            filteredEvents.map((log, i) => <AuditEventRow key={log.id} log={log} isLast={i === filteredEvents.length - 1} index={i} />)
          )}
        </div>
      </div>
    </div>
  );
}

function AuditEventRow({ log, isLast, index }) {
  const type = log.event_type || '';
  const meta = AUDIT_COLORS[type] || { bg: '#F1F5F9', color: MUT, label: type };
  const timeStr = new Date(log.created_at).toLocaleString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', hour12: true }).replace('AM', 'am').replace('PM', 'pm');
  const userName = log.by_name || 'System';
  const nv = log.new_values || {};
  const ov = log.old_values || {};
  // Prefix text based on action
  let actorPrefix = 'By';
  if (type === 'case_created') actorPrefix = 'Created by';
  else if (type === 'info_update') actorPrefix = 'Updated by';
  else if (type.includes('submitted') || type.includes('uploaded')) actorPrefix = 'Submitted by';
  else if (type.includes('approved')) actorPrefix = 'Approved by';
  else if (type.includes('rejected')) actorPrefix = 'Rejected by';
  else if (type.includes('escalated')) actorPrefix = 'Moved to CEO by';

  // Extract Files Safely
  let rawFiles = [];
  if (nv.file_name) rawFiles.push(nv.file_name);
  if (nv.files && Array.isArray(nv.files)) rawFiles.push(...nv.files);
  if (nv.draft_files && Array.isArray(nv.draft_files)) rawFiles.push(...nv.draft_files);
  if (nv.supporting_docs && Array.isArray(nv.supporting_docs)) rawFiles.push(...nv.supporting_docs);
  
  // ✅ Deduplicate file names (Removes the double/triple stacking bug)
  const uniqueFiles = [...new Set(rawFiles.filter(Boolean))];
  
  const isRejected = type.includes('rejected');
  const reason = nv.rejection_reason || nv.note;

  return (
    <div style={{ display: 'flex', gap: 12, padding: '12px 0', borderBottom: isLast ? 'none' : `1px solid ${BRD}`, animation: `latFadeIn 0.3s ease ${Math.min(index * 0.03, 0.2)}s both` }}>
      {/* Timeline dot */}
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flexShrink: 0 }}>
        <div style={{ width: 10, height: 10, borderRadius: '50%', background: meta.color, marginTop: 4, boxShadow: `0 0 0 3px ${meta.bg}` }} />
        {!isLast && <div style={{ width: 1, flex: 1, background: BRD, marginTop: 3 }} />}
      </div>

      {/* Content */}
      <div style={{ flex: 1, minWidth: 0 }}>
        
        {/* Top Row: Label & User/Time */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 5, flexWrap: 'wrap', gap: 8 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 10, padding: '2px 8px', borderRadius: 99, fontWeight: 700, background: meta.bg, color: meta.color, textTransform: 'uppercase' }}>
              {meta.label}
            </span>
            {log.title && <span style={{ fontSize: 12, fontWeight: 600, color: INK }}>{log.title}</span>}
          </div>
          <div style={{ fontSize: 11, color: MUT }}>
            {actorPrefix} <span style={{ fontWeight: 700, color: INK }}>{userName}</span> · {timeStr}
          </div>
        </div>

        {/* The Simple Single Card */}
        <div style={{
          marginTop: 6, padding: '10px 14px',
          background: BG, border: `1px solid ${BRD}`, borderRadius: 6,
        }}>
          
          {/* ── If Task Created ── */}
          {type === 'case_created' && (nv.task_id || nv.client_name) && (
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: 12,
              flexWrap: 'wrap',
            }}>
              {nv.task_id && (
                <>
                  <span style={{
                    fontSize: 10.5,
                    fontWeight: 800,
                    color: MUT,
                    textTransform: 'uppercase',
                  }}>
                    Task ID:
                  </span>
                  <span style={{
                    fontSize: 11.5,
                    fontWeight: 600,
                    color: P,
                    fontFamily: 'monospace',
                    background: PL,
                    padding: '2px 8px',
                    borderRadius: 4,
                    border: `1px solid ${BRD}`,
                  }}>
                    📋 {nv.task_id}
                  </span>
                </>
              )}

              {nv.client_name && (
                <div style={{ fontSize: 11, color: MUT, fontWeight: 600 }}>
                  Client:{' '}
                  <span style={{ color: INK }}>{nv.client_name}</span>
                </div>
              )}
            </div>
          )}

          {/* If Files are attached */}
          {uniqueFiles.length > 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {uniqueFiles.map((f, idx) => (
                <div key={idx} style={{
                  display: 'inline-flex', alignItems: 'center', gap: 6,
                  padding: '4px 8px', background: '#fff', border: `1px solid ${BRD}`, borderRadius: 4, width: 'fit-content'
                }}>
                  <span style={{ fontSize: 12 }}>📄</span>
                  <span style={{ fontSize: 11, fontWeight: 600, color: P }}>{f}</span>
                </div>
              ))}
            </div>
          )}
          
          {/* If SRN Number is logged (e.g. SRN Verification / MCA Outcome) */}
          {nv.srn_number && (
             <div style={{ fontSize: 11, color: MUT, fontWeight: 600, marginTop: uniqueFiles.length > 0 ? 8 : 0 }}>
               SRN: <span style={{ color: INK, fontFamily: 'monospace' }}>{nv.srn_number}</span>
             </div>
          )}

          {/* Rejection Reason Box */}
          {isRejected && reason && (
            <div style={{
              marginTop: 8, padding: '8px 12px', background: '#FEF2F2', border: `1px solid #FECACA`,
              borderRadius: 6, fontSize: 12, color: RED, lineHeight: 1.5,
            }}>
              <b>Reason:</b> {reason}
            </div>
          )}

            {/* ─── Info Update Diff (old → new) ─── */}
          {type === 'info_update' && Object.keys(nv).length > 0 && (
            <div style={{
              display: 'flex', flexDirection: 'column',
              gap: 4, background: BG,
              borderRadius: 6,
            }}>
              <div style={{ fontSize: 9.5, fontWeight: 700, color: MUT, textTransform: 'uppercase', marginBottom: 4 }}>Changed Fields</div>
              {Object.keys(nv).map(key => {
                if (['rejection_reason', 'reason', 'doc_type', 'notice_din'].includes(key)) return null;
                const oldVal = ov[key] || 'None';
                const newVal = nv[key] || 'None';
                return (
                  <div key={key} style={{ fontSize: 11, display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span style={{ fontWeight: 600, color: INK, width: 120, textTransform: 'capitalize' }}>
                      {key.replace(/_/g, ' ')}
                    </span>
                    <span style={{ color: RED, textDecoration: 'line-through' }}>{String(oldVal)}</span>
                    <span style={{ color: MUT }}>→</span>
                    <span style={{ color: GR, fontWeight: 600 }}>{String(newVal)}</span>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function LoadingState() {
  return (
    <div style={{ background: '#fff', border: `1px solid ${BRD}`, borderRadius: 14, overflow: 'hidden' }}>
      <div style={{ padding: '14px 20px', background: '#F8FAFC', borderBottom: `1px solid ${BRD}` }}>
        <div className="lat-skeleton" style={{ width: 140, height: 13 }} />
      </div>
      <div style={{ padding: '12px 20px' }}>
        {[1, 2, 3].map(i => (
          <div key={i} style={{ display: 'flex', gap: 12, padding: '10px 0' }}>
            <div className="lat-skeleton" style={{ width: 10, height: 10, borderRadius: '50%' }} />
            <div style={{ flex: 1 }}>
              <div className="lat-skeleton" style={{ width: '60%', height: 14, marginBottom: 6 }} />
              <div className="lat-skeleton" style={{ width: '40%', height: 11 }} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function CategoryDropdownPortal({ category, setCategory, setCategoryOpen }) {
  const [position, setPosition] = useState(null);
  const menuRef = React.useRef(null);

  useEffect(() => {
    const trigger = document.getElementById('audit-category-trigger');
    if (!trigger) return;
    const place = () => {
      const rect = trigger.getBoundingClientRect();
      const menuWidth = 180;
      let left = Math.max(8, Math.min(rect.right - menuWidth, window.innerWidth - menuWidth - 8));
      setPosition({ top: rect.bottom + 6, left });
    };
    place();
    window.addEventListener('resize', place);
    window.addEventListener('scroll', place, true);
    return () => { window.removeEventListener('resize', place); window.removeEventListener('scroll', place, true); };
  }, []);

  useEffect(() => {
    const onDown = (e) => {
      if (menuRef.current?.contains(e.target)) return;
      if (document.getElementById('audit-category-trigger')?.contains(e.target)) return;
      setCategoryOpen(false);
    };
    const t = setTimeout(() => document.addEventListener('mousedown', onDown), 0);
    return () => { clearTimeout(t); document.removeEventListener('mousedown', onDown); };
  }, [setCategoryOpen]);

  if (!position) return null;

  return ReactDOM.createPortal(
    <div ref={menuRef} style={{ position: 'fixed', top: position.top, left: position.left, minWidth: 180, background: '#fff', border: `1px solid ${BRD}`, borderRadius: 10, boxShadow: '0 8px 24px rgba(0,0,0,0.12)', zIndex: 9999, padding: 4 }} onMouseDown={e => e.stopPropagation()}>
      {AUDIT_CATEGORIES.map(cat => {
        const active = category === cat.id;
        return (
          <button key={cat.id} type="button" onClick={() => { setCategory(cat.id); setCategoryOpen(false); }} style={{ display: 'flex', alignItems: 'center', gap: 8, width: '100%', padding: '8px 10px', background: active ? PL : 'transparent', border: 'none', borderRadius: 6, cursor: 'pointer', fontSize: 12, fontWeight: active ? 700 : 500, color: active ? P : INK, fontFamily: 'inherit', textAlign: 'left' }}>
            <span style={{ flex: 1 }}>{cat.label}</span>
          </button>
        );
      })}
    </div>,
    document.body
  );
}