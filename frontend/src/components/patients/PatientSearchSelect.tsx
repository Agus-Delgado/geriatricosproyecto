import React, { useState, useEffect } from 'react';
import { useFacility } from '../../contexts/FacilityContext';
import { useAuth } from '../../contexts/AuthContext';
import { residentsApi } from '../../api/residents';
import type { Resident } from '../../types/residents';
import { LoadingSpinner } from '../ui/LoadingSpinner';
import { SearchBar } from '../ui/SearchBar';

interface PatientSearchSelectProps {
  onSelect: (patient: Resident) => void;
  placeholder?: string;
  stayStatus?: string;
}

export const PatientSearchSelect: React.FC<PatientSearchSelectProps> = ({
  onSelect,
  placeholder = 'Buscar por DNI o nombre...',
  stayStatus = 'ACTIVE',
}) => {
  const { facility } = useFacility();
  const { activeFacilityId, user } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');
  const [patients, setPatients] = useState<Resident[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fallback: usar activeFacilityId si facility es null pero hay activeFacilityId
  const facilityIdToUse = facility?.id ?? activeFacilityId ?? user?.active_facility_id ?? null;

  // Debounce effect
  useEffect(() => {
    if (!facilityIdToUse) {
      setPatients([]);
      return;
    }

    if (!searchQuery.trim()) {
      setPatients([]);
      return;
    }

    const timeoutId = setTimeout(async () => {
      setLoading(true);
      setError(null);
      try {
        const results = await residentsApi.list(facilityIdToUse, {
          q: searchQuery.trim(),
          stay_status: stayStatus,
        });
        setPatients(results);
      } catch (err) {
        setError('Error al buscar pacientes');
        setPatients([]);
      } finally {
        setLoading(false);
      }
    }, 400); // 400ms debounce

    return () => clearTimeout(timeoutId);
  }, [searchQuery, facilityIdToUse, stayStatus]);

  const handleSelectPatient = (patient: Resident) => {
    onSelect(patient);
    setSearchQuery('');
    setPatients([]);
  };

  const calculateAge = (birthDate: string | null): number | null => {
    if (!birthDate) return null;
    const today = new Date();
    const birth = new Date(birthDate);
    let age = today.getFullYear() - birth.getFullYear();
    const monthDiff = today.getMonth() - birth.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
      age--;
    }
    return age;
  };

  if (!facilityIdToUse) {
    return (
      <div className="text-center py-4 text-gray-500">
        Por favor seleccione una sede primero
      </div>
    );
  }

  return (
    <div className="w-full">
      <SearchBar
        value={searchQuery}
        onChange={setSearchQuery}
        placeholder={placeholder}
      />

      {loading && (
        <div className="mt-4 flex justify-center py-4">
          <LoadingSpinner />
        </div>
      )}

      {error && (
        <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
          {error}
        </div>
      )}

      {!loading && !error && searchQuery && patients.length === 0 && (
        <div className="mt-4 p-4 text-center text-gray-500 text-sm">
          No se encontraron pacientes
        </div>
      )}

      {!loading && !error && patients.length > 0 && (
        <div className="mt-4 border border-gray-200 rounded-lg max-h-60 overflow-y-auto">
          {patients.map((patient) => {
            const age = calculateAge(patient.birth_date);
            return (
              <button
                key={patient.id}
                onClick={() => handleSelectPatient(patient)}
                className="w-full text-left px-4 py-3 hover:bg-gray-50 border-b border-gray-100 last:border-b-0 transition-colors"
              >
                <div className="font-medium text-gray-900">
                  {patient.last_name}, {patient.first_name}
                </div>
                <div className="text-sm text-gray-600 mt-1">
                  <span>DNI: {patient.dni || 'N/A'}</span>
                  {age !== null && <span className="ml-3">Edad: {age} años</span>}
                  {patient.coverage_type && (
                    <span className="ml-3">Obra Social: {patient.coverage_type}</span>
                  )}
                </div>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
};
