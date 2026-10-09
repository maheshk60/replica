// SubServiceSelector.js — tile picker for Legal Services and its sub-areas
// (Litigations, MCA, FEMA, Partnership). Renders JobUiCommon's ModuleCard,
// so the tiles match the ITR/TDS/Advance Tax module selector exactly.
//
// Props are unchanged from before:
//   title, subtitle, backPath, backLabel
//   items: [{ label, description, path, icon, color?, light?, stats?, built?, comingSoon?, subLabel? }]
// New, optional:
//   showBreadcrumb (default true) — the top-level Legal Services page turns it off.
//
// Everything visual (tiles, breadcrumb, page header, colours) comes from
// JobUiCommon — the same theme file ITR / TDS / GST / PT use.

import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ModuleCard, Breadcrumb, PageHeader, P, PL, SKY, SKYL, SKYB } from '../IncomeTaxPage/JobUiCommon';

function SubLabelChip({ children }) {
  return (
    <span style={{
      display: 'block', width: 'fit-content', fontSize: 9.5, fontWeight: 700, color: SKY,
      background: SKYL, border: `1px solid ${SKYB}`, borderRadius: 4, padding: '2px 7px',
      letterSpacing: '0.04em', textTransform: 'uppercase', marginBottom: 8,
    }}>
      {children}
    </span>
  );
}

export default function SubServiceSelector({ title, subtitle, items, backPath, backLabel, showBreadcrumb = true }) {
  const navigate = useNavigate();

  const modules = items.map((item) => ({
    key: item.path,
    icon: item.icon,
    title: item.subLabel ? <><SubLabelChip>{item.subLabel}</SubLabelChip>{item.label}</> : item.label,
    desc: item.description,
    color: item.color || P,
    light: item.light || PL,
    built: item.built !== false && item.comingSoon !== true,
    stats: (item.stats || []).map((s) => ({ ...s, color: s.color || P })),
  }));

  return (
    <div className="page-container">
      {showBreadcrumb && (
        <Breadcrumb steps={[
          { label: backLabel || 'Legal Services', onClick: () => navigate(backPath || '/legal-services') },
          { label: title },
        ]} />
      )}

      <PageHeader title={title} subtitle={subtitle || 'Select a service to get started'} />

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 18 }}>
        {modules.map((mod) => (
          <ModuleCard key={mod.key} mod={mod} onSelect={(path) => navigate(path)} />
        ))}
      </div>
    </div>
  );
}