
import React, { useState, useEffect, useCallback } from 'react';
import { DownloadOutlined, DeleteOutlined,UploadOutlined } from '@ant-design/icons';
import { api } from '../../services/api';
import { useAuth } from '../../contexts/AuthContext';
import AddNoticeModal, { CloseCaseModal, UploadReplyBundleModal } from './AddNoticeModal';
import ReplyEditorModal from './ReplyEditorModal';

// ══════════════════════════════════════════════════════════════════
// CONSTANTS & THEME
// ══════════════════════════════════════════════════════════════════
const MUT = '#8A8FA3';

const C = {
  navy: '#1E3A6B', navyMid: '#2A4F8F', navyDark: '#0F1E3D',
  ink: '#0F172A', slate: '#475569', muted: '#94A3B8',
  border: '#E7E9F0', borderLight: '#F1F3F8',
  bg: '#F8FAFC', bgSoft: '#FBFCFE',
  green: '#0F7A5A', greenBg: '#E6F5EF', greenBorder: '#A7F3D0',
  amber: '#92620B', amberBg: '#FBF2DE', amberBorder: '#FCD34D',
  red: '#B42318', redBg: '#FCEBEA', redBorder: '#F2C1BC',
  blue: '#2563EB', blueBg: '#EFF6FF', blueBorder: '#BFDBFE',
  purple: '#6D28D9', purpleBg: '#F1E8FE', purpleBorder: '#DDD6FE',
};

const STATUS_META = {
  wip:    { label: 'WIP',    color: '#92620B', bg: '#FBF2DE', border: '#F0DDA3' },
  under_review: { label: 'UNDER REVIEW', color: '#6D28D9', bg: '#F1E8FE', border: '#DDD6FE' },
  attention_required: { label: 'ATTENTION REQUIRED', color: '#B42318', bg: '#FCEBEA', border: '#F2C1BC' },
  open:   { label: 'OPEN',   color: '#0369A1', bg: '#E8F4FC', border: '#BEE0F5' },
  closed: { label: 'CLOSED', color: '#0F7A5A', bg: '#E6F5EF', border: '#B4DFCF' },
};

const REVIEW_META = {
  draft:     { label: 'Draft',         color: C.slate, bg: C.bg,      border: C.border },
  pending:   { label: 'Under Review',  color: C.amber, bg: C.amberBg, border: C.amberBorder },
  approved:  { label: 'Approved',      color: C.green, bg: C.greenBg, border: C.greenBorder },
  rejected:  { label: 'Rejected',      color: C.red,   bg: C.redBg,   border: C.redBorder },
  escalated: { label: 'Escalated',     color: C.purple,bg: C.purpleBg,border: C.purpleBorder },
};

// ══════════════════════════════════════════════════════════════════
// UTILITIES
// ══════════════════════════════════════════════════════════════════
function fmtDate(d) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}

function truncateName(name, maxLen = 22) {
  if (!name) return '';
  if (name.length <= maxLen) return name;
  const ext = name.split('.').pop();
  const base = name.substring(0, name.lastIndexOf('.'));
  const cut = maxLen - ext.length - 4;
  if (cut < 4) return name.substring(0, maxLen - 3) + '...';
  return `${base.substring(0, cut)}...${ext}`;
}

function getDaysInfo(dueDate, noticeStatus) {
  if (!dueDate) return null;
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const due = new Date(dueDate); due.setHours(0, 0, 0, 0);
  const diff = Math.ceil((due - today) / (1000 * 60 * 60 * 24));
  if (noticeStatus === 'open') {
    if (diff < 0) return null; 
    if (diff === 0) return { text: 'Due today', color: MUT, urgent: false };
    return { text: `${diff}d left`, color: MUT, urgent: false };
  }
  if (diff < 0) return { text: `${Math.abs(diff)}d overdue`, color: C.red, urgent: true, attention: true };
  if (diff === 0) return { text: 'Due today', color: C.red, urgent: true, attention: true };
  if (diff <= 5) return { text: `${diff}d left`, color: C.red, urgent: true, attention: true };
  if (diff <= 7) return { text: `${diff}d left`, color: C.amber, urgent: false };
  return { text: `${diff}d left`, color: MUT, urgent: false };
}

function Toast({ message, type = 'success', onClose }) {
  useEffect(() => { const timer = setTimeout(onClose, 3000); return () => clearTimeout(timer); }, [onClose]);
  const bgColor = type === 'success' ? C.green : type === 'error' ? C.red : C.navy;
  const icon = type === 'success' ? '✓' : type === 'error' ? '✕' : 'ℹ';
  return (
    <div style={{
      position: 'fixed', top: 24, right: 24, zIndex: 999999, background: '#fff', border: `1px solid ${bgColor}30`,
      borderLeft: `4px solid ${bgColor}`, borderRadius: 8, padding: '12px 16px 12px 14px',
      boxShadow: '0 10px 30px rgba(15,23,42,0.15)', display: 'flex', alignItems: 'center', gap: 12, minWidth: 280, maxWidth: 400,
      animation: 'toastSlideIn 0.3s cubic-bezier(0.16, 1, 0.3, 1)', fontFamily: "'Inter','Roboto',sans-serif",
    }}>
      <style>{`@keyframes toastSlideIn { from { opacity: 0; transform: translateX(30px); } to { opacity: 1; transform: translateX(0); } }`}</style>
      <div style={{ width: 26, height: 26, borderRadius: '50%', background: bgColor, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, fontWeight: 800, flexShrink: 0 }}>{icon}</div>
      <div style={{ fontSize: 12.5, fontWeight: 600, color: C.ink, lineHeight: 1.4, flex: 1 }}>{message}</div>
      <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: MUT, fontSize: 16, padding: 0, width: 20, height: 20, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>✕</button>
    </div>
  );
}

function StatusPill({ status, size = 'sm' }) {
  const meta = STATUS_META[status] || STATUS_META.wip;
  return <span style={{ padding: size === 'sm' ? '1px 6px' : '3px 10px', borderRadius: 4, fontSize: size === 'sm' ? 8.5 : 10, fontWeight: 700, letterSpacing: '.04em', textTransform: 'uppercase', background: meta.bg, color: meta.color, border: `1px solid ${meta.border}`, whiteSpace: 'nowrap', display: 'inline-flex', alignItems: 'center' }}>{meta.label}</span>;
}

function ReviewChip({ pendingList }) {
  if (!pendingList || pendingList.length === 0) return null;
  const label = pendingList.length === 1 ? pendingList[0] : `${pendingList.length} Pending Reviews`;
  return <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '3px 9px', borderRadius: 4, background: C.amberBg, color: C.amber, border: `1px solid ${C.amberBorder}`, fontSize: 10, fontWeight: 700, whiteSpace: 'nowrap' }}><span style={{ fontSize: 10 }}>⏳</span>{label}</span>;
}

function StatusCountChip({ status, count }) {
  const meta = STATUS_META[status];
  if (!meta) return null;
  const isEmpty = count === 0;
  return <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 10.5, fontWeight: 700, color: isEmpty ? MUT : C.slate }}><span style={{ width: 6, height: 6, borderRadius: '50%', background: isEmpty ? C.border : meta.color, flexShrink: 0 }} />{meta.label} <b style={{ color: isEmpty ? MUT : C.ink }}>{count}</b></span>;
}

function SidebarNoticeRow({ notice, isSelected, onClick }) {
  const [hover, setHover] = useState(false);
  const days = getDaysInfo(notice.extended_due_date || notice.due_date, notice.status);
  const isAttention = !!days?.attention;
  let bgColor = isSelected ? (isAttention ? '#FEE4E2' : C.blueBg) : (isAttention ? (hover ? '#FEE4E2' : '#FEF2F2') : (hover ? C.bgSoft : '#fff'));
  const leftBorderColor = isSelected ? (isAttention ? C.red : C.navy) : (isAttention ? C.red : 'transparent');

  return (
    <div
      onClick={onClick}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        padding: '8px 12px',
        cursor: 'pointer',
        borderLeft: `2.5px solid ${leftBorderColor}`,
        background: bgColor,
        borderBottom: `1px solid ${C.borderLight}`,
        transition: 'background .12s',
      }}
    >
      {/* Top row: DIN + Status */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
        <span
          style={{
            fontSize: 11,
            fontWeight: 700,
            color: isSelected ? C.navy : C.ink,
            fontFamily: "'Roboto Mono', monospace",
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
            minWidth: 0,
            flex: 1,
          }}
          title={notice.din_number || '—'}
        >
          {notice.din_number || '—'}
        </span>
        <StatusPill status={notice.status} />
      </div>

      {/* Second row: Officer name */}
      <div
        style={{
          fontSize: 11.5,
          fontWeight: 600,
          color: isSelected ? C.navy : C.slate,
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
          marginTop: 2,
        }}
        title={notice.officer || 'No officer'}
      >
        {notice.officer || <span style={{ color: MUT, fontStyle: 'italic', fontWeight: 500 }}>No officer</span>}
      </div>

      {/* Third row: days left / overdue (unchanged) */}
      {days && (
        <div style={{ fontSize: 10, fontWeight: 600, color: days.urgent ? days.color : MUT, marginTop: 2 }}>
          {days.text}
        </div>
      )}
    </div>
  );
}

// ── LARGE SECTION HEADING ──
function SectionLabel({ children }) {
  return (
    <div style={{ marginBottom: 16, marginTop: 28, paddingBottom: 6, borderBottom: `2px solid ${C.borderLight}` }}>
      <div style={{ fontSize: 13, fontWeight: 800, color: C.navyDark, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
        {children}
      </div>
    </div>
  );
}

// ── SMALL SUB-HEADING ──
function SubHeading({ children }) {
  return (
    <div style={{ fontSize: 9.5, fontWeight: 800, color: MUT, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 8 }}>
      {children}
    </div>
  );
}

function PlainField({ label, value, mono, highlight }) {
  const isEmpty = !value || value === '—';
  return (
    <div style={{ minWidth: 0 }}>
      <div style={{ fontSize: 9.5, fontWeight: 700, color: MUT, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 3 }}>{label}</div>
      <div style={{ fontSize: 12.5, fontWeight: 700, color: isEmpty ? '#CBD5E1' : (highlight ? C.navy : C.ink), wordBreak: 'break-word', lineHeight: 1.3, fontFamily: mono ? "'Roboto Mono', monospace" : 'inherit' }}>{value || '—'}</div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════
// COMPACT FILE CARD (Smaller & shorter for cleaner UI)
// ══════════════════════════════════════════════════════════════════
function FileCard({ icon, title, status, isHtml, onOpen, onDownload, onDelete, canDelete, deleting }) {
  const [hover, setHover] = useState(false);
  const meta = REVIEW_META[status] || STATUS_META[status] || { label: 'Draft', color: C.slate, bg: C.bg, border: C.border };
  const shortName = truncateName(title, 22); // Strict truncation
  
  return (
    <div
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        display: 'flex', alignItems: 'center', gap: 6,
        padding: '4px 8px', background: hover ? C.bgSoft : '#fff',
        border: `1px solid ${hover ? C.border : C.borderLight}`,
        borderRadius: 4, transition: 'all 0.1s', cursor: 'pointer',
        width: '100%', maxWidth: 240, boxSizing: 'border-box', height: 28 // ✅ Compact size
      }}
      onClick={onOpen}
      title={title}
    >
      <div style={{ fontSize: 12, color: C.muted, flexShrink: 0 }}>{icon || (isHtml ? '📝' : '📄')}</div>
      <div style={{ flex: 1, minWidth: 0, display: 'flex', alignItems: 'center', gap: 6 }}>
        <div style={{ fontSize: 10.5, fontWeight: 600, color: C.ink, whiteSpace: 'nowrap' }}>
          {shortName}
        </div>
        {status && status !== 'not_applicable' && (
          <span style={{ fontSize: 7, fontWeight: 800, padding: '1px 4px', borderRadius: 2, background: meta.bg, color: meta.color, border: `1px solid ${meta.border}`, textTransform: 'uppercase', flexShrink: 0 }}>
            {meta.label}
          </span>
        )}
      </div>
      <div style={{ display: 'flex', gap: 2, flexShrink: 0 }} onClick={e => e.stopPropagation()}>
        {onDownload && (
          <button onClick={onDownload} title="Download" style={{ width: 18, height: 18, border: `1px solid ${C.border}`, borderRadius: 3, background: '#fff', color: C.slate, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 0 }}>
            <DownloadOutlined style={{ fontSize: 9 }} />
          </button>
        )}
        {canDelete && (
          <button onClick={onDelete} disabled={deleting} title="Delete" style={{ width: 18, height: 18, border: `1px solid ${C.redBorder}`, borderRadius: 3, background: '#fff', color: C.red, cursor: deleting ? 'wait' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 0, opacity: deleting ? 0.5 : 1 }}>
            <DeleteOutlined style={{ fontSize: 9 }} />
          </button>
        )}
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════
// NOTICE DETAIL VIEW
// ══════════════════════════════════════════════════════════════════
function NoticeDetailView({
  notice, replies, allReplies, isAssignedMaker, isFounder,
  onReply, onEdit, onUploadReplyClick,
  uploadingCourtNotice, uploadingAck, uploadingSupportId, deletingId,
  onUploadCourtNotice, onUploadAck, onUploadSupportDoc, onDeleteDoc,
  onOpenDoc, onDownloadDoc,
  onOpenReply, onDownloadReply, onDeleteReply,
  pendingReviewLabels, hasPendingNoticeEdit,
  onSubmitDocs, submittingDocs,
}) {
  if (!notice) {
    return (
      <div style={{ padding: 60, textAlign: 'center', color: C.muted, fontSize: 13 }}>
        <div style={{ fontSize: 32, marginBottom: 10, opacity: 0.35 }}>📋</div>
        <div style={{ fontSize: 13, fontWeight: 700, color: C.slate }}>No notice selected</div>
      </div>
    );
  }

  
  const canSeeDrafts = !!isAssignedMaker;

  const isVisibleDoc = (d) => {
    if (!d) return false;
    if (d.doc_type === 'court_notice') return true; 
    const rs = d.review_status || 'not_applicable';
    if (rs === 'draft') return canSeeDrafts;
    return true; 
  };

  const isVisibleHtmlReply = (r) => {
    if (!r) return false;
    if (r.status === 'draft') return canSeeDrafts;
    return true;
  };

  const allDocs = (notice.documents || []).filter(isVisibleDoc);
  const courtNoticeDoc = (notice.documents || []).find(d => d.doc_type === 'court_notice') || null;

  const allAckDocs = allDocs.filter(d => d.doc_type === 'acknowledgment');
  const acknowledgmentDoc =
    allAckDocs.find(d => d.review_status === 'approved') ||
    allAckDocs[0] ||
    null;

  const replyDocs = allDocs.filter(d => ['pending', 'reply'].includes(d.doc_type));
  const supportDocs = allDocs.filter(d => ['pending_support', 'supporting_doc'].includes(d.doc_type));

  const visibleHtmlReplies = (allReplies || replies || []).filter(isVisibleHtmlReply);

  const combined = [
    ...visibleHtmlReplies.map(r => ({
      ...r,
      isHtml: true,
      ts: new Date(r.updated_at || r.created_at).getTime(),
    })),
    ...replyDocs.map(d => ({
      ...d,
      isHtml: false,
      ts: new Date(d.reviewed_at || d.uploaded_at).getTime(),
    })),
  ].sort((a, b) => a.ts - b.ts);

  const versionGroups = combined.map((item, i) => ({
    version: i + 1,
    main: item,
    supports: supportDocs.filter(sd => String(sd.reply_version) === String(item.id))
  }));

  const hasCourtNotice = !!courtNoticeDoc;
  const hasApprovedReply = combined.some(r => (r.status || r.review_status) === 'approved');
  const hasDrafts = canSeeDrafts && (
    (notice.documents || []).some(d => d.review_status === 'draft') ||
    (allReplies || []).some(r => r.status === 'draft')
  );
  const hasPendingAck = allAckDocs.some(d => ['pending', 'escalated'].includes(d.review_status));

  const repliesLocked = !hasCourtNotice;
  const ackLocked = !hasCourtNotice || !hasApprovedReply;
  const canUploadAck = isAssignedMaker && hasApprovedReply && !acknowledgmentDoc && !hasPendingAck;

  const canDeleteFile = (item) => isAssignedMaker && ['draft', 'rejected'].includes(item.review_status || item.status);

  const handleDeleteHtmlReply = (reply) => {
    onDeleteReply(reply);
  };

  return (
    <div style={{ padding: '20px 24px', display: 'flex', flexDirection: 'column', minHeight: '100%' }}>
      
      {/* ────── HEADER ────── */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10, paddingBottom: 12, borderBottom: `1px solid ${C.borderLight}` }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
          <span style={{ fontSize: 16, fontWeight: 800, color: C.ink }}>Notice — DIN {notice.din_number || '—'}</span>
          <StatusPill status={notice.status} size="md" />
          <ReviewChip pendingList={pendingReviewLabels} />
        </div>
        {isAssignedMaker && !hasPendingNoticeEdit && (
          <button onClick={onEdit} style={{ padding: '5px 12px', border: `1px solid ${C.border}`, borderRadius: 6, background: '#fff', color: C.slate, cursor: 'pointer', fontSize: 11, fontWeight: 600 }}>✎ Edit Details</button>
        )}
      </div>

      {/* ────── NOTICE INFORMATION ────── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px 20px', paddingLeft: 16, marginBottom: 20 }}>
        <PlainField label="DIN Number" value={notice.din_number} mono />
        <PlainField label="Section" value={notice.section} mono />
        <PlainField label="Officer" value={notice.officer} />
        <PlainField label="Notice Date" value={fmtDate(notice.notice_date)} />
        <PlainField label="Due Date" value={fmtDate(notice.due_date)} highlight />
        <PlainField label="Extended Due Date" value={fmtDate(notice.extended_due_date)} highlight={!!notice.extended_due_date} />
        <PlainField label="PH Date" value={fmtDate(notice.ph_date)} highlight={!!notice.ph_date} />
      </div>

      {/* ────── DOCUMENTS & WORKFLOW ────── */}
      <SectionLabel>Documents & Workflow</SectionLabel>
      
      {/* Strict Alignment Grid for entire workflow block */}
      <div style={{ display: 'grid', gridTemplateColumns: '32px 1fr 32px 1fr', gap: '12px 16px', marginBottom: 20 }}>
        
        {/* ROW 1: Notice & Acknowledgment Headings */}
        <div></div>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
            <SubHeading>Notice <span style={{ color: C.red }}>*</span></SubHeading>
            {isAssignedMaker && !courtNoticeDoc && (
              <label style={{ padding: '2px 8px', border: `1px dashed ${C.navy}`, borderRadius: 4, color: C.navy, fontSize: 9.5, fontWeight: 700, cursor: uploadingCourtNotice ? 'wait' : 'pointer' }}>
                <input type="file" accept=".pdf,.doc,.docx" style={{ display: 'none' }} onChange={(e) => e.target.files[0] && onUploadCourtNotice(e.target.files[0])} disabled={uploadingCourtNotice} />
                {uploadingCourtNotice ? '⏳' : '⬆ Upload'}
              </label>
            )}
          </div>
          {courtNoticeDoc ? (
            <FileCard title={courtNoticeDoc.file_name} status="not_applicable" onOpen={() => onOpenDoc(courtNoticeDoc)} onDownload={() => onDownloadDoc(courtNoticeDoc)} canDelete={isAssignedMaker} onDelete={() => onDeleteDoc(courtNoticeDoc.id)} deleting={deletingId === courtNoticeDoc.id} />
          ) : <span style={{ fontSize: 11, color: MUT, fontStyle: 'italic' }}>Not uploaded</span>}
        </div>

        <div></div> {/* Empty Spacer Column */}

        <div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
            <SubHeading>Acknowledgment</SubHeading>
            {canUploadAck && (
              <label style={{ padding: '2px 8px', border: `1px dashed ${C.purple}`, borderRadius: 4, color: C.purple, fontSize: 9.5, fontWeight: 700, cursor: uploadingAck ? 'wait' : 'pointer' }}>
                <input type="file" accept=".pdf,.doc,.docx,.jpg,.png" style={{ display: 'none' }} onChange={(e) => e.target.files[0] && onUploadAck(e.target.files[0])} disabled={uploadingAck} />
                {uploadingAck ? '⏳' : '⬆ Upload'}
              </label>
            )}
          </div>
          {ackLocked ? (
            <div style={{ padding: '6px', textAlign: 'center', fontSize: 10, color: MUT, fontStyle: 'italic', background: C.bgSoft, borderRadius: 4, maxWidth: 240 }}>Unlock after reply approval</div>
          ) : acknowledgmentDoc ? (
            <FileCard title={acknowledgmentDoc.file_name} status={acknowledgmentDoc.review_status} onOpen={() => onOpenDoc(acknowledgmentDoc)} onDownload={() => onDownloadDoc(acknowledgmentDoc)} canDelete={canDeleteFile(acknowledgmentDoc)} onDelete={() => onDeleteDoc(acknowledgmentDoc.id)} deleting={deletingId === acknowledgmentDoc.id} />
          ) : (
            <div style={{ padding: '6px', textAlign: 'center', fontSize: 10, color: MUT, fontStyle: 'italic', background: C.bgSoft, borderRadius: 4, maxWidth: 240 }}>
              {hasPendingAck ? 'Under checker review' : 'No file uploaded'}
            </div>
          )}
        </div>

        {/* SPACING ROW */}
        <div style={{ gridColumn: '1 / -1', height: 16, borderBottom: `1px solid ${C.borderLight}` }}></div>

        {/* ROW 2: Replies & Supports Headings */}
        <div></div>
        
        {/* Buttons moved next to Replies Heading */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, paddingTop: 8 }}>
          <SubHeading>Replies</SubHeading>
          {isAssignedMaker && !repliesLocked && (
            <div style={{ display: 'flex', gap: 5, paddingBottom: 6 }}>
              <button onClick={onUploadReplyClick} style={{ padding: '3px 10px', border: `1px solid ${C.navy}`, background: '#fff', color: C.navy, borderRadius: 5, fontSize: 10, fontWeight: 700, cursor: 'pointer' }}>⬆ Upload</button>
              <button onClick={onReply} style={{ padding: '3px 10px', border: 'none', background: C.navy, color: '#fff', borderRadius: 5, fontSize: 10, fontWeight: 700, cursor: 'pointer' }}>📝 Reply</button>
            </div>
          )}
        </div>

        <div></div> {/* Empty Spacer Column */}
        
        <div style={{ paddingTop: 8 }}>
          <SubHeading>Supporting Docs</SubHeading>
        </div>

        {/* ROW 3+: Dynamic Version Rows */}
        {repliesLocked ? (
          <div style={{ gridColumn: '2 / -1', padding: '16px', textAlign: 'center', fontSize: 11, color: MUT, fontStyle: 'italic', background: C.bgSoft, borderRadius: 6, maxWidth: 500 }}>Upload Notice to unlock</div>
        ) : versionGroups.length === 0 ? (
          <div style={{ gridColumn: '2 / -1', padding: '16px', textAlign: 'center', fontSize: 11, color: MUT, fontStyle: 'italic', background: C.bgSoft, borderRadius: 6, maxWidth: 500 }}>No replies yet</div>
        ) : (
          versionGroups.map(vg => {
            const mainStatus = vg.main.status || vg.main.review_status;
            // The Maker can only upload support docs if the main reply is unlocked (draft/rejected)
            const canAddSupport = canDeleteFile(vg.main); 

            return (
              <React.Fragment key={`v-${vg.version}`}>
                
                {/* COLUMN 1: Version Label */}
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', paddingTop: 6 }}>
                  <div style={{ fontSize: 12, fontWeight: 800, color: C.blue }}>v{vg.version}</div>
                </div>
                
                {/* COLUMN 2: Main Reply Document */}
                <div>
                  {vg.main.isHtml ? (
                    <FileCard isHtml title={vg.main.title || 'Untitled'} status={mainStatus} onOpen={() => onOpenReply(vg.main)} onDownload={() => onDownloadReply(vg.main)} canDelete={canDeleteFile(vg.main)} onDelete={() => handleDeleteHtmlReply(vg.main)} deleting={deletingId === `reply-${vg.main.id}`} />
                  ) : (
                    <FileCard title={vg.main.file_name} status={mainStatus} onOpen={() => onOpenDoc(vg.main)} onDownload={() => onDownloadDoc(vg.main)} canDelete={canDeleteFile(vg.main)} onDelete={() => onDeleteDoc(vg.main.id)} deleting={deletingId === vg.main.id} />
                  )}
                </div>

                {/* COLUMN 3: Small Upload Button for Support Docs */}
                <div style={{ display: 'flex', justifyContent: 'center', paddingTop: 2 }}>
                  {canAddSupport && (
                    <label 
                      title="Upload Supporting Document"
                      style={{
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        height: 24, padding: '0 6px',                 // was width: 24
                        border: `1px dashed ${C.navy}`,
                        borderRadius: 4, background: '#fff', color: C.navy,
                        fontSize: 9, fontWeight: 700,                 // was 16
                        whiteSpace: 'nowrap',
                        cursor: uploadingSupportId === vg.main.id ? 'wait' : 'pointer',
                        opacity: uploadingSupportId === vg.main.id ? 0.5 : 1,
                        transition: 'all 0.1s ease',
                      }}
                      onMouseEnter={(e) => { e.currentTarget.style.background = C.blueBg; }}
                      onMouseLeave={(e) => { e.currentTarget.style.background = '#fff'; }}
                    >
                      <input 
                        type="file" 
                        accept=".pdf,.doc,.docx,.jpg,.png,.xlsx,.xls" 
                        style={{ display: 'none' }}
                        disabled={uploadingSupportId === vg.main.id}
                        onChange={(e) => {
                          if (e.target.files[0]) {
                            onUploadSupportDoc(e.target.files[0], vg.main.id);
                            e.target.value = '';
                          }
                        }}
                      />
                      {uploadingSupportId === vg.main.id ? '⏳' : '+ Add'}   {/* was '+' */}
                    </label>
                  )}
                </div>

                {/* COLUMN 4: Supporting Docs List */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {vg.supports.length === 0 ? (
                    <span style={{ fontSize: 10, color: MUT, fontStyle: 'italic', paddingTop: 6 }}>No supporting docs</span>
                  ) : vg.supports.map(sd => (
                    <FileCard key={sd.id} icon="📎" title={sd.file_name} status={mainStatus} onOpen={() => onOpenDoc(sd)} onDownload={() => onDownloadDoc(sd)} canDelete={canDeleteFile(sd)} onDelete={() => onDeleteDoc(sd.id)} deleting={deletingId === sd.id} />
                  ))}
                </div>
                
              </React.Fragment>
            );
          })
        )}
      </div>

      {/* NOTES */}
      <SectionLabel>Notes</SectionLabel>
      <div style={{ padding: '10px 12px', background: C.bgSoft, border: `1px solid ${C.borderLight}`, borderLeft: `3px solid ${C.navy}`, borderRadius: 6, fontSize: 12, color: C.ink, whiteSpace: 'pre-wrap', marginBottom: 16 }}>
        {notice.notes || <span style={{ color: MUT, fontStyle: 'italic' }}>No notes added.</span>}
      </div>

      {/* SUBMIT FOR REVIEW */}
      {isAssignedMaker && (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 12, paddingTop: 12, borderTop: `1px solid ${C.borderLight}`, marginTop: 'auto' }}>
          <span style={{ fontSize: 11, color: MUT }}>
            {hasDrafts ? <b style={{ color: C.amber }}>⚠ You have unsaved drafts to submit</b> : 'All documents are submitted.'}
          </span>
          <button onClick={onSubmitDocs} disabled={!hasDrafts || submittingDocs} style={{
            padding: '8px 18px', borderRadius: 6, border: 'none',
            background: hasDrafts ? C.navy : '#CBD5E1', color: '#fff',
            fontSize: 12, fontWeight: 700, cursor: hasDrafts ? 'pointer' : 'not-allowed',
          }}>
            {submittingDocs ? '⏳ Submitting...' : '📤 Submit for Review'}
          </button>
        </div>
      )}
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════
// MAIN COMPONENT EXPORT
// ══════════════════════════════════════════════════════════════════
export default function ActivityTimelineV2({ activityCase, subServiceName, canEdit, api: caseApi, onUpdated, caseData }) {
  const { user } = useAuth();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [toast, setToast] = useState(null);
  const [editingSummary, setEditingSummary] = useState(false);
  const [descText, setDescText] = useState(activityCase.job_description || '');
  const [notices, setNotices] = useState([]);
  const [loadingNotices, setLoadingNotices] = useState(true);
  
  const noticeStorageKey = `activity_notice_${activityCase?.id || 'none'}`;
  const [selectedNoticeId, setSelectedNoticeIdState] = useState(() => {
    try {
      const urlNoticeId = new URLSearchParams(window.location.search).get('notice');
      if (urlNoticeId) return parseInt(urlNoticeId, 10);
      const stored = sessionStorage.getItem(noticeStorageKey);
      return stored ? parseInt(stored, 10) : null;
    } catch { return null; }
  });

  const setSelectedNoticeId = useCallback((id) => {
    setSelectedNoticeIdState(id);
    try { if (id) sessionStorage.setItem(noticeStorageKey, String(id)); else sessionStorage.removeItem(noticeStorageKey); } catch {}
  }, [noticeStorageKey]);

  const [selectedNoticeDetails, setSelectedNoticeDetails] = useState(null);
  const [selectedReplies, setSelectedReplies] = useState([]);
  const [allReplies, setAllReplies] = useState([]);
  const [pendingNoticeEdits, setPendingNoticeEdits] = useState([]);
  const [showAddNoticeModal, setShowAddNoticeModal] = useState(false);
  const [showCloseCaseModal, setShowCloseCaseModal] = useState(false);
  const [showUploadReplyBundleModal, setShowUploadReplyBundleModal] = useState(false);
  const [editNotice, setEditNotice] = useState(null);
  const [replyModalNotice, setReplyModalNotice] = useState(null);
  const [uploadingCourtNotice, setUploadingCourtNotice] = useState(false);
  const [uploadingAck, setUploadingAck] = useState(false);
  const [uploadingSupportId, setUploadingSupportId] = useState(null);
  const [deletingId, setDeletingId] = useState(null);
  const [submittingDocs, setSubmittingDocs] = useState(false);

  const isAssignedMaker = (caseData?.makers || []).some((m) => m.id === user?.id);
  const isAssignedChecker = (caseData?.checkers || []).some((c) => c.id === user?.id);
  const isFounder = user?.role === 'Founder';
  const isCeoRole = isFounder; 
  const isCaseClosed = caseData?.status === 'closed';
  const showCloseCaseButton = !!user;
  const canAddNotice = isAssignedMaker && !isCaseClosed;
  const hasSummary = !!activityCase.job_description;

  const showToast = (message, type = 'success') => { setToast({ message, type }); };

  useEffect(() => { setDescText(activityCase.job_description || ''); }, [activityCase.job_description, activityCase.id]);

  const fetchNotices = useCallback(() => {
    if (!activityCase?.id) return;
    setLoadingNotices(true);
    api.get('/legal-services/notices/', { params: { court_case: activityCase.id } })
      .then((res) => {
        const data = Array.isArray(res.data) ? res.data : (res.data.results || []);
        setNotices(data);
        if (data.length > 0) {
          const stillExists = selectedNoticeId && data.some(n => n.id === selectedNoticeId);
          if (!stillExists) setSelectedNoticeId(data[0].id);
        } else setSelectedNoticeId(null);
      }).catch(() => setNotices([])).finally(() => setLoadingNotices(false));
  }, [activityCase?.id]);

  useEffect(() => { fetchNotices(); }, [fetchNotices]);

  const fetchPendingNoticeEdits = useCallback(async () => {
    if (!activityCase?.id) return;
    try {
      const res = await api.get('/legal-services/reviews/', { params: { court_case: activityCase.id, status: 'pending' } });
      const data = Array.isArray(res.data) ? res.data : (res.data.results || []);
      setPendingNoticeEdits(data.filter(r => r.action_type === 'notice_edit'));
    } catch { setPendingNoticeEdits([]); }
  }, [activityCase?.id]);

  useEffect(() => { fetchPendingNoticeEdits(); }, [fetchPendingNoticeEdits]);

  const fetchSelectedNoticeDetails = useCallback(async () => {
    if (!selectedNoticeId) { setSelectedNoticeDetails(null); setSelectedReplies([]); setAllReplies([]); return; }
    try {
      const [noticeRes, repliesRes] = await Promise.all([
        api.get(`/legal-services/notices/${selectedNoticeId}/`),
        api.get('/legal-services/notice-replies/', { params: { notice: selectedNoticeId } }),
      ]);
      setSelectedNoticeDetails(noticeRes.data);
      const replyList = Array.isArray(repliesRes.data) ? repliesRes.data : (repliesRes.data.results || []);
      setAllReplies(replyList);
      setSelectedReplies(replyList.filter(r => r.status === 'approved'));
    } catch { setSelectedNoticeDetails(null); setSelectedReplies([]); setAllReplies([]); }
  }, [selectedNoticeId]);

  useEffect(() => { fetchSelectedNoticeDetails(); }, [fetchSelectedNoticeDetails]);

  const statusCounts = {
    wip: notices.filter(n => n.status === 'wip').length,
    under_review: notices.filter(n => n.status === 'under_review').length,
    open: notices.filter(n => n.status === 'open').length,
    attention: notices.filter(n => {
      if (n.status !== 'wip' && n.status !== 'under_review') return false;
      const due = n.extended_due_date || n.due_date; if (!due) return false;
      const today = new Date(); today.setHours(0, 0, 0, 0); const d = new Date(due); d.setHours(0, 0, 0, 0);
      return Math.ceil((d - today) / (1000 * 60 * 60 * 24)) <= 5;
    }).length,
  };

  const { pendingReviewLabels, hasPendingNoticeEdit } = React.useMemo(() => {
    if (!selectedNoticeDetails) return { pendingReviewLabels: [], hasPendingNoticeEdit: false };
    const pendingTypes = [];
    
    // ✅ Check if HTML Reply (Write) is pending
    const hasHtmlPending = allReplies.some(r => ['pending', 'escalated'].includes(r.status));
    
    // ✅ Check if Uploaded Reply (Upload) is pending
    const hasDocReplyPending = (selectedNoticeDetails.documents || []).some(d => 
      ['pending', 'reply'].includes(d.doc_type) && ['pending', 'escalated'].includes(d.review_status)
    );

    // If EITHER is pending, show the "Reply Pending" chip
    if (hasHtmlPending || hasDocReplyPending) {
      pendingTypes.push('Reply');
    }

    if ((selectedNoticeDetails.documents || []).some(d => d.doc_type === 'acknowledgment' && ['pending', 'escalated'].includes(d.review_status))) {
      pendingTypes.push('Acknowledgment');
    }
    
    const hasEditPending = pendingNoticeEdits.some(r => r.payload?.notice_id === selectedNoticeDetails.id && r.status === 'pending');
    if (hasEditPending) pendingTypes.push('Info Update');
    
    let label = '';
    if (pendingTypes.length === 1) label = `${pendingTypes[0]} Pending`;
    else if (pendingTypes.length === 2) label = `${pendingTypes[0]} and ${pendingTypes[1]} Pending`;
    else if (pendingTypes.length > 2) label = `${pendingTypes.slice(0, -1).join(', ')} and ${pendingTypes[pendingTypes.length - 1]} Pending`;
    
    return { pendingReviewLabels: label ? [label] : [], hasPendingNoticeEdit: hasEditPending };
  }, [selectedNoticeDetails, allReplies, pendingNoticeEdits]);

  
  const saveSummary = async () => {
    setBusy(true); setError('');
    try {
      const res = await caseApi.setDescription(descText.trim());
      showToast(res?.review_submitted ? 'Summary submitted for checker review' : 'Summary saved', 'success');
      if (res) onUpdated(res.data || res);
      setEditingSummary(false);
    } catch (e) {
      const msg = e?.response?.data?.error || 'Failed to save summary.';
      setError(msg); showToast(msg, 'error');
    } finally { setBusy(false); }
  };

  const handleUploadCourtNotice = async (file) => {
    setUploadingCourtNotice(true);
    try {
      const fd = new FormData(); fd.append('notice', selectedNoticeId); fd.append('file', file); fd.append('doc_type', 'court_notice');
      await api.post('/legal-services/notice-documents/', fd, { headers: { 'Content-Type': 'multipart/form-data' } });
      showToast('Notice uploaded', 'success'); await fetchSelectedNoticeDetails(); fetchNotices();
    } catch (e) { showToast(e?.response?.data?.error || 'Failed to upload', 'error'); } finally { setUploadingCourtNotice(false); }
  };

  const handleUploadSupportDoc = async (file, mainReplyId) => {
    setUploadingSupportId(mainReplyId);
    try {
      const fd = new FormData();
      fd.append('notice', selectedNoticeId);
      fd.append('file', file);
      fd.append('doc_type', 'pending_support');
      fd.append('reply_version', mainReplyId);

      await api.post('/legal-services/notice-documents/', fd, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      showToast('Supporting document added', 'success');
      await fetchSelectedNoticeDetails();
      fetchNotices();
    } catch (e) {
      showToast(e?.response?.data?.error || 'Failed to upload', 'error');
    } finally {
      setUploadingSupportId(null);
    }
  };


  const handleUploadAck = async (file) => {
    setUploadingAck(true);
    try {
      const fd = new FormData(); fd.append('notice', selectedNoticeId); fd.append('file', file); fd.append('doc_type', 'acknowledgment');
      await api.post('/legal-services/notice-documents/', fd, { headers: { 'Content-Type': 'multipart/form-data' } });
      showToast('Acknowledgment saved as draft', 'success'); await fetchSelectedNoticeDetails(); fetchNotices();
    } catch (e) { showToast(e?.response?.data?.error || 'Failed to upload', 'error'); } finally { setUploadingAck(false); }
  };

  const handleDeleteDoc = async (docId) => {
    if (!window.confirm('Delete this file?')) return;
    setDeletingId(docId);
    try {
      await api.delete(`/legal-services/notice-documents/${docId}/`);
      showToast('File deleted', 'success'); await fetchSelectedNoticeDetails(); fetchNotices();
    } catch (e) { showToast(e?.response?.data?.error || 'Failed to delete', 'error'); } finally { setDeletingId(null); }
  };

  const handleOpenDoc = (doc) => { if (doc?.file_url) window.open(doc.file_url, '_blank', 'noopener,noreferrer'); };
  const handleDownloadDoc = async (doc) => {
    if (!doc?.file_url) return;
    try {
      const response = await fetch(doc.file_url); const blob = await response.blob();
      const url = window.URL.createObjectURL(blob); const link = document.createElement('a');
      link.href = url; link.download = doc.file_name || 'download';
      document.body.appendChild(link); link.click(); document.body.removeChild(link); window.URL.revokeObjectURL(url);
    } catch { showToast('Download failed', 'error'); }
  };

  const handleOpenReply = (reply) => {
    const html = `<!DOCTYPE html><html><head><meta charset="UTF-8"><title>${reply.title || 'Reply'}</title><style>@page{size:A4;margin:1in;}@media print{body{margin:0;}.no-print{display:none!important;}}*{box-sizing:border-box;}body{font-family:'Times New Roman',Times,serif;font-size:12pt;line-height:1.5;color:#1a1a2e;max-width:800px;margin:0 auto;padding:40px;background:#fff;-webkit-user-select:text;user-select:text;cursor:text;}table{border-collapse:collapse;margin:10px 0;width:100%;}td,th{border:1px solid #999;padding:6px 10px;}p,div{margin:0 0 0.5em;}ul,ol{margin:0 0 0.5em;padding-left:30px;}.toolbar{position:fixed;top:0;left:0;right:0;background:#1E3A6B;color:#fff;padding:8px 20px;display:flex;align-items:center;gap:12px;font-family:'Segoe UI',Arial,sans-serif;font-size:13px;font-weight:600;z-index:100;box-shadow:0 2px 8px rgba(0,0,0,0.2);}.toolbar button{padding:6px 16px;border:1px solid rgba(255,255,255,0.3);border-radius:5px;background:rgba(255,255,255,0.1);color:#fff;cursor:pointer;font-size:12px;font-weight:600;font-family:inherit;}.toolbar button:hover{background:rgba(255,255,255,0.2);}.content{margin-top:50px;}</style></head><body><div class="toolbar no-print"><span>📄 ${(reply.title || 'Reply').replace(/</g, '&lt;')}</span><div style="flex:1"></div><button onclick="window.print()">🖨 Print / Save as PDF</button></div><div class="content">${reply.content_html || ''}</div></body></html>`;
    window.open(URL.createObjectURL(new Blob([html], { type: 'text/html' })), '_blank');
  };

  const handleDownloadReply = async (reply) => {
    const content = reply.content_html || '';
    if (!content.trim()) return showToast('No content to download', 'error');
    try {
      const { default: html2pdf } = await import('html2pdf.js');
      const wrapper = document.createElement('div');
      wrapper.style.fontFamily = "'Times New Roman', Times, serif"; wrapper.style.fontSize = '12pt'; wrapper.style.lineHeight = '1.5'; wrapper.style.padding = '20px'; wrapper.style.background = '#fff'; wrapper.style.width = '700px'; wrapper.innerHTML = content;
      wrapper.querySelectorAll('table').forEach(t => { t.style.borderCollapse = 'collapse'; t.style.width = '100%'; t.style.marginBottom = '10px'; });
      wrapper.querySelectorAll('td, th').forEach(cell => { cell.style.border = '1px solid #333'; cell.style.padding = '4px 8px'; });
      document.body.appendChild(wrapper);
      await html2pdf().set({ margin: [0.8, 0.8, 0.8, 0.8], filename: `${(reply.title || 'reply').replace(/[^a-z0-9]/gi, '_')}.pdf`, image: { type: 'jpeg', quality: 0.98 }, html2canvas: { scale: 2, useCORS: true, scrollY: 0 }, jsPDF: { unit: 'in', format: 'a4', orientation: 'portrait' } }).from(wrapper).save();
      document.body.removeChild(wrapper); showToast('PDF downloaded', 'success');
    } catch { showToast('PDF failed', 'error'); }
  };

  const handleDeleteReply = async (reply) => {
    if (!window.confirm(`Delete "${reply.title || 'Untitled'}"?`)) return;
    setDeletingId(`reply-${reply.id}`);
    try { await api.delete(`/legal-services/notice-replies/${reply.id}/`); showToast('Reply deleted', 'success'); await fetchSelectedNoticeDetails(); fetchNotices(); } catch { showToast('Cannot delete', 'error'); } finally { setDeletingId(null); }
  };

  const handleSubmitDocs = async () => {
    if (!selectedNoticeId) return;
    setSubmittingDocs(true);
    try {
      const draftHtmls = allReplies.filter(r => r.status === 'draft' || r.status === 'rejected');
      for (const html of draftHtmls) { try { await api.post(`/legal-services/notice-replies/${html.id}/send-for-review/`); } catch {} }
      await api.post(`/legal-services/notices/${selectedNoticeId}/submit-docs/`);
      showToast('All drafts sent for checker review', 'success');
      await fetchSelectedNoticeDetails(); fetchNotices(); 
      if (onUpdated) onUpdated(); 
    } catch (e) { showToast(e?.response?.data?.error || 'Failed to submit', 'error'); } finally { setSubmittingDocs(false); }
  };

  return (
    <div style={{ fontFamily: "'Inter','Roboto',sans-serif" }}>
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
      <div style={{ borderRadius: 10, background: '#fff', border: `1px solid ${C.border}`, padding: '10px 14px', marginBottom: 10, boxShadow: '0 1px 3px rgba(15,23,42,0.04)' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, flexWrap: 'wrap', marginBottom: hasSummary || editingSummary ? 6 : 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 7, flex: 1, minWidth: 200 }}>
            <h2 style={{ margin: 0, fontSize: 15, fontWeight: 800, color: C.ink }}>{subServiceName || activityCase.case_title || 'Untitled Case'}</h2>
            {canEdit && !editingSummary && <button onClick={() => { setDescText(activityCase.job_description || ''); setEditingSummary(true); }} style={{ width: 22, height: 22, border: `1px solid ${C.border}`, borderRadius: 4, background: '#fff', color: C.muted, cursor: 'pointer', fontSize: 11 }}>✎</button>}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0, flexWrap: 'wrap' }}>
            <span style={{ fontSize: 11, fontWeight: 700, color: C.slate }}>{notices.length} notice{notices.length !== 1 ? 's' : ''}</span>
            {notices.length > 0 && (<><span style={{ width: 1, height: 14, background: C.border }} /> <StatusCountChip status="wip" count={statusCounts.wip} /> <StatusCountChip status="under_review" count={statusCounts.under_review} /> <StatusCountChip status="open" count={statusCounts.open} /></>)}
            {showCloseCaseButton && <button onClick={() => setShowCloseCaseModal(true)} style={{ padding: '4px 11px', border: `1px solid ${isCaseClosed ? C.green : C.amber}`, borderRadius: 5, background: isCaseClosed ? C.greenBg : '#FBF2DE', color: isCaseClosed ? C.green : C.amber, fontWeight: 700, fontSize: 11, cursor: 'pointer' }}>{isCaseClosed ? '✅ Case Closed' : '🔒 Close Case'}</button>}
            {canAddNotice && <button onClick={() => setShowAddNoticeModal(true)} style={{ padding: '4px 11px', border: `1px solid ${C.navy}`, borderRadius: 5, background: '#fff', color: C.navy, fontWeight: 700, fontSize: 11, cursor: 'pointer' }}>+ Add Notice</button>}
          </div>
        </div>
        <div>
          {editingSummary && canEdit ? (
            <><textarea autoFocus rows={2} value={descText} onChange={(e) => setDescText(e.target.value)} placeholder="Add summary..." style={{ width: '100%', padding: '7px 10px', borderRadius: 5, border: `1px solid ${C.border}`, background: '#fff', color: C.ink, fontSize: 12, resize: 'vertical', outline: 'none' }} />
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 5, marginTop: 5 }}>
                <button onClick={() => { setDescText(activityCase.job_description || ''); setEditingSummary(false); }} style={{ padding: '5px 12px', border: `1px solid ${C.border}`, borderRadius: 5, background: '#fff', color: C.slate, fontSize: 11, fontWeight: 600, cursor: 'pointer' }}>Cancel</button>
                <button onClick={saveSummary} style={{ padding: '5px 14px', border: 'none', borderRadius: 5, background: C.navy, color: '#fff', fontSize: 11, fontWeight: 700, cursor: 'pointer' }}>Save</button>
              </div></>
          ) : hasSummary ? <div style={{ fontSize: 12, color: C.slate, whiteSpace: 'pre-wrap' }}>{activityCase.job_description}</div> : null}
        </div>
      </div>
      {error && <div style={{ marginBottom: 10, padding: '9px 12px', background: C.redBg, color: C.red, borderRadius: 8, fontSize: 12, fontWeight: 600, border: `1px solid ${C.redBorder}` }}>{error}</div>}
      <div style={{ display: 'flex', gap: 12, minHeight: 500 }}>
        <div style={{ width: 260, flexShrink: 0, background: '#fff', border: `1px solid ${C.border}`, borderRadius: 10, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
          <div style={{ padding: '8px 12px', borderBottom: `1px solid ${C.borderLight}`, background: C.bgSoft }}><span style={{ fontSize: 10.5, fontWeight: 800, color: C.slate, textTransform: 'uppercase' }}>Notices</span></div>
          <div style={{ flex: 1, overflowY: 'auto' }}>
            {loadingNotices ? <div style={{ padding: 24, textAlign: 'center', fontSize: 12, color: MUT }}>Loading...</div> : notices.length === 0 ? <div style={{ padding: '24px 14px', textAlign: 'center' }}><div style={{ fontSize: 12, fontWeight: 700, color: C.ink }}>No notices yet</div></div> : notices.map(n => <SidebarNoticeRow key={n.id} notice={n} isSelected={selectedNoticeId === n.id} onClick={() => setSelectedNoticeId(n.id)} />)}
          </div>
        </div>
        <div style={{ flex: 1, minWidth: 0, background: '#fff', border: `1px solid ${C.border}`, borderRadius: 10, overflow: 'auto' }}>
          <NoticeDetailView
            notice={selectedNoticeDetails}
            replies={selectedReplies}
            allReplies={allReplies}
            isAssignedMaker={isAssignedMaker}
            isFounder={isFounder}
            onReply={() => setReplyModalNotice(selectedNoticeDetails)}
            onUploadReplyClick={() => setShowUploadReplyBundleModal(true)}
            onEdit={() => setEditNotice(selectedNoticeDetails)}
            uploadingCourtNotice={uploadingCourtNotice}
            uploadingAck={uploadingAck}
            uploadingSupportId={uploadingSupportId}          // ✅
            deletingId={deletingId}
            onUploadCourtNotice={handleUploadCourtNotice}
            onUploadAck={handleUploadAck}
            onUploadSupportDoc={handleUploadSupportDoc}      // ✅
            onDeleteDoc={handleDeleteDoc}
            onOpenDoc={handleOpenDoc}
            onDownloadDoc={handleDownloadDoc}
            onOpenReply={handleOpenReply}
            onDownloadReply={handleDownloadReply}
            onDeleteReply={handleDeleteReply}
            pendingReviewLabels={pendingReviewLabels}
            hasPendingNoticeEdit={hasPendingNoticeEdit}
            onSubmitDocs={handleSubmitDocs}
            submittingDocs={submittingDocs}
          />
        </div>
      </div>
      {showAddNoticeModal && <AddNoticeModal courtCaseId={activityCase.id} onClose={() => setShowAddNoticeModal(false)} onCreated={() => { setShowAddNoticeModal(false); fetchNotices(); }} />}
      {editNotice && <AddNoticeModal courtCaseId={activityCase.id} editNotice={editNotice} submitForReview={isAssignedMaker && !isFounder} onClose={() => setEditNotice(null)} onCreated={() => { setEditNotice(null); fetchNotices(); fetchSelectedNoticeDetails(); fetchPendingNoticeEdits(); }} />}
      {replyModalNotice && <ReplyEditorModal noticeId={replyModalNotice.id} notice={replyModalNotice} replyId={null} mode="edit" currentUserId={user?.id} isAssignedMaker={isAssignedMaker} isAssignedChecker={isAssignedChecker} isCeoRole={isCeoRole} onClose={() => setReplyModalNotice(null)} onSaved={(data, action) => { fetchNotices(); fetchSelectedNoticeDetails(); if (onUpdated) onUpdated(); if (['approve', 'reject'].includes(action)) setReplyModalNotice(null); }} />}
      {showCloseCaseModal && <CloseCaseModal courtCaseId={activityCase.id} canEdit={isAssignedMaker && !isCaseClosed} onClose={() => setShowCloseCaseModal(false)} onUpdated={() => { onUpdated && onUpdated(); fetchNotices(); }} />}
      {showUploadReplyBundleModal && selectedNoticeDetails && <UploadReplyBundleModal noticeId={selectedNoticeDetails.id} onClose={() => setShowUploadReplyBundleModal(false)} onSuccess={() => { setShowUploadReplyBundleModal(false); fetchSelectedNoticeDetails(); fetchNotices(); }} />}
    </div>
  );
}