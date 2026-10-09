// legal_service.js — Legal Services landing page.
// Same tile layout as every other module selector (via SubServiceSelector → ModuleCard).

import React from 'react';
import SubServiceSelector from './SubServiceSelector';

const ITEMS = [
  {
    label: 'Litigations',
    description: 'TDS & Income Tax case management, appeals and dispute tracking',
    path: '/legal-services/litigations',
    icon: '⚖️',
    color: '#1A2F5A',
    light: '#EEF3FC',
  },
  {
    label: 'MCA',
    description: 'Ministry of Corporate Affairs filings and compliance',
    path: '/legal-services/mca',
    icon: '🏢',
    color: '#7C3AED',
    light: '#EDE9FE',
  },
  {
    label: 'FEMA',
    description: 'Foreign Exchange Management Act compliance and filings',
    path: '/legal-services/fema',
    icon: '🌐',
    color: '#0369A1',
    light: '#E0F2FE',
    
  },
  {
    label: 'Partnership',
    description: 'Partnership deeds, agreements and firm management',
    path: '/legal-services/partnership',
    icon: '🤝',
    color: '#BE185D',
    light: '#FCE7F3',
    comingSoon: true,
  },
];

export default function Home() {
  return <SubServiceSelector title="Legal Services" items={ITEMS} showBreadcrumb={false} />;
}
