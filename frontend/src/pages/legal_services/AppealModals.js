// import React, { useState, useMemo } from 'react';
// import { createPortal } from 'react-dom';

// const SANS = "'Roboto', sans-serif";

// const T = {
//   cardBg: '#FFFFFF', surfaceBg: '#F8FAFC',
//   navy: '#1E3A6B', navyMid: '#2A4F8F', navyLight: '#3562A8',
//   blueAccent: '#2563EB', blueSoft: '#E8F0FE', blueBorder: '#C5D5EF',
//   textPrimary: '#0F172A', textSecondary: '#475569', textMuted: '#94A3B8',
//   border: '#E8ECF4', borderLight: '#F1F5F9',
//   textOnDark: '#FFFFFF', textOnDarkSoft: 'rgba(255,255,255,0.75)',
//   green: '#0F7A5A', greenBg: '#E6F5EF', greenBorder: '#B8E0CE',
//   amber: '#92620B', amberBg: '#FBF2DE', amberBorder: '#F0DDA3',
//   red: { bg: '#FCEBEA', text: '#B42318', border: '#F2C1BC' },
//   shadow: { xl: '0 20px 60px rgba(15,23,42,0.22)' },
//   radius: { sm: 6, md: 8, lg: 10 },
// };

// const globalStyles = `
//   @keyframes amFadeIn { from { opacity: 0; } to { opacity: 1; } }
//   @keyframes amScaleIn {
//     from { opacity: 0; transform: scale(0.96) translateY(6px); }
//     to { opacity: 1; transform: scale(1) translateY(0); }
//   }
//   @keyframes amSpin { to { transform: rotate(360deg); } }
//   .am-overlay { animation: amFadeIn 0.18s ease; }
//   .am-dialog { animation: amScaleIn 0.24s cubic-bezier(0.16,1,0.3,1); }
//   .am-input:focus {
//     border-color: ${T.blueAccent} !important;
//     box-shadow: 0 0 0 3px rgba(37,99,235,0.1) !important;
//     outline: none;
//   }
// `;

// // ══════════════════════════════════════════════════════════════════════
// // SHARED — Modal shell
// // ══════════════════════════════════════════════════════════════════════
// function ModalShell({ headerIcon, title, subtitle, onClose, children, footer, width = 720 }) {
//   return createPortal(
//     <div
//       className="am-overlay"
//       onClick={(e) => e.target === e.currentTarget && onClose()}
//       style={{
//         position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
//         background: 'rgba(15,23,42,0.55)',
//         backdropFilter: 'blur(6px)', WebkitBackdropFilter: 'blur(6px)',
//         display: 'flex', alignItems: 'center', justifyContent: 'center',
//         zIndex: 2000, padding: 20,
//       }}
//     >
//       <style>{globalStyles}</style>
//       <div className="am-dialog" style={{
//         width, maxWidth: '100%', background: T.cardBg, borderRadius: T.radius.lg,
//         overflow: 'hidden', boxShadow: T.shadow.xl, maxHeight: '90vh',
//         display: 'flex', flexDirection: 'column', fontFamily: SANS,
//         border: `1px solid ${T.border}`,
//       }}>
//         {/* HEADER */}
//         <div style={{
//           flexShrink: 0,
//           background: `linear-gradient(135deg, ${T.navy} 0%, ${T.navyMid} 50%, ${T.navyLight} 100%)`,
//           padding: '13px 18px', display: 'flex', alignItems: 'center',
//           justifyContent: 'space-between', position: 'relative', overflow: 'hidden',
//         }}>
//           <div style={{
//             position: 'absolute', top: '-60%', right: '-10%', width: 220, height: 220,
//             background: 'radial-gradient(circle, rgba(147,197,253,0.15) 0%, transparent 65%)',
//           }} />
//           <div style={{ display: 'flex', alignItems: 'center', gap: 10, position: 'relative', zIndex: 1 }}>
//             <div style={{
//               width: 34, height: 34, borderRadius: T.radius.md,
//               background: 'rgba(255,255,255,0.15)', border: '1px solid rgba(255,255,255,0.22)',
//               display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16,
//             }}>
//               {headerIcon}
//             </div>
//             <div>
//               <div style={{ fontSize: 14.5, fontWeight: 700, color: T.textOnDark, lineHeight: 1.2 }}>
//                 {title}
//               </div>
//               <div style={{ fontSize: 10.5, color: T.textOnDarkSoft, marginTop: 2 }}>
//                 {subtitle}
//               </div>
//             </div>
//           </div>
//           <button onClick={onClose} style={{
//             width: 30, height: 30, border: '1px solid rgba(255,255,255,0.25)', borderRadius: T.radius.sm,
//             background: 'rgba(255,255,255,0.12)', color: 'white', cursor: 'pointer',
//             display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative', zIndex: 1,
//           }}>
//             <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
//               <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
//             </svg>
//           </button>
//         </div>

//         <div style={{ overflowY: 'auto', flex: 1 }}>{children}</div>

//         <div style={{
//           padding: '12px 18px', borderTop: `1px solid ${T.border}`,
//           display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10,
//           background: T.surfaceBg, flexShrink: 0,
//         }}>
//           <div style={{ fontSize: 10.5, color: T.textMuted, fontWeight: 500 }}>
//             Fields marked <span style={{ color: T.red.text, fontWeight: 700 }}>*</span> are required
//           </div>
//           <div style={{ display: 'flex', gap: 7 }}>{footer}</div>
//         </div>
//       </div>
//     </div>,
//     document.body
//   );
// }

// // ══════════════════════════════════════════════════════════════════════
// // CONSTANTS
// // ══════════════════════════════════════════════════════════════════════
// const CASE_TYPE_OPTIONS = [
//   { value: 'civil', label: 'Civil' }, { value: 'criminal', label: 'Criminal' },
//   { value: 'tax', label: 'Tax Matter' }, { value: 'corporate', label: 'Corporate' },
//   { value: 'constitutional', label: 'Constitutional' }, { value: 'administrative', label: 'Administrative' },
//   { value: 'other', label: 'Other' },
// ];

// const APPEAL_STAGE_OPTIONS = [
//   { value: 'first_appeal', label: 'First Appeal' }, { value: 'second_appeal', label: 'Second Appeal' },
//   { value: 'tribunal', label: 'Tribunal' }, { value: 'high_court', label: 'High Court' },
//   { value: 'supreme_court', label: 'Supreme Court' }, { value: 'not_applicable', label: 'Not Applicable' },
// ];

// const COURT_NAME_OPTIONS = [
//   'Supreme Court of India', 'High Court', 'District Court', 'Sessions Court',
//   'ITAT (Income Tax Appellate Tribunal)', 'NCLT (National Company Law Tribunal)',
//   'NCLAT (National Company Law Appellate Tribunal)', 'CESTAT', 'AAAR', 'AAR',
//   'Commissioner of Income Tax (Appeals)', 'DRP (Dispute Resolution Panel)',
//   'Magistrate Court', 'Civil Court', 'Consumer Forum',
// ];

// const ADJOURNMENT_REASONS = [
//   { value: 'fever', label: 'Fever' }, { value: 'travelling', label: 'Travelling' },
//   { value: 'personal_emergency', label: 'Personal Emergency' }, { value: 'family_function', label: 'Family Function' },
//   { value: 'client_unavailable', label: 'Client Unavailable' }, { value: 'document_not_completed', label: 'Document Not Completed' },
//   { value: 'lawyer_unavailable', label: 'Lawyer Unavailable' }, { value: 'court_holiday', label: 'Court Holiday' },
//   { value: 'opposing_party_request', label: 'Opposing Party Request' }, { value: 'other', label: 'Other' },
// ];

// function fmtDate(d) {
//   if (!d) return '—';
//   return new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
// }

// function extractError(e) {
//   const resp = e?.response;
//   if (!resp) return e?.message || 'Failed to submit.';
//   if (resp.status === 404) return 'Backend endpoint not found (404). Restart Django after adding the action.';
//   if (resp.status === 403) return resp.data?.error || 'Not authorized.';
//   if (resp.data?.error) return resp.data.error;
//   if (resp.data?.detail) return resp.data.detail;
//   return `Error ${resp.status}`;
// }

// // ══════════════════════════════════════════════════════════════════════
// // MODAL 1 — Submit to Court (Appeal)
// // ── Adjourned Date field REMOVED — belongs in Log Adjournment modal
// // ══════════════════════════════════════════════════════════════════════
// export function SubmitToCourtModal({ activityCase, subServiceName, onClose, onSubmit }) {
//   const caseTitleOptions = useMemo(() => {
//     const list = [];
//     if (subServiceName) list.push(subServiceName);
//     list.push('Other');
//     return list;
//   }, [subServiceName]);

//   const initialTitleKnown = activityCase?.case_title && caseTitleOptions.includes(activityCase.case_title);
//   const initialCourtKnown = activityCase?.court_name && COURT_NAME_OPTIONS.includes(activityCase.court_name);

//   const [form, setForm] = useState({
//     case_title: initialTitleKnown ? activityCase.case_title : (activityCase?.case_title ? 'Other' : (subServiceName || '')),
//     case_title_text: !initialTitleKnown && activityCase?.case_title ? activityCase.case_title : '',
//     court_name: initialCourtKnown ? activityCase.court_name : (activityCase?.court_name ? 'Other' : ''),
//     court_name_text: !initialCourtKnown && activityCase?.court_name ? activityCase.court_name : '',
//     case_number: activityCase?.case_number || '',
//     case_type: activityCase?.case_type || '',
//     appeal_stage: activityCase?.appeal_stage || '',
//     next_hearing_date: '',
//     note: '',
//   });
//   const [busy, setBusy] = useState(false);
//   const [error, setError] = useState('');

//   const change = (e) => setForm((p) => ({ ...p, [e.target.name]: e.target.value }));

//   const submit = async () => {
//     const finalTitle = form.case_title === 'Other' ? form.case_title_text.trim() : form.case_title;
//     const finalCourt = form.court_name === 'Other' ? form.court_name_text.trim() : form.court_name;

//     if (!finalTitle) return setError('Case title is required.');
//     if (!finalCourt) return setError('Court name is required.');
//     if (!form.case_type) return setError('Case type is required.');
//     if (!form.next_hearing_date) return setError('Hearing date is required.');
//     if (!form.note.trim()) return setError('Description is required.');

//     setBusy(true);
//     setError('');
//     try {
//       await onSubmit({
//         case_title: finalTitle,
//         court_name: finalCourt,
//         case_number: form.case_number.trim(),
//         case_type: form.case_type,
//         appeal_stage: form.appeal_stage || null,
//         next_hearing_date: form.next_hearing_date,
//         note: form.note.trim(),
//       });
//     } catch (e) {
//       setError(extractError(e));
//     } finally {
//       setBusy(false);
//     }
//   };

//   return (
//     <ModalShell
//       headerIcon="⚖️"
//       title="Submit Appeal to Court"
//       subtitle="Status will flip to OPEN after submission"
//       onClose={onClose}
//       footer={
//         <>
//           <button onClick={onClose} style={btnCancel}>Cancel</button>
//           <SubmitBtn onClick={submit} busy={busy} label="Submit to Court" />
//         </>
//       }
//     >
//       <FlowBanner from="WIP" to="OPEN" />

//       <SectionTitle label="Case Details" icon="📋" />
//       <div style={{ padding: '4px 18px 12px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>

//         {/* Row 1 */}
//         <Field label="Case Title" required>
//           <select className="am-input" style={input} name="case_title" value={form.case_title} onChange={change}>
//             <option value="">Select case title</option>
//             {caseTitleOptions.map((o) => <option key={o} value={o}>{o}</option>)}
//           </select>
//           {form.case_title === 'Other' && (
//             <input className="am-input" style={{ ...input, marginTop: 6 }} name="case_title_text" value={form.case_title_text} onChange={change} placeholder="Enter custom case title" />
//           )}
//         </Field>

//         <Field label="Court Name" required>
//           <select className="am-input" style={input} name="court_name" value={form.court_name} onChange={change}>
//             <option value="">Select court</option>
//             {COURT_NAME_OPTIONS.map((c) => <option key={c} value={c}>{c}</option>)}
//             <option value="Other">Other</option>
//           </select>
//           {form.court_name === 'Other' && (
//             <input className="am-input" style={{ ...input, marginTop: 6 }} name="court_name_text" value={form.court_name_text} onChange={change} placeholder="Enter custom court name" />
//           )}
//         </Field>

//         {/* Row 2 */}
//         <Field label="Case Number">
//           <input className="am-input" style={input} name="case_number" value={form.case_number} onChange={change} placeholder="e.g. ITA/2024/1234" />
//         </Field>

//         <Field label="Case Type" required>
//           <select className="am-input" style={input} name="case_type" value={form.case_type} onChange={change}>
//             <option value="">Select case type</option>
//             {CASE_TYPE_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
//           </select>
//         </Field>

//         {/* Row 3 — Appeal Stage + Hearing Date side by side */}
//         <Field label="Appeal Stage">
//           <select className="am-input" style={input} name="appeal_stage" value={form.appeal_stage} onChange={change}>
//             <option value="">Not specified</option>
//             {APPEAL_STAGE_OPTIONS.map((o) => (
//               <option key={o.value} value={o.value}>{o.label}</option>
//             ))}
//           </select>
//         </Field>

//         <Field
//           label="Hearing Date"
//           required
//           hint="Stays OPEN until this date. Use 'Log Adjournment' to push it later."
//         >
//           <input
//             type="date"
//             className="am-input"
//             style={input}
//             name="next_hearing_date"
//             value={form.next_hearing_date}
//             onChange={change}
//           />
//         </Field>

//       </div>

//       <SectionTitle label="Submission Description" icon="✍️" />
//       <div style={{ padding: '4px 18px 16px' }}>
//         <Field label="What are you submitting to the court?" required>
//           <textarea
//             className="am-input"
//             style={{ ...input, resize: 'vertical', minHeight: 78 }}
//             name="note"
//             rows={3}
//             placeholder="e.g. Filed appeal against demand order..."
//             value={form.note}
//             onChange={change}
//           />
//         </Field>
//       </div>

//       {error && <ErrorBar msg={error} />}
//     </ModalShell>
//   );
// }


// // ══════════════════════════════════════════════════════════════════════
// // MODAL 2 — Log Postponement (Adjourn / Extend / Transfer to another court)
// // ══════════════════════════════════════════════════════════════════════
// export function LogAdjournmentModal({ activityCase, onClose, onSubmit }) {
//   const [postponeType, setPostponeType] = useState('adjournment'); // 'adjournment' | 'extension' | 'transfer'
//   const [form, setForm] = useState({
//     reason: '',
//     next_hearing_date: '',
//     extended_date: '',
//     case_number: activityCase?.case_number || '',
//     court_name: activityCase?.court_name || '',
//     new_court_name: '',
//     new_case_number: '',
//     comment: '',
//   });
//   const [busy, setBusy] = useState(false);
//   const [error, setError] = useState('');

//   const change = (e) => setForm((p) => ({ ...p, [e.target.name]: e.target.value }));

//   const submit = async () => {
//     if (!form.reason) return setError('Reason is required.');
//     if (!form.comment.trim()) return setError('Description is required.');

//     // Validation per type
//     if (postponeType === 'adjournment' && !form.next_hearing_date) {
//       return setError('New hearing date is required.');
//     }
//     if (postponeType === 'extension' && !form.extended_date) {
//       return setError('Extended date is required.');
//     }
//     if (postponeType === 'transfer') {
//       if (!form.new_court_name.trim()) return setError('New court name is required.');
//       if (!form.next_hearing_date) return setError('New hearing date at new court is required.');
//     }

//     // Pick which date to send as next_hearing_date
//     const finalDate = postponeType === 'extension' ? form.extended_date : form.next_hearing_date;

//     setBusy(true); setError('');
//     try {
//       await onSubmit({
//         postpone_type: postponeType,
//         reason: form.reason,
//         next_hearing_date: finalDate,
//         extended_date: postponeType === 'extension' ? form.extended_date : null,
//         case_number: postponeType === 'transfer'
//           ? form.new_case_number.trim()
//           : form.case_number.trim(),
//         court_name: postponeType === 'transfer'
//           ? form.new_court_name.trim()
//           : form.court_name.trim(),
//         comment: form.comment.trim(),
//       });
//     } catch (e) {
//       setError(extractError(e));
//     } finally {
//       setBusy(false);
//     }
//   };

//   return (
//     <ModalShell
//       headerIcon="⏳"
//       title="Log Postponement"
//       subtitle="Adjourn, extend, or transfer this case to another court"
//       onClose={onClose}
//       footer={
//         <>
//           <button onClick={onClose} style={btnCancel}>Cancel</button>
//           <SubmitBtn onClick={submit} busy={busy} label="Save Postponement" />
//         </>
//       }
//     >
//       <FlowBanner from={activityCase?.status?.toUpperCase() || 'WIP'} to="OPEN" note="(with updated info)" />

//       <SectionTitle label="Current Hearing" icon="📆" />
//       <div style={{ padding: '4px 18px 12px' }}>
//         <div style={{
//           padding: '10px 14px', background: T.amberBg, border: `1px solid ${T.amberBorder}`,
//           borderRadius: T.radius.md, display: 'flex', alignItems: 'center', gap: 12,
//         }}>
//           <span style={{ fontSize: 18 }}>📅</span>
//           <div style={{ flex: 1 }}>
//             <div style={{ fontSize: 10, fontWeight: 700, color: T.amber, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
//               Currently at {activityCase?.court_name || 'Court'}
//             </div>
//             <div style={{ fontSize: 13, fontWeight: 700, color: T.textPrimary, marginTop: 1 }}>
//               {activityCase?.next_hearing_date ? fmtDate(activityCase.next_hearing_date) : 'No hearing date set'}
//             </div>
//           </div>
//         </div>
//       </div>

//       {/* ── Type Selector ── */}
//       <SectionTitle label="Postponement Type" icon="🎯" />
//       <div style={{ padding: '4px 18px 12px', display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10 }}>
//         <OutcomeCard
//           active={postponeType === 'adjournment'}
//           color={T.amber} bg={T.amberBg} border={T.amberBorder}
//           icon="⏳" title="Adjournment" subtitle="Push to new date (same court)"
//           onClick={() => setPostponeType('adjournment')}
//         />
//         <OutcomeCard
//           active={postponeType === 'extension'}
//           color={T.blueAccent} bg={T.blueSoft} border={T.blueBorder}
//           icon="📅" title="Extension" subtitle="Deadline extended"
//           onClick={() => setPostponeType('extension')}
//         />
//         <OutcomeCard
//           active={postponeType === 'transfer'}
//           color={T.navy} bg={T.blueSoft} border={T.blueBorder}
//           icon="🏛️" title="Court Transfer" subtitle="Moved to different court"
//           onClick={() => setPostponeType('transfer')}
//         />
//       </div>

//       {/* ── Details form (changes by type) ── */}
//       <SectionTitle label="Details" icon="📋" />
//       <div style={{ padding: '4px 18px 12px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
//         <Field label="Reason" required>
//           <select className="am-input" style={input} name="reason" value={form.reason} onChange={change}>
//             <option value="">Select reason</option>
//             {ADJOURNMENT_REASONS.map((r) => <option key={r.value} value={r.value}>{r.label}</option>)}
//           </select>
//         </Field>

//         {/* Date field — label changes by type */}
//         {postponeType === 'adjournment' && (
//           <Field label="New Hearing Date" required hint="Case reopens until this date">
//             <input type="date" className="am-input" style={input} name="next_hearing_date"
//               value={form.next_hearing_date} onChange={change} />
//           </Field>
//         )}
//         {postponeType === 'extension' && (
//           <Field label="Extended Date" required hint="Deadline pushed to this date">
//             <input type="date" className="am-input" style={input} name="extended_date"
//               value={form.extended_date} onChange={change} />
//           </Field>
//         )}
//         {postponeType === 'transfer' && (
//           <Field label="New Hearing Date" required hint="First hearing at new court">
//             <input type="date" className="am-input" style={input} name="next_hearing_date"
//               value={form.next_hearing_date} onChange={change} />
//           </Field>
//         )}

//         {/* Court + Case Number — different fields for Transfer */}
//         {postponeType !== 'transfer' ? (
//           <>
//             <Field label="Case Number">
//               <input className="am-input" style={input} name="case_number" value={form.case_number} onChange={change} />
//             </Field>
//             <Field label="Court Name">
//               <input className="am-input" style={input} name="court_name" value={form.court_name} onChange={change} />
//             </Field>
//           </>
//         ) : (
//           <>
//             <Field label="New Court Name" required hint="Where the case is now moved">
//               <select className="am-input" style={input} name="new_court_name"
//                 value={form.new_court_name} onChange={change}>
//                 <option value="">Select new court</option>
//                 {COURT_NAME_OPTIONS.map((c) => <option key={c} value={c}>{c}</option>)}
//               </select>
//             </Field>
//             <Field label="New Case Number" hint="At the new court (if assigned)">
//               <input className="am-input" style={input} name="new_case_number"
//                 value={form.new_case_number} onChange={change} placeholder="e.g. HC/2024/5678" />
//             </Field>
//           </>
//         )}
//       </div>

//       <SectionTitle label="Description" icon="✍️" />
//       <div style={{ padding: '4px 18px 16px' }}>
//         <Field label="Details / court remarks" required>
//           <textarea className="am-input" style={{ ...input, resize: 'vertical', minHeight: 72 }}
//             name="comment" rows={3}
//             placeholder={
//               postponeType === 'adjournment' ? 'e.g. Court adjourned at counsel\'s request due to...'
//               : postponeType === 'extension' ? 'e.g. Filing deadline extended by 30 days as per order...'
//               : 'e.g. Case transferred from ITAT to High Court under...'
//             }
//             value={form.comment} onChange={change} />
//         </Field>
//       </div>

//       {error && <ErrorBar msg={error} />}
//     </ModalShell>
//   );
// }

// // ══════════════════════════════════════════════════════════════════════
// // MODAL 3 — Log Outcome (unchanged)
// // ══════════════════════════════════════════════════════════════════════
// export function LogOutcomeModal({ activityCase, onClose, onSubmit }) {
//   const [outcome, setOutcome] = useState('');
//   const [judgement, setJudgement] = useState('');
//   const [nextAction, setNextAction] = useState('');
//   const [comment, setComment] = useState('');
//   const [busy, setBusy] = useState(false);
//   const [error, setError] = useState('');

//   const submit = async () => {
//     if (!outcome) return setError('Please choose Won or Lost.');
//     if (outcome === 'won' && !judgement.trim()) return setError('Judgement details are required.');
//     if (outcome === 'lost' && !nextAction) return setError('Please choose next action.');
//     if (outcome === 'lost' && !comment.trim()) return setError('Comment is required.');

//     setBusy(true); setError('');
//     try {
//       if (outcome === 'won') {
//         await onSubmit({ outcome: 'won', judgement_info: judgement.trim() });
//       } else {
//         await onSubmit({ outcome: 'lost', next_action: nextAction, comment: comment.trim() });
//       }
//     } catch (e) {
//       setError(extractError(e));
//     } finally { setBusy(false); }
//   };

//   const nextStatus = outcome === 'won' ? 'CLOSED'
//     : outcome === 'lost' && nextAction === 'leave' ? 'CLOSED'
//     : outcome === 'lost' && nextAction === 'appeal' ? 'WIP'
//     : '?';

//   return (
//     <ModalShell
//       headerIcon="📋"
//       title="Log Hearing Outcome"
//       subtitle="Record the court's decision on this hearing"
//       onClose={onClose}
//       footer={
//         <>
//           <button onClick={onClose} style={btnCancel}>Cancel</button>
//           <SubmitBtn onClick={submit} busy={busy} label={outcome === 'won' ? 'Confirm Win' : outcome === 'lost' ? 'Confirm Loss' : 'Choose Outcome'} disabled={!outcome} />
//         </>
//       }
//     >
//       {outcome && <FlowBanner from={activityCase?.status?.toUpperCase() || 'WIP'} to={nextStatus} />}

//       <SectionTitle label="Hearing Outcome" icon="⚖️" />
//       <div style={{ padding: '4px 18px 12px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
//         <OutcomeCard
//           active={outcome === 'won'}
//           color={T.green} bg={T.greenBg} border={T.greenBorder}
//           icon="✅" title="Case Won" subtitle="Court ruled in favour"
//           onClick={() => setOutcome('won')}
//         />
//         <OutcomeCard
//           active={outcome === 'lost'}
//           color={T.red.text} bg={T.red.bg} border={T.red.border}
//           icon="⚠️" title="Case Lost" subtitle="Court ruled against"
//           onClick={() => setOutcome('lost')}
//         />
//       </div>

//       {outcome === 'won' && (
//         <>
//           <SectionTitle label="Judgement Details" icon="📝" />
//           <div style={{ padding: '4px 18px 16px' }}>
//             <Field label="Summarize the judgement" required>
//               <textarea className="am-input" style={{ ...input, resize: 'vertical', minHeight: 84 }} rows={4}
//                 value={judgement} onChange={(e) => setJudgement(e.target.value)}
//                 placeholder="e.g. Court accepted our arguments on Sec 40(a)(ia). Demand set aside..." />
//             </Field>
//             <div style={{ marginTop: 6, fontSize: 11, color: T.green, fontWeight: 600 }}>
//               → Case will move to <b>CLOSED</b> after saving.
//             </div>
//           </div>
//         </>
//       )}

//       {outcome === 'lost' && (
//         <>
//           <SectionTitle label="Next Action" icon="🎯" />
//           <div style={{ padding: '4px 18px 12px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
//             <OutcomeCard
//               active={nextAction === 'appeal'}
//               color={T.navy} bg={T.blueSoft} border={T.blueBorder}
//               icon="⚖️" title="Appeal to Next Court" subtitle="File higher appeal"
//               onClick={() => setNextAction('appeal')}
//             />
//             <OutcomeCard
//               active={nextAction === 'leave'}
//               color={T.red.text} bg={T.red.bg} border={T.red.border}
//               icon="🚫" title="Leave the Case" subtitle="Do not pursue further"
//               onClick={() => setNextAction('leave')}
//             />
//           </div>

//           <SectionTitle label="Comment" icon="✍️" />
//           <div style={{ padding: '4px 18px 16px' }}>
//             <Field label="Details of the loss / reasoning" required>
//               <textarea className="am-input" style={{ ...input, resize: 'vertical', minHeight: 72 }} rows={3}
//                 value={comment} onChange={(e) => setComment(e.target.value)}
//                 placeholder="e.g. Court held that the deduction was not admissible under Sec..." />
//             </Field>
//             {nextAction && (
//               <div style={{ marginTop: 6, fontSize: 11, color: nextAction === 'leave' ? T.red.text : T.navy, fontWeight: 600 }}>
//                 → Case will move to <b>{nextAction === 'leave' ? 'CLOSED' : 'WIP'}</b> after saving.
//                 {nextAction === 'appeal' && ' You can then file another appeal.'}
//               </div>
//             )}
//           </div>
//         </>
//       )}

//       {error && <ErrorBar msg={error} />}
//     </ModalShell>
//   );
// }

// // ══════════════════════════════════════════════════════════════════════
// // SHARED COMPONENTS
// // ══════════════════════════════════════════════════════════════════════
// function SectionTitle({ label, icon }) {
//   return (
//     <div style={{ padding: '10px 18px 4px', display: 'flex', alignItems: 'center', gap: 7 }}>
//       <span style={{ fontSize: 13 }}>{icon}</span>
//       <span style={{ fontSize: 11, fontWeight: 800, color: T.textPrimary, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
//         {label}
//       </span>
//       <div style={{ flex: 1, height: 1, background: T.borderLight, marginLeft: 4 }} />
//     </div>
//   );
// }

// function Field({ label, required, hint, children }) {
//   return (
//     <div>
//       <label style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, fontWeight: 700, color: T.textSecondary, marginBottom: 4 }}>
//         {label}{required && <span style={{ color: T.red.text, fontWeight: 800 }}>*</span>}
//       </label>
//       {children}
//       {hint && <div style={{ fontSize: 10, color: T.textMuted, marginTop: 3, fontWeight: 500 }}>{hint}</div>}
//     </div>
//   );
// }

// function FlowBanner({ from, to, note }) {
//   return (
//     <div style={{
//       background: T.blueSoft, borderBottom: `1px solid ${T.blueBorder}`,
//       padding: '10px 18px', display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap',
//     }}>
//       <span style={{ fontSize: 11, fontWeight: 700, color: T.textSecondary, letterSpacing: '0.02em' }}>STATUS FLOW:</span>
//       <span style={{ ...pill(T.amber, T.amberBg), border: `1.5px dashed ${T.amber}` }}>
//         <span style={{ width: 5, height: 5, borderRadius: '50%', background: T.amber }} />
//         <span style={{ fontSize: 10.5, fontWeight: 800, color: T.amber }}>{from}</span>
//         <span style={{ fontSize: 9, color: T.amber, opacity: 0.7 }}>now</span>
//       </span>
//       <svg width="16" height="12" viewBox="0 0 24 12" fill="none">
//         <path d="M2 6 h18 M15 1 l5 5 -5 5" stroke={T.textSecondary} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
//       </svg>
//       <span style={pill(T.green, T.greenBg)}>
//         <span style={{ width: 5, height: 5, borderRadius: '50%', background: T.green }} />
//         <span style={{ fontSize: 10.5, fontWeight: 800, color: T.green }}>{to}</span>
//         <span style={{ fontSize: 9, color: T.green, opacity: 0.7 }}>after save</span>
//       </span>
//       {note && <span style={{ fontSize: 10.5, color: T.textSecondary, fontWeight: 500 }}>{note}</span>}
//     </div>
//   );
// }

// function OutcomeCard({ active, color, bg, border, icon, title, subtitle, onClick }) {
//   return (
//     <button onClick={onClick} style={{
//       padding: '14px 12px', border: `2px solid ${active ? color : T.border}`,
//       background: active ? bg : T.cardBg, borderRadius: T.radius.md,
//       display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: 3,
//       cursor: 'pointer', textAlign: 'left', transition: 'all 0.15s ease', fontFamily: SANS,
//     }}>
//       <div style={{ fontSize: 22, marginBottom: 4 }}>{icon}</div>
//       <div style={{ fontSize: 13, fontWeight: 800, color: active ? color : T.textPrimary }}>{title}</div>
//       <div style={{ fontSize: 11, color: T.textSecondary }}>{subtitle}</div>
//     </button>
//   );
// }

// function SubmitBtn({ onClick, busy, label, disabled }) {
//   const isDisabled = busy || disabled;
//   return (
//     <button
//       onClick={onClick}
//       disabled={isDisabled}
//       style={{
//         padding: '8px 22px',
//         background: isDisabled ? T.textMuted : `linear-gradient(135deg, ${T.navy}, ${T.blueAccent})`,
//         color: 'white', border: 'none', borderRadius: T.radius.sm,
//         cursor: isDisabled ? 'not-allowed' : 'pointer',
//         fontSize: 12, fontWeight: 700, fontFamily: SANS,
//         display: 'flex', alignItems: 'center', gap: 6, opacity: isDisabled ? 0.7 : 1,
//         boxShadow: isDisabled ? 'none' : '0 3px 12px rgba(37,99,235,0.3)',
//       }}
//     >
//       {busy && (
//         <div style={{ width: 13, height: 13, border: '2px solid rgba(255,255,255,0.3)', borderTop: '2px solid white', borderRadius: '50%', animation: 'amSpin 0.6s linear infinite' }} />
//       )}
//       {busy ? 'Saving…' : label}
//     </button>
//   );
// }

// function ErrorBar({ msg }) {
//   return (
//     <div style={{
//       margin: '0 18px 10px', background: T.red.bg, border: `1.5px solid ${T.red.border}`,
//       borderRadius: T.radius.sm, padding: '10px 12px', color: T.red.text,
//       fontSize: 12, fontWeight: 600, display: 'flex', alignItems: 'flex-start', gap: 8,
//     }}>
//       <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ flexShrink: 0, marginTop: 1 }}>
//         <circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" />
//       </svg>
//       <div style={{ wordBreak: 'break-word' }}>{msg}</div>
//     </div>
//   );
// }

// const input = { width: '100%', boxSizing: 'border-box', padding: '8px 10px', border: `1.5px solid ${T.border}`, borderRadius: T.radius.md, fontSize: 12.5, fontFamily: SANS, color: T.textPrimary, background: T.cardBg };
// const btnCancel = { padding: '8px 16px', border: `1.5px solid ${T.border}`, borderRadius: T.radius.sm, background: T.cardBg, cursor: 'pointer', fontSize: 12, fontWeight: 600, color: T.textSecondary, fontFamily: SANS };
// const pill = (color, bg) => ({ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '3px 10px', borderRadius: 20, background: bg });




























import React, { useState, useMemo } from 'react';
import { createPortal } from 'react-dom';

const SANS = "'Roboto', sans-serif";

const T = {
  cardBg: '#FFFFFF', surfaceBg: '#F8FAFC',
  navy: '#1E3A6B', navyMid: '#2A4F8F', navyLight: '#3562A8',
  blueAccent: '#2563EB', blueSoft: '#E8F0FE', blueBorder: '#C5D5EF',
  textPrimary: '#0F172A', textSecondary: '#475569', textMuted: '#94A3B8',
  border: '#E8ECF4', borderLight: '#F1F5F9',
  textOnDark: '#FFFFFF', textOnDarkSoft: 'rgba(255,255,255,0.75)',
  green: '#0F7A5A', greenBg: '#E6F5EF', greenBorder: '#B8E0CE',
  amber: '#92620B', amberBg: '#FBF2DE', amberBorder: '#F0DDA3',
  red: { bg: '#FCEBEA', text: '#B42318', border: '#F2C1BC' },
  shadow: { xl: '0 20px 60px rgba(15,23,42,0.22)' },
  radius: { sm: 6, md: 8, lg: 10 },
};

const globalStyles = `
  @keyframes amFadeIn { from { opacity: 0; } to { opacity: 1; } }
  @keyframes amScaleIn {
    from { opacity: 0; transform: scale(0.96) translateY(6px); }
    to { opacity: 1; transform: scale(1) translateY(0); }
  }
  @keyframes amSpin { to { transform: rotate(360deg); } }
  .am-overlay { animation: amFadeIn 0.18s ease; }
  .am-dialog { animation: amScaleIn 0.24s cubic-bezier(0.16,1,0.3,1); }
  .am-input:focus {
    border-color: ${T.blueAccent} !important;
    box-shadow: 0 0 0 3px rgba(37,99,235,0.1) !important;
    outline: none;
  }
`;

// ══════════════════════════════════════════════════════════════════════
// HELPERS
// ══════════════════════════════════════════════════════════════════════

// Get today's date in YYYY-MM-DD format for date input min attribute
function getTodayISO() {
  const t = new Date();
  const y = t.getFullYear();
  const m = String(t.getMonth() + 1).padStart(2, '0');
  const d = String(t.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

// Sort array of strings alphabetically (case-insensitive)
function sortStrings(arr) {
  return [...arr].sort((a, b) => a.toLowerCase().localeCompare(b.toLowerCase()));
}

// Sort array of {value, label} objects alphabetically by label
function sortOptions(arr) {
  return [...arr].sort((a, b) => a.label.toLowerCase().localeCompare(b.label.toLowerCase()));
}

// ══════════════════════════════════════════════════════════════════════
// SHARED — Modal shell
// ══════════════════════════════════════════════════════════════════════
function ModalShell({ headerIcon, title, subtitle, onClose, children, footer, width = 720 }) {
  return createPortal(
    <div
      className="am-overlay"
      onClick={(e) => e.target === e.currentTarget && onClose()}
      style={{
        position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
        background: 'rgba(15,23,42,0.55)',
        backdropFilter: 'blur(6px)', WebkitBackdropFilter: 'blur(6px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        zIndex: 2000, padding: 20,
      }}
    >
      <style>{globalStyles}</style>
      <div className="am-dialog" style={{
        width, maxWidth: '100%', background: T.cardBg, borderRadius: T.radius.lg,
        overflow: 'hidden', boxShadow: T.shadow.xl, maxHeight: '90vh',
        display: 'flex', flexDirection: 'column', fontFamily: SANS,
        border: `1px solid ${T.border}`,
      }}>
        {/* HEADER */}
        <div style={{
          flexShrink: 0,
          background: `linear-gradient(135deg, ${T.navy} 0%, ${T.navyMid} 50%, ${T.navyLight} 100%)`,
          padding: '13px 18px', display: 'flex', alignItems: 'center',
          justifyContent: 'space-between', position: 'relative', overflow: 'hidden',
        }}>
          <div style={{
            position: 'absolute', top: '-60%', right: '-10%', width: 220, height: 220,
            background: 'radial-gradient(circle, rgba(147,197,253,0.15) 0%, transparent 65%)',
          }} />
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, position: 'relative', zIndex: 1 }}>
            <div style={{
              width: 34, height: 34, borderRadius: T.radius.md,
              background: 'rgba(255,255,255,0.15)', border: '1px solid rgba(255,255,255,0.22)',
              display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16,
            }}>
              {headerIcon}
            </div>
            <div>
              <div style={{ fontSize: 14.5, fontWeight: 700, color: T.textOnDark, lineHeight: 1.2 }}>
                {title}
              </div>
              <div style={{ fontSize: 10.5, color: T.textOnDarkSoft, marginTop: 2 }}>
                {subtitle}
              </div>
            </div>
          </div>
          <button onClick={onClose} style={{
            width: 30, height: 30, border: '1px solid rgba(255,255,255,0.25)', borderRadius: T.radius.sm,
            background: 'rgba(255,255,255,0.12)', color: 'white', cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative', zIndex: 1,
          }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
              <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        <div style={{ overflowY: 'auto', flex: 1 }}>{children}</div>

        <div style={{
          padding: '12px 18px', borderTop: `1px solid ${T.border}`,
          display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10,
          background: T.surfaceBg, flexShrink: 0,
        }}>
          <div style={{ fontSize: 10.5, color: T.textMuted, fontWeight: 500 }}>
            Fields marked <span style={{ color: T.red.text, fontWeight: 700 }}>*</span> are required
          </div>
          <div style={{ display: 'flex', gap: 7 }}>{footer}</div>
        </div>
      </div>
    </div>,
    document.body
  );
}

// ══════════════════════════════════════════════════════════════════════
// CONSTANTS (sorted alphabetically)
// ══════════════════════════════════════════════════════════════════════
const CASE_TYPE_OPTIONS_RAW = [
  { value: 'civil', label: 'Civil' }, { value: 'criminal', label: 'Criminal' },
  { value: 'tax', label: 'Tax Matter' }, { value: 'corporate', label: 'Corporate' },
  { value: 'constitutional', label: 'Constitutional' }, { value: 'administrative', label: 'Administrative' },
  { value: 'other', label: 'Other' },
];
const CASE_TYPE_OPTIONS = sortOptions(CASE_TYPE_OPTIONS_RAW);

const APPEAL_STAGE_OPTIONS_RAW = [
  { value: 'first_appeal', label: 'First Appeal' }, { value: 'second_appeal', label: 'Second Appeal' },
  { value: 'tribunal', label: 'Tribunal' }, { value: 'high_court', label: 'High Court' },
  { value: 'supreme_court', label: 'Supreme Court' }, { value: 'not_applicable', label: 'Not Applicable' },
];
const APPEAL_STAGE_OPTIONS = sortOptions(APPEAL_STAGE_OPTIONS_RAW);

const COURT_NAME_OPTIONS_RAW = [
  'Supreme Court of India', 'High Court', 'District Court', 'Sessions Court',
  'ITAT (Income Tax Appellate Tribunal)', 'NCLT (National Company Law Tribunal)',
  'NCLAT (National Company Law Appellate Tribunal)', 'CESTAT', 'AAAR', 'AAR',
  'Commissioner of Income Tax (Appeals)', 'DRP (Dispute Resolution Panel)',
  'Magistrate Court', 'Civil Court', 'Consumer Forum',
];
const COURT_NAME_OPTIONS = sortStrings(COURT_NAME_OPTIONS_RAW);

const ADJOURNMENT_REASONS_RAW = [
  { value: 'fever', label: 'Fever' }, { value: 'travelling', label: 'Travelling' },
  { value: 'personal_emergency', label: 'Personal Emergency' }, { value: 'family_function', label: 'Family Function' },
  { value: 'client_unavailable', label: 'Client Unavailable' }, { value: 'document_not_completed', label: 'Document Not Completed' },
  { value: 'lawyer_unavailable', label: 'Lawyer Unavailable' }, { value: 'court_holiday', label: 'Court Holiday' },
  { value: 'opposing_party_request', label: 'Opposing Party Request' }, { value: 'other', label: 'Other' },
];
const ADJOURNMENT_REASONS = sortOptions(ADJOURNMENT_REASONS_RAW);

function fmtDate(d) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}

function extractError(e) {
  const resp = e?.response;
  if (!resp) return e?.message || 'Failed to submit.';
  if (resp.status === 404) return 'Backend endpoint not found (404). Restart Django after adding the action.';
  if (resp.status === 403) return resp.data?.error || 'Not authorized.';
  if (resp.data?.error) return resp.data.error;
  if (resp.data?.detail) return resp.data.detail;
  return `Error ${resp.status}`;
}

// ══════════════════════════════════════════════════════════════════════
// MODAL 1 — Submit to Court (Appeal)
// ══════════════════════════════════════════════════════════════════════
export function SubmitToCourtModal({ activityCase, subServiceName, onClose, onSubmit }) {
  const TODAY = getTodayISO();

  const caseTitleOptions = useMemo(() => {
    const list = [];
    if (subServiceName) list.push(subServiceName);
    list.push('Other');
    return list;
  }, [subServiceName]);

  const initialTitleKnown = activityCase?.case_title && caseTitleOptions.includes(activityCase.case_title);
  const initialCourtKnown = activityCase?.court_name && COURT_NAME_OPTIONS.includes(activityCase.court_name);

  const [form, setForm] = useState({
    case_title: initialTitleKnown ? activityCase.case_title : (activityCase?.case_title ? 'Other' : (subServiceName || '')),
    case_title_text: !initialTitleKnown && activityCase?.case_title ? activityCase.case_title : '',
    court_name: initialCourtKnown ? activityCase.court_name : (activityCase?.court_name ? 'Other' : ''),
    court_name_text: !initialCourtKnown && activityCase?.court_name ? activityCase.court_name : '',
    case_number: activityCase?.case_number || '',
    case_type: activityCase?.case_type || '',
    appeal_stage: activityCase?.appeal_stage || '',
    next_hearing_date: '',
    note: '',
  });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const change = (e) => setForm((p) => ({ ...p, [e.target.name]: e.target.value }));

  const submit = async () => {
    const finalTitle = form.case_title === 'Other' ? form.case_title_text.trim() : form.case_title;
    const finalCourt = form.court_name === 'Other' ? form.court_name_text.trim() : form.court_name;

    if (!finalTitle) return setError('Case title is required.');
    if (!finalCourt) return setError('Court name is required.');
    if (!form.case_type) return setError('Case type is required.');
    if (!form.next_hearing_date) return setError('Hearing date is required.');
    if (form.next_hearing_date < TODAY) return setError('Hearing date cannot be in the past.');
    if (!form.note.trim()) return setError('Description is required.');

    setBusy(true);
    setError('');
    try {
      await onSubmit({
        case_title: finalTitle,
        court_name: finalCourt,
        case_number: form.case_number.trim(),
        case_type: form.case_type,
        appeal_stage: form.appeal_stage || null,
        next_hearing_date: form.next_hearing_date,
        note: form.note.trim(),
      });
    } catch (e) {
      setError(extractError(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <ModalShell
      headerIcon="⚖️"
      title="Submit Appeal to Court"
      subtitle="Status will flip to OPEN after submission"
      onClose={onClose}
      footer={
        <>
          <button onClick={onClose} style={btnCancel}>Cancel</button>
          <SubmitBtn onClick={submit} busy={busy} label="Submit to Court" />
        </>
      }
    >
      <FlowBanner from="WIP" to="OPEN" />

      <SectionTitle label="Case Details" icon="📋" />
      <div style={{ padding: '4px 18px 12px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>

        <Field label="Case Title" required>
          <select className="am-input" style={input} name="case_title" value={form.case_title} onChange={change}>
            <option value="">Select case title</option>
            {caseTitleOptions.map((o) => <option key={o} value={o}>{o}</option>)}
          </select>
          {form.case_title === 'Other' && (
            <input className="am-input" style={{ ...input, marginTop: 6 }} name="case_title_text" value={form.case_title_text} onChange={change} placeholder="Enter custom case title" />
          )}
        </Field>

        <Field label="Court Name" required>
          <select className="am-input" style={input} name="court_name" value={form.court_name} onChange={change}>
            <option value="">Select court</option>
            {COURT_NAME_OPTIONS.map((c) => <option key={c} value={c}>{c}</option>)}
            <option value="Other">Other</option>
          </select>
          {form.court_name === 'Other' && (
            <input className="am-input" style={{ ...input, marginTop: 6 }} name="court_name_text" value={form.court_name_text} onChange={change} placeholder="Enter custom court name" />
          )}
        </Field>

        <Field label="Case Number">
          <input className="am-input" style={input} name="case_number" value={form.case_number} onChange={change} placeholder="e.g. ITA/2024/1234" />
        </Field>

        <Field label="Case Type" required>
          <select className="am-input" style={input} name="case_type" value={form.case_type} onChange={change}>
            <option value="">Select case type</option>
            {CASE_TYPE_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        </Field>

        <Field label="Appeal Stage">
          <select className="am-input" style={input} name="appeal_stage" value={form.appeal_stage} onChange={change}>
            <option value="">Not specified</option>
            {APPEAL_STAGE_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
        </Field>

        <Field
          label="Hearing Date"
          required
          hint="Only today or future dates. Use 'Log Adjournment' to push later."
        >
          <input
            type="date"
            className="am-input"
            style={input}
            name="next_hearing_date"
            value={form.next_hearing_date}
            onChange={change}
            min={TODAY}
          />
        </Field>

      </div>

      <SectionTitle label="Submission Description" icon="✍️" />
      <div style={{ padding: '4px 18px 16px' }}>
        <Field label="What are you submitting to the court?" required>
          <textarea
            className="am-input"
            style={{ ...input, resize: 'vertical', minHeight: 78 }}
            name="note"
            rows={3}
            placeholder="e.g. Filed appeal against demand order..."
            value={form.note}
            onChange={change}
          />
        </Field>
      </div>

      {error && <ErrorBar msg={error} />}
    </ModalShell>
  );
}


// ══════════════════════════════════════════════════════════════════════
// MODAL 2 — Log Postponement (Adjourn / Extend / Transfer to another court)
// ══════════════════════════════════════════════════════════════════════
export function LogAdjournmentModal({ activityCase, onClose, onSubmit }) {
  const TODAY = getTodayISO();

  const [postponeType, setPostponeType] = useState('adjournment');
  const [form, setForm] = useState({
    reason: '',
    next_hearing_date: '',
    extended_date: '',
    case_number: activityCase?.case_number || '',
    court_name: activityCase?.court_name || '',
    new_court_name: '',
    new_case_number: '',
    comment: '',
  });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const change = (e) => setForm((p) => ({ ...p, [e.target.name]: e.target.value }));

  const submit = async () => {
    if (!form.reason) return setError('Reason is required.');
    if (!form.comment.trim()) return setError('Description is required.');

    // Validation per type
    if (postponeType === 'adjournment') {
      if (!form.next_hearing_date) return setError('New hearing date is required.');
      if (form.next_hearing_date < TODAY) return setError('New hearing date cannot be in the past.');
    }
    if (postponeType === 'extension') {
      if (!form.extended_date) return setError('Extended date is required.');
      if (form.extended_date < TODAY) return setError('Extended date cannot be in the past.');
    }
    if (postponeType === 'transfer') {
      if (!form.new_court_name.trim()) return setError('New court name is required.');
      if (!form.next_hearing_date) return setError('New hearing date at new court is required.');
      if (form.next_hearing_date < TODAY) return setError('New hearing date cannot be in the past.');
    }

    // Pick which date to send as next_hearing_date
    const finalDate = postponeType === 'extension' ? form.extended_date : form.next_hearing_date;

    setBusy(true); setError('');
    try {
      await onSubmit({
        postpone_type: postponeType,
        reason: form.reason,
        next_hearing_date: finalDate,
        extended_date: postponeType === 'extension' ? form.extended_date : null,
        case_number: postponeType === 'transfer'
          ? form.new_case_number.trim()
          : form.case_number.trim(),
        court_name: postponeType === 'transfer'
          ? form.new_court_name.trim()
          : form.court_name.trim(),
        comment: form.comment.trim(),
      });
    } catch (e) {
      setError(extractError(e));
    } finally {
      setBusy(false);
    }
  };

  // Whether case number + court name should be visible in Current Hearing section
  const showCaseInfoInHeader = postponeType === 'adjournment' || postponeType === 'extension';

  return (
    <ModalShell
      headerIcon="⏳"
      title="Log Postponement"
      subtitle="Adjourn, extend, or transfer this case to another court"
      onClose={onClose}
      footer={
        <>
          <button onClick={onClose} style={btnCancel}>Cancel</button>
          <SubmitBtn onClick={submit} busy={busy} label="Save Postponement" />
        </>
      }
    >
      <FlowBanner from={activityCase?.status?.toUpperCase() || 'WIP'} to="OPEN" note="(with updated info)" />

      {/* ── CURRENT HEARING — shows case info on right side for adjournment/extension ── */}
      <SectionTitle label="Current Hearing" icon="📆" />
      <div style={{ padding: '4px 18px 12px' }}>
        <div style={{
          padding: '12px 14px',
          background: T.amberBg,
          border: `1px solid ${T.amberBorder}`,
          borderRadius: T.radius.md,
          display: 'flex', alignItems: 'center', gap: 14,
          flexWrap: 'wrap',
        }}>
          {/* LEFT — date */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, flex: '1 1 240px', minWidth: 220 }}>
            <span style={{ fontSize: 20 }}>📅</span>
            <div>
              <div style={{ fontSize: 10, fontWeight: 700, color: T.amber, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Currently scheduled
              </div>
              <div style={{ fontSize: 13, fontWeight: 700, color: T.textPrimary, marginTop: 1 }}>
                {activityCase?.next_hearing_date ? fmtDate(activityCase.next_hearing_date) : 'No hearing date set'}
              </div>
            </div>
          </div>

          {/* RIGHT — case info (only for adjournment/extension) */}
          {showCaseInfoInHeader && (
            <div style={{
              display: 'flex', gap: 16, flexWrap: 'wrap',
              paddingLeft: 14,
              borderLeft: `1px solid ${T.amberBorder}`,
              flex: '1 1 auto',
            }}>
              <div style={{ minWidth: 0 }}>
                <div style={{ fontSize: 9.5, fontWeight: 700, color: T.amber, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 2 }}>
                  Court
                </div>
                <div style={{ fontSize: 12.5, fontWeight: 700, color: T.textPrimary, wordBreak: 'break-word' }}>
                  {activityCase?.court_name || '—'}
                </div>
              </div>
              <div style={{ minWidth: 0 }}>
                <div style={{ fontSize: 9.5, fontWeight: 700, color: T.amber, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 2 }}>
                  Case No.
                </div>
                <div style={{ fontSize: 12.5, fontWeight: 700, color: T.textPrimary, wordBreak: 'break-word' }}>
                  {activityCase?.case_number || '—'}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── Type Selector ── */}
      <SectionTitle label="Postponement Type" icon="🎯" />
      <div style={{ padding: '4px 18px 12px', display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10 }}>
        <OutcomeCard
          active={postponeType === 'adjournment'}
          color={T.amber} bg={T.amberBg} border={T.amberBorder}
          icon="⏳" title="Adjournment" subtitle="Push to new date (same court)"
          onClick={() => setPostponeType('adjournment')}
        />
        <OutcomeCard
          active={postponeType === 'extension'}
          color={T.blueAccent} bg={T.blueSoft} border={T.blueBorder}
          icon="📅" title="Extension" subtitle="Deadline extended"
          onClick={() => setPostponeType('extension')}
        />
        <OutcomeCard
          active={postponeType === 'transfer'}
          color={T.navy} bg={T.blueSoft} border={T.blueBorder}
          icon="🏛️" title="Court Transfer" subtitle="Moved to different court"
          onClick={() => setPostponeType('transfer')}
        />
      </div>

      {/* ── Details form (changes by type) ── */}
      <SectionTitle label="Details" icon="📋" />
      <div style={{ padding: '4px 18px 12px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
        <Field label="Reason" required>
          <select className="am-input" style={input} name="reason" value={form.reason} onChange={change}>
            <option value="">Select reason</option>
            {ADJOURNMENT_REASONS.map((r) => <option key={r.value} value={r.value}>{r.label}</option>)}
          </select>
        </Field>

        {/* Date field — label changes by type */}
        {postponeType === 'adjournment' && (
          <Field label="New Hearing Date" required hint="Only today or future dates">
            <input type="date" className="am-input" style={input} name="next_hearing_date"
              value={form.next_hearing_date} onChange={change} min={TODAY} />
          </Field>
        )}
        {postponeType === 'extension' && (
          <Field label="Extended Date" required hint="Only today or future dates">
            <input type="date" className="am-input" style={input} name="extended_date"
              value={form.extended_date} onChange={change} min={TODAY} />
          </Field>
        )}
        {postponeType === 'transfer' && (
          <Field label="New Hearing Date" required hint="First hearing at new court">
            <input type="date" className="am-input" style={input} name="next_hearing_date"
              value={form.next_hearing_date} onChange={change} min={TODAY} />
          </Field>
        )}

        {/* ── Court + Case Number — ONLY shown for Transfer ── */}
        {postponeType === 'transfer' && (
          <>
            <Field label="New Court Name" required hint="Where the case is now moved">
              <select className="am-input" style={input} name="new_court_name"
                value={form.new_court_name} onChange={change}>
                <option value="">Select new court</option>
                {COURT_NAME_OPTIONS.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </Field>
            <Field label="New Case Number" hint="At the new court (if assigned)">
              <input className="am-input" style={input} name="new_case_number"
                value={form.new_case_number} onChange={change} placeholder="e.g. HC/2024/5678" />
            </Field>
          </>
        )}
      </div>

      <SectionTitle label="Description" icon="✍️" />
      <div style={{ padding: '4px 18px 16px' }}>
        <Field label="Details / court remarks" required>
          <textarea className="am-input" style={{ ...input, resize: 'vertical', minHeight: 72 }}
            name="comment" rows={3}
            placeholder={
              postponeType === 'adjournment' ? 'e.g. Court adjourned at counsel\'s request due to...'
              : postponeType === 'extension' ? 'e.g. Filing deadline extended by 30 days as per order...'
              : 'e.g. Case transferred from ITAT to High Court under...'
            }
            value={form.comment} onChange={change} />
        </Field>
      </div>

      {error && <ErrorBar msg={error} />}
    </ModalShell>
  );
}

// ══════════════════════════════════════════════════════════════════════
// MODAL 3 — Log Outcome (unchanged)
// ══════════════════════════════════════════════════════════════════════
export function LogOutcomeModal({ activityCase, onClose, onSubmit }) {
  const [outcome, setOutcome] = useState('');
  const [judgement, setJudgement] = useState('');
  const [nextAction, setNextAction] = useState('');
  const [comment, setComment] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const submit = async () => {
    if (!outcome) return setError('Please choose Won or Lost.');
    if (outcome === 'won' && !judgement.trim()) return setError('Judgement details are required.');
    if (outcome === 'lost' && !nextAction) return setError('Please choose next action.');
    if (outcome === 'lost' && !comment.trim()) return setError('Comment is required.');

    setBusy(true); setError('');
    try {
      if (outcome === 'won') {
        await onSubmit({ outcome: 'won', judgement_info: judgement.trim() });
      } else {
        await onSubmit({ outcome: 'lost', next_action: nextAction, comment: comment.trim() });
      }
    } catch (e) {
      setError(extractError(e));
    } finally { setBusy(false); }
  };

  const nextStatus = outcome === 'won' ? 'CLOSED'
    : outcome === 'lost' && nextAction === 'leave' ? 'CLOSED'
    : outcome === 'lost' && nextAction === 'appeal' ? 'WIP'
    : '?';

  return (
    <ModalShell
      headerIcon="📋"
      title="Log Hearing Outcome"
      subtitle="Record the court's decision on this hearing"
      onClose={onClose}
      footer={
        <>
          <button onClick={onClose} style={btnCancel}>Cancel</button>
          <SubmitBtn onClick={submit} busy={busy} label={outcome === 'won' ? 'Confirm Win' : outcome === 'lost' ? 'Confirm Loss' : 'Choose Outcome'} disabled={!outcome} />
        </>
      }
    >
      {outcome && <FlowBanner from={activityCase?.status?.toUpperCase() || 'WIP'} to={nextStatus} />}

      <SectionTitle label="Hearing Outcome" icon="⚖️" />
      <div style={{ padding: '4px 18px 12px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
        <OutcomeCard
          active={outcome === 'won'}
          color={T.green} bg={T.greenBg} border={T.greenBorder}
          icon="✅" title="Case Won" subtitle="Court ruled in favour"
          onClick={() => setOutcome('won')}
        />
        <OutcomeCard
          active={outcome === 'lost'}
          color={T.red.text} bg={T.red.bg} border={T.red.border}
          icon="⚠️" title="Case Lost" subtitle="Court ruled against"
          onClick={() => setOutcome('lost')}
        />
      </div>

      {outcome === 'won' && (
        <>
          <SectionTitle label="Judgement Details" icon="📝" />
          <div style={{ padding: '4px 18px 16px' }}>
            <Field label="Summarize the judgement" required>
              <textarea className="am-input" style={{ ...input, resize: 'vertical', minHeight: 84 }} rows={4}
                value={judgement} onChange={(e) => setJudgement(e.target.value)}
                placeholder="e.g. Court accepted our arguments on Sec 40(a)(ia). Demand set aside..." />
            </Field>
            <div style={{ marginTop: 6, fontSize: 11, color: T.green, fontWeight: 600 }}>
              → Case will move to <b>CLOSED</b> after saving.
            </div>
          </div>
        </>
      )}

      {outcome === 'lost' && (
        <>
          <SectionTitle label="Next Action" icon="🎯" />
          <div style={{ padding: '4px 18px 12px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <OutcomeCard
              active={nextAction === 'appeal'}
              color={T.navy} bg={T.blueSoft} border={T.blueBorder}
              icon="⚖️" title="Appeal to Next Court" subtitle="File higher appeal"
              onClick={() => setNextAction('appeal')}
            />
            <OutcomeCard
              active={nextAction === 'leave'}
              color={T.red.text} bg={T.red.bg} border={T.red.border}
              icon="🚫" title="Leave the Case" subtitle="Do not pursue further"
              onClick={() => setNextAction('leave')}
            />
          </div>

          <SectionTitle label="Comment" icon="✍️" />
          <div style={{ padding: '4px 18px 16px' }}>
            <Field label="Details of the loss / reasoning" required>
              <textarea className="am-input" style={{ ...input, resize: 'vertical', minHeight: 72 }} rows={3}
                value={comment} onChange={(e) => setComment(e.target.value)}
                placeholder="e.g. Court held that the deduction was not admissible under Sec..." />
            </Field>
            {nextAction && (
              <div style={{ marginTop: 6, fontSize: 11, color: nextAction === 'leave' ? T.red.text : T.navy, fontWeight: 600 }}>
                → Case will move to <b>{nextAction === 'leave' ? 'CLOSED' : 'WIP'}</b> after saving.
                {nextAction === 'appeal' && ' You can then file another appeal.'}
              </div>
            )}
          </div>
        </>
      )}

      {error && <ErrorBar msg={error} />}
    </ModalShell>
  );
}

// ══════════════════════════════════════════════════════════════════════
// SHARED COMPONENTS
// ══════════════════════════════════════════════════════════════════════
function SectionTitle({ label, icon }) {
  return (
    <div style={{ padding: '10px 18px 4px', display: 'flex', alignItems: 'center', gap: 7 }}>
      <span style={{ fontSize: 13 }}>{icon}</span>
      <span style={{ fontSize: 11, fontWeight: 800, color: T.textPrimary, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
        {label}
      </span>
      <div style={{ flex: 1, height: 1, background: T.borderLight, marginLeft: 4 }} />
    </div>
  );
}

function Field({ label, required, hint, children }) {
  return (
    <div>
      <label style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, fontWeight: 700, color: T.textSecondary, marginBottom: 4 }}>
        {label}{required && <span style={{ color: T.red.text, fontWeight: 800 }}>*</span>}
      </label>
      {children}
      {hint && <div style={{ fontSize: 10, color: T.textMuted, marginTop: 3, fontWeight: 500 }}>{hint}</div>}
    </div>
  );
}

function FlowBanner({ from, to, note }) {
  return (
    <div style={{
      background: T.blueSoft, borderBottom: `1px solid ${T.blueBorder}`,
      padding: '10px 18px', display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap',
    }}>
      <span style={{ fontSize: 11, fontWeight: 700, color: T.textSecondary, letterSpacing: '0.02em' }}>STATUS FLOW:</span>
      <span style={{ ...pill(T.amber, T.amberBg), border: `1.5px dashed ${T.amber}` }}>
        <span style={{ width: 5, height: 5, borderRadius: '50%', background: T.amber }} />
        <span style={{ fontSize: 10.5, fontWeight: 800, color: T.amber }}>{from}</span>
        <span style={{ fontSize: 9, color: T.amber, opacity: 0.7 }}>now</span>
      </span>
      <svg width="16" height="12" viewBox="0 0 24 12" fill="none">
        <path d="M2 6 h18 M15 1 l5 5 -5 5" stroke={T.textSecondary} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
      <span style={pill(T.green, T.greenBg)}>
        <span style={{ width: 5, height: 5, borderRadius: '50%', background: T.green }} />
        <span style={{ fontSize: 10.5, fontWeight: 800, color: T.green }}>{to}</span>
        <span style={{ fontSize: 9, color: T.green, opacity: 0.7 }}>after save</span>
      </span>
      {note && <span style={{ fontSize: 10.5, color: T.textSecondary, fontWeight: 500 }}>{note}</span>}
    </div>
  );
}

function OutcomeCard({ active, color, bg, border, icon, title, subtitle, onClick }) {
  return (
    <button onClick={onClick} style={{
      padding: '14px 12px', border: `2px solid ${active ? color : T.border}`,
      background: active ? bg : T.cardBg, borderRadius: T.radius.md,
      display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: 3,
      cursor: 'pointer', textAlign: 'left', transition: 'all 0.15s ease', fontFamily: SANS,
    }}>
      <div style={{ fontSize: 22, marginBottom: 4 }}>{icon}</div>
      <div style={{ fontSize: 13, fontWeight: 800, color: active ? color : T.textPrimary }}>{title}</div>
      <div style={{ fontSize: 11, color: T.textSecondary }}>{subtitle}</div>
    </button>
  );
}

function SubmitBtn({ onClick, busy, label, disabled }) {
  const isDisabled = busy || disabled;
  return (
    <button
      onClick={onClick}
      disabled={isDisabled}
      style={{
        padding: '8px 22px',
        background: isDisabled ? T.textMuted : `linear-gradient(135deg, ${T.navy}, ${T.blueAccent})`,
        color: 'white', border: 'none', borderRadius: T.radius.sm,
        cursor: isDisabled ? 'not-allowed' : 'pointer',
        fontSize: 12, fontWeight: 700, fontFamily: SANS,
        display: 'flex', alignItems: 'center', gap: 6, opacity: isDisabled ? 0.7 : 1,
        boxShadow: isDisabled ? 'none' : '0 3px 12px rgba(37,99,235,0.3)',
      }}
    >
      {busy && (
        <div style={{ width: 13, height: 13, border: '2px solid rgba(255,255,255,0.3)', borderTop: '2px solid white', borderRadius: '50%', animation: 'amSpin 0.6s linear infinite' }} />
      )}
      {busy ? 'Saving…' : label}
    </button>
  );
}

function ErrorBar({ msg }) {
  return (
    <div style={{
      margin: '0 18px 10px', background: T.red.bg, border: `1.5px solid ${T.red.border}`,
      borderRadius: T.radius.sm, padding: '10px 12px', color: T.red.text,
      fontSize: 12, fontWeight: 600, display: 'flex', alignItems: 'flex-start', gap: 8,
    }}>
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ flexShrink: 0, marginTop: 1 }}>
        <circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" />
      </svg>
      <div style={{ wordBreak: 'break-word' }}>{msg}</div>
    </div>
  );
}

const input = { width: '100%', boxSizing: 'border-box', padding: '8px 10px', border: `1.5px solid ${T.border}`, borderRadius: T.radius.md, fontSize: 12.5, fontFamily: SANS, color: T.textPrimary, background: T.cardBg };
const btnCancel = { padding: '8px 16px', border: `1.5px solid ${T.border}`, borderRadius: T.radius.sm, background: T.cardBg, cursor: 'pointer', fontSize: 12, fontWeight: 600, color: T.textSecondary, fontFamily: SANS };
const pill = (color, bg) => ({ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '3px 10px', borderRadius: 20, background: bg });