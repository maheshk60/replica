// MCAMainSelector.js — MCA landing page: Company / LLP tiles with live case counts.

import { useState, useEffect } from 'react';
import SubServiceSelector from '../SubServiceSelector';
import { toList, AMB, RED } from '../../IncomeTaxPage/JobUiCommon';
import { MCA_SERVICES, mcaApi, getMcaStatus, isMcaOverdue, SKY } from '../LegalModals';

const statsFor = (cases) => ({
  total: cases.length,
  wip: cases.filter((c) => getMcaStatus(c) === 'wip').length,
  open: cases.filter((c) => getMcaStatus(c) === 'open').length,
  overdue: cases.filter(isMcaOverdue).length,
});

export default function MCAMainSelector() {
  const [cases, setCases] = useState({});
  const [loading, setLoading] = useState(true);
  const services = Object.values(MCA_SERVICES);

  useEffect(() => {
    Promise.all(services.map((s) => mcaApi.cases({ main_service: s.key }).then(toList).catch(() => [])))
      .then((lists) => setCases(Object.fromEntries(services.map((s, i) => [s.key, lists[i]]))))
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const items = services.map((s) => {
    const st = statsFor(cases[s.key] || []);
    const v = (x) => (loading ? '…' : x);
    return {
      label: s.title,
      description: s.description,
      path: s.dashboardPath,
      icon: s.icon,
      color: s.color,
      light: s.light,
      stats: [
        { label: 'All Cases', value: v(st.total), color: s.color },
        { label: 'WIP', value: v(st.wip), color: AMB },
        { label: 'Open', value: v(st.open), color: SKY },
        { label: 'Overdue', value: v(st.overdue), color: RED, hint: 'Past due date' },
      ],
    };
  });

  return (
    <SubServiceSelector
      title="MCA Services"
      subtitle="Select a service category to get started"
      items={items}
      backPath="/legal-services"
      backLabel="Legal Services"
    />
  );
}
