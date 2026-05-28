import React, { useState, useEffect } from 'react';
import { residentsApi } from '../../api/residents';
import type { Resident } from '../../types/residents';
import { SearchBar } from '../ui/SearchBar';
import { Button } from '../ui/Button';
import { LoadingSpinner } from '../ui/LoadingSpinner';
import { ErrorMessage } from '../ui/ErrorMessage';
import { Modal } from '../ui/Modal';
import { ResidentForm } from '../forms/ResidentForm';
import type { ApiError } from '../../api/client';
import { useAuth } from '../../contexts/AuthContext';

interface PatientListProps {
  facilityId: string;
}

export const PatientList: React.FC<PatientListProps> = ({ facilityId }) => {
  const [patients, setPatients] = useState<Resident[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingPatient, setEditingPatient] = useState<Resident | null>(null);
  const [visibleCount, setVisibleCount] = useState(20);
  const { getActiveRole } = useAuth();
  const canEdit = getActiveRole() === 'MEDICO' || getActiveRole() === 'ADMIN';

  useEffect(() => {
    loadPatients();
  }, [facilityId, searchQuery]);

  const loadPatients = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await residentsApi.list(facilityId, {
        q: searchQuery || undefined,
        stay_status: 'ACTIVE',
      });
      setPatients(data);
    } catch (err) {
      const apiError = err as ApiError;
      setError(apiError.detail || 'Error al cargar pacientes');
    } finally {
      setLoading(false);
    }
  };

  const handleCreatePatient = async (data: any) => {
    try {
      const created = await residentsApi.create(data);
      setShowCreateModal(false);
      loadPatients();
      return created;
    } catch (err) {
      const apiError = err as ApiError;
      throw new Error(apiError.detail || 'Error al crear paciente');
    }
  };

  const openEditPatient = async (patient: Resident) => {
    try {
      const fresh = await residentsApi.get(patient.id);
      setEditingPatient(fresh);
      setShowEditModal(true);
    } catch (err) {
      const apiError = err as ApiError;
      setError(apiError.detail || 'Error al cargar paciente');
    }
  };

  const handleUpdatePatient = async (data: any) => {
    if (!editingPatient) return;
    try {
      await residentsApi.update(editingPatient.id, data);
      setShowEditModal(false);
      setEditingPatient(null);
      loadPatients();
    } catch (err) {
      const apiError = err as ApiError;
      throw new Error(apiError.detail || 'Error al actualizar paciente');
    }
  };

  // Funciones changeStatus y deletePatient eliminadas (no se usan)

  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('es-AR');
  };

  return (
    <div 
      className="rounded-xl shadow-lg p-6"
      style={{ backgroundColor: 'var(--facility-card, white)' }}
    >
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 mb-1">Pacientes</h2>
          <p className="text-sm text-gray-600">
            {patients.length} {patients.length === 1 ? 'paciente activo' : 'pacientes activos'}
          </p>
        </div>
        {canEdit && (
          <Button
            onClick={() => setShowCreateModal(true)}
            style={{ backgroundColor: 'var(--facility-accent, #667eea)' }}
          >
            Agregar paciente
          </Button>
        )}
      </div>

      <div className="mb-4 flex items-center gap-4">
        <SearchBar
          value={searchQuery}
          onChange={setSearchQuery}
          placeholder="Buscar por DNI o nombre..."
        />
      </div>

      {error && (
        <div className="mb-4">
          <ErrorMessage message={error} onDismiss={() => setError(null)} />
        </div>
      )}

      {loading ? (
        <div className="flex justify-center py-8">
          <LoadingSpinner />
        </div>
      ) : patients.length === 0 ? (
        <div className="text-center py-8 text-gray-500">
          {searchQuery ? 'No se encontraron pacientes' : 'No hay pacientes registrados'}
        </div>
      ) : (
        <>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-200">
                <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Nombre</th>
                <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">DNI</th>
                <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Obra Social</th>
                <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Fecha Ingreso</th>
                <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {patients.slice(0, visibleCount).map((patient) => (
                <tr key={patient.id} className="border-b border-gray-100 hover:bg-gray-50">
                  <td className="py-3 px-4">
                    <div className="font-medium text-gray-900">
                      {patient.last_name}, {patient.first_name}
                    </div>
                  </td>
                  <td className="py-3 px-4 text-gray-600">{patient.dni || 'N/A'}</td>
                  <td className="py-3 px-4 text-gray-600">
                    {patient.coverage_type || 'N/A'}
                  </td>
                  <td className="py-3 px-4 text-gray-600">{formatDate(patient.admission_date)}</td>
                  {/* Columna Estado eliminada */}
                  <td className="py-3 px-4">
                    <div className="flex gap-2">
                      {canEdit && (
                        <Button variant="secondary" onClick={() => openEditPatient(patient)}>
                          Editar
                        </Button>
                      )}
                      <Button
                        variant="secondary"
                        onClick={() => window.open(`/residents/${patient.id}/print`, '_blank')}
                        title="Imprimir datos del paciente"
                      >
                        Imprimir datos
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {patients.length > visibleCount && (
          <div className="mt-4 flex justify-center">
            <Button onClick={() => setVisibleCount((c) => c + 20)}>Ver más</Button>
          </div>
        )}
        </>
      )}

      <Modal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        title="Agregar Paciente"
        size="lg"
      >
        <ResidentForm
          onSubmit={handleCreatePatient}
          onCancel={() => setShowCreateModal(false)}
          facilityId={facilityId}
        />
      </Modal>

      <Modal
        isOpen={showEditModal}
        onClose={() => {
          setShowEditModal(false);
          setEditingPatient(null);
        }}
        title="Editar Paciente"
        size="lg"
      >
        {editingPatient && (
          <ResidentForm
            resident={editingPatient}
            onSubmit={handleUpdatePatient}
            onCancel={() => {
              setShowEditModal(false);
              setEditingPatient(null);
            }}
            facilityId={facilityId}
          />
        )}
      </Modal>
    </div>
  );
};
