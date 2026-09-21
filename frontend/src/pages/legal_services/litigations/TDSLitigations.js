// TDSLitigations.js — Thin wrapper using LitigationJobListView

import LitigationJobListView from '../LitigationJobListView';
import { api } from '../../../services/api';
import TDSCaseModal from './TDSCaseModal';

/* ─── LOCAL API DEFINITIONS (used only by this file) ─── */
const tdsLitigationApi = {
  get:     (params)    => api.get('legal-services/tds-litigations/', { params }),
  getById: (id)        => api.get(`legal-services/tds-litigations/${id}/`),
  create:  (data)      => api.post('legal-services/tds-litigations/', data),
  update:  (id, data)  => api.put(`legal-services/tds-litigations/${id}/`, data),
  patch:   (id, data)  => api.patch(`legal-services/tds-litigations/${id}/`, data),
  delete:  (id)        => api.delete(`legal-services/tds-litigations/${id}/`),
};

export default function TDSLitigations() {
  return (
    <LitigationJobListView
      title="TDS Litigations"
      subtitle="Tax Deducted at Source case tracking"
      api={tdsLitigationApi}
      CaseModal={TDSCaseModal}
      caseType="tds-litigations"
      breadcrumbs={[
        { label: 'Litigations', path: '/legal-services/litigations' },
        { label: 'Dashboard', path: '/legal-services/litigations/tds' },
      ]}
      clientPath={(c) => `/legal-services/clients/${c.client}?type=tds&caseId=${c.id}`}
    />
  );
}   