// // Litigations.js — Thin wrapper

// import SubServiceSelector from '../SubServiceSelector';

// const ITEMS = [
//   {
//     label: 'TDS Litigations',
//     description: 'Tax Deducted at Source case management, appeals & dispute tracking',
//     path: '/legal-services/litigations/tds',
//     icon: '📄',
//     color: '#1A2F5A',
//     light: '#EEF3FC',
//     built: true,
//     stats: [
//       { label: 'Total Jobs', value: 0, color: '#1A2F5A' },
//       { label: 'Active',     value: 0, color: '#0D6B52' },
//       { label: 'Overdue',    value: 0, color: '#C62828', hint: 'Past due date' },
//     ],
//   },
//   {
//     label: 'Income Tax Litigations',
//     description: 'Income tax dispute, appeal tracking & assessment proceedings',
//     path: '/legal-services/litigations/income-tax',
//     icon: '📊',
//     color: '#7C3AED',
//     light: '#EDE9FE',
//     built: true,
//     stats: [
//       { label: 'Total Jobs', value: 0, color: '#7C3AED' },
//       { label: 'Active',     value: 0, color: '#0D6B52' },
//       { label: 'Overdue',    value: 0, color: '#C62828', hint: 'Past due date' },
//     ],
//   },
// ];

// export default function Litigations() {
//   return (
//     <SubServiceSelector
//       title="Litigations"
//       subtitle="Select a service to get started"
//       items={ITEMS}
//       backPath="/legal-services"
//       backLabel="Legal Services"
//     />
//   );
// }















// Litigations.js — Fetches notice counts for each litigation type
// Shows: All Notices, WIP, Open, Overdue

import { useState, useEffect } from 'react';
import SubServiceSelector from '../SubServiceSelector';
import { api } from '../../../services/api';

// ══════════════════════════════════════════════════════════════════════
// Helper: is notice overdue (no acknowledgment + past due date/extended)
// ══════════════════════════════════════════════════════════════════════
function isNoticeOverdue(notice) {
  // Only wip/under_review notices can be overdue (open = acknowledged)
  if (notice.status !== 'wip' && notice.status !== 'under_review') return false;

  // Use extended_due_date if present, else due_date
  const due = notice.extended_due_date || notice.due_date;
  if (!due) return false;

  const today = new Date(); today.setHours(0, 0, 0, 0);
  const dueDate = new Date(due); dueDate.setHours(0, 0, 0, 0);

  // Overdue = due date already passed
  return dueDate < today;
}

export default function Litigations() {
  const [tdsNotices, setTdsNotices] = useState([]);
  const [itNotices, setItNotices]   = useState([]);
  const [loading, setLoading]       = useState(true);

  useEffect(() => {
    // Fetch notices for both TDS and Income Tax in parallel
    Promise.all([
      api.get('/legal-services/notices/', { params: { litigation_type: 'tds' } })
        .then(r => Array.isArray(r.data) ? r.data : (r.data.results || []))
        .catch(() => []),
      api.get('/legal-services/notices/', { params: { litigation_type: 'income-tax' } })
        .then(r => Array.isArray(r.data) ? r.data : (r.data.results || []))
        .catch(() => []),
    ]).then(([tds, it]) => {
      setTdsNotices(tds);
      setItNotices(it);
    }).finally(() => setLoading(false));
  }, []);

  // ── Compute counts ──
  const computeStats = (notices) => {
    const total    = notices.length;
    const wip      = notices.filter(n => n.status === 'wip' || n.status === 'under_review').length;
    const open     = notices.filter(n => n.status === 'open').length;
    const overdue  = notices.filter(isNoticeOverdue).length;
    return { total, wip, open, overdue };
  };

  const tdsStats = computeStats(tdsNotices);
  const itStats  = computeStats(itNotices);

  const ITEMS = [
    {
      label: 'TDS Litigations',
      description: 'Tax Deducted at Source case management, appeals & dispute tracking',
      path: '/legal-services/litigations/tds',
      icon: '📄',
      color: '#1A2F5A',
      light: '#EEF3FC',
      built: true,
      stats: [
        { label: 'All Notices', value: loading ? '…' : tdsStats.total,   color: '#1A2F5A' },
        { label: 'WIP',         value: loading ? '…' : tdsStats.wip,     color: '#f59e0b' },
        { label: 'Open',        value: loading ? '…' : tdsStats.open,    color: '#0ea5e9' },
        { label: 'Overdue',     value: loading ? '…' : tdsStats.overdue, color: '#C62828', hint: 'Past due date' },
      ],
    },
    {
      label: 'Income Tax Litigations',
      description: 'Income tax dispute, appeal tracking & assessment proceedings',
      path: '/legal-services/litigations/income-tax',
      icon: '📊',
      color: '#7C3AED',
      light: '#EDE9FE',
      built: true,
      stats: [
        { label: 'All Notices', value: loading ? '…' : itStats.total,   color: '#7C3AED' },
        { label: 'WIP',         value: loading ? '…' : itStats.wip,     color: '#f59e0b' },
        { label: 'Open',        value: loading ? '…' : itStats.open,    color: '#0ea5e9' },
        { label: 'Overdue',     value: loading ? '…' : itStats.overdue, color: '#C62828', hint: 'Past due date' },
      ],
    },
  ];

  return (
    <SubServiceSelector
      title="Litigations"
      subtitle="Select a service to get started"
      items={ITEMS}
      backPath="/legal-services"
      backLabel="Legal Services"
    />
  );
}