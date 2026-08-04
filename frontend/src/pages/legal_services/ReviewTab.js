
// legal_services/ReviewTab.js

import React, { useState, useEffect, useCallback } from 'react';
import { api } from '../../services/api';
import { useAuth } from '../../contexts/AuthContext';
import RejectModal, { AcceptModal } from './RejectModal';

/* ─── LOCAL API DEFINITIONS (used only by this file) ─── */
const reviewApi = {
  // List reviews (filter by court_case, client, status, litigation_type)
  list: (params) =>
    api.get('/legal-services/reviews/', { params }),

  // My inbox — pending reviews for the current user
  pendingForMe: () =>
    api.get('/legal-services/reviews/pending-for-me/'),

  // Single review
  getById: (id) =>
    api.get(`/legal-services/reviews/${id}/`),

  // Approve → applies the action
  approve: (id) =>
    api.post(`/legal-services/reviews/${id}/approve/`),

  // Reject with reason
  reject: (id, reason) =>
    api.post(`/legal-services/reviews/${id}/reject/`, { reason }),

  // Escalate to founder (checker only)
  escalate: (id) =>
    api.post(`/legal-services/reviews/${id}/escalate/`),
};

const SANS = "'Roboto', sans-serif";

const C = {
  navy: '#1E3A6B', navyMid: '#2A4F8F', ink: '#0F172A',
  slate: '#475569', muted: '#94A3B8',
  border: '#E8ECF4', borderLight: '#F1F5F9',
  bg: '#F8FAFC', bgSoft: '#FBFCFE',
  green: '#0F7A5A', greenBg: '#E6F5EF', greenBorder: '#B4DFCF',
  red: '#B42318', redBg: '#FCEBEA', redBorder: '#F2C1BC',
  amber: '#92620B', amberBg: '#FBF2DE', amberBorder: '#F0DDA3',
  purple: '#6D28D9', purpleBg: '#F1E8FE', purpleBorder: '#DCC8FA',
  blue: '#2563EB', blueBg: '#E8F0FE', blueBorder: '#C5D5EF',
};

const ACTION_META = {
  summary:     { label: 'Summary Update',   icon: '📝', color: C.purple, bg: C.purpleBg, border: C.purpleBorder },
  step:        { label: 'Daily Update',     icon: '💬', color: C.slate,  bg: C.bg,       border: C.border },
  appeal:      { label: 'Submit Appeal',    icon: '⚖️', color: C.blue,   bg: C.blueBg,   border: C.blueBorder },
  adjournment: { label: 'Log Adjournment',  icon: '⏳', color: C.amber,  bg: C.amberBg,  border: C.amberBorder },
};

const STATUS_META = {
  pending:   { label: 'Pending',   color: C.amber, bg: C.amberBg, border: C.amberBorder },
  approved:  { label: 'Approved',  color: C.green, bg: C.greenBg, border: C.greenBorder },
  rejected:  { label: 'Rejected',  color: C.red,   bg: C.redBg,   border: C.redBorder },
  escalated: { label: 'Escalated', color: C.purple,bg: C.purpleBg,border: C.purpleBorder },
};

const HIGH_ADMIN_ROLES = ['Admin', 'Founder'];
const ADMIN_ROLES = ['Admin', 'Founder', 'Manager'];

function fmtDateTime(d) {
  if (!d) return '';
  return new Date(d).toLocaleString('en-IN', {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit', hour12: true,
  });
}

export default function ReviewTab({ clientId, courtCaseId, litigationType }) {
  const { user } = useAuth();
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [busyId, setBusyId] = useState(null);
  const [rejectTarget, setRejectTarget] = useState(null);
  const [acceptTarget, setAcceptTarget] = useState(null);
  const [filter, setFilter] = useState('all'); // all | pending | approved | rejected | escalated

  const load = useCallback(async () => {
    if (!courtCaseId) return;
    setLoading(true);
    setError(null);
    try {
      const res = await reviewApi.list({ court_case: courtCaseId });
      const data = Array.isArray(res.data) ? res.data : (res.data.results || []);
      setReviews(data);
    } catch (e) {
      console.error(e);
      setError('Failed to load reviews.');
    } finally {
      setLoading(false);
    }
  }, [courtCaseId]);

  useEffect(() => { load(); }, [load]);

  const isHighAdmin = HIGH_ADMIN_ROLES.includes(user?.role);
  const isAnyAdmin = ADMIN_ROLES.includes(user?.role);

  const canApprove = (review) => {
    // ✅ Submitter (maker) can NEVER approve their own request
    if (review.viewer_role === 'submitter') return false;

    if (review.status === 'escalated') return isHighAdmin;
    if (review.status === 'pending') {
      return (
        review.viewer_role === 'admin' ||
        review.viewer_role === 'founder' ||
        review.viewer_role === 'checker'
      );
    }
    return false;
  };

  const canReject = (review) => canApprove(review);

  const canEscalate = (review) => {
    if (review.status !== 'pending') return false;
    // ✅ Only checker (or admin) can escalate — not the submitter
    if (review.viewer_role === 'submitter') return false;
    return (
      review.viewer_role === 'checker' ||
      review.viewer_role === 'admin' ||
      review.viewer_role === 'founder'
    );
  };
  const isMyCheckerCase = (review) => {
    // We don't have checker info in review payload — trust backend permission
    return true;
  };

  const handleApprove = async (review) => {
    // Escalated reviews are being approved by Admin/Founder — final step, no modal/checkbox.
    if (review.status === 'escalated' || review.viewer_role !== 'checker') {
      setBusyId(review.id);
      try {
        await reviewApi.approve(review.id);
        await load();
      } catch (e) {
        alert(e?.response?.data?.error || 'Failed to approve.');
      } finally {
        setBusyId(null);
      }
      return;
    }
    // Pending review — checker/admin gets the modal with "Move to CEO" option.
    setAcceptTarget(review);
  };

    const doAccept = async (moveToCeo) => {
      const id = acceptTarget.id;
      setBusyId(id);
      try {
        if (moveToCeo) {
          await reviewApi.escalate(id);
        } else {
          await reviewApi.approve(id);
        }
        setAcceptTarget(null);
        await load();
      } catch (e) {
        throw e;
      } finally {
        setBusyId(null);
      }
    };


  const handleReject = (review) => {
    setRejectTarget(review);
  };

  const handleEscalate = async (review) => {
    if (!window.confirm('Move this to CEO for final review?')) return;
    setBusyId(review.id);
    try {
      await reviewApi.escalate(review.id);
      await load();
    } catch (e) {
      alert(e?.response?.data?.error || 'Failed to escalate.');
    } finally {
      setBusyId(null);
    }
  };

  const doReject = async (reason) => {
    const id = rejectTarget.id;
    setBusyId(id);
    try {
      await reviewApi.reject(id, reason);
      setRejectTarget(null);
      await load();
    } catch (e) {
      throw e;
    } finally {
      setBusyId(null);
    }
  };

  const visibleReviews = filter === 'all'
    ? reviews
    : reviews.filter((r) => r.status === filter);

  const counts = {
    all: reviews.length,
    pending: reviews.filter(r => r.status === 'pending').length,
    approved: reviews.filter(r => r.status === 'approved').length,
    rejected: reviews.filter(r => r.status === 'rejected').length,
    escalated: reviews.filter(r => r.status === 'escalated').length,
  };

  return (
    <div style={{ fontFamily: SANS }}>

      {/* Filters */}
      <div style={{
        display: 'flex', gap: 6, marginBottom: 14, flexWrap: 'wrap',
        padding: '10px 14px', background: '#fff',
        border: `1px solid ${C.border}`, borderRadius: 10,
      }}>
        {['all', 'pending', 'approved', 'rejected', 'escalated'].map((f) => {
          const active = filter === f;
          const meta = f !== 'all' ? STATUS_META[f] : null;
          return (
            <button
              key={f}
              onClick={() => setFilter(f)}
              style={{
                display: 'flex', alignItems: 'center', gap: 5,
                padding: '5px 12px', borderRadius: 8,
                border: `1.5px solid ${active ? C.navy : C.border}`,
                background: active ? C.navy : '#fff',
                color: active ? '#fff' : C.slate,
                fontSize: 11.5, fontWeight: 700, cursor: 'pointer',
                textTransform: 'capitalize', fontFamily: SANS,
              }}
            >
              {f}
              <span style={{
                background: active ? 'rgba(255,255,255,0.2)' : (meta?.bg || C.borderLight),
                color: active ? '#fff' : (meta?.color || C.slate),
                padding: '1px 6px', borderRadius: 999,
                fontSize: 10, fontWeight: 800, minWidth: 16, textAlign: 'center',
              }}>
                {counts[f]}
              </span>
            </button>
          );
        })}
      </div>

      {/* Body */}
      {loading && (
        <div style={{ padding: 40, textAlign: 'center', color: C.muted, fontSize: 13, background: '#fff', borderRadius: 10, border: `1px solid ${C.border}` }}>
          Loading reviews...
        </div>
      )}

      {error && !loading && (
        <div style={{ padding: 14, background: C.redBg, color: C.red, border: `1px solid ${C.redBorder}`, borderRadius: 10, fontSize: 12.5, fontWeight: 600 }}>
          {error}
        </div>
      )}

      {!loading && !error && visibleReviews.length === 0 && (
        <div style={{
          padding: '40px 20px', textAlign: 'center',
          background: '#fff', borderRadius: 10, border: `1px solid ${C.border}`,
        }}>
          <div style={{ fontSize: 32, marginBottom: 8, opacity: 0.6 }}>📋</div>
          <div style={{ color: C.slate, fontSize: 13, fontWeight: 600 }}>
            {filter === 'all' ? 'No reviews yet.' : `No ${filter} reviews.`}
          </div>
          <div style={{ color: C.muted, fontSize: 11.5, marginTop: 4 }}>
            When a Maker submits an action, it appears here for review.
          </div>
        </div>
      )}

      {!loading && !error && visibleReviews.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {visibleReviews.map((review) => (
            <ReviewCard
              key={review.id}
              review={review}
              busy={busyId === review.id}
              canApprove={canApprove(review)}
              canReject={canReject(review)}
              canEscalate={canEscalate(review) && review.status === 'pending'}
              onApprove={() => handleApprove(review)}
              onReject={() => handleReject(review)}
              onEscalate={() => handleEscalate(review)}
            />
          ))}
        </div>
      )}

      {rejectTarget && (
        <RejectModal
          review={rejectTarget}
          onClose={() => setRejectTarget(null)}
          onRejected={doReject}
        />
        )}
        {acceptTarget && (
          <AcceptModal
            review={acceptTarget}
            onClose={() => setAcceptTarget(null)}
            onAccepted={doAccept}
          />
        )}
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════
function ReviewCard({ review, busy, canApprove, canReject, canEscalate, onApprove, onReject, onEscalate }) {
  const meta = ACTION_META[review.action_type] || ACTION_META.step;
  const statusMeta = STATUS_META[review.status] || STATUS_META.pending;
  const submitterInitial = (review.submitted_by_name || 'U').charAt(0).toUpperCase();

  return (
    <div style={{
      background: '#fff', border: `1px solid ${C.border}`, borderRadius: 10,
      padding: 14, boxShadow: '0 1px 3px rgba(15,23,42,0.04)',
    }}>
      {/* Top row */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12, marginBottom: 10 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flex: 1, minWidth: 0 }}>
          <div style={{
            width: 32, height: 32, borderRadius: 8, flexShrink: 0,
            background: meta.bg, border: `1.5px solid ${meta.border}`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 15, color: meta.color,
          }}>{meta.icon}</div>

          <div style={{ minWidth: 0, flex: 1 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
              <span style={{ fontSize: 13, fontWeight: 700, color: C.ink }}>{meta.label}</span>
              <span style={{
                fontSize: 9.5, fontWeight: 800, padding: '2px 8px', borderRadius: 999,
                background: statusMeta.bg, color: statusMeta.color,
                border: `1px solid ${statusMeta.border}`,
                textTransform: 'uppercase', letterSpacing: '0.04em',
              }}>
                {statusMeta.label}
              </span>
              {review.escalated_to_founder && (
                <span style={{
                  fontSize: 9, fontWeight: 800, padding: '2px 7px', borderRadius: 999,
                  background: C.purpleBg, color: C.purple, border: `1px solid ${C.purpleBorder}`,
                  textTransform: 'uppercase', letterSpacing: '0.04em',
                }}>
                  ↑ CEO
                </span>
              )}
            </div>
            <div style={{ fontSize: 11, color: C.muted, marginTop: 2 }}>
              Submitted by <b style={{ color: C.slate }}>{review.submitted_by_name}</b> · {fmtDateTime(review.submitted_at)}
            </div>
          </div>
        </div>

        <div style={{
          width: 28, height: 28, borderRadius: '50%', flexShrink: 0,
          background: `linear-gradient(135deg, ${C.navy}, ${C.navyMid})`,
          color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 11, fontWeight: 700,
        }}>{submitterInitial}</div>
      </div>

      {/* Payload preview */}
      <div style={{
        padding: '9px 12px', background: C.bgSoft,
        border: `1px solid ${C.borderLight}`, borderRadius: 7,
        marginBottom: review.status === 'rejected' ? 8 : 0,
      }}>
        <PayloadPreview actionType={review.action_type} payload={review.payload} />
      </div>

      {/* Rejection reason */}
      {review.status === 'rejected' && review.review_note && (
        <div style={{
          marginTop: 8, padding: '9px 12px',
          background: C.redBg, border: `1px solid ${C.redBorder}`, borderRadius: 7,
          fontSize: 12, color: C.red,
        }}>
          <div style={{ fontSize: 10, fontWeight: 800, marginBottom: 3, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Rejection reason
          </div>
          <div style={{ lineHeight: 1.5, whiteSpace: 'pre-wrap' }}>{review.review_note}</div>
          {review.reviewed_by_name && (
            <div style={{ fontSize: 10, color: C.muted, marginTop: 4 }}>
              — {review.reviewed_by_name} · {fmtDateTime(review.reviewed_at)}
            </div>
          )}
        </div>
      )}

      {/* Approval info */}
      {review.status === 'approved' && review.reviewed_by_name && (
        <div style={{
          marginTop: 8, padding: '7px 12px',
          background: C.greenBg, border: `1px solid ${C.greenBorder}`, borderRadius: 7,
          fontSize: 11, color: C.green, fontWeight: 600,
        }}>
          ✅ Approved by {review.reviewed_by_name} · {fmtDateTime(review.reviewed_at)}
        </div>
      )}

      {/* Actions */}
      {(canApprove || canReject || canEscalate) && (
        <div style={{ display: 'flex', gap: 8, marginTop: 10, justifyContent: 'flex-end', flexWrap: 'wrap' }}>
          {canReject && (
            <button
              onClick={onReject}
              disabled={busy}
              style={{
                padding: '7px 14px', borderRadius: 7,
                border: `1.5px solid ${C.redBorder}`,
                background: '#fff', color: C.red,
                fontSize: 12, fontWeight: 700, cursor: busy ? 'wait' : 'pointer',
                fontFamily: SANS, opacity: busy ? 0.5 : 1,
              }}
            >
              Reject
            </button>
          )}
          {canApprove && (
            <button
              onClick={onApprove}
              disabled={busy}
              style={{
                padding: '7px 18px', borderRadius: 7,
                border: 'none',
                background: busy ? C.muted : `linear-gradient(135deg, ${C.green}, ${C.greenDark || '#0F7A5A'})`,
                color: '#fff',
                fontSize: 12, fontWeight: 700, cursor: busy ? 'wait' : 'pointer',
                fontFamily: SANS, boxShadow: '0 2px 6px rgba(15,122,90,0.25)',
              }}
            >
              {busy ? 'Working…' : '✓ Approve'}
            </button>
          )}
        </div>
      )}
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════
function PayloadPreview({ actionType, payload }) {
  if (!payload) return <span style={{ color: C.muted, fontSize: 12 }}>No data</span>;

  if (actionType === 'summary') {
    return (
      <div>
        <div style={{ fontSize: 10, fontWeight: 800, color: C.muted, marginBottom: 3, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
          Summary
        </div>
        <div style={{ fontSize: 12.5, color: C.ink, lineHeight: 1.5, whiteSpace: 'pre-wrap' }}>
          {payload.description || '(empty)'}
        </div>
      </div>
    );
  }

  if (actionType === 'step') {
    return (
      <div>
        <div style={{ fontSize: 10, fontWeight: 800, color: C.muted, marginBottom: 3, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
          Update
        </div>
        <div style={{ fontSize: 12.5, color: C.ink, lineHeight: 1.5, whiteSpace: 'pre-wrap' }}>
          {payload.note || '(empty)'}
        </div>
      </div>
    );
  }

  if (actionType === 'appeal') {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 4, fontSize: 12 }}>
        {payload.case_title && <PayloadRow label="Case Title" value={payload.case_title} />}
        {payload.court_name && <PayloadRow label="Court" value={payload.court_name} />}
        {payload.case_number && <PayloadRow label="Case No." value={payload.case_number} />}
        {payload.appeal_stage && <PayloadRow label="Stage" value={payload.appeal_stage} />}
        {payload.next_hearing_date && <PayloadRow label="Hearing Date" value={payload.next_hearing_date} />}
        {payload.note && (
          <div style={{ marginTop: 4, padding: '6px 0 0', borderTop: `1px dashed ${C.border}` }}>
            <div style={{ fontSize: 10, fontWeight: 800, color: C.muted, marginBottom: 2, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Description
            </div>
            <div style={{ color: C.ink, lineHeight: 1.5, whiteSpace: 'pre-wrap' }}>{payload.note}</div>
          </div>
        )}
      </div>
    );
  }

  if (actionType === 'adjournment') {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 4, fontSize: 12 }}>
        {payload.postpone_type && <PayloadRow label="Type" value={payload.postpone_type.replace(/_/g, ' ')} />}
        {payload.reason && <PayloadRow label="Reason" value={payload.reason.replace(/_/g, ' ')} />}
        {payload.next_hearing_date && <PayloadRow label="New Date" value={payload.next_hearing_date} />}
        {payload.court_name && <PayloadRow label="Court" value={payload.court_name} />}
        {payload.case_number && <PayloadRow label="Case No." value={payload.case_number} />}
        {payload.comment && (
          <div style={{ marginTop: 4, padding: '6px 0 0', borderTop: `1px dashed ${C.border}` }}>
            <div style={{ fontSize: 10, fontWeight: 800, color: C.muted, marginBottom: 2, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Description
            </div>
            <div style={{ color: C.ink, lineHeight: 1.5, whiteSpace: 'pre-wrap' }}>{payload.comment}</div>
          </div>
        )}
      </div>
    );
  }

  return <span style={{ color: C.muted, fontSize: 12 }}>Unknown action</span>;
}

function PayloadRow({ label, value }) {
  return (
    <div style={{ display: 'flex', gap: 6 }}>
      <span style={{ fontSize: 10.5, fontWeight: 700, color: C.muted, minWidth: 90, textTransform: 'uppercase', letterSpacing: '0.04em', paddingTop: 1 }}>
        {label}
      </span>
      <span style={{ fontSize: 12, color: C.ink, fontWeight: 500, textTransform: 'capitalize' }}>
        {value}
      </span>
    </div>
  );
}