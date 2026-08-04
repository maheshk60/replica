// Litigations.js — Thin wrapper

import SubServiceSelector from '../SubServiceSelector';

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
      { label: 'Total Jobs', value: 0, color: '#1A2F5A' },
      { label: 'Active',     value: 0, color: '#0D6B52' },
      { label: 'Overdue',    value: 0, color: '#C62828', hint: 'Past due date' },
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
      { label: 'Total Jobs', value: 0, color: '#7C3AED' },
      { label: 'Active',     value: 0, color: '#0D6B52' },
      { label: 'Overdue',    value: 0, color: '#C62828', hint: 'Past due date' },
    ],
  },
];

export default function Litigations() {
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