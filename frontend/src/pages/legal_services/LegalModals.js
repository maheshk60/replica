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
import { Loader, Notice, DocGroupsCard, REVIEW_BADGES } from '../IncomeTaxPage/JobWorkspaceCommon';

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
// export function UploadReplyBundleModal({ noticeId, onClose, onSuccess }) {
//   const [replyFile, setReplyFile] = useState(null);
//   const [supportFiles, setSupportFiles] = useState([]);
//   const [uploading, setUploading] = useState(false);

//   const submit = async () => {
//     if (!replyFile) return message.error('Main reply document is required.');
//     setUploading(true);
//     try {
//       const res = await legalApi.noticeDocs.upload({ notice: noticeId, doc_type: 'pending', file: replyFile });
//       for (const file of supportFiles) {
//         // reply_version links each supporting doc to the main reply's id
//         await legalApi.noticeDocs.upload({ notice: noticeId, doc_type: 'pending_support', file, reply_version: res.data.id });
//       }
//       message.success('Uploaded as drafts. Use "Submit for Review" to send them to the checker.');
//       onSuccess();
//     } catch (e) {
//       message.error(errMsg(e, 'Upload failed'));
//     } finally {
//       setUploading(false);
//     }
//   };

//   return (
//     <Modal
//       isOpen
//       icon={<UploadOutlined />}
//       title="Upload reply"
//       subtitle="Saved as a draft until you submit for review"
//       onClose={onClose}
//       footer={
//         <>
//           <button className="btn btn-secondary" onClick={onClose} disabled={uploading}>Cancel</button>
//           <button className="btn btn-primary" onClick={submit} disabled={!replyFile || uploading}>
//             {uploading ? 'Uploading…' : 'Upload'}
//           </button>
//         </>
//       }
//     >
//       <FormRow label="Main reply document" required>
//         <Upload.Dragger
//           accept=".pdf,.doc,.docx" maxCount={1}
//           fileList={replyFile ? [replyFile] : []}
//           beforeUpload={(f) => { setReplyFile(f); return false; }}
//           onRemove={() => setReplyFile(null)}
//         >
//           <p className="ant-upload-drag-icon"><InboxOutlined /></p>
//           <p style={{ fontSize: 13, color: 'var(--color-slate-600)', margin: 0 }}>Click or drag the reply file here</p>
//         </Upload.Dragger>
//       </FormRow>
//       <div style={{ marginTop: 16 }}>
//         <FormRow label="Supporting documents (optional)">
//           <Upload
//             multiple accept=".pdf,.doc,.docx,.jpg,.png,.xlsx,.xls"
//             fileList={supportFiles}
//             beforeUpload={(f) => { setSupportFiles((prev) => [...prev, f]); return false; }}
//             onRemove={(f) => setSupportFiles((prev) => prev.filter((x) => x.uid !== f.uid))}
//           >
//             <button type="button" className="btn btn-secondary"><UploadOutlined /> Add files</button>
//           </Upload>
//         </FormRow>
//       </div>
//     </Modal>
//   );
// }


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
      // Upload all main replies in parallel so they share the same batch time
      const replyResults = await Promise.all(
        replyFiles.map((file) =>
          legalApi.noticeDocs.upload({ notice: noticeId, doc_type: 'pending', file })
        )
      );

      // Anchor supports (and version grouping) to the first reply if any
      const mainId = replyResults[0]?.data?.id || null;

      await Promise.all(
        supportFiles.map((file) => {
          const payload = { notice: noticeId, doc_type: 'pending_support', file };
          if (mainId) payload.reply_version = mainId;
          return legalApi.noticeDocs.upload(payload);
        })
      );

      // Standalone supports only (no main reply) — still one draft batch
      if (!mainId && supportFiles.length === 0 && replyFiles.length === 0) {
        /* unreachable */
      }

      message.success('Uploaded as one draft version. Use "Submit for Review" when ready.');
      onSuccess();
    } catch (e) {
      message.error(errMsg(e, 'Upload failed'));
    } finally {
      setUploading(false);
    }
  };

  return (
    <Modal
      isOpen
      icon={<UploadOutlined />}
      title="Upload Documents"
      subtitle="Multiple replies + supports upload as a single version (draft until you submit)"
      onClose={onClose}
      footer={
        <>
          <button className="btn btn-secondary" onClick={onClose} disabled={uploading}>Cancel</button>
          <button
            className="btn btn-primary"
            onClick={submit}
            disabled={(replyFiles.length === 0 && supportFiles.length === 0) || uploading}
          >
            {uploading ? 'Uploading…' : 'Upload'}
          </button>
        </>
      }
    >
      <FormRow label="Main reply document(s) (optional — can add several)">
        <Upload.Dragger
          multiple
          accept=".pdf,.doc,.docx"
          fileList={replyFiles}
          beforeUpload={(f) => { setReplyFiles((prev) => [...prev, f]); return false; }}
          onRemove={(f) => setReplyFiles((prev) => prev.filter((x) => x.uid !== f.uid))}
        >
          <p className="ant-upload-drag-icon"><InboxOutlined /></p>
          <p style={{ fontSize: 13, color: 'var(--color-slate-600)', margin: 0 }}>
            Click or drag one or more reply files
          </p>
        </Upload.Dragger>
      </FormRow>
      <div style={{ marginTop: 16 }}>
        <FormRow label="Supporting document(s) (optional)">
          <Upload
            multiple
            accept=".pdf,.doc,.docx,.jpg,.png,.xlsx,.xls"
            fileList={supportFiles}
            beforeUpload={(f) => { setSupportFiles((prev) => [...prev, f]); return false; }}
            onRemove={(f) => setSupportFiles((prev) => prev.filter((x) => x.uid !== f.uid))}
          >
            <button type="button" className="btn btn-secondary">
              <UploadOutlined /> Add supporting files
            </button>
          </Upload>
        </FormRow>
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

  // Replies (editor + uploaded) numbered v1, v2… oldest first; each uploaded
  // reply carries its own supporting docs. Shown newest first.

  // const versions = useMemo(() => {
  //   if (!notice) return [];
  //   const docs = (notice.documents || []).filter((d) => canEdit || d.review_status !== 'draft');
  //   const supports = docs.filter((d) => ['pending_support', 'supporting_doc'].includes(d.doc_type));
  //   const mains = [
  //     ...htmlReplies.map((r) => ({ ...r, _isHtml: true, _ts: new Date(r.reviewed_at || r.created_at).getTime() })),
  //     ...docs.filter((d) => ['pending', 'reply'].includes(d.doc_type))
  //       .map((d) => ({ ...d, _ts: new Date(d.reviewed_at || d.uploaded_at).getTime() })),
  //   ].sort((a, b) => a._ts - b._ts);
  //   return mains
  //     .map((m, i) => ({ v: i + 1, main: m, supports: m._isHtml ? [] : supports.filter((s) => String(s.reply_version) === String(m.id)) }))
  //     .reverse();
  // }, [notice, htmlReplies, canEdit]);

  const versions = useMemo(() => {
    if (!notice) return [];

    const docs = notice.documents || [];
    const bundlesMap = {};

    const statusOf = (d) => d.review_status || d.status || 'draft';

    // Same status = same version for draft / pending / escalated (one open batch).
    // approved / rejected: cluster by ~15 min so one multi-file submit stays one version.
    const getGroupKey = (d) => {
      const st = statusOf(d);
      if (st === 'draft') return 'draft';
      if (st === 'pending' || st === 'escalated') return st;
      const time = new Date(d.reviewed_at || d.uploaded_at || d.created_at || 0).getTime();
      return `${st}_${Math.floor(time / (15 * 60 * 1000))}`;
    };

    const touch = (key, status, time) => {
      if (!bundlesMap[key]) {
        bundlesMap[key] = { mains: [], supports: [], status, time };
      }
      const t = new Date(time || 0).getTime();
      const prev = new Date(bundlesMap[key].time || 0).getTime();
      if (t > prev) bundlesMap[key].time = time;
    };

    (htmlReplies || []).forEach((r) => {
      if (r.status === 'draft' && !canEdit) return;
      const k = getGroupKey(r);
      touch(k, r.status, r.reviewed_at || r.created_at);
      bundlesMap[k].mains.push({ ...r, _isHtml: true });
    });

    docs.forEach((d) => {
      if (['court_notice', 'acknowledgment'].includes(d.doc_type)) return;
      if ((d.review_status === 'draft') && !canEdit) return;

      const k = getGroupKey(d);
      touch(k, d.review_status, d.reviewed_at || d.uploaded_at);

      if (['pending', 'reply'].includes(d.doc_type)) {
        bundlesMap[k].mains.push(d);
      } else if (['pending_support', 'supporting_doc'].includes(d.doc_type)) {
        bundlesMap[k].supports.push(d);
      }
    });

    // Sort oldest → newest, then number non-draft versions 1..n
    const ordered = Object.values(bundlesMap).sort(
      (a, b) => new Date(a.time || 0) - new Date(b.time || 0)
    );

    let vNum = 0;
    return ordered
      .map((b) => {
        const isDraft = b.status === 'draft';
        if (!isDraft) vNum += 1;
        return {
          v: isDraft ? 'Draft' : vNum,
          mains: b.mains,
          supports: b.supports,
          status: b.status,
          time: b.time,
        };
      })
      .reverse(); // newest first in UI
  }, [notice, htmlReplies, canEdit]);

  const courtNotice = notice?.court_notice_docs?.[0] || null;
  const ack = notice?.documents?.find((d) => d.doc_type === 'acknowledgment') || null;
  const hasApproved = versions.some((g) => (g.main.status || g.main.review_status) === 'approved');
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
        isOpen
        size="lg"
        icon="📋"
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
              {/* <div>
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
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6, maxHeight: 240, overflowY: 'auto' }}>
                    {versions.map(({ v, main, supports }) => {
                      const status = main.status || main.review_status;
                      const canDel = canEdit && ['draft', 'rejected'].includes(status);
                      return (
                        <div key={`${main._isHtml ? 'h' : 'd'}-${main.id}`}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                            <span style={{ fontSize: 11, fontWeight: 800, color: P, width: 22 }}>v{v}</span>
                            <FileChip
                              name={main._isHtml ? main.title || 'Untitled' : main.file_name}
                              icon={main._isHtml ? '📝' : '📄'} status={status}
                              onOpen={() => (main._isHtml ? openHtmlReply(main) : openFile(main))}
                              onDownload={() => (main._isHtml ? downloadHtml(main) : downloadDoc(main))}
                              canDelete={canDel} onDelete={() => remove(main.id, main._isHtml)} deleting={deletingId === main.id}
                            />
                          </div>
                          {supports.map((s) => (
                            <div key={s.id} style={{ marginLeft: 28, marginTop: 4 }}>
                              <FileChip name={s.file_name} icon="📎" onOpen={() => openFile(s)} onDownload={() => downloadDoc(s)}
                                canDelete={canDel} onDelete={() => remove(s.id)} deleting={deletingId === s.id} width={212} />
                            </div>
                          ))}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div> */}

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
                    {versions.map(({ v, mains, supports, status }) => {
                      const canDel = canEdit && ['draft', 'rejected'].includes(status);
                      return (
                        <div key={v} style={{ background: '#F8FAFC', padding: 12, borderRadius: 8, border: `1px solid ${BRD}` }}>
                          
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                            <span style={{ fontSize: 12, fontWeight: 800, color: P, background: PL, padding: '2px 8px', borderRadius: 99 }}>
                              {typeof v === 'number' ? `Version ${v}` : v}
                            </span>
                            <StatusPill status={status} map={REVIEW_STATUS} />
                          </div>
                          
                          {/* Main Replies */}
                          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                            {mains.map(main => (
                              <FileChip key={`${main._isHtml?'h':'d'}-${main.id}`} name={main._isHtml ? main.title || 'Untitled' : main.file_name} icon={main._isHtml ? '📝' : '📄'}
                                onOpen={() => main._isHtml ? openHtmlReply(main) : openFile(main)} onDownload={() => main._isHtml ? downloadHtml(main) : downloadDoc(main)}
                                canDelete={canDel} onDelete={() => remove(main.id, main._isHtml, { cascade: true })} deleting={deletingId === main.id} />
                            ))}
                          </div>
                          
                          {/* Supporting Docs */}
                          <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginTop: supports.length > 0 ? 6 : 0 }}>
                            {supports.map(s => (
                              <FileChip key={s.id} name={s.file_name} icon="📎"
                                onOpen={() => openFile(s)} onDownload={() => downloadDoc(s)}
                                canDelete={canDel} onDelete={() => remove(s.id, false, { cascade: false })} deleting={deletingId === s.id} />
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

// export function NoticeDocumentsTab({ notices, loadNotices, reloadKey, canEdit, onOpenNotice, extraGroups = [], title = 'Notice Documents' }) {
//   const [groups, setGroups] = useState([]);
//   const [loading, setLoading] = useState(true);
//   const [error, setError] = useState(null);

//   useEffect(() => {
//     let alive = true;
//     (async () => {
//       setLoading(true); setError(null);
//       try {
//         const list = notices || (loadNotices ? toList(await loadNotices()) : []);
//         const full = await Promise.all(list.map(async (n) => {
//           const [nRes, rRes] = await Promise.all([
//             legalApi.notices.get(n.id),
//             legalApi.replies.list({ notice: n.id }).catch(() => ({ data: [] })),
//           ]);
//           return { notice: nRes.data, replies: toList(rRes) };
//         }));
//         // Oldest notice first, so "Notice 1" is the first one received.
//         // full.sort((a, b) => new Date(a.notice.notice_date || a.notice.created_at || 0) - new Date(b.notice.notice_date || b.notice.created_at || 0));
//         full.sort((a, b) => {
//           const ta = new Date(a.notice.created_at || a.notice.notice_date || 0).getTime();
//           const tb = new Date(b.notice.created_at || b.notice.notice_date || 0).getTime();
//           if (tb !== ta) return tb - ta;
//           return (b.notice.id || 0) - (a.notice.id || 0);
//         });
//         if (alive) {
//           setGroups(full.map(({ notice, replies }, i) => {
//             const g = noticeDocGroup(notice, replies, i, canEdit);
//             return onOpenNotice
//               ? { ...g, right: <button className="btn btn-secondary" style={{ padding: '3px 10px', fontSize: 12 }} onClick={() => onOpenNotice(notice)}>Open notice →</button> }
//               : g;
//           }));
//         }
//       } catch (e) {
//         if (alive) { setGroups([]); setError(errMsg(e, 'Failed to load notice documents.')); }
//       } finally {
//         if (alive) setLoading(false);
//       }
//     })();
//     return () => { alive = false; };
//   }, [reloadKey, notices, canEdit]); // eslint-disable-line react-hooks/exhaustive-deps

//   return (
//     <>
//       {error && <ErrorBanner>{error}</ErrorBanner>}
//       <DocGroupsCard
//         title={title}
//         loading={loading}
//         loadingLabel="Loading notice documents…"
//         emptyText="No notices yet. Add a notice to start collecting its documents."
//         groups={loading ? groups : [...groups, ...extraGroups]}
//         onView={(d) => (d.isHtml ? openHtmlReply(d.raw) : openFile(d.raw))}
//         onDownload={(d) => (d.isHtml ? downloadHtmlReplyPdf(d.raw).catch(() => message.error('PDF generation failed')) : downloadDoc(d.raw))}
//       />
//     </>
//   );
// }

// ══════════════════════════════════════════════════════════════════
// NOTICE DOCUMENTS TAB (View-only, shows ALL versions, hides empty slots)
// ══════════════════════════════════════════════════════════════════

export function NoticeDocumentsTab({ notices, reloadKey, canEdit, onOpenNotice, extraGroups = [] }) {
  const [groups, setGroups] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    try {
      const builtGroups = [];

      (notices || []).forEach((n, index) => {
        const docs = n.documents || [];
        const activeDocs = docs.filter((d) => !d.is_deleted);

        // Extension files (backend flag or doc_type containing "extension")
        const isExt = (d) =>
          d.is_extension ||
          d.is_due_extension ||
          (d.doc_type || '').toLowerCase().includes('extension');

        const mainDocs = activeDocs.filter((d) => !isExt(d));
        const extDocs = activeDocs.filter((d) => isExt(d));

        const items = [];

        // ─── 1. Court notice (only if uploaded) ───
        const courtNotice = mainDocs.filter((d) => d.doc_type === 'court_notice').pop();
        if (courtNotice) {
          items.push({
            key: `notice_${courtNotice.id}`,
            label: 'Court Notice',
            icon: '📋',
            doc: {
              filename: courtNotice.file_name,
              url: courtNotice.file_url,
              raw: courtNotice,
              badge: REVIEW_BADGES[courtNotice.review_status],
            },
          });
        }

        // ─── 2. Replies + supports as VERSION BUNDLES (multi-reply = one version) ───
        const bundlesMap = {};
        const statusOf = (d) => d.review_status || d.status || 'draft';

        // Same open batch → one version (all drafts together, all pending together).
        // approved/rejected: cluster ~15 min so one multi-file submit stays one version.
        const getGroupKey = (d) => {
          const st = statusOf(d);
          if (st === 'draft') return 'draft';
          if (st === 'pending' || st === 'escalated') return st;
          const time = new Date(d.reviewed_at || d.uploaded_at || d.created_at || 0).getTime();
          return `${st}_${Math.floor(time / (15 * 60 * 1000))}`;
        };

        const touch = (key, status, time) => {
          if (!bundlesMap[key]) {
            bundlesMap[key] = { mains: [], supports: [], status, time };
          }
          const t = new Date(time || 0).getTime();
          const prev = new Date(bundlesMap[key].time || 0).getTime();
          if (t >= prev) {
            bundlesMap[key].time = time;
            bundlesMap[key].status = status;
          }
        };

        mainDocs.forEach((d) => {
          if (['court_notice', 'acknowledgment'].includes(d.doc_type)) return;

          const k = getGroupKey(d);
          touch(k, statusOf(d), d.reviewed_at || d.uploaded_at || d.created_at);

          if (['pending', 'reply'].includes(d.doc_type)) {
            bundlesMap[k].mains.push(d);
          } else if (['pending_support', 'supporting_doc'].includes(d.doc_type)) {
            bundlesMap[k].supports.push(d);
          }
        });

        // Also attach supports linked by reply_version into the same bundle as their main
        // (in case status/time key drifted)
        Object.values(bundlesMap).forEach((bundle) => {
          const mainIds = new Set(bundle.mains.map((m) => String(m.id)));
          mainDocs
            .filter(
              (d) =>
                ['pending_support', 'supporting_doc'].includes(d.doc_type) &&
                d.reply_version != null &&
                mainIds.has(String(d.reply_version))
            )
            .forEach((s) => {
              if (!bundle.supports.some((x) => x.id === s.id)) {
                bundle.supports.push(s);
              }
            });
        });

        let vNum = 0;
        Object.values(bundlesMap)
          .sort((a, b) => new Date(a.time || 0) - new Date(b.time || 0))
          .forEach((bundle) => {
            const isDraft = bundle.status === 'draft';
            if (!isDraft) vNum += 1;
            const vLabel = isDraft ? 'Draft' : `v${vNum}`;

            // Multiple reply files under same version
            bundle.mains
              .slice()
              .sort((a, b) => new Date(a.uploaded_at || 0) - new Date(b.uploaded_at || 0))
              .forEach((m, mIdx) => {
                items.push({
                  key: `reply_${m.id}`,
                  label:
                    bundle.mains.length > 1
                      ? `Reply (${vLabel}.${mIdx + 1})`
                      : `Reply (${vLabel})`,
                  icon: '📄',
                  doc: {
                    filename: m.file_name,
                    url: m.file_url,
                    raw: m,
                    badge: REVIEW_BADGES[m.review_status],
                  },
                });
              });

            // Supporting docs for this version only
            bundle.supports
              .slice()
              .sort((a, b) => new Date(a.uploaded_at || 0) - new Date(b.uploaded_at || 0))
              .forEach((s, sIdx) => {
                items.push({
                  key: `supp_${s.id}`,
                  label:
                    bundle.supports.length > 1
                      ? `Supporting Doc (${vLabel}.${sIdx + 1})`
                      : `Supporting Doc (${vLabel})`,
                  icon: '📎',
                  doc: {
                    filename: s.file_name,
                    url: s.file_url,
                    raw: s,
                    badge: REVIEW_BADGES[s.review_status],
                  },
                });
              });
          });

        // Standalone supports not already placed in a bundle
        const placedSuppIds = new Set(
          Object.values(bundlesMap).flatMap((b) => b.supports.map((s) => s.id))
        );
        mainDocs
          .filter(
            (d) =>
              ['pending_support', 'supporting_doc'].includes(d.doc_type) &&
              !placedSuppIds.has(d.id)
          )
          .forEach((sup, sIdx) => {
            items.push({
              key: `unlinked_supp_${sup.id}`,
              label: `Supporting Doc${sIdx > 0 ? ` ${sIdx + 1}` : ''}`,
              icon: '📎',
              doc: {
                filename: sup.file_name,
                url: sup.file_url,
                raw: sup,
                badge: REVIEW_BADGES[sup.review_status],
              },
            });
          });

        // Acknowledgment (only if file exists)
        const ack = mainDocs.filter((d) => d.doc_type === 'acknowledgment').pop();
        if (ack) {
          items.push({
            key: `ack_${ack.id}`,
            label: 'Acknowledgment',
            icon: '✅',
            doc: {
              filename: ack.file_name,
              url: ack.file_url,
              raw: ack,
              badge: REVIEW_BADGES[ack.review_status],
            },
          });
        }

        // ─── 3. DUE DATE EXTENSION (separate block, not mixed with notice replies) ───
        if (extDocs.length > 0) {
          items.push({
            key: `ext_heading_${n.id}`,
            customRender: (
              <div
                style={{
                  gridColumn: '1 / -1',
                  marginTop: items.length > 0 ? 12 : 0,
                  marginBottom: 4,
                  paddingBottom: 8,
                  borderBottom: '1px solid var(--color-slate-200)',
                  fontSize: 13,
                  fontWeight: 800,
                  color: 'var(--color-slate-800)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                }}
              >
                <span style={{ fontSize: 16 }}>⏳</span> Due Date Extension Files
              </div>
            ),
          });

          extDocs
            .slice()
            .sort((a, b) => new Date(a.uploaded_at || 0) - new Date(b.uploaded_at || 0))
            .forEach((doc) => {
              const dt = (doc.doc_type || '').toLowerCase();
              let lbl = 'Extension File';
              let icon = '📄';
              if (dt.includes('reply') || dt === 'pending') {
                lbl = 'Extension Request';
                icon = '📄';
              } else if (dt.includes('ack')) {
                lbl = 'Extension Approval / Ack';
                icon = '✅';
              } else if (dt.includes('support')) {
                lbl = 'Extension Support';
                icon = '📎';
              }

              items.push({
                key: `ext_doc_${doc.id}`,
                label: lbl,
                icon,
                doc: {
                  filename: doc.file_name,
                  url: doc.file_url,
                  raw: doc,
                  badge: REVIEW_BADGES[doc.review_status],
                },
              });
            });
        }

        // Only show notice group if it has at least one real file (or extension header + files)
        if (items.length > 0) {
          builtGroups.push({
            key: n.id,
            title: `Notice ${index + 1} · DIN ${n.din_number || 'N/A'}`,
            subtitle: `Notice: ${n.notice_date ? fmtDate(n.notice_date) : 'N/A'} · Due: ${
              n.due_date ? fmtDate(n.due_date) : 'N/A'
            }`,
            badge: <StatusPill status={n.status} map={CASE_STATUS} />,
            items,
            onHeaderClick: () => onOpenNotice?.(n),
          });
        }
      });

      setGroups([...(builtGroups || []), ...(extraGroups || [])]);
    } finally {
      setLoading(false);
    }
  }, [notices, reloadKey, extraGroups, onOpenNotice]);

  return (
    <DocGroupsCard
      title="Notice Documents"
      loading={loading}
      emptyText="No documents have been uploaded for any notices yet."
      groups={groups}
      onView={(d) => openFile(d.raw)}
      onDownload={(d) => downloadDoc(d.raw)}
    />
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

  const handleClose = () => { onUpdated?.(); onClose(); };

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




export function AddExtensionModal({ notice, onClose, onSuccess }) {
  const [date, setDate] = useState('');
  const [notes, setNotes] = useState('');
  const [replyFiles, setReplyFiles] = useState([]);
  const [ackFiles, setAckFiles] = useState([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const currentDue = notice?.extended_due_date || notice?.due_date;

  const submit = async () => {
    if (!date) return setError('New extended due date is required.');
    setBusy(true); setError('');
    try {
      const fd = new FormData();
      fd.append('extended_due_date', date);
      if (notes.trim()) fd.append('notes', notes.trim());
      replyFiles.forEach((f) => fd.append('reply_files', f));
      ackFiles.forEach((f) => fd.append('ack_files', f));

      await legalApi.notices.addExtension(notice.id, fd);
      message.success('Extension submitted for review');
      onSuccess?.();
    } catch (e) {
      setError(e?.response?.data?.error || 'Failed to submit extension');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal
      isOpen icon="📅" title="Request Extension" subtitle="Sent to checker for approval"
      onClose={() => !busy && onClose()}
      footer={
        <>
          <button className="btn btn-secondary" onClick={onClose} disabled={busy}>Cancel</button>
          <button className="btn btn-primary" onClick={submit} disabled={busy || !date}>
            {busy ? 'Submitting…' : 'Submit for review'}
          </button>
        </>
      }
    >
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
        <FormRow label="Current due date">
          <div style={{ padding: '7px 11px', borderRadius: 6, background: 'var(--color-slate-50)', border: `1px solid ${BRD}`, fontSize: 13, fontWeight: 600, color: INK }}>
            {fmtDate(currentDue) || '—'}
          </div>
        </FormRow>
        <FormRow label="New extended due date" required>
          <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
        </FormRow>
        <FormRow label="Notes / Reason" span={2}>
          <Input.TextArea rows={3} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="e.g. Requested additional time..." />
        </FormRow>

        <FormRow label="Reply files (optional)">
          <Upload multiple accept=".pdf,.doc,.docx,.jpg,.jpeg,.png" fileList={replyFiles} beforeUpload={(f) => { setReplyFiles(p => [...p, f]); return false; }} onRemove={(f) => setReplyFiles(p => p.filter(x => x.uid !== f.uid))}>
            <button type="button" className="btn btn-secondary"><UploadOutlined /> Add files</button>
          </Upload>
        </FormRow>
        <FormRow label="Acknowledgment files (optional)">
          <Upload multiple accept=".pdf,.doc,.docx,.jpg,.jpeg,.png" fileList={ackFiles} beforeUpload={(f) => { setAckFiles(p => [...p, f]); return false; }} onRemove={(f) => setAckFiles(p => p.filter(x => x.uid !== f.uid))}>
            <button type="button" className="btn btn-secondary"><UploadOutlined /> Add files</button>
          </Upload>
        </FormRow>
      </div>
      {error && <div style={{ marginTop: 12 }}><ErrorBanner>{error}</ErrorBanner></div>}
    </Modal>
  );
}