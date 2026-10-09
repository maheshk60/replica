// // ReviewTabV2.js — Review tab: active checker reviews (cards) + completed
// // history (shared Table; click a row for details).

// import React, { useState, useEffect, useCallback, useMemo } from 'react';
// import { Select } from 'antd';
// import { useAuth } from '../../contexts/AuthContext';
// import { RejectModal, AcceptModal, NoticeDetailModal } from './LegalModals';
// import ReplyEditorModal from './ReplyEditorModal';
// import {
//   Modal, Table, P, PL, MUT, INK, GR, RED, REDL, PUR, BRD,
//   REVIEW_STATUS, CLOSURE_DOC_TYPES, StatusPill, FileChip, EmptyState, ErrorBanner, Segmented, SectionTitle,
//   legalApi, toList, isInList, fmtDateTime, fmtRelativeTime, openFile, downloadDoc,fmtDate
// } from './legalCommon';

// const ACTION_META = {
//   summary:     { label: 'Case Summary Update', icon: '📝' },
//   notice_edit: { label: 'Notice Info Update',  icon: '✎' },
//   extension:   { label: 'Due Date Extension',  icon: '📅' },
//   notice:      { label: 'Notice Review',       icon: '📋' },
//   reply:       { label: 'Reply (Editor)',      icon: '📄' },
//   uploaded_reply_bundle: { label: 'Uploaded Reply', icon: '📄' },
//   ack:         { label: 'Acknowledgment',      icon: '📥' },
//   closure:     { label: 'Case Closure Request', icon: '🔒' },
// };

// const TYPE_FILTERS = [
//   { key: 'all', label: 'All types', match: () => true },
//   { key: 'notice_edit', label: 'Notice info', match: (r) => r.type === 'notice_edit' },
//   { key: 'extension', label: 'Extensions', match: (r) => r.type === 'extension' },
//   { key: 'reply', label: 'Reply', match: (r) => r.type === 'reply' || r.type === 'uploaded_reply_bundle' },
//   { key: 'ack', label: 'Acknowledgment', match: (r) => r.type === 'ack' },
//   { key: 'summary', label: 'Summary', match: (r) => r.type === 'summary' },
//   { key: 'closure', label: 'Closure', match: (r) => r.type === 'closure' },
// ];

// const itemTitle = (item) => ({
//   reply: `Reply — ${item.title || 'Untitled'}`,
//   uploaded_reply_bundle: `Uploaded Reply — ${item.file_name}`,
//   ack: `Acknowledgment — ${item.file_name}`,
//   notice_edit: `Notice Info — DIN ${item.payload?.notice_din || '—'}`,
//   notice: `Notice — DIN ${item.din_number || '—'}`,
// }[item.type] || ACTION_META[item.type]?.label);

// // ══════════════════════════════════════════════════════════════════
// // Item body — shared by active cards and the history detail modal
// // ══════════════════════════════════════════════════════════════════
// function Box({ label, children }) {
//   return (
//     <div style={{ padding: '10px 12px', background: 'var(--color-slate-50)', border: `1px solid ${BRD}`, borderRadius: 'var(--radius-md)' }}>
//       {label && <div style={{ fontSize: 11, fontWeight: 700, color: MUT, marginBottom: 6 }}>{label}</div>}
//       {children}
//     </div>
//   );
// }

// function FieldDiff({ fields, oldValues, newValues }) {
//   const fmt = (v) => (v === null || v === undefined || v === '' ? '—' : String(v));
//   return (
//     <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
//       {fields.map((f) => (
//         <div key={f} style={{ display: 'flex', gap: 8, fontSize: 12 }}>
//           <span style={{ minWidth: 110, fontWeight: 600, color: MUT }}>{f.replace(/_/g, ' ')}</span>
//           <span style={{ color: RED, textDecoration: 'line-through' }}>{fmt(oldValues?.[f])}</span>
//           <span style={{ color: MUT }}>→</span>
//           <span style={{ color: GR, fontWeight: 700 }}>{fmt(newValues?.[f])}</span>
//         </div>
//       ))}
//     </div>
//   );
// }

// function ItemBody({ item }) {
//   if (item.type === 'summary') {
//     return <Box label="Summary text"><div style={{ fontSize: 13, color: INK, whiteSpace: 'pre-wrap' }}>{item.payload?.description || '(empty)'}</div></Box>;
//   }
//   if (item.type === 'notice_edit') {
//     return <Box label="Changes requested"><FieldDiff fields={item.payload?.changed_fields || []} oldValues={item.payload?.old_values} newValues={item.payload?.new_values} /></Box>;
//   }
//   if (item.type === 'uploaded_reply_bundle') {
//     return (
//       <Box>
//         <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
//           <div>
//             <div style={{ fontSize: 11, fontWeight: 700, color: MUT, marginBottom: 6 }}>Main reply</div>
//             <FileChip name={item.file_name} onOpen={() => openFile(item.file_url)} onDownload={() => downloadDoc(item)} />
//           </div>
//           <div>
//             <div style={{ fontSize: 11, fontWeight: 700, color: MUT, marginBottom: 6 }}>Supporting docs ({item.support_docs?.length || 0})</div>
//             <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
//               {item.support_docs?.length ? item.support_docs.map((sd) => (
//                 <FileChip key={sd.id} name={sd.file_name} icon="📎" onOpen={() => openFile(sd)} onDownload={() => downloadDoc(sd)} />
//               )) : <span style={{ fontSize: 12, color: MUT, fontStyle: 'italic' }}>None</span>}
//             </div>
//           </div>
//         </div>
//       </Box>
//     );
//   }
//   if (item.type === 'ack') {
//     return <FileChip name={item.file_name} icon="📥" onOpen={() => openFile(item.file_url)} onDownload={() => downloadDoc(item)} width={340} />;
//   }
//   if (item.type === 'closure') {
//     return (
//       <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 10 }}>
//         {CLOSURE_DOC_TYPES.map((t) => {
//           const doc = item.closure_documents?.find((d) => d.doc_type === t.key);
//           return doc && (
//             <div key={t.key}>
//               <div style={{ fontSize: 11, fontWeight: 700, color: MUT, marginBottom: 4 }}>{t.label}</div>
//               <FileChip name={doc.file_name} onOpen={() => openFile(doc)} onDownload={() => downloadDoc(doc)} />
//             </div>
//           );
//         })}
//       </div>
//     );
//   }

//   if (item.type === 'extension') {
//     return (
//       <Box label="Extension Request">
//         <div style={{ display: 'flex', gap: 16, marginBottom: 12 }}>
//           <div><span style={{ fontSize: 11, color: MUT }}>Old Due Date:</span> <span style={{ fontSize: 13, textDecoration: 'line-through', color: RED, fontWeight: 600 }}>{fmtDate(item.payload?.old_date) || '—'}</span></div>
//           <div><span style={{ fontSize: 11, color: MUT }}>Extended To:</span> <span style={{ fontSize: 13, fontWeight: 800, color: P }}>{fmtDate(item.payload?.new_date)}</span></div>
//         </div>
//         {item.payload?.notes && <div style={{ fontSize: 12, color: INK, fontStyle: 'italic', marginBottom: 12 }}>"{item.payload.notes}"</div>}
//         <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
//           <div>
//             <div style={{ fontSize: 11, fontWeight: 700, color: MUT, marginBottom: 6 }}>Reply Files ({item.payload?.reply_docs?.length || 0})</div>
//             <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
//               {item.payload?.reply_docs?.map((d) => <FileChip key={d.id} name={d.file_name} icon="📄" onOpen={() => openFile(d)} onDownload={() => downloadDoc(d)} />)}
//             </div>
//           </div>
//           <div>
//             <div style={{ fontSize: 11, fontWeight: 700, color: MUT, marginBottom: 6 }}>Ack Files ({item.payload?.ack_docs?.length || 0})</div>
//             <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
//               {item.payload?.ack_docs?.map((d) => <FileChip key={d.id} name={d.file_name} icon="📥" onOpen={() => openFile(d)} onDownload={() => downloadDoc(d)} />)}
//             </div>
//           </div>
//         </div>
//       </Box>
//     );
//   }



//   return null;
// }

// function RejectionNote({ item }) {
//   if (item.status !== 'rejected' || !item.review_note) return null;
//   return (
//     <div style={{ marginTop: 10, padding: '8px 12px', background: REDL, border: '1px solid #FECACA', borderRadius: 'var(--radius-md)', fontSize: 12, color: RED }}>
//       <b>Rejection reason:</b> {item.review_note}
//     </div>
//   );
// }

// // One card for every kind of active review.
// function ReviewCard({ item, busy, canDecide, onApprove, onReject, openLabel, onOpen, approveLabel = '✓ Approve' }) {
//   const meta = ACTION_META[item.type];
//   const accent = item.status === 'escalated' ? PUR : P;
//   return (
//     <div className="card" style={{ padding: 14, borderLeft: `4px solid ${accent}` }}>
//       <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
//         <div style={{ width: 32, height: 32, borderRadius: 'var(--radius-md)', background: PL, color: P, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 15, flexShrink: 0 }}>
//           {meta.icon}
//         </div>
//         <div style={{ flex: 1, minWidth: 0 }}>
//           <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
//             <span style={{ fontSize: 13, fontWeight: 700, color: INK }}>{meta.label}</span>
//             {item.notice?.din_number && <span className="tag-chip mono">DIN {item.notice.din_number}</span>}
//             <StatusPill status={item.status} map={REVIEW_STATUS} />
//           </div>
//           <div style={{ fontSize: 11.5, color: MUT, marginTop: 2 }}>
//             Submitted by <b style={{ color: 'var(--color-slate-600)' }}>{item.submitted_by_name || 'Unknown'}</b>
//             {item.submitted_at && ` · ${fmtDateTime(item.submitted_at)}`}
//           </div>
//         </div>
//         {onOpen && <button className="btn btn-primary" onClick={onOpen}>{openLabel}</button>}
//       </div>

//       <ItemBody item={item} />
//       <RejectionNote item={item} />

//       {canDecide && (
//         <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 10 }}>
//           <button className="btn btn-secondary" style={{ color: RED }} onClick={onReject} disabled={busy}>Reject</button>
//           <button className="btn btn-primary" onClick={onApprove} disabled={busy}>{busy ? 'Working…' : approveLabel}</button>
//         </div>
//       )}
//     </div>
//   );
// }

// // ══════════════════════════════════════════════════════════════════
// // MAIN
// // ══════════════════════════════════════════════════════════════════
// export default function ReviewTabV2({ courtCaseId, refreshTick, caseData, onUpdated }) {
//   const { user } = useAuth();

//   const [data, setData] = useState({ reviews: [], notices: [], replies: [], closureCase: null });
//   const [loading, setLoading] = useState(true);
//   const [error, setError] = useState(null);
//   const [busyId, setBusyId] = useState(null);

//   const [rejectTarget, setRejectTarget] = useState(null);
//   const [acceptTarget, setAcceptTarget] = useState(null);
//   const [noticeId, setNoticeId] = useState(null);
//   const [replyModal, setReplyModal] = useState(null);
//   const [historyItem, setHistoryItem] = useState(null);
//   const [historyStatus, setHistoryStatus] = useState('all');
//   const [historyType, setHistoryType] = useState('all');

//   const isFounder = user?.role === 'Founder';
//   const isHighAdmin = ['Admin', 'Founder'].includes(user?.role);
//   const isMaker = isInList(caseData?.makers, user);
//   const isChecker = isInList(caseData?.checkers, user);

//   const load = useCallback(async () => {
//     if (!courtCaseId) return;
//     setLoading(true); setError(null);
//     try {
//       const [rRes, nRes, cRes] = await Promise.all([
//         legalApi.reviews.list({ court_case: courtCaseId }),
//         legalApi.notices.list({ court_case: courtCaseId }),
//         legalApi.courtCases.get(courtCaseId),
//       ]);
//       const notices = toList(nRes);
//       const replyLists = await Promise.all(notices.map((n) =>
//         legalApi.replies.list({ notice: n.id }).then((r) => toList(r).map((x) => ({ ...x, notice: n }))).catch(() => [])
//       ));
//       setData({
//         reviews: toList(rRes).filter((r) => r.action_type === 'summary' || r.action_type === 'notice_edit'),
//         notices,
//         replies: replyLists.flat().filter((r) => r.status !== 'draft'),
//         closureCase: cRes.data,
//       });
//     } catch {
//       setError('Failed to load reviews.');
//     } finally {
//       setLoading(false);
//     }
//   }, [courtCaseId]);

//   useEffect(() => { load(); }, [load, refreshTick]);

//   // ── Normalise every reviewable thing into one item shape ──
//   const allItems = useMemo(() => {
//     const { reviews, notices, replies, closureCase } = data;
//     const items = [];

//     reviews.forEach((r) => items.push({
//       ...r, type: r.action_type, key: `${r.action_type}-${r.id}`, _sortDate: r.reviewed_at || r.submitted_at,
//     }));

//     notices.filter((n) => n.review_status && n.review_status !== 'not_applicable').forEach((n) => items.push({
//       type: 'notice', key: `notice-${n.id}`, id: n.id, notice_id: n.id, din_number: n.din_number,
//       status: n.review_status === 'accepted' ? 'approved' : n.review_status,
//       submitted_by_name: n.created_by_name, submitted_at: n.updated_at, reviewed_by_name: n.reviewed_by_name,
//       _sortDate: n.reviewed_at || n.updated_at,
//     }));

//     replies.forEach((r) => items.push({
//       type: 'reply', key: `reply-${r.id}`, id: r.id, reply_id: r.id, notice_id: r.notice?.id, notice: r.notice,
//       status: r.status, title: r.title, submitted_by_name: r.created_by_name, submitted_at: r.updated_at,
//       review_note: r.review_note, reviewed_by_name: r.reviewed_by_name, _sortDate: r.reviewed_at || r.updated_at,
//     }));

//     // Documents only appear once the maker has submitted them.
//     const submitted = ['pending', 'escalated', 'approved', 'rejected'];
//     notices.forEach((n) => {
//       const docs = (n.documents || []).filter((d) => submitted.includes(d.review_status));
//       const supports = docs.filter((d) => ['pending_support', 'supporting_doc'].includes(d.doc_type));
//       docs.forEach((d) => {
//         const base = {
//           id: d.id, notice_id: n.id, notice: n, status: d.review_status, file_name: d.file_name, file_url: d.file_url,
//           uploaded_by: d.uploaded_by, submitted_by_name: d.uploaded_by_name, submitted_at: d.uploaded_at,
//           review_note: d.review_note, reviewed_by_name: d.reviewed_by_name, _sortDate: d.reviewed_at || d.uploaded_at,
//         };
//         if (d.doc_type === 'acknowledgment') items.push({ ...base, type: 'ack', key: `ack-${d.id}` });
//         if (d.doc_type === 'pending' || d.doc_type === 'reply') {
//           items.push({ ...base, type: 'uploaded_reply_bundle', key: `up-${d.id}`, support_docs: supports.filter((s) => String(s.reply_version) === String(d.id)) });
//         }
//       });
//     });

//     if (closureCase && submitted.includes(closureCase.closure_review_status)) {
//       items.push({
//         type: 'closure', key: `closure-${closureCase.id}`, id: closureCase.id, status: closureCase.closure_review_status,
//         closure_documents: closureCase.closure_documents || [], submitted_by_id: closureCase.closure_submitted_by,
//         submitted_by_name: closureCase.closure_submitted_by_name, submitted_at: closureCase.closure_submitted_at,
//         review_note: closureCase.closure_review_note, reviewed_by_name: closureCase.closure_reviewed_by_name,
//         _sortDate: closureCase.closure_reviewed_at || closureCase.closure_submitted_at,
//       });
//     }

//     return items.sort((a, b) => new Date(b._sortDate) - new Date(a._sortDate));
//   }, [data]);

//   const activeItems = allItems.filter((i) => i.status === 'pending' || i.status === 'escalated');
//   const historyItems = allItems.filter((i) => i.status !== 'pending' && i.status !== 'escalated');
//   const typeFilter = TYPE_FILTERS.find((t) => t.key === historyType);
//   const visibleHistory = historyItems.filter((i) => (historyStatus === 'all' || i.status === historyStatus) && typeFilter.match(i));

//   // ── Permissions (unchanged rules) ──
//   // Pending items: assigned checker (or admin via viewer_role). Escalated: CEO / admin.
//   // The CEO can't act on pending items unless they're the assigned checker.
//   const canDecide = (item) => {
//     if (item.type === 'summary' || item.type === 'notice_edit') {
//       if (item.viewer_role === 'submitter') return false;
//       if (item.status === 'escalated') return isHighAdmin;
//       if (item.status === 'pending') return (!isFounder || item.viewer_role === 'checker') && ['admin', 'checker'].includes(item.viewer_role);
//       return false;
//     }
//     if (item.type === 'closure' ? item.submitted_by_id === user?.id : item.uploaded_by === user?.id) return false;
//     if (item.status === 'escalated') return isFounder;
//     if (item.status === 'pending') return isChecker;
//     return false;
//   };

//   const replyAccess = (item) => {
//     const isCeo = user?.role === 'Founder' || user?.role === 'Admin';
//     if (item.notice?.created_by === user?.id && item.status === 'pending') return null;
//     if (item.status === 'pending') return (isChecker || isCeo) ? 'Review reply →' : null;
//     if (item.status === 'escalated') return isCeo ? 'Review reply →' : null;
//     return (isMaker || isChecker || isCeo) ? 'View reply →' : null;
//   };

//   // ── Decisions ──
//   const startApprove = (item) => {
//     // Escalated summary/notice edits are approved directly by the CEO.
//     if ((item.type === 'summary' || item.type === 'notice_edit') && item.status === 'escalated') {
//       setBusyId(item.key);
//       legalApi.reviews.approve(item.id).then(() => { load(); onUpdated?.(); })
//         .catch((e) => setError(e?.response?.data?.error || 'Failed to approve.'))
//         .finally(() => setBusyId(null));
//       return;
//     }
//     setAcceptTarget(item);
//   };

//   const doAccept = async (moveToCeo) => {
//     const t = acceptTarget;
//     setBusyId(t.key);
//     try {
//       if (t.type === 'closure') await (moveToCeo ? legalApi.courtCases.closureEscalate(t.id) : legalApi.courtCases.closureApprove(t.id));
//       else if (t.type === 'ack' || t.type === 'uploaded_reply_bundle') await (moveToCeo ? legalApi.noticeDocs.escalate(t.id) : legalApi.noticeDocs.approve(t.id));
//       else await (moveToCeo ? legalApi.reviews.escalate(t.id) : legalApi.reviews.approve(t.id));
//       setAcceptTarget(null);
//       await load();
//       onUpdated?.();
//     } finally {
//       setBusyId(null);
//     }
//   };

//   const doReject = async (reason) => {
//     const t = rejectTarget;
//     setBusyId(t.key);
//     try {
//       if (t.type === 'closure') await legalApi.courtCases.closureReject(t.id, reason);
//       else if (t.type === 'ack' || t.type === 'uploaded_reply_bundle') await legalApi.noticeDocs.reject(t.id, reason);
//       else await legalApi.reviews.reject(t.id, reason);
//       setRejectTarget(null);
//       await load();
//       onUpdated?.();
//     } finally {
//       setBusyId(null);
//     }
//   };

//   const openReply = (item) => setReplyModal({ noticeId: item.notice_id, notice: item.notice, replyId: item.reply_id });

//   const renderActive = (item) => {
//     if (item.type === 'notice') {
//       return <ReviewCard key={item.key} item={item} openLabel="View notice →" onOpen={() => setNoticeId(item.notice_id)} />;
//     }
//     if (item.type === 'reply') {
//       const label = replyAccess(item);
//       return <ReviewCard key={item.key} item={item} openLabel={label} onOpen={label ? () => openReply(item) : null} />;
//     }
//     return (
//       <ReviewCard
//         key={item.key} item={item} busy={busyId === item.key} canDecide={canDecide(item)}
//         approveLabel={item.type === 'closure' ? '✓ Approve & close' : '✓ Approve'}
//         onApprove={() => startApprove(item)} onReject={() => setRejectTarget(item)}
//       />
//     );
//   };

//   const historyColumns = [
//     {
//       key: 'title', label: 'Item', align: 'left', width: 360, sortable: true, sortFn: (a, b) => itemTitle(a).localeCompare(itemTitle(b)),
//       render: (i) => <span>{ACTION_META[i.type]?.icon} {itemTitle(i)}</span>,
//     },
//     { key: 'by', label: 'Reviewed by', align: 'left', render: (i) => i.reviewed_by_name || i.submitted_by_name || '—' },
//     { key: 'when', label: 'When', sortable: true, sortFn: (a, b) => new Date(a._sortDate) - new Date(b._sortDate), render: (i) => fmtRelativeTime(i._sortDate) },
//     { key: 'status', label: 'Status', sortable: true, render: (i) => <StatusPill status={i.status} map={REVIEW_STATUS} /> },
//   ];

//   if (loading) return <EmptyState icon="⏳" text="Loading reviews…" />;

//   return (
//     <div>
//       <ErrorBanner>{error}</ErrorBanner>

//       <SectionTitle style={{ marginTop: 0 }}>Active reviews ({activeItems.length})</SectionTitle>
//       {activeItems.length === 0 ? (
//         <EmptyState icon="📋" text="No active reviews pending.">
//           <div style={{ fontSize: 12, marginTop: 4 }}>Completed items are listed in History below.</div>
//         </EmptyState>
//       ) : (
//         <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>{activeItems.map(renderActive)}</div>
//       )}

//       <SectionTitle style={{ marginTop: 28 }}>History ({historyItems.length})</SectionTitle>
//       <div className="filter-bar">
//         <Segmented value={historyStatus} onChange={setHistoryStatus} options={[
//           { key: 'all', label: `All (${historyItems.length})` },
//           { key: 'approved', label: `Approved (${historyItems.filter((i) => i.status === 'approved').length})` },
//           { key: 'rejected', label: `Rejected (${historyItems.filter((i) => i.status === 'rejected').length})` },
//         ]} />
//         <div className="filter-field">
//           <Select value={historyType} onChange={setHistoryType}
//             options={TYPE_FILTERS.map((t) => ({ value: t.key, label: `${t.label} (${historyItems.filter(t.match).length})` }))} />
//         </div>
//       </div>
//       <Table
//         columns={historyColumns}
//         rows={visibleHistory}
//         getRowId={(i) => i.key}
//         onRowClick={setHistoryItem}
//         emptyMessage="No completed items match this filter."
//         pageSize={10}
//       />

//       {historyItem && (
//         <Modal
//           isOpen size="lg" icon={ACTION_META[historyItem.type]?.icon}
//           title={itemTitle(historyItem)}
//           subtitle={`${historyItem.status === 'approved' ? 'Approved' : historyItem.status === 'rejected' ? 'Rejected' : 'Reviewed'} by ${historyItem.reviewed_by_name || 'Unknown'} · ${fmtDateTime(historyItem._sortDate)}`}
//           onClose={() => setHistoryItem(null)}
//           footer={
//             <>
//               {historyItem.type === 'reply' && replyAccess(historyItem) && (
//                 <button className="btn btn-secondary" onClick={() => { openReply(historyItem); setHistoryItem(null); }}>Open reply editor</button>
//               )}
//               {historyItem.type === 'notice' && (
//                 <button className="btn btn-secondary" onClick={() => { setNoticeId(historyItem.notice_id); setHistoryItem(null); }}>View notice</button>
//               )}
//               <button className="btn btn-primary" onClick={() => setHistoryItem(null)}>Close</button>
//             </>
//           }
//         >
//           <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
//             <StatusPill status={historyItem.status} map={REVIEW_STATUS} />
//             <span style={{ fontSize: 12, color: MUT }}>Submitted by <b>{historyItem.submitted_by_name || 'Unknown'}</b></span>
//           </div>
//           <ItemBody item={historyItem} />
//           <RejectionNote item={historyItem} />
//         </Modal>
//       )}

//       {rejectTarget && <RejectModal onClose={() => setRejectTarget(null)} onRejected={doReject} />}
//       {acceptTarget && <AcceptModal onClose={() => setAcceptTarget(null)} onAccepted={doAccept} showEscalate={!isFounder} />}
//       {noticeId && (
//         <NoticeDetailModal noticeId={noticeId} canEdit={false} onClose={() => setNoticeId(null)}
//           onUpdated={() => { load(); onUpdated?.(); }} />
//       )}
//       {replyModal && (
//         <ReplyEditorModal
//           noticeId={replyModal.noticeId} notice={replyModal.notice} replyId={replyModal.replyId} mode="review"
//           currentUserId={user?.id} isAssignedMaker={isMaker} isAssignedChecker={isChecker} isCeoRole={isFounder}
//           onClose={() => setReplyModal(null)}
//           onSaved={() => { setReplyModal(null); load(); onUpdated?.(); }}
//         />
//       )}
//     </div>
//   );
// }






















// ReviewTabV2.js — Review tab: active checker reviews (cards) + completed
// history (shared Table; click a row for details).

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Select } from 'antd';
import { useAuth } from '../../contexts/AuthContext';
import { RejectModal, AcceptModal, NoticeDetailModal } from './LegalModals';
import ReplyEditorModal from './ReplyEditorModal';
import {
  Modal, Table, P, PL, MUT, INK, GR, RED, REDL, PUR, BRD,
  REVIEW_STATUS, CLOSURE_DOC_TYPES, StatusPill, FileChip, EmptyState, ErrorBanner, Segmented, SectionTitle,
  legalApi, toList, isInList, fmtDateTime, fmtRelativeTime, openFile, downloadDoc, fmtDate
} from './legalCommon';

const ACTION_META = {
  summary:     { label: 'Case Summary Update', icon: '📝' },
  notice_edit: { label: 'Notice Info Update',  icon: '✎' },
  extension:   { label: 'Due Date Extension',  icon: '📅' },
  notice:      { label: 'Notice Review',       icon: '📋' },
  reply:       { label: 'Reply (Editor)',      icon: '📄' },
  uploaded_reply_bundle: { label: 'Uploaded Reply', icon: '📄' },
  ack:         { label: 'Acknowledgment',      icon: '📥' },
  closure:     { label: 'Case Closure Request', icon: '🔒' },
};

const TYPE_FILTERS = [
  { key: 'all', label: 'All types', match: () => true },
  { key: 'notice_edit', label: 'Notice info', match: (r) => r.type === 'notice_edit' },
  { key: 'extension', label: 'Extensions', match: (r) => r.type === 'extension' },
  { key: 'reply', label: 'Reply', match: (r) => r.type === 'reply' || r.type === 'uploaded_reply_bundle' },
  { key: 'ack', label: 'Acknowledgment', match: (r) => r.type === 'ack' },
  { key: 'summary', label: 'Summary', match: (r) => r.type === 'summary' },
  { key: 'closure', label: 'Closure', match: (r) => r.type === 'closure' },
];

const itemTitle = (item) => ({
  reply: `Reply — ${item.title || 'Untitled'}`,
  uploaded_reply_bundle: `Uploaded Reply — ${item.file_name}`,
  ack: `Acknowledgment — ${item.file_name}`,
  notice_edit: `Notice Info — DIN ${item.payload?.notice_din || '—'}`,
  extension: `Extension — DIN ${item.payload?.notice_din || '—'}`,
  notice: `Notice — DIN ${item.din_number || '—'}`,
}[item.type] || ACTION_META[item.type]?.label);

function Box({ label, children }) {
  return (
    <div style={{ padding: '10px 12px', background: 'var(--color-slate-50)', border: `1px solid ${BRD}`, borderRadius: 'var(--radius-md)' }}>
      {label && <div style={{ fontSize: 11, fontWeight: 700, color: MUT, marginBottom: 6 }}>{label}</div>}
      {children}
    </div>
  );
}

function FieldDiff({ fields, oldValues, newValues }) {
  const fmt = (v) => (v === null || v === undefined || v === '' ? '—' : String(v));
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
      {fields.map((f) => (
        <div key={f} style={{ display: 'flex', gap: 8, fontSize: 12 }}>
          <span style={{ minWidth: 110, fontWeight: 600, color: MUT }}>{f.replace(/_/g, ' ')}</span>
          <span style={{ color: RED, textDecoration: 'line-through' }}>{fmt(oldValues?.[f])}</span>
          <span style={{ color: MUT }}>→</span>
          <span style={{ color: GR, fontWeight: 700 }}>{fmt(newValues?.[f])}</span>
        </div>
      ))}
    </div>
  );
}

function ItemBody({ item }) {
  if (item.type === 'summary') {
    return <Box label="Summary text"><div style={{ fontSize: 13, color: INK, whiteSpace: 'pre-wrap' }}>{item.payload?.description || '(empty)'}</div></Box>;
  }
  if (item.type === 'notice_edit') {
    return <Box label="Changes requested"><FieldDiff fields={item.payload?.changed_fields || []} oldValues={item.payload?.old_values} newValues={item.payload?.new_values} /></Box>;
  }
  if (item.type === 'uploaded_reply_bundle') {
    return (
      <Box>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <div>
            <div style={{ fontSize: 11, fontWeight: 700, color: MUT, marginBottom: 6 }}>Main reply</div>
            <FileChip name={item.file_name} onOpen={() => openFile(item.file_url)} onDownload={() => downloadDoc(item)} />
          </div>
          <div>
            <div style={{ fontSize: 11, fontWeight: 700, color: MUT, marginBottom: 6 }}>Supporting docs ({item.support_docs?.length || 0})</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              {item.support_docs?.length ? item.support_docs.map((sd) => (
                <FileChip key={sd.id} name={sd.file_name} icon="📎" onOpen={() => openFile(sd)} onDownload={() => downloadDoc(sd)} />
              )) : <span style={{ fontSize: 12, color: MUT, fontStyle: 'italic' }}>None</span>}
            </div>
          </div>
        </div>
      </Box>
    );
  }
  if (item.type === 'ack') {
    return <FileChip name={item.file_name} icon="📥" onOpen={() => openFile(item.file_url)} onDownload={() => downloadDoc(item)} width={340} />;
  }
  if (item.type === 'closure') {
    return (
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 10 }}>
        {CLOSURE_DOC_TYPES.map((t) => {
          const doc = item.closure_documents?.find((d) => d.doc_type === t.key);
          return doc && (
            <div key={t.key}>
              <div style={{ fontSize: 11, fontWeight: 700, color: MUT, marginBottom: 4 }}>{t.label}</div>
              <FileChip name={doc.file_name} onOpen={() => openFile(doc)} onDownload={() => downloadDoc(doc)} />
            </div>
          );
        })}
      </div>
    );
  }
  if (item.type === 'extension') {
    return (
      <Box label="Extension Request">
        <div style={{ display: 'flex', gap: 16, marginBottom: 12 }}>
          <div><span style={{ fontSize: 11, color: MUT }}>Old Due Date:</span> <span style={{ fontSize: 13, textDecoration: 'line-through', color: RED, fontWeight: 600 }}>{fmtDate(item.payload?.old_date) || '—'}</span></div>
          <div><span style={{ fontSize: 11, color: MUT }}>Extended To:</span> <span style={{ fontSize: 13, fontWeight: 800, color: P }}>{fmtDate(item.payload?.new_date)}</span></div>
        </div>
        {item.payload?.notes && <div style={{ fontSize: 12, color: INK, fontStyle: 'italic', marginBottom: 12 }}>"{item.payload.notes}"</div>}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <div>
            <div style={{ fontSize: 11, fontWeight: 700, color: MUT, marginBottom: 6 }}>Reply Files ({item.payload?.reply_docs?.length || 0})</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              {item.payload?.reply_docs?.map((d) => <FileChip key={d.id} name={d.file_name} icon="📄" onOpen={() => openFile(d)} onDownload={() => downloadDoc(d)} />)}
            </div>
          </div>
          <div>
            <div style={{ fontSize: 11, fontWeight: 700, color: MUT, marginBottom: 6 }}>Ack Files ({item.payload?.ack_docs?.length || 0})</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              {item.payload?.ack_docs?.map((d) => <FileChip key={d.id} name={d.file_name} icon="📥" onOpen={() => openFile(d)} onDownload={() => downloadDoc(d)} />)}
            </div>
          </div>
        </div>
      </Box>
    );
  }

  return null;
}

function RejectionNote({ item }) {
  if (item.status !== 'rejected' || !item.review_note) return null;
  return (
    <div style={{ marginTop: 10, padding: '8px 12px', background: REDL, border: '1px solid #FECACA', borderRadius: 'var(--radius-md)', fontSize: 12, color: RED }}>
      <b>Rejection reason:</b> {item.review_note}
    </div>
  );
}

function ReviewCard({ item, busy, canDecide, onApprove, onReject, openLabel, onOpen, approveLabel = '✓ Approve' }) {
  const meta = ACTION_META[item.type];
  const accent = item.status === 'escalated' ? PUR : P;
  return (
    <div className="card" style={{ padding: 14, borderLeft: `4px solid ${accent}` }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
        <div style={{ width: 32, height: 32, borderRadius: 'var(--radius-md)', background: PL, color: P, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 15, flexShrink: 0 }}>
          {meta.icon}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
            <span style={{ fontSize: 13, fontWeight: 700, color: INK }}>{meta.label}</span>
            {item.notice?.din_number && <span className="tag-chip mono">DIN {item.notice.din_number}</span>}
            <StatusPill status={item.status} map={REVIEW_STATUS} />
          </div>
          <div style={{ fontSize: 11.5, color: MUT, marginTop: 2 }}>
            Submitted by <b style={{ color: 'var(--color-slate-600)' }}>{item.submitted_by_name || 'Unknown'}</b>
            {item.submitted_at && ` · ${fmtDateTime(item.submitted_at)}`}
          </div>
        </div>
        {onOpen && <button className="btn btn-primary" onClick={onOpen}>{openLabel}</button>}
      </div>

      <ItemBody item={item} />
      <RejectionNote item={item} />

      {canDecide && (
        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 10 }}>
          <button className="btn btn-secondary" style={{ color: RED }} onClick={onReject} disabled={busy}>Reject</button>
          <button className="btn btn-primary" onClick={onApprove} disabled={busy}>{busy ? 'Working…' : approveLabel}</button>
        </div>
      )}
    </div>
  );
}

export default function ReviewTabV2({ courtCaseId, refreshTick, caseData, onUpdated }) {
  const { user } = useAuth();

  const [data, setData] = useState({ reviews: [], notices: [], replies: [], closureCase: null });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [busyId, setBusyId] = useState(null);

  const [rejectTarget, setRejectTarget] = useState(null);
  const [acceptTarget, setAcceptTarget] = useState(null);
  const [noticeId, setNoticeId] = useState(null);
  const [replyModal, setReplyModal] = useState(null);
  const [historyItem, setHistoryItem] = useState(null);
  const [historyStatus, setHistoryStatus] = useState('all');
  const [historyType, setHistoryType] = useState('all');

  const isFounder = user?.role === 'Founder';
  const isHighAdmin = ['Admin', 'Founder'].includes(user?.role);
  const isMaker = isInList(caseData?.makers, user);
  const isChecker = isInList(caseData?.checkers, user);

  const load = useCallback(async () => {
    if (!courtCaseId) return;
    setLoading(true); setError(null);
    try {
      const [rRes, nRes, cRes] = await Promise.all([
        legalApi.reviews.list({ court_case: courtCaseId }),
        legalApi.notices.list({ court_case: courtCaseId }),
        legalApi.courtCases.get(courtCaseId),
      ]);
      const notices = toList(nRes);
      const replyLists = await Promise.all(notices.map((n) =>
        legalApi.replies.list({ notice: n.id }).then((r) => toList(r).map((x) => ({ ...x, notice: n }))).catch(() => [])
      ));
      setData({
        reviews: toList(rRes).filter((r) => r.action_type === 'summary' || r.action_type === 'notice_edit' || r.action_type === 'extension'),
        notices,
        replies: replyLists.flat().filter((r) => r.status !== 'draft'),
        closureCase: cRes.data,
      });
    } catch {
      setError('Failed to load reviews.');
    } finally {
      setLoading(false);
    }
  }, [courtCaseId]);

  useEffect(() => { load(); }, [load, refreshTick]);

  const allItems = useMemo(() => {
    const { reviews, notices, replies, closureCase } = data;
    const items = [];

    reviews.forEach((r) => items.push({
      ...r, type: r.action_type, key: `${r.action_type}-${r.id}`, _sortDate: r.reviewed_at || r.submitted_at,
    }));

    notices.filter((n) => n.review_status && n.review_status !== 'not_applicable').forEach((n) => items.push({
      type: 'notice', key: `notice-${n.id}`, id: n.id, notice_id: n.id, din_number: n.din_number,
      status: n.review_status === 'accepted' ? 'approved' : n.review_status,
      submitted_by_name: n.created_by_name, submitted_at: n.updated_at, reviewed_by_name: n.reviewed_by_name,
      _sortDate: n.reviewed_at || n.updated_at,
    }));

    replies.forEach((r) => items.push({
      type: 'reply', key: `reply-${r.id}`, id: r.id, reply_id: r.id, notice_id: r.notice?.id, notice: r.notice,
      status: r.status, title: r.title, submitted_by_name: r.created_by_name, submitted_at: r.updated_at,
      review_note: r.review_note, reviewed_by_name: r.reviewed_by_name, _sortDate: r.reviewed_at || r.updated_at,
    }));

    const submitted = ['pending', 'escalated', 'approved', 'rejected'];
    notices.forEach((n) => {
      const docs = (n.documents || []).filter((d) => submitted.includes(d.review_status));
      const supports = docs.filter((d) => ['pending_support', 'supporting_doc'].includes(d.doc_type));
      docs.forEach((d) => {
        const base = {
          id: d.id, notice_id: n.id, notice: n, status: d.review_status, file_name: d.file_name, file_url: d.file_url,
          uploaded_by: d.uploaded_by, submitted_by_name: d.uploaded_by_name, submitted_at: d.uploaded_at,
          review_note: d.review_note, reviewed_by_name: d.reviewed_by_name, _sortDate: d.reviewed_at || d.uploaded_at,
        };
        if (d.doc_type === 'acknowledgment') items.push({ ...base, type: 'ack', key: `ack-${d.id}` });
        if (d.doc_type === 'pending' || d.doc_type === 'reply') {
          items.push({ ...base, type: 'uploaded_reply_bundle', key: `up-${d.id}`, support_docs: supports.filter((s) => String(s.reply_version) === String(d.id)) });
        }
      });
    });

    if (closureCase && submitted.includes(closureCase.closure_review_status)) {
      items.push({
        type: 'closure', key: `closure-${closureCase.id}`, id: closureCase.id, status: closureCase.closure_review_status,
        closure_documents: closureCase.closure_documents || [], submitted_by_id: closureCase.closure_submitted_by,
        submitted_by_name: closureCase.closure_submitted_by_name, submitted_at: closureCase.closure_submitted_at,
        review_note: closureCase.closure_review_note, reviewed_by_name: closureCase.closure_reviewed_by_name,
        _sortDate: closureCase.closure_reviewed_at || closureCase.closure_submitted_at,
      });
    }

    return items.sort((a, b) => new Date(b._sortDate) - new Date(a._sortDate));
  }, [data]);

  const activeItems = allItems.filter((i) => i.status === 'pending' || i.status === 'escalated');
  const historyItems = allItems.filter((i) => i.status !== 'pending' && i.status !== 'escalated');
  const typeFilter = TYPE_FILTERS.find((t) => t.key === historyType);
  const visibleHistory = historyItems.filter((i) => (historyStatus === 'all' || i.status === historyStatus) && typeFilter.match(i));

  const canDecide = (item) => {
    if (item.type === 'summary' || item.type === 'notice_edit' || item.type === 'extension') {
      if (item.viewer_role === 'submitter') return false;
      if (item.status === 'escalated') return isHighAdmin;
      if (item.status === 'pending') return (!isFounder || item.viewer_role === 'checker') && ['admin', 'checker'].includes(item.viewer_role);
      return false;
    }
    if (item.type === 'closure' ? item.submitted_by_id === user?.id : item.uploaded_by === user?.id) return false;
    if (item.status === 'escalated') return isFounder;
    if (item.status === 'pending') return isChecker;
    return false;
  };

  const replyAccess = (item) => {
    const isCeo = user?.role === 'Founder' || user?.role === 'Admin';
    if (item.notice?.created_by === user?.id && item.status === 'pending') return null;
    if (item.status === 'pending') return (isChecker || isCeo) ? 'Review reply →' : null;
    if (item.status === 'escalated') return isCeo ? 'Review reply →' : null;
    return (isMaker || isChecker || isCeo) ? 'View reply →' : null;
  };

  const startApprove = (item) => {
    if ((item.type === 'summary' || item.type === 'notice_edit' || item.type === 'extension') && item.status === 'escalated') {
      setBusyId(item.key);
      legalApi.reviews.approve(item.id).then(() => { load(); onUpdated?.(); })
        .catch((e) => setError(e?.response?.data?.error || 'Failed to approve.'))
        .finally(() => setBusyId(null));
      return;
    }
    setAcceptTarget(item);
  };

  const doAccept = async (moveToCeo) => {
    const t = acceptTarget;
    setBusyId(t.key);
    try {
      if (t.type === 'closure') await (moveToCeo ? legalApi.courtCases.closureEscalate(t.id) : legalApi.courtCases.closureApprove(t.id));
      else if (t.type === 'ack' || t.type === 'uploaded_reply_bundle') await (moveToCeo ? legalApi.noticeDocs.escalate(t.id) : legalApi.noticeDocs.approve(t.id));
      else await (moveToCeo ? legalApi.reviews.escalate(t.id) : legalApi.reviews.approve(t.id));
      setAcceptTarget(null);
      await load();
      onUpdated?.();
    } finally {
      setBusyId(null);
    }
  };

  const doReject = async (reason) => {
    const t = rejectTarget;
    setBusyId(t.key);
    try {
      if (t.type === 'closure') await legalApi.courtCases.closureReject(t.id, reason);
      else if (t.type === 'ack' || t.type === 'uploaded_reply_bundle') await legalApi.noticeDocs.reject(t.id, reason);
      else await legalApi.reviews.reject(t.id, reason);
      setRejectTarget(null);
      await load();
      onUpdated?.();
    } finally {
      setBusyId(null);
    }
  };

  const openReply = (item) => setReplyModal({ noticeId: item.notice_id, notice: item.notice, replyId: item.reply_id });

  const renderActive = (item) => {
    if (item.type === 'notice') {
      return <ReviewCard key={item.key} item={item} openLabel="View notice →" onOpen={() => setNoticeId(item.notice_id)} />;
    }
    if (item.type === 'reply') {
      const label = replyAccess(item);
      return <ReviewCard key={item.key} item={item} openLabel={label} onOpen={label ? () => openReply(item) : null} />;
    }
    return (
      <ReviewCard
        key={item.key} item={item} busy={busyId === item.key} canDecide={canDecide(item)}
        approveLabel={item.type === 'closure' ? '✓ Approve & close' : '✓ Approve'}
        onApprove={() => startApprove(item)} onReject={() => setRejectTarget(item)}
      />
    );
  };

  const historyColumns = [
    {
      key: 'title', label: 'Item', align: 'left', width: 360, sortable: true, sortFn: (a, b) => itemTitle(a).localeCompare(itemTitle(b)),
      render: (i) => <span>{ACTION_META[i.type]?.icon} {itemTitle(i)}</span>,
    },
    { key: 'by', label: 'Reviewed by', align: 'left', render: (i) => i.reviewed_by_name || i.submitted_by_name || '—' },
    { key: 'when', label: 'When', sortable: true, sortFn: (a, b) => new Date(a._sortDate) - new Date(b._sortDate), render: (i) => fmtRelativeTime(i._sortDate) },
    { key: 'status', label: 'Status', sortable: true, render: (i) => <StatusPill status={i.status} map={REVIEW_STATUS} /> },
  ];

  if (loading) return <EmptyState icon="⏳" text="Loading reviews…" />;

  return (
    <div>
      <ErrorBanner>{error}</ErrorBanner>

      <SectionTitle style={{ marginTop: 0 }}>Active reviews ({activeItems.length})</SectionTitle>
      {activeItems.length === 0 ? (
        <EmptyState icon="📋" text="No active reviews pending.">
          <div style={{ fontSize: 12, marginTop: 4 }}>Completed items are listed in History below.</div>
        </EmptyState>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>{activeItems.map(renderActive)}</div>
      )}

      <SectionTitle style={{ marginTop: 28 }}>History ({historyItems.length})</SectionTitle>
      <div className="filter-bar">
        <Segmented value={historyStatus} onChange={setHistoryStatus} options={[
          { key: 'all', label: `All (${historyItems.length})` },
          { key: 'approved', label: `Approved (${historyItems.filter((i) => i.status === 'approved').length})` },
          { key: 'rejected', label: `Rejected (${historyItems.filter((i) => i.status === 'rejected').length})` },
        ]} />
        <div className="filter-field">
          <Select value={historyType} onChange={setHistoryType}
            options={TYPE_FILTERS.map((t) => ({ value: t.key, label: `${t.label} (${historyItems.filter(t.match).length})` }))} />
        </div>
      </div>
      <Table
        columns={historyColumns}
        rows={visibleHistory}
        getRowId={(i) => i.key}
        onRowClick={setHistoryItem}
        emptyMessage="No completed items match this filter."
        pageSize={10}
      />

      {historyItem && (
        <Modal
          isOpen size="lg" icon={ACTION_META[historyItem.type]?.icon}
          title={itemTitle(historyItem)}
          subtitle={`${historyItem.status === 'approved' ? 'Approved' : historyItem.status === 'rejected' ? 'Rejected' : 'Reviewed'} by ${historyItem.reviewed_by_name || 'Unknown'} · ${fmtDateTime(historyItem._sortDate)}`}
          onClose={() => setHistoryItem(null)}
          footer={
            <>
              {historyItem.type === 'reply' && replyAccess(historyItem) && (
                <button className="btn btn-secondary" onClick={() => { openReply(historyItem); setHistoryItem(null); }}>Open reply editor</button>
              )}
              {historyItem.type === 'notice' && (
                <button className="btn btn-secondary" onClick={() => { setNoticeId(historyItem.notice_id); setHistoryItem(null); }}>View notice</button>
              )}
              <button className="btn btn-primary" onClick={() => setHistoryItem(null)}>Close</button>
            </>
          }
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
            <StatusPill status={historyItem.status} map={REVIEW_STATUS} />
            <span style={{ fontSize: 12, color: MUT }}>Submitted by <b>{historyItem.submitted_by_name || 'Unknown'}</b></span>
          </div>
          <ItemBody item={historyItem} />
          <RejectionNote item={historyItem} />
        </Modal>
      )}

      {rejectTarget && <RejectModal onClose={() => setRejectTarget(null)} onRejected={doReject} />}
      {acceptTarget && <AcceptModal onClose={() => setAcceptTarget(null)} onAccepted={doAccept} showEscalate={!isFounder} />}
      {noticeId && (
        <NoticeDetailModal noticeId={noticeId} canEdit={false} onClose={() => setNoticeId(null)}
          onUpdated={() => { load(); onUpdated?.(); }} />
      )}
      {replyModal && (
        <ReplyEditorModal
          noticeId={replyModal.noticeId} notice={replyModal.notice} replyId={replyModal.replyId} mode="review"
          currentUserId={user?.id} isAssignedMaker={isMaker} isAssignedChecker={isChecker} isCeoRole={isFounder}
          onClose={() => setReplyModal(null)}
          onSaved={() => { setReplyModal(null); load(); onUpdated?.(); }}
        />
      )}
    </div>
  );
}