// import { useNavigate } from 'react-router-dom';

// const items = [
//   { label: 'FEMA Filings', description: 'Foreign Exchange Management compliance & filings', path: '/legal-services/fema/cases', icon: '🌐' },
// ];

// function FEMA() {
//   const navigate = useNavigate();

//   return (
//     <>
//       <style>{`
//         @keyframes femaBannerFloat {
//           0%, 100% { transform: translate(0, 0) scale(1); }
//           50% { transform: translate(-20px, 20px) scale(1.08); }
//         }
//         @property --fema-angle {
//           syntax: '<angle>';
//           initial-value: 0deg;
//           inherits: false;
//         }
//         @keyframes femaBorderSpin {
//           from { --fema-angle: 0deg; }
//           to { --fema-angle: 360deg; }
//         }
//         .motion-reduce\\:animate-none {
//           animation: none !important;
//         }
//       `}</style>
//       <div className="p-[2px_14px_32px] h-full box-border bg-[#f8f9fc] sm:p-[11px_16px_24px]">
//         {/* Breadcrumb */}
//         <div className="inline-flex items-center gap-1 mb-2">
//           <span
//             className="flex items-center gap-1.5 text-[#6b7280] font-semibold cursor-pointer py-[5px] px-2.5 rounded-lg transition-all duration-150 ease-in-out hover:bg-[#eef2ff] hover:text-[#4f46e5] hover:[&>svg]:text-[#6366f1]"
//             onClick={() => navigate('/legal-services')}
//           >
//             <svg className="w-[14px] h-[14px] text-[#8b8fa3] shrink-0 flex" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
//               <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
//               <path d="M9 22V12h6v10" />
//             </svg>
//             Legal Services
//           </span>
//           <span className="text-[#d1d5db] text-xs px-0.5">▸</span>
//           <span className="text-[#1a1a2e] font-bold py-[5px] px-2.5 bg-[#f1f2f8] rounded-lg">FEMA</span>
//         </div>

//         {/* Banner */}
//         <div className="relative overflow-hidden rounded-[18px] py-5 px-7 mb-7 shadow-[0_8px_24px_rgba(10,22,40,0.25)] bg-[linear-gradient(100deg,#214274_0%,#205995_55%,#092653_100%)]">
//           <div
//             className="absolute top-[-60%] right-[-10%] w-[260px] h-[260px] pointer-events-none motion-reduce:animate-none"
//             style={{
//               background: 'radial-gradient(circle, rgba(45, 212, 191, 0.18) 0%, transparent 70%)',
//               animation: 'femaBannerFloat 9s ease-in-out infinite',
//             }}
//           />
//           <div className="relative z-[1] text-white text-[21px] font-extrabold tracking-[-0.2px]">FEMA</div>
//           <div className="relative z-[1] text-white/60 text-[13px] mt-1">Select a category to view more</div>
//         </div>

//         {/* Tabs */}
//         <div className="flex gap-5 flex-wrap flex-col sm:flex-row">
//           {items.map((item) => (
//             <div
//               key={item.label}
//               className="group relative flex items-center gap-[18px] bg-white rounded-2xl py-6 px-7 cursor-pointer min-w-0 sm:min-w-[300px] max-w-full sm:max-w-[380px] overflow-hidden shadow-[0_2px_8px_rgba(20,20,40,0.05)] transition-all duration-200 ease-in-out border-[1.5px] border-transparent hover:-translate-y-[3px] hover:shadow-[0_14px_28px_rgba(15,118,110,0.16)]"
//               onClick={() => navigate(item.path)}
//             >
//               <div
//                 className="absolute inset-0 rounded-2xl p-[1.5px] opacity-0 transition-opacity duration-300 ease-in-out group-hover:opacity-100 pointer-events-none motion-reduce:animate-none"
//                 style={{
//                   background: 'conic-gradient(from var(--fema-angle, 0deg), transparent 0%, #0f766e 15%, #0891b2 30%, #38bdf8 45%, transparent 60%)',
//                   WebkitMask: 'linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)',
//                   WebkitMaskComposite: 'xor',
//                   maskComposite: 'exclude',
//                   animation: 'femaBorderSpin 3.5s linear infinite',
//                 }}
//               />
//               <div className="relative z-[1] text-[28px] w-14 h-14 shrink-0 flex items-center justify-center rounded-[14px] bg-[linear-gradient(135deg,#e0f2fe,#ecfeff)]">
//                 {item.icon}
//               </div>
//               <div className="relative z-[1] min-w-0">
//                 <div className="text-[17px] font-bold text-[#1a1a2e] mb-1 whitespace-nowrap">{item.label}</div>
//                 <div className="text-[13px] text-[#6b7280] leading-[1.4]">{item.description}</div>
//               </div>
//             </div>
//           ))}
//         </div>
//       </div>
//     </>
//   );
// }

// export default FEMA;















// FEMA.js
import SubServiceSelector from '../SubServiceSelector';

export default function FEMA() {
  return (
    <SubServiceSelector
      title="FEMA"
      subtitle="Foreign Exchange Management Act compliance"
      items={[
        { label: 'FC-GPR Filing', description: '...', path: '/legal-services/fema/fc-gpr', icon: '🌐' },
        { label: 'FLA Return', description: '...', path: '/legal-services/fema/fla', icon: '📋' },
      ]}
      backPath="/legal-services"
      backLabel="Legal Services"
    />
  );
}