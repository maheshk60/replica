// IncomeTaxDashboard.js — Income Tax litigation dashboard (route page).
// Title, API, paths and the New Case form all come from LITIGATION_TYPES.

import LitigationDashboard from '../LitigationDashboard';
import { LITIGATION_TYPES } from '../LegalModals';

const T = LITIGATION_TYPES['income-tax'];

export default function IncomeTaxDashboard() {
  return (
    <LitigationDashboard
      title={T.title}
      subtitle={T.subtitle}
      api={T.api}
      CaseModal={T.CaseModal}
      caseType={T.caseType}
      breadcrumbs={[{ label: 'Litigations', path: '/legal-services/litigations' }]}
      clientPath={T.clientPath}
      jobListPath={T.jobListPath}
    />
  );
}
