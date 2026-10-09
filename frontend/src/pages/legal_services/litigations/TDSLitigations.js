// TDSLitigations.js — TDS litigation job list (route page).
// Title, API, paths and the New Case form all come from LITIGATION_TYPES.

import LitigationJobListView from '../LitigationJobListView';
import { LITIGATION_TYPES } from '../LegalModals';

const T = LITIGATION_TYPES['tds'];

export default function TDSLitigations() {
  return (
    <LitigationJobListView
      title={T.title}
      subtitle={T.listSubtitle}
      api={T.api}
      CaseModal={T.CaseModal}
      caseType={T.caseType}
      breadcrumbs={[
        { label: 'Litigations', path: '/legal-services/litigations' },
        { label: 'Dashboard', path: T.dashboardPath },
      ]}
      clientPath={T.clientPath}
    />
  );
}
