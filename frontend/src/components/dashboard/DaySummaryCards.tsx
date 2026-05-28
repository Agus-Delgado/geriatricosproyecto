import React from 'react';
import type { DayStats } from '../../types/dashboard';

interface DaySummaryCardsProps {
  facilityName: string;
  date: string;
  stats?: DayStats;
}

export const DaySummaryCards: React.FC<DaySummaryCardsProps> = ({
  facilityName,
  date,
  stats,
}) => {
  const formatDate = (dateString: string): string => {
    return new Date(dateString).toLocaleDateString('es-AR', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
      {/* Hogar activo */}
      <div
        className="rounded-lg shadow p-4"
        style={{ backgroundColor: 'var(--facility-card, white)' }}
      >
        <p className="text-xs text-gray-500 uppercase mb-1">Hogar</p>
        <p className="text-lg font-semibold text-gray-900">{facilityName}</p>
      </div>

      {/* Fecha */}
      <div
        className="rounded-lg shadow p-4"
        style={{ backgroundColor: 'var(--facility-card, white)' }}
      >
        <p className="text-xs text-gray-500 uppercase mb-1">Hoy</p>
        <p className="text-lg font-semibold text-gray-900">{formatDate(date)}</p>
      </div>

      {/* Pacientes vistos hoy */}
      <div
        className="rounded-lg shadow p-4"
        style={{ backgroundColor: 'var(--facility-card, white)' }}
      >
        <p className="text-xs text-gray-500 uppercase mb-1">Pacientes vistos</p>
        <p className="text-lg font-semibold text-gray-900">
          {stats?.patients_viewed_today !== undefined ? stats.patients_viewed_today : '—'}
        </p>
      </div>

      {/* Recetas registradas hoy */}
      <div
        className="rounded-lg shadow p-4"
        style={{ backgroundColor: 'var(--facility-card, white)' }}
      >
        <p className="text-xs text-gray-500 uppercase mb-1">Recetas registradas</p>
        <p className="text-lg font-semibold text-gray-900">
          {stats?.prescriptions_created_today !== undefined ? stats.prescriptions_created_today : '—'}
        </p>
      </div>

      {/* Evoluciones agregadas hoy */}
      {stats?.clinical_notes_created_today !== undefined && (
        <div
          className="rounded-lg shadow p-4"
          style={{ backgroundColor: 'var(--facility-card, white)' }}
        >
          <p className="text-xs text-gray-500 uppercase mb-1">Evoluciones agregadas</p>
          <p className="text-lg font-semibold text-gray-900">{stats.clinical_notes_created_today}</p>
        </div>
      )}

      {/* Atenciones hoy (agenda entries) */}
      {stats?.agenda_entries_today !== undefined && (
        <div
          className="rounded-lg shadow p-4"
          style={{ backgroundColor: 'var(--facility-card, white)' }}
        >
          <p className="text-xs text-gray-500 uppercase mb-1">Atenciones hoy</p>
          <p className="text-lg font-semibold text-gray-900">{stats.agenda_entries_today}</p>
        </div>
      )}
    </div>
  );
};