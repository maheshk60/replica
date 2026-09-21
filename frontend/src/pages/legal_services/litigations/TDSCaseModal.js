

import { useState, useEffect, useMemo } from 'react';
import { Select, DatePicker, Input, Button, Spin } from 'antd';
import { api } from '../../../services/api';

const { Option } = Select;
const { TextArea } = Input;

/* ─── LOCAL API DEFINITIONS ─── */
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

export default function TDSCaseModal({ open, onClose, onCreated, editCase }) {
  const [clients, setClients] = useState([]);
  const [subServices, setSubServices] = useState([]);
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
    ])
      .then(([clientsRes, subRes]) => {
        setClients(clientsRes.data.results || clientsRes.data);
        const allSubs = subRes.data.results || subRes.data;
        setSubServices(allSubs.filter((s) => s.job_category === 'tds'));
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

  const handleChange = (name, value) => {
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

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
    if (!form.client) {
      setError('Please select a Client.');
      return;
    }
    if (!form.sub_service) {
      setError('Please select a Service.');
      return;
    }
    if (!form.period) {
      setError('Please select a Period.');
      return;
    }
    setSubmitting(true);
    setError(null);

    const payload = {
      client: form.client,
      sub_service: form.sub_service || null,
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
    <div
      className="fixed inset-0 bg-[rgba(10,22,40,0.55)] flex items-center justify-center z-[1000]"
      onClick={handleClose}
    >
      <div
        className="bg-white rounded-[18px] w-full max-w-[520px] max-h-[88vh] overflow-y-auto shadow-[0_20px_60px_rgba(0,0,0,0.3)]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-[#eef0f5]">
          <h3 className="m-0 text-[17px] font-bold text-[#1a1a2e]">
            {editCase ? 'Edit' : 'New'} TDS Litigation
          </h3>
          <button
            className="border-none bg-transparent text-[22px] leading-none text-gray-400 cursor-pointer p-1 rounded-lg hover:bg-gray-100 hover:text-[#1a1a2e] transition-colors"
            onClick={handleClose}
          >
            ×
          </button>
        </div>

        {/* Error */}
        {error && (
          <div className="mx-6 mt-4 px-3.5 py-2.5 bg-red-50 border border-red-200 text-red-600 rounded-lg text-[13px]">
            {error}
          </div>
        )}

        {/* Form */}
        <form
          onSubmit={handleSubmit}
          className="p-6 pt-5 flex flex-col gap-4"
          key={editCase ? editCase.id : 'new'}
        >
          {/* Client */}
          <div className="flex flex-col gap-1.5">
            <label className="text-[12.5px] font-bold text-gray-600">Client *</label>
            <Select
              showSearch
              allowClear
              placeholder={loadingOptions ? 'Loading...' : 'Select a client'}
              value={form.client || undefined}
              onChange={(val) => handleChange('client', val || '')}
              disabled={loadingOptions}
              optionFilterProp="children"
              style={{ width: '100%' }}
              size="middle"
            >
              {clients.map((c) => (
                <Option key={c.id} value={c.id}>{c.name}</Option>
              ))}
            </Select>
          </div>

          {/* Service + Period — side by side */}
          <div className="flex gap-3.5">
            {/* LEFT — Service */}
            <div className="flex flex-col gap-1.5 flex-1">
              <label className="text-[12.5px] font-bold text-gray-600">Services *</label>
              <Select
                showSearch
                allowClear
                placeholder={loadingOptions ? 'Loading...' : 'Select a service'}
                value={form.sub_service || undefined}
                onChange={(val) => handleChange('sub_service', val || '')}
                disabled={loadingOptions}
                optionFilterProp="children"
                style={{ width: '100%' }}
                size="middle"
              >
                {subServices.map((s) => (
                  <Option key={s.id} value={s.id}>{s.name}</Option>
                ))}
              </Select>
            </div>

            {/* RIGHT — Period */}
            <div className="flex flex-col gap-1.5 flex-1">
              <label className="text-[12.5px] font-bold text-gray-600">Period *</label>
              <Select
                placeholder="Select Period"
                value={form.period || undefined}
                onChange={(val) => handleChange('period', val || '')}
                style={{ width: '100%' }}
                size="middle"
              >
                {PERIOD_OPTIONS.map((p) => (
                  <Option key={p.value} value={p.value}>{p.label}</Option>
                ))}
              </Select>
            </div>
          </div>

          {/* Period Label */}
          {periodLabel && (
            <div className="text-[12.5px] text-gray-600 bg-gray-100 border border-gray-200 rounded-lg px-3 py-2 -mt-2 mb-1">
              Period covered:{' '}
              <strong className="text-[#16273f] font-bold">{periodLabel}</strong>
            </div>
          )}

          {/* Notice Date + Due Date — side by side */}
          <div className="flex gap-3.5">
            <div className="flex flex-col gap-1.5 flex-1">
              <label className="text-[12.5px] font-bold text-gray-600">Notice Date</label>
              <input
                type="date"
                name="notice_date"
                value={form.notice_date}
                onChange={handleInputChange}
                className="w-full box-border border border-gray-200 rounded-lg px-3 py-2 text-[13.5px] text-[#1a1a2e] outline-none font-inherit focus:border-indigo-500 transition-colors"
              />
            </div>
            <div className="flex flex-col gap-1.5 flex-1">
              <label className="text-[12.5px] font-bold text-gray-600">Due Date</label>
              <input
                type="date"
                name="due_date"
                value={form.due_date}
                onChange={handleInputChange}
                className="w-full box-border border border-gray-200 rounded-lg px-3 py-2 text-[13.5px] text-[#1a1a2e] outline-none font-inherit focus:border-indigo-500 transition-colors"
              />
            </div>
          </div>

          {/* Description */}
          <div className="flex flex-col gap-1.5">
            <label className="text-[12.5px] font-bold text-gray-600">Description</label>
            <textarea
              name="description"
              value={form.description}
              onChange={handleInputChange}
              rows={3}
              className="w-full box-border border border-gray-200 rounded-lg px-3 py-2 text-[13.5px] text-[#1a1a2e] outline-none font-inherit focus:border-indigo-500 transition-colors resize-none"
            />
          </div>

          {/* Buttons */}
          <div className="flex justify-end gap-2.5 mt-1.5">
            <button
              type="button"
              className="px-4 py-2 rounded-lg border border-gray-200 bg-white text-gray-600 font-semibold text-[13px] cursor-pointer hover:bg-gray-100 transition-colors"
              onClick={handleClose}
            >
              Cancel
            </button>
            <Button type="primary" htmlType="submit" loading={submitting}>
              {editCase ? 'Update Case' : 'Create Case'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}