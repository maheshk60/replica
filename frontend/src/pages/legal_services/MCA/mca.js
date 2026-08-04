// MCA.js — Thin wrapper

import SubServiceSelector from '../SubServiceSelector';

const ITEMS = [
  {
    label: 'Financial Statement Filing',
    subLabel: 'AOC-4',
    description: 'Annual financial statements filed with MCA',
    path: '/legal-services/mca/aoc-4',
    icon: '📊',
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
    label: 'XBRL Financial Statement',
    subLabel: 'AOC-4 XBRL',
    description: 'XBRL format financial statements',
    path: '/legal-services/mca/aoc-4-xbrl',
    icon: '📈',
    color: '#7C3AED',
    light: '#EDE9FE',
    built: true,
    stats: [
      { label: 'Total Jobs', value: 0, color: '#7C3AED' },
      { label: 'Active',     value: 0, color: '#0D6B52' },
      { label: 'Overdue',    value: 0, color: '#C62828', hint: 'Past due date' },
    ],
  },
  {
    label: 'Board Resolution Filing',
    subLabel: 'MGT-14',
    description: 'Board resolutions & special resolutions',
    path: '/legal-services/mca/mgt-14',
    icon: '📜',
    color: '#0369A1',
    light: '#E0F2FE',
    built: true,
    stats: [
      { label: 'Total Jobs', value: 0, color: '#0369A1' },
      { label: 'Active',     value: 0, color: '#0D6B52' },
      { label: 'Overdue',    value: 0, color: '#C62828', hint: 'Past due date' },
    ],
  },
  {
    label: 'Annual Return Filing',
    subLabel: 'MGT-7',
    description: 'Company annual returns to Registrar',
    path: '/legal-services/mca/mgt-7',
    icon: '📋',
    color: '#0D6B52',
    light: '#E8F7F3',
    built: true,
    stats: [
      { label: 'Total Jobs', value: 0, color: '#0D6B52' },
      { label: 'Active',     value: 0, color: '#0D6B52' },
      { label: 'Overdue',    value: 0, color: '#C62828', hint: 'Past due date' },
    ],
  },
  {
    label: 'OPC & Small Co. Annual Return',
    subLabel: 'MGT-7A',
    description: 'Simplified annual returns for OPC & small companies',
    path: '/legal-services/mca/mgt-7a',
    icon: '🏛️',
    color: '#92400E',
    light: '#FFF8E8',
    built: true,
    stats: [
      { label: 'Total Jobs', value: 0, color: '#92400E' },
      { label: 'Active',     value: 0, color: '#0D6B52' },
      { label: 'Overdue',    value: 0, color: '#C62828', hint: 'Past due date' },
    ],
  },
  {
    label: 'MSME Form-1 Filing',
    subLabel: 'MSME-1',
    description: 'Half-yearly return for MSME dues',
    path: '/legal-services/mca/msme-1',
    icon: '🏭',
    color: '#B45309',
    light: '#FEF3C7',
    built: true,
    stats: [
      { label: 'Total Jobs', value: 0, color: '#B45309' },
      { label: 'Active',     value: 0, color: '#0D6B52' },
      { label: 'Overdue',    value: 0, color: '#C62828', hint: 'Past due date' },
    ],
  },
  {
    label: 'Share Capital Reconciliation',
    subLabel: 'PAS-6',
    description: 'Half-yearly share capital audit report',
    path: '/legal-services/mca/pas-6',
    icon: '💼',
    color: '#4A3FA8',
    light: '#EDEAFB',
    built: true,
    stats: [
      { label: 'Total Jobs', value: 0, color: '#4A3FA8' },
      { label: 'Active',     value: 0, color: '#0D6B52' },
      { label: 'Overdue',    value: 0, color: '#C62828', hint: 'Past due date' },
    ],
  },
  {
    label: 'Auditor Appointment Filing',
    subLabel: 'ADT-1',
    description: 'Intimation of auditor appointment',
    path: '/legal-services/mca/adt-1',
    icon: '👔',
    color: '#BE185D',
    light: '#FCE7F3',
    built: true,
    stats: [
      { label: 'Total Jobs', value: 0, color: '#BE185D' },
      { label: 'Active',     value: 0, color: '#0D6B52' },
      { label: 'Overdue',    value: 0, color: '#C62828', hint: 'Past due date' },
    ],
  },
  {
    label: 'Deposit Return Filing',
    subLabel: 'DPT-3',
    description: 'Return of deposits & outstanding money',
    path: '/legal-services/mca/dpt-3',
    icon: '💰',
    color: '#047857',
    light: '#D1FAE5',
    built: true,
    stats: [
      { label: 'Total Jobs', value: 0, color: '#047857' },
      { label: 'Active',     value: 0, color: '#0D6B52' },
      { label: 'Overdue',    value: 0, color: '#C62828', hint: 'Past due date' },
    ],
  },
];

export default function MCA() {
  return (
    <SubServiceSelector
      title="MCA"
      subtitle="Ministry of Corporate Affairs filings"
      items={ITEMS}
      backPath="/legal-services"
      backLabel="Legal Services"
    />
  );
}