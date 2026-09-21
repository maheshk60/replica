// MCAReviewTab.js — Checker & CEO Review Tab
import React, { useState, useEffect, useCallback } from 'react';
import { api } from '../../../services/api';
import { useAuth } from '../../../contexts/AuthContext';
import RejectModal, { AcceptModal } from '../RejectModal'; 

const C = {
  navy: '#1E3A6B', ink: '#0F172A', slate: '#475569', muted: '#94A3B8',
  border: '#E8ECF4', borderLight: '#F1F5F9',
  bg: '#F8FAFC', bgSoft: '#FBFCFE',
  green: '#0F7A5A', greenBg: '#E6F5EF', greenBorder: '#B4DFCF',
  red: '#B42318', redBg: '#FCEBEA', redBorder: '#F2C1BC',
  amber: '#92620B', amberBg: '#FBF2DE', amberBorder: '#F0DDA3',
  purple: '#6D28D9', purpleBg: '#F1E8FE', purpleBorder: '#DCC8FA',
  blue: '#2563EB', blueBg: '#E8F0FE', blueBorder: '#C5D5EF',
};
const MUT = '#8A8FA3';

const STATUS_META = {
  pending:   { label: 'Pending Review', color: C.amber,  bg: C.amberBg,  border: C.amberBorder },
  approved:  { label: 'Approved',       color: C.green,  bg: C.greenBg,  border: C.greenBorder },
  accepted:  { label: 'Approved',       color: C.green,  bg: C.greenBg,  border: C.greenBorder },
  rejected:  { label: 'Rejected',       color: C.red,    bg: C.redBg,    border: C.redBorder },
  escalated: { label: 'Under CEO Review', color: C.purple, bg: C.purpleBg, border: C.purpleBorder },
};

const DOC_TYPE_META = {
  pending_draft:  { label: 'Draft Form PDF', icon: '📄' },
  draft_form:     { label: 'Draft Form PDF', icon: '📄' },
  srn_receipt:    { label: 'SRN Receipt',    icon: '🧾' },
  challan:        { label: 'Challan Receipt',icon: '🧾' },
  acknowledgment: { label: 'Acknowledgment', icon: '✅' },
};

function fmtDateTime(d) {
  if (!d) return '';
  return new Date(d).toLocaleString('en-IN', {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit', hour12: true,
  });
}

function DocReviewCard({ doc, filing, canReview, onApprove, onReject, onOpen, onDownload, busy }) {
  const meta = DOC_TYPE_META[doc.doc_type] || { label: doc.doc_type, icon: '📄' };
  const statusMeta = STATUS_META[doc.review_status] || STATUS_META.pending;

  return (
    <div style={{
      background: '#fff', border: `1px solid ${C.border}`, borderRadius: 10, padding: 16,
      boxShadow: '0 2px 6px rgba(15,23,42,0.04)', marginBottom: 12
    }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14 }}>
        <div style={{
          width: 40, height: 40, borderRadius: 10, background: C.blueBg,
          border: `1px solid ${C.blueBorder}`, display: 'flex', alignItems: 'center',
          justifyContent: 'center', fontSize: 18, flexShrink: 0,
        }}>
          {meta.icon}
        </div>

        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 4 }}>
            <span style={{ fontSize: 14, fontWeight: 700, color: C.ink }}>{meta.label}</span>
            <span style={{
              fontSize: 10, fontWeight: 800, padding: '3px 10px', borderRadius: 999,
              background: statusMeta.bg, color: statusMeta.color, border: `1px solid ${statusMeta.border}`,
              textTransform: 'uppercase', letterSpacing: '0.04em'
            }}>
              {statusMeta.label}
            </span>
          </div>

          <div style={{ fontSize: 11.5, color: MUT, marginBottom: 12 }}>
            Uploaded by <b style={{ color: C.slate }}>{doc.uploaded_by_name || 'Maker'}</b>
            {' · '}{fmtDateTime(doc.uploaded_at)}
          </div>

          <div style={{
            display: 'inline-flex', alignItems: 'center', gap: 10, padding: '8px 12px',
            background: C.bgSoft, border: `1px solid ${C.borderLight}`, borderRadius: 8,
            marginBottom: 12, maxWidth: '100%',
          }}>
            <span style={{ fontSize: 14 }}>📄</span>
            <span
              onClick={onOpen}
              title={doc.file_name}
              style={{
                fontSize: 12, fontWeight: 600, color: C.blue, cursor: 'pointer',
                textDecoration: 'underline', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
              }}
            >
              {doc.file_name || 'document.pdf'}
            </span>
            <button
              type="button"
              onClick={onDownload}
              title="Download File"
              style={{
                width: 24, height: 24, border: `1px solid ${C.border}`, borderRadius: 4,
                background: '#fff', color: C.slate, cursor: 'pointer', fontSize: 11, flexShrink: 0,
                display: 'flex', alignItems: 'center', justifyContent: 'center'
              }}
            >
              ⬇
            </button>
          </div>

          {doc.review_status === 'rejected' && doc.review_note && (
            <div style={{
              padding: '10px 12px', background: C.redBg, border: `1px solid ${C.redBorder}`,
              borderRadius: 8, fontSize: 12, color: C.red, marginBottom: 12,
            }}>
              <b>Rejection reason:</b> {doc.review_note}
            </div>
          )}

          {canReview ? (
            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', borderTop: `1px solid ${C.borderLight}`, paddingTop: 12 }}>
              <button
                type="button"
                onClick={onReject}
                disabled={busy}
                style={{
                  padding: '7px 16px', border: `1px solid ${C.redBorder}`, borderRadius: 6,
                  background: '#fff', color: C.red, fontSize: 12, fontWeight: 700, cursor: 'pointer',
                }}
              >
                Reject
              </button>
              <button
                type="button"
                onClick={onApprove}
                disabled={busy}
                style={{
                  padding: '7px 18px', border: 'none', borderRadius: 6,
                  background: busy ? C.muted : C.green, color: '#fff', fontSize: 12, fontWeight: 700,
                  cursor: busy ? 'wait' : 'pointer', boxShadow: '0 2px 6px rgba(15,122,90,0.2)'
                }}
              >
                {busy ? 'Working...' : '✓ Approve'}
              </button>
            </div>
          ) : (
            ['pending', 'escalated'].includes(doc.review_status) && (
              <div style={{ fontSize: 11, color: MUT, fontStyle: 'italic', textAlign: 'right' }}>
                Waiting for Checker or CEO decision
              </div>
            )
          )}
        </div>
      </div>
    </div>
  );
}

export default function MCAReviewTab({ mcaCase, refreshTick, onUpdated }) {
  const { user } = useAuth();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [busyId, setBusyId] = useState(null);

  const [rejectTarget, setRejectTarget] = useState(null);
  const [acceptTarget, setAcceptTarget] = useState(null);
  const [historyOpen, setHistoryOpen] = useState(false);

  const userRole = (user?.role || '').toLowerCase();
  const isFounder = ['founder', 'admin'].includes(userRole);
  const isAdmin = ['admin', 'founder', 'manager'].includes(userRole);
  const isAssignedChecker = (mcaCase?.checkers || []).some(
    (c) => (c.id || c) === user?.id
  );

  const load = useCallback(async () => {
    if (!mcaCase?.id) {
      setItems([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // 1. Fetch filings for this case
      const res = await api.get('/legal-services/mca-filings/', {
        params: { mca_case: mcaCase.id },
      });
      const filings = Array.isArray(res.data) ? res.data : (res.data.results || []);

      // 2. Fetch documents directly for all filings
      const allFetchedDocs = [];
      for (const filing of filings) {
        try {
          const docRes = await api.get('/legal-services/mca-filing-documents/', {
            params: { filing: filing.id },
          });
          const docList = Array.isArray(docRes.data) ? docRes.data : (docRes.data.results || []);
          docList.forEach(d => {
            if (['pending', 'escalated', 'approved', 'rejected', 'accepted'].includes(d.review_status)) {
              allFetchedDocs.push({ ...d, filing });
            }
          });
        } catch (e) {
          console.error("Failed to load filing documents:", e);
        }
      }

      // Sort newest first
      allFetchedDocs.sort((a, b) => new Date(b.uploaded_at || 0) - new Date(a.uploaded_at || 0));
      setItems(allFetchedDocs);
    } catch (e) {
      console.error('MCA Review load error:', e);
      setError(e?.response?.data?.detail || 'Failed to load reviews');
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, [mcaCase?.id]);

  useEffect(() => {
    load();
  }, [load, refreshTick]);

  const canReviewDoc = (doc) => {
    if (doc.review_status === 'escalated') return isFounder;
    if (doc.review_status === 'pending') return isAssignedChecker;
    return false;
  };

  const activeItems = items.filter((d) => ['pending', 'escalated'].includes(d.review_status));
  const historyItems = items.filter((d) => ['approved', 'rejected', 'accepted'].includes(d.review_status));

  // ── APPROVE (or Escalate to CEO) ──
  const doApprove = async (moveToCeo) => {
    const doc = acceptTarget;
    if (!doc) return;
    setBusyId(doc.id);
    try {
      if (moveToCeo) {
        await api.post(`/legal-services/mca-filing-documents/${doc.id}/escalate/`);
      } else {
        await api.post(`/legal-services/mca-filing-documents/${doc.id}/approve/`);
      }
      setAcceptTarget(null);
      await load();
      onUpdated?.();
    } catch (e) {
      console.error(e);
      throw e;
    } finally {
      setBusyId(null);
    }
  };

  // ── REJECT ──
  const doReject = async (reason) => {
    const doc = rejectTarget;
    if (!doc) return;
    setBusyId(doc.id);
    try {
      await api.post(`/legal-services/mca-filing-documents/${doc.id}/reject/`, { reason });
      setRejectTarget(null);
      await load();
      onUpdated?.();
    } catch (e) {
      console.error(e);
      throw e;
    } finally {
      setBusyId(null);
    }
  };

  const openDoc = (doc) => {
    const url = doc?.file_url || doc?.file;
    if (url) window.open(url, '_blank', 'noopener,noreferrer');
  };

  const downloadDoc = async (doc) => {
    const url = doc?.file_url || doc?.file;
    if (!url) return;
    try {
      const r = await fetch(url);
      const b = await r.blob();
      const u = URL.createObjectURL(b);
      const a = document.createElement('a');
      a.href = u;
      a.download = doc.file_name || 'document.pdf';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(u);
    } catch (e) {
      console.error("Download failed", e);
    }
  };

  if (!mcaCase?.id) {
    return (
      <div style={{ padding: 40, textAlign: 'center', color: MUT, background: '#fff', borderRadius: 12, border: `1px solid ${C.border}` }}>
        No MCA case loaded.
      </div>
    );
  }

  return (
    <div style={{ fontFamily: "'Roboto', sans-serif" }}>
      {error && (
        <div style={{
          marginBottom: 16, padding: '12px 16px', background: C.redBg, border: `1px solid ${C.redBorder}`,
          borderRadius: 8, color: C.red, fontSize: 13, fontWeight: 600,
        }}>
          ⚠️ {error}
        </div>
      )}

      {loading && (
        <div style={{ padding: 40, textAlign: 'center', color: MUT, fontSize: 13, background: '#fff', borderRadius: 10, border: `1px solid ${C.border}` }}>
          Loading review items...
        </div>
      )}

      {!loading && (
        <div style={{ background: '#fff', border: `1px solid ${C.border}`, borderRadius: 12, overflow: 'hidden' }}>
          
          {/* ── Active Reviews ── */}
          <div style={{ padding: 20 }}>
            <div style={{
              display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16,
              paddingBottom: 10, borderBottom: `1px solid ${C.borderLight}`,
            }}>
              <span style={{ fontSize: 13, fontWeight: 800, color: C.ink, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                Active Reviews
              </span>
              <span style={{
                fontSize: 11, fontWeight: 700, color: MUT, background: C.bg,
                border: `1px solid ${C.border}`, padding: '2px 9px', borderRadius: 99,
              }}>
                {activeItems.length}
              </span>
            </div>

            {activeItems.length === 0 ? (
              <div style={{ padding: '50px 20px', textAlign: 'center' }}>
                <div style={{ fontSize: 36, opacity: 0.4, marginBottom: 8 }}>📋</div>
                <div style={{ fontSize: 14, fontWeight: 700, color: C.slate }}>No active reviews pending</div>
                <div style={{ fontSize: 12, color: MUT, marginTop: 6 }}>
                  When Maker clicks <b>Send for Review</b> in the Activity tab, the document will appear here for review.
                </div>
              </div>
            ) : (
              <div>
                {activeItems.map((doc) => (
                  <DocReviewCard
                    key={doc.id}
                    doc={doc}
                    filing={doc.filing}
                    canReview={canReviewDoc(doc)}
                    busy={busyId === doc.id}
                    onApprove={() => setAcceptTarget(doc)}
                    onReject={() => setRejectTarget(doc)}
                    onOpen={() => openDoc(doc)}
                    onDownload={() => downloadDoc(doc)}
                  />
                ))}
              </div>
            )}
          </div>

          {/* ── Completed History ── */}
          <div style={{ borderTop: `1px solid ${C.border}`, background: historyOpen ? C.bgSoft : '#FAFBFD' }}>
            <div
              onClick={() => setHistoryOpen(!historyOpen)}
              style={{ padding: '14px 20px', display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer' }}
            >
              <span style={{
                fontSize: 12, color: C.slate,
                transform: historyOpen ? 'rotate(90deg)' : 'rotate(0deg)', transition: 'transform 0.15s',
              }}>
                ▶
              </span>
              <span style={{ fontSize: 13, fontWeight: 800, color: C.ink, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                Review History
              </span>
              <span style={{
                fontSize: 11, fontWeight: 700, color: MUT, background: '#fff',
                border: `1px solid ${C.border}`, padding: '2px 9px', borderRadius: 99,
              }}>
                {historyItems.length}
              </span>
            </div>

            {historyOpen && (
              <div style={{ padding: '4px 20px 16px', background: '#fff', borderTop: `1px solid ${C.borderLight}` }}>
                {historyItems.length === 0 ? (
                  <div style={{ padding: 20, textAlign: 'center', fontSize: 12, color: MUT, fontStyle: 'italic' }}>
                    No completed reviews in history yet.
                  </div>
                ) : (
                  <div style={{ paddingTop: 10 }}>
                    {historyItems.map((doc) => (
                      <DocReviewCard
                        key={doc.id}
                        doc={doc}
                        filing={doc.filing}
                        canReview={false}
                        onOpen={() => openDoc(doc)}
                        onDownload={() => downloadDoc(doc)}
                      />
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Reject Modal */}
      {rejectTarget && (
        <RejectModal
          review={rejectTarget}
          onClose={() => setRejectTarget(null)}
          onRejected={doReject}
        />
      )}

      {/* Accept Modal with Move to CEO option */}
      {acceptTarget && (
        <AcceptModal
          review={acceptTarget}
          onClose={() => setAcceptTarget(null)}
          onAccepted={doApprove}
          showEscalate={isAssignedChecker && acceptTarget.review_status === 'pending'}
        />
      )}
    </div>
  );
}