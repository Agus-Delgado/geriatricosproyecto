import React, { useState, useEffect } from 'react';
import { clinicalApi } from '../../api/clinical';
import { Button } from '../ui/Button';
import { LoadingSpinner } from '../ui/LoadingSpinner';
import { ErrorMessage } from '../ui/ErrorMessage';
import { Modal } from '../ui/Modal';
import { ClinicalNoteForm } from '../forms/ClinicalNoteForm';
import type { ClinicalNote } from '../../types/clinical';
import type { ApiError } from '../../api/client';

interface ResidentNotesTabProps {
  residentId: string;
}

export const ResidentNotesTab: React.FC<ResidentNotesTabProps> = ({
  residentId,
}) => {
  const [notes, setNotes] = useState<ClinicalNote[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);

  useEffect(() => {
    loadNotes();
  }, [residentId]);

  const loadNotes = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await clinicalApi.listNotes(residentId);
      setNotes(data.sort((a, b) => 
        new Date(b.recorded_at).getTime() - new Date(a.recorded_at).getTime()
      ));
    } catch (err) {
      const apiError = err as ApiError;
      setError(apiError.detail || 'Error al cargar notas');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateNote = async (data: any) => {
    try {
      await clinicalApi.createNote(residentId, data);
      setShowCreateModal(false);
      loadNotes();
    } catch (err) {
      const apiError = err as ApiError;
      throw new Error(apiError.detail || 'Error al crear nota');
    }
  };

  const formatDateTime = (dateString: string) => {
    return new Date(dateString).toLocaleString('es-AR');
  };

  const getNoteTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      EVOLUTION: 'Evolución',
      INCIDENT: 'Incidente',
      OBSERVATION: 'Observación',
    };
    return labels[type] || type;
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-gray-900">Notas Clínicas</h3>
        <Button onClick={() => setShowCreateModal(true)}>
          Nueva Nota
        </Button>
      </div>

      {error && (
        <ErrorMessage message={error} onDismiss={() => setError(null)} />
      )}

      {loading ? (
        <div className="flex justify-center py-8">
          <LoadingSpinner />
        </div>
      ) : notes.length === 0 ? (
        <div className="text-center text-gray-500 py-8">
          No hay notas clínicas registradas
        </div>
      ) : (
        <div className="space-y-3">
          {notes.map((note) => (
            <div key={note.id} className="card">
              <div className="flex items-start justify-between mb-2">
                <div>
                  <span className="inline-block px-2 py-1 text-xs font-medium bg-primary-100 text-primary-800 rounded">
                    {getNoteTypeLabel(note.note_type)}
                  </span>
                  <p className="text-xs text-gray-500 mt-1">
                    {formatDateTime(note.recorded_at)}
                  </p>
                </div>
              </div>
              <p className="text-sm text-gray-900 whitespace-pre-wrap">{note.content}</p>
            </div>
          ))}
        </div>
      )}

      <Modal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        title="Nueva Nota Clínica"
        size="lg"
      >
        <ClinicalNoteForm
          onSubmit={handleCreateNote}
          onCancel={() => setShowCreateModal(false)}
        />
      </Modal>
    </div>
  );
};
