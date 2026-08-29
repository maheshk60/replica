

import React, { useRef, useState, useCallback, useEffect } from 'react';
import { createPortal } from 'react-dom';
import mammoth from 'mammoth';
import { Document, Packer, Paragraph, TextRun, HeadingLevel, AlignmentType } from 'docx';
import { saveAs } from 'file-saver';
import html2pdf from 'html2pdf.js';
import { Select } from 'antd';
import { api } from '../../services/api';
import RejectModal, { AcceptModal } from './RejectModal';
import { DownloadOutlined } from '@ant-design/icons';

// ══════════════════════════════════════════════════════════════════
// A4 PAGE GEOMETRY & THEME
// ══════════════════════════════════════════════════════════════════
const PAGE_W_IN = 8.27, PAGE_H_IN = 11.69, PAGE_MARGIN_TOP_IN = 0.3, PAGE_MARGIN_BOTTOM_IN = 0.35, SIDE_PADDING_IN = 0.85;
const CSS_PX_PER_IN = 96, PAGE_CONTENT_BUDGET_IN = PAGE_H_IN - PAGE_MARGIN_TOP_IN - PAGE_MARGIN_BOTTOM_IN;
const PAGE_CONTENT_BUDGET_PX = PAGE_CONTENT_BUDGET_IN * CSS_PX_PER_IN, MARKER_GAP_PX = 5;
const C = { ink: '#1c1c1c', slate: '#475569', muted: '#6b7280', border: '#2a2b2f', borderLight: '#3f4046', bg: '#F8FAFC', bgSoft: '#FBFCFE', canvas: '#e9ebf1', green: '#0f8a3c', greenBg: '#ECFDF5', greenBorder: '#A7F3D0', amber: '#B45309', amberBg: '#FFFBEB', amberBorder: '#FCD34D', red: '#B91C1C', redBg: '#FEF2F2', redBorder: '#FECACA', navy: '#020c29', navyLight: '#1b2a6b', navyMid: '#2A4F8F', blue: '#2563EB', blueBg: '#EFF6FF', blueBorder: '#BFDBFE', purple: '#6D28D9', purpleBg: '#F1E8FE', purpleBorder: '#DCC8FA', paper: '#ffffff', orange: '#9A3412', orangeLight: '#C2410C', orangeDark: '#7C2D12' };
const STATUS_META = { draft: { label: 'Draft', color: '#6b7280', bg: '#f3f4f6', border: '#d1d5db', icon: '📝' }, pending: { label: 'In Review', color: C.amber, bg: C.amberBg, border: C.amberBorder, icon: '⏳' }, approved: { label: 'Approved', color: C.green, bg: C.greenBg, border: C.greenBorder, icon: '✅' }, rejected: { label: 'Rejected', color: C.red, bg: C.redBg, border: C.redBorder, icon: '❌' }, escalated: { label: 'Escalated', color: C.purple, bg: C.purpleBg, border: C.purpleBorder, icon: '↑' } };
const ChevronLeftIcon = () => (<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><polyline points="15 18 9 12 15 6" /></svg>);
const ChevronRightIcon = () => (<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><polyline points="9 18 15 12 9 6" /></svg>);
const HistoryIcon = () => (<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M3 3v5h5" /><path d="M3.05 13A9 9 0 106 5.3L3 8" /><path d="M12 7v5l4 2" /></svg>);
const TrashIcon = () => (<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><polyline points="3 6 5 6 21 6" /><path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6" /><path d="M10 11v6M14 11v6" /><path d="M9 6V4a2 2 0 012-2h2a2 2 0 012 2v2" /></svg>);
const ExpandIcon = () => (<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7" /></svg>);
const CollapseIcon = () => (<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M4 14h6v6M20 10h-6V4M14 10l7-7M3 21l7-7" /></svg>);
const CloseIcon = () => (<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>);
const FileIcon = () => (<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" /><polyline points="14 2 14 8 20 8" /></svg>);
const SaveIcon = () => (<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M19 21H5a2 2 0 01-2-2V5a2 2 0 012-2h11l5 5v11a2 2 0 01-2 2z" /><polyline points="17 21 17 13 7 13 7 21" /><polyline points="7 3 7 8 15 8" /></svg>);
const SendIcon = () => (<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><line x1="22" y1="2" x2="11" y2="13" /><polygon points="22 2 15 22 11 13 2 9 22 2" /></svg>);

const DownloadIconSvg = () => (<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" y1="15" x2="12" y2="3" /></svg>);
const DownloadIcon = () => (<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" y1="15" x2="12" y2="3" /></svg>);

const LockIcon = () => (<svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><rect x="3" y="11" width="18" height="11" rx="2" /><path d="M7 11V7a5 5 0 0110 0v4" /></svg>);
const IconAlignLeft = () => (<svg viewBox="0 0 20 16" fill="none" style={{width:16,height:16,display:'block'}}><path d="M1 1h18M1 6h11M1 11h18M1 16h11" stroke="currentColor" strokeWidth="2" strokeLinecap="round" /></svg>);
const IconAlignCenter = () => (<svg viewBox="0 0 20 16" fill="none" style={{width:16,height:16,display:'block'}}><path d="M1 1h18M4 6h12M1 11h18M4 16h12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" /></svg>);
const IconAlignRight = () => (<svg viewBox="0 0 20 16" fill="none" style={{width:16,height:16,display:'block'}}><path d="M1 1h18M8 6h11M1 11h18M8 16h11" stroke="currentColor" strokeWidth="2" strokeLinecap="round" /></svg>);
const IconAlignJustify = () => (<svg viewBox="0 0 20 16" fill="none" style={{width:16,height:16,display:'block'}}><path d="M1 1h18M1 6h18M1 11h18M1 16h18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" /></svg>);
const IconTable = () => (<svg viewBox="0 0 18 16" fill="none" style={{width:16,height:16,display:'block'}}><rect x="1" y="1" width="16" height="14" rx="1.5" stroke="currentColor" strokeWidth="1.6" /><path d="M1 6h16M1 11h16M7 1v14M13 1v14" stroke="currentColor" strokeWidth="1.3" /></svg>);
const UploadIcon = () => (<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" /><polyline points="17 8 12 3 7 8" /><line x1="12" y1="3" x2="12" y2="15" /></svg>);
const PaperclipIcon = () => (<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M21.44 11.05l-9.19 9.19a6 6 0 01-8.49-8.49l9.19-9.19a4 4 0 015.66 5.66l-9.2 9.19a2 2 0 01-2.83-2.83l8.49-8.48"/></svg>);

function fmtDate(d) { if (!d) return '—'; return new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }); }
function fmtRelativeTime(d) { if (!d) return ''; const diff = Math.floor((Date.now() - new Date(d)) / 1000); if (diff < 60) return 'just now'; if (diff < 3600) return `${Math.floor(diff / 60)}m ago`; if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`; if (diff < 604800) return `${Math.floor(diff / 86400)}d ago`; return fmtDate(d); }
function escapeHtml(s) { return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'); }
const handleDownloadFile = async (fileUrl, fileName) => {
  if (!fileUrl) return;
  try {
    const response = await fetch(fileUrl); const blob = await response.blob();
    const url = window.URL.createObjectURL(blob); const link = document.createElement('a');
    link.href = url; link.download = fileName || 'download'; document.body.appendChild(link);
    link.click(); document.body.removeChild(link); window.URL.revokeObjectURL(url);
  } catch (e) { console.error('Download failed', e); }
};

const ALLOWED_TAGS = new Set(['P','DIV','SPAN','BR','B','STRONG','I','EM','U','S','STRIKE','H1','H2','H3','H4','H5','H6','UL','OL','LI','TABLE','THEAD','TBODY','TFOOT','TR','TD','TH','A','SUB','SUP','COLGROUP','COL','IMG']);
const ALLOWED_STYLE_PROPS = ['font-weight','font-style','text-decoration','font-family','font-size','color','background-color','background','text-align','vertical-align','border','border-top','border-bottom','border-left','border-right','border-color','border-style','border-width','border-collapse','border-radius','width','height','max-width','min-width','padding','padding-left','padding-right','padding-top','padding-bottom','list-style-type','margin-left','margin-right','margin-top','margin-bottom','text-indent','line-height','letter-spacing','white-space'];
const ALLOWED_ATTRS_BY_TAG = { OL:['type','start'], LI:['value'], A:['href','target','rel'], TD:['colspan','rowspan','width','height'], TH:['colspan','rowspan','width','height'], TABLE:['width','height','border','cellpadding','cellspacing'], COL:['width','span'], IMG:['src','alt','width','height'] };

function sanitizeClipboardHtml(html) {
  let s = html.replace(/<style[\s\S]*?<\/style>/gi,'').replace(/<script[\s\S]*?<\/script>/gi,'').replace(/<!--[\s\S]*?-->/g,'').replace(/<xml[\s\S]*?<\/xml>/gi,'');
  const container = document.createElement('div'); container.innerHTML = s;
  const msoParagraphs = Array.from(container.querySelectorAll('p')); let currentList = null, currentListId = null;
  msoParagraphs.forEach((p) => {
    const style = p.getAttribute('style') || ''; const match = style.match(/mso-list:\s*(l\d+)/i);
    if (!match) { currentList = null; currentListId = null; return; }
    const listId = match[1]; let markerText = ''; const markerSpan = p.querySelector('span[style*="mso-list"]');
    if (markerSpan) { markerText = markerSpan.textContent; markerSpan.remove(); }
    else { const m = p.textContent.match(/^\s*([•◦▪○]|[0-9]+[.)]|[a-zA-Z][.)])\s*/); if (m) { markerText = m[1]; const w = document.createTreeWalker(p,NodeFilter.SHOW_TEXT); const f = w.nextNode(); if(f) f.textContent = f.textContent.replace(m[0],''); } }
    const tm = markerText.trim(); const isOrdered = /^[0-9a-zA-Z]/.test(tm) && /[.)]$/.test(tm);
    if (!currentList || currentListId !== listId) { currentList = document.createElement(isOrdered ? 'ol' : 'ul'); if (isOrdered) { if(/^[a-z]/.test(tm)) currentList.setAttribute('type','a'); else if(/^[A-Z]/.test(tm)) currentList.setAttribute('type','A'); } p.parentNode.insertBefore(currentList, p); currentListId = listId; }
    const li = document.createElement('li'); while (p.firstChild) li.appendChild(p.firstChild); currentList.appendChild(li); p.remove();
  });
  const cleanElement = (el) => {
    if (el.tagName && el.tagName.includes(':')) { const p=el.parentNode; if(p){while(el.firstChild)p.insertBefore(el.firstChild,el);p.removeChild(el);} return; }
    if (!ALLOWED_TAGS.has(el.tagName)) { const p=el.parentNode; if(p){while(el.firstChild)p.insertBefore(el.firstChild,el);p.removeChild(el);} return; }
    const extra = ALLOWED_ATTRS_BY_TAG[el.tagName] || [];
    Array.from(el.attributes).forEach((attr) => { const n=attr.name.toLowerCase(); if(n==='style'||extra.includes(n))return; el.removeAttribute(attr.name); });
    ['href','src'].forEach((attrName) => {
      if (!el.hasAttribute(attrName)) return; const val = el.getAttribute(attrName).trim(); const safe = /^(https?:|mailto:|tel:|\/|\.|#)/i.test(val) || (attrName === 'src' && /^data:image\//i.test(val)); if (!safe) el.removeAttribute(attrName);
    });
    if (el.hasAttribute('style')) { const kept = el.getAttribute('style').split(';').map(d=>d.trim()).filter(d=>{ const prop=d.split(':')[0].trim().toLowerCase(); return ALLOWED_STYLE_PROPS.includes(prop); }).join('; '); if(kept) el.setAttribute('style',kept); else el.removeAttribute('style'); }
  };
  Array.from(container.querySelectorAll('*')).forEach(cleanElement);
  Array.from(container.querySelectorAll('li > p')).forEach((p) => { if(p.parentNode.children.length===1){const parent=p.parentNode;while(p.firstChild)parent.insertBefore(p.firstChild,p);parent.removeChild(p);} });
  const walker = document.createTreeWalker(container, NodeFilter.SHOW_TEXT); const textNodes = []; let node = walker.nextNode(); while (node) { textNodes.push(node); node = walker.nextNode(); }
  textNodes.forEach((tn) => { tn.textContent = tn.textContent.replace(/[ \t\u00A0\n\r]+/g, ' '); });
  const blockEls = Array.from(container.querySelectorAll('p, div')); let prevEmpty = false;
  blockEls.forEach((el) => { const isEmpty = el.textContent.replace(/[\s\u00A0]+/g,'')==='' && !el.querySelector('img, table'); if(isEmpty){ if(prevEmpty)el.remove(); prevEmpty=true; } else { prevEmpty=false; } });
  Array.from(container.childNodes).forEach((n) => { if(n.nodeType===Node.TEXT_NODE && n.textContent.replace(/[\s\u00A0]+/g,'')===''){ n.remove(); } });
  return container.innerHTML.trim();
}

const MIN_COL_PX = 28, MIN_ROW_PX = 20;
function startColResize(e, table, colIndex) {
  e.preventDefault(); e.stopPropagation();
  const colgroup = table.querySelector(':scope > colgroup'); if (!colgroup) return; const cols = Array.from(colgroup.children); const col = cols[colIndex], nextCol = cols[colIndex + 1]; if (!col) return;
  const tableWidth = table.getBoundingClientRect().width, startX = e.clientX, startW = col.getBoundingClientRect().width, nextStartW = nextCol ? nextCol.getBoundingClientRect().width : null;
  const onMove = (ev) => { const delta = ev.clientX - startX; let newW = Math.max(MIN_COL_PX, startW + delta); if (nextCol) { let newNextW = nextStartW - delta; if (newNextW < MIN_COL_PX) { newNextW = MIN_COL_PX; newW = startW + (nextStartW - MIN_COL_PX); } nextCol.style.width = `${(newNextW / tableWidth) * 100}%`; } col.style.width = `${(newW / tableWidth) * 100}%`; };
  const onUp = () => { document.removeEventListener('mousemove', onMove); document.removeEventListener('mouseup', onUp); }; document.addEventListener('mousemove', onMove); document.addEventListener('mouseup', onUp);
}
function startRowResize(e, tr) {
  e.preventDefault(); e.stopPropagation(); const cells = Array.from(tr.children), startY = e.clientY, startH = tr.getBoundingClientRect().height;
  const onMove = (ev) => { const delta = ev.clientY - startY; const newH = Math.max(MIN_ROW_PX, startH + delta); cells.forEach((td) => { td.style.height = `${newH}px`; }); };
  const onUp = () => { document.removeEventListener('mousemove', onMove); document.removeEventListener('mouseup', onUp); }; document.addEventListener('mousemove', onMove); document.addEventListener('mouseup', onUp);
}
function ensureTableResizeHandles(root) {
  if (!root) return;
  root.querySelectorAll('table').forEach((table) => {
    const firstRow = table.querySelector('tr'); if (!firstRow) return;
    let colgroup = table.querySelector(':scope > colgroup'); const colCount = firstRow.children.length;
    if (!colgroup && colCount > 0) { colgroup = document.createElement('colgroup'); const wp = (100 / colCount).toFixed(3); for (let c = 0; c < colCount; c++) { const col = document.createElement('col'); col.style.width = `${wp}%`; colgroup.appendChild(col); } table.insertBefore(colgroup, table.firstChild); }
    if (!table.style.tableLayout) table.style.tableLayout = 'fixed';
    const rows = Array.from(table.querySelectorAll('tr'));
    rows.forEach((tr, rIdx) => {
      const cells = Array.from(tr.children).filter((c) => c.tagName === 'TD' || c.tagName === 'TH');
      cells.forEach((cell, cIdx) => {
        if (!cell.style.position || cell.style.position === 'static') cell.style.position = 'relative';
        if (rIdx === 0 && cIdx < cells.length - 1 && !cell.querySelector(':scope > .re-col-resize-handle')) { const handle = document.createElement('div'); handle.className = 're-col-resize-handle'; handle.setAttribute('contenteditable', 'false'); handle.addEventListener('mousedown', (e) => startColResize(e, table, cIdx)); cell.appendChild(handle); }
        if (rIdx < rows.length - 1 && !cell.querySelector(':scope > .re-row-resize-handle')) { const handle = document.createElement('div'); handle.className = 're-row-resize-handle'; handle.setAttribute('contenteditable', 'false'); handle.addEventListener('mousedown', (e) => startRowResize(e, tr)); cell.appendChild(handle); }
      });
    });
  });
}

const EDITOR_CSS = `
  .re-toolbar { background: ${C.navy}; color: #f2f2f2; padding: 5px 14px; display: flex; align-items: center; gap: 6px; flex-wrap: wrap; font-family: "Segoe UI", Arial, sans-serif; border-bottom: 1px solid ${C.border}; flex-shrink: 0; transition: background 0.3s ease; }
  .re-toolbar button { font-family: "Segoe UI", Arial, sans-serif; font-size: 14px; border: 1px solid transparent; background: transparent; color: #f2f2f2; padding: 5px 8px; border-radius: 4px; cursor: pointer; transition: background .12s ease; display: inline-flex; align-items: center; justify-content: center; line-height: 1; min-width: 28px; height: 28px; }
  .re-toolbar button:hover { background: rgba(255,255,255,0.12); } .re-toolbar button:active { transform: scale(0.96); } .re-toolbar button:disabled { opacity: 0.35; cursor: not-allowed; } .re-toolbar .divider { width: 1px; height: 20px; background: rgba(255,255,255,0.15); margin: 0 2px; flex-shrink: 0; }
  .re-stage { flex: 1; overflow-y: auto; overflow-x: auto; background: ${C.canvas}; display: flex; justify-content: center; align-items: flex-start; padding: 24px 16px 60px; position: relative; }
  .re-page-shell { width: ${PAGE_W_IN}in; min-height: ${PAGE_H_IN}in; background: ${C.paper}; box-shadow: 0 4px 24px rgba(0,0,0,0.18), 0 1px 3px rgba(0,0,0,0.1); overflow: visible; flex-shrink: 0; transform-origin: top center; }
  .re-editor-wrap { padding: 0 ${SIDE_PADDING_IN}in; }
  .re-editor { position: relative; outline: none; font-family: "Times New Roman", Georgia, serif; font-size: 12pt; line-height: 1.4; color: ${C.ink}; white-space: pre-wrap; word-wrap: break-word; overflow-wrap: anywhere; min-height: calc(${PAGE_H_IN}in - ${SIDE_PADDING_IN * 2}in); padding: ${PAGE_MARGIN_TOP_IN}in 0 ${PAGE_MARGIN_BOTTOM_IN}in; caret-color: ${C.ink}; box-sizing: border-box; }
  .re-editor::selection { background: rgba(37, 99, 235, 0.3); } .re-editor *::selection { background: rgba(37, 99, 235, 0.3); } .re-editor:not(:focus) ::selection { background: rgba(37, 99, 235, 0.2); }
  .re-editor.has-selection { caret-color: transparent; } .re-editor.has-selection *[data-selected="true"] { background-color: rgba(37, 99, 235, 0.2) !important; }
  .re-editor[data-empty="true"]:before { content: attr(data-placeholder); color: #a3a7b5; font-style: italic; white-space: normal; display: block; pointer-events: none; }
  .re-editor p, .re-editor div { margin: 0 0 0.4em; } .re-editor ul, .re-editor ol { margin: 0 0 0.4em; padding-left: 0.4in; } .re-editor li { margin: 0 0 0.2em; } .re-editor table { border-collapse: collapse; line-height: 1.25; } .re-editor table td { border: 1px solid #999; padding: 4px 8px; min-width: 32px; } .re-editor h1 { font-size: 20pt; font-weight: 700; margin: 14pt 0 10pt; } .re-editor h2 { font-size: 16pt; font-weight: 700; margin: 12pt 0 8pt; } .re-editor h3 { font-size: 14pt; font-weight: 700; margin: 10pt 0 6pt; } .re-editor img { max-width: 100%; height: auto; } .re-editor a { color: ${C.blue}; text-decoration: underline; }
  .re-editor .re-page-break-marker { user-select: none !important; margin: 0 -${SIDE_PADDING_IN}in; pointer-events: none !important; caret-color: transparent !important; } .re-marker-gap { height: ${MARKER_GAP_PX}px; background: ${C.canvas}; box-shadow: inset 0 4px 6px -4px rgba(0,0,0,0.08), inset 0 -4px 6px -4px rgba(0,0,0,0.08); } .re-editor .re-trailing-spacer { pointer-events: none !important; user-select: none !important; caret-color: transparent !important; } .re-editor .re-watermark { position: absolute; text-align: center; font-size: 110px; font-weight: 900; color: rgba(180,83,9,0.06); transform: rotate(-30deg); white-space: nowrap; letter-spacing: 0.15em; font-family: 'Arial Black', sans-serif; pointer-events: none !important; user-select: none !important; caret-color: transparent !important; z-index: 0; }
  .re-col-resize-handle { position: absolute; top: 0; right: -3px; width: 6px; height: 100%; cursor: col-resize; z-index: 5; } .re-col-resize-handle:hover { background: rgba(27,42,107,0.25); } .re-row-resize-handle { position: absolute; left: 0; right: 0; bottom: -3px; height: 6px; cursor: row-resize; z-index: 5; } .re-row-resize-handle:hover { background: rgba(27,42,107,0.25); }
  .re-toolbar .ant-select { vertical-align: middle; } .re-toolbar .ant-select-selector { background: rgba(255,255,255,0.08) !important; border: 1px solid rgba(255,255,255,0.18) !important; border-radius: 4px !important; height: 26px !important; min-height: 26px !important; color: #f2f2f2 !important; font-size: 12px !important; font-weight: 600 !important; padding: 0 8px !important; } .re-toolbar .ant-select-selector:hover { border-color: rgba(255,255,255,0.35) !important; } .re-toolbar .ant-select-selection-item { color: #f2f2f2 !important; font-size: 12px !important; font-weight: 600 !important; line-height: 24px !important; } .re-toolbar .ant-select-arrow { color: rgba(255,255,255,0.5) !important; font-size: 10px !important; } .re-toolbar .ant-select-disabled .ant-select-selector { opacity: 0.35 !important; cursor: not-allowed !important; } .ant-select-dropdown { z-index: 99999 !important; } .ant-select-dropdown .ant-select-item { font-size: 12px !important; padding: 4px 10px !important; } .ant-select-dropdown .ant-select-item-option-selected { font-weight: 700 !important; }
`;

export default function ReplyEditorModal({ noticeId, notice, replyId, mode = 'edit', isAssignedMaker = false, isAssignedChecker = false, isCeoRole = false, currentUserId, onClose, onSaved }) {
  const isReviewMode = mode === 'review';
  const [expanded, setExpanded] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [showSupports, setShowSupports] = useState(false); 
  const [title, setTitle] = useState('');
  const [reply, setReply] = useState(null);
  const [replyHistory, setReplyHistory] = useState([]);
  const [loading, setLoading] = useState(!!replyId);
  const [saving, setSaving] = useState(false);
  const [checkerEditMode, setCheckerEditMode] = useState(false);
  const [saveStatus, setSaveStatus] = useState('');
  const [error, setError] = useState('');
  const [wordCount, setWordCount] = useState(0);
  const [pageCount, setPageCount] = useState(1);
  const [fontSize, setFontSize] = useState('12pt');
  const [fontFamily, setFontFamily] = useState("'Times New Roman', Times, serif");
  const [lineHeight, setLineHeight] = useState('1.4');
  const [textColor, setTextColor] = useState('#1c1c1c');
  const [highlightColor, setHighlightColor] = useState('#ffff00');
  const [zoom, setZoom] = useState(100);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [showConfirmSend, setShowConfirmSend] = useState(false);
  const [showAcceptModal, setShowAcceptModal] = useState(false);
  const [showConfirmDelete, setShowConfirmDelete] = useState(false);
  const [toast, setToast] = useState(null);
  const [importingDocx, setImportingDocx] = useState(false);
  const [isLastReply, setIsLastReply] = useState(false);
  const [isEditorEmpty, setIsEditorEmpty] = useState(true);

  // ✅ States for Supporting Docs
  const [showSupportModal, setShowSupportModal] = useState(false);
  const [existingSupports, setExistingSupports] = useState([]);
  const [newSupportFiles, setNewSupportFiles] = useState([]);

  const editorRef = useRef(null);
  const lastSavedRef = useRef({ title: '', content: '' });
  const currentReplyIdRef = useRef(replyId);
  const originalReplyIdRef = useRef(replyId);
  const fileInputRef = useRef(null);
  const recalcTimerRef = useRef(null);
  const savedSelectionRef = useRef(null);
  const isTypingRef = useRef(false);
  const unsavedContentRef = useRef({ title: '', content: '', isNew: false });

  const status = reply?.status || 'draft';
  const isOwner = reply?.created_by === currentUserId;
  const isApproved = status === 'approved';
  const canMakerEdit = !isReviewMode && isAssignedMaker && (isOwner || !reply) && ['draft', 'rejected'].includes(status);
  const canCheckerEdit = isReviewMode && (isAssignedChecker || isCeoRole) && status === 'pending' && checkerEditMode;
  const canEditContent = canMakerEdit || canCheckerEdit;
  const canReopen = !isReviewMode && isAssignedMaker && isOwner && status === 'rejected';
  const isFounder = isCeoRole;
  const canApprove = isReviewMode && ((status === 'pending' && (isAssignedChecker || isFounder)) || (status === 'escalated' && isFounder));
  const canReject = canApprove;
  const canDelete = !isReviewMode && isAssignedMaker && isOwner && ['draft', 'rejected'].includes(status) && !!currentReplyIdRef.current;
  const canDownload = isApproved;
  const showCheckerEditToggle = isReviewMode && (isAssignedChecker || isCeoRole) && ['pending', 'escalated'].includes(status);

  const currentDraftIndex = currentReplyIdRef.current ? replyHistory.findIndex(r => r.id === currentReplyIdRef.current) : -1;
  const displayIndex = currentDraftIndex >= 0 ? currentDraftIndex + 1 : 0;
  const displayTotal = replyHistory.length;
  const hasPrevDraft = currentDraftIndex > 0;
  const hasNextDraft = currentDraftIndex >= 0 && currentDraftIndex < replyHistory.length - 1;

  const stripMarkers = (html) => { const t = document.createElement('div'); t.innerHTML = html; t.querySelectorAll('.re-page-break-marker, .re-trailing-spacer, .re-watermark, .re-col-resize-handle, .re-row-resize-handle').forEach(el => el.remove()); return t.innerHTML; };
  const getCurrentContent = () => editorRef.current ? stripMarkers(editorRef.current.innerHTML) : '';
  const hasUnsavedChanges = () => title !== lastSavedRef.current.title || getCurrentContent() !== lastSavedRef.current.content;


  useEffect(() => {
    const handleSelectionChange = () => {
      const sel = window.getSelection(); if (!sel || sel.rangeCount === 0 || !editorRef.current) return;
      if (editorRef.current.contains(sel.anchorNode)) savedSelectionRef.current = sel.getRangeAt(0).cloneRange();
    };
    document.addEventListener('selectionchange', handleSelectionChange);
    return () => document.removeEventListener('selectionchange', handleSelectionChange);
  }, []);

  const recalcPagination = useCallback(() => {
    const editor = editorRef.current; if (!editor) return;
    if (editor.children.length === 0) { const emptyLine = document.createElement('div'); emptyLine.appendChild(document.createElement('br')); editor.appendChild(emptyLine); }
    ensureTableResizeHandles(editor);
    const budget = PAGE_CONTENT_BUDGET_PX;
    const sel = window.getSelection(); const savedRange = sel && sel.rangeCount > 0 && editor.contains(sel.anchorNode) ? sel.getRangeAt(0).cloneRange() : null;
    Array.from(editor.querySelectorAll('.re-page-break-marker, .re-trailing-spacer, .re-watermark')).forEach(n => n.remove());
    const hasRealContent = !!(editor.textContent && editor.textContent.trim().length > 0) || !!editor.querySelector('img, table'); setIsEditorEmpty(!hasRealContent);
    Array.from(editor.childNodes).forEach((node) => { if (node.nodeType === Node.TEXT_NODE && node.textContent.length > 0) { const div = document.createElement('div'); editor.insertBefore(div, node); div.appendChild(node); } });
    const editorTop = editor.getBoundingClientRect().top; let pageStartRel = 0; const breakBeforeNodes = [];
    const getLineRects = (el) => { const r = document.createRange(); r.selectNodeContents(el); return Array.from(r.getClientRects()); };
    const getTextNodesIn = (el) => { const n=[]; const w=document.createTreeWalker(el,NodeFilter.SHOW_TEXT); let nd=w.nextNode(); while(nd){if(nd.textContent.length>0)n.push(nd);nd=w.nextNode();} return n; };
    const findSplitPosition = (el, thresholdRel) => {
      const textNodes = getTextNodesIn(el); if (textNodes.length === 0) return null;
      const total = textNodes.reduce((sum, tn) => sum + tn.length, 0);
      const posAt = (fo) => { let rem=fo; for(const tn of textNodes){if(rem<=tn.length)return{node:tn,offset:rem};rem-=tn.length;} const last=textNodes[textNodes.length-1]; return{node:last,offset:last.length}; };
      const range = document.createRange(); let lo=0,hi=total;
      while(lo<hi){ const mid=Math.floor((lo+hi)/2); const pos=posAt(mid); range.setStart(textNodes[0],0); range.setEnd(pos.node,pos.offset); const rects=range.getClientRects(); const lb=rects.length?rects[rects.length-1].bottom-editorTop:-Infinity; if(lb<=thresholdRel)lo=mid+1;else hi=mid; }
      const flatText=textNodes.map(tn=>tn.textContent).join(''); let snapped=lo,back=0; while(snapped>0&&!/\s/.test(flatText[snapped-1])&&back<200){snapped--;back++;} if(back>=200||snapped===0)snapped=lo;
      return posAt(snapped);
    };
    let child = editor.firstElementChild, guard = 0;
    while (child && guard < 5000) {
      guard++; if (child.classList.contains('re-page-break-marker') || child.classList.contains('re-trailing-spacer') || child.classList.contains('re-watermark')) { child = child.nextElementSibling; continue; }
      const rect = child.getBoundingClientRect(); const topRel = rect.top - editorTop; const bottomRel = rect.bottom - editorTop;
      if (bottomRel - pageStartRel <= budget) { child = child.nextElementSibling; continue; }
      const threshold = pageStartRel + budget; const containsTable = !!child.querySelector('table'); const lineRects = containsTable ? [] : getLineRects(child); const crosses = lineRects.some(lr => lr.bottom - editorTop > threshold);
      const splitPos = containsTable || !crosses || lineRects.length <= 1 ? null : findSplitPosition(child, threshold);
      if (!splitPos || !child.contains(splitPos.node)) { breakBeforeNodes.push(child); pageStartRel = topRel; child = child.nextElementSibling; continue; }
      const tailRange = document.createRange(); tailRange.setStart(splitPos.node, splitPos.offset); tailRange.setEndAfter(child.lastChild || child); const tailFrag = tailRange.extractContents(); const newDiv = document.createElement('div'); newDiv.appendChild(tailFrag);
      child.parentNode.insertBefore(newDiv, child.nextSibling); breakBeforeNodes.push(newDiv); pageStartRel = newDiv.getBoundingClientRect().top - editorTop; child = newDiv;
    }
    breakBeforeNodes.forEach((n) => { const marker = document.createElement('div'); marker.className = 're-page-break-marker'; marker.setAttribute('contenteditable', 'false'); marker.innerHTML = '<div class="re-marker-gap"></div>'; editor.insertBefore(marker, n); });
    const lastMarker = Array.from(editor.querySelectorAll('.re-page-break-marker')).pop(); const afterLastBreakTop = lastMarker ? lastMarker.getBoundingClientRect().bottom - editorTop : 0;
    const remaining = Array.from(editor.children).filter(n => !n.classList.contains('re-page-break-marker') && !n.classList.contains('re-trailing-spacer') && !n.classList.contains('re-watermark'));
    const lastChild = remaining[remaining.length - 1]; const contentEndRel = lastChild ? lastChild.getBoundingClientRect().bottom - editorTop : afterLastBreakTop; const usedOnPage = contentEndRel - afterLastBreakTop; const rem = budget - usedOnPage;
    if (rem > 1 && hasRealContent) { const spacer = document.createElement('div'); spacer.className = 're-trailing-spacer'; spacer.setAttribute('contenteditable', 'false'); spacer.style.height = `${rem}px`; editor.appendChild(spacer); }
    const numBreaks = editor.querySelectorAll('.re-page-break-marker').length; const totalPages = numBreaks + 1; setPageCount(totalPages);
    if (!isApproved) { const pageH = PAGE_H_IN * CSS_PX_PER_IN; for (let i = 0; i < totalPages; i++) { const wm = document.createElement('div'); wm.className = 're-watermark'; wm.setAttribute('contenteditable', 'false'); wm.style.position = 'absolute'; wm.style.top = `${i * (pageH + MARKER_GAP_PX) + pageH / 2 - 60}px`; wm.style.left = '0'; wm.style.right = '0'; wm.textContent = 'DRAFT'; editor.appendChild(wm); } }
    const text = editor.innerText.trim(); setWordCount(text.length ? text.split(/\s+/).length : 0); if (savedRange) { try { sel.removeAllRanges(); sel.addRange(savedRange); } catch {} }
  }, [isApproved]);

  const isDropdownOpenRef = useRef(false);
  const scheduleMeasure = useCallback((force = false) => {
    if (recalcTimerRef.current) clearTimeout(recalcTimerRef.current);
    if (isDropdownOpenRef.current) return;
    if (force) { recalcTimerRef.current = setTimeout(recalcPagination, 100); return; }
    recalcTimerRef.current = setTimeout(() => { isTypingRef.current = false; recalcPagination(); }, 2000); isTypingRef.current = true;
  }, [recalcPagination]);

  useEffect(() => {
    if (!replyId) { setLoading(false); return; }
    setLoading(true);
    api.get(`/legal-services/notice-replies/${replyId}/`)
      .then((res) => { const d = res.data; setReply(d); setTitle(d.title || ''); setIsLastReply(!!d.is_final_reply); lastSavedRef.current = { title: d.title || '', content: d.content_html || '' }; currentReplyIdRef.current = d.id; originalReplyIdRef.current = d.id; setTimeout(() => { if (editorRef.current) { editorRef.current.innerHTML = stripMarkers(d.content_html || ''); recalcPagination(); } }, 50); })
      .catch(() => setError('Failed to load reply.'))
      .finally(() => setLoading(false));
  }, [replyId, recalcPagination]);

  // // ✅ Fetch Supporting Docs for this Reply
  // useEffect(() => {
  //   if (replyId) {
  //     api.get('/legal-services/notice-documents/', { params: { notice: noticeId } })
  //       .then(res => {
  //         const list = Array.isArray(res.data) ? res.data : (res.data.results || []);
  //         // 🔴 STRICT FRONTEND FILTER: Only keep supports linked to THIS replyId
  //         const mySupports = list.filter(d => 
  //           ['pending_support', 'supporting_doc'].includes(d.doc_type) && 
  //           String(d.reply_version) === String(replyId)
  //         );
  //         setExistingSupports(mySupports);
  //       })
  //       .catch(() => setExistingSupports([]));
  //   } else {
  //     setExistingSupports([]);
  //   }
  // }, [replyId, noticeId]);

  // ✅ Fetch Supporting Docs for this Reply (UPDATED to support History switching)
  useEffect(() => {
    const activeId = reply?.id || replyId; 

    if (activeId) {
      api.get('/legal-services/notice-documents/', { params: { notice: noticeId } })
        .then(res => {
          const list = Array.isArray(res.data) ? res.data : (res.data.results || []);
          // 2. Filter using activeId
          const mySupports = list.filter(d => 
            ['pending_support', 'supporting_doc'].includes(d.doc_type) && 
            String(d.reply_version) === String(activeId)
          );
          setExistingSupports(mySupports);
        })
        .catch(() => setExistingSupports([]));
    } else {
      setExistingSupports([]);
    }
  }, [reply?.id, replyId, noticeId]); 


  useEffect(() => {
    if (loading || !editorRef.current) return;
    const editor = editorRef.current;
    const t = setTimeout(() => {
      recalcPagination();
      if (!editor.contains(document.activeElement)) editor.focus();
      const hasRealContent = editor.textContent.trim().length > 0 || editor.querySelector('img, table');
      if (!hasRealContent) { try { const sel = window.getSelection(); const range = document.createRange(); range.selectNodeContents(editor); range.collapse(true); sel.removeAllRanges(); sel.addRange(range); savedSelectionRef.current = range.cloneRange(); } catch {} }
    }, 60); return () => clearTimeout(t);
  }, [loading, recalcPagination]);

  const handleStageMouseDown = (e) => {
    const editor = editorRef.current; if (!editor || e.target === editor || editor.contains(e.target)) return;
    if (e.target.closest('.re-editor, button, input, select, a, .re-col-resize-handle, .re-row-resize-handle')) return;
    e.preventDefault(); editor.focus(); try { const sel = window.getSelection(); const range = document.createRange(); range.selectNodeContents(editor); range.collapse(false); sel.removeAllRanges(); sel.addRange(range); } catch {}
  };

  const loadHistory = useCallback(() => {
    if (!noticeId) return;
    api.get('/legal-services/notice-replies/', { params: { notice: noticeId } }).then((res) => { setReplyHistory(Array.isArray(res.data) ? res.data : (res.data.results || [])); }).catch(() => setReplyHistory([]));
  }, [noticeId]);

  useEffect(() => { loadHistory(); }, [loadHistory]);
  const showToast = (msg) => { setToast(msg); setTimeout(() => setToast(null), 2500); };
  useEffect(() => { recalcPagination(); return () => { if (recalcTimerRef.current) clearTimeout(recalcTimerRef.current); }; }, [recalcPagination]);

  const focusEditor = () => { if (editorRef.current) editorRef.current.focus(); };
  const runCommand = (cmd, val = null) => {
    editorRef.current && editorRef.current.focus(); let sel = window.getSelection(); let hasSel = sel && sel.rangeCount > 0 && editorRef.current && editorRef.current.contains(sel.anchorNode);
    if (!hasSel && savedSelectionRef.current) { try { sel.removeAllRanges(); sel.addRange(savedSelectionRef.current); } catch {} }
    document.execCommand(cmd, false, val); sel = window.getSelection(); if (sel && sel.rangeCount > 0 && editorRef.current && editorRef.current.contains(sel.anchorNode)) { savedSelectionRef.current = sel.getRangeAt(0).cloneRange(); } scheduleMeasure(true);
  };

  const convertFontTagsToSpans = (root, applyStyle) => { if (!root) return []; const created = []; let guard = 0; let el; while ((el = root.querySelector('font')) && guard < 5000) { guard++; const span = document.createElement('span'); applyStyle(span); while (el.firstChild) span.appendChild(el.firstChild); el.replaceWith(span); created.push(span); } return created; };
  const reselectSpans = (spans) => { if (!spans || spans.length === 0) return; try { const sel = window.getSelection(); const range = document.createRange(); range.setStartBefore(spans[0]); range.setEndAfter(spans[spans.length - 1]); sel.removeAllRanges(); sel.addRange(range); savedSelectionRef.current = range.cloneRange(); } catch {} };
  const applyRangeCommand = (command, value, styleSetter) => { try { document.execCommand('styleWithCSS', false, true); } catch {} document.execCommand(command, false, value); try { document.execCommand('styleWithCSS', false, false); } catch {} const created = convertFontTagsToSpans(editorRef.current, styleSetter); if (created.length) { reselectSpans(created); } else { const sel = window.getSelection(); if (sel && sel.rangeCount > 0 && editorRef.current && editorRef.current.contains(sel.anchorNode)) { savedSelectionRef.current = sel.getRangeAt(0).cloneRange(); } } };

  const applyFontFamily = (f) => {
    if (!f) return; editorRef.current && editorRef.current.focus(); let sel = window.getSelection(); let hasSel = sel && sel.rangeCount > 0 && !sel.isCollapsed && editorRef.current && editorRef.current.contains(sel.anchorNode);
    if (!hasSel && savedSelectionRef.current) { try { sel.removeAllRanges(); sel.addRange(savedSelectionRef.current); hasSel = sel && sel.rangeCount > 0 && !sel.isCollapsed && editorRef.current && editorRef.current.contains(sel.anchorNode); } catch {} }
    if (!hasSel) { setFontFamily(f); if (editorRef.current) editorRef.current.style.fontFamily = f; scheduleMeasure(true); return; }
    setFontFamily(f); applyRangeCommand('fontName', f, (span) => { span.style.fontFamily = f; }); scheduleMeasure(true);
  };

  const applyFontSize = (pt) => {
    if (!pt) return; editorRef.current && editorRef.current.focus(); let sel = window.getSelection(); let hasSel = sel && sel.rangeCount > 0 && !sel.isCollapsed && editorRef.current && editorRef.current.contains(sel.anchorNode);
    if (!hasSel && savedSelectionRef.current) { try { sel.removeAllRanges(); sel.addRange(savedSelectionRef.current); hasSel = sel && sel.rangeCount > 0 && !sel.isCollapsed && editorRef.current && editorRef.current.contains(sel.anchorNode); } catch {} }
    if (!hasSel) { setFontSize(pt); if (editorRef.current) editorRef.current.style.fontSize = pt; scheduleMeasure(true); return; }
    setFontSize(pt); applyRangeCommand('fontSize', '7', (span) => { span.style.fontSize = pt; }); scheduleMeasure(true);
  };
 
  const applyLineHeight = (lh) => { if (!lh) return; setLineHeight(lh); if (editorRef.current) editorRef.current.style.lineHeight = lh; scheduleMeasure(true); };

  const applyTextColor = (color) => {
    if (!color) return; setTextColor(color); editorRef.current && editorRef.current.focus(); let sel = window.getSelection(); let hasSel = sel && sel.rangeCount > 0 && !sel.isCollapsed && editorRef.current && editorRef.current.contains(sel.anchorNode);
    if (!hasSel && savedSelectionRef.current) { try { sel.removeAllRanges(); sel.addRange(savedSelectionRef.current); hasSel = sel && sel.rangeCount > 0 && !sel.isCollapsed && editorRef.current && editorRef.current.contains(sel.anchorNode); } catch {} }
    if (!hasSel) { if (editorRef.current) editorRef.current.style.color = color; return; }
    applyRangeCommand('foreColor', color, (span) => { span.style.color = color; }); scheduleMeasure(true);
  };

  const applyHighlight = (color) => {
    if (!color) return; setHighlightColor(color); editorRef.current && editorRef.current.focus(); let sel = window.getSelection(); let hasSel = sel && sel.rangeCount > 0 && !sel.isCollapsed && editorRef.current && editorRef.current.contains(sel.anchorNode);
    if (!hasSel && savedSelectionRef.current) { try { sel.removeAllRanges(); sel.addRange(savedSelectionRef.current); hasSel = sel && sel.rangeCount > 0 && !sel.isCollapsed && editorRef.current && editorRef.current.contains(sel.anchorNode); } catch {} }
    if (!hasSel) return;
    applyRangeCommand('hiliteColor', color, (span) => { span.style.backgroundColor = color; }); scheduleMeasure(true);
  };

  const insertList = (styleType, ordered) => { editorRef.current && editorRef.current.focus(); let sel = window.getSelection(); if ((!sel || sel.rangeCount === 0 || !editorRef.current.contains(sel.anchorNode)) && savedSelectionRef.current) { try { sel.removeAllRanges(); sel.addRange(savedSelectionRef.current); } catch {} } document.execCommand(ordered ? 'insertOrderedList' : 'insertUnorderedList'); sel = window.getSelection(); if (sel && sel.anchorNode) { let n = sel.anchorNode; while (n && n.nodeName !== 'UL' && n.nodeName !== 'OL') n = n.parentNode; if (n) n.style.listStyleType = styleType; } scheduleMeasure(true); };
  const insertTable = () => { const ri = window.prompt('Rows?', '3'); if (ri === null) return; const ci = window.prompt('Columns?', '3'); if (ci === null) return; const rows = Math.max(1, Math.min(20, parseInt(ri,10)||3)); const cols = Math.max(1, Math.min(10, parseInt(ci,10)||3)); const wp = (100/cols).toFixed(3); let html = '<table style="table-layout:fixed;width:100%;border-collapse:collapse;margin:6px 0;"><colgroup>'; for (let c=0;c<cols;c++) html += `<col style="width:${wp}%;">`; html += '</colgroup>'; for (let r=0;r<rows;r++) { html += '<tr>'; for (let c=0;c<cols;c++) { html += '<td style="position:relative;border:1px solid #999;padding:6px 8px;">&nbsp;</td>'; } html += '</tr>'; } html += '</table>'; focusEditor(); document.execCommand('insertHTML', false, html); scheduleMeasure(true); };
  const handleKeyDown = (e) => { if (e.key === 'Tab') { e.preventDefault(); document.execCommand('insertHTML', false, '&nbsp;&nbsp;&nbsp;&nbsp;'); scheduleMeasure(true); } if (e.key === 'Enter') { setTimeout(() => scheduleMeasure(true), 50); } };

  const handlePaste = (e) => {
    const cd = e.clipboardData || window.clipboardData; const html = cd.getData('text/html'); const plain = cd.getData('text/plain') || '';
    if (!html.trim() && !plain.trim()) { const imageItem = Array.from(cd.items || []).find((it) => it.kind === 'file' && it.type.startsWith('image/')); if (imageItem) { e.preventDefault(); const file = imageItem.getAsFile(); if (file) { const reader = new FileReader(); reader.onload = () => { focusEditor(); document.execCommand('insertHTML', false, `<img src="${reader.result}" style="max-width:100%;">`); scheduleMeasure(true); }; reader.readAsDataURL(file); } return; } if (!cd.items || cd.items.length === 0) return; }
    e.preventDefault(); let htmlToInsert; if (html && html.trim()) { htmlToInsert = sanitizeClipboardHtml(html); } else { const paragraphs = plain.split(/\r?\n/).map(p => p.trim()).filter(Boolean); htmlToInsert = (paragraphs.length ? paragraphs : [plain]).map(p => `<div>${escapeHtml(p)}</div>`).join(''); } document.execCommand('insertHTML', false, htmlToInsert); scheduleMeasure(true);
  };

  const handleDocxUpload = async (e) => {
    const file = e.target.files?.[0]; if (!file) return;
    if (file.type && file.type.startsWith('image/')) {
      setImportingDocx(true); try { const reader = new FileReader(); const dataUrl = await new Promise((resolve, reject) => { reader.onload = () => resolve(reader.result); reader.onerror = reject; reader.readAsDataURL(file); }); if (editorRef.current) { focusEditor(); document.execCommand('insertHTML', false, `<img src="${dataUrl}" style="max-width:100%;">`); scheduleMeasure(true); showToast('✅ Image imported'); } } catch (err) { console.error('Image import failed:', err); showToast('⚠ Failed to import image'); } finally { setImportingDocx(false); if (fileInputRef.current) fileInputRef.current.value = ''; } return;
    }
    if (!file.name.match(/\.docx?$/i)) { showToast('⚠ Please upload a .docx file or an image'); return; }
    setImportingDocx(true);
    try {
      const arrayBuffer = await file.arrayBuffer();
      const mammothResult = await mammoth.convertToHtml({ arrayBuffer }, { styleMap: ["p[style-name='Heading 1'] => h1:fresh", "p[style-name='Heading 2'] => h2:fresh", "p[style-name='Heading 3'] => h3:fresh", "p[style-name='Heading 4'] => h4:fresh", "p[style-name='Title'] => h1:fresh", "b => strong", "i => em", "u => u", "strike => s"], includeDefaultStyleMap: true, convertImage: mammoth.images.inline((element) => { return element.read('base64').then((imageBuffer) => { return { src: `data:${element.contentType};base64,${imageBuffer}` }; }); }) });
      let finalHtml = mammothResult.value || '';
      try {
        const JSZip = (await import('jszip')).default; const zip = await JSZip.loadAsync(arrayBuffer); const htmlFile = zip.file('word/document.xml');
        if (htmlFile) {
          const xmlContent = await htmlFile.async('string'); const alignments = {}; const paraMatches = xmlContent.matchAll(/<w:p [^>]*>[\s\S]*?<\/w:p>/g); let paraIndex = 0;
          for (const match of paraMatches) { const paraXml = match[0]; if (paraXml.includes('<w:jc w:val="center"')) { alignments[paraIndex] = 'center'; } else if (paraXml.includes('<w:jc w:val="right"')) { alignments[paraIndex] = 'right'; } else if (paraXml.includes('<w:jc w:val="both"') || paraXml.includes('<w:jc w:val="distribute"')) { alignments[paraIndex] = 'justify'; } const indMatch = paraXml.match(/<w:ind w:left="(\d+)"/); if (indMatch) { const twips = parseInt(indMatch[1], 10); const inches = twips / 1440; if (!alignments[paraIndex]) alignments[paraIndex] = ''; alignments[`${paraIndex}_indent`] = `${inches.toFixed(2)}in`; } paraIndex++; }
          const tempDiv = document.createElement('div'); tempDiv.innerHTML = finalHtml; const allParagraphs = tempDiv.querySelectorAll('p, h1, h2, h3, h4, h5, h6');
          allParagraphs.forEach((p, idx) => { if (alignments[idx]) p.style.textAlign = alignments[idx]; if (alignments[`${idx}_indent`]) p.style.marginLeft = alignments[`${idx}_indent`]; }); finalHtml = tempDiv.innerHTML;
        }
      } catch (zipErr) {}
      finalHtml = sanitizeClipboardHtml(finalHtml);
      if (editorRef.current) { editorRef.current.innerHTML = finalHtml; editorRef.current.focus(); recalcPagination(); showToast('✅ DOCX imported'); if (!title) setTitle(file.name.replace(/\.docx?$/i, '')); }
    } catch (err) { console.error('DOCX import failed:', err); showToast('⚠ Failed to import'); } finally { setImportingDocx(false); if (fileInputRef.current) fileInputRef.current.value = ''; }
  };

  const flushAndClose = () => { if (canMakerEdit && hasUnsavedChanges()) { if (!window.confirm('Unsaved changes. Close anyway?')) return; } onClose && onClose(); };

  // ✅ Attach supports to exactly this HTML reply ID and refresh locally
  const uploadNewSupports = async (parentReplyId) => {
    if (newSupportFiles.length === 0) return;
    for (const file of newSupportFiles) {
      const fd = new FormData();
      fd.append('notice', noticeId);
      fd.append('doc_type', 'pending_support');
      fd.append('file', file);
      fd.append('reply_version', parentReplyId);
      await api.post('/legal-services/notice-documents/', fd);
    }
    setNewSupportFiles([]);
    
    // Reload only supports for this specific HTML reply
    try {
      const res = await api.get('/legal-services/notice-documents/', { params: { notice: noticeId } });
      const list = Array.isArray(res.data) ? res.data : (res.data.results || []);
      // 🔴 STRICT FRONTEND FILTER
      const mySupports = list.filter(d => 
        ['pending_support', 'supporting_doc'].includes(d.doc_type) && 
        String(d.reply_version) === String(parentReplyId)
      );
      setExistingSupports(mySupports);
    } catch {}
  };

  const handleSaveDraft = async () => {
    if (!title.trim()) { setError('Please enter a file name.'); return; }
    setSaving(true); setError('');
    try {
      const content = getCurrentContent();
      const payload = { notice: noticeId, title: title.trim(), content_html: content, is_final_reply: isLastReply };
      let saved;
      if (currentReplyIdRef.current) { saved = await api.patch(`/legal-services/notice-replies/${currentReplyIdRef.current}/`, payload); }
      else { saved = await api.post('/legal-services/notice-replies/', payload); currentReplyIdRef.current = saved.data.id; originalReplyIdRef.current = saved.data.id; }
      
      await uploadNewSupports(saved.data.id); // Attach Supports

      setReply(saved.data); lastSavedRef.current = { title: payload.title, content };
      setSaveStatus('✓ Saved'); setTimeout(() => setSaveStatus(''), 2000);
      loadHistory(); onSaved && onSaved(saved.data, 'save'); showToast('💾 Draft saved');
    } catch (e) { setError('Failed to save.'); }
    finally { setSaving(false); }
  };

  const handleCheckerSave = async () => {
    if (!title.trim()) { setError('Please enter a file name.'); return; }
    setSaving(true); setError('');
    try {
      const content = getCurrentContent();
      await api.patch(`/legal-services/notice-replies/${currentReplyIdRef.current}/`, { title: title.trim(), content_html: content });
      lastSavedRef.current = { title: title.trim(), content }; setSaveStatus('✓ Saved'); setTimeout(() => setSaveStatus(''), 2000); showToast('💾 Changes saved');
    } catch (e) { setError('Failed to save.'); } finally { setSaving(false); }
  };

  const handleSendForReview = async () => {
    setShowConfirmSend(false);
    if (!title.trim()) { setError('Please enter a file name.'); return; }
    setSaving(true); setError('');
    try {
      const content = getCurrentContent();
      const payload = { notice: noticeId, title: title.trim(), content_html: content, is_final_reply: isLastReply };
      let saved;
      if (currentReplyIdRef.current) { saved = await api.patch(`/legal-services/notice-replies/${currentReplyIdRef.current}/`, payload); }
      else { saved = await api.post('/legal-services/notice-replies/', payload); currentReplyIdRef.current = saved.data.id; originalReplyIdRef.current = saved.data.id; }
      
      await uploadNewSupports(saved.data.id); // Attach Supports

      lastSavedRef.current = { title: payload.title, content };
      const res = await api.post(`/legal-services/notice-replies/${currentReplyIdRef.current}/send-for-review/`);
      setReply(res.data); loadHistory(); onSaved && onSaved(res.data, 'send'); showToast('✅ Sent for review');
    } catch (e) { setError('Failed'); }
    finally { setSaving(false); }
  };

  const handleReopen = async () => { setSaving(true); try { const res = await api.post(`/legal-services/notice-replies/${currentReplyIdRef.current}/reopen/`); setReply(res.data); loadHistory(); onSaved && onSaved(res.data, 'reopen'); showToast('📝 Reopened'); } catch (e) { setError('Failed'); } finally { setSaving(false); } };
  const handleApprove = async (moveToCeo = false) => { setShowAcceptModal(false); setSaving(true); setError(''); try { const cc = getCurrentContent(); if (canCheckerEdit && (title !== lastSavedRef.current.title || cc !== lastSavedRef.current.content)) { await api.patch(`/legal-services/notice-replies/${currentReplyIdRef.current}/`, { title: title.trim(), content_html: cc }); } const endpoint = moveToCeo ? 'escalate' : 'approve'; const res = await api.post(`/legal-services/notice-replies/${currentReplyIdRef.current}/${endpoint}/`); setReply(res.data); onSaved && onSaved(res.data, 'approve'); showToast(moveToCeo ? '↑ Escalated to CEO' : '✅ Reply approved'); setTimeout(() => onClose && onClose(), 800); } catch (e) { setError('Failed'); throw e; } finally { setSaving(false); } };
  const handleReject = async (reason) => { try { const res = await api.post(`/legal-services/notice-replies/${currentReplyIdRef.current}/reject/`, { reason }); setReply(res.data); setShowRejectModal(false); onSaved && onSaved(res.data, 'reject'); showToast('❌ Rejected'); setTimeout(() => onClose && onClose(), 800); } catch (e) { throw e; } };

  const doDeleteAndReload = async (idToDelete) => {
    await api.delete(`/legal-services/notice-replies/${idToDelete}/`);
    const res = await api.get('/legal-services/notice-replies/', { params: { notice: noticeId } });
    const list = Array.isArray(res.data) ? res.data : (res.data.results || []);
    setReplyHistory(list);
    if (idToDelete === currentReplyIdRef.current) {
      if (list.length > 0) {
        const next = list[0]; currentReplyIdRef.current = next.id; originalReplyIdRef.current = next.id;
        const dr = await api.get(`/legal-services/notice-replies/${next.id}/`);
        setReply(dr.data); setTitle(dr.data.title || ''); setIsLastReply(!!dr.data.is_final_reply); lastSavedRef.current = { title: dr.data.title || '', content: dr.data.content_html || '' };
        setTimeout(() => { if (editorRef.current) { editorRef.current.innerHTML = dr.data.content_html || ''; recalcPagination(); } }, 50);
      } else {
        currentReplyIdRef.current = null; originalReplyIdRef.current = null; setReply(null); setTitle(''); setIsLastReply(false); lastSavedRef.current = { title: '', content: '' };
        if (editorRef.current) { editorRef.current.innerHTML = ''; recalcPagination(); }
      }
    }
    onSaved && onSaved(null, 'save');
  };

  const handleDeleteDraft = async () => { setShowConfirmDelete(false); if (!currentReplyIdRef.current) return; setSaving(true); try { await doDeleteAndReload(currentReplyIdRef.current); showToast('🗑 Deleted'); } catch (e) { setError('Failed'); } finally { setSaving(false); } };
  const handleDeleteFromHistory = async (id) => { if (!window.confirm('Delete this draft?')) return; try { await doDeleteAndReload(id); showToast('🗑 Deleted'); } catch { showToast('⚠ Cannot delete'); } };

  const switchToReply = async (targetId) => {
    if (!targetId || targetId === currentReplyIdRef.current) return;
    const isOnOriginal = currentReplyIdRef.current === originalReplyIdRef.current || !currentReplyIdRef.current;
    if (isOnOriginal) { unsavedContentRef.current = { title: title, content: editorRef.current ? stripMarkers(editorRef.current.innerHTML) : '' }; }
    currentReplyIdRef.current = targetId; setLoading(true);
    try { const res = await api.get(`/legal-services/notice-replies/${targetId}/`); setReply(res.data); setTitle(res.data.title || ''); setIsLastReply(!!res.data.is_final_reply); lastSavedRef.current = { title: res.data.title || '', content: res.data.content_html || '' }; setTimeout(() => { if (editorRef.current) { editorRef.current.innerHTML = res.data.content_html || ''; recalcPagination(); } }, 50); } catch { setError('Failed to load'); } finally { setLoading(false); }
  };  

  const goBackToCurrent = () => {
    const saved = unsavedContentRef.current; const origId = originalReplyIdRef.current;
    if (!origId) { currentReplyIdRef.current = null; setReply(null); setTitle(saved.title || ''); setIsLastReply(false); setError(''); setLoading(false); setShowHistory(false); requestAnimationFrame(() => { setTimeout(() => { if (editorRef.current) { editorRef.current.innerHTML = saved.content || ''; editorRef.current.focus(); recalcPagination(); } }, 100); }); return; }
    if (origId !== currentReplyIdRef.current) {
      currentReplyIdRef.current = origId; setLoading(true); setShowHistory(false);
      api.get(`/legal-services/notice-replies/${origId}/`).then((res) => { setReply(res.data); setIsLastReply(!!res.data.is_final_reply); lastSavedRef.current = { title: res.data.title || '', content: res.data.content_html || '' }; const hasUnsaved = saved.content && saved.content.trim(); const useTitle = hasUnsaved ? saved.title : res.data.title || ''; const useContent = hasUnsaved ? saved.content : res.data.content_html || ''; setTitle(useTitle); requestAnimationFrame(() => { setTimeout(() => { if (editorRef.current) { editorRef.current.innerHTML = useContent; editorRef.current.focus(); recalcPagination(); } }, 100); }); }).catch(() => setError('Failed to load')).finally(() => setLoading(false));
    }
  };

  const navigateDraft = async (dir) => { const ti = dir === 'prev' ? currentDraftIndex - 1 : currentDraftIndex + 1; if (ti < 0 || ti >= replyHistory.length) return; await switchToReply(replyHistory[ti].id); };

  const toggleHistory = () => { setShowHistory(!showHistory); setShowSupports(false); };
  const toggleSupports = () => { setShowSupports(!showSupports); setShowHistory(false); };

  useEffect(() => { const handler = (e) => { if ((e.ctrlKey || e.metaKey) && e.key === 's') { e.preventDefault(); if (canMakerEdit) handleSaveDraft(); } if (e.key === 'Escape' && !expanded && !showSupportModal) flushAndClose(); }; window.addEventListener('keydown', handler); return () => window.removeEventListener('keydown', handler); }, [canMakerEdit, expanded, title, showSupportModal]);

  const htmlToDocxParagraphs = (html) => {
    const temp = document.createElement('div'); temp.innerHTML = html; const paragraphs = [];
    const processRuns = (node, styles = {}) => { if (node.nodeType === Node.TEXT_NODE) { const t = node.textContent; if (!t) return []; return [new TextRun({ text: t, bold: styles.bold, italics: styles.italic, underline: styles.underline ? {} : undefined, strike: styles.strike, size: styles.size || 24, font: styles.font || 'Times New Roman' })]; } if (node.nodeType !== Node.ELEMENT_NODE) return []; const tag = node.tagName.toLowerCase(); const ns = { ...styles }; if (tag==='b'||tag==='strong') ns.bold = true; if (tag==='i'||tag==='em') ns.italic = true; if (tag==='u') ns.underline = true; if (tag==='s'||tag==='strike') ns.strike = true; const runs = []; node.childNodes.forEach(ch => { runs.push(...processRuns(ch, ns)); }); return runs; };
    const processElement = (el) => {
      if (el.nodeType === Node.TEXT_NODE) { const t = el.textContent.trim(); if (t) paragraphs.push(new Paragraph({ children: [new TextRun({ text: t, size: 24, font: 'Times New Roman' })] })); return; } if (el.nodeType !== Node.ELEMENT_NODE) return; const tag = el.tagName.toLowerCase(); const align = el.style.textAlign; const alignment = align === 'center' ? AlignmentType.CENTER : align === 'right' ? AlignmentType.RIGHT : align === 'justify' ? AlignmentType.JUSTIFIED : AlignmentType.LEFT;
      if (tag==='h1') paragraphs.push(new Paragraph({ heading: HeadingLevel.HEADING_1, alignment, children: processRuns(el, { bold: true, size: 32 }) })); else if (tag==='h2') paragraphs.push(new Paragraph({ heading: HeadingLevel.HEADING_2, alignment, children: processRuns(el, { bold: true, size: 28 }) })); else if (tag==='h3') paragraphs.push(new Paragraph({ heading: HeadingLevel.HEADING_3, alignment, children: processRuns(el, { bold: true, size: 26 }) })); else if (tag==='p'||tag==='div') { const runs = processRuns(el); if (runs.length) paragraphs.push(new Paragraph({ alignment, children: runs })); else paragraphs.push(new Paragraph({ alignment, children: [new TextRun('')] })); } else if (tag==='ul'||tag==='ol') { el.querySelectorAll('li').forEach(li => { paragraphs.push(new Paragraph({ bullet: tag==='ul' ? { level: 0 } : undefined, children: processRuns(li) })); }); } else if (tag==='br') paragraphs.push(new Paragraph({ children: [new TextRun('')] })); else Array.from(el.childNodes).forEach(processElement);
    }; Array.from(temp.childNodes).forEach(processElement); return paragraphs;
  };
  const handleDownloadDocx = async () => { if (!canDownload) return showToast('⚠ Downloads only after approval'); try { const content = reply?.content_html || getCurrentContent(); if (!content || !content.trim()) return showToast('⚠ No content to download'); const paragraphs = htmlToDocxParagraphs(content); if (paragraphs.length === 0) paragraphs.push(new Paragraph({ children: [new TextRun('')] })); const doc = new Document({ sections: [{ properties: { page: { margin: { top: 1440, right: 1440, bottom: 1440, left: 1440 } } }, children: paragraphs }] }); const blob = await Packer.toBlob(doc); saveAs(blob, `${(title || 'reply').replace(/[^a-z0-9]/gi, '_')}.docx`); showToast('✅ DOCX downloaded'); } catch (e) { showToast('⚠ Download failed'); } };
  const handleDownloadPdf = () => { if (!canDownload) return showToast('⚠ Downloads only after approval'); try { const content = reply?.content_html || getCurrentContent(); if (!content || !content.trim()) return showToast('⚠ No content to download'); const wrapper = document.createElement('div'); wrapper.style.fontFamily = "'Times New Roman', Times, serif"; wrapper.style.fontSize = '12pt'; wrapper.style.lineHeight = '1.5'; wrapper.style.color = '#1a1a2e'; wrapper.style.padding = '20px'; wrapper.style.background = '#fff'; wrapper.style.width = '700px'; wrapper.innerHTML = content; wrapper.querySelectorAll('table').forEach(t => { t.style.borderCollapse = 'collapse'; t.style.width = '100%'; }); wrapper.querySelectorAll('td, th').forEach(cell => { cell.style.border = '1px solid #333'; cell.style.padding = '4px 8px'; }); document.body.appendChild(wrapper); html2pdf().set({ margin: [0.8, 0.8, 0.8, 0.8], filename: `${(title || 'reply').replace(/[^a-z0-9]/gi, '_')}.pdf`, image: { type: 'jpeg', quality: 0.98 }, html2canvas: { scale: 2, useCORS: true, scrollY: 0 }, jsPDF: { unit: 'in', format: 'a4', orientation: 'portrait' } }).from(wrapper).save().then(() => { document.body.removeChild(wrapper); showToast('✅ PDF downloaded'); }).catch(() => { if (wrapper.parentNode) document.body.removeChild(wrapper); showToast('⚠ PDF failed'); }); } catch { showToast('⚠ PDF failed'); } };

  const statusMeta = STATUS_META[status] || STATUS_META.draft;
  const isOrangeTheme = isLastReply;
  const headerBg = isOrangeTheme ? `linear-gradient(135deg, ${C.orange}, ${C.orangeLight})` : C.navy;
  const toolbarBg = isOrangeTheme ? `linear-gradient(135deg, ${C.orangeDark}, ${C.orange})` : '';
  const totalSupports = existingSupports.length + newSupportFiles.length;

  return createPortal(
    <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.5)', display:'flex', alignItems:'center', justifyContent:'center', zIndex:2000, padding: expanded ? 0 : 12 }} onClick={(e) => e.target === e.currentTarget && !expanded && flushAndClose()}>
      <style>{EDITOR_CSS}</style>
      <div onClick={(e) => e.stopPropagation()} style={{ width: expanded ? '100vw' : '90vw', height: expanded ? '100vh' : '85vh', maxWidth: expanded ? '100vw' : 1300, background: C.canvas, borderRadius: expanded ? 0 : 10, overflow: 'hidden', boxShadow: '0 25px 80px rgba(0,0,0,0.4)', display: 'flex', flexDirection: 'column' }}>

        {/* HEADER */}
        <div style={{ background: headerBg, padding: '6px 14px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, flexShrink: 0, transition: 'background 0.3s' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flex: 1, minWidth: 0 }}>
            <span style={{ color: '#fff', flexShrink: 0 }}><FileIcon /></span>
            {/* ✅ UPDATED: White input styling for title */}
            <input 
              value={title} onChange={(e) => setTitle(e.target.value)} disabled={!canEditContent} placeholder="Enter file name..." 
              style={{ background: '#fff', border: '1px solid #ccc', borderRadius: 4, padding: '4px 10px', color: C.ink, fontSize: 13, fontWeight: 600, outline: 'none', width: 220, fontFamily: 'inherit', boxShadow: 'inset 0 1px 3px rgba(0,0,0,0.1)' }} 
            />
            <span style={{ fontSize: 9, fontWeight: 700, padding: '2px 7px', borderRadius: 99, background: statusMeta.bg, color: statusMeta.color, border: `1px solid ${statusMeta.border}`, textTransform: 'uppercase' }}>{statusMeta.icon} {statusMeta.label}</span>
            {saveStatus && <span style={{ fontSize: 9, color: 'rgba(255,255,255,0.7)', padding: '2px 6px', background: 'rgba(255,255,255,0.1)', borderRadius: 3 }}>{saveStatus}</span>}
            <span style={{ fontSize: 9, color: 'rgba(255,255,255,0.5)' }}>DIN: {notice?.din_number || '—'}{notice?.officer && ` · ${notice.officer}`}</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 4, flexShrink: 0 }}>
            {(canMakerEdit || (isLastReply && status !== 'draft')) && (
              <label style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '3px 8px', border: `1px solid ${isLastReply ? '#F97316' : 'rgba(255,255,255,0.2)'}`, borderRadius: 4, background: isLastReply ? 'rgba(249,115,22,0.2)' : 'rgba(255,255,255,0.06)', cursor: canMakerEdit ? 'pointer' : 'default', fontSize: 10, fontWeight: 700, color: '#fff', opacity: canMakerEdit ? 1 : 0.7, whiteSpace: 'nowrap' }}>
                <input type="checkbox" checked={isLastReply} onChange={(e) => canMakerEdit && setIsLastReply(e.target.checked)} disabled={!canMakerEdit} style={{ width: 12, height: 12, margin: 0, accentColor: '#F97316' }} /> 🏁 Last Reply
              </label>
            )}
            
            {/* ✅ NEW: 📎 Button accessible if user can edit OR there are attached files (so checker can see them) */}
            {(canEditContent || totalSupports > 0) && (
              <HdrBtn title="Supporting Docs" onClick={toggleSupports} active={showSupports} badge={totalSupports || null}><PaperclipIcon /></HdrBtn>
            )}

            {replyHistory.length > 0 && !isReviewMode && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 2, padding: '2px 4px', background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 4 }}>
                <HdrBtn onClick={() => navigateDraft('prev')} disabled={!hasPrevDraft} small><ChevronLeftIcon /></HdrBtn>
                <span style={{ fontSize: 9, fontWeight: 700, color: '#fff', minWidth: 28, textAlign: 'center' }}>{displayIndex}/{displayTotal}</span>
                <HdrBtn onClick={() => navigateDraft('next')} disabled={!hasNextDraft} small><ChevronRightIcon /></HdrBtn>
              </div>
            )}
            {!isReviewMode && <HdrBtn title="History" onClick={toggleHistory} active={showHistory} badge={replyHistory.length||null}><HistoryIcon /></HdrBtn>}
            {canDelete && <HdrBtn title="Delete" onClick={() => setShowConfirmDelete(true)}><TrashIcon /></HdrBtn>}
            {showCheckerEditToggle && <button onClick={() => setCheckerEditMode(!checkerEditMode)} style={{ padding: '3px 8px', border: `1px solid ${checkerEditMode ? C.amber : 'rgba(255,255,255,0.2)'}`, borderRadius: 4, background: checkerEditMode ? C.amberBg : 'rgba(255,255,255,0.06)', color: checkerEditMode ? C.amber : '#fff', fontSize: 10, fontWeight: 700, cursor: 'pointer' }}>{checkerEditMode ? '👁 Preview' : '✎ Edit'}</button>}
            <HdrBtn title={expanded ? 'Restore' : 'Full screen'} onClick={() => setExpanded(!expanded)}>{expanded ? <CollapseIcon /> : <ExpandIcon />}</HdrBtn>
            <HdrBtn title="Close" onClick={flushAndClose}><CloseIcon /></HdrBtn>
          </div>
        </div>

        <StatusBanner status={status} reply={reply} isReviewMode={isReviewMode} isAssignedChecker={isAssignedChecker} isCeoRole={isCeoRole} />

        {/* TOOLBAR */}
        <div className="re-toolbar" style={toolbarBg ? { background: toolbarBg } : {}}>
          {canEditContent && (
            <>
              <input ref={fileInputRef} type="file" accept=".docx,.doc,image/*" onChange={handleDocxUpload} style={{ display: 'none' }} />
              <button onMouseDown={e=>e.preventDefault()} onClick={() => fileInputRef.current?.click()} disabled={importingDocx} title="Import DOCX or image"><UploadIcon /> <span style={{marginLeft:3,fontSize:11}}>{importingDocx ? '...' : 'Import'}</span></button>
              <div className="divider" />
            </>
          )}
          <button onMouseDown={e=>e.preventDefault()} onClick={() => runCommand('undo')} disabled={!canEditContent} title="Undo">↶</button>
          <button onMouseDown={e=>e.preventDefault()} onClick={() => runCommand('redo')} disabled={!canEditContent} title="Redo">↷</button>
          <div className="divider" />
          <button onMouseDown={e=>e.preventDefault()} onClick={() => runCommand('bold')} disabled={!canEditContent}><strong>B</strong></button>
          <button onMouseDown={e=>e.preventDefault()} onClick={() => runCommand('italic')} disabled={!canEditContent}><em>I</em></button>
          <button onMouseDown={e=>e.preventDefault()} onClick={() => runCommand('underline')} disabled={!canEditContent}><u>U</u></button>
          <button onMouseDown={e=>e.preventDefault()} onClick={() => runCommand('strikeThrough')} disabled={!canEditContent}><s>S</s></button>
          <div className="divider" />
          <span style={{fontSize:10,color:'#999',marginRight:2}}>Font</span>
          <Select value={fontFamily} onChange={(val) => { isDropdownOpenRef.current = false; applyFontFamily(val); }} onDropdownVisibleChange={(open) => { isDropdownOpenRef.current = open; }} disabled={!canEditContent} size="small" style={{ width: 140 }} popupMatchSelectWidth={false} getPopupContainer={t=>t.parentNode} options={[{value:"'Times New Roman', Times, serif",label:'Times New Roman'},{value:"'Calibri', sans-serif",label:'Calibri'},{value:"'Arial', sans-serif",label:'Arial'},{value:"'Georgia', serif",label:'Georgia'},{value:"'Verdana', sans-serif",label:'Verdana'},{value:"'Courier New', monospace",label:'Courier New'}]} />
          <Select value={fontSize} onChange={(val) => { isDropdownOpenRef.current = false; applyFontSize(val); }} onDropdownVisibleChange={(open) => { isDropdownOpenRef.current = open; }} disabled={!canEditContent} size="small" style={{ width: 68 }} getPopupContainer={t=>t.parentNode} options={['9pt','10pt','11pt','12pt','13pt','14pt','16pt','18pt','24pt'].map(s=>({value:s,label:s}))} />
          <div style={{display:'flex',alignItems:'center',gap:1}}>
            <button onMouseDown={e=>e.preventDefault()} onClick={() => applyTextColor(textColor)} disabled={!canEditContent} style={{ padding:'2px 5px', borderRadius:'3px 0 0 3px', border:'1px solid rgba(255,255,255,0.2)', borderRight:'none', background:'transparent', cursor:canEditContent?'pointer':'not-allowed', display:'flex', alignItems:'center', height:26, minWidth:0 }}><span style={{ fontSize:14, fontWeight:900, color:textColor, textShadow:'0 0 1px rgba(255,255,255,0.3)', borderBottom:`3px solid ${textColor}`, paddingBottom:1 }}>A</span></button>
            <label style={{ display:'flex', alignItems:'center', justifyContent:'center', width:20, height:26, border:'1px solid rgba(255,255,255,0.2)', borderRadius:'0 3px 3px 0', background:'transparent', cursor:canEditContent?'pointer':'not-allowed', margin:0, padding:0, position:'relative', opacity:canEditContent?1:0.35 }}><span style={{fontSize:8,color:'#ccc'}}>▼</span><input type="color" value={textColor} onChange={(e) => { setTextColor(e.target.value); setTimeout(() => applyTextColor(e.target.value), 50); }} disabled={!canEditContent} style={{ position:'absolute', top:0, left:0, width:'100%', height:'100%', opacity:0, cursor:canEditContent?'pointer':'not-allowed' }} /></label>
          </div>
          <div style={{display:'flex',alignItems:'center',gap:1}}>
            <button onMouseDown={e=>e.preventDefault()} onClick={() => applyHighlight(highlightColor)} disabled={!canEditContent} style={{ padding:'2px 5px', borderRadius:'3px 0 0 3px', border:'1px solid rgba(255,255,255,0.2)', borderRight:'none', background:'transparent', cursor:canEditContent?'pointer':'not-allowed', display:'flex', alignItems:'center', height:26, minWidth:0 }}><span style={{ fontSize:11, fontWeight:800, padding:'1px 4px', background:highlightColor, color:'#000', borderRadius:2, lineHeight:1 }}>ab</span></button>
            <label style={{ display:'flex', alignItems:'center', justifyContent:'center', width:20, height:26, border:'1px solid rgba(255,255,255,0.2)', borderRadius:'0 3px 3px 0', background:'transparent', cursor:canEditContent?'pointer':'not-allowed', margin:0, padding:0, position:'relative', opacity:canEditContent?1:0.35 }}><span style={{fontSize:8,color:'#ccc'}}>▼</span><input type="color" value={highlightColor} onChange={(e) => { setHighlightColor(e.target.value); setTimeout(() => applyHighlight(e.target.value), 50); }} disabled={!canEditContent} style={{ position:'absolute', top:0, left:0, width:'100%', height:'100%', opacity:0, cursor:canEditContent?'pointer':'not-allowed' }} /></label>
          </div>
          <Select value={lineHeight} onChange={(val) => { isDropdownOpenRef.current = false; applyLineHeight(val); }} onDropdownVisibleChange={(open) => { isDropdownOpenRef.current = open; }} disabled={!canEditContent} size="small" style={{ width: 58 }} getPopupContainer={t=>t.parentNode} options={['1.0','1.15','1.4','1.6','2.0','2.5'].map(l=>({value:l,label:l}))} />
          <div className="divider" />
          <button className="re-icon-btn" onMouseDown={e=>e.preventDefault()} onClick={() => runCommand('justifyLeft')} disabled={!canEditContent}><IconAlignLeft /></button>
          <button className="re-icon-btn" onMouseDown={e=>e.preventDefault()} onClick={() => runCommand('justifyCenter')} disabled={!canEditContent}><IconAlignCenter /></button>
          <button className="re-icon-btn" onMouseDown={e=>e.preventDefault()} onClick={() => runCommand('justifyRight')} disabled={!canEditContent}><IconAlignRight /></button>
          <button className="re-icon-btn" onMouseDown={e=>e.preventDefault()} onClick={() => runCommand('justifyFull')} disabled={!canEditContent}><IconAlignJustify /></button>
          <div className="divider" />
          <button onMouseDown={e=>e.preventDefault()} onClick={() => insertList('disc', false)} disabled={!canEditContent} title="Bullets" style={{fontSize:14}}>•</button>
          <button onMouseDown={e=>e.preventDefault()} onClick={() => insertList('decimal', true)} disabled={!canEditContent} title="Numbering" style={{fontSize:12}}>1.</button>
          <button onMouseDown={e=>e.preventDefault()} onClick={() => runCommand('outdent')} disabled={!canEditContent}>⇤</button>
          <button onMouseDown={e=>e.preventDefault()} onClick={() => runCommand('indent')} disabled={!canEditContent}>⇥</button>
          <div className="divider" />
          <button className="re-icon-btn" onMouseDown={e=>e.preventDefault()} onClick={insertTable} disabled={!canEditContent} title="Insert Table"><IconTable /></button>
          <button onMouseDown={e=>e.preventDefault()} onClick={() => runCommand('removeFormat')} disabled={!canEditContent} style={{fontSize:11}}>Tx</button>
        </div>

        {/* EDITOR AREA */}
        <div style={{ display: 'flex', flex: 1, minHeight: 0, overflow: 'hidden' }}>
          <div className="re-stage" onMouseDown={handleStageMouseDown}>
            {loading ? <div style={{ padding: 60, textAlign: 'center', color: C.muted }}><div style={{ fontSize: 32, marginBottom: 10 }}>⏳</div>Loading document...</div> : (
              <div className="re-page-shell" style={{ transform: `scale(${zoom / 100})` }}>
                <div className="re-editor-wrap">
                  <div ref={editorRef} className="re-editor" contentEditable={true} suppressContentEditableWarning data-placeholder="Start typing your reply here, paste from Word (Ctrl+V), or import a DOCX file from the toolbar." data-empty={isEditorEmpty ? 'true' : undefined} onInput={() => scheduleMeasure(false)} onPaste={handlePaste} onKeyDown={handleKeyDown} onBlur={() => scheduleMeasure(true)} style={{ fontFamily, fontSize, lineHeight, color: textColor }} />
                </div>
              </div>
            )}
            {error && <div style={{ position: 'absolute', top: 12, left: '50%', transform: 'translateX(-50%)', padding: '10px 14px', background: C.redBg, border: `1px solid ${C.redBorder}`, borderRadius: 6, color: C.red, fontSize: 12, fontWeight: 600, zIndex: 10 }}>⚠ {error} <button onClick={() => setError('')} style={{ float: 'right', background: 'none', border: 'none', color: C.red, cursor: 'pointer', fontSize: 14, fontWeight: 700 }}>×</button></div>}
          </div>
          
          {/* ✅ SIDEBARS (Mutually Exclusive) */}
          {showHistory && !isReviewMode && <HistorySidebar replies={replyHistory} currentReplyId={currentReplyIdRef.current} originalReplyId={originalReplyIdRef.current} currentUserId={currentUserId} onSelectReply={(r) => switchToReply(r.id)} onBackToCurrent={goBackToCurrent} onDelete={handleDeleteFromHistory} onClose={() => setShowHistory(false)} />}
          
          {showSupports && (
            <SupportsSidebar 
              existingSupports={existingSupports} 
              newSupportFiles={newSupportFiles} 
              canEdit={canEditContent}
              onRemoveExisting={async (id) => {
                if (!window.confirm('Delete this file?')) return;
                try { await api.delete(`/legal-services/notice-documents/${id}/`); setExistingSupports(existingSupports.filter(d => d.id !== id)); showToast('🗑 Deleted'); } catch { showToast('⚠ Cannot delete'); }
              }}
              onRemoveNew={(idx) => setNewSupportFiles(newSupportFiles.filter((_, i) => i !== idx))}
              onAddFiles={(e) => setNewSupportFiles([...newSupportFiles, ...Array.from(e.target.files)])}
              onClose={() => setShowSupports(false)}
            />
          )}
        </div>

        {/* BOTTOM BAR */}
        <div style={{ padding: '6px 14px', borderTop: '1px solid #ddd', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, background: '#fff', flexShrink: 0 }}>
          <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
            {canDownload ? (
              <><ActionBtn onClick={handleDownloadDocx} green><DownloadIcon /> DOCX</ActionBtn> <ActionBtn onClick={handleDownloadPdf} green><DownloadIcon /> PDF</ActionBtn></>
            ) : <span style={{ fontSize: 10, color: C.muted, fontStyle: 'italic', display: 'inline-flex', alignItems: 'center', gap: 4 }}><LockIcon /> Downloads after approval</span>}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ fontSize: 10, color: C.muted }}>Words: <b style={{ color: C.ink }}>{wordCount}</b> · Pages: <b style={{ color: C.ink }}>{pageCount}</b></span>
            <div style={{ display: 'flex', alignItems: 'center', gap: 3, padding: '2px 4px', background: '#f5f5f5', borderRadius: 4, border: '1px solid #e5e5e5' }}>
              <ZoomBtn onClick={() => setZoom(Math.max(50, zoom - 10))}>−</ZoomBtn><span style={{ fontSize: 10, fontWeight: 700, color: '#333', minWidth: 32, textAlign: 'center' }}>{zoom}%</span><ZoomBtn onClick={() => setZoom(Math.min(200, zoom + 10))}>+</ZoomBtn><ZoomBtn onClick={() => setZoom(100)}>⟲</ZoomBtn>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 6 }}>
            <ActionBtn onClick={flushAndClose}>Close</ActionBtn>
            {canReopen && <ActionBtn onClick={handleReopen} disabled={saving} amber>{saving ? '...' : '↻ Reopen'}</ActionBtn>}
            {canMakerEdit && (
              <>
                <ActionBtn onClick={handleSaveDraft} disabled={saving || !title.trim()} navy title="Ctrl+S"><SaveIcon /> {saving ? 'Saving...' : 'Save Draft'}</ActionBtn>
                <ActionBtn onClick={() => setShowConfirmSend(true)} disabled={saving || !title.trim()} primary><SendIcon /> Send for Review</ActionBtn>
              </>
            )}
            {canCheckerEdit && <ActionBtn onClick={handleCheckerSave} disabled={saving || !title.trim()} navy title="Save changes"><SaveIcon /> {saving ? 'Saving...' : 'Save Changes'}</ActionBtn>}
            {canReject && <ActionBtn onClick={() => setShowRejectModal(true)} disabled={saving} danger>✕ Reject</ActionBtn>}
            {canApprove && <ActionBtn onClick={() => setShowAcceptModal(true)} disabled={saving} success>{saving ? '...' : '✓ Approve'}</ActionBtn>}
          </div>
        </div>
      </div>

      {/* Modals */}
      {toast && <div style={{ position: 'fixed', bottom: 20, left: '50%', transform: 'translateX(-50%)', background: C.ink, color: '#fff', padding: '10px 20px', borderRadius: 8, fontSize: 13, fontWeight: 600, boxShadow: '0 10px 30px rgba(0,0,0,0.25)', zIndex: 999999 }}>{toast}</div>}
      {showConfirmSend && <ConfirmDialog icon="📤" title="Send for Review?" message="Reply and attachments will be sent to checker." confirmLabel="Send" confirmColor={C.navyLight} onConfirm={handleSendForReview} onCancel={() => setShowConfirmSend(false)} />}
      {showConfirmDelete && <ConfirmDialog icon="🗑" title="Delete Draft?" message={`"${title || 'Untitled'}" and its attachments will be permanently deleted.`} confirmLabel="Delete" confirmColor={C.red} onConfirm={handleDeleteDraft} onCancel={() => setShowConfirmDelete(false)} />}
      {showRejectModal && <RejectModal review={reply} onClose={() => setShowRejectModal(false)} onRejected={handleReject} />}
      {showAcceptModal && <AcceptModal review={reply} onClose={() => setShowAcceptModal(false)} onAccepted={handleApprove} showEscalate={isAssignedChecker && !isCeoRole} />}
    </div>,
    document.body
  );
}

// ═══════════════════════════════════════════════════════════════
// HELPER COMPONENTS
// ═══════════════════════════════════════════════════════════════
function HdrBtn({ children, onClick, title, active, badge, disabled, small }) {
  const [hover, setHover] = useState(false); const size = small ? 20 : 24;
  return <button onClick={disabled ? undefined : onClick} title={title} disabled={disabled} onMouseEnter={() => !disabled && setHover(true)} onMouseLeave={() => setHover(false)} style={{ position: 'relative', width: size, height: size, border: `1px solid ${active ? '#fff' : 'rgba(255,255,255,0.15)'}`, borderRadius: 4, background: active ? 'rgba(255,255,255,0.85)' : (hover ? 'rgba(255,255,255,0.15)' : 'rgba(255,255,255,0.05)'), color: disabled ? 'rgba(255,255,255,0.25)' : (active ? C.navyLight : '#fff'), cursor: disabled ? 'not-allowed' : 'pointer', opacity: disabled ? 0.5 : 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 0 }}>{children}{badge && <span style={{ position: 'absolute', top: -4, right: -4, background: C.red, color: '#fff', fontSize: 7, fontWeight: 800, padding: '1px 3px', borderRadius: 99, minWidth: 10, textAlign: 'center', border: '1px solid #fff' }}>{badge}</span>}</button>;
}
function ZoomBtn({ children, onClick }) { return <button onClick={onClick} style={{ width: 20, height: 20, border: 'none', background: 'transparent', color: '#666', cursor: 'pointer', fontSize: 12, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 0, borderRadius: 3 }}>{children}</button>; }
function ActionBtn({ children, onClick, disabled, title, green, amber, navy, primary, danger, success }) {
  const bg = primary ? `linear-gradient(135deg, ${C.navyLight}, ${C.blue})` : success ? `linear-gradient(135deg, ${C.green}, #0B5C43)` : 'transparent'; const color = primary || success ? '#fff' : danger ? C.red : navy ? C.navyLight : green ? C.green : amber ? C.amber : C.slate; const border = primary || success ? 'none' : danger ? `1.5px solid ${C.redBorder}` : navy ? `1.5px solid ${C.navyLight}` : green ? `1.5px solid ${C.green}` : amber ? `1.5px solid ${C.amber}` : '1px solid #ddd';
  return <button onClick={disabled ? undefined : onClick} disabled={disabled} title={title} style={{ padding: '6px 14px', border, borderRadius: 5, background: disabled ? '#e5e7eb' : bg, color: disabled ? '#9ca3af' : color, fontSize: 11.5, fontWeight: 700, cursor: disabled ? 'not-allowed' : 'pointer', fontFamily: 'inherit', display: 'inline-flex', alignItems: 'center', gap: 4, boxShadow: primary || success ? '0 2px 6px rgba(0,0,0,0.15)' : 'none', opacity: disabled ? 0.6 : 1 }}>{children}</button>;
}
function StatusBanner({ status, reply, isReviewMode, isAssignedChecker, isCeoRole }) {
  if (!reply || status === 'draft') return null;
  if (status === 'rejected') return <div style={{ padding: '6px 14px', background: C.redBg, borderBottom: `1px solid ${C.redBorder}`, display: 'flex', alignItems: 'flex-start', gap: 8, flexShrink: 0 }}><span style={{ fontSize: 14 }}>❌</span><div style={{ flex: 1 }}><div style={{ fontSize: 11, fontWeight: 700, color: C.red, marginBottom: 2 }}>Rejected {reply.reviewed_by_name && `by ${reply.reviewed_by_name}`}</div>{reply.review_note && <div style={{ fontSize: 11, color: C.red }}><b>Reason:</b> {reply.review_note}</div>}</div></div>;
  if (status === 'approved') return <div style={{ padding: '5px 14px', background: C.greenBg, borderBottom: `1px solid ${C.greenBorder}`, display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}><span>✅</span><span style={{ fontSize: 11, color: C.green, fontWeight: 600 }}><b>Approved</b> · Downloads available</span></div>;
  if (status === 'pending') return <div style={{ padding: '5px 14px', background: C.amberBg, borderBottom: `1px solid ${C.amberBorder}`, display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}><span>⏳</span><span style={{ fontSize: 11, color: C.amber, fontWeight: 600 }}>{isReviewMode && (isAssignedChecker || isCeoRole) ? <b>Your Review Required</b> : <b>Awaiting Review</b>}</span></div>;
  if (status === 'escalated') return <div style={{ padding: '5px 14px', background: C.purpleBg, borderBottom: `1px solid ${C.purpleBorder}`, display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}><span>↑</span><span style={{ fontSize: 11, color: C.purple, fontWeight: 600 }}><b>Escalated to CEO</b></span></div>;
  return null;
}
function HistorySidebar({ replies, currentReplyId, originalReplyId, currentUserId, onSelectReply, onBackToCurrent, onDelete, onClose }) {
  const isViewingDifferent = (originalReplyId && currentReplyId !== originalReplyId) || (!originalReplyId && currentReplyId);
  return (
    <div style={{ width: 260, flexShrink: 0, background: '#fff', borderLeft: '1px solid #ddd', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      <div style={{ padding: '8px 12px', borderBottom: '1px solid #eee', display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: '#fafbfc' }}><div style={{ fontSize: 11, fontWeight: 700, color: '#1a1a2e', display: 'flex', alignItems: 'center', gap: 5 }}><HistoryIcon /> History <span style={{ fontSize: 9, background: C.navyLight, color: '#fff', padding: '1px 5px', borderRadius: 99, fontWeight: 700 }}>{replies.length}</span></div><button onClick={onClose} style={{ background: 'none', border: 'none', color: '#999', cursor: 'pointer', padding: 2 }}><CloseIcon /></button></div>
      {(isViewingDifferent || (!currentReplyId && replies.length > 0)) && <div style={{ padding: '6px 10px', borderBottom: '1px solid #eee', background: '#f0f7ff' }}><button onClick={onBackToCurrent} style={{ width: '100%', padding: '5px 8px', border: `1px solid ${C.navyLight}`, borderRadius: 4, background: '#fff', color: C.navyLight, fontSize: 10, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5 }}>← Back to Current Working</button></div>}
      <div style={{ flex: 1, overflowY: 'auto', padding: 4 }}>
        {replies.length === 0 ? <div style={{ padding: 16, textAlign: 'center', color: '#999', fontSize: 11 }}>No history</div> : replies.map((r) => { const isActive = r.id === currentReplyId; const isOriginal = r.id === originalReplyId; const canDel = r.created_by === currentUserId && ['draft','rejected'].includes(r.status); const meta = STATUS_META[r.status] || STATUS_META.draft; return ( <div key={r.id} onClick={() => onSelectReply(r)} style={{ padding: '6px 8px', marginBottom: 3, border: `1.5px solid ${isActive ? C.navyLight : isOriginal ? C.amber : '#eee'}`, borderRadius: 5, background: isActive ? '#f0f7ff' : isOriginal ? '#fff8eb' : '#fff', cursor: 'pointer' }}><div style={{ display: 'flex', alignItems: 'center', gap: 4, marginBottom: 2 }}><div style={{ fontSize: 10.5, fontWeight: 700, color: '#1a1a2e', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1 }}><FileIcon /> {r.title || 'Untitled'}.docx</div><span style={{ fontSize: 8, fontWeight: 700, padding: '1px 5px', borderRadius: 99, background: meta.bg, color: meta.color, border: `1px solid ${meta.border}`, textTransform: 'uppercase' }}>{meta.label}</span></div><div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 4 }}><div style={{ fontSize: 9, color: '#999' }}>{r.created_by_name && `${r.created_by_name} · `}{fmtRelativeTime(r.updated_at)}</div>{isOriginal && !isActive && <span style={{ fontSize: 7, fontWeight: 800, color: C.amber, background: '#fff', border: `1px solid ${C.amber}`, padding: '0 4px', borderRadius: 2 }}>CURRENT</span>}{canDel && onDelete && <button onClick={(e) => { e.stopPropagation(); onDelete(r.id); }} style={{ width: 18, height: 18, border: `1px solid ${C.redBorder}`, borderRadius: 3, background: '#fff', color: C.red, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 0 }}><TrashIcon /></button>}</div></div> ); })}
      </div>
    </div>
  );
}

// ✅ NEW: SIDEBAR FOR ATTACHMENTS (Open vs Download separated)
function SupportsSidebar({ existingSupports, newSupportFiles, canEdit, onRemoveExisting, onRemoveNew, onAddFiles, onClose }) {
  return (
    <div style={{ width: 260, flexShrink: 0, background: '#fff', borderLeft: '1px solid #ddd', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      <div style={{ padding: '8px 12px', borderBottom: '1px solid #eee', display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: '#fafbfc' }}>
        <div style={{ fontSize: 11, fontWeight: 700, color: '#1a1a2e', display: 'flex', alignItems: 'center', gap: 5 }}>
          📎 Attachments <span style={{ fontSize: 9, background: C.navyLight, color: '#fff', padding: '1px 5px', borderRadius: 99, fontWeight: 700 }}>{existingSupports.length + newSupportFiles.length}</span>
        </div>
        <button onClick={onClose} style={{ background: 'none', border: 'none', color: '#999', cursor: 'pointer', padding: 2 }}><CloseIcon /></button>
      </div>
      <div style={{ flex: 1, overflowY: 'auto', padding: '10px' }}>
        {existingSupports.length > 0 && (
          <div style={{ marginBottom: 16 }}>
            <div style={{ fontSize: 10, fontWeight: 800, color: C.slate, textTransform: 'uppercase', marginBottom: 6 }}>Uploaded</div>
            {existingSupports.map(doc => (
              <div key={doc.id} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '6px', background: '#f8fafc', border: `1px solid ${C.borderLight}`, borderRadius: 4, marginBottom: 4 }}>
                <span style={{ cursor: 'pointer', fontSize: 11, color: C.blue, textDecoration: 'none', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1 }} onClick={() => window.open(doc.file_url, '_blank')}>📎 {doc.file_name}</span>
                <button onClick={() => handleDownloadFile(doc.file_url, doc.file_name)} title="Download" style={{ background: 'none', border: 'none', color: C.slate, cursor: 'pointer', padding: 2 }}><DownloadIconSvg /></button>
                {canEdit && ['draft', 'rejected'].includes(doc.review_status) && (
                  <button onClick={() => onRemoveExisting(doc.id)} style={{ border: 'none', background: 'none', color: C.red, cursor: 'pointer', padding: 2 }}>✕</button>
                )}
              </div>
            ))}
          </div>
        )}
        {newSupportFiles.length > 0 && (
          <div style={{ marginBottom: 16 }}>
            <div style={{ fontSize: 10, fontWeight: 800, color: C.amber, textTransform: 'uppercase', marginBottom: 6 }}>To Upload (on Save)</div>
            {newSupportFiles.map((file, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '6px', background: C.amberBg, border: `1px dashed ${C.amberBorder}`, borderRadius: 4, marginBottom: 4 }}>
                <span style={{ fontSize: 11, color: C.ink, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1 }}>📎 {file.name}</span>
                <button onClick={() => onRemoveNew(i)} style={{ border: 'none', background: 'none', color: C.red, cursor: 'pointer', padding: '0 4px' }}>✕</button>
              </div>
            ))}
          </div>
        )}
        {existingSupports.length === 0 && newSupportFiles.length === 0 && (
          <div style={{ padding: 20, textAlign: 'center', color: C.muted, fontSize: 11, fontStyle: 'italic' }}>No files attached</div>
        )}
        {canEdit && (
          <>
            <label style={{ display: 'block', marginTop: 10, padding: '6px', textAlign: 'center', border: `1px dashed ${C.navy}`, borderRadius: 4, color: C.navy, fontSize: 11, fontWeight: 600, cursor: 'pointer' }}>
              <input type="file" multiple accept=".pdf,.doc,.docx,.jpg,.png,.xlsx,.xls" onChange={onAddFiles} style={{ display: 'none' }} />
              + Add Files
            </label>
            <div style={{ fontSize: 9, color: C.muted, marginTop: 6, textAlign: 'center' }}>Files upload when you Save Draft or Send for Review.</div>
          </>
        )}
      </div>
    </div>
  );
}

function ConfirmDialog({ icon, title, message, confirmLabel, confirmColor, onConfirm, onCancel }) {
  return createPortal(
    <div onClick={(e) => e.target === e.currentTarget && onCancel()} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999999 }}>
      <div style={{ background: '#fff', borderRadius: 10, padding: 24, width: 380, maxWidth: '90%', boxShadow: '0 20px 60px rgba(0,0,0,0.3)', textAlign: 'center' }}><div style={{ fontSize: 36, marginBottom: 12 }}>{icon}</div><div style={{ fontSize: 16, fontWeight: 700, color: '#1a1a2e', marginBottom: 8 }}>{title}</div><div style={{ fontSize: 12.5, color: '#6b7280', lineHeight: 1.5, marginBottom: 20 }}>{message}</div><div style={{ display: 'flex', gap: 8, justifyContent: 'center' }}><button onClick={onCancel} style={{ padding: '8px 18px', border: '1px solid #ddd', borderRadius: 6, background: '#fff', color: '#6b7280', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>Cancel</button><button onClick={onConfirm} style={{ padding: '8px 20px', border: 'none', borderRadius: 6, cursor: 'pointer', fontSize: 12, fontWeight: 700, color: '#fff', background: confirmColor, boxShadow: `0 3px 12px ${confirmColor}40` }}>{confirmLabel}</button></div></div>
    </div>,
    document.body
  );
}