

import { useNavigate } from 'react-router-dom';

// ── Design tokens (matching reference "Direct Tax" style) ──
const P    = '#1A2F5A';
const PL   = '#EEF3FC';
const MUT  = '#7A7F99';
const BRD  = '#E8EAF0';
const WH   = '#FFFFFF';


const items = [
  {
    label: 'Litigations',
    description: 'TDS & Income Tax case management, appeals and dispute tracking',
    path: '/legal-services/litigations',
    icon: '⚖️',
    color: '#1A2F5A',
    light: '#EEF3FC',
    built: true,
  },
  {
    label: 'MCA',
    description: 'Ministry of Corporate Affairs filings and compliance',
    path: '/legal-services/mca',
    icon: '🏢',
    color: '#7C3AED',
    light: '#EDE9FE',
    built: true,
    //comingSoon: true,
  },
  {
    label: 'FEMA',
    description: 'Foreign Exchange Management Act compliance and filings',
    path: '/legal-services/fema',
    icon: '🌐',
    color: '#0369A1',
    light: '#E0F2FE',
    built: true,
    // comingSoon: true,
  },
  {
    label: 'Partnership',
    description: 'Partnership deeds, agreements and firm management',
    path: '/legal-services/partnership',
    icon: '🤝',
    color: '#BE185D',
    light: '#FCE7F3',
    built: true,
    comingSoon: true,
  },
];



function Home() {
  const navigate = useNavigate();

  return (
    <div style={{
      padding: '2px 14px 32px',
      minHeight: '100%',
      boxSizing: 'border-box',
      background: '#f8f9fc',
    }}>
      {/* ══════════ HEADER ══════════ */}
      <div style={{ marginBottom: 28 }}>
        <h1 style={{
          fontSize: 26,
          fontWeight: 900,
          color: '#111827',
          margin: 0,
          letterSpacing: '-.03em',
        }}>
          Legal Services
        </h1>
        <p style={{
          fontSize: 13,
          color: MUT,
          margin: '6px 0 0',
        }}>
          Select a service to get started
        </p>
      </div>

      {/* ══════════ CARDS GRID ══════════ */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
        gap: 18,
      }}>
        {items.map((item) => {
          const built      = item.built !== false;
          const comingSoon = item.comingSoon === true;
          const isClickable = built && !comingSoon;
          const cardColor  = item.color || P;
          const cardLight  = item.light || PL;

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
                minHeight: 200,
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
                flex: 1,
              }}>
                {item.description}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default Home;