import MCAJobListView from './MCAJobListView';

export default function MCALLPJobListView() {
  return (
    <MCAJobListView
      title="LLP Service Filings"
      subtitle="Jobs under MCA LLP Services (Form-8, Form-11, …)"
      mainService="llp"
      dashboardPath="/legal-services/mca/llp"
      workspacePath="/legal-services/mca/llp/clients"
    />
  );
}