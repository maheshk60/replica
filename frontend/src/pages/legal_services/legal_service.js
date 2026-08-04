
// import { useNavigate } from 'react-router-dom';

// const items = [
//   { label: 'Litigations', description: 'TDS & Income Tax case management', path: '/legal-services/litigations', icon: '⚖️', gradient: 'linear-gradient(90deg, #6366f1, #818cf8)', hoverBorder: '#c7d2fe' },
//   { label: 'MCA', description: 'Ministry of Corporate Affairs filings', path: '/legal-services/mca', icon: '🏢', gradient: 'linear-gradient(90deg, #f59e0b, #fbbf24)', hoverBorder: '#fde68a' },
//   { label: 'FEMA', description: 'Foreign Exchange Management compliance', path: '/legal-services/fema', icon: '🌐', gradient: 'linear-gradient(90deg, #0ea5e9, #38bdf8)', hoverBorder: '#bae6fd' },
//   { label: 'Partnership', description: 'Partnership deeds & agreements', path: '/legal-services/partnership', icon: '🤝', gradient: 'linear-gradient(90deg, #ec4899, #f472b6)', hoverBorder: '#fbcfe8' },
// ];

// function Home() {
//   const navigate = useNavigate();

//   return (
//     <div className="p-[18px] h-full box-border bg-[#f8f9fc]">
//       {/* Welcome Banner */}
//       <div
//         className="relative overflow-hidden rounded-[15px] py-6 px-7 mb-7 shadow-[0_8px_24px_rgba(10,22,40,0.2)]"
//         style={{ background: 'linear-gradient(100deg, #214274 0%, #0f2236 55%, #092653 100%)' }}
//       >
//         <div
//           className="absolute top-[-60px] right-[-60px] w-[220px] h-[220px] rounded-full pointer-events-none"
//           style={{ background: 'radial-gradient(circle, rgba(45,212,191,0.25), transparent 70%)' }}
//         />
//         <div className="relative z-[1] text-white text-[26px] font-extrabold mb-2 tracking-[-0.5px]">
//           Legal Services
//         </div>
//         <div className="relative z-[1] text-white/80 text-sm max-w-[560px] leading-[1.5] mb-4">
//           Manage litigations, MCA filings, FEMA compliance, and partnership documents
//         </div>
//       </div>

//       {/* Tile Grid */}
//       <div className="grid grid-cols-1 md:grid-cols-2 min-[1100px]:grid-cols-4 gap-6 w-full">
//         {items.map((item) => (
//           <div
//             key={item.label}
//             className="group relative bg-white border border-[#eef0f5] rounded-[20px] py-8 px-6 cursor-pointer overflow-hidden shadow-[0_2px_8px_rgba(20,20,40,0.05)] flex flex-col items-start min-h-[180px] transition-[transform,box-shadow,border-color] duration-[250ms] ease-[cubic-bezier(0.2,0.8,0.2,1)] hover:-translate-y-1.5 hover:shadow-[0_16px_32px_rgba(99,102,241,0.15)]"
//             style={{
//               // hover border color handled via inline style won't work for hover, use CSS variable trick
//             }}
//             onClick={() => navigate(item.path)}
//             onMouseEnter={(e) => {
//               e.currentTarget.style.borderColor = item.hoverBorder;
//             }}
//             onMouseLeave={(e) => {
//               e.currentTarget.style.borderColor = '#eef0f5';
//             }}
//           >
//             {/* Top colored line */}
//             <div
//               className="absolute top-0 left-0 right-0 h-1 opacity-100"
//               style={{ background: item.gradient }}
//             />
//             <div
//               className="text-[30px] mb-[18px] w-14 h-14 flex items-center justify-center rounded-[14px] transition-transform duration-[250ms] ease-out group-hover:scale-108 group-hover:-rotate-4"
//               style={{ background: 'linear-gradient(135deg, #eef2ff, #fdf2f8)' }}
//             >
//               {item.icon}
//             </div>
//             <div className="text-[18px] font-bold text-[#1a1a2e] mb-1.5">{item.label}</div>
//             <div className="text-[13.5px] text-[#6b7280] leading-[1.45]">{item.description}</div>
//           </div>
//         ))}
//       </div>
//     </div>
//   );
// }

// export default Home;




















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
  },
  {
    label: 'FEMA',
    description: 'Foreign Exchange Management Act compliance and filings',
    path: '/legal-services/fema',
    icon: '🌐',
    color: '#0369A1',
    light: '#E0F2FE',
    built: true,
  },
  {
    label: 'Partnership',
    description: 'Partnership deeds, agreements and firm management',
    path: '/legal-services/partnership',
    icon: '🤝',
    color: '#BE185D',
    light: '#FCE7F3',
    built: true,
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