import React, { useState, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { Select, Modal, Upload, Button, Tag, message, Tooltip, Spin } from 'antd';
import {
  UploadOutlined,
  FileTextOutlined,
  FilePdfOutlined,
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
  wip:    { label: 'WIP',    color: '#B45309', bg: '#FEF3C7', border: '#FCD34D' },
  under_review: { label: 'UNDER REVIEW', color: '#6D28D9', bg: '#F1E8FE', border: '#DDD6FE' },
  open:   { label: 'Open',   color: '#0369A1', bg: '#DBEAFE', border: '#7DD3FC' },
  closed: { label: 'Closed', color: '#047857', bg: '#D1FAE5', border: '#6EE7B7' },
};

// ══════════════════════════════════════════════════════════════════
// UTILITIES
// ══════════════════════════════════════════════════════════════════

function fmtDate(d) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('en-IN', {
    day: '2-digit', month: 'short', year: 'numeric',
  });
}

function fmtDateTime(d) {
  if (!d) return '—';
  return new Date(d).toLocaleString('en-IN', {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
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

export function NoticeDetailModal({ noticeId, canEdit, onClose, onUpdated }) {
  const { user } = useAuth();
  const [notice, setNotice] = useState(null);
  const [replies, setReplies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [uploadingCourtNotice, setUploadingCourtNotice] = useState(false);
  const [uploadingAck, setUploadingAck] = useState(false);
  const [deletingId, setDeletingId] = useState(null);

  const fetchNotice = useCallback(async () => {
    setLoading(true);
    try {
      const [noticeRes, repliesRes] = await Promise.all([
        api.get(`/legal-services/notices/${noticeId}/`),
        api.get('/legal-services/notice-replies/', { params: { notice: noticeId } }),
      ]);
      setNotice(noticeRes.data);
      const replyList = Array.isArray(repliesRes.data) ? repliesRes.data : (repliesRes.data.results || []);
      setReplies(replyList.filter(r => r.status === 'approved'));
    } catch {
      setError('Failed to load notice.');
    } finally {
      setLoading(false);
    }
  }, [noticeId]);

  useEffect(() => { fetchNotice(); }, [fetchNotice]);

  const statusMeta = STATUS_META[notice?.status] || STATUS_META.wip;

  // Permissions
  const isMakerUploader = canEdit;
  const hasApprovedReply = replies.length > 0;
  const canUploadAck = isMakerUploader && hasApprovedReply;
  const canDeleteFiles = isMakerUploader; // Later switch to CEO

  // Files
  const courtNoticeDoc = notice?.court_notice_docs?.[0] || null;
  const acknowledgmentDoc = notice?.documents?.find(d => d.doc_type === 'acknowledgment') || null;

  // ══ UPLOAD HANDLERS ══
  const handleCourtNoticeUpload = async (file) => {
    setUploadingCourtNotice(true);
    setError('');
    try {
      const formData = new FormData();
      formData.append('notice', noticeId);
      formData.append('file', file);
      formData.append('doc_type', 'court_notice');
      await api.post('/legal-services/notice-documents/', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      message.success('Court notice uploaded');
      await fetchNotice();
      onUpdated && onUpdated();
    } catch (e) {
      message.error(e?.response?.data?.error || 'Failed to upload');
    } finally {
      setUploadingCourtNotice(false);
    }
    return false;
  };

  const handleAcknowledgmentUpload = async (file) => {
    setUploadingAck(true);
    setError('');
    try {
      const formData = new FormData();
      formData.append('notice', noticeId);
      formData.append('file', file);
      formData.append('doc_type', 'acknowledgment');
      await api.post('/legal-services/notice-documents/', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      message.success('Acknowledgment uploaded');
      await fetchNotice();
      onUpdated && onUpdated();
    } catch (e) {
      message.error(e?.response?.data?.error || 'Failed to upload');
    } finally {
      setUploadingAck(false);
    }
    return false;
  };

  const handleDeleteDoc = (docId) => {
    Modal.confirm({
      title: 'Delete this file?',
      content: 'This action cannot be undone.',
      okText: 'Delete',
      okType: 'danger',
      cancelText: 'Cancel',
      centered: true,
      onOk: async () => {
        setDeletingId(docId);
        try {
          await api.delete(`/legal-services/notice-documents/${docId}/`);
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

  const handleOpenDoc = (doc) => {
    window.open(doc.file_url, '_blank', 'noopener,noreferrer');
  };

  const handleDownloadDoc = async (doc) => {
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

  // ══ APPROVED REPLY HANDLERS ══

  const handleOpenReply = (reply) => {
    const html = `<!DOCTYPE html>
<html>
<head>
  <title>${reply.title || 'Reply'}</title>
  <style>
    body { font-family: 'Times New Roman', serif; padding: 40px; max-width: 800px; margin: 0 auto; line-height: 1.6; color: #1a1a2e; }
    h1, h2, h3 { color: #1a1a2e; }
    table { border-collapse: collapse; margin: 10px 0; }
    td, th { border: 1px solid #999; padding: 6px 10px; }
  </style>
</head>
<body>${reply.content_html || ''}</body>
</html>`;
    const blob = new Blob([html], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    window.open(url, '_blank');
  };

  /**
   * ✅ REAL TEXT PDF using jsPDF.html() — selectable/copyable text
   */
  const handleDownloadReplyAsPdf = async (reply) => {
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

  const handleDeleteReply = (reply) => {
    Modal.confirm({
      title: 'Delete this approved reply?',
      content: `"${reply.title || 'Untitled'}" will be permanently deleted.`,
      okText: 'Delete',
      okType: 'danger',
      cancelText: 'Cancel',
      centered: true,
      onOk: async () => {
        setDeletingId(`reply-${reply.id}`);
        try {
          await api.delete(`/legal-services/notice-replies/${reply.id}/`);
          message.success('Reply deleted');
          await fetchNotice();
          onUpdated && onUpdated();
        } catch (e) {
          message.error(e?.response?.data?.error || 'Cannot delete approved reply');
        } finally {
          setDeletingId(null);
        }
      },
    });
  };

  // ══════════════════════════════════════════════════════════════
  // RENDER
  // ══════════════════════════════════════════════════════════════

  return (
    <Modal
      open={true}
      onCancel={onClose}
      footer={null}
      width={780}
      centered
      destroyOnClose
      closable={false}
      styles={{
        body: { padding: 0 },
        content: { padding: 0, overflow: 'hidden', borderRadius: 12 },
      }}
    >
      <div style={{ fontFamily: "'Inter', -apple-system, sans-serif", background: '#fff' }}>
        {/* ═══════════ WHITE HEADER ═══════════ */}
        <div style={{
          padding: '14px 20px',
          background: '#fff',
          borderBottom: `1px solid ${C.borderLight}`,
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, flex: 1, minWidth: 0 }}>
            <div style={{
              width: 36, height: 36, borderRadius: 8,
              background: C.blueBg,
              border: `1px solid ${C.blueBorder}`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 16, flexShrink: 0,
            }}>
              📋
            </div>
            <div style={{ minWidth: 0, flex: 1 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                <h3 style={{
                  margin: 0, fontSize: 15, fontWeight: 700, color: C.ink,
                  letterSpacing: '-0.01em',
                }}>
                  Notice — DIN: {notice?.din_number || '—'}
                </h3>
                {notice && (
                  <span style={{
                    fontSize: 9.5, fontWeight: 800,
                    padding: '2px 9px',
                    borderRadius: 5,
                    background: statusMeta.bg,
                    color: statusMeta.color,
                    border: `1px solid ${statusMeta.border}`,
                    textTransform: 'uppercase', letterSpacing: '0.04em',
                  }}>
                    {statusMeta.label}
                  </span>
                )}
              </div>
              {notice?.created_by_name && (
                <div style={{
                  fontSize: 10.5, color: C.muted, marginTop: 2,
                }}>
                  Created by <b style={{ color: C.slate }}>{notice.created_by_name}</b> · {fmtDateTime(notice.created_at)}
                </div>
              )}
            </div>
          </div>
          <button
            onClick={onClose}
            style={{
              width: 28, height: 28,
              border: `1px solid ${C.border}`,
              borderRadius: 6,
              background: '#fff',
              color: C.slate,
              cursor: 'pointer',
              fontSize: 14,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontFamily: 'inherit',
              transition: 'all 0.15s',
              flexShrink: 0,
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = C.bg;
              e.currentTarget.style.borderColor = C.slate;
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = '#fff';
              e.currentTarget.style.borderColor = C.border;
            }}
          >
            ✕
          </button>
        </div>

        {/* ═══════════ BODY ═══════════ */}
        <div style={{
          maxHeight: 'calc(90vh - 130px)',
          overflowY: 'auto',
          padding: '16px 20px',
          background: '#fff',
        }}>
          {loading ? (
            <div style={{ padding: 60, textAlign: 'center' }}>
              <Spin size="large" />
              <div style={{ marginTop: 12, color: C.muted, fontSize: 13 }}>Loading notice...</div>
            </div>
          ) : error ? (
            <div style={{
              padding: 14, background: C.redBg, border: `1px solid ${C.redBorder}`,
              borderRadius: 8, color: C.red, fontSize: 13, fontWeight: 600,
            }}>
              ⚠ {error}
            </div>
          ) : notice && (
            <>
              {/* ═══════════ NOTICE INFO — Plain grid, no borders ═══════════ */}
              <SectionLabel>Notice Information</SectionLabel>
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(3, 1fr)',
                gap: '14px 24px',
                marginBottom: 20,
                padding: '4px 0',
              }}>
                <PlainField label="DIN Number" value={notice.din_number} mono />
                <PlainField label="Section" value={notice.section} mono />
                <PlainField label="Officer" value={notice.officer} />
                <PlainField label="Notice Date" value={fmtDate(notice.notice_date)} />
                <PlainField label="Due Date" value={fmtDate(notice.due_date)} highlight />
                <PlainField label="Extended Due Date" value={fmtDate(notice.extended_due_date)} highlight={!!notice.extended_due_date} />
                <PlainField label="PH Date" value={fmtDate(notice.ph_date)} highlight={!!notice.ph_date} />
              </div>

              {/* ═══════════ 3 FILE CARDS IN ONE ROW ═══════════ */}
              <SectionLabel>Documents</SectionLabel>
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(3, 1fr)',
                gap: 12,
                marginBottom: 18,
              }}>
                {/* Court Notice Card */}
                <FileCard
                  title="Court Notice"
                  subtitle="Original notice"
                  icon="📎"
                  accentColor={C.blue}
                  accentBg={C.blueBg}
                  doc={courtNoticeDoc}
                  canUpload={isMakerUploader && !courtNoticeDoc}
                  canDelete={canDeleteFiles}
                  uploading={uploadingCourtNotice}
                  deleting={deletingId === courtNoticeDoc?.id}
                  onUpload={handleCourtNoticeUpload}
                  onOpen={() => handleOpenDoc(courtNoticeDoc)}
                  onDownload={() => handleDownloadDoc(courtNoticeDoc)}
                  onDelete={() => handleDeleteDoc(courtNoticeDoc.id)}
                />

                {/* Approved Replies Card */}
                <RepliesCard
                  replies={replies}
                  canDelete={canDeleteFiles}
                  deletingId={deletingId}
                  onOpen={handleOpenReply}
                  onDownload={handleDownloadReplyAsPdf}
                  onDelete={handleDeleteReply}
                />

                {/* Acknowledgment Card */}
                <FileCard
                  title="Acknowledgment"
                  subtitle={hasApprovedReply ? "Filing receipt" : "After approval"}
                  icon="📥"
                  accentColor={C.purple}
                  accentBg={C.purpleBg}
                  doc={acknowledgmentDoc}
                  canUpload={canUploadAck && !acknowledgmentDoc}
                  canDelete={canDeleteFiles}
                  uploading={uploadingAck}
                  deleting={deletingId === acknowledgmentDoc?.id}
                  disabled={!hasApprovedReply}
                  onUpload={handleAcknowledgmentUpload}
                  onOpen={() => handleOpenDoc(acknowledgmentDoc)}
                  onDownload={() => handleDownloadDoc(acknowledgmentDoc)}
                  onDelete={() => handleDeleteDoc(acknowledgmentDoc.id)}
                />
              </div>

              {/* ═══════════ NOTES ═══════════ */}
              <SectionLabel>Notes</SectionLabel>
              {notice.notes ? (
                <div style={{
                  padding: '10px 12px',
                  background: C.bgSoft,
                  border: `1px solid ${C.borderLight}`,
                  borderLeft: `3px solid ${C.navy}`,
                  borderRadius: 6,
                  fontSize: 12.5, color: C.ink,
                  lineHeight: 1.55,
                  whiteSpace: 'pre-wrap',
                  wordBreak: 'break-word',
                }}>
                  {notice.notes}
                </div>
              ) : (
                <div style={{
                  padding: '10px 12px',
                  fontSize: 12, color: C.muted,
                  fontStyle: 'italic',
                }}>
                  No notes added.
                </div>
              )}
            </>
          )}
        </div>

        {/* ═══════════ FOOTER ═══════════ */}
        <div style={{
          padding: '10px 20px',
          borderTop: `1px solid ${C.borderLight}`,
          background: '#fff',
          display: 'flex', justifyContent: 'flex-end',
        }}>
          <Button onClick={onClose} size="middle">Close</Button>
        </div>
      </div>
    </Modal>
  );
}

// ══════════════════════════════════════════════════════════════════
// HELPER COMPONENTS
// ══════════════════════════════════════════════════════════════════

function SectionLabel({ children }) {
  return (
    <div style={{
      fontSize: 10.5, fontWeight: 800, color: C.slate,
      textTransform: 'uppercase', letterSpacing: '0.06em',
      marginBottom: 8,
    }}>
      {children}
    </div>
  );
}

/**
 * Plain info field — no borders/lines, just label and value
 */
function PlainField({ label, value, mono, highlight }) {
  const isEmpty = !value || value === '—';
  return (
    <div style={{ minWidth: 0 }}>
      <div style={{
        fontSize: 9.5, fontWeight: 700, color: C.muted,
        textTransform: 'uppercase', letterSpacing: '0.05em',
        marginBottom: 3,
      }}>
        {label}
      </div>
      <div style={{
        fontSize: 13,
        fontWeight: 700,
        color: isEmpty ? '#CBD5E1' : (highlight ? C.blue : C.ink),
        wordBreak: 'break-word',
        lineHeight: 1.3,
        fontFamily: mono ? "'Roboto Mono', monospace" : 'inherit',
      }}>
        {value || '—'}
      </div>
    </div>
  );
}

/**
 * ✅ Compact file card — used for Court Notice and Acknowledgment
 * Click row to open · Download + Delete buttons
 */
function FileCard({
  title, subtitle, icon, accentColor, accentBg,
  doc, canUpload, canDelete, uploading, deleting, disabled,
  onUpload, onOpen, onDownload, onDelete,
}) {
  const [rowHover, setRowHover] = useState(false);

  return (
    <div style={{
      background: '#fff',
      border: `1px solid ${C.borderLight}`,
      borderRadius: 8,
      overflow: 'hidden',
      display: 'flex', flexDirection: 'column',
      opacity: disabled ? 0.6 : 1,
    }}>
      {/* Card Header */}
      <div style={{
        padding: '9px 12px',
        background: accentBg,
        borderBottom: `1px solid ${C.borderLight}`,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        gap: 8, minHeight: 42,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0, flex: 1 }}>
          <span style={{ fontSize: 14, flexShrink: 0 }}>{icon}</span>
          <div style={{ minWidth: 0 }}>
            <div style={{
              fontSize: 11.5, fontWeight: 800, color: accentColor,
              letterSpacing: '0.02em', lineHeight: 1.2,
              overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
            }}>
              {title}
            </div>
            <div style={{
              fontSize: 9.5, color: C.muted, marginTop: 1,
              overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
            }}>
              {subtitle}
            </div>
          </div>
        </div>
        {canUpload && (
          <Upload
            accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
            showUploadList={false}
            beforeUpload={onUpload}
            disabled={uploading}
          >
            <Button
              icon={<UploadOutlined />}
              loading={uploading}
              size="small"
              type="primary"
              style={{
                background: accentColor,
                borderColor: accentColor,
                fontWeight: 600,
                fontSize: 10.5,
                height: 24,
                padding: '0 8px',
              }}
            >
              Upload
            </Button>
          </Upload>
        )}
      </div>

      {/* Card Body */}
      <div style={{ padding: 8, flex: 1, minHeight: 60 }}>
        {doc ? (
          <div
            onClick={onOpen}
            onMouseEnter={() => setRowHover(true)}
            onMouseLeave={() => setRowHover(false)}
            style={{
              display: 'flex', alignItems: 'center', gap: 8,
              padding: '7px 8px',
              background: rowHover ? C.bgSoft : '#fff',
              border: `1px solid ${rowHover ? accentColor + '40' : C.borderLight}`,
              borderRadius: 5,
              cursor: 'pointer',
              transition: 'all 0.15s',
            }}
          >
            <FileTextOutlined style={{
              color: accentColor,
              fontSize: 16, flexShrink: 0,
            }} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{
                fontSize: 11.5, fontWeight: 700, color: C.ink,
                overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                lineHeight: 1.3,
              }} title={doc.file_name}>
                {doc.file_name}
              </div>
              <div style={{
                fontSize: 9.5, color: C.muted, marginTop: 1,
                overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
              }}>
                {doc.uploaded_by_name || 'Unknown'} · {fmtRelativeTime(doc.uploaded_at)}
              </div>
            </div>
            <div style={{ display: 'flex', gap: 3, flexShrink: 0 }} onClick={(e) => e.stopPropagation()}>
              <Tooltip title="Download">
                <Button
                  icon={<DownloadOutlined />}
                  onClick={onDownload}
                  size="small"
                  style={{
                    border: `1px solid ${C.border}`,
                    color: C.green,
                    width: 22, height: 22,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    padding: 0,
                  }}
                />
              </Tooltip>
              {canDelete && onDelete && (
                <Tooltip title="Delete">
                  <Button
                    icon={<DeleteOutlined />}
                    onClick={onDelete}
                    loading={deleting}
                    size="small"
                    danger
                    style={{
                      width: 22, height: 22,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      padding: 0,
                    }}
                  />
                </Tooltip>
              )}
            </div>
          </div>
        ) : (
          <div style={{
            padding: '14px 8px',
            textAlign: 'center',
            fontSize: 11, color: C.muted,
            fontStyle: 'italic',
            lineHeight: 1.4,
          }}>
            {disabled ? 'Available after approval' : 'No file uploaded'}
          </div>
        )}
      </div>
    </div>
  );
}

/**
 * ✅ Approved Replies card — supports multiple approved replies
 */
function RepliesCard({ replies, canDelete, deletingId, onOpen, onDownload, onDelete }) {
  return (
    <div style={{
      background: '#fff',
      border: `1px solid ${C.borderLight}`,
      borderRadius: 8,
      overflow: 'hidden',
      display: 'flex', flexDirection: 'column',
    }}>
      {/* Header */}
      <div style={{
        padding: '9px 12px',
        background: C.greenBg,
        borderBottom: `1px solid ${C.borderLight}`,
        display: 'flex', alignItems: 'center', gap: 8,
        minHeight: 42,
      }}>
        <span style={{ fontSize: 14 }}>✅</span>
        <div style={{ minWidth: 0, flex: 1 }}>
          <div style={{
            fontSize: 11.5, fontWeight: 800, color: C.green,
            letterSpacing: '0.02em', lineHeight: 1.2,
            display: 'flex', alignItems: 'center', gap: 5,
          }}>
            Approved Replies
            <span style={{
              background: C.green, color: '#fff',
              fontSize: 9, fontWeight: 800,
              padding: '1px 6px', borderRadius: 99,
              minWidth: 16, textAlign: 'center',
            }}>
              {replies.length}
            </span>
          </div>
          <div style={{
            fontSize: 9.5, color: C.muted, marginTop: 1,
          }}>
            Approved by checker
          </div>
        </div>
      </div>

      {/* Body */}
      <div style={{
        padding: 8, flex: 1, minHeight: 60,
        maxHeight: 200, overflowY: 'auto',
      }}>
        {replies.length === 0 ? (
          <div style={{
            padding: '14px 8px',
            textAlign: 'center',
            fontSize: 11, color: C.muted,
            fontStyle: 'italic',
            lineHeight: 1.4,
          }}>
            No approved replies yet
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
            {replies.map((reply) => (
              <ReplyRow
                key={reply.id}
                reply={reply}
                canDelete={canDelete}
                deleting={deletingId === `reply-${reply.id}`}
                onOpen={() => onOpen(reply)}
                onDownload={() => onDownload(reply)}
                onDelete={() => onDelete(reply)}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

/**
 * ✅ Single approved reply row inside RepliesCard
 */
function ReplyRow({ reply, canDelete, deleting, onOpen, onDownload, onDelete }) {
  const [hover, setHover] = useState(false);
  return (
    <div
      onClick={onOpen}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        display: 'flex', alignItems: 'center', gap: 8,
        padding: '7px 8px',
        background: hover ? C.bgSoft : '#fff',
        border: `1px solid ${hover ? C.greenBorder : C.borderLight}`,
        borderRadius: 5,
        cursor: 'pointer',
        transition: 'all 0.15s',
      }}
    >
      <FilePdfOutlined style={{
        color: C.green,
        fontSize: 16, flexShrink: 0,
      }} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{
          fontSize: 11.5, fontWeight: 700, color: C.ink,
          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
          lineHeight: 1.3,
        }} title={reply.title}>
          {reply.title || 'Untitled'}
        </div>
        <div style={{
          fontSize: 9.5, color: C.muted, marginTop: 1,
          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
        }}>
          {reply.reviewed_by_name || 'Unknown'} · {fmtRelativeTime(reply.reviewed_at)}
        </div>
      </div>
      <div style={{ display: 'flex', gap: 3, flexShrink: 0 }} onClick={(e) => e.stopPropagation()}>
        <Tooltip title="Download PDF">
          <Button
            icon={<DownloadOutlined />}
            onClick={onDownload}
            size="small"
            style={{
              border: `1px solid ${C.border}`,
              color: C.green,
              width: 22, height: 22,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              padding: 0,
            }}
          />
        </Tooltip>
        {canDelete && (
          <Tooltip title="Delete">
            <Button
              icon={<DeleteOutlined />}
              onClick={onDelete}
              loading={deleting}
              size="small"
              danger
              style={{
                width: 22, height: 22,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                padding: 0,
              }}
            />
          </Tooltip>
        )}
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════
// ADD NOTICE MODAL (default export — UNCHANGED)
// ══════════════════════════════════════════════════════════════════

export default function AddNoticeModal({ courtCaseId, editNotice, submitForReview, onClose, onCreated }) {
  const isEdit = !!editNotice;

  const initialOfficerKnown = editNotice?.officer && OFFICER_OPTIONS.includes(editNotice.officer);

  const [form, setForm] = useState({
    din_number:   editNotice?.din_number || '',
    officer:      isEdit
      ? (initialOfficerKnown ? editNotice.officer : (editNotice?.officer ? 'Other' : ''))
      : '',
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
        // ✅ Maker editing → submit for checker review
        const res = await api.post(
          `/legal-services/notices/${editNotice.id}/submit-edit-for-review/`,
          payload
        );
        result = res.data;
      } else if (isEdit) {
        // Founder editing OR direct save → PATCH directly
        const res = await api.patch(`/legal-services/notices/${editNotice.id}/`, payload);
        result = res.data;
      } else {
        // Create new notice → POST
        const res = await api.post('/legal-services/notices/', {
          court_case: courtCaseId,
          ...payload,
        });
        result = res.data;
      }

      onCreated(result);
    } catch (e) {
      const msg = e?.response?.data?.error
        || e?.response?.data?.detail
        || e?.message
        || 'Failed to save notice.';
      setError(msg);
    } finally {
      setBusy(false);
    }
  };

  const inputStyle = {
    width: '100%', boxSizing: 'border-box',
    padding: '8px 10px', border: '1.5px solid #E8ECF4',
    borderRadius: 8, fontSize: 12.5, fontFamily: 'inherit',
    color: '#0F172A', background: '#fff', outline: 'none',
  };

  return createPortal(
    <div
      onClick={(e) => e.target === e.currentTarget && onClose()}
      style={{
        position: 'fixed', inset: 0,
        background: 'rgba(15,23,42,0.55)',
        backdropFilter: 'blur(6px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        zIndex: 2000, padding: 20,
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: 520, maxWidth: '100%', maxHeight: '90vh',
          background: '#fff', borderRadius: 10,
          overflow: 'hidden', display: 'flex', flexDirection: 'column',
          boxShadow: '0 20px 60px rgba(15,23,42,0.22)',
          border: '1px solid #E8ECF4',
        }}
      >
        <div style={{
          padding: '14px 18px',
          background: 'linear-gradient(135deg, #1E3A6B, #2A4F8F)',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ fontSize: 18 }}>📋</span>
            <div>
              <div style={{ fontSize: 14.5, fontWeight: 700, color: '#fff' }}>
                {isEdit ? 'Edit Notice' : 'Add Notice'}
              </div>
              <div style={{ fontSize: 10.5, color: 'rgba(255,255,255,0.75)' }}>
                {isEdit ? 'Update notice details' : 'Enter notice details received from authority'}
              </div>
            </div>
          </div>
          <button
            onClick={onClose}
            style={{
              width: 30, height: 30, border: '1px solid rgba(255,255,255,0.25)',
              borderRadius: 6, background: 'rgba(255,255,255,0.12)',
              color: '#fff', cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}
          >
            ✕
          </button>
        </div>

        <div style={{ overflowY: 'auto', flex: 1, padding: '16px 18px' }}>
          {/* Row 1 + Row 2 — unchanged 2-column grid */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div>
              <label style={{ fontSize: 11, fontWeight: 700, color: '#475569', marginBottom: 4, display: 'block' }}>
                DIN Number <span style={{ color: '#B42318' }}>*</span>
              </label>
              <input style={inputStyle} name="din_number" value={form.din_number} onChange={change} placeholder="Enter DIN number" />
            </div>

            <div>
              <label style={{ fontSize: 11, fontWeight: 700, color: '#475569', marginBottom: 4, display: 'block' }}>
                Officer
              </label>
              <Select
                showSearch
                allowClear
                placeholder="Select officer"
                value={form.officer || undefined}
                onChange={(val) => setForm((p) => ({ ...p, officer: val || '' }))}
                optionFilterProp="label"
                style={{ width: '100%' }}
                size="middle"
                getPopupContainer={(trigger) => trigger.parentNode}
                popupMatchSelectWidth={true}
                virtual={false}
                options={[
                  ...OFFICER_OPTIONS.map((o) => ({ value: o, label: o })),
                  { value: 'Other', label: 'Other' },
                ]}
              />
              {form.officer === 'Other' && (
                <input style={{ ...inputStyle, marginTop: 6 }} name="officer_text" value={form.officer_text} onChange={change} placeholder="Enter custom officer name" />
              )}
            </div>

            <div>
              <label style={{ fontSize: 11, fontWeight: 700, color: '#475569', marginBottom: 4, display: 'block' }}>Section</label>
              <input style={inputStyle} name="section" value={form.section} onChange={change} placeholder="e.g. 143(2), 148" />
            </div>

            <div>
              <label style={{ fontSize: 11, fontWeight: 700, color: '#475569', marginBottom: 4, display: 'block' }}>Notice Date</label>
              <input type="date" style={inputStyle} name="notice_date" value={form.notice_date} onChange={change} />
            </div>
          </div>

          {/* Row 3 — dedicated 3-column grid: Due Date / Extended Due Date / PH Date */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12, marginTop: 12 }}>
            <div>
              <label style={{ fontSize: 11, fontWeight: 700, color: '#475569', marginBottom: 4, display: 'block' }}>Due Date</label>
              <input type="date" style={inputStyle} name="due_date" value={form.due_date} onChange={change} />
            </div>

            <div>
              <label style={{ fontSize: 11, fontWeight: 700, color: '#475569', marginBottom: 4, display: 'block' }}>Extended Due Date</label>
              <input type="date" style={inputStyle} name="extended_due_date" value={form.extended_due_date} onChange={change} />
            </div>

            <div>
              <label style={{ fontSize: 11, fontWeight: 700, color: '#475569', marginBottom: 4, display: 'block' }}>PH Date</label>
              <input type="date" style={inputStyle} name="ph_date" value={form.ph_date} onChange={change} />
            </div>
          </div>

          <div style={{ marginTop: 12 }}>
            <label style={{ fontSize: 11, fontWeight: 700, color: '#475569', marginBottom: 4, display: 'block' }}>Notes</label>
            <textarea
              style={{ ...inputStyle, resize: 'vertical', minHeight: 60 }}
              name="notes" value={form.notes} onChange={change} rows={2}
              placeholder="Any additional details about this notice..."
            />
          </div>

          {error && (
            <div style={{
              marginTop: 10, padding: '8px 10px',
              background: '#FCEBEA', border: '1px solid #F2C1BC',
              borderRadius: 6, color: '#B42318', fontSize: 12, fontWeight: 600,
            }}>
              {error}
            </div>
          )}
        </div>

        <div style={{
          padding: '12px 18px', borderTop: '1px solid #E8ECF4',
          display: 'flex', justifyContent: 'flex-end', gap: 8, background: '#F8FAFC',
        }}>
          <button
            onClick={onClose}
            style={{
              padding: '8px 16px', border: '1.5px solid #E8ECF4',
              borderRadius: 6, background: '#fff', cursor: 'pointer',
              fontSize: 12, fontWeight: 600, color: '#475569', fontFamily: 'inherit',
            }}
          >
            Cancel
          </button>
          <button
            onClick={submit} disabled={busy}
            style={{
              padding: '8px 20px', border: 'none', borderRadius: 6,
              cursor: busy ? 'not-allowed' : 'pointer',
              fontSize: 12, fontWeight: 700, color: '#fff', fontFamily: 'inherit',
              background: busy ? '#94A3B8' : 'linear-gradient(135deg, #1E3A6B, #2563EB)',
              boxShadow: busy ? 'none' : '0 3px 12px rgba(37,99,235,0.3)',
              display: 'flex', alignItems: 'center', gap: 6,
              opacity: busy ? 0.7 : 1,
            }}
          >
            {busy ? (isEdit ? 'Updating...' : 'Creating...') : (isEdit ? 'Update Notice' : 'Add Notice')}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}