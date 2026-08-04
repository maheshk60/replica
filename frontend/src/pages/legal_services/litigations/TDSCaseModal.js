// import { useState, useEffect, useMemo, useRef } from 'react';
// import { clientLiteApi, tdsLitigationApi, api } from '../../../services/api';

// const MONTHS = [
//   'January','February','March','April','May','June',
//   'July','August','September','October','November','December',
// ];

// const PERIOD_OPTIONS = [
//   { value: 'Monthly',     label: 'Monthly',     span: 1  },
//   { value: 'Quarterly',   label: 'Quarterly',   span: 3  },
//   { value: 'Half-Yearly', label: 'Half-Yearly', span: 6  },
//   { value: 'Annually',    label: 'Annually',    span: 12 },
// ];

// const EMPTY_FORM = {
//   client: '',
//   sub_service: '',
//   assessment_month: '',
//   period: '',
//   assigned_to: [],
//   notice_date: '',
//   due_date: '',
//   description: '',
// };

// function computePeriodLabel(yearMonthValue, span) {
//   if (!yearMonthValue) return '';
//   const [yearStr, monthStr] = yearMonthValue.split('-');
//   const startYear  = parseInt(yearStr, 10);
//   const startMonth = parseInt(monthStr, 10) - 1;

//   if (span <= 1) {
//     return `${MONTHS[startMonth]} ${startYear}`;
//   }

//   const endDate = new Date(startYear, startMonth + (span - 1), 1);
//   const endMonth = endDate.getMonth();
//   const endYear  = endDate.getFullYear();

//   return `${MONTHS[startMonth]} ${startYear} - ${MONTHS[endMonth]} ${endYear}`;
// }

// function toYearMonth(fullDateValue) {
//   if (!fullDateValue) return '';
//   return fullDateValue.slice(0, 7);
// }

// function parseAssessmentYearToDate(assessmentYearLabel) {
//   if (!assessmentYearLabel) return '';
//   const firstPart = assessmentYearLabel.split('-')[0].trim();
//   const [monthName, yearStr] = firstPart.split(' ');
//   const monthIndex = MONTHS.indexOf(monthName);
//   if (monthIndex === -1 || !yearStr) return '';
//   const mm = String(monthIndex + 1).padStart(2, '0');
//   return `${yearStr}-${mm}-01`;
// }

// export default function TDSCaseModal({ open, onClose, onCreated, editCase }) {
//   const [clients, setClients] = useState([]);
//   const [subServices, setSubServices] = useState([]);
//   const [employees, setEmployees] = useState([]);
//   const [loadingOptions, setLoadingOptions] = useState(true);
//   const [submitting, setSubmitting] = useState(false);
//   const [error, setError] = useState(null);

//   const [form, setForm] = useState(EMPTY_FORM);

//   useEffect(() => {
//     if (!open) return;
//     setLoadingOptions(true);
//     Promise.all([
//       clientLiteApi.get(),
//       api.get('/clients/subservices/'),
//       api.get('/employee/employees/'),
//     ])
//       .then(([clientsRes, subRes, employeesRes]) => {
//         setClients(clientsRes.data.results || clientsRes.data);
//         setSubServices(subRes.data.results || subRes.data);
//         setEmployees(employeesRes.data.results || employeesRes.data);
//       })
//       .catch(() => setError('Failed to load form options.'))
//       .finally(() => setLoadingOptions(false));
//   }, [open]);

//   useEffect(() => {
//     if (!open) return;
//     if (editCase) {
//       setForm({
//         client: editCase.client || '',
//         sub_service: editCase.sub_service || '',
//         assessment_month: parseAssessmentYearToDate(editCase.assessment_year),
//         assigned_to: (editCase.assigned_to || []).map(String),
//         period: editCase.period || '',
//         notice_date: editCase.notice_date || '',
//         due_date: editCase.due_date || '',
//         description: editCase.description || '',
//       });
//     } else {
//       setForm(EMPTY_FORM);
//     }
//     setError(null);
//   }, [open, editCase]);

//   const handleChange = (e) => {
//     const { name, value } = e.target;
//     setForm((prev) => ({ ...prev, [name]: value }));
//   };

//   const [assignOpen, setAssignOpen] = useState(false);
//   const assignBoxRef = useRef(null);

//   useEffect(() => {
//     const handleClickOutside = (e) => {
//       if (assignBoxRef.current && !assignBoxRef.current.contains(e.target)) {
//         setAssignOpen(false);
//       }
//     };
//     document.addEventListener('mousedown', handleClickOutside);
//     return () => document.removeEventListener('mousedown', handleClickOutside);
//   }, []);

//   const selectedEmployees = useMemo(
//     () => employees.filter((emp) => form.assigned_to.includes(String(emp.id))),
//     [employees, form.assigned_to]
//   );
//   const availableEmployees = useMemo(
//     () => employees.filter((emp) => !form.assigned_to.includes(String(emp.id))),
//     [employees, form.assigned_to]
//   );

//   const addAssignee = (empId) => {
//     setForm((prev) => ({ ...prev, assigned_to: [...prev.assigned_to, String(empId)] }));
//     setAssignOpen(false);
//   };

//   const removeAssignee = (empId) => {
//     setForm((prev) => ({
//       ...prev,
//       assigned_to: prev.assigned_to.filter((id) => id !== String(empId)),
//     }));
//   };

//   const employeeName = (emp) =>
//     [emp.first_name, emp.last_name].filter(Boolean).join(' ') || emp.email || `Employee #${emp.id}`;

//   const periodSpan = useMemo(
//     () => PERIOD_OPTIONS.find((p) => p.value === form.period)?.span || 1,
//     [form.period]
//   );
//   const periodLabel = useMemo(() => {
//     if (!form.assessment_month || !form.period) return '';
//     return computePeriodLabel(toYearMonth(form.assessment_month), periodSpan);
//   }, [form.assessment_month, form.period, periodSpan]);

//   const handleClose = () => {
//     setForm(EMPTY_FORM);
//     setError(null);
//     onClose();
//   };

//   const handleSubmit = async (e) => {
//     e.preventDefault();
//     if (!form.assessment_month || !form.period) {
//       setError('Please select both Assessment Month & Year and Period.');
//       return;
//     }
//     setSubmitting(true);
//     setError(null);

//     const payload = {
//       client: form.client,
//       sub_service: form.sub_service || null,
//       assigned_to: form.assigned_to,
//       period: form.period,
//       assessment_year: periodLabel,
//       notice_date: form.notice_date || null,
//       due_date: form.due_date || null,
//       description: form.description,
//       status: 'open',
//     };

//     try {
//       if (editCase) {
//         await tdsLitigationApi.update(editCase.id, payload);
//       } else {
//         await tdsLitigationApi.create(payload);
//       }
//       onCreated();
//       setForm(EMPTY_FORM);
//       onClose();
//     } catch (err) {
//       const data = err.response?.data;
//       setError(
//         data
//           ? Object.entries(data).map(([k, v]) => `${k}: ${v}`).join(' | ')
//           : 'Failed to create case.'
//       );
//     } finally {
//       setSubmitting(false);
//     }
//   };

//   if (!open) return null;

//   return (
//     <div className="fixed inset-0 bg-[rgba(10,22,40,0.55)] flex items-center justify-center z-[1000]" onClick={handleClose}>
//       <div className="bg-white rounded-[18px] w-full max-w-[520px] max-h-[88vh] overflow-y-auto shadow-[0_20px_60px_rgba(0,0,0,0.3)]" onClick={(e) => e.stopPropagation()}>
        
//         {/* Header */}
//         <div className="flex items-center justify-between px-6 py-5 border-b border-[#eef0f5]">
//           <h3 className="m-0 text-[17px] font-bold text-[#1a1a2e]">{editCase ? 'Edit' : 'New'} TDS Litigation</h3>
//           <button className="border-none bg-transparent text-[22px] leading-none text-gray-400 cursor-pointer p-1 rounded-lg hover:bg-gray-100 hover:text-[#1a1a2e] transition-colors" onClick={handleClose}>×</button>
//         </div>

//         {/* Error Message */}
//         {error && (
//           <div className="mx-6 mt-4 px-3.5 py-2.5 bg-red-50 border border-red-200 text-red-600 rounded-lg text-[13px]">
//             {error}
//           </div>
//         )}

//         {/* Form */}
//         <form onSubmit={handleSubmit} className="p-6 pt-5 flex flex-col gap-4" key={editCase ? editCase.id : 'new'}>
          
//           <div className="flex flex-col gap-1.5 flex-1">
//             <label className="text-[12.5px] font-bold text-gray-600">Client *</label>
//             <select 
//               name="client" 
//               value={form.client} 
//               onChange={handleChange} 
//               required 
//               disabled={loadingOptions} 
//               className="w-full box-border border border-gray-200 rounded-lg px-3 py-2 text-[13.5px] text-[#1a1a2e] outline-none font-inherit focus:border-indigo-500 transition-colors disabled:bg-gray-50 disabled:text-gray-400"
//             >
//               <option value="" hidden>{loadingOptions ? 'Loading...' : 'Select a client'}</option>
//               {clients.map((c) => (
//                 <option key={c.id} value={c.id}>{c.name}</option>
//               ))}
//             </select>
//           </div>

//           <div className="flex flex-col gap-1.5 flex-1">
//             <label className="text-[12.5px] font-bold text-gray-600">Services *</label>
//             <select 
//               name="sub_service" 
//               value={form.sub_service} 
//               onChange={handleChange} 
//               required 
//               disabled={loadingOptions} 
//               className="w-full box-border border border-gray-200 rounded-lg px-3 py-2 text-[13.5px] text-[#1a1a2e] outline-none font-inherit focus:border-indigo-500 transition-colors disabled:bg-gray-50 disabled:text-gray-400"
//             >
//               <option value="" hidden>{loadingOptions ? 'Loading...' : 'Select a service'}</option>
//               {subServices.map((s) => (
//                 <option key={s.id} value={s.id}>{s.name}</option>
//               ))}
//             </select>
//           </div>

//           <div className="flex gap-3.5">
//             <div className="flex flex-col gap-1.5 flex-1">
//               <label className="text-[12.5px] font-bold text-gray-600">Assessment Month & Year *</label>
//               <input
//                 type="date"
//                 name="assessment_month"
//                 value={form.assessment_month}
//                 onChange={handleChange}
//                 required
//                 className="w-full box-border border border-gray-200 rounded-lg px-3 py-2 text-[13.5px] text-[#1a1a2e] outline-none font-inherit focus:border-indigo-500 transition-colors"
//               />
//             </div>
//             <div className="flex flex-col gap-1.5 flex-1">
//               <label className="text-[12.5px] font-bold text-gray-600">Period *</label>
//               <select 
//                 name="period" 
//                 value={form.period} 
//                 onChange={handleChange} 
//                 required 
//                 className="w-full box-border border border-gray-200 rounded-lg px-3 py-2 text-[13.5px] text-[#1a1a2e] outline-none font-inherit focus:border-indigo-500 transition-colors"
//               >
//                 <option value="" disabled hidden>Select Period</option>
//                 {PERIOD_OPTIONS.map((p) => (
//                   <option key={p.value} value={p.value}>{p.label}</option>
//                 ))}
//               </select>
//             </div>
//           </div>

//           {periodLabel && (
//             <div className="text-[12.5px] text-gray-600 bg-gray-100 border border-gray-200 rounded-lg px-3 py-2 -mt-2 mb-1">
//               Period covered: <strong className="text-[#16273f] font-bold">{periodLabel}</strong>
//             </div>
//           )}

//           <div className="flex flex-col gap-1.5 flex-1" ref={assignBoxRef}>
//             <label className="text-[12.5px] font-bold text-gray-600">Assign To</label>
//             <div
//               className="flex flex-wrap items-center gap-1.5 w-full min-h-[42px] px-2.5 py-2 border border-gray-300 rounded-lg bg-white cursor-pointer box-border hover:border-gray-400 transition-colors"
//               onClick={() => !loadingOptions && setAssignOpen((prev) => !prev)}
//             >
//               {selectedEmployees.length === 0 ? (
//                 <span className="text-gray-400 text-[13.5px]">
//                   {loadingOptions ? 'Loading...' : 'Unassigned — click to add employees'}
//                 </span>
//               ) : (
//                 selectedEmployees.map((emp) => (
//                   <span key={emp.id} className="inline-flex items-center gap-1.5 bg-indigo-50 text-[#16273f] text-[12.5px] font-semibold px-2.5 py-1 rounded-full">
//                     {employeeName(emp)}
//                     <button
//                       type="button"
//                       className="inline-flex items-center justify-center w-4 h-4 border-none rounded-full bg-[rgba(22,39,63,0.12)] text-[#16273f] text-[12px] leading-none cursor-pointer p-0 hover:bg-[rgba(220,38,38,0.15)] hover:text-red-600 transition-colors"
//                       onClick={(e) => {
//                         e.stopPropagation();
//                         removeAssignee(emp.id);
//                       }}
//                       aria-label={`Remove ${employeeName(emp)}`}
//                     >
//                       ×
//                     </button>
//                   </span>
//                 ))
//               )}
//             </div>

//             {assignOpen && (
//               <div className="mt-1 max-h-[180px] overflow-y-auto border border-gray-200 rounded-lg bg-white shadow-[0_8px_20px_rgba(20,20,40,0.1)]">
//                 {availableEmployees.length === 0 ? (
//                   <div className="px-3.5 py-3 text-[13px] text-gray-400 text-center">No more employees to add</div>
//                 ) : (
//                   availableEmployees.map((emp) => (
//                     <div
//                       key={emp.id}
//                       className="px-3.5 py-2 text-[13.5px] text-[#1a1a2e] cursor-pointer hover:bg-gray-100 transition-colors"
//                       onClick={() => addAssignee(emp.id)}
//                     >
//                       {employeeName(emp)}
//                     </div>
//                   ))
//                 )}
//               </div>
//             )}
//           </div>

//           <div className="flex gap-3.5">
//             <div className="flex flex-col gap-1.5 flex-1">
//               <label className="text-[12.5px] font-bold text-gray-600">Notice Date</label>
//               <input 
//                 type="date" 
//                 name="notice_date" 
//                 value={form.notice_date} 
//                 onChange={handleChange} 
//                 className="w-full box-border border border-gray-200 rounded-lg px-3 py-2 text-[13.5px] text-[#1a1a2e] outline-none font-inherit focus:border-indigo-500 transition-colors" 
//               />
//             </div>
//             <div className="flex flex-col gap-1.5 flex-1">
//               <label className="text-[12.5px] font-bold text-gray-600">Due Date</label>
//               <input 
//                 type="date" 
//                 name="due_date" 
//                 value={form.due_date} 
//                 onChange={handleChange} 
//                 className="w-full box-border border border-gray-200 rounded-lg px-3 py-2 text-[13.5px] text-[#1a1a2e] outline-none font-inherit focus:border-indigo-500 transition-colors" 
//               />
//             </div>
//           </div>

//           <div className="flex flex-col gap-1.5 flex-1">
//             <label className="text-[12.5px] font-bold text-gray-600">Description</label>
//             <textarea 
//               name="description" 
//               value={form.description} 
//               onChange={handleChange} 
//               rows={3} 
//               className="w-full box-border border border-gray-200 rounded-lg px-3 py-2 text-[13.5px] text-[#1a1a2e] outline-none font-inherit focus:border-indigo-500 transition-colors resize-none" 
//             />
//           </div>

//           <div className="flex justify-end gap-2.5 mt-1.5">
//             <button 
//               type="button" 
//               className="px-4 py-2 rounded-lg border border-gray-200 bg-white text-gray-600 font-semibold text-[13px] cursor-pointer hover:bg-gray-100 transition-colors" 
//               onClick={handleClose}
//             >
//               Cancel
//             </button>
//             <button 
//               type="submit" 
//               className={`px-5 py-2 rounded-lg border-none bg-gradient-to-br from-[#14b8a6] to-[#2dd4bf] text-[#0a1628] font-bold text-[13px] cursor-pointer transition-opacity ${submitting ? 'opacity-60 cursor-not-allowed' : ''}`}
//               disabled={submitting}
//             >
//               {submitting
//                 ? (editCase ? 'Updating...' : 'Creating...')
//                 : (editCase ? 'Update Case' : 'Create Case')}
//             </button>
//           </div>
//         </form>
//       </div>
//     </div>
//   );
// }
























import { useState, useEffect, useMemo, useRef } from 'react';
import { api } from '../../../services/api';

/* ─── LOCAL API DEFINITIONS (used only by this file) ─── */
const clientLiteApi = {
  get: (params) => api.get('clients/clients-lite/', { params }),
};

const tdsLitigationApi = {
  get:     (params)    => api.get('legal-services/tds-litigations/', { params }),
  getById: (id)        => api.get(`legal-services/tds-litigations/${id}/`),
  create:  (data)      => api.post('legal-services/tds-litigations/', data),
  update:  (id, data)  => api.put(`legal-services/tds-litigations/${id}/`, data),
  patch:   (id, data)  => api.patch(`legal-services/tds-litigations/${id}/`, data),
  delete:  (id)        => api.delete(`legal-services/tds-litigations/${id}/`),
};

const MONTHS = [
  'January','February','March','April','May','June',
  'July','August','September','October','November','December',
];

const PERIOD_OPTIONS = [
  { value: 'Monthly',     label: 'Monthly',     span: 1  },
  { value: 'Quarterly',   label: 'Quarterly',   span: 3  },
  { value: 'Half-Yearly', label: 'Half-Yearly', span: 6  },
  { value: 'Annually',    label: 'Annually',    span: 12 },
];

const EMPTY_FORM = {
  client: '',
  sub_service: '',
  assessment_month: '',
  period: '',
  assigned_to: [],
  notice_date: '',
  due_date: '',
  description: '',
};

function computePeriodLabel(yearMonthValue, span) {
  if (!yearMonthValue) return '';
  const [yearStr, monthStr] = yearMonthValue.split('-');
  const startYear  = parseInt(yearStr, 10);
  const startMonth = parseInt(monthStr, 10) - 1;

  if (span <= 1) {
    return `${MONTHS[startMonth]} ${startYear}`;
  }

  const endDate = new Date(startYear, startMonth + (span - 1), 1);
  const endMonth = endDate.getMonth();
  const endYear  = endDate.getFullYear();

  return `${MONTHS[startMonth]} ${startYear} - ${MONTHS[endMonth]} ${endYear}`;
}

function toYearMonth(fullDateValue) {
  if (!fullDateValue) return '';
  return fullDateValue.slice(0, 7);
}

function parseAssessmentYearToDate(assessmentYearLabel) {
  if (!assessmentYearLabel) return '';
  const firstPart = assessmentYearLabel.split('-')[0].trim();
  const [monthName, yearStr] = firstPart.split(' ');
  const monthIndex = MONTHS.indexOf(monthName);
  if (monthIndex === -1 || !yearStr) return '';
  const mm = String(monthIndex + 1).padStart(2, '0');
  return `${yearStr}-${mm}-01`;
}

export default function TDSCaseModal({ open, onClose, onCreated, editCase }) {
  const [clients, setClients] = useState([]);
  const [subServices, setSubServices] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [loadingOptions, setLoadingOptions] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  const [form, setForm] = useState(EMPTY_FORM);

  useEffect(() => {
    if (!open) return;
    setLoadingOptions(true);
    Promise.all([
      clientLiteApi.get(),
      api.get('/clients/subservices/'),
      api.get('/employee/employees/'),
    ])
      .then(([clientsRes, subRes, employeesRes]) => {
        setClients(clientsRes.data.results || clientsRes.data);
        const allSubs = subRes.data.results || subRes.data;
        setSubServices(allSubs.filter((s) => s.job_category === 'tds'));
        setEmployees(employeesRes.data.results || employeesRes.data);
      })
      .catch(() => setError('Failed to load form options.'))
      .finally(() => setLoadingOptions(false));
  }, [open]);

  useEffect(() => {
    if (!open) return;
    if (editCase) {
      setForm({
        client: editCase.client || '',
        sub_service: editCase.sub_service || '',
        period: editCase.period || '',
        notice_date: editCase.notice_date || '',
        due_date: editCase.due_date || '',
        description: editCase.description || '',
      });
    } else {
      setForm(EMPTY_FORM);
    }
    setError(null);
  }, [open, editCase]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const [assignOpen, setAssignOpen] = useState(false);
  const assignBoxRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (assignBoxRef.current && !assignBoxRef.current.contains(e.target)) {
        setAssignOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const selectedEmployees = useMemo(
    () => employees.filter((emp) => form.assigned_to.includes(String(emp.id))),
    [employees, form.assigned_to]
  );
  const availableEmployees = useMemo(
    () => employees.filter((emp) => !form.assigned_to.includes(String(emp.id))),
    [employees, form.assigned_to]
  );

  const addAssignee = (empId) => {
    setForm((prev) => ({ ...prev, assigned_to: [...prev.assigned_to, String(empId)] }));
    setAssignOpen(false);
  };

  const removeAssignee = (empId) => {
    setForm((prev) => ({
      ...prev,
      assigned_to: prev.assigned_to.filter((id) => id !== String(empId)),
    }));
  };

  const employeeName = (emp) =>
    [emp.first_name, emp.last_name].filter(Boolean).join(' ') || emp.email || `Employee #${emp.id}`;

  const periodSpan = useMemo(
    () => PERIOD_OPTIONS.find((p) => p.value === form.period)?.span || 1,
    [form.period]
  );
  const periodLabel = useMemo(() => {
    if (!form.due_date || !form.period) return '';
    return computePeriodLabel(toYearMonth(form.due_date), periodSpan);
  }, [form.due_date, form.period, periodSpan]);

  const handleClose = () => {
    setForm(EMPTY_FORM);
    setError(null);
    onClose();
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.period) {                                 // ✅ only period required now
      setError('Please select a Period.');
      return;
    }
    setSubmitting(true);
    setError(null);

    const payload = {
      client: form.client,
      sub_service: form.sub_service || null,
      assigned_to: form.assigned_to,
      period: form.period,
      assessment_year: periodLabel,
      notice_date: form.notice_date || null,
      due_date: form.due_date || null,
      description: form.description,
      status: 'open',
    };

    try {
      if (editCase) {
        await tdsLitigationApi.update(editCase.id, payload);
      } else {
        await tdsLitigationApi.create(payload);
      }
      onCreated();
      setForm(EMPTY_FORM);
      onClose();
    } catch (err) {
      const data = err.response?.data;
      setError(
        data
          ? Object.entries(data).map(([k, v]) => `${k}: ${v}`).join(' | ')
          : 'Failed to create case.'
      );
    } finally {
      setSubmitting(false);
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 bg-[rgba(10,22,40,0.55)] flex items-center justify-center z-[1000]" onClick={handleClose}>
      <div className="bg-white rounded-[18px] w-full max-w-[520px] max-h-[88vh] overflow-y-auto shadow-[0_20px_60px_rgba(0,0,0,0.3)]" onClick={(e) => e.stopPropagation()}>
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-[#eef0f5]">
          <h3 className="m-0 text-[17px] font-bold text-[#1a1a2e]">{editCase ? 'Edit' : 'New'} TDS Litigation</h3>
          <button className="border-none bg-transparent text-[22px] leading-none text-gray-400 cursor-pointer p-1 rounded-lg hover:bg-gray-100 hover:text-[#1a1a2e] transition-colors" onClick={handleClose}>×</button>
        </div>

        {/* Error Message */}
        {error && (
          <div className="mx-6 mt-4 px-3.5 py-2.5 bg-red-50 border border-red-200 text-red-600 rounded-lg text-[13px]">
            {error}
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 pt-5 flex flex-col gap-4" key={editCase ? editCase.id : 'new'}>
          
          <div className="flex flex-col gap-1.5 flex-1">
            <label className="text-[12.5px] font-bold text-gray-600">Client *</label>
            <select 
              name="client" 
              value={form.client} 
              onChange={handleChange} 
              required 
              disabled={loadingOptions} 
              className="w-full box-border border border-gray-200 rounded-lg px-3 py-2 text-[13.5px] text-[#1a1a2e] outline-none font-inherit focus:border-indigo-500 transition-colors disabled:bg-gray-50 disabled:text-gray-400"
            >
              <option value="" hidden>{loadingOptions ? 'Loading...' : 'Select a client'}</option>
              {clients.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>

          <div className="flex flex-col gap-1.5 flex-1">
            <label className="text-[12.5px] font-bold text-gray-600">Services *</label>
            <select 
              name="sub_service" 
              value={form.sub_service} 
              onChange={handleChange} 
              required 
              disabled={loadingOptions} 
              className="w-full box-border border border-gray-200 rounded-lg px-3 py-2 text-[13.5px] text-[#1a1a2e] outline-none font-inherit focus:border-indigo-500 transition-colors disabled:bg-gray-50 disabled:text-gray-400"
            >
              <option value="" hidden>{loadingOptions ? 'Loading...' : 'Select a service'}</option>
              {subServices.map((s) => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
          </div>

          <div className="flex gap-3.5">
            {/* <div className="flex flex-col gap-1.5 flex-1">
              <label className="text-[12.5px] font-bold text-gray-600">Assessment Month & Year *</label>
              <input
                type="date"
                name="assessment_month"
                value={form.assessment_month}
                onChange={handleChange}
                required
                className="w-full box-border border border-gray-200 rounded-lg px-3 py-2 text-[13.5px] text-[#1a1a2e] outline-none font-inherit focus:border-indigo-500 transition-colors"
              />
            </div> */}
            <div className="flex flex-col gap-1.5 flex-1">
              <label className="text-[12.5px] font-bold text-gray-600">Period *</label>
              <select 
                name="period" 
                value={form.period} 
                onChange={handleChange} 
                required 
                className="w-full box-border border border-gray-200 rounded-lg px-3 py-2 text-[13.5px] text-[#1a1a2e] outline-none font-inherit focus:border-indigo-500 transition-colors"
              >
                <option value="" disabled hidden>Select Period</option>
                {PERIOD_OPTIONS.map((p) => (
                  <option key={p.value} value={p.value}>{p.label}</option>
                ))}
              </select>
            </div>
          </div>

          {periodLabel && (
            <div className="text-[12.5px] text-gray-600 bg-gray-100 border border-gray-200 rounded-lg px-3 py-2 -mt-2 mb-1">
              Period covered: <strong className="text-[#16273f] font-bold">{periodLabel}</strong>
            </div>
          )}

          <div className="flex flex-col gap-1.5 flex-1" ref={assignBoxRef}>
            <label className="text-[12.5px] font-bold text-gray-600">Assign To</label>
            <div
              className="flex flex-wrap items-center gap-1.5 w-full min-h-[42px] px-2.5 py-2 border border-gray-300 rounded-lg bg-white cursor-pointer box-border hover:border-gray-400 transition-colors"
              onClick={() => !loadingOptions && setAssignOpen((prev) => !prev)}
            >
              {selectedEmployees.length === 0 ? (
                <span className="text-gray-400 text-[13.5px]">
                  {loadingOptions ? 'Loading...' : 'Unassigned — click to add employees'}
                </span>
              ) : (
                selectedEmployees.map((emp) => (
                  <span key={emp.id} className="inline-flex items-center gap-1.5 bg-indigo-50 text-[#16273f] text-[12.5px] font-semibold px-2.5 py-1 rounded-full">
                    {employeeName(emp)}
                    <button
                      type="button"
                      className="inline-flex items-center justify-center w-4 h-4 border-none rounded-full bg-[rgba(22,39,63,0.12)] text-[#16273f] text-[12px] leading-none cursor-pointer p-0 hover:bg-[rgba(220,38,38,0.15)] hover:text-red-600 transition-colors"
                      onClick={(e) => {
                        e.stopPropagation();
                        removeAssignee(emp.id);
                      }}
                      aria-label={`Remove ${employeeName(emp)}`}
                    >
                      ×
                    </button>
                  </span>
                ))
              )}
            </div>

            {assignOpen && (
              <div className="mt-1 max-h-[180px] overflow-y-auto border border-gray-200 rounded-lg bg-white shadow-[0_8px_20px_rgba(20,20,40,0.1)]">
                {availableEmployees.length === 0 ? (
                  <div className="px-3.5 py-3 text-[13px] text-gray-400 text-center">No more employees to add</div>
                ) : (
                  availableEmployees.map((emp) => (
                    <div
                      key={emp.id}
                      className="px-3.5 py-2 text-[13.5px] text-[#1a1a2e] cursor-pointer hover:bg-gray-100 transition-colors"
                      onClick={() => addAssignee(emp.id)}
                    >
                      {employeeName(emp)}
                    </div>
                  ))
                )}
              </div>
            )}
          </div>

          <div className="flex gap-3.5">
            <div className="flex flex-col gap-1.5 flex-1">
              <label className="text-[12.5px] font-bold text-gray-600">Notice Date</label>
              <input 
                type="date" 
                name="notice_date" 
                value={form.notice_date} 
                onChange={handleChange} 
                className="w-full box-border border border-gray-200 rounded-lg px-3 py-2 text-[13.5px] text-[#1a1a2e] outline-none font-inherit focus:border-indigo-500 transition-colors" 
              />
            </div>
            <div className="flex flex-col gap-1.5 flex-1">
              <label className="text-[12.5px] font-bold text-gray-600">Due Date</label>
              <input 
                type="date" 
                name="due_date" 
                value={form.due_date} 
                onChange={handleChange} 
                className="w-full box-border border border-gray-200 rounded-lg px-3 py-2 text-[13.5px] text-[#1a1a2e] outline-none font-inherit focus:border-indigo-500 transition-colors" 
              />
            </div>
          </div>

          <div className="flex flex-col gap-1.5 flex-1">
            <label className="text-[12.5px] font-bold text-gray-600">Description</label>
            <textarea 
              name="description" 
              value={form.description} 
              onChange={handleChange} 
              rows={3} 
              className="w-full box-border border border-gray-200 rounded-lg px-3 py-2 text-[13.5px] text-[#1a1a2e] outline-none font-inherit focus:border-indigo-500 transition-colors resize-none" 
            />
          </div>

          <div className="flex justify-end gap-2.5 mt-1.5">
            <button 
              type="button" 
              className="px-4 py-2 rounded-lg border border-gray-200 bg-white text-gray-600 font-semibold text-[13px] cursor-pointer hover:bg-gray-100 transition-colors" 
              onClick={handleClose}
            >
              Cancel
            </button>
            <button 
              type="submit" 
              className={`px-5 py-2 rounded-lg border-none bg-gradient-to-br from-[#14b8a6] to-[#2dd4bf] text-[#0a1628] font-bold text-[13px] cursor-pointer transition-opacity ${submitting ? 'opacity-60 cursor-not-allowed' : ''}`}
              disabled={submitting}
            >
              {submitting
                ? (editCase ? 'Updating...' : 'Creating...')
                : (editCase ? 'Update Case' : 'Create Case')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}