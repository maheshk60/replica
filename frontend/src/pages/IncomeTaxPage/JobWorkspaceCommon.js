// JobWorkspaceCommon.js
//
// One place for everything a job "workspace" (the page you land on after
// opening a single job) looks like, shared by every feature:
//   ITR (IncomeTaxModule.js), TDS (TDSModule.js), Advance Tax
//   (AdvanceTaxModule.js) and Employee PT (EmployeePTWorkspace.js).
//
// What lives here:
//   • JobWorkspaceShell  — sticky header (name, status pill, chips, period,
//                          clickable STT number → TaskDetailView), tab bar,
//                          viewer notice, content area.
//   • Loader             — the one loading indicator every tab uses.
//   • ClientDetailsTab   — config-driven: summary tiles + editable field grid.
//   • DocumentsTab       — checklist cards, search, progress, custom docs.
//   • AuditTrailTab      — timeline.
//   • TeamTab            — assigned makers/checkers + linked task.
//   • WsCard / WsBtn / wsInput / BankAccountsCard / openWithAuth.
//
// Each feature keeps ONLY its own data wiring (which API to call, which
// fields to show, which documents are on the checklist). Nothing here
// knows about ITR/TDS/PT specifically.
//
// Visual tokens come from ./JobUiCommon so list pages and workspaces stay
// on one palette.

import React, { useState, useEffect, useRef, useCallback } from 'react';
// Same relative path the module files already use (same folder depth).
import { TaskDetailView } from '../clients/ClientManagement/STT_Records';
import {
  P, PL, BRD, BG, MUT, GR, GL, GRB, RED, REDL, REDB, AMB, AMBL, AMBB, PUR, PURL, PURB, WH, INK, NEU, NEUT,
  STATUS_COLORS, DEFAULT_STATUS_COLOR, Breadcrumb,
} from './JobUiCommon';

export const WS_FONT = '"Segoe UI", system-ui, sans-serif';

// ═══════════════════════════════════════════════════════════════════
// Standard tab definitions — every feature uses these four exactly, so
// the label/icon/key are identical everywhere.
// ═══════════════════════════════════════════════════════════════════
export const COMMON_TABS = {
  client: { key: 'client', label: 'Client Details', icon: '👤' },
  docs:   { key: 'docs',   label: 'Documents',      icon: '📂' },
  audit:  { key: 'audit',  label: 'Audit Trail',    icon: '🕐' },
  team:   { key: 'team',   label: 'Team',           icon: '👥' },
};

// Tabs that are read-only by nature and are therefore never shown as locked.
const NEVER_LOCKED = ['audit', 'team', 'review', 'previous'];

// ── Tab state persisted per job in sessionStorage ────────────────────
// Pass the SAME storage key the feature used before (e.g. `itr_tab_${id}`)
// so users land back on the tab they were on.
export function useWorkspaceTab(storageKey, defaultTab, legacyMap = {}) {
  const [tab, setTab] = useState(() => {
    let saved = null;
    try { saved = storageKey ? sessionStorage.getItem(storageKey) : null; } catch { /* storage unavailable */ }
    if (saved && legacyMap[saved]) saved = legacyMap[saved];
    return saved || defaultTab;
  });
  const switchTab = useCallback((k) => {
    setTab(k);
    try { if (storageKey) sessionStorage.setItem(storageKey, k); } catch { /* storage unavailable */ }
  }, [storageKey]);
  return [tab, switchTab];
}

// If the saved tab isn't in the current list (e.g. a tab that only shows
// after approval), fall back to the first tab instead of a blank page.
export function resolveTab(tab, tabs) {
  return tabs.some((t) => t.key === tab) ? tab : tabs[0]?.key;
}

export function statusToneFor(status, map = STATUS_COLORS) {
  return (map && map[status]) || DEFAULT_STATUS_COLOR;
}

// ═══════════════════════════════════════════════════════════════════
// Small building blocks
// ═══════════════════════════════════════════════════════════════════
export const wsInput = {
  width: '100%', padding: '8px 11px', borderRadius: 7, border: `1px solid ${BRD}`,
  fontSize: 13, boxSizing: 'border-box', background: WH, color: INK,
  outline: 'none', fontFamily: 'inherit',
};
const MONO = { fontFamily: 'monospace', letterSpacing: 2 };

const WS_CSS = `
  @keyframes jwsSpin { to { transform: rotate(360deg); } }
  .jws-spin { animation: jwsSpin .7s linear infinite; }
  @media (prefers-reduced-motion: reduce) { .jws-spin { animation-duration: 2.4s; } }
  .jws-tab:focus-visible, .jws-btn:focus-visible { outline: 2px solid ${P}; outline-offset: -2px; }
`;
function WsStyles() { return <style>{WS_CSS}</style>; }

export function Loader({ label = 'Loading…', inline = false, size = 18, padding = '3rem 1rem' }) {
  return (
    <div role="status" aria-live="polite" style={{
      display: inline ? 'inline-flex' : 'flex', alignItems: 'center', justifyContent: 'center',
      gap: 10, padding: inline ? 0 : padding, color: MUT, fontSize: 13,
    }}>
      <WsStyles />
      <span className="jws-spin" style={{
        width: size, height: size, borderRadius: '50%', flexShrink: 0,
        border: `2px solid ${BRD}`, borderTopColor: P,
      }} />
      {label && <span>{label}</span>}
    </div>
  );
}

export function WsCard({ title, sub, extra, children, bodyStyle }) {
  return (
    <div style={{ background: WH, border: `1px solid ${BRD}`, borderRadius: 12, marginBottom: 16, overflow: 'hidden' }}>
      {title && (
        <div style={{ padding: '10px 18px', borderBottom: `1px solid ${BRD}`, background: BG,
          display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 11, fontWeight: 700, color: INK, textTransform: 'uppercase', letterSpacing: '0.07em' }}>{title}</span>
            {sub && <span style={{ fontSize: 11, color: MUT }}>{sub}</span>}
          </div>
          {extra}
        </div>
      )}
      <div style={{ padding: 18, ...bodyStyle }}>{children}</div>
    </div>
  );
}

export function WsBtn({ children, onClick, disabled, variant = 'primary', size = 'md', style: s = {} }) {
  const base = {
    padding: size === 'sm' ? '5px 12px' : '8px 18px', borderRadius: 8,
    fontSize: size === 'sm' ? 12 : 13, fontWeight: 600, border: 'none',
    cursor: disabled ? 'not-allowed' : 'pointer', opacity: disabled ? 0.5 : 1, fontFamily: 'inherit', ...s,
  };
  const look = {
    primary: { background: P, color: WH },
    ghost:   { background: 'transparent', border: `1px solid ${BRD}`, color: MUT },
    outline: { background: 'transparent', border: `1px solid ${P}`, color: P },
    green:   { background: GR, color: WH },
    red:     { background: RED, color: WH },
  }[variant] || { background: P, color: WH };
  return <button type="button" className="jws-btn" onClick={onClick} disabled={disabled} style={{ ...base, ...look }}>{children}</button>;
}

function StatTile({ label, value }) {
  const v = value === null || value === undefined || value === '' ? '—' : value;
  return (
    <div style={{ background: WH, border: `1px solid ${BRD}`, borderRadius: 10, padding: '12px 16px', minWidth: 0 }}>
      <div style={{ fontSize: 11, color: MUT, marginBottom: 3 }}>{label}</div>
      <div title={typeof v === 'string' ? v : undefined}
        style={{ fontSize: 14, fontWeight: 700, color: P, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{v}</div>
    </div>
  );
}

// Named event tones for audit timelines and badges — use these instead
// of feature-local colour maps so every feature's events look the same.
export const EVENT_TONES = {
  green:  { bg: GL,   color: GR  },
  red:    { bg: REDL, color: RED },
  amber:  { bg: AMBL, color: AMB },
  blue:   { bg: PL,   color: P   },
  purple: { bg: PURL, color: PUR },
  grey:   { bg: BG,   color: MUT },
};

const TONES = {
  info:   { bg: PL,        border: P,    color: P },
  warn:   { bg: '#FFFBEB', border: AMBB, color: AMB },
  ok:     { bg: GL,        border: GRB,  color: GR },
  bad:    { bg: REDL,      border: REDB, color: RED },
  purple: { bg: PURL,      border: PURB, color: PUR },
  grey:   { bg: NEU,       border: BRD,  color: NEUT },
};
export function Notice({ tone = 'info', icon, title, children, style }) {
  const t = TONES[tone] || TONES.info;
  return (
    <div style={{ background: t.bg, border: `1px solid ${t.border}`, borderRadius: 10, padding: '10px 14px',
      display: 'flex', alignItems: 'flex-start', gap: 10, color: t.color, fontSize: 12, ...style }}>
      {icon && <span style={{ fontSize: 15, lineHeight: 1.2 }}>{icon}</span>}
      <div>
        {title && <div style={{ fontSize: 13, fontWeight: 600 }}>{title}</div>}
        {children && <div style={{ marginTop: title ? 2 : 0 }}>{children}</div>}
      </div>
    </div>
  );
}

// Fetch a Django-protected file with the auth token and view/download it.
// Single shared copy (was duplicated in ITR and TDS).
export async function openWithAuth(url, filename, mode = 'view') {
  if (!url) return;
  let token = '';
  try { token = sessionStorage.getItem('token') || localStorage.getItem('token') || ''; } catch { /* ignore */ }
  try {
    const res = await fetch(url, { headers: token ? { Authorization: `Token ${token}` } : {} });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const blob = await res.blob();
    const ext = (filename || '').split('.').pop().toLowerCase();
    const mime = ext === 'pdf' ? 'application/pdf'
      : ext === 'png' ? 'image/png'
      : (ext === 'jpg' || ext === 'jpeg') ? 'image/jpeg'
      : blob.type || 'application/octet-stream';
    const blobUrl = URL.createObjectURL(new Blob([blob], { type: mime }));
    if (mode === 'view') {
      window.open(blobUrl, '_blank', 'noopener,noreferrer');
      setTimeout(() => URL.revokeObjectURL(blobUrl), 30000);
    } else {
      const a = document.createElement('a');
      a.href = blobUrl; a.download = filename || 'document';
      document.body.appendChild(a); a.click(); document.body.removeChild(a);
      setTimeout(() => URL.revokeObjectURL(blobUrl), 1000);
    }
  } catch {
    if (mode === 'view') window.open(url, '_blank', 'noopener,noreferrer');
    else {
      const a = document.createElement('a');
      a.href = url; a.download = filename || 'document';
      document.body.appendChild(a); a.click(); document.body.removeChild(a);
    }
  }
}

// ═══════════════════════════════════════════════════════════════════
// JobWorkspaceShell — header + tabs + content for every feature
// ═══════════════════════════════════════════════════════════════════
/**
 * breadcrumb      optional [{label, onClick}] — rendered above the sticky header
 * title           client / company name
 * statusLabel     text in the status pill
 * statusTone      {bg, color} — use statusToneFor(status) or a feature map
 * statusLoading   dims the pill while the status refreshes
 * chips           [string | node] — small chips after the status (ITR form, period type…)
 * rightChip       string | node — chip pinned to the right (e.g. '👤 Employee PT')
 * meta            [string | node] — sub-line items (period, AY…); STT number is appended
 * statusNode      optional node rendered instead of the default status pill
 * task            { id, label } — id = linked Task PK; makes the label open TaskDetailView.
 *                 Omit it when the feature renders its own task link inside `meta`.
 * tabs            [{ key, label, icon?, badge? }]
 * activeTab / onTabChange
 * isTabLocked(key) optional — audit/team/review are never shown as locked
 * notice          node shown under the tabs (e.g. viewer-only message)
 * loading         show the Loader instead of children
 * stickyTop       px offset for the sticky header (default 0)
 */
export function JobWorkspaceShell({
  breadcrumb, title, statusLabel, statusTone, statusLoading, statusNode,
  chips = [], rightChip, meta = [], task,
  tabs, activeTab, onTabChange, isTabLocked,
  notice, loading, loadingLabel, stickyTop = 0, children, style,
}) {
  const [showTaskModal, setShowTaskModal] = useState(false);
  const tone = statusTone || DEFAULT_STATUS_COLOR;
  const taskClickable = !!task?.id;
  const metaItems = [...meta.filter(Boolean)];

  return (
    <div style={{ fontFamily: WS_FONT, ...style }}>
      <WsStyles />
      {breadcrumb && breadcrumb.length > 0 && <Breadcrumb steps={breadcrumb} />}

      <div style={{ position: 'sticky', top: stickyTop, zIndex: 200, background: BG }}>
        {/* Header */}
        <div style={{ background: WH, border: `1px solid ${BRD}`, borderRadius: '12px 12px 0 0',
          padding: '12px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10 }}>
          <div style={{ minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
              <h2 style={{ fontSize: 16, fontWeight: 700, color: INK, margin: 0 }}>{title || '—'}</h2>
              {statusNode || (
                <span style={{ fontSize: 11, fontWeight: 700, padding: '2px 10px', borderRadius: 99,
                  background: tone.bg, color: tone.color, opacity: statusLoading ? 0.5 : 1, transition: 'opacity .2s' }}>
                  {statusLabel || 'To Do'}
                </span>
              )}
              {chips.filter(Boolean).map((c, i) => (
                <span key={i} style={{ fontSize: 11, padding: '2px 8px', borderRadius: 4, background: PL, color: P, fontWeight: 600 }}>{c}</span>
              ))}
            </div>
            <div style={{ fontSize: 12, color: MUT, marginTop: 2, display: 'flex', alignItems: 'center', flexWrap: 'wrap' }}>
              {metaItems.map((m, i) => (
                <span key={i} style={{ display: 'inline-flex', alignItems: 'center' }}>
                  {m}{(task || i < metaItems.length - 1) && <span style={{ margin: '0 6px', color: BRD }}>·</span>}
                </span>
              ))}
              {!task ? null : taskClickable ? (
                <button type="button" className="jws-btn" onClick={() => setShowTaskModal(true)} title="Open task details"
                  style={{ background: 'none', border: 'none', padding: 0, font: 'inherit', color: P, fontWeight: 600, cursor: 'pointer' }}>
                  {task?.label || '—'}
                </button>
              ) : (
                <span>{task?.label || '—'}</span>
              )}
            </div>
          </div>
          {rightChip && (
            <span style={{ fontSize: 11, fontWeight: 600, color: P, background: PL, border: `1px solid ${BRD}`, padding: '3px 10px', borderRadius: 6 }}>
              {rightChip}
            </span>
          )}
        </div>

        {/* Tabs */}
        <div role="tablist" style={{ display: 'flex', borderBottom: `1px solid ${BRD}`, background: WH,
          overflowX: 'auto', boxShadow: '0 3px 10px rgba(0,0,0,0.08)' }}>
          {tabs.map((t) => {
            const active = activeTab === t.key;
            const locked = !NEVER_LOCKED.includes(t.key) && !!isTabLocked?.(t.key);
            return (
              <button key={t.key} type="button" role="tab" aria-selected={active} className="jws-tab"
                onClick={() => onTabChange(t.key)}
                style={{
                  padding: '11px 18px', background: 'none', border: 'none', fontSize: 12,
                  cursor: 'pointer', fontFamily: 'inherit', whiteSpace: 'nowrap',
                  display: 'inline-flex', alignItems: 'center', gap: 5,
                  color: active ? P : locked ? '#AAB0C0' : MUT,
                  fontWeight: active ? 700 : 400,
                  borderBottom: active ? `2px solid ${P}` : '2px solid transparent',
                  opacity: locked ? 0.7 : 1,
                }}>
                {locked ? <span aria-label="locked">🔒</span> : t.icon ? <span aria-hidden="true">{t.icon}</span> : null}
                {t.label}
                {t.badge && (
                  <span style={{ marginLeft: 2, fontSize: 9, background: '#FDE68A', color: '#78350F', borderRadius: 3, padding: '1px 4px', fontWeight: 700 }}>
                    {t.badge}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {notice && <div style={{ marginTop: 12 }}>{notice}</div>}

      <div style={{ padding: '20px 0' }}>
        {loading ? <Loader label={loadingLabel || 'Loading job…'} /> : children}
      </div>

      <TaskDetailView
        visible={showTaskModal}
        taskId={task?.id}
        onClose={() => setShowTaskModal(false)}
        onTaskUpdated={() => {}}
        allEmployees={[]}
      />
    </div>
  );
}

// Standard "not assigned → view only" banner, same text everywhere.
export function ViewerNotice() {
  return (
    <Notice tone="info" icon="👁">
      You're not assigned as a maker or checker on this job — viewing only, no edits allowed.
    </Notice>
  );
}

// ═══════════════════════════════════════════════════════════════════
// CLIENT DETAILS TAB
// ═══════════════════════════════════════════════════════════════════
export const RESIDENTIAL_STATUS_OPTIONS = [
  'Individual/Resident', 'Individual/Non-Resident', 'Individual/RNOR', 'HUF', 'Firm/LLP', 'Company',
  'Trust - Determinate', 'Trust - Discretionary', 'Trust - Charitable', 'AOP/BOI',
];

const optVal = (o) => (typeof o === 'object' ? o.value : o);
const optLabel = (o) => (typeof o === 'object' ? o.label : o);

function FieldValue({ f, data, editing, upd }) {
  const value = data?.[f.key];
  const canEdit = editing && !f.readOnly;

  if (f.render) return f.render({ data, value, editing: canEdit, upd, field: f });

  if (canEdit) {
    const extra = { ...(f.mono ? MONO : {}), ...(f.upper ? { textTransform: 'uppercase' } : {}) };
    const set = (v) => upd(f.key, f.upper && typeof v === 'string' ? v.toUpperCase() : v);
    if (f.type === 'select') {
      return (
        <select value={value || ''} onChange={(e) => set(e.target.value)} style={wsInput} aria-label={f.label}>
          <option value="">{f.placeholder || '— Select —'}</option>
          {(f.options || []).map((o) => <option key={optVal(o)} value={optVal(o)}>{optLabel(o)}</option>)}
        </select>
      );
    }
    if (f.type === 'textarea') {
      return <textarea value={value || ''} onChange={(e) => set(e.target.value)} rows={f.rows || 2}
        aria-label={f.label} style={{ ...wsInput, resize: 'vertical', ...extra }} />;
    }
    if (f.type === 'checkbox') {
      const checked = f.isChecked ? f.isChecked(value) : !!value;
      return (
        <label style={{ fontSize: 13, display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer' }}>
          <input type="checkbox" checked={checked} onChange={(e) => upd(f.key, e.target.checked)} style={{ accentColor: P }} />
          {f.checkboxLabel || f.label}
        </label>
      );
    }
    return <input type={f.type || 'text'} value={value || ''} maxLength={f.maxLength} placeholder={f.placeholder}
      aria-label={f.label} onChange={(e) => set(e.target.value)} style={{ ...wsInput, ...extra }} />;
  }

  let display = f.format ? f.format(value, data)
    : f.type === 'date' && value ? new Date(value).toLocaleDateString('en-IN')
    : f.type === 'checkbox' ? (value ? 'Yes' : 'No')
    : value;
  const empty = display === null || display === undefined || display === '';
  return (
    <span style={{
      fontSize: 13, fontWeight: f.type === 'textarea' ? 400 : 600,
      color: empty ? '#BBB' : f.highlight ? P : INK, fontStyle: empty ? 'italic' : 'normal',
      wordBreak: 'break-word', ...(f.mono && !empty ? MONO : {}),
    }}>
      {empty ? '—' : display}
    </span>
  );
}

/**
 * load()                 → Promise<data object>
 * save(data, options)    → Promise<updated data>   (omit → never editable)
 * reloadKey              → reload when this changes (usually job.id)
 * readOnly               → hides Edit / Save
 * title                  → card title (default 'Client Information')
 * summary(data)          → [{label, value}] tiles above the card
 * infoNote               → small info strip above the card
 * fields | fields(data)  → [{ key, label, type: text|email|tel|date|select|textarea|checkbox|note,
 *                            options, full, mono, upper, maxLength, placeholder, readOnly,
 *                            highlight, format(value, data), render({data,value,editing,upd}),
 *                            isChecked(value), checkboxLabel, tone/text (for type 'note') }]
 * saveOptions            → [{key, label}] checkboxes next to Save, passed to save() as options
 * renderAfter({data, editing, upd}) → extra cards below (bank accounts, linked jobs…)
 * showSaveContinue       → bottom 'Save & Continue →' button (default true when editable)
 * onSaved(data)
 */
export function ClientDetailsTab({
  load, save, reloadKey, readOnly, title = 'Client Information',
  summary, infoNote, fields = [], saveOptions = [], renderAfter,
  showSaveContinue = true, onSaved, loadingLabel = 'Loading client details…',
}) {
  const [data, setData] = useState({});
  const [original, setOriginal] = useState({});
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [opts, setOpts] = useState({});
  const canEdit = !readOnly && !!save;

  useEffect(() => {
    let alive = true;
    setLoading(true);
    Promise.resolve(load ? load() : {})
      .then((d) => { if (alive) { setData(d || {}); setOriginal(d || {}); } })
      .catch(() => {})
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, [reloadKey]); // eslint-disable-line react-hooks/exhaustive-deps

  const upd = useCallback((f, v) => setData((p) => ({ ...p, [f]: v })), []);

  const doSave = async () => {
    if (!save) return;
    setSaving(true);
    try {
      const updated = await save(data, opts);
      const next = updated || data;
      setData(next); setOriginal(next); setEditing(false);
      setSaved(true); setTimeout(() => setSaved(false), 3000);
      onSaved?.(next);
    } catch (e) {
      alert('Save failed: ' + (e?.message || e));
    } finally { setSaving(false); }
  };
  const cancel = () => { setData(original); setOpts({}); setEditing(false); };

  if (loading) return <Loader label={loadingLabel} />;

  const fieldList = (typeof fields === 'function' ? fields(data) : fields).filter(Boolean);
  const tiles = summary ? summary(original) : [];
  const labelStyle = { fontSize: 12, fontWeight: 700, color: MUT, textTransform: 'uppercase', display: 'flex', alignItems: 'center' };

  return (
    <div>
      {tiles.length > 0 && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 12, marginBottom: 20 }}>
          {tiles.map((s) => <StatTile key={s.label} label={s.label} value={s.value} />)}
        </div>
      )}

      {infoNote && (
        <div style={{ background: PL, borderLeft: `3px solid ${P}`, borderRadius: '0 8px 8px 0', padding: '8px 14px', fontSize: 12, color: P, marginBottom: 16 }}>
          {infoNote}
        </div>
      )}

      <WsCard title={title} extra={
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
          {saved && <span style={{ fontSize: 11, color: GR, fontWeight: 600 }}>✓ Saved</span>}
          {editing ? (
            <>
              {saveOptions.map((o) => (
                <label key={o.key} style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 11, color: MUT, cursor: 'pointer' }}>
                  <input type="checkbox" checked={!!opts[o.key]} onChange={(e) => setOpts((p) => ({ ...p, [o.key]: e.target.checked }))} style={{ accentColor: P }} />
                  {o.label}
                </label>
              ))}
              <WsBtn onClick={cancel} variant="ghost" size="sm">Cancel</WsBtn>
              <WsBtn onClick={doSave} disabled={saving} size="sm">{saving ? 'Saving…' : 'Save'}</WsBtn>
            </>
          ) : canEdit ? <WsBtn onClick={() => setEditing(true)} variant="outline" size="sm">✏ Edit</WsBtn> : null}
        </div>
      }>
        <div style={{ display: 'grid', gridTemplateColumns: '160px 1fr 160px 1fr', gap: '12px 24px' }}>
          {fieldList.map((f, i) => {
            if (f.type === 'note') {
              const t = TONES[f.tone || 'warn'];
              return (
                <div key={`note-${i}`} style={{ gridColumn: '1 / -1', fontSize: 11, color: t.color, background: t.bg,
                  border: `1px solid ${t.border}`, borderRadius: 6, padding: '6px 10px' }}>{f.text}</div>
              );
            }
            const top = f.type === 'textarea' || f.full;
            return (
              <React.Fragment key={f.key || i}>
                <div style={{ ...labelStyle, ...(f.full ? { gridColumn: '1' } : {}), ...(top ? { alignItems: 'flex-start', paddingTop: 2 } : {}) }}>
                  {f.label}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0, ...(f.full ? { gridColumn: '2 / 5' } : {}) }}>
                  <FieldValue f={f} data={data} editing={editing} upd={upd} />
                </div>
              </React.Fragment>
            );
          })}
        </div>
      </WsCard>

      {renderAfter && renderAfter({ data, editing, upd })}

      {canEdit && showSaveContinue && (
        <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
          <WsBtn onClick={doSave} disabled={saving}>{saving ? 'Saving…' : 'Save & Continue →'}</WsBtn>
        </div>
      )}
    </div>
  );
}

// Bank accounts card — editable list (ITR) or read-only list (Advance Tax).
export function BankAccountsCard({ accounts, editing, onChange, hideIfEmpty = false, title = 'Bank Details' }) {
  const list = accounts && accounts.length ? accounts : [{}];
  if (hideIfEmpty && !(accounts || []).length) return null;
  const set = (idx, k, v) => { const a = [...list]; a[idx] = { ...a[idx], [k]: v }; onChange?.(a); };
  const lbl = { fontSize: 10, fontWeight: 700, color: MUT, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 5 };
  return (
    <WsCard title={title} extra={editing && (
      <button type="button" className="jws-btn" onClick={() => onChange?.([...list, {}])}
        style={{ fontSize: 11, color: P, background: PL, border: `1px solid ${P}`, borderRadius: 6, padding: '3px 10px', cursor: 'pointer', fontFamily: 'inherit', fontWeight: 600 }}>
        + Add Account
      </button>
    )}>
      {list.map((bank, idx) => (
        <div key={idx} style={{ display: 'grid', gridTemplateColumns: '1fr 150px 130px auto', gap: 10, marginBottom: 10, alignItems: 'end' }}>
          <div>
            <div style={lbl}>A/C No. {idx > 0 ? idx + 1 : ''}</div>
            {editing ? <input value={bank.ac_no || ''} onChange={(e) => set(idx, 'ac_no', e.target.value)} style={wsInput} placeholder="Account number" />
              : <span style={{ fontSize: 13, fontWeight: 500 }}>{bank.ac_no || '—'}</span>}
          </div>
          <div>
            <div style={lbl}>A/C Type</div>
            {editing ? (
              <select value={bank.ac_type || ''} onChange={(e) => set(idx, 'ac_type', e.target.value)} style={wsInput}>
                <option value="">Type</option>
                {['Savings', 'Current', 'Salary', 'NRE', 'NRO'].map((o) => <option key={o}>{o}</option>)}
              </select>
            ) : <span style={{ fontSize: 13, fontWeight: 500 }}>{bank.ac_type || '—'}</span>}
          </div>
          <div>
            <div style={lbl}>IFSC</div>
            {editing ? <input value={bank.ifsc || ''} onChange={(e) => set(idx, 'ifsc', e.target.value.toUpperCase())}
                style={{ ...wsInput, textTransform: 'uppercase', letterSpacing: 1, fontFamily: 'monospace' }} placeholder="IFSC" />
              : <span style={{ fontSize: 13, fontWeight: 500, fontFamily: 'monospace' }}>{bank.ifsc || '—'}</span>}
          </div>
          {editing && idx > 0 ? (
            <button type="button" aria-label="Remove account" onClick={() => onChange?.(list.filter((_, i) => i !== idx))}
              style={{ padding: 8, background: 'none', border: '1px solid #F09595', borderRadius: 6, cursor: 'pointer', color: RED, fontSize: 14 }}>✕</button>
          ) : <span />}
        </div>
      ))}
    </WsCard>
  );
}

// ═══════════════════════════════════════════════════════════════════
// DOCUMENTS TAB
// ═══════════════════════════════════════════════════════════════════
export const DOC_ACCEPT = '.pdf,.jpg,.jpeg,.png,.xlsx,.xls,.doc,.docx,.txt,.zip,.rar,.7z';
const isZip = (fn) => /\.(zip|rar|7z)$/i.test(fn || '');
const canView = (fn) => /\.(pdf|jpe?g|png|gif|txt)$/i.test(fn || '');

/**
 * One checklist card. `doc` is the feature's normalized record:
 *   { filename, url, label, filled?, badge?: {label, tone}, notice?: {tone, title, text},
 *     hideActions?, actionsText?, viewable? }
 * badge tones: info | warn | ok | bad | purple | grey
 */
export function DocCard({ item, doc, busy, readOnly, onUpload, onDelete, onView, onDownload, accept = DOC_ACCEPT }) {
  const ref = useRef();
  const filename = doc?.filename;
  const hasFile = !!filename || !!doc?.filled;
  const zip = isZip(filename);

  const borderColor = hasFile ? (zip ? '#FCD34D' : '#8ECEBF') : BRD;
  const shadow      = hasFile ? (zip ? '0 0 0 2px #FDE68A' : '0 0 0 2px #C3E8DC') : 'none';
  const actionBg    = hasFile ? (zip ? '#FFFBEB' : '#F2FBF7') : BG;
  const fileColor   = zip ? '#D97706' : GR;

  const badge = doc?.badge
    ? { label: doc.badge.label, ...(TONES[doc.badge.tone] || TONES.ok) }
    : hasFile ? { label: zip ? '📦 Uploaded' : 'Uploaded', bg: zip ? '#FEF3C7' : GL, color: zip ? '#92400E' : GR }
    : item.required ? { label: 'Required', bg: '#FEF0F0', color: RED }
    : { label: 'Optional', bg: BG, color: MUT };

  const actBtn = (color, last) => ({
    flex: 1, padding: '7px 0', fontSize: 11, fontWeight: 500, color, background: 'none', border: 'none',
    borderRight: last ? 'none' : `1px solid ${borderColor}`, cursor: 'pointer', fontFamily: 'inherit',
  });
  const canDelete = !readOnly && !!onDelete;

  return (
    <div style={{ background: WH, border: `1px solid ${borderColor}`, borderRadius: 10, overflow: 'hidden', boxShadow: shadow, transition: 'all .15s', display: 'flex', flexDirection: 'column' }}>
      <div style={{ padding: '10px 12px', borderBottom: `1px solid ${borderColor}`, flex: 1 }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8 }}>
          <div style={{ minWidth: 0 }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: INK, marginBottom: 2 }}>
              {/* Checklist label always wins — the server sometimes stores the key
                  (e.g. 'tis') as an uploaded file's label. */}
              {item.icon ? `${item.icon} ` : ''}{item.label || doc?.label}
            </div>
            {item.note && <div style={{ fontSize: 11, color: MUT }}>{item.note}</div>}
          </div>
          <span style={{ flexShrink: 0, fontSize: 10, fontWeight: 500, padding: '2px 8px', borderRadius: 20,
            background: badge.bg, color: badge.color, border: `1px solid ${borderColor}` }}>{badge.label}</span>
        </div>
        {doc?.notice && (
          <Notice tone={doc.notice.tone || 'warn'} title={doc.notice.title} style={{ marginTop: 8, padding: '8px 10px' }}>
            {doc.notice.text}
          </Notice>
        )}
        {filename && !doc?.hideActions && (
          <div title={filename} style={{ marginTop: 6, fontSize: 11, color: fileColor, fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {zip ? '📦' : '✓'} {filename}
          </div>
        )}
      </div>
      <div style={{ display: 'flex', background: actionBg }}>
        {doc?.hideActions ? (
          <div style={{ flex: 1, padding: '8px 0', fontSize: 12, color: MUT, textAlign: 'center' }}>{doc.actionsText || '✓ Logged'}</div>
        ) : filename ? (
          <>
            {(doc?.viewable ?? canView(filename)) && <button type="button" onClick={() => onView(doc)} style={actBtn(P)}>View</button>}
            <button type="button" onClick={() => onDownload(doc)} style={actBtn(fileColor, !canDelete)}>Download</button>
            {canDelete && (
              <button type="button" onClick={onDelete} disabled={busy} style={{ ...actBtn(RED, true), cursor: busy ? 'wait' : 'pointer' }}>
                {busy ? 'Deleting…' : 'Delete'}
              </button>
            )}
          </>
        ) : !readOnly && onUpload ? (
          <button type="button" onClick={() => ref.current?.click()} disabled={busy}
            style={{ ...actBtn(P, true), padding: '8px 0', fontSize: 12, cursor: busy ? 'wait' : 'pointer' }}>
            {busy ? 'Uploading…' : 'Select File'}
          </button>
        ) : (
          <div style={{ flex: 1, padding: '8px 0', fontSize: 12, color: MUT, textAlign: 'center' }}>Not uploaded</div>
        )}
      </div>
      {onUpload && (
        <input ref={ref} type="file" accept={accept} style={{ display: 'none' }}
          onChange={(e) => { const f = e.target.files?.[0]; if (f) onUpload(f); e.target.value = ''; }} />
      )}
    </div>
  );
}

export function AddCustomDocCard({ onAdd, busy, accept = DOC_ACCEPT, placeholder = 'e.g. Rent Agreement' }) {
  const [open, setOpen] = useState(false);
  const [label, setLabel] = useState('');
  const [file, setFile] = useState(null);
  const reset = () => { setLabel(''); setFile(null); setOpen(false); };

  if (!open) {
    return (
      <button type="button" className="jws-btn" onClick={() => setOpen(true)}
        style={{ border: `1px dashed ${P}`, borderRadius: 10, background: PL, color: P, fontSize: 13, fontWeight: 600,
          cursor: 'pointer', minHeight: 96, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'inherit' }}>
        ＋ Add Document
      </button>
    );
  }
  const disabled = !label.trim() || !file || busy;
  return (
    <div style={{ border: `1px solid ${P}`, borderRadius: 10, padding: 12, background: WH }}>
      <div style={{ fontSize: 12, fontWeight: 600, color: INK, marginBottom: 6 }}>New document label</div>
      <input value={label} onChange={(e) => setLabel(e.target.value)} placeholder={placeholder}
        style={{ ...wsInput, fontSize: 12, padding: '6px 8px', marginBottom: 8 }} />
      <input type="file" accept={accept} onChange={(e) => setFile(e.target.files?.[0] || null)} style={{ fontSize: 11, marginBottom: 10, display: 'block' }} />
      <div style={{ display: 'flex', gap: 8 }}>
        <button type="button" disabled={disabled} onClick={() => onAdd(label.trim(), file, reset)}
          style={{ flex: 1, fontSize: 12, fontWeight: 600, padding: '7px 0', borderRadius: 7, border: 'none',
            background: (!label.trim() || !file) ? '#CCC' : P, color: WH, cursor: disabled ? 'not-allowed' : 'pointer', fontFamily: 'inherit' }}>
          {busy ? 'Uploading…' : 'Add'}
        </button>
        <button type="button" onClick={reset}
          style={{ fontSize: 12, fontWeight: 600, padding: '7px 14px', borderRadius: 7, border: `1px solid ${BRD}`, background: WH, color: MUT, cursor: 'pointer', fontFamily: 'inherit' }}>
          Cancel
        </button>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════
// GROUPED DOCUMENT CARDS — one outer card, one inner card per group
// (a notice, a filing, an audit job…), document cards inside.
// ═══════════════════════════════════════════════════════════════════

// Maker → checker review status → DocCard badge (same words everywhere).
export const REVIEW_BADGES = {
  draft:       { label: 'Draft',        tone: 'grey' },
  not_started: { label: 'Not Started',  tone: 'grey' },
  pending:     { label: 'Under Review', tone: 'warn' },
  escalated:   { label: 'Moved to CEO', tone: 'purple' },
  approved:    { label: 'Approved',     tone: 'ok' },
  accepted:    { label: 'Approved',     tone: 'ok' },
  rejected:    { label: 'Rejected',     tone: 'bad' },
};

/**
 * title / sub        outer card header
 * groups             [{ key, title, subtitle?, badge? (node), right? (node), footnote?,
 *                       items: [{ key, label, icon?, note?, required?, doc? }] }]
 *                    `doc` uses the DocCard shape; no doc → "Not uploaded".
 * onView / onDownload(doc)  default openWithAuth(doc.url, doc.filename, …)
 * loading / emptyText
 */
export function DocGroupsCard({
  title = 'Documents', sub, groups = [], loading, loadingLabel = 'Loading documents…',
  emptyText = 'No documents yet.', onView, onDownload, extra,
}) {
  const view = onView || ((d) => openWithAuth(d.url, d.filename, 'view'));
  const download = onDownload || ((d) => openWithAuth(d.url, d.filename, 'download'));
  const total = groups.reduce((n, g) => n + g.items.length, 0);
  const done = groups.reduce((n, g) => n + g.items.filter((i) => i.doc?.filename || i.doc?.filled).length, 0);

  return (
    <WsCard title={title} sub={sub ?? (loading || !groups.length ? undefined : `${groups.length} ${groups.length === 1 ? 'group' : 'groups'} · ${done} of ${total} uploaded`)} extra={extra}>
      {loading ? <Loader label={loadingLabel} padding="2rem 1rem" />
        : groups.length === 0 ? <div style={{ textAlign: 'center', padding: '1.5rem', color: MUT, fontSize: 13 }}>{emptyText}</div>
        : groups.map((g) => (
          <section key={g.key} style={{ border: `1px solid ${BRD}`, borderRadius: 10, marginBottom: 14, overflow: 'hidden' }}>
            <header style={{ padding: '9px 14px', background: BG, borderBottom: `1px solid ${BRD}`,
              display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
              <span style={{ fontSize: 12.5, fontWeight: 700, color: P }}>{g.title}</span>
              {g.badge}
              {g.subtitle && <span style={{ fontSize: 11, color: MUT }}>{g.subtitle}</span>}
              {g.right && <span style={{ marginLeft: 'auto' }}>{g.right}</span>}
            </header>
            <div style={{ padding: 12 }}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 10 }}>
                {g.items.map((it) => (
                  <DocCard key={it.key} item={it} doc={it.doc} readOnly onView={view} onDownload={download} />
                ))}
              </div>
              {g.footnote && <div style={{ marginTop: 8, fontSize: 11, color: MUT }}>{g.footnote}</div>}
            </div>
          </section>
        ))}
    </WsCard>
  );
}

// Documents are always titled from the CHECKLIST, never from the label
// saved with the file — for some clients the server stored the key ('tis',
// 'ais') as the file's label.
//
// Keys are matched loosely (case, spaces, '-' / '_' ignored, and a saved
// label that equals a checklist key or label also counts), so a file saved
// as 'TIS', 'form_26as' or 'Form26AS' fills its checklist card instead of
// appearing as an extra custom document.
const docKeyNorm = (v) => String(v || '').toLowerCase().replace(/[\s_\-—]+/g, '');

function normalizeDocs(raw, checklist) {
  const byNorm = {};
  checklist.forEach((c) => { byNorm[docKeyNorm(c.key)] = c.key; byNorm[docKeyNorm(c.label)] = c.key; });
  const out = {};
  Object.entries(raw || {}).forEach(([k, doc]) => {
    const target = checklist.some((c) => c.key === k) ? k
      : byNorm[docKeyNorm(k)] || byNorm[docKeyNorm(doc?.label)] || k;
    // Keep the first file found for a checklist slot; exact-key entries win.
    if (!out[target] || target === k) out[target] = { ...doc, _key: k };
  });
  return out;
}

// Readable title for a custom (non-checklist) document: its saved label, or
// — when the server only stored the key — the key made readable
// ('rent_agreement' → 'Rent Agreement').
function customDocLabel(key, doc) {
  const l = (doc?.label || '').trim();
  if (l && l !== key && !/^custom_\d+$/.test(l)) return l;
  if (/^custom_\d+$/.test(key)) return 'Custom Document';
  return key.replace(/[_\-]+/g, ' ').replace(/\s+/g, ' ').trim().replace(/\b\w/g, (c) => c.toUpperCase()) || 'Custom Document';
}

const REVIEW_STATUSES = ['Pending Review', 'Pending CEO Approval', 'under_review', 'ceo_review'];
const REWORK_STATUSES = ['Rework', 'rework'];

/**
 * load()                    → Promise<{ [key]: doc }>   (doc shape: see DocCard)
 * upload(key, file, label)  → Promise<{url?, label?}>    (omit → no uploads)
 * remove(key)               → Promise                    (omit → no delete)
 * checklist                 → [{ key, label, note?, required?, icon? }]
 * allowCustom               → show '+ Add Document' and list extra keys (default true when upload given)
 * onView(doc) / onDownload(doc) → default openWithAuth(doc.url, doc.filename, …)
 * jobStatus                 → shows the standard review / rework banners
 * children                  → rendered under the checklist (feature-specific extras)
 */
export function DocumentsTab({
  load, upload, remove, reloadKey, checklist = [], readOnly, allowCustom,
  onView, onDownload, jobStatus, title = 'Document Checklist', accept = DOC_ACCEPT,
  customPlaceholder, children, loadingLabel = 'Loading documents…',
}) {
  const [docs, setDocs] = useState({});
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState({});
  const [search, setSearch] = useState('');
  const customAllowed = (allowCustom ?? !!upload) && !!upload;

  useEffect(() => {
    let alive = true;
    setLoading(true);
    Promise.resolve(load ? load() : {})
      .then((d) => { if (alive) setDocs(normalizeDocs(d, checklist)); })
      .catch(() => {})
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, [reloadKey]); // eslint-disable-line react-hooks/exhaustive-deps

  const withBusy = async (key, fn) => {
    setBusy((p) => ({ ...p, [key]: true }));
    try { await fn(); } finally { setBusy((p) => ({ ...p, [key]: false })); }
  };

  const doUpload = (key, file, label) => withBusy(key, async () => {
    try {
      const res = await upload(key, file, label);
      setDocs((p) => ({ ...p, [key]: { filename: file.name, url: res?.url || '', label: label || res?.label } }));
    } catch (e) { alert('Upload failed: ' + (e?.message || e)); }
  });

  const addCustom = (label, file, onDone) => {
    const key = `custom_${Date.now()}`;
    return withBusy(key, async () => {
      try {
        const res = await upload(key, file, label);
        setDocs((p) => ({ ...p, [key]: { filename: file.name, url: res?.url || '', label: res?.label || label } }));
        onDone();
      } catch (e) { alert('Upload failed: ' + (e?.message || e)); }
    });
  };

  const doRemove = (key) => {
    if (!window.confirm('Delete this document? This cannot be undone.')) return;
    withBusy(key, async () => {
      try {
        await remove(docs[key]?._key || key);   // the server's own key, if it differed
        setDocs((p) => { const n = { ...p }; delete n[key]; return n; });
      } catch (e) { alert('Delete failed: ' + (e?.message || e)); }
    });
  };

  const view = onView || ((d) => openWithAuth(d.url, d.filename, 'view'));
  const download = onDownload || ((d) => openWithAuth(d.url, d.filename, 'download'));

  const customKeys = customAllowed ? Object.keys(docs).filter((k) => !checklist.some((d) => d.key === k)) : [];
  const done = checklist.filter((d) => docs[d.key]?.filename || docs[d.key]?.filled).length;
  const pct = checklist.length ? Math.round((done / checklist.length) * 100) : 0;

  const q = search.trim().toLowerCase();
  const matches = (label, note) => !q || label.toLowerCase().includes(q) || (note || '').toLowerCase().includes(q);
  const shownItems = checklist.filter((d) => matches(d.label, d.note));
  const shownCustom = customKeys.filter((k) => matches(customDocLabel(k, docs[k]), ''));
  const noResults = q && shownItems.length === 0 && shownCustom.length === 0;

  return (
    <div>
      <WsCard title={title} sub={loading ? undefined : `${done} of ${checklist.length} uploaded${readOnly ? ' · read only' : ''}`}>
        {loading ? <Loader label={loadingLabel} padding="2rem 1rem" /> : (
          <>
            <div style={{ height: 5, background: BRD, borderRadius: 99, overflow: 'hidden', marginBottom: 16 }}>
              <div style={{ height: '100%', width: `${pct}%`, background: P, borderRadius: 99, transition: 'width .3s' }} />
            </div>

            <div style={{ position: 'relative', marginBottom: 14 }}>
              <span aria-hidden="true" style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', fontSize: 13, color: MUT }}>🔍</span>
              <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search documents…" aria-label="Search documents"
                style={{ ...wsInput, padding: '8px 12px 8px 32px', borderRadius: 8 }} />
              {search && (
                <button type="button" aria-label="Clear search" onClick={() => setSearch('')}
                  style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', border: 'none', background: 'none', color: MUT, cursor: 'pointer', fontSize: 14, padding: 0 }}>✕</button>
              )}
            </div>

            {noResults ? (
              <div style={{ textAlign: 'center', padding: '24px 0', color: MUT, fontSize: 13 }}>No documents match "{search}"</div>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: 10 }}>
                {shownItems.map((item) => (
                  <DocCard key={item.key} item={item} doc={docs[item.key]} busy={!!busy[item.key]} readOnly={readOnly} accept={accept}
                    onUpload={upload ? (f) => doUpload(item.key, f) : undefined}
                    onDelete={remove ? () => doRemove(item.key) : undefined}
                    onView={view} onDownload={download} />
                ))}
                {shownCustom.map((key) => (
                  <DocCard key={key} item={{ key, label: customDocLabel(key, docs[key]) }} doc={docs[key]}
                    busy={!!busy[key]} readOnly={readOnly} accept={accept}
                    onDelete={remove ? () => doRemove(key) : undefined}
                    onView={view} onDownload={download} />
                ))}
                {customAllowed && !readOnly && !q && (
                  <AddCustomDocCard onAdd={addCustom} busy={Object.values(busy).some(Boolean)} accept={accept} placeholder={customPlaceholder} />
                )}
              </div>
            )}
          </>
        )}
      </WsCard>

      {children}

      {REVIEW_STATUSES.includes(jobStatus) && (
        <Notice tone="warn" icon="⏳" title="Submitted for review — pending approval" style={{ marginTop: 16 }} />
      )}
      {REWORK_STATUSES.includes(jobStatus) && (
        <Notice tone="bad" icon="🔄" title="Rework required" style={{ marginTop: 16 }}>
          Make the necessary changes, then go to the <strong>Review</strong> tab and resubmit.
        </Notice>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════
// AUDIT TRAIL TAB
// ═══════════════════════════════════════════════════════════════════
const AUDIT_ACTION_COLORS = {
  'Job Created':            { bg: GL,   color: GR  },
  'Client Details Updated': { bg: PL,   color: P   },
  'Income Data Updated':    { bg: PL,   color: P   },
  'Filing Details Updated': { bg: PL,   color: P   },
  'Document Uploaded':      { bg: AMBL, color: AMB },
  'Last Year ITR Uploaded': { bg: AMBL, color: AMB },
  'Last Year ITR Parsed':   { bg: GL,   color: GR  },
  'Status Changed':         { bg: '#F3F3F3', color: '#666' },
  'Team Assigned':          { bg: GL,   color: GR  },
  'Comment Added':          { bg: AMBL, color: AMB },
  'Marked as Filed':        { bg: GL,   color: GR  },
};
function toneForAction(action, overrides) {
  if (overrides?.[action]) return overrides[action];
  if (AUDIT_ACTION_COLORS[action]) return AUDIT_ACTION_COLORS[action];
  const a = (action || '').toLowerCase();
  if (/reject|rework|delete|fail/.test(a)) return { bg: '#FEF2F2', color: RED };
  if (/approve|filed|complete|created|assign/.test(a)) return { bg: GL, color: GR };
  if (/upload|document|comment|submit/.test(a)) return { bg: AMBL, color: AMB };
  return { bg: PL, color: P };
}
const userName = (u) => (u && typeof u === 'object' ? (u.full_name || u.name || u.email || '—') : u);

/**
 * load() → Promise<[{ id, action, section?, user, created_at, title?, note?, changed_fields? }]>
 * Field aliases accepted: timestamp/performed_at, performed_by/actor/by,
 * description/details/message. Search + refresh are built in.
 *
 * Optional per-event fields: tone {bg,color} (overrides the colour lookup),
 * actor_label ('Approved by' → shown before the user name).
 * categories   [{ id, label, match(rawEvent) }] → filter dropdown (first = "all")
 * renderDetail(rawEvent) → extra content under an entry (diffs, file lists…)
 * searchText(rawEvent)   → extra strings the search box should match
 */
export function AuditTrailTab({
  load, reloadKey, actionColors, title = 'Audit Trail', searchable = true,
  categories, renderDetail, searchText, searchPlaceholder = 'Search…',
}) {
  const [category, setCategory] = useState(categories?.[0]?.id || 'all');
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState('');
  const [nonce, setNonce] = useState(0);

  useEffect(() => {
    let alive = true;
    setLoading(true); setError(null);
    Promise.resolve(load ? load() : [])
      .then((d) => { if (alive) setLogs(Array.isArray(d) ? d : (d?.results || [])); })
      .catch(() => { if (alive) setError('Failed to load audit trail'); })
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, [reloadKey, nonce]); // eslint-disable-line react-hooks/exhaustive-deps

  if (loading) return <Loader label="Loading audit trail…" />;

  const rows = logs.map((raw) => ({
    raw,
    tone: raw.tone,
    actorLabel: raw.actor_label,
    id: raw.id,
    action: raw.action || raw.event || raw.action_display || 'Update',
    section: raw.section,
    user: userName(raw.user || raw.performed_by || raw.actor || raw.by || raw.by_name) || 'System',
    at: raw.created_at || raw.timestamp || raw.performed_at,
    title: raw.title,
    note: raw.note || raw.description || raw.details || raw.message,
    changed: Array.isArray(raw.changed_fields) ? raw.changed_fields.filter(Boolean) : [],
  }));
  const q = search.trim().toLowerCase();
  const cat = categories?.find((c) => c.id === category);
  const shown = rows
    .filter((r) => !cat || cat.match(r.raw))
    .filter((r) => !q || [r.action, r.section, r.user, r.title, r.note, ...r.changed, ...(searchText ? searchText(r.raw) : [])]
      .some((v) => (v || '').toString().toLowerCase().includes(q)));

  const tools = (
    <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
      {categories?.length > 1 && (
        <select value={category} onChange={(e) => setCategory(e.target.value)} aria-label="Filter events"
          style={{ ...wsInput, width: 'auto', padding: '6px 10px', fontSize: 12, borderColor: cat && cat.id !== categories[0].id ? P : BRD }}>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>{c.label} ({rows.filter((r) => c.match(r.raw)).length})</option>
          ))}
        </select>
      )}
      {searchable && (
        <div style={{ position: 'relative' }}>
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder={searchPlaceholder} aria-label="Search audit trail"
            style={{ ...wsInput, width: 180, padding: '6px 26px 6px 10px', fontSize: 12, borderColor: search ? P : BRD }} />
          {search && (
            <button type="button" aria-label="Clear search" onClick={() => setSearch('')}
              style={{ position: 'absolute', right: 6, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: MUT, fontSize: 14, padding: 0 }}>×</button>
          )}
        </div>
      )}
      <button type="button" className="jws-btn" onClick={() => setNonce((n) => n + 1)} title="Refresh" aria-label="Refresh"
        style={{ padding: '6px 10px', borderRadius: 7, border: `1px solid ${BRD}`, background: WH, cursor: 'pointer', color: MUT, fontFamily: 'inherit', fontSize: 12 }}>↻</button>
    </div>
  );

  return (
    <WsCard title={title} sub={`${shown.length} ${shown.length === 1 ? 'entry' : 'entries'}`} extra={tools}>
      {error ? (
        <div style={{ textAlign: 'center', padding: '2rem', color: RED, fontSize: 13, fontWeight: 600 }}>
          {error}
          <div style={{ marginTop: 10 }}><WsBtn size="sm" onClick={() => setNonce((n) => n + 1)}>Retry</WsBtn></div>
        </div>
      ) : shown.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '2rem', color: MUT, fontSize: 12 }}>{q || (cat && cat.id !== categories[0].id) ? 'No events match.' : 'No activity logged yet.'}</div>
      ) : shown.map((log, i) => {
        const ac = log.tone || toneForAction(log.action, actionColors);
        const last = i === shown.length - 1;
        return (
          <div key={log.id || i} style={{ display: 'flex', gap: 12, padding: '10px 0', borderBottom: last ? 'none' : `1px solid ${BRD}` }}>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flexShrink: 0 }}>
              <div style={{ width: 10, height: 10, borderRadius: '50%', background: ac.color, marginTop: 4 }} />
              {!last && <div style={{ width: 1, flex: 1, background: BRD, marginTop: 3 }} />}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 3, flexWrap: 'wrap' }}>
                <span style={{ fontSize: 10, padding: '2px 8px', borderRadius: 99, fontWeight: 600, background: ac.bg, color: ac.color }}>{log.action}</span>
                {log.section && (
                  <span style={{ fontSize: 10, padding: '1px 7px', borderRadius: 99, background: BG, color: MUT, border: `1px solid ${BRD}` }}>{log.section}</span>
                )}
                {log.user && <span style={{ fontSize: 11, color: MUT }}>{log.actorLabel ? `${log.actorLabel} ` : ''}<b style={{ color: INK, fontWeight: 600 }}>{log.user}</b></span>}
                {log.at && <span style={{ fontSize: 10, color: MUT, marginLeft: 'auto' }}>{new Date(log.at).toLocaleString('en-IN')}</span>}
              </div>
              {log.title && <div style={{ fontSize: 12.5, fontWeight: 600, color: INK, lineHeight: 1.4, marginBottom: 3 }}>{log.title}</div>}
              {log.note && <div style={{ fontSize: 12, color: INK, lineHeight: 1.6 }}>{log.note}</div>}
              {renderDetail && renderDetail(log.raw)}
              {log.changed.length > 0 && (
                <div style={{ marginTop: 4, display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                  {log.changed.slice(0, 8).map((f, fi) => (
                    <span key={fi} style={{ fontSize: 10, padding: '1px 6px', borderRadius: 4, background: '#F0F4FF', color: '#4A3FA8', border: '1px solid #C4B5FD' }}>{f}</span>
                  ))}
                  {log.changed.length > 8 && <span style={{ fontSize: 10, color: MUT }}>+{log.changed.length - 8} more</span>}
                </div>
              )}
            </div>
          </div>
        );
      })}
    </WsCard>
  );
}

// ═══════════════════════════════════════════════════════════════════
// TEAM TAB
// ═══════════════════════════════════════════════════════════════════
/**
 * Either pass makers/checkers directly (when the module already has
 * them), or load() → Promise<{ makers, checkers, linkedTask?, assignedBy? }>
 * (linkedTask/assignedBy from load() override the props).
 * assignedBy  → { name, at } shown in the card header.
 * makersLoading → show the Loader while the parent is still fetching.
 * linkedTask    → [[label, value], …] rows for the "Linked Task" card.
 */
export function TeamTab({ makers, checkers, load, reloadKey, makersLoading, linkedTask = [], assignedBy, emptyText = 'No team assigned yet.' }) {
  const [loaded, setLoaded] = useState({ makers: [], checkers: [] });
  const [loading, setLoading] = useState(!!load);

  useEffect(() => {
    if (!load) return undefined;
    let alive = true;
    setLoading(true);
    Promise.resolve(load())
      .then((d) => { if (alive) setLoaded({ makers: d?.makers || [], checkers: d?.checkers || [], linkedTask: d?.linkedTask, assignedBy: d?.assignedBy }); })
      .catch(() => {})
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, [reloadKey]); // eslint-disable-line react-hooks/exhaustive-deps

  if ((load && loading) || makersLoading) return <Loader label="Loading team…" />;

  const team = load ? loaded : { makers: makers || [], checkers: checkers || [] };
  const taskRows = ((load && loaded.linkedTask) || linkedTask).filter(([, v]) => v !== undefined && v !== null && v !== '');
  const by = (load && loaded.assignedBy) || assignedBy;
  const members = [
    ...team.makers.map((u) => ({ u, role: 'maker' })),
    ...team.checkers.map((u) => ({ u, role: 'checker' })),
  ];

  return (
    <div>
      <WsCard title="Assigned Team" sub={members.length ? `${members.length} ${members.length === 1 ? 'person' : 'people'}` : undefined}
        extra={by?.name && (
          <span style={{ fontSize: 11, color: MUT }}>
            Assigned by <strong style={{ color: INK }}>{by.name}</strong>{by.at ? ` · ${new Date(by.at).toLocaleString('en-IN')}` : ''}
          </span>
        )}>
        {members.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '1.5rem', color: MUT, fontSize: 13 }}>{emptyText}</div>
        ) : members.map((m, i) => {
          const name = typeof m.u === 'object' ? (m.u.full_name || m.u.name || m.u.email || 'User') : String(m.u);
          const email = typeof m.u === 'object' ? (m.u.email || (m.u.username ? `@${m.u.username}` : '')) : '';
          const initials = name.split(' ').map((w) => w[0]).join('').slice(0, 2).toUpperCase();
          const isC = m.role === 'checker';
          const tone = isC ? { bg: '#EDEAFB', color: '#4A3FA8' } : { bg: GL, color: GR };
          return (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 0', borderBottom: i < members.length - 1 ? `1px solid ${BRD}` : 'none' }}>
              <div style={{ width: 34, height: 34, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 700, background: tone.bg, color: tone.color, flexShrink: 0 }}>{initials}</div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13, fontWeight: 500, color: INK }}>{name}</div>
                {email && <div style={{ fontSize: 11, color: MUT }}>{email}</div>}
              </div>
              <span style={{ fontSize: 10, padding: '2px 9px', borderRadius: 99, fontWeight: 700, background: tone.bg, color: tone.color }}>{isC ? 'Checker' : 'Maker'}</span>
            </div>
          );
        })}
      </WsCard>

      {taskRows.length > 0 && (
        <WsCard title="Linked Task">
          {taskRows.map(([l, v], i) => (
            <div key={l} style={{ display: 'flex', justifyContent: 'space-between', gap: 12, padding: '9px 0', borderBottom: i < taskRows.length - 1 ? `1px solid ${BRD}` : 'none' }}>
              <span style={{ fontSize: 13, color: MUT }}>{l}</span>
              <span style={{ fontSize: 13, fontWeight: 500, color: INK, textAlign: 'right' }}>{v || '—'}</span>
            </div>
          ))}
        </WsCard>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════
// PREVIOUS COMPUTATION TAB — the same client's earlier period's Review
// page, read-only, for reference (TDS, Advance Tax…).
// ═══════════════════════════════════════════════════════════════════
const PERIOD_MONTHS = { jan: 1, feb: 2, mar: 3, apr: 4, may: 5, jun: 6, jul: 7, aug: 8, sep: 9, oct: 10, nov: 11, dec: 12 };

/**
 * Sortable month number for a job period, or null if unrecognised.
 * Understands: "Jul-2026" / "July 2026", "Apr-2026 to Mar-2027" (start),
 * "Q1 FY 2026-27" (Q1 = Apr), "FY 2026-27" / "AY 2027-28" (April of the FY).
 */
export function periodSortKey(period) {
  const s = String(period || '').trim();
  if (!s) return null;
  const q = /\bQ([1-4])\b.*?\b(20\d{2})\s*[-–]\s*\d{2,4}/i.exec(s);
  if (q) return Number(q[2]) * 12 + 4 + (Number(q[1]) - 1) * 3;
  const mon = /\b([A-Za-z]{3,9})[\s\-]+(20\d{2})\b/.exec(s);
  if (mon && PERIOD_MONTHS[mon[1].slice(0, 3).toLowerCase()]) {
    return Number(mon[2]) * 12 + PERIOD_MONTHS[mon[1].slice(0, 3).toLowerCase()];
  }
  const fy = /\b(FY|AY)\s*(20\d{2})\s*[-–]\s*\d{2,4}/i.exec(s);
  if (fy) return (Number(fy[2]) - (fy[1].toUpperCase() === 'AY' ? 1 : 0)) * 12 + 4;
  return null;
}

/**
 * Previous Computation — the job for the period exactly one step before this
 * one (Jul-2026 → Jun-2026, Q1 FY 2026-27 → Q4 FY 2025-26, FY → previous FY),
 * found by the server so it works for users not assigned to that job.
 *
 * loadPrevious() → Promise<{ found, previous_period, job }>
 * loadJob(id)    optional → Promise<full job> when the summary row isn't enough
 * renderReview(prevJob) → the module's Review page in read-only mode
 * describe(prevJob) → optional extra line for the banner (task id · status)
 */
export function PreviousPeriodTab({ job, loadPrevious, loadJob, renderReview, describe }) {
  const [state, setState] = useState({ loading: true });

  useEffect(() => {
    let alive = true;
    setState({ loading: true });
    (async () => {
      try {
        const res = await loadPrevious();
        const d = res?.data ?? res ?? {};
        let prev = d.found ? d.job : null;
        if (prev && loadJob) {
          try { prev = { ...prev, ...((await loadJob(prev.id)) || {}) }; } catch { /* keep summary */ }
        }
        if (alive) setState({ loading: false, prev, label: d.previous_period || '' });
      } catch {
        if (alive) setState({ loading: false, error: 'Could not load the previous period.' });
      }
    })();
    return () => { alive = false; };
  }, [job.id]); // eslint-disable-line react-hooks/exhaustive-deps

  if (state.loading) return <Loader label="Loading previous period…" />;
  if (state.error) return <Notice tone="bad" icon="⚠️" title={state.error} />;
  if (!state.prev) {
    return (
      <WsCard title="Previous Computation">
        <div style={{ textAlign: 'center', padding: '2.5rem 1rem' }}>
          <div style={{ fontSize: 28, marginBottom: 8 }} aria-hidden="true">🕘</div>
          <div style={{ fontSize: 14, fontWeight: 700, color: INK }}>No previous data available</div>
          <div style={{ fontSize: 12, color: MUT, marginTop: 4 }}>
            {state.label
              ? <>There is no job for <b>{job.company_name || 'this client'}</b> for <b>{state.label}</b>, the period before {job.period || 'this one'}.</>
              : <>This job's period ({job.period || '—'}) couldn't be read, so its previous period is unknown.</>}
          </div>
        </div>
      </WsCard>
    );
  }
  return (
    <div>
      <Notice tone="info" icon="🕘" style={{ marginBottom: 14 }}
        title={`Previous period — ${state.prev.period || state.label} (reference only, read-only)`}>
        {describe ? `${describe(state.prev)} · ` : ''}Compare with the current period ({job.period || '—'}). Nothing here can be edited or approved.
      </Notice>
      <div key={state.prev.id}>{renderReview(state.prev)}</div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════
// SecretField — masked password / credential value for ClientDetailsTab
// fields (render: secretField). View: •••••••• with Show / Copy.
// Edit: password input with a show/hide toggle.
// Usage in a field list:
//   { key: 'traces_password', label: 'TRACES Password', render: secretField }
// ═══════════════════════════════════════════════════════════════════
export function SecretField({ value, editing, onChange, label }) {
  const [show, setShow] = useState(false);
  const [copied, setCopied] = useState(false);
  const v = value || '';
  const iconBtn = {
    padding: '4px 9px', fontSize: 11, fontWeight: 600, borderRadius: 6, cursor: 'pointer',
    border: `1px solid ${BRD}`, background: WH, color: MUT, fontFamily: 'inherit', whiteSpace: 'nowrap',
  };
  if (editing) {
    return (
      <span style={{ display: 'flex', gap: 6, width: '100%' }}>
        <input type={show ? 'text' : 'password'} value={v} autoComplete="new-password" aria-label={label}
          onChange={(e) => onChange(e.target.value)} style={{ ...wsInput, fontFamily: 'monospace' }} />
        <button type="button" className="jws-btn" onClick={() => setShow((s) => !s)} style={iconBtn}
          aria-label={show ? `Hide ${label}` : `Show ${label}`}>{show ? 'Hide' : 'Show'}</button>
      </span>
    );
  }
  if (!v) return <span style={{ fontSize: 13, color: '#BBB', fontStyle: 'italic' }}>—</span>;
  const copy = async () => {
    try { await navigator.clipboard.writeText(v); setCopied(true); setTimeout(() => setCopied(false), 1500); } catch { /* ignore */ }
  };
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
      <span style={{ fontSize: 13, fontWeight: 600, fontFamily: 'monospace', letterSpacing: show ? 0 : 1 }}>
        {show ? v : '••••••••'}
      </span>
      <button type="button" className="jws-btn" onClick={() => setShow((s) => !s)} style={iconBtn}
        aria-label={show ? `Hide ${label}` : `Show ${label}`}>{show ? 'Hide' : 'Show'}</button>
      <button type="button" className="jws-btn" onClick={copy} style={iconBtn} aria-label={`Copy ${label}`}>
        {copied ? '✓ Copied' : 'Copy'}
      </button>
    </span>
  );
}

// Ready-made `render` for ClientDetailsTab field definitions.
export const secretField = ({ value, editing, upd, field }) => (
  <SecretField value={value} editing={editing} label={field.label} onChange={(v) => upd(field.key, v)} />
);