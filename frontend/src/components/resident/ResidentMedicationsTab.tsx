import React, { useState, useEffect, useMemo } from 'react';
import { medicationsApi } from '../../api/medications';
import { residentsApi } from '../../api/residents';
import { useAuth } from '../../contexts/AuthContext';
import { Button } from '../ui/Button';
import { LoadingSpinner } from '../ui/LoadingSpinner';
import { ErrorMessage } from '../ui/ErrorMessage';
import { Modal } from '../ui/Modal';
import { ConfirmDialog } from '../ui/ConfirmDialog';
import { MedicationPlanForm } from '../forms/MedicationPlanForm';
import { Input } from '../ui/Input';
import type { MedicationPlan } from '../../types/medications';
import type { Resident } from '../../types/residents';
import type { ApiError } from '../../api/client';

interface ResidentMedicationsTabProps {
  residentId: string;
}

export const ResidentMedicationsTab: React.FC<ResidentMedicationsTabProps> = ({
  residentId,
}) => {
  const { activeFacilityId } = useAuth();
  const [activeView, setActiveView] = useState<'plans' | 'guide'>('plans');
  
  // Estados para Plans
  const [plans, setPlans] = useState<MedicationPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showTimesModal, setShowTimesModal] = useState(false);
  const [showDeleteTimeConfirm, setShowDeleteTimeConfirm] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<MedicationPlan | null>(null);
  const [selectedTimeId, setSelectedTimeId] = useState<string | null>(null);
  const [newTime, setNewTime] = useState({ time: '', day_of_week: '' });
  const [timeError, setTimeError] = useState<string | null>(null);
  const [deletingTime, setDeletingTime] = useState(false);
  
  // Estados para Guía
  const [searchQuery, setSearchQuery] = useState('');
  const [residents, setResidents] = useState<Resident[]>([]);
  const [loadingResidents, setLoadingResidents] = useState(false);
  const [selectedResident, setSelectedResident] = useState<Resident | null>(null);
  const [guidePlans, setGuidePlans] = useState<MedicationPlan[]>([]);
  const [loadingGuidePlans, setLoadingGuidePlans] = useState(false);

  useEffect(() => {
    if (activeView === 'plans') {
      loadPlans();
    }
  }, [residentId, activeView]);
  
  useEffect(() => {
    if (activeView === 'guide' && activeFacilityId) {
      loadResidents();
    }
  }, [activeView, activeFacilityId]);
  
  useEffect(() => {
    if (selectedResident) {
      loadGuidePlans();
    } else {
      setGuidePlans([]);
    }
  }, [selectedResident]);

  const loadPlans = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await medicationsApi.listPlans(residentId, false);
      setPlans(data);
    } catch (err) {
      const apiError = err as ApiError;
      setError(apiError.detail || 'Error al cargar planes de medicación');
    } finally {
      setLoading(false);
    }
  };

  const handleCreatePlan = async (data: any) => {
    try {
      await medicationsApi.createPlan(residentId, data);
      setShowCreateModal(false);
      loadPlans();
    } catch (err) {
      const apiError = err as ApiError;
      throw new Error(apiError.detail || 'Error al crear plan');
    }
  };

  const handleAddTime = async () => {
    if (!selectedPlan || !newTime.time) return;

    try {
      await medicationsApi.addScheduleTime(selectedPlan.id, {
        time: newTime.time,
        day_of_week: newTime.day_of_week ? parseInt(newTime.day_of_week) : null,
      });
      setShowTimesModal(false);
      setNewTime({ time: '', day_of_week: '' });
      loadPlans();
    } catch (err) {
      const apiError = err as ApiError;
      throw new Error(apiError.detail || 'Error al agregar horario');
    }
  };


  const handleDeleteTime = async () => {
    if (!selectedTimeId) return;

    try {
      setDeletingTime(true);
      await medicationsApi.deleteScheduleTime(selectedTimeId);
      setShowDeleteTimeConfirm(false);
      setSelectedTimeId(null);
      loadPlans();
    } catch (err) {
      const apiError = err as ApiError;
      setError(apiError.detail || 'Error al eliminar horario');
    } finally {
      setDeletingTime(false);
    }
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return '';
    try {
      return new Date(dateString).toLocaleDateString('es-AR');
    } catch {
      return '';
    }
  };
  
  const loadResidents = async () => {
    if (!activeFacilityId) return;
    
    try {
      setLoadingResidents(true);
      setError(null);
      const data = await residentsApi.list(activeFacilityId, {
        stay_status: 'ACTIVE',
      });
      setResidents(data);
    } catch (err) {
      const apiError = err as ApiError;
      setError(apiError.detail || 'Error al cargar residentes');
    } finally {
      setLoadingResidents(false);
    }
  };
  
  const loadGuidePlans = async () => {
    if (!selectedResident) return;
    
    try {
      setLoadingGuidePlans(true);
      const data = await medicationsApi.listPlans(selectedResident.id, false);
      setGuidePlans(data);
    } catch (err) {
      const apiError = err as ApiError;
      setError(apiError.detail || 'Error al cargar planes de medicación');
    } finally {
      setLoadingGuidePlans(false);
    }
  };
  
  const filteredResidents = useMemo(() => {
    if (!searchQuery.trim()) return residents;
    const query = searchQuery.toLowerCase();
    return residents.filter(
      (r) =>
        r.first_name?.toLowerCase().includes(query) ||
        r.last_name?.toLowerCase().includes(query) ||
        r.dni?.toLowerCase().includes(query)
    );
  }, [residents, searchQuery]);


  return (
    <div className="space-y-4">
      {/* Tabs */}
      <div className="flex gap-2 border-b border-gray-200">
        <button
          onClick={() => setActiveView('plans')}
          className={`px-4 py-2 font-medium text-sm transition-colors ${
            activeView === 'plans'
              ? 'text-primary-600 border-b-2 border-primary-600'
              : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          Planes
        </button>
        <button
          onClick={() => setActiveView('guide')}
          className={`px-4 py-2 font-medium text-sm transition-colors ${
            activeView === 'guide'
              ? 'text-primary-600 border-b-2 border-primary-600'
              : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          Guía
        </button>
      </div>

      {activeView === 'plans' ? (
        <>
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-gray-900">Planes de Medicación</h3>
            <Button onClick={() => setShowCreateModal(true)}>
              Nuevo Plan
            </Button>
          </div>

      {error && (
        <ErrorMessage message={error} onDismiss={() => setError(null)} />
      )}

      {loading ? (
        <div className="flex justify-center py-8">
          <LoadingSpinner />
        </div>
      ) : plans.length === 0 ? (
        <div className="text-center text-gray-500 py-8">
          No hay planes de medicación registrados
        </div>
      ) : (
        <div className="space-y-3">
          {plans.map((plan) => (
            <div key={plan.id} className="card">
              <div className="flex items-start justify-between mb-2">
                <div className="flex-1">
                  <h4 className="font-semibold text-gray-900">{plan.med_name}</h4>
                  <p className="text-sm text-gray-600 mt-1">
                    {plan.dose}
                    {plan.route && ` - Vía: ${plan.route}`}
                  </p>
                  {plan.start_date && (
                    <p className="text-xs text-gray-500 mt-1">
                      Desde: {formatDate(plan.start_date)}
                      {plan.end_date && ` - Hasta: ${formatDate(plan.end_date)}`}
                    </p>
                  )}
                  {!plan.start_date && plan.created_at && (
                    <p className="text-xs text-gray-500 mt-1">
                      Creado: {formatDate(plan.created_at)}
                    </p>
                  )}
                  <span
                    className={`inline-block mt-2 px-2 py-1 text-xs rounded ${
                      plan.is_active
                        ? 'bg-green-100 text-green-800'
                        : 'bg-gray-100 text-gray-800'
                    }`}
                  >
                    {plan.is_active ? 'Activo' : 'Inactivo'}
                  </span>
                </div>
              </div>


              {plan.instructions && (
                <p className="text-sm text-gray-600 mt-2">{plan.instructions}</p>
              )}
            </div>
          ))}
        </div>
      )}

      <Modal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        title="Nuevo Plan de Medicación"
        size="lg"
      >
        <MedicationPlanForm
          onSubmit={handleCreatePlan}
          onCancel={() => setShowCreateModal(false)}
        />
      </Modal>

      <Modal
        isOpen={showTimesModal}
        onClose={() => {
          setShowTimesModal(false);
          setSelectedPlan(null);
          setNewTime({ time: '', day_of_week: '' });
          setTimeError(null);
        }}
        title="Agregar Horario"
      >
        <div className="space-y-4">
          <div>
            <label className="label">Hora *</label>
            <input
              type="time"
              value={newTime.time}
              onChange={(e) => setNewTime({ ...newTime, time: e.target.value })}
              className="input-field"
              required
            />
          </div>
          <div>
            <label className="label">Día de la Semana</label>
            <select
              value={newTime.day_of_week}
              onChange={(e) => setNewTime({ ...newTime, day_of_week: e.target.value })}
              className="input-field"
            >
              <option value="">Diario</option>
              <option value="0">Domingo</option>
              <option value="1">Lunes</option>
              <option value="2">Martes</option>
              <option value="3">Miércoles</option>
              <option value="4">Jueves</option>
              <option value="5">Viernes</option>
              <option value="6">Sábado</option>
            </select>
          </div>
          {timeError && (
            <div className="text-sm text-red-600">{timeError}</div>
          )}
          <div className="flex space-x-3 pt-4">
            <Button
              variant="secondary"
              onClick={() => {
                setShowTimesModal(false);
                setSelectedPlan(null);
                setNewTime({ time: '', day_of_week: '' });
                setTimeError(null);
              }}
              fullWidth
            >
              Cancelar
            </Button>
            <Button onClick={handleAddTime} fullWidth disabled={!newTime.time}>
              Agregar
            </Button>
          </div>
        </div>
      </Modal>

      <ConfirmDialog
        isOpen={showDeleteTimeConfirm}
        onClose={() => {
          setShowDeleteTimeConfirm(false);
          setSelectedTimeId(null);
        }}
        onConfirm={handleDeleteTime}
        title="Eliminar Horario"
        message="¿Estás seguro de que deseas eliminar este horario? Esta acción no se puede deshacer."
        confirmText="Eliminar"
        cancelText="Cancelar"
        variant="danger"
        loading={deletingTime}
      />
        </>
      ) : (
        <>
          {/* Guía de Medicaciones */}
          <div className="space-y-4">
            <h3 className="font-semibold text-gray-900">Guía de Medicaciones</h3>
            
            {/* Búsqueda */}
            <Input
              label="Buscar por Nombre o DNI"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value ?? '')}
              placeholder="Buscar residente..."
            />
            
            {loadingResidents ? (
              <div className="flex justify-center py-8">
                <LoadingSpinner />
              </div>
            ) : (
              <>
                {/* Lista de residentes */}
                {searchQuery && filteredResidents.length > 0 && (
                  <div className="border border-gray-200 rounded-lg max-h-60 overflow-y-auto">
                    {filteredResidents.map((resident) => (
                      <button
                        key={resident.id}
                        onClick={() => {
                          setSelectedResident(resident);
                          setSearchQuery('');
                        }}
                        className={`w-full text-left px-4 py-3 hover:bg-gray-50 border-b border-gray-100 last:border-b-0 ${
                          selectedResident?.id === resident.id ? 'bg-primary-50' : ''
                        }`}
                      >
                        <div className="font-medium text-gray-900">
                          {resident.last_name ?? ''}, {resident.first_name ?? ''}
                        </div>
                        <div className="text-sm text-gray-600">DNI: {resident.dni ?? 'N/A'}</div>
                      </button>
                    ))}
                  </div>
                )}
                
                {searchQuery && filteredResidents.length === 0 && (
                  <div className="text-center text-gray-500 py-4">
                    No se encontraron residentes
                  </div>
                )}
              </>
            )}
            
            {/* Ficha del residente seleccionado */}
            {selectedResident && (
              <div className="border border-gray-200 rounded-lg p-4 bg-gray-50">
                <h4 className="font-semibold text-gray-900 mb-2">Ficha del Residente</h4>
                <div className="text-sm text-gray-700 space-y-1">
                  <p><strong>Nombre:</strong> {selectedResident.last_name ?? ''}, {selectedResident.first_name ?? ''}</p>
                  <p><strong>DNI:</strong> {selectedResident.dni ?? 'N/A'}</p>
                  <p><strong>Fecha:</strong> {new Date().toLocaleDateString('es-AR')}</p>
                </div>
              </div>
            )}
            
            {/* Lista de medicaciones */}
            {selectedResident && (
              <div className="space-y-3">
                <h4 className="font-semibold text-gray-900">Medicaciones</h4>
                
                {loadingGuidePlans ? (
                  <div className="flex justify-center py-4">
                    <LoadingSpinner />
                  </div>
                ) : guidePlans.length === 0 ? (
                  <div className="text-center text-gray-500 py-4">
                    No hay planes de medicación registrados
                  </div>
                ) : (
                  <div className="space-y-3">
                    {guidePlans.map((plan) => (
                      <div key={plan.id} className="border border-gray-200 rounded-lg p-4 bg-white">
                        <div className="flex items-start justify-between mb-2">
                          <div className="flex-1">
                            <h5 className="font-semibold text-gray-900">{plan.med_name ?? ''}</h5>
                            <p className="text-sm text-gray-600 mt-1">
                              <strong>Dosis:</strong> {plan.dose ?? ''}
                            </p>
                            {plan.route && (
                              <p className="text-sm text-gray-600 mt-1">
                                <strong>Vía:</strong> {plan.route}
                              </p>
                            )}
                            {plan.start_date && (
                              <p className="text-xs text-gray-500 mt-1">
                                Desde: {formatDate(plan.start_date)}
                                {plan.end_date && ` - Hasta: ${formatDate(plan.end_date)}`}
                              </p>
                            )}
                            {plan.instructions && (
                              <p className="text-sm text-gray-600 mt-2">
                                <strong>Instrucciones:</strong> {plan.instructions}
                              </p>
                            )}
                          </div>
                          <span
                            className={`inline-block px-2 py-1 text-xs rounded ml-2 ${
                              plan.is_active
                                ? 'bg-green-100 text-green-800'
                                : 'bg-gray-100 text-gray-800'
                            }`}
                          >
                            {plan.is_active ? 'Activo' : 'Inactivo'}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
                
                <Button
                  variant="secondary"
                  onClick={() => {
                    setSelectedResident(null);
                    setSearchQuery('');
                  }}
                >
                  Limpiar Selección
                </Button>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
};
