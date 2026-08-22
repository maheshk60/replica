
// import React, { useState, useEffect, useCallback, useMemo } from 'react';
// import { useNavigate, useParams } from 'react-router-dom';
// import { api } from '../../services/api';
// import { useAuth } from '../../contexts/AuthContext';
// import RejectModal, { AcceptModal } from './RejectModal';
// import AddNoticeModal, { NoticeDetailModal } from './AddNoticeModal';
// import ReplyEditorModal from './ReplyEditorModal';

// /* ─── LOCAL API DEFINITIONS ─── */
// const reviewApi = {
//   list: (params) => api.get('/legal-services/reviews/', { params }),
//   approve: (id) => api.post(`/legal-services/reviews/${id}/approve/`),
//   reject: (id, reason) => api.post(`/legal-services/reviews/${id}/reject/`, { reason }),
//   escalate: (id) => api.post(`/legal-services/reviews/${id}/escalate/`),
// };

// const noticeApi = {
//   list: (params) => api.get('/legal-services/notices/', { params }),
// };

// const replyApi = {
//   list: (params) => api.get('/legal-services/notice-replies/', { params }),
// };

// const noticeDocApi = {
//   approve: (id) => api.post(`/legal-services/notice-documents/${id}/approve/`),
//   reject: (id, reason) => api.post(`/legal-services/notice-documents/${id}/reject/`, { reason }),
// };

// const SANS = "'Roboto', sans-serif";

// const C = {
//   navy: '#1E3A6B', navyMid: '#2A4F8F', ink: '#0F172A',
//   slate: '#475569', muted: '#94A3B8',
//   border: '#E8ECF4', borderLight: '#F1F5F9',
//   bg: '#F8FAFC', bgSoft: '#FBFCFE',
//   green: '#0F7A5A', greenBg: '#E6F5EF', greenBorder: '#B4DFCF',
//   red: '#B42318', redBg: '#FCEBEA', redBorder: '#F2C1BC',
//   amber: '#92620B', amberBg: '#FBF2DE', amberBorder: '#F0DDA3',
//   purple: '#6D28D9', purpleBg: '#F1E8FE', purpleBorder: '#DCC8FA',
//   blue: '#2563EB', blueBg: '#E8F0FE', blueBorder: '#C5D5EF',
// };

// const ACTION_META = {
//   summary:       { label: 'Case Summary Update',   icon: '📝', color: C.purple, bg: C.purpleBg, border: C.purpleBorder },
//   notice_edit:   { label: 'Notice Info Update',    icon: '✎',  color: C.blue,   bg: C.blueBg,   border: C.blueBorder },
//   notice_review: { label: 'Notice Review',         icon: '📋', color: C.navy,   bg: C.blueBg,   border: C.blueBorder },
//   reply_review:  { label: 'Reply Document',        icon: '📄', color: C.navy,   bg: C.blueBg,   border: C.blueBorder },
//   ack_review:    { label: 'Acknowledgment',        icon: '📥', color: C.purple, bg: C.purpleBg, border: C.purpleBorder },
// };

// const STATUS_META = {
//   pending:   { label: 'Pending',   color: C.amber, bg: C.amberBg, border: C.amberBorder },
//   approved:  { label: 'Approved',  color: C.green, bg: C.greenBg, border: C.greenBorder },
//   accepted:  { label: 'Approved',  color: C.green, bg: C.greenBg, border: C.greenBorder },
//   rejected:  { label: 'Rejected',  color: C.red,   bg: C.redBg,   border: C.redBorder },
//   escalated: { label: 'Escalated', color: C.purple,bg: C.purpleBg,border: C.purpleBorder },
// };

// const HIGH_ADMIN_ROLES = ['Admin', 'Founder'];
// const RECENT_ITEMS_COUNT = 1; // ✅ Show last 1 completed in Active section

// function fmtDateTime(d) {
//   if (!d) return '';
//   return new Date(d).toLocaleString('en-IN', {
//     day: '2-digit', month: 'short', year: 'numeric',
//     hour: '2-digit', minute: '2-digit', hour12: true,
//   });
// }

// function fmtDate(d) {
//   if (!d) return '—';
//   return new Date(d).toLocaleDateString('en-IN', {
//     day: '2-digit', month: 'short', year: 'numeric',
//   });
// }

// function fmtRelativeTime(d) {
//   if (!d) return '';
//   const diff = Math.floor((Date.now() - new Date(d)) / 1000);
//   if (diff < 60) return 'just now';
//   if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
//   if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
//   if (diff < 604800) return `${Math.floor(diff / 86400)}d ago`;
//   return fmtDate(d);
// }

// // ══════════════════════════════════════════════════════════════════
// // MAIN COMPONENT
// // ══════════════════════════════════════════════════════════════════
// export default function ReviewTabV2({ clientId: propClientId, courtCaseId, litigationType, refreshTick, caseData }) {
//   const { user } = useAuth();
//   const navigate = useNavigate();
//   const params = useParams();
//   const clientId = propClientId || params.clientId;

//   const [reviews, setReviews] = useState([]);
//   const [notices, setNotices] = useState([]);
//   const [replies, setReplies] = useState([]);
//   const [ackDocs, setAckDocs] = useState([]); // ✅ NEW — ack documents
//   const [loading, setLoading] = useState(true);
//   const [error, setError] = useState(null);
//   const [busyId, setBusyId] = useState(null);

//   const [rejectTarget, setRejectTarget] = useState(null);
//   const [acceptTarget, setAcceptTarget] = useState(null);

//   const [selectedNoticeId, setSelectedNoticeId] = useState(null);
//   const [replyModalData, setReplyModalData] = useState(null);
//   const [filter, setFilter] = useState('all');

//   // History collapse state (resets each visit)
//   const [historyOpen, setHistoryOpen] = useState(false);
//   const [historyFilter, setHistoryFilter] = useState('all');

//   // Expanded history row (click to expand)
//   const [expandedHistoryId, setExpandedHistoryId] = useState(null);

//   const isFounder = user?.role === 'Founder';
//   const isHighAdmin = HIGH_ADMIN_ROLES.includes(user?.role);

//   const load = useCallback(async () => {
//     if (!courtCaseId) return;
//     setLoading(true);
//     setError(null);
//     try {
//       const [reviewsRes, noticesRes] = await Promise.all([
//         reviewApi.list({ court_case: courtCaseId }),
//         noticeApi.list({ court_case: courtCaseId }),
//       ]);
//       const reviewData = Array.isArray(reviewsRes.data) ? reviewsRes.data : (reviewsRes.data.results || []);
//       const noticeData = Array.isArray(noticesRes.data) ? noticesRes.data : (noticesRes.data.results || []);

//       // Only summary + notice_edit reviews from ReviewRequest
//       setReviews(reviewData.filter(r =>
//         r.action_type === 'summary' || r.action_type === 'notice_edit'
//       ));

//       // Only notices with review workflow (old flow — mostly not used now)
//       setNotices(noticeData.filter(n => n.review_status && n.review_status !== 'not_applicable'));

//       // ✅ Extract all ack docs from notices
//       const allAckDocs = [];
//       noticeData.forEach(n => {
//         (n.documents || []).forEach(d => {
//           if (d.doc_type === 'acknowledgment') {
//             allAckDocs.push({ ...d, notice: n });
//           }
//         });
//       });
//       setAckDocs(allAckDocs);

//       // Fetch replies for all notices
//       if (noticeData.length > 0) {
//         const replyPromises = noticeData.map((n) =>
//           replyApi.list({ notice: n.id })
//             .then(r => {
//               const list = Array.isArray(r.data) ? r.data : (r.data.results || []);
//               return list.map(reply => ({ ...reply, notice: n }));
//             })
//             .catch(() => [])
//         );
//         const replyResults = await Promise.all(replyPromises);
//         const flatReplies = replyResults.flat().filter(r => r.status !== 'draft');
//         setReplies(flatReplies);
//       } else {
//         setReplies([]);
//       }
//     } catch (e) {
//       console.error(e);
//       setError('Failed to load reviews.');
//     } finally {
//       setLoading(false);
//     }
//   }, [courtCaseId]);

//   useEffect(() => { load(); }, [load, refreshTick]);

//   // ══════════════════════════════════════════════════════════════
//   // SUMMARY/NOTICE_EDIT REVIEW ACTIONS (from old ReviewTab logic)
//   // ══════════════════════════════════════════════════════════════
//   const canApproveReviewRequest = (review) => {
//     if (review.viewer_role === 'submitter') return false;
//     if (review.status === 'escalated') return isHighAdmin;
//     if (review.status === 'pending') {
//       return ['admin', 'founder', 'checker'].includes(review.viewer_role);
//     }
//     return false;
//   };

//   const canRejectReviewRequest = (review) => canApproveReviewRequest(review);

//   const handleApproveReviewRequest = (review) => {
//     if (review.status === 'escalated') {
//       setBusyId(review.id);
//       reviewApi.approve(review.id)
//         .then(() => load())
//         .catch((e) => alert(e?.response?.data?.error || 'Failed to approve.'))
//         .finally(() => setBusyId(null));
//       return;
//     }
//     setAcceptTarget({ ...review, _kind: 'review_request' });
//   };

//   const doAccept = async (moveToCeo) => {
//     const target = acceptTarget;
//     const id = target.id;
//     setBusyId(id);
//     try {
//       if (target._kind === 'ack') {
//         if (moveToCeo) {
//           // ✅ Escalate ack to CEO
//           await api.post(`/legal-services/notice-documents/${id}/escalate/`);
//         } else {
//           await noticeDocApi.approve(id);
//         }
//       } else {
//         // review_request (summary/notice_edit)
//         if (moveToCeo) {
//           await reviewApi.escalate(id);
//         } else {
//           await reviewApi.approve(id);
//         }
//       }
//       setAcceptTarget(null);
//       await load();
//     } catch (e) {
//       throw e;
//     } finally {
//       setBusyId(null);
//     }
//   };

//   const handleRejectReviewRequest = (review) => {
//     setRejectTarget({ ...review, _kind: 'review_request' });
//   };

//   const doReject = async (reason) => {
//     const target = rejectTarget;
//     const id = target.id;
//     setBusyId(id);
//     try {
//       // ✅ Route based on _kind
//       if (target._kind === 'ack') {
//         await noticeDocApi.reject(id, reason);
//       } else {
//         await reviewApi.reject(id, reason);
//       }
//       setRejectTarget(null);
//       await load();
//     } catch (e) {
//       throw e;
//     } finally {
//       setBusyId(null);
//     }
//   };

//   // ══════════════════════════════════════════════════════════════
//   // ACK ACTIONS
//   // ══════════════════════════════════════════════════════════════
//   const canReviewAck = (ackDoc) => {
//     const userId = user?.id;
//     const isSubmitter = ackDoc.uploaded_by === userId;
//     const assignedCheckers = caseData?.checkers || [];
//     const isAssignedChecker = assignedCheckers.some((c) => c.id === userId);
//     const isCeoRole = user?.role === 'Founder';

//     if (isSubmitter) return false;
//     if (ackDoc.review_status === 'pending') {
//       return isAssignedChecker || isCeoRole;
//     }
//     if (ackDoc.review_status === 'escalated') {
//       return isCeoRole;
//     }
//     return false;
//   };

//   const handleApproveAck = (ackDoc) => {
//     setAcceptTarget({ ...ackDoc, _kind: 'ack' });
//   };

//   const handleRejectAck = (ackDoc) => {
//     setRejectTarget({ ...ackDoc, _kind: 'ack' });
//   };

//   const handleOpenAckPdf = (ackDoc) => {
//     if (ackDoc?.file_url) {
//       window.open(ackDoc.file_url, '_blank', 'noopener,noreferrer');
//     }
//   };

//   // ══════════════════════════════════════════════════════════════
//   // MERGE ALL ITEMS
//   // ══════════════════════════════════════════════════════════════
//   const summaryReviewItems = reviews
//     .filter(r => r.action_type === 'summary')
//     .map(r => ({
//       ...r,
//       type: 'summary',
//       id: `summary-${r.id}`,
//       _originalId: r.id,
//       _sortDate: r.reviewed_at || r.submitted_at,
//       action_type: 'summary',
//     }));

//   const noticeEditReviewItems = reviews
//     .filter(r => r.action_type === 'notice_edit')
//     .map(r => ({
//       ...r,
//       type: 'notice_edit',
//       id: `edit-${r.id}`,
//       _originalId: r.id,
//       _sortDate: r.reviewed_at || r.submitted_at,
//       action_type: 'notice_edit',
//     }));

//   const noticeReviewItems = notices.map(n => ({
//     id: `notice-${n.id}`,
//     type: 'notice',
//     notice_id: n.id,
//     action_type: 'notice_review',
//     status: n.review_status === 'accepted' ? 'approved' : n.review_status,
//     din_number: n.din_number,
//     officer: n.officer,
//     section: n.section,
//     due_date: n.due_date,
//     extended_due_date: n.extended_due_date,
//     pending_docs_count: (n.pending_docs || []).length,
//     reply_docs_count: (n.reply_docs || []).length,
//     submitted_by_name: n.created_by_name,
//     submitted_at: n.updated_at,
//     _sortDate: n.reviewed_at || n.updated_at,
//     review_note: n.review_note,
//     reviewed_by_name: n.reviewed_by_name,
//     reviewed_at: n.reviewed_at,
//     escalated_to_founder: n.review_status === 'escalated',
//   }));

//   const replyReviewItems = replies.map(r => ({
//     id: `reply-${r.id}`,
//     type: 'reply',
//     reply_id: r.id,
//     notice_id: r.notice?.id,
//     notice: r.notice,
//     action_type: 'reply_review',
//     status: r.status,
//     title: r.title,
//     submitted_by_name: r.created_by_name,
//     submitted_at: r.updated_at,
//     _sortDate: r.reviewed_at || r.updated_at,
//     review_note: r.review_note,
//     reviewed_by_name: r.reviewed_by_name,
//     reviewed_at: r.reviewed_at,
//     escalated_to_founder: r.status === 'escalated',
//   }));

//   // ✅ Ack review items
//   const ackReviewItems = ackDocs.map(a => ({
//     id: `ack-${a.id}`,
//     type: 'ack',
//     ack_id: a.id,
//     notice_id: a.notice?.id,
//     notice: a.notice,
//     action_type: 'ack_review',
//     status: a.review_status,
//     file_name: a.file_name,
//     file_url: a.file_url,
//     uploaded_by: a.uploaded_by,
//     submitted_by_name: a.uploaded_by_name,
//     submitted_at: a.uploaded_at,
//     _sortDate: a.reviewed_at || a.uploaded_at,
//     review_note: a.review_note,
//     reviewed_by_name: a.reviewed_by_name,
//     reviewed_at: a.reviewed_at,
//     escalated_to_founder: a.review_status === 'escalated',
//   }));

//   const allItems = [
//     ...summaryReviewItems,
//     ...noticeEditReviewItems,
//     ...noticeReviewItems,
//     ...replyReviewItems,
//     ...ackReviewItems,
//   ].sort((a, b) => new Date(b._sortDate) - new Date(a._sortDate));

//   // ══════════════════════════════════════════════════════════════
//   // SPLIT INTO ACTIVE + HISTORY
//   // ══════════════════════════════════════════════════════════════
//   const { activeItems, historyItems } = useMemo(() => {
//     const active = [];
//     const completed = [];

//     allItems.forEach(item => {
//       if (item.status === 'pending' || item.status === 'escalated') {
//         active.push(item);
//       } else {
//         completed.push(item);
//       }
//     });

//     // ✅ Sort completed by date — latest first (for both recent + history)
//     completed.sort((a, b) => new Date(b._sortDate) - new Date(a._sortDate));

//     // ✅ Take only 1 most recent completed item to show in active section
//     const recentCompleted = completed.slice(0, RECENT_ITEMS_COUNT);
//     const olderCompleted = completed.slice(RECENT_ITEMS_COUNT);

//     return {
//       activeItems: [...active, ...recentCompleted],
//       historyItems: olderCompleted,  // ✅ Already sorted latest first
//     };
//     // eslint-disable-next-line
//   }, [allItems]);

//   // Apply top filter to active
//   const visibleActiveItems = filter === 'all'
//     ? activeItems
//     : activeItems.filter(r => r.status === filter);

//   // Apply history filter (by type)
//   const visibleHistoryItems = historyFilter === 'all'
//     ? historyItems
//     : historyItems.filter(r => {
//       if (historyFilter === 'notice_edit') return r.type === 'notice_edit';
//       if (historyFilter === 'reply') return r.type === 'reply';
//       if (historyFilter === 'ack') return r.type === 'ack';
//       if (historyFilter === 'summary') return r.type === 'summary';
//       return true;
//     });

//   const counts = {
//     all: activeItems.length,
//     pending: activeItems.filter(r => r.status === 'pending').length,
//     approved: activeItems.filter(r => r.status === 'approved').length,
//     rejected: activeItems.filter(r => r.status === 'rejected').length,
//     escalated: activeItems.filter(r => r.status === 'escalated').length,
//   };

//   const handleViewReply = (item) => {
//     setReplyModalData({
//       noticeId: item.notice_id,
//       notice: item.notice,
//       replyId: item.reply_id,
//     });
//   };

//   return (
//     <div style={{ fontFamily: SANS }}>
//       {/* Filters — for Active section */}
//       <div style={{
//         display: 'flex', gap: 6, marginBottom: 14, flexWrap: 'wrap',
//         padding: '10px 14px', background: '#fff',
//         border: `1px solid ${C.border}`, borderRadius: 10,
//       }}>
//         {['all', 'pending', 'approved', 'rejected', 'escalated'].map((f) => {
//           const active = filter === f;
//           const meta = f !== 'all' ? STATUS_META[f] : null;
//           return (
//             <button
//               key={f}
//               onClick={() => setFilter(f)}
//               style={{
//                 display: 'flex', alignItems: 'center', gap: 5,
//                 padding: '5px 12px', borderRadius: 8,
//                 border: `1.5px solid ${active ? C.navy : C.border}`,
//                 background: active ? C.navy : '#fff',
//                 color: active ? '#fff' : C.slate,
//                 fontSize: 11.5, fontWeight: 700, cursor: 'pointer',
//                 textTransform: 'capitalize', fontFamily: SANS,
//               }}
//             >
//               {f}
//               <span style={{
//                 background: active ? 'rgba(255,255,255,0.2)' : (meta?.bg || C.borderLight),
//                 color: active ? '#fff' : (meta?.color || C.slate),
//                 padding: '1px 6px', borderRadius: 999,
//                 fontSize: 10, fontWeight: 800, minWidth: 16, textAlign: 'center',
//               }}>
//                 {counts[f]}
//               </span>
//             </button>
//           );
//         })}
//       </div>

//       {/* States */}
//       {loading && (
//         <div style={{ padding: 40, textAlign: 'center', color: C.muted, fontSize: 13, background: '#fff', borderRadius: 10, border: `1px solid ${C.border}` }}>
//           Loading reviews...
//         </div>
//       )}

//       {error && !loading && (
//         <div style={{ padding: 14, background: C.redBg, color: C.red, border: `1px solid ${C.redBorder}`, borderRadius: 10, fontSize: 12.5, fontWeight: 600 }}>
//           {error}
//         </div>
//       )}

//       {!loading && !error && (
//         <>
//           {/* ═══ ACTIVE SECTION ═══ */}
//           {visibleActiveItems.length === 0 ? (
//             <div style={{
//               padding: '40px 20px', textAlign: 'center',
//               background: '#fff', borderRadius: 10, border: `1px solid ${C.border}`,
//               marginBottom: 16,
//             }}>
//               <div style={{ fontSize: 32, marginBottom: 8, opacity: 0.6 }}>📋</div>
//               <div style={{ color: C.slate, fontSize: 13, fontWeight: 600 }}>
//                 {filter === 'all' ? 'No active reviews.' : `No ${filter} items.`}
//               </div>
//               {historyItems.length > 0 && (
//                 <div style={{ color: C.muted, fontSize: 11.5, marginTop: 6 }}>
//                   {historyItems.length} item{historyItems.length !== 1 ? 's' : ''} in history below
//                 </div>
//               )}
//             </div>
//           ) : (
//             <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 16 }}>
//               {visibleActiveItems.map((item) => renderItemCard(item, {
//                 busyId,
//                 canApproveReviewRequest,
//                 canRejectReviewRequest,
//                 handleApproveReviewRequest,
//                 handleRejectReviewRequest,
//                 canReviewAck,
//                 handleApproveAck,
//                 handleRejectAck,
//                 handleOpenAckPdf,
//                 handleViewReply,
//                 caseData,
//                 user,
//                 setSelectedNoticeId,
//               }))}
//             </div>
//           )}

//           {/* ═══ HISTORY SECTION (collapsed) ═══ */}
//           {historyItems.length > 0 && (
//             <div style={{
//               background: '#fff',
//               border: `1px solid ${C.border}`,
//               borderRadius: 10,
//               overflow: 'hidden',
//             }}>
//               {/* History header */}
//               <div
//                 onClick={() => setHistoryOpen(!historyOpen)}
//                 style={{
//                   padding: '12px 16px',
//                   display: 'flex', alignItems: 'center', justifyContent: 'space-between',
//                   cursor: 'pointer',
//                   background: historyOpen ? C.bgSoft : '#fff',
//                   transition: 'background 0.15s',
//                   borderBottom: historyOpen ? `1px solid ${C.border}` : 'none',
//                 }}
//                 onMouseEnter={(e) => e.currentTarget.style.background = C.bgSoft}
//                 onMouseLeave={(e) => !historyOpen && (e.currentTarget.style.background = '#fff')}
//               >
//                 <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
//                   <span style={{
//                     fontSize: 12,
//                     color: C.slate,
//                     transform: historyOpen ? 'rotate(90deg)' : 'rotate(0deg)',
//                     transition: 'transform 0.15s',
//                     display: 'inline-block',
//                     width: 12, height: 12,
//                   }}>▶</span>
//                   <span style={{ fontSize: 13, fontWeight: 800, color: C.ink }}>
//                     History
//                   </span>
//                   <span style={{
//                     fontSize: 10.5, fontWeight: 700, color: C.muted,
//                     background: C.bg, border: `1px solid ${C.border}`,
//                     padding: '1px 8px', borderRadius: 99,
//                   }}>
//                     {historyItems.length}
//                   </span>
//                 </div>

//                 {/* Filter dropdown — inside header when expanded */}
//                 {historyOpen && (
//                   <select
//                     onClick={(e) => e.stopPropagation()}
//                     value={historyFilter}
//                     onChange={(e) => setHistoryFilter(e.target.value)}
//                     style={{
//                       padding: '5px 10px',
//                       border: `1px solid ${C.border}`,
//                       borderRadius: 6,
//                       background: '#fff',
//                       color: C.slate,
//                       fontSize: 11.5, fontWeight: 600,
//                       cursor: 'pointer',
//                       fontFamily: SANS,
//                       outline: 'none',
//                     }}
//                   >
//                     <option value="all">All Types</option>
//                     <option value="notice_edit">Notice Info</option>
//                     <option value="reply">Reply</option>
//                     <option value="ack">Acknowledgment</option>
//                     <option value="summary">Summary</option>
//                   </select>
//                 )}
//               </div>

//               {/* History body */}
//               {historyOpen && (
//                 <div style={{ padding: 8 }}>
//                   {visibleHistoryItems.length === 0 ? (
//                     <div style={{
//                       padding: 20, textAlign: 'center',
//                       color: C.muted, fontSize: 12, fontStyle: 'italic',
//                     }}>
//                       No items match this filter
//                     </div>
//                   ) : (
//                     <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
//                       {visibleHistoryItems.map((item) => (
//                         <HistoryRow
//                           key={item.id}
//                           item={item}
//                           expanded={expandedHistoryId === item.id}
//                           onToggle={() => setExpandedHistoryId(
//                             expandedHistoryId === item.id ? null : item.id
//                           )}
//                           user={user}
//                           caseData={caseData}
//                           onViewReply={handleViewReply}
//                           onOpenAck={handleOpenAckPdf}
//                           onOpenNotice={setSelectedNoticeId}
//                         />
//                       ))}
//                     </div>
//                   )}
//                 </div>
//               )}
//             </div>
//           )}
//         </>
//       )}

//       {/* Modals */}
//       {rejectTarget && (
//         <RejectModal
//           review={rejectTarget}
//           onClose={() => setRejectTarget(null)}
//           onRejected={doReject}
//         />
//       )}

//       {acceptTarget && (
//         <AcceptModal
//           review={acceptTarget}
//           onClose={() => setAcceptTarget(null)}
//           onAccepted={doAccept}
//           showEscalate={!isFounder}
//         />
//       )}

//       {selectedNoticeId && (
//         <NoticeDetailModal
//           noticeId={selectedNoticeId}
//           canEdit={false}
//           onClose={() => setSelectedNoticeId(null)}
//           onUpdated={() => { setSelectedNoticeId(null); load(); }}
//         />
//       )}

//       {replyModalData && (
//         <ReplyEditorModal
//           noticeId={replyModalData.noticeId}
//           notice={replyModalData.notice}
//           replyId={replyModalData.replyId}
//           mode="review"
//           currentUserId={user?.id}
//           isAssignedMaker={(caseData?.makers || []).some((m) => m.id === user?.id)}
//           isAssignedChecker={(caseData?.checkers || []).some((c) => c.id === user?.id)}
//           isCeoRole={user?.role === 'Founder'}
//           onClose={() => setReplyModalData(null)}
//           onSaved={() => { setReplyModalData(null); load(); }}
//         />
//       )}
//     </div>
//   );
// }

// // ══════════════════════════════════════════════════════════════════
// // ITEM CARD RENDERER — routes to correct card component
// // ══════════════════════════════════════════════════════════════════
// function renderItemCard(item, ctx) {
//   const {
//     busyId,
//     canApproveReviewRequest,
//     canRejectReviewRequest,
//     handleApproveReviewRequest,
//     handleRejectReviewRequest,
//     canReviewAck,
//     handleApproveAck,
//     handleRejectAck,
//     handleOpenAckPdf,
//     handleViewReply,
//     caseData,
//     user,
//     setSelectedNoticeId,
//   } = ctx;

//   if (item.type === 'summary') {
//     return (
//       <SummaryReviewCard
//         key={item.id}
//         review={item}
//         busy={busyId === item._originalId}
//         canApprove={canApproveReviewRequest(item)}
//         canReject={canRejectReviewRequest(item)}
//         onApprove={() => handleApproveReviewRequest({ ...item, id: item._originalId })}
//         onReject={() => handleRejectReviewRequest({ ...item, id: item._originalId })}
//       />
//     );
//   }

//   if (item.type === 'notice_edit') {
//     return (
//       <NoticeEditReviewCard
//         key={item.id}
//         review={item}
//         busy={busyId === item._originalId}
//         canApprove={canApproveReviewRequest(item)}
//         canReject={canRejectReviewRequest(item)}
//         onApprove={() => handleApproveReviewRequest({ ...item, id: item._originalId })}
//         onReject={() => handleRejectReviewRequest({ ...item, id: item._originalId })}
//       />
//     );
//   }

//   if (item.type === 'ack') {
//     const canReview = canReviewAck({
//       uploaded_by: item.uploaded_by,
//       review_status: item.status,
//     });
//     return (
//       <AckReviewCard
//         key={item.id}
//         item={item}
//         busy={busyId === item.ack_id}
//         canApprove={canReview}
//         canReject={canReview}
//         onOpenPdf={() => handleOpenAckPdf(item)}
//         onApprove={() => handleApproveAck({ ...item, id: item.ack_id })}
//         onReject={() => handleRejectAck({ ...item, id: item.ack_id })}
//       />
//     );
//   }

//   if (item.type === 'notice') {
//     return (
//       <NoticeReviewCard
//         key={item.id}
//         item={item}
//         onView={() => setSelectedNoticeId(item.notice_id)}
//       />
//     );
//   }

//   if (item.type === 'reply') {
//     const userId = user?.id;
//     const isSubmitter = item.notice?.created_by === userId;
//     const assignedCheckers = caseData?.checkers || [];
//     const isAssignedChecker = assignedCheckers.some((c) => c.id === userId);
//     const isCeoRole = user?.role === 'Founder' || user?.role === 'Admin';

//     let canReviewThis = false;
//     let buttonLabel = 'Review Reply →';

//     if (item.status === 'pending') {
//       canReviewThis = isAssignedChecker || isCeoRole;
//     } else if (item.status === 'escalated') {
//       canReviewThis = isCeoRole;
//     } else if (item.status === 'approved' || item.status === 'rejected') {
//       const isAssignedMaker = (caseData?.makers || []).some((m) => m.id === userId);
//       canReviewThis = isAssignedMaker || isAssignedChecker || isCeoRole;
//       buttonLabel = 'View Reply →';
//     }

//     if (isSubmitter && item.status === 'pending') {
//       canReviewThis = false;
//     }

//     return (
//       <ReplyReviewCard
//         key={item.id}
//         item={item}
//         onView={() => handleViewReply(item)}
//         canReview={canReviewThis}
//         buttonLabel={buttonLabel}
//       />
//     );
//   }
//   return null;
// }

// // ══════════════════════════════════════════════════════════════════
// // COMPACT HISTORY ROW (click to expand)
// // ══════════════════════════════════════════════════════════════════
// function HistoryRow({ item, expanded, onToggle, user, caseData, onViewReply, onOpenAck, onOpenNotice }) {
//   const [hover, setHover] = useState(false);
//   const meta = ACTION_META[item.action_type] || ACTION_META.summary;
//   const statusMeta = STATUS_META[item.status] || STATUS_META.pending;

//   // Compact title based on type
//   let title = meta.label;
//   if (item.type === 'reply') title = `Reply — ${item.title || 'Untitled'}`;
//   if (item.type === 'ack') title = `Acknowledgment — ${item.file_name}`;
//   if (item.type === 'notice_edit') title = `Notice Info — DIN ${item.payload?.notice_din || '—'}`;
//   if (item.type === 'notice') title = `Notice — DIN ${item.din_number || '—'}`;

//   return (
//     <div style={{
//       background: '#fff',
//       border: `1px solid ${expanded ? C.blueBorder : C.borderLight}`,
//       borderRadius: 6,
//       overflow: 'hidden',
//       transition: 'all .12s',
//     }}>
//       {/* Compact row */}
//       <div
//         onClick={onToggle}
//         onMouseEnter={() => setHover(true)}
//         onMouseLeave={() => setHover(false)}
//         style={{
//           padding: '8px 10px',
//           cursor: 'pointer',
//           background: hover || expanded ? C.bgSoft : '#fff',
//           display: 'flex', alignItems: 'center', gap: 10,
//           transition: 'all .12s',
//         }}
//       >
//         {/* Icon */}
//         <div style={{
//           width: 24, height: 24, flexShrink: 0,
//           borderRadius: 5,
//           background: meta.bg,
//           border: `1px solid ${meta.border}`,
//           display: 'flex', alignItems: 'center', justifyContent: 'center',
//           fontSize: 11, color: meta.color,
//         }}>{meta.icon}</div>

//         {/* Title */}
//         <div style={{ flex: 1, minWidth: 0 }}>
//           <div style={{
//             fontSize: 12, fontWeight: 700, color: C.ink,
//             overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
//           }}>
//             {title}
//           </div>
//           <div style={{ fontSize: 10, color: C.muted, marginTop: 1 }}>
//             {item.reviewed_by_name || item.submitted_by_name} · {fmtRelativeTime(item._sortDate)}
//           </div>
//         </div>

//         {/* Status */}
//         <span style={{
//           fontSize: 9, fontWeight: 800, padding: '2px 7px', borderRadius: 4,
//           background: statusMeta.bg, color: statusMeta.color,
//           border: `1px solid ${statusMeta.border}`,
//           textTransform: 'uppercase', letterSpacing: '0.04em',
//           flexShrink: 0,
//         }}>
//           {statusMeta.label}
//         </span>

//         {/* Expand indicator */}
//         <span style={{
//           fontSize: 10, color: C.muted,
//           transform: expanded ? 'rotate(180deg)' : 'rotate(0deg)',
//           transition: 'transform 0.15s',
//           flexShrink: 0,
//         }}>▾</span>
//       </div>

//       {/* Expanded details */}
//       {expanded && (
//         <div style={{
//           padding: '10px 12px',
//           borderTop: `1px solid ${C.borderLight}`,
//           background: C.bgSoft,
//         }}>
//           {/* Rejection reason if any */}
//           {item.status === 'rejected' && item.review_note && (
//             <div style={{
//               padding: '8px 10px',
//               background: C.redBg, border: `1px solid ${C.redBorder}`, borderRadius: 5,
//               fontSize: 11.5, color: C.red, marginBottom: 8,
//             }}>
//               <b>Rejection reason:</b> {item.review_note}
//             </div>
//           )}

//           {/* Notice edit — show changed fields */}
//           {item.type === 'notice_edit' && item.payload?.changed_fields?.length > 0 && (
//             <div style={{ marginBottom: 8 }}>
//               <div style={{
//                 fontSize: 10, fontWeight: 800, color: C.muted,
//                 textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 4,
//               }}>
//                 Changed Fields
//               </div>
//               <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
//                 {item.payload.changed_fields.map((field) => (
//                   <div key={field} style={{ fontSize: 11.5, color: C.slate }}>
//                     <b>{field}:</b>{' '}
//                     <span style={{ color: C.red, textDecoration: 'line-through' }}>
//                       {item.payload.old_values?.[field] || '—'}
//                     </span>
//                     {' → '}
//                     <span style={{ color: C.green, fontWeight: 700 }}>
//                       {item.payload.new_values?.[field] || '—'}
//                     </span>
//                   </div>
//                 ))}
//               </div>
//             </div>
//           )}

//           {/* Summary preview */}
//           {item.type === 'summary' && item.payload?.description && (
//             <div style={{
//               padding: '8px 10px',
//               background: '#fff', border: `1px solid ${C.borderLight}`, borderRadius: 5,
//               fontSize: 11.5, color: C.ink, lineHeight: 1.5, marginBottom: 8,
//               whiteSpace: 'pre-wrap',
//             }}>
//               {item.payload.description}
//             </div>
//           )}

//           {/* Reply — show View button */}
//           {item.type === 'reply' && (
//             <button
//               onClick={() => onViewReply(item)}
//               style={{
//                 padding: '5px 12px', borderRadius: 5,
//                 border: 'none', background: `linear-gradient(135deg, ${C.navy}, ${C.blue})`,
//                 color: '#fff', fontSize: 11, fontWeight: 700, cursor: 'pointer',
//                 fontFamily: SANS,
//               }}
//             >
//               View Reply →
//             </button>
//           )}

//           {/* Ack — show Open PDF button */}
//           {item.type === 'ack' && (
//             <button
//               onClick={() => onOpenAck(item)}
//               style={{
//                 padding: '5px 12px', borderRadius: 5,
//                 border: 'none', background: `linear-gradient(135deg, ${C.navy}, ${C.blue})`,
//                 color: '#fff', fontSize: 11, fontWeight: 700, cursor: 'pointer',
//                 fontFamily: SANS,
//               }}
//             >
//               Open PDF →
//             </button>
//           )}

//           {/* Notice — show View button */}
//           {item.type === 'notice' && (
//             <button
//               onClick={() => onOpenNotice(item.notice_id)}
//               style={{
//                 padding: '5px 12px', borderRadius: 5,
//                 border: 'none', background: `linear-gradient(135deg, ${C.navy}, ${C.blue})`,
//                 color: '#fff', fontSize: 11, fontWeight: 700, cursor: 'pointer',
//                 fontFamily: SANS,
//               }}
//             >
//               View Notice →
//             </button>
//           )}

//           <div style={{ fontSize: 10, color: C.muted, marginTop: 6 }}>
//             {item.status === 'approved' ? 'Approved by' : item.status === 'rejected' ? 'Rejected by' : 'Reviewed by'}
//             {' '}<b>{item.reviewed_by_name || 'Unknown'}</b> on {fmtDateTime(item._sortDate)}
//           </div>
//         </div>
//       )}
//     </div>
//   );
// }

// // ══════════════════════════════════════════════════════════════════
// // ACK REVIEW CARD — for pending acknowledgments
// // ══════════════════════════════════════════════════════════════════
// function AckReviewCard({ item, busy, canApprove, canReject, onOpenPdf, onApprove, onReject }) {
//   const meta = ACTION_META.ack_review;
//   const statusMeta = STATUS_META[item.status] || STATUS_META.pending;
//   const submitterInitial = (item.submitted_by_name || 'U').charAt(0).toUpperCase();

//   return (
//     <div style={{
//       background: '#fff', border: `1px solid ${C.border}`, borderRadius: 10,
//       padding: 14, boxShadow: '0 1px 3px rgba(15,23,42,0.04)',
//     }}>
//       {/* Top row */}
//       <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12, marginBottom: 12 }}>
//         <div style={{ display: 'flex', alignItems: 'center', gap: 10, flex: 1, minWidth: 0 }}>
//           <div style={{
//             width: 32, height: 32, borderRadius: 8, flexShrink: 0,
//             background: meta.bg, border: `1.5px solid ${meta.border}`,
//             display: 'flex', alignItems: 'center', justifyContent: 'center',
//             fontSize: 15, color: meta.color,
//           }}>{meta.icon}</div>

//           <div style={{ minWidth: 0, flex: 1 }}>
//             <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
//               <span style={{ fontSize: 13, fontWeight: 700, color: C.ink }}>{meta.label}</span>
//               {item.notice?.din_number && (
//                 <span style={{
//                   fontSize: 10, fontWeight: 700, color: C.slate,
//                   background: C.bg, padding: '1px 7px', borderRadius: 99,
//                   border: `1px solid ${C.border}`,
//                 }}>
//                   DIN {item.notice.din_number}
//                 </span>
//               )}
//               <span style={{
//                 fontSize: 9.5, fontWeight: 800, padding: '2px 8px', borderRadius: 999,
//                 background: statusMeta.bg, color: statusMeta.color,
//                 border: `1px solid ${statusMeta.border}`,
//                 textTransform: 'uppercase', letterSpacing: '0.04em',
//               }}>
//                 {statusMeta.label}
//               </span>
//             </div>
//             <div style={{ fontSize: 11, color: C.muted, marginTop: 2 }}>
//               Uploaded by <b style={{ color: C.slate }}>{item.submitted_by_name}</b> · {fmtDateTime(item.submitted_at)}
//             </div>
//           </div>
//         </div>

//         <div style={{
//           width: 28, height: 28, borderRadius: '50%', flexShrink: 0,
//           background: `linear-gradient(135deg, ${C.navy}, ${C.navyMid})`,
//           color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center',
//           fontSize: 11, fontWeight: 700,
//         }}>{submitterInitial}</div>
//       </div>

//       {/* Two column layout: PDF file on LEFT, actions on RIGHT */}
//       <div style={{
//         display: 'grid',
//         gridTemplateColumns: '1fr auto',
//         gap: 12,
//         alignItems: 'center',
//       }}>
//         {/* LEFT: PDF file — click to open */}
//         <div
//           onClick={onOpenPdf}
//           style={{
//             display: 'flex', alignItems: 'center', gap: 10,
//             padding: '10px 12px',
//             background: C.bgSoft,
//             border: `1px solid ${C.borderLight}`,
//             borderRadius: 6,
//             cursor: 'pointer',
//             transition: 'all .15s',
//           }}
//           onMouseEnter={(e) => {
//             e.currentTarget.style.background = C.blueBg;
//             e.currentTarget.style.borderColor = C.blueBorder;
//           }}
//           onMouseLeave={(e) => {
//             e.currentTarget.style.background = C.bgSoft;
//             e.currentTarget.style.borderColor = C.borderLight;
//           }}
//         >
//           <span style={{ fontSize: 20, flexShrink: 0 }}>📄</span>
//           <div style={{ flex: 1, minWidth: 0 }}>
//             <div style={{
//               fontSize: 12.5, fontWeight: 700, color: C.ink,
//               overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
//               lineHeight: 1.3,
//             }} title={item.file_name}>
//               {item.file_name}
//             </div>
//             <div style={{ fontSize: 10.5, color: C.blue, marginTop: 2, fontWeight: 600 }}>
//               Click to open PDF →
//             </div>
//           </div>
//         </div>

//         {/* RIGHT: Action buttons */}
//         {(canApprove || canReject) && (
//           <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
//             {canReject && (
//               <button
//                 onClick={onReject}
//                 disabled={busy}
//                 style={{
//                   padding: '7px 14px', borderRadius: 7,
//                   border: `1.5px solid ${C.redBorder}`,
//                   background: '#fff', color: C.red,
//                   fontSize: 12, fontWeight: 700, cursor: busy ? 'wait' : 'pointer',
//                   fontFamily: SANS, opacity: busy ? 0.5 : 1,
//                 }}
//               >
//                 Reject
//               </button>
//             )}
//             {canApprove && (
//               <button
//                 onClick={onApprove}
//                 disabled={busy}
//                 style={{
//                   padding: '7px 18px', borderRadius: 7,
//                   border: 'none',
//                   background: busy ? C.muted : `linear-gradient(135deg, ${C.green}, #0F7A5A)`,
//                   color: '#fff',
//                   fontSize: 12, fontWeight: 700, cursor: busy ? 'wait' : 'pointer',
//                   fontFamily: SANS, boxShadow: '0 2px 6px rgba(15,122,90,0.25)',
//                 }}
//               >
//                 {busy ? 'Working…' : '✓ Approve'}
//               </button>
//             )}
//           </div>
//         )}
//       </div>

//       {/* Rejection reason if any */}
//       {item.status === 'rejected' && item.review_note && (
//         <div style={{
//           marginTop: 10, padding: '9px 12px',
//           background: C.redBg, border: `1px solid ${C.redBorder}`, borderRadius: 7,
//           fontSize: 12, color: C.red,
//         }}>
//           <div style={{ fontSize: 10, fontWeight: 800, marginBottom: 3, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
//             Rejection reason
//           </div>
//           <div style={{ lineHeight: 1.5, whiteSpace: 'pre-wrap' }}>{item.review_note}</div>
//           {item.reviewed_by_name && (
//             <div style={{ fontSize: 10, color: C.muted, marginTop: 4 }}>
//               — {item.reviewed_by_name} · {fmtDateTime(item.reviewed_at)}
//             </div>
//           )}
//         </div>
//       )}

//       {/* Approval info */}
//       {item.status === 'approved' && item.reviewed_by_name && (
//         <div style={{
//           marginTop: 10, padding: '7px 12px',
//           background: C.greenBg, border: `1px solid ${C.greenBorder}`, borderRadius: 7,
//           fontSize: 11, color: C.green, fontWeight: 600,
//         }}>
//           ✅ Approved by {item.reviewed_by_name} · {fmtDateTime(item.reviewed_at)}
//         </div>
//       )}
//     </div>
//   );
// }

// // ══════════════════════════════════════════════════════════════════
// // SUMMARY REVIEW CARD (unchanged from your version)
// // ══════════════════════════════════════════════════════════════════
// function SummaryReviewCard({ review, busy, canApprove, canReject, onApprove, onReject }) {
//   const meta = ACTION_META.summary;
//   const statusMeta = STATUS_META[review.status] || STATUS_META.pending;
//   const submitterInitial = (review.submitted_by_name || 'U').charAt(0).toUpperCase();
//   const summaryText = review.payload?.description || '(empty)';

//   return (
//     <div style={{
//       background: '#fff', border: `1px solid ${C.border}`, borderRadius: 10,
//       padding: 14, boxShadow: '0 1px 3px rgba(15,23,42,0.04)',
//     }}>
//       <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12, marginBottom: 10 }}>
//         <div style={{ display: 'flex', alignItems: 'center', gap: 10, flex: 1, minWidth: 0 }}>
//           <div style={{
//             width: 32, height: 32, borderRadius: 8, flexShrink: 0,
//             background: meta.bg, border: `1.5px solid ${meta.border}`,
//             display: 'flex', alignItems: 'center', justifyContent: 'center',
//             fontSize: 15, color: meta.color,
//           }}>{meta.icon}</div>

//           <div style={{ minWidth: 0, flex: 1 }}>
//             <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
//               <span style={{ fontSize: 13, fontWeight: 700, color: C.ink }}>{meta.label}</span>
//               <span style={{
//                 fontSize: 9.5, fontWeight: 800, padding: '2px 8px', borderRadius: 999,
//                 background: statusMeta.bg, color: statusMeta.color,
//                 border: `1px solid ${statusMeta.border}`,
//                 textTransform: 'uppercase', letterSpacing: '0.04em',
//               }}>
//                 {statusMeta.label}
//               </span>
//               {review.escalated_to_founder && (
//                 <span style={{
//                   fontSize: 9, fontWeight: 800, padding: '2px 7px', borderRadius: 999,
//                   background: C.purpleBg, color: C.purple, border: `1px solid ${C.purpleBorder}`,
//                   textTransform: 'uppercase', letterSpacing: '0.04em',
//                 }}>
//                   ↑ CEO
//                 </span>
//               )}
//             </div>
//             <div style={{ fontSize: 11, color: C.muted, marginTop: 2 }}>
//               Submitted by <b style={{ color: C.slate }}>{review.submitted_by_name}</b> · {fmtDateTime(review.submitted_at)}
//             </div>
//           </div>
//         </div>

//         <div style={{
//           width: 28, height: 28, borderRadius: '50%', flexShrink: 0,
//           background: `linear-gradient(135deg, ${C.navy}, ${C.navyMid})`,
//           color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center',
//           fontSize: 11, fontWeight: 700,
//         }}>{submitterInitial}</div>
//       </div>

//       <div style={{
//         padding: '10px 12px', background: C.bgSoft,
//         border: `1px solid ${C.borderLight}`, borderRadius: 7,
//         marginBottom: (canApprove || canReject) ? 10 : 0,
//       }}>
//         <div style={{ fontSize: 10, fontWeight: 800, color: C.muted, marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
//           Summary Text
//         </div>
//         <div style={{ fontSize: 12.5, color: C.ink, lineHeight: 1.55, whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
//           {summaryText}
//         </div>
//       </div>

//       {(canApprove || canReject) && (
//         <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', flexWrap: 'wrap' }}>
//           {canReject && (
//             <button
//               onClick={onReject}
//               disabled={busy}
//               style={{
//                 padding: '7px 14px', borderRadius: 7,
//                 border: `1.5px solid ${C.redBorder}`,
//                 background: '#fff', color: C.red,
//                 fontSize: 12, fontWeight: 700, cursor: busy ? 'wait' : 'pointer',
//                 fontFamily: SANS, opacity: busy ? 0.5 : 1,
//               }}
//             >
//               Reject
//             </button>
//           )}
//           {canApprove && (
//             <button
//               onClick={onApprove}
//               disabled={busy}
//               style={{
//                 padding: '7px 18px', borderRadius: 7,
//                 border: 'none',
//                 background: busy ? C.muted : `linear-gradient(135deg, ${C.green}, #0F7A5A)`,
//                 color: '#fff',
//                 fontSize: 12, fontWeight: 700, cursor: busy ? 'wait' : 'pointer',
//                 fontFamily: SANS, boxShadow: '0 2px 6px rgba(15,122,90,0.25)',
//               }}
//             >
//               {busy ? 'Working…' : '✓ Approve'}
//             </button>
//           )}
//         </div>
//       )}
//     </div>
//   );
// }

// // ══════════════════════════════════════════════════════════════════
// // NOTICE EDIT REVIEW CARD (unchanged)
// // ══════════════════════════════════════════════════════════════════
// function NoticeEditReviewCard({ review, busy, canApprove, canReject, onApprove, onReject }) {
//   const meta = ACTION_META.notice_edit;
//   const statusMeta = STATUS_META[review.status] || STATUS_META.pending;
//   const submitterInitial = (review.submitted_by_name || 'U').charAt(0).toUpperCase();

//   const payload = review.payload || {};
//   const oldValues = payload.old_values || {};
//   const newValues = payload.new_values || {};
//   const changedFields = payload.changed_fields || [];
//   const noticeDin = payload.notice_din || '—';

//   const FIELD_LABELS = {
//     din_number: 'DIN Number',
//     officer: 'Officer',
//     section: 'Section',
//     notice_date: 'Notice Date',
//     due_date: 'Due Date',
//     ph_date: 'PH Date',
//     notes: 'Notes',
//   };

//   const fmtValue = (val) => {
//     if (val === null || val === undefined || val === '') return '—';
//     return String(val);
//   };

//   return (
//     <div style={{
//       background: '#fff', border: `1px solid ${C.border}`, borderRadius: 10,
//       padding: 14, boxShadow: '0 1px 3px rgba(15,23,42,0.04)',
//     }}>
//       <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12, marginBottom: 10 }}>
//         <div style={{ display: 'flex', alignItems: 'center', gap: 10, flex: 1, minWidth: 0 }}>
//           <div style={{
//             width: 32, height: 32, borderRadius: 8, flexShrink: 0,
//             background: meta.bg, border: `1.5px solid ${meta.border}`,
//             display: 'flex', alignItems: 'center', justifyContent: 'center',
//             fontSize: 15, color: meta.color,
//           }}>{meta.icon}</div>

//           <div style={{ minWidth: 0, flex: 1 }}>
//             <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
//               <span style={{ fontSize: 13, fontWeight: 700, color: C.ink }}>{meta.label}</span>
//               <span style={{
//                 fontSize: 10, fontWeight: 700, color: C.slate,
//                 background: C.bg, padding: '1px 7px', borderRadius: 99,
//                 border: `1px solid ${C.border}`,
//               }}>
//                 DIN {noticeDin}
//               </span>
//               <span style={{
//                 fontSize: 9.5, fontWeight: 800, padding: '2px 8px', borderRadius: 999,
//                 background: statusMeta.bg, color: statusMeta.color,
//                 border: `1px solid ${statusMeta.border}`,
//                 textTransform: 'uppercase', letterSpacing: '0.04em',
//               }}>
//                 {statusMeta.label}
//               </span>
//               {review.escalated_to_founder && (
//                 <span style={{
//                   fontSize: 9, fontWeight: 800, padding: '2px 7px', borderRadius: 999,
//                   background: C.purpleBg, color: C.purple, border: `1px solid ${C.purpleBorder}`,
//                   textTransform: 'uppercase', letterSpacing: '0.04em',
//                 }}>
//                   ↑ CEO
//                 </span>
//               )}
//             </div>
//             <div style={{ fontSize: 11, color: C.muted, marginTop: 2 }}>
//               Submitted by <b style={{ color: C.slate }}>{review.submitted_by_name}</b> · {fmtDateTime(review.submitted_at)}
//             </div>
//           </div>
//         </div>

//         <div style={{
//           width: 28, height: 28, borderRadius: '50%', flexShrink: 0,
//           background: `linear-gradient(135deg, ${C.navy}, ${C.navyMid})`,
//           color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center',
//           fontSize: 11, fontWeight: 700,
//         }}>{submitterInitial}</div>
//       </div>

//       <div style={{
//         padding: '10px 12px', background: C.bgSoft,
//         border: `1px solid ${C.borderLight}`, borderRadius: 7,
//         marginBottom: (canApprove || canReject) ? 10 : 0,
//       }}>
//         <div style={{
//           fontSize: 10, fontWeight: 800, color: C.muted,
//           marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.05em',
//         }}>
//           Changes Requested ({changedFields.length} field{changedFields.length !== 1 ? 's' : ''})
//         </div>

//         {changedFields.length === 0 ? (
//           <div style={{ fontSize: 12, color: C.muted, fontStyle: 'italic' }}>
//             No changes detected
//           </div>
//         ) : (
//           <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
//             {changedFields.map((field) => (
//               <div key={field} style={{
//                 display: 'flex', alignItems: 'flex-start', gap: 8,
//                 fontSize: 12,
//               }}>
//                 <span style={{
//                   fontSize: 10.5, fontWeight: 700, color: C.muted,
//                   minWidth: 100, textTransform: 'uppercase', letterSpacing: '0.04em',
//                   paddingTop: 1,
//                 }}>
//                   {FIELD_LABELS[field] || field}
//                 </span>
//                 <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
//                   <span style={{ color: C.red, textDecoration: 'line-through', fontWeight: 500 }}>
//                     {fmtValue(oldValues[field])}
//                   </span>
//                   <span style={{ color: C.muted, fontSize: 11 }}>→</span>
//                   <span style={{ color: C.green, fontWeight: 700 }}>
//                     {fmtValue(newValues[field])}
//                   </span>
//                 </div>
//               </div>
//             ))}
//           </div>
//         )}
//       </div>

//       {(canApprove || canReject) && (
//         <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', flexWrap: 'wrap' }}>
//           {canReject && (
//             <button
//               onClick={onReject}
//               disabled={busy}
//               style={{
//                 padding: '7px 14px', borderRadius: 7,
//                 border: `1.5px solid ${C.redBorder}`,
//                 background: '#fff', color: C.red,
//                 fontSize: 12, fontWeight: 700, cursor: busy ? 'wait' : 'pointer',
//                 fontFamily: SANS, opacity: busy ? 0.5 : 1,
//               }}
//             >
//               Reject
//             </button>
//           )}
//           {canApprove && (
//             <button
//               onClick={onApprove}
//               disabled={busy}
//               style={{
//                 padding: '7px 18px', borderRadius: 7,
//                 border: 'none',
//                 background: busy ? C.muted : `linear-gradient(135deg, ${C.green}, #0F7A5A)`,
//                 color: '#fff',
//                 fontSize: 12, fontWeight: 700, cursor: busy ? 'wait' : 'pointer',
//                 fontFamily: SANS, boxShadow: '0 2px 6px rgba(15,122,90,0.25)',
//               }}
//             >
//               {busy ? 'Working…' : '✓ Approve'}
//             </button>
//           )}
//         </div>
//       )}
//     </div>
//   );
// }

// // ══════════════════════════════════════════════════════════════════
// // NOTICE REVIEW CARD (unchanged)
// // ══════════════════════════════════════════════════════════════════
// function NoticeReviewCard({ item, onView }) {
//   const meta = ACTION_META.notice_review;
//   const statusMeta = STATUS_META[item.status] || STATUS_META.pending;
//   const submitterInitial = (item.submitted_by_name || 'U').charAt(0).toUpperCase();

//   return (
//     <div style={{
//       background: '#fff', border: `1px solid ${C.border}`, borderRadius: 10,
//       padding: 14, boxShadow: '0 1px 3px rgba(15,23,42,0.04)',
//     }}>
//       <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12, marginBottom: 10 }}>
//         <div style={{ display: 'flex', alignItems: 'center', gap: 10, flex: 1, minWidth: 0 }}>
//           <div style={{
//             width: 32, height: 32, borderRadius: 8, flexShrink: 0,
//             background: meta.bg, border: `1.5px solid ${meta.border}`,
//             display: 'flex', alignItems: 'center', justifyContent: 'center',
//             fontSize: 15, color: meta.color,
//           }}>{meta.icon}</div>

//           <div style={{ minWidth: 0, flex: 1 }}>
//             <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
//               <span style={{ fontSize: 13, fontWeight: 700, color: C.ink }}>{meta.label}</span>
//               <span style={{
//                 fontSize: 9.5, fontWeight: 800, padding: '2px 8px', borderRadius: 999,
//                 background: statusMeta.bg, color: statusMeta.color,
//                 border: `1px solid ${statusMeta.border}`,
//                 textTransform: 'uppercase', letterSpacing: '0.04em',
//               }}>
//                 {statusMeta.label}
//               </span>
//             </div>
//             <div style={{ fontSize: 11, color: C.muted, marginTop: 2 }}>
//               Submitted by <b style={{ color: C.slate }}>{item.submitted_by_name}</b> · {fmtDateTime(item.submitted_at)}
//             </div>
//           </div>
//         </div>

//         <div style={{
//           width: 28, height: 28, borderRadius: '50%', flexShrink: 0,
//           background: `linear-gradient(135deg, ${C.navy}, ${C.navyMid})`,
//           color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center',
//           fontSize: 11, fontWeight: 700,
//         }}>{submitterInitial}</div>
//       </div>

//       <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
//         <button
//           onClick={onView}
//           style={{
//             padding: '7px 18px', borderRadius: 7,
//             border: 'none',
//             background: `linear-gradient(135deg, ${C.navy}, ${C.blue})`,
//             color: '#fff',
//             fontSize: 12, fontWeight: 700, cursor: 'pointer',
//             fontFamily: SANS, boxShadow: '0 2px 6px rgba(37,99,235,0.25)',
//           }}
//         >
//           View Notice →
//         </button>
//       </div>
//     </div>
//   );
// }

// // ══════════════════════════════════════════════════════════════════
// // REPLY REVIEW CARD (unchanged)
// // ══════════════════════════════════════════════════════════════════
// function ReplyReviewCard({ item, onView, canReview, buttonLabel = 'Review Reply →' }) {
//   const meta = ACTION_META.reply_review;
//   const statusMeta = STATUS_META[item.status] || STATUS_META.pending;
//   const submitterInitial = (item.submitted_by_name || 'U').charAt(0).toUpperCase();

//   return (
//     <div style={{
//       background: '#fff', border: `1px solid ${C.border}`, borderRadius: 10,
//       padding: 14, boxShadow: '0 1px 3px rgba(15,23,42,0.04)',
//     }}>
//       <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12, marginBottom: 10 }}>
//         <div style={{ display: 'flex', alignItems: 'center', gap: 10, flex: 1, minWidth: 0 }}>
//           <div style={{
//             width: 32, height: 32, borderRadius: 8, flexShrink: 0,
//             background: meta.bg, border: `1.5px solid ${meta.border}`,
//             display: 'flex', alignItems: 'center', justifyContent: 'center',
//             fontSize: 15, color: meta.color,
//           }}>{meta.icon}</div>

//           <div style={{ minWidth: 0, flex: 1 }}>
//             <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
//               <span style={{ fontSize: 13, fontWeight: 700, color: C.ink }}>{meta.label}</span>
//               <span style={{
//                 fontSize: 9.5, fontWeight: 800, padding: '2px 8px', borderRadius: 999,
//                 background: statusMeta.bg, color: statusMeta.color,
//                 border: `1px solid ${statusMeta.border}`,
//                 textTransform: 'uppercase', letterSpacing: '0.04em',
//               }}>
//                 {statusMeta.label}
//               </span>
//               {item.escalated_to_founder && (
//                 <span style={{
//                   fontSize: 9, fontWeight: 800, padding: '2px 7px', borderRadius: 999,
//                   background: C.purpleBg, color: C.purple, border: `1px solid ${C.purpleBorder}`,
//                   textTransform: 'uppercase', letterSpacing: '0.04em',
//                 }}>
//                   ↑ CEO
//                 </span>
//               )}
//             </div>
//             <div style={{ fontSize: 11, color: C.muted, marginTop: 2 }}>
//               Submitted by <b style={{ color: C.slate }}>{item.submitted_by_name}</b> · {fmtDateTime(item.submitted_at)}
//             </div>
//           </div>
//         </div>

//         <div style={{
//           width: 28, height: 28, borderRadius: '50%', flexShrink: 0,
//           background: `linear-gradient(135deg, ${C.navy}, ${C.navyMid})`,
//           color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center',
//           fontSize: 11, fontWeight: 700,
//         }}>{submitterInitial}</div>
//       </div>

//       <div style={{
//         padding: '8px 12px', background: C.bgSoft,
//         border: `1px solid ${C.borderLight}`, borderRadius: 7,
//         marginBottom: 10,
//         display: 'flex', flexWrap: 'wrap', gap: 16, alignItems: 'center',
//         fontSize: 11.5,
//       }}>
//         {item.title && <InlineField label="Reply" value={item.title} />}
//         {item.notice?.din_number && <InlineField label="DIN" value={item.notice.din_number} />}
//         {item.notice?.officer && <InlineField label="Officer" value={item.notice.officer} />}
//         {item.notice?.section && <InlineField label="Section" value={item.notice.section} />}
//       </div>

//       {canReview && (
//         <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
//           <button
//             onClick={onView}
//             style={{
//               padding: '7px 18px', borderRadius: 7,
//               border: 'none',
//               background: `linear-gradient(135deg, ${C.navy}, ${C.blue})`,
//               color: '#fff',
//               fontSize: 12, fontWeight: 700, cursor: 'pointer',
//               fontFamily: SANS, boxShadow: '0 2px 6px rgba(37,99,235,0.25)',
//             }}
//           >
//             {buttonLabel}
//           </button>
//         </div>
//       )}
//     </div>
//   );
// }

// function InlineField({ label, value }) {
//   return (
//     <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
//       <span style={{ fontSize: 9.5, fontWeight: 700, color: C.muted, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
//         {label}:
//       </span>
//       <span style={{ fontSize: 11.5, color: C.ink, fontWeight: 600 }}>
//         {value}
//       </span>
//     </div>
//   );
// }


















































import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { api } from '../../services/api';
import { useAuth } from '../../contexts/AuthContext';
import RejectModal, { AcceptModal } from './RejectModal';
import { NoticeDetailModal } from './AddNoticeModal';
import ReplyEditorModal from './ReplyEditorModal';

/* ─── LOCAL API DEFINITIONS ─── */
const reviewApi = {
  list: (params) => api.get('/legal-services/reviews/', { params }),
  approve: (id) => api.post(`/legal-services/reviews/${id}/approve/`),
  reject: (id, reason) => api.post(`/legal-services/reviews/${id}/reject/`, { reason }),
  escalate: (id) => api.post(`/legal-services/reviews/${id}/escalate/`),
};

const noticeApi = {
  list: (params) => api.get('/legal-services/notices/', { params }),
};

const replyApi = {
  list: (params) => api.get('/legal-services/notice-replies/', { params }),
};

const noticeDocApi = {
  approve: (id) => api.post(`/legal-services/notice-documents/${id}/approve/`),
  reject: (id, reason) => api.post(`/legal-services/notice-documents/${id}/reject/`, { reason }),
};

const SANS = "'Roboto', sans-serif";

const C = {
  navy: '#1E3A6B', navyMid: '#2A4F8F', ink: '#0F172A',
  slate: '#475569', muted: '#94A3B8',
  border: '#E8ECF4', borderLight: '#F1F5F9',
  bg: '#F8FAFC', bgSoft: '#FBFCFE',
  green: '#0F7A5A', greenBg: '#E6F5EF', greenBorder: '#B4DFCF',
  red: '#B42318', redBg: '#FCEBEA', redBorder: '#F2C1BC',
  amber: '#92620B', amberBg: '#FBF2DE', amberBorder: '#F0DDA3',
  purple: '#6D28D9', purpleBg: '#F1E8FE', purpleBorder: '#DCC8FA',
  blue: '#2563EB', blueBg: '#E8F0FE', blueBorder: '#C5D5EF',
};

const ACTION_META = {
  summary:        { label: 'Case Summary Update',  icon: '📝', color: C.purple, bg: C.purpleBg, border: C.purpleBorder },
  notice_edit:    { label: 'Notice Info Update',   icon: '✎',  color: C.blue,   bg: C.blueBg,   border: C.blueBorder },
  notice_review:  { label: 'Notice Review',        icon: '📋', color: C.navy,   bg: C.blueBg,   border: C.blueBorder },
  reply_review:   { label: 'Reply Document',       icon: '📄', color: C.navy,   bg: C.blueBg,   border: C.blueBorder },
  ack_review:     { label: 'Acknowledgment',       icon: '📥', color: C.purple, bg: C.purpleBg, border: C.purpleBorder },
  closure_review: { label: 'Case Closure Request', icon: '🔒', color: C.red,    bg: '#FEF3EE',  border: '#FED7AA' },
};

const STATUS_META = {
  pending:   { label: 'Pending',   color: C.amber, bg: C.amberBg, border: C.amberBorder },
  approved:  { label: 'Approved',  color: C.green, bg: C.greenBg, border: C.greenBorder },
  accepted:  { label: 'Approved',  color: C.green, bg: C.greenBg, border: C.greenBorder },
  rejected:  { label: 'Rejected',  color: C.red,   bg: C.redBg,   border: C.redBorder },
  escalated: { label: 'Escalated', color: C.purple,bg: C.purpleBg,border: C.purpleBorder },
};

const HIGH_ADMIN_ROLES = ['Admin', 'Founder'];

function fmtDateTime(d) {
  if (!d) return '';
  return new Date(d).toLocaleString('en-IN', {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit', hour12: true,
  });
}

function fmtDate(d) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}

function fmtRelativeTime(d) {
  if (!d) return '';
  const diff = Math.floor((Date.now() - new Date(d)) / 1000);
  if (diff < 60) return 'just now';
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  if (diff < 604800) return `${Math.floor(diff / 86400)}d ago`;
  return fmtDate(d);
}

const handleDownloadFile = async (fileUrl, fileName) => {
  if (!fileUrl) return;
  try {
    const response = await fetch(fileUrl); const blob = await response.blob();
    const url = window.URL.createObjectURL(blob); const link = document.createElement('a');
    link.href = url; link.download = fileName || 'download'; document.body.appendChild(link);
    link.click(); document.body.removeChild(link); window.URL.revokeObjectURL(url);
  } catch (e) { console.error('Download failed', e); }
};

// ══════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ══════════════════════════════════════════════════════════════════
export default function ReviewTabV2({ clientId: propClientId, courtCaseId, litigationType, refreshTick, caseData }) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const params = useParams();
  const clientId = propClientId || params.clientId;

  const [reviews, setReviews] = useState([]);
  const [notices, setNotices] = useState([]);
  const [replies, setReplies] = useState([]);
  const [ackDocs, setAckDocs] = useState([]); 
  const [pendingReplyDocs, setPendingReplyDocs] = useState([]); 
  const [pendingSupportDocs, setPendingSupportDocs] = useState([]); 
  const [closureCase, setClosureCase] = useState(null);
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [busyId, setBusyId] = useState(null);

  const [rejectTarget, setRejectTarget] = useState(null);
  const [acceptTarget, setAcceptTarget] = useState(null);

  const [selectedNoticeId, setSelectedNoticeId] = useState(null);
  const [replyModalData, setReplyModalData] = useState(null);
  const [filter, setFilter] = useState('all');

  const [historyOpen, setHistoryOpen] = useState(false);
  const [historyFilter, setHistoryFilter] = useState('all');
  const [expandedHistoryId, setExpandedHistoryId] = useState(null);

  const isFounder = user?.role === 'Founder';
  const isHighAdmin = HIGH_ADMIN_ROLES.includes(user?.role);

  const load = useCallback(async () => {
    if (!courtCaseId) return;
    setLoading(true); setError(null);
    try {
      const [reviewsRes, noticesRes, caseRes] = await Promise.all([
        reviewApi.list({ court_case: courtCaseId }),
        noticeApi.list({ court_case: courtCaseId }),
        api.get(`/legal-services/court-cases/${courtCaseId}/`),
      ]);
      const reviewData = Array.isArray(reviewsRes.data) ? reviewsRes.data : (reviewsRes.data.results || []);
      const noticeData = Array.isArray(noticesRes.data) ? noticesRes.data : (noticesRes.data.results || []);

      setReviews(reviewData.filter(r => r.action_type === 'summary' || r.action_type === 'notice_edit'));
      setNotices(noticeData.filter(n => n.review_status && n.review_status !== 'not_applicable'));
      setClosureCase(caseRes.data);

      const allAckDocs = [];
      const allPendingReplyDocs = [];
      const allPendingSupportDocs = [];

      noticeData.forEach(n => {
        (n.documents || []).forEach(d => {
          if (d.doc_type === 'acknowledgment') {
            allAckDocs.push({ ...d, notice: n });
          } else if (d.doc_type === 'pending' || (d.doc_type === 'reply' && d.review_status !== 'approved')) {
            allPendingReplyDocs.push({ ...d, notice: n });
          } else if (d.doc_type === 'pending_support' || (d.doc_type === 'supporting_doc' && d.review_status !== 'approved')) {
            allPendingSupportDocs.push({ ...d, notice: n });
          }
        });
      });
      setAckDocs(allAckDocs);
      setPendingReplyDocs(allPendingReplyDocs);
      setPendingSupportDocs(allPendingSupportDocs);

      if (noticeData.length > 0) {
        const replyPromises = noticeData.map((n) =>
          replyApi.list({ notice: n.id })
            .then(r => {
              const list = Array.isArray(r.data) ? r.data : (r.data.results || []);
              return list.map(reply => ({ ...reply, notice: n }));
            })
            .catch(() => [])
        );
        const replyResults = await Promise.all(replyPromises);
        setReplies(replyResults.flat().filter(r => r.status !== 'draft'));
      } else {
        setReplies([]);
      }
    } catch (e) { setError('Failed to load reviews.'); } finally { setLoading(false); }
  }, [courtCaseId]);

  useEffect(() => { load(); }, [load, refreshTick]);

  const canApproveReviewRequest = (review) => {
    if (review.viewer_role === 'submitter') return false;
    if (review.status === 'escalated') return isHighAdmin;
    if (review.status === 'pending') return ['admin', 'founder', 'checker'].includes(review.viewer_role);
    return false;
  };
  const canRejectReviewRequest = (review) => canApproveReviewRequest(review);

  const handleApproveReviewRequest = (review) => {
    if (review.status === 'escalated') {
      setBusyId(review.id);
      reviewApi.approve(review.id).then(() => load()).catch((e) => alert(e?.response?.data?.error || 'Failed to approve.')).finally(() => setBusyId(null));
      return;
    }
    setAcceptTarget({ ...review, _kind: 'review_request' });
  };
  const handleRejectReviewRequest = (review) => setRejectTarget({ ...review, _kind: 'review_request' });

  const canReviewDoc = (doc) => {
    const userId = user?.id;
    const isSubmitter = doc.uploaded_by === userId;
    const isAssignedChecker = (caseData?.checkers || []).some((c) => c.id === userId);
    const isCeoRole = user?.role === 'Founder';

    if (isSubmitter) return false;
    if (doc.status === 'pending' || doc.review_status === 'pending') return isAssignedChecker || isCeoRole;
    if (doc.status === 'escalated' || doc.review_status === 'escalated') return isCeoRole;
    return false;
  };

  const handleApproveDoc = (doc) => setAcceptTarget({ ...doc, _kind: 'doc' });
  const handleRejectDoc = (doc) => setRejectTarget({ ...doc, _kind: 'doc' });
  const handleOpenDocPdf = (url) => { if (url) window.open(url, '_blank', 'noopener,noreferrer'); };

  const canReviewClosure = (bundleItem) => {
    const userId = user?.id;
    const isSubmitter = bundleItem.submitted_by_id === userId;
    const isAssignedChecker = (caseData?.checkers || []).some((c) => c.id === userId);
    const isCeoRole = user?.role === 'Founder';
    if (isSubmitter) return false;
    if (bundleItem.status === 'pending') return isAssignedChecker || isCeoRole;
    if (bundleItem.status === 'escalated') return isCeoRole;
    return false;
  };
  const handleApproveClosure = (bundleItem) => setAcceptTarget({ ...bundleItem, _kind: 'closure' });
  const handleRejectClosure = (bundleItem) => setRejectTarget({ ...bundleItem, _kind: 'closure' });

  const doAccept = async (moveToCeo) => {
    const target = acceptTarget;
    const id = target.id;
    setBusyId(id);
    try {
      if (target._kind === 'closure') {
        const caseId = target.court_case_id;
        if (moveToCeo) await api.post(`/legal-services/court-cases/${caseId}/closure-escalate/`);
        else await api.post(`/legal-services/court-cases/${caseId}/closure-approve/`);
      } else if (target._kind === 'doc') {
        if (moveToCeo) await api.post(`/legal-services/notice-documents/${id}/escalate/`);
        else await noticeDocApi.approve(id);
      } else {
        if (moveToCeo) await reviewApi.escalate(id);
        else await reviewApi.approve(id);
      }
      setAcceptTarget(null);
      await load();
    } catch (e) { throw e; } finally { setBusyId(null); }
  };

  const doReject = async (reason) => {
    const target = rejectTarget;
    const id = target.id;
    setBusyId(id);
    try {
      if (target._kind === 'closure') {
        await api.post(`/legal-services/court-cases/${target.court_case_id}/closure-reject/`, { reason });
      } else if (target._kind === 'doc') {
        await noticeDocApi.reject(id, reason);
      } else {
        await reviewApi.reject(id, reason);
      }
      setRejectTarget(null);
      await load();
    } catch (e) { throw e; } finally { setBusyId(null); }
  };

  const summaryReviewItems = reviews.filter(r => r.action_type === 'summary').map(r => ({ ...r, type: 'summary', id: `summary-${r.id}`, _originalId: r.id, _sortDate: r.reviewed_at || r.submitted_at }));
  const noticeEditReviewItems = reviews.filter(r => r.action_type === 'notice_edit').map(r => ({ ...r, type: 'notice_edit', id: `edit-${r.id}`, _originalId: r.id, _sortDate: r.reviewed_at || r.submitted_at }));
  const noticeReviewItems = notices.map(n => ({ id: `notice-${n.id}`, type: 'notice', notice_id: n.id, action_type: 'notice_review', status: n.review_status === 'accepted' ? 'approved' : n.review_status, din_number: n.din_number, officer: n.officer, section: n.section, _sortDate: n.reviewed_at || n.updated_at, reviewed_by_name: n.reviewed_by_name, submitted_by_name: n.created_by_name, submitted_at: n.updated_at, escalated_to_founder: n.review_status === 'escalated' }));
  const replyReviewItems = replies.map(r => ({ id: `reply-${r.id}`, type: 'reply', reply_id: r.id, notice_id: r.notice?.id, notice: r.notice, action_type: 'reply_review', status: r.status, title: r.title, submitted_by_name: r.created_by_name, submitted_at: r.updated_at, _sortDate: r.reviewed_at || r.updated_at, review_note: r.review_note, reviewed_by_name: r.reviewed_by_name, reviewed_at: r.reviewed_at, escalated_to_founder: r.status === 'escalated' }));
  const ackReviewItems = ackDocs.map(a => ({ id: `ack-${a.id}`, type: 'ack', doc_id: a.id, notice_id: a.notice?.id, notice: a.notice, action_type: 'ack_review', status: a.review_status, file_name: a.file_name, file_url: a.file_url, uploaded_by: a.uploaded_by, submitted_by_name: a.uploaded_by_name, submitted_at: a.uploaded_at, _sortDate: a.reviewed_at || a.uploaded_at, review_note: a.review_note, reviewed_by_name: a.reviewed_by_name, reviewed_at: a.reviewed_at, escalated_to_founder: a.review_status === 'escalated' }));

  const uploadedReplyReviewItems = pendingReplyDocs.map(d => {
    const supports = pendingSupportDocs.filter(sd => String(sd.reply_version) === String(d.id));
    return {
      id: `up-reply-${d.id}`,
      type: 'uploaded_reply_bundle',
      doc_id: d.id, 
      notice_id: d.notice?.id,
      notice: d.notice,
      action_type: 'reply_review',
      status: d.review_status,
      file_name: d.file_name,
      file_url: d.file_url,
      reply_version: d.reply_version,
      support_docs: supports,
      uploaded_by: d.uploaded_by,
      submitted_by_name: d.uploaded_by_name,
      submitted_at: d.uploaded_at,
      _sortDate: d.reviewed_at || d.uploaded_at,
      review_note: d.review_note,
      reviewed_by_name: d.reviewed_by_name,
      reviewed_at: d.reviewed_at,
      escalated_to_founder: d.review_status === 'escalated',
    };
  });

  const closureBundleItems = [];
  if (closureCase && ['pending', 'escalated', 'approved', 'rejected'].includes(closureCase.closure_review_status)) {
    closureBundleItems.push({ id: `closure-${closureCase.id}`, type: 'closure', court_case_id: closureCase.id, action_type: 'closure_review', status: closureCase.closure_review_status, closure_documents: closureCase.closure_documents || [], submitted_by_id: closureCase.closure_submitted_by, submitted_by_name: closureCase.closure_submitted_by_name, submitted_at: closureCase.closure_submitted_at, _sortDate: closureCase.closure_reviewed_at || closureCase.closure_submitted_at, review_note: closureCase.closure_review_note, reviewed_by_name: closureCase.closure_reviewed_by_name, reviewed_at: closureCase.closure_reviewed_at, escalated_to_founder: closureCase.closure_review_status === 'escalated' });
  }

  const allItems = [
    ...summaryReviewItems, ...noticeEditReviewItems, ...noticeReviewItems,
    ...replyReviewItems, ...ackReviewItems, ...uploadedReplyReviewItems, ...closureBundleItems,
  ].sort((a, b) => new Date(b._sortDate) - new Date(a._sortDate));

  // ✅ STRICT SPLIT: Pending/Escalated stay in Active. Approved/Rejected go straight to History.
  const { activeItems, historyItems } = useMemo(() => {
    const active = [], completed = [];
    allItems.forEach(item => { 
      if (item.status === 'pending' || item.status === 'escalated') active.push(item); 
      else completed.push(item); 
    });
    active.sort((a, b) => new Date(b._sortDate) - new Date(a._sortDate));
    completed.sort((a, b) => new Date(b._sortDate) - new Date(a._sortDate));
    return { activeItems: active, historyItems: completed };
  }, [allItems]);

  // Filters
  const visibleActiveItems = filter === 'all' ? activeItems : activeItems.filter(r => r.status === filter);
  
  const visibleHistoryItems = historyItems.filter(r => {
    if (filter !== 'all' && r.status !== filter) return false;
    if (historyFilter === 'notice_edit') return r.type === 'notice_edit';
    if (historyFilter === 'reply') return r.type === 'reply' || r.type === 'uploaded_reply_bundle';
    if (historyFilter === 'ack') return r.type === 'ack';
    if (historyFilter === 'summary') return r.type === 'summary';
    return true;
  });

  const counts = {
    all: allItems.length,
    pending: allItems.filter(r => r.status === 'pending').length,
    approved: allItems.filter(r => r.status === 'approved').length,
    rejected: allItems.filter(r => r.status === 'rejected').length,
    escalated: allItems.filter(r => r.status === 'escalated').length,
  };

  const handleViewReply = (item) => { setReplyModalData({ noticeId: item.notice_id, notice: item.notice, replyId: item.reply_id }); };

  return (
    <div style={{ fontFamily: SANS }}>
      <div style={{ display: 'flex', gap: 6, marginBottom: 14, flexWrap: 'wrap', padding: '10px 14px', background: '#fff', border: `1px solid ${C.border}`, borderRadius: 10 }}>
        {['all', 'pending', 'approved', 'rejected', 'escalated'].map((f) => {
          const active = filter === f;
          const meta = f !== 'all' ? STATUS_META[f] : null;
          return (
            <button key={f} onClick={() => setFilter(f)} style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '5px 12px', borderRadius: 8, border: `1.5px solid ${active ? C.navy : C.border}`, background: active ? C.navy : '#fff', color: active ? '#fff' : C.slate, fontSize: 11.5, fontWeight: 700, cursor: 'pointer', textTransform: 'capitalize' }}>
              {f}
              <span style={{ background: active ? 'rgba(255,255,255,0.2)' : (meta?.bg || C.borderLight), color: active ? '#fff' : (meta?.color || C.slate), padding: '1px 6px', borderRadius: 999, fontSize: 10, fontWeight: 800, minWidth: 16, textAlign: 'center' }}>{counts[f]}</span>
            </button>
          );
        })}
      </div>

      {loading && <div style={{ padding: 40, textAlign: 'center', color: C.muted, fontSize: 13, background: '#fff', borderRadius: 10, border: `1px solid ${C.border}` }}>Loading reviews...</div>}
      {error && !loading && <div style={{ padding: 14, background: C.redBg, color: C.red, border: `1px solid ${C.redBorder}`, borderRadius: 10, fontSize: 12.5, fontWeight: 600 }}>{error}</div>}

      {!loading && !error && (
        <>
          {visibleActiveItems.length === 0 ? (
            <div style={{ padding: '40px 20px', textAlign: 'center', background: '#fff', borderRadius: 10, border: `1px solid ${C.border}`, marginBottom: 16 }}>
              <div style={{ fontSize: 32, marginBottom: 8, opacity: 0.6 }}>📋</div>
              <div style={{ color: C.slate, fontSize: 13, fontWeight: 600 }}>
                {filter === 'all' ? 'No active reviews pending.' : `No active ${filter} items.`}
              </div>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 16 }}>
              {visibleActiveItems.map((item) => renderItemCard(item, {
                busyId, canApproveReviewRequest, canRejectReviewRequest, handleApproveReviewRequest, handleRejectReviewRequest,
                canReviewDoc, handleApproveDoc, handleRejectDoc, handleOpenDocPdf, 
                handleViewReply: (i) => setReplyModalData({ noticeId: i.notice_id, notice: i.notice, replyId: i.reply_id }),
                canReviewClosure, handleApproveClosure, handleRejectClosure, 
                handleOpenClosureDoc: (doc) => { if (doc?.file_url) window.open(doc.file_url, '_blank', 'noopener,noreferrer'); },
                caseData, user, setSelectedNoticeId,
              }))}
            </div>
          )}

          {/* ✅ HISTORY SECTION ALWAYS VISIBLE AT BOTTOM */}
          <div style={{ background: '#fff', border: `1px solid ${C.border}`, borderRadius: 10, overflow: 'hidden' }}>
            <div onClick={() => setHistoryOpen(!historyOpen)} style={{ padding: '12px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer', background: historyOpen ? C.bgSoft : '#fff', borderBottom: historyOpen ? `1px solid ${C.border}` : 'none' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontSize: 12, color: C.slate, transform: historyOpen ? 'rotate(90deg)' : 'rotate(0deg)' }}>▶</span>
                <span style={{ fontSize: 13, fontWeight: 800, color: C.ink }}>History (Completed)</span>
                <span style={{ fontSize: 10.5, fontWeight: 700, color: C.muted, background: C.bg, border: `1px solid ${C.border}`, padding: '1px 8px', borderRadius: 99 }}>{historyItems.length}</span>
              </div>
              {historyOpen && (
                <select onClick={(e) => e.stopPropagation()} value={historyFilter} onChange={(e) => setHistoryFilter(e.target.value)} style={{ padding: '5px 10px', border: `1px solid ${C.border}`, borderRadius: 6, background: '#fff', outline: 'none' }}>
                  <option value="all">All Types</option>
                  <option value="notice_edit">Notice Info</option>
                  <option value="reply">Reply</option>
                  <option value="ack">Acknowledgment</option>
                </select>
              )}
            </div>
            {historyOpen && (
              <div style={{ padding: 8 }}>
                {visibleHistoryItems.length === 0 ? (
                  <div style={{ padding: 20, textAlign: 'center', color: C.muted, fontSize: 12, fontStyle: 'italic' }}>No completed items match this filter.</div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                    {visibleHistoryItems.map((item) => (
                      <HistoryRow key={item.id} item={item} expanded={expandedHistoryId === item.id} onToggle={() => setExpandedHistoryId(expandedHistoryId === item.id ? null : item.id)} onViewReply={(i) => setReplyModalData({ noticeId: i.notice_id, notice: i.notice, replyId: i.reply_id })} onOpenDoc={handleOpenDocPdf} onOpenNotice={setSelectedNoticeId} />
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </>
      )}

      {rejectTarget && <RejectModal review={rejectTarget} onClose={() => setRejectTarget(null)} onRejected={doReject} />}
      {acceptTarget && <AcceptModal review={acceptTarget} onClose={() => setAcceptTarget(null)} onAccepted={doAccept} showEscalate={!isFounder} />}
      {selectedNoticeId && <NoticeDetailModal noticeId={selectedNoticeId} canEdit={false} onClose={() => setSelectedNoticeId(null)} onUpdated={() => { setSelectedNoticeId(null); load(); }} />}
      {replyModalData && <ReplyEditorModal noticeId={replyModalData.noticeId} notice={replyModalData.notice} replyId={replyModalData.replyId} mode="review" currentUserId={user?.id} isAssignedMaker={(caseData?.makers || []).some((m) => m.id === user?.id)} isAssignedChecker={(caseData?.checkers || []).some((c) => c.id === user?.id)} isCeoRole={isFounder} onClose={() => setReplyModalData(null)} onSaved={() => { setReplyModalData(null); load(); }} />}
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════
// ITEM CARD RENDERER
// ══════════════════════════════════════════════════════════════════
function renderItemCard(item, ctx) {
  const { busyId, canApproveReviewRequest, canRejectReviewRequest, handleApproveReviewRequest, handleRejectReviewRequest, canReviewDoc, handleApproveDoc, handleRejectDoc, handleOpenDocPdf, handleViewReply, canReviewClosure, handleApproveClosure, handleRejectClosure, handleOpenClosureDoc, caseData, user, setSelectedNoticeId } = ctx;

  if (item.type === 'summary') return <SummaryReviewCard key={item.id} review={item} busy={busyId === item._originalId} canApprove={canApproveReviewRequest(item)} canReject={canRejectReviewRequest(item)} onApprove={() => handleApproveReviewRequest({ ...item, id: item._originalId })} onReject={() => handleRejectReviewRequest({ ...item, id: item._originalId })} />;
  if (item.type === 'notice_edit') return <NoticeEditReviewCard key={item.id} review={item} busy={busyId === item._originalId} canApprove={canApproveReviewRequest(item)} canReject={canRejectReviewRequest(item)} onApprove={() => handleApproveReviewRequest({ ...item, id: item._originalId })} onReject={() => handleRejectReviewRequest({ ...item, id: item._originalId })} />;
  if (item.type === 'notice') return <NoticeReviewCard key={item.id} item={item} onView={() => setSelectedNoticeId(item.notice_id)} />;
  
  if (item.type === 'reply') {
    const isAssignedChecker = (caseData?.checkers || []).some((c) => c.id === user?.id);
    const isCeoRole = user?.role === 'Founder' || user?.role === 'Admin';
    let canReviewThis = false; let buttonLabel = 'Review Reply →';
    if (item.status === 'pending') canReviewThis = isAssignedChecker || isCeoRole;
    else if (item.status === 'escalated') canReviewThis = isCeoRole;
    else if (item.status === 'approved' || item.status === 'rejected') { canReviewThis = (caseData?.makers || []).some((m) => m.id === user?.id) || isAssignedChecker || isCeoRole; buttonLabel = 'View Reply →'; }
    if (item.notice?.created_by === user?.id && item.status === 'pending') canReviewThis = false;
    return <ReplyReviewCard key={item.id} item={item} onView={() => handleViewReply(item)} canReview={canReviewThis} buttonLabel={buttonLabel} />;
  }

  // ✅ COMPACT ROW FOR UPLOADED REPLIES
  if (item.type === 'uploaded_reply_bundle') {
    const canReview = canReviewDoc(item);
    return <UploadedReplyBundleCard key={item.id} item={item} busy={busyId === item.doc_id} canApprove={canReview} canReject={canReview} onOpenPdf={(url) => handleOpenDocPdf(url)} onApprove={() => handleApproveDoc({ ...item, id: item.doc_id })} onReject={() => handleRejectDoc({ ...item, id: item.doc_id })} />;
  }

  // ACK CARD
  if (item.type === 'ack') {
    const canReview = canReviewDoc(item);
    return <AckReviewCard key={item.id} item={item} busy={busyId === item.doc_id} canApprove={canReview} canReject={canReview} onOpenPdf={(url) => handleOpenDocPdf(url)} onApprove={() => handleApproveDoc({ ...item, id: item.doc_id })} onReject={() => handleRejectDoc({ ...item, id: item.doc_id })} />;
  }

  if (item.type === 'closure') {
    const canReview = canReviewClosure(item);
    return <ClosureBundleCard key={item.id} item={item} busy={busyId === item.court_case_id} canApprove={canReview} canReject={canReview} onOpenDoc={handleOpenClosureDoc} onApprove={() => handleApproveClosure({ ...item, id: item.court_case_id })} onReject={() => handleRejectClosure({ ...item, id: item.court_case_id })} />;
  }
  return null;
}

// ══════════════════════════════════════════════════════════════════
// UPLOADED REPLY BUNDLE CARD (Row Layout for Checker)
// ══════════════════════════════════════════════════════════════════
function UploadedReplyBundleCard({ item, busy, canApprove, canReject, onOpenPdf, onApprove, onReject }) {
  const meta = ACTION_META.reply_review;
  const statusMeta = STATUS_META[item.status] || STATUS_META.pending;
  const submitterInitial = (item.submitted_by_name || 'U').charAt(0).toUpperCase();

  return (
    <div style={{ background: '#fff', border: `1px solid ${C.border}`, borderRadius: 10, padding: 14, boxShadow: '0 1px 3px rgba(15,23,42,0.04)' }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12, marginBottom: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flex: 1, minWidth: 0 }}>
          <div style={{ width: 32, height: 32, borderRadius: 8, flexShrink: 0, background: meta.bg, border: `1.5px solid ${meta.border}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 15, color: meta.color }}>{meta.icon}</div>
          <div style={{ minWidth: 0, flex: 1 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
              <span style={{ fontSize: 13, fontWeight: 700, color: C.ink }}>Uploaded Reply Bundle</span>
              {item.notice?.din_number && <span style={{ fontSize: 10, fontWeight: 700, color: C.slate, background: C.bg, padding: '1px 7px', borderRadius: 99, border: `1px solid ${C.border}` }}>DIN {item.notice.din_number}</span>}
              <span style={{ fontSize: 9.5, fontWeight: 800, padding: '2px 8px', borderRadius: 999, background: statusMeta.bg, color: statusMeta.color, border: `1px solid ${statusMeta.border}`, textTransform: 'uppercase' }}>{statusMeta.label}</span>
            </div>
            <div style={{ fontSize: 11, color: C.muted, marginTop: 2 }}>Uploaded by <b style={{ color: C.slate }}>{item.submitted_by_name}</b> · {fmtDateTime(item.submitted_at)}</div>
          </div>
        </div>
        <div style={{ width: 28, height: 28, borderRadius: '50%', flexShrink: 0, background: `linear-gradient(135deg, ${C.navy}, ${C.navyMid})`, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700 }}>{submitterInitial}</div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1.2fr auto', gap: 12, alignItems: 'start', background: C.bgSoft, border: `1px solid ${C.borderLight}`, padding: 10, borderRadius: 6 }}>
        
        {/* Col 1: Main Reply */}
        <div>
          <div style={{ fontSize: 9.5, fontWeight: 700, color: C.slate, textTransform: 'uppercase', marginBottom: 6 }}>Main Reply</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '4px 8px', background: '#fff', border: `1px solid ${C.border}`, borderRadius: 4 }}>
            <span style={{ fontSize: 14 }}>📄</span>
            <span onClick={() => onOpenPdf(item.file_url)} style={{ fontSize: 11, fontWeight: 600, color: C.blue, cursor: 'pointer', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', textDecoration: 'underline' }}>{item.file_name}</span>
            <button onClick={() => handleDownloadFile(item.file_url, item.file_name)} title="Download" style={{ width: 22, height: 22, border: `1px solid ${C.borderLight}`, borderRadius: 4, background: '#fff', color: C.slate, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" y1="15" x2="12" y2="3" /></svg></button>
          </div>
        </div>

        {/* Col 2: Supporting Docs */}
        <div>
          <div style={{ fontSize: 9.5, fontWeight: 700, color: C.slate, textTransform: 'uppercase', marginBottom: 6 }}>Supporting Docs ({item.support_docs?.length || 0})</div>
          {item.support_docs?.length > 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              {item.support_docs.map((sd, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '4px 8px', background: '#fff', border: `1px solid ${C.border}`, borderRadius: 4 }}>
                  <span style={{ fontSize: 12 }}>📎</span>
                  <span onClick={() => onOpenPdf(sd.file_url)} style={{ fontSize: 11, color: C.blue, cursor: 'pointer', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', textDecoration: 'underline' }}>{sd.file_name}</span>
                  <button onClick={() => handleDownloadFile(sd.file_url, sd.file_name)} title="Download" style={{ width: 22, height: 22, border: `1px solid ${C.borderLight}`, borderRadius: 4, background: '#fff', color: C.slate, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" y1="15" x2="12" y2="3" /></svg></button>
                </div>
              ))}
            </div>
          ) : <span style={{ fontSize: 10, color: C.muted, fontStyle: 'italic' }}>None</span>}
        </div>

        {/* Col 3: Actions */}
        {(canApprove || canReject) && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6, paddingTop: 18 }}>
            {canApprove && <button onClick={onApprove} disabled={busy} style={{ padding: '6px 14px', borderRadius: 4, border: 'none', background: busy ? C.muted : C.green, color: '#fff', fontSize: 11, fontWeight: 700, cursor: busy ? 'wait' : 'pointer', boxShadow: '0 2px 4px rgba(15,122,90,0.2)' }}>{busy ? 'Working…' : '✓ Approve'}</button>}
            {canReject && <button onClick={onReject} disabled={busy} style={{ padding: '6px 14px', borderRadius: 4, border: `1px solid ${C.redBorder}`, background: '#fff', color: C.red, fontSize: 11, fontWeight: 700, cursor: busy ? 'wait' : 'pointer' }}>Reject</button>}
          </div>
        )}
      </div>

      {item.status === 'rejected' && item.review_note && (
        <div style={{ padding: '8px 12px', background: C.redBg, border: `1px solid ${C.redBorder}`, borderRadius: 5, fontSize: 11.5, color: C.red, marginTop: 12 }}>
          <b>Rejection reason:</b> {item.review_note}
        </div>
      )}
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════
// COMPACT HISTORY ROW (With embedded row structure for Uploaded Reply)
// ══════════════════════════════════════════════════════════════════
function HistoryRow({ item, expanded, onToggle, onViewReply, onOpenDoc, onOpenNotice }) {
  const [hover, setHover] = useState(false);
  const meta = ACTION_META[item.action_type] || ACTION_META.summary;
  const statusMeta = STATUS_META[item.status] || STATUS_META.pending;

  let title = meta.label;
  if (item.type === 'reply') title = `Reply — ${item.title || 'Untitled'}`;
  if (item.type === 'uploaded_reply_bundle') title = `Uploaded Reply — ${item.file_name}`;
  if (item.type === 'ack') title = `Acknowledgment — ${item.file_name}`;
  if (item.type === 'notice_edit') title = `Notice Info — DIN ${item.payload?.notice_din || '—'}`;
  if (item.type === 'notice') title = `Notice — DIN ${item.din_number || '—'}`;

  return (
    <div style={{ background: '#fff', border: `1px solid ${expanded ? C.blueBorder : C.borderLight}`, borderRadius: 6, overflow: 'hidden', transition: 'all .12s' }}>
      <div onClick={onToggle} onMouseEnter={() => setHover(true)} onMouseLeave={() => setHover(false)} style={{ padding: '8px 10px', cursor: 'pointer', background: hover || expanded ? C.bgSoft : '#fff', display: 'flex', alignItems: 'center', gap: 10, transition: 'all .12s' }}>
        <div style={{ width: 24, height: 24, flexShrink: 0, borderRadius: 5, background: meta.bg, border: `1px solid ${meta.border}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, color: meta.color }}>{meta.icon}</div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: C.ink, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{title}</div>
          <div style={{ fontSize: 10, color: C.muted, marginTop: 1 }}>{item.reviewed_by_name || item.submitted_by_name} · {fmtRelativeTime(item._sortDate)}</div>
        </div>
        <span style={{ fontSize: 9, fontWeight: 800, padding: '2px 7px', borderRadius: 4, background: statusMeta.bg, color: statusMeta.color, border: `1px solid ${statusMeta.border}`, textTransform: 'uppercase', letterSpacing: '0.04em', flexShrink: 0 }}>{statusMeta.label}</span>
        <span style={{ fontSize: 10, color: C.muted, transform: expanded ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.15s', flexShrink: 0 }}>▾</span>
      </div>

      {expanded && (
        <div style={{ padding: '10px 12px', borderTop: `1px solid ${C.borderLight}`, background: C.bgSoft }}>
          
          {/* History Details: If it's an Uploaded Reply, show the compact row format */}
          {item.type === 'uploaded_reply_bundle' && (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 8, background: '#fff', padding: 8, border: `1px solid ${C.border}`, borderRadius: 5 }}>
              <div>
                <div style={{ fontSize: 9, fontWeight: 700, color: C.slate, textTransform: 'uppercase', marginBottom: 4 }}>Main Reply</div>
                <div style={{ fontSize: 11, color: C.blue, cursor: 'pointer', textDecoration: 'underline' }} onClick={() => onOpenDoc(item.file_url)}>📄 {item.file_name}</div>
              </div>
              <div>
                <div style={{ fontSize: 9, fontWeight: 700, color: C.slate, textTransform: 'uppercase', marginBottom: 4 }}>Supports</div>
                {item.support_docs?.length > 0 ? item.support_docs.map((sd, i) => (
                  <div key={i} onClick={() => onOpenDoc(sd.file_url)} style={{ fontSize: 11, color: C.blue, cursor: 'pointer', textDecoration: 'underline', marginBottom: 3 }}>📎 {sd.file_name}</div>
                )) : <div style={{ fontSize: 10, color: C.muted, fontStyle: 'italic' }}>None</div>}
              </div>
            </div>
          )}

          {item.status === 'rejected' && item.review_note && <div style={{ padding: '6px 10px', background: C.redBg, border: `1px solid ${C.redBorder}`, borderRadius: 4, fontSize: 11, color: C.red, marginBottom: 8 }}><b>Reason:</b> {item.review_note}</div>}
          
          {item.type === 'notice_edit' && item.payload?.changed_fields?.length > 0 && (
            <div style={{ marginBottom: 8 }}>
              <div style={{ fontSize: 10, fontWeight: 800, color: C.muted, textTransform: 'uppercase', marginBottom: 4 }}>Changed Fields</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                {item.payload.changed_fields.map((field) => (
                  <div key={field} style={{ fontSize: 11.5, color: C.slate }}>
                    <b>{field}:</b> <span style={{ color: C.red, textDecoration: 'line-through' }}>{item.payload.old_values?.[field] || '—'}</span>{' → '}<span style={{ color: C.green, fontWeight: 700 }}>{item.payload.new_values?.[field] || '—'}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {item.type === 'summary' && item.payload?.description && <div style={{ padding: '8px 10px', background: '#fff', border: `1px solid ${C.borderLight}`, borderRadius: 5, fontSize: 11.5, color: C.ink, whiteSpace: 'pre-wrap', marginBottom: 8 }}>{item.payload.description}</div>}
          {item.type === 'reply' && <button onClick={() => onViewReply(item)} style={{ padding: '5px 12px', borderRadius: 4, border: 'none', background: C.navy, color: '#fff', fontSize: 11, fontWeight: 700, cursor: 'pointer' }}>Open Reply Editor →</button>}
          {item.type === 'ack' && <button onClick={() => onOpenDoc(item.file_url)} style={{ padding: '5px 12px', borderRadius: 4, border: 'none', background: C.navy, color: '#fff', fontSize: 11, fontWeight: 700, cursor: 'pointer' }}>Open Document →</button>}
          {item.type === 'notice' && <button onClick={() => onOpenNotice(item.notice_id)} style={{ padding: '5px 12px', borderRadius: 4, border: 'none', background: C.navy, color: '#fff', fontSize: 11, fontWeight: 700, cursor: 'pointer' }}>View Notice →</button>}
        </div>
      )}
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════
// OTHER REVIEW CARDS
// ══════════════════════════════════════════════════════════════════
function AckReviewCard({ item, busy, canApprove, canReject, onOpenPdf, onApprove, onReject }) {
  const meta = ACTION_META.ack_review;
  const statusMeta = STATUS_META[item.status] || STATUS_META.pending;
  const submitterInitial = (item.submitted_by_name || 'U').charAt(0).toUpperCase();

  return (
    <div style={{ background: '#fff', border: `1px solid ${C.border}`, borderRadius: 10, padding: 14, boxShadow: '0 1px 3px rgba(15,23,42,0.04)' }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12, marginBottom: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flex: 1, minWidth: 0 }}>
          <div style={{ width: 32, height: 32, borderRadius: 8, flexShrink: 0, background: meta.bg, border: `1.5px solid ${meta.border}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 15, color: meta.color }}>{meta.icon}</div>
          <div style={{ minWidth: 0, flex: 1 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
              <span style={{ fontSize: 13, fontWeight: 700, color: C.ink }}>Acknowledgment</span>
              {item.notice?.din_number && <span style={{ fontSize: 10, fontWeight: 700, color: C.slate, background: C.bg, padding: '1px 7px', borderRadius: 99, border: `1px solid ${C.border}` }}>DIN {item.notice.din_number}</span>}
              <span style={{ fontSize: 9.5, fontWeight: 800, padding: '2px 8px', borderRadius: 999, background: statusMeta.bg, color: statusMeta.color, border: `1px solid ${statusMeta.border}`, textTransform: 'uppercase' }}>{statusMeta.label}</span>
            </div>
            <div style={{ fontSize: 11, color: C.muted, marginTop: 2 }}>Uploaded by <b style={{ color: C.slate }}>{item.submitted_by_name}</b> · {fmtDateTime(item.submitted_at)}</div>
          </div>
        </div>
        <div style={{ width: 28, height: 28, borderRadius: '50%', flexShrink: 0, background: `linear-gradient(135deg, ${C.navy}, ${C.navyMid})`, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700 }}>{submitterInitial}</div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: 12, alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 10px', background: C.bgSoft, border: `1px solid ${C.borderLight}`, borderRadius: 6 }}>
          <span style={{ fontSize: 16 }}>📄</span>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div onClick={() => onOpenPdf(item.file_url)} style={{ fontSize: 11.5, fontWeight: 600, color: C.blue, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', cursor: 'pointer', textDecoration: 'underline' }}>{item.file_name}</div>
          </div>
          <button onClick={() => handleDownloadFile(item.file_url, item.file_name)} title="Download" style={{ width: 24, height: 24, border: `1px solid ${C.border}`, borderRadius: 4, background: '#fff', color: C.slate, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" y1="15" x2="12" y2="3" /></svg></button>
        </div>

        {(canApprove || canReject) && (
          <div style={{ display: 'flex', gap: 6 }}>
            {canReject && <button onClick={onReject} disabled={busy} style={{ padding: '6px 14px', borderRadius: 6, border: `1px solid ${C.redBorder}`, background: '#fff', color: C.red, fontSize: 11, fontWeight: 700, cursor: busy ? 'wait' : 'pointer', opacity: busy ? 0.5 : 1 }}>Reject</button>}
            {canApprove && <button onClick={onApprove} disabled={busy} style={{ padding: '6px 16px', borderRadius: 6, border: 'none', background: busy ? C.muted : C.green, color: '#fff', fontSize: 11, fontWeight: 700, cursor: busy ? 'wait' : 'pointer', boxShadow: '0 2px 4px rgba(15,122,90,0.2)' }}>{busy ? 'Working…' : '✓ Approve'}</button>}
          </div>
        )}
      </div>

      {item.status === 'rejected' && item.review_note && (
        <div style={{ marginTop: 10, padding: '8px 12px', background: C.redBg, border: `1px solid ${C.redBorder}`, borderRadius: 6, fontSize: 11.5, color: C.red }}>
          <b>Rejection reason:</b> {item.review_note}
        </div>
      )}
    </div>
  );
}

function SummaryReviewCard({ review, busy, canApprove, canReject, onApprove, onReject }) {
  const meta = ACTION_META.summary;
  const statusMeta = STATUS_META[review.status] || STATUS_META.pending;
  const submitterInitial = (review.submitted_by_name || 'U').charAt(0).toUpperCase();

  return (
    <div style={{ background: '#fff', border: `1px solid ${C.border}`, borderRadius: 10, padding: 14, boxShadow: '0 1px 3px rgba(15,23,42,0.04)' }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12, marginBottom: 10 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flex: 1, minWidth: 0 }}>
          <div style={{ width: 32, height: 32, borderRadius: 8, flexShrink: 0, background: meta.bg, border: `1.5px solid ${meta.border}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 15, color: meta.color }}>{meta.icon}</div>
          <div style={{ minWidth: 0, flex: 1 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
              <span style={{ fontSize: 13, fontWeight: 700, color: C.ink }}>{meta.label}</span>
              <span style={{ fontSize: 9.5, fontWeight: 800, padding: '2px 8px', borderRadius: 999, background: statusMeta.bg, color: statusMeta.color, border: `1px solid ${statusMeta.border}`, textTransform: 'uppercase' }}>{statusMeta.label}</span>
            </div>
            <div style={{ fontSize: 11, color: C.muted, marginTop: 2 }}>Submitted by <b style={{ color: C.slate }}>{review.submitted_by_name}</b> · {fmtDateTime(review.submitted_at)}</div>
          </div>
        </div>
        <div style={{ width: 28, height: 28, borderRadius: '50%', flexShrink: 0, background: `linear-gradient(135deg, ${C.navy}, ${C.navyMid})`, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700 }}>{submitterInitial}</div>
      </div>
      <div style={{ padding: '10px 12px', background: C.bgSoft, border: `1px solid ${C.borderLight}`, borderRadius: 7, marginBottom: (canApprove || canReject) ? 10 : 0 }}>
        <div style={{ fontSize: 10, fontWeight: 800, color: C.muted, marginBottom: 4, textTransform: 'uppercase' }}>Summary Text</div>
        <div style={{ fontSize: 12.5, color: C.ink, whiteSpace: 'pre-wrap' }}>{review.payload?.description || '(empty)'}</div>
      </div>
      {(canApprove || canReject) && (
        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
          {canReject && <button onClick={onReject} disabled={busy} style={{ padding: '7px 14px', borderRadius: 7, border: `1.5px solid ${C.redBorder}`, background: '#fff', color: C.red, fontSize: 12, fontWeight: 700, cursor: busy ? 'wait' : 'pointer' }}>Reject</button>}
          {canApprove && <button onClick={onApprove} disabled={busy} style={{ padding: '7px 18px', borderRadius: 7, border: 'none', background: busy ? C.muted : `linear-gradient(135deg, ${C.green}, #0F7A5A)`, color: '#fff', fontSize: 12, fontWeight: 700, cursor: busy ? 'wait' : 'pointer' }}>✓ Approve</button>}
        </div>
      )}
    </div>
  );
}

function NoticeEditReviewCard({ review, busy, canApprove, canReject, onApprove, onReject }) {
  const meta = ACTION_META.notice_edit;
  const statusMeta = STATUS_META[review.status] || STATUS_META.pending;
  const submitterInitial = (review.submitted_by_name || 'U').charAt(0).toUpperCase();
  const changedFields = review.payload?.changed_fields || [];
  const fmtValue = (val) => (val === null || val === undefined || val === '') ? '—' : String(val);

  return (
    <div style={{ background: '#fff', border: `1px solid ${C.border}`, borderRadius: 10, padding: 14, boxShadow: '0 1px 3px rgba(15,23,42,0.04)' }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12, marginBottom: 10 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flex: 1, minWidth: 0 }}>
          <div style={{ width: 32, height: 32, borderRadius: 8, flexShrink: 0, background: meta.bg, border: `1.5px solid ${meta.border}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 15, color: meta.color }}>{meta.icon}</div>
          <div style={{ minWidth: 0, flex: 1 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
              <span style={{ fontSize: 13, fontWeight: 700, color: C.ink }}>{meta.label}</span>
              <span style={{ fontSize: 9.5, fontWeight: 800, padding: '2px 8px', borderRadius: 999, background: statusMeta.bg, color: statusMeta.color, border: `1px solid ${statusMeta.border}`, textTransform: 'uppercase' }}>{statusMeta.label}</span>
            </div>
            <div style={{ fontSize: 11, color: C.muted, marginTop: 2 }}>Submitted by <b style={{ color: C.slate }}>{review.submitted_by_name}</b> · {fmtDateTime(review.submitted_at)}</div>
          </div>
        </div>
        <div style={{ width: 28, height: 28, borderRadius: '50%', flexShrink: 0, background: `linear-gradient(135deg, ${C.navy}, ${C.navyMid})`, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700 }}>{submitterInitial}</div>
      </div>
      <div style={{ padding: '10px 12px', background: C.bgSoft, border: `1px solid ${C.borderLight}`, borderRadius: 7, marginBottom: (canApprove || canReject) ? 10 : 0 }}>
        <div style={{ fontSize: 10, fontWeight: 800, color: C.muted, marginBottom: 8, textTransform: 'uppercase' }}>Changes Requested</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {changedFields.map(f => (
            <div key={f} style={{ display: 'flex', alignItems: 'flex-start', gap: 8, fontSize: 12 }}>
              <span style={{ fontSize: 10.5, fontWeight: 700, color: C.muted, minWidth: 100, textTransform: 'uppercase' }}>{f}</span>
              <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 6 }}>
                <span style={{ color: C.red, textDecoration: 'line-through' }}>{fmtValue(review.payload?.old_values?.[f])}</span>
                <span style={{ color: C.muted }}>→</span>
                <span style={{ color: C.green, fontWeight: 700 }}>{fmtValue(review.payload?.new_values?.[f])}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
      {(canApprove || canReject) && (
        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
          {canReject && <button onClick={onReject} disabled={busy} style={{ padding: '7px 14px', borderRadius: 7, border: `1.5px solid ${C.redBorder}`, background: '#fff', color: C.red, fontSize: 12, fontWeight: 700, cursor: busy ? 'wait' : 'pointer' }}>Reject</button>}
          {canApprove && <button onClick={onApprove} disabled={busy} style={{ padding: '7px 18px', borderRadius: 7, border: 'none', background: busy ? C.muted : `linear-gradient(135deg, ${C.green}, #0F7A5A)`, color: '#fff', fontSize: 12, fontWeight: 700, cursor: busy ? 'wait' : 'pointer' }}>✓ Approve</button>}
        </div>
      )}
    </div>
  );
}

function NoticeReviewCard({ item, onView }) {
  const meta = ACTION_META.notice_review;
  return (
    <div style={{ background: '#fff', border: `1px solid ${C.border}`, borderRadius: 10, padding: 14, boxShadow: '0 1px 3px rgba(15,23,42,0.04)' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
        <div style={{ width: 32, height: 32, borderRadius: 8, background: meta.bg, border: `1.5px solid ${meta.border}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 15, color: meta.color }}>{meta.icon}</div>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: C.ink }}>{meta.label}</div>
          <div style={{ fontSize: 11, color: C.muted }}>Submitted by {item.submitted_by_name}</div>
        </div>
        <button onClick={onView} style={{ padding: '7px 18px', borderRadius: 7, border: 'none', background: `linear-gradient(135deg, ${C.navy}, ${C.blue})`, color: '#fff', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>View Notice →</button>
      </div>
    </div>
  );
}

function ReplyReviewCard({ item, onView, canReview, buttonLabel }) {
  const meta = ACTION_META.reply_review;
  const statusMeta = STATUS_META[item.status] || STATUS_META.pending;
  return (
    <div style={{ background: '#fff', border: `1px solid ${C.border}`, borderRadius: 10, padding: 14, boxShadow: '0 1px 3px rgba(15,23,42,0.04)' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
        <div style={{ width: 32, height: 32, borderRadius: 8, background: meta.bg, border: `1.5px solid ${meta.border}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 15, color: meta.color }}>{meta.icon}</div>
        <div style={{ flex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ fontSize: 13, fontWeight: 700, color: C.ink }}>{meta.label}</span>
            <span style={{ fontSize: 9.5, fontWeight: 800, padding: '2px 8px', borderRadius: 999, background: statusMeta.bg, color: statusMeta.color, border: `1px solid ${statusMeta.border}`, textTransform: 'uppercase' }}>{statusMeta.label}</span>
          </div>
          <div style={{ fontSize: 11, color: C.muted }}>Submitted by {item.submitted_by_name}</div>
        </div>
        {canReview && <button onClick={onView} style={{ padding: '7px 18px', borderRadius: 7, border: 'none', background: `linear-gradient(135deg, ${C.navy}, ${C.blue})`, color: '#fff', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>{buttonLabel}</button>}
      </div>
    </div>
  );
}

function ClosureBundleCard({ item, busy, canApprove, canReject, onOpenDoc, onApprove, onReject }) {
  const meta = ACTION_META.closure_review;
  const docsMap = {
    order: item.closure_documents?.find(d => d.doc_type === 'order'),
    demand_notice: item.closure_documents?.find(d => d.doc_type === 'demand_notice'),
    computation_sheet: item.closure_documents?.find(d => d.doc_type === 'computation_sheet'),
  };
  return (
    <div style={{ background: '#fff', border: `1px solid ${C.border}`, borderRadius: 10, padding: 14, boxShadow: '0 1px 3px rgba(15,23,42,0.04)', borderLeft: `4px solid ${meta.color}` }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
        <div style={{ width: 32, height: 32, borderRadius: 8, background: meta.bg, border: `1.5px solid ${meta.border}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 15, color: meta.color }}>{meta.icon}</div>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: C.ink }}>{meta.label}</div>
          <div style={{ fontSize: 11, color: C.muted }}>Submitted by {item.submitted_by_name}</div>
        </div>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6, padding: '10px 12px', background: C.bgSoft, border: `1px solid ${C.borderLight}`, borderRadius: 7, marginBottom: (canApprove || canReject) ? 10 : 0 }}>
        {['order', 'demand_notice', 'computation_sheet'].map(dt => (
          docsMap[dt] && (
            <div key={dt} onClick={() => onOpenDoc(docsMap[dt])} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '7px 10px', background: '#fff', border: `1px solid ${C.border}`, borderRadius: 5, cursor: 'pointer' }}>
              <span>📄</span>
              <span style={{ fontSize: 11, fontWeight: 700, color: C.ink }}>{docsMap[dt].file_name}</span>
            </div>
          )
        ))}
      </div>
      {(canApprove || canReject) && (
        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
          {canReject && <button onClick={onReject} disabled={busy} style={{ padding: '7px 14px', borderRadius: 7, border: `1.5px solid ${C.redBorder}`, background: '#fff', color: C.red, fontSize: 12, fontWeight: 700, cursor: busy ? 'wait' : 'pointer' }}>Reject</button>}
          {canApprove && <button onClick={onApprove} disabled={busy} style={{ padding: '7px 18px', borderRadius: 7, border: 'none', background: busy ? C.muted : `linear-gradient(135deg, ${C.green}, #0F7A5A)`, color: '#fff', fontSize: 12, fontWeight: 700, cursor: busy ? 'wait' : 'pointer' }}>✓ Approve & Close</button>}
        </div>
      )}
    </div>
  );
}