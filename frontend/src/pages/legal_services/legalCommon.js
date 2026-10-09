// legalCommon.js — single import hub for the Legal Services feature.
//
// Every legal file imports shared components (Modal, Table, JobUiCommon)
// and legal-specific helpers from HERE, so if the folder layout ever
// changes, only the three import paths below need fixing.

import React, { useState } from 'react';
import { api } from '../../services/api';

// ── Shared app components (adjust these 3 paths if your folders differ) ──
import Modal from '../../components/Modal';
import Table from '../../components/Table';
import {
  P, PL, BRD, BG, MUT, GR, GL, RED, REDL, AMB, AMBL, PUR, PURL, WH,
  Pill, TeamBadges, JobCard, Breadcrumb, ModuleCard, JobSummaryList, AssignModal, getEmpUserId,
} from "../IncomeTaxPage/JobUiCommon";;

export {
  Modal, Table,
  P, PL, BRD, BG, MUT, GR, GL, RED, REDL, AMB, AMBL, PUR, PURL, WH,
  Pill, TeamBadges, JobCard, Breadcrumb, ModuleCard, JobSummaryList, AssignModal, getEmpUserId,
};

// Extra tokens legal needs that JobUiCommon doesn't have.
export const INK = '#1C1E2E';
export const SKY = '#0369A1';
export const SKYL = '#E0F2FE';

// ══════════════════════════════════════════════════════════════════
// STATUS MAPS — shape matches JobUiCommon's Pill: { bg, color, label }
// ══════════════════════════════════════════════════════════════════

// Case / notice workflow status
export const CASE_STATUS = {
  wip:                { label: 'WIP',                bg: AMBL, color: AMB },
  under_review:       { label: 'Under Review',       bg: PURL, color: PUR },
  attention_required: { label: 'Attention Required', bg: REDL, color: RED },
  open:               { label: 'Open',               bg: SKYL, color: SKY },
  closed:             { label: 'Closed',             bg: GL,   color: GR },
};

// Maker → checker review status (docs, replies, closure, edits)
export const REVIEW_STATUS = {
  not_started: { label: 'Not Started',  bg: '#F3F3F3', color: '#666' },
  draft:       { label: 'Draft',        bg: '#F3F3F3', color: '#666' },
  pending:     { label: 'Under Review', bg: AMBL, color: AMB },
  escalated:   { label: 'Moved to CEO', bg: PURL, color: PUR },
  approved:    { label: 'Approved',     bg: GL,   color: GR },
  accepted:    { label: 'Approved',     bg: GL,   color: GR },
  rejected:    { label: 'Rejected',     bg: REDL, color: RED },
};

export function StatusPill({ status, map = CASE_STATUS }) {
  return <Pill status={status} statusBadgeMap={map} getLabel={(s) => map[s]?.label || s} />;
}

// ══════════════════════════════════════════════════════════════════
// ROLES & SMALL HELPERS
// ══════════════════════════════════════════════════════════════════
export const LEGAL_MANAGER_ROLES = ['Founder', 'Manager', 'Team Lead', 'Admin'];

export const idOf = (m) => (typeof m === 'object' && m !== null ? m.id : m);
export const isInList = (list, user) => (list || []).some((m) => idOf(m) === user?.id);

export const toList = (res) => (Array.isArray(res?.data) ? res.data : res?.data?.results || []);

export const litigationTypeOf = (caseType) =>
  caseType === 'income-tax-litigations' || caseType === 'income-tax' ? 'income-tax' : 'tds';

export const getCaseStatus = (c) => c?.computed_status || c?.activity_status || 'wip';

// ══════════════════════════════════════════════════════════════════
// DATES
// ══════════════════════════════════════════════════════════════════
export function fmtDate(d) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}

export function fmtDateTime(d) {
  if (!d) return '—';
  return new Date(d).toLocaleString('en-IN', {
    day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', hour12: true,
  });
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

export const noticeDueDate = (n) => n?.extended_due_date || n?.due_date;

// Due ≤ 5 days (or overdue) while still being worked on.
export function isNoticeAttention(n) {
  if (n.status !== 'wip' && n.status !== 'under_review') return false;
  const days = daysUntil(noticeDueDate(n));
  return days !== null && days <= 5;
}

export const getNoticeEffectiveStatus = (n) => (isNoticeAttention(n) ? 'attention_required' : n.status);

// "3d left" / "2d overdue" chip info. Open/closed notices never read as urgent.
export function getDaysInfo(dueDate, status) {
  const diff = daysUntil(dueDate);
  if (diff === null) return null;
  if (status === 'open' || status === 'closed') {
    if (diff < 0) return null;
    return { text: diff === 0 ? 'Due today' : `${diff}d left`, color: MUT, urgent: false };
  }
  if (diff < 0) return { text: `${Math.abs(diff)}d overdue`, color: RED, urgent: true };
  if (diff === 0) return { text: 'Due today', color: RED, urgent: true };
  if (diff <= 5) return { text: `${diff}d left`, color: RED, urgent: true };
  if (diff <= 15) return { text: `${diff}d left`, color: AMB, urgent: false };
  return { text: `${diff}d left`, color: MUT, urgent: false };
}

// ══════════════════════════════════════════════════════════════════
// FILES
// ══════════════════════════════════════════════════════════════════
export function openFile(docOrUrl) {
  const url = typeof docOrUrl === 'string' ? docOrUrl : docOrUrl?.file_url || docOrUrl?.file;
  if (url) window.open(url, '_blank', 'noopener,noreferrer');
}

export async function downloadFile(fileUrl, fileName) {
  if (!fileUrl) return;
  const res = await fetch(fileUrl);
  const blob = await res.blob();
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName || 'download';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  window.URL.revokeObjectURL(url);
}

export const downloadDoc = (doc) => downloadFile(doc?.file_url, doc?.file_name || doc?.document_name);

const escapeHtml = (s = '') => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

// Opens an editor (HTML) reply in a new tab with a print/save-as-PDF bar.
export function openHtmlReply(reply) {
  const title = escapeHtml(reply.title || 'Reply');
  const html = `<!DOCTYPE html><html><head><meta charset="UTF-8"><title>${title}</title><style>
    @page{size:A4;margin:1in}@media print{body{margin:0}.no-print{display:none!important}}
    body{font-family:'Times New Roman',Times,serif;font-size:12pt;line-height:1.5;color:#1a1a2e;max-width:800px;margin:0 auto;padding:40px}
    table{border-collapse:collapse;margin:10px 0;width:100%}td,th{border:1px solid #999;padding:6px 10px}
    .bar{position:fixed;top:0;left:0;right:0;background:#0b2155;color:#fff;padding:8px 20px;display:flex;gap:12px;align-items:center;font:600 13px -apple-system,'Segoe UI',sans-serif}
    .bar button{margin-left:auto;padding:6px 16px;border:1px solid rgba(255,255,255,.3);border-radius:6px;background:rgba(255,255,255,.1);color:#fff;cursor:pointer;font:inherit}
    .content{margin-top:50px}</style></head><body>
    <div class="bar no-print"><span>📄 ${title}</span><button onclick="window.print()">Print / Save as PDF</button></div>
    <div class="content">${reply.content_html || ''}</div></body></html>`;
  window.open(URL.createObjectURL(new Blob([html], { type: 'text/html' })), '_blank');
}

// Converts an editor (HTML) reply to a PDF download. Throws on failure.
export async function downloadHtmlReplyPdf(reply) {
  const content = reply.content_html || '';
  if (!content.trim()) throw new Error('No content to download');
  const { default: html2pdf } = await import('html2pdf.js');
  const wrapper = document.createElement('div');
  wrapper.style.cssText = "font-family:'Times New Roman',serif;font-size:12pt;line-height:1.5;padding:20px;background:#fff;width:700px";
  wrapper.innerHTML = content;
  wrapper.querySelectorAll('table').forEach((t) => { t.style.borderCollapse = 'collapse'; t.style.width = '100%'; });
  wrapper.querySelectorAll('td, th').forEach((c) => { c.style.border = '1px solid #333'; c.style.padding = '4px 8px'; });
  document.body.appendChild(wrapper);
  try {
    await html2pdf().set({
      margin: [0.8, 0.8, 0.8, 0.8],
      filename: `${(reply.title || 'reply').replace(/[^a-z0-9]/gi, '_')}.pdf`,
      image: { type: 'jpeg', quality: 0.98 },
      html2canvas: { scale: 2, useCORS: true, scrollY: 0 },
      jsPDF: { unit: 'in', format: 'a4', orientation: 'portrait' },
    }).from(wrapper).save();
  } finally {
    document.body.removeChild(wrapper);
  }
}

// ══════════════════════════════════════════════════════════════════
// API — every legal endpoint in one place
// ══════════════════════════════════════════════════════════════════
export const legalApi = {
  notices: {
    list: (params) => api.get('/legal-services/notices/', { params }),
    get: (id) => api.get(`/legal-services/notices/${id}/`),
    create: (payload) => api.post('/legal-services/notices/', payload),
    update: (id, payload) => api.patch(`/legal-services/notices/${id}/`, payload),
    submitEditForReview: (id, payload) => api.post(`/legal-services/notices/${id}/submit-edit-for-review/`, payload),
    submitDocs: (id) => api.post(`/legal-services/notices/${id}/submit-docs/`),
  },
  noticeDocs: {
    upload: (fields) => {
      const fd = new FormData();
      Object.entries(fields).forEach(([k, v]) => fd.append(k, v));
      return api.post('/legal-services/notice-documents/', fd, { headers: { 'Content-Type': 'multipart/form-data' } });
    },
    remove: (id) => api.delete(`/legal-services/notice-documents/${id}/`),
    approve: (id) => api.post(`/legal-services/notice-documents/${id}/approve/`),
    reject: (id, reason) => api.post(`/legal-services/notice-documents/${id}/reject/`, { reason }),
    escalate: (id) => api.post(`/legal-services/notice-documents/${id}/escalate/`),
  },
  replies: {
    list: (params) => api.get('/legal-services/notice-replies/', { params }),
    remove: (id) => api.delete(`/legal-services/notice-replies/${id}/`),
    sendForReview: (id) => api.post(`/legal-services/notice-replies/${id}/send-for-review/`),
  },
  reviews: {
    list: (params) => api.get('/legal-services/reviews/', { params }),
    approve: (id) => api.post(`/legal-services/reviews/${id}/approve/`),
    reject: (id, reason) => api.post(`/legal-services/reviews/${id}/reject/`, { reason }),
    escalate: (id) => api.post(`/legal-services/reviews/${id}/escalate/`),
  },
  courtCases: {
    list: (params) => api.get('/legal-services/court-cases/', { params }),
    get: (id) => api.get(`/legal-services/court-cases/${id}/`),
    create: (payload) => api.post('/legal-services/court-cases/', payload),
    setDescription: (id, description) => api.post(`/legal-services/court-cases/${id}/set-description/`, { description }),
    addStep: (id, note) => api.post(`/legal-services/court-cases/${id}/add-step/`, { note }),
    closureSubmit: (id) => api.post(`/legal-services/court-cases/${id}/closure-submit/`),
    closureApprove: (id) => api.post(`/legal-services/court-cases/${id}/closure-approve/`),
    closureEscalate: (id) => api.post(`/legal-services/court-cases/${id}/closure-escalate/`),
    closureReject: (id, reason) => api.post(`/legal-services/court-cases/${id}/closure-reject/`, { reason }),
  },
  closureDocs: {
    upload: (courtCaseId, docType, file) => {
      const fd = new FormData();
      fd.append('court_case', courtCaseId);
      fd.append('doc_type', docType);
      fd.append('file', file);
      return api.post('/legal-services/closure-documents/', fd, { headers: { 'Content-Type': 'multipart/form-data' } });
    },
    remove: (id) => api.delete(`/legal-services/closure-documents/${id}/`),
  },
  auditTrail: { list: (params) => api.get('/legal-services/audit-trail/', { params }) },
};

// ══════════════════════════════════════════════════════════════════
// EMPLOYEES for maker/checker assignment
// ══════════════════════════════════════════════════════════════════
// Must be the SAME endpoint your ITR/TDS pages pass to JobUiCommon's
// AssignModal as fetchUsers — change it here only if theirs differs.
export const EMPLOYEE_LIST_URL = '/employee/employees/users';

// Returns the shape JobUiCommon's AssignModal expects: [{ id, full_name, email, role, is_active }].
// id is the employee's USER id (via JobUiCommon's getEmpUserId), because makers/checkers
// are stored and compared as user ids — an employee record's own id is not the same thing.
export const fetchAssignableEmployees = () =>
  api.get(EMPLOYEE_LIST_URL).then((res) =>
    toList(res).map((e) => ({
      id: getEmpUserId(e),
      full_name: e.full_name || e.name || `${e.first_name || ''} ${e.last_name || ''}`.trim() || e.email || 'Unknown',
      email: e.email || e.user?.email || e.username,
      role: e.role || e.designation || e.department || '',
      is_active: e.is_active ?? e.user?.is_active,
    }))
  );

export const CLOSURE_DOC_TYPES = [
  { key: 'order',             label: 'Order Copy',        icon: '📜', description: 'Final order document' },
  { key: 'demand_notice',     label: 'Demand Notice',     icon: '💰', description: 'Demand notice from department' },
  { key: 'computation_sheet', label: 'Computation Sheet', icon: '📊', description: 'Tax computation working' },
];

// ══════════════════════════════════════════════════════════════════
// JobUiCommon card configs (used by JobCard / JobSummaryList)
// ══════════════════════════════════════════════════════════════════
const caseLabel = (s) => CASE_STATUS[s]?.label || s;

export const CASE_CARD_CONFIG = {
  getName: (j) => j.client_name,
  getSubtitle: (j) => {
    const period = j.task_period || j.assessment_year;
    return `${j.sub_service_name || '—'}${period ? ` · 📅 ${period}` : ''}`;
  },
  getIdBadge: (j) => j.task_id,
  getMakers: (j) => j.makers || [],
  getCheckers: (j) => j.checkers || [],
  getStatus: getCaseStatus,
  statusBadgeMap: CASE_STATUS,
  getLabel: caseLabel,
  assignLabelCompact: '👤 M/C',
  assignLabelGrid: '👤 M/C',
};

export function DueChip({ notice }) {
  const info = getDaysInfo(noticeDueDate(notice), notice.status);
  if (!info) return null;
  return (
    <span style={{
      fontSize: 10.5, fontWeight: 700, color: info.color, padding: '2px 7px', borderRadius: 4,
      background: info.urgent ? REDL : '#F3F4F6', whiteSpace: 'nowrap',
    }}>
      ⏰ {info.text}
    </span>
  );
}

export const NOTICE_CARD_CONFIG = {
  getName: (n) => n.client_name || 'Unknown Client',
  getSubtitle: (n, compact) => compact
    ? `${n.sub_service_name || '—'} · DIN: ${n.din_number || 'Not added'}`
    : `${n.sub_service_name || '—'}${n.officer ? ` · 👤 ${n.officer}` : ''}${n.section ? ` · sec ${n.section}` : ''}`,
  getIdBadge: (n) => (n.din_number ? `DIN ${n.din_number}` : null),
  getExtraBadge: (n) => (
    <>
      <DueChip notice={n} />
      {n.replies_count > 0 && (
        <span style={{ fontSize: 10, padding: '2px 7px', borderRadius: 4, background: GL, color: GR, fontWeight: 700 }}>
          💬 {n.replies_count} {n.replies_count === 1 ? 'reply' : 'replies'}
        </span>
      )}
    </>
  ),
  getStatus: getNoticeEffectiveStatus,
  statusBadgeMap: CASE_STATUS,
  getLabel: caseLabel,
};

// ══════════════════════════════════════════════════════════════════
// SMALL SHARED UI
// ══════════════════════════════════════════════════════════════════

export function SectionTitle({ children, right, style }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8,
      margin: '20px 0 10px', paddingBottom: 6, borderBottom: '1px solid var(--color-slate-200)', ...style,
    }}>
      <div style={{
        fontSize: 'var(--font-size-xs)', fontWeight: 700, color: 'var(--color-slate-600)',
        textTransform: 'uppercase', letterSpacing: '0.05em',
      }}>
        {children}
      </div>
      {right}
    </div>
  );
}

export function Field({ label, value, mono, highlight }) {
  const empty = value === null || value === undefined || value === '' || value === '—';
  return (
    <div style={{ minWidth: 0 }}>
      <div style={{ fontSize: 11, fontWeight: 600, color: MUT, marginBottom: 3 }}>{label}</div>
      <div style={{
        fontSize: 13, fontWeight: 600, wordBreak: 'break-word', lineHeight: 1.3,
        color: empty ? 'var(--color-slate-400)' : highlight ? P : INK,
        fontFamily: mono ? 'monospace' : 'inherit',
      }}>
        {empty ? '—' : value}
      </div>
    </div>
  );
}

export function EmptyState({ icon = '📂', text, children, compact }) {
  return (
    <div style={{
      textAlign: 'center', padding: compact ? '20px 12px' : '48px 20px', color: MUT,
      background: WH, border: compact ? 'none' : `1px solid ${BRD}`, borderRadius: 12,
    }}>
      <div style={{ fontSize: compact ? 24 : 34, opacity: 0.3, marginBottom: 8 }}>{icon}</div>
      <div style={{ fontSize: 13, fontWeight: 600 }}>{text}</div>
      {children}
    </div>
  );
}

export function ErrorBanner({ children }) {
  if (!children) return null;
  return (
    <div style={{
      padding: '10px 14px', background: 'var(--color-danger-bg)', border: '1px solid #FECACA',
      borderRadius: 'var(--radius-md)', color: 'var(--color-danger)', fontSize: 13, fontWeight: 600, marginBottom: 12,
    }}>
      {children}
    </div>
  );
}

// Compact file row: icon · name · optional status pill · download/delete.
export function FileChip({ name, icon = '📄', status, onOpen, onDownload, onDelete, canDelete, deleting, width = 240 }) {
  const [hover, setHover] = useState(false);
  return (
    <div
      onClick={onOpen}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      title={name}
      style={{
        display: 'flex', alignItems: 'center', gap: 6, padding: '4px 8px', height: 28,
        width: '100%', maxWidth: width, boxSizing: 'border-box', cursor: onOpen ? 'pointer' : 'default',
        background: hover ? 'var(--color-primary-light)' : WH,
        border: `1px solid ${hover ? P : BRD}`, borderRadius: 'var(--radius-sm)', transition: 'all .12s',
      }}
    >
      <span style={{ fontSize: 12, flexShrink: 0 }}>{icon}</span>
      <span style={{
        flex: 1, minWidth: 0, fontSize: 11, fontWeight: 600, color: INK,
        overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', textAlign: 'left',
      }}>
        {name || 'file'}
      </span>
      {status && REVIEW_STATUS[status] && (
        <span style={{
          fontSize: 8.5, fontWeight: 800, padding: '1px 5px', borderRadius: 3, flexShrink: 0,
          background: REVIEW_STATUS[status].bg, color: REVIEW_STATUS[status].color, textTransform: 'uppercase',
        }}>
          {REVIEW_STATUS[status].label}
        </span>
      )}
      <span style={{ display: 'flex', gap: 3, flexShrink: 0 }} onClick={(e) => e.stopPropagation()}>
        {onDownload && (
          <button type="button" className="icon-btn" title="Download" onClick={onDownload}
            style={{ width: 20, height: 20, fontSize: 10 }}>⬇</button>
        )}
        {canDelete && onDelete && (
          <button type="button" className="icon-btn icon-btn-danger" title="Delete" onClick={onDelete}
            disabled={deleting} style={{ width: 20, height: 20, fontSize: 10, opacity: deleting ? 0.5 : 1 }}>✕</button>
        )}
      </span>
    </div>
  );
}

// Same visual as JobUiCommon's DashboardView stat cards.
export function StatCard({ label, value, color, icon, sub, onClick }) {
  return (
    <div
      onClick={onClick}
      style={{
        background: WH, border: `1.5px solid ${BRD}`, borderRadius: 16, padding: '18px 20px',
        cursor: onClick ? 'pointer' : 'default', transition: 'all .2s', position: 'relative', overflow: 'hidden',
        display: 'flex', flexDirection: 'column', justifyContent: 'center', minHeight: 120,
      }}
      onMouseEnter={(e) => { e.currentTarget.style.borderColor = color; e.currentTarget.style.boxShadow = `0 6px 20px ${color}18`; }}
      onMouseLeave={(e) => { e.currentTarget.style.borderColor = BRD; e.currentTarget.style.boxShadow = 'none'; }}
    >
      <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 4, background: color }} />
      <span style={{ fontSize: 22, marginBottom: 8 }}>{icon}</span>
      <div style={{ fontSize: 34, fontWeight: 900, color, lineHeight: 1, marginBottom: 5 }}>{value}</div>
      <div style={{ fontSize: 13, fontWeight: 600, color: INK }}>{label}</div>
      {sub && <div style={{ fontSize: 10, color: MUT, marginTop: 2 }}>{sub}</div>}
    </div>
  );
}

// Same visual as JobUiCommon's DashboardView bottom panels.
export function Panel({ title, subtitle, count, countColor = P, highlight, height = 360, children }) {
  return (
    <div style={{
      background: WH, border: `1.5px solid ${highlight ? '#FECACA' : BRD}`, borderRadius: 16, padding: 22,
      display: 'flex', flexDirection: 'column', height,
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14, flexShrink: 0 }}>
        <div>
          <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.08em', color: highlight ? RED : MUT }}>
            {title}
          </div>
          {subtitle && <div style={{ fontSize: 10.5, color: MUT, marginTop: 3 }}>{subtitle}</div>}
        </div>
        {count > 0 && (
          <span style={{ background: countColor, color: WH, borderRadius: 99, padding: '2px 9px', fontSize: 11, fontWeight: 700 }}>
            {count}
          </span>
        )}
      </div>
      <div style={{ overflowY: 'auto', flex: 1 }}>{children}</div>
    </div>
  );
}

// Theme .segmented-toggle wrapper: options = [{ key, label }]
export function Segmented({ value, onChange, options }) {
  return (
    <div className="segmented-toggle">
      {options.map((o) => (
        <button key={o.key} type="button" className={value === o.key ? 'active' : undefined} onClick={() => onChange(o.key)}>
          {o.label}
        </button>
      ))}
    </div>
  );
}