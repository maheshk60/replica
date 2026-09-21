import MCAJobListView from './MCAJobListView';

export default function MCACompanyJobListView() {
  return (
    <MCAJobListView
      title="Company Service Filings"
      subtitle="Jobs under MCA Company Services (AOC-4, MGT-7, …)"
      mainService="company"
      dashboardPath="/legal-services/mca/company"
      workspacePath="/legal-services/mca/company/clients"
    />
  );
}