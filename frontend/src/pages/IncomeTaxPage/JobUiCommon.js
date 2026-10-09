// JobUiCommon.js
//
// Shared visual constants for the ITR / TDS / Advance Tax job modules
// (IncomeTaxModule.js, TDSModule.js, AdvanceTaxModule.js, and
// IncomeTaxJobDetail.js), extracted after confirming byte-for-byte
// duplication across all three module files rather than guessing at
// what was "probably" shared.
//
// Deliberately NOT included here: roleLabel(). Its implementation
// actually differs between TDS/Advance Tax (which both handle a 'mis'
// role → 'MIS Team', and label 'checker_approver' as 'Checker/MIS') and
// ITR (which has no 'mis' handling and labels 'checker_approver' as
// 'Checker/CEO'). That's a real behavioral difference, not just
// copy-paste noise, so it isn't unified here — confirm which behavior
// is actually correct before it gets shared too.

import React, { useState, useEffect, useMemo } from 'react';

// ── Shared visual tokens ─────────────────────────────────────────────
// Identical values (same hex codes) copy-pasted verbatim in all three
// module files before this extraction.
export const P   = '#1A2F5A';
export const PL  = '#EEF3FC';
export const BRD = '#E8EAF0';
export const BG  = '#F8F9FB';
export const MUT = '#7A7F99';

// Second set of shared tokens — confirmed identical between TDSModule.js
// and AdvanceTaxModule.js; not currently used by IncomeTaxModule.js, but
// exported here too so it's available if ITR ever needs the same
// semantic colors instead of reinventing them separately.
export const GR   = '#0D6B52';
export const GL   = '#E8F7F3';
export const RED  = '#C62828';
export const AMB  = '#A05A00';
export const AMBL = '#FFF4E6';

// Confirmed identical between IncomeTaxPage.js and ServiceDashboard.js
// (the job-list/dashboard files) — not previously named/exported by
// either, just used as inline literals.
export const PUR  = '#6B21A8';
export const PURL = '#F5F0FF';
export const REDL = '#FEF2F2';
export const WH   = '#FFFFFF';

// Status accents shared by Legal (MCA / litigation), Employee PT and the
// workspace shell: sky = Open / Ready to File, violet = moved to CEO,
// REDB = the red border used under rejection notes.
export const SKY  = '#0369A1';
export const SKYL = '#E0F2FE';
export const SKYB = '#BAE6FD';
export const VIO  = '#6D28D9';
export const VIOL = '#EDE9FE';
export const REDB = '#FECACA';

// Borders for tinted banners/cards (pair with GL / AMBL / PURL backgrounds).
export const GRB  = '#A7F3D0';
export const AMBB = '#FCD34D';
export const PURB = '#DDD6FE';

// Neutral chip / "not started" grey.
export const NEU  = '#F3F3F3';
export const NEUT = '#666666';

// ── List/Dashboard palette ────────────────────────────────────────────
// IncomeTaxPage.js and ServiceDashboard.js (both list/dashboard-style
// pages) match each other exactly on these four, but genuinely differ
// from the "detail view" values above (BG/AMB/AMBL, and GRL vs GL for
// the same value) — two real, independently-consistent palettes already
// in this codebase, not unified into one to avoid silently shifting
// either family's look.
export const LIST_BG   = '#F5F7FB';
export const LIST_AMB  = '#92400E';
export const LIST_AMBL = '#FFF8E8';
// Same value as GL above — exported under the name IncomeTaxPage.js and
// ServiceDashboard.js already use for it, so call sites there don't need
// renaming: `import { GL as GRL } from './JobUiCommon'` also works if
// you'd rather alias at the import instead.
export const LIST_GRL  = '#E8F7F3';

// ── Status → badge color map ──────────────────────────────────────────
// Every module file had its own local copy of this map. Every status
// that appeared in more than one file already used the same colors, so
// merging them into one comprehensive map doesn't change any existing
// look — it only fills two real gaps this comparison turned up:
//   - AdvanceTaxModule.js was missing 'Filing Process' entirely (present
//     in both TDS and ITR) — those jobs fell through to the plain gray
//     default instead of getting a real color.
//   - Neither TDS nor Advance Tax had 'Under Review' (ITR-only so far) —
//     included here so it's available if either ever needs it; harmless
//     for jobs whose status never becomes 'Under Review', since this is
//     just a lookup table.
export const STATUS_COLORS = {
  'To Do':                { bg: '#F3F3F3', color: '#666' },
  'In Progress':          { bg: '#EEF3FC', color: '#1A2F5A' },
  'Pending Client':       { bg: '#FFF4E6', color: '#A05A00' },
  'Rework':               { bg: '#FEF2F2', color: '#C62828' },
  'Pending Review':       { bg: '#FFF4E6', color: '#A05A00' },
  'Pending CEO Approval': { bg: '#F3E8FF', color: '#6B21A8' },
  'Under Review':         { bg: '#EDEAFB', color: '#4A3FA8' },
  'Filing Process':       { bg: '#FFF4E6', color: '#A05A00' },
  'Ready to File':        { bg: '#E8F7F3', color: '#0D6B52' },
  'Filed':                { bg: '#E8F7F3', color: '#0D6B52' },
  'Closed':               { bg: '#F3F3F3', color: '#666' },
};

// Same fallback every module file already used for an unrecognized
// status — kept as a named export so call sites read the same either
// way: `STATUS_COLORS[job.status] || DEFAULT_STATUS_COLOR`.
export const DEFAULT_STATUS_COLOR = { bg: '#eee', color: '#555' };

// ═══════════════════════════════════════════════════════════════════
// Shared, config-driven components — extracted after confirming
// IncomeTaxPage.js's JobCard/Pill and ServiceDashboard.js's JobCard/
// Pill/TeamBadges are structurally near-identical, but genuinely differ
// in: status vocabulary (TitleCase vs snake_case), status→color maps
// (three independently-drifted variants found — ITR's list palette,
// the ITR/TDS/Advance-Tax detail palette, and GST's), and label logic
// (ITR collapses approval states into "Pending Approval" and lets a
// caller override the "completed" label; GST does a flat lookup). None
// of that is unified here — only the rendering/layout logic is shared;
// each caller supplies its own data via the config below.
// ═══════════════════════════════════════════════════════════════════

/**
 * status: the (already-normalized, if the caller needs that) status
 *   value to look up.
 * statusBadgeMap: the CALLER's own status→{bg,color} map — never a
 *   value from this file, since none of the three known maps agree.
 * getLabel(status): optional; defaults to showing the raw status value.
 * wasReopened: optional (GST-only concept currently) — renders the
 *   small purple "Reopened" sub-badge when true; omitted/false elsewhere
 *   reproduces the exact no-such-badge behavior ITR/TDS/Advance Tax
 *   already have.
 */
export function Pill({ status, statusBadgeMap, getLabel, wasReopened }) {
  const b = (statusBadgeMap && statusBadgeMap[status]) || DEFAULT_STATUS_COLOR;
  const label = getLabel ? getLabel(status) : status;
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
      <span style={{
        padding: '2px 9px', borderRadius: 99, fontSize: 10, fontWeight: 700,
        letterSpacing: '.04em', textTransform: 'uppercase',
        background: b.bg, color: b.color, whiteSpace: 'nowrap',
      }}>{label}</span>
      {wasReopened && (
        <span style={{
          padding: '2px 6px', borderRadius: 99, fontSize: 8, fontWeight: 800,
          letterSpacing: '.04em', textTransform: 'uppercase',
          background: PURL, color: PUR, whiteSpace: 'nowrap',
          border: '1px solid #DDD6FE',
        }}>Reopened</span>
      )}
    </span>
  );
}

/**
 * Sourced from IncomeTaxPage.js's own inline maker/checker chip
 * rendering (same PL/P/PURL/PUR colors it already used) — a plain list
 * of chips, no empty-state text and no overflow collapse. Matches ITR's
 * look exactly; ServiceDashboard.js's own richer version (empty-state
 * message, "+N" collapse past 3 people) is not used as the basis here.
 */
export function TeamBadges({ makers = [], checkers = [] }) {
  const nameOf = (u) => (u.name || u.full_name || '?').split(' ')[0];
  return (
    <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
      {makers.map(u => (
        <span key={u.id} style={{ fontSize: 10, padding: '1px 6px', borderRadius: 4, background: PL, color: P }}>M:{nameOf(u)}</span>
      ))}
      {checkers.map(u => (
        <span key={u.id} style={{ fontSize: 10, padding: '1px 6px', borderRadius: 4, background: PURL, color: PUR }}>C:{nameOf(u)}</span>
      ))}
    </div>
  );
}

/**
 * cardConfig (all functions receive the raw job; getIdBadge/getExtraBadge
 * also receive `compact` since whether an ID badge shows in compact mode
 * genuinely differs today — ITR hides it there, GST shows it):
 *   getName(job)                 → title text
 *   getSubtitle(job, compact)    → subtitle line content (string/JSX)
 *   getIdBadge(job, compact)     → <code> badge content, or falsy to omit
 *   getExtraBadge(job)           → optional extra grid-only badge JSX
 *   getMakers(job) / getCheckers(job) → arrays for TeamBadges
 *   getStatus(job)               → status value to hand to Pill (lets a
 *                                   caller normalize first, e.g. ITR's
 *                                   normStatus(job.status || 'To Do'))
 *   statusBadgeMap, getLabel, getWasReopened(job) → passed to Pill
 *   getAccentColor(job)          → optional; if provided, renders a
 *                                   colored accent bar (top edge in grid
 *                                   mode, left edge in compact mode) —
 *                                   GST's cards have this via their own
 *                                   separate single-hex status map, ITR's
 *                                   don't have one at all today, so
 *                                   omitting this reproduces ITR's exact
 *                                   current look with no accent bar.
 *   showFooterIfEmpty            → GST always shows the grid footer
 *                                   (TeamBadges has its own "No team
 *                                   assigned" text for the empty case);
 *                                   ITR only shows it when there's a
 *                                   team or canAssign is true. Defaults
 *                                   to false (ITR's stricter behavior);
 *                                   pass true for GST's current behavior.
 *   assignLabelCompact / assignLabelGrid → button text, defaults 'Assign'
 */
export function JobCard({ job, onOpen, onAssign, canAssign, compact, cardConfig }) {
  const [hov, setHov] = useState(false);
  const {
    getName, getSubtitle, getIdBadge, getExtraBadge,
    getMakers, getCheckers, getStatus, statusBadgeMap, getLabel, getWasReopened,
    getAccentColor, showFooterIfEmpty = false,
    assignLabelCompact = 'Assign', assignLabelGrid = 'Assign',
  } = cardConfig;

  const makers = (getMakers && getMakers(job)) || [];
  const checkers = (getCheckers && getCheckers(job)) || [];
  const status = getStatus ? getStatus(job) : job.status;
  const wasReopened = getWasReopened ? getWasReopened(job) : undefined;
  const name = getName(job);
  const accentColor = getAccentColor ? getAccentColor(job) : null;
  const hasTeam = makers.length > 0 || checkers.length > 0;

  if (compact) {
    const idBadge = getIdBadge ? getIdBadge(job, true) : null;
    return (
      <div
        style={{ background: WH, border: `1px solid ${hov ? P : BRD}`, borderRadius: 8,
          padding: '10px 14px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 10,
          transition: 'all .15s', boxShadow: hov ? `0 2px 8px ${P}10` : 'none' }}
        onMouseEnter={() => setHov(true)} onMouseLeave={() => setHov(false)}
        onClick={onOpen}
      >
        {accentColor && (
          <div style={{ width: 3, height: 32, borderRadius: 99, flexShrink: 0, background: accentColor }} />
        )}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: '#1C1E2E', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={name}>{name}</div>
          <div style={{ fontSize: 11, color: MUT, marginTop: 2 }}>{getSubtitle(job, true)}</div>
        </div>
        {idBadge && (
          <code style={{ fontSize: 10, color: MUT, background: BG, padding: '2px 6px', borderRadius: 4, flexShrink: 0 }}>{idBadge}</code>
        )}
        {canAssign && (
          <button onClick={e => { e.stopPropagation(); onAssign(); }}
            style={{ padding: '4px 10px', borderRadius: 6, border: `1px solid ${BRD}`, background: WH,
              fontSize: 11, cursor: 'pointer', color: MUT, fontFamily: 'inherit', flexShrink: 0, transition: 'all .15s' }}
            onMouseEnter={e => { e.currentTarget.style.borderColor = P; e.currentTarget.style.color = P; }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = BRD; e.currentTarget.style.color = MUT; }}>
            {assignLabelCompact}
          </button>
        )}
        <Pill status={status} statusBadgeMap={statusBadgeMap} getLabel={getLabel} wasReopened={wasReopened} />
      </div>
    );
  }

  const idBadge = getIdBadge ? getIdBadge(job, false) : null;
  const extraBadge = getExtraBadge ? getExtraBadge(job) : null;
  const showFooter = showFooterIfEmpty || hasTeam || canAssign;

  return (
    <div
      style={{ background: WH, border: `1.5px solid ${hov ? P : BRD}`, borderRadius: 12, padding: 14,
        cursor: 'pointer', boxShadow: hov ? '0 6px 18px rgba(26,47,90,.10)' : '0 1px 3px rgba(0,0,0,.04)',
        transition: 'all .18s', display: 'flex', flexDirection: 'column', gap: 0, position: 'relative', overflow: 'hidden' }}
      onMouseEnter={() => setHov(true)} onMouseLeave={() => setHov(false)}
      onClick={onOpen}
    >
      {accentColor && (
        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 3, background: accentColor, borderRadius: '12px 12px 0 0' }} />
      )}

      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8, marginBottom: 8, marginTop: accentColor ? 4 : 0 }}>
        <div style={{ minWidth: 0, flex: 1 }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: '#1C1E2E', lineHeight: 1.3, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={name}>{name}</div>
          <div style={{ fontSize: 11, color: MUT, marginTop: 3 }}>{getSubtitle(job, false)}</div>
        </div>
        <Pill status={status} statusBadgeMap={statusBadgeMap} getLabel={getLabel} wasReopened={wasReopened} />
      </div>

      {(idBadge || extraBadge) && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap', marginBottom: 8 }}>
          {idBadge && <code style={{ fontSize: 10, color: MUT, background: BG, padding: '2px 6px', borderRadius: 4 }}>{idBadge}</code>}
          {extraBadge}
        </div>
      )}

      <div style={{ flex: 1 }} />

      {showFooter && (
        <div style={{ borderTop: `1px solid ${BRD}`, paddingTop: 10, marginTop: 2, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, flexWrap: 'wrap' }}>
          <TeamBadges makers={makers} checkers={checkers} />
          {canAssign && (
            <button onClick={e => { e.stopPropagation(); onAssign(); }}
              style={{ padding: '5px 14px', borderRadius: 7, border: `1.5px solid ${P}`, background: WH,
                fontSize: 11, fontWeight: 600, cursor: 'pointer', color: P, fontFamily: 'inherit',
                transition: 'all .15s', display: 'flex', alignItems: 'center', gap: 5, flexShrink: 0, marginLeft: 'auto' }}
              onMouseEnter={e => { e.currentTarget.style.background = P; e.currentTarget.style.color = WH; }}
              onMouseLeave={e => { e.currentTarget.style.background = WH; e.currentTarget.style.color = P; }}>
              {assignLabelGrid}
            </button>
          )}
        </div>
      )}
    </div>
  );
}

/**
 * steps: [{ label, onClick? }] — a clicked step navigates, the last
 * (no onClick) is the current location. Sourced from IncomeTaxPage.js's
 * own inline breadcrumb rendering (same BRD/MUT colors, same plain
 * inline layout, no card wrapper or hover effect) — the closure over
 * local `breadcrumbSteps` is replaced with a `steps` prop so it's a real
 * standalone component, but the look matches ITR exactly.
 * ServiceDashboard.js's own more polished version (card background,
 * hover color-shift) is not used as the basis here.
 */
export function Breadcrumb({ steps }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 22, flexWrap: 'wrap' }}>
      {steps.map((s, i) => (
        <span key={i} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {i > 0 && <span style={{ color: BRD }}>›</span>}
          {s.onClick
            ? <button onClick={s.onClick} style={{ background: 'none', border: 'none', color: MUT, fontSize: 13, cursor: 'pointer', padding: 0, fontFamily: 'inherit' }}>{s.label}</button>
            : <span style={{ fontSize: 13, fontWeight: 600, color: '#1C1E2E' }}>{s.label}</span>
          }
        </span>
      ))}
    </div>
  );
}

/**
 * One selectable tile on a "choose a module/service" landing page (e.g.
 * IncomeTaxPage.js's ModuleSelector picking ITR/TDS/Advance Tax). Pulled
 * out of ModuleSelector as-is — GST doesn't have an equivalent landing
 * page yet, so this is extracted ahead of that need rather than after
 * finding a second, divergent copy to reconcile.
 *
 * mod: { key, icon, title, color, light, desc, built, stats: [{label,
 *   value, color, hint?}] } — built:false shows a "Coming Soon" badge
 *   and disables the click/hover interaction.
 */
/**
 * Page title block used by landing / dashboard pages (Legal selector tiles,
 * MCA & litigation dashboards…). `right` = optional action(s) on the right.
 */
export const HEAD = '#111827';   // page / list heading colour

export function PageHeader({ title, subtitle, right, style }) {
  return (
    <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 24, flexWrap: 'wrap', gap: 12, ...style }}>
      <div>
        <h1 style={{ fontSize: 24, fontWeight: 900, color: HEAD, margin: 0, letterSpacing: '-.03em' }}>{title}</h1>
        {subtitle && <p style={{ fontSize: 13, color: MUT, margin: '5px 0 0' }}>{subtitle}</p>}
      </div>
      {right}
    </div>
  );
}

/**
 * Job-list title row: heading + count pill (+ optional subtitle line),
 * controls on the right. Used by every Legal list (litigation, MCA…).
 */
export function ListHeader({ title, count, noun = 'item', subtitle, right }) {
  return (
    <div style={{ marginBottom: 16 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <h2 style={{ fontSize: 20, fontWeight: 800, color: HEAD, margin: 0 }}>{title}</h2>
          {count !== undefined && (
            <span style={{ fontSize: 11, fontWeight: 700, padding: '2px 10px', borderRadius: 99, background: PL, color: P, border: `1px solid ${BRD}` }}>
              {count} {noun}{count !== 1 ? 's' : ''}
            </span>
          )}
        </div>
        {right}
      </div>
      {subtitle && <div style={{ fontSize: 12, color: MUT, marginTop: 4 }}>{subtitle}</div>}
    </div>
  );
}

export function ModuleCard({ mod, onSelect }) {
  return (
    <div
      onClick={() => mod.built && onSelect(mod.key)}
      style={{ background: WH, border: `1.5px solid ${BRD}`, borderRadius: 18, padding: 24,
        cursor: mod.built ? 'pointer' : 'default', position: 'relative', overflow: 'hidden',
        transition: 'all .2s', opacity: mod.built ? 1 : .7, minHeight: 240,
        display: 'flex', flexDirection: 'column' }}
      onMouseEnter={e => { if (mod.built) { e.currentTarget.style.borderColor = mod.color; e.currentTarget.style.boxShadow = `0 8px 28px ${mod.color}18`; e.currentTarget.style.background = mod.light; } }}
      onMouseLeave={e => { e.currentTarget.style.borderColor = BRD; e.currentTarget.style.boxShadow = 'none'; e.currentTarget.style.background = WH; }}
    >
      <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 5, background: mod.color, borderRadius: '18px 18px 0 0' }} />
      {!mod.built && (
        <div style={{ position: 'absolute', top: 14, right: 14, fontSize: 9, fontWeight: 700,
          padding: '2px 7px', borderRadius: 99, background: '#F3F4F6', color: MUT, textTransform: 'uppercase', letterSpacing: '.05em' }}>
          Coming Soon
        </div>
      )}
      <div style={{ fontSize: 32, marginBottom: 12 }}>{mod.icon}</div>
      <div style={{ fontSize: 17, fontWeight: 800, color: '#111827', marginBottom: 6 }}>{mod.title}</div>
      <div style={{ fontSize: 12, color: MUT, lineHeight: 1.5, marginBottom: mod.stats?.length ? 16 : 0 }}>{mod.desc}</div>
      {mod.stats?.length > 0 && (
        <div style={{ display: 'flex', gap: 12, paddingTop: 16, borderTop: `1px solid ${BRD}`, flexWrap: 'wrap' }}>
          {mod.stats.map(s => (
            <div key={s.label} style={{ textAlign: 'center', flex: 1, minWidth: 60 }}>
              <div style={{ fontSize: 22, fontWeight: 900, color: s.color, lineHeight: 1 }}>{s.value}</div>
              <div style={{ fontSize: 10, color: MUT, marginTop: 3, fontWeight: 500 }}>{s.label}</div>
              {s.hint && <div style={{ fontSize: 9, color: MUT, marginTop: 1, opacity: .7 }}>{s.hint}</div>}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════
// Role/team helpers — generic (User/Employee/Team shapes only, no
// ITR-specific data), confirmed by reading their implementations.
// ═══════════════════════════════════════════════════════════════════

const MANAGER_ROLES = ['admin','founder','ceo','manager','teamlead','team lead','team_lead','partner','senior','director'];
export function isManagerRole(user) {
  const r = (user?.role || user?.user_role || '').toLowerCase().trim();
  const p = (user?.recon_profile?.role || '').toLowerCase();
  return MANAGER_ROLES.includes(r) || p.includes('admin') || p.includes('manager') || p.includes('lead');
}
export function isFullAccessRole(user) {
  const r = (user?.role || user?.user_role || '').toLowerCase().trim();
  const p = (user?.recon_profile?.role || '').toLowerCase();
  return ['admin','founder','ceo'].includes(r) || p.includes('admin') || p.includes('founder') || p.includes('ceo');
}
export function getEmpUserId(e) { return String(e.user_id ?? e.user?.id ?? e.id); }
export function getEmpDepts(e) { return (e.department || '').split(',').map(d => d.trim().toLowerCase()).filter(Boolean); }
export function myTeamKey(user, allEmployees, teams) {
  const uid = String(user?.id || user?.pk || '');
  const myEmp = (allEmployees || []).find(e => getEmpUserId(e) === uid);
  const myDepts = myEmp ? getEmpDepts(myEmp) : [];
  if (!myDepts.length) return null;
  const t = teams.find(t => myDepts.includes((t.name || '').trim().toLowerCase()));
  return t ? t.key : null;
}
/** getMakersCheckers(job) → {makers, checkers} — reuses the same data
 * accessor idea as JobCard's cardConfig, since ITR nests these under
 * module_assignments_summary[assignmentKey] while GST has them directly
 * on the job. */
export function jobInTeam(job, team, getMakersCheckers) {
  if (!team) return true;
  const { makers = [], checkers = [] } = getMakersCheckers ? getMakersCheckers(job) : job;
  return [...makers, ...checkers].some(u => team.memberIds.has(String(u.id)));
}

/**
 * fullAccess (isFullAccessRole(user)) sees a dropdown of every team;
 * everyone else sees an "All / My Team" toggle if they belong to one, or
 * nothing at all if they don't (matches ITR's exact current behavior).
 */
export function TeamScopeControl({ user, allEmployees, teams, value, onChange }) {
  const fullAccess = isFullAccessRole(user);

  if (fullAccess) {
    return (
      <select value={value} onChange={e => onChange(e.target.value)}
        style={{ padding:'8px 14px', borderRadius:10, border:`1.5px solid ${BRD}`, fontSize:13,
          background:WH, color:'#1C1E2E', cursor:'pointer', outline:'none', fontFamily:'inherit', fontWeight:600 }}>
        <option value="All">👥 All Teams</option>
        {teams.map(t => <option key={t.key} value={t.key}>{t.name}</option>)}
      </select>
    );
  }

  const myKey = myTeamKey(user, allEmployees, teams);
  if (!myKey) return null;

  return (
    <div style={{display:'flex',border:`1.5px solid ${BRD}`,borderRadius:8,overflow:'hidden',background:WH}}>
      {[{k:'All',label:'All'},{k:myKey,label:'My Team'}].map(({k,label})=>(
        <button key={k} onClick={()=>onChange(k)}
          style={{padding:'8px 14px',fontSize:12,fontWeight:600,cursor:'pointer',border:'none',
            background:value===k?P:WH,color:value===k?WH:MUT,fontFamily:'inherit'}}>
          {label}
        </button>
      ))}
    </div>
  );
}

/**
 * The full job-list page: header (icon/title/subtitle + optional team
 * scope + optional due-month filter + export + grid/list toggle),
 * search+status filter row, paginated grid/list of JobCards, empty
 * state. Modeled directly on IncomeTaxPage.js's JobListView (the more
 * feature-complete of the two found) — GST/other callers opt into only
 * the pieces they have data for via listConfig, rather than this being
 * cut down to a lowest common denominator.
 *
 * listConfig:
 *   cardConfig                 → passed straight through to JobCard
 *   statuses                   → status filter dropdown options (raw
 *                                 values, e.g. ITR's ['To Do',...] or
 *                                 GST's ['todo','in_progress',...])
 *   getLabel                   → also used for the status dropdown's
 *                                 option text, not just Pill
 *   getSearchText(job)         → string to match against; the search
 *                                 placeholder is built from
 *                                 searchPlaceholder below
 *   searchPlaceholder          → string
 *   matchesStatusFilter(job, statusFilter) → custom status-match logic
 *                                 (ITR's "Freezed" pseudo-status maps to
 *                                 either Filed or Closed, not a literal
 *                                 field match)
 *   getDueDate(job)            → for the optional due-month filter
 *   showDueMonthFilter         → boolean, default false
 *   showTeamScope              → boolean, default false — needs
 *                                 teams/user/allEmployees/selectedTeamKey/
 *                                 onTeamChange/getMakersCheckers(job) too
 *   renderAssignModal(job, onClose, onSaved) → JSX for whatever assign
 *                                 flow this caller uses (AssignModal for
 *                                 ITR/TDS/Advance Tax, MCModal for GST) —
 *                                 rendered when a card's Assign is
 *                                 clicked; omit to disable assignment
 *                                 entirely from this list.
 *   onExport(filteredJobs, filenameHint) → async; omit to hide the
 *                                 export button entirely rather than
 *                                 show one that does nothing.
 *   pageSize                   → default 60
 */
export function JobListView({
  title, subtitle, icon, jobs, onBack, onJobClick, canAssign, filenameHint,
  search, onSearchChange, statusFilter, onStatusFilterChange, dueMonth, onDueMonthChange,
  teams, allEmployees, user, selectedTeamKey, onTeamChange, onJobAssigned,
  listConfig,
}) {
  const {
    cardConfig, statuses = [], getLabel, getSearchText, searchPlaceholder = 'Search…',
    matchesStatusFilter, getDueDate, showDueMonthFilter = false, showTeamScope = false,
    getMakersCheckers, renderAssignModal, onExport, pageSize = 60,
  } = listConfig;

  const [listView, setListView] = useState('grid');
  const [assignJob, setAssignJob] = useState(null);
  const [localJobs, setLocalJobs] = useState(jobs);
  useEffect(() => setLocalJobs(jobs), [jobs]);

  const inp = { padding:'9px 12px', borderRadius:8, border:`1.5px solid ${BRD}`, fontSize:13,
    background:WH, color:'#1C1E2E', outline:'none', fontFamily:'inherit' };

  const filtered = useMemo(() => localJobs.filter(j => {
    if (statusFilter !== 'All') {
      if (matchesStatusFilter ? !matchesStatusFilter(j, statusFilter) : j.status !== statusFilter) return false;
    }
    if (showDueMonthFilter && dueMonth) {
      const d = getDueDate ? getDueDate(j) : j.due_date;
      if (!(d || '').startsWith(dueMonth)) return false;
    }
    const sq = (search || '').toLowerCase();
    if (sq && !(getSearchText ? getSearchText(j) : '').toLowerCase().includes(sq)) return false;
    if (showTeamScope && selectedTeamKey && selectedTeamKey !== 'All') {
      const team = teams.find(t => t.key === selectedTeamKey);
      if (!jobInTeam(j, team, getMakersCheckers)) return false;
    }
    return true;
  }), [localJobs, statusFilter, matchesStatusFilter, showDueMonthFilter, dueMonth, getDueDate, search, getSearchText, showTeamScope, selectedTeamKey, teams, getMakersCheckers]);

  const [page, setPage] = useState(1);
  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  useEffect(() => { setPage(1); }, [search, statusFilter, dueMonth, localJobs.length]);
  useEffect(() => { if (page > totalPages) setPage(totalPages); }, [totalPages, page]);
  const pageStart = (page - 1) * pageSize;
  const pagedJobs = filtered.slice(pageStart, pageStart + pageSize);

  const handleAssignSaved = (jobId, updated) => {
    setLocalJobs(prev => prev.map(j => j.id === jobId ? { ...j, ...updated } : j));
    setAssignJob(null);
    onJobAssigned && onJobAssigned(updated);
  };

  return (
    <div>
      {assignJob && renderAssignModal && renderAssignModal(assignJob, () => setAssignJob(null), (updated) => handleAssignSaved(assignJob.id, updated))}

      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:18, flexWrap:'wrap', gap:10 }}>
        <div>
          <h2 style={{ fontSize:20, fontWeight:800, color:'#111827', margin:0 }}>{icon} {title}</h2>
          {subtitle && <p style={{ fontSize:13, color:MUT, margin:'4px 0 0' }}>{subtitle}</p>}
        </div>
        <div style={{ display:'flex', gap:10, alignItems:'center', flexWrap:'wrap' }}>
          {showTeamScope && isManagerRole(user) && (
            <TeamScopeControl user={user} allEmployees={allEmployees} teams={teams}
              value={selectedTeamKey} onChange={onTeamChange} />
          )}
          {showDueMonthFilter && (
            <>
              <input type="month" value={dueMonth} onChange={e => onDueMonthChange(e.target.value)}
                title="Filter by due date's month"
                style={{ padding:'8px 12px', borderRadius:8, border:`1.5px solid ${dueMonth?P:BRD}`,
                  fontSize:13, background:WH, color:dueMonth?P:'#1C1E2E', cursor:'pointer', outline:'none',
                  fontFamily:'inherit', fontWeight:dueMonth?700:400 }} />
              {dueMonth && (
                <button onClick={() => onDueMonthChange('')}
                  style={{ padding:'8px 12px', borderRadius:8, border:`1.5px solid ${BRD}`, background:WH,
                    fontSize:12, cursor:'pointer', color:MUT, fontFamily:'inherit' }}>
                  ✕ Month
                </button>
              )}
            </>
          )}
          {onExport && (
            <button onClick={() => onExport(filtered, (filenameHint || title).replace(/\s+/g, '_'))}
              style={{ padding:'8px 14px', borderRadius:8, border:`1.5px solid ${BRD}`, background:WH,
                fontSize:13, fontWeight:600, cursor:'pointer', color:'#1C1E2E', fontFamily:'inherit',
                display:'flex', alignItems:'center', gap:6 }}
              onMouseEnter={e => { e.currentTarget.style.borderColor = P; e.currentTarget.style.color = P; }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = BRD; e.currentTarget.style.color = '#1C1E2E'; }}>
              ⬇ Download
            </button>
          )}
          <div style={{ display:'flex', border:`1.5px solid ${BRD}`, borderRadius:8, overflow:'hidden', background:WH }}>
            {[{k:'grid',i:'⊞'},{k:'list',i:'≡'}].map(({k,i}) => (
              <button key={k} onClick={() => setListView(k)}
                style={{ padding:'8px 12px', fontSize:15, cursor:'pointer', border:'none',
                  background:listView===k?P:WH, color:listView===k?WH:MUT }}>{i}</button>
            ))}
          </div>
        </div>
      </div>

      <div style={{ display:'flex', gap:10, marginBottom:14, flexWrap:'wrap', alignItems:'center' }}>
        <div style={{ position:'relative', flex:1, minWidth:180 }}>
          <span style={{ position:'absolute', left:10, top:'50%', transform:'translateY(-50%)', color:MUT, fontSize:13, pointerEvents:'none' }}>🔍</span>
          <input value={search} onChange={e => onSearchChange(e.target.value)} placeholder={searchPlaceholder}
            style={{ ...inp, paddingLeft:32, width:'100%', boxSizing:'border-box' }} />
        </div>
        <select value={statusFilter} onChange={e => onStatusFilterChange(e.target.value)} style={{ ...inp, cursor:'pointer' }}>
          <option value="All">{getLabel ? getLabel('All') : 'All'}</option>
          {statuses.map(s => <option key={s} value={s}>{getLabel ? getLabel(s) : s}</option>)}
        </select>
        {(search || statusFilter !== 'All' || dueMonth) && (
          <button onClick={() => { onSearchChange(''); onStatusFilterChange('All'); onDueMonthChange && onDueMonthChange(''); }}
            style={{ ...inp, cursor:'pointer', color:MUT }}>✕ Clear</button>
        )}
        <span style={{ fontSize:12, color:MUT, marginLeft:'auto' }}>{filtered.length} of {localJobs.length} jobs</span>
      </div>

      {filtered.length === 0 ? (
        <div style={{ textAlign:'center', padding:'5rem 2rem', color:MUT, background:WH, border:`1.5px solid ${BRD}`, borderRadius:14 }}>
          <div style={{ fontSize:36, opacity:.25, marginBottom:12 }}>📂</div>
          <div style={{ fontSize:14, fontWeight:600 }}>No jobs match your filters</div>
        </div>
      ) : listView === 'list' ? (
        <div style={{ display:'flex', flexDirection:'column', gap:6 }}>
          {pagedJobs.map(job => (
            <JobCard key={job.id} job={job} compact cardConfig={cardConfig}
              onOpen={() => onJobClick(job)} onAssign={() => setAssignJob(job)} canAssign={canAssign} />
          ))}
        </div>
      ) : (
        <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(268px,1fr))', gap:12, alignItems:'stretch' }}>
          {pagedJobs.map(job => (
            <JobCard key={job.id} job={job} cardConfig={cardConfig}
              onOpen={() => onJobClick(job)} onAssign={() => setAssignJob(job)} canAssign={canAssign} />
          ))}
        </div>
      )}

      {filtered.length > 0 && totalPages > 1 && (
        <div style={{ display:'flex', alignItems:'center', justifyContent:'center', gap:10, marginTop:20 }}>
          <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page <= 1}
            style={{ ...inp, cursor: page <= 1 ? 'default' : 'pointer', opacity: page <= 1 ? .5 : 1 }}>‹ Prev</button>
          <span style={{ fontSize:12, color:MUT }}>Page {page} of {totalPages}</span>
          <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page >= totalPages}
            style={{ ...inp, cursor: page >= totalPages ? 'default' : 'pointer', opacity: page >= totalPages ? .5 : 1 }}>Next ›</button>
        </div>
      )}
    </div>
  );
}

/**
 * Sourced directly from IncomeTaxPage.js — already fully generic (no
 * ITR-specific field names at all), so moved here as-is.
 * data: [{ label, value, color }]
 */
export function StatusBreakdown({ data, onSliceClick }) {
  const [hov, setHov] = useState(null);
  const total = data.reduce((s, d) => s + d.value, 0);
  if (!total) return <div style={{ color:MUT, fontSize:12, padding:'20px 0', textAlign:'center' }}>No data</div>;
  return (
    <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
      {data.map((d, i) => {
        const pct = Math.round((d.value / total) * 100);
        return (
          <div key={d.label} onClick={() => onSliceClick(d.label)}
            style={{ cursor:'pointer', opacity: hov !== null && hov !== i ? .45 : 1, transition:'opacity .15s' }}
            onMouseEnter={() => setHov(i)} onMouseLeave={() => setHov(null)}>
            <div style={{ display:'flex', justifyContent:'space-between', marginBottom:4, alignItems:'center' }}>
              <div style={{ display:'flex', alignItems:'center', gap:7 }}>
                <div style={{ width:9, height:9, borderRadius:'50%', background:d.color, flexShrink:0 }} />
                <span style={{ fontSize:12, color:'#1C1E2E', fontWeight:500 }}>{d.label}</span>
              </div>
              <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                <span style={{ fontSize:12, fontWeight:700, color:d.color }}>{d.value}</span>
                <span style={{ fontSize:10, color:MUT, width:28, textAlign:'right' }}>{pct}%</span>
              </div>
            </div>
            <div style={{ height:5, borderRadius:99, background:'#F3F4F6', overflow:'hidden' }}>
              <div style={{ height:'100%', width:`${pct}%`, background:d.color, borderRadius:99, transition:'width .5s ease' }} />
            </div>
          </div>
        );
      })}
    </div>
  );
}

/**
 * A short list of jobs shown as summary rows (name / subtitle / status
 * Pill), used for both "My Pending Tasks" and "Recent Jobs" panels.
 * Reuses the SAME cardConfig object already built for JobCard
 * (getName/getSubtitle/getStatus/statusBadgeMap/getLabel) rather than
 * inventing a second config shape for the same data.
 */
export function JobSummaryList({ jobs, cardConfig, onJobClick, emptyIcon = '📂', emptyText = 'Nothing here' }) {
  const { getName, getSubtitle, getStatus, statusBadgeMap, getLabel } = cardConfig;
  if (!jobs.length) {
    return (
      <div style={{ textAlign:'center', padding:'24px 0', color:MUT }}>
        <div style={{ fontSize:28, opacity:.3, marginBottom:8 }}>{emptyIcon}</div>
        <div style={{ fontSize:12, fontWeight:500 }}>{emptyText}</div>
      </div>
    );
  }
  return (
    <div style={{ display:'flex', flexDirection:'column', gap:6 }}>
      {jobs.map(job => (
        <div key={job.id} onClick={() => onJobClick(job)}
          style={{ display:'flex', alignItems:'center', gap:10, padding:'9px 11px', borderRadius:9,
            border:`1px solid ${BRD}`, background:WH, cursor:'pointer', transition:'all .15s', flexShrink:0 }}
          onMouseEnter={e => { e.currentTarget.style.borderColor = P; e.currentTarget.style.background = PL; }}
          onMouseLeave={e => { e.currentTarget.style.borderColor = BRD; e.currentTarget.style.background = WH; }}>
          <div style={{ flex:1, minWidth:0 }}>
            <div style={{ fontSize:12, fontWeight:600, color:'#1C1E2E', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{getName(job)}</div>
            <div style={{ fontSize:10, color:MUT, marginTop:1 }}>{getSubtitle(job, true)}</div>
          </div>
          <Pill status={getStatus ? getStatus(job) : job.status} statusBadgeMap={statusBadgeMap} getLabel={getLabel} />
        </div>
      ))}
    </div>
  );
}

/**
 * The full dashboard page: header (title/count + filter controls +
 * optional team scope + optional "Assigned"/"Generate Jobs" buttons +
 * "All Jobs" button), 4 top-level stat cards (Total/Active/Overdue/My
 * Pending), a row of status-group cards, and a 3-column bottom row
 * (Status Breakdown chart, My Pending Tasks, Recent Jobs). Modeled
 * directly on IncomeTaxPage.js's DashboardView.
 *
 * dashboardConfig:
 *   title                       → page heading
 *   groups                      → { key: {label,icon,color,light,statuses:[]} }
 *   cardConfig                  → same object built for JobCard/JobListView;
 *                                  reused here for MyTasksPanel/RecentJobs
 *   getStatusLabel(job)         → status value used for the group/status
 *                                 breakdown counts (may differ from
 *                                 cardConfig.getStatus if a caller
 *                                 collapses several real statuses into
 *                                 one displayed group, e.g. ITR's
 *                                 Filed/Closed → "Freezed")
 *   statusOrder                 → array controlling breakdown sort order
 *   statusColors                → { status: hexColor } for the breakdown
 *                                 chart specifically (single hex, not a
 *                                 {bg,color} pill pair)
 *   computeOverdue(jobs)        → returns the overdue subset
 *   computeMyPending(jobs, user) → returns the "assigned to you" subset
 *   renderFilterControls()      → JSX for whatever period/date-range
 *                                 picker this caller uses — deliberately
 *                                 not shared, since ITR uses an FY-period
 *                                 dropdown and GST uses a from/to month
 *                                 range; only the slot is shared
 *   showTeamScope, teams, allEmployees, user, selectedTeamKey, onTeamChange
 *   showGenerateJobsButton, onNavigateToGenerateJobs
 */
export function DashboardView({
  dashboardConfig, jobs, user, isManager,
  onGroupClick, onJobClick, onViewAll, onViewAssigned, onOverdueClick, onMyPendingClick,
}) {
  const {
    title, groups, cardConfig, getStatusLabel, statusOrder = [], statusColors = {},
    computeOverdue, computeMyPending, renderFilterControls,
    showTeamScope = false, teams, allEmployees, selectedTeamKey, onTeamChange,
    showGenerateJobsButton = false, onNavigateToGenerateJobs, subtitleExtra,
  } = dashboardConfig;

  // All of this was previously recomputed from scratch on every render —
  // multiple full scans/filters over `jobs` plus a full array sort, none
  // of it gated behind useMemo. Fine at a few dozen jobs, but with
  // 1000+ jobs this became real, measurable work happening far more
  // often than the underlying data actually changes (any parent state
  // update — a hover, a toast, anything — re-triggered all of it).
  const { statusData, groupCounts, totalActive, overdueJobs, myPendingJobs, recentJobs } = useMemo(() => {
    const statusCounts = {};
    jobs.forEach(j => {
      const st = getStatusLabel ? getStatusLabel(j) : (j.status || 'To Do');
      statusCounts[st] = (statusCounts[st] || 0) + 1;
    });
    const statusData = Object.entries(statusCounts).filter(([, v]) => v > 0)
      .sort((a, b) => {
        const ia = statusOrder.indexOf(a[0]), ib = statusOrder.indexOf(b[0]);
        return (ia === -1 ? 999 : ia) - (ib === -1 ? 999 : ib);
      })
      .map(([label, value]) => ({ label, value, color: statusColors[label] || '#9CA3AF' }));

    const groupCounts = {};
    Object.entries(groups).forEach(([k, g]) => {
      groupCounts[k] = jobs.filter(j => g.statuses.includes(j.status || 'To Do')).length;
    });

    const totalActive = jobs.filter(j => !['Filed','Closed','filed','completed'].includes(j.status || '')).length;
    const overdueJobs = computeOverdue ? computeOverdue(jobs) : [];
    const myPendingJobs = computeMyPending ? computeMyPending(jobs, user) : [];
    const recentJobs = [...jobs]
      .sort((a, b) => new Date(b.updated_at || b.created_at || 0) - new Date(a.updated_at || a.created_at || 0))
      .slice(0, 8);

    return { statusData, groupCounts, totalActive, overdueJobs, myPendingJobs, recentJobs };
  }, [jobs, groups, getStatusLabel, statusOrder, statusColors, computeOverdue, computeMyPending, user]);

  return (
    <div>
      <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between', marginBottom:24, flexWrap:'wrap', gap:12 }}>
        <div>
          <h1 style={{ fontSize:24, fontWeight:900, color:'#111827', margin:0, letterSpacing:'-.03em' }}>{title}</h1>
          <p style={{ fontSize:13, color:MUT, margin:'5px 0 0' }}>
            {jobs.length} jobs{subtitleExtra ? ` · ${subtitleExtra}` : ''}{selectedTeamKey && selectedTeamKey !== 'All' ? ` · ${selectedTeamKey}` : ''} · {totalActive} active
          </p>
        </div>
        <div style={{ display:'flex', gap:8, alignItems:'center', flexWrap:'wrap' }}>
          {showTeamScope && isManager && (
            <TeamScopeControl user={user} allEmployees={allEmployees} teams={teams}
              value={selectedTeamKey} onChange={onTeamChange} />
          )}
          {renderFilterControls && renderFilterControls()}
          {isManager && (
            <button onClick={onViewAssigned} style={{ padding:'8px 16px', borderRadius:10, border:`1.5px solid ${BRD}`,
              background:WH, fontSize:13, fontWeight:600, cursor:'pointer', color:'#1C1E2E', fontFamily:'inherit' }}>
              👥 Assigned
            </button>
          )}
          {isManager && showGenerateJobsButton && onNavigateToGenerateJobs && (
            <button onClick={onNavigateToGenerateJobs} style={{ padding:'8px 16px', borderRadius:10, border:`1.5px solid ${P}`,
              background:P, fontSize:13, fontWeight:600, cursor:'pointer', color:WH, fontFamily:'inherit' }}>
              🎯 Generate Jobs
            </button>
          )}
          <button onClick={onViewAll} style={{ padding:'8px 16px', borderRadius:10, border:`1.5px solid ${P}`,
            background:P, fontSize:13, fontWeight:600, cursor:'pointer', color:WH, fontFamily:'inherit' }}>
            📋 All Jobs
          </button>
        </div>
      </div>

      <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(200px,1fr))', gap:16, marginBottom:16, alignItems:'stretch' }}>
        {[
          { label:'Total Jobs', key:'total', value:jobs.length, color:P, icon:'📊', onClick:onViewAll, sub:'all filing jobs' },
          { label:'Active', key:'active', value:totalActive, color:GR, icon:'🔄', onClick:() => onGroupClick('_active'), sub:'in progress' },
          { label:'Overdue', key:'overdue', value:overdueJobs.length, color: overdueJobs.length > 0 ? RED : MUT, icon:'⏰', onClick:() => onOverdueClick(overdueJobs), sub:'past due date' },
          { label:'My Pending Tasks', key:'mypending', value:myPendingJobs.length, color:AMB, icon:'📌', onClick:() => onMyPendingClick(myPendingJobs), sub:'assigned to you' },
        ].map(c => (
          <div key={c.key} onClick={c.onClick}
            style={{ background:WH, border:`1.5px solid ${BRD}`, borderRadius:16, padding:'18px 20px',
              cursor:'pointer', transition:'all .2s', position:'relative', overflow:'hidden',
              display:'flex', flexDirection:'column', justifyContent:'center', minHeight:120 }}
            onMouseEnter={e => { e.currentTarget.style.borderColor = c.color; e.currentTarget.style.boxShadow = `0 6px 20px ${c.color}18`; }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = BRD; e.currentTarget.style.boxShadow = 'none'; }}>
            <div style={{ position:'absolute', top:0, left:0, right:0, height:4, background:c.color, borderRadius:'16px 16px 0 0' }} />
            <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:8 }}>
              <span style={{ fontSize:22 }}>{c.icon}</span>
            </div>
            <div style={{ fontSize:34, fontWeight:900, color:c.color, lineHeight:1, marginBottom:5 }}>{c.value}</div>
            <div style={{ fontSize:13, fontWeight:600, color:'#1C1E2E' }}>{c.label}</div>
            <div style={{ fontSize:10, color:MUT, marginTop:2 }}>{c.sub}</div>
          </div>
        ))}
      </div>

      <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(200px,1fr))', gap:16, marginBottom:20, alignItems:'stretch' }}>
        {Object.entries(groups).map(([k, g]) => (
          <div key={k} onClick={() => onGroupClick(k)}
            style={{ background:WH, border:`1.5px solid ${BRD}`, borderRadius:16, padding:'20px 22px',
              cursor:'pointer', transition:'all .2s', position:'relative', overflow:'hidden',
              display:'flex', flexDirection:'column', justifyContent:'center', minHeight:132 }}
            onMouseEnter={e => { e.currentTarget.style.borderColor = g.color; e.currentTarget.style.background = g.light; e.currentTarget.style.boxShadow = `0 6px 20px ${g.color}20`; }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = BRD; e.currentTarget.style.background = WH; e.currentTarget.style.boxShadow = 'none'; }}>
            <div style={{ position:'absolute', top:0, left:0, right:0, height:4, background:g.color, borderRadius:'16px 16px 0 0' }} />
            <div style={{ fontSize:24, marginBottom:8 }}>{g.icon}</div>
            <div style={{ fontSize:36, fontWeight:900, color:g.color, lineHeight:1, marginBottom:6 }}>{groupCounts[k] || 0}</div>
            <div style={{ fontSize:13, fontWeight:600, color:'#1C1E2E', marginBottom:2 }}>{g.label}</div>
            <div style={{ fontSize:10, color:MUT }}>{(g.statuses || []).slice(0, 2).map(s => cardConfig.getLabel ? cardConfig.getLabel(s) : s).join(', ')}</div>
          </div>
        ))}
      </div>

      <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(300px,1fr))', gap:16, marginBottom:0 }}>
        <div style={{ background:WH, border:`1.5px solid ${BRD}`, borderRadius:16, padding:'22px', display:'flex', flexDirection:'column', height:360 }}>
          <div style={{ fontSize:11, fontWeight:700, textTransform:'uppercase', letterSpacing:'.08em', color:MUT, marginBottom:16, flexShrink:0 }}>
            Status Breakdown <span style={{ fontWeight:400, fontSize:10, marginLeft:4 }}>· click to view</span>
          </div>
          <div style={{ overflowY:'auto', flex:1 }}>
            <StatusBreakdown data={statusData} onSliceClick={st => {
              const gk = Object.keys(groups).find(k => groups[k].statuses.includes(st));
              if (gk) onGroupClick(gk);
            }} />
          </div>
        </div>
        <div style={{ background:WH, border:`1.5px solid ${BRD}`, borderRadius:16, padding:'22px', display:'flex', flexDirection:'column', height:360 }}>
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:14, flexShrink:0 }}>
            <div style={{ fontSize:11, fontWeight:700, textTransform:'uppercase', letterSpacing:'.08em', color:MUT }}>My Pending Tasks</div>
            {myPendingJobs.length > 0 && (
              <span style={{ background:AMB, color:WH, borderRadius:99, padding:'2px 9px', fontSize:11, fontWeight:700, minWidth:22, textAlign:'center' }}>{myPendingJobs.length}</span>
            )}
          </div>
          <div style={{ overflowY:'auto', flex:1 }}>
            <JobSummaryList jobs={myPendingJobs} cardConfig={cardConfig} onJobClick={onJobClick} emptyIcon="✅" emptyText="No pending tasks" />
          </div>
        </div>
        <div style={{ background:WH, border:`1.5px solid ${BRD}`, borderRadius:16, padding:'22px', display:'flex', flexDirection:'column', height:360 }}>
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:14, flexShrink:0 }}>
            <div style={{ fontSize:11, fontWeight:700, textTransform:'uppercase', letterSpacing:'.08em', color:MUT }}>Recent Jobs</div>
            <button onClick={onViewAll} style={{ fontSize:11, color:P, background:'none', border:'none', cursor:'pointer', fontFamily:'inherit', textDecoration:'underline' }}>View all</button>
          </div>
          <div style={{ overflowY:'auto', flex:1 }}>
            <JobSummaryList
              jobs={recentJobs}
              cardConfig={cardConfig} onJobClick={onJobClick} emptyIcon="📂" emptyText="No jobs yet" />
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * Assign/unassign makers & checkers for a job. Modeled directly on
 * IncomeTaxPage.js's AssignModal (same visual design), but the actual
 * data-loading and save mechanics are pluggable — ITR/TDS/Advance Tax
 * and GST call their assignment APIs completely differently (ITR does
 * one assign/unassign call per changed user; GST does a single bulk
 * "replace the whole list" call), so forcing one convention onto the
 * other isn't safe. Only the modal UI itself is shared.
 *
 *   title, subtitle       → header text (subtitle defaults to a maxPerRole hint)
 *   maxPerRole            → default 2
 *   fetchUsers()          → Promise<[{id, full_name, email}]> — candidate list
 *   fetchInitial()        → Promise<{makers:[ids], checkers:[ids]}> — current selection
 *   onSave({makers, checkers, initialMakers, initialCheckers}) → Promise<data>;
 *                            actually persists the change, return value is
 *                            passed to onSaved
 *   onClose, onSaved      → same as before
 */
export function AssignModal({ title, subtitle, maxPerRole = 2, fetchUsers, fetchInitial, onSave, onClose, onSaved }) {
  const [users, setUsers] = useState([]);
  const [search, setSearch] = useState('');
  const [makers, setMakers] = useState([]);
  const [checkers, setCheckers] = useState([]);
  const [initialMakers, setInitialMakers] = useState([]);
  const [initialCheckers, setInitialCheckers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    Promise.all([fetchUsers(), fetchInitial()])
      .then(([userList, initial]) => {
        if (!active) return;
        // Active users only, A→Z by name (same order in every feature's assign modal).
        const nameKey = (u) => (u.full_name || u.email || '').toLowerCase();
        setUsers(Array.isArray(userList)
          ? userList.filter(u => u.is_active !== false).sort((a, b) => nameKey(a).localeCompare(nameKey(b)))
          : []);
        const m = (initial?.makers || []).map(String);
        const c = (initial?.checkers || []).map(String);
        setMakers(m); setCheckers(c);
        setInitialMakers(m); setInitialCheckers(c);
      })
      .catch(e => { if (active) setError(e.message || 'Failed to load current assignment'); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const filtered = users.filter(u => !search || (u.full_name || u.email || '').toLowerCase().includes(search.toLowerCase()));

  const toggle = (list, setList, id, max, other) => {
    const sid = String(id);
    if (list.includes(sid)) setList(list.filter(x => x !== sid));
    else if (list.length < max && !other.includes(sid)) setList([...list, sid]);
  };

  const save = async () => {
    setSaving(true); setError('');
    try {
      const updated = await onSave({ makers, checkers, initialMakers, initialCheckers });
      onSaved(updated);
    } catch (e) {
      setError(e.message || 'Failed to save');
      setSaving(false);
    }
  };

  return (
    <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.5)', zIndex:999,
      display:'flex', alignItems:'center', justifyContent:'center', padding:16 }}
      onClick={e => e.target === e.currentTarget && onClose()}>
      <div style={{ background:WH, borderRadius:14, width:'100%', maxWidth:560,
        maxHeight:'85vh', display:'flex', flexDirection:'column',
        boxShadow:'0 12px 48px rgba(0,0,0,.22)' }}
        onClick={e => e.stopPropagation()}>
        <div style={{ padding:'16px 20px 12px', borderBottom:`1px solid ${BRD}`, flexShrink:0 }}>
          <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:10 }}>
            <div>
              <div style={{ fontSize:14, fontWeight:700, color:P }}>📋 {title}</div>
              <div style={{ fontSize:11, color:MUT }}>{subtitle || `Assign makers and checkers (max ${maxPerRole} each)`}</div>
            </div>
            <div style={{ display:'flex', gap:8 }}>
              <button onClick={onClose} style={{ padding:'6px 14px', borderRadius:7, border:`1px solid ${BRD}`,
                background:WH, fontSize:12, cursor:'pointer', color:'#666', fontFamily:'inherit' }}>Cancel</button>
              <button onClick={save} disabled={saving || loading} style={{ padding:'6px 16px', borderRadius:7,
                background:P, color:WH, border:'none', fontSize:12, cursor:'pointer', fontWeight:600,
                opacity: (saving || loading) ? .6 : 1, fontFamily:'inherit' }}>{saving ? 'Saving…' : 'Save'}</button>
            </div>
          </div>
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search users…"
            style={{ width:'100%', padding:'7px 12px', borderRadius:8, border:`1px solid ${BRD}`,
              fontSize:12, boxSizing:'border-box', outline:'none', fontFamily:'inherit' }} />
        </div>
        <div style={{ flex:1, overflowY:'auto', padding:'14px 20px' }}>
          {error && <div style={{ fontSize:12, color:RED, background:'#FEF0F0', padding:'7px 10px',
            borderRadius:6, marginBottom:10 }}>{error}</div>}
          {loading ? (
            <div style={{ textAlign:'center', padding:'2rem 0', color:MUT, fontSize:12 }}>Loading…</div>
          ) : (
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:16 }}>
              {[{ label:'Makers', max:maxPerRole, list:makers, setList:setMakers, other:checkers, color:GR, bg:GL },
                { label:'Checkers', max:maxPerRole, list:checkers, setList:setCheckers, other:makers, color:PUR, bg:PURL },
              ].map(({ label, max, list, setList, other, color, bg }) => (
                <div key={label}>
                  <div style={{ fontSize:11, fontWeight:700, color, textTransform:'uppercase',
                    letterSpacing:'.05em', marginBottom:8, paddingBottom:6, borderBottom:`2px solid ${color}` }}>
                    {label} ({list.length}/{max})
                  </div>
                  {filtered.length === 0 && (
                    <div style={{ textAlign:'center', padding:'2rem 0.5rem', color:MUT, fontSize:11 }}>
                      {search ? 'No users match search' : 'No users found'}
                    </div>
                  )}
                  {filtered.map(u => {
                    const sid = String(u.id);
                    const sel = list.includes(sid);
                    const inOther = other.includes(sid);
                    const atMax = list.length >= max && !sel;
                    const init = (u.full_name || u.email || '?').split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();
                    return (
                      <div key={u.id} onClick={() => !inOther && !atMax && toggle(list, setList, u.id, max, other)}
                        style={{ display:'flex', alignItems:'center', gap:8, padding:'7px 10px',
                          borderRadius:7, marginBottom:4, cursor: (inOther || atMax) ? 'not-allowed' : 'pointer',
                          border:`1px solid ${sel ? color : BRD}`,
                          background: sel ? bg : inOther ? '#F5F5F5' : WH,
                          opacity: (inOther || atMax) ? .5 : 1, transition:'all .12s' }}>
                        <div style={{ width:28, height:28, borderRadius:'50%', background: sel ? color : '#E5E7EB',
                          color: sel ? WH : '#555', display:'flex', alignItems:'center',
                          justifyContent:'center', fontSize:10, fontWeight:700, flexShrink:0 }}>{init}</div>
                        <div style={{ minWidth:0 }}>
                          <div style={{ fontSize:12, fontWeight: sel ? 600 : 400, color: sel ? color : '#1C1E2E',
                            overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
                            {u.full_name || u.email}</div>
                          {u.role && <div style={{ fontSize:10, color:MUT }}>{u.role}</div>}
                        </div>
                        {sel && <div style={{ marginLeft:'auto', color, fontSize:14, flexShrink:0 }}>✓</div>}
                        {inOther && !sel && <span style={{ fontSize:9, color:MUT, flexShrink:0, marginLeft:'auto' }}>other</span>}
                      </div>
                    );
                  })}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════
// Generic helpers & small UI — first used by Legal Services, but nothing
// here is legal-specific, so any feature can import them.
// ═══════════════════════════════════════════════════════════════════

export const INK = '#1C1E2E';

// ── API / list helpers ──
export const toList = (res) => (Array.isArray(res?.data) ? res.data : res?.data?.results || []);
export const idOf = (m) => (typeof m === 'object' && m !== null ? m.id : m);
export const isInList = (list, user) => (list || []).some((m) => idOf(m) === user?.id);

// ── Employees for AssignModal ──
// One employee list for every feature's maker/checker picker.
// Pass your app's axios instance: fetchUsers={() => fetchAssignableEmployees(api)}
// Returns AssignModal's shape; id is the USER id (getEmpUserId), because
// makers/checkers are stored as user ids, not employee-record ids.
export const EMPLOYEE_LIST_URL = '/employee/employees/users';
export const fetchAssignableEmployees = (api, url = EMPLOYEE_LIST_URL) =>
  api.get(url).then((res) =>
    toList(res).map((e) => ({
      id: getEmpUserId(e),
      full_name: e.full_name || e.name || `${e.first_name || ''} ${e.last_name || ''}`.trim() || e.email || 'Unknown',
      email: e.email || e.user?.email || e.username,
      role: e.role || e.designation || e.department || '',
      is_active: e.is_active ?? e.user?.is_active,
    }))
  );

// ── Dates ──
export function fmtDate(d) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}
export function fmtDateTime(d) {
  if (!d) return '—';
  return new Date(d).toLocaleString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', hour12: true });
}
export function fmtRelativeTime(d) {
  if (!d) return '';
  const diff = Math.floor((Date.now() - new Date(d)) / 1000);
  if (diff < 60) return 'just now';
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  if (diff < 604800) return `${Math.floor(diff / 86400)}d ago`;
  return fmtDate(d);
}
export function daysUntil(date) {
  if (!date) return null;
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const d = new Date(date); d.setHours(0, 0, 0, 0);
  return Math.ceil((d - today) / 86400000);
}

// ── Files ──
export function openFile(docOrUrl) {
  const url = typeof docOrUrl === 'string' ? docOrUrl : docOrUrl?.file_url || docOrUrl?.file;
  if (url) window.open(url, '_blank', 'noopener,noreferrer');
}
export async function downloadFile(fileUrl, fileName) {
  if (!fileUrl) return;
  const res = await fetch(fileUrl);
  const url = window.URL.createObjectURL(await res.blob());
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName || 'download';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  window.URL.revokeObjectURL(url);
}
export const downloadDoc = (doc) => downloadFile(doc?.file_url, doc?.file_name || doc?.document_name);

// ── Small UI ──
export function SectionTitle({ children, right, style }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, margin: '20px 0 10px', paddingBottom: 6, borderBottom: '1px solid var(--color-slate-200)', ...style }}>
      <div style={{ fontSize: 'var(--font-size-xs)', fontWeight: 700, color: 'var(--color-slate-600)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{children}</div>
      {right}
    </div>
  );
}

export function Field({ label, value, mono, highlight }) {
  const empty = value === null || value === undefined || value === '' || value === '—';
  return (
    <div style={{ minWidth: 0 }}>
      <div style={{ fontSize: 11, fontWeight: 600, color: MUT, marginBottom: 3 }}>{label}</div>
      <div style={{ fontSize: 13, fontWeight: 600, wordBreak: 'break-word', lineHeight: 1.3, color: empty ? 'var(--color-slate-400)' : highlight ? P : INK, fontFamily: mono ? 'monospace' : 'inherit' }}>
        {empty ? '—' : value}
      </div>
    </div>
  );
}

export function EmptyState({ icon = '📂', text, children, compact }) {
  return (
    <div style={{ textAlign: 'center', padding: compact ? '20px 12px' : '48px 20px', color: MUT, background: WH, border: compact ? 'none' : `1px solid ${BRD}`, borderRadius: 12 }}>
      <div style={{ fontSize: compact ? 24 : 34, opacity: 0.3, marginBottom: 8 }}>{icon}</div>
      <div style={{ fontSize: 13, fontWeight: 600 }}>{text}</div>
      {children}
    </div>
  );
}

export function ErrorBanner({ children }) {
  if (!children) return null;
  return (
    <div style={{ padding: '10px 14px', background: 'var(--color-danger-bg)', border: '1px solid #FECACA', borderRadius: 'var(--radius-md)', color: 'var(--color-danger)', fontSize: 13, fontWeight: 600, marginBottom: 12 }}>
      {children}
    </div>
  );
}

// Compact file row. statusMap: optional { status: { label, bg, color } } for a small badge.
export function FileChip({ name, icon = '📄', status, statusMap, onOpen, onDownload, onDelete, canDelete, deleting, width = 240 }) {
  const [hover, setHover] = useState(false);
  const badge = status && statusMap?.[status];
  return (
    <div onClick={onOpen} onMouseEnter={() => setHover(true)} onMouseLeave={() => setHover(false)} title={name}
      style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '4px 8px', height: 28, width: '100%', maxWidth: width, boxSizing: 'border-box',
        cursor: onOpen ? 'pointer' : 'default', background: hover ? 'var(--color-primary-light)' : WH, border: `1px solid ${hover ? P : BRD}`, borderRadius: 'var(--radius-sm)', transition: 'all .12s' }}>
      <span style={{ fontSize: 12, flexShrink: 0 }}>{icon}</span>
      <span style={{ flex: 1, minWidth: 0, fontSize: 11, fontWeight: 600, color: INK, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', textAlign: 'left' }}>{name || 'file'}</span>
      {badge && (
        <span style={{ fontSize: 8.5, fontWeight: 800, padding: '1px 5px', borderRadius: 3, flexShrink: 0, background: badge.bg, color: badge.color, textTransform: 'uppercase' }}>{badge.label}</span>
      )}
      <span style={{ display: 'flex', gap: 3, flexShrink: 0 }} onClick={(e) => e.stopPropagation()}>
        {onDownload && <button type="button" className="icon-btn" title="Download" onClick={onDownload} style={{ width: 20, height: 20, fontSize: 10 }}>⬇</button>}
        {canDelete && onDelete && (
          <button type="button" className="icon-btn icon-btn-danger" title="Delete" onClick={onDelete} disabled={deleting} style={{ width: 20, height: 20, fontSize: 10, opacity: deleting ? 0.5 : 1 }}>✕</button>
        )}
      </span>
    </div>
  );
}

// Same look as DashboardView's top stat cards, usable on its own.
export function StatCard({ label, value, color, icon, sub, onClick }) {
  return (
    <div onClick={onClick}
      style={{ background: WH, border: `1.5px solid ${BRD}`, borderRadius: 16, padding: '18px 20px', cursor: onClick ? 'pointer' : 'default', transition: 'all .2s',
        position: 'relative', overflow: 'hidden', display: 'flex', flexDirection: 'column', justifyContent: 'center', minHeight: 120 }}
      onMouseEnter={(e) => { e.currentTarget.style.borderColor = color; e.currentTarget.style.boxShadow = `0 6px 20px ${color}18`; }}
      onMouseLeave={(e) => { e.currentTarget.style.borderColor = BRD; e.currentTarget.style.boxShadow = 'none'; }}>
      <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 4, background: color }} />
      <span style={{ fontSize: 22, marginBottom: 8 }}>{icon}</span>
      <div style={{ fontSize: 34, fontWeight: 900, color, lineHeight: 1, marginBottom: 5 }}>{value}</div>
      <div style={{ fontSize: 13, fontWeight: 600, color: INK }}>{label}</div>
      {sub && <div style={{ fontSize: 10, color: MUT, marginTop: 2 }}>{sub}</div>}
    </div>
  );
}

// Same look as DashboardView's bottom panels (My Pending Tasks, Recent Jobs).
export function Panel({ title, subtitle, count, countColor = P, highlight, height = 360, children }) {
  return (
    <div style={{ background: WH, border: `1.5px solid ${highlight ? '#FECACA' : BRD}`, borderRadius: 16, padding: 22, display: 'flex', flexDirection: 'column', height }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14, flexShrink: 0 }}>
        <div>
          <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.08em', color: highlight ? RED : MUT }}>{title}</div>
          {subtitle && <div style={{ fontSize: 10.5, color: MUT, marginTop: 3 }}>{subtitle}</div>}
        </div>
        {count > 0 && <span style={{ background: countColor, color: WH, borderRadius: 99, padding: '2px 9px', fontSize: 11, fontWeight: 700 }}>{count}</span>}
      </div>
      <div style={{ overflowY: 'auto', flex: 1 }}>{children}</div>
    </div>
  );
}

// theme.css .segmented-toggle; options = [{ key, label }]
export function Segmented({ value, onChange, options }) {
  return (
    <div className="segmented-toggle">
      {options.map((o) => (
        <button key={o.key} type="button" className={value === o.key ? 'active' : undefined} onClick={() => onChange(o.key)}>{o.label}</button>
      ))}
    </div>
  );
}