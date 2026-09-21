
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { api } from '../../services/api';
import ReactDOM from 'react-dom';

const auditTrailApi = {
  list: (params) => api.get('/legal-services/audit-trail/', { params }),
};

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
const FAINT = '#F1F5F9';
const PURPLE = '#6D28D9';
const PURPLE_BG = '#F3E8FF';

const css = `
@keyframes latFadeIn { from { opacity: 0; transform: translateY(4px); } to { opacity: 1; transform: translateY(0); } }
@keyframes latSpin { to { transform: rotate(360deg); } }
@keyframes latShimmer { 0% { background-position: -200% 0; } 100% { background-position: 200% 0; } }
.lat-skeleton { background: linear-gradient(90deg, #EEF0F5 25%, #F7F8FB 37%, #EEF0F5 63%); background-size: 400% 100%; animation: latShimmer 1.4s ease-in-out infinite; border-radius: 6px; }
`;

// ── ONLY the event types we want to show ──
const VISIBLE_TYPES = new Set([
  'case_created', 
  'notice_created',
  'court_notice_uploaded',
  'court_notice_deleted',
  'notice_doc_uploaded',
  'reply_approved',
  'reply_rejected',
  'reply_escalated',
  'ack_approved',
  'ack_rejected',
  'ack_escalated',
  'notice_doc_approved',
  'notice_doc_rejected',
  'notice_doc_escalated',
  'info_update',
  'closure_submitted',
  'closure_approved',
  'closure_rejected',
  'closure_escalated',
]);

const AUDIT_COLORS = {
  'case_created':          { bg: GL,       color: GR,     label: 'Task Created' }, 
  'notice_created':        { bg: GL,       color: GR,     label: 'Notice Created' },
  'court_notice_uploaded': { bg: AMBL,     color: AMB,    label: 'Notice File Uploaded' },
  'court_notice_deleted':  { bg: '#FEF2F2',color: RED,    label: 'Notice File Deleted' },
  'notice_doc_uploaded':   { bg: AMBL,     color: AMB,    label: 'Sent for Review' },
  'reply_approved':        { bg: GL,       color: GR,     label: 'Reply Approved' },
  'reply_rejected':        { bg: '#FEF2F2',color: RED,    label: 'Reply Rejected' },
  'reply_escalated':       { bg: PURPLE_BG,color: PURPLE, label: 'Reply Moved to CEO' },
  'ack_approved':          { bg: GL,       color: GR,     label: 'Ack Approved' },
  'ack_rejected':          { bg: '#FEF2F2',color: RED,    label: 'Ack Rejected' },
  'ack_escalated':         { bg: PURPLE_BG,color: PURPLE, label: 'Ack Moved to CEO' },
  'notice_doc_approved':   { bg: GL,       color: GR,     label: 'Approved' },
  'notice_doc_rejected':   { bg: '#FEF2F2',color: RED,    label: 'Rejected' },
  'notice_doc_escalated':  { bg: PURPLE_BG,color: PURPLE, label: 'Moved to CEO' },
  'info_update':           { bg: PL,       color: P,      label: 'Info Updated' },
  'closure_submitted':     { bg: AMBL,     color: AMB,    label: 'Closure Submitted' },
  'closure_approved':      { bg: GL,       color: GR,     label: 'Case Closed' },
  'closure_rejected':      { bg: '#FEF2F2',color: RED,    label: 'Closure Rejected' },
  'closure_escalated':     { bg: PURPLE_BG,color: PURPLE, label: 'Closure Moved to CEO' },
};

const AUDIT_CATEGORIES = [
  { id: 'all',     label: 'All Events' },
  { id: 'notice',  label: 'Notices' },
  { id: 'reply',   label: 'Replies & Sup Docs' },
  { id: 'ack',     label: 'Acknowledgments' },
  { id: 'reviews', label: 'Reviews (Approve/Reject)' },
  { id: 'closure', label: 'Closure' },
  { id: 'client',  label: 'Client Info' },
];

export default function LegalAuditTrailTab({ clientId, litigationType, courtCaseId, jobId, refreshTick }) {
  const [loading, setLoading] = useState(true);
  const [events, setEvents] = useState([]);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('all');
  const [categoryOpen, setCategoryOpen] = useState(false);

  const load = useCallback(async () => {
    if (!clientId || !litigationType) return;
    setLoading(true);
    setError(null);
    try {
      const params = { client: clientId, litigation_type: litigationType };
      if (jobId) params.job_id = jobId;
      else if (courtCaseId) params.court_case = courtCaseId;
      const res = await auditTrailApi.list(params);
      const data = Array.isArray(res.data) ? res.data : (res.data.results || []);
      setEvents(data);
    } catch (e) {
      console.error(e);
      setError('Failed to load audit trail');
    } finally { setLoading(false); }
  }, [clientId, litigationType, courtCaseId, jobId]);

  useEffect(() => { load(); }, [load, refreshTick]);

  const label = litigationType === 'income-tax' ? 'Income Tax' : 'TDS';

  const filteredEvents = useMemo(() => events.filter(e => {
    const type = e.event_type || '';

    // 1. Only show allowed event types
    if (!VISIBLE_TYPES.has(type)) return false;

    // 2. Category filter
    if (category !== 'all') {
      if (category === 'notice' && !['notice_created', 'court_notice_uploaded', 'court_notice_deleted', 'info_update'].includes(type)) return false;
      if (category === 'reply') {
        if (!['notice_doc_uploaded', 'reply_approved', 'reply_rejected', 'reply_escalated'].includes(type)) return false;
        if (type === 'notice_doc_uploaded' && e.new_values?.doc_type === 'acknowledgment') return false;
      }
      if (category === 'ack') {
        const dt = e.new_values?.doc_type || '';
        const isAckOnlySubmit =
          type === 'notice_doc_uploaded' &&
          (dt === 'acknowledgment' ||
            ((e.new_values?.ack_files || []).length > 0 &&
              !(e.new_values?.reply_files || []).length &&
              !(e.new_values?.supporting_docs || []).length));
        if (!['ack_approved', 'ack_rejected', 'ack_escalated'].includes(type) && !isAckOnlySubmit) return false;
      }
      if (category === 'reviews' && !type.includes('approved') && !type.includes('rejected') && !type.includes('escalated')) return false;
      if (category === 'closure' && !type.startsWith('closure_')) return false;
      if (category === 'client' && type !== 'info_update') return false;
    }

    // 3. Search filter
    if (search) {
      const q = search.toLowerCase();
      const t = (e.title || '').toLowerCase();
      const fname = (e.new_values?.file_name || '').toLowerCase();
      const din = (e.new_values?.notice_din || '').toLowerCase();
      const byName = (e.by_name || '').toLowerCase();
      if (!t.includes(q) && !fname.includes(q) && !din.includes(q) && !byName.includes(q)) return false;
    }

    return true;
  }), [events, category, search]);

  if (loading) return <div><style>{css}</style><LoadingState /></div>;
  if (error) return <div><style>{css}</style><ErrorState message={error} onRetry={load} /></div>;

  return (
    <div>
      <style>{css}</style>
      <div style={{ background: '#fff', border: `1px solid ${BRD}`, borderRadius: 14, overflow: 'hidden', boxShadow: '0 2px 8px rgba(20,20,40,0.05)', animation: 'latFadeIn 0.3s ease both' }}>

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 20px', background: 'linear-gradient(90deg, #f5f7fb, #eef2ff)', borderBottom: `1px solid ${BRD}`, flexWrap: 'wrap', gap: 10 }}>
          <div>
            <div style={{ fontSize: 14, fontWeight: 800, color: INK, letterSpacing: '-0.01em' }}>Audit Trail — {label}</div>
            <div style={{ fontSize: 11, color: MUT, marginTop: 1, fontWeight: 500 }}>{filteredEvents.length} {filteredEvents.length === 1 ? 'entry' : 'entries'}</div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{ position: 'relative' }}>
              <button id="audit-category-trigger" type="button" onClick={(e) => { e.stopPropagation(); e.preventDefault(); setCategoryOpen(o => !o); }} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '6px 12px', borderRadius: 7, border: `1px solid ${category !== 'all' ? P : BRD}`, background: category !== 'all' ? PL : '#fff', color: category !== 'all' ? P : MUT, fontSize: 11.5, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>
                🔽 {AUDIT_CATEGORIES.find(c => c.id === category)?.label || 'All Events'}
              </button>
              {categoryOpen && <CategoryDropdownPortal category={category} events={events} setCategory={setCategory} setCategoryOpen={setCategoryOpen} />}
            </div>
            <div style={{ position: 'relative' }}>
              <span style={{ position: 'absolute', left: 9, top: '50%', transform: 'translateY(-50%)', fontSize: 11, color: MUT, pointerEvents: 'none' }}>🔍</span>
              <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search…" style={{ padding: '6px 26px', borderRadius: 7, border: `1px solid ${search ? P : BRD}`, background: search ? PL : '#fff', fontSize: 12, fontFamily: 'inherit', outline: 'none', width: 160, color: INK }} />
              {search && <button onClick={() => setSearch('')} style={{ position: 'absolute', right: 6, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: MUT, fontSize: 14, padding: 0 }}>×</button>}
            </div>
            <button onClick={load} disabled={loading} style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '6px 12px', borderRadius: 7, border: `1px solid ${BRD}`, background: '#fff', fontSize: 11, fontWeight: 600, color: MUT, cursor: loading ? 'wait' : 'pointer', fontFamily: 'inherit' }}>
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" style={{ animation: loading ? 'latSpin 0.7s linear infinite' : 'none' }}><polyline points="23 4 23 10 17 10" /><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10" /></svg>
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
            filteredEvents.map((log, i) => <AuditEventRow key={log.id || i} log={log} isLast={i === filteredEvents.length - 1} index={i} />)
          )}
        </div>
      </div>
    </div>
  );
}

function AuditEventRow({ log, isLast, index }) {
  const type = log.event_type || '';
  const meta = AUDIT_COLORS[type] || { bg: FAINT, color: MUT, label: type };
  const timeStr = new Date(log.created_at).toLocaleString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', hour12: true }).replace('AM', 'am').replace('PM', 'pm');
  const userName = log.by_name || 'System';
  const nv = log.new_values || {};
  const ov = log.old_values || {};

  // Actor prefix
  let actorPrefix = 'By';

  if (type === 'case_created') actorPrefix = 'Created by'; // <--- ADD THIS LINE
  else if (type === 'closure_approved') actorPrefix = 'Approved by';
  else if (type.includes('approved')) actorPrefix = 'Approved by';
  else if (type.includes('rejected')) actorPrefix = 'Rejected by';
  else if (type.includes('escalated')) actorPrefix = 'Moved to CEO by';
  else if (type === 'court_notice_deleted') actorPrefix = 'Deleted by';
  else if (type === 'court_notice_uploaded') actorPrefix = 'Uploaded by';
  else if (type === 'notice_doc_uploaded') actorPrefix = 'Submitted by';
  else if (type === 'notice_created') actorPrefix = 'Created by';
  else if (type === 'info_update') actorPrefix = 'Updated by';
  else if (type === 'closure_submitted') actorPrefix = 'Submitted by';

  // File info
  const mainFile = nv.file_name;
  const supFiles = Array.isArray(nv.supporting_docs) ? nv.supporting_docs.filter(Boolean) : [];
  const rawReplyFiles = Array.isArray(nv.reply_files) ? nv.reply_files.filter(Boolean) : [];
  const ackFiles = Array.isArray(nv.ack_files) ? nv.ack_files.filter(Boolean) : [];
  const din = nv.notice_din;
  const reason = nv.rejection_reason || nv.reason;
  const docType = nv.doc_type || '';
  const closureDocs = nv.closure_documents || {};

  const isRejected = type.includes('rejected');
  const isApproved = type.includes('approved');
  const isInfoUpdate = type === 'info_update';

  // Ack-only "Sent for Review" (do not treat as reply)
  const isAckSubmit =
    type === 'notice_doc_uploaded' &&
    (
      docType === 'acknowledgment' ||
      (ackFiles.length > 0 && rawReplyFiles.length === 0 && supFiles.length === 0)
    );

  // Reply "Sent for Review" (upload / HTML reply path)
  const isReplySubmit =
    type === 'notice_doc_uploaded' &&
    !isAckSubmit &&
    (
      docType === 'reply' ||
      docType === 'pending' ||
      rawReplyFiles.length > 0 ||
      supFiles.length > 0 ||
      (!docType && ackFiles.length === 0)
    );

  // Never put ack file_name into REPLY
  const replyFiles =
    rawReplyFiles.length > 0
      ? rawReplyFiles
      : (isReplySubmit && mainFile ? [mainFile] : []);

  const ackDisplayFiles =
    ackFiles.length > 0
      ? ackFiles
      : (isAckSubmit && mainFile ? [mainFile] : []);

  // Which card to render?
  const isReplyLifecycle =
    ['reply_approved', 'reply_rejected', 'reply_escalated'].includes(type) || isReplySubmit;

  const isAckLifecycle =
    ['ack_approved', 'ack_rejected', 'ack_escalated'].includes(type) || isAckSubmit;

  const isNoticeFile = ['court_notice_uploaded', 'court_notice_deleted'].includes(type);
  const isClosure = Object.keys(closureDocs).length > 0;
  const isNoticeCreated = type === 'notice_created';
  const isTaskCreated = type === 'case_created';

  return (
    <div style={{ display: 'flex', gap: 12, padding: '12px 0', borderBottom: isLast ? 'none' : `1px solid ${BRD}`, animation: `latFadeIn 0.3s ease ${Math.min(index * 0.03, 0.2)}s both` }}>
      {/* Timeline dot */}
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flexShrink: 0 }}>
        <div style={{ width: 10, height: 10, borderRadius: '50%', background: meta.color, marginTop: 4, boxShadow: `0 0 0 3px ${meta.bg}` }} />
        {!isLast && <div style={{ width: 1, flex: 1, background: BRD, marginTop: 3 }} />}
      </div>

      {/* Content */}
      <div style={{ flex: 1, minWidth: 0 }}>
        {/* Top row */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 5, flexWrap: 'wrap', gap: 8 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', minWidth: 0 }}>
            <span style={{ fontSize: 10, padding: '2px 8px', borderRadius: 99, fontWeight: 700, background: meta.bg, color: meta.color, textTransform: 'uppercase', letterSpacing: '.03em', whiteSpace: 'nowrap' }}>{meta.label}</span>
            {log.title && <span style={{ fontSize: 12, fontWeight: 600, color: INK, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 400 }}>{log.title}</span>}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, color: MUT, whiteSpace: 'nowrap' }}>
            <span>{actorPrefix}</span>
            <span style={{ fontWeight: 700, color: INK }}>{userName}</span>
            <span>·</span>
            <span>{timeStr}</span>
          </div>
        </div>

        {/* ─── Task Created Card (STT Task ID Display) ─── */}
        {isTaskCreated && (
          <div style={{
            marginTop: 6, padding: '10px 14px',
            background: BG, border: `1px solid ${BRD}`,
            borderRadius: 6,
            display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap',
          }}>
            <span style={{ fontSize: 10.5, fontWeight: 800, color: MUT, textTransform: 'uppercase', letterSpacing: '.04em' }}>Task ID:</span>
            <span style={{
              fontSize: 11.5, fontWeight: 600, color: P,
              padding: '2px 8px', borderRadius: 4,
              background: PL, border: `1px solid ${BRD}`,
              fontFamily: 'monospace',
            }}>
              📋 {nv.task_id || 'N/A'}
            </span>
            {nv.client_name && (
              <div style={{ fontSize: 11, color: MUT, fontWeight: 600 }}>
                Client: <span style={{ color: INK }}>{nv.client_name}</span>
              </div>
            )}
          </div>
        )}

        {/* ─── Reply Lifecycle Card (REPLY: xxx | SUP DOC: xxx) ─── */}
        {isReplyLifecycle && (replyFiles.length > 0 || supFiles.length > 0) && (
          <div style={{
            marginTop: 6, padding: '10px 14px',
            background: BG, border: `1px solid ${BRD}`,
            borderRadius: 6,
            display: 'grid',
            gridTemplateColumns: 'auto 1fr auto 1fr',
            columnGap: 12, rowGap: 4, alignItems: 'start',
          }}>
            {/* REPLY column */}
            <span style={{ fontSize: 10.5, fontWeight: 800, color: MUT, textTransform: 'uppercase', letterSpacing: '.04em' }}>Reply:</span>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              {replyFiles.length === 0 ? (
                <span style={{ fontSize: 11, color: MUT, fontStyle: 'italic' }}>—</span>
              ) : (
                replyFiles.map((f, idx) => (
                  <span key={idx} style={{
                    fontSize: 11.5, fontWeight: 600, color: P,
                    padding: '2px 8px', borderRadius: 4,
                    background: PL, border: `1px solid ${BRD}`,
                    fontFamily: 'monospace', width: 'fit-content',
                  }}>
                    📄 {f}{isApproved && ' ✓'}{isRejected && ' ✕'}
                  </span>
                ))
              )}
            </div>

            {/* SUP DOC column */}
            <span style={{ fontSize: 10.5, fontWeight: 800, color: MUT, textTransform: 'uppercase', letterSpacing: '.04em' }}>Sup Doc:</span>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              {supFiles.length === 0 ? (
                <span style={{ fontSize: 11, color: MUT, fontStyle: 'italic' }}>—</span>
              ) : (
                supFiles.map((sf, idx) => (
                  <span key={idx} style={{
                    fontSize: 11.5, fontWeight: 600, color: '#475569',
                    padding: '2px 8px', borderRadius: 4,
                    background: '#fff', border: `1px solid ${BRD}`,
                    fontFamily: 'monospace', width: 'fit-content',
                  }}>
                    📎 {sf}{isApproved && ' ✓'}{isRejected && ' ✕'}
                  </span>
                ))
              )}
            </div>

            

            {/* DIN row */}
            {din && (
              <div style={{
                gridColumn: '1 / -1', fontSize: 10, color: MUT,
                fontWeight: 600, marginTop: 4,
              }}>
                DIN: {din}
              </div>
            )}
          </div>
        )}

        {/* ─── Notice File Card (Uploaded / Deleted) ─── */}
        {isNoticeFile && mainFile && (
          <div style={{
            marginTop: 6, padding: '10px 14px',
            background: BG, border: `1px solid ${BRD}`,
            borderRadius: 6,
            display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap',
          }}>
            <span style={{ fontSize: 10.5, fontWeight: 800, color: MUT, textTransform: 'uppercase', letterSpacing: '.04em' }}>Notice File:</span>
            <span style={{
              fontSize: 11.5, fontWeight: 600, color: P,
              padding: '2px 8px', borderRadius: 4,
              background: PL, border: `1px solid ${BRD}`,
              fontFamily: 'monospace',
            }}>
              📋 {mainFile}{type === 'court_notice_deleted' && ' ✕'}
            </span>
            {din && <div style={{ fontSize: 10, color: MUT, fontWeight: 600, width: '100%' }}>DIN: {din}</div>}
          </div>
        )}

        {/* ─── Ack Lifecycle Card (submit / approve / reject / move to CEO) ─── */}
        {isAckLifecycle && (ackDisplayFiles.length > 0 || mainFile) && (
          <div style={{
            marginTop: 6, padding: '10px 14px',
            background: BG, border: `1px solid ${BRD}`,
            borderRadius: 6,
            display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap',
          }}>
            <span style={{ fontSize: 10.5, fontWeight: 800, color: MUT, textTransform: 'uppercase', letterSpacing: '.04em' }}>Acknowledgment:</span>
            {(ackDisplayFiles.length > 0 ? ackDisplayFiles : [mainFile]).map((af, idx) => (
              <span key={idx} style={{
                fontSize: 11.5, fontWeight: 600, color: PURPLE,
                padding: '2px 8px', borderRadius: 4,
                background: PURPLE_BG, border: `1px solid ${BRD}`,
                fontFamily: 'monospace',
              }}>
                📥 {af}{isApproved && ' ✓'}{isRejected && ' ✕'}
              </span>
            ))}
            {din && <div style={{ fontSize: 10, color: MUT, fontWeight: 600, width: '100%' }}>DIN: {din}</div>}
          </div>
        )}

        {/* ─── Notice Created Info ─── */}
        {isNoticeCreated && (
          <div style={{
            marginTop: 6, padding: '10px 14px',
            background: BG, border: `1px solid ${BRD}`,
            borderRadius: 6,
            display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 6,
          }}>
            {nv.din_number && (
              <div style={{ fontSize: 11 }}>
                <span style={{ fontWeight: 700, color: MUT }}>DIN:</span>{' '}
                <span style={{ color: INK, fontFamily: 'monospace' }}>{nv.din_number}</span>
              </div>
            )}
            {nv.officer && (
              <div style={{ fontSize: 11 }}>
                <span style={{ fontWeight: 700, color: MUT }}>Officer:</span>{' '}
                <span style={{ color: INK }}>{nv.officer}</span>
              </div>
            )}
            {nv.notice_date && (
              <div style={{ fontSize: 11 }}>
                <span style={{ fontWeight: 700, color: MUT }}>Notice Date:</span>{' '}
                <span style={{ color: INK }}>{nv.notice_date}</span>
              </div>
            )}
            {nv.due_date && (
              <div style={{ fontSize: 11 }}>
                <span style={{ fontWeight: 700, color: MUT }}>Due Date:</span>{' '}
                <span style={{ color: INK }}>{nv.due_date}</span>
              </div>
            )}
          </div>
        )}

        {/* ─── Closure Docs Card ─── */}
        {isClosure && (
          <div style={{
            marginTop: 6, padding: '10px 14px',
            background: BG, border: `1px solid ${BRD}`,
            borderRadius: 6,
            display: 'flex', flexDirection: 'column', gap: 4,
          }}>
            {closureDocs.order && (
              <span style={{ fontSize: 11.5, fontWeight: 600, color: P, fontFamily: 'monospace' }}>
                📜 Order: {closureDocs.order}
              </span>
            )}
            {closureDocs.demand_notice && (
              <span style={{ fontSize: 11.5, fontWeight: 600, color: P, fontFamily: 'monospace' }}>
                💰 Demand Notice: {closureDocs.demand_notice}
              </span>
            )}
            {closureDocs.computation_sheet && (
              <span style={{ fontSize: 11.5, fontWeight: 600, color: P, fontFamily: 'monospace' }}>
                📊 Computation Sheet: {closureDocs.computation_sheet}
              </span>
            )}
          </div>
        )}

        {/* ─── Rejection Reason ─── */}
        {isRejected && reason && (
          <div style={{
            marginTop: 6, padding: '8px 12px',
            background: '#FEF2F2', border: `1px solid #FECACA`,
            borderRadius: 6, fontSize: 12, color: RED, lineHeight: 1.5,
          }}>
            <b>Reason:</b> {reason}
          </div>
        )}

        {/* ─── Info Update Diff (old → new) ─── */}
        {isInfoUpdate && Object.keys(nv).length > 0 && (
          <div style={{
            marginTop: 8, display: 'flex', flexDirection: 'column',
            gap: 4, background: BG, padding: 8,
            borderRadius: 6, border: `1px solid ${BRD}`,
          }}>
            <div style={{ fontSize: 9.5, fontWeight: 700, color: MUT, textTransform: 'uppercase' }}>Changed Fields</div>
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
  );
}

function LoadingState() {
  return (
    <div style={{ background: '#fff', border: `1px solid ${BRD}`, borderRadius: 14, overflow: 'hidden', boxShadow: '0 2px 8px rgba(20,20,40,0.05)' }}>
      <div style={{ padding: '14px 20px', background: 'linear-gradient(90deg, #f5f7fb, #eef2ff)', borderBottom: `1px solid ${BRD}` }}>
        <div className="lat-skeleton" style={{ width: 140, height: 13, marginBottom: 5 }} />
        <div className="lat-skeleton" style={{ width: 80, height: 10 }} />
      </div>
      <div style={{ padding: '12px 20px' }}>
        {[1, 2, 3, 4, 5].map(i => (
          <div key={i} style={{ display: 'flex', gap: 12, padding: '10px 0', borderBottom: i < 5 ? `1px solid ${BRD}` : 'none' }}>
            <div className="lat-skeleton" style={{ width: 10, height: 10, borderRadius: '50%', marginTop: 4, flexShrink: 0 }} />
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

function ErrorState({ message, onRetry }) {
  return (
    <div style={{ background: '#fff', border: `1px solid ${BRD}`, borderRadius: 14, padding: '40px 20px', textAlign: 'center' }}>
      <div style={{ fontSize: 32, marginBottom: 10, opacity: 0.6 }}>⚠️</div>
      <div style={{ fontSize: 14, fontWeight: 700, color: RED, marginBottom: 12 }}>{message}</div>
      <button onClick={onRetry} style={{ padding: '8px 20px', borderRadius: 8, border: 'none', background: 'linear-gradient(135deg, #214274, #205995)', color: 'white', fontSize: 12.5, fontWeight: 700, cursor: 'pointer' }}>Retry</button>
    </div>
  );
}

function CategoryDropdownPortal({ category, events, setCategory, setCategoryOpen }) {
  const [position, setPosition] = useState(null);
  const menuRef = React.useRef(null);

  useEffect(() => {
    const trigger = document.getElementById('audit-category-trigger');
    if (!trigger) return;
    const place = () => {
      const rect = trigger.getBoundingClientRect();
      const menuWidth = 220;
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

  const getCount = (catId) => {
    const visible = events.filter(e => VISIBLE_TYPES.has(e.event_type));
    if (catId === 'all') return visible.length;
    return visible.filter(e => {
      const t = e.event_type;
      if (catId === 'notice') return ['notice_created', 'court_notice_uploaded', 'court_notice_deleted', 'info_update'].includes(t);
      if (catId === 'reply') return ['notice_doc_uploaded', 'reply_approved', 'reply_rejected', 'reply_escalated'].includes(t);
      if (catId === 'ack') return ['ack_approved', 'ack_rejected', 'ack_escalated'].includes(t);
      if (catId === 'reviews') return t.includes('approved') || t.includes('rejected') || t.includes('escalated');
      if (catId === 'closure') return t.startsWith('closure_');
      if (catId === 'client') return t === 'info_update';
      return false;
    }).length;
  };

  return ReactDOM.createPortal(
    <div ref={menuRef} style={{ position: 'fixed', top: position.top, left: position.left, minWidth: 220, background: '#fff', border: `1px solid ${BRD}`, borderRadius: 10, boxShadow: '0 8px 24px rgba(0,0,0,0.12)', zIndex: 9999, padding: 4 }} onMouseDown={e => e.stopPropagation()}>
      {AUDIT_CATEGORIES.map(cat => {
        const active = category === cat.id;
        return (
          <button key={cat.id} type="button" onClick={() => { setCategory(cat.id); setCategoryOpen(false); }} style={{ display: 'flex', alignItems: 'center', gap: 8, width: '100%', padding: '8px 10px', background: active ? PL : 'transparent', border: 'none', borderRadius: 6, cursor: 'pointer', fontSize: 12, fontWeight: active ? 700 : 500, color: active ? P : INK, fontFamily: 'inherit', textAlign: 'left' }}>
            <span style={{ flex: 1 }}>{cat.label}</span>
            <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 7px', borderRadius: 99, background: active ? P : BG, color: active ? '#fff' : MUT }}>{getCount(cat.id)}</span>
          </button>
        );
      })}
    </div>,
    document.body
  );
}