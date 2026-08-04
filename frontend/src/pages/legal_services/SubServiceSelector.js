
// SubServiceSelector.js — Reusable sub-service tile selector
// Used by: Litigations, MCA, FEMA, Partnership
// Style matches reference "Direct Tax" module selector

import { useNavigate } from 'react-router-dom';

// ── Design tokens (matching reference) ──
const P    = '#1A2F5A';
const PL   = '#EEF3FC';
const GR   = '#0D6B52';
const RED  = '#C62828';
const MUT  = '#7A7F99';
const BRD  = '#E8EAF0';
const WH   = '#FFFFFF';

export default function SubServiceSelector({
  title,           // "Litigations" | "MCA" | "FEMA" | "Partnership"
  subtitle,        // "Select a category to view more"
  items,           // [{ label, description, path, icon, color?, light?, stats?, built?, comingSoon?, subLabel? }]
  backPath,        // "/legal-services"
  backLabel,       // "Legal Services"
}) {
  const navigate = useNavigate();

  return (
    <div style={{
      padding: '2px 14px 32px',
      minHeight: '100%',
      boxSizing: 'border-box',
      background: '#f8f9fc',
    }}>
      {/* ══════════ BREADCRUMB ══════════ */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 10 }}>
        <span
          style={{ fontSize: 13, color: '#7A7F99', cursor: 'pointer' }}
          onClick={() => navigate(backPath || '/legal-services')}
        >
          {backLabel || 'Legal Services'}
        </span>
        <span style={{ color: '#d1d5db', fontSize: 11 }}>›</span>
        <span style={{ fontSize: 13, fontWeight: 700, color: '#1C1E2E' }}>
          {title}
        </span>
      </div>

      {/* ══════════ HEADER ══════════ */}
      <div style={{ marginBottom: 28 }}>
        <h1 style={{
          fontSize: 26,
          fontWeight: 900,
          color: '#111827',
          margin: 0,
          letterSpacing: '-.03em',
        }}>
          {title}
        </h1>
        <p style={{
          fontSize: 13,
          color: MUT,
          margin: '6px 0 0',
        }}>
          {subtitle || 'Select a service to get started'}
        </p>
      </div>

      {/* ══════════ CARDS GRID ══════════ */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
        gap: 18,
      }}>
        {items.map((item) => {
          const built      = item.built !== false;   // default true
          const comingSoon = item.comingSoon === true;
          const isClickable = built && !comingSoon;
          const cardColor  = item.color || P;
          const cardLight  = item.light || PL;
          const hasStats   = Array.isArray(item.stats) && item.stats.length > 0;

          return (
            <div
              key={item.label}
              onClick={() => isClickable && navigate(item.path)}
              style={{
                background: WH,
                border: `1.5px solid ${BRD}`,
                borderRadius: 18,
                padding: '24px',
                cursor: isClickable ? 'pointer' : 'default',
                position: 'relative',
                overflow: 'hidden',
                transition: 'all .2s',
                opacity: isClickable ? 1 : 0.7,
                minHeight: 240,
                display: 'flex',
                flexDirection: 'column',
              }}
              onMouseEnter={e => {
                if (isClickable) {
                  e.currentTarget.style.borderColor = cardColor;
                  e.currentTarget.style.boxShadow = `0 8px 28px ${cardColor}18`;
                  e.currentTarget.style.background = cardLight;
                }
              }}
              onMouseLeave={e => {
                e.currentTarget.style.borderColor = BRD;
                e.currentTarget.style.boxShadow = 'none';
                e.currentTarget.style.background = WH;
              }}
            >
              {/* Top colored strip */}
              <div style={{
                position: 'absolute',
                top: 0, left: 0, right: 0, height: 5,
                background: cardColor,
                borderRadius: '18px 18px 0 0',
              }} />

              {/* Coming Soon badge */}
              {comingSoon && (
                <div style={{
                  position: 'absolute',
                  top: 14, right: 14,
                  fontSize: 9,
                  fontWeight: 700,
                  padding: '2px 7px',
                  borderRadius: 99,
                  background: '#F3F4F6',
                  color: MUT,
                  textTransform: 'uppercase',
                  letterSpacing: '.05em',
                }}>
                  Coming Soon
                </div>
              )}

              {/* Icon */}
              <div style={{
                fontSize: 32,
                marginBottom: 12,
              }}>
                {item.icon}
              </div>

              {/* Optional sub-label chip (like a tag/category) */}
              {item.subLabel && (
                <div style={{
                  display: 'inline-block',
                  fontSize: 9.5,
                  fontWeight: 700,
                  color: '#0891b2',
                  background: '#ecfeff',
                  border: '1px solid #a5f3fc',
                  borderRadius: 4,
                  padding: '2px 7px',
                  letterSpacing: '0.04em',
                  textTransform: 'uppercase',
                  marginBottom: 8,
                  alignSelf: 'flex-start',
                }}>
                  {item.subLabel}
                </div>
              )}

              {/* Title */}
              <div style={{
                fontSize: 17,
                fontWeight: 800,
                color: '#111827',
                marginBottom: 6,
              }}>
                {item.label}
              </div>

              {/* Description */}
              <div style={{
                fontSize: 12,
                color: MUT,
                lineHeight: 1.5,
                marginBottom: hasStats ? 16 : 0,
                flex: hasStats ? '0 0 auto' : 1,
              }}>
                {item.description}
              </div>

              {/* Stats row (optional) */}
              {hasStats && (
                <div style={{
                  display: 'flex',
                  gap: 12,
                  paddingTop: 16,
                  borderTop: `1px solid ${BRD}`,
                  flexWrap: 'wrap',
                  marginTop: 'auto',
                }}>
                  {item.stats.map(s => (
                    <div key={s.label} style={{
                      textAlign: 'center',
                      flex: 1,
                      minWidth: 60,
                    }}>
                      <div style={{
                        fontSize: 22,
                        fontWeight: 900,
                        color: s.color || P,
                        lineHeight: 1,
                      }}>
                        {s.value}
                      </div>
                      <div style={{
                        fontSize: 10,
                        color: MUT,
                        marginTop: 3,
                        fontWeight: 500,
                      }}>
                        {s.label}
                      </div>
                      {s.hint && (
                        <div style={{
                          fontSize: 9,
                          color: MUT,
                          marginTop: 1,
                          opacity: 0.7,
                        }}>
                          {s.hint}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}