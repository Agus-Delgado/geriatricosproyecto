import React from 'react';
import type { ClinicalNote } from '../../types/clinical';
import { LoadingSpinner } from '../ui/LoadingSpinner';

interface EvolutionsListProps {
  notes: ClinicalNote[];
  loading?: boolean;
}

export const EvolutionsList: React.FC<EvolutionsListProps> = ({
  notes,
  loading = false,
}) => {
  const formatDate = (dateString: string): string => {
    return new Date(dateString).toLocaleDateString('es-AR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  };

  const formatTime = (dateString: string): string => {
    return new Date(dateString).toLocaleTimeString('es-AR', {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getNoteTypeLabel = (type: string): string => {
    const labels: Record<string, string> = {
      EVOLUTION: 'Evolución',
      INCIDENT: 'Incidente',
      GENERAL: 'General',
    };
    return labels[type] || type;
  };

  if (loading) {
    return (
      <div className="flex justify-center py-8">
        <LoadingSpinner />
      </div>
    );
  }

  if (notes.length === 0) {
    return (
      <div className="text-center py-12 text-gray-500">
        <p className="text-lg font-medium mb-2">No hay evoluciones registradas</p>
        <p className="text-sm">Las evoluciones clínicas aparecerán aquí cuando se registren.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {notes.map((note) => (
        <div
          key={note.id}
          className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm hover:shadow-md transition-shadow"
        >
          {/* Fecha y hora arriba */}
          <div className="flex items-center justify-between mb-3 pb-2 border-b border-gray-100">
            <div className="flex items-center gap-3">
              <div>
                <p className="text-sm font-semibold text-gray-900">
                  {formatDate(note.recorded_at)}
                </p>
                <p className="text-xs text-gray-500">
                  {formatTime(note.recorded_at)}
                </p>
              </div>
              <span className="inline-block px-2 py-1 text-xs font-medium bg-blue-100 text-blue-800 rounded">
                {getNoteTypeLabel(note.note_type)}
              </span>
            </div>
          </div>

          {/* Texto/nota abajo */}
          <div className="mt-2">
            <p className="text-sm text-gray-900 whitespace-pre-wrap leading-relaxed">
              {note.content}
            </p>
          </div>
        </div>
      ))}
    </div>
  );
};
