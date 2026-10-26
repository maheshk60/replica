// LegalModals.js — Legal Services' one shared file:
//   1. legal-only constants/helpers (status names, API endpoints, due-date rules)
//   2. every legal dialog, built on the shared <Modal>
// Generic helpers & UI (dates, files, StatCard, EmptyState, employee list…) come
// from JobUiCommon, so there is no separate legal "common" file.
//
// Exports:
//   ConfirmModal, useConfirm        — generic yes/no (replaces window.confirm)
//   RejectModal, AcceptModal        — checker decisions
//   AddNoticeModal                  — create / edit a notice
//   NoticeDetailModal               — read a notice + its files
//   UploadReplyBundleModal          — main reply + supporting docs
//   CloseCaseModal                  — 3 closure documents → review
//   NoticeDocumentsTab              — Documents tab: one card group per notice
//   MCModal                         — assign makers/checkers (JobUiCommon AssignModal)

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Input, Select, Checkbox, Upload, message } from 'antd';
import { UploadOutlined, InboxOutlined } from '@ant-design/icons';
import { api } from '../../services/api';
import Modal from '../../components/Modal';
import {
  AMB, AMBL, AssignModal, ErrorBanner, Field, GL, GR, INK, MUT, P, PL, PUR, PURL, Pill, isInList, RED, REDL, SectionTitle, daysUntil, downloadDoc, fetchAssignableEmployees, fmtDate, fmtDateTime, fmtRelativeTime, idOf, openFile, toList,
  FileChip as BaseFileChip,
  SKY, SKYL, VIO, VIOL, GRB, NEU, NEUT, BRD,
} from '../IncomeTaxPage/JobUiCommon';
// Loader + Notice are the same ones every feature's workspace uses.
import { Loader, Notice, DocGroupsCard, REVIEW_BADGES,  WsCard, DocCard} from '../IncomeTaxPage/JobWorkspaceCommon';

// ══════════════════════════════════════════════════════════════════
// LEGAL-ONLY SHARED CODE
// Status names, API endpoints and due-date rules specific to Legal
// Services. Generic helpers/UI live in JobUiCommon; this is only what the
// other features have no use for. Every legal screen imports these from here.
// ══════════════════════════════════════════════════════════════════

// SKY / SKYL now live in JobUiCommon (the one theme file); re-exported
// here so existing `import { SKY } from '../LegalModals'` keeps working.
export { SKY, SKYL };

// ══════════════════════════════════════════════════════════════════
// STATUS MAPS — shape matches JobUiCommon's Pill: { bg, color, label }
// ══════════════════════════════════════════════════════════════════

// A small helper to show muted italic text inside the Modals
export function Muted({ children, boxed }) {
  return (
    <div style={{
      fontSize: 11, color: MUT, fontStyle: 'italic',
      ...(boxed ? { padding: 10, textAlign: 'center', background: 'var(--color-slate-50)', borderRadius: 'var(--radius-sm)' } : {}),
    }}>
      {children}
    </div>
  );
}


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
  not_started: { label: 'Not Started',  bg: NEU,  color: NEUT },
  draft:       { label: 'Draft',        bg: NEU,  color: NEUT },
  pending:     { label: 'Under Review', bg: AMBL, color: AMB },
  escalated:   { label: 'Moved to CEO', bg: PURL, color: PUR },
  approved:    { label: 'Approved',     bg: GL,   color: GR },
  accepted:    { label: 'Approved',     bg: GL,   color: GR },
  rejected:    { label: 'Rejected',     bg: REDL, color: RED },
};

export function StatusPill({ status, map = CASE_STATUS }) {
  return <Pill status={status} statusBadgeMap={map} getLabel={(s) => map[s]?.label || s} />;
}

export const LEGAL_MANAGER_ROLES = ['Founder', 'Manager', 'Team Lead', 'Admin'];

export const litigationTypeOf = (caseType) =>
  caseType === 'income-tax-litigations' || caseType === 'income-tax' ? 'income-tax' : 'tds';

export const getCaseStatus = (c) => c?.computed_status || c?.activity_status || 'wip';

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
    addExtension: (id, formData) => api.post(
      `/legal-services/notices/${id}/extensions/`,
      formData,
      { headers: { 'Content-Type': 'multipart/form-data' } }
    ),
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
      background: info.urgent ? REDL : NEU, whiteSpace: 'nowrap',
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

// JobUiCommon's FileChip, preset with legal review-status badges.
export function FileChip(props) {
  return <BaseFileChip statusMap={REVIEW_STATUS} {...props} />;
}



const errMsg = (e, fallback) => e?.response?.data?.error || e?.response?.data?.detail || e?.message || fallback;

// Small labelled form row used by every form in this file.
function FormRow({ label, required, children, span }) {
  return (
    <div style={{ gridColumn: span ? `span ${span}` : undefined, minWidth: 0 }}>
      <div style={{ fontSize: 'var(--font-size-sm)', fontWeight: 500, color: 'var(--color-slate-600)', marginBottom: 4 }}>
        {label} {required && <span style={{ color: 'var(--color-danger)' }}>*</span>}
      </div>
      {children}
    </div>
  );
}

// Legal's banner = the shared Notice (same tones/colours everywhere).
const BANNER_TONE = { success: 'ok', danger: 'bad', warning: 'warn', purple: 'purple' };
function Banner({ tone, icon, title, children }) {
  return <Notice tone={BANNER_TONE[tone] || 'info'} icon={icon} title={title} style={{ marginBottom: 12 }}>{children}</Notice>;
}

// ══════════════════════════════════════════════════════════════════
// CONFIRM
// ══════════════════════════════════════════════════════════════════
export function ConfirmModal({ title, message: body, confirmLabel = 'Confirm', danger, busy, onConfirm, onCancel, zIndex }) {
  return (
    <Modal
      isOpen
      title={title}
      onClose={onCancel}
      zIndex={zIndex}
      footer={
        <>
          <button className="btn btn-secondary" onClick={onCancel} disabled={busy}>Cancel</button>
          <button className={`btn ${danger ? 'btn-danger' : 'btn-primary'}`} onClick={onConfirm} disabled={busy}>
            {busy ? 'Working…' : confirmLabel}
          </button>
        </>
      }
    >
      <p style={{ margin: 0, color: 'var(--color-slate-600)', fontSize: 'var(--font-size-md)', lineHeight: 1.5 }}>{body}</p>
    </Modal>
  );
}

// const [confirm, confirmEl] = useConfirm();
// if (!(await confirm({ title, message, danger: true }))) return;
// ...and render {confirmEl} once in the component.
export function useConfirm() {
  const [pending, setPending] = useState(null);
  const confirm = useCallback((opts) => new Promise((resolve) => setPending({ opts, resolve })), []);
  const settle = (value) => { pending?.resolve(value); setPending(null); };
  const element = pending
    ? <ConfirmModal {...pending.opts} onConfirm={() => settle(true)} onCancel={() => settle(false)} />
    : null;
  return [confirm, element];
}

// ══════════════════════════════════════════════════════════════════
// REJECT / ACCEPT (checker decisions)
// ══════════════════════════════════════════════════════════════════
export function RejectModal({ onClose, onRejected, zIndex }) {
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const submit = async () => {
    if (!reason.trim()) return setError('Please provide a reason for rejection.');
    setBusy(true); setError('');
    try {
      await onRejected(reason.trim());
    } catch (e) {
      setError(errMsg(e, 'Failed to reject.'));
      setBusy(false);
    }
  };

  return (
    <Modal
      isOpen
      icon="✕"
      title="Reject submission"
      subtitle="The maker will see this reason and can resubmit"
      onClose={() => !busy && onClose()}
      zIndex={zIndex}
      footer={
        <>
          <button className="btn btn-secondary" onClick={onClose} disabled={busy}>Cancel</button>
          <button className="btn btn-danger" onClick={submit} disabled={busy || !reason.trim()}>
            {busy ? 'Rejecting…' : 'Confirm rejection'}
          </button>
        </>
      }
    >
      <FormRow label="Rejection reason" required>
        <Input.TextArea
          autoFocus rows={4} value={reason} onChange={(e) => setReason(e.target.value)}
          placeholder="e.g. Missing supporting documents. Please attach the demand order copy before resubmitting."
        />
      </FormRow>
      {error && <div style={{ marginTop: 10 }}><ErrorBanner>{error}</ErrorBanner></div>}
    </Modal>
  );
}

// showEscalate: checker can tick "Move to CEO"; the CEO only sees a plain confirm.
export function AcceptModal({ onClose, onAccepted, showEscalate = true, zIndex }) {
  const [moveToCeo, setMoveToCeo] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const submit = async () => {
    setBusy(true); setError('');
    try {
      await onAccepted(moveToCeo);
    } catch (e) {
      setError(errMsg(e, 'Failed to approve.'));
      setBusy(false);
    }
  };

  const label = busy ? (moveToCeo ? 'Sending…' : 'Approving…') : (moveToCeo ? 'Send to CEO' : 'Confirm approval');

  return (
    <Modal
      isOpen
      icon="✓"
      title="Approve submission"
      subtitle={showEscalate ? 'Approve now, or pass it to the CEO for the final call' : 'Confirm final approval'}
      onClose={() => !busy && onClose()}
      zIndex={zIndex}
      footer={
        <>
          <button className="btn btn-secondary" onClick={onClose} disabled={busy}>Cancel</button>
          <button className="btn btn-primary" onClick={submit} disabled={busy}>{label}</button>
        </>
      }
    >
      {showEscalate ? (
        <div className="card" style={{ padding: '12px 14px', background: moveToCeo ? PURL : undefined }}>
          <Checkbox checked={moveToCeo} disabled={busy} onChange={(e) => setMoveToCeo(e.target.checked)}>
            <span style={{ fontWeight: 600, color: INK }}>Move to CEO instead</span>
          </Checkbox>
          <div style={{ fontSize: 12, color: 'var(--color-slate-600)', marginTop: 4, marginLeft: 24, lineHeight: 1.4 }}>
            Leave unchecked to approve normally. Tick it to send this submission for the CEO's final review instead.
          </div>
        </div>
      ) : (
        <p style={{ margin: 0, color: 'var(--color-slate-600)' }}>
          This submission will be approved and marked as complete.
        </p>
      )}
      {error && <div style={{ marginTop: 10 }}><ErrorBanner>{error}</ErrorBanner></div>}
    </Modal>
  );
}

// ══════════════════════════════════════════════════════════════════
// ADD / EDIT NOTICE
// ══════════════════════════════════════════════════════════════════
const OFFICER_OPTIONS = [
  'Assessing Officer', 'Commissioner of Income Tax (Appeal)', 'Principal Commissioner of Income Tax',
  'Deputy Commissioner of Income Tax', 'Additional Commissioner of Income Tax', 'Joint Commissioner of Income Tax',
  'CIT (Exemptions)', 'High Court', 'Supreme Court', 'National Faceless Appeal Centre', 'Assessment Unit',
  'Income Tax Appellate Tribunal',
].sort();

export function AddNoticeModal({ courtCaseId, editNotice, submitForReview, onClose, onCreated }) {
  const isEdit = !!editNotice;
  const knownOfficer = editNotice?.officer && OFFICER_OPTIONS.includes(editNotice.officer);

  const [form, setForm] = useState({
    din_number: editNotice?.din_number || '',
    officer: knownOfficer ? editNotice.officer : editNotice?.officer ? 'Other' : '',
    officer_text: !knownOfficer && editNotice?.officer ? editNotice.officer : '',
    section: editNotice?.section || '',
    notice_date: editNotice?.notice_date || '',
    due_date: editNotice?.due_date || '',
    extended_due_date: editNotice?.extended_due_date || '',
    ph_date: editNotice?.ph_date || '',
    notes: editNotice?.notes || '',
  });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const set = (key) => (e) => setForm((p) => ({ ...p, [key]: e?.target ? e.target.value : e }));

  const submit = async () => {
    if (!form.din_number.trim()) return setError('DIN Number is required.');
    setBusy(true); setError('');
    const payload = {
      din_number: form.din_number.trim(),
      officer: (form.officer === 'Other' ? form.officer_text.trim() : form.officer) || null,
      section: form.section.trim() || null,
      notice_date: form.notice_date || null,
      due_date: form.due_date || null,
      extended_due_date: form.extended_due_date || null,
      ph_date: form.ph_date || null,
      notes: form.notes.trim() || null,
    };
    try {
      const res = isEdit && submitForReview
        ? await legalApi.notices.submitEditForReview(editNotice.id, payload)
        : isEdit
          ? await legalApi.notices.update(editNotice.id, payload)
          : await legalApi.notices.create({ court_case: courtCaseId, ...payload });
      onCreated(res.data);
    } catch (e) {
      setError(errMsg(e, 'Failed to save notice.'));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal
      isOpen
      icon="📋"
      title={isEdit ? 'Edit notice' : 'Add notice'}
      subtitle={isEdit
        ? (submitForReview ? 'Changes go to the checker before they apply' : 'Update notice details')
        : 'Details as received from the authority'}
      onClose={onClose}
      footer={
        <>
          <button className="btn btn-secondary" onClick={onClose} disabled={busy}>Cancel</button>
          <button className="btn btn-primary" onClick={submit} disabled={busy}>
            {busy ? (isEdit ? 'Updating…' : 'Creating…') : (isEdit ? 'Update notice' : 'Add notice')}
          </button>
        </>
      }
    >
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
        <FormRow label="DIN Number" required>
          <Input value={form.din_number} onChange={set('din_number')} placeholder="Enter DIN number" />
        </FormRow>
        <FormRow label="Section">
          <Input value={form.section} onChange={set('section')} placeholder="e.g. 143(2), 148" />
        </FormRow>
        <FormRow label="Officer" span={2}>
          <Select
            showSearch allowClear placeholder="Select officer" style={{ width: '100%' }}
            value={form.officer || undefined}
            onChange={(v) => setForm((p) => ({ ...p, officer: v || '' }))}
            optionFilterProp="label"
            options={[...OFFICER_OPTIONS.map((o) => ({ value: o, label: o })), { value: 'Other', label: 'Other' }]}
          />
          {form.officer === 'Other' && (
            <Input style={{ marginTop: 6 }} value={form.officer_text} onChange={set('officer_text')} placeholder="Enter officer name" />
          )}
        </FormRow>
        <FormRow label="Notice date"><Input type="date" value={form.notice_date} onChange={set('notice_date')} /></FormRow>
        <FormRow label="Due date"><Input type="date" value={form.due_date} onChange={set('due_date')} /></FormRow>
        {/* <FormRow label="Extended due date"><Input type="date" value={form.extended_due_date} onChange={set('extended_due_date')} /></FormRow> */}
        <FormRow label="PH date"><Input type="date" value={form.ph_date} onChange={set('ph_date')} /></FormRow>
        <FormRow label="Notes" span={2}>
          <Input.TextArea rows={2} value={form.notes} onChange={set('notes')} placeholder="Any additional details about this notice…" />
        </FormRow>
      </div>
      {error && <div style={{ marginTop: 12 }}><ErrorBanner>{error}</ErrorBanner></div>}
    </Modal>
  );
}


// ══════════════════════════════════════════════════════════════════
// UPLOAD REPLY BUNDLE (main reply + supporting docs → saved as drafts)
// ══════════════════════════════════════════════════════════════════

export function UploadReplyBundleModal({ noticeId, onClose, onSuccess }) {
  const [replyFiles, setReplyFiles] = useState([]);
  const [supportFiles, setSupportFiles] = useState([]);
  const [uploading, setUploading] = useState(false);

  const submit = async () => {
    if (replyFiles.length === 0 && supportFiles.length === 0) {
      return message.error('Please upload at least one document (Reply or Supporting).');
    }
    setUploading(true);
    try {
      let mainId = null;

      // 1. Determine and upload the "Root" document
      if (replyFiles.length > 0) {
        // First reply is the Root
        const rootRes = await legalApi.noticeDocs.upload({ notice: noticeId, doc_type: 'pending', file: replyFiles[0] });
        mainId = rootRes.data.id;

        // Upload remaining replies as "Extra Mains" linked to the root
        const extraReplies = replyFiles.slice(1);
        if (extraReplies.length > 0) {
          await Promise.all(
            extraReplies.map((file) => legalApi.noticeDocs.upload({ notice: noticeId, doc_type: 'pending', file, reply_version: mainId }))
          );
        }
      } else if (supportFiles.length > 0) {
        // If no replies exist, the first support doc becomes the Root
        const rootRes = await legalApi.noticeDocs.upload({ notice: noticeId, doc_type: 'pending_support', file: supportFiles[0] });
        mainId = rootRes.data.id;
      }

      // 2. Upload supporting docs linked to the root
      // (If root was a support doc, we skip index 0 since it's already uploaded)
      const supportsToUpload = replyFiles.length > 0 ? supportFiles : supportFiles.slice(1);
      
      if (supportsToUpload.length > 0) {
        await Promise.all(
          supportsToUpload.map((file) => legalApi.noticeDocs.upload({ notice: noticeId, doc_type: 'pending_support', file, reply_version: mainId }))
        );
      }

      message.success('Uploaded as one draft version. Use "Submit for Review" when ready.');
      onSuccess();
    } catch (e) {
      const errMsg = (err, fallback) => err?.response?.data?.error || fallback;
      message.error(errMsg(e, 'Upload failed'));
    } finally {
      setUploading(false);
    }
  };

  const renderFileList = (files, setFiles) => {
    if (files.length === 0) {
      return <div style={{ fontSize: 12, color: MUT, fontStyle: 'italic', padding: '8px 0' }}>No files selected.</div>;
    }
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginTop: 8 }}>
        {files.map((f) => (
          <div key={f.uid} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '6px 10px', background: 'var(--color-slate-50)', border: `1px solid ${BRD}`, borderRadius: 6 }}>
            <span style={{ fontSize: 12, color: INK, fontWeight: 500 }}>📄 {f.name}</span>
            <button 
              type="button" 
              disabled={uploading}
              onClick={() => setFiles((prev) => prev.filter((x) => x.uid !== f.uid))} 
              style={{ background: 'none', border: 'none', color: RED, cursor: uploading ? 'not-allowed' : 'pointer', fontSize: 14, padding: '0 4px' }}
              title="Remove file"
            >✕</button>
          </div>
        ))}
      </div>
    );
  };

  return (
    <Modal
      isOpen icon={<UploadOutlined />} title="Upload Documents"
      subtitle="Multiple replies + supports upload as a single version (draft until you submit)"
      onClose={() => !uploading && onClose()}
      footer={
        <>
          <button className="btn btn-secondary" onClick={onClose} disabled={uploading}>Cancel</button>
          <button className="btn btn-primary" onClick={submit} disabled={(replyFiles.length === 0 && supportFiles.length === 0) || uploading}>
            {uploading ? 'Uploading…' : 'Upload'}
          </button>
        </>
      }
    >
      <div style={{ marginBottom: 20 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: `1px solid ${BRD}`, paddingBottom: 8 }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: INK }}>Main reply document(s) <span style={{ fontSize: 11, color: MUT, fontWeight: 400 }}>(optional)</span></div>
          <Upload multiple accept=".pdf,.doc,.docx" showUploadList={false} beforeUpload={(f) => { setReplyFiles((prev) => [...prev, f]); return false; }}>
            <button type="button" className="btn btn-secondary" style={{ padding: '3px 10px', fontSize: 11 }} disabled={uploading}><UploadOutlined /> Add Reply</button>
          </Upload>
        </div>
        {renderFileList(replyFiles, setReplyFiles)}
      </div>

      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: `1px solid ${BRD}`, paddingBottom: 8 }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: INK }}>Supporting document(s) <span style={{ fontSize: 11, color: MUT, fontWeight: 400 }}>(optional)</span></div>
          <Upload multiple accept=".pdf,.doc,.docx,.jpg,.png,.xlsx,.xls" showUploadList={false} beforeUpload={(f) => { setSupportFiles((prev) => [...prev, f]); return false; }}>
            <button type="button" className="btn btn-secondary" style={{ padding: '3px 10px', fontSize: 11 }} disabled={uploading}><UploadOutlined /> Add Support Doc</button>
          </Upload>
        </div>
        {renderFileList(supportFiles, setSupportFiles)}
      </div>
    </Modal>
  );
}


// ══════════════════════════════════════════════════════════════════
// NOTICE DETAIL (read-only for checkers; makers can upload/delete)
// ══════════════════════════════════════════════════════════════════
export function NoticeDetailModal({ noticeId, canEdit, onClose, onUpdated, onReply }) {
  const [notice, setNotice] = useState(null);
  const [htmlReplies, setHtmlReplies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [uploadingType, setUploadingType] = useState(null);
  const [deletingId, setDeletingId] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [showUpload, setShowUpload] = useState(false);
  const [confirm, confirmEl] = useConfirm();
  const errMsg = (err, fallback) => err?.response?.data?.error || fallback;

  const fetchNotice = useCallback(async () => {
    setLoading(true);
    try {
      const [nRes, rRes] = await Promise.all([legalApi.notices.get(noticeId), legalApi.replies.list({ notice: noticeId })]);
      setNotice(nRes.data);
      setHtmlReplies(toList(rRes).filter((r) => canEdit || r.status !== 'draft'));
    } catch {
      message.error('Failed to load notice.');
    } finally {
      setLoading(false);
    }
  }, [noticeId, canEdit]);

  useEffect(() => { fetchNotice(); }, [fetchNotice]);

  const refresh = async () => { await fetchNotice(); onUpdated?.(); };

  // EXACT SAME LOGIC as ActivityTimelineV2
  const versions = useMemo(() => {
    if (!notice) return [];
    
    const docs = (notice.documents || []).filter((d) => canEdit || d.review_status !== 'draft');
    
    // A Root is an HTML reply, OR an uploaded file that does NOT have a reply_version
    const fileRoots = docs.filter(d => 
      ['pending', 'reply', 'pending_support', 'supporting_doc'].includes(d.doc_type) && !d.reply_version
    );

    const allRoots = [
      ...htmlReplies.map(r => ({ ...r, _isHtml: true, ts: new Date(r.reviewed_at || r.updated_at || r.created_at || 0).getTime() })),
      ...fileRoots.map(d => ({ ...d, _isHtml: false, ts: new Date(d.reviewed_at || d.uploaded_at || 0).getTime() }))
    ].sort((a, b) => a.ts - b.ts); // Sort oldest to newest sequentially

    const vGroups = allRoots.map((root, index) => {
      // Find files connected to this root
      const children = docs.filter(d => String(d.reply_version) === String(root.id));
      
      let mains = [];
      let supports = [];

      if (root._isHtml) {
        mains = [root];
        supports = children;
      } else {
        if (['pending', 'reply'].includes(root.doc_type)) mains.push(root);
        else supports.push(root);

        children.forEach(c => {
          if (['pending', 'reply'].includes(c.doc_type)) mains.push(c);
          else supports.push(c);
        });
      }

      const status = root.status || root.review_status || 'draft';

      return {
        v: index + 1,
        mains,
        supports,
        status,
        rootKey: root._isHtml ? `html-${root.id}` : `doc-${root.id}`
      };
    });

    return vGroups.reverse(); // Newest at the top
  }, [notice, htmlReplies, canEdit]);

  const courtNotice = notice?.court_notice_docs?.[0] || null;
  const ack = notice?.documents?.find((d) => d.doc_type === 'acknowledgment') || null;
  const hasApproved = versions.some((g) => g.status === 'approved' || g.mains.some(m => m.status === 'approved' || m.review_status === 'approved'));
  const hasDrafts = (notice?.documents || []).some((d) => d.review_status === 'draft');
  const ackPending = (notice?.documents || []).some((d) => d.doc_type === 'acknowledgment' && ['pending', 'escalated'].includes(d.review_status));
  const canUploadAck = canEdit && hasApproved && !ack && !ackPending;

  const upload = async (file, docType) => {
    setUploadingType(docType);
    try {
      await legalApi.noticeDocs.upload({ notice: noticeId, file, doc_type: docType });
      message.success('File uploaded');
      await refresh();
    } catch (e) {
      message.error(errMsg(e, 'Failed to upload'));
    } finally {
      setUploadingType(null);
    }
    return false;
  };

  const remove = async (id, isHtml) => {
    if (!(await confirm({ title: 'Delete this file?', message: 'This action cannot be undone.', confirmLabel: 'Delete', danger: true }))) return;
    setDeletingId(id);
    try {
      await (isHtml ? legalApi.replies.remove(id) : legalApi.noticeDocs.remove(id));
      message.success('File deleted');
      await refresh();
    } catch (e) {
      message.error(errMsg(e, 'Failed to delete'));
    } finally {
      setDeletingId(null);
    }
  };

  const submitDocs = async () => {
    setSubmitting(true);
    try {
      await legalApi.notices.submitDocs(noticeId);
      message.success('Documents submitted for checker review');
      await refresh();
    } catch (e) {
      message.error(errMsg(e, 'Failed to submit documents'));
    } finally {
      setSubmitting(false);
    }
  };

  const downloadHtml = (r) => downloadHtmlReplyPdf(r).catch(() => message.error('PDF generation failed'));

  return (
    <>
      <Modal
        isOpen size="lg" icon="📋"
        title={<span>Notice — DIN {notice?.din_number || '—'} {notice && <StatusPill status={notice.status} />}</span>}
        subtitle={notice?.created_by_name ? `Created by ${notice.created_by_name} · ${fmtDateTime(notice.created_at)}` : undefined}
        onClose={onClose}
        footer={
          <>
            <button className="btn btn-secondary" onClick={onClose}>Close</button>
            {canEdit && (
              <button className="btn btn-primary" onClick={submitDocs} disabled={!hasDrafts || submitting}>
                {submitting ? 'Submitting…' : 'Submit for review'}
              </button>
            )}
          </>
        }
      >
        {loading || !notice ? (
          <Loader label="Loading notice…" />
        ) : (
          <>
            <SectionTitle style={{ marginTop: 4 }}>Notice information</SectionTitle>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '14px 20px' }}>
              <Field label="DIN Number" value={notice.din_number} mono />
              <Field label="Section" value={notice.section} mono />
              <Field label="Officer" value={notice.officer} />
              <div>
                <div style={{ fontSize: 11, fontWeight: 600, color: MUT, marginBottom: 3 }}>Notice file <span style={{ color: RED }}>*</span></div>
                {courtNotice ? (
                  <FileChip name={courtNotice.file_name} onOpen={() => openFile(courtNotice)} onDownload={() => downloadDoc(courtNotice)}
                    canDelete={canEdit} onDelete={() => remove(courtNotice.id)} deleting={deletingId === courtNotice.id} width={180} />
                ) : canEdit ? (
                  <Upload accept=".pdf,.doc,.docx,.jpg,.jpeg,.png" showUploadList={false} beforeUpload={(f) => upload(f, 'court_notice')}>
                    <button type="button" className="btn btn-secondary" disabled={uploadingType === 'court_notice'}>
                      {uploadingType === 'court_notice' ? 'Uploading…' : '⬆ Upload notice'}
                    </button>
                  </Upload>
                ) : <div style={{ fontSize: 13, color: 'var(--color-slate-400)' }}>Not uploaded</div>}
              </div>
              <Field label="Notice date" value={fmtDate(notice.notice_date)} />
              <Field label="Due date" value={fmtDate(notice.due_date)} highlight />
              <Field label="Extended due date" value={fmtDate(notice.extended_due_date)} highlight />
              <Field label="PH date" value={fmtDate(notice.ph_date)} highlight />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
              <div>
                <SectionTitle right={canEdit && courtNotice && (
                  <span style={{ display: 'flex', gap: 6 }}>
                    <button className="btn btn-secondary" style={{ padding: '4px 10px' }} onClick={() => setShowUpload(true)}>⬆ Upload</button>
                    {onReply && <button className="btn btn-primary" style={{ padding: '4px 10px' }} onClick={onReply}>📝 Write</button>}
                  </span>
                )}>
                  Replies & supporting docs
                </SectionTitle>
                
                {!courtNotice ? (
                  <div style={{ fontSize: 12, color: MUT, fontStyle: 'italic' }}>Upload the notice to unlock replies</div>
                ) : versions.length === 0 ? (
                  <div style={{ fontSize: 12, color: MUT, fontStyle: 'italic' }}>No replies uploaded yet</div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 16, maxHeight: 300, overflowY: 'auto', paddingRight: 8 }}>
                    {versions.map(({ v, mains, supports, status, rootKey }) => {
                      const canDel = canEdit && ['draft', 'rejected'].includes(status);
                      return (
                        <div key={rootKey} style={{ background: '#F8FAFC', padding: 12, borderRadius: 8, border: `1px solid ${BRD}` }}>
                          
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                            <span style={{ fontSize: 12, fontWeight: 800, color: P, background: PL, padding: '2px 8px', borderRadius: 99 }}>
                              Version {v}
                            </span>
                            <StatusPill status={status} map={REVIEW_STATUS} />
                          </div>
                          
                          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                            {mains.length === 0 ? <Muted>—</Muted> : mains.map(main => (
                              <FileChip key={`${main._isHtml?'h':'d'}-${main.id}`} name={main._isHtml ? main.title || 'Untitled' : main.file_name} icon={main._isHtml ? '📝' : '📄'}
                                onOpen={() => main._isHtml ? openHtmlReply(main) : openFile(main)} onDownload={() => main._isHtml ? downloadHtml(main) : downloadDoc(main)}
                                canDelete={canDel} onDelete={() => remove(main.id, main._isHtml)} deleting={deletingId === main.id} />
                            ))}
                          </div>
                          
                          <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginTop: supports.length > 0 ? 6 : 0 }}>
                            {supports.map(s => (
                              <FileChip key={s.id} name={s.file_name} icon="📎"
                                onOpen={() => openFile(s)} onDownload={() => downloadDoc(s)}
                                canDelete={canDel} onDelete={() => remove(s.id, false)} deleting={deletingId === s.id} />
                            ))}
                          </div>
                          
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              <div>
                <SectionTitle right={canUploadAck && (
                  <Upload accept=".pdf,.doc,.docx,.jpg,.png" showUploadList={false} beforeUpload={(f) => upload(f, 'acknowledgment')}>
                    <button type="button" className="btn btn-secondary" style={{ padding: '4px 10px' }} disabled={uploadingType === 'acknowledgment'}>
                      {uploadingType === 'acknowledgment' ? 'Uploading…' : '⬆ Upload'}
                    </button>
                  </Upload>
                )}>
                  Acknowledgment
                </SectionTitle>
                {ack ? (
                  <FileChip name={ack.file_name} icon="📥" status={ack.review_status} onOpen={() => openFile(ack)} onDownload={() => downloadDoc(ack)}
                    canDelete={canEdit && !['approved', 'pending'].includes(ack.review_status)} onDelete={() => remove(ack.id)} deleting={deletingId === ack.id} />
                ) : (
                  <div style={{ fontSize: 12, color: MUT, fontStyle: 'italic' }}>
                    {hasApproved ? 'No acknowledgment uploaded' : 'Available after a reply is approved'}
                  </div>
                )}
              </div>
            </div>

            <SectionTitle>Notes</SectionTitle>
            <div style={{ fontSize: 13, color: notice.notes ? INK : MUT, whiteSpace: 'pre-wrap', fontStyle: notice.notes ? 'normal' : 'italic' }}>
              {notice.notes || 'No notes added.'}
            </div>
          </>
        )}
      </Modal>

      {showUpload && (
        <UploadReplyBundleModal noticeId={noticeId} onClose={() => setShowUpload(false)}
          onSuccess={() => { setShowUpload(false); refresh(); }} />
      )}
      {confirmEl}
    </>
  );
}




// ══════════════════════════════════════════════════════════════════
// NOTICE DOCUMENTS TAB — one card per notice (titled with its number /
// DIN), and inside it: Notice · Reply · Supporting Doc 1…n · Acknowledgement.
// Uses the shared DocGroupsCard, so it looks like every other Documents
// tab (ITR audit-tool docs, MCA filings, GST, PT…).
//
// Props: notices (array with at least { id }) OR loadNotices() → Promise<array>,
//        reloadKey, canEdit (makers also see their drafts),
//        onOpenNotice(notice) → shows an "Open notice" button per group
//        (uploads / deletes stay in NoticeDetailModal),
//        extraGroups → more DocGroupsCard groups after the notices (e.g. case closure docs).
// ══════════════════════════════════════════════════════════════════
const reviewBadge = (status) => (status ? REVIEW_BADGES[status] : undefined);
const legalDoc = (d, extra = {}) => (d ? {
  filename: d.file_name || d.document_name, url: d.file_url, raw: d, badge: reviewBadge(d.review_status), ...extra,
} : undefined);

// Same version rules as NoticeDetailModal: replies (editor + uploaded) are
// numbered oldest first; each uploaded reply carries its own supporting docs.
function noticeDocGroup(notice, htmlReplies, index, canEdit) {
  const docs = (notice.documents || []).filter((d) => canEdit || d.review_status !== 'draft');
  const supports = docs.filter((d) => ['pending_support', 'supporting_doc'].includes(d.doc_type));
  const mains = [
    ...htmlReplies.filter((r) => canEdit || r.status !== 'draft')
      .map((r) => ({ ...r, _isHtml: true, _ts: new Date(r.reviewed_at || r.created_at).getTime() })),
    ...docs.filter((d) => ['pending', 'reply'].includes(d.doc_type))
      .map((d) => ({ ...d, _ts: new Date(d.reviewed_at || d.uploaded_at).getTime() })),
  ].sort((a, b) => a._ts - b._ts);
  const latest = mains[mains.length - 1] || null;
  const latestSupports = latest && !latest._isHtml ? supports.filter((s) => String(s.reply_version) === String(latest.id)) : [];
  const courtNotice = notice.court_notice_docs?.[0] || null;
  const ack = docs.find((d) => d.doc_type === 'acknowledgment') || null;

  const replyDoc = !latest ? undefined : latest._isHtml
    ? { filename: `${latest.title || 'Untitled'} (written reply)`, raw: latest, isHtml: true, viewable: true, badge: reviewBadge(latest.status) }
    : legalDoc(latest);

  const items = [
    { key: 'notice', label: 'Notice', icon: '📋', required: true, note: notice.section ? `Section ${notice.section}` : undefined,
      doc: legalDoc(courtNotice) },
    { key: 'reply', label: mains.length > 1 ? `Reply (v${mains.length})` : 'Reply', icon: latest?._isHtml ? '📝' : '📄', required: true,
      note: !courtNotice ? 'Upload the notice first' : undefined, doc: replyDoc },
    ...(latestSupports.length
      ? latestSupports.map((d, i) => ({ key: `support-${d.id}`, label: `Supporting Doc ${i + 1}`, icon: '📎', doc: legalDoc(d) }))
      : [{ key: 'support-none', label: 'Supporting Doc', icon: '📎', note: 'Optional — added with a reply' }]),
    { key: 'ack', label: 'Acknowledgement', icon: '📥',
      note: ack ? undefined : 'Available after a reply is approved', doc: legalDoc(ack) },
  ];

  const sub = [notice.notice_date && `Notice ${fmtDate(notice.notice_date)}`, noticeDueDate(notice) && `Due ${fmtDate(noticeDueDate(notice))}`]
    .filter(Boolean).join(' · ');
  return {
    key: notice.id,
    title: `Notice ${index + 1}${notice.din_number ? ` · DIN ${notice.din_number}` : ''}`,
    subtitle: sub,
    badge: <StatusPill status={getNoticeEffectiveStatus(notice)} />,
    footnote: mains.length > 1 ? `${mains.length - 1} earlier reply version${mains.length > 2 ? 's' : ''} — open the notice to see the history.` : undefined,
    items,
  };
}


// ══════════════════════════════════════════════════════════════════
// NOTICE DOCUMENTS TAB — Only shows uploaded files, groups extensions clearly
// ══════════════════════════════════════════════════════════════════
// export function NoticeDocumentsTab({ notices, reloadKey, canEdit, onOpenNotice }) {
//   const [noticesData, setNoticesData] = useState([]);
//   const [loading, setLoading] = useState(true);

//   useEffect(() => {
//     setLoading(true);
//     try {
//       const builtNotices = [];

//       (notices || []).forEach((n, index) => {
//         const allDocs = (n.documents || []).filter((d) => !d.is_deleted);
//         const docs = allDocs.filter((d) => d.review_status !== 'draft' && d.status !== 'draft');

//         const mainItems = [];

//         // 1. Court Notice
//         const courtNotice = docs.filter((d) => d.doc_type === 'court_notice').pop();
//         if (courtNotice) {
//           mainItems.push({
//             key: `notice_${courtNotice.id}`, label: 'Court Notice', icon: '📋',
//             doc: { filename: courtNotice.file_name, url: courtNotice.file_url, raw: courtNotice, badge: REVIEW_BADGES[courtNotice.review_status], viewable: true }
//           });
//         }

//         // 2. Replies & Supports
//         const mainDocs = docs.filter((d) => !d.doc_type?.startsWith('ext_'));
//         const mainReplies = mainDocs.filter((d) => ['pending', 'reply'].includes(d.doc_type)).sort((a, b) => new Date(a.uploaded_at || 0) - new Date(b.uploaded_at || 0));
//         const supportDocs = mainDocs.filter((d) => ['pending_support', 'supporting_doc'].includes(d.doc_type));

//         let vNum = 0;
//         const seenReplies = new Set();
//         mainReplies.forEach((main) => {
//           if (seenReplies.has(main.id)) return;
//           seenReplies.add(main.id);
//           vNum += 1;
//           const vLabel = `v${vNum}`;

//           mainItems.push({
//             key: `reply_${main.id}`, label: `Reply (${vLabel})`, icon: '📄',
//             doc: { filename: main.file_name, url: main.file_url, raw: main, badge: REVIEW_BADGES[main.review_status], viewable: true }
//           });

//           supportDocs.filter((s) => String(s.reply_version) === String(main.id)).forEach((s, sIdx) => {
//             mainItems.push({
//               key: `supp_${s.id}`, label: `Supporting Doc (${vLabel}.${sIdx + 1})`, icon: '📎',
//               doc: { filename: s.file_name, url: s.file_url, raw: s, badge: REVIEW_BADGES[s.review_status], viewable: true }
//             });
//           });
//         });

//         // Standalone supports (if any)
//         const linkedSuppIds = new Set(mainReplies.flatMap(m => supportDocs.filter(s => String(s.reply_version) === String(m.id)).map(s => s.id)));
//         const orphanSupports = supportDocs.filter(s => !linkedSuppIds.has(s.id));
//         orphanSupports.forEach((s, idx) => {
//            mainItems.push({
//               key: `orphan_supp_${s.id}`, label: `Supporting Doc (Standalone ${idx+1})`, icon: '📎',
//               doc: { filename: s.file_name, url: s.file_url, raw: s, badge: REVIEW_BADGES[s.review_status], viewable: true }
//            });
//         });

//         // 3. Main Acknowledgment
//         const ack = mainDocs.filter((d) => d.doc_type === 'acknowledgment').pop();
//         if (ack) {
//           mainItems.push({
//             key: `ack_${ack.id}`, label: 'Main Acknowledgment', icon: '✅',
//             doc: { filename: ack.file_name, url: ack.file_url, raw: ack, badge: REVIEW_BADGES[ack.review_status], viewable: true }
//           });
//         }

//         // 4. Date Extensions
//         const extensions = [];
//         if (n.extension_history?.length > 0) {
//           n.extension_history.forEach((ext, idx) => {
//             const extItems = [];
            
//             (ext.reply_docs || []).forEach((d) => extItems.push({
//               key: `ext_r_${d.id}`, label: 'Extension Reply', icon: '📄',
//               doc: { filename: d.file_name, url: d.file_url, raw: d, badge: { label: 'Approved', tone: 'ok' }, viewable: true }
//             }));
            
//             (ext.adjourn_docs || []).forEach((d) => extItems.push({
//               key: `ext_adj_${d.id}`, label: 'Adjournment Notice', icon: '📎',
//               doc: { filename: d.file_name, url: d.file_url, raw: d, badge: { label: 'Approved', tone: 'ok' }, viewable: true }
//             }));
            
//             (ext.ack_docs || []).forEach((d) => extItems.push({
//               key: `ext_a_${d.id}`, label: 'Ext Acknowledgment', icon: '📥',
//               doc: { filename: d.file_name, url: d.file_url, raw: d, badge: { label: 'Approved', tone: 'ok' }, viewable: true }
//             }));

//             // Only add extension section if it has files
//             if (extItems.length > 0) {
//               extensions.push({
//                 id: ext.id,
//                 num: n.extension_history.length - idx,
//                 dates: `${fmtDate(ext.old_date)} ➔ ${fmtDate(ext.extended_due_date)}`,
//                 items: extItems
//               });
//             }
//           });
//         }

//         if (mainItems.length > 0 || extensions.length > 0) {
//           builtNotices.push({
//             key: n.id,
//             notice: n,
//             title: `Notice ${index + 1} · DIN ${n.din_number || 'N/A'}`,
//             subtitle: `Notice: ${n.notice_date ? fmtDate(n.notice_date) : 'N/A'} · Due: ${fmtDate(n.extended_due_date || n.due_date) || 'N/A'}`,
//             mainItems,
//             extensions
//           });
//         }
//       });
//       setNoticesData(builtNotices);
//     } finally {
//       setLoading(false);
//     }
//   }, [notices, reloadKey]);

//   return (
//     <WsCard title="Notice Documents" sub={loading ? undefined : `${noticesData.length} notice(s) with files`}>
//       {loading ? <Loader label="Loading documents..." padding="2rem 1rem" /> :
//        noticesData.length === 0 ? <div style={{ textAlign: 'center', padding: '1.5rem', color: 'var(--color-slate-500)', fontSize: 13 }}>No documents uploaded yet.</div> :
//        noticesData.map((g) => (
//          <section key={g.key} style={{ border: `1px solid var(--color-slate-200)`, borderRadius: 10, marginBottom: 14, overflow: 'hidden', background: '#fff' }}>
            
//             {/* Notice Group Header */}
//             <header style={{ padding: '9px 14px', background: 'var(--color-slate-50)', borderBottom: `1px solid var(--color-slate-200)`, display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
//               <span style={{ fontSize: 12.5, fontWeight: 700, color: 'var(--color-primary)' }}>{g.title}</span>
//               <StatusPill status={g.notice.status} map={CASE_STATUS} />
//               <span style={{ fontSize: 11, color: 'var(--color-slate-500)' }}>{g.subtitle}</span>
//               {onOpenNotice && (
//                 <button className="btn btn-secondary" style={{ marginLeft: 'auto', padding: '3px 10px', fontSize: 12 }} onClick={() => onOpenNotice(g.notice)}>
//                   Open notice →
//                 </button>
//               )}
//             </header>
            
//             <div style={{ padding: 12 }}>
//               {/* Main Notice Files Grid */}
//               {g.mainItems.length > 0 && (
//                 <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 10 }}>
//                   {g.mainItems.map((it) => (
//                     <DocCard key={it.key} item={it} doc={it.doc} readOnly onView={(d) => openFile(d.raw)} onDownload={(d) => downloadDoc(d.raw)} />
//                   ))}
//                 </div>
//               )}

//               {/* Date Extensions Block */}
//               {g.extensions.map((ext) => (
//                 <div key={ext.id} style={{ marginTop: g.mainItems.length > 0 ? 16 : 0 }}>
//                   {/* Extension Sub-Header */}
//                   <div style={{ display: 'flex', alignItems: 'center', gap: 8, paddingBottom: 8, marginBottom: 12, borderBottom: '1px solid var(--color-slate-200)' }}>
//                     <span style={{ fontSize: 13, fontWeight: 800, color: 'var(--color-slate-800)' }}>📅 Date Extension {ext.num}</span>
//                     <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--color-slate-500)' }}>({ext.dates})</span>
//                   </div>
                  
//                   {/* Extension Files Grid */}
//                   <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 10 }}>
//                     {ext.items.map((it) => (
//                       <DocCard key={it.key} item={it} doc={it.doc} readOnly onView={(d) => openFile(d.raw)} onDownload={(d) => downloadDoc(d.raw)} />
//                     ))}
//                   </div>
//                 </div>
//               ))}
//             </div>
//          </section>
//        ))
//       }
//     </WsCard>
//   );
// }





// ══════════════════════════════════════════════════════════════════
// NOTICE DOCUMENTS TAB — Version-Wise Table Layout (Uniform Card Sizes)
// ══════════════════════════════════════════════════════════════════
export function NoticeDocumentsTab({ notices, reloadKey, canEdit, onOpenNotice }) {
  const [noticesData, setNoticesData] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;
    setLoading(true);

    const loadData = async () => {
      try {
        const htmlRepliesRes = await Promise.all(
          (notices || []).map(n => 
            legalApi.replies.list({ notice: n.id }).then(toList).catch(() => [])
          )
        );

        if (!isMounted) return;
        const builtNotices = [];

        (notices || []).forEach((n, index) => {
          const allDocs = (n.documents || []).filter((d) => !d.is_deleted);
          const docs = allDocs.filter((d) => d.review_status !== 'draft' && d.status !== 'draft');
          const htmlReplies = (htmlRepliesRes[index] || []).filter(r => r.status !== 'draft');

          // ── 1. Court Notice ──────────────────────────────────────
          let courtNoticeItem = null;
          const courtNotice = docs.filter((d) => d.doc_type === 'court_notice').pop();
          if (courtNotice) {
            courtNoticeItem = {
              key: `notice_${courtNotice.id}`, label: 'Court Notice', icon: '📋',
              doc: { filename: courtNotice.file_name, url: courtNotice.file_url, raw: courtNotice, badge: REVIEW_BADGES[courtNotice.review_status], viewable: true }
            };
          }

          // ── 2. Versions (Merging HTML & Files) ───────────────────
          const versionDocs = docs.filter(
            (d) => !String(d.doc_type || '').startsWith('ext_') && ['pending', 'reply', 'pending_support', 'supporting_doc'].includes(d.doc_type)
          );

          const fileRoots = versionDocs
            .filter((d) => !d.reply_version)
            .map((d) => ({ ...d, _isHtml: false, ts: new Date(d.reviewed_at || d.uploaded_at || 0).getTime() }));

          const htmlRoots = htmlReplies
            .map((r) => ({ ...r, _isHtml: true, ts: new Date(r.reviewed_at || r.updated_at || r.created_at || 0).getTime() }));

          const allRoots = [...fileRoots, ...htmlRoots].sort((a, b) => a.ts - b.ts);

          const versions = allRoots.map((root, idx) => {
            const vLabel = `v${idx + 1}`;
            const children = versionDocs.filter((d) => String(d.reply_version) === String(root.id));

            const mains = [];
            const supports = [];

            if (root._isHtml) {
              mains.push(root);
              supports.push(...children);
            } else {
              if (['pending', 'reply'].includes(root.doc_type)) mains.push(root);
              else supports.push(root);

              children.forEach((c) => {
                if (['pending', 'reply'].includes(c.doc_type)) mains.push(c);
                else supports.push(c);
              });
            }

            const replyItems = mains.map((m, mIdx) => ({
              key: m._isHtml ? `html_${m.id}` : `reply_${m.id}`,
              label: mains.length > 1 ? `Reply (${vLabel}.${mIdx + 1})` : `Reply (${vLabel})`,
              icon: m._isHtml ? '📝' : '📄',
              isHtml: m._isHtml,
              doc: {
                filename: m._isHtml ? `${m.title || 'Untitled'} (written reply)` : m.file_name,
                url: m._isHtml ? null : m.file_url,
                raw: m,
                badge: REVIEW_BADGES[m._isHtml ? m.status : m.review_status],
                viewable: true,
              },
            }));

            const suppItems = supports.map((s, sIdx) => ({
              key: `supp_${s.id}`,
              label: `Supporting Doc (${vLabel}.${sIdx + 1})`,
              icon: '📎',
              isHtml: false,
              doc: {
                filename: s.file_name,
                url: s.file_url,
                raw: s,
                badge: REVIEW_BADGES[s.review_status],
                viewable: true,
              },
            }));

            return { vLabel, replyItems, suppItems };
          });

          // ── 3. Main Acknowledgment ───────────────────────────────
          let ackItem = null;
          const ack = docs.filter((d) => d.doc_type === 'acknowledgment').pop();
          if (ack) {
            ackItem = {
              key: `ack_${ack.id}`, label: 'Main Acknowledgment', icon: '✅',
              doc: { filename: ack.file_name, url: ack.file_url, raw: ack, badge: REVIEW_BADGES[ack.review_status], viewable: true }
            };
          }

          // ── 4. Date Extensions ───────────────────────────────────
          const extensions = [];
          if (n.extension_history?.length > 0) {
            n.extension_history.forEach((ext, idx) => {
              const extItems = [];
              
              (ext.reply_docs || []).forEach((d) => extItems.push({
                key: `ext_r_${d.id}`, label: 'Extension Reply', icon: '📄',
                doc: { filename: d.file_name, url: d.file_url, raw: d, badge: { label: 'Approved', tone: 'ok' }, viewable: true }
              }));
              (ext.adjourn_docs || []).forEach((d) => extItems.push({
                key: `ext_adj_${d.id}`, label: 'Adjournment Notice', icon: '📎',
                doc: { filename: d.file_name, url: d.file_url, raw: d, badge: { label: 'Approved', tone: 'ok' }, viewable: true }
              }));
              (ext.ack_docs || []).forEach((d) => extItems.push({
                key: `ext_a_${d.id}`, label: 'Ext Acknowledgment', icon: '📥',
                doc: { filename: d.file_name, url: d.file_url, raw: d, badge: { label: 'Approved', tone: 'ok' }, viewable: true }
              }));

              if (extItems.length > 0) {
                extensions.push({
                  id: ext.id,
                  num: n.extension_history.length - idx,
                  dates: `${fmtDate(ext.old_date)} ➔ ${fmtDate(ext.extended_due_date)}`,
                  items: extItems
                });
              }
            });
          }

          if (courtNoticeItem || versions.length > 0 || ackItem || extensions.length > 0) {
            builtNotices.push({
              key: n.id, notice: n,
              title: `Notice ${index + 1} · DIN ${n.din_number || 'N/A'}`,
              subtitle: `Notice: ${n.notice_date ? fmtDate(n.notice_date) : 'N/A'} · Due: ${fmtDate(n.extended_due_date || n.due_date) || 'N/A'}`,
              courtNoticeItem, versions, ackItem, extensions
            });
          }
        });

        setNoticesData(builtNotices);
      } catch (err) {
        message.error('Failed to load documents correctly.');
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    loadData();
    return () => { isMounted = false; };
  }, [notices, reloadKey]);

  const handleView = (it) => it.isHtml ? openHtmlReply(it.doc.raw) : openFile(it.doc.raw);
  const handleDownload = (it) => {
    if (it.isHtml) downloadHtmlReplyPdf(it.doc.raw).catch(() => message.error('PDF generation failed'));
    else downloadDoc(it.doc.raw);
  };

  return (
    <WsCard title="Notice Documents" sub={loading ? undefined : `${noticesData.length} notice(s) with files`}>
      {loading ? <Loader label="Loading documents..." padding="2rem 1rem" /> :
       noticesData.length === 0 ? <div style={{ textAlign: 'center', padding: '1.5rem', color: 'var(--color-slate-500)', fontSize: 13 }}>No documents uploaded yet.</div> :
       noticesData.map((g) => (
         <section key={g.key} style={{ border: `1px solid var(--color-slate-200)`, borderRadius: 10, marginBottom: 14, overflow: 'hidden', background: '#fff' }}>
            
            <header style={{ padding: '9px 14px', background: 'var(--color-slate-50)', borderBottom: `1px solid var(--color-slate-200)`, display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
              <span style={{ fontSize: 12.5, fontWeight: 700, color: 'var(--color-primary)' }}>{g.title}</span>
              <StatusPill status={g.notice.status} map={CASE_STATUS} />
              <span style={{ fontSize: 11, color: 'var(--color-slate-500)' }}>{g.subtitle}</span>
              {onOpenNotice && (
                <button className="btn btn-secondary" style={{ marginLeft: 'auto', padding: '3px 10px', fontSize: 12 }} onClick={() => onOpenNotice(g.notice)}>
                  Open notice →
                </button>
              )}
            </header>
            
            <div style={{ padding: '16px 20px' }}>
              
              {/* 1. Court Notice */}
              {g.courtNoticeItem && (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, marginBottom: g.versions.length || g.ackItem ? 20 : 0 }}>
                  <div style={{ width: 260 }}>
                    <DocCard item={g.courtNoticeItem} doc={g.courtNoticeItem.doc} readOnly onView={() => handleView(g.courtNoticeItem)} onDownload={() => handleDownload(g.courtNoticeItem)} />
                  </div>
                </div>
              )}

              {/* 2. Versions Table Layout */}
              {g.versions.length > 0 && (
                <div style={{ marginBottom: g.ackItem ? 20 : 0 }}>
                  
                  {/* Table Header */}
                  <div style={{ display: 'flex', gap: 16, paddingBottom: 8, borderBottom: '1px solid var(--color-slate-200)' }}>
                    <div style={{ width: 40, flexShrink: 0 }}></div> {/* Spacer for v1 badge */}
                    <div style={{ width: 260, flexShrink: 0, fontSize: 11, fontWeight: 700, color: 'var(--color-slate-500)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                      Reply
                    </div>
                    <div style={{ flex: 1, fontSize: 11, fontWeight: 700, color: 'var(--color-slate-500)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                      Supporting Documents
                    </div>
                  </div>

                  {/* Version Rows */}
                  <div style={{ display: 'flex', flexDirection: 'column' }}>
                    {g.versions.map((ver, idx) => {
                      const isLast = idx === g.versions.length - 1;
                      return (
                        <div key={ver.vLabel} style={{ display: 'flex', gap: 16, padding: '16px 0', borderBottom: isLast ? 'none' : '1px dashed var(--color-slate-200)' }}>
                          
                          {/* Left Column: Version Badge */}
                          <div style={{ width: 40, flexShrink: 0, display: 'flex', justifyContent: 'center' }}>
                            <span style={{ fontSize: 11, fontWeight: 800, color: 'var(--color-primary)', background: 'var(--color-primary-light, #E8EEF9)', padding: '2px 8px', borderRadius: 99, height: 'fit-content' }}>
                              {ver.vLabel}
                            </span>
                          </div>

                          {/* Middle Column: Main Reply */}
                          <div style={{ width: 260, flexShrink: 0 }}>
                            {ver.replyItems.length > 0 ? (
                              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                                {ver.replyItems.map((it) => (
                                  <DocCard key={it.key} item={it} doc={it.doc} readOnly onView={() => handleView(it)} onDownload={() => handleDownload(it)} />
                                ))}
                              </div>
                            ) : (
                              <div style={{ fontSize: 12, color: 'var(--color-slate-400)', fontStyle: 'italic', padding: '8px 0' }}>
                                {/* Left empty intentionally for standalone supporting docs */}
                              </div>
                            )}
                          </div>

                          {/* Right Column: Supporting Docs */}
                          <div style={{ flex: 1, minWidth: 260 }}>
                            {ver.suppItems.length > 0 ? (
                              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
                                {ver.suppItems.map((it) => (
                                  <div key={it.key} style={{ width: 260 }}>
                                    <DocCard item={it} doc={it.doc} readOnly onView={() => handleView(it)} onDownload={() => handleDownload(it)} />
                                  </div>
                                ))}
                              </div>
                            ) : (
                              <div style={{ fontSize: 12, color: 'var(--color-slate-400)', fontStyle: 'italic', padding: '8px 0' }}>
                                No supporting files
                              </div>
                            )}
                          </div>

                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* 3. Acknowledgment */}
              {g.ackItem && (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, marginBottom: g.extensions.length ? 12 : 0 }}>
                  <div style={{ width: 260 }}>
                    <DocCard item={g.ackItem} doc={g.ackItem.doc} readOnly onView={() => handleView(g.ackItem)} onDownload={() => handleDownload(g.ackItem)} />
                  </div>
                </div>
              )}

              {/* 4. Date Extensions */}
              {g.extensions.map((ext) => (
                <div key={ext.id} style={{ marginTop: g.courtNoticeItem || g.versions.length > 0 || g.ackItem ? 16 : 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, paddingBottom: 8, marginBottom: 12, borderBottom: '1px solid var(--color-slate-200)' }}>
                    <span style={{ fontSize: 13, fontWeight: 800, color: 'var(--color-slate-800)' }}>📅 Date Extension {ext.num}</span>
                    <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--color-slate-500)' }}>({ext.dates})</span>
                  </div>
                  
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
                    {ext.items.map((it) => (
                      <div key={it.key} style={{ width: 260 }}>
                        <DocCard item={it} doc={it.doc} readOnly onView={() => handleView(it)} onDownload={() => handleDownload(it)} />
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
         </section>
       ))
      }
    </WsCard>
  );
}





// ══════════════════════════════════════════════════════════════════
// CLOSE CASE (3 required documents → checker review)
// ══════════════════════════════════════════════════════════════════
export function CloseCaseModal({ courtCaseId, canEdit, onClose, onUpdated }) {
  const [caseData, setCaseData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [uploadingType, setUploadingType] = useState(null);
  const [deletingId, setDeletingId] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [confirm, confirmEl] = useConfirm();

  const fetchCase = useCallback(async () => {
    try {
      const res = await legalApi.courtCases.get(courtCaseId);
      setCaseData(res.data);
    } catch {
      setError('Failed to load case data.');
    } finally {
      setLoading(false);
    }
  }, [courtCaseId]);

  useEffect(() => { fetchCase(); }, [fetchCase]);

  const handleClose = () => { onClose(); };

  const status = caseData?.closure_review_status || 'not_started';
  const isClosed = caseData?.status === 'closed';
  const docs = caseData?.closure_documents || [];
  const docOf = (key) => docs.find((d) => d.doc_type === key);
  const uploadedCount = CLOSURE_DOC_TYPES.filter((t) => docOf(t.key)).length;
  const canUpload = canEdit && !isClosed && ['not_started', 'draft', 'rejected'].includes(status);
  const canDelete = canEdit && !isClosed && ['draft', 'not_started'].includes(status);
  const canSubmit = canEdit && !isClosed && status === 'draft' && uploadedCount === 3;

  const upload = async (docType, file) => {
    setUploadingType(docType);
    try {
      await legalApi.closureDocs.upload(courtCaseId, docType, file);
      message.success('Uploaded');
      await fetchCase();
    } catch (e) {
      message.error(errMsg(e, 'Failed to upload'));
    } finally {
      setUploadingType(null);
    }
    return false;
  };

  const remove = async (doc, label) => {
    if (!(await confirm({ title: `Delete ${label}?`, message: 'This action cannot be undone.', confirmLabel: 'Delete', danger: true }))) return;
    setDeletingId(doc.id);
    try {
      await legalApi.closureDocs.remove(doc.id);
      message.success('Deleted');
      await fetchCase();
    } catch (e) {
      message.error(errMsg(e, 'Failed to delete'));
    } finally {
      setDeletingId(null);
    }
  };

  const submit = async () => {
    const ok = await confirm({
      title: 'Submit for review?',
      message: 'All 3 documents go to the checker. You cannot change them until the review is complete.',
      confirmLabel: 'Submit',
    });
    if (!ok) return;
    setSubmitting(true);
    try {
      await legalApi.courtCases.closureSubmit(courtCaseId);
      message.success('Submitted for review');
      await fetchCase();
      onUpdated?.();
    } catch (e) {
      message.error(errMsg(e, 'Failed to submit'));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      <Modal
        isOpen
        size="lg"
        icon={isClosed ? '✅' : '🔒'}
        title={<span>{isClosed ? 'Case closed' : 'Close case'} {caseData && <StatusPill status={status} map={REVIEW_STATUS} />}</span>}
        subtitle={isClosed
          ? `Closed on ${fmtDateTime(caseData?.closure_reviewed_at)}`
          : canEdit ? 'Upload the 3 required documents to close this case' : 'Only the assigned maker can upload closure documents'}
        onClose={handleClose}
        footer={
          <>
            <span style={{ marginRight: 'auto', alignSelf: 'center', fontSize: 12, color: uploadedCount === 3 ? GR : MUT, fontWeight: 600 }}>
              {uploadedCount}/3 documents uploaded
            </span>
            <button className="btn btn-secondary" onClick={handleClose}>Close</button>
            {canSubmit && (
              <button className="btn btn-primary" onClick={submit} disabled={submitting}>
                {submitting ? 'Submitting…' : 'Submit for review'}
              </button>
            )}
          </>
        }
      >
        {loading ? (
          <Loader label="Loading case…" />
        ) : !caseData ? (
          <ErrorBanner>{error || 'Failed to load'}</ErrorBanner>
        ) : (
          <>
            {status === 'approved' && caseData.closure_reviewed_by_name && (
              <Banner tone="success" icon="✅" title="Case closed successfully">
                Approved by <b>{caseData.closure_reviewed_by_name}</b> on {fmtDateTime(caseData.closure_reviewed_at)}
              </Banner>
            )}
            {status === 'rejected' && (
              <Banner tone="danger" icon="⚠️" title={`Closure rejected${caseData.closure_reviewed_by_name ? ` by ${caseData.closure_reviewed_by_name}` : ''}`}>
                {caseData.closure_review_note && <><b>Reason:</b> {caseData.closure_review_note}<br /></>}
                {canEdit && 'Upload the documents again to resubmit.'}
              </Banner>
            )}
            {status === 'pending' && (
              <Banner tone="warning" icon="⏳" title="Awaiting checker review">
                Submitted on {fmtDateTime(caseData.closure_submitted_at)}. Documents cannot be modified.
              </Banner>
            )}
            {status === 'escalated' && (
              <Banner tone="purple" icon="↑" title="Moved to CEO">Waiting for the CEO's final decision.</Banner>
            )}

            <SectionTitle style={{ marginTop: 4 }}>Required documents</SectionTitle>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {CLOSURE_DOC_TYPES.map((t) => {
                const doc = docOf(t.key);
                return (
                  <div key={t.key} className="card" style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 14px', borderColor: doc ? GRB : undefined }}>
                    <div style={{
                      width: 36, height: 36, borderRadius: 'var(--radius-md)', flexShrink: 0, fontSize: 16,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      background: doc ? GL : 'var(--color-slate-50)', color: GR,
                    }}>
                      {doc ? '✓' : t.icon}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 13, fontWeight: 700, color: INK }}>{t.label} <span style={{ color: RED }}>*</span></div>
                      {doc ? (
                        <div style={{ fontSize: 11, color: MUT, marginTop: 2 }}>
                          <span onClick={() => openFile(doc)} style={{ color: P, cursor: 'pointer', fontWeight: 600 }}>{doc.file_name}</span>
                          {' · '}{doc.uploaded_by_name || 'Unknown'} · {fmtRelativeTime(doc.uploaded_at)}
                        </div>
                      ) : (
                        <div style={{ fontSize: 11, color: MUT, marginTop: 2, fontStyle: 'italic' }}>{t.description}</div>
                      )}
                    </div>
                    {doc && <button className="icon-btn" title="Download" onClick={() => downloadDoc(doc)}>⬇</button>}
                    {doc && canDelete && (
                      <button className="icon-btn icon-btn-danger" title="Delete" disabled={deletingId === doc.id} onClick={() => remove(doc, t.label)}>✕</button>
                    )}
                    {!doc && canUpload && (
                      <Upload accept=".pdf,.doc,.docx,.jpg,.jpeg,.png" showUploadList={false} beforeUpload={(f) => upload(t.key, f)}>
                        <button type="button" className="btn btn-primary" disabled={uploadingType === t.key}>
                          {uploadingType === t.key ? 'Uploading…' : 'Upload'}
                        </button>
                      </Upload>
                    )}
                  </div>
                );
              })}
            </div>
          </>
        )}
      </Modal>
      {confirmEl}
    </>
  );
}

// ══════════════════════════════════════════════════════════════════
// ASSIGN MAKERS / CHECKERS — JobUiCommon's AssignModal, legal API
// ══════════════════════════════════════════════════════════════════
// job: { id, makers, checkers, client_name?, caseType? ('tds-litigations' | 'income-tax-litigations' | …) }
export function MCModal({ job, onClose, onAssigned }) {
  const clientName = job?.client_name || job?.client?.client_name || job?.company_name;

  const fetchInitial = () =>
    Promise.resolve({
      makers: (job?.makers || []).map((m) => String(idOf(m))),
      checkers: (job?.checkers || []).map((c) => String(idOf(c))),
    });

  const onSave = async ({ makers, checkers }) => {
    try {
      const res = await api.post(`legal-services/${job.caseType || 'tds-litigations'}/${job.id}/assign-mc/`, {
        maker_ids: makers.map(Number),
        checker_ids: checkers.map(Number),
      });
      return res.data;
    } catch (e) {
      throw new Error(errMsg(e, 'Failed to assign.'));
    }
  };

  return (
    <AssignModal
      title="Assign Team"
      subtitle={`Assign makers & checkers (max 2 each)${clientName ? ` · ${clientName}` : ''}`}
      maxPerRole={2}
      fetchUsers={() => fetchAssignableEmployees(api)}
      fetchInitial={fetchInitial}
      onSave={onSave}
      onClose={onClose}
      onSaved={onAssigned}
    />
  );
}


// ══════════════════════════════════════════════════════════════════
// LITIGATION TYPES — one config per type (TDS, Income Tax).
// Every litigation page reads its title, API and paths from here, so
// adding a type (e.g. GST) is one new entry, not 3 new files.
// ══════════════════════════════════════════════════════════════════
const litigationApi = (endpoint) => ({
  get:     (params)   => api.get(`legal-services/${endpoint}/`, { params }),
  getById: (id)       => api.get(`legal-services/${endpoint}/${id}/`),
  create:  (data)     => api.post(`legal-services/${endpoint}/`, data),
  update:  (id, data) => api.put(`legal-services/${endpoint}/${id}/`, data),
  patch:   (id, data) => api.patch(`legal-services/${endpoint}/${id}/`, data),
  delete:  (id)       => api.delete(`legal-services/${endpoint}/${id}/`),
});

const LITIGATION_DEFS = {
  tds: {
    title: 'TDS Litigations',
    subtitle: 'Tax Deducted at Source case tracking',
    listSubtitle: 'Tax Deducted at Source case tracking',
    caseType: 'tds-litigations',
  },
  'income-tax': {
    title: 'Income Tax Litigations',
    subtitle: 'Income Tax notice and appeal case tracking',
    listSubtitle: 'Income tax dispute & appeal tracking',
    caseType: 'income-tax-litigations',
  },
};

export const LITIGATION_TYPES = Object.fromEntries(Object.entries(LITIGATION_DEFS).map(([type, d]) => [type, {
  ...d,
  type,
  api: litigationApi(d.caseType),
  dashboardPath: `/legal-services/litigations/${type}`,
  jobListPath: `/legal-services/litigations/${type}/jobs`,
  clientPath: (c) => `/legal-services/clients/${c.client}?type=${type}&caseId=${c.id}`,
  // The dashboard/list pages render <CaseModal open editCase onClose onCreated />.
  CaseModal: (props) => <LitigationCaseModal type={type} {...props} />,
}]));

// ══════════════════════════════════════════════════════════════════
// NEW / EDIT LITIGATION CASE (replaces TDSCaseModal + IncomeTaxCaseModal)
// ══════════════════════════════════════════════════════════════════
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const PERIOD_OPTIONS = [
  { value: 'Monthly', label: 'Monthly', span: 1 },
  { value: 'Quarterly', label: 'Quarterly', span: 3 },
  { value: 'Half-Yearly', label: 'Half-Yearly', span: 6 },
  { value: 'Annually', label: 'Annually', span: 12 },
];
const EMPTY_CASE = { client: '', sub_service: '', period: '', notice_date: '', due_date: '', description: '' };

// "March 2026" or "January 2026 - March 2026", starting from the due date's month.
function periodLabelFrom(dueDate, span) {
  if (!dueDate) return '';
  const [y, m] = dueDate.slice(0, 7).split('-').map(Number);
  if (span <= 1) return `${MONTHS[m - 1]} ${y}`;
  const end = new Date(y, m - 1 + span - 1, 1);
  return `${MONTHS[m - 1]} ${y} - ${MONTHS[end.getMonth()]} ${end.getFullYear()}`;
}

export function LitigationCaseModal({ type, open, onClose, onCreated, editCase }) {
  const def = LITIGATION_DEFS[type];
  const [clients, setClients] = useState([]);
  const [subServices, setSubServices] = useState([]);
  const [loadingOptions, setLoadingOptions] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [form, setForm] = useState(EMPTY_CASE);

  useEffect(() => {
    if (!open) return;
    setLoadingOptions(true);
    Promise.all([api.get('clients/clients-lite/'), api.get('/clients/subservices/')])
      .then(([cRes, sRes]) => {
        setClients(toList(cRes));
        setSubServices(toList(sRes).filter((s) => s.job_category === type));
      })
      .catch(() => setError('Failed to load form options.'))
      .finally(() => setLoadingOptions(false));
  }, [open, type]);

  useEffect(() => {
    if (!open) return;
    setForm(editCase ? Object.fromEntries(Object.keys(EMPTY_CASE).map((k) => [k, editCase[k] || ''])) : EMPTY_CASE);
    setError(null);
  }, [open, editCase]);

  const set = (key) => (v) => setForm((p) => ({ ...p, [key]: v?.target ? v.target.value : v || '' }));
  const span = PERIOD_OPTIONS.find((p) => p.value === form.period)?.span || 1;
  const periodLabel = form.period ? periodLabelFrom(form.due_date, span) : '';

  const close = () => { setForm(EMPTY_CASE); setError(null); onClose(); };

  const submit = async () => {
    if (!form.client) return setError('Please select a Client.');
    if (!form.sub_service) return setError('Please select a Service.');
    if (!form.period) return setError('Please select a Period.');
    setSubmitting(true); setError(null);
    const payload = {
      client: form.client,
      sub_service: form.sub_service || null,
      period: form.period,
      assessment_year: periodLabel,
      notice_date: form.notice_date || null,
      due_date: form.due_date || null,
      description: form.description,
      status: 'open',
    };
    try {
      const litApi = litigationApi(def.caseType);
      await (editCase ? litApi.update(editCase.id, payload) : litApi.create(payload));
      onCreated?.();
      close();
    } catch (err) {
      const data = err.response?.data;
      setError(data && typeof data === 'object'
        ? Object.entries(data).map(([k, v]) => `${k}: ${v}`).join(' | ')
        : 'Failed to save case.');
    } finally {
      setSubmitting(false);
    }
  };

  if (!open) return null;

  const litName = def.title.replace(/s$/, '');
  return (
    <Modal
      isOpen
      icon="⚖️"
      title={`${editCase ? 'Edit' : 'New'} ${litName}`}
      subtitle={editCase ? 'Update case details' : 'Creates the job and assigns it for work'}
      onClose={close}
      footer={
        <>
          <button className="btn btn-secondary" onClick={close} disabled={submitting}>Cancel</button>
          <button className="btn btn-primary" onClick={submit} disabled={submitting}>
            {submitting ? (editCase ? 'Updating…' : 'Creating…') : (editCase ? 'Update case' : 'Create case')}
          </button>
        </>
      }
    >
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
        <FormRow label="Client" required span={2}>
          <Select
            showSearch allowClear style={{ width: '100%' }} optionFilterProp="label" disabled={loadingOptions}
            placeholder={loadingOptions ? 'Loading…' : 'Select a client'}
            value={form.client || undefined} onChange={set('client')}
            options={clients.map((c) => ({ value: c.id, label: c.name }))}
          />
        </FormRow>
        <FormRow label="Service" required>
          <Select
            showSearch allowClear style={{ width: '100%' }} optionFilterProp="label" disabled={loadingOptions}
            placeholder={loadingOptions ? 'Loading…' : 'Select a service'}
            value={form.sub_service || undefined} onChange={set('sub_service')}
            options={subServices.map((s) => ({ value: s.id, label: s.name }))}
          />
        </FormRow>
        <FormRow label="Period" required>
          <Select
            style={{ width: '100%' }} placeholder="Select period"
            value={form.period || undefined} onChange={set('period')}
            options={PERIOD_OPTIONS.map((p) => ({ value: p.value, label: p.label }))}
          />
        </FormRow>
        {periodLabel && (
          <div style={{ gridColumn: 'span 2', fontSize: 12.5, color: 'var(--color-slate-600)', background: 'var(--color-slate-50)', border: '1px solid var(--color-slate-200)', borderRadius: 'var(--radius-md)', padding: '8px 12px' }}>
            Period covered: <b style={{ color: INK }}>{periodLabel}</b>
          </div>
        )}
        <FormRow label="Notice date"><Input type="date" value={form.notice_date} onChange={set('notice_date')} /></FormRow>
        <FormRow label="Due date"><Input type="date" value={form.due_date} onChange={set('due_date')} /></FormRow>
        <FormRow label="Description" span={2}>
          <Input.TextArea rows={3} value={form.description} onChange={set('description')} />
        </FormRow>
      </div>
      {error && <div style={{ marginTop: 12 }}><ErrorBanner>{error}</ErrorBanner></div>}
    </Modal>
  );
}

// ══════════════════════════════════════════════════════════════════
// MCA — Company & LLP services. Same idea as LITIGATION_TYPES: every
// MCA page reads its title, paths and filters from here.
// ══════════════════════════════════════════════════════════════════
const MCA_DEFS = {
  company: {
    title: 'MCA Company Services',
    subtitle: 'Annual returns, board resolutions, and company event filings',
    description: 'Annual returns, Board resolutions, Event-based amendments, and Company closures.',
    listTitle: 'Company Service Filings',
    listSubtitle: 'Jobs under MCA Company Services (AOC-4, MGT-7, …)',
    label: 'Company Services',
    icon: '🏢', color: P, light: PL,
    periods: ['All', 'Annually', 'Half-Yearly', 'Event-Based'],
  },
  llp: {
    title: 'MCA LLP Services',
    subtitle: 'Form 11, Form 8, and LLP event filings',
    description: 'Form 11, Form 8, Registration, and Amendment tracking for LLPs.',
    listTitle: 'LLP Service Filings',
    listSubtitle: 'Jobs under MCA LLP Services (Form-8, Form-11, …)',
    label: 'LLP Services',
    icon: '🤝', color: VIO, light: VIOL,
    periods: ['All', 'Annually', 'Event-Based'],
  },
};

export const MCA_SERVICES = Object.fromEntries(Object.entries(MCA_DEFS).map(([key, d]) => {
  const dashboardPath = `/legal-services/mca/${key}`;
  return [key, {
    ...d, key, dashboardPath,
    jobListPath: `${dashboardPath}/jobs`,
    workspacePath: `${dashboardPath}/clients`,
    casePath: (c) => `${dashboardPath}/clients/${c.client}?caseId=${c.id}`,
  }];
}));

// Company vs LLP for a case (URL first, then what the case says about itself).
export const mcaServiceOf = (caseData) =>
  window.location.pathname.includes('/mca/llp/')
  || caseData?.service_group === 'llp'
  || (caseData?.main_service_name || '').toUpperCase().includes('LLP')
    ? MCA_SERVICES.llp : MCA_SERVICES.company;

export const getMcaStatus = (c) => c?.computed_status || c?.status || 'wip';
export const isMcaOverdue = (c) => getMcaStatus(c) !== 'closed' && (daysUntil(c?.due_date) ?? 0) < 0;

export const MCA_PORTAL_LOGIN = 'https://www.mca.gov.in/content/mca/global/en/foportal/fologin.html';

export const mcaApi = {
  cases: (params) => api.get('/legal-services/mca-cases/', { params }),
  getCase: (id) => api.get(`/legal-services/mca-cases/${id}/`),
  filings: (params) => api.get('/legal-services/mca-filings/', { params }),
  createFiling: (caseId) => api.post('/legal-services/mca-filings/', {
    mca_case: caseId, event_date: new Date().toISOString().split('T')[0], notes: 'MCA Filing',
  }),
  // endpoint: 'submit-for-review' (draft) | 'submit-srn-for-review' (SRN)
  submit: (filingId, endpoint) => api.post(`/legal-services/mca-filings/${filingId}/${endpoint}/`),
  submitClosure: (filingId, { note, file }) => {
    const fd = new FormData();
    fd.append('confirmed', 'true');
    if (note) fd.append('note', note);
    if (file) fd.append('file', file);
    return api.post(`/legal-services/mca-filings/${filingId}/submit-closure-for-review/`, fd, { headers: { 'Content-Type': 'multipart/form-data' } });
  },
  docs: (params) => api.get('/legal-services/mca-filing-documents/', { params }),
  uploadDoc: (filingId, docType, file) => {
    const fd = new FormData();
    fd.append('file', file);
    fd.append('filing', filingId);
    fd.append('doc_type', docType);
    return api.post('/legal-services/mca-filing-documents/', fd, { headers: { 'Content-Type': 'multipart/form-data' } });
  },
  removeDoc: (id) => api.delete(`/legal-services/mca-filing-documents/${id}/`),
  approveDoc: (id) => api.post(`/legal-services/mca-filing-documents/${id}/approve/`),
  escalateDoc: (id) => api.post(`/legal-services/mca-filing-documents/${id}/escalate/`),
  rejectDoc: (id, reason) => api.post(`/legal-services/mca-filing-documents/${id}/reject/`, { reason }),
};

// JobUiCommon JobCard / JobSummaryList config for MCA cases.
const mcaPeriod = (c) => c.task_period || c.financial_year || c.period || '';
export const MCA_CARD_CONFIG = {
  getName: (c) => c.client_name || 'Unknown Client',
  getSubtitle: (c) => `${c.sub_service_name || 'MCA Filing'}${mcaPeriod(c) ? ` · 📅 ${mcaPeriod(c)}` : ''}`,
  getIdBadge: (c) => c.task_id,
  getExtraBadge: (c) => (isMcaOverdue(c) ? (
    <span style={{ fontSize: 9.5, fontWeight: 800, background: REDL, color: RED, padding: '2px 6px', borderRadius: 4 }}>OVERDUE</span>
  ) : null),
  getMakers: (c) => c.makers || [],
  getCheckers: (c) => c.checkers || [],
  getStatus: getMcaStatus,
  statusBadgeMap: CASE_STATUS,
  getLabel: (s) => CASE_STATUS[s]?.label || s,
  assignLabelCompact: '👤 M/C',
  assignLabelGrid: '👤 M/C',
};

// ══════════════════════════════════════════════════════════════════
// FIND THE CASE FOR A LINK — used by the litigation and MCA workspaces.
// Links may carry ?caseId= (the case) and ?task= / ?taskPk= (the STT task
// it belongs to, e.g. from "Open Job" in STT Record). caseId is tried first;
// if it's missing, wrong, or belongs to a different task, the client's cases
// are searched for the one linked to that task.
// ══════════════════════════════════════════════════════════════════

export const caseMatchesTask = (c, ref) => {
  if (!c || !ref) return false;
  if (ref.code && [c.task_id, c.task_id_display, c.linked_task?.task_id].includes(ref.code)) return true;
  if (ref.id && [c.task, c.task_pk, c.linked_task?.id].filter((v) => v != null).map(String).includes(String(ref.id))) return true;
  return false;
};

export async function resolveCase({ getById, listForClient, caseId, taskRef }) {
  let byId = null;
  if (caseId) {
    try {
      byId = await getById(caseId);
      if (!taskRef || caseMatchesTask(byId, taskRef)) return byId;
    } catch { /* wrong or stale id — fall back to the client's list */ }
  }
  const list = await listForClient().catch(() => []);
  return (taskRef && list.find((c) => caseMatchesTask(c, taskRef))) || byId || list[0] || null;
}

// ══════════════════════════════════════════════════════════════════
// "WHOSE TURN IS IT?" — one set of rules for the legal dashboards AND
// the main Dashboard's Actions Required chips, so the numbers always match.
// ══════════════════════════════════════════════════════════════════

// A litigation notice (job = its parent TDS/IT litigation job, for makers/checkers).
export function isNoticeMyTurn(n, job = {}, user) {
  if (n.status === 'open' || n.status === 'closed') return false;
  if (user?.role === 'Founder' && n.has_escalated_items) return true;
  if (n.status === 'under_review' || n.review_status === 'pending') return isInList(job.checkers || n.checkers, user);
  if (n.status === 'wip') return isInList(job.makers || n.makers, user);
  return false;
}

// An MCA case: makers on WIP; on Under Review the checker — or the CEO if anything was moved to them.
export function isMcaMyTurn(c, user) {
  const s = getMcaStatus(c);
  if (s === 'wip') return isInList(c.makers, user);
  if (s === 'under_review') {
    const escalated = (c.filings || []).some((f) => (f.documents || []).some((d) => d.review_status === 'escalated'));
    return escalated ? ['Founder', 'Admin'].includes(user?.role) : isInList(c.checkers, user);
  }
  return false;
}

// Counts for the main Dashboard: { tds, incomeTax, mcaCompany, mcaLlp }.
export async function fetchMyLegalPending(user) {
  const litigation = async (type, endpoint) => {
    const [cases, notices] = await Promise.all([
      api.get(`/legal-services/${endpoint}/`).then(toList).catch(() => []),
      legalApi.notices.list({ litigation_type: type }).then(toList).catch(() => []),
    ]);
    const jobById = Object.fromEntries(cases.map((c) => [Number(c.id), c]));
    return notices.filter((n) => isNoticeMyTurn(n, jobById[Number(n.job_id)] || {}, user)).length;
  };
  const mca = (service) => mcaApi.cases({ main_service: service }).then(toList)
    .then((cases) => cases.filter((c) => isMcaMyTurn(c, user)).length).catch(() => 0);

  const [tds, incomeTax, mcaCompany, mcaLlp] = await Promise.all([
    litigation('tds', 'tds-litigations'),
    litigation('income-tax', 'income-tax-litigations'),
    mca('company'),
    mca('llp'),
  ]);
  return { tds, incomeTax, mcaCompany, mcaLlp };
}




// ══════════════════════════════════════════════════════════════════
// ADD EXTENSION MODAL (Saves as Draft)
// ══════════════════════════════════════════════════════════════════

export function AddExtensionModal({ notice, extToEdit, onClose, onSuccess }) {
  const isEdit = !!extToEdit;
  const payload = isEdit ? (extToEdit.payload || extToEdit) : null;

  // Helper to convert any date string to YYYY-MM-DD for HTML5 <input type="date">
  const toInputDate = (d) => {
    if (!d || d === 'None' || d === 'null') return '';
    const str = String(d).trim();
    if (/^\d{4}-\d{2}-\d{2}$/.test(str)) return str;
    try {
      const dt = new Date(str);
      if (!isNaN(dt.getTime())) {
        const yyyy = dt.getFullYear();
        const mm = String(dt.getMonth() + 1).padStart(2, '0');
        const dd = String(dt.getDate()).padStart(2, '0');
        return `${yyyy}-${mm}-${dd}`;
      }
    } catch {}
    return '';
  };


  const getMinDate = (d) => {
    const dateStr = toInputDate(d);
    if (!dateStr) return '';
    const dt = new Date(dateStr);
    dt.setDate(dt.getDate() + 1); // Add 1 day
    return dt.toISOString().split('T')[0];
  };

  const currentDue = useMemo(() => {
    if (isEdit && (payload?.old_date || payload?.due_date)) {
      return payload.old_date || payload.due_date;
    }
    if (notice?.extension_history && notice.extension_history.length > 0) {
      const latest = notice.extension_history[0];
      const val = latest?.extended_due_date || latest?.new_date;
      if (val && val !== 'None' && val !== 'null') return val;
    }
    return notice?.extended_due_date || notice?.due_date;
  }, [isEdit, payload, notice]);

  const [date, setDate] = useState(() => {
    if (isEdit) return toInputDate(payload?.new_date || payload?.extended_due_date);
    return '';
  });

  const [notes, setNotes] = useState(payload?.notes || '');

  const [replyFiles, setReplyFiles] = useState([]);
  const [ackFiles, setAckFiles] = useState([]);
  const [adjournFiles, setAdjournFiles] = useState([]);

  const [retainedReplies, setRetainedReplies] = useState(payload?.reply_docs || []);
  const [retainedAcks, setRetainedAcks] = useState(payload?.ack_docs || []);
  const [retainedAdjourns, setRetainedAdjourns] = useState(payload?.adjourn_docs || []);

  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const submit = async () => {
    if (!date) return setError('New extended due date is required.');
    setBusy(true); setError('');
    try {
      const fd = new FormData();
      fd.append('extended_due_date', date);
      if (notes.trim()) fd.append('notes', notes.trim());
      if (isEdit && payload?.ext_id) fd.append('ext_id', payload.ext_id);

      retainedReplies.forEach(d => fd.append('retained_replies', d.id));
      retainedAcks.forEach(d => fd.append('retained_acks', d.id));
      retainedAdjourns.forEach(d => fd.append('retained_adjourns', d.id));

      replyFiles.forEach(f => fd.append('reply_files', f));
      ackFiles.forEach(f => fd.append('ack_files', f));
      adjournFiles.forEach(f => fd.append('adjourn_files', f));

      await legalApi.notices.addExtension(notice.id, fd);
      message.success('Extension saved as Draft. Submit it from the Activity panel.');
      onSuccess?.();
    } catch (e) {
      setError(e?.response?.data?.error || 'Failed to save extension draft');
    } finally {
      setBusy(false);
    }
  };

  const renderFileList = (files, setFiles, retained, setRetained) => {
    const hasFiles = files.length > 0 || retained.length > 0;
    if (!hasFiles) {
      return <div style={{ fontSize: 12, color: MUT, fontStyle: 'italic', padding: '8px 0' }}>No files selected.</div>;
    }
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginTop: 8 }}>
        {retained.map((f) => (
          <div key={f.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '6px 10px', background: 'var(--color-slate-50)', border: `1px solid ${BRD}`, borderRadius: 6 }}>
            <span style={{ fontSize: 12, color: INK, fontWeight: 500 }}>✓ {f.file_name}</span>
            <button type="button" disabled={busy} onClick={() => setRetained((prev) => prev.filter((x) => x.id !== f.id))} 
              style={{ background: 'none', border: 'none', color: RED, cursor: busy ? 'not-allowed' : 'pointer', fontSize: 14, padding: '0 4px' }} title="Remove file">✕</button>
          </div>
        ))}
        {files.map((f) => (
          <div key={f.uid} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '6px 10px', background: 'var(--color-slate-50)', border: `1px solid ${BRD}`, borderRadius: 6 }}>
            <span style={{ fontSize: 12, color: INK, fontWeight: 500 }}>📄 {f.name}</span>
            <button type="button" disabled={busy} onClick={() => setFiles((prev) => prev.filter((x) => x.uid !== f.uid))} 
              style={{ background: 'none', border: 'none', color: RED, cursor: busy ? 'not-allowed' : 'pointer', fontSize: 14, padding: '0 4px' }} title="Remove file">✕</button>
          </div>
        ))}
      </div>
    );
  };

  return (
    <Modal
      isOpen icon="📅" title={isEdit ? "Edit Extension" : "Add Extension"} subtitle="Saves as a Draft"
      onClose={() => !busy && onClose()}
      footer={
        <>
          <button className="btn btn-secondary" onClick={onClose} disabled={busy}>Cancel</button>
          <button className="btn btn-primary" onClick={submit} disabled={busy || !date}>
            {busy ? 'Saving…' : 'Save as Draft'}
          </button>
        </>
      }
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <FormRow label="Current due date">
            <div style={{ padding: '7px 11px', borderRadius: 6, background: 'var(--color-slate-50)', border: `1px solid ${BRD}`, fontSize: 13, fontWeight: 600, color: INK }}>
              {fmtDate(currentDue) || '—'}
            </div>
          </FormRow>
          <FormRow label="New extended due date" required>
            <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} min={getMinDate(currentDue)} />
          </FormRow>
        </div>

        <FormRow label="Notes / Reason">
          <Input.TextArea rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="e.g. Requested additional time..." />
        </FormRow>

        <hr style={{ border: 0, borderTop: `1px solid ${BRD}`, margin: '4px 0' }} />

        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: `1px solid ${BRD}`, paddingBottom: 8 }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: INK }}>Reply files <span style={{ fontSize: 11, color: MUT, fontWeight: 400 }}>(optional)</span></div>
            <Upload multiple accept=".pdf,.doc,.docx,.jpg,.jpeg,.png" showUploadList={false} beforeUpload={(f) => { setReplyFiles(p => [...p, f]); return false; }}>
              <button type="button" className="btn btn-secondary" style={{ padding: '3px 10px', fontSize: 11 }} disabled={busy}><UploadOutlined /> Add Files</button>
            </Upload>
          </div>
          {renderFileList(replyFiles, setReplyFiles, retainedReplies, setRetainedReplies)}
        </div>

        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: `1px solid ${BRD}`, paddingBottom: 8 }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: INK }}>Adjournment Notice <span style={{ fontSize: 11, color: MUT, fontWeight: 400 }}>(optional)</span></div>
            <Upload multiple accept=".pdf,.doc,.docx,.jpg,.jpeg,.png" showUploadList={false} beforeUpload={(f) => { setAdjournFiles(p => [...p, f]); return false; }}>
              <button type="button" className="btn btn-secondary" style={{ padding: '3px 10px', fontSize: 11 }} disabled={busy}><UploadOutlined /> Add Files</button>
            </Upload>
          </div>
          {renderFileList(adjournFiles, setAdjournFiles, retainedAdjourns, setRetainedAdjourns)}
        </div>

        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: `1px solid ${BRD}`, paddingBottom: 8 }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: INK }}>Acknowledgment files <span style={{ fontSize: 11, color: MUT, fontWeight: 400 }}>(optional)</span></div>
            <Upload multiple accept=".pdf,.doc,.docx,.jpg,.jpeg,.png" showUploadList={false} beforeUpload={(f) => { setAckFiles(p => [...p, f]); return false; }}>
              <button type="button" className="btn btn-secondary" style={{ padding: '3px 10px', fontSize: 11 }} disabled={busy}><UploadOutlined /> Add Files</button>
            </Upload>
          </div>
          {renderFileList(ackFiles, setAckFiles, retainedAcks, setRetainedAcks)}
        </div>
      </div>
      {error && <div style={{ marginTop: 12 }}><ErrorBanner>{error}</ErrorBanner></div>}
    </Modal>
  );
}