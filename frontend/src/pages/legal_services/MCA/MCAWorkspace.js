// // MCAWorkspace.js — one client's MCA filing workspace.
// // Tabs: Client Details · Activity · Documents · Review · Team · Audit Trail

// import { useEffect, useState, useCallback, useMemo } from 'react';
// import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
// import { Checkbox, Input, Upload, message } from 'antd';
// import { UploadOutlined } from '@ant-design/icons';
// import { api } from '../../../services/api';
// import { useAuth } from '../../../contexts/AuthContext';
// import Modal from '../../../components/Modal';
// import Table from '../../../components/Table';
// import {
//   EmptyState, ErrorBanner, SectionTitle, toList, isInList, fmtDate, fmtDateTime, openFile, downloadDoc,
//   P, BRD, BG, MUT, INK, GR, RED, REDL, REDB, AMB, PL, WH, SKY, VIO,
// } from '../../IncomeTaxPage/JobUiCommon';
// import {
//   JobWorkspaceShell, Loader, AuditTrailTab, DocGroupsCard, COMMON_TABS, EVENT_TONES, REVIEW_BADGES, resolveTab,
// } from '../../IncomeTaxPage/JobWorkspaceCommon';
// import {
//   StatusPill, REVIEW_STATUS, FileChip, RejectModal, AcceptModal, useConfirm,
//   mcaApi, mcaServiceOf, getMcaStatus, MCA_PORTAL_LOGIN, resolveCase,
// } from '../LegalModals';
// import { DetailsTab, getFYandAY, LinkedTaskLink, TeamTab } from '../LegalWorkSpace';

// const MCA_TABS = [
//   COMMON_TABS.client,
//   { key: 'activity', label: 'Activity', icon: '⚖️' },
//   COMMON_TABS.docs,
//   { key: 'review', label: 'Review', icon: '🔍' },
//   COMMON_TABS.team,
//   COMMON_TABS.audit,
// ];

// const errMsg = (e, fallback) => e?.response?.data?.error || e?.response?.data?.detail || fallback;

// const closureHasFile = (doc) => {
//   const n = (doc?.file_name || '').toLowerCase();
//   return !!n && !n.includes('no attachment') && !(n.endsWith('.txt') && n.includes('closure'));
// };

// const DOC_META = {
//   pending_draft:     { label: 'Draft Form PDF', icon: '📄' },
//   draft_form:        { label: 'Draft Form PDF', icon: '📄' },
//   srn_receipt:       { label: 'Supporting Document', icon: '📎' }, // Legacy mapping
//   challan:           { label: 'Supporting Document', icon: '📎' }, // Legacy mapping
//   acknowledgment:    { label: 'Supporting Document', icon: '📎' }, // Legacy mapping
//   supporting_doc:    { label: 'Supporting Document', icon: '📎' },
//   pending_support:   { label: 'Supporting Document', icon: '📎' },
//   mca_approval_cert: { label: 'Case Close Request', icon: '🔒' },
// };

// const docLabel = (d) => (d.doc_type === 'mca_approval_cert' && closureHasFile(d) ? 'Approval Certificate' : DOC_META[d.doc_type]?.label || d.doc_type);
// const docIcon = (d) => (d.doc_type === 'mca_approval_cert' ? (closureHasFile(d) ? '📜' : '🔒') : DOC_META[d.doc_type]?.icon || '📄');

// function RejectionNote({ note, style }) {
//   if (!note) return null;
//   return (
//     <div style={{ padding: '8px 12px', background: REDL, border: `1px solid ${REDB}`, borderRadius: 'var(--radius-md)', fontSize: 12, color: RED, ...style }}>
//       <b>Rejection reason:</b> {note}
//     </div>
//   );
// }

// // ══════════════════════════════════════════════════════════════════
// // COMPACT Upload Box (reduced size)
// // ══════════════════════════════════════════════════════════════════
// function UploadBox({ icon, text, enabled, accept, onFile, busy }) {
//   return (
//     <label style={{
//       display: 'block', padding: '18px 12px', textAlign: 'center', borderRadius: 'var(--radius-md)',
//       border: `2px dashed ${enabled ? '#CBD5E1' : BRD}`, background: enabled ? WH : BG,
//       cursor: enabled && !busy ? 'pointer' : 'not-allowed', opacity: enabled ? 1 : 0.6,
//     }}>
//       <input type="file" hidden accept={accept} disabled={!enabled || busy}
//         onChange={(e) => { const f = e.target.files?.[0]; e.target.value = ''; if (f) onFile(f); }} />
//       <div style={{ fontSize: 22, opacity: 0.5, marginBottom: 4 }}>{icon}</div>
//       <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--color-slate-600)' }}>{busy ? 'Uploading…' : text}</div>
//     </label>
//   );
// }

// function StepColumn({ title, locked, children }) {
//   return (
//     <div style={{ padding: 16, borderRight: `1px solid ${BRD}`, background: locked ? BG : WH, opacity: locked ? 0.6 : 1, pointerEvents: locked ? 'none' : 'auto', minWidth: 0 }}>
//       <div style={{ fontSize: 13, fontWeight: 700, color: INK, marginBottom: 12 }}>{title}</div>
//       {children}
//     </div>
//   );
// }




// // COMPACT Green Grid Card for Documents (Styled identical to JobWorkspaceCommon DocCard)
// // function McaDocCard({ doc, title, icon, canDelete, onRemove, deleting }) {
// //   if (!doc) return null;
// //   const isFile = doc.file_name && !doc.file_name.includes('no attachment') && !doc.file_name.endsWith('.txt');

// //   // Exact styles mapped from JobWorkspaceCommon.js DocCard (Uploaded State)
// //   const borderColor = '#8ECEBF';
// //   const shadow = '0 0 0 2px #C3E8DC';
// //   const actionBg = '#F2FBF7';
// //   const fileColor = GR; // Green

// //   // Exact button styling factory from JobWorkspaceCommon.js
// //   const actBtn = (color, last) => ({
// //     flex: 1, padding: '7px 0', fontSize: 11, fontWeight: 500, color, background: 'none', border: 'none',
// //     borderRight: last ? 'none' : `1px solid ${borderColor}`, cursor: 'pointer', fontFamily: 'inherit',
// //   });

// //   return (
// //     <div style={{ background: WH, border: `1px solid ${borderColor}`, borderRadius: 10, overflow: 'hidden', boxShadow: shadow, transition: 'all .15s', display: 'flex', flexDirection: 'column', height: '100%' }}>
      
// //       {/* Top Section (Title, Badge, Filename) */}
// //       <div style={{ padding: '10px 12px', borderBottom: `1px solid ${borderColor}`, flex: 1 }}>
// //         <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8 }}>
// //           <div style={{ minWidth: 0 }}>
// //             <div style={{ fontSize: 13, fontWeight: 600, color: INK, marginBottom: 2 }}>
// //               {icon ? `${icon} ` : ''}{title}
// //             </div>
// //           </div>
// //           <div style={{ flexShrink: 0 }}>
// //             <StatusPill status={doc.review_status} map={REVIEW_STATUS} />
// //           </div>
// //         </div>
        
// //         {isFile ? (
// //           <div title={doc.file_name} style={{ marginTop: 6, fontSize: 11, color: fileColor, fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
// //             ✓ {doc.file_name}
// //           </div>
// //         ) : (
// //           <div style={{ marginTop: 6, fontSize: 11, color: MUT, fontStyle: 'italic', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
// //             No attachment provided
// //           </div>
// //         )}
// //       </div>

// //       {/* Bottom Section (Action Buttons) */}
// //       <div style={{ display: 'flex', background: actionBg }}>
// //         <button type="button" onClick={() => isFile && openFile(doc)} disabled={!isFile}
// //           style={{ ...actBtn(P, false), opacity: isFile ? 1 : 0.5, cursor: isFile ? 'pointer' : 'default' }}>
// //           View
// //         </button>
        
// //         <button type="button" onClick={() => isFile && downloadDoc(doc)} disabled={!isFile}
// //           style={{ ...actBtn(fileColor, !canDelete), opacity: isFile ? 1 : 0.5, cursor: isFile ? 'pointer' : 'default' }}>
// //           Download
// //         </button>
        
// //         {canDelete && (
// //           <button type="button" onClick={() => onRemove(doc)} disabled={deleting}
// //             style={{ ...actBtn(RED, true), cursor: deleting ? 'wait' : 'pointer', opacity: deleting ? 0.5 : 1 }}>
// //             {deleting ? 'Deleting…' : 'Delete'}
// //           </button>
// //         )}
// //       </div>

// //     </div>
// //   );
// // }


// // COMPACT Green Grid Card for Documents (With Individual Review Buttons)
// function McaDocCard({ doc, title, icon, canDelete, onRemove, deleting, reviewMode, onApprove, onReject, busy }) {
//   if (!doc) return null;
//   const isFile = doc.file_name && !doc.file_name.includes('no attachment') && !doc.file_name.endsWith('.txt');

//   const borderColor = '#8ECEBF';
//   const shadow = '0 0 0 2px #C3E8DC';
//   const actionBg = '#F2FBF7';
//   const fileColor = GR;

//   const actBtn = (color, last) => ({
//     flex: 1, padding: '7px 0', fontSize: 11, fontWeight: 500, color, background: 'none', border: 'none',
//     borderRight: last ? 'none' : `1px solid ${borderColor}`, cursor: 'pointer', fontFamily: 'inherit',
//   });

//   return (
//     <div style={{ background: WH, border: `1px solid ${borderColor}`, borderRadius: 10, overflow: 'hidden', boxShadow: shadow, transition: 'all .15s', display: 'flex', flexDirection: 'column', height: '100%' }}>
      
//       <div style={{ padding: '10px 12px', borderBottom: `1px solid ${borderColor}`, flex: 1 }}>
//         <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8 }}>
//           <div style={{ minWidth: 0 }}>
//             <div style={{ fontSize: 13, fontWeight: 600, color: INK, marginBottom: 2 }}>
//               {icon ? `${icon} ` : ''}{title}
//             </div>
//           </div>
//           <div style={{ flexShrink: 0 }}>
//             <StatusPill status={doc.review_status} map={REVIEW_STATUS} />
//           </div>
//         </div>
        
//         {isFile ? (
//           <div title={doc.file_name} style={{ marginTop: 6, fontSize: 11, color: fileColor, fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
//             ✓ {doc.file_name}
//           </div>
//         ) : (
//           <div style={{ marginTop: 6, fontSize: 11, color: MUT, fontStyle: 'italic', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
//             No attachment provided
//           </div>
//         )}
//       </div>

//       <div style={{ display: 'flex', background: actionBg }}>
//         <button type="button" onClick={() => isFile && openFile(doc)} disabled={!isFile} style={{ ...actBtn(P, false), opacity: isFile ? 1 : 0.5, cursor: isFile ? 'pointer' : 'default' }}>View</button>
//         <button type="button" onClick={() => isFile && downloadDoc(doc)} disabled={!isFile} style={{ ...actBtn(fileColor, !canDelete), opacity: isFile ? 1 : 0.5, cursor: isFile ? 'pointer' : 'default' }}>Download</button>
//         {canDelete && (
//           <button type="button" onClick={() => onRemove(doc)} disabled={deleting} style={{ ...actBtn(RED, true), cursor: deleting ? 'wait' : 'pointer', opacity: deleting ? 0.5 : 1 }}>
//             {deleting ? 'Deleting…' : 'Delete'}
//           </button>
//         )}
//       </div>

//       {/* ✅ NEW: INDIVIDUAL REVIEW BUTTONS FOR CHECKER ✅ */}
//       {reviewMode && ['pending', 'escalated'].includes(doc.review_status) && (
//         <div style={{ display: 'flex', background: '#F8FAFC', borderTop: `1px solid ${borderColor}` }}>
//           <button type="button" onClick={() => onReject(doc)} disabled={busy}
//             style={{ flex: 1, padding: '8px 0', fontSize: 11, fontWeight: 600, color: RED, background: 'none', border: 'none', borderRight: `1px solid ${borderColor}`, cursor: busy ? 'wait' : 'pointer' }}>
//             Reject
//           </button>
//           <button type="button" onClick={() => onApprove(doc)} disabled={busy}
//             style={{ flex: 1, padding: '8px 0', fontSize: 11, fontWeight: 700, color: GR, background: 'none', border: 'none', cursor: busy ? 'wait' : 'pointer' }}>
//             {busy ? 'Working...' : '✓ Approve'}
//           </button>
//         </div>
//       )}

//     </div>
//   );
// }





// // ══════════════════════════════════════════════════════════════════
// // STP FORMS
// // ══════════════════════════════════════════════════════════════════
// const STP_FORMS = [
//   'addition of auditor adt-1',
//   'addition of auditor – adt-1',
//   'aoc-4 filing',
//   'aoc-4 xbrl filing',
//   'dpt-3 filing',
//   'mgt-7 filing',
//   'mgt-7a filing',
//   'form-11 (llp)',
//   'form 11',
//   'form-8 (llp)',
//   'form 8',
//   'dir-3 kyc',
//   'dir-3 kyc / roc dir-3 returns',
//   'pas-6 reconciliation of share capital audit report',
//   'pas-6',
//   'ben forms filing',
//   'msme form-1 filing',
// ];

// const isSTPForm = (name) => STP_FORMS.includes((name || '').toLowerCase().trim());

// function CloseCaseDialog({ onClose, onSubmit }) {
//   const [confirmed, setConfirmed] = useState(false);
//   const [file, setFile] = useState(null);
//   const [note, setNote] = useState('');
//   const [busy, setBusy] = useState(false);
//   const [error, setError] = useState('');

//   const submit = async () => {
//     setBusy(true); setError('');
//     try {
//       await onSubmit({ note, file });
//     } catch (e) {
//       setError(errMsg(e, 'Failed to submit closure'));
//       setBusy(false);
//     }
//   };

//   return (
//     <Modal
//       isOpen icon="🔒" title="Close MCA case" subtitle="Goes to the checker for approval"
//       onClose={() => !busy && onClose()}
//       footer={
//         <>
//           <button className="btn btn-secondary" onClick={onClose} disabled={busy}>Cancel</button>
//           <button className="btn btn-primary" onClick={submit} disabled={!confirmed || busy}>{busy ? 'Sending…' : 'Send for review'}</button>
//         </>
//       }
//     >
//       <div className="card" style={{ padding: '12px 14px', marginBottom: 14 }}>
//         <Checkbox checked={confirmed} onChange={(e) => setConfirmed(e.target.checked)}>
//           <span style={{ fontWeight: 600, color: INK }}>I confirm this filing is approved on the MCA portal and is ready to be closed.</span>
//         </Checkbox>
//       </div>
//       <div style={{ fontSize: 'var(--font-size-sm)', fontWeight: 500, color: 'var(--color-slate-600)', marginBottom: 4 }}>Attachment (optional)</div>
//       <Upload accept=".pdf,.png,.jpg,.jpeg" maxCount={1} fileList={file ? [file] : []}
//         beforeUpload={(f) => { setFile(f); return false; }} onRemove={() => setFile(null)}>
//         <button type="button" className="btn btn-secondary"><UploadOutlined /> Choose file</button>
//       </Upload>
//       <div style={{ marginTop: 14 }}>
//         <Input.TextArea rows={2} value={note} onChange={(e) => setNote(e.target.value)} placeholder="Note for checker (optional)" />
//       </div>
//       {error && <div style={{ marginTop: 12 }}><ErrorBanner>{error}</ErrorBanner></div>}
//     </Modal>
//   );
// }

// // ══════════════════════════════════════════════════════════════════
// // ACTIVITY TAB — Drafts (Multiple) + SRN together, then Supporting Docs
// // ══════════════════════════════════════════════════════════════════
// function ActivityTab({ caseData, filing, user, onUpdated }) {
//   const [busy, setBusy] = useState(null);
//   const [error, setError] = useState(null);
//   const [closeOpen, setCloseOpen] = useState(false);
//   const [srnInput, setSrnInput] = useState('');
//   const [srnEditing, setSrnEditing] = useState(false);
//   const [confirm, confirmEl] = useConfirm();

//   useEffect(() => {
//     if (filing?.srn_number) setSrnInput(filing.srn_number);
//   }, [filing?.srn_number]);

//   const isMaker = isInList(caseData?.makers, user);
//     // 1. Filter out deleted docs for the entire Activity Tab view
//   const docs = (filing?.documents || []).filter((d) => !d.is_deleted);

//   const draftDocs = docs.filter((d) => ['draft_form', 'pending_draft'].includes(d.doc_type));
//   const srnDocs = docs.filter((d) => ['srn_receipt', 'challan', 'supporting_doc'].includes(d.doc_type));

//   const status = getMcaStatus(caseData);
//   const isSTP = isSTPForm(caseData?.sub_service_name);

//   // Statuses
//   const draftReviewStatus = filing?.review_status || 'not_applicable';
//   const srnReviewStatus = filing?.srn_review_status || 'not_applicable';
  
//   const draftApproved = draftReviewStatus === 'approved' || draftReviewStatus === 'accepted';
//   const isClosed = status === 'closed' || (isSTP && srnReviewStatus === 'approved');
//   const isOpenCase = status === 'open' && !isClosed;
//   const closurePending = docs.some((d) => d.doc_type === 'mca_approval_cert' && ['pending', 'escalated'].includes(d.review_status));

//   // Editability
//   const draftsEditable = isMaker && ['draft', 'rejected', 'not_applicable'].includes(draftReviewStatus);
//   const suppEditable = isMaker && draftApproved && ['draft', 'rejected', 'not_applicable'].includes(srnReviewStatus);

//   // Send Logic:
//   // 1. Send Drafts + SRN (Requires at least 1 draft AND SRN saved)
//   const unsubmittedDrafts = draftDocs.some(d => d.review_status === 'draft');
//   const canSendDraftBundle = draftsEditable && unsubmittedDrafts && !!filing?.srn_number;

//   // 2. Send Supporting Docs (Requires at least 1 new supporting doc)
//   const unsubmittedSupps = srnDocs.some(d => d.review_status === 'draft');
//   const canSendSuppBundle = suppEditable && unsubmittedSupps;

//   const canSend = canSendDraftBundle || canSendSuppBundle;

//   const run = useCallback(async (key, fn, okMsg) => {
//     setBusy(key); setError(null);
//     try {
//       await fn();
//       if (okMsg) message.success(okMsg);
//       onUpdated?.();
//     } catch (e) { setError(errMsg(e, 'Something went wrong')); } finally { setBusy(null); }
//   }, [onUpdated]);

//   const upload = useCallback((docType, file) => run(`upload_${docType}`, () => mcaApi.uploadDoc(filing?.id, docType, file), 'File uploaded'), [filing?.id, run]);

//   // 2. Updated remove function with new warning message
//   const remove = useCallback(async (doc) => {
//     if (!(await confirm({ 
//       title: 'Remove this file?', 
//       message: 'It will leave Activity but stay in Review history.', 
//       confirmLabel: 'Remove', 
//       danger: true 
//     }))) return;
//     run(`delete_${doc.id}`, () => mcaApi.removeDoc(doc.id), 'File removed from Activity');
//   }, [confirm, run]);

//   const saveSrn = useCallback(async () => {
//     if (!srnInput.trim()) return setError('Please enter an SRN number.');
//     setBusy('save_srn'); setError(null);
//     try {
//       await api.patch(`/legal-services/mca-filings/${filing?.id}/`, { srn_number: srnInput.trim() });
//       message.success('SRN saved successfully');
//       setSrnEditing(false);
//       onUpdated?.();
//     } catch (e) {
//       setError(errMsg(e, 'Failed to save SRN'));
//     } finally {
//       setBusy(null);
//     }
//   }, [srnInput, filing?.id, onUpdated]);

//   const send = useCallback(() => {
//     if (!draftApproved) {
//       run('send', () => mcaApi.submit(filing?.id, 'submit-for-review'), 'Drafts & SRN sent for review');
//     } else {
//       run('send', () => mcaApi.submit(filing?.id, 'submit-srn-for-review'), 'Supporting docs sent for review');
//     }
//   }, [draftApproved, filing?.id, run]);

//   if (!filing) {
//     return (
//       <EmptyState icon="📋" text="No filing started yet">
//         <div style={{ fontSize: 12, marginTop: 4 }}>Start the filing process to upload drafts and SRN details.</div>
//         {isMaker && (
//           <button className="btn btn-primary" style={{ marginTop: 14 }} disabled={busy === 'create'}
//             onClick={() => run('create', () => mcaApi.createFiling(caseData?.id))}>
//             {busy === 'create' ? 'Starting…' : 'Start filing process'}
//           </button>
//         )}
//         <ErrorBanner>{error}</ErrorBanner>
//       </EmptyState>
//     );
//   }

//   const statusLine = isClosed ? { color: GR, text: '🔒 Case closed & approved.' }
//     : closurePending ? { color: AMB, text: '⏳ Closure request sent to checker. Waiting for approval…' }
//     : isOpenCase ? { color: SKY, text: '🏢 SRN verified. Case is open and awaiting final closure.' }
//     : (draftReviewStatus === 'pending' || srnReviewStatus === 'pending') ? { color: AMB, text: '⏳ Waiting for checker review…' }
//     : { color: MUT, text: canSend ? `Ready to send ${draftApproved ? 'Supporting Docs' : 'Drafts & SRN'} to checker.` : 'Upload documents or add SRN to proceed.' };

//   const hasSrn = !!filing?.srn_number;
//   const isEditingSrn = !hasSrn || srnEditing;

//   const canEditSrn = isMaker
//     && !isClosed
//     && !['pending', 'approved'].includes(srnReviewStatus)
//     && draftReviewStatus !== 'pending';

//   return (
//     <div>
//       <ErrorBanner>{error}</ErrorBanner>
//       <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
//         <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, padding: '14px 20px', borderBottom: `1px solid ${BRD}` }}>
//           <div>
//             <div style={{ fontSize: 15, fontWeight: 700, color: INK }}>Filing submission</div>
//             <div style={{ fontSize: 12, color: MUT }}>
//               {isSTP ? '⚡ This form closes automatically after SRN approval.' : 'Upload drafts & SRN, then add supporting docs.'}
//             </div>
//           </div>
//           <a className="btn btn-secondary" href={MCA_PORTAL_LOGIN} target="_blank" rel="noopener noreferrer">🌐 Login to MCA portal ↗</a>
//         </div>

//         <div style={{ display: 'flex', flexWrap: 'wrap', gap: 24, padding: 20, borderBottom: `1px solid ${BRD}`, background: '#F8FAFC' }}>
          
//           {/* 1. DRAFT COPY (Multiple Files) */}
//           <div style={{ width: 320, display: 'flex', flexDirection: 'column', gap: 12 }}>
//             <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
//               <div style={{ fontSize: 13, fontWeight: 700, color: INK }}>1 · Draft copies</div>
//               {draftsEditable && (
//                 <Upload accept=".pdf" showUploadList={false} beforeUpload={(f) => { upload('pending_draft', f); return false; }}>
//                   <button className="btn btn-secondary" style={{ padding: '3px 10px', fontSize: 11 }} disabled={busy?.startsWith('upload')}>
//                     <UploadOutlined /> Add Draft
//                   </button>
//                 </Upload>
//               )}
//             </div>
            
//             <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
//               {draftDocs.map((doc, idx) => (
//                 <McaDocCard key={doc.id} doc={doc} title={`Draft Form ${idx + 1}`} icon="📄"
//                   canDelete={draftsEditable && ['draft', 'rejected'].includes(doc.review_status)} 
//                   onRemove={remove} deleting={busy === `delete_${doc.id}`} />
//               ))}
//               {draftDocs.length === 0 && (
//                 <div style={{ fontSize: 12, color: MUT, padding: '14px', border: `1px dashed ${BRD}`, borderRadius: 8, textAlign: 'center', background: WH }}>
//                   No draft files added.
//                 </div>
//               )}
//             </div>
//           </div>

//           {/* 2. SRN NUMBER (Unlocked immediately, sent with Drafts) */}
//           {/* 2. SRN NUMBER */}
//           <div style={{ width: 280, display: 'flex', flexDirection: 'column', gap: 12 }}>
//             <div style={{ fontSize: 13, fontWeight: 700, color: INK }}>2 · SRN Number</div>
//             <div style={{
//               background: WH,
//               border: `1px solid ${BRD}`,
//               borderRadius: 8,
//               padding: 14,
//               display: 'flex',
//               flexDirection: 'column',
//               gap: 10,
//             }}>
//               {isEditingSrn ? (
//                 <Input
//                   placeholder="Enter SRN number"
//                   value={srnInput}
//                   onChange={(e) => setSrnInput(e.target.value)}
//                   size="small"
//                   autoFocus
//                 />
//               ) : (
//                 <div style={{
//                   padding: '6px 12px',
//                   background: '#F1F5F9',
//                   border: '1px solid #CBD5E1',
//                   borderRadius: 6,
//                   fontSize: 13,
//                   fontWeight: 700,
//                   color: '#000000',
//                   fontFamily: 'monospace',
//                   minHeight: 32,
//                   display: 'flex',
//                   alignItems: 'center',
//                 }}>
//                   {filing?.srn_number || '—'}
//                 </div>
//               )}

//               {/* ✅ Buttons tied to canEditSrn — NOT draftsEditable */}
//               {canEditSrn && (
//                 <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
//                   {!isEditingSrn && hasSrn && (
//                     <button
//                       className="btn btn-secondary"
//                       style={{ padding: '4px 14px', fontSize: 12 }}
//                       onClick={() => {
//                         setSrnInput(filing.srn_number || '');
//                         setSrnEditing(true);
//                       }}
//                     >
//                       Edit
//                     </button>
//                   )}
//                   {isEditingSrn && hasSrn && (
//                     <button
//                       className="btn btn-secondary"
//                       style={{ padding: '4px 14px', fontSize: 12 }}
//                       disabled={busy === 'save_srn'}
//                       onClick={() => {
//                         setSrnEditing(false);
//                         setSrnInput(filing.srn_number || '');
//                       }}
//                     >
//                       Cancel
//                     </button>
//                   )}
//                   {isEditingSrn && (
//                     <button
//                       className="btn btn-primary"
//                       style={{ padding: '4px 14px', fontSize: 12 }}
//                       disabled={
//                         busy === 'save_srn'
//                         || !srnInput.trim()
//                         || (hasSrn && srnInput.trim() === (filing.srn_number || ''))
//                       }
//                       onClick={saveSrn}
//                     >
//                       {busy === 'save_srn' ? 'Saving…' : 'Save'}
//                     </button>
//                   )}
//                 </div>
//               )}
//             </div>
//           </div>

//           {/* 3. SUPPORTING DOCS (Unlocked AFTER Drafts+SRN are approved) */}
//           <div style={{ flex: 1, minWidth: 320, display: 'flex', flexDirection: 'column', gap: 12, opacity: draftApproved ? 1 : 0.5, pointerEvents: draftApproved ? 'auto' : 'none' }}>
//             <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
//               <div style={{ fontSize: 13, fontWeight: 700, color: INK }}>3 · Supporting Docs</div>
//               {suppEditable && (
//                 <Upload 
//                   accept=".pdf,.png,.jpg,.jpeg" 
//                   showUploadList={false} 
//                   beforeUpload={(f) => { upload('supporting_doc', f); return false; }}
//                 >
//                   <button className="btn btn-secondary" style={{ padding: '3px 10px', fontSize: 11 }} disabled={busy?.startsWith('upload')}>
//                     <UploadOutlined /> Add File
//                   </button>
//                 </Upload>
//               )}
//             </div>
            
//             <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12 }}>
//               {srnDocs.length > 0 ? (
//                 srnDocs.map((doc, idx) => (
//                   <div key={doc.id} style={{ width: 300 }}>
//                     <McaDocCard doc={doc} title={idx === 0 ? 'SRN Receipt' : `Supporting Doc ${idx}`} icon="📎"
//                       canDelete={suppEditable && ['draft', 'rejected'].includes(doc.review_status)} 
//                       onRemove={remove} deleting={busy === `delete_${doc.id}`} />
//                   </div>
//                 ))
//               ) : (
//                 <div style={{ fontSize: 12, color: MUT, padding: '14px', border: `1px dashed ${BRD}`, borderRadius: 8, width: 300, textAlign: 'center', background: WH }}>
//                   {draftApproved ? 'No supporting files added.' : 'Unlocks after Drafts & SRN are approved.'}
//                 </div>
//               )}
//             </div>
//           </div>

//         </div>

//         <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16, padding: '14px 20px', background: BG }}>
//           <div>
//             <div style={{ fontSize: 13, fontWeight: 600, color: statusLine.color }}>{statusLine.text}</div>
//           </div>
//           <div style={{ display: 'flex', gap: 8 }}>
//             {!isClosed && !isOpenCase && (
//               <button className="btn btn-primary" onClick={send} disabled={!canSend || busy === 'send'}>
//                 {busy === 'send' ? 'Sending…' : `🚀 Send ${draftApproved ? 'Supporting Docs' : 'Drafts & SRN'} for review`}
//               </button>
//             )}
//             {isOpenCase && isMaker && !closurePending && !isSTP && (
//               <button className="btn btn-primary" onClick={() => setCloseOpen(true)}>🎉 Close case</button>
//             )}
//           </div>
//         </div>
//       </div>

//       {closeOpen && (
//         <CloseCaseDialog
//           onClose={() => setCloseOpen(false)}
//           onSubmit={async (payload) => {
//             await mcaApi.submitClosure(filing.id, payload);
//             setCloseOpen(false);
//             message.success('Closure request sent to checker');
//             onUpdated?.();
//           }}
//         />
//       )}
//       {confirmEl}
//     </div>
//   );
// }


// // ══════════════════════════════════════════════════════════════════
// // REVIEW TAB
// // ══════════════════════════════════════════════════════════════════
// function ReviewDocCard({ doc, canReview, busy, onApprove, onReject }) {
//   const isClose = doc.doc_type === 'mca_approval_cert';
//   return (
//     <div className="card" style={{ padding: 14, borderLeft: `4px solid ${doc.review_status === 'escalated' ? VIO : P}`, marginBottom: 12 }}>
//       <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
//         <span style={{ fontSize: 13, fontWeight: 700, color: INK }}>{docLabel(doc)}</span>
//         <div style={{ fontSize: 11.5, color: MUT }}>
//           Submitted by <b style={{ color: 'var(--color-slate-600)' }}>{doc.uploaded_by_name || 'Unknown'}</b> · {fmtDateTime(doc.uploaded_at)}
//         </div>
//       </div>

//       <div style={{ maxWidth: 400 }}>
//         {isClose && !closureHasFile(doc) ? (
//           <div style={{ fontSize: 12.5, color: 'var(--color-slate-600)', padding: '8px 12px', background: BG, borderRadius: 'var(--radius-md)' }}>Maker requested to close this case without an attachment.</div>
//         ) : (
//           <McaDocCard doc={doc} title={docLabel(doc)} icon={docIcon(doc)} canDelete={false} />
//         )}
//       </div>

//       <RejectionNote note={doc.review_status === 'rejected' && doc.review_note} style={{ marginTop: 12 }} />

//       {canReview && (
//         <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 14, borderTop: `1px solid ${BRD}`, paddingTop: 14 }}>
//           <button className="btn btn-secondary" style={{ color: RED }} onClick={onReject} disabled={busy}>Reject</button>
//           <button className="btn btn-primary" onClick={onApprove} disabled={busy}>{busy ? 'Working…' : isClose ? '✓ Approve & close' : '✓ Approve'}</button>
//         </div>
//       )}
//     </div>
//   );
// }

// // ══════════════════════════════════════════════════════════════════
// // REVIEW TAB — Grouped Reviews
// // ══════════════════════════════════════════════════════════════════
// // function ReviewGroupCard({ title, badgeStatus, submittedBy, submittedAt, filing, docs, canReview, busy, onApprove, onReject }) {
// //   const anyEscalated = docs.some((d) => d.review_status === 'escalated');
// //   const hasSrn = !!filing?.srn_number;

// //   return (
// //     <div className="card" style={{ padding: 16, borderLeft: `4px solid ${anyEscalated ? VIO : P}`, marginBottom: 16 }}>
// //       <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16, flexWrap: 'wrap', gap: 8 }}>
// //         <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
// //           <span style={{ fontSize: 14, fontWeight: 700, color: INK }}>{title}</span>
// //           <StatusPill status={badgeStatus} map={REVIEW_STATUS} />
// //         </div>
// //         <div style={{ fontSize: 12, color: MUT }}>
// //           Submitted by <b style={{ color: 'var(--color-slate-600)' }}>{submittedBy || 'Unknown'}</b> · {fmtDateTime(submittedAt)}
// //         </div>
// //       </div>

// //       {/* Show SRN only for Draft bundles since it submits with Drafts */}
// //       {hasSrn && title.includes('Draft') && (
// //         <div style={{ padding: '10px 14px', background: BG, borderRadius: 'var(--radius-md)', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 10 }}>
// //           <span style={{ fontSize: 12, color: MUT, fontWeight: 600 }}>SRN Number:</span>
// //           <span style={{ fontFamily: 'monospace', fontSize: 14, fontWeight: 700, color: INK }}>{filing.srn_number}</span>
// //         </div>
// //       )}

// //       <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12 }}>
// //         {docs.map((d, idx) => (
// //           <div key={d.id} style={{ width: 300 }}>
// //             <McaDocCard doc={d} title={title.includes('Draft') ? `Draft Form ${idx + 1}` : (idx === 0 ? 'SRN Receipt' : `Supporting Doc ${idx}`)} icon={docIcon(d)} canDelete={false} />
// //           </div>
// //         ))}
// //       </div>

// //       <RejectionNote note={badgeStatus === 'rejected' && (filing?.review_note || filing?.srn_review_note || docs[0]?.review_note)} style={{ marginTop: 16 }} />

// //       {canReview && (
// //         <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 16, borderTop: `1px solid ${BRD}`, paddingTop: 16 }}>
// //           <button className="btn btn-secondary" style={{ color: RED }} onClick={onReject} disabled={busy}>Reject</button>
// //           <button className="btn btn-primary" onClick={onApprove} disabled={busy}>{busy ? 'Working…' : '✓ Approve'}</button>
// //         </div>
// //       )}
// //     </div>
// //   );
// // }

// // ══════════════════════════════════════════════════════════════════
// // REVIEW TAB — Grouped Reviews (Individual File Reviewing)
// // ══════════════════════════════════════════════════════════════════
// function ReviewGroupCard({ title, badgeStatus, submittedBy, submittedAt, filing, docs, canReview, busyId, onApprove, onReject }) {
//   const anyEscalated = docs.some((d) => d.review_status === 'escalated');
//   const hasSrn = !!filing?.srn_number;

//   return (
//     <div className="card" style={{ padding: 16, borderLeft: `4px solid ${anyEscalated ? VIO : P}`, marginBottom: 16 }}>
//       <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16, flexWrap: 'wrap', gap: 8 }}>
//         <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
//           <span style={{ fontSize: 14, fontWeight: 700, color: INK }}>{title}</span>
//           <StatusPill status={badgeStatus} map={REVIEW_STATUS} />
//         </div>
//         <div style={{ fontSize: 12, color: MUT }}>
//           Submitted by <b style={{ color: 'var(--color-slate-600)' }}>{submittedBy || 'Unknown'}</b> · {fmtDateTime(submittedAt)}
//         </div>
//       </div>

//       {hasSrn && title.includes('Draft') && (
//         <div style={{ padding: '10px 14px', background: BG, borderRadius: 'var(--radius-md)', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 10 }}>
//           <span style={{ fontSize: 12, color: MUT, fontWeight: 600 }}>SRN Number:</span>
//           <span style={{ fontFamily: 'monospace', fontSize: 14, fontWeight: 700, color: INK }}>{filing.srn_number}</span>
//         </div>
//       )}

//       <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12 }}>
//         {docs.map((d, idx) => (
//           <div key={d.id} style={{ width: 300 }}>
//             {/* ✅ Handlers passed individually to each card ✅ */}
//             <McaDocCard 
//               doc={d} 
//               title={title.includes('Draft') ? `Draft Form ${idx + 1}` : `Supporting Document ${idx + 1}`} 
//               icon={docIcon(d)} 
//               canDelete={false} 
//               reviewMode={canReview}
//               onApprove={onApprove}
//               onReject={onReject}
//               busy={busyId === d.id}
//             />
//           </div>
//         ))}
//       </div>

//       <RejectionNote note={badgeStatus === 'rejected' && (filing?.review_note || filing?.srn_review_note || docs[0]?.review_note)} style={{ marginTop: 16 }} />
//     </div>
//   );
// }



// function ReviewTab({ mcaCase, refreshTick, onUpdated, user }) {
//   const [items, setItems] = useState([]);
//   const [filings, setFilings] = useState([]);
//   const [loading, setLoading] = useState(true);
//   const [error, setError] = useState(null);
//   const [busyId, setBusyId] = useState(null);
//   const [rejectTarget, setRejectTarget] = useState(null);
//   const [acceptTarget, setAcceptTarget] = useState(null);

//   const isFounder = ['founder', 'admin'].includes((user?.role || '').toLowerCase());
//   const isChecker = isInList(mcaCase?.checkers, user);
//   const REVIEWED = ['pending', 'escalated', 'approved', 'rejected', 'accepted'];
  
//   const DRAFT_TYPES = ['draft_form', 'pending_draft'];
//   const SUPP_TYPES = ['srn_receipt', 'challan', 'supporting_doc'];

//   const load = useCallback(async () => {
//     if (!mcaCase?.id) { setItems([]); setFilings([]); setLoading(false); return; }
//     setLoading(true); setError(null);
//     try {
//       const flist = toList(await mcaApi.filings({ mca_case: mcaCase.id }));
//       setFilings(flist);
//       const lists = await Promise.all(flist.map((f) => mcaApi.docs({ filing: f.id }).then(toList).catch(() => [])));
//       // DO NOT filter out !d.is_deleted here, we need them for history!
//       const all = lists.flat().filter((d) => REVIEWED.includes(d.review_status));
//       setItems(all.sort((a, b) => new Date(b.uploaded_at || 0) - new Date(a.uploaded_at || 0)));
//     } catch (e) {
//       setError(errMsg(e, 'Failed to load reviews'));
//       setItems([]); setFilings([]);
//     } finally {
//       setLoading(false);
//     }
//   }, [mcaCase?.id]);

//   useEffect(() => { load(); }, [load, refreshTick]);

//   const canReview = (d) => (d.review_status === 'escalated' ? isFounder : d.review_status === 'pending' && isChecker);

//   const activeDocs = items.filter((d) => ['pending', 'escalated'].includes(d.review_status) && !d.is_deleted);
  
//   // History: Show approved/rejected/accepted — INCLUDING soft-deleted
//   const historyDocs = items.filter((d) => !['pending', 'escalated'].includes(d.review_status));

//   // Group items by Filing and Phase (Drafts vs Supporting Docs)
//   const activeGroups = useMemo(() => {
//     const groups = [];
//     const seen = new Set();

//     filings.forEach((f) => {
//       // 1. Group Drafts together
//       const draftDocs = activeDocs.filter((d) => d.filing === f.id && DRAFT_TYPES.includes(d.doc_type));
//       if (draftDocs.length > 0) {
//         draftDocs.forEach((d) => seen.add(d.id));
//         groups.push({ kind: 'draft_group', title: 'Drafts & SRN Submission', badge: f.review_status || draftDocs[0].review_status, filing: f, docs: draftDocs });
//       }
      
//       // 2. Group Supporting Docs together
//       const suppDocs = activeDocs.filter((d) => d.filing === f.id && SUPP_TYPES.includes(d.doc_type));
//       if (suppDocs.length > 0) {
//         suppDocs.forEach((d) => seen.add(d.id));
//         groups.push({ kind: 'supp_group', title: 'Supporting Documents', badge: f.srn_review_status || suppDocs[0].review_status, filing: f, docs: suppDocs });
//       }
//     });

//     // Everything else (like Closure Certificates) goes individually
//     activeDocs.forEach((d) => {
//       if (!seen.has(d.id)) groups.push({ kind: 'single', doc: d });
//     });

//     return groups;
//   }, [activeDocs, filings]);

//   const decide = async (doc, fn, clear) => {
//     setBusyId(doc.id);
//     try {
//       await fn();
//       clear();
//       await load();
//       onUpdated?.();
//     } finally {
//       setBusyId(null);
//     }
//   };

//   const historyColumns = [
//     { 
//       key: 'doc', 
//       label: 'Document', 
//       align: 'left', 
//       width: 320, 
//       render: (d) => (
//         <span>
//           {docIcon(d)} {docLabel(d)}{closureHasFile(d) || d.doc_type !== 'mca_approval_cert' ? ` — ${d.file_name}` : ''}
//           {d.is_deleted ? <span style={{ color: MUT, fontStyle: 'italic', fontSize: 11 }}> (removed)</span> : ''}
//         </span>
//       ) 
//     },
//     { key: 'by', label: 'Submitted by', align: 'left', render: (d) => d.uploaded_by_name || '—' },
//     { key: 'when', label: 'When', sortable: true, sortFn: (a, b) => new Date(a.uploaded_at) - new Date(b.uploaded_at), render: (d) => fmtDateTime(d.uploaded_at) },
//     { key: 'status', label: 'Status', sortable: true, render: (d) => <StatusPill status={d.review_status} map={REVIEW_STATUS} /> },
//     { key: 'note', label: 'Reason', align: 'left', width: 220, render: (d) => (d.review_status === 'rejected' ? d.review_note || '—' : '—') },
//   ];

//   if (!mcaCase?.id) return <EmptyState icon="🔍" text="No MCA case loaded." />;
//   if (loading) return <Loader label="Loading review items…" />;

//   return (
//     <div>
//       <ErrorBanner>{error}</ErrorBanner>

//       <SectionTitle style={{ marginTop: 0 }}>Active reviews ({activeGroups.length})</SectionTitle>
//       {activeGroups.length === 0 ? (
//         <EmptyState icon="📋" text="No active reviews pending." />
//       ) : activeGroups.map((g, i) => {
//         if (g.kind.includes('group')) {
//           const targetDoc = g.docs[0];
//           return (
//             <ReviewGroupCard 
//               key={`${g.kind}_${g.filing.id}`} 
//               title={g.title} 
//               badgeStatus={g.badge} 
//               submittedBy={targetDoc.uploaded_by_name} 
//               submittedAt={targetDoc.uploaded_at} 
//               filing={g.filing} 
//               docs={g.docs}
//               canReview={canReview(targetDoc)} 
//               busyId={busyId}                                 // ✅ Passed down
//               onApprove={(doc) => setAcceptTarget(doc)}       // ✅ Receives specific doc
//               onReject={(doc) => setRejectTarget(doc)}        // ✅ Receives specific doc
//             />
//           );
//         }
//         return (
//           <ReviewDocCard key={g.doc.id} doc={g.doc} canReview={canReview(g.doc)} busy={busyId === g.doc.id}
//             onApprove={() => setAcceptTarget(g.doc)} onReject={() => setRejectTarget(g.doc)} />
//         );
//       })}

//       <SectionTitle style={{ marginTop: 28 }}>Review history ({historyDocs.length})</SectionTitle>
//       <Table columns={historyColumns} rows={historyDocs} getRowId={(d) => d.id} onRowClick={(d) => (d.doc_type !== 'mca_approval_cert' || closureHasFile(d)) && openFile(d)} emptyMessage="No completed reviews yet." pageSize={10} />

//       {rejectTarget && (
//         <RejectModal onClose={() => setRejectTarget(null)}
//           onRejected={(reason) => decide(rejectTarget, () => mcaApi.rejectDoc(rejectTarget.id, reason), () => setRejectTarget(null))} />
//       )}
//       {acceptTarget && (
//         <AcceptModal onClose={() => setAcceptTarget(null)}
//           showEscalate={isChecker && acceptTarget.review_status === 'pending'}
//           onAccepted={(toCeo) => decide(acceptTarget, () => (toCeo ? mcaApi.escalateDoc(acceptTarget.id) : mcaApi.approveDoc(acceptTarget.id)), () => setAcceptTarget(null))} />
//       )}
//     </div>
//   );
// }

// // ══════════════════════════════════════════════════════════════════
// // AUDIT TRAIL
// // ══════════════════════════════════════════════════════════════════
// const MCA_AUDIT_META = {
//   case_created:         { label: 'Job Created', tone: 'green' },
//   info_update:          { label: 'Info Updated', tone: 'blue' },
//   assignment:           { label: 'Team Assigned', tone: 'blue' }, 
//   mca_docs_submitted:   { label: 'Sent for Review', tone: 'amber' },
//   mca_docs_approved:    { label: 'Draft Approved', tone: 'green' },
//   mca_docs_rejected:    { label: 'Draft Rejected', tone: 'red' },
//   mca_docs_escalated:   { label: 'Moved to CEO', tone: 'purple' },
//   mca_srn_uploaded:     { label: 'SRN Sent for Review', tone: 'amber' },
//   mca_srn_approved:     { label: 'SRN Verified', tone: 'green' },
//   mca_srn_rejected:     { label: 'SRN Rejected', tone: 'red' },
//   mca_srn_escalated:    { label: 'SRN Moved to CEO', tone: 'purple' },
//   mca_outcome_approved: { label: 'Approved', tone: 'green' },
//   mca_outcome_rejected: { label: 'Rejected', tone: 'red' },
//   mca_outcome_resubmit: { label: 'Resubmission', tone: 'amber' },
//   mca_filing_closed:    { label: 'Case Closed', tone: 'green' },
// };

// const MCA_AUDIT_CATEGORIES = [
//   { id: 'all', label: 'All events', match: () => true },
//   { id: 'client', label: 'Client info', match: (e) => e.event_type === 'info_update' },
//   { id: 'submitted', label: 'Submissions', match: (e) => e.event_type.includes('submitted') || e.event_type === 'mca_srn_uploaded' },
//   { id: 'approved', label: 'Approved', match: (e) => e.event_type.includes('approved') },
//   { id: 'rejected', label: 'Rejected', match: (e) => e.event_type.includes('rejected') },
//   { id: 'escalated', label: 'Moved to CEO', match: (e) => e.event_type.includes('escalated') },
// ];

// const isClosureEvent = (log) => {
//   const t = (log.title || '').toLowerCase();
//   const nv = log.new_values || {};
//   return log.event_type === 'mca_filing_closed' || t.includes('case closure') || t.includes('case closed')
//     || (nv.label || '').toLowerCase() === 'case closure' || (nv.kind || '').toLowerCase() === 'close_request';
// };

// function mcaEventLabel(log) {
//   const type = log.event_type;
//   let { label, tone } = MCA_AUDIT_META[type];
//   const closure = isClosureEvent(log);
//   if (closure) {
//     if (type === 'mca_filing_closed' || (log.title || '').toLowerCase().includes('case closed')) [label, tone] = ['Case Closed', 'green'];
//     else if (type.includes('submitted') || type.includes('uploaded')) [label, tone] = ['Closure Submitted', 'amber'];
//     else if (type.includes('approved')) [label, tone] = ['Closure Approved', 'green'];
//     else if (type.includes('rejected')) [label, tone] = ['Closure Rejected', 'red'];
//     else if (type.includes('escalated')) [label, tone] = ['Closure to CEO', 'purple'];
//   }
//   const actor = type === 'case_created' ? 'Created by'
//     : type === 'info_update' ? 'Updated by'
//     : type === 'assignment' ? 'Assigned by' 
//     : closure && type === 'mca_filing_closed' ? 'Closed by'
//     : type.includes('submitted') || type.includes('uploaded') ? 'Submitted by'
//     : type.includes('approved') ? 'Approved by'
//     : type.includes('rejected') ? 'Rejected by'
//     : type.includes('escalated') ? 'Moved to CEO by' : 'By';
//   return { label, tone, actor };
// }

// function McaAuditDetail({ log }) {
//   const type = log.event_type;
//   const nv = log.new_values || {};
//   const ov = log.old_values || {};
//   const files = [...new Set([nv.file_name, ...(nv.files || []), ...(nv.draft_files || []), ...(nv.supporting_docs || [])].filter(Boolean))];
//   const reason = type.includes('rejected') && (nv.rejection_reason || nv.note);
//   const box = { marginTop: 6, padding: '8px 12px', background: BG, border: `1px solid ${BRD}`, borderRadius: 'var(--radius-sm)', fontSize: 12 };
//   return (
//     <>
//       {type === 'case_created' && (nv.task_id || nv.client_name) && (
//         <div style={{ ...box, display: 'flex', gap: 12, flexWrap: 'wrap' }}>
//           {nv.task_id && <span><b style={{ color: MUT }}>Task ID:</b> <span style={{ fontFamily: 'monospace' }}>📋 {nv.task_id}</span></span>}
//           {nv.client_name && <span><b style={{ color: MUT }}>Client:</b> {nv.client_name}</span>}
//         </div>
//       )}
//       {(files.length > 0 || nv.srn_number) && (
//         <div style={{ ...box, display: 'flex', flexDirection: 'column', gap: 4 }}>
//           {files.map((f) => <span key={f} style={{ color: P, fontWeight: 600 }}>📄 {f}</span>)}
//           {nv.srn_number && <span><b style={{ color: MUT }}>SRN:</b> <span style={{ fontFamily: 'monospace' }}>{nv.srn_number}</span></span>}
//         </div>
//       )}
//       {reason && <div style={{ ...box, background: REDL, borderColor: REDB, color: RED }}><b>Reason:</b> {reason}</div>}
//       {type === 'info_update' && Object.keys(nv).length > 0 && (
//         <div style={{ ...box, display: 'flex', flexDirection: 'column', gap: 4 }}>
//           {Object.keys(nv).filter((k) => !['rejection_reason', 'reason', 'doc_type', 'notice_din'].includes(k)).map((k) => (
//             <div key={k} style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
//               <span style={{ width: 130, fontWeight: 600, color: INK, textTransform: 'capitalize' }}>{k.replace(/_/g, ' ')}</span>
//               <span style={{ color: RED, textDecoration: 'line-through' }}>{String(ov[k] || 'None')}</span>
//               <span style={{ color: MUT }}>→</span>
//               <span style={{ color: GR, fontWeight: 600 }}>{String(nv[k] || 'None')}</span>
//             </div>
//           ))}
//         </div>
//       )}
//       {type === 'mca_filing_closed' && (
//         <div style={{ ...box, color: GR, fontWeight: 700 }}>
//           <span style={{ color: MUT }}>Status:</span> {String(ov.status || '—').replace(/_/g, ' ')} → CLOSED
//         </div>
//       )}

//       {/* {type === 'assignment' && (
//         <div style={{ ...box, fontSize: 12.5, color: INK, fontWeight: 600 }}>
//           {nv.summary || log.title || 'Team updated'}
//         </div>
//       )} */}

//     </>
//   );
// }

// function AuditTab({ clientId, jobId, refreshTick }) {
//   const load = useCallback(async () => {
//     const res = await api.get('/legal-services/audit-trail/', { params: { client: clientId, litigation_type: 'mca', job_id: jobId } });
//     return toList(res)
//       .filter((e) => MCA_AUDIT_META[e.event_type]
//         && !(e.event_type === 'mca_srn_uploaded' && (e.title || '').toLowerCase().includes('uploaded')))
//       .map((e) => {
//         const { label, tone, actor } = mcaEventLabel(e);
//         return { ...e, action: label, tone: EVENT_TONES[tone], actor_label: actor, user: e.by_name, note: undefined, description: undefined };
//       });
//   }, [clientId, jobId]);

//   if (!jobId) return <EmptyState icon="🕐" text="No MCA case loaded." />;

//   return (
//     <AuditTrailTab
//       title="MCA Audit Trail"
//       reloadKey={`${clientId}-${jobId}-${refreshTick}`}
//       load={load}
//       categories={MCA_AUDIT_CATEGORIES}
//       searchText={(e) => [e.new_values?.file_name, e.new_values?.srn_number]}
//       searchPlaceholder="Search title, file, person…"
//       renderDetail={(e) => <McaAuditDetail log={e} />}
//     />
//   );
// }


// // ══════════════════════════════════════════════════════════════════
// // DOCUMENTS TAB — Show ALL documents (Drafts, SRN, Supporting)
// // ══════════════════════════════════════════════════════════════════
// function McaDocumentsTab({ caseData, refreshTick }) {
//   const [items, setItems] = useState([]);
//   const [loading, setLoading] = useState(true);
//   const [header, setHeader] = useState('');

//   useEffect(() => {
//     let alive = true;
//     if (!caseData?.id) { setItems([]); setLoading(false); return undefined; }
//     setLoading(true);
//     (async () => {
//       let filings = caseData.filings || [];
//       if (!filings.length) {
//         filings = toList(await mcaApi.filings({ mca_case: caseData.id }).catch(() => ({ data: [] })));
//       }
//       const withDocs = await Promise.all(filings.map(async (f) => ({
//         filing: f,
//         docs: f.documents || toList(await mcaApi.docs({ filing: f.id }).catch(() => ({ data: [] }))),
//       })));

//       const flat = [];
//       let titleBits = [];
//       withDocs.forEach(({ filing: f, docs }, i) => {
//         titleBits.push(`Filing ${i + 1}${f.srn_number ? ` · SRN ${f.srn_number}` : ''}`);

//         // Fetch ALL files, excluding deleted ones
//         const draftDocs = docs.filter((d) => ['draft_form', 'pending_draft'].includes(d.doc_type) && !d.is_deleted);
//         const srnDocs = docs.filter((d) => ['srn_receipt', 'challan', 'supporting_doc'].includes(d.doc_type) && !d.is_deleted);
//         const certDocs = docs.filter((d) => d.doc_type === 'mca_approval_cert' && closureHasFile(d) && !d.is_deleted);

//         // Push ALL Drafts
//         draftDocs.forEach((d, idx) => {
//           flat.push({ key: `draft_${d.id}`, label: `Draft Form ${idx + 1}`, icon: '📄', doc: d });
//         });

//         // Push ALL SRN / Supporting Docs
//         srnDocs.forEach((d, idx) => {
//           flat.push({
//             key: `srn_${d.id}`,
//             label: idx === 0 ? 'SRN Receipt' : `Supporting Doc ${idx}`,
//             icon: '📎',
//             doc: d,
//           });
//         });

//         // Push ALL Case Closure Docs
//         certDocs.forEach((d) => {
//           flat.push({ key: `cert_${d.id}`, label: 'Closure Document', icon: '📜', doc: d });
//         });
//       });

//       if (alive) {
//         setItems(flat);
//         setHeader(titleBits.join(' · ') || 'Filing Documents');
//       }
//     })()
//       .catch(() => { if (alive) setItems([]); })
//       .finally(() => { if (alive) setLoading(false); });
//     return () => { alive = false; };
//   }, [caseData, refreshTick]);

//   if (!caseData?.id) return <EmptyState icon="📂" text="No MCA case loaded." />;
//   if (loading) return <Loader label="Loading documents…" />;
//   if (!items.length) {
//     return <EmptyState icon="📂" text="No filings yet. Start the filing process on the Activity tab." />;
//   }

//   return (
//     <div className="card" style={{ padding: 16 }}>
//       <div style={{ fontSize: 13, fontWeight: 700, color: INK, marginBottom: 14 }}>
//         {header}
//         <span style={{ fontWeight: 500, color: MUT, marginLeft: 8 }}>
//           · {items.length} file{items.length === 1 ? '' : 's'}
//         </span>
//       </div>

//       <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12 }}>
//         {items.map((it) => (
//           <div key={it.key} style={{ width: 260 }}>
//             <McaDocCard
//               doc={it.doc}
//               title={it.label}
//               icon={it.icon}
//               canDelete={false} // Documents tab is view-only
//             />
//           </div>
//         ))}
//       </div>
//     </div>
//   );
// }

// // ══════════════════════════════════════════════════════════════════
// // PAGE
// // ══════════════════════════════════════════════════════════════════
// const mcaFallbackRows = (c) => [
//   ['Reference No.', c.reference_no],
//   ['Sub-Service', c.sub_service_name || c.filing_type],
//   ['Status', <StatusPill key="status" status={getMcaStatus(c)} />],
//   ['Created By', c.created_by_name],
//   ['Financial Year', c.financial_year],
//   ['Period', c.period],
//   ['Due Date', fmtDate(c.due_date)],
// ];

// export default function MCAWorkspace() {
//   const { clientId } = useParams();
//   const navigate = useNavigate();
//   const [searchParams] = useSearchParams();
//   const { user } = useAuth();

//   const isInvalidClient = !clientId || clientId === 'undefined' || clientId === 'null';
//   const caseId = searchParams.get('caseId');

//   const [client, setClient] = useState(null);
//   const [caseData, setCaseData] = useState(null);
//   const [loading, setLoading] = useState(true);
//   const [error, setError] = useState(null);
//   const [teamLoading, setTeamLoading] = useState(false);
//   const [constitutions, setConstitutions] = useState([]);
//   const [activeTab, setActiveTab] = useState(() => {
//     const t = searchParams.get('tab');
//     return t === 'details' ? 'client' : t || 'client';
//   });
//   const [refreshTick, setRefreshTick] = useState(0);
//   const bumpRefresh = () => setRefreshTick((t) => t + 1);

//   useEffect(() => {
//     const params = new URLSearchParams(window.location.search);
//     params.set('tab', activeTab);
//     window.history.replaceState(null, '', `${window.location.pathname}?${params.toString()}`);
//   }, [activeTab]);

//   useEffect(() => {
//     api.get('/clients/constitutions/').then((res) => setConstitutions(toList(res))).catch(() => setConstitutions([]));
//   }, []);

//   const loadClient = useCallback(async () => {
//     try {
//       setClient((await api.get(`/legal-services/client/${clientId}/`)).data);
//     } catch {
//       try { setClient((await api.get(`/clients/clients/${clientId}/`)).data); } catch { setError('Failed to load client details.'); }
//     }
//   }, [clientId]);

//   useEffect(() => {
//     if (isInvalidClient) return;
//     setLoading(true);
//     loadClient().finally(() => setLoading(false));
//   }, [isInvalidClient, loadClient]);

//   const taskCode = searchParams.get('task');
//   const taskPk = searchParams.get('taskPk');
//   useEffect(() => {
//     if (isInvalidClient) return;
//     setTeamLoading(true);
//     resolveCase({
//       caseId,
//       taskRef: taskCode || taskPk ? { code: taskCode, id: taskPk } : null,
//       getById: (id) => mcaApi.getCase(id).then((r) => r.data),
//       listForClient: () => mcaApi.cases({ client: clientId }).then(toList),
//     })
//       .then((c) => setCaseData(c ? { ...c, makers: c.makers || [], checkers: c.checkers || [] } : null))
//       .catch(() => setCaseData(null))
//       .finally(() => setTeamLoading(false));
//   }, [isInvalidClient, clientId, caseId, taskCode, taskPk, refreshTick]);

//   const service = useMemo(() => mcaServiceOf(caseData), [caseData]);

//   if (isInvalidClient) {
//     return (
//       <div className="page-container">
//         <EmptyState icon="⚠️" text="We couldn't find valid client details for this link.">
//           <button className="btn btn-primary" style={{ marginTop: 12 }} onClick={() => navigate('/legal-services/mca')}>Return to MCA</button>
//         </EmptyState>
//       </div>
//     );
//   }
//   if (loading) return <div className="page-container"><Loader label="Loading client…" /></div>;
//   if (error) return <div className="page-container"><ErrorBanner>{error}</ErrorBanner></div>;
//   if (!client) return <div className="page-container"><EmptyState text="No client data found" /></div>;

//   const { fy, ay } = getFYandAY();
//   const tab = resolveTab(activeTab, MCA_TABS);

//   const subService =
//     searchParams.get('subService') || caseData?.sub_service_name || null;

//   // Fully dynamic routes resolved from service (mcaServiceOf)
//   const selectorPath = service.dashboardPath; // /legal-services/mca/company or /llp
//   const dashPath = `${service.dashboardPath}/dashboard${
//     subService ? `?subService=${encodeURIComponent(subService)}` : ''
//   }`;
//   const jobsPath = `${service.jobListPath}${
//     subService ? `?subService=${encodeURIComponent(subService)}` : ''
//   }`;

//   const breadcrumbSteps = [
//     { label: 'Legal Services', onClick: () => navigate('/legal-services') },
//     { label: 'MCA', onClick: () => navigate('/legal-services/mca') },
//     { label: service.label, onClick: () => navigate(selectorPath) },
//     { label: 'Dashboard', onClick: () => navigate(dashPath) },
//     ...(subService
//       ? [{ label: subService, onClick: () => navigate(jobsPath) }]
//       : []),
//     { label: client.name },
//   ];

//   return (
//     <main className="page-container">
//       <JobWorkspaceShell
//         breadcrumb={breadcrumbSteps}
//         title={client.name}
//         statusNode={<StatusPill status={getMcaStatus(caseData)} />}
//         rightChip={caseData?.sub_service_name ? `📄 ${caseData.sub_service_name}` : null}
//         meta={[
//           fy,
//           ay,
//           caseData?.financial_year ? `FY: ${caseData.financial_year}` : null,
//           <LinkedTaskLink key="task" caseData={caseData} onTaskUpdated={bumpRefresh} />,
//         ].filter(Boolean)}
//         tabs={MCA_TABS}
//         activeTab={tab}
//         onTabChange={setActiveTab}
//       >
//         {tab === 'client' && (
//           <DetailsTab
//             clientId={clientId} client={client} caseData={caseData} constitutions={constitutions}
//             canEdit={isInList(caseData?.makers, user)}
//             requestHeaders={{ 'X-Litigation-Type': 'mca', 'X-Job-Id': caseData?.id?.toString() || '' }}
//             onSaved={async () => { await loadClient(); bumpRefresh(); }}
//           />
//         )}
//         {tab === 'activity' && (
//           <ActivityTab caseData={caseData} filing={caseData?.filings?.[0] || null} user={user} onUpdated={bumpRefresh} />
//         )}
//         {tab === 'docs' && <McaDocumentsTab caseData={caseData} refreshTick={refreshTick} />}
//         {tab === 'review' && <ReviewTab mcaCase={caseData} refreshTick={refreshTick} onUpdated={bumpRefresh} user={user} />}
//         {tab === 'team' && (
//           <TeamTab
//             caseData={caseData}
//             loading={teamLoading}
//             fallbackRows={mcaFallbackRows}
//           />
//         )}
//         {tab === 'audit' && <AuditTab clientId={clientId} jobId={caseData?.id} refreshTick={refreshTick} />}
//       </JobWorkspaceShell>
//     </main>
//   );
// }



























// MCAWorkspace.js — one client's MCA filing workspace.
// Tabs: Client Details · Activity · Documents · Review · Team · Audit Trail

import { useEffect, useState, useCallback, useMemo } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { Checkbox, Input, Upload, message } from 'antd';
import { UploadOutlined } from '@ant-design/icons';
import { api } from '../../../services/api';
import { useAuth } from '../../../contexts/AuthContext';
import Modal from '../../../components/Modal';
import Table from '../../../components/Table';
import {
  EmptyState, ErrorBanner, SectionTitle, toList, isInList, fmtDate, fmtDateTime, openFile, downloadDoc,
  P, BRD, BG, MUT, INK, GR, RED, REDL, REDB, AMB, PL, WH, SKY, VIO,
} from '../../IncomeTaxPage/JobUiCommon';
import {
  JobWorkspaceShell, Loader, AuditTrailTab, DocGroupsCard, COMMON_TABS, EVENT_TONES, REVIEW_BADGES, resolveTab,
} from '../../IncomeTaxPage/JobWorkspaceCommon';
import {
  StatusPill, REVIEW_STATUS, RejectModal, AcceptModal, useConfirm,
  mcaApi, mcaServiceOf, getMcaStatus, MCA_PORTAL_LOGIN, resolveCase,
} from '../LegalModals';
import { DetailsTab, getFYandAY, LinkedTaskLink, TeamTab } from '../LegalWorkSpace';

const MCA_TABS = [
  COMMON_TABS.client,
  COMMON_TABS.docs,
  { key: 'activity', label: 'Activity', icon: '⚖️' },
  { key: 'review', label: 'Review', icon: '🔍' },
  COMMON_TABS.team,
  COMMON_TABS.audit,
];

const errMsg = (e, fallback) => e?.response?.data?.error || e?.response?.data?.detail || fallback;

const closureHasFile = (doc) => {
  const n = (doc?.file_name || '').toLowerCase();
  return !!n && !n.includes('no attachment') && !(n.endsWith('.txt') && n.includes('closure'));
};

const DOC_META = {
  pending_draft:     { label: 'Draft Form PDF', icon: '📄' },
  draft_form:        { label: 'Draft Form PDF', icon: '📄' },
  srn_receipt:       { label: 'Supporting Document', icon: '📎' }, 
  challan:           { label: 'Supporting Document', icon: '📎' }, 
  acknowledgment:    { label: 'Supporting Document', icon: '📎' }, 
  supporting_doc:    { label: 'Supporting Document', icon: '📎' },
  pending_support:   { label: 'Supporting Document', icon: '📎' },
  mca_approval_cert: { label: 'Case Close Request', icon: '🔒' },
};
const docLabel = (d) => (d.doc_type === 'mca_approval_cert' && closureHasFile(d) ? 'Approval Certificate' : DOC_META[d.doc_type]?.label || d.doc_type);
const docIcon = (d) => (d.doc_type === 'mca_approval_cert' ? (closureHasFile(d) ? '📜' : '🔒') : DOC_META[d.doc_type]?.icon || '📄');

function RejectionNote({ note, style }) {
  if (!note) return null;
  return (
    <div style={{ padding: '8px 12px', background: REDL, border: `1px solid ${REDB}`, borderRadius: 'var(--radius-md)', fontSize: 12, color: RED, ...style }}>
      <b>Rejection reason:</b> {note}
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════
// COMPACT Upload Box
// ══════════════════════════════════════════════════════════════════
function UploadBox({ icon, text, enabled, accept, onFile, busy }) {
  return (
    <label style={{
      display: 'block', padding: '18px 12px', textAlign: 'center', borderRadius: 'var(--radius-md)',
      border: `2px dashed ${enabled ? '#CBD5E1' : BRD}`, background: enabled ? WH : BG,
      cursor: enabled && !busy ? 'pointer' : 'not-allowed', opacity: enabled ? 1 : 0.6,
    }}>
      <input type="file" hidden accept={accept} disabled={!enabled || busy}
        onChange={(e) => { const f = e.target.files?.[0]; e.target.value = ''; if (f) onFile(f); }} />
      <div style={{ fontSize: 22, opacity: 0.5, marginBottom: 4 }}>{icon}</div>
      <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--color-slate-600)' }}>{busy ? 'Uploading…' : text}</div>
    </label>
  );
}

// COMPACT Green Grid Card for Documents
function McaDocCard({ doc, title, icon, canDelete, onRemove, deleting, reviewMode, onApprove, onReject, busy }) {
  if (!doc) return null;
  const isFile = doc.file_name && !doc.file_name.includes('no attachment') && !doc.file_name.endsWith('.txt');

  const borderColor = '#8ECEBF';
  const shadow = '0 0 0 2px #C3E8DC';
  const actionBg = '#F2FBF7';
  const fileColor = GR;

  const actBtn = (color, last) => ({
    flex: 1, padding: '7px 0', fontSize: 11, fontWeight: 500, color, background: 'none', border: 'none',
    borderRight: last ? 'none' : `1px solid ${borderColor}`, cursor: 'pointer', fontFamily: 'inherit',
  });

  return (
    <div style={{ background: WH, border: `1px solid ${borderColor}`, borderRadius: 10, overflow: 'hidden', boxShadow: shadow, transition: 'all .15s', display: 'flex', flexDirection: 'column', height: '100%' }}>
      
      <div style={{ padding: '10px 12px', borderBottom: `1px solid ${borderColor}`, flex: 1 }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8 }}>
          <div style={{ minWidth: 0 }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: INK, marginBottom: 2 }}>
              {icon ? `${icon} ` : ''}{title}
            </div>
          </div>
          <div style={{ flexShrink: 0 }}>
            <StatusPill status={doc.review_status} map={REVIEW_STATUS} />
          </div>
        </div>
        
        {isFile ? (
          <div title={doc.file_name} style={{ marginTop: 6, fontSize: 11, color: fileColor, fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            ✓ {doc.file_name}
          </div>
        ) : (
          <div style={{ marginTop: 6, fontSize: 11, color: MUT, fontStyle: 'italic', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            No attachment provided
          </div>
        )}
      </div>

      <div style={{ display: 'flex', background: actionBg }}>
        <button type="button" onClick={() => isFile && openFile(doc)} disabled={!isFile} style={{ ...actBtn(P, false), opacity: isFile ? 1 : 0.5, cursor: isFile ? 'pointer' : 'default' }}>View</button>
        <button type="button" onClick={() => isFile && downloadDoc(doc)} disabled={!isFile} style={{ ...actBtn(fileColor, !canDelete), opacity: isFile ? 1 : 0.5, cursor: isFile ? 'pointer' : 'default' }}>Download</button>
        {canDelete && (
          <button type="button" onClick={() => onRemove(doc)} disabled={deleting} style={{ ...actBtn(RED, true), cursor: deleting ? 'wait' : 'pointer', opacity: deleting ? 0.5 : 1 }}>
            {deleting ? 'Deleting…' : 'Delete'}
          </button>
        )}
      </div>

      {reviewMode && ['pending', 'escalated'].includes(doc.review_status) && (
        <div style={{ display: 'flex', background: '#F8FAFC', borderTop: `1px solid ${borderColor}` }}>
          <button type="button" onClick={() => onReject(doc)} disabled={busy}
            style={{ flex: 1, padding: '8px 0', fontSize: 11, fontWeight: 600, color: RED, background: 'none', border: 'none', borderRight: `1px solid ${borderColor}`, cursor: busy ? 'wait' : 'pointer' }}>
            Reject
          </button>
          <button type="button" onClick={() => onApprove(doc)} disabled={busy}
            style={{ flex: 1, padding: '8px 0', fontSize: 11, fontWeight: 700, color: GR, background: 'none', border: 'none', cursor: busy ? 'wait' : 'pointer' }}>
            {busy ? 'Working...' : '✓ Approve'}
          </button>
        </div>
      )}
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════
// STP FORMS
// ══════════════════════════════════════════════════════════════════
const STP_FORMS = [
  'addition of auditor adt-1',
  'addition of auditor – adt-1',
  'aoc-4 filing',
  'aoc-4 xbrl filing',
  'dpt-3 filing',
  'mgt-7 filing',
  'mgt-7a filing',
  'form-11 (llp)',
  'form 11',
  'form-8 (llp)',
  'form 8',
  'dir-3 kyc',
  'dir-3 kyc / roc dir-3 returns',
  'pas-6 reconciliation of share capital audit report',
  'pas-6',
  'ben forms filing',
  'msme form-1 filing',
];

const isSTPForm = (name) => STP_FORMS.includes((name || '').toLowerCase().trim());

function CloseCaseDialog({ onClose, onSubmit }) {
  const [confirmed, setConfirmed] = useState(false);
  const [file, setFile] = useState(null);
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const submit = async () => {
    setBusy(true); setError('');
    try {
      await onSubmit({ note, file });
    } catch (e) {
      setError(errMsg(e, 'Failed to submit closure'));
      setBusy(false);
    }
  };

  return (
    <Modal
      isOpen icon="🔒" title="Close MCA case" subtitle="Goes to the checker for approval"
      onClose={() => !busy && onClose()}
      footer={
        <>
          <button className="btn btn-secondary" onClick={onClose} disabled={busy}>Cancel</button>
          <button className="btn btn-primary" onClick={submit} disabled={!confirmed || busy}>{busy ? 'Sending…' : 'Send for review'}</button>
        </>
      }
    >
      <div className="card" style={{ padding: '12px 14px', marginBottom: 14 }}>
        <Checkbox checked={confirmed} onChange={(e) => setConfirmed(e.target.checked)}>
          <span style={{ fontWeight: 600, color: INK }}>I confirm this filing is approved on the MCA portal and is ready to be closed.</span>
        </Checkbox>
      </div>
      <div style={{ fontSize: 'var(--font-size-sm)', fontWeight: 500, color: 'var(--color-slate-600)', marginBottom: 4 }}>Attachment (optional)</div>
      <Upload accept=".pdf,.png,.jpg,.jpeg" maxCount={1} fileList={file ? [file] : []}
        beforeUpload={(f) => { setFile(f); return false; }} onRemove={() => setFile(null)}>
        <button type="button" className="btn btn-secondary"><UploadOutlined /> Choose file</button>
      </Upload>
      <div style={{ marginTop: 14 }}>
        <Input.TextArea rows={2} value={note} onChange={(e) => setNote(e.target.value)} placeholder="Note for checker (optional)" />
      </div>
      {error && <div style={{ marginTop: 12 }}><ErrorBanner>{error}</ErrorBanner></div>}
    </Modal>
  );
}

// ══════════════════════════════════════════════════════════════════
// ACTIVITY TAB
// ══════════════════════════════════════════════════════════════════
function ActivityTab({ caseData, filing, user, onUpdated }) {
  const [busy, setBusy] = useState(null);
  const [error, setError] = useState(null);
  const [closeOpen, setCloseOpen] = useState(false);
  const [srnInput, setSrnInput] = useState('');
  const [srnEditing, setSrnEditing] = useState(false);
  const [confirm, confirmEl] = useConfirm();

  useEffect(() => {
    if (filing?.srn_number) setSrnInput(filing.srn_number);
  }, [filing?.srn_number]);

  const isMaker = isInList(caseData?.makers, user);
  const docs = (filing?.documents || []).filter((d) => !d.is_deleted);

  const draftDocs = docs.filter((d) => ['draft_form', 'pending_draft'].includes(d.doc_type));
  const srnDocs = docs.filter((d) => ['srn_receipt', 'challan', 'acknowledgment', 'supporting_doc', 'pending_support'].includes(d.doc_type));

  const status = getMcaStatus(caseData);
  const isSTP = isSTPForm(caseData?.sub_service_name);

  const draftReviewStatus = filing?.review_status || 'not_applicable';
  const srnReviewStatus = filing?.srn_review_status || 'not_applicable';
  
  const draftApproved = draftReviewStatus === 'approved' || draftReviewStatus === 'accepted';
  const isClosed = status === 'closed' || (isSTP && srnReviewStatus === 'approved');
  const isOpenCase = status === 'open' && !isClosed;
  const closurePending = docs.some((d) => d.doc_type === 'mca_approval_cert' && ['pending', 'escalated'].includes(d.review_status));

  const draftsEditable = isMaker && ['draft', 'rejected', 'not_applicable'].includes(draftReviewStatus);
  const suppEditable = isMaker && draftApproved && ['draft', 'rejected', 'not_applicable'].includes(srnReviewStatus);
  const canEditSrn = isMaker && !isClosed && !['pending', 'approved'].includes(srnReviewStatus) && draftReviewStatus !== 'pending';

  const unsubmittedDrafts = draftDocs.some(d => d.review_status === 'draft');
  const canSendDraftBundle = draftsEditable && unsubmittedDrafts && !!filing?.srn_number;

  const unsubmittedSupps = srnDocs.some(d => d.review_status === 'draft');
  const canSendSuppBundle = suppEditable && unsubmittedSupps;

  const canSend = canSendDraftBundle || canSendSuppBundle;

  const run = useCallback(async (key, fn, okMsg) => {
    setBusy(key); setError(null);
    try {
      await fn();
      if (okMsg) message.success(okMsg);
      onUpdated?.();
    } catch (e) { setError(errMsg(e, 'Something went wrong')); } finally { setBusy(null); }
  }, [onUpdated]);

  const upload = useCallback((docType, file) => run(`upload_${docType}`, () => mcaApi.uploadDoc(filing?.id, docType, file), 'File uploaded'), [filing?.id, run]);

  const remove = useCallback(async (doc) => {
    if (!(await confirm({ 
      title: 'Remove this file?', 
      message: 'This action cannot be undone.', 
      confirmLabel: 'Remove', 
      danger: true 
    }))) return;
    run(`delete_${doc.id}`, () => mcaApi.removeDoc(doc.id), 'File removed from Activity');
  }, [confirm, run]);

  const saveSrn = useCallback(async () => {
    if (!srnInput.trim()) return setError('Please enter an SRN number.');
    setBusy('save_srn'); setError(null);
    try {
      await api.patch(`/legal-services/mca-filings/${filing?.id}/`, { srn_number: srnInput.trim() });
      message.success('SRN saved successfully');
      setSrnEditing(false);
      onUpdated?.();
    } catch (e) {
      setError(errMsg(e, 'Failed to save SRN'));
    } finally {
      setBusy(null);
    }
  }, [srnInput, filing?.id, onUpdated]);

  const send = useCallback(() => {
    if (!draftApproved) {
      run('send', () => mcaApi.submit(filing?.id, 'submit-for-review'), 'Drafts & SRN sent for review');
    } else {
      run('send', () => mcaApi.submit(filing?.id, 'submit-srn-for-review'), 'Supporting docs sent for review');
    }
  }, [draftApproved, filing?.id, run]);

  if (!filing) {
    return (
      <EmptyState icon="📋" text="No filing started yet">
        <div style={{ fontSize: 12, marginTop: 4 }}>Start the filing process to upload drafts and SRN details.</div>
        {isMaker && (
          <button className="btn btn-primary" style={{ marginTop: 14 }} disabled={busy === 'create'}
            onClick={() => run('create', () => mcaApi.createFiling(caseData?.id))}>
            {busy === 'create' ? 'Starting…' : 'Start filing process'}
          </button>
        )}
        <ErrorBanner>{error}</ErrorBanner>
      </EmptyState>
    );
  }

  const statusLine = isClosed ? { color: GR, text: '🔒 Case closed & approved.' }
    : closurePending ? { color: AMB, text: '⏳ Closure request sent to checker. Waiting for approval…' }
    : isOpenCase ? { color: SKY, text: '🏢 SRN verified. Case is open and awaiting final closure.' }
    : (draftReviewStatus === 'pending' || srnReviewStatus === 'pending') ? { color: AMB, text: '⏳ Waiting for checker review…' }
    : { color: MUT, text: canSend ? `Ready to send ${draftApproved ? 'Supporting Docs' : 'Drafts & SRN'} to checker.` : 'Upload documents or add SRN to proceed.' };

  const hasSrn = !!filing?.srn_number;
  const isEditingSrn = !hasSrn || srnEditing;

  return (
    <div>
      <ErrorBanner>{error}</ErrorBanner>
      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, padding: '14px 20px', borderBottom: `1px solid ${BRD}` }}>
          <div>
            <div style={{ fontSize: 15, fontWeight: 700, color: INK }}>Filing submission</div>
            <div style={{ fontSize: 12, color: MUT }}>
              {isSTP ? '⚡ This form closes automatically after SRN approval.' : 'Upload drafts & SRN, then add supporting docs.'}
            </div>
          </div>
          <a className="btn btn-secondary" href={MCA_PORTAL_LOGIN} target="_blank" rel="noopener noreferrer">🌐 Login to MCA portal ↗</a>
        </div>

        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 24, padding: 20, borderBottom: `1px solid ${BRD}`, background: '#F8FAFC' }}>
          
          {/* 1. DRAFT COPY */}
          <div style={{ width: 320, display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: INK }}>1 · Draft copies</div>
              {draftsEditable && (
                <Upload accept=".pdf" showUploadList={false} beforeUpload={(f) => { upload('pending_draft', f); return false; }}>
                  <button className="btn btn-secondary" style={{ padding: '3px 10px', fontSize: 11 }} disabled={busy?.startsWith('upload')}>
                    <UploadOutlined /> Add Draft
                  </button>
                </Upload>
              )}
            </div>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {draftDocs.map((doc, idx) => (
                <McaDocCard key={doc.id} doc={doc} title={`Draft Form ${idx + 1}`} icon="📄"
                  canDelete={draftsEditable && ['draft', 'rejected'].includes(doc.review_status)} 
                  onRemove={remove} deleting={busy === `delete_${doc.id}`} />
              ))}
              {draftDocs.length === 0 && (
                <div style={{ fontSize: 12, color: MUT, padding: '14px', border: `1px dashed ${BRD}`, borderRadius: 8, textAlign: 'center', background: WH }}>
                  No draft files added.
                </div>
              )}
            </div>
          </div>

          {/* 2. SRN NUMBER */}
          <div style={{ width: 280, display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: INK }}>2 · SRN Number</div>
            <div style={{ background: WH, border: `1px solid ${BRD}`, borderRadius: 8, padding: 14, display: 'flex', flexDirection: 'column', gap: 10 }}>
              
              {isEditingSrn ? (
                <Input placeholder="Enter SRN number" value={srnInput} onChange={(e) => setSrnInput(e.target.value)} size="small" autoFocus />
              ) : (
                <div style={{ padding: '6px 12px', background: '#F1F5F9', border: '1px solid #CBD5E1', borderRadius: 6, fontSize: 13, fontWeight: 700, color: '#000000', fontFamily: 'monospace', minHeight: 32, display: 'flex', alignItems: 'center' }}>
                  {filing?.srn_number || '—'}
                </div>
              )}

              {canEditSrn && (
                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
                  {!isEditingSrn && hasSrn && (
                    <button className="btn btn-secondary" style={{ padding: '4px 14px', fontSize: 12 }} onClick={() => { setSrnInput(filing.srn_number || ''); setSrnEditing(true); }}>Edit</button>
                  )}
                  {isEditingSrn && hasSrn && (
                    <button className="btn btn-secondary" style={{ padding: '4px 14px', fontSize: 12 }} disabled={busy === 'save_srn'} onClick={() => { setSrnEditing(false); setSrnInput(filing.srn_number || ''); }}>Cancel</button>
                  )}
                  {isEditingSrn && (
                    <button className="btn btn-primary" onClick={saveSrn} disabled={busy === 'save_srn' || !srnInput.trim() || (hasSrn && srnInput.trim() === (filing.srn_number || ''))} style={{ padding: '4px 14px', fontSize: 12 }}>
                      {busy === 'save_srn' ? 'Saving…' : 'Save'}
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* 3. SUPPORTING DOCS */}
          <div style={{ flex: 1, minWidth: 320, display: 'flex', flexDirection: 'column', gap: 12, opacity: draftApproved ? 1 : 0.5, pointerEvents: draftApproved ? 'auto' : 'none' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: INK }}>3 · Supporting Docs</div>
              {suppEditable && (
                <Upload accept=".pdf,.png,.jpg,.jpeg" showUploadList={false} beforeUpload={(f) => { upload('supporting_doc', f); return false; }}>
                  <button className="btn btn-secondary" style={{ padding: '3px 10px', fontSize: 11 }} disabled={busy?.startsWith('upload')}>
                    <UploadOutlined /> Add File
                  </button>
                </Upload>
              )}
            </div>
            
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12 }}>
              {srnDocs.length > 0 ? (
                srnDocs.map((doc, idx) => (
                  <div key={doc.id} style={{ width: 300 }}>
                    <McaDocCard doc={doc} title={`Supporting Document ${idx + 1}`} icon="📎"
                      canDelete={suppEditable && ['draft', 'rejected'].includes(doc.review_status)} 
                      onRemove={remove} deleting={busy === `delete_${doc.id}`} />
                  </div>
                ))
              ) : (
                <div style={{ fontSize: 12, color: MUT, padding: '14px', border: `1px dashed ${BRD}`, borderRadius: 8, width: 300, textAlign: 'center', background: WH }}>
                  {draftApproved ? 'No supporting files added.' : 'Unlocks after Drafts & SRN are approved.'}
                </div>
              )}
            </div>
          </div>

        </div>

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16, padding: '14px 20px', background: BG }}>
          <div>
            <div style={{ fontSize: 13, fontWeight: 600, color: statusLine.color }}>{statusLine.text}</div>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            {!isClosed && !isOpenCase && (
              <button className="btn btn-primary" onClick={send} disabled={!canSend || busy === 'send'}>
                {busy === 'send' ? 'Sending…' : `🚀 Send ${draftApproved ? 'Supporting Docs' : 'Drafts & SRN'} for review`}
              </button>
            )}
            {isOpenCase && isMaker && !closurePending && !isSTP && (
              <button className="btn btn-primary" onClick={() => setCloseOpen(true)}>🎉 Close case</button>
            )}
          </div>
        </div>
      </div>

      {closeOpen && (
        <CloseCaseDialog
          onClose={() => setCloseOpen(false)}
          onSubmit={async (payload) => {
            await mcaApi.submitClosure(filing.id, payload);
            setCloseOpen(false);
            message.success('Closure request sent to checker');
            onUpdated?.();
          }}
        />
      )}
      {confirmEl}
    </div>
  );
}

// Single Doc Card for Review (e.g. Case Closure requests)
function ReviewDocCard({ doc, canReview, busy, onApprove, onReject }) {
  const isClose = doc.doc_type === 'mca_approval_cert';
  return (
    <div
      className="card"
      style={{
        padding: 14,
        borderLeft: `4px solid ${doc.review_status === 'escalated' ? VIO : P}`,
        marginBottom: 12,
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: 14,
        }}
      >
        <span style={{ fontSize: 13, fontWeight: 700, color: INK }}>{docLabel(doc)}</span>
        <div style={{ fontSize: 11.5, color: MUT }}>
          Submitted by{' '}
          <b style={{ color: 'var(--color-slate-600)' }}>{doc.uploaded_by_name || 'Unknown'}</b>
          {' · '}
          {fmtDateTime(doc.uploaded_at)}
        </div>
      </div>

      <div style={{ maxWidth: 400 }}>
        {isClose && !closureHasFile(doc) ? (
          <div
            style={{
              fontSize: 12.5,
              color: 'var(--color-slate-600)',
              padding: '8px 12px',
              background: BG,
              borderRadius: 'var(--radius-md)',
            }}
          >
            Maker requested to close this case without an attachment.
          </div>
        ) : (
          <McaDocCard doc={doc} title={docLabel(doc)} icon={docIcon(doc)} canDelete={false} />
        )}
      </div>

      {/* No RejectionNote on Active — reason only in History */}

      {canReview && (
        <div
          style={{
            display: 'flex',
            gap: 8,
            justifyContent: 'flex-end',
            marginTop: 14,
            borderTop: `1px solid ${BRD}`,
            paddingTop: 14,
          }}
        >
          <button
            className="btn btn-secondary"
            style={{ color: RED }}
            onClick={onReject}
            disabled={busy}
          >
            Reject
          </button>
          <button className="btn btn-primary" onClick={onApprove} disabled={busy}>
            {busy ? 'Working…' : isClose ? '✓ Approve & close' : '✓ Approve'}
          </button>
        </div>
      )}
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════
// REVIEW TAB — Grouped Reviews (Individual File Reviewing)
// ══════════════════════════════════════════════════════════════════
function ReviewGroupCard({ title, badgeStatus, submittedBy, submittedAt, filing, docs, canReview, busyId, onApprove, onReject }) {
  const anyEscalated = docs.some((d) => d.review_status === 'escalated');
  const hasSrn = !!filing?.srn_number;

  // Badge only from docs still on this Active card (pending / escalated)
  const liveStatuses = docs.map((d) => d.review_status);
  const groupBadge = liveStatuses.some((s) => s === 'escalated')
    ? 'escalated'
    : liveStatuses.some((s) => s === 'pending')
      ? 'pending'
      : badgeStatus || 'pending';

  return (
    <div
      className="card"
      style={{
        padding: 16,
        borderLeft: `4px solid ${anyEscalated || groupBadge === 'escalated' ? VIO : P}`,
        marginBottom: 16,
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: 16,
          flexWrap: 'wrap',
          gap: 8,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ fontSize: 14, fontWeight: 700, color: INK }}>{title}</span>
          <StatusPill status={groupBadge} map={REVIEW_STATUS} />
        </div>
        <div style={{ fontSize: 12, color: MUT }}>
          Submitted by{' '}
          <b style={{ color: 'var(--color-slate-600)' }}>{submittedBy || 'Unknown'}</b>
          {' · '}
          {fmtDateTime(submittedAt)}
        </div>
      </div>

      {hasSrn && title.includes('Draft') && (
        <div
          style={{
            padding: '10px 14px',
            background: BG,
            borderRadius: 'var(--radius-md)',
            marginBottom: 16,
            display: 'flex',
            alignItems: 'center',
            gap: 10,
          }}
        >
          <span style={{ fontSize: 12, color: MUT, fontWeight: 600 }}>SRN Number:</span>
          <span style={{ fontFamily: 'monospace', fontSize: 14, fontWeight: 700, color: INK }}>
            {filing.srn_number}
          </span>
        </div>
      )}

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12 }}>
        {docs.map((d, idx) => (
          <div key={d.id} style={{ width: 300 }}>
            <McaDocCard
              doc={d}
              title={
                title.includes('Draft')
                  ? `Draft Form ${idx + 1}`
                  : `Supporting Document ${idx + 1}`
              }
              icon={docIcon(d)}
              canDelete={false}
              reviewMode={canReview(d)}
              onApprove={() => onApprove(d)}
              onReject={() => onReject(d)}
              busy={busyId === d.id}
            />
          </div>
        ))}
      </div>
    </div>
  );
}

function ReviewTab({ mcaCase, refreshTick, onUpdated, user }) {
  const [items, setItems] = useState([]);
  const [filings, setFilings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [busyId, setBusyId] = useState(null);
  const [rejectTarget, setRejectTarget] = useState(null);
  const [acceptTarget, setAcceptTarget] = useState(null);

  const isFounder = ['founder', 'admin'].includes((user?.role || '').toLowerCase());
  const isChecker = isInList(mcaCase?.checkers, user);
  const REVIEWED = ['pending', 'escalated', 'approved', 'rejected', 'accepted'];
  
  const DRAFT_TYPES = ['draft_form', 'pending_draft'];
  const SUPP_TYPES = ['supporting_doc', 'pending_support', 'srn_receipt', 'challan', 'acknowledgment'];

  const load = useCallback(async () => {
    if (!mcaCase?.id) { setItems([]); setFilings([]); setLoading(false); return; }
    setLoading(true); setError(null);
    try {
      const flist = toList(await mcaApi.filings({ mca_case: mcaCase.id }));
      setFilings(flist);
      const lists = await Promise.all(flist.map((f) => mcaApi.docs({ filing: f.id }).then(toList).catch(() => [])));
      const all = lists.flat().filter((d) => REVIEWED.includes(d.review_status));
      setItems(all.sort((a, b) => new Date(b.uploaded_at || 0) - new Date(a.uploaded_at || 0)));
    } catch (e) {
      setError(errMsg(e, 'Failed to load reviews'));
      setItems([]); setFilings([]);
    } finally {
      setLoading(false);
    }
  }, [mcaCase?.id]);

  useEffect(() => { load(); }, [load, refreshTick]);

  const canReview = (d) => (d.review_status === 'escalated' ? isFounder : d.review_status === 'pending' && isChecker);

  const activeDocs = items.filter((d) => ['pending', 'escalated'].includes(d.review_status) && !d.is_deleted);
  const historyDocs = items.filter((d) => !['pending', 'escalated'].includes(d.review_status));

  const activeGroups = useMemo(() => {
    const groups = [];
    const seen = new Set();

    filings.forEach((f) => {
      const draftDocs = activeDocs.filter((d) => d.filing === f.id && DRAFT_TYPES.includes(d.doc_type));
      if (draftDocs.length > 0) {
        draftDocs.forEach((d) => seen.add(d.id));
        groups.push({ kind: 'draft_group', title: 'Drafts & SRN Submission', badge: f.review_status || draftDocs[0].review_status, filing: f, docs: draftDocs });
      }
      
      const suppDocs = activeDocs.filter((d) => d.filing === f.id && SUPP_TYPES.includes(d.doc_type));
      if (suppDocs.length > 0) {
        suppDocs.forEach((d) => seen.add(d.id));
        groups.push({ kind: 'supp_group', title: 'Supporting Documents', badge: f.srn_review_status || suppDocs[0].review_status, filing: f, docs: suppDocs });
      }
    });

    activeDocs.forEach((d) => {
      if (!seen.has(d.id)) groups.push({ kind: 'single', doc: d });
    });

    return groups;
  }, [activeDocs, filings]);

  const decide = async (doc, fn, clear) => {
    setBusyId(doc.id);
    try {
      await fn();
      clear();
      await load();
      onUpdated?.();
    } finally {
      setBusyId(null);
    }
  };

  const historyColumns = [
    { key: 'doc', label: 'Document', align: 'left', width: 320, render: (d) => <span>{docIcon(d)} {docLabel(d)}{closureHasFile(d) || d.doc_type !== 'mca_approval_cert' ? ` — ${d.file_name}` : ''}{d.is_deleted ? <span style={{ color: MUT, fontStyle: 'italic', fontSize: 11 }}> (removed)</span> : ''}</span> },
    { key: 'by', label: 'Submitted by', align: 'left', render: (d) => d.uploaded_by_name || '—' },
    { key: 'when', label: 'When', sortable: true, sortFn: (a, b) => new Date(a.uploaded_at) - new Date(b.uploaded_at), render: (d) => fmtDateTime(d.uploaded_at) },
    { key: 'status', label: 'Status', sortable: true, render: (d) => <StatusPill status={d.review_status} map={REVIEW_STATUS} /> },
    { key: 'note', label: 'Reason', align: 'left', width: 220, render: (d) => (d.review_status === 'rejected' ? d.review_note || '—' : '—') },
  ];

  if (!mcaCase?.id) return <EmptyState icon="🔍" text="No MCA case loaded." />;
  if (loading) return <Loader label="Loading review items…" />;

  return (
    <div>
      <ErrorBanner>{error}</ErrorBanner>

      <SectionTitle style={{ marginTop: 0 }}>Active reviews ({activeGroups.length})</SectionTitle>
      {activeGroups.length === 0 ? (
        <EmptyState icon="📋" text="No active reviews pending." />
      ) : activeGroups.map((g, i) => {
        if (g.kind.includes('group')) {
          const targetDoc = g.docs[0];
          return (
            <ReviewGroupCard 
              key={`${g.kind}_${g.filing.id}`} 
              title={g.title} 
              badgeStatus={g.badge} 
              submittedBy={targetDoc.uploaded_by_name} 
              submittedAt={targetDoc.uploaded_at} 
              filing={g.filing} 
              docs={g.docs}
              canReview={canReview} 
              busyId={busyId}
              onApprove={(doc) => setAcceptTarget(doc)}
              onReject={(doc) => setRejectTarget(doc)} 
            />
          );
        }
        return (
          <ReviewDocCard key={g.doc.id} doc={g.doc} canReview={canReview(g.doc)} busy={busyId === g.doc.id}
            onApprove={() => setAcceptTarget(g.doc)} onReject={() => setRejectTarget(g.doc)} />
        );
      })}

      <SectionTitle style={{ marginTop: 28 }}>Review history ({historyDocs.length})</SectionTitle>
      <Table columns={historyColumns} rows={historyDocs} getRowId={(d) => d.id} onRowClick={(d) => (d.doc_type !== 'mca_approval_cert' || closureHasFile(d)) && openFile(d)} emptyMessage="No completed reviews yet." pageSize={10} />

      {rejectTarget && (
        <RejectModal onClose={() => setRejectTarget(null)}
          onRejected={(reason) => decide(rejectTarget, () => mcaApi.rejectDoc(rejectTarget.id, reason), () => setRejectTarget(null))} />
      )}
      {acceptTarget && (
        <AcceptModal onClose={() => setAcceptTarget(null)}
          showEscalate={isChecker && acceptTarget.review_status === 'pending'}
          onAccepted={(toCeo) => decide(acceptTarget, () => (toCeo ? mcaApi.escalateDoc(acceptTarget.id) : mcaApi.approveDoc(acceptTarget.id)), () => setAcceptTarget(null))} />
      )}
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════
// AUDIT TRAIL
// ══════════════════════════════════════════════════════════════════
const MCA_AUDIT_META = {
  case_created:         { label: 'Job Created', tone: 'green' },
  info_update:          { label: 'Info Updated', tone: 'blue' },
  assignment:           { label: 'Team Assigned', tone: 'blue' },
  mca_docs_submitted:   { label: 'Sent for Review', tone: 'amber' },
  mca_docs_approved:    { label: 'Draft Approved', tone: 'green' },
  mca_docs_rejected:    { label: 'Draft Rejected', tone: 'red' },
  mca_docs_escalated:   { label: 'Moved to CEO', tone: 'purple' },
  mca_srn_uploaded:     { label: 'Sent for Review', tone: 'amber' },
  mca_srn_approved:     { label: 'Document Verified', tone: 'green' },
  mca_srn_rejected:     { label: 'Document Rejected', tone: 'red' },
  mca_srn_escalated:    { label: 'Document Moved to CEO', tone: 'purple' },
  mca_outcome_approved: { label: 'Approved', tone: 'green' },
  mca_outcome_rejected: { label: 'Rejected', tone: 'red' },
  mca_outcome_resubmit: { label: 'Resubmission', tone: 'amber' },
  mca_filing_closed:    { label: 'Case Closed', tone: 'green' },
};

const MCA_AUDIT_CATEGORIES = [
  { id: 'all', label: 'All events', match: () => true },
  { id: 'client', label: 'Client info', match: (e) => e.event_type === 'info_update' },
  { id: 'submitted', label: 'Submissions', match: (e) => e.event_type.includes('submitted') || e.event_type === 'mca_srn_uploaded' },
  { id: 'approved', label: 'Approved', match: (e) => e.event_type.includes('approved') },
  { id: 'rejected', label: 'Rejected', match: (e) => e.event_type.includes('rejected') },
  { id: 'escalated', label: 'Moved to CEO', match: (e) => e.event_type.includes('escalated') },
];

const isClosureEvent = (log) => {
  const t = (log.title || '').toLowerCase();
  const nv = log.new_values || {};
  return log.event_type === 'mca_filing_closed' || t.includes('case closure') || t.includes('case closed')
    || (nv.label || '').toLowerCase() === 'case closure' || (nv.kind || '').toLowerCase() === 'close_request';
};

function mcaEventLabel(log) {
  const type = log.event_type;
  let { label, tone } = MCA_AUDIT_META[type] || { label: 'Update', tone: 'blue' };
  const closure = isClosureEvent(log);
  if (closure) {
    if (type === 'mca_filing_closed' || (log.title || '').toLowerCase().includes('case closed')) [label, tone] = ['Case Closed', 'green'];
    else if (type.includes('submitted') || type.includes('uploaded')) [label, tone] = ['Closure Submitted', 'amber'];
    else if (type.includes('approved')) [label, tone] = ['Closure Approved', 'green'];
    else if (type.includes('rejected')) [label, tone] = ['Closure Rejected', 'red'];
    else if (type.includes('escalated')) [label, tone] = ['Closure to CEO', 'purple'];
  }
  const actor = type === 'case_created' ? 'Created by'
    : type === 'info_update' ? 'Updated by'
    : type === 'assignment' ? 'Assigned by'
    : closure && type === 'mca_filing_closed' ? 'Closed by'
    : type.includes('submitted') || type.includes('uploaded') ? 'Submitted by'
    : type.includes('approved') ? 'Approved by'
    : type.includes('rejected') ? 'Rejected by'
    : type.includes('escalated') ? 'Moved to CEO by' : 'By';
  return { label, tone, actor };
}

function McaAuditDetail({ log }) {
  const type = log.event_type;
  const nv = log.new_values || {};
  const ov = log.old_values || {};
  const files = [...new Set([nv.file_name, ...(nv.files || []), ...(nv.draft_files || []), ...(nv.supporting_docs || [])].filter(Boolean))];
  const reason = type.includes('rejected') && (nv.rejection_reason || nv.note);
  const box = { marginTop: 6, padding: '8px 12px', background: BG, border: `1px solid ${BRD}`, borderRadius: 'var(--radius-sm)', fontSize: 12 };
  
  return (
    <>
      {type === 'case_created' && (nv.task_id || nv.client_name) && (
        <div style={{ ...box, display: 'flex', gap: 12, flexWrap: 'wrap' }}>
          {nv.task_id && <span><b style={{ color: MUT }}>Task ID:</b> <span style={{ fontFamily: 'monospace' }}>📋 {nv.task_id}</span></span>}
          {nv.client_name && <span><b style={{ color: MUT }}>Client:</b> {nv.client_name}</span>}
        </div>
      )}
      {reason && <div style={{ ...box, background: REDL, borderColor: REDB, color: RED }}><b>Reason:</b> {reason}</div>}
      {type === 'info_update' && Object.keys(nv).length > 0 && (
        <div style={{ ...box, display: 'flex', flexDirection: 'column', gap: 4 }}>
          {Object.keys(nv).filter((k) => !['rejection_reason', 'reason', 'doc_type', 'notice_din'].includes(k)).map((k) => (
            <div key={k} style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              <span style={{ width: 130, fontWeight: 600, color: INK, textTransform: 'capitalize' }}>{k.replace(/_/g, ' ')}</span>
              <span style={{ color: RED, textDecoration: 'line-through' }}>{String(ov[k] || 'None')}</span>
              <span style={{ color: MUT }}>→</span>
              <span style={{ color: GR, fontWeight: 600 }}>{String(nv[k] || 'None')}</span>
            </div>
          ))}
        </div>
      )}
      {type === 'mca_filing_closed' && (
        <div style={{ ...box, color: GR, fontWeight: 700 }}>
          <span style={{ color: MUT }}>Status:</span> {String(ov.status || '—').replace(/_/g, ' ')} → CLOSED
        </div>
      )}
    </>
  );
}

function AuditTab({ clientId, jobId, refreshTick }) {
  const load = useCallback(async () => {
    const res = await api.get('/legal-services/audit-trail/', { params: { client: clientId, litigation_type: 'mca', job_id: jobId } });
    return toList(res)
      .filter((e) => MCA_AUDIT_META[e.event_type]
        && !(e.event_type === 'mca_srn_uploaded' && (e.title || '').toLowerCase().includes('uploaded')))
      .map((e) => {
        const { label, tone, actor } = mcaEventLabel(e);
        return { ...e, action: label, tone: EVENT_TONES[tone], actor_label: actor, user: e.by_name, note: undefined, description: undefined };
      });
  }, [clientId, jobId]);

  if (!jobId) return <EmptyState icon="🕐" text="No MCA case loaded." />;

  return (
    <AuditTrailTab
      title="MCA Audit Trail"
      reloadKey={`${clientId}-${jobId}-${refreshTick}`}
      load={load}
      categories={MCA_AUDIT_CATEGORIES}
      searchText={(e) => [e.new_values?.file_name, e.new_values?.srn_number]}
      searchPlaceholder="Search title, file, person…"
      renderDetail={(e) => <McaAuditDetail log={e} />}
    />
  );
}

// ══════════════════════════════════════════════════════════════════
// DOCUMENTS TAB
// ══════════════════════════════════════════════════════════════════
function McaDocumentsTab({ caseData, refreshTick }) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [header, setHeader] = useState('');

  useEffect(() => {
    let alive = true;
    if (!caseData?.id) { setItems([]); setLoading(false); return undefined; }
    setLoading(true);
    (async () => {
      let filings = caseData.filings || [];
      if (!filings.length) {
        filings = toList(await mcaApi.filings({ mca_case: caseData.id }).catch(() => ({ data: [] })));
      }
      const withDocs = await Promise.all(filings.map(async (f) => ({
        filing: f,
        docs: f.documents || toList(await mcaApi.docs({ filing: f.id }).catch(() => ({ data: [] }))),
      })));

      const flat = [];
      let titleBits = [];
      withDocs.forEach(({ filing: f, docs }, i) => {
        titleBits.push(`Filing ${i + 1}${f.srn_number ? ` · SRN ${f.srn_number}` : ''}`);

        const draftDocs = docs.filter((d) => ['draft_form', 'pending_draft'].includes(d.doc_type) && !d.is_deleted);
        const srnDocs = docs.filter((d) => ['srn_receipt', 'challan', 'acknowledgment', 'supporting_doc', 'pending_support'].includes(d.doc_type) && !d.is_deleted);
        const certDocs = docs.filter((d) => d.doc_type === 'mca_approval_cert' && closureHasFile(d) && !d.is_deleted);

        draftDocs.forEach((d, idx) => {
          flat.push({ key: `draft_${d.id}`, label: `Draft Form ${idx + 1}`, icon: '📄', doc: d });
        });

        srnDocs.forEach((d, idx) => {
          flat.push({
            key: `srn_${d.id}`,
            label: `Supporting Document ${idx + 1}`,
            icon: '📎',
            doc: d,
          });
        });

        certDocs.forEach((d) => {
          flat.push({ key: `cert_${d.id}`, label: 'Closure Document', icon: '📜', doc: d });
        });
      });

      if (alive) {
        setItems(flat);
        setHeader(titleBits.join(' · ') || 'Filing Documents');
      }
    })()
      .catch(() => { if (alive) setItems([]); })
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, [caseData, refreshTick]);

  if (!caseData?.id) return <EmptyState icon="📂" text="No MCA case loaded." />;
  if (loading) return <Loader label="Loading documents…" />;
  if (!items.length) {
    return <EmptyState icon="📂" text="No filings yet. Start the filing process on the Activity tab." />;
  }

  return (
    <div className="card" style={{ padding: 16 }}>
      <div style={{ fontSize: 13, fontWeight: 700, color: INK, marginBottom: 14 }}>
        {header}
        <span style={{ fontWeight: 500, color: MUT, marginLeft: 8 }}>
          · {items.length} file{items.length === 1 ? '' : 's'}
        </span>
      </div>

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12 }}>
        {items.map((it) => (
          <div key={it.key} style={{ width: 260 }}>
            <McaDocCard
              doc={it.doc}
              title={it.label}
              icon={it.icon}
              canDelete={false} 
            />
          </div>
        ))}
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════
// PAGE
// ══════════════════════════════════════════════════════════════════
const mcaFallbackRows = (c) => [
  ['Reference No.', c.reference_no],
  ['Sub-Service', c.sub_service_name || c.filing_type],
  ['Status', <StatusPill key="status" status={getMcaStatus(c)} />],
  ['Created By', c.created_by_name],
  ['Financial Year', c.financial_year],
  ['Period', c.period],
  ['Due Date', fmtDate(c.due_date)],
];

export default function MCAWorkspace() {
  const { clientId } = useParams();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user } = useAuth();

  const isInvalidClient = !clientId || clientId === 'undefined' || clientId === 'null';
  const caseId = searchParams.get('caseId');

  const [client, setClient] = useState(null);
  const [caseData, setCaseData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [teamLoading, setTeamLoading] = useState(false);
  const [constitutions, setConstitutions] = useState([]);
  const [activeTab, setActiveTab] = useState(() => {
    const t = searchParams.get('tab');
    return t === 'details' ? 'client' : t || 'client';
  });
  const [refreshTick, setRefreshTick] = useState(0);
  const bumpRefresh = () => setRefreshTick((t) => t + 1);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    params.set('tab', activeTab);
    window.history.replaceState(null, '', `${window.location.pathname}?${params.toString()}`);
  }, [activeTab]);

  useEffect(() => {
    api.get('/clients/constitutions/').then((res) => setConstitutions(toList(res))).catch(() => setConstitutions([]));
  }, []);

  const loadClient = useCallback(async () => {
    try {
      setClient((await api.get(`/legal-services/client/${clientId}/`)).data);
    } catch {
      try { setClient((await api.get(`/clients/clients/${clientId}/`)).data); } catch { setError('Failed to load client details.'); }
    }
  }, [clientId]);

  useEffect(() => {
    if (isInvalidClient) return;
    setLoading(true);
    loadClient().finally(() => setLoading(false));
  }, [isInvalidClient, loadClient]);

  const taskCode = searchParams.get('task');
  const taskPk = searchParams.get('taskPk');
  useEffect(() => {
    if (isInvalidClient) return;
    setTeamLoading(true);
    resolveCase({
      caseId,
      taskRef: taskCode || taskPk ? { code: taskCode, id: taskPk } : null,
      getById: (id) => mcaApi.getCase(id).then((r) => r.data),
      listForClient: () => mcaApi.cases({ client: clientId }).then(toList),
    })
      .then((c) => setCaseData(c ? { ...c, makers: c.makers || [], checkers: c.checkers || [] } : null))
      .catch(() => setCaseData(null))
      .finally(() => setTeamLoading(false));
  }, [isInvalidClient, clientId, caseId, taskCode, taskPk, refreshTick]);

  const service = useMemo(() => mcaServiceOf(caseData), [caseData]);

  if (isInvalidClient) {
    return (
      <div className="page-container">
        <EmptyState icon="⚠️" text="We couldn't find valid client details for this link.">
          <button className="btn btn-primary" style={{ marginTop: 12 }} onClick={() => navigate('/legal-services/mca')}>Return to MCA</button>
        </EmptyState>
      </div>
    );
  }
  if (loading) return <div className="page-container"><Loader label="Loading client…" /></div>;
  if (error) return <div className="page-container"><ErrorBanner>{error}</ErrorBanner></div>;
  if (!client) return <div className="page-container"><EmptyState text="No client data found" /></div>;

  const { fy, ay } = getFYandAY();
  const tab = resolveTab(activeTab, MCA_TABS);

  return (
    <main className="page-container">
      <JobWorkspaceShell
        breadcrumb={[
          { label: 'Legal Services', onClick: () => navigate('/legal-services') },
          { label: 'MCA', onClick: () => navigate('/legal-services/mca') },
          { label: 'Dashboard', onClick: () => navigate(service.dashboardPath) },
          { label: service.label, onClick: () => navigate(service.jobListPath) },
          { label: client.name },
        ]}
        title={client.name}
        statusNode={<StatusPill status={getMcaStatus(caseData)} />}
        rightChip={caseData?.sub_service_name ? `📄 ${caseData.sub_service_name}` : null}
        meta={[
          fy, ay,
          caseData?.financial_year ? `FY: ${caseData.financial_year}` : null,
          <LinkedTaskLink key="task" caseData={caseData} onTaskUpdated={bumpRefresh} />,
        ]}
        tabs={MCA_TABS}
        activeTab={tab}
        onTabChange={setActiveTab}
      >
        {tab === 'client' && (
          <DetailsTab
            clientId={clientId} client={client} caseData={caseData} constitutions={constitutions}
            canEdit={isInList(caseData?.makers, user)}
            requestHeaders={{ 'X-Litigation-Type': 'mca', 'X-Job-Id': caseData?.id?.toString() || '' }}
            onSaved={async () => { await loadClient(); bumpRefresh(); }}
          />
        )}
        {tab === 'docs' && <McaDocumentsTab caseData={caseData} refreshTick={refreshTick} />}
        {tab === 'activity' && (
          <ActivityTab caseData={caseData} filing={caseData?.filings?.[0] || null} user={user} onUpdated={bumpRefresh} />
        )}
        {tab === 'review' && <ReviewTab mcaCase={caseData} refreshTick={refreshTick} onUpdated={bumpRefresh} user={user} />}
        {tab === 'team' && (
          <TeamTab
            caseData={caseData}
            loading={teamLoading}
            fallbackRows={mcaFallbackRows}
          />
        )}
        {tab === 'audit' && <AuditTab clientId={clientId} jobId={caseData?.id} refreshTick={refreshTick} />}
      </JobWorkspaceShell>
    </main>
  );
}