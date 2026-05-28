import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { PatientSearchSelect } from '../components/patients/PatientSearchSelect';
import { BackHeader } from '../components/ui/BackHeader';
import type { Resident } from '../types/residents';

export default function ClinicalHistorySearchPage() {
  const navigate = useNavigate();
  const { activeFacilityId, getActiveRole } = useAuth();

  const handleSelectPatient = (patient: Resident) => {
    navigate(`/clinical-history/${patient.id}`);
  };

  // Determinar fallback según rol y facility
  const getFallbackPath = () => {
    if (activeFacilityId) {
      const role = getActiveRole();
      if (role === 'MEDICO' || role === 'ADMIN') {
        return `/g/${activeFacilityId}/medical`;
      }
    }
    return '/select-facility';
  };

  return (
    <div className="container mx-auto px-4 py-6 max-w-4xl">
      <BackHeader
        title="Historia Clínica"
        fallbackPath={getFallbackPath()}
      />
      <div
        className="rounded-xl shadow-lg p-6 mb-6"
        style={{ backgroundColor: 'var(--facility-card, white)' }}
      >
        <p className="text-gray-600 mb-6">
          Busque un paciente para ver su historia clínica y evoluciones.
        </p>
        <PatientSearchSelect onSelect={handleSelectPatient} />
      </div>
    </div>
  );
}
