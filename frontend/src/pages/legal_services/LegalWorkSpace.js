// LegalWorkSpace.js — one client's litigation workspace (TDS / Income Tax).
// Tabs: Client Details · Documents · Activity · Review · Team · Audit Trail
//
// Header, tab bar, loaders, Client Details, Documents, Team and Audit Trail
// are the SAME shared components every other feature uses
// (IncomeTaxPage/JobWorkspaceCommon.js) — so litigation looks like ITR,
// TDS, GST, Employee PT and MCA. Activity and Review are litigation-only
// (ActivityTimelineV2 / ReviewTabV2) and are unchanged.
//
// Still exported for the MCA workspace: DetailsTab, LinkedTaskLink, getFYandAY.

import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { message } from 'antd';
import { api } from '../../services/api';
import { useAuth } from '../../contexts/AuthContext';
import { TaskDetailView } from '../clients/ClientManagement/STT_Records';
import ActivityTimelineV2 from './ActivityTimelineV2';
import ReviewTabV2 from './ReviewTabV2';
import {
  P, PL, BRD, BG, MUT, INK, GR, GL, RED, REDL, REDB, NEU, NEUT,
  EmptyState, ErrorBanner, toList, isInList, fmtDate, fmtDateTime,
} from '../IncomeTaxPage/JobUiCommon';
import {
  JobWorkspaceShell, Loader, ClientDetailsTab, AuditTrailTab, TeamTab as SharedTeamTab,
  COMMON_TABS, EVENT_TONES, REVIEW_BADGES, resolveTab,
} from '../IncomeTaxPage/JobWorkspaceCommon';
import {
  CASE_STATUS, REVIEW_STATUS, CLOSURE_DOC_TYPES, StatusPill, legalApi, getCaseStatus, resolveCase,
  NoticeDocumentsTab, NoticeDetailModal,
} from './LegalModals';

const EDITABLE_CLIENT_FIELDS = [
  'name', 'email', 'phone', 'address', 'nature_of_business', 'contact_person', 'constitution',
  'cin', 'pan', 'gstin', 'iec', 'ksea', 'udyam', 'apt', 'ept', 'tan', 'lei',
];

const TASK_STATUS = {
  'To Do':       { label: 'To Do',       bg: GL,   color: GR },
  'In Progress': { label: 'In Progress', bg: PL,   color: P },
  'Done':        { label: 'Done',        bg: NEU,  color: NEUT },
  'Over Due':    { label: 'Over Due',    bg: REDL, color: RED },
};

export function getFYandAY() {
  const now = new Date();
  const start = now.getMonth() + 1 >= 4 ? now.getFullYear() : now.getFullYear() - 1;
  return { fy: `FY ${start}-${String(start + 1).slice(-2)}`, ay: `AY ${start + 1}-${String(start + 2).slice(-2)}` };
}

// ══════════════════════════════════════════════════════════════════
// STT task link — the job's task number (e.g. STT-0042). Clicking it opens
// the same Task Details modal as STT Record / Dashboard. Used in the
// litigation and MCA workspace headers and the Team tab. (The case may not
// carry the task's DB id, so it looks it up by STT number — that's why this
// stays instead of the shell's built-in task link.)
// ══════════════════════════════════════════════════════════════════
export function LinkedTaskLink({ caseData, onTaskUpdated, style }) {
  const [taskPk, setTaskPk] = useState(null);
  const [opening, setOpening] = useState(false);
  const [people, setPeople] = useState(null); // { allEmployees, activeUsers } for the Maker/Checker pickers

  const code = caseData?.task_id_display || caseData?.task_id || caseData?.linked_task?.task_id;
  if (!code) return null;

  const open = async () => {
    setOpening(true);
    try {
      let pk = caseData.linked_task?.id ?? (typeof caseData.task === 'number' ? caseData.task : null);
      if (!pk) {
        const res = await api.get('/clients/tasks/', { params: { task_id: code, scope: 'all', page: 1, page_size: 10 } });
        pk = toList(res).find((t) => t.task_id === code)?.id;
      }
      if (!pk) { message.error(`Couldn't find task ${code}`); return; }
      setTaskPk(pk);
      if (!people) {
        Promise.all([
          api.get('/employee/employees/users').then(toList).catch(() => []),
        ]).then(([allEmployees, activeUsers]) => setPeople({ allEmployees, activeUsers }));
      }
    } catch {
      message.error('Failed to open task');
    } finally {
      setOpening(false);
    }
  };

  return (
    <>
      <button
        type="button" onClick={open} disabled={opening} title="Open task details"
        style={{ background: 'none', border: 'none', padding: 0, font: 'inherit', cursor: 'pointer', color: P, fontWeight: 600, ...style }}
      >
        {opening ? `${code}…` : code}
      </button>
      {taskPk && (
        <TaskDetailView
          visible taskId={taskPk}
          onClose={() => setTaskPk(null)}
          onTaskUpdated={onTaskUpdated || (() => {})}
          allEmployees={people?.allEmployees || []}
          activeUsers={people?.activeUsers || []}
        />
      )}
    </>
  );
}

export const LEGAL_TABS = [
  COMMON_TABS.client,
  COMMON_TABS.docs,
  { key: 'activity', label: 'Activity', icon: '⚖️' },
  { key: 'review', label: 'Review', icon: '🔍' },
  COMMON_TABS.team,
  COMMON_TABS.audit,
];
const LEGACY_TAB_KEYS = { details: 'client', documents: 'docs' };

// ══════════════════════════════════════════════════════════════════
// CLIENT DETAILS — shared ClientDetailsTab (layout, edit, save, loader).
// Also used by the MCA workspace.
// ══════════════════════════════════════════════════════════════════
export function DetailsTab({ clientId, client, caseData, constitutions = [], canEdit, onSaved, requestHeaders }) {
  const constitutionName = (id) => constitutions.find((x) => String(x.id) === String(id))?.name || '';
  return (
    <ClientDetailsTab
      reloadKey={client}
      readOnly={!canEdit}
      load={() => ({ ...client })}
      save={async (data) => {
        const payload = Object.fromEntries(EDITABLE_CLIENT_FIELDS.map((k) => [k, data[k] ?? '']));
        try {
          await api.patch(`/clients/clients/${clientId}/`, payload, { headers: requestHeaders });
        } catch (err) {
          throw new Error(err.response?.data ? JSON.stringify(err.response.data) : 'Failed to save changes.');
        }
        await onSaved?.();
        return data;
      }}
      infoNote={canEdit ? 'ℹ️ Auto-filled from the client master. Edit to update.' : 'ℹ️ Read-only — only the assigned maker can edit.'}
      showSaveContinue={false}
      summary={() => [
        { label: 'Task ID',     value: caseData?.task_id_display || caseData?.task_id },
        { label: 'Period',      value: caseData?.task_period || caseData?.financial_year || caseData?.assessment_year || caseData?.period },
        { label: 'Sub-Service', value: caseData?.sub_service_name },
        { label: 'Due Date',    value: caseData?.due_date ? fmtDate(caseData.due_date) : null },
      ]}
      fields={[
        { key: 'name', label: 'Client Name' },
        { key: 'email', label: 'Email', type: 'email' },
        { key: 'phone', label: 'Phone', type: 'tel' },
        { key: 'address', label: 'Address', type: 'textarea', full: true },
        // { key: 'pan', label: 'PAN', mono: true, upper: true, maxLength: 10 },
        // { key: 'gstin', label: 'GSTIN', mono: true, upper: true },
        // { key: 'tan', label: 'TAN', mono: true, upper: true },
        // { key: 'cin', label: 'CIN', mono: true, upper: true },
        // { key: 'nature_of_business', label: 'Nature of Business' },
        // { key: 'constitution', label: 'Constitution', type: 'select',
        //   options: constitutions.map((c) => ({ value: String(c.id), label: c.name })),
        //   format: (v, d) => d.constitution_name || constitutionName(v) },
        // { key: 'group_name', label: 'Client Group', readOnly: true },
        // { key: 'contact_person', label: 'Contact Person' },
      ]}
    />
  );
}

// ══════════════════════════════════════════════════════════════════
// TEAM — shared TeamTab; the linked-task rows are litigation-specific.
// Same props as before (caseData, loading, fallbackRows) so callers don't change.
// ══════════════════════════════════════════════════════════════════
export function TeamTab({ caseData, loading, fallbackRows }) {
  if (!loading && !caseData) return <EmptyState icon="👥" text="No case data available for this client" />;
  const t = caseData?.linked_task;
  const rows = !caseData ? [] : t ? [
    ['Task ID', <LinkedTaskLink key="task" caseData={caseData} />], ['Client', t.client_name], ['Sub-Service', t.sub_service_name], ['SPOC', t.spoc_name],
    ['Team', t.team_name], ['Status', TASK_STATUS[t.status] ? <StatusPill key="status" status={t.status} map={TASK_STATUS} /> : t.status],
    ['Period', t.period], ['Due Date', fmtDate(t.due_date)], ['Created By', t.created_by_name], ['Created At', fmtDateTime(t.created_at)],
  ] : fallbackRows ? fallbackRows(caseData) : [
    ['Reference No.', caseData.reference_no], ['Sub-Service', caseData.sub_service_name],
    ['Status', <StatusPill key="status" status={getCaseStatus(caseData)} />], ['Created By', caseData.created_by_name],
    ['Assessment Year', caseData.assessment_year], ['Period', caseData.period],
    ['Notice Date', fmtDate(caseData.notice_date)], ['Due Date', fmtDate(caseData.due_date)],
  ];
  return <SharedTeamTab makersLoading={loading} makers={caseData?.makers} checkers={caseData?.checkers} linkedTask={rows} />;
}

// ══════════════════════════════════════════════════════════════════
// AUDIT TRAIL — shared timeline (search, refresh, category filter) with
// litigation's labels, tones and detail boxes plugged in.
// ══════════════════════════════════════════════════════════════════
const AUDIT_META = {
  case_created:          { label: 'Task Created',         tone: 'green',  actor: 'Created by' },
  notice_created:        { label: 'Notice Created',       tone: 'green',  actor: 'Created by' },
  assignment:            { label: 'Team Assigned',        tone: 'green',  actor: 'Assigned by' },
  court_notice_uploaded: { label: 'Notice File Uploaded', tone: 'amber',  actor: 'Uploaded by' },
  court_notice_deleted:  { label: 'Notice File Deleted',  tone: 'red',    actor: 'Deleted by' },
  notice_doc_uploaded:   { label: 'Sent for Review',      tone: 'amber',  actor: 'Submitted by' },
  reply_approved:        { label: 'Reply Approved',       tone: 'green' },
  reply_rejected:        { label: 'Reply Rejected',       tone: 'red' },
  reply_escalated:       { label: 'Reply Moved to CEO',   tone: 'purple' },
  ack_approved:          { label: 'Ack Approved',         tone: 'green' },
  ack_rejected:          { label: 'Ack Rejected',         tone: 'red' },
  ack_escalated:         { label: 'Ack Moved to CEO',     tone: 'purple' },
  notice_doc_approved:   { label: 'Approved',             tone: 'green' },
  notice_doc_rejected:   { label: 'Rejected',             tone: 'red' },
  notice_doc_escalated:  { label: 'Moved to CEO',         tone: 'purple' },
  info_update:           { label: 'Info Updated',         tone: 'blue',   actor: 'Updated by' },
  closure_submitted:     { label: 'Closure Submitted',    tone: 'amber',  actor: 'Submitted by' },
  closure_approved:      { label: 'Case Closed',          tone: 'green' },
  closure_rejected:      { label: 'Closure Rejected',     tone: 'red' },
  closure_escalated:     { label: 'Closure Moved to CEO', tone: 'purple' },
  notice_extension_submitted: { label: 'Extension Requested', tone: 'amber', actor: 'Requested by' },
  notice_extension_approved:  { label: 'Extension Approved',  tone: 'green' },
  notice_extension_rejected:  { label: 'Extension Rejected',  tone: 'red' },
};
export const AUDIT_TONES = Object.fromEntries(Object.entries(EVENT_TONES).map(([k, t]) => [k, [t.bg, t.color]])); // legacy shape

const actorOf = (type) => AUDIT_META[type]?.actor
  || (type.includes('approved') ? 'Approved by' : type.includes('rejected') ? 'Rejected by' : type.includes('escalated') ? 'Moved to CEO by' : 'By');

// Is this "Sent for Review" event an acknowledgment (vs a reply bundle)?
const isAckSubmit = (e) => {
  const nv = e.new_values || {};
  return e.event_type === 'notice_doc_uploaded' && (nv.doc_type === 'acknowledgment'
    || ((nv.ack_files || []).length > 0 && !(nv.reply_files || []).length && !(nv.supporting_docs || []).length));
};

const AUDIT_CATEGORIES = [
  { id: 'all', label: 'All events', match: () => true },
  { id: 'notice', label: 'Notices', match: (e) => ['notice_created', 'court_notice_uploaded', 'court_notice_deleted', 'info_update'].includes(e.event_type) },
  { id: 'reply', label: 'Replies & sup docs', match: (e) => ['notice_doc_uploaded', 'reply_approved', 'reply_rejected', 'reply_escalated'].includes(e.event_type) && !isAckSubmit(e) },
  { id: 'ack', label: 'Acknowledgments', match: (e) => ['ack_approved', 'ack_rejected', 'ack_escalated'].includes(e.event_type) || isAckSubmit(e) },
  { id: 'reviews', label: 'Reviews (approve/reject)', match: (e) => /approved|rejected|escalated/.test(e.event_type) },
  { id: 'closure', label: 'Closure', match: (e) => e.event_type.startsWith('closure_') },
  { id: 'client', label: 'Client info', match: (e) => e.event_type === 'info_update' },
];

function FileTag({ children, tone = 'blue' }) {
  const t = EVENT_TONES[tone];
  return <span style={{ fontSize: 11.5, fontWeight: 600, color: t.color, background: t.bg, padding: '2px 8px', borderRadius: 4, fontFamily: 'monospace', width: 'fit-content' }}>{children}</span>;
}

function LegalAuditDetail({ log }) {
  const type = log.event_type;
  const nv = log.new_values || {};
  const ov = log.old_values || {};
  const mark = type.includes('approved') ? ' ✓' : type.includes('rejected') ? ' ✕' : '';
  const supFiles = (nv.supporting_docs || []).filter(Boolean);
  const ackFiles = (nv.ack_files || []).filter(Boolean);
  const ackSubmit = isAckSubmit(log);
  const replySubmit = type === 'notice_doc_uploaded' && !ackSubmit;
  const replyFiles = (nv.reply_files || []).filter(Boolean).length ? nv.reply_files.filter(Boolean) : replySubmit && nv.file_name ? [nv.file_name] : [];
  const ackShown = ackFiles.length ? ackFiles : ackSubmit && nv.file_name ? [nv.file_name] : [];
  const isReply = ['reply_approved', 'reply_rejected', 'reply_escalated'].includes(type) || replySubmit;
  const isAck = ['ack_approved', 'ack_rejected', 'ack_escalated'].includes(type) || ackSubmit;
  const closureDocs = nv.closure_documents || {};
  const reason = nv.rejection_reason || nv.reason;
  const detailBox = { marginTop: 6, padding: '8px 12px', background: BG, border: `1px solid ${BRD}`, borderRadius: 'var(--radius-sm)' };
  const lbl = (t) => <span style={{ fontSize: 11, fontWeight: 700, color: MUT }}>{t}</span>;

  return (
    <>
        {type === 'case_created' && (
          <div style={{ ...detailBox, display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
            {lbl('Task ID')}<FileTag>📋 {nv.task_id || 'N/A'}</FileTag>
            {nv.client_name && <span style={{ fontSize: 12, color: MUT }}>Client: <b style={{ color: INK }}>{nv.client_name}</b></span>}
          </div>
        )}

        {isReply && (replyFiles.length > 0 || supFiles.length > 0) && (
          <div style={{ ...detailBox, display: 'grid', gridTemplateColumns: 'auto 1fr auto 1fr', gap: '4px 12px' }}>
            {lbl('Reply')}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>{replyFiles.length ? replyFiles.map((f) => <FileTag key={f}>📄 {f}{mark}</FileTag>) : '—'}</div>
            {lbl('Sup doc')}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>{supFiles.length ? supFiles.map((f) => <FileTag key={f} tone="amber">📎 {f}{mark}</FileTag>) : '—'}</div>
            {nv.notice_din && <div style={{ gridColumn: '1 / -1', fontSize: 11, color: MUT }}>DIN: {nv.notice_din}</div>}
          </div>
        )}

        {['court_notice_uploaded', 'court_notice_deleted'].includes(type) && nv.file_name && (
          <div style={{ ...detailBox, display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
            {lbl('Notice file')}<FileTag>📋 {nv.file_name}{type === 'court_notice_deleted' && ' ✕'}</FileTag>
            {nv.notice_din && <span style={{ fontSize: 11, color: MUT }}>DIN: {nv.notice_din}</span>}
          </div>
        )}

        {isAck && (ackShown.length > 0 || nv.file_name) && (
          <div style={{ ...detailBox, display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
            {lbl('Acknowledgment')}
            {(ackShown.length ? ackShown : [nv.file_name]).map((f) => <FileTag key={f} tone="purple">📥 {f}{mark}</FileTag>)}
            {nv.notice_din && <span style={{ fontSize: 11, color: MUT }}>DIN: {nv.notice_din}</span>}
          </div>
        )}

        {type === 'notice_created' && (
          <div style={{ ...detailBox, display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 6, fontSize: 12 }}>
            {[['DIN', nv.din_number], ['Officer', nv.officer], ['Notice Date', nv.notice_date], ['Due Date', nv.due_date]]
              .filter(([, v]) => v).map(([k, v]) => <span key={k}><b style={{ color: MUT }}>{k}:</b> {v}</span>)}
          </div>
        )}

        {Object.keys(closureDocs).length > 0 && (
          <div style={{ ...detailBox, display: 'flex', flexDirection: 'column', gap: 4 }}>
            {CLOSURE_DOC_TYPES.filter((t) => closureDocs[t.key]).map((t) => <FileTag key={t.key}>{t.icon} {t.label}: {closureDocs[t.key]}</FileTag>)}
          </div>
        )}

        {type.includes('rejected') && reason && (
          <div style={{ ...detailBox, background: REDL, borderColor: REDB, color: RED, fontSize: 12 }}><b>Reason:</b> {reason}</div>
        )}

        {type.includes('notice_extension') && (
          <div style={{ ...detailBox }}>
            <div style={{ display: 'flex', gap: 16, marginBottom: 8 }}>
              <div><span style={{ fontSize: 11, color: MUT }}>Old Due Date:</span> <span style={{ fontSize: 12, textDecoration: 'line-through', color: RED }}>{fmtDate(nv.old_date) || '—'}</span></div>
              <div><span style={{ fontSize: 11, color: MUT }}>Extended To:</span> <span style={{ fontSize: 12, fontWeight: 700, color: P }}>{fmtDate(nv.new_date)}</span></div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div>
                <span style={{ fontSize: 11, fontWeight: 700, color: MUT }}>Reply Files</span>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 4, marginTop: 4 }}>
                  {nv.reply_docs?.length ? nv.reply_docs.map(d => <FileTag key={d.id}>📄 {d.file_name}{mark}</FileTag>) : <span style={{ fontSize: 11, color: MUT, fontStyle: 'italic' }}>None</span>}
                </div>
              </div>
              <div>
                <span style={{ fontSize: 11, fontWeight: 700, color: MUT }}>Ack Files</span>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 4, marginTop: 4 }}>
                  {nv.ack_docs?.length ? nv.ack_docs.map(d => <FileTag key={d.id} tone="purple">📥 {d.file_name}{mark}</FileTag>) : <span style={{ fontSize: 11, color: MUT, fontStyle: 'italic' }}>None</span>}
                </div>
              </div>
            </div>
            {nv.notes && <div style={{ fontSize: 11, fontStyle: 'italic', marginTop: 8 }}>"{nv.notes}"</div>}
          </div>
        )}


        {type === 'info_update' && Object.keys(nv).length > 0 && (
          <div style={{ ...detailBox, display: 'flex', flexDirection: 'column', gap: 4 }}>
            {Object.keys(nv).filter((k) => !['rejection_reason', 'reason', 'doc_type', 'notice_din'].includes(k)).map((k) => (
              <div key={k} style={{ fontSize: 12, display: 'flex', gap: 6 }}>
                <span style={{ width: 130, fontWeight: 600, color: INK, textTransform: 'capitalize' }}>{k.replace(/_/g, ' ')}</span>
                <span style={{ color: RED, textDecoration: 'line-through' }}>{String(ov[k] || 'None')}</span>
                <span style={{ color: MUT }}>→</span>
                <span style={{ color: GR, fontWeight: 600 }}>{String(nv[k] || 'None')}</span>
              </div>
            ))}
          </div>
        )}

        {/* {type === 'assignment' && (
          <div style={{ ...detailBox, fontSize: 12.5, color: INK, fontWeight: 600 }}>
            {nv.summary || log.title || 'Team updated'}
          </div>
        )} */}
    </>
  );
}

function LegalAuditTab({ clientId, litigationType, courtCaseId, jobId, refreshTick }) {
  const load = async () => {
    const params = { client: clientId, litigation_type: litigationType };
    if (jobId) params.job_id = jobId;
    else if (courtCaseId) params.court_case = courtCaseId;
    return toList(await legalApi.auditTrail.list(params))
      .filter((e) => AUDIT_META[e.event_type])
      .map((e) => {
        const meta = AUDIT_META[e.event_type];
        return { ...e, action: meta.label, tone: EVENT_TONES[meta.tone], actor_label: actorOf(e.event_type), user: e.by_name, note: undefined, description: undefined };
      });
  };
  return (
    <AuditTrailTab
      title={`Audit Trail — ${litigationType === 'income-tax' ? 'Income Tax' : 'TDS'}`}
      reloadKey={`${clientId}-${litigationType}-${jobId || courtCaseId || ''}-${refreshTick}`}
      load={load}
      categories={AUDIT_CATEGORIES}
      searchText={(e) => [e.new_values?.file_name, e.new_values?.notice_din]}
      searchPlaceholder="Search title, file, DIN, person…"
      renderDetail={(e) => <LegalAuditDetail log={e} />}
    />
  );
}

// Case-closure documents as one more card group on the Documents tab.
function closureGroup(activityCase) {
  const docs = activityCase?.closure_documents || [];
  if (!docs.length) return [];
  return [{
    key: 'closure',
    title: '🔒 Case Closure',
    badge: activityCase.closure_review_status ? <StatusPill status={activityCase.closure_review_status} map={REVIEW_STATUS} /> : null,
    items: CLOSURE_DOC_TYPES.map((t) => {
      const d = docs.find((x) => x.doc_type === t.key);
      return {
        key: t.key, label: t.label, icon: t.icon, note: t.description, required: true,
        doc: d ? { filename: d.file_name, url: d.file_url, raw: d, badge: REVIEW_BADGES[d.review_status] } : undefined,
      };
    }),
  }];
}

// ══════════════════════════════════════════════════════════════════
// PAGE
// ══════════════════════════════════════════════════════════════════
export default function LegalWorkSpace() {
  const { clientId } = useParams();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user } = useAuth();

  const isInvalidClient = !clientId || clientId === 'undefined' || clientId === 'null';
  const caseType = searchParams.get('type') === 'income-tax' ? 'income-tax' : 'tds';
  const litigationEndpoint = caseType === 'income-tax' ? 'income-tax-litigations' : 'tds-litigations';
  const caseId = searchParams.get('caseId');
  const typeLabel = caseType === 'income-tax' ? 'Income Tax' : 'TDS';

  const [client, setClient] = useState(null);
  const [caseData, setCaseData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [teamLoading, setTeamLoading] = useState(false);
  const [constitutions, setConstitutions] = useState([]);
  const [combinedMakerIds, setCombinedMakerIds] = useState([]);

  const [activityCase, setActivityCase] = useState(null);
  const [activityLoading, setActivityLoading] = useState(false);
  const [activityError, setActivityError] = useState(null);
  const [creatingCase, setCreatingCase] = useState(false);
  const [pendingReview, setPendingReview] = useState(null);
  const [activeReviewCount, setActiveReviewCount] = useState(0);

  // ?tab= keeps the tab across refreshes. Old links used details / documents.
  const [activeTab, setActiveTab] = useState(() => {
    const t = searchParams.get('tab');
    return LEGACY_TAB_KEYS[t] || t || 'client';
  });
  const [openNoticeId, setOpenNoticeId] = useState(null);
  const [refreshTick, setRefreshTick] = useState(0);
  const bumpRefresh = () => setRefreshTick((t) => t + 1);

  // Keep ?tab= in the URL so a refresh lands on the same tab.
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    params.set('tab', activeTab);
    window.history.replaceState(null, '', `${window.location.pathname}?${params.toString()}`);
  }, [activeTab]);

  useEffect(() => {
    api.get('/clients/constitutions/').then((res) => setConstitutions(toList(res))).catch(() => setConstitutions([]));
  }, []);

  // Client (legal endpoint first — it returns unmasked data — then the generic one).
  const loadClient = useCallback(async () => {
    try {
      setClient((await api.get(`/legal-services/client/${clientId}/`)).data);
    } catch {
      try { setClient((await api.get(`/clients/clients/${clientId}/`)).data); } catch { setError('Failed to load client details.'); }
    }
  }, [clientId]);

  useEffect(() => {
    if (isInvalidClient) return;
    loadClient().finally(() => setLoading(false));
  }, [isInvalidClient, loadClient]);

  // The litigation job: ?caseId= if it matches, else the client's case linked to ?task= (see resolveCase).
  const taskCode = searchParams.get('task');
  const taskPk = searchParams.get('taskPk');
  useEffect(() => {
    if (isInvalidClient) return;
    setTeamLoading(true);
    const base = `/legal-services/${litigationEndpoint}/`;
    resolveCase({
      caseId,
      taskRef: taskCode || taskPk ? { code: taskCode, id: taskPk } : null,
      getById: (id) => api.get(`${base}${id}/`).then((r) => r.data),
      listForClient: () => api.get(base, { params: { client: clientId } }).then(toList),
    })
      .then((c) => setCaseData(c ? { ...c, assessment_year: c.assessment_year || 'Assessment Year', period: c.period || '', makers: c.makers || [], checkers: c.checkers || [] } : null))
      .catch(() => setCaseData(null))
      .finally(() => setTeamLoading(false));
  }, [isInvalidClient, clientId, litigationEndpoint, caseId, taskCode, taskPk]);

  // Makers on ANY of this client's TDS / IT jobs may edit client info.
  useEffect(() => {
    if (isInvalidClient) return;
    Promise.all(['tds-litigations', 'income-tax-litigations'].map((ep) =>
      api.get(`/legal-services/${ep}/?client=${clientId}`).then(toList).catch(() => [])
    )).then((lists) => {
      const ids = new Set();
      lists.flat().forEach((c) => (c.makers || []).forEach((m) => ids.add(m.id)));
      setCombinedMakerIds([...ids]);
    });
  }, [isInvalidClient, clientId]);

  const loadActivityCase = useCallback(() => {
    if (!caseData?.id) { setActivityCase(null); return; }
    setActivityLoading(true); setActivityError(null);
    legalApi.courtCases.list({ client: clientId, litigation_type: caseType, job_id: caseData.id })
      .then((res) => setActivityCase(toList(res).find((cc) => cc.litigation_type === caseType && cc.job_id === caseData.id) || null))
      .catch(() => setActivityError('You do not have permission to view this case, or it does not exist.'))
      .finally(() => setActivityLoading(false));
  }, [caseData?.id, clientId, caseType]);

  useEffect(() => { if (caseData) loadActivityCase(); }, [caseData, loadActivityCase]);

  // Review tab badge: everything waiting on a checker/CEO for this case.
  const loadPendingReview = useCallback(async () => {
    if (!activityCase?.id) { setPendingReview(null); setActiveReviewCount(0); return; }
    try {
      const [rRes, nRes, cRes] = await Promise.all([
        legalApi.reviews.list({ court_case: activityCase.id }),
        legalApi.notices.list({ court_case: activityCase.id }),
        legalApi.courtCases.get(activityCase.id),
      ]);
      const inReview = (s) => s === 'pending' || s === 'escalated';
      const reviews = toList(rRes).filter((r) => (r.action_type === 'summary' || r.action_type === 'notice_edit') && inReview(r.status));
      const notices = toList(nRes);
      const replyCounts = await Promise.all(notices.map((n) =>
        legalApi.replies.list({ notice: n.id }).then((r) => toList(r).filter((x) => inReview(x.status)).length).catch(() => 0)
      ));
      const total = reviews.length
        + notices.filter((n) => inReview(n.review_status)).length
        + notices.reduce((sum, n) => sum + (n.documents || []).filter((d) => inReview(d.review_status) && ['acknowledgment', 'pending', 'reply'].includes(d.doc_type)).length, 0)
        + replyCounts.reduce((a, b) => a + b, 0)
        + (inReview(cRes.data?.closure_review_status) ? 1 : 0);

      setPendingReview(reviews.sort((a, b) => new Date(b.submitted_at) - new Date(a.submitted_at))[0] || null);
      // Only checkers and admins get a badge — makers aren't the ones waiting to act.
      const canSee = isInList(cRes.data?.checkers, user) || ['Admin', 'Founder', 'Manager'].includes(user?.role);
      setActiveReviewCount(canSee ? total : 0);
    } catch {
      setPendingReview(null);
      setActiveReviewCount(0);
    }
    // Depend on id/role, not the user object, so a re-created user object can't cause a fetch loop.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activityCase?.id, user?.id, user?.role]);

  useEffect(() => { loadPendingReview(); }, [loadPendingReview, refreshTick]);

  const handleAddCase = async () => {
    setCreatingCase(true); setActivityError(null);
    try {
      const res = await legalApi.courtCases.create({
        client: clientId, litigation_type: caseType, case_title: caseData?.sub_service_name || 'Untitled Case', job_id: caseData?.id, status: 'wip',
      });
      setActivityCase(res.data);
    } catch {
      setActivityError('Failed to create case.');
    } finally {
      setCreatingCase(false);
    }
  };

  const isMaker = isInList(caseData?.makers, user);
  const canEditClientInfo = isMaker || combinedMakerIds.includes(user?.id);

  if (isInvalidClient) {
    return (
      <div className="page-container">
        <EmptyState icon="⚠️" text="We couldn't find valid client details for this link.">
          <button className="btn btn-primary" style={{ marginTop: 12 }} onClick={() => navigate('/legal-services/litigations')}>Return to dashboard</button>
        </EmptyState>
      </div>
    );
  }
  if (loading) return <div className="page-container"><Loader label="Loading client…" /></div>;
  if (error) return <div className="page-container"><ErrorBanner>{error}</ErrorBanner></div>;
  if (!client) return <div className="page-container"><EmptyState text="No client data found" /></div>;

  const { fy, ay } = getFYandAY();
  const activityStatus = activityCase?.computed_status || activityCase?.status || 'wip';
  const tabs = LEGAL_TABS.map((t) => (t.key === 'review' && activeReviewCount > 0 ? { ...t, badge: String(activeReviewCount) } : t));
  const tab = resolveTab(activeTab, tabs);

  return (
    <main className="page-container">
      <JobWorkspaceShell
        breadcrumb={[
          { label: 'Legal Services', onClick: () => navigate('/legal-services') },
          { label: 'Litigations', onClick: () => navigate('/legal-services/litigations') },
          { label: 'Dashboard', onClick: () => navigate(`/legal-services/litigations/${caseType}`) },
          { label: `${typeLabel} Litigations`, onClick: () => navigate(`/legal-services/litigations/${caseType}/jobs`) },
          { label: client.name },
        ]}
        title={client.name}
        statusNode={<StatusPill status={activityStatus in CASE_STATUS ? activityStatus : 'wip'} />}
        rightChip={caseData?.sub_service_name ? `📄 ${caseData.sub_service_name}` : `⚖️ ${typeLabel} Litigation`}
        meta={[fy, ay, <LinkedTaskLink key="task" caseData={caseData} onTaskUpdated={bumpRefresh} />]}
        tabs={tabs}
        activeTab={tab}
        onTabChange={setActiveTab}
      >
        {tab === 'client' && (
          <DetailsTab
            clientId={clientId} client={client} caseData={caseData} constitutions={constitutions} canEdit={canEditClientInfo}
            requestHeaders={{ 'X-Litigation-Type': caseType, 'X-Court-Case-Id': activityCase?.id?.toString() || '', 'X-Job-Id': caseData?.id?.toString() || '' }}
            onSaved={async () => { await loadClient(); bumpRefresh(); }}
          />
        )}

        {tab === 'docs' && (
          activityLoading ? <Loader label="Loading documents…" />
            : !activityCase ? <EmptyState icon="📁" text="No documents yet. Add a case and notices in the Activity tab first." />
            : (
              <NoticeDocumentsTab
                notices={activityCase.notices || []}
                reloadKey={refreshTick}
                canEdit={isMaker}
                onOpenNotice={(n) => setOpenNoticeId(n.id)}
                extraGroups={closureGroup(activityCase)}
              />
            )
        )}

        {tab === 'activity' && (
          activityLoading ? <Loader label="Loading case…" />
            : activityError ? <ErrorBanner>{activityError}</ErrorBanner>
            : !activityCase ? (
              <EmptyState icon="⚖️" text={`No ${typeLabel} case logged yet.`}>
                {isMaker && (
                  <button className="btn btn-primary" style={{ marginTop: 12 }} onClick={handleAddCase} disabled={creatingCase}>
                    {creatingCase ? 'Creating…' : 'Add case'}
                  </button>
                )}
              </EmptyState>
            ) : (
              <ActivityTimelineV2
                subServiceName={caseData?.sub_service_name}
                activityCase={activityCase}
                canEdit={isMaker}
                pendingReview={pendingReview}
                caseData={caseData}
                api={{
                  setDescription: (desc) => legalApi.courtCases.setDescription(activityCase.id, desc).then((r) => r.data),
                  addStep: (note) => legalApi.courtCases.addStep(activityCase.id, note).then((r) => r.data),
                }}
                onUpdated={(updated) => {
                  if (updated && typeof updated === 'object') setActivityCase({ ...updated });
                  bumpRefresh();
                  loadActivityCase();
                }}
              />
            )
        )}

        {tab === 'review' && (
          !activityCase
            ? <EmptyState icon="🔍" text="No case yet — add one in the Activity tab to enable reviews." />
            : <ReviewTabV2 courtCaseId={activityCase.id} refreshTick={refreshTick} caseData={caseData} onUpdated={bumpRefresh} />
        )}

        {tab === 'team' && <TeamTab caseData={caseData} loading={teamLoading} />}

        {tab === 'audit' && (
          <LegalAuditTab clientId={clientId} litigationType={caseType} courtCaseId={activityCase?.id} jobId={caseData?.id} refreshTick={refreshTick} />
        )}
      </JobWorkspaceShell>

      {openNoticeId && (
        <NoticeDetailModal
          noticeId={openNoticeId}
          canEdit={isMaker}
          onClose={() => setOpenNoticeId(null)}
          onUpdated={() => { bumpRefresh(); loadActivityCase(); }}
        />
      )}
    </main>
  );
}