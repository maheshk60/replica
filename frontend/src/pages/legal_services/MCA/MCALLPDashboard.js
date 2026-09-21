import MCADashboard from './MCADashboard';
export default function MCALLPDashboard() {
  return <MCADashboard
    title="MCA LLP Services"
    subtitle="Form 11, Form 8, and LLP event filings"
    mainService="llp"
    jobListPath="/legal-services/mca/llp/jobs"
    breadcrumbs={[]}
  />;
}