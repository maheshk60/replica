// ActivityTimelineV2.js — Activity tab: case summary, notice list (left),
// selected notice's documents & workflow (right).

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Input, message } from 'antd';
import { useAuth } from '../../contexts/AuthContext';
import { AddNoticeModal, CloseCaseModal, UploadReplyBundleModal, AddExtensionModal, useConfirm } from './LegalModals';
import ReplyEditorModal from './ReplyEditorModal';
import {
  P, PL, BG, BRD, MUT, INK, GR, GL, RED, REDL, AMB, AMBL, WH,
  CASE_STATUS, CLOSURE_DOC_TYPES, StatusPill, SectionTitle, Field, FileChip, EmptyState,
  legalApi, toList, isInList, fmtDate, getDaysInfo, noticeDueDate, isNoticeAttention,
  openFile, downloadDoc, openHtmlReply, downloadHtmlReplyPdf,
} from './legalCommon';

const errMsg = (e, fallback) => e?.response?.data?.error || fallback;

// Small "⬆ Upload" trigger that opens the native file picker.
function UploadTrigger({ label = '⬆ Upload', accept, busy, onFile }) {
  return (
    <label className="btn btn-secondary" style={{ padding: '3px 10px', fontSize: 11, cursor: busy ? 'wait' : 'pointer', margin: 0 }}>
      <input type="file" accept={accept} style={{ display: 'none' }} disabled={busy}
        onChange={(e) => { const f = e.target.files[0]; e.target.value = ''; if (f) onFile(f); }} />
      {busy ? '⏳' : label}
    </label>
  );
}

function Muted({ children, boxed }) {
  return (
    <div style={{
      fontSize: 11, color: MUT, fontStyle: 'italic',
      ...(boxed ? { padding: 10, textAlign: 'center', background: 'var(--color-slate-50)', borderRadius: 'var(--radius-sm)' } : {}),
    }}>
      {children}
    </div>
  );
}

function SidebarNoticeRow({ notice, selected, onClick }) {
  const days = getDaysInfo(noticeDueDate(notice), notice.status);
  const urgent = isNoticeAttention(notice);
  return (
    <div
      onClick={onClick}
      style={{
        padding: '8px 12px', cursor: 'pointer', borderBottom: `1px solid ${BRD}`,
        borderLeft: `3px solid ${selected ? (urgent ? RED : P) : urgent ? RED : 'transparent'}`,
        background: selected ? (urgent ? REDL : PL) : urgent ? '#FFF7F7' : WH,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
        <span style={{ fontSize: 11.5, fontWeight: 700, color: selected ? P : INK, fontFamily: 'monospace', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {notice.din_number || '—'}
        </span>
        <StatusPill status={notice.status} />
      </div>
      <div style={{ fontSize: 11.5, fontWeight: 600, color: notice.officer ? 'var(--color-slate-600)' : MUT, marginTop: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
        {notice.officer || 'No officer'}
      </div>
      {days && <div style={{ fontSize: 10, fontWeight: 600, color: days.urgent ? days.color : MUT, marginTop: 2 }}>{days.text}</div>}
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════
// SELECTED NOTICE
// ══════════════════════════════════════════════════════════════════

function NoticeDetailView({
  notice, allReplies, extensionRequests, isMaker, isCaseClosed, activityCase, pendingLabel, hasPendingNoticeEdit,
  uploading, deletingId, submitting,
  onEdit, onReply, onUploadReplyClick, onUpload, onUploadSupport, onDeleteDoc, onDeleteReply, onSubmitDocs,
  onAddExtension,
}) {
  // ── ALL HOOKS MUST RUN BEFORE ANY EARLY RETURN ──
  const activeExtension = useMemo(() => {
    if (!notice || !extensionRequests) return null;
    const reqs = extensionRequests
      .filter(r => String(r.payload?.notice_id) === String(notice.id))
      .sort((a, b) => new Date(b.submitted_at || 0) - new Date(a.submitted_at || 0));
    const latest = reqs[0];
    if (latest && ['draft', 'pending', 'rejected'].includes(latest.status)) {
      return latest;
    }
    return null;
  }, [notice, extensionRequests]);

  // ── NOW safe to early-return ──
  if (!notice) return <EmptyState compact icon="📋" text="No notice selected" />;

  const docs = (notice.documents || []).filter((d) => d.doc_type === 'court_notice' || d.review_status !== 'draft' || isMaker);
  const htmlReplies = (allReplies || []).filter((r) => r.status !== 'draft' || isMaker);

  const courtNotice = (notice.documents || []).find((d) => d.doc_type === 'court_notice') || null;
  const ackDocs = docs.filter((d) => d.doc_type === 'acknowledgment');
  const ack = ackDocs.find((d) => d.review_status === 'approved') || ackDocs[0] || null;

  // ── VERSION GROUPING LOGIC (Preserved perfectly) ──
  const fileRoots = docs.filter(d => 
    ['pending', 'reply', 'pending_support', 'supporting_doc'].includes(d.doc_type) && !d.reply_version
  );

  const allRoots = [
    ...htmlReplies.map(r => ({ ...r, _isHtml: true, ts: new Date(r.reviewed_at || r.updated_at || r.created_at || 0).getTime() })),
    ...fileRoots.map(d => ({ ...d, _isHtml: false, ts: new Date(d.reviewed_at || d.uploaded_at || 0).getTime() }))
  ].sort((a, b) => a.ts - b.ts); // Sort oldest to newest sequentially

  const versionGroups = allRoots.map((root, index) => {
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

    return {
      v: index + 1, // ALWAYS assign a continuous version number
      mains,
      supports,
      status: root.status || root.review_status || 'draft',
      rootKey: root._isHtml ? `h-${root.id}` : `d-${root.id}`,
      rootId: root.id
    };
  });


  const hasApprovedReply = versionGroups.some((g) => g.status === 'approved' || g.mains.some(m => m.status === 'approved' || m.review_status === 'approved'));
  
  // Notice how activeExtension being a 'draft' or 'rejected' counts as a draft to enable the Submit button
  const hasDrafts = isMaker && (
    (notice.documents || []).some((d) => d.review_status === 'draft') || 
    (allReplies || []).some((r) => r.status === 'draft') ||
    (activeExtension && ['draft', 'rejected'].includes(activeExtension.status))
  );

  const ackPending = ackDocs.some((d) => ['pending', 'escalated'].includes(d.review_status));
  const repliesLocked = !courtNotice;
  const ackLocked = !courtNotice || !hasApprovedReply;
  const canUploadAck = isMaker && hasApprovedReply && !ack && !ackPending;
  const editable = (item) => isMaker && ['draft', 'rejected'].includes(item.review_status || item.status);

  const closureDocs = activityCase?.closure_review_status === 'approved' ? activityCase.closure_documents || [] : [];
  const extensions = notice.extension_history || [];
  
  return (
    <div style={{ padding: '18px 22px', display: 'flex', flexDirection: 'column', minHeight: '100%' }}>
      {/* ── HEADER ── */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, paddingBottom: 12, borderBottom: `1px solid ${BRD}` }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
          <span style={{ fontSize: 16, fontWeight: 800, color: INK }}>Notice — DIN {notice.din_number || '—'}</span>
          <StatusPill status={notice.status} />
          {pendingLabel && (
            <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 9px', borderRadius: 99, background: AMBL, color: AMB }}>⏳ {pendingLabel}</span>
          )}
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          {/* ✅ Hide Add Extension if an active extension request exists */}
          {isMaker && !isCaseClosed && !activeExtension && (
            <button className="btn btn-secondary" style={{ padding: '4px 12px' }} onClick={() => onAddExtension(null)}>📅 Add extension</button>
          )}
          {isMaker && !hasPendingNoticeEdit && (
            <button className="btn btn-secondary" style={{ padding: '4px 12px' }} onClick={onEdit}>✎ Edit details</button>
          )}
        </div>
      </div>

      {/* ── ALIGNED DATE FIELDS ── */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16, marginTop: 14 }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: '12px 24px' }}>
          <Field label="DIN Number" value={notice.din_number} mono />
          <Field label="Section" value={notice.section} mono />
          <Field label="Officer" value={notice.officer} />
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: '12px 16px' }}>
          <Field label="Notice date" value={fmtDate(notice.notice_date)} />
          <Field label="Due date" value={fmtDate(notice.due_date)} highlight />
          <Field label="PH date" value={fmtDate(notice.ph_date)} highlight />
        </div>
      </div>

      {/* ── DOCUMENTS & WORKFLOW ── */}
      <SectionTitle style={{ marginTop: 24 }}>Documents & workflow</SectionTitle>
      <div style={{ display: 'grid', gridTemplateColumns: '32px 1fr 56px 1fr', gap: '10px 14px' }}>
        
        {/* Notice file + acknowledgment */}
        <div />
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
            <span style={{ fontSize: 11, fontWeight: 700, color: MUT }}>Notice <span style={{ color: RED }}>*</span></span>
            {isMaker && !courtNotice && !isCaseClosed && (
              <UploadTrigger accept=".pdf,.doc,.docx" busy={uploading === 'court_notice'} onFile={(f) => onUpload(f, 'court_notice')} />
            )}
          </div>
          {courtNotice ? (
            <FileChip name={courtNotice.file_name} onOpen={() => openFile(courtNotice)} onDownload={() => downloadDoc(courtNotice)}
              canDelete={isMaker} onDelete={() => onDeleteDoc(courtNotice.id)} deleting={deletingId === courtNotice.id} />
          ) : <Muted>Not uploaded</Muted>}
        </div>
        <div />
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
            <span style={{ fontSize: 11, fontWeight: 700, color: MUT }}>Acknowledgment</span>
            {canUploadAck && <UploadTrigger accept=".pdf,.doc,.docx,.jpg,.png" busy={uploading === 'acknowledgment'} onFile={(f) => onUpload(f, 'acknowledgment')} />}
          </div>
          {ackLocked ? <Muted boxed>Unlocks after a reply is approved</Muted>
            : ack ? (
              <FileChip name={ack.file_name} icon="📥" status={ack.review_status} onOpen={() => openFile(ack)} onDownload={() => downloadDoc(ack)}
                canDelete={editable(ack)} onDelete={() => onDeleteDoc(ack.id)} deleting={deletingId === ack.id} />
            ) : <Muted boxed>{ackPending ? 'Under checker review' : 'No file uploaded'}</Muted>}
        </div>

        <div style={{ gridColumn: '1 / -1', borderBottom: `1px solid ${BRD}`, margin: '4px 0' }} />

        {/* Replies + supporting docs */}
        <div />
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ fontSize: 11, fontWeight: 700, color: MUT }}>Replies</span>
          {isMaker && !repliesLocked && !isCaseClosed && (
            <>
              <button className="btn btn-secondary" style={{ padding: '3px 10px', fontSize: 11 }} onClick={onUploadReplyClick}>⬆ Upload</button>
              <button className="btn btn-primary" style={{ padding: '3px 10px', fontSize: 11 }} onClick={onReply}>📝 Write</button>
            </>
          )}
        </div>
        <div />
        <span style={{ fontSize: 11, fontWeight: 700, color: MUT, alignSelf: 'center' }}>Supporting docs</span>

        {repliesLocked || versionGroups.length === 0 ? (
          <div style={{ gridColumn: '2 / -1' }}>
            <Muted boxed>{repliesLocked ? 'Upload the notice to unlock replies' : 'No replies yet'}</Muted>
          </div>
        ) : versionGroups.slice().reverse().map(({ v, mains, supports, status, rootKey, rootId }) => {
          
          return (
            <React.Fragment key={rootKey}>
              <div style={{ fontSize: 12, fontWeight: 800, color: P, textAlign: 'center', paddingTop: 5 }}>
                v{v}
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                {mains.length === 0 ? (
                  <Muted>—</Muted>
                ) : (
                  mains.map((main) => (
                    <FileChip
                      key={main.id}
                      name={main._isHtml ? main.title || 'Untitled' : main.file_name}
                      icon={main._isHtml ? '📝' : '📄'} status={status}
                      onOpen={() => (main._isHtml ? openHtmlReply(main) : openFile(main))}
                      onDownload={() => (main._isHtml
                        ? downloadHtmlReplyPdf(main).then(() => message.success('PDF downloaded')).catch(() => message.error('PDF failed'))
                        : downloadDoc(main))}
                      canDelete={editable(main)}
                      onDelete={() => (main._isHtml ? onDeleteReply(main) : onDeleteDoc(main.id))}
                      deleting={deletingId === (main._isHtml ? `reply-${main.id}` : main.id)}
                    />
                  ))
                )}
              </div>
              
              <div style={{ textAlign: 'center' }}>
                {mains.length > 0 && editable(mains[0]) && (
                  <UploadTrigger label="+ Add" accept=".pdf,.doc,.docx,.jpg,.png,.xlsx,.xls" busy={uploading === `support-${rootId}`}
                    onFile={(f) => onUploadSupport(f, rootId)} />
                )}
              </div>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {supports.length === 0 ? <Muted>No supporting docs</Muted> : supports.map((s) => (
                  <FileChip key={s.id} name={s.file_name} icon="📎" status={status} onOpen={() => openFile(s)} onDownload={() => downloadDoc(s)}
                    canDelete={editable(s)} onDelete={() => onDeleteDoc(s.id)} deleting={deletingId === s.id} />
                ))}
              </div>
            </React.Fragment>
          );
        })}
      </div>

      {closureDocs.length > 0 && (
        <>
          <SectionTitle style={{ marginTop: 24 }}>Case closure documents</SectionTitle>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, padding: 12, background: GL, borderRadius: 'var(--radius-md)' }}>
            {CLOSURE_DOC_TYPES.map((t) => {
              const doc = closureDocs.find((d) => d.doc_type === t.key);
              return doc && (
                <div key={t.key}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: GR, marginBottom: 4 }}>{t.label}</div>
                  <FileChip name={doc.file_name} status="approved" onOpen={() => openFile(doc)} onDownload={() => downloadDoc(doc)} />
                </div>
              );
            })}
          </div>
        </>
      )}

      {/* ── UNIFIED DATE EXTENSIONS (Active + Approved History) ── */}
      {(extensions.length > 0 || activeExtension) && (
        <>
          <SectionTitle style={{ marginTop: 24 }}>Date Extensions {extensions.length > 0 ? `(${extensions.length})` : ''}</SectionTitle>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            
            {/* 1. ACTIVE EXTENSION (Draft / Pending / Rejected) - ALWAYS ON TOP */}
            {activeExtension && (
              <div style={{ padding: 12, background: activeExtension.status === 'rejected' ? '#FEF2F2' : activeExtension.status === 'draft' ? '#F8FAFC' : '#FFFBEB', border: `1px solid ${activeExtension.status === 'rejected' ? '#FECACA' : activeExtension.status === 'draft' ? BRD : '#FDE68A'}`, borderRadius: 'var(--radius-md)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12, borderBottom: `1px solid ${activeExtension.status === 'rejected' ? '#FECACA' : activeExtension.status === 'draft' ? BRD : '#FDE68A'}`, paddingBottom: 8 }}>
                  <div style={{ fontSize: 13, fontWeight: 800, color: activeExtension.status === 'rejected' ? RED : activeExtension.status === 'draft' ? MUT : AMB }}>
                    {activeExtension.status === 'rejected' ? '✕ Extension Rejected' : activeExtension.status === 'draft' ? '📝 Extension Draft' : '⏳ Extension Under Review'}
                  </div>
                  <div style={{ display: 'flex', gap: 8 }}>
                    {isMaker && ['draft', 'rejected'].includes(activeExtension.status) && !isCaseClosed && (
                      <button className="btn btn-secondary" style={{ padding: '4px 10px', fontSize: 11 }} onClick={() => onAddExtension(activeExtension)}>
                        ✎ Edit
                      </button>
                    )}
                  </div>
                </div>
                
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 12, alignItems: 'start' }}>
                  <div>
                    <div style={{ fontSize: 11, color: MUT, fontWeight: 700, marginBottom: 2 }}>Old Due Date</div>
                    <div style={{ fontSize: 13, fontWeight: 600, color: INK, textDecoration: 'line-through' }}>{fmtDate(activeExtension.payload?.old_date) || '—'}</div>
                  </div>
                  <div>
                    <div style={{ fontSize: 11, color: MUT, fontWeight: 700, marginBottom: 2 }}>Requested Date</div>
                    <div style={{ fontSize: 13, fontWeight: 800, color: P }}>{fmtDate(activeExtension.payload?.new_date)}</div>
                  </div>
                  <div>
                    <div style={{ fontSize: 11, color: MUT, fontWeight: 700, marginBottom: 2 }}>Reply Files</div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                      {activeExtension.payload?.reply_docs?.length ? activeExtension.payload.reply_docs.map(d => <FileChip key={d.id} name={d.file_name} icon="📄" onDownload={() => downloadDoc(d)} onOpen={() => openFile(d)} />) : <Muted>—</Muted>}
                    </div>
                  </div>
                  <div>
                    <div style={{ fontSize: 11, color: MUT, fontWeight: 700, marginBottom: 2 }}>Adjournment</div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                      {activeExtension.payload?.adjourn_docs?.length ? activeExtension.payload.adjourn_docs.map(d => <FileChip key={d.id} name={d.file_name} icon="📎" onDownload={() => downloadDoc(d)} onOpen={() => openFile(d)} />) : <Muted>—</Muted>}
                    </div>
                  </div>
                  <div>
                    <div style={{ fontSize: 11, color: MUT, fontWeight: 700, marginBottom: 2 }}>Acknowledgment</div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                      {activeExtension.payload?.ack_docs?.length ? activeExtension.payload.ack_docs.map(d => <FileChip key={d.id} name={d.file_name} icon="📥" onDownload={() => downloadDoc(d)} onOpen={() => openFile(d)} />) : <Muted>—</Muted>}
                    </div>
                  </div>
                </div>
                {activeExtension.payload?.notes && <div style={{ marginTop: 8, fontSize: 12, color: 'var(--color-slate-600)', background: WH, padding: '6px 10px', borderRadius: 6, fontStyle: 'italic' }}>{activeExtension.payload.notes}</div>}
              </div>
            )}

            {/* 2. APPROVED EXTENSION HISTORY - LISTED BELOW */}
            {extensions.map((ext, i) => (
              <div key={ext.id || i} style={{ padding: 12, background: WH, border: `1px solid ${BRD}`, borderRadius: 'var(--radius-md)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12, borderBottom: `1px solid ${BRD}`, paddingBottom: 8 }}>
                  <div style={{ fontSize: 13, fontWeight: 800, color: INK }}>📅 Extension {extensions.length - i}</div>
                  <div style={{ fontSize: 11, fontWeight: 600, color: GR, background: GL, padding: '2px 8px', borderRadius: 12 }}>
                    ✓ Approved
                  </div>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 12, alignItems: 'start' }}>
                  <div>
                    <div style={{ fontSize: 11, color: MUT, fontWeight: 700, marginBottom: 2 }}>Old Due Date</div>
                    <div style={{ fontSize: 13, fontWeight: 600, color: INK, textDecoration: 'line-through' }}>{fmtDate(ext.old_date) || '—'}</div>
                  </div>
                  <div>
                    <div style={{ fontSize: 11, color: MUT, fontWeight: 700, marginBottom: 2 }}>Extended To</div>
                    <div style={{ fontSize: 13, fontWeight: 800, color: P }}>{fmtDate(ext.extended_due_date)}</div>
                  </div>
                  <div>
                    <div style={{ fontSize: 11, color: MUT, fontWeight: 700, marginBottom: 2 }}>Reply Files</div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                      {ext.reply_docs?.length ? ext.reply_docs.map(d => <FileChip key={d.id} name={d.file_name} icon="📄" onDownload={() => downloadDoc(d)} onOpen={() => openFile(d)} />) : <Muted>—</Muted>}
                    </div>
                  </div>
                  <div>
                    <div style={{ fontSize: 11, color: MUT, fontWeight: 700, marginBottom: 2 }}>Adjournment Notice</div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                      {ext.adjourn_docs?.length ? ext.adjourn_docs.map(d => <FileChip key={d.id} name={d.file_name} icon="📎" onDownload={() => downloadDoc(d)} onOpen={() => openFile(d)} />) : <Muted>—</Muted>}
                    </div>
                  </div>
                  <div>
                    <div style={{ fontSize: 11, color: MUT, fontWeight: 700, marginBottom: 2 }}>Acknowledgment</div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                      {ext.ack_docs?.length ? ext.ack_docs.map(d => <FileChip key={d.id} name={d.file_name} icon="📥" onDownload={() => downloadDoc(d)} onOpen={() => openFile(d)} />) : <Muted>—</Muted>}
                    </div>
                  </div>
                </div>
                {ext.notes && <div style={{ marginTop: 8, fontSize: 12, color: 'var(--color-slate-600)', background: BG, padding: '6px 10px', borderRadius: 6, fontStyle: 'italic' }}>{ext.notes}</div>}
              </div>
            ))}

          </div>
        </>
      )}

      <SectionTitle style={{ marginTop: 24 }}>Notes</SectionTitle>
      <div style={{ padding: '10px 12px', background: 'var(--color-slate-50)', borderLeft: `3px solid ${P}`, borderRadius: 'var(--radius-sm)', fontSize: 12.5, color: INK, whiteSpace: 'pre-wrap' }}>
        {notice.notes || <span style={{ color: MUT, fontStyle: 'italic' }}>No notes added.</span>}
      </div>

      {isMaker && (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 12, paddingTop: 12, marginTop: 'auto', borderTop: `1px solid ${BRD}` }}>
          {hasDrafts && <span style={{ fontSize: 12, color: AMB, fontWeight: 600 }}>You have drafts ready to submit</span>}
          <button className="btn btn-primary" onClick={onSubmitDocs} disabled={!hasDrafts || submitting}>
            {submitting ? 'Submitting…' : '📤 Submit for review'}
          </button>
        </div>
      )}
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════
// MAIN
// ══════════════════════════════════════════════════════════════════
export default function ActivityTimelineV2({ activityCase, subServiceName, canEdit, api: caseApi, onUpdated, caseData }) {
  const { user } = useAuth();
  const [confirm, confirmEl] = useConfirm();

  const [editingSummary, setEditingSummary] = useState(false);
  const [descText, setDescText] = useState(activityCase.job_description || '');
  const [savingSummary, setSavingSummary] = useState(false);
  const [notices, setNotices] = useState([]);
  const [loadingNotices, setLoadingNotices] = useState(true);
  const [details, setDetails] = useState(null);
  const [allReplies, setAllReplies] = useState([]);
  const [uploading, setUploading] = useState(null);
  const [deletingId, setDeletingId] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  const [showAddNotice, setShowAddNotice] = useState(false);
  const [editNotice, setEditNotice] = useState(null);
  const [showCloseCase, setShowCloseCase] = useState(false);
  const [extensionNotice, setExtensionNotice] = useState(null);
  const [showUploadReply, setShowUploadReply] = useState(false);
  const [replyNotice, setReplyNotice] = useState(null);

  // Selected notice survives refresh: ?notice= wins, then sessionStorage.
  const storageKey = `activity_notice_${activityCase?.id || 'none'}`;
  const [selectedId, setSelectedIdState] = useState(() => {
    try {
      const fromUrl = new URLSearchParams(window.location.search).get('notice');
      const stored = fromUrl || sessionStorage.getItem(storageKey);
      return stored ? parseInt(stored, 10) : null;
    } catch { return null; }
  });
  const setSelectedId = useCallback((id) => {
    setSelectedIdState(id);
    try { id ? sessionStorage.setItem(storageKey, String(id)) : sessionStorage.removeItem(storageKey); } catch { /* ignore */ }
  }, [storageKey]);

  const isMaker = isInList(caseData?.makers, user);
  const isChecker = isInList(caseData?.checkers, user);
  const isFounder = user?.role === 'Founder';
  const isCaseClosed = [caseData?.status, caseData?.computed_status, activityCase?.status, activityCase?.computed_status].includes('closed')
    || activityCase?.closure_review_status === 'approved';

  useEffect(() => { setDescText(activityCase.job_description || ''); }, [activityCase.job_description, activityCase.id]);

  const fetchNotices = useCallback(() => {
    if (!activityCase?.id) return;
    setLoadingNotices(true);
    legalApi.notices.list({ court_case: activityCase.id })
      .then((res) => {
        // ✅ SORT DESCENDING (Newest first)
        const data = toList(res).sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0));
        setNotices(data);
        setSelectedIdState((cur) => {
          const next = data.some((n) => n.id === cur) ? cur : data[0]?.id ?? null;
          try { next ? sessionStorage.setItem(storageKey, String(next)) : sessionStorage.removeItem(storageKey); } catch { /* ignore */ }
          return next;
        });
      })
      .catch(() => setNotices([]))
      .finally(() => setLoadingNotices(false));
  }, [activityCase?.id, storageKey]);

  const fetchDetails = useCallback(async () => {
    if (!selectedId) { setDetails(null); setAllReplies([]); return; }
    try {
      const [nRes, rRes] = await Promise.all([legalApi.notices.get(selectedId), legalApi.replies.list({ notice: selectedId })]);
      setDetails(nRes.data);
      setAllReplies(toList(rRes));
    } catch { setDetails(null); setAllReplies([]); }
  }, [selectedId]);

  const [pendingNoticeEdits, setPendingNoticeEdits] = useState([]);
  const [extensionRequests, setExtensionRequests] = useState([]); // ✅ Added state for extensions

  const fetchReviews = useCallback(async () => {
    if (!activityCase?.id) return;
    try {
      const res = await legalApi.reviews.list({ court_case: activityCase.id });
      const allReviews = toList(res);
      setPendingNoticeEdits(allReviews.filter((r) => r.action_type === 'notice_edit' && r.status === 'pending'));
      setExtensionRequests(allReviews.filter((r) => r.action_type === 'extension')); // ✅ Capture all extension reviews
    } catch { 
      setPendingNoticeEdits([]); 
      setExtensionRequests([]); 
    }
  }, [activityCase?.id]);

  useEffect(() => { fetchNotices(); }, [fetchNotices]);
  useEffect(() => { fetchReviews(); }, [fetchReviews]); // ✅ Use fetchReviews instead
  useEffect(() => { fetchDetails(); }, [fetchDetails]);

  // Full refresh (list + details + reviews) — used after submit / delete / etc.
  const refreshNotice = async () => {
    await fetchDetails();
    fetchNotices();
    fetchReviews();
  };

  // Light refresh after extension draft — stay on the SAME notice (like upload reply bundle)
  const refreshCurrentNoticeOnly = async () => {
    await fetchDetails();
    fetchReviews();
    // Soft-update the left list without changing selectedId
    if (!activityCase?.id) return;
    try {
      const res = await legalApi.notices.list({ court_case: activityCase.id });
      const data = toList(res).sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0));
      setNotices(data);
      // Do NOT call setSelectedIdState — keep whatever notice the user is on
    } catch { /* ignore */ }
  };

  const counts = useMemo(() => ({
    wip: notices.filter((n) => n.status === 'wip').length,
    under_review: notices.filter((n) => n.status === 'under_review').length,
    open: notices.filter((n) => n.status === 'open').length,
  }), [notices]);

  const { pendingLabel, hasPendingNoticeEdit } = useMemo(() => {
    if (!details) return { pendingLabel: '', hasPendingNoticeEdit: false };
    const inReview = (s) => ['pending', 'escalated'].includes(s);
    const types = [];
    if (allReplies.some((r) => inReview(r.status)) || (details.documents || []).some((d) => ['pending', 'reply'].includes(d.doc_type) && inReview(d.review_status))) types.push('Reply');
    if ((details.documents || []).some((d) => d.doc_type === 'acknowledgment' && inReview(d.review_status))) types.push('Acknowledgment');
    const editPending = pendingNoticeEdits.some((r) => r.payload?.notice_id === details.id && r.status === 'pending');
    if (editPending) types.push('Info Update');
    const label = types.length ? `${types.length > 1 ? `${types.slice(0, -1).join(', ')} and ${types[types.length - 1]}` : types[0]} Pending` : '';
    return { pendingLabel: label, hasPendingNoticeEdit: editPending };
  }, [details, allReplies, pendingNoticeEdits]);

  // ── Actions ──
  const saveSummary = async () => {
    setSavingSummary(true);
    try {
      const res = await caseApi.setDescription(descText.trim());
      message.success(res?.review_submitted ? 'Summary submitted for checker review' : 'Summary saved');
      if (res) onUpdated(res.data || res);
      setEditingSummary(false);
    } catch (e) {
      message.error(errMsg(e, 'Failed to save summary.'));
    } finally {
      setSavingSummary(false);
    }
  };

  const upload = async (file, docType, extra = {}, busyKey = docType) => {
    setUploading(busyKey);
    try {
      await legalApi.noticeDocs.upload({ notice: selectedId, file, doc_type: docType, ...extra });
      message.success(docType === 'acknowledgment' ? 'Acknowledgment saved as draft' : 'File uploaded');
      await refreshNotice();
    } catch (e) {
      message.error(errMsg(e, 'Failed to upload'));
    } finally {
      setUploading(null);
    }
  };

  const deleteDoc = async (docId) => {
    if (!(await confirm({ title: 'Delete this file?', message: 'This cannot be undone.', confirmLabel: 'Delete', danger: true }))) return;
    setDeletingId(docId);
    try {
      await legalApi.noticeDocs.remove(docId);
      message.success('File deleted');
      await refreshNotice();
    } catch (e) {
      message.error(errMsg(e, 'Failed to delete'));
    } finally {
      setDeletingId(null);
    }
  };

  const deleteReply = async (reply) => {
    if (!(await confirm({ title: `Delete "${reply.title || 'Untitled'}"?`, message: 'This cannot be undone.', confirmLabel: 'Delete', danger: true }))) return;
    setDeletingId(`reply-${reply.id}`);
    try {
      await legalApi.replies.remove(reply.id);
      message.success('Reply deleted');
      await refreshNotice();
    } catch {
      message.error('Cannot delete');
    } finally {
      setDeletingId(null);
    }
  };

  const submitDocs = async () => {
    if (!selectedId) return;
    setSubmitting(true);
    try {
      for (const r of allReplies.filter((x) => x.status === 'draft' || x.status === 'rejected')) {
        try { await legalApi.replies.sendForReview(r.id); } catch { /* keep going */ }
      }
      await legalApi.notices.submitDocs(selectedId);
      message.success('All drafts sent for checker review');
      await refreshNotice();
      onUpdated?.();
    } catch (e) {
      message.error(errMsg(e, 'Failed to submit'));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div>
      {/* Case header + summary */}
      <div className="card" style={{ padding: '12px 16px', marginBottom: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flex: 1, minWidth: 200 }}>
            <h2 style={{ margin: 0, fontSize: 15, fontWeight: 800, color: INK }}>{subServiceName || activityCase.case_title || 'Untitled Case'}</h2>
            {canEdit && !editingSummary && (
              <button className="icon-btn" title="Edit summary" style={{ width: 24, height: 24, fontSize: 12 }}
                onClick={() => { setDescText(activityCase.job_description || ''); setEditingSummary(true); }}>✎</button>
            )}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
            <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--color-slate-600)' }}>{notices.length} notice{notices.length !== 1 ? 's' : ''}</span>
            {notices.length > 0 && ['wip', 'under_review', 'open'].map((s) => (
              <span key={s} style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 11, fontWeight: 600, color: counts[s] ? INK : MUT }}>
                <span style={{ width: 7, height: 7, borderRadius: '50%', background: counts[s] ? CASE_STATUS[s].color : BRD }} />
                {CASE_STATUS[s].label} <b>{counts[s]}</b>
              </span>
            ))}
            <button className="btn btn-secondary" style={{ padding: '4px 12px', color: isCaseClosed ? GR : AMB }} onClick={() => setShowCloseCase(true)}>
              {isCaseClosed ? '✅ Case closed' : '🔒 Close case'}
            </button>
            {isMaker && !isCaseClosed && <button className="btn btn-primary" style={{ padding: '4px 12px' }} onClick={() => setShowAddNotice(true)}>+ Add notice</button>}
          </div>
        </div>

        {editingSummary && canEdit ? (
          <div style={{ marginTop: 8 }}>
            <Input.TextArea autoFocus rows={2} value={descText} onChange={(e) => setDescText(e.target.value)} placeholder="Add a case summary…" />
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 6, marginTop: 6 }}>
              <button className="btn btn-secondary" onClick={() => setEditingSummary(false)}>Cancel</button>
              <button className="btn btn-primary" onClick={saveSummary} disabled={savingSummary}>{savingSummary ? 'Saving…' : 'Save'}</button>
            </div>
          </div>
        ) : activityCase.job_description ? (
          <div style={{ marginTop: 6, fontSize: 12.5, color: 'var(--color-slate-600)', whiteSpace: 'pre-wrap' }}>{activityCase.job_description}</div>
        ) : null}
      </div>

      {/* Notice list + selected notice */}
      <div style={{ display: 'flex', gap: 12, minHeight: 500 }}>
        <div className="card" style={{ width: 260, flexShrink: 0, padding: 0, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
          <div style={{ padding: '8px 12px', borderBottom: `1px solid ${BRD}`, background: 'var(--color-slate-100)', fontSize: 11, fontWeight: 700, color: 'var(--color-slate-600)', textTransform: 'uppercase' }}>
            Notices
          </div>
          <div style={{ flex: 1, overflowY: 'auto' }}>
            {loadingNotices ? <div style={{ padding: 24, textAlign: 'center', fontSize: 12, color: MUT }}>Loading…</div>
              : notices.length === 0 ? <EmptyState compact icon="🔔" text="No notices yet" />
              : notices.map((n) => <SidebarNoticeRow key={n.id} notice={n} selected={selectedId === n.id} onClick={() => setSelectedId(n.id)} />)}
          </div>
        </div>
        <div className="card" style={{ flex: 1, minWidth: 0, padding: 0, overflow: 'auto' }}>
          <NoticeDetailView
            notice={details}
            allReplies={allReplies}
            extensionRequests={extensionRequests} 
            isMaker={isMaker}
            isCaseClosed={isCaseClosed}
            activityCase={activityCase}
            pendingLabel={pendingLabel}
            hasPendingNoticeEdit={hasPendingNoticeEdit}
            uploading={uploading}
            deletingId={deletingId}
            submitting={submitting}
            onEdit={() => setEditNotice(details)}
            onReply={() => setReplyNotice(details)}
            onUploadReplyClick={() => setShowUploadReply(true)}
            onUpload={(f, type) => upload(f, type)}
            onUploadSupport={(f, mainId) => upload(f, 'pending_support', { reply_version: mainId }, `support-${mainId}`)}
            onDeleteDoc={deleteDoc}
            onDeleteReply={deleteReply}
            onSubmitDocs={submitDocs}
            onAddExtension={(extToEdit) => setExtensionNotice(extToEdit ? { ...details, extToEdit } : details)}
          />
        </div>
      </div>

      {showAddNotice && (
        <AddNoticeModal courtCaseId={activityCase.id} onClose={() => setShowAddNotice(false)}
          onCreated={() => { setShowAddNotice(false); fetchNotices(); onUpdated?.(); }} />
      )}
      {editNotice && (
        <AddNoticeModal courtCaseId={activityCase.id} editNotice={editNotice} submitForReview={isMaker && !isFounder}
          onClose={() => setEditNotice(null)}
          onCreated={() => { setEditNotice(null); fetchNotices(); fetchDetails(); fetchReviews(); }} />
      )}
      {extensionNotice && (
        <AddExtensionModal
          notice={extensionNotice}
          extToEdit={extensionNotice.extToEdit}
          onClose={() => setExtensionNotice(null)}
          onSuccess={() => {
            setExtensionNotice(null);
            refreshCurrentNoticeOnly();
          }}
        />
      )}
      {showCloseCase && (
        <CloseCaseModal courtCaseId={activityCase.id} canEdit={isMaker && !isCaseClosed}
          onClose={() => setShowCloseCase(false)} onUpdated={() => { onUpdated?.(); fetchNotices(); }} />
      )}
      {showUploadReply && details && (
        <UploadReplyBundleModal noticeId={details.id} onClose={() => setShowUploadReply(false)}
          onSuccess={() => { setShowUploadReply(false); refreshNotice(); }} />
      )}
      {replyNotice && (
        <ReplyEditorModal
          noticeId={replyNotice.id}
          notice={replyNotice}
          replyId={null}
          mode="edit"
          currentUserId={user?.id}
          isAssignedMaker={isMaker}
          isAssignedChecker={isChecker}
          isCeoRole={isFounder}
          onClose={() => setReplyNotice(null)}
          onSaved={(data, action) => {
            // Saving/sending keeps the editor open; only final checker actions close it.
            refreshNotice();
            if (['approve', 'reject', 'reopen'].includes(action)) onUpdated?.();
            if (['approve', 'reject'].includes(action)) setReplyNotice(null);
          }}
        />
      )}
      {confirmEl}
    </div>
  );
}
