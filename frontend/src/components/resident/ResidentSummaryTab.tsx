import React, { useState, useEffect } from 'react';
import { clinicalApi } from '../../api/clinical';
import { Button } from '../ui/Button';
import { LoadingSpinner } from '../ui/LoadingSpinner';
import { ErrorMessage } from '../ui/ErrorMessage';
import { Modal } from '../ui/Modal';
import { useAuth } from '../../contexts/AuthContext';
import type { Resident } from '../../types/residents';
import type { ClinicalSummary } from '../../types/clinical';
import type { ApiError } from '../../api/client';

interface ResidentSummaryTabProps {
  resident: Resident;
  onUpdate: () => void;
}

export const ResidentSummaryTab: React.FC<ResidentSummaryTabProps> = ({
  resident,
  onUpdate,
}) => {
  const { isOwner } = useAuth();
  const [summary, setSummary] = useState<ClinicalSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingSummary, setEditingSummary] = useState<Partial<ClinicalSummary>>({});

  useEffect(() => {
    loadSummary();
  }, [resident.id]);

  const loadSummary = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await clinicalApi.getSummary(resident.id);
      setSummary(data);
      setEditingSummary(data);
    } catch (err) {
      const apiError = err as ApiError;
      if (apiError.status !== 404) {
        setError(apiError.detail || 'Error al cargar resumen clínico');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      setLoading(true);
      // Convert null to undefined for API compatibility
      const updateData = {
        primary_diagnosis: editingSummary.primary_diagnosis ?? undefined,
        secondary_diagnoses: editingSummary.secondary_diagnoses ?? undefined,
        allergies: editingSummary.allergies ?? undefined,
        current_medications: editingSummary.current_medications ?? undefined,
        medical_history: editingSummary.medical_history ?? undefined,
        family_history: editingSummary.family_history ?? undefined,
      };
      await clinicalApi.updateSummary(resident.id, updateData);
      await loadSummary();
      setShowEditModal(false);
      onUpdate();
    } catch (err) {
      const apiError = err as ApiError;
      setError(apiError.detail || 'Error al guardar resumen');
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('es-AR');
  };

  if (loading && !summary) {
    return (
      <div className="flex justify-center py-8">
        <LoadingSpinner />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {error && (
        <ErrorMessage message={error} onDismiss={() => setError(null)} />
      )}

      <div className="card">
        <h3 className="font-semibold text-gray-900 mb-4">Información Personal</h3>
        <div className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-gray-600">Nombre completo:</span>
            <span className="font-medium">{resident.first_name} {resident.last_name}</span>
          </div>
          {resident.dni && (
            <div className="flex justify-between">
              <span className="text-gray-600">DNI:</span>
              <span className="font-medium">{resident.dni}</span>
            </div>
          )}
          {resident.birth_date && (
            <div className="flex justify-between">
              <span className="text-gray-600">Fecha de nacimiento:</span>
              <span className="font-medium">{formatDate(resident.birth_date)}</span>
            </div>
          )}
          {resident.sex && (
            <div className="flex justify-between">
              <span className="text-gray-600">Sexo:</span>
              <span className="font-medium">
                {resident.sex === 'M' ? 'Masculino' : resident.sex === 'F' ? 'Femenino' : 'Otro'}
              </span>
            </div>
          )}
          <div className="flex justify-between">
            <span className="text-gray-600">Fecha de ingreso:</span>
            <span className="font-medium">{formatDate(resident.admission_date)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600">Estado:</span>
            <span className={`font-medium ${
              resident.stay_status === 'ACTIVE' ? 'text-green-600' : 'text-gray-600'
            }`}>
              {resident.stay_status === 'ACTIVE' ? 'Activo' : 'Finalizado'}
            </span>
          </div>
          {resident.coverage_type && (
            <div className="flex justify-between">
              <span className="text-gray-600">Cobertura:</span>
              <span className="font-medium">{resident.coverage_type}</span>
            </div>
          )}
        </div>
      </div>

      <div className="card">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-gray-900">Resumen Clínico</h3>
          {!isOwner && (
            <Button
              variant="secondary"
              onClick={() => {
                setEditingSummary(summary || {});
                setShowEditModal(true);
              }}
            >
              {summary ? 'Editar' : 'Crear'}
            </Button>
          )}
        </div>

        {summary ? (
          <div className="space-y-3 text-sm">
            {summary.primary_diagnosis && (
              <div>
                <span className="text-gray-600 font-medium">Diagnóstico Principal:</span>
                <p className="text-gray-900 mt-1">{summary.primary_diagnosis}</p>
              </div>
            )}
            {summary.secondary_diagnoses && (
              <div>
                <span className="text-gray-600 font-medium">Diagnósticos Secundarios:</span>
                <p className="text-gray-900 mt-1">{summary.secondary_diagnoses}</p>
              </div>
            )}
            {summary.allergies && (
              <div>
                <span className="text-gray-600 font-medium">Alergias:</span>
                <p className="text-gray-900 mt-1">{summary.allergies}</p>
              </div>
            )}
            {summary.current_medications && (
              <div>
                <span className="text-gray-600 font-medium">Medicaciones Actuales:</span>
                <p className="text-gray-900 mt-1">{summary.current_medications}</p>
              </div>
            )}
            {summary.medical_history && (
              <div>
                <span className="text-gray-600 font-medium">Historial Médico:</span>
                <p className="text-gray-900 mt-1 whitespace-pre-wrap">{summary.medical_history}</p>
              </div>
            )}
            {summary.family_history && (
              <div>
                <span className="text-gray-600 font-medium">Historial Familiar:</span>
                <p className="text-gray-900 mt-1 whitespace-pre-wrap">{summary.family_history}</p>
              </div>
            )}
          </div>
        ) : (
          <p className="text-gray-500 text-sm">No hay resumen clínico registrado</p>
        )}
      </div>

      <Modal
        isOpen={showEditModal}
        onClose={() => setShowEditModal(false)}
        title="Editar Resumen Clínico"
        size="lg"
      >
        <div className="space-y-4">
          <div>
            <label className="label">Diagnóstico Principal</label>
            <textarea
              value={editingSummary.primary_diagnosis || ''}
              onChange={(e) =>
                setEditingSummary({ ...editingSummary, primary_diagnosis: e.target.value })
              }
              className="input-field"
              rows={2}
            />
          </div>
          <div>
            <label className="label">Diagnósticos Secundarios</label>
            <textarea
              value={editingSummary.secondary_diagnoses || ''}
              onChange={(e) =>
                setEditingSummary({ ...editingSummary, secondary_diagnoses: e.target.value })
              }
              className="input-field"
              rows={2}
            />
          </div>
          <div>
            <label className="label">Alergias</label>
            <textarea
              value={editingSummary.allergies || ''}
              onChange={(e) =>
                setEditingSummary({ ...editingSummary, allergies: e.target.value })
              }
              className="input-field"
              rows={2}
            />
          </div>
          <div>
            <label className="label">Medicaciones Actuales</label>
            <textarea
              value={editingSummary.current_medications || ''}
              onChange={(e) =>
                setEditingSummary({ ...editingSummary, current_medications: e.target.value })
              }
              className="input-field"
              rows={2}
            />
          </div>
          <div>
            <label className="label">Historial Médico</label>
            <textarea
              value={editingSummary.medical_history || ''}
              onChange={(e) =>
                setEditingSummary({ ...editingSummary, medical_history: e.target.value })
              }
              className="input-field"
              rows={4}
            />
          </div>
          <div>
            <label className="label">Historial Familiar</label>
            <textarea
              value={editingSummary.family_history || ''}
              onChange={(e) =>
                setEditingSummary({ ...editingSummary, family_history: e.target.value })
              }
              className="input-field"
              rows={4}
            />
          </div>
          <div className="flex space-x-3 pt-4">
            <Button
              variant="secondary"
              onClick={() => setShowEditModal(false)}
              fullWidth
              disabled={loading}
            >
              Cancelar
            </Button>
            <Button onClick={handleSave} fullWidth disabled={loading}>
              {loading ? 'Guardando...' : 'Guardar'}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
