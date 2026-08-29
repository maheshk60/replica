
import React, { useEffect, useRef, useState, useMemo } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { api } from '../../services/api';
import { MCModal } from './MCModal';
import { useAuth } from '../../contexts/AuthContext';
import LegalAuditTrailTab from './LegalAuditTrailTab';
import ActivityTimelineV2 from './ActivityTimelineV2';
import ReviewTabV2 from './ReviewTabV2';

// ══════════════════════════════════════════════════════════════════════
// LOCAL API DEFINITIONS (used only by this file)
// ══════════════════════════════════════════════════════════════════════


const courtCaseApi = {
  list: (clientId, litigationType,jobId) =>
    api.get('/legal-services/court-cases/', { params: { client: clientId, litigation_type: litigationType, job_id: jobId } }),
  create: (payload) => api.post('/legal-services/court-cases/', payload),
  update: (id, payload) => api.patch(`/legal-services/court-cases/${id}/`, payload),
  delete: (id) => api.delete(`/legal-services/court-cases/${id}/`),
  action: (id, endpoint, body) => api.post(`/legal-services/court-cases/${id}/${endpoint}/`, body),

  // Summary + Daily Updates
  setDescription: (id, description) => api.post(`/legal-services/court-cases/${id}/set-description/`, { description }),
  addStep: (id, note) => api.post(`/legal-services/court-cases/${id}/add-step/`, { note }),

  
};

const reviewApi = {
  list: (params) => api.get('/legal-services/reviews/', { params }),
};


// ══════════════════════════════════════════════════════════════════════
// GLOBAL INLINE STYLES
// ══════════════════════════════════════════════════════════════════════
const GLOBAL_CSS = `
@keyframes cdvPageIn { from { opacity: 0; transform: translateY(6px); } to { opacity: 1; transform: translateY(0); } }
@keyframes cdvPanelIn { from { opacity: 0; transform: translateY(4px); } to { opacity: 1; transform: translateY(0); } }
@keyframes cdvShimmer { 100% { transform: translateX(280%); } }
@keyframes cdvFadeIn { from { opacity: 0; } to { opacity: 1; } }
@keyframes cdvSlideUp { from { opacity: 0; transform: translateY(30px) scale(0.95); } to { opacity: 1; transform: translateY(0) scale(1); } }
@keyframes cdvModalGlow { 0%, 100% { transform: translate(0, 0) scale(1); opacity: 0.5; } 50% { transform: translate(-15px, 15px) scale(1.1); opacity: 0.8; } }
@keyframes cdvScaleIn { from { opacity: 0; transform: scale(0.94) translateY(8px); } to { opacity: 1; transform: scale(1) translateY(0); } }
@keyframes cdvSpin { to { transform: rotate(360deg); } }

.cdv-hover-row:hover { background: #f8f9ff; }
.cdv-hover-doc:hover { background: #eef2ff !important; border-color: #d1d5db !important; }
.cdv-hover-listcat:hover { background: linear-gradient(90deg, #f0f2f8, #f3f5fa) !important; }
.cdv-hover-catcard:hover { border-color: #d1d5db !important; box-shadow: 0 4px 12px rgba(20,20,40,0.08) !important; transform: translateY(-1px); }
.cdv-hover-catcard:hover .cdv-cat-delete-btn { opacity: 1 !important; }
.cdv-input-focus:focus { outline: none; border-color: #16273f !important; box-shadow: 0 0 0 3px rgba(33,66,116,0.1); }
.cdv-cat-delete-btn:hover { background: #fef2f2 !important; color: #dc2626 !important; opacity: 1 !important; }
.cdv-doc-action-btn:hover { background: #eef2ff; color: #16273f; }
.cdv-doc-delete-btn:hover { background: #fef2f2 !important; color: #dc2626 !important; }
.cdv-primary-btn:hover:not(:disabled) { box-shadow: 0 4px 12px rgba(33,66,116,0.3); transform: translateY(-1px); }
.cdv-view-btn:hover { background: #eef2ff; color: #16273f; }
.cdv-breadcrumb-link:hover { background: #eef2ff; color: #16273f; }
.cdv-expanded-doc:hover { box-shadow: 0 2px 8px rgba(0,0,0,0.1); transform: translateX(4px); }
.cdv-team-member-hover:hover { border-color: #d1d5db; box-shadow: 0 1px 3px rgba(0,0,0,0.04); }
.cdv-tab-btn { position: relative; transition: all 0.2s ease; }
.cdv-tab-btn:hover { color: #1a1a2e; }
.cdv-inline-file-picker:hover { border-color: #214274 !important; background: #f5f8ff !important; color: #214274 !important; }
.cdv-info-tile:hover { border-color: #d1d9e6 !important; box-shadow: 0 2px 8px rgba(20,20,40,0.06) !important; }

.cdv-skeleton { overflow: hidden; border-radius: 14px; background: #e9edf3; position: relative; }
.cdv-skeleton::after {
  content: ''; display: block; width: 45%; height: 100%; transform: translateX(-120%);
  background: linear-gradient(90deg, transparent, rgba(255,255,255,0.6), transparent);
  animation: cdvShimmer 1.3s infinite;
}
`;

// ── CONSTANTS ──
const FIELD_LABELS = [
  ['email', 'Email'], ['phone', 'Phone'], ['contact_person', 'Contact Person'],
  ['nature_of_business', 'Nature of Business'], ['constitution_display', 'Constitution'],['group_name', 'Client Group'],['address', 'Address'],
  // ['gstin', 'GSTIN'], ['pan', 'PAN'], ['tan', 'TAN'], ['cin', 'CIN'],
  // ['iec', 'IEC'], ['lei', 'LEI'], ['ksea', 'KSEA'], ['udyam', 'UDYAM'],
  // ['apt', 'APT'], ['ept', 'EPT'], 
  // ['primary_spoc_name', 'Primary SPOC'],
];

const ADMIN_ROLES = ['Admin', 'Founder'];
const ADMIN_ROLES_FULL = ['Admin', 'Founder', 'Manager'];
const ADMIN_ROLES_INFO = ['Admin', 'Founder'];

const getFileMeta = (name = '') => {
  const ext = name.split('.').pop()?.toLowerCase();
  if (ext === 'pdf') return { icon: '📕', bg: '#fecaca', color: '#991b1b' };
  if (['doc', 'docx'].includes(ext)) return { icon: '📘', bg: '#bfdbfe', color: '#1e40af' };
  if (['xls', 'xlsx', 'csv'].includes(ext)) return { icon: '📗', bg: '#bbf7d0', color: '#166534' };
  if (['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(ext)) return { icon: '🖼️', bg: '#fde68a', color: '#92400e' };
  return { icon: '📄', bg: '#f3f4f6', color: '#374151' };
};

const STATUS_META = {
  wip: { label: 'WIP', color: '#f59e0b', bg: '#FEF3C7' },
  open: { label: 'Open', color: '#0ea5e9', bg: '#E0F2FE' },
  closed: { label: 'Closed', color: '#10b981', bg: '#D1FAE5' },
  attention_required: { label: 'Attention Required', color: '#dc2626', bg: '#FEE2E2' },
};

function fmtDate(d) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}

function buildForm(found) {
  return {
    case_title: found.case_title || '',
    court_name: found.court_name || '',
    case_type: found.case_type || '',
    case_number: found.case_number || '',
    appeal_stage: found.appeal_stage || '',
    next_hearing_date: found.next_hearing_date || '',
    adjourned_date: found.adjourned_date || '',
    adjournment_reason: found.adjournment_reason || '',
    notes: found.notes || '',
  };
}

function getFYandAY() {
  const today = new Date();
  const month = today.getMonth() + 1;
  const year = today.getFullYear();
  let fyStart, fyEnd;
  if (month >= 4) { fyStart = year; fyEnd = year + 1; }
  else { fyStart = year - 1; fyEnd = year; }
  const fy = `FY ${fyStart}-${String(fyEnd).slice(-2)}`;
  const ay = `AY ${fyEnd}-${String(fyEnd + 1).slice(-2)}`;
  return { fy, ay };
}

function InfoField({ label, value, icon, accentColor = '#214274' }) {
  const isEmpty = !value || value === '—';
  return (
    <div className="cdv-info-tile" style={{
      display: 'flex', alignItems: 'flex-start', gap: 10,
      padding: '12px 14px',
      background: '#fff',
      border: '1px solid #eef0f5',
      borderRadius: 10,
      transition: 'all 0.15s ease',
      minWidth: 0,
    }}>
      {icon && (
        <div style={{
          width: 32, height: 32, flexShrink: 0,
          borderRadius: 8,
          background: `${accentColor}12`,
          border: `1px solid ${accentColor}25`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 14, color: accentColor,
        }}>
          {icon}
        </div>
      )}
      <div style={{ minWidth: 0, flex: 1 }}>
        <div style={{
          fontSize: 9.5, fontWeight: 700, color: '#94a3b8',
          textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 3,
        }}>
          {label}
        </div>
        <div style={{
          fontSize: 13, fontWeight: 700,
          color: isEmpty ? '#c2c8d2' : '#1f2937',
          lineHeight: 1.3, wordBreak: 'break-word',
        }}>
          {value || '—'}
        </div>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════
// STYLE OBJECTS (shared)
// ══════════════════════════════════════════════════════════════════════
const S = {
  container: { padding: '2px 14px 32px', minHeight: '100%', boxSizing: 'border-box', background: '#f8f9fc' },
  content: { animation: 'cdvPageIn 0.3s ease both' },

  breadcrumb: { display: 'inline-flex', alignItems: 'center', gap: 4, marginBottom: 8 },
  breadcrumbLink: { display: 'flex', alignItems: 'center', gap: 6, color: '#6b7280', fontWeight: 600, cursor: 'pointer', padding: '5px 10px', borderRadius: 8, transition: 'background 0.15s ease, color 0.15s ease' },
  breadcrumbSep: { color: '#d1d5db', fontSize: 12, padding: '0 2px' },
  breadcrumbCurrent: { color: '#1a1a2e', fontWeight: 700, padding: '5px 10px', background: '#f1f2f8', borderRadius: 8 },

  clientHeader: {
    background: '#ffffff',
    border: '1px solid #eef0f5',
    borderRadius: 14,
    marginBottom: 16,
    boxShadow: '0 2px 8px rgba(20,20,40,0.05)',
    overflow: 'hidden',
  },
  headerRow: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 16,
    padding: '14px 20px',
    flexWrap: 'wrap',
  },
  headerLeft: {
    display: 'flex',
    alignItems: 'center',
    gap: 12,
    minWidth: 0,
    flex: '1 1 auto',
  },
  clientAvatar: {
    width: 42, height: 42, flexShrink: 0,
    borderRadius: 10,
    background: 'linear-gradient(135deg, #214274 0%, #205995 100%)',
    color: '#fff',
    display: 'grid', placeItems: 'center',
    fontSize: 16, fontWeight: 800,
    letterSpacing: '-0.02em',
    boxShadow: '0 2px 6px rgba(33,66,116,0.25)',
  },
  headerNameBlock: { minWidth: 0, display: 'flex', flexDirection: 'column', gap: 2 },
  headerName: {
    margin: 0,
    color: '#1a1a2e',
    fontSize: 18, fontWeight: 800,
    letterSpacing: '-0.02em',
    lineHeight: 1.2,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
  headerAyFyRow: { display: 'flex', alignItems: 'center', gap: 6 },
  headerRight: {
    display: 'flex', alignItems: 'center', gap: 8,
    flexShrink: 0,
  },
  statusChip: (meta) => ({
    display: 'inline-flex', alignItems: 'center', gap: 6,
    padding: '6px 12px',
    background: `${meta.color}15`,
    border: `1px solid ${meta.color}35`,
    borderRadius: 10,
    flexShrink: 0,
  }),

  tabsBar: {
    display: 'flex',
    alignItems: 'center',
    gap: 2,
    borderTop: '1px solid #f0f2f6',
    padding: '0 12px',
    background: '#fbfcfd',
  },
  tabBtn: (active) => ({
    display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 6,
    padding: '11px 18px', border: 'none',
    borderBottom: `2px solid ${active ? '#214274' : 'transparent'}`,
    borderRadius: 0, background: 'transparent',
    color: active ? '#1a1a2e' : '#6b7280',
    fontSize: 12.5, fontWeight: active ? 700 : 600,
    cursor: 'pointer', whiteSpace: 'nowrap',
  }),
  tabCount: (active) => ({
    display: 'inline-grid', placeItems: 'center', minWidth: 18, height: 18,
    padding: '0 5px', borderRadius: 999,
    background: active ? '#214274' : '#e5e7eb',
    color: active ? '#fff' : '#4b5563',
    fontSize: 9.5, fontWeight: 700,
  }),
  tabContent: { animation: 'cdvPanelIn 0.2s ease both' },

  detailsGrid: { display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 0, background: '#fff', border: '1px solid #e9edf4', borderRadius: 14, overflow: 'hidden', boxShadow: '0 2px 8px rgba(20,20,40,0.05)' },
  detailRow: (isLastCol) => ({ display: 'flex', alignItems: 'center', padding: '15px 20px', borderBottom: '1px solid #f3f4f8', borderRight: isLastCol ? 'none' : '1px solid #f3f4f8' }),
  detailLabel: { minWidth: 160, flex: '0 0 160px', color: '#9ca3af', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em' },
  detailValue: (empty) => ({ flex: 1, color: empty ? '#c2c8d2' : '#1f2937', fontSize: 13.5, fontWeight: empty ? 500 : 600, overflowWrap: 'anywhere', wordBreak: 'break-word', lineHeight: 1.4 }),

  docControls: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' },
  searchBox: { position: 'relative', flex: 1, minWidth: 250 },
  searchInput: { width: '100%', boxSizing: 'border-box', padding: '9px 12px 9px 36px', border: '1px solid #eef0f5', borderRadius: 8, fontSize: 13, background: '#fff', fontFamily: 'inherit', transition: 'all 0.15s ease' },
  filterSelect: { border: '1px solid #e5e7eb', borderRadius: 9, padding: '9px 12px', fontSize: 13, color: '#374151', background: '#fff', cursor: 'pointer', minWidth: 160 },
  viewControls: { display: 'flex', alignItems: 'center', gap: 6, padding: 4, background: '#f5f6fb', borderRadius: 8 },
  viewBtn: (active) => ({ width: 32, height: 32, border: 'none', background: active ? '#fff' : 'transparent', borderRadius: 6, cursor: 'pointer', color: active ? '#16273f' : '#6b7280', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: active ? '0 1px 3px rgba(20,20,40,0.04)' : 'none' }),

  categoriesGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: 14, alignItems: 'start' },
  categoryCard: { background: '#fff', border: '1px solid #eef0f5', borderRadius: 12, padding: 14, display: 'flex', flexDirection: 'column', minHeight: 220, boxShadow: '0 1px 3px rgba(20,20,40,0.03)', transition: 'all 0.15s ease' },
  categoryHeader: { display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8, marginBottom: 14, paddingBottom: 10, borderBottom: '1px solid #f0f2f6' },
  categoryTitleWrap: { display: 'flex', alignItems: 'center', gap: 10, flex: 1 },
  categoryTitle: { margin: 0, color: '#1a1a2e', fontSize: 13, fontWeight: 700, lineHeight: 1.3 },
  docCount: { background: '#214274', color: 'white', padding: '2px 8px', borderRadius: 12, fontSize: 10, fontWeight: 600 },
  catDeleteBtn: { width: 24, height: 24, flexShrink: 0, border: 'none', background: 'transparent', borderRadius: 5, color: '#d1d5db', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 0, opacity: 0, transition: 'all 0.15s ease' },
  categoryDocs: { display: 'flex', flexDirection: 'column', gap: 8, flex: 1, marginBottom: 14, overflowY: 'auto', maxHeight: 180 },
  docListItem: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, padding: 8, borderRadius: 6, background: '#f8f9fc', border: '1px solid #eef0f5', transition: 'all 0.15s ease' },
  docItemInfo: { display: 'flex', alignItems: 'center', gap: 8, flex: 1, minWidth: 0, cursor: 'pointer' },
  docBadge: (bg) => ({ display: 'grid', placeItems: 'center', width: 28, height: 28, flexShrink: 0, borderRadius: 6, background: bg, fontSize: 14 }),
  docItemName: { overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: '#1a1a2e', fontSize: 11.5, fontWeight: 600 },
  docItemActions: { display: 'flex', alignItems: 'center', gap: 4, flexShrink: 0 },
  docActionBtn: { width: 26, height: 26, border: 'none', background: 'transparent', borderRadius: 5, color: '#6b7280', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 0, transition: 'all 0.15s ease' },
  categoryEmpty: { padding: '16px 12px', textAlign: 'center', color: '#9ca3af', fontSize: 12, fontWeight: 500 },
  categoryFooter: { marginTop: 'auto', paddingTop: 10, borderTop: '1px solid #f0f2f6' },
  categoryFooterUploadBtn: { width: '100%', padding: '9px 14px', border: 'none', borderRadius: 7, background: 'linear-gradient(135deg, #214274 0%, #205995 100%)', color: '#fff', fontSize: 12.5, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7, transition: 'all 0.15s ease', fontFamily: 'inherit' },

  customAddCardInline: {
    background: 'linear-gradient(135deg, #ffffff 0%, #fafbff 100%)',
    border: '1.5px solid #d4dbf0',
    borderRadius: 12,
    padding: 14,
    display: 'flex',
    flexDirection: 'column',
    minHeight: 220,
    boxShadow: '0 1px 3px rgba(20,20,40,0.03)',
    transition: 'all 0.15s ease',
  },
  customAddInlineHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    marginBottom: 14,
    paddingBottom: 10,
    borderBottom: '1px solid #eef0f5',
  },
  customAddInlineIcon: {
    width: 28, height: 28,
    borderRadius: 7,
    background: 'linear-gradient(135deg, #214274, #205995)',
    color: '#fff',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    flexShrink: 0,
    boxShadow: '0 2px 4px rgba(33,66,116,0.25)',
  },
  customAddInlineTitle: {
    margin: 0,
    fontSize: 13,
    fontWeight: 700,
    color: '#1a1a2e',
    letterSpacing: '-0.01em',
    lineHeight: 1.3,
  },
  customAddInlineBody: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    gap: 10,
    marginBottom: 12,
  },
  customAddInlineField: {
    display: 'flex',
    flexDirection: 'column',
    gap: 5,
  },
  customAddInlineLabel: {
    fontSize: 10,
    fontWeight: 700,
    color: '#4b5563',
    textTransform: 'uppercase',
    letterSpacing: '0.04em',
    display: 'flex',
    alignItems: 'center',
    gap: 4,
  },
  customAddInlineInput: {
    padding: '8px 10px',
    border: '1.5px solid #e5e9f2',
    borderRadius: 7,
    fontSize: 12.5,
    fontFamily: 'inherit',
    background: '#fff',
    color: '#1a1a2e',
    outline: 'none',
    transition: 'all 0.15s ease',
    boxSizing: 'border-box',
    width: '100%',
  },
  customAddInlineFilePicker: (hasFile) => ({
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    padding: '8px 10px',
    border: `1.5px solid ${hasFile ? '#214274' : '#e5e9f2'}`,
    borderRadius: 7,
    background: hasFile ? 'linear-gradient(135deg, #f5f8ff, #eef2ff)' : '#fafbfd',
    color: hasFile ? '#214274' : '#6b7280',
    fontSize: 11.5,
    fontWeight: 600,
    cursor: 'pointer',
    transition: 'all 0.15s ease',
    fontFamily: 'inherit',
    overflow: 'hidden',
  }),
  customAddInlineFileText: {
    flex: 1,
    minWidth: 0,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
  customAddInlineFileClear: {
    width: 18, height: 18,
    borderRadius: '50%',
    background: '#fef2f2',
    color: '#dc2626',
    border: 'none',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
    fontSize: 12,
    fontWeight: 700,
    padding: 0,
  },
  customAddInlineError: {
    padding: '6px 9px',
    background: '#fef2f2',
    border: '1px solid #fecaca',
    borderRadius: 6,
    color: '#dc2626',
    fontSize: 10.5,
    fontWeight: 600,
  },
  customAddInlineFooter: {
    marginTop: 'auto',
    paddingTop: 10,
    borderTop: '1px solid #f0f2f6',
  },
  customAddInlineSubmitBtn: (disabled) => ({
    width: '100%',
    padding: '9px 14px',
    border: 'none',
    borderRadius: 7,
    background: disabled ? '#cbd3e0' : 'linear-gradient(135deg, #214274 0%, #205995 100%)',
    color: '#fff',
    fontSize: 12.5,
    fontWeight: 700,
    cursor: disabled ? 'not-allowed' : 'pointer',
    fontFamily: 'inherit',
    boxShadow: disabled ? 'none' : '0 2px 6px rgba(33,66,116,0.25)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    transition: 'all 0.15s ease',
  }),

  listView: { display: 'flex', flexDirection: 'column', gap: 14 },
  tableWrap: { background: '#ffffff', border: '1px solid #eef0f5', borderRadius: 12, overflow: 'hidden', boxShadow: '0 2px 8px rgba(20,20,40,0.05)' },
  table: { width: '100%', borderCollapse: 'collapse', fontSize: 13 },
  tableTh: { textAlign: 'left', padding: '12px 16px', fontWeight: 700, color: '#4b5563', fontSize: 11.5, textTransform: 'uppercase', letterSpacing: '0.04em', borderBottom: '1px solid #eef0f5', background: 'linear-gradient(90deg, #f5f6fb, #f8f9fc)' },
  tableTd: { padding: '14px 16px', color: '#1a1a2e', borderBottom: '1px solid #f3f4f8' },
  catRow: { cursor: 'pointer', background: 'linear-gradient(90deg, #f5f6fb, #f8f9fc)', transition: 'all 0.2s' },
  catRowTd: { borderBottom: '1px solid #e9edf4', padding: '11px 16px' },
  catIdx: { color: '#9ca3af', fontSize: 12, fontWeight: 700, textAlign: 'center' },
  catLabelWrap: { display: 'flex', alignItems: 'center', gap: 8 },
  toggleIcon: (expanded) => ({ width: 16, height: 16, transition: 'transform 0.3s ease', color: '#214274', transform: expanded ? 'rotate(180deg)' : 'rotate(0deg)' }),
  catLabel: { display: 'inline-block', color: '#1a1a2e', fontSize: 13, fontWeight: 700, marginRight: 8 },
  catCount: { display: 'inline-block', padding: '2px 8px', borderRadius: 999, background: '#e5e7eb', color: '#6b7280', fontSize: 10.5, fontWeight: 600 },
  actionsRow: { display: 'flex', alignItems: 'center', gap: 6 },
  uploadBtnInline: { display: 'inline-flex', alignItems: 'center', gap: 6, padding: '6px 12px', background: 'linear-gradient(135deg, #214274 0%, #205995 100%)', color: 'white', border: 'none', borderRadius: 8, fontSize: 12, fontWeight: 600, cursor: 'pointer', whiteSpace: 'nowrap', transition: 'all 0.2s' },
  expandedRowTd: { padding: 0, background: '#f9fafb' },
  expandedWrap: { padding: '16px 24px', borderTop: '1px solid #e5e7eb' },
  expandedItem: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px', background: 'white', borderRadius: 8, marginBottom: 8, border: '1px solid #e5e7eb', transition: 'all 0.2s' },
  expandedInfo: { display: 'flex', alignItems: 'center', gap: 12, flex: 1, cursor: 'pointer' },
  expandedName: { fontWeight: 500, color: '#374151' },
  expandedActions: { display: 'flex', gap: 8 },
  expandedEmpty: { padding: 20, textAlign: 'center', color: '#6b7280', fontStyle: 'italic' },
  tableEmpty: { textAlign: 'center', color: '#9ca3af', padding: '32px 16px', fontSize: 13 },

  modalOverlay: { position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(15,23,42,0.55)', backdropFilter: 'blur(6px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, animation: 'cdvFadeIn 0.2s ease', padding: 20 },
  confirmModal: { background: 'white', borderRadius: 12, padding: 24, width: '90%', maxWidth: 380, textAlign: 'center', boxShadow: '0 10px 25px rgba(0,0,0,0.2)', animation: 'cdvSlideUp 0.2s ease' },
  confirmIcon: { fontSize: 40, marginBottom: 10 },
  confirmTitle: { margin: '0 0 10px', color: '#1a1a2e', fontSize: 18, fontWeight: 700 },
  confirmText: { margin: '0 0 20px', color: '#6b7280', fontSize: 14, lineHeight: 1.5 },
  confirmActions: { display: 'flex', gap: 10, justifyContent: 'center' },
  confirmCancelBtn: { padding: '8px 20px', borderRadius: 6, border: 'none', fontWeight: 600, fontSize: 13, cursor: 'pointer', background: '#f3f4f6', color: '#374151' },
  confirmDeleteBtn: { padding: '8px 20px', borderRadius: 6, border: 'none', fontWeight: 600, fontSize: 13, cursor: 'pointer', background: '#dc2626', color: 'white' },

  teamSection: { display: 'flex', flexDirection: 'column', gap: 16 },
  jobInfoCard: {
    background: 'linear-gradient(135deg, #ffffff 0%, #fafbfd 100%)',
    border: '1px solid #e9edf4',
    borderRadius: 14,
    overflow: 'hidden',
    boxShadow: '0 2px 8px rgba(20,20,40,0.05)',
  },
  jobInfoHeader: {
    display: 'flex', alignItems: 'center', gap: 10,
    padding: '14px 20px',
    background: 'linear-gradient(90deg, #f5f7fb 0%, #eef2ff 100%)',
    borderBottom: '1px solid #e9edf4',
  },
  jobInfoHeaderIcon: {
    width: 32, height: 32, borderRadius: 8,
    background: 'linear-gradient(135deg, #214274, #205995)',
    color: '#fff',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    fontSize: 14, fontWeight: 700, flexShrink: 0,
    boxShadow: '0 2px 6px rgba(33,66,116,0.3)',
  },
  jobInfoTitle: { fontSize: 14, fontWeight: 800, color: '#1a1a2e', letterSpacing: '-0.01em' },
  jobInfoSubtitle: { fontSize: 11, color: '#6b7280', marginTop: 1, fontWeight: 500 },
  jobInfoGrid: {
    padding: 16,
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
    gap: 10,
  },

  teamGrid: { display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 16 },
  teamCard: { border: '1px solid #e9edf4', borderRadius: 12, padding: 18, background: '#fff', boxShadow: '0 1px 3px rgba(20,20,40,0.04)' },
  teamHeader: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14, paddingBottom: 12, borderBottom: '1px solid #e9edf4' },
  teamRole: { display: 'flex', alignItems: 'center', gap: 8, fontSize: 13.5, fontWeight: 700, color: '#1a1a2e' },
  teamCount: { display: 'inline-block', padding: '3px 10px', borderRadius: 999, background: '#eef2ff', color: '#4338ca', fontSize: 11, fontWeight: 700 },
  teamMembers: { display: 'flex', flexDirection: 'column', gap: 10 },
  teamEmpty: { padding: '24px 16px', textAlign: 'center', color: '#9ca3af', fontSize: 13, fontStyle: 'italic', background: '#f8f9fc', borderRadius: 8, border: '1px dashed #e5e7eb' },
  teamMember: { display: 'flex', alignItems: 'center', gap: 12, padding: 12, border: '1px solid #eef0f5', borderRadius: 10, background: '#fafbfd', transition: 'all 0.15s ease' },
  memberAvatar: { display: 'grid', placeItems: 'center', width: 38, height: 38, flex: '0 0 38px', borderRadius: 10, background: 'linear-gradient(135deg, #214274 0%, #205995 100%)', color: '#fff', fontSize: 14, fontWeight: 700, boxShadow: '0 2px 4px rgba(33,66,116,0.2)' },
  memberInfo: { minWidth: 0, flex: 1 },
  memberName: { color: '#1a1a2e', fontSize: 13, fontWeight: 700, lineHeight: 1.3 },
  memberRoleLabel: { color: '#6b7280', fontSize: 10.5, fontWeight: 600, marginTop: 2, textTransform: 'uppercase', letterSpacing: '0.04em' },

  state: { padding: 40, textAlign: 'center', color: '#6b7280', fontSize: 14.5, background: '#ffffff', borderRadius: 14, border: '1px solid #eef0f5' },
  error: { padding: 40, textAlign: 'center', fontSize: 14.5, background: '#fef2f2', borderRadius: 14, border: '1px solid #fecaca', color: '#dc2626' },
  empty: { display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '60px 20px', background: '#ffffff', borderRadius: 14, border: '1px solid #eef0f5', color: '#6b7280', fontSize: 14.5, boxShadow: '0 2px 8px rgba(20,20,40,0.05)' },
  emptyIcon: { fontSize: 40, marginBottom: 12, opacity: 0.7 },

  loading: { display: 'grid', gap: 14 },
  skelCrumb: { height: 18, width: 220 },
  skelHeader: { height: 68 },
  skelCard: { height: 300 },

  addCaseBtn: { padding: '9px 18px', border: 'none', borderRadius: 8, background: 'linear-gradient(135deg, #214274 0%, #205995 100%)', color: '#fff', fontSize: 12.5, fontWeight: 700, cursor: 'pointer', boxShadow: '0 2px 6px rgba(33,66,116,0.25)' },

  errorBanner: { padding: '10px 14px', background: '#fef2f2', color: '#dc2626', border: '1px solid #fecaca', borderRadius: 8, fontSize: 12.5, fontWeight: 600, marginBottom: 12 },

  headerAyFyText: { fontSize: 12, fontWeight: 600, color: '#6b7280', letterSpacing: '0.01em' },
  headerAyFyDot: { width: 3, height: 3, borderRadius: '50%', background: '#c8cdd6', display: 'inline-block' },

  infoChip: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 10,
    padding: '7px 14px',
    background: '#F5F7FB',
    border: '1px solid #E4E8F0',
    borderRadius: 10,
    minWidth: 0,
    maxWidth: 300,
    minHeight: 44,
    boxSizing: 'border-box',
  },
  infoChipIcon: { fontSize: 14, flexShrink: 0, width: 14, display: 'flex', alignItems: 'center', justifyContent: 'center' },
  infoChipBody: { display: 'flex', flexDirection: 'column', minWidth: 0, gap: 2 },
  infoChipLabel: { fontSize: 9, fontWeight: 700, color: '#6b7fa8', textTransform: 'uppercase', letterSpacing: '0.06em', whiteSpace: 'nowrap' },
  infoChipValue: { fontSize: 12.5, fontWeight: 700, color: '#16273f', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', lineHeight: 1.2 },

  editFormGrid: { display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 16, padding: 20, background: '#fff', border: '1px solid #e9edf4', borderRadius: 14 },
  formField: { display: 'flex', flexDirection: 'column', gap: 4 },
  formLabel: { fontSize: 11, fontWeight: 700, color: '#7A7F99', textTransform: 'uppercase', letterSpacing: '0.04em' },
  formInput: { padding: '9px 11px', border: '1.5px solid #e5e7eb', borderRadius: 7, fontSize: 13, fontFamily: 'inherit', background: '#fff', color: '#1a1a2e', outline: 'none' },
  formSelect: { padding: '9px 11px', border: '1.5px solid #e5e7eb', borderRadius: 7, fontSize: 13, fontFamily: 'inherit', background: '#fff', color: '#1a1a2e', outline: 'none' },
  formTextarea: { padding: '9px 11px', border: '1.5px solid #e5e7eb', borderRadius: 7, fontSize: 13, fontFamily: 'inherit', background: '#fff', color: '#1a1a2e', outline: 'none', resize: 'vertical' },

  labelModalCancelBtn: {
    padding: '9px 18px',
    border: '1.5px solid #e5e9f2',
    borderRadius: 8,
    background: '#fff',
    color: '#6b7280',
    fontSize: 12.5, fontWeight: 600,
    cursor: 'pointer', fontFamily: 'inherit',
    transition: 'all 0.15s ease',
  },
  labelModalSubmitBtn: (disabled) => ({
    padding: '9px 22px',
    border: 'none', borderRadius: 8,
    background: disabled ? '#cbd3e0' : 'linear-gradient(135deg, #214274 0%, #205995 100%)',
    color: '#fff',
    fontSize: 12.5, fontWeight: 700,
    cursor: disabled ? 'not-allowed' : 'pointer',
    fontFamily: 'inherit',
    boxShadow: disabled ? 'none' : '0 3px 10px rgba(33,66,116,0.28)',
    display: 'flex', alignItems: 'center', gap: 7,
    transition: 'all 0.15s ease',
  }),
};




export default function LegalWorkSpace() {

  const { clientId } = useParams();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user } = useAuth();

  const isInvalidClient = !clientId || clientId === 'undefined' || clientId === 'null';

  const caseType = searchParams.get('type') || 'tds';
  const litigationEndpoint = caseType === 'income-tax' ? 'income-tax-litigations' : 'tds-litigations';
  const caseId = searchParams.get('caseId');   

  const fileInputRefs = useRef({});

  const [client, setClient] = useState(null);
  const [caseData, setCaseData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [activeTab, setActiveTab] = useState(() => {
    return searchParams.get('tab') || 'details';
  });

  const [refreshTick, setRefreshTick] = useState(0);
  const bumpRefresh = () => setRefreshTick((t) => t + 1);

  useEffect(() => {
    const params = new URLSearchParams(searchParams);
    // ✅ Always set tab in URL (even for details) so refresh preserves it
    params.set('tab', activeTab);
    const newSearch = params.toString();
    const newUrl = `${window.location.pathname}${newSearch ? '?' + newSearch : ''}`;
    window.history.replaceState(null, '', newUrl);
    // eslint-disable-next-line
  }, [activeTab]);

  const [showMCModal, setShowMCModal] = useState(false);
  const [docViewMode, setDocViewMode] = useState('grid');
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [teamLoading, setTeamLoading] = useState(false);


  const [deleteModal, setDeleteModal] = useState({ open: false, type: '', id: null });

  const [constitutions, setConstitutions] = useState([]);
  useEffect(() => {
    api.get('/clients/constitutions/')
      .then((res) => setConstitutions(res.data.results || res.data || []))
      .catch(() => setConstitutions([]));
  }, []);


  useEffect(() => {
    if (isInvalidClient) return;

    let active = true;
    setLoading(true);
    setError(null);

    api.get(`/legal-services/client/${clientId}/`)
      .then((res) => {
        if (active) setClient(res.data);
      })
      .catch(() => {
        if (!active) return;
        // Fallback to original endpoint
        api.get(`/clients/clients/${clientId}/`)
          .then((res) => { if (active) setClient(res.data); })
          .catch(() => { if (active) setError('Failed to load client details.'); });
      })
      .finally(() => { if (active) setLoading(false); });

    return () => { active = false; };
  }, [clientId]);



  useEffect(() => {
    if (isInvalidClient) return;
    if (!clientId) return;
    setTeamLoading(true);

    // ✅ If caseId is present, fetch that SPECIFIC job
    const fetchUrl = caseId
      ? `/legal-services/${litigationEndpoint}/${caseId}/`
      : `/legal-services/${litigationEndpoint}/?client=${clientId}`;

    api.get(fetchUrl)
      .then((res) => {
        if (caseId) {
          // Single object response
          const c = res.data;
          setCaseData({
            ...c,
            assessment_year: c.assessment_year || 'Assessment Year',
            period: c.period || '',
            makers: c.makers || [],
            checkers: c.checkers || [],
          });
        } else {
          // List response (backward compatible — takes first)
          const cases = Array.isArray(res.data) ? res.data : (res.data.results || []);
          if (cases && cases.length > 0) {
            setCaseData({
              ...cases[0],
              assessment_year: cases[0].assessment_year || 'Assessment Year',
              period: cases[0].period || '',
              makers: cases[0].makers || [],
              checkers: cases[0].checkers || [],
            });
          } else {
            setCaseData(null);
          }
        }
      })
      .catch(() => setCaseData(null))
      .finally(() => setTeamLoading(false));
  }, [clientId, litigationEndpoint, caseId]);   

  const [combinedMakerIds, setCombinedMakerIds] = useState([]);
  useEffect(() => {
    if (isInvalidClient) return;
    if (!clientId) return;
    Promise.all([
      api.get(`/legal-services/tds-litigations/?client=${clientId}`).catch(() => ({ data: [] })),
      api.get(`/legal-services/income-tax-litigations/?client=${clientId}`).catch(() => ({ data: [] })),
    ]).then(([tdsRes, itRes]) => {
      const tdsCases = Array.isArray(tdsRes.data) ? tdsRes.data : (tdsRes.data.results || []);
      const itCases = Array.isArray(itRes.data) ? itRes.data : (itRes.data.results || []);
      const ids = new Set();
      [...tdsCases, ...itCases].forEach((c) => (c.makers || []).forEach((m) => ids.add(m.id)));
      setCombinedMakerIds(Array.from(ids));
    });
  }, [clientId]);


  const activityLitigationType = caseType === 'income-tax' ? 'income-tax' : 'tds';
  const [activityCase, setActivityCase] = useState(null);
  const [activityLoading, setActivityLoading] = useState(false);
  const [activityError, setActivityError] = useState(null);
  const [creatingCase, setCreatingCase] = useState(false);

  const [noticeHtmlReplies, setNoticeHtmlReplies] = useState({});
  const [noticeDocsMap, setNoticeDocsMap] = useState({});

  useEffect(() => {
    if (!activityCase?.notices?.length) {
      setNoticeHtmlReplies({});
      setNoticeDocsMap({});
      return;
    }

    let cancelled = false;

    Promise.all(
      activityCase.notices.map((n) =>
        Promise.all([
          api.get(`/legal-services/notices/${n.id}/`)
            .then((res) => res.data)
            .catch(() => null),
          api.get('/legal-services/notice-replies/', { params: { notice: n.id } })
            .then((res) => {
              const list = Array.isArray(res.data) ? res.data : (res.data.results || []);
              return list;
            })
            .catch(() => []),
        ]).then(([noticeDetail, htmlReplies]) => ({
          noticeId: n.id,
          documents: noticeDetail?.documents || [],
          htmlReplies: htmlReplies.filter((r) => r.status === 'approved'),
        }))
      )
    ).then((results) => {
      if (cancelled) return;
      const htmlMap = {};
      const docsMap = {};
      results.forEach(({ noticeId, documents, htmlReplies }) => {
        htmlMap[noticeId] = htmlReplies;
        docsMap[noticeId] = documents;
      });
      setNoticeHtmlReplies(htmlMap);
      setNoticeDocsMap(docsMap);
    });

    return () => { cancelled = true; };
  }, [activityCase?.id, activityCase?.notices, refreshTick]);   


  const openDeleteModal = (type, id) => setDeleteModal({ open: true, type, id });

  const handleView = (doc) => {
    const url = doc.file_url || doc.file;
    if (url) window.open(url, '_blank', 'noopener,noreferrer');
  };

  const handleDownload = async (doc) => {
    const url = doc.file_url;
    if (!url) return;
    try {
      const response = await fetch(url);
      const blob = await response.blob();
      const objectUrl = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = objectUrl;
      link.download = doc.file_name || doc.document_name || 'download';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(objectUrl);
    } catch (err) {
      console.error('Download failed:', err);
    }
  };

  const handleOpenHtmlReply = (reply) => {
    const title = (reply.title || 'Reply').replace(/</g, '&lt;');
    const html = `<!DOCTYPE html><html><head><meta charset="UTF-8"><title>${title}</title>
      <style>body{font-family:'Times New Roman',serif;font-size:12pt;max-width:800px;margin:40px auto;padding:20px;line-height:1.5}
      table{border-collapse:collapse;width:100%}td,th{border:1px solid #999;padding:6px 10px}</style></head>
      <body>${reply.content_html || ''}</body></html>`;
    window.open(URL.createObjectURL(new Blob([html], { type: 'text/html' })), '_blank');
  };

  const handleDownloadHtmlReply = async (reply) => {
    const content = reply.content_html || '';
    if (!content.trim()) return;
    try {
      const { default: html2pdf } = await import('html2pdf.js');
      const wrapper = document.createElement('div');
      wrapper.style.cssText = "font-family:'Times New Roman',serif;font-size:12pt;line-height:1.5;padding:20px;background:#fff;width:700px";
      wrapper.innerHTML = content;
      document.body.appendChild(wrapper);
      await html2pdf()
        .set({
          margin: [0.8, 0.8, 0.8, 0.8],
          filename: `${(reply.title || 'reply').replace(/[^a-z0-9]/gi, '_')}.pdf`,
          image: { type: 'jpeg', quality: 0.98 },
          html2canvas: { scale: 2, useCORS: true },
          jsPDF: { unit: 'in', format: 'a4', orientation: 'portrait' },
        })
        .from(wrapper)
        .save();
      document.body.removeChild(wrapper);
    } catch (e) {
      console.error(e);
      alert('PDF download failed');
    }
  };



  const handleMCAssigned = (updatedCase) => { setCaseData(updatedCase); setShowMCModal(false); };

  const { fy, ay } = getFYandAY();

  const [pendingReview, setPendingReview] = useState(null);
  const [activeReviewCount, setActiveReviewCount] = useState(0); 

  const loadPendingReview = () => {
    if (!activityCase?.id) { 
      setPendingReview(null); 
      setActiveReviewCount(0); 
      return; 
    }
    reviewApi.list({ court_case: activityCase.id })
      .then((res) => {
        const data = Array.isArray(res.data) ? res.data : (res.data.results || []);
        const active = data
          .filter((r) => r.status === 'pending' || r.status === 'escalated')
          .sort((a, b) => new Date(b.submitted_at) - new Date(a.submitted_at));
        setPendingReview(active[0] || null);
        setActiveReviewCount(active.length); 
      })
      .catch(() => {
        setPendingReview(null);
        setActiveReviewCount(0); 
      });
  };

  useEffect(() => {
    loadPendingReview();
    // eslint-disable-next-line
  }, [activityCase?.id, refreshTick]);


  const loadActivityCase = () => {
    if (!caseData?.id) {
      setActivityCase(null);
      return;
    }

    setActivityLoading(true);
    setActivityError(null);

    courtCaseApi.list(clientId, activityLitigationType, caseData.id)
      .then((res) => {
        const data = Array.isArray(res.data) ? res.data : (res.data.results || []);
        const matchingCase = data.find((cc) =>
          cc.litigation_type === activityLitigationType &&
          cc.job_id === caseData.id
        );
        if (matchingCase) {
          setActivityCase(matchingCase);
        } else {
          setActivityCase(null);
        }
      })
      .catch((err) => {
        // ✅ Graceful error handling
        console.error("Case Fetch Error:", err);
        setActivityError('You do not have permission to view this case, or it does not exist.');
      })
      .finally(() => setActivityLoading(false));
  };




  useEffect(() => {
    if (clientId && caseData) loadActivityCase();
    // eslint-disable-next-line
  }, [clientId, litigationEndpoint, caseData?.id]);

  const handleAddCase = async () => {
    setCreatingCase(true);
    setActivityError(null);
    try {
      const res = await courtCaseApi.create({
        client: clientId,
        litigation_type: activityLitigationType,
        case_title: caseData?.sub_service_name || 'Untitled Case',
        job_id: caseData?.id,
        status: 'wip',
      });
      setActivityCase(res.data);
    } catch (err) {
      console.error('Create case failed:', err.response?.data || err);
      setActivityError('Failed to create case.');
    } finally { setCreatingCase(false); }
  };

  const canEditActivity = (caseData?.makers || []).some((m) => m.id === user?.id);
  // const canLogOutcome = user?.role === 'Founder';
  const [editingInfo, setEditingInfo] = useState(false);
  const [infoForm, setInfoForm] = useState(null);
  const [infoSaving, setInfoSaving] = useState(false);
  const [infoSaveError, setInfoSaveError] = useState(null);

  const canEditClientInfo = (caseData?.makers || []).some((m) => m.id === user?.id) || combinedMakerIds.includes(user?.id);
  const canDeleteDocuments = ['Founder', 'Manager'].includes(user?.role);

  const startEditInfo = () => {
    setInfoForm({
      name: client.name || '', email: client.email || '', phone: client.phone || '',
      address: client.address || '', nature_of_business: client.nature_of_business || '',
      contact_person: client.contact_person || '', constitution: client.constitution || '',
      cin: client.cin || '', pan: client.pan || '', gstin: client.gstin || '',
      iec: client.iec || '', ksea: client.ksea || '', udyam: client.udyam || '',
      apt: client.apt || '', ept: client.ept || '', tan: client.tan || '', lei: client.lei || '',
    });
    setInfoSaveError(null);
    setEditingInfo(true);
  };

  const handleInfoFormChange = (e) => {
    const { name, value } = e.target;
    setInfoForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleInfoSave = async () => {
    setInfoSaving(true);
    setInfoSaveError(null);
    try {
      // ✅ Step 1 — Save to original endpoint
      await api.patch(
        `/clients/clients/${clientId}/`,
        infoForm,
        {
          headers: {
            'X-Litigation-Type': activityLitigationType,
            'X-Court-Case-Id': activityCase?.id?.toString() || '',
            'X-Job-Id': caseData?.id?.toString() || '',
          },
        }
      );

      // ✅ Step 2 — Re-fetch from legal endpoint to get unmasked data
      const freshRes = await api.get(`/legal-services/client/${clientId}/`);
      setClient(freshRes.data);

      setEditingInfo(false);
      bumpRefresh();
    } catch (err) {
      setInfoSaveError(
        err.response?.data
          ? JSON.stringify(err.response.data)
          : 'Failed to save changes.'
      );
    } finally {
      setInfoSaving(false);
    }
  };

  const executeDelete = async () => {
    const { type, id } = deleteModal;
    try {
      if (type === 'case') {
        await courtCaseApi.delete(id);
        setActivityCase(null);
      }
      // label / doc deletes removed — files live on notices; delete only in Activity
      bumpRefresh();
    } catch (err) {
      console.error('Delete failed', err);
    } finally {
      setDeleteModal({ open: false, type: '', id: null });
    }
  };

  if (isInvalidClient) {
    return (
      <div style={{ padding: '60px 20px', textAlign: 'center', fontFamily: 'inherit', background: '#f8f9fc', minHeight: '100vh' }}>
        <h2 style={{ color: '#dc2626', marginBottom: 8 }}>Invalid Case Link</h2>
        <p style={{ color: '#6b7280', marginBottom: 20 }}>We couldn't find valid client details for this link.</p>
        <button 
          onClick={() => navigate('/legal-services/litigations')}
          style={{ padding: '10px 20px', background: '#1A2F5A', color: 'white', border: 'none', borderRadius: 8, cursor: 'pointer', fontWeight: 600 }}
        >
          Return to Dashboard
        </button>
      </div>
    );
  }


  if (loading) return (
    <div style={S.container}>
      <style>{GLOBAL_CSS}</style>
      <div style={S.loading}>
        <div className="cdv-skeleton" style={S.skelCrumb} />
        <div className="cdv-skeleton" style={S.skelHeader} />
        <div className="cdv-skeleton" style={S.skelCard} />
      </div>
    </div>
  );
  if (error) return <div style={S.container}><style>{GLOBAL_CSS}</style><div style={S.error}>{error}</div></div>;
  if (!client) return <div style={S.container}><style>{GLOBAL_CSS}</style><div style={S.state}>No client data found</div></div>;

  const clientInitial = (client.name || '?').charAt(0).toUpperCase();
  const activityStatus = activityCase?.computed_status || activityCase?.status || 'wip';
  const statusMeta = STATUS_META[activityStatus] || STATUS_META.wip;

  const constitutionDisplay = (() => {
    if (client.constitution_name) return client.constitution_name;
    if (client.constitution) {
      const found = constitutions.find(
        (x) => x.id === client.constitution || x.id === Number(client.constitution)
      );
      return found ? found.name : '';
    }
    return '';
  })();

  const clientDisplay = { ...client, constitution_display: constitutionDisplay };

  const linkedTask = caseData?.linked_task || null;

  const TASK_STATUS_META = {
    'To Do':       { label: 'TO DO',        bg: '#ecfdf3', color: '#027a48' },
    'In Progress': { label: 'IN PROGRESS',  bg: '#eff6ff', color: '#1d4ed8' },
    'Done':        { label: 'DONE',         bg: '#f3f4f6', color: '#374151' },
    'Over Due':    { label: 'OVER DUE',     bg: '#fef2f2', color: '#dc2626' },
  };

  const fmtDateTime = (value) => {
    if (!value) return '—';
    return new Date(value).toLocaleString('en-IN', {
      day: '2-digit', month: 'short', year: 'numeric',
      hour: '2-digit', minute: '2-digit',
    });
  };

  const canAddCase = (caseData?.makers || []).some((m) => m.id === user?.id);

  return (
    <main style={S.container}>
      <style>{GLOBAL_CSS}</style>
      <div style={S.content}>

        {/* ══════════ BREADCRUMB ══════════ */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 10 }}>
          <span
            style={{ fontSize: 13, color: '#7A7F99', cursor: 'pointer' }}
            onClick={() => navigate('/legal-services')}
          >
            Legal Services
          </span>

          <span style={{ color: '#d1d5db', fontSize: 11 }}>›</span>

          <span
            style={{ fontSize: 13, color: '#7A7F99', cursor: 'pointer' }}
            onClick={() => navigate('/legal-services/litigations')}
          >
            Litigations
          </span>

          <span style={{ color: '#d1d5db', fontSize: 11 }}>›</span>

          <span
            style={{ fontSize: 13, color: '#7A7F99', cursor: 'pointer' }}
            onClick={() =>
              navigate(
                `/legal-services/litigations/${caseType === 'income-tax' ? 'income-tax' : 'tds'}`
              )
            }
          >
            Dashboard
          </span>

          <span style={{ color: '#d1d5db', fontSize: 11 }}>›</span>

          <span
            style={{ fontSize: 13, color: '#7A7F99', cursor: 'pointer' }}
            onClick={() =>
              navigate(
                `/legal-services/litigations/${caseType === 'income-tax' ? 'income-tax' : 'tds'}/jobs`
              )
            }
          >
            {caseType === 'income-tax' ? 'Income Tax' : 'TDS'} Litigations
          </span>

          <span style={{ color: '#d1d5db', fontSize: 11 }}>›</span>

          <span style={{ fontSize: 13, fontWeight: 700, color: '#1C1E2E' }}>
            {client.name}
          </span>
        </div>

        {/* ══════════ CLIENT HEADER ══════════ */}
        <section style={S.clientHeader}>
          <div style={{ padding: '14px 20px 12px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
              <h1 style={{
                margin: 0, color: '#1a1a2e', fontSize: 19, fontWeight: 800,
                letterSpacing: '-0.01em', lineHeight: 1.2,
              }} title={client.name}>
                {client.name}
              </h1>

              <span style={{
                display: 'inline-flex', alignItems: 'center', gap: 5,
                fontSize: 10, fontWeight: 700, padding: '3px 10px', borderRadius: 99,
                background: statusMeta.bg, color: statusMeta.color,
                textTransform: 'uppercase', letterSpacing: '.04em',
                border: `1px solid ${statusMeta.color}35`,
              }}>
                {statusMeta.label}
              </span>


              {caseData?.sub_service_name && (
                <span style={{
                  marginLeft: 'auto', fontSize: 11, fontWeight: 600, color: '#214274',
                  background: '#EEF3FC', border: '1px solid #C5D5EF',
                  padding: '3px 10px', borderRadius: 6,
                }}>
                  📄 {caseData.sub_service_name}
                </span>
              )}
            </div>

            <div style={{ fontSize: 11, color: '#7A7F99', marginTop: 3, display: 'flex', gap: 10, flexWrap: 'wrap' }}>
              <span>{fy}</span>
              <span>{ay}</span>
              {(caseData?.task_id_display || caseData?.task_id) && (
                <span>{caseData.task_id_display || caseData.task_id}</span>
              )}
            </div>
          </div>

          <nav style={S.tabsBar}>
            {[
              { key: 'details', label: 'Client Details', icon: '👤' },
              { key: 'documents', label: 'Documents', icon: '📁' },
              { key: 'activity', label: 'Activity', icon: '🕐' },
              { key: 'review', label: 'Review', icon: '🔍', count: activeReviewCount },
              { key: 'team', label: 'Team', icon: '👥' },
              { key: 'audit', label: 'Audit Trail', icon: '🕐' },
            ].map((tab) => (
              <button
                key={tab.key}
                className="cdv-tab-btn"
                style={S.tabBtn(activeTab === tab.key)}
                onClick={() => setActiveTab(tab.key)}
              >
                <span style={{ fontSize: 12 }}>{tab.icon}</span>
                {tab.label}
                {tab.count > 0 && <span style={S.tabCount(activeTab === tab.key)}>{tab.count}</span>}
              </button>
            ))}
          </nav>
        </section>


        {/* ══════════ TAB CONTENT ══════════ */}
        <section style={S.tabContent}>

          {activeTab === 'details' && (
            <div style={{ padding: 18, background: '#F8F9FB', fontFamily: 'inherit' }}>
              <style>{`
                .cdv-input-focus:focus { border-color: #1A2F5A !important; box-shadow: 0 0 0 2px rgba(26,47,90,0.1); }
                .client-field-label { font-size: 11px; font-weight: 700; color: #7A7F99; text-transform: uppercase; letter-spacing: 0.05em; display: flex; align-items: center; }
                .client-field-value { font-size: 13px; font-weight: 600; color: #1C1E2E; word-break: break-word; }
                .client-field-empty { font-size: 13px; font-weight: 400; color: #C2C8D2; font-style: italic; }
              `}</style>

              {infoSaveError && (
                <div style={{ background: '#FEF2F2', borderLeft: '3px solid #C62828', borderRadius: '0 8px 8px 0', padding: '10px 14px', fontSize: 12, color: '#C62828', marginBottom: 16 }}>
                  ⚠️ {infoSaveError}
                </div>
              )}

              {/* ── 1. Summary Stats Row ── */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 20 }}>
                {[
                  { label: 'Task ID', value: caseData?.task_id_display || caseData?.task_id, mono: true },
                  { label: 'Period', value: caseData?.task_period || caseData?.assessment_year || caseData?.period },
                  { label: 'Sub-Service', value: caseData?.sub_service_name },
                  { label: 'Due Date', value: fmtDate(caseData?.due_date) },
                ].map((s) => (
                  <div key={s.label} style={{ background: '#fff', border: '1px solid #E8EAF0', borderRadius: 10, padding: '12px 16px' }}>
                    <div style={{ fontSize: 11, color: '#7A7F99', marginBottom: 3 }}>{s.label}</div>
                    <div style={{ fontSize: 14, fontWeight: 700, color: '#1A2F5A', fontFamily: s.mono ? 'monospace' : 'inherit' }}>
                      {s.value || '—'}
                    </div>
                  </div>
                ))}
              </div>

              {/* ── 2. Info Banner ── */}
              <div style={{ background: '#EEF3FC', borderLeft: '3px solid #1A2F5A', borderRadius: '0 8px 8px 0', padding: '10px 14px', fontSize: 12, color: '#1A2F5A', marginBottom: 16, fontWeight: 500 }}>
                ℹ️ {canEditClientInfo ? 'Auto-filled from client master. Edit to update.' : 'Read-only, Assigned Maker can only editing.'}
              </div>

              {/* ── 3. Client Information Card ── */}
              <div style={{ background: '#fff', border: '1px solid #E8EAF0', borderRadius: 12, marginBottom: 16, overflow: 'hidden' }}>
                <div style={{ padding: '10px 18px', borderBottom: '1px solid #E8EAF0', background: '#F2F4F8', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: 12, fontWeight: 700, color: '#1C1E2E', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                    Client Information
                  </span>
                  {canEditClientInfo && !editingInfo && (
                    <button onClick={startEditInfo} style={{ background: 'transparent', border: '1.5px solid #1A2F5A', color: '#1A2F5A', padding: '4px 12px', borderRadius: 6, fontSize: 11, fontWeight: 700, cursor: 'pointer' }}>
                      ✏ Edit
                    </button>
                  )}
                </div>

                <div style={{ padding: 20 }}>
                  <div style={{ display: 'grid', gridTemplateColumns: '160px 1fr 160px 1fr', gap: '14px 24px' }}>
                    {FIELD_LABELS.map(([key, label]) => {
                      const value = clientDisplay[key];
                      const isEmpty = !value || value === '—';
                      const isAddress = key === 'address';
                      const isMono = ['pan', 'gstin', 'tan', 'cin', 'iec', 'lei', 'ksea', 'udyam', 'apt', 'ept'].includes(key);

                      return (
                        <React.Fragment key={key}>
                          <div className="client-field-label" style={{ paddingTop: editingInfo ? 8 : 0 }}>{label}</div>
                          <div style={{ gridColumn: isAddress ? 'span 3' : 'span 1' }}>
                            {editingInfo ? (
                              isAddress ? (
                                <textarea name={key} value={infoForm[key] || ''} onChange={handleInfoFormChange} rows={2} className="cdv-input-focus" style={{ width: '100%', padding: '8px 12px', borderRadius: 8, border: '1px solid #E8EAF0', fontSize: 13, fontFamily: 'inherit', resize: 'vertical', boxSizing: 'border-box' }} />
                              ) : (
                                <input name={key} value={infoForm[key] || ''} onChange={handleInfoFormChange} className="cdv-input-focus" style={{ width: '100%', padding: '8px 12px', borderRadius: 8, border: '1px solid #E8EAF0', fontSize: 13, fontFamily: isMono ? 'monospace' : 'inherit', boxSizing: 'border-box' }} />
                              )
                            ) : (
                              <div className={isEmpty ? 'client-field-empty' : 'client-field-value'} style={{ fontFamily: isMono ? 'monospace' : 'inherit', whiteSpace: isAddress ? 'pre-wrap' : 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                {value || '—'}
                              </div>
                            )}
                          </div>
                        </React.Fragment>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* ── 5. Edit Mode Actions ── */}
              {editingInfo && (
                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 20 }}>
                  <button onClick={() => setEditingInfo(false)} style={{ padding: '8px 20px', borderRadius: 8, border: '1px solid #E8EAF0', background: '#fff', color: '#7A7F99', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
                    Cancel
                  </button>
                  <button onClick={handleInfoSave} disabled={infoSaving} style={{ padding: '8px 20px', borderRadius: 8, border: 'none', background: '#1A2F5A', color: '#fff', fontSize: 13, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8 }}>
                    {infoSaving && <span style={{ width: 12, height: 12, border: '2px solid rgba(255,255,255,0.3)', borderTopColor: '#fff', borderRadius: '50%', animation: 'cdvSpin 0.6s linear infinite' }} />}
                    {infoSaving ? 'Saving...' : 'Save & Continue →'}
                  </button>
                </div>
              )}
            </div>
          )}

          {activeTab === 'documents' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {/* ── Search + Disclaimer Row ── */}
              <div style={{
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                gap: 12, flexWrap: 'wrap',
              }}>
                <div style={{
                  display: 'inline-flex', alignItems: 'center', gap: 6,
                  fontSize: 11.5, color: '#64748b', fontStyle: 'italic',
                }}>
                  <span style={{ fontSize: 13 }}>ℹ️</span>
                  <span>View-only — showing all approved files uploaded across notices</span>
                </div>

                <div style={{ position: 'relative', width: 300 }}>
                  <span style={{
                    position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)',
                    fontSize: 12, color: '#94a3b8', pointerEvents: 'none',
                  }}>🔍</span>
                  <input
                    type="text"
                    placeholder="Search by file name or DIN..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="cdv-input-focus"
                    style={{
                      width: '100%', boxSizing: 'border-box',
                      padding: '8px 30px 8px 32px',
                      border: '1px solid #eef0f5', borderRadius: 8,
                      fontSize: 12.5, background: '#fff', fontFamily: 'inherit', outline: 'none',
                    }}
                  />
                  {searchQuery && (
                    <button
                      type="button"
                      onClick={() => setSearchQuery('')}
                      style={{
                        position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)',
                        border: 'none', background: 'none', color: '#94a3b8', cursor: 'pointer',
                        fontSize: 14, padding: 0,
                      }}
                    >✕</button>
                  )}
                </div>
              </div>

              {activityLoading && <div style={S.state}>Loading documents...</div>}

              {!activityLoading && !activityCase && (
                <div style={S.empty}>
                  <div style={S.emptyIcon}>📁</div>
                  <p>No documents found. Add a case and notices in the Activity tab first.</p>
                </div>
              )}

              {!activityLoading && activityCase && (() => {
                const q = searchQuery.trim().toLowerCase();

                // ── Build normalized notice rows (APPROVED ONLY) ──
                const noticeRows = (activityCase.notices || []).map((notice) => {
                  const docs = noticeDocsMap[notice.id] || notice.documents || [];

                  // 1) Court notice (always visible if exists)
                  const courtNotices = docs.filter((d) => d.doc_type === 'court_notice');

                  // 2) APPROVED Uploaded replies only (from NoticeDocument table)
                  const uploadedReplies = docs.filter(
                    (d) => d.doc_type === 'reply' && d.review_status === 'approved'
                  );

                  // 3) APPROVED Supporting docs only
                  const supports = docs.filter(
                    (d) => d.doc_type === 'supporting_doc' && d.review_status === 'approved'
                  );

                  // 4) APPROVED Acknowledgments only
                  const acks = docs.filter(
                    (d) => d.doc_type === 'acknowledgment' && d.review_status === 'approved'
                  );

                  // 5) APPROVED HTML replies only (from NoticeReply table, prefetched into noticeHtmlReplies)
                  const htmlReplies = noticeHtmlReplies[notice.id] || [];

                  // ── Merge both reply sources chronologically → assign v1, v2, v3... ──
                  const combined = [
                    ...htmlReplies.map((r) => ({
                      ...r,
                      _isHtml: true,
                      _id: r.id,                              // NoticeReply.id
                      ts: new Date(r.reviewed_at || r.updated_at || r.created_at || 0).getTime(),
                      displayName: `${r.title || 'Untitled'}.docx`,
                    })),
                    ...uploadedReplies.map((d) => ({
                      ...d,
                      _isHtml: false,
                      _id: d.id,                              // NoticeDocument.id
                      ts: new Date(d.reviewed_at || d.uploaded_at || 0).getTime(),
                      displayName: d.file_name || 'file',
                    })),
                  ].sort((a, b) => a.ts - b.ts);

                  // ── Group each reply with its own supporting docs ──
                  // BOTH HTML replies and Uploaded replies can have supports.
                  // Match via: support.reply_version === parent_reply._id
                  const versionGroups = combined.map((item, i) => ({
                    v: i + 1,
                    main: item,
                    supports: supports.filter(
                      (s) => String(s.reply_version) === String(item._id)
                    ),
                  }));

                  const totalFiles =
                    courtNotices.length +
                    combined.length +
                    versionGroups.reduce((n, vg) => n + vg.supports.length, 0) +
                    acks.length;

                  return {
                    id: notice.id,
                    din: notice.din_number || 'N/A',
                    courtNotices,
                    versionGroups,
                    acks,
                    totalFiles,
                  };
                });

                // ── Apply search filter ──
                const filteredNotices = noticeRows
                  .map((n) => {
                    if (!q) return n;
                    const matchDin = (n.din || '').toLowerCase().includes(q);

                    const filteredCN = n.courtNotices.filter(
                      (d) => (d.file_name || '').toLowerCase().includes(q) || matchDin
                    );

                    const filteredVG = n.versionGroups
                      .map((vg) => {
                        const name = (
                          vg.main.displayName || vg.main.file_name || vg.main.title || ''
                        ).toLowerCase();
                        const hitMain = name.includes(q) || matchDin;
                        const filteredSup = vg.supports.filter(
                          (s) => (s.file_name || '').toLowerCase().includes(q) || matchDin
                        );
                        if (!hitMain && filteredSup.length === 0) return null;
                        return { ...vg, supports: hitMain ? vg.supports : filteredSup };
                      })
                      .filter(Boolean);

                    const filteredAck = n.acks.filter(
                      (d) => (d.file_name || '').toLowerCase().includes(q) || matchDin
                    );

                    const totalVisible =
                      filteredCN.length +
                      filteredVG.reduce((c, vg) => c + 1 + vg.supports.length, 0) +
                      filteredAck.length;

                    if (totalVisible === 0) return null;
                    return {
                      ...n,
                      courtNotices: filteredCN,
                      versionGroups: filteredVG,
                      acks: filteredAck,
                      totalFiles: totalVisible,
                    };
                  })
                  .filter(Boolean);

                // ── Closure docs (only when bundle approved) ──
                const closureDocs =
                  activityCase.closure_review_status === 'approved'
                    ? (activityCase.closure_documents || []).filter(
                        (d) => !q || (d.file_name || '').toLowerCase().includes(q)
                      )
                    : [];

                // ── Empty states ──
                if (filteredNotices.length === 0 && closureDocs.length === 0) {
                  if (q) {
                    return (
                      <div style={{
                        textAlign: 'center', padding: '40px 20px', background: '#fff',
                        borderRadius: 10, border: '1px solid #eef0f5',
                      }}>
                        <div style={{ fontSize: 32, marginBottom: 8, opacity: 0.6 }}>🔍</div>
                        <div style={{ color: '#6b7280', fontSize: 13, fontWeight: 600 }}>
                          No documents match &quot;{searchQuery}&quot;
                        </div>
                      </div>
                    );
                  }
                  return (
                    <div style={S.empty}>
                      <div style={S.emptyIcon}>📁</div>
                      <p>No approved files yet. Upload or write replies in the Activity tab.</p>
                    </div>
                  );
                }

                // ── Shared styles ──
                const colBorder = '1px solid #EEF0F5';
                const thStyle = {
                  textAlign: 'left', padding: '10px 12px',
                  fontWeight: 700, color: '#475569', fontSize: 10.5,
                  textTransform: 'uppercase', letterSpacing: '.05em',
                  borderBottom: '1px solid #E2E8F0',
                  borderRight: colBorder,
                  background: '#F8FAFC',
                };
                const tdStyle = {
                  padding: '10px 12px', verticalAlign: 'top',
                  borderRight: colBorder,
                };

                // ── Standardized file chip (fixed width, clean look) ──
                const FileChip = ({ doc, icon, isHtml, label }) => {
                  const name = label || doc.file_name || doc.displayName || 'file';
                  return (
                    <div
                      onClick={() => (isHtml ? handleOpenHtmlReply(doc) : handleView(doc))}
                      title={name}
                      style={{
                        display: 'flex', alignItems: 'center', gap: 6,
                        padding: '4px 8px', background: '#fff',
                        border: '1px solid #E2E8F0', borderRadius: 5,
                        cursor: 'pointer', width: 170, height: 26, boxSizing: 'border-box',
                        transition: 'all .12s',
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.background = '#F5F8FF';
                        e.currentTarget.style.borderColor = '#c7d2fe';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.background = '#fff';
                        e.currentTarget.style.borderColor = '#E2E8F0';
                      }}
                    >
                      <span style={{ fontSize: 11, flexShrink: 0 }}>{icon}</span>
                      <span style={{
                        fontSize: 10, fontWeight: 600, color: '#1a1a2e',
                        flex: 1, minWidth: 0,
                        overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                      }}>
                        {name}
                      </span>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          if (isHtml) handleDownloadHtmlReply(doc);
                          else handleDownload(doc);
                        }}
                        title="Download"
                        style={{
                          width: 16, height: 16, border: '1px solid #cbd5e1',
                          borderRadius: 3, background: '#fff', color: '#475569',
                          cursor: 'pointer', display: 'flex', alignItems: 'center',
                          justifyContent: 'center', padding: 0, flexShrink: 0, fontSize: 9,
                        }}
                      >⬇</button>
                    </div>
                  );
                };

                // ── Compact version tag (inline, no expansion) ──
                const VTag = ({ v }) => (
                  <span style={{
                    display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                    minWidth: 22, height: 20,
                    fontSize: 9.5, fontWeight: 800, color: '#fff',
                    background: '#3b82f6',
                    padding: '0 6px', borderRadius: 3,
                    flexShrink: 0,
                  }}>
                    v{v}
                  </span>
                );

                const EmptyCell = ({ text }) => (
                  <span style={{ fontSize: 11, color: '#c2c8d2', fontStyle: 'italic' }}>
                    {text}
                  </span>
                );

                return (
                  <div style={{
                    background: '#fff',
                    border: '1px solid #E8EAF0',
                    borderRadius: 10,
                    overflow: 'hidden',
                    boxShadow: '0 1px 3px rgba(20,20,40,0.04)',
                  }}>
                    <div style={{ maxHeight: 620, overflowY: 'auto' }}>
                      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                        <thead style={{ position: 'sticky', top: 0, zIndex: 2 }}>
                          <tr>
                            <th style={{ ...thStyle, width: 40, textAlign: 'center' }}></th>
                            <th style={{ ...thStyle, minWidth: 140 }}>DIN / Notice</th>
                            <th style={{ ...thStyle, width: 190 }}>Notice File</th>
                            <th style={{ ...thStyle, width: 220 }}>Replies</th>
                            <th style={{ ...thStyle, width: 210 }}>Supporting Docs</th>
                            <th style={{ ...thStyle, width: 190 }}>Acknowledgment</th>
                            <th style={{ ...thStyle, width: 60, textAlign: 'center', borderRight: 'none' }}>Files</th>
                          </tr>
                        </thead>
                        <tbody>
                          {filteredNotices.map((n, idx) => (
                            <tr
                              key={n.id}
                              style={{
                                borderBottom: '1px solid #F1F5F9',
                                background: idx % 2 === 0 ? '#fff' : '#FBFCFE',
                              }}
                              onMouseEnter={(e) => { e.currentTarget.style.background = '#F8FAFF'; }}
                              onMouseLeave={(e) => {
                                e.currentTarget.style.background = idx % 2 === 0 ? '#fff' : '#FBFCFE';
                              }}
                            >
                              {/* # */}
                              <td style={{
                                ...tdStyle, textAlign: 'center',
                                color: '#94a3b8', fontSize: 11.5, fontWeight: 700,
                              }}>
                                {String(idx + 1).padStart(2, '0')}
                              </td>

                              {/* DIN */}
                              <td style={tdStyle}>
                                <div style={{
                                  fontSize: 11.5, fontWeight: 700, color: '#1a1a2e',
                                  fontFamily: 'monospace',
                                  wordBreak: 'break-all', lineHeight: 1.3,
                                }}>
                                  {n.din}
                                </div>
                              </td>

                              {/* Notice File */}
                              <td style={tdStyle}>
                                {n.courtNotices.length > 0 ? (
                                  <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                                    {n.courtNotices.map((doc) => (
                                      <FileChip key={`cn-${doc.id}`} doc={doc} icon="📄" />
                                    ))}
                                  </div>
                                ) : (
                                  <EmptyCell text="No notice file" />
                                )}
                              </td>

                              {/* Replies — Main HTML + Uploaded, chronological, one row each */}
                              <td style={tdStyle}>
                                {n.versionGroups.length > 0 ? (
                                  <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                                    {n.versionGroups.map((vg) => (
                                      <div
                                        key={`v-${vg.main._isHtml ? 'h' : 'd'}-${vg.main._id}-${vg.v}`}
                                        style={{ display: 'flex', alignItems: 'center', gap: 6 }}
                                      >
                                        <VTag v={vg.v} />
                                        <FileChip
                                          doc={vg.main}
                                          icon={vg.main._isHtml ? '📝' : '📄'}
                                          isHtml={vg.main._isHtml}
                                          label={vg.main.displayName}
                                        />
                                      </div>
                                    ))}
                                  </div>
                                ) : (
                                  <EmptyCell text="No replies yet" />
                                )}
                              </td>

                              {/* Supporting Docs — grouped by reply version (isolated per reply, no leakage) */}
                              <td style={tdStyle}>
                                {(() => {
                                  const withSupports = n.versionGroups.filter(
                                    (vg) => vg.supports.length > 0
                                  );

                                  if (withSupports.length === 0) {
                                    return <EmptyCell text="No supporting docs yet" />;
                                  }

                                  return (
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                                      {withSupports.map((vg) => (
                                        <div
                                          key={`sup-group-${vg.main._isHtml ? 'h' : 'd'}-${vg.main._id}-${vg.v}`}
                                          style={{ display: 'flex', flexDirection: 'column', gap: 4 }}
                                        >
                                          {vg.supports.map((s, si) => (
                                            <div
                                              key={`sup-${s.id}`}
                                              style={{ display: 'flex', alignItems: 'center', gap: 6 }}
                                            >
                                              {si === 0 ? (
                                                <VTag v={vg.v} />
                                              ) : (
                                                <span style={{ minWidth: 22, display: 'inline-block' }} />
                                              )}
                                              <FileChip doc={s} icon="📎" />
                                            </div>
                                          ))}
                                        </div>
                                      ))}
                                    </div>
                                  );
                                })()}
                              </td>

                              {/* Acknowledgment */}
                              <td style={tdStyle}>
                                {n.acks.length > 0 ? (
                                  <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                                    {n.acks.map((doc) => (
                                      <FileChip key={`ack-${doc.id}`} doc={doc} icon="✅" />
                                    ))}
                                  </div>
                                ) : (
                                  <EmptyCell text="No acknowledgment yet" />
                                )}
                              </td>

                              {/* Files Count */}
                              <td style={{ ...tdStyle, textAlign: 'center', borderRight: 'none' }}>
                                <span style={{
                                  display: 'inline-block',
                                  padding: '2px 8px', borderRadius: 99,
                                  background: '#EEF2FF', color: '#4338ca',
                                  fontSize: 10.5, fontWeight: 700,
                                }}>
                                  {n.totalFiles}
                                </span>
                              </td>
                            </tr>
                          ))}

                          {/* ── CLOSURE ROW ── */}
                          {closureDocs.length > 0 && (
                            <tr style={{
                              background: '#FEF2F2',
                              borderTop: '2px solid #fecaca',
                              borderBottom: '1px solid #F1F5F9',
                            }}>
                              <td style={{ ...tdStyle, textAlign: 'center', color: '#991b1b', fontWeight: 700 }}>
                                🔒
                              </td>
                              <td style={tdStyle} colSpan={5}>
                                <div style={{ fontSize: 11.5, fontWeight: 800, color: '#991b1b', marginBottom: 6 }}>
                                  Case Closure Documents
                                </div>
                                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                                  {closureDocs.map((doc) => (
                                    <FileChip key={`cl-${doc.id}`} doc={doc} icon="🔒" />
                                  ))}
                                </div>
                              </td>
                              <td style={{ ...tdStyle, textAlign: 'center', borderRight: 'none' }}>
                                <span style={{
                                  display: 'inline-block',
                                  padding: '2px 8px', borderRadius: 99,
                                  background: '#fee2e2', color: '#991b1b',
                                  fontSize: 10.5, fontWeight: 700,
                                }}>
                                  {closureDocs.length}
                                </span>
                              </td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>

                    {/* ── FOOTER SUMMARY ── */}
                    <div style={{
                      padding: '9px 14px',
                      background: '#F8FAFC',
                      borderTop: '1px solid #E2E8F0',
                      display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                      fontSize: 11, color: '#64748b', fontWeight: 600,
                    }}>
                      <span>
                        Showing <b style={{ color: '#1a1a2e' }}>{filteredNotices.length}</b> notice{filteredNotices.length !== 1 ? 's' : ''}
                        {closureDocs.length > 0 && ' + Closure'}
                      </span>
                      <span>
                        Total files: <b style={{ color: '#1a1a2e' }}>
                          {filteredNotices.reduce((sum, n) => sum + n.totalFiles, 0) + closureDocs.length}
                        </b>
                      </span>
                    </div>
                  </div>
                );
              })()}
            </div>
          )}

          {/* ACTIVITY TAB */}
          {activeTab === 'activity' && (
            <>
              {activityLoading && <div style={S.state}>Loading case...</div>}
              {activityError && !activityLoading && <div style={S.errorBanner}>{activityError}</div>}

              {!activityLoading && !activityCase && !activityError && (
                <div style={S.empty}>
                  <div style={S.emptyIcon}>⚖️</div>
                  <p>No {caseType === 'income-tax' ? 'Income Tax' : 'TDS'} case logged yet.</p>
                  {canAddCase && (  // ✅ only show for Maker/Admin/Founder/Manager
                    <button 
                      type="button" 
                      className="cdv-primary-btn" 
                      style={{ ...S.addCaseBtn, marginTop: 12 }} 
                      onClick={handleAddCase} 
                      disabled={creatingCase}
                    >
                      {creatingCase ? 'Creating...' : 'Add Case'}
                    </button>
                  )}
                </div>
              )}

              {!activityLoading && activityCase && (
                <ActivityTimelineV2
                  subServiceName={caseData?.sub_service_name}
                  activityCase={activityCase}
                  canEdit={canEditActivity}
                  // canLogOutcome={canLogOutcome}
                  createdByFallback={caseData?.created_by_name}
                  pendingReview={pendingReview} 
                  caseData={caseData}   
                  api={{
                    setDescription: (desc) => courtCaseApi.setDescription(activityCase.id, desc).then((r) => r.data),
                    addStep: (note) => courtCaseApi.addStep(activityCase.id, note).then((r) => r.data),
                    // submitAppeal: (id, payload) => courtCaseApi.submitAppeal(id, payload).then((r) => r.data),
                    // fileAppeal: (payload) => courtCaseApi.fileAppeal(activityCase.id, payload).then((r) => r.data),
                    // logAdjournment: (payload) => courtCaseApi.logAdjournment(activityCase.id, payload).then((r) => r.data),
                    // logOutcome: (payload) => courtCaseApi.logOutcome(activityCase.id, payload).then((r) => r.data),
                  }}
                  onUpdated={(updated) => {
                    if (updated && typeof updated === 'object') {
                      setActivityCase({ ...updated });
                    }
                    bumpRefresh();
                    loadActivityCase();
                    loadPendingReview();
                  }}
                />
              )}
            </>
          )}

          {/* TEAM TAB */}
          {activeTab === 'team' && (
            <div>
              {teamLoading ? (
                <div style={S.state}>Loading team information...</div>
              ) : caseData ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

                  <div style={{
                    background: '#fff',
                    border: '1px solid #e9edf4',
                    borderRadius: 14,
                    overflow: 'hidden',
                    boxShadow: '0 2px 8px rgba(20,20,40,0.05)',
                  }}>
                    <div style={{
                      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                      padding: '14px 20px',
                      background: 'linear-gradient(90deg, #f5f7fb, #eef2ff)',
                      borderBottom: '1px solid #e9edf4',
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <div>
                          <div style={{ fontSize: 14, fontWeight: 800, color: '#1a1a2e', letterSpacing: '-0.01em' }}>
                            Assigned Team
                          </div>
                          <div style={{ fontSize: 11, color: '#6b7280', marginTop: 1, fontWeight: 500 }}>
                            {(caseData.makers?.length || 0) + (caseData.checkers?.length || 0)} member{((caseData.makers?.length || 0) + (caseData.checkers?.length || 0)) !== 1 ? 's' : ''}
                          </div>
                        </div>
                      </div>
                    </div>

                    <div style={{ padding: '4px 20px 16px' }}>
                      {(() => {
                        const allMembers = [
                          ...(caseData.makers || []).map(u => ({ u, role: 'maker' })),
                          ...(caseData.checkers || []).map(u => ({ u, role: 'checker' })),
                        ];

                        if (allMembers.length === 0) {
                          return (
                            <div style={{
                              textAlign: 'center', padding: '28px 16px',
                              color: '#9ca3af', fontSize: 13, fontStyle: 'italic',
                              background: '#f8f9fc', borderRadius: 8,
                              border: '1px dashed #e5e7eb', marginTop: 12,
                            }}>
                              No team assigned yet.
                            </div>
                          );
                        }

                        return allMembers.map((m, i) => {
                          const isC = m.role === 'checker';
                          const name = m.u.name || m.u.full_name || 'Unknown';
                          const email = m.u.email || '';
                          const initials = name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();

                          return (
                            <div key={`${m.role}-${m.u.id || i}`} style={{
                              display: 'flex', alignItems: 'center', gap: 12,
                              padding: '12px 0',
                              borderBottom: i < allMembers.length - 1 ? '1px solid #f0f2f6' : 'none',
                            }}>
                              <div style={{
                                width: 36, height: 36, borderRadius: '50%', flexShrink: 0,
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                fontSize: 13, fontWeight: 700,
                                background: isC ? '#EDEAFB' : '#E8F7F3',
                                color: isC ? '#4A3FA8' : '#0D6B52',
                                border: `2px solid ${isC ? '#A9A3E2' : '#8ECEBF'}`,
                              }}>
                                {initials}
                              </div>

                              <div style={{ flex: 1, minWidth: 0 }}>
                                <div style={{
                                  fontSize: 13, fontWeight: 600, color: '#1a1a2e',
                                  overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                                }}>
                                  {name}
                                </div>
                                {email && (
                                  <div style={{
                                    fontSize: 11, color: '#7A7F99', marginTop: 1,
                                    overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                                  }}>
                                    {email}
                                  </div>
                                )}
                              </div>

                              <span style={{
                                fontSize: 10, padding: '3px 10px', borderRadius: 99,
                                fontWeight: 700,
                                background: isC ? '#EDEAFB' : '#E8F7F3',
                                color: isC ? '#4A3FA8' : '#0D6B52',
                                flexShrink: 0,
                                textTransform: 'uppercase',
                                letterSpacing: '0.04em',
                              }}>
                                {isC ? 'Checker' : 'Maker'}
                              </span>
                            </div>
                          );
                        });
                      })()}
                    </div>
                  </div>

                  <div style={{
                    background: '#fff',
                    border: '1px solid #e9edf4',
                    borderRadius: 14,
                    overflow: 'hidden',
                    boxShadow: '0 2px 8px rgba(20,20,40,0.05)',
                  }}>
                    <div style={{
                      display: 'flex', alignItems: 'center', gap: 10,
                      padding: '14px 20px',
                      background: 'linear-gradient(90deg, #f5f7fb, #eef2ff)',
                      borderBottom: '1px solid #e9edf4',
                    }}>
                      <div>
                        <div style={{ fontSize: 14, fontWeight: 800, color: '#1a1a2e', letterSpacing: '-0.01em' }}>
                          Linked Task
                        </div>
                        <div style={{ fontSize: 11, color: '#6b7280', marginTop: 1, fontWeight: 500 }}>
                          Reference details for this litigation case
                        </div>
                      </div>
                    </div>

                    <div style={{ padding: '4px 20px 12px' }}>
                      {(linkedTask
                        ? [
                            // ── Task-sourced case: show Task table data ──
                            ['Task ID',     linkedTask.task_id],
                            ['Client',      linkedTask.client_name],
                            ['Sub-Service', linkedTask.sub_service_name],
                            ['SPOC',        linkedTask.spoc_name],
                            ['Team',        linkedTask.team_name],
                            ['Status', (() => {
                              const meta = TASK_STATUS_META[linkedTask.status];
                              return meta ? (
                                <span style={{
                                  fontSize: 10, padding: '2px 9px', borderRadius: 99,
                                  fontWeight: 700, background: meta.bg, color: meta.color,
                                }}>
                                  {meta.label}
                                </span>
                              ) : '—';
                            })()],
                            ['Period',      linkedTask.period],
                            ['Due Date',    fmtDate(linkedTask.due_date)],
                            ['Created By',  linkedTask.created_by_name],
                            ['Created At',  fmtDateTime(linkedTask.created_at)],
                          ]
                        : [
                            // ── Manual case (New Case button): show Litigation data ──
                            ['Reference No.',   caseData.reference_no],
                            ['Sub-Service',     caseData.sub_service_name],
                            ['Status', (() => {
                              const s = caseData.computed_status || caseData.activity_status || 'wip';
                              const meta = STATUS_META[s] || STATUS_META.wip;
                              return (
                                <span style={{
                                  fontSize: 10, padding: '2px 9px', borderRadius: 99,
                                  fontWeight: 700, background: meta.bg, color: meta.color,
                                }}>
                                  {meta.label}
                                </span>
                              );
                            })()],
                            ['Created By',      caseData.created_by_name],
                            ['Assessment Year', caseData.assessment_year],
                            ['Period',          caseData.period],
                            ['Notice Date',     fmtDate(caseData.notice_date)],
                            ['Due Date',        fmtDate(caseData.due_date)],
                          ]
                      ).map(([label, value], idx, arr) => (
                        <div key={label} style={{
                          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                          padding: '11px 0',
                          borderBottom: idx < arr.length - 1 ? '1px solid #f0f2f6' : 'none',
                        }}>
                          <span style={{
                            fontSize: 12.5, color: '#7A7F99', fontWeight: 600,
                          }}>
                            {label}
                          </span>
                          <span style={{
                            fontSize: 13, fontWeight: 600,
                            color: (!value || value === '—') ? '#c2c8d2' : '#1a1a2e',
                            textAlign: 'right',
                            maxWidth: '55%',
                            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                          }}>
                            {typeof value === 'string' || typeof value === 'number'
                              ? (value || '—')
                              : value}
                          </span>
                        </div>
                      ))}
                    </div>

                  </div>
                </div>
              ) : (
                <div style={S.empty}>
                  <div style={S.emptyIcon}>👥</div>
                  <p>No case data available for this client</p>
                </div>
              )}
            </div>
          )}

          {activeTab === 'review' && (
            !activityCase ? (
              <div style={S.empty}>
                <div style={S.emptyIcon}>🔍</div>
                <p>No case yet — add one in the Activity tab to enable reviews.</p>
              </div>
            ) : (
              <ReviewTabV2
                clientId={clientId}
                courtCaseId={activityCase.id}
                litigationType={activityLitigationType}
                refreshTick={refreshTick}
                caseData={caseData}
              />
            )
          )}

          {activeTab === 'audit' && (
            <LegalAuditTrailTab
              clientId={clientId}
              litigationType={activityLitigationType}
              courtCaseId={activityCase?.id}
              jobId={caseData?.id}
              refreshTick={refreshTick}
            />
          )}
        </section>
      </div>

      {/* ══════════ DELETE CONFIRM MODAL ══════════ */}
      {deleteModal.open && (
        <div style={S.modalOverlay} onClick={() => setDeleteModal({ ...deleteModal, open: false })}>
          <div style={S.confirmModal} onClick={(e) => e.stopPropagation()}>
            <div style={S.confirmIcon}>⚠️</div>
            <h3 style={S.confirmTitle}>Are you sure?</h3>
            <p style={S.confirmText}>
              Do you really want to delete this {deleteModal.type}? This process cannot be undone.
            </p>
            <div style={S.confirmActions}>
              <button style={S.confirmCancelBtn} onClick={() => setDeleteModal({ ...deleteModal, open: false })}>Cancel</button>
              <button style={S.confirmDeleteBtn} onClick={executeDelete}>Delete</button>
            </div>
          </div>
        </div>
      )}

      {showMCModal && caseData && (
        <MCModal
          job={{ ...caseData, caseType: litigationEndpoint }}
          onClose={() => setShowMCModal(false)}
          onAssigned={handleMCAssigned}
        />
      )}
    </main>
  );
}