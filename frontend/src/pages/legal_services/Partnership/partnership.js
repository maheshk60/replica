// Partnership.js — Thin wrapper

import SubServiceSelector from '../SubServiceSelector';

const ITEMS = [
  {
    label: 'Partnership Deeds',
    description: 'Partnership deeds, amendments & agreements',
    path: '/legal-services/partnership/cases',
    icon: '🤝',
  },
];

export default function Partnership() {
  return (
    <SubServiceSelector
      title="Partnership"
      subtitle="Select a category to view more"
      items={ITEMS}
      backPath="/legal-services"
      backLabel="Legal Services"
    />
  );
}