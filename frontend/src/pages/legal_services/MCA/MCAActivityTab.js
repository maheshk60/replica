
import React, { useState, useRef, useCallback, useEffect } from 'react';
import { api } from '../../../services/api';

const MCA_LINKS = {
  login: 'https://www.mca.gov.in/content/mca/global/en/foportal/fologin.html',
};

const MUT = '#8A8FA3';
const C = {
  navy: '#1E3A6B', ink: '#0F172A', slate: '#475569', muted: '#94A3B8',
  border: '#E7E9F0', borderLight: '#F1F3F8',
  bg: '#F8FAFC', bgSoft: '#FBFCFE',
  red: '#B42318', redBg: '#FCEBEA', redBorder: '#F2C1BC',
};

function fmtDateTime(d) {
  if (!d) return '—';
  return new Date(d).toLocaleString('en-IN', {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}


function FileRow({ doc, onOpen, onDownload, canDelete, onDelete, deleting, icon = '📄' }) {
  if (!doc) return null;

  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 10, padding: '12px 16px',
      background: '#ffffff', border: '1px solid #E2E8F0', borderRadius: 10,
      boxShadow: '0 2px 4px rgba(15,23,42,0.03)', transition: 'all 0.2s ease',
      marginTop: 10,
    }}>
      {/* Clickable area → VIEW */}
      <div
        onClick={onOpen}
        style={{
          display: 'flex', alignItems: 'center', gap: 12, flex: 1, minWidth: 0,
          cursor: 'pointer',
        }}
      >
        <div style={{
          width: 36, height: 36, borderRadius: 8, background: '#F8FAFC',
          border: '1px solid #F1F5F9', display: 'flex', alignItems: 'center',
          justifyContent: 'center', fontSize: 18, flexShrink: 0,
        }}>
          {icon}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{
            fontSize: 13, fontWeight: 700, color: '#0F172A',
            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
          }}>
            {doc.file_name}
          </div>
          <div style={{ fontSize: 11, color: '#64748B', marginTop: 2 }}>
            Uploaded {fmtDateTime(doc.uploaded_at)}
          </div>
        </div>
        <span style={{
          fontSize: 11.5, color: '#2563EB', fontWeight: 600,
          flexShrink: 0, paddingRight: 4,
        }}>
          View PDF
        </span>
      </div>

      {/* Download button */}
      {onDownload && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onDownload();
          }}
          title="Download file"
          style={{
            width: 32, height: 32, borderRadius: 8,
            border: '1px solid #E2E8F0', background: '#F8FAFC',
            color: '#475569', cursor: 'pointer', flexShrink: 0,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 14, transition: 'all 0.15s',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = '#EFF6FF';
            e.currentTarget.style.borderColor = '#BFDBFE';
            e.currentTarget.style.color = '#2563EB';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = '#F8FAFC';
            e.currentTarget.style.borderColor = '#E2E8F0';
            e.currentTarget.style.color = '#475569';
          }}
        >
          ⬇
        </button>
      )}

      {/* Delete button (draft / rejected only) */}
      {canDelete && (
        <button
          type="button"
          onClick={onDelete}
          disabled={deleting}
          title="Remove Document"
          style={{
            width: 32, height: 32, borderRadius: 8, border: 'none',
            background: '#FEF2F2', color: '#EF4444',
            cursor: deleting ? 'wait' : 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 14, opacity: deleting ? 0.5 : 1, flexShrink: 0,
          }}
        >
          ✕
        </button>
      )}
    </div>
  );
}









function Toast({ message, type = 'success', onClose }) {
  useEffect(() => {
    const t = setTimeout(onClose, 3000);
    return () => clearTimeout(t);
  }, [onClose]);

  const bg = type === 'success' ? '#059669' : type === 'error' ? '#DC2626' : '#1E3A8A';
  return (
    <div style={{
      position: 'fixed', top: 24, right: 24, zIndex: 999999, background: '#fff',
      border: `1px solid ${bg}30`, borderLeft: `4px solid ${bg}`, borderRadius: 8,
      padding: '12px 16px', boxShadow: '0 10px 30px rgba(15,23,42,0.15)',
      display: 'flex', alignItems: 'center', gap: 12, minWidth: 260, maxWidth: 400,
    }}>
      <div style={{ width: 22, height: 22, borderRadius: '50%', background: bg, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 800 }}>
        {type === 'success' ? '✓' : '✕'}
      </div>
      <div style={{ fontSize: 12.5, fontWeight: 600, color: '#0F172A', flex: 1 }}>{message}</div>
      <button type="button" onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94A3B8', fontSize: 16 }}>×</button>
    </div>
  );
}

export default function MCAActivityTab({ caseData, filing, user, onUpdated }) {
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState(null);
  const [actionLoading, setActionLoading] = useState(null);

  const [toast, setToast] = useState(null);
  const showToast = useCallback((msg, type = 'success') => { setToast({ msg, type }); }, []);

  const draftFileRef = useRef(null);
  const srnFileRef = useRef(null);
  const certFileRef = useRef(null); // Reference for Stage 3 Final Approval Certificate

  const isMaker = (caseData?.makers || []).some((m) => m.id === user?.id);
  const isAdmin = ['Admin', 'Founder', 'Manager'].includes(user?.role);
  const canAct = isMaker ;

  const filingId = filing?.id;
  const docs = filing?.documents || [];

  const draftDocs = docs.filter((d) => ['draft_form', 'pending_draft'].includes(d.doc_type));
  const srnDocs = docs.filter((d) => ['srn_receipt', 'challan', 'acknowledgment'].includes(d.doc_type));
  const certDoc = docs.find((d) => d.doc_type === 'mca_approval_cert'); // Find the final certificate

  const draftDoc = draftDocs[draftDocs.length - 1] || null;
  const srnDoc = srnDocs[srnDocs.length - 1] || null;

  const draftUIStatus = !draftDoc ? 'not_started' : (draftDoc.review_status === 'draft' ? 'draft' : draftDoc.review_status);
  const srnUIStatus = !srnDoc ? 'not_started' : (srnDoc.review_status === 'draft' ? 'draft' : srnDoc.review_status);

  const isDraftApproved = draftUIStatus === 'approved' || draftUIStatus === 'accepted';
  const isSrnApproved = srnUIStatus === 'approved' || srnUIStatus === 'accepted';

  const inSrnPhase = isDraftApproved;
  const activeDoc = inSrnPhase ? srnDoc : draftDoc;
  const activeStatus = inSrnPhase ? srnUIStatus : draftUIStatus;

  const canUploadDraft = canAct && (!draftDoc || ['draft', 'rejected'].includes(draftDoc.review_status));
  const canUploadSrn = canAct && isDraftApproved && (!srnDoc || ['draft', 'rejected'].includes(srnDoc.review_status));

  const canSend = canAct && activeDoc && activeDoc.review_status === 'draft';
  const sendEndpoint = inSrnPhase ? 'submit-srn-for-review' : 'submit-for-review';
  const sendLabel = inSrnPhase ? 'Send SRN for Review' : 'Send Draft for Review';

  const handleUpload = async (e, docType, ref) => {
    const file = e.target.files?.[0];
    if (!file || !filingId) return;

    setUploading(true); setUploadError(null);
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('filing', filingId);
      formData.append('doc_type', docType);
      await api.post('/legal-services/mca-filing-documents/', formData, { headers: { 'Content-Type': 'multipart/form-data' } });
      
      if (docType === 'mca_approval_cert') {
        showToast('Certificate uploaded and sent to Checker');
      }
      onUpdated?.();
    } catch (err) { setUploadError(err.response?.data?.detail || err.response?.data?.error || 'Upload failed'); } 
    finally { setUploading(false); if (ref.current) ref.current.value = ''; }
  };

  const handleDeleteDoc = async (docId) => {
    if (!window.confirm('Remove this file?')) return;
    setActionLoading(`delete_${docId}`);
    try { await api.delete(`/legal-services/mca-filing-documents/${docId}/`); onUpdated?.(); } 
    catch (err) { setUploadError(err.response?.data?.detail || 'Failed to delete'); } 
    finally { setActionLoading(null); }
  };

  const handleSendForReview = async () => {
    if (!filingId || !canSend) return;
    setActionLoading('send'); setUploadError(null);
    try { await api.post(`/legal-services/mca-filings/${filingId}/${sendEndpoint}/`); onUpdated?.(); } 
    catch (err) { setUploadError(err.response?.data?.error || err.response?.data?.detail || 'Failed to send for review'); } 
    finally { setActionLoading(null); }
  };

  const openFile = (doc) => {
    const url = doc?.file_url || doc?.file;
    if (url) window.open(url, '_blank', 'noopener,noreferrer');
  };

  const downloadFile = async (doc) => {
    const url = doc?.file_url || doc?.file;
    if (!url) return;
    try {
      const res = await fetch(url);
      const blob = await res.blob();
      const objectUrl = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = objectUrl;
      a.download = doc.file_name || 'document.pdf';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(objectUrl);
    } catch (err) {
      // fallback: open in new tab if fetch blocked
      window.open(url, '_blank', 'noopener,noreferrer');
    }
  };



  if (!filing) {
    return (
      <div style={{ padding: '60px 20px', textAlign: 'center', background: '#fff', borderRadius: 14, border: '1px solid #eef0f5' }}>
        <div style={{ fontSize: 40, marginBottom: 12, opacity: 0.7 }}>📋</div>
        <p style={{ color: '#0F172A', fontSize: 16, fontWeight: 800, marginBottom: 6 }}>No Filing Started Yet</p>
        <p style={{ color: '#64748B', fontSize: 13, marginBottom: 20 }}>Start the filing process to upload draft and SRN documents.</p>
        {canAct && (
          <button
            type="button"
            onClick={async () => {
              try {
                await api.post('/legal-services/mca-filings/', { mca_case: caseData?.id, event_date: new Date().toISOString().split('T')[0], notes: 'MCA Filing' });
                onUpdated?.();
              } catch { setUploadError('Failed to create filing'); }
            }}
            style={{ padding: '12px 28px', borderRadius: 8, border: 'none', cursor: 'pointer', background: 'linear-gradient(135deg, #1E3A8A 0%, #1E40AF 100%)', color: '#fff', fontSize: 13, fontWeight: 700, boxShadow: '0 4px 14px rgba(30,58,138,0.25)' }}
          >
             Start Filing Process
          </button>
        )}
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {toast && <Toast message={toast.msg} type={toast.type} onClose={() => setToast(null)} />}

      {uploadError && (
        <div style={{ padding: '12px 16px', background: '#FEF2F2', color: '#B42318', border: '1px solid #FECACA', borderRadius: 10, fontSize: 13, fontWeight: 600, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}><span style={{ fontSize: 16 }}>⚠️</span> {uploadError}</span>
          <button type="button" onClick={() => setUploadError(null)} style={{ background: 'none', border: 'none', color: '#B42318', cursor: 'pointer' }}>✕</button>
        </div>
      )}

      {/* ── TOP RIGHT MCA PORTAL LINKS ── */}
      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, flexWrap: 'wrap' }}>
        <button type="button" onClick={() => window.open(MCA_LINKS.login, '_blank', 'noopener,noreferrer')}
          style={{ padding: '10px 18px', borderRadius: 8, cursor: 'pointer', background: '#1E3A8A', color: '#fff', border: 'none', fontSize: 12.5, fontWeight: 700, fontFamily: 'inherit', display: 'flex', alignItems: 'center', gap: 6 }}>
          <span>🌐</span> Login to MCA Portal <span style={{ fontSize: 10, opacity: 0.85 }}>↗</span>
        </button>
      </div>

      {/* ══════════ MAIN WORKSPACE CARD ══════════ */}
      <div style={{ background: '#ffffff', border: '1px solid #E2E8F0', borderRadius: 16, overflow: 'hidden', boxShadow: '0 10px 25px -5px rgba(15,23,42,0.05)' }}>
        
        {/* CARD HEADER */}
        <div style={{ padding: '20px 24px', background: 'linear-gradient(90deg, #F8FAFC 0%, #FFFFFF 100%)', borderBottom: '1px solid #E2E8F0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <div style={{ width: 42, height: 42, borderRadius: 10, background: '#EFF6FF', color: '#2563EB', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, border: '1px solid #BFDBFE' }}>📋</div>
            <div>
              <div style={{ fontSize: 16, fontWeight: 800, color: '#0F172A' }}>Filing Submission Workspace</div>
              <div style={{ fontSize: 12, color: '#64748B', marginTop: 2, fontWeight: 500 }}>Upload draft, submit SRN, and close the case.</div>
            </div>
          </div>
        </div>

        {/* SIDE BY SIDE GRID */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: 0 }}>

          {/* LEFT: DRAFT COPY */}
          <div style={{ padding: '24px', borderRight: '1px solid #E2E8F0', borderBottom: '1px solid #E2E8F0', background: '#ffffff' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
              <div style={{ fontSize: 15, fontWeight: 800, color: '#0F172A' }}>Draft Copy</div>
              <input ref={draftFileRef} type="file" hidden accept=".pdf" onChange={(e) => handleUpload(e, 'pending_draft', draftFileRef)} />
            </div>

            {draftDoc?.review_status === 'rejected' && draftDoc?.review_note && (
              <div style={{ padding: '12px 14px', background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: 8, fontSize: 12, color: '#991B1B', marginBottom: 16, lineHeight: 1.4 }}>
                <strong style={{ display: 'block', marginBottom: 4 }}>❌ Rejection Note:</strong>{draftDoc.review_note}
              </div>
            )}

            {!draftDoc ? (
              <div onClick={() => canUploadDraft && draftFileRef.current?.click()} style={{ padding: '36px 20px', textAlign: 'center', background: canUploadDraft ? '#F8FAFC' : '#F1F5F9', border: '1.5px dashed #CBD5E1', borderRadius: 12, cursor: canUploadDraft ? 'pointer' : 'not-allowed', opacity: canUploadDraft ? 1 : 0.6 }}>
                <div style={{ fontSize: 32, marginBottom: 8, opacity: 0.5 }}>📄</div>
                <div style={{ fontSize: 13, fontWeight: 600, color: '#334155' }}>{canUploadDraft ? 'Click to upload draft PDF' : 'Upload disabled'}</div>
              </div>
            ) : (
              <FileRow doc={draftDoc} icon="📄" onOpen={() => openFile(draftDoc)} onDownload={() => downloadFile(draftDoc)} canDelete={canAct && ['draft', 'rejected'].includes(draftDoc.review_status)} onDelete={() => handleDeleteDoc(draftDoc.id)} deleting={actionLoading === `delete_${draftDoc?.id}`} />
            )}
          </div>

          {/* RIGHT: SRN RECEIPT */}
          <div style={{ padding: '24px', background: isDraftApproved ? '#ffffff' : '#FAFAFA', borderBottom: '1px solid #E2E8F0', opacity: isDraftApproved ? 1 : 0.6, pointerEvents: isDraftApproved ? 'auto' : 'none' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
              <div style={{ fontSize: 15, fontWeight: 800, color: '#0F172A' }}>SRN Receipt</div>
              <input ref={srnFileRef} type="file" hidden accept=".pdf,.png,.jpg,.jpeg" onChange={(e) => handleUpload(e, 'srn_receipt', srnFileRef)} />
            </div>

            {srnDoc?.review_status === 'rejected' && srnDoc?.review_note && (
              <div style={{ padding: '12px 14px', background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: 8, fontSize: 12, color: '#991B1B', marginBottom: 16, lineHeight: 1.4 }}>
                <strong style={{ display: 'block', marginBottom: 4 }}>❌ Rejection Note:</strong>{srnDoc.review_note}
              </div>
            )}

            {!srnDoc ? (
              <div onClick={() => canUploadSrn && srnFileRef.current?.click()} style={{ padding: '36px 20px', textAlign: 'center', background: canUploadSrn ? '#F8FAFC' : '#F1F5F9', border: '1.5px dashed #CBD5E1', borderRadius: 12, cursor: canUploadSrn ? 'pointer' : 'not-allowed', opacity: canUploadSrn ? 1 : 0.6 }}>
                <div style={{ fontSize: 32, marginBottom: 8, opacity: 0.5 }}>🧾</div>
                <div style={{ fontSize: 13, fontWeight: 600, color: '#334155' }}>{canUploadSrn ? 'Click to upload SRN / Challan' : 'SRN upload locked'}</div>
              </div>
            ) : (
              <FileRow doc={srnDoc} icon="🧾" onOpen={() => openFile(srnDoc)} onDownload={() => downloadFile(srnDoc)} canDelete={canAct && isDraftApproved && ['draft', 'rejected'].includes(srnDoc.review_status)} onDelete={() => handleDeleteDoc(srnDoc.id)} deleting={actionLoading === `delete_${srnDoc?.id}`} />
            )}
          </div>
        </div>

        {/* ── STAGE 3: EVENT-BASED FINAL APPROVAL (Only shows if Case is OPEN) ── */}
        {isSrnApproved && caseData?.status === 'open' && (
          <div style={{ padding: '24px', background: '#FAFAFA', borderBottom: '1px solid #E2E8F0' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <div style={{ fontSize: 15, fontWeight: 800, color: '#0F172A' }}>Final MCA Approval</div>
                <div style={{ fontSize: 12, color: '#64748B', marginTop: 4 }}>
                  Upload the MCA approval certificate to close this case. It will be sent directly to the Checker.
                </div>
              </div>

              {!certDoc && canAct && (
                <label style={{
                  padding: '10px 18px', borderRadius: 8, border: '1.5px solid #1E3A8A', cursor: 'pointer',
                  background: '#fff', color: '#1E3A8A', fontSize: 12.5, fontWeight: 700,
                  opacity: uploading ? 0.6 : 1, transition: 'all 0.15s ease'
                }}>
                  <input ref={certFileRef} type="file" hidden accept=".pdf,.png,.jpg" onChange={(e) => handleUpload(e, 'mca_approval_cert', certFileRef)} />
                  {uploading ? '⏳ Uploading...' : '⬆ Upload Certificate'}
                </label>
              )}
            </div>

            {certDoc?.review_status === 'rejected' && certDoc?.review_note && (
              <div style={{ padding: '12px 14px', background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: 8, fontSize: 12, color: '#991B1B', marginTop: 16 }}>
                <strong style={{ display: 'block', marginBottom: 4 }}>❌ Rejection Note:</strong>{certDoc.review_note}
              </div>
            )}

            {certDoc && (
              <FileRow 
                doc={certDoc} icon="📜" onOpen={() => openFile(certDoc)} 
                canDelete={canAct && certDoc.review_status === 'rejected'} 
                onDelete={() => handleDeleteDoc(certDoc.id)} deleting={actionLoading === `delete_${certDoc?.id}`} 
              />
            )}
            
            {certDoc?.review_status === 'pending' && (
              <div style={{ marginTop: 12, fontSize: 12, color: '#D97706', fontWeight: 600 }}>
                ⏳ Certificate sent to checker. Waiting for approval to close case...
              </div>
            )}
          </div>
        )}

        {/* ── CARD FOOTER: SEND FOR REVIEW ── */}
        <div style={{ padding: '16px 24px', background: '#F8FAFC', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 16 }}>
          <div>
            {caseData?.status === 'closed' ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#059669', fontSize: 13, fontWeight: 700 }}>
                <span style={{ fontSize: 18 }}>🔒</span> Case Closed & Approved.
              </div>
            ) : isSrnApproved ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#0284C7', fontSize: 13, fontWeight: 700 }}>
                <span style={{ fontSize: 18 }}>🏢</span> SRN Verified. Awaiting MCA Outcome.
              </div>
            ) : activeStatus === 'pending' ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#D97706', fontSize: 13, fontWeight: 700 }}>
                <span style={{ fontSize: 18 }}>⏳</span> Waiting for checker review...
              </div>
            ) : (
              <div style={{ color: '#64748B', fontSize: 12, fontWeight: 500 }}>
                {canSend ? `Ready to send ${inSrnPhase ? 'SRN' : 'draft'} to checker.` : 'Upload a document to proceed.'}
              </div>
            )}
          </div>

          <div style={{ display: 'flex', gap: 10 }}>
            {/* Normal Send for Review Button (Only shows if not fully closed AND we aren't waiting on Certificate) */}
            {caseData?.status !== 'closed' && !isSrnApproved && (
              <button
                type="button"
                onClick={handleSendForReview}
                disabled={!canSend || actionLoading === 'send'}
                style={{
                  padding: '12px 28px', borderRadius: 8, border: 'none',
                  fontSize: 13, fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: 8,
                  cursor: canSend && actionLoading !== 'send' ? 'pointer' : 'not-allowed',
                  background: canSend ? '#2563EB' : '#CBD5E1', color: canSend ? '#ffffff' : '#F1F5F9',
                  boxShadow: canSend ? '0 4px 14px rgba(37,99,235,0.3)' : 'none', transition: 'all 0.2s',
                }}
              >
                {actionLoading === 'send' ? '⏳ Sending…' : `🚀 ${sendLabel}`}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}