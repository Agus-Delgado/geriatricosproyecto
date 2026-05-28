import React from 'react';
import type { Resident } from '../../types/residents';

interface FolderSummaryHeaderProps {
  patient: Resident;
}

export const FolderSummaryHeader: React.FC<FolderSummaryHeaderProps> = ({
  patient,
}) => {
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

  const age = calculateAge(patient.birth_date);

  return (
    <div
      className="rounded-xl shadow-lg p-6 mb-6"
      style={{ backgroundColor: 'var(--facility-card, white)' }}
    >
      <h1
        className="text-2xl font-bold text-gray-900 mb-4"
        style={{ color: 'var(--facility-accent, #667eea)' }}
      >
        Carpeta Médica
      </h1>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <h2 className="text-xl font-semibold text-gray-900 mb-3">
            {patient.last_name}, {patient.first_name}
          </h2>
          <div className="space-y-2 text-sm text-gray-600">
            <p>
              <span className="font-medium">DNI:</span> {patient.dni || 'N/A'}
            </p>
            {age !== null && (
              <p>
                <span className="font-medium">Edad:</span> {age} años
              </p>
            )}
          </div>
        </div>
        <div className="space-y-2 text-sm text-gray-600">
          {patient.coverage_type && (
            <p>
              <span className="font-medium">Obra Social:</span> {patient.coverage_type}
            </p>
          )}
          {patient.coverage_number && (
            <p>
              <span className="font-medium">Número de Obra Social:</span> {patient.coverage_number}
            </p>
          )}
          <p>
            <span className="font-medium">Fecha de Ingreso:</span>{' '}
            {new Date(patient.admission_date).toLocaleDateString('es-AR')}
          </p>
        </div>
      </div>
    </div>
  );
};
