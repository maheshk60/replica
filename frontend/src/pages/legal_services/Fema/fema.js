

// FEMA.js
import SubServiceSelector from '../SubServiceSelector';

export default function FEMA() {
  return (
    <SubServiceSelector
      title="FEMA"
      subtitle="Foreign Exchange Management Act compliance"
      items={[
        { label: 'FC-GPR Filing', description: '...', path: '/legal-services/fema/fc-gpr', icon: '🌐' },
        { label: 'FLA Return', description: '...', path: '/legal-services/fema/fla', icon: '📋' },
      ]}
      backPath="/legal-services"
      backLabel="Legal Services"
    />
  );
}