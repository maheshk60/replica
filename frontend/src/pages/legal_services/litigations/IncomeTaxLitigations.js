
// IncomeTaxLitigations.js — Thin wrapper using LitigationJobListView

import LitigationJobListView from '../LitigationJobListView';
import { api } from '../../../services/api';
import IncomeTaxCaseModal from './IncomeTaxCaseModal';

/* ─── LOCAL API DEFINITIONS (used only by this file) ─── */
const incomeTaxLitigationApi = {
  get:     (params)    => api.get('legal-services/income-tax-litigations/', { params }),
  getById: (id)        => api.get(`legal-services/income-tax-litigations/${id}/`),
  create:  (data)      => api.post('legal-services/income-tax-litigations/', data),
  update:  (id, data)  => api.put(`legal-services/income-tax-litigations/${id}/`, data),
  patch:   (id, data)  => api.patch(`legal-services/income-tax-litigations/${id}/`, data),
  delete:  (id)        => api.delete(`legal-services/income-tax-litigations/${id}/`),
};

export default function IncomeTaxLitigations() {
  return (
    <LitigationJobListView
      title="Income Tax Litigations"
      subtitle="Income tax dispute & appeal tracking"
      api={incomeTaxLitigationApi}
      CaseModal={IncomeTaxCaseModal}
      caseType="income-tax-litigations"
      breadcrumbs={[
        { label: 'Litigations', path: '/legal-services/litigations' },
        { label: 'Dashboard', path: '/legal-services/litigations/income-tax' },
      ]}
      clientPath={(c) => `/legal-services/clients/${c.client}?type=income-tax&caseId=${c.id}`}
    />
  );
}