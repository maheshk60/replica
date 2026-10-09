// // Litigations.js — Litigations landing page: one tile per litigation type,
// // with live notice counts (All, WIP, Open, Overdue).

// import { useState, useEffect } from 'react';
// import SubServiceSelector from '../SubServiceSelector';
// import { toList, daysUntil, P, AMB, RED } from '../../IncomeTaxPage/JobUiCommon';
// import { legalApi, noticeDueDate, SKY } from '../LegalModals';

// const TILES = [
//   {
//     type: 'tds',
//     label: 'TDS Litigations',
//     description: 'Tax Deducted at Source case management, appeals & dispute tracking',
//     icon: '📄', color: P, light: '#EEF3FC',
//   },
//   {
//     type: 'income-tax',
//     label: 'Income Tax Litigations',
//     description: 'Income tax dispute, appeal tracking & assessment proceedings',
//     icon: '📊', color: '#7C3AED', light: '#EDE9FE',
//   },
// ];

// // Still being worked on (not acknowledged) and the due / extended due date has passed.
// const isOverdue = (n) => (n.status === 'wip' || n.status === 'under_review') && (daysUntil(noticeDueDate(n)) ?? 0) < 0;

// const statsFor = (notices) => ({
//   total: notices.length,
//   wip: notices.filter((n) => n.status === 'wip' || n.status === 'under_review').length,
//   open: notices.filter((n) => n.status === 'open').length,
//   overdue: notices.filter(isOverdue).length,
// });

// export default function Litigations() {
//   const [notices, setNotices] = useState({});
//   const [loading, setLoading] = useState(true);

//   useEffect(() => {
//     Promise.all(TILES.map((t) =>
//       legalApi.notices.list({ litigation_type: t.type }).then(toList).catch(() => [])
//     ))
//       .then((lists) => setNotices(Object.fromEntries(TILES.map((t, i) => [t.type, lists[i]]))))
//       .finally(() => setLoading(false));
//   }, []);

//   const items = TILES.map((t) => {
//     const s = statsFor(notices[t.type] || []);
//     const v = (x) => (loading ? '…' : x);
//     return {
//       ...t,
//       path: `/legal-services/litigations/${t.type}`,
//       stats: [
//         { label: 'All Notices', value: v(s.total), color: t.color },
//         { label: 'WIP', value: v(s.wip), color: AMB },
//         { label: 'Open', value: v(s.open), color: SKY },
//         { label: 'Overdue', value: v(s.overdue), color: RED, hint: 'Past due date' },
//       ],
//     };
//   });

//   return (
//     <SubServiceSelector
//       title="Litigations"
//       subtitle="Select a service to get started"
//       items={items}
//       backPath="/legal-services"
//       backLabel="Legal Services"
//     />
//   );
// }













// Litigations.js — Litigations landing page: one tile per litigation type,
// with live All Cases + All Notices counts matching the Dashboard.

import { useState, useEffect } from 'react';
import SubServiceSelector from '../SubServiceSelector';
import { toList, P } from '../../IncomeTaxPage/JobUiCommon';
import { legalApi } from '../LegalModals';
import { api } from '../../../services/api';

const TILES = [
  {
    type: 'tds',
    endpoint: '/legal-services/tds-litigations/',
    label: 'TDS Litigations',
    description: 'Tax Deducted at Source case management, appeals & dispute tracking',
    icon: '📄', color: P, light: '#EEF3FC',
  },
  {
    type: 'income-tax',
    endpoint: '/legal-services/income-tax-litigations/',
    label: 'Income Tax Litigations',
    description: 'Income tax dispute, appeal tracking & assessment proceedings',
    icon: '📊', color: '#7C3AED', light: '#EDE9FE',
  },
];

// Helper to reliably get total count whether paginated (res.data.count) or unpaginated list
const getCount = (res) => {
  if (!res) return 0;
  if (typeof res.data?.count === 'number') return res.data.count;
  return toList(res).length;
};

export default function Litigations() {
  const [dashboardData, setDashboardData] = useState({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all(
      TILES.map((t) =>
        Promise.all([
          api.get(t.endpoint).catch(() => ({ data: [] })),
          legalApi.notices.list({ litigation_type: t.type }).catch(() => ({ data: [] })),
        ])
      )
    )
      .then((results) => {
        const mapped = {};
        TILES.forEach((t, i) => {
          mapped[t.type] = {
            caseCount: getCount(results[i][0]),
            noticeCount: getCount(results[i][1]),
          };
        });
        setDashboardData(mapped);
      })
      .finally(() => setLoading(false));
  }, []);

  const items = TILES.map((t) => {
    const data = dashboardData[t.type] || { caseCount: 0, noticeCount: 0 };
    const v = (x) => (loading ? '…' : x);

    return {
      ...t,
      path: `/legal-services/litigations/${t.type}`,
      stats: [
        { label: 'All Cases', value: v(data.caseCount), color: t.color },
        { label: 'All Notices', value: v(data.noticeCount), color: t.color },
      ],
    };
  });

  return (
    <SubServiceSelector
      title="Litigations"
      subtitle="Select a service to get started"
      items={items}
      backPath="/legal-services"
      backLabel="Legal Services"
    />
  );
}