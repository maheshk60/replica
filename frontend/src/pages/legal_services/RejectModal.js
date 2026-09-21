// legal_services/RejectModal.js

import React, { useState } from 'react';
import { createPortal } from 'react-dom';

const SANS = "'Roboto', sans-serif";

const T = {
  cardBg: '#FFFFFF',
  surfaceBg: '#F8FAFC',
  navy: '#1E3A6B',
  navyMid: '#2A4F8F',
  navyLight: '#3562A8',
  blueAccent: '#2563EB',
  red: { bg: '#FCEBEA', text: '#B42318', border: '#F2C1BC', dark: '#9B1C13' },
  textPrimary: '#0F172A',
  textSecondary: '#475569',
  textMuted: '#94A3B8',
  border: '#E8ECF4',
  radius: { sm: 6, md: 8, lg: 10 },
};

const styles = `
  @keyframes rmFadeIn { from { opacity: 0; } to { opacity: 1; } }
  @keyframes rmScaleIn {
    from { opacity: 0; transform: scale(0.96) translateY(6px); }
    to { opacity: 1; transform: scale(1) translateY(0); }
  }
  @keyframes rmSpin { to { transform: rotate(360deg); } }
  .rm-overlay { animation: rmFadeIn 0.15s ease; }
  .rm-dialog { animation: rmScaleIn 0.2s cubic-bezier(0.16,1,0.3,1); }
  .rm-textarea:focus {
    border-color: ${T.red.text} !important;
    box-shadow: 0 0 0 3px rgba(180,35,24,0.1) !important;
    outline: none;
  }
`;

export default function RejectModal({ review, onClose, onRejected, position = 'center'}) {
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const submit = async () => {
    if (!reason.trim()) {
      setError('Please provide a reason for rejection.');
      return;
    }
    setBusy(true);
    setError('');
    try {
      await onRejected(reason.trim());
    } catch (e) {
      setError(e?.response?.data?.error || 'Failed to reject.');
      setBusy(false);
    }
  };

  return createPortal(
    <div
      className="rm-overlay"
      onClick={(e) => e.target === e.currentTarget && !busy && onClose()}
      style={{
        position: 'fixed', inset: 0,
        background: position === 'bottom-right' ? 'transparent' : 'rgba(15,23,42,0.55)',
        backdropFilter: position === 'bottom-right' ? 'none' : 'blur(4px)',
        display: 'flex',
        alignItems: position === 'bottom-right' ? 'flex-end' : 'center',
        justifyContent: position === 'bottom-right' ? 'flex-end' : 'center',
        zIndex: 3000,
        padding: position === 'bottom-right' ? 24 : 20,
        pointerEvents: position === 'bottom-right' ? 'none' : 'auto',
      }}
    >
      <style>{styles}</style>

      <div className="rm-dialog" style={{
        width: position === 'bottom-right' ? 420 : 480,
        maxWidth: '100%',
        background: T.cardBg, borderRadius: T.radius.lg,
        overflow: 'hidden',
        boxShadow: position === 'bottom-right'
          ? '0 12px 48px rgba(15,23,42,0.35), 0 0 0 1px rgba(15,23,42,0.05)'
          : '0 20px 60px rgba(15,23,42,0.25)',
        fontFamily: SANS,
        border: `1px solid ${T.border}`,
        pointerEvents: 'auto',
      }}>
        {/* Header */}
        <div style={{
          background: `linear-gradient(135deg, ${T.red.text} 0%, ${T.red.dark} 100%)`,
          padding: '13px 18px',
          display: 'flex', alignItems: 'center', gap: 10,
        }}>
          <div style={{
            width: 32, height: 32, borderRadius: T.radius.sm,
            background: 'rgba(255,255,255,0.18)',
            border: '1px solid rgba(255,255,255,0.25)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </div>
          <div>
            <div style={{ color: 'white', fontSize: 14, fontWeight: 700, lineHeight: 1.2 }}>
              Reject Submission
            </div>
            <div style={{ color: 'rgba(255,255,255,0.75)', fontSize: 10.5, marginTop: 2 }}>
              Provide a reason so the maker can understand
            </div>
          </div>
        </div>

        {/* Body */}
        <div style={{ padding: '16px 18px' }}>
          <div style={{ marginBottom: 6, fontSize: 11, fontWeight: 700, color: T.textSecondary, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Rejection Reason <span style={{ color: T.red.text }}>*</span>
          </div>
          <textarea
            className="rm-textarea"
            autoFocus
            rows={4}
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="e.g. Missing supporting documents. Please attach the demand order copy before resubmitting."
            style={{
              width: '100%', boxSizing: 'border-box',
              padding: '10px 12px',
              border: `1.5px solid ${T.border}`,
              borderRadius: T.radius.md,
              fontSize: 13, fontFamily: SANS,
              color: T.textPrimary,
              background: T.cardBg,
              resize: 'vertical',
              minHeight: 90,
              lineHeight: 1.5,
              outline: 'none',
            }}
          />
          <div style={{ marginTop: 6, fontSize: 10.5, color: T.textMuted }}>
            The maker will see this reason and can submit a fresh action.
          </div>

          {error && (
            <div style={{
              marginTop: 10,
              padding: '8px 12px',
              background: T.red.bg,
              border: `1px solid ${T.red.border}`,
              borderRadius: T.radius.sm,
              color: T.red.text,
              fontSize: 12, fontWeight: 600,
            }}>
              {error}
            </div>
          )}
        </div>

        {/* Footer */}
        <div style={{
          padding: '11px 18px',
          borderTop: `1px solid ${T.border}`,
          background: T.surfaceBg,
          display: 'flex', justifyContent: 'flex-end', gap: 8,
        }}>
          <button
            onClick={onClose}
            disabled={busy}
            style={{
              padding: '7px 16px',
              border: `1.5px solid ${T.border}`,
              borderRadius: T.radius.sm,
              background: T.cardBg,
              cursor: busy ? 'not-allowed' : 'pointer',
              fontSize: 12, fontWeight: 600,
              color: T.textSecondary, fontFamily: SANS,
              opacity: busy ? 0.6 : 1,
            }}
          >
            Cancel
          </button>
          <button
            onClick={submit}
            disabled={busy || !reason.trim()}
            style={{
              padding: '7px 20px',
              background: (busy || !reason.trim()) ? T.textMuted : T.red.text,
              color: 'white', border: 'none',
              borderRadius: T.radius.sm,
              cursor: (busy || !reason.trim()) ? 'not-allowed' : 'pointer',
              fontSize: 12, fontWeight: 700, fontFamily: SANS,
              display: 'flex', alignItems: 'center', gap: 6,
              opacity: (busy || !reason.trim()) ? 0.7 : 1,
            }}
          >
            {busy && (
              <div style={{
                width: 12, height: 12,
                border: '2px solid rgba(255,255,255,0.3)',
                borderTop: '2px solid white',
                borderRadius: '50%',
                animation: 'rmSpin 0.6s linear infinite',
              }} />
            )}
            {busy ? 'Rejecting…' : 'Confirm Rejection'}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}

/* ══════════════════════════════════════════════════════════════════
   ACCEPT MODAL
   Confirms approval, with an optional "Move to CEO" checkbox.
   - Checkbox unchecked → onAccepted(false)  → normal approve
   - Checkbox checked   → onAccepted(true)   → escalate to CEO
   ══════════════════════════════════════════════════════════════════ */

const G = {
  bg: '#E6F5EF', text: '#0F7A5A', border: '#B4DFCF', dark: '#0B5C43',
};

const acceptStyles = `
  @keyframes amFadeIn { from { opacity: 0; } to { opacity: 1; } }
  @keyframes amScaleIn {
    from { opacity: 0; transform: scale(0.96) translateY(6px); }
    to { opacity: 1; transform: scale(1) translateY(0); }
  }
  @keyframes amSpin { to { transform: rotate(360deg); } }
  .am-overlay { animation: amFadeIn 0.15s ease; }
  .am-dialog { animation: amScaleIn 0.2s cubic-bezier(0.16,1,0.3,1); }
  .am-checkbox-row:hover { background: #F5F8ff; }
`;


export function AcceptModal({ review, onClose, onAccepted, position = 'center', showEscalate = true }) {
  const [moveToCeo, setMoveToCeo] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const submit = async () => {
    setBusy(true);
    setError('');
    try {
      await onAccepted(moveToCeo);
    } catch (e) {
      setError(e?.response?.data?.error || 'Failed to approve.');
      setBusy(false);
    }
  };

  return createPortal(
    <div
      className="am-overlay"
      onClick={(e) => e.target === e.currentTarget && !busy && onClose()}
      style={{
        position: 'fixed', inset: 0,
        background: position === 'bottom-right' ? 'transparent' : 'rgba(15,23,42,0.55)',
        backdropFilter: position === 'bottom-right' ? 'none' : 'blur(4px)',
        display: 'flex',
        alignItems: position === 'bottom-right' ? 'flex-end' : 'center',
        justifyContent: position === 'bottom-right' ? 'flex-end' : 'center',
        zIndex: 3000,
        padding: position === 'bottom-right' ? 24 : 20,
        pointerEvents: position === 'bottom-right' ? 'none' : 'auto',
      }}
    >
      <style>{acceptStyles}</style>

      <div className="am-dialog" style={{
        width: position === 'bottom-right' ? 420 : 480,
        maxWidth: '100%',
        background: T.cardBg, borderRadius: T.radius.lg,
        overflow: 'hidden',
        boxShadow: position === 'bottom-right'
          ? '0 12px 48px rgba(15,23,42,0.35), 0 0 0 1px rgba(15,23,42,0.05)'
          : '0 20px 60px rgba(15,23,42,0.25)',
        fontFamily: SANS,
        border: `1px solid ${T.border}`,
        pointerEvents: 'auto',
      }}>
        {/* Header */}
        <div style={{
          background: `linear-gradient(135deg, ${G.text} 0%, ${G.dark} 100%)`,
          padding: '13px 18px',
          display: 'flex', alignItems: 'center', gap: 10,
        }}>
          <div style={{
            width: 32, height: 32, borderRadius: T.radius.sm,
            background: 'rgba(255,255,255,0.18)',
            border: '1px solid rgba(255,255,255,0.25)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5">
              <polyline points="20 6 9 17 4 12" />
            </svg>
          </div>
          <div>
            <div style={{ color: 'white', fontSize: 14, fontWeight: 700, lineHeight: 1.2 }}>
              Approve Submission
            </div>
            <div style={{ color: 'rgba(255,255,255,0.75)', fontSize: 10.5, marginTop: 2 }}>
              {showEscalate
                ? 'Confirm this update, or send it to the CEO instead'
                : 'Confirm final approval'}
            </div>
          </div>
        </div>

        {/* Body */}
        <div style={{ padding: '16px 18px' }}>
          {/* ✅ Checkbox — only shown when showEscalate=true (Checker only) */}
          {showEscalate ? (
            <div
              className="am-checkbox-row"
              onClick={() => !busy && setMoveToCeo((v) => !v)}
              style={{
                display: 'flex', alignItems: 'flex-start', gap: 10,
                padding: '12px 14px',
                border: `1.5px solid ${moveToCeo ? G.text : T.border}`,
                borderRadius: T.radius.md,
                background: moveToCeo ? G.bg : T.surfaceBg,
                cursor: busy ? 'not-allowed' : 'pointer',
                transition: 'all 0.15s ease',
              }}
            >
              <input
                type="checkbox"
                checked={moveToCeo}
                onChange={(e) => setMoveToCeo(e.target.checked)}
                disabled={busy}
                style={{
                  marginTop: 2, width: 16, height: 16, flexShrink: 0,
                  accentColor: G.text, cursor: busy ? 'not-allowed' : 'pointer',
                }}
              />
              <div>
                <div style={{ fontSize: 12.5, fontWeight: 700, color: T.textPrimary }}>
                  ↑ Move to CEO instead
                </div>
                <div style={{ fontSize: 11, color: T.textSecondary, marginTop: 2, lineHeight: 1.4 }}>
                  Leave this unchecked to approve normally. Check it to move this submission
                  for final CEO review instead of applying it now.
                </div>
              </div>
            </div>
          ) : (
            /* ✅ For Founder — clean confirmation box, no checkbox */
            <div style={{
              display: 'flex', alignItems: 'center', gap: 10,
              padding: '12px 14px',
              background: G.bg,
              border: `1.5px solid ${G.border}`,
              borderRadius: T.radius.md,
            }}>
              <div style={{
                width: 28, height: 28, borderRadius: '50%',
                background: G.text, color: '#fff',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 14, fontWeight: 800, flexShrink: 0,
              }}>✓</div>
              <div>
                <div style={{ fontSize: 12.5, fontWeight: 700, color: T.textPrimary }}>
                  Confirm approval
                </div>
                <div style={{ fontSize: 11, color: T.textSecondary, marginTop: 2, lineHeight: 1.4 }}>
                  This submission will be approved and marked as complete.
                </div>
              </div>
            </div>
          )}

          {error && (
            <div style={{
              marginTop: 10,
              padding: '8px 12px',
              background: T.red.bg,
              border: `1px solid ${T.red.border}`,
              borderRadius: T.radius.sm,
              color: T.red.text,
              fontSize: 12, fontWeight: 600,
            }}>
              {error}
            </div>
          )}
        </div>

        {/* Footer */}
        <div style={{
          padding: '11px 18px',
          borderTop: `1px solid ${T.border}`,
          background: T.surfaceBg,
          display: 'flex', justifyContent: 'flex-end', gap: 8,
        }}>
          <button
            onClick={onClose}
            disabled={busy}
            style={{
              padding: '7px 16px',
              border: `1.5px solid ${T.border}`,
              borderRadius: T.radius.sm,
              background: T.cardBg,
              cursor: busy ? 'not-allowed' : 'pointer',
              fontSize: 12, fontWeight: 600,
              color: T.textSecondary, fontFamily: SANS,
              opacity: busy ? 0.6 : 1,
            }}
          >
            Cancel
          </button>
          <button
            onClick={submit}
            disabled={busy}
            style={{
              padding: '7px 20px',
              background: busy ? T.textMuted : (moveToCeo ? T.navy : G.text),
              color: 'white', border: 'none',
              borderRadius: T.radius.sm,
              cursor: busy ? 'not-allowed' : 'pointer',
              fontSize: 12, fontWeight: 700, fontFamily: SANS,
              display: 'flex', alignItems: 'center', gap: 6,
              opacity: busy ? 0.7 : 1,
            }}
          >
            {busy && (
              <div style={{
                width: 12, height: 12,
                border: '2px solid rgba(255,255,255,0.3)',
                borderTop: '2px solid white',
                borderRadius: '50%',
                animation: 'amSpin 0.6s linear infinite',
              }} />
            )}
            {busy
              ? (moveToCeo ? 'Sending…' : 'Approving…')
              : (moveToCeo ? '↑ Send to CEO' : '✓ Confirm Approval')}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}