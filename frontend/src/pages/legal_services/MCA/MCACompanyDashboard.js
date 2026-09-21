import MCADashboard from './MCADashboard';
export default function MCACompanyDashboard() {
  return <MCADashboard
    title="MCA Company Services"
    subtitle="Annual returns, board resolutions, and company event filings"
    mainService="company"
    jobListPath="/legal-services/mca/company/jobs"
    breadcrumbs={[]}
  />;
}