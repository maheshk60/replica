
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { Select, Modal, Upload, Button, message, Tooltip, Spin } from 'antd';
import {
  UploadOutlined,
  FileTextOutlined,
  DownloadOutlined,
  DeleteOutlined,
} from '@ant-design/icons';
import jsPDF from 'jspdf';
import { api } from '../../services/api';
import { useAuth } from '../../contexts/AuthContext';


const { Option } = Select;

// ══════════════════════════════════════════════════════════════════
// CONSTANTS
// ══════════════════════════════════════════════════════════════════

const OFFICER_OPTIONS = [
  'Assessing Officer',
  'Commissioner of Income Tax (Appeal)',
  'Principal Commissioner of Income Tax',
  'Deputy Commissioner of Income Tax',
  'Additional Commissioner of Income Tax',
  'Joint Commissioner of Income Tax',
  'CIT (Exemptions)',
  'High Court',
  'Supreme Court',
].sort();

const C = {
  navy: '#1E3A6B', navyLight: '#2A4F8F', navyDark: '#0F1E3D',
  ink: '#0F172A', slate: '#475569', muted: '#94A3B8',
  border: '#E2E8F0', borderLight: '#F1F5F9',
  bg: '#F8FAFC', bgSoft: '#FBFCFE',
  green: '#0F7A5A', greenBg: '#ECFDF5', greenBorder: '#A7F3D0',
  amber: '#B45309', amberBg: '#FFFBEB', amberBorder: '#FCD34D',
  red: '#B91C1C', redBg: '#FEF2F2', redBorder: '#FECACA',
  blue: '#2563EB', blueBg: '#EFF6FF', blueBorder: '#BFDBFE',
  purple: '#6D28D9', purpleBg: '#F1E8FE', purpleBorder: '#DDD6FE',
};

const STATUS_META = {
  wip:          { label: 'WIP',          color: '#B45309', bg: '#FEF3C7', border: '#FCD34D' },
  under_review: { label: 'UNDER REVIEW', color: '#6D28D9', bg: '#F1E8FE', border: '#DDD6FE' },
  open:         { label: 'Open',         color: '#0369A1', bg: '#DBEAFE', border: '#7DD3FC' },
};

const REVIEW_META = {
  draft:     { label: 'Draft',         color: C.slate, bg: C.bg,      border: C.border },
  pending:   { label: 'Under Review',  color: C.amber, bg: C.amberBg, border: C.amberBorder },
  approved:  { label: 'Approved',      color: C.green, bg: C.greenBg, border: C.greenBorder },
  rejected:  { label: 'Rejected',      color: C.red,   bg: C.redBg,   border: C.redBorder },
  escalated: { label: 'Escalated',     color: C.purple,bg: C.purpleBg,border: C.purpleBorder },
};

const CLOSURE_DOC_META = {
  order:             { label: 'Order Copy',             icon: '📜', description: 'Final order document' },
  demand_notice:     { label: 'Demand Notice',     icon: '💰', description: 'Demand notice from department' },
  computation_sheet: { label: 'Computation Sheet', icon: '📊', description: 'Tax computation working' },
};

const CLOSURE_STATUS_META = {
  not_started: { label: 'Not Started', color: C.slate,  bg: C.bg,       border: C.border,       icon: '○' },
  draft:       { label: 'Draft',       color: C.slate,  bg: C.bg,       border: C.border,       icon: '📝' },
  pending:     { label: 'Under Review',color: C.amber,  bg: C.amberBg,  border: C.amberBorder,  icon: '⏳' },
  escalated:   { label: 'Escalated',   color: C.purple, bg: C.purpleBg, border: C.purpleBorder, icon: '↑' },
  rejected:    { label: 'Rejected',    color: C.red,    bg: C.redBg,    border: C.redBorder,    icon: '✕' },
  approved:    { label: 'Approved',    color: C.green,  bg: C.greenBg,  border: C.greenBorder,  icon: '✓' },
};

// ══════════════════════════════════════════════════════════════════
// UTILITIES
// ══════════════════════════════════════════════════════════════════

function fmtDate(d) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}

function fmtDateTime(d) {
  if (!d) return '—';
  return new Date(d).toLocaleString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
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

// ══════════════════════════════════════════════════════════════════
// NOTICE DETAIL MODAL
// ══════════════════════════════════════════════════════════════════

export function NoticeDetailModal({ noticeId, canEdit, onClose, onUpdated, onReply }) {
  const { user } = useAuth();
  const [notice, setNotice] = useState(null);
  const [htmlReplies, setHtmlReplies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  const [uploadingCourtNotice, setUploadingCourtNotice] = useState(false);
  const [uploadingAck, setUploadingAck] = useState(false);
  const [deletingId, setDeletingId] = useState(null);
  const [submittingDocs, setSubmittingDocs] = useState(false);
  
  const [showUploadReplyModal, setShowUploadReplyModal] = useState(false);

  const fetchNotice = useCallback(async () => {
    setLoading(true);
    try {
      const [noticeRes, repliesRes] = await Promise.all([
        api.get(`/legal-services/notices/${noticeId}/`),
        api.get('/legal-services/notice-replies/', { params: { notice: noticeId } }),
      ]);
      setNotice(noticeRes.data);
      const replyList = Array.isArray(repliesRes.data) ? repliesRes.data : (repliesRes.data.results || []);
      setHtmlReplies(replyList.filter(r => canEdit ? true : r.status !== 'draft')); 
    } catch {
      setError('Failed to load notice.');
    } finally {
      setLoading(false);
    }
  }, [noticeId,canEdit]);

  useEffect(() => { fetchNotice(); }, [fetchNotice]);

  const statusMeta = STATUS_META[notice?.status] || STATUS_META.wip;
  const isMakerUploader = canEdit;

  // ── Unified Replies with Versions (v1, v2...) ──
  const allRepliesAndDocs = useMemo(() => {
    if (!notice) return [];
    
    // ✅ FIX: Filter out ALL 'draft' documents if the user is a Checker
    const visibleDocs = (notice.documents || []).filter(d => 
      canEdit ? true : d.review_status !== 'draft'
    );
    
    // HTML Replies (Main)
    const htmls = htmlReplies.map(r => ({ 
      ...r, _isHtml: true, _type: 'main', _sortTime: new Date(r.reviewed_at || r.created_at).getTime() 
    }));
    
    // Uploaded Replies (Main) - USING visibleDocs NOW
    const mainDocs = visibleDocs.filter(d => ['pending', 'reply'].includes(d.doc_type)).map(r => ({
      ...r, _isDoc: true, _type: 'main', _sortTime: new Date(r.reviewed_at || r.uploaded_at).getTime()
    }));

    // Supporting Docs (Child of Main Uploads) - USING visibleDocs NOW
    const supportDocs = visibleDocs.filter(d => ['pending_support', 'supporting_doc'].includes(d.doc_type));

    // Combine and sort MAIN replies to assign versions
    const mainMerged = [...htmls, ...mainDocs].sort((a, b) => a._sortTime - b._sortTime);
    
    // Assign versions
    mainMerged.forEach((r, idx) => {
      r._version = idx + 1;
      r._versionLabel = `v${idx + 1}`;
    });

    // Map supporting docs to their parent version
    const finalList = [];
    mainMerged.forEach(main => {
      finalList.push(main);
      
      if (main._isDoc) {
        // ✅ CRITICAL BUG FIX (Ensure this is main.id, not main.reply_version)
        const linkedSupports = supportDocs.filter(sd => String(sd.reply_version) === String(main.id));
        linkedSupports.forEach(sd => {
          finalList.push({
            ...sd, _isSupport: true, _versionLabel: main._versionLabel, _sortTime: main._sortTime
          });
        });
      }
    });
    
    return finalList.reverse();
  }, [htmlReplies, notice, canEdit]); // ✅ Added canEdit to dependencies

  const allApprovedReplies = allRepliesAndDocs.filter(
    r => r.status === 'approved' || r.review_status === 'approved'
  );

  const hasApprovedReply = allRepliesAndDocs.some(r => r.status === 'approved' || r.review_status === 'approved');
  const hasDrafts = (notice?.documents || []).some(d => d.review_status === 'draft');
  
  const courtNoticeDoc = notice?.court_notice_docs?.[0] || null;
  const acknowledgmentDoc = notice?.documents?.find(d => d.doc_type === 'acknowledgment') || null;

  const canDeleteCourtNotice = isMakerUploader;
  const canDeleteAcknowledgment = isMakerUploader && acknowledgmentDoc?.review_status !== 'approved' && acknowledgmentDoc?.review_status !== 'pending'; 

  const hasCourtNotice = !!courtNoticeDoc;
  const repliesLocked = !hasCourtNotice;
  const ackLocked = !hasCourtNotice || !hasApprovedReply;

  const allAckDocs = (notice?.documents || []).filter(d => d.doc_type === 'acknowledgment'&& (canEdit ? true : d.review_status !== 'draft'));
  const hasPendingAck = allAckDocs.some(d => d.review_status === 'pending' || d.review_status === 'escalated');
  const hasRejectedAck = allAckDocs.some(d => d.review_status === 'rejected');
  const canUploadAck = isMakerUploader && hasApprovedReply && !acknowledgmentDoc && !hasPendingAck;

  // ══ UPLOAD HANDLERS ══
  const handleDocUpload = async (file, docType, extraData = {}) => {
    if (docType === 'court_notice') setUploadingCourtNotice(true);
    if (docType === 'acknowledgment') setUploadingAck(true);
    setError('');

    try {
      const formData = new FormData();
      formData.append('notice', noticeId);
      formData.append('file', file);
      formData.append('doc_type', docType);
      
      Object.keys(extraData).forEach(key => formData.append(key, extraData[key]));

      await api.post('/legal-services/notice-documents/', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      message.success('File uploaded successfully');
      await fetchNotice();
      onUpdated && onUpdated();
    } catch (e) {
      message.error(e?.response?.data?.error || 'Failed to upload');
    } finally {
      if (docType === 'court_notice') setUploadingCourtNotice(false);
      if (docType === 'acknowledgment') setUploadingAck(false);
    }
    return false;
  };

  const handleDeleteDoc = (docId, apiPath = '/legal-services/notice-documents/') => {
    Modal.confirm({
      title: 'Delete this file?',
      content: 'This action cannot be undone.',
      okText: 'Delete', okType: 'danger', cancelText: 'Cancel', centered: true,
      onOk: async () => {
        setDeletingId(docId);
        try {
          await api.delete(`${apiPath}${docId}/`);
          message.success('File deleted');
          await fetchNotice();
          onUpdated && onUpdated();
        } catch (e) {
          message.error(e?.response?.data?.error || 'Failed to delete');
        } finally {
          setDeletingId(null);
        }
      },
    });
  };

  const handleOpenDoc = (doc) => window.open(doc.file_url, '_blank', 'noopener,noreferrer');

  const handleDownloadDoc = async (doc) => {
    try {
      const response = await fetch(doc.file_url);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url; link.download = doc.file_name || 'download';
      document.body.appendChild(link); link.click(); document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch { message.error('Download failed'); }
  };

  const handleOpenHtmlReply = (reply) => {
    const html = `<!DOCTYPE html><html><head><title>${reply.title || 'Reply'}</title><style>body { font-family: 'Times New Roman', serif; padding: 40px; max-width: 800px; margin: 0 auto; line-height: 1.6; color: #1a1a2e; } table { border-collapse: collapse; width: 100%; margin: 10px 0; } td, th { border: 1px solid #999; padding: 6px 10px; }</style></head><body>${reply.content_html || ''}</body></html>`;
    const blob = new Blob([html], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    window.open(url, '_blank');
  };

    const handleDownloadHtmlReplyPdf = async (reply) => {
      try {
        message.loading({ content: 'Generating PDF...', key: 'pdf-gen', duration: 0 });

        const container = document.createElement('div');
        container.style.width = '170mm';
        container.style.padding = '15mm';
        container.style.fontFamily = "'Times New Roman', Times, serif";
        container.style.fontSize = '11pt';
        container.style.lineHeight = '1.5';
        container.style.color = '#000000';
        container.style.background = '#ffffff';
        container.style.position = 'fixed';
        container.style.top = '-99999px';
        container.style.left = '-99999px';
        container.innerHTML = reply.content_html || '';

        const tables = container.querySelectorAll('table');
        tables.forEach(t => {
          t.style.borderCollapse = 'collapse';
          t.style.width = '100%';
          t.querySelectorAll('td, th').forEach(cell => {
            cell.style.border = '1px solid #333';
            cell.style.padding = '4px 8px';
          });
        });

        document.body.appendChild(container);

        const pdf = new jsPDF({
          orientation: 'portrait',
          unit: 'mm',
          format: 'a4',
        });

        await pdf.html(container, {
          callback: (doc) => {
            const filename = `${(reply.title || 'reply').replace(/[^a-z0-9]/gi, '_')}.pdf`;
            doc.save(filename);
            document.body.removeChild(container);
            message.success({ content: 'PDF downloaded', key: 'pdf-gen' });
          },
          margin: [15, 15, 15, 15],
          autoPaging: 'text',
          width: 180,
          windowWidth: 700,
          html2canvas: {
            scale: 0.26,
            useCORS: true,
          },
        });
      } catch (err) {
        console.error(err);
        message.error({ content: 'PDF generation failed', key: 'pdf-gen' });
      }
    };

  const handleSubmitDocs = async () => {
    setSubmittingDocs(true);
    try {
      await api.post(`/legal-services/notices/${noticeId}/submit-docs/`);
      message.success('Documents submitted for checker review');
      await fetchNotice();
      onUpdated && onUpdated();
    } catch (e) {
      message.error(e?.response?.data?.error || 'Failed to submit documents');
    } finally {
      setSubmittingDocs(false);
    }
  };

  return (
    <>
      <Modal open={true} onCancel={onClose} footer={null} width={900} centered destroyOnClose closable={false}
        styles={{ body: { padding: 0 }, content: { padding: 0, overflow: 'hidden', borderRadius: 12 } }}>
        <div style={{ fontFamily: "'Inter', -apple-system, sans-serif", background: '#fff' }}>
          
          {/* HEADER */}
          <div style={{ padding: '14px 20px', background: '#fff', borderBottom: `1px solid ${C.borderLight}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, flex: 1 }}>
              <div style={{ width: 36, height: 36, borderRadius: 8, background: C.blueBg, border: `1px solid ${C.blueBorder}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16 }}>📋</div>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <h3 style={{ margin: 0, fontSize: 15, fontWeight: 700, color: C.ink }}>Notice — DIN: {notice?.din_number || '—'}</h3>
                  {notice && (
                    <span style={{ fontSize: 9.5, fontWeight: 800, padding: '2px 9px', borderRadius: 5, background: statusMeta.bg, color: statusMeta.color, border: `1px solid ${statusMeta.border}` }}>
                      {statusMeta.label}
                    </span>
                  )}
                </div>
                {notice?.created_by_name && <div style={{ fontSize: 10.5, color: C.muted, marginTop: 2 }}>Created by <b>{notice.created_by_name}</b> · {fmtDateTime(notice.created_at)}</div>}
              </div>
            </div>
            <button onClick={onClose} style={{ width: 28, height: 28, border: `1px solid ${C.border}`, borderRadius: 6, background: '#fff', color: C.slate, cursor: 'pointer' }}>✕</button>
          </div>

          {/* BODY */}
          <div style={{ maxHeight: 'calc(90vh - 130px)', overflowY: 'auto', padding: '16px 20px', background: '#fff' }}>
            {loading ? (
              <div style={{ padding: 60, textAlign: 'center' }}><Spin size="large" /><div style={{ marginTop: 12, color: C.muted, fontSize: 13 }}>Loading notice...</div></div>
            ) : notice && (
              <>
                {/* NOTICE INFO */}
                <SectionLabel>Notice Information</SectionLabel>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '14px 20px', marginBottom: 20 }}>
                  <PlainField label="DIN Number" value={notice.din_number} mono />
                  <PlainField label="Section" value={notice.section} mono />
                  <PlainField label="Officer" value={notice.officer} />
                  
                  {/* Court Notice inline */}
                  <div>
                    <div style={{ fontSize: 9.5, fontWeight: 700, color: C.muted, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 3 }}>
                       Notice <span style={{ color: C.red }}>*</span>
                    </div>
                    {courtNoticeDoc ? (
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 2 }}>
                        <span onClick={() => handleOpenDoc(courtNoticeDoc)} style={{ fontSize: 12.5, fontWeight: 700, color: C.blue, cursor: 'pointer', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 140 }} title={courtNoticeDoc.file_name}>
                          {courtNoticeDoc.file_name}
                        </span>
                        {canDeleteCourtNotice && (
                          <button onClick={() => handleDeleteDoc(courtNoticeDoc.id)} style={{ background: 'none', border: 'none', color: C.red, cursor: 'pointer', fontSize: 14, padding: 0 }} title="Delete">✕</button>
                        )}
                      </div>
                    ) : (
                      isMakerUploader ? (
                        <Upload accept=".pdf,.doc,.docx,.jpg,.jpeg,.png" showUploadList={false} beforeUpload={(f) => handleDocUpload(f, 'court_notice')} disabled={uploadingCourtNotice}>
                          <Button size="small" loading={uploadingCourtNotice} style={{ fontSize: 11, fontWeight: 600 }}>⬆ Upload Notice</Button>
                        </Upload>
                      ) : <div style={{ fontSize: 12.5, color: '#CBD5E1', fontStyle: 'italic' }}>Not uploaded</div>
                    )}
                  </div>

                  <PlainField label="Notice Date" value={fmtDate(notice.notice_date)} />
                  <PlainField label="Due Date" value={fmtDate(notice.due_date)} highlight />
                  <PlainField label="Extended Due Date" value={fmtDate(notice.extended_due_date)} highlight={!!notice.extended_due_date} />
                  <PlainField label="PH Date" value={fmtDate(notice.ph_date)} highlight={!!notice.ph_date} />
                </div>

                {/* 2 COLUMN GRID FOR DOCUMENTS */}
                <SectionLabel>Documents & Workflow</SectionLabel>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 14, marginBottom: 18 }}>
                  
                  {/* 1. Replies & Support Docs (Merged Column) */}
                  <UnifiedRepliesCard
                    items={allRepliesAndDocs}
                    isAssignedMaker={isMakerUploader}
                    locked={repliesLocked}
                    deletingId={deletingId}
                    onReply={onReply}
                    onUploadReplyClick={() => setShowUploadReplyModal(true)} 
                    onOpenHtml={handleOpenHtmlReply}
                    onDownloadHtml={handleDownloadHtmlReplyPdf}
                    onOpenDoc={handleOpenDoc}
                    onDownloadDoc={handleDownloadDoc}
                    onDeleteDoc={(id) => handleDeleteDoc(id)} 
                    onDeleteHtml={(id) => handleDeleteDoc(id, '/legal-services/notice-replies/')}
                  />

                  {/* 2. Acknowledgment (Right Column) */}
                  <div style={{ display: 'flex', flexDirection: 'column' }}>
                    <div style={{ background: '#fff', border: `1px solid ${C.borderLight}`, borderRadius: 8, display: 'flex', flexDirection: 'column', opacity: !courtNoticeDoc || !hasApprovedReply ? 0.6 : 1, height: '100%' }}>
                      <div style={{ padding: '9px 12px', background: C.purpleBg, borderBottom: `1px solid ${C.borderLight}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, minHeight: 42 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <span style={{ fontSize: 14 }}>📥</span>
                          <div>
                            <div style={{ fontSize: 11.5, fontWeight: 800, color: C.purple, letterSpacing: '0.02em' }}>Acknowledgment</div>
                            <div style={{ fontSize: 9.5, color: C.muted, marginTop: 1 }}>{hasApprovedReply ? "Filing receipt" : "Available after approval"}</div>
                          </div>
                        </div>
                        {canUploadAck && (
                          <Upload accept=".pdf,.doc,.docx,.jpg,.png" showUploadList={false} beforeUpload={(f) => handleDocUpload(f, 'acknowledgment')} disabled={uploadingAck}>
                            <Button size="small" icon={<UploadOutlined />} loading={uploadingAck} style={{ fontSize: 10.5, fontWeight: 600, color: C.purple, borderColor: C.purple }}>Upload</Button>
                          </Upload>
                        )}
                      </div>
                      <div style={{ padding: 8, flex: 1 }}>
                        {acknowledgmentDoc ? (
                          <UnifiedRow 
                            item={{...acknowledgmentDoc, _type: 'main', _isDoc: true, title: acknowledgmentDoc.file_name, status: acknowledgmentDoc.review_status}} 
                            onOpen={() => handleOpenDoc(acknowledgmentDoc)} onDownload={() => handleDownloadDoc(acknowledgmentDoc)} 
                            onDelete={() => handleDeleteDoc(acknowledgmentDoc.id)} canDelete={canDeleteAcknowledgment} deleting={deletingId === acknowledgmentDoc.id} 
                          />
                        ) : (
                          <div style={{ padding: '14px 8px', textAlign: 'center', fontSize: 11, color: C.muted, fontStyle: 'italic' }}>
                            {!courtNoticeDoc || !hasApprovedReply ? 'Available after a reply is approved' : 'No acknowledgment uploaded'}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                </div>

                {/* NOTES */}
                <SectionLabel>Notes</SectionLabel>
                {notice.notes ? (
                  <div style={{ padding: '10px 12px', background: C.bgSoft, border: `1px solid ${C.borderLight}`, borderLeft: `3px solid ${C.navy}`, borderRadius: 6, fontSize: 12.5, color: C.ink, whiteSpace: 'pre-wrap' }}>
                    {notice.notes}
                  </div>
                ) : <div style={{ fontSize: 12, color: C.muted, fontStyle: 'italic' }}>No notes added.</div>}
              </>
            )}
          </div>
          
          {/* FOOTER */}
          <div style={{ padding: '12px 20px', borderTop: `1px solid ${C.borderLight}`, display: 'flex', justifyContent: 'flex-end', gap: 10, background: '#f8fafc' }}>
            <Button onClick={onClose} size="middle" style={{ fontWeight: 600 }}>Close</Button>
            {isMakerUploader && (
              <Button 
                type="primary" 
                onClick={handleSubmitDocs} 
                loading={submittingDocs}
                disabled={!hasDrafts}
                size="middle" 
                style={{ background: hasDrafts ? C.green : '#d1d5db', borderColor: hasDrafts ? C.green : '#d1d5db', fontWeight: 700 }}
              >
                Submit for Review
              </Button>
            )}
          </div>
        </div>
      </Modal>

      {/* ═══════════ UPLOAD REPLY BUNDLE MODAL ═══════════ */}
      {showUploadReplyModal && (
        <UploadReplyBundleModal
          noticeId={noticeId}
          nextVersion={allApprovedReplies.length > 0 ? Math.max(...allApprovedReplies.map(r => r._version || 1)) + 1 : 1}
          onClose={() => setShowUploadReplyModal(false)}
          onSuccess={() => {
            setShowUploadReplyModal(false);
            fetchNotice();
            onUpdated && onUpdated();
          }}
        />
      )}
    </>
  );
}




// ══════════════════════════════════════════════════════════════════
// CLOSE CASE MODAL
// ══════════════════════════════════════════════════════════════════

export function CloseCaseModal({ courtCaseId, canEdit, onClose, onUpdated }) {
  const { user } = useAuth();
  const [caseData, setCaseData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [uploadingType, setUploadingType] = useState(null);
  const [deletingId, setDeletingId] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  const fetchCase = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get(`/legal-services/court-cases/${courtCaseId}/`);
      setCaseData(res.data);
    } catch (e) {
      setError('Failed to load case data.');
    } finally {
      setLoading(false);
    }
  }, [courtCaseId]);

  useEffect(() => { fetchCase(); }, [fetchCase]);

  if (loading) {
    return (
      <Modal open={true} onCancel={onClose} footer={null} width={720} centered destroyOnClose closable={false}
        styles={{ body: { padding: 0 }, content: { padding: 0, overflow: 'hidden', borderRadius: 12 } }}>
        <div style={{ padding: 60, textAlign: 'center', background: '#fff' }}>
          <Spin size="large" />
          <div style={{ marginTop: 12, color: C.muted, fontSize: 13 }}>Loading closure data...</div>
        </div>
      </Modal>
    );
  }

  if (!caseData) {
    return (
      <Modal open={true} onCancel={onClose} footer={null} width={720} centered destroyOnClose closable={false}>
        <div style={{ padding: 40, textAlign: 'center', color: C.red }}>{error || 'Failed to load'}</div>
      </Modal>
    );
  }

  const closureStatus = caseData.closure_review_status || 'not_started';
  const statusMeta = CLOSURE_STATUS_META[closureStatus];
  const isCaseClosed = caseData.status === 'closed';
  const docs = caseData.closure_documents || [];
  const docsMap = {
    order:             docs.find(d => d.doc_type === 'order'),
    demand_notice:     docs.find(d => d.doc_type === 'demand_notice'),
    computation_sheet: docs.find(d => d.doc_type === 'computation_sheet'),
  };

  const allUploaded = !!(docsMap.order && docsMap.demand_notice && docsMap.computation_sheet);
  const canUpload = canEdit && !isCaseClosed && ['not_started', 'draft', 'rejected'].includes(closureStatus);
  const canDelete = canEdit && !isCaseClosed && ['draft', 'not_started'].includes(closureStatus);
  const canSubmit = canEdit && !isCaseClosed && closureStatus === 'draft' && allUploaded;
  const isReadOnly = ['pending', 'escalated', 'approved'].includes(closureStatus) || isCaseClosed;

  const handleUpload = async (docType, file) => {
    setUploadingType(docType);
    setError('');
    try {
      const formData = new FormData();
      formData.append('court_case', courtCaseId);
      formData.append('doc_type', docType);
      formData.append('file', file);
      await api.post('/legal-services/closure-documents/', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      message.success(`${CLOSURE_DOC_META[docType].label} uploaded`);
      await fetchCase();
    } catch (e) {
      message.error(e?.response?.data?.error || 'Failed to upload');
    } finally {
      setUploadingType(null);
    }
    return false;
  };

  const handleDelete = (doc) => {
    Modal.confirm({
      title: `Delete ${CLOSURE_DOC_META[doc.doc_type].label}?`,
      content: 'This action cannot be undone.',
      okText: 'Delete', okType: 'danger', cancelText: 'Cancel', centered: true, zIndex: 3000,
      onOk: async () => {
        setDeletingId(doc.id);
        try {
          await api.delete(`/legal-services/closure-documents/${doc.id}/`);
          message.success('Deleted');
          await fetchCase();
        } catch (e) {
          message.error(e?.response?.data?.error || 'Failed to delete');
        } finally {
          setDeletingId(null);
        }
      },
    });
  };

  const handleOpen = (doc) => {
    if (doc?.file_url) window.open(doc.file_url, '_blank', 'noopener,noreferrer');
  };

  const handleDownload = async (doc) => {
    try {
      const response = await fetch(doc.file_url);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = doc.file_name || 'download';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch {
      message.error('Download failed');
    }
  };

  const handleSubmitForReview = () => {
    Modal.confirm({
      title: 'Submit for Review?',
      content: 'All 3 documents will be sent to the checker for review. You cannot modify them until the review is complete.',
      okText: 'Submit', okType: 'primary', cancelText: 'Cancel', centered: true, zIndex: 3000,
      onOk: async () => {
        setSubmitting(true);
        try {
          await api.post(`/legal-services/court-cases/${courtCaseId}/closure-submit/`);
          message.success('Submitted for review');
          await fetchCase();
          onUpdated && onUpdated();
        } catch (e) {
          message.error(e?.response?.data?.error || 'Failed to submit');
        } finally {
          setSubmitting(false);
        }
      },
    });
  };

  return (
    <Modal open={true} onCancel={onClose} footer={null} width={720} centered destroyOnClose closable={false}
      styles={{ body: { padding: 0 }, content: { padding: 0, overflow: 'hidden', borderRadius: 12 } }}>
      <div style={{ fontFamily: "'Inter', -apple-system, sans-serif", background: '#fff' }}>

        <div style={{
          padding: '14px 20px',
          background: isCaseClosed
            ? `linear-gradient(135deg, ${C.green}, #0B5C43)`
            : `linear-gradient(135deg, ${C.navy}, ${C.navyLight})`,
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, flex: 1, minWidth: 0 }}>
            <div style={{
              width: 36, height: 36, borderRadius: 8,
              background: 'rgba(255,255,255,0.15)', border: '1px solid rgba(255,255,255,0.2)',
              display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, flexShrink: 0,
            }}>
              {isCaseClosed ? '✅' : '🔒'}
            </div>
            <div style={{ minWidth: 0, flex: 1 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                <h3 style={{ margin: 0, fontSize: 15, fontWeight: 700, color: '#fff' }}>
                  {isCaseClosed ? 'Case Closed' : 'Close Case'}
                </h3>
                <span style={{
                  fontSize: 9.5, fontWeight: 800, padding: '2px 9px', borderRadius: 5,
                  background: 'rgba(255,255,255,0.2)', color: '#fff', border: '1px solid rgba(255,255,255,0.3)',
                  textTransform: 'uppercase', letterSpacing: '0.04em',
                }}>
                  {statusMeta.icon} {statusMeta.label}
                </span>
              </div>
              <div style={{ fontSize: 10.5, color: 'rgba(255,255,255,0.8)', marginTop: 2 }}>
                {isCaseClosed
                  ? `Closed on ${fmtDateTime(caseData.closure_reviewed_at)}`
                  : canEdit
                    ? 'Upload 3 required documents to close this case'
                    : 'View closure documents (upload restricted to Maker)'}
              </div>
            </div>
          </div>
          <button onClick={() => { onUpdated && onUpdated(); onClose(); }} style={{
            width: 28, height: 28, border: '1px solid rgba(255,255,255,0.3)', borderRadius: 6,
            background: 'rgba(255,255,255,0.12)', color: '#fff', cursor: 'pointer', fontSize: 14, display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>✕</button>
        </div>

        <div style={{ maxHeight: 'calc(90vh - 200px)', overflowY: 'auto', padding: '16px 20px' }}>
          {closureStatus === 'approved' && caseData.closure_reviewed_by_name && (
            <div style={{ padding: '12px 14px', marginBottom: 14, background: C.greenBg, border: `1px solid ${C.greenBorder}`, borderRadius: 8, display: 'flex', alignItems: 'center', gap: 10 }}>
              <span style={{ fontSize: 18 }}>✅</span>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 12.5, fontWeight: 700, color: C.green }}>Case Closed Successfully</div>
                <div style={{ fontSize: 11, color: C.slate, marginTop: 2 }}>Approved by <b>{caseData.closure_reviewed_by_name}</b> on {fmtDateTime(caseData.closure_reviewed_at)}</div>
              </div>
            </div>
          )}

          {closureStatus === 'rejected' && (
            <div style={{ padding: '12px 14px', marginBottom: 14, background: C.redBg, border: `1px solid ${C.redBorder}`, borderRadius: 8 }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
                <span style={{ fontSize: 18 }}>⚠️</span>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 12.5, fontWeight: 700, color: C.red, marginBottom: 4 }}>
                    Closure Rejected {caseData.closure_reviewed_by_name && `by ${caseData.closure_reviewed_by_name}`}
                  </div>
                  {caseData.closure_review_note && (
                    <div style={{ padding: '8px 10px', background: '#fff', borderRadius: 5, border: `1px solid ${C.redBorder}`, fontSize: 12, color: C.ink, lineHeight: 1.5, marginTop: 6 }}>
                      <b>Reason:</b> {caseData.closure_review_note}
                    </div>
                  )}
                  {canEdit && <div style={{ fontSize: 11, color: C.slate, marginTop: 6 }}>Please upload all 3 documents again to resubmit.</div>}
                </div>
              </div>
            </div>
          )}

          {closureStatus === 'pending' && (
            <div style={{ padding: '12px 14px', marginBottom: 14, background: C.amberBg, border: `1px solid ${C.amberBorder}`, borderRadius: 8, display: 'flex', alignItems: 'center', gap: 10 }}>
              <span style={{ fontSize: 18 }}>⏳</span>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 12.5, fontWeight: 700, color: C.amber }}>Awaiting Checker Review</div>
                <div style={{ fontSize: 11, color: C.slate, marginTop: 2 }}>Submitted on {fmtDateTime(caseData.closure_submitted_at)}. Documents cannot be modified.</div>
              </div>
            </div>
          )}

          {closureStatus === 'escalated' && (
            <div style={{ padding: '12px 14px', marginBottom: 14, background: C.purpleBg, border: `1px solid ${C.purpleBorder}`, borderRadius: 8, display: 'flex', alignItems: 'center', gap: 10 }}>
              <span style={{ fontSize: 18 }}>↑</span>
              <div>
                <div style={{ fontSize: 12.5, fontWeight: 700, color: C.purple }}>Escalated to CEO</div>
                <div style={{ fontSize: 11, color: C.slate, marginTop: 2 }}>Waiting for CEO's final decision.</div>
              </div>
            </div>
          )}

          <SectionLabel>Required Documents (3)</SectionLabel>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {['order', 'demand_notice', 'computation_sheet'].map((docType) => (
              <ClosureDocCard
                key={docType}
                docType={docType}
                doc={docsMap[docType]}
                canUpload={canUpload && !docsMap[docType]}
                canDelete={canDelete && !!docsMap[docType]}
                uploading={uploadingType === docType}
                deleting={deletingId === docsMap[docType]?.id}
                isReadOnly={isReadOnly}
                onUpload={(file) => handleUpload(docType, file)}
                onOpen={() => handleOpen(docsMap[docType])}
                onDownload={() => handleDownload(docsMap[docType])}
                onDelete={() => handleDelete(docsMap[docType])}
              />
            ))}
          </div>

          {error && (
            <div style={{ marginTop: 12, padding: '10px 12px', background: C.redBg, border: `1px solid ${C.redBorder}`, borderRadius: 6, color: C.red, fontSize: 12, fontWeight: 600 }}>
              ⚠ {error}
            </div>
          )}
        </div>

        <div style={{ padding: '12px 20px', borderTop: `1px solid ${C.borderLight}`, background: '#fff', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10 }}>
          <div style={{ fontSize: 11, color: C.muted }}>
            {allUploaded && !isCaseClosed
              ? <span style={{ color: C.green, fontWeight: 700 }}>✓ All 3 documents uploaded</span>
              : `${Object.values(docsMap).filter(Boolean).length}/3 documents uploaded`}
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <Button onClick={() => { onUpdated && onUpdated(); onClose(); }} size="middle">Close</Button>
            {canSubmit && (
              <Button type="primary" loading={submitting} onClick={handleSubmitForReview} size="middle" style={{ background: `linear-gradient(135deg, ${C.navy}, ${C.blue})`, border: 'none', fontWeight: 700, boxShadow: '0 2px 8px rgba(37,99,235,0.3)' }}>
                📤 Submit for Review
              </Button>
            )}
          </div>
        </div>
      </div>
    </Modal>
  );
}

// ══════════════════════════════════════════════════════════════════
// UPLOAD REPLY BUNDLE MODAL
// ══════════════════════════════════════════════════════════════════

export function UploadReplyBundleModal({ noticeId, onClose, onSuccess }) {
  const [replyFile, setReplyFile] = useState(null);
  const [supportFiles, setSupportFiles] = useState([]);
  const [uploading, setUploading] = useState(false);

  const handleSubmit = async () => {
    if (!replyFile) {
      message.error('Main reply document is required.');
      return;
    }
    setUploading(true);
    try {
      // 1. Upload Main Reply (saved as draft by backend)
      const formDataMain = new FormData();
      formDataMain.append('notice', noticeId);
      formDataMain.append('doc_type', 'pending');
      formDataMain.append('file', replyFile);
      const res = await api.post('/legal-services/notice-documents/', formDataMain);
      const mainId = res.data.id;  // ✅ Use main doc ID as version reference

      // 2. Upload supporting docs linked to main
      for (const file of supportFiles) {
        const fd = new FormData();
        fd.append('notice', noticeId);
        fd.append('doc_type', 'pending_support');
        fd.append('file', file);
        fd.append('reply_version', mainId);  // ✅ Link via reply ID
        await api.post('/legal-services/notice-documents/', fd);
      }

      message.success('Files uploaded as drafts. Click "Submit for Review" to send.');
      onSuccess();
    } catch (e) {
      message.error(e?.response?.data?.error || 'Upload failed');
    } finally {
      setUploading(false);
    }
  };

  return (
    <Modal open={true} onCancel={onClose} footer={null} width={500} centered closable={false} styles={{ body: { padding: 0 } }}>
      <div style={{ background: '#fff', borderRadius: 8, overflow: 'hidden' }}>
        <div style={{ padding: '14px 20px', background: C.navy, color: '#fff', display: 'flex', justifyContent: 'space-between' }}>
          <h3 style={{ margin: 0, fontSize: 15, fontWeight: 700 }}>Upload Reply</h3>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: '#fff', cursor: 'pointer', fontSize: 16 }}>✕</button>
        </div>
        <div style={{ padding: '20px' }}>
          <div style={{ marginBottom: 20 }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: C.slate, marginBottom: 6 }}>1. Main Reply Document <span style={{ color: C.red }}>*</span></div>
            <input type="file" accept=".pdf,.doc,.docx" onChange={(e) => setReplyFile(e.target.files[0])} style={{ width: '100%', fontSize: 13 }} />
          </div>
          <div style={{ paddingTop: 20, borderTop: `1px solid ${C.borderLight}` }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: C.slate, marginBottom: 6 }}>2. Supporting Documents (Optional)</div>
            <input type="file" multiple accept=".pdf,.doc,.docx,.jpg,.png,.xlsx,.xls" onChange={(e) => setSupportFiles([...supportFiles, ...Array.from(e.target.files)])} style={{ width: '100%', fontSize: 13, marginBottom: 10 }} />
            {supportFiles.length > 0 && (
              <div style={{ background: C.bgSoft, padding: 10, borderRadius: 6 }}>
                {supportFiles.map((f, i) => (
                  <div key={i} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 4 }}>
                    <span>📎 {f.name}</span>
                    <button onClick={() => setSupportFiles(supportFiles.filter((_, idx) => idx !== i))} style={{ background: 'none', border: 'none', color: C.red, cursor: 'pointer' }}>✕</button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
        <div style={{ padding: '12px 20px', borderTop: `1px solid ${C.borderLight}`, background: C.bg, display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
          <Button onClick={onClose} disabled={uploading}>Cancel</Button>
          {/* <Button type="primary" onClick={handleSubmit} loading={uploading} disabled={!replyFile} style={{ background: C.navyLight, borderColor: C.navyLight }}>
            ⬆ Upload
          </Button> */}

          <Button
            type="primary"
            onClick={handleSubmit}
            loading={uploading}
            disabled={!replyFile || uploading}
            style={{
              // Dull gray when no main file; navy when ready
              background: (!replyFile || uploading) ? '#94A3B8' : C.navyLight,
              borderColor: (!replyFile || uploading) ? '#94A3B8' : C.navyLight,
              // Keep label always visible (Ant Design hides it when disabled)
              color: '#FFFFFF',
              fontWeight: 700,
              opacity: 1, // don't let AntD fade the text away
              cursor: (!replyFile || uploading) ? 'not-allowed' : 'pointer',
            }}
          >
            ⬆ Upload
          </Button>
        </div>
      </div>
    </Modal>
  );
}


// ══════════════════════════════════════════════════════════════════
// HELPER COMPONENTS
// ══════════════════════════════════════════════════════════════════

function SectionLabel({ children }) {
  return <div style={{ fontSize: 10.5, fontWeight: 800, color: C.slate, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 }}>{children}</div>;
}

function PlainField({ label, value, mono, highlight }) {
  const isEmpty = !value || value === '—';
  return (
    <div style={{ minWidth: 0 }}>
      <div style={{ fontSize: 9.5, fontWeight: 700, color: C.muted, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 3 }}>{label}</div>
      <div style={{ fontSize: 13, fontWeight: 700, color: isEmpty ? '#CBD5E1' : (highlight ? C.blue : C.ink), wordBreak: 'break-word', fontFamily: mono ? 'monospace' : 'inherit' }}>{value || '—'}</div>
    </div>
  );
}

function ClosureDocCard({
  docType, doc, canUpload, canDelete, uploading, deleting, isReadOnly,
  onUpload, onOpen, onDownload, onDelete,
}) {
  const meta = CLOSURE_DOC_META[docType];
  const [hover, setHover] = useState(false);

  return (
    <div style={{
      background: '#fff', border: `1px solid ${doc ? C.greenBorder : C.border}`, borderRadius: 8, padding: '12px 14px',
      display: 'flex', alignItems: 'center', gap: 12, transition: 'all 0.15s',
    }}>
      <div style={{
        width: 40, height: 40, borderRadius: 8, flexShrink: 0, background: doc ? C.greenBg : C.bg,
        border: `1px solid ${doc ? C.greenBorder : C.border}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18,
      }}>
        {doc ? '✓' : meta.icon}
      </div>

      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
          <span style={{ fontSize: 13, fontWeight: 700, color: C.ink }}>{meta.label}</span>
          <span style={{ fontSize: 10, color: C.red, fontWeight: 700 }}>*</span>
        </div>
        {doc ? (
          <div onClick={onOpen} onMouseEnter={() => setHover(true)} onMouseLeave={() => setHover(false)} style={{ display: 'inline-flex', alignItems: 'center', gap: 5, marginTop: 3, cursor: 'pointer', color: hover ? C.blue : C.slate, fontSize: 11, fontWeight: 600 }}>
            <FileTextOutlined /> <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 240 }} title={doc.file_name}>{doc.file_name}</span>
          </div>
        ) : (
          <div style={{ fontSize: 11, color: C.muted, marginTop: 3, fontStyle: 'italic' }}>{meta.description}</div>
        )}
        {doc && (
          <div style={{ fontSize: 10, color: C.muted, marginTop: 2 }}>{doc.uploaded_by_name || 'Unknown'} · {fmtRelativeTime(doc.uploaded_at)}</div>
        )}
      </div>

      <div style={{ display: 'flex', gap: 5, flexShrink: 0 }}>
        {doc && (
          <>
            <Tooltip title="Download">
              <Button icon={<DownloadOutlined />} onClick={onDownload} size="small" style={{ border: `1px solid ${C.border}`, color: C.green, width: 28, height: 28, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 0 }} />
            </Tooltip>
            {canDelete && (
              <Tooltip title="Delete">
                <Button icon={<DeleteOutlined />} onClick={onDelete} loading={deleting} size="small" danger style={{ width: 28, height: 28, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 0 }} />
              </Tooltip>
            )}
          </>
        )}
        {canUpload && (
          <Upload accept=".pdf,.doc,.docx,.jpg,.jpeg,.png" showUploadList={false} beforeUpload={onUpload} disabled={uploading}>
            <Button icon={<UploadOutlined />} loading={uploading} type="primary" size="middle" style={{ background: `linear-gradient(135deg, ${C.navy}, ${C.navyLight})`, border: 'none', fontWeight: 600, fontSize: 11 }}>
              Upload
            </Button>
          </Upload>
        )}
      </div>
    </div>
  );
}

function UnifiedRepliesCard({ items, isAssignedMaker, locked, deletingId, onReply, onUploadReplyClick, onOpenHtml, onDownloadHtml, onOpenDoc, onDownloadDoc, onDeleteDoc, onDeleteHtml }) {
  return (
    <div style={{ background: '#fff', border: `1px solid ${C.borderLight}`, borderRadius: 8, display: 'flex', flexDirection: 'column', opacity: locked ? 0.6 : 1, height: '100%' }}>
      <div style={{ padding: '9px 12px', background: C.greenBg, borderBottom: `1px solid ${C.borderLight}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, minHeight: 42 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 14 }}>✅</span>
          <div>
            <div style={{ fontSize: 11.5, fontWeight: 800, color: C.green, letterSpacing: '0.02em', display: 'flex', alignItems: 'center', gap: 5 }}>
              Replies & Support Docs
            </div>
            <div style={{ fontSize: 9.5, color: C.muted, marginTop: 1 }}>Grouped by version</div>
          </div>
        </div>
        
        {!locked && isAssignedMaker && (
          <div style={{ display: 'flex', gap: 6 }}>
            <Button size="small" icon={<UploadOutlined />} onClick={onUploadReplyClick} style={{ fontSize: 10.5, fontWeight: 600, color: C.green, borderColor: C.green }}>Upload</Button>
            <Button size="small" type="primary" onClick={onReply} style={{ background: C.green, border: 'none', fontSize: 10.5, fontWeight: 600 }}>📝 Write</Button>
          </div>
        )}
      </div>

      <div style={{ padding: '8px 12px', flex: 1, maxHeight: 220, overflowY: 'auto' }}>
        {locked ? (
           <div style={{ padding: '20px 8px', textAlign: 'center', fontSize: 11, color: C.muted, fontStyle: 'italic' }}>Upload notice to unlock</div>
        ) : items.length === 0 ? (
          <div style={{ padding: '20px 8px', textAlign: 'center', fontSize: 11, color: C.muted, fontStyle: 'italic' }}>No replies or documents uploaded yet</div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {items.map(item => {
              const isHtml = item._isHtml;
              const title = item.title || item.file_name || 'Untitled';
              const status = item.status || item.review_status;
              
              const canDel = isAssignedMaker && ['draft', 'rejected'].includes(status);
              const delHandler = isHtml ? () => onDeleteHtml(item.id) : () => onDeleteDoc(item.id);
              const openHandler = isHtml ? () => onOpenHtml(item) : () => onOpenDoc(item);
              const downHandler = isHtml ? () => onDownloadHtml(item) : () => onDownloadDoc(item);

              return (
                <UnifiedRow 
                  key={`${isHtml ? 'h' : 'd'}-${item.id}`}
                  item={{...item, title, status, isHtml}}
                  onOpen={openHandler}
                  onDownload={downHandler}
                  onDelete={delHandler}
                  canDelete={canDel}
                  deleting={deletingId === item.id}
                />
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

function UnifiedRow({ item, onOpen, onDownload, onDelete, canDelete, deleting }) {
  const [hover, setHover] = useState(false);
  const meta = REVIEW_META[item.status];
  const icon = item.isHtml ? '📝' : (item._isSupport ? '📎' : '📄');

  return (
    <div
      onClick={onOpen}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        display: 'flex', alignItems: 'center', gap: 8,
        padding: '8px 10px', borderRadius: 6, cursor: 'pointer', transition: 'all .12s',
        background: hover ? C.bgSoft : '#fff', 
        border: `1px solid ${hover ? C.border : C.borderLight}`,
        marginLeft: item._isSupport ? 16 : 0, 
      }}
    >
      <span style={{ fontSize: 13, flexShrink: 0 }}>{icon}</span>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 11.5, fontWeight: 700, color: C.ink, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', lineHeight: 1.3 }} title={item.title}>
          {item._versionLabel && <span style={{ color: C.blue, marginRight: 6, fontWeight: 800 }}>{item._versionLabel}</span>}
          {item.title}
        </div>
        <div style={{ fontSize: 9.5, color: C.muted, marginTop: 1, display: 'flex', alignItems: 'center', gap: 5, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {meta && <span style={{ padding: '1px 5px', borderRadius: 3, fontSize: 8.5, fontWeight: 700, background: meta.bg, color: meta.color, textTransform: 'uppercase' }}>{meta.label}</span>}
          <span>{item.reviewed_by_name || item.uploaded_by_name || item.created_by_name || 'Unknown'}</span>
        </div>
      </div>
      <div style={{ display: 'flex', gap: 4, flexShrink: 0 }} onClick={(e) => e.stopPropagation()}>
        <Button icon={<DownloadOutlined />} onClick={onDownload} size="small" style={{ border: `1px solid ${C.border}`, color: C.slate, width: 22, height: 22, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 0 }} title="Download" />
        {canDelete && (
          <Button icon={<DeleteOutlined />} onClick={onDelete} disabled={deleting} size="small" danger style={{ width: 22, height: 22, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 0, opacity: deleting ? 0.5 : 1 }} title="Delete" />
        )}
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════
// DEFAULT EXPORT: ADD NOTICE MODAL
// ══════════════════════════════════════════════════════════════════

export default function AddNoticeModal({ courtCaseId, editNotice, submitForReview, onClose, onCreated }) {
  const isEdit = !!editNotice;
  const initialOfficerKnown = editNotice?.officer && OFFICER_OPTIONS.includes(editNotice.officer);

  const [form, setForm] = useState({
    din_number:   editNotice?.din_number || '',
    officer:      isEdit ? (initialOfficerKnown ? editNotice.officer : (editNotice?.officer ? 'Other' : '')) : '',
    officer_text: (!initialOfficerKnown && editNotice?.officer) ? editNotice.officer : '',
    section:      editNotice?.section || '',
    notice_date:  editNotice?.notice_date || '',
    due_date:     editNotice?.due_date || '',
    extended_due_date: editNotice?.extended_due_date || '',
    ph_date:      editNotice?.ph_date || '',
    notes:        editNotice?.notes || '',
  });

  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const change = (e) => setForm((p) => ({ ...p, [e.target.name]: e.target.value }));

  const submit = async () => {
    const finalOfficer = form.officer === 'Other' ? form.officer_text.trim() : form.officer;
    if (!form.din_number.trim()) return setError('DIN Number is required.');

    setBusy(true);
    setError('');
    try {
      const payload = {
        din_number:  form.din_number.trim(),
        officer:     finalOfficer || null,
        section:     form.section.trim() || null,
        notice_date: form.notice_date || null,
        due_date:    form.due_date || null,
        extended_due_date: form.extended_due_date || null,
        ph_date:     form.ph_date || null,
        notes:       form.notes.trim() || null,
      };

      let result;
      if (isEdit && submitForReview) {
        const res = await api.post(`/legal-services/notices/${editNotice.id}/submit-edit-for-review/`, payload);
        result = res.data;
      } else if (isEdit) {
        const res = await api.patch(`/legal-services/notices/${editNotice.id}/`, payload);
        result = res.data;
      } else {
        const res = await api.post('/legal-services/notices/', { court_case: courtCaseId, ...payload });
        result = res.data;
      }

      onCreated(result);
    } catch (e) {
      setError(e?.response?.data?.error || e?.response?.data?.detail || e?.message || 'Failed to save notice.');
    } finally {
      setBusy(false);
    }
  };

  const inputStyle = { width: '100%', boxSizing: 'border-box', padding: '8px 10px', border: '1.5px solid #E8ECF4', borderRadius: 8, fontSize: 12.5, fontFamily: 'inherit', color: '#0F172A', background: '#fff', outline: 'none' };

  return createPortal(
    <div onClick={(e) => e.target === e.currentTarget && onClose()} style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.55)', backdropFilter: 'blur(6px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 2000, padding: 20 }}>
      <div onClick={(e) => e.stopPropagation()} style={{ width: 520, maxWidth: '100%', maxHeight: '90vh', background: '#fff', borderRadius: 10, overflow: 'hidden', display: 'flex', flexDirection: 'column', boxShadow: '0 20px 60px rgba(15,23,42,0.22)', border: '1px solid #E8ECF4' }}>
        <div style={{ padding: '14px 18px', background: 'linear-gradient(135deg, #1E3A6B, #2A4F8F)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ fontSize: 18 }}>📋</span>
            <div>
              <div style={{ fontSize: 14.5, fontWeight: 700, color: '#fff' }}>{isEdit ? 'Edit Notice' : 'Add Notice'}</div>
              <div style={{ fontSize: 10.5, color: 'rgba(255,255,255,0.75)' }}>{isEdit ? 'Update notice details' : 'Enter notice details received from authority'}</div>
            </div>
          </div>
          <button onClick={onClose} style={{ width: 30, height: 30, border: '1px solid rgba(255,255,255,0.25)', borderRadius: 6, background: 'rgba(255,255,255,0.12)', color: '#fff', cursor: 'pointer' }}>✕</button>
        </div>

        <div style={{ overflowY: 'auto', flex: 1, padding: '16px 18px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div><label style={{ fontSize: 11, fontWeight: 700, color: '#475569', marginBottom: 4, display: 'block' }}>DIN Number <span style={{ color: '#B42318' }}>*</span></label><input style={inputStyle} name="din_number" value={form.din_number} onChange={change} placeholder="Enter DIN number" /></div>
            <div><label style={{ fontSize: 11, fontWeight: 700, color: '#475569', marginBottom: 4, display: 'block' }}>Officer</label><Select showSearch allowClear placeholder="Select officer" value={form.officer || undefined} onChange={(val) => setForm((p) => ({ ...p, officer: val || '' }))} optionFilterProp="label" style={{ width: '100%' }} size="middle" getPopupContainer={(trigger) => trigger.parentNode} popupMatchSelectWidth={true} virtual={false} options={[...OFFICER_OPTIONS.map((o) => ({ value: o, label: o })), { value: 'Other', label: 'Other' }]} />{form.officer === 'Other' && <input style={{ ...inputStyle, marginTop: 6 }} name="officer_text" value={form.officer_text} onChange={change} placeholder="Enter custom officer name" />}</div>
            <div><label style={{ fontSize: 11, fontWeight: 700, color: '#475569', marginBottom: 4, display: 'block' }}>Section</label><input style={inputStyle} name="section" value={form.section} onChange={change} placeholder="e.g. 143(2), 148" /></div>
            <div><label style={{ fontSize: 11, fontWeight: 700, color: '#475569', marginBottom: 4, display: 'block' }}>Notice Date</label><input type="date" style={inputStyle} name="notice_date" value={form.notice_date} onChange={change} /></div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12, marginTop: 12 }}>
            <div><label style={{ fontSize: 11, fontWeight: 700, color: '#475569', marginBottom: 4, display: 'block' }}>Due Date</label><input type="date" style={inputStyle} name="due_date" value={form.due_date} onChange={change} /></div>
            <div><label style={{ fontSize: 11, fontWeight: 700, color: '#475569', marginBottom: 4, display: 'block' }}>Extended Due Date</label><input type="date" style={inputStyle} name="extended_due_date" value={form.extended_due_date} onChange={change} /></div>
            <div><label style={{ fontSize: 11, fontWeight: 700, color: '#475569', marginBottom: 4, display: 'block' }}>PH Date</label><input type="date" style={inputStyle} name="ph_date" value={form.ph_date} onChange={change} /></div>
          </div>
          <div style={{ marginTop: 12 }}><label style={{ fontSize: 11, fontWeight: 700, color: '#475569', marginBottom: 4, display: 'block' }}>Notes</label><textarea style={{ ...inputStyle, resize: 'vertical', minHeight: 60 }} name="notes" value={form.notes} onChange={change} rows={2} placeholder="Any additional details about this notice..." /></div>
          {error && <div style={{ marginTop: 10, padding: '8px 10px', background: '#FCEBEA', border: '1px solid #F2C1BC', borderRadius: 6, color: '#B42318', fontSize: 12, fontWeight: 600 }}>{error}</div>}
        </div>

        <div style={{ padding: '12px 18px', borderTop: '1px solid #E8ECF4', display: 'flex', justifyContent: 'flex-end', gap: 8, background: '#F8FAFC' }}>
          <button onClick={onClose} style={{ padding: '8px 16px', border: '1.5px solid #E8ECF4', borderRadius: 6, background: '#fff', cursor: 'pointer', fontSize: 12, fontWeight: 600, color: '#475569' }}>Cancel</button>
          <button onClick={submit} disabled={busy} style={{ padding: '8px 20px', border: 'none', borderRadius: 6, cursor: busy ? 'not-allowed' : 'pointer', fontSize: 12, fontWeight: 700, color: '#fff', background: busy ? '#94A3B8' : 'linear-gradient(135deg, #1E3A6B, #2563EB)' }}>{busy ? (isEdit ? 'Updating...' : 'Creating...') : (isEdit ? 'Update Notice' : 'Add Notice')}</button>
        </div>
      </div>
    </div>,
    document.body
  );
}