import React, { useState, useEffect } from 'react';
import { SubmitToCourtModal, LogAdjournmentModal, LogOutcomeModal } from './AppealModals';

const C = {
  navy: '#1E3A6B', navyMid: '#2A4F8F', ink: '#0F172A', slate: '#475569', muted: '#94A3B8',
  border: '#E8ECF4', borderLight: '#F1F5F9', bg: '#F8FAFC', bgSoft: '#FBFCFE',
  green: '#0F7A5A', greenBg: '#E6F5EF', greenBorder: '#B8E0CE',
  red: '#B42318', redBg: '#FCEBEA', redBorder: '#F2C1BC',
  amber: '#92620B', amberBg: '#FBF2DE', amberBorder: '#F0DDA3',
  teal: '#0F6B5C', tealBg: '#E3F3EE',
  purple: '#6D28D9', purpleBg: '#F1E8FE',
  blueAccent: '#2563EB', blueSoft: '#E8F0FE',
};

const EVENT_META = {
  created:      { label: 'Case Created',    color: C.navy,   bg: '#EEF2FF',  icon: '🗂️' },
  description:  { label: 'Summary Updated', color: C.purple, bg: C.purpleBg, icon: '📝' },
  step:         { label: 'Daily Update',    color: C.slate,  bg: C.bg,       icon: '💬' },
  appeal:       { label: 'Appeal Filed',    color: C.teal,   bg: C.tealBg,   icon: '⚖️' },
  adjournment:  { label: 'Adjourned',       color: C.amber,  bg: C.amberBg,  icon: '⏳' },
  outcome_won:  { label: 'Case Won',        color: C.green,  bg: C.greenBg,  icon: '✅' },
  outcome_lost: { label: 'Case Lost',       color: C.red,    bg: C.redBg,    icon: '⚠️' },
};

function fmtDateTime(d) {
  if (!d) return '';
  return new Date(d).toLocaleString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', hour12: true });
}
function fmtDate(d) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}

// ── Button styles defined BEFORE component so they are in scope ──
const primaryBtn = {
  padding: '7px 16px', border: 'none', borderRadius: 6,
  background: C.navy, color: '#fff', fontWeight: 700,
  fontSize: 12, cursor: 'pointer', fontFamily: 'inherit',
};
const secondaryBtn = {
  padding: '7px 14px', border: `1px solid ${C.border}`, borderRadius: 6,
  background: '#fff', color: C.slate, fontWeight: 600,
  fontSize: 12, cursor: 'pointer', fontFamily: 'inherit',
};
const ghostBtn = {
  padding: '5px 12px', border: `1px solid ${C.navy}`, borderRadius: 6,
  background: '#fff', color: C.navy, fontWeight: 700, fontSize: 11.5,
  cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4,
  fontFamily: 'inherit',
};

function buildPendingLogEntry(review) {
  const p = review.payload || {};
  if (review.action_type === 'appeal') {
    return {
      id: `pending-${review.id}`,
      event_type: 'appeal',
      note: p.note,
      case_number: p.case_number,
      court_name: p.court_name,
      appeal_stage: p.appeal_stage,
      next_hearing_date: p.next_hearing_date,
      created_at: review.submitted_at,
      changed_by_name: review.submitted_by_name,
    };
  }
  if (review.action_type === 'adjournment') {
    return {
      id: `pending-${review.id}`,
      event_type: 'adjournment',
      note: p.comment,
      adjournment_reason: p.reason,
      next_hearing_date: p.next_hearing_date,
      case_number: p.case_number,
      court_name: p.court_name,
      created_at: review.submitted_at,
      changed_by_name: review.submitted_by_name,
    };
  }
  return null; // summary/step pending updates stay out of the Case Timeline, unchanged
}

export default function ActivityTimeline({ activityCase, subServiceName, canEdit, createdByFallback, pendingReview, api, onUpdated }) {
  const [showSubmitModal, setShowSubmitModal] = useState(false);
  const [showAdjournModal, setShowAdjournModal] = useState(false);
  const [showOutcomeModal, setShowOutcomeModal] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const [editingSummary, setEditingSummary] = useState(false);
  const [descText, setDescText] = useState(activityCase.job_description || '');
  useEffect(() => { setDescText(activityCase.job_description || ''); }, [activityCase.job_description, activityCase.id]);

  const [showDailyForm, setShowDailyForm] = useState(false);
  const [dailyText, setDailyText] = useState('');

  const logs = [...(activityCase.status_logs || [])].sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
  const dailyUpdates = logs.filter((l) => l.event_type === 'step');
  const timelineLogs = logs.filter((l) => l.event_type !== 'step');
  const pendingLogEntry = pendingReview ? buildPendingLogEntry(pendingReview) : null;   // ✅ moved here

  const creatorName = (activityCase.created_by_name && activityCase.created_by_name.trim())
    ? activityCase.created_by_name
    : (createdByFallback && createdByFallback.trim()) ? createdByFallback : 'Unknown';

  const hasAppealed = timelineLogs.some((l) => l.event_type === 'appeal');
  const isClosed = activityCase.status === 'closed';

  const run = async (fn) => {
    setBusy(true);
    setError('');
    try {
      const res = await fn();
      const updated = (res && res.id) ? res : (res?.data?.id ? res.data : null);
      if (updated) {
        onUpdated(updated);
      }
      return updated;
    } catch (e) {
      const msg =
        e?.response?.data?.error ||
        e?.response?.data?.detail ||
        e?.message ||
        'Action failed.';
      setError(msg);
      throw e;
    } finally {
      setBusy(false);
    }
  };


  const hasSummary = !!activityCase.job_description;

  const saveSummary = async () => {
    try {
      const res = await run(() => api.setDescription(descText.trim()));
      if (res?.review_submitted) {
        alert('✅ Summary submitted for checker review.');
      }
      setEditingSummary(false);
    } catch { /* handled */ }
  };

  const submitDailyUpdate = async () => {
    const text = dailyText.trim();
    if (!text || busy) return;
    try {
      const res = await run(() => api.addStep(text));
      if (res?.review_submitted) {
        alert('✅ Daily update submitted for checker review.');
      }
      setDailyText('');
      setShowDailyForm(false);
    } catch { /* handled */ }
  };


  const [timelineCollapsed, setTimelineCollapsed] = useState(false);
  const [dailyCollapsed, setDailyCollapsed] = useState(false);

  return (
    <div style={{ fontFamily: "'Inter','Roboto',sans-serif" }}>

      {/* ══════ HEADER CARD ══════ */}
      <div style={{
        borderRadius: 12, background: '#fff', border: `1px solid ${C.border}`,
        padding: '14px 18px', marginBottom: 12, boxShadow: '0 1px 3px rgba(15,23,42,0.04)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 14, flexWrap: 'wrap' }}>
          <div style={{ minWidth: 0, flex: '1 1 auto' }}>
            <div style={{
              display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4,
              fontSize: 10.5, fontWeight: 700, color: C.muted,
              textTransform: 'uppercase', letterSpacing: '0.05em',
            }}>
              <span>Created by {creatorName}</span>
              <span style={{ width: 3, height: 3, borderRadius: '50%', background: C.muted }} />
              <span>{fmtDateTime(activityCase.created_at)}</span>
            </div>
            <h2 style={{ margin: 0, fontSize: 17, fontWeight: 800, color: C.ink, letterSpacing: '-0.01em', lineHeight: 1.2 }}>
              {subServiceName || activityCase.case_title || 'Untitled Case'}
            </h2>
          </div>

          <div style={{ display: 'flex', alignItems: 'stretch', gap: 8, flexShrink: 0, flexWrap: 'wrap' }}>
            {!isClosed && activityCase.next_hearing_date && (
              <InfoTile icon="📅" label="Next Hearing" value={fmtDate(activityCase.next_hearing_date)}
                color={C.green} bg={C.greenBg} borderColor={C.greenBorder} />
            )}
            {!isClosed && activityCase.adjourned_date && (
              <InfoTile icon="⏳" label="Adjourned From" value={fmtDate(activityCase.adjourned_date)}
                color={C.amber} bg={C.amberBg} borderColor={C.amberBorder} />
            )}

            {canEdit && !isClosed && (
              <>
                {/* No appeal yet → show only Submit to Court */}
                {!hasAppealed && (
                  <ActionButton
                    onClick={() => setShowSubmitModal(true)}
                    icon="⚖️" label="Submit to Court" subLabel="File Appeal"
                    color={C.navy} primary
                  />
                )}

                {/* After appeal → show Log Outcome + Log Postponement (with court change option) */}
                {hasAppealed && (
                  <>
                    <ActionButton
                      onClick={() => setShowOutcomeModal(true)}
                      icon="📋" label="Log Outcome" subLabel="Won / Lost"
                      color={C.green} filled
                    />
                    <ActionButton
                      onClick={() => setShowAdjournModal(true)}
                      icon="⏳" label="Log Postponement" subLabel="Adjourn / Extend / Transfer"
                      color={C.amber} filled
                    />
                  </>
                )}
              </>
            )}
          </div>
        </div>
      </div>

      {error && (
        <div style={{
          marginBottom: 10, padding: '9px 12px', background: C.redBg,
          color: C.red, borderRadius: 8, fontSize: 12, fontWeight: 600,
          border: `1px solid ${C.redBorder}`,
        }}>{error}</div>
      )}

      {/* ══════ CASE SUMMARY CARD ══════ */}
      <div style={{
        background: '#fff', border: `1px solid ${C.border}`, borderRadius: 12,
        marginBottom: 12, overflow: 'hidden', boxShadow: '0 1px 3px rgba(15,23,42,0.04)',
      }}>
        <SectionHeader
          icon="📝" title="Case Summary"
          right={canEdit && hasSummary && !editingSummary && (
            <button onClick={() => { setDescText(activityCase.job_description || ''); setEditingSummary(true); }} style={ghostBtn}>
              ✎ Edit
            </button>
          )}
        />
        <div style={{ padding: 14 }}>
          {editingSummary && canEdit ? (
            <>
              <textarea
                autoFocus rows={3} value={descText}
                onChange={(e) => setDescText(e.target.value)}
                placeholder="Add a short summary of what this case is about..."
                style={{
                  width: '100%', boxSizing: 'border-box', padding: '10px 12px', borderRadius: 8,
                  border: `1.5px solid ${C.border}`, background: '#fff',
                  color: C.ink, fontSize: 13, fontFamily: 'inherit', resize: 'vertical',
                  lineHeight: 1.5, outline: 'none',
                }}
              />
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 6, marginTop: 8 }}>
                <button
                  onClick={() => { setDescText(activityCase.job_description || ''); setEditingSummary(false); }}
                  style={secondaryBtn}
                >
                  Cancel
                </button>
                <button
                  disabled={busy || descText.trim() === (activityCase.job_description || '').trim()}
                  onClick={saveSummary}
                  style={{
                    ...primaryBtn,
                    background: (busy || descText.trim() === (activityCase.job_description || '').trim()) ? '#CBD3E0' : C.navy,
                    cursor: (busy || descText.trim() === (activityCase.job_description || '').trim()) ? 'not-allowed' : 'pointer',
                  }}
                >
                  {busy ? 'Saving...' : 'Save Summary'}
                </button>
              </div>
            </>
          ) : hasSummary ? (
            <div style={{
              fontSize: 13, color: C.ink, lineHeight: 1.6, whiteSpace: 'pre-wrap',
              padding: '10px 12px', background: C.bgSoft, borderRadius: 8,
              border: `1px solid ${C.borderLight}`,
            }}>
              {activityCase.job_description}
            </div>
          ) : canEdit ? (
            <button
              onClick={() => { setDescText(''); setEditingSummary(true); }}
              style={{
                width: '100%', padding: '14px', borderRadius: 8,
                border: `1.5px dashed ${C.border}`, background: C.bgSoft,
                color: C.slate, fontSize: 13, fontWeight: 700, cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                fontFamily: 'inherit', transition: 'all 0.15s ease',
              }}
              onMouseEnter={(e) => { e.currentTarget.style.borderColor = C.navy; e.currentTarget.style.color = C.navy; }}
              onMouseLeave={(e) => { e.currentTarget.style.borderColor = C.border; e.currentTarget.style.color = C.slate; }}
            >
              <span style={{ fontSize: 16 }}>+</span> Add Summary
            </button>
          ) : (
            <div style={{ fontSize: 12.5, color: C.muted, fontStyle: 'italic', padding: '4px 0' }}>
              No summary added yet.
            </div>
          )}

          {/* ── Inline Case Timeline (collapsible) ── */}
          <div style={{ marginTop: 16, paddingTop: 14, borderTop: `1px dashed ${C.border}` }}>
            <button
              onClick={() => setTimelineCollapsed((c) => !c)}
              style={{
                width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                background: 'transparent', border: 'none', padding: 0, cursor: 'pointer',
                marginBottom: timelineCollapsed ? 0 : 10, fontFamily: 'inherit',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontSize: 13 }}>🕒</span>
                <span style={{ fontSize: 12, fontWeight: 800, color: C.ink, letterSpacing: '-0.01em' }}>Case Timeline</span>
                <span style={{
                  fontSize: 10, fontWeight: 800, color: C.slate,
                  background: C.bgSoft, padding: '1px 7px', borderRadius: 10, border: `1px solid ${C.border}`,
                }}>{timelineLogs.length + (pendingLogEntry ? 1 : 0)}</span>
              </div>
              <ChevronIcon expanded={!timelineCollapsed} />
            </button>

            {!timelineCollapsed && (
              timelineLogs.length === 0 && !pendingLogEntry ? (
                <div style={{ fontSize: 12, color: C.muted, fontStyle: 'italic', padding: '6px 0' }}>
                  No timeline events yet.
                </div>
              ) : (
                <div style={{ position: 'relative', paddingLeft: 2 }}>
                  <div style={{
                    position: 'absolute', left: 13, top: 2, bottom: 2, width: 2,
                    background: `linear-gradient(to bottom, ${C.border}, transparent)`,
                  }} />
                  {pendingLogEntry && (
                    <TimelineEntry log={pendingLogEntry} isLatest={false} pending />  
                  )}
                  {timelineLogs.map((log, idx) => (
                    <TimelineEntry key={log.id} log={log} isLatest={idx === 0} />
                  ))}
                </div>
              )
            )}
          </div>
        </div>
      </div>

      {/* ══════ DAILY UPDATES CARD ══════ */}
      <div style={{
        background: '#fff', border: `1px solid ${C.border}`, borderRadius: 12,
        marginBottom: 12, overflow: 'hidden', boxShadow: '0 1px 3px rgba(15,23,42,0.04)',
      }}>
        {/* Clickable header — entire row toggles collapse */}
        <div
          onClick={() => setDailyCollapsed((c) => !c)}
          style={{
            padding: '10px 14px',
            borderBottom: dailyCollapsed ? 'none' : `1px solid ${C.border}`,
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            background: C.bgSoft, cursor: 'pointer', userSelect: 'none',
            transition: 'background 0.15s ease',
          }}
          onMouseEnter={(e) => { e.currentTarget.style.background = '#F5F8FC'; }}
          onMouseLeave={(e) => { e.currentTarget.style.background = C.bgSoft; }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 14 }}>💬</span>
            <span style={{ fontSize: 13, fontWeight: 800, color: C.ink, letterSpacing: '-0.01em' }}>
              Daily Updates
            </span>
            <span style={{
              fontSize: 10.5, fontWeight: 800, color: C.slate,
              background: '#fff', padding: '1px 8px', borderRadius: 10, border: `1px solid ${C.border}`,
            }}>
              {dailyUpdates.length}
            </span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            {canEdit && !showDailyForm && !dailyCollapsed && (
              <button
                onClick={(e) => { e.stopPropagation(); setShowDailyForm(true); }}
                style={ghostBtn}
              >
                + Add Daily Update
              </button>
            )}
            <ChevronIcon expanded={!dailyCollapsed} />
          </div>
        </div>

        {!dailyCollapsed && (
          <div style={{ padding: 14 }}>
            {showDailyForm && (
              <div style={{
                marginBottom: dailyUpdates.length > 0 ? 12 : 0,
                padding: 12, background: C.bgSoft, border: `1px dashed ${C.border}`, borderRadius: 8,
              }}>
                <textarea
                  autoFocus rows={2} value={dailyText}
                  onChange={(e) => setDailyText(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) submitDailyUpdate(); }}
                  placeholder="Describe what you worked on today... (Ctrl+Enter to submit)"
                  style={{
                    width: '100%', boxSizing: 'border-box', padding: '9px 11px', borderRadius: 7,
                    border: `1.5px solid ${C.border}`, background: '#fff',
                    color: C.ink, fontSize: 12.5, fontFamily: 'inherit', resize: 'vertical',
                    lineHeight: 1.5, outline: 'none',
                  }}
                />
                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 6, marginTop: 8 }}>
                  <button
                    onClick={() => { setShowDailyForm(false); setDailyText(''); }}
                    style={secondaryBtn}
                  >
                    Cancel
                  </button>
                  <button
                    disabled={busy || !dailyText.trim()}
                    onClick={submitDailyUpdate}
                    style={{
                      ...primaryBtn,
                      background: (busy || !dailyText.trim()) ? '#CBD3E0' : C.navy,
                      cursor: (busy || !dailyText.trim()) ? 'not-allowed' : 'pointer',
                    }}
                  >
                    {busy ? 'Saving...' : 'Add Update'}
                  </button>
                </div>
              </div>
            )}
            {dailyUpdates.length === 0 && !showDailyForm ? (
              <div style={{ padding: '20px 8px', textAlign: 'center', color: C.muted, fontSize: 12.5 }}>
                No daily updates yet.{canEdit && ' Click "+ Add Daily Update" to log your work.'}
              </div>
            ) : dailyUpdates.length > 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                {dailyUpdates.map((log, idx) => <DailyUpdateRow key={log.id} log={log} isFirst={idx === 0} />)}
              </div>
            ) : null}
          </div>
        )}
      </div>

      {/* ══════════════════════════════════════════════════════════
          MODALS — direct API call, no double-wrap, immediate update
          ══════════════════════════════════════════════════════════ */}

      {showSubmitModal && (
        <SubmitToCourtModal
          activityCase={activityCase}
          subServiceName={subServiceName}
          onClose={() => setShowSubmitModal(false)}
          onSubmit={async (payload) => {
            try {
              const res = await api.submitAppeal(activityCase.id, payload);
              const data = (res && res.id) ? res : (res?.data?.id ? res.data : null);
              if (data) {
                if (onUpdated) onUpdated(data);
              }
              if (res?.review_submitted || res?.data?.review_submitted) {
                alert('✅ Appeal submitted for checker review.\nIt will appear in the timeline after approval.');
              }
              setShowSubmitModal(false);
            } catch (e) { throw e; }
          }}
        />
      )}

      {showAdjournModal && (
        <LogAdjournmentModal
          activityCase={activityCase}
          onClose={() => setShowAdjournModal(false)}
          onSubmit={async (payload) => {
            try {
              const res = await api.logAdjournment(payload);
              const data = (res && res.id) ? res : (res?.data?.id ? res.data : null);
              if (data) {
                if (onUpdated) onUpdated(data);
              }
              if (res?.review_submitted || res?.data?.review_submitted) {
                alert('✅ Adjournment submitted for checker review.');
              }
              setShowAdjournModal(false);
            } catch (e) { throw e; }
          }}
        />
      )}

      {showOutcomeModal && (
        <LogOutcomeModal
          activityCase={activityCase}
          onClose={() => setShowOutcomeModal(false)}
          onSubmit={async (payload) => {
            try {
              const res = await api.logOutcome(payload);
              const data = (res && res.id) ? res : (res?.data?.id ? res.data : null);
              if (data) onUpdated(data);
              setShowOutcomeModal(false);
            } catch (e) { throw e; }
          }}
        />
      )}

    </div>
  );
}

// ══════════════════════════════════════════════════════════════════
// HELPER COMPONENTS — unchanged from your original
// ══════════════════════════════════════════════════════════════════
function ActionButton({ onClick, icon, label, subLabel, color, primary, filled, outline }) {
  // ── Gradient variants for each button ──
  let bg, txtColor, borderStyle, shadow;

  if (primary) {
    // Submit to Court — Navy → Blue gradient
    bg = `linear-gradient(135deg, ${C.navy}, ${C.blueAccent})`;
    txtColor = '#fff';
    borderStyle = 'none';
    shadow = '0 3px 10px rgba(37,99,235,0.25)';
  } else if (filled) {
    // Log Outcome / Log Adjournment — smooth gradient using same color
    // Darker shade → lighter shade for depth (like Submit to Court)
    bg = `linear-gradient(135deg, ${color}, ${lightenColor(color, 25)})`;
    txtColor = '#fff';
    borderStyle = 'none';
    shadow = `0 3px 10px ${color}40`;
  } else {
    // Outline fallback
    bg = '#fff';
    txtColor = color;
    borderStyle = `1.5px solid ${color}`;
    shadow = 'none';
  }

  return (
    <button
      onClick={onClick}
      style={{
        padding: '0 14px', minHeight: 46,
        border: borderStyle,
        borderRadius: 10,
        background: bg,
        color: txtColor,
        fontWeight: 700, fontSize: 12, cursor: 'pointer',
        display: 'flex', alignItems: 'center', gap: 7,
        boxShadow: shadow,
        whiteSpace: 'nowrap', transition: 'all 0.15s ease', fontFamily: 'inherit',
      }}
    >
      <span style={{ fontSize: 14 }}>{icon}</span>
      <span style={{
        display: 'flex', flexDirection: 'column',
        alignItems: 'flex-start', lineHeight: 1.15, gap: 1,
      }}>
        <span style={{
          fontSize: 9, fontWeight: 700, opacity: 0.75,
          textTransform: 'uppercase', letterSpacing: '0.05em',
        }}>
          {subLabel}
        </span>
        <span style={{ fontSize: 12, fontWeight: 800 }}>{label}</span>
      </span>
    </button>
  );
}

// ── Helper: lighten a hex color by a percentage ──
function lightenColor(hex, percent) {
  const num = parseInt(hex.replace('#', ''), 16);
  const amt = Math.round(2.55 * percent);
  const R = Math.min(255, (num >> 16) + amt);
  const G = Math.min(255, ((num >> 8) & 0x00FF) + amt);
  const B = Math.min(255, (num & 0x0000FF) + amt);
  return '#' + (0x1000000 + R * 0x10000 + G * 0x100 + B).toString(16).slice(1);
}

function InfoTile({ icon, label, value, color, bg, borderColor }) {
  return (
    <div style={{
      padding: '6px 12px', minHeight: 46, boxSizing: 'border-box',
      background: bg, border: `1px solid ${borderColor}`, borderRadius: 10,
      display: 'flex', alignItems: 'center', gap: 8,
    }}>
      <span style={{ fontSize: 14 }}>{icon}</span>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 1, lineHeight: 1.15 }}>
        <span style={{ fontSize: 9, fontWeight: 700, color, opacity: 0.75, textTransform: 'uppercase', letterSpacing: '0.06em' }}>{label}</span>
        <span style={{ fontSize: 12.5, fontWeight: 800, color: C.ink, whiteSpace: 'nowrap' }}>{value}</span>
      </div>
    </div>
  );
}

function SectionHeader({ icon, title, count, right }) {
  return (
    <div style={{
      padding: '10px 14px', borderBottom: `1px solid ${C.border}`,
      display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: C.bgSoft,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <span style={{ fontSize: 14 }}>{icon}</span>
        <span style={{ fontSize: 13, fontWeight: 800, color: C.ink, letterSpacing: '-0.01em' }}>{title}</span>
        {count !== undefined && (
          <span style={{
            fontSize: 10.5, fontWeight: 800, color: C.slate,
            background: '#fff', padding: '1px 8px', borderRadius: 10, border: `1px solid ${C.border}`,
          }}>{count}</span>
        )}
      </div>
      {right}
    </div>
  );
}

function DailyUpdateRow({ log, isFirst }) {
  const initial = (log.changed_by_name || 'U').charAt(0).toUpperCase();
  return (
    <div style={{
      display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16,
      padding: '12px 4px', borderTop: isFirst ? 'none' : `1px solid ${C.borderLight}`,
    }}>
      <div style={{
        flex: 1, minWidth: 0, fontSize: 13, color: C.ink, lineHeight: 1.55,
        whiteSpace: 'pre-wrap', wordBreak: 'break-word',
      }}>{log.note}</div>
      <div style={{ flexShrink: 0, display: 'flex', alignItems: 'center', gap: 8, paddingTop: 1 }}>
        <div style={{
          width: 26, height: 26, borderRadius: '50%',
          background: `linear-gradient(135deg, ${C.navy}, ${C.navyMid})`,
          color: '#fff', fontSize: 11, fontWeight: 700,
          display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
        }}>{initial}</div>
        <div style={{ textAlign: 'right', display: 'flex', flexDirection: 'column', gap: 1 }}>
          <span style={{ fontSize: 11.5, fontWeight: 700, color: C.slate }}>{log.changed_by_name || 'Unknown'}</span>
          <span style={{ fontSize: 10.5, color: C.muted, fontWeight: 500 }}>{fmtDateTime(log.created_at)}</span>
        </div>
      </div>
    </div>
  );
}

function TimelineEntry({ log, isLatest, pending }) {
  const meta = EVENT_META[log.event_type] || EVENT_META.step;
  const isJustDescription = log.event_type === 'description';
  return (
    <div style={{ position: 'relative', display: 'flex', gap: 10, marginBottom: 8 }}>
      <div style={{
        width: 28, height: 28, borderRadius: '50%', flexShrink: 0, zIndex: 1,
        background: meta.bg, border: '2px solid #fff', boxShadow: `0 0 0 2px ${meta.color}33`,
        display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12,
      }}>{meta.icon}</div>
      <div style={{
        flex: 1, minWidth: 0, padding: '9px 12px', background: '#fff', borderRadius: 9,
        border: `1px solid ${C.borderLight}`,
        display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 14,
      }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          {!isJustDescription && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap', marginBottom: 3 }}>
              <span style={{ fontSize: 11, fontWeight: 800, color: meta.color }}>{meta.label}</span>
              {isLatest && !pending && (
                <span style={{
                  fontSize: 8, fontWeight: 800, padding: '1px 6px', borderRadius: 8,
                  background: C.greenBg, color: C.green, textTransform: 'uppercase', letterSpacing: '0.05em',
                }}>Latest</span>
              )}
              {pending && ( 
                <span style={{
                  fontSize: 8, fontWeight: 800, padding: '1px 6px', borderRadius: 8,
                  background: C.amberBg, color: C.amber, textTransform: 'uppercase', letterSpacing: '0.05em',
                }}>Pending Review</span>
              )}
            </div>
          )}
          {log.note && (
            <div style={{ fontSize: 12.5, color: C.ink, lineHeight: 1.5, whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
              {log.note}
            </div>
          )}
          {log.event_type === 'appeal' && (log.case_number || log.court_name || log.next_hearing_date) && (
            <MetaChips items={[
              log.case_number && ['Case No', log.case_number],
              log.court_name && ['Court', log.court_name],
              log.next_hearing_date && ['Hearing', fmtDate(log.next_hearing_date)],
              log.adjourned_date && ['Adjourned', fmtDate(log.adjourned_date)],
            ]} bg={C.tealBg} />
          )}
          {log.event_type === 'adjournment' && (
            <MetaChips items={[
              log.adjournment_reason && ['Reason', log.adjournment_reason.replace(/_/g, ' ')],
              log.adjourned_date && ['Was', fmtDate(log.adjourned_date)],
              log.next_hearing_date && ['New Date', fmtDate(log.next_hearing_date)],
            ]} bg={C.amberBg} />
          )}
          {log.event_type === 'outcome_lost' && log.next_action && (
            <MetaChips items={[
              ['Decision', log.next_action === 'appeal' ? 'Appealing to next court' : 'Case closed'],
            ]} bg={C.redBg} />
          )}
        </div>
        <div style={{
          flexShrink: 0, textAlign: 'right',
          display: 'flex', flexDirection: 'column', gap: 2, alignItems: 'flex-end',
          paddingTop: isJustDescription ? 0 : 1,
        }}>
          <span style={{ fontSize: 10.5, color: C.muted, fontWeight: 600, whiteSpace: 'nowrap' }}>{fmtDateTime(log.created_at)}</span>
          <span style={{ fontSize: 10.5, color: C.slate, fontWeight: 600, whiteSpace: 'nowrap' }}>{log.changed_by_name || 'Unknown'}</span>
        </div>
      </div>
    </div>
  );
}

function MetaChips({ items, bg }) {
  const filtered = items.filter(Boolean);
  if (filtered.length === 0) return null;
  return (
    <div style={{
      fontSize: 11, color: C.slate, marginTop: 6, padding: '6px 9px',
      background: bg, borderRadius: 6, display: 'flex', gap: 12, flexWrap: 'wrap',
    }}>
      {filtered.map(([k, v], i) => <span key={i}><b style={{ color: C.ink }}>{k}:</b> {v}</span>)}
    </div>
  );
}

function ChevronIcon({ expanded }) {
  return (
    <svg
      width="14" height="14" viewBox="0 0 24 24" fill="none"
      stroke={C.slate} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
      style={{ transform: expanded ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.2s ease' }}
    >
      <polyline points="6 9 12 15 18 9" />
    </svg>
  );
}