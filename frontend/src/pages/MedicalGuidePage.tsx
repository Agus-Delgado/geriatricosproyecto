import React, { useState, useEffect, useMemo } from 'react';
import { residentsApi } from '../api/residents';
import { medicationsApi } from '../api/medications';
import { prescriptionsApi } from '../api/prescriptions';
import { useAuth } from '../contexts/AuthContext';
import { useFacility } from '../contexts/FacilityContext';
import { Input } from '../components/ui/Input';
import { Button } from '../components/ui/Button';
import { LoadingSpinner } from '../components/ui/LoadingSpinner';
import { ErrorMessage } from '../components/ui/ErrorMessage';
import { BottomNav } from '../components/layout/BottomNav';
import type { Resident } from '../types/residents';
import type { MedicationPlan } from '../types/medications';
import type { PrescriptionLog } from '../types/prescriptions';
import type { ApiError } from '../api/client';

export const MedicalGuidePage: React.FC = () => {
  const { activeFacilityId } = useAuth();
  const { facility } = useFacility();
  
  const [searchQuery, setSearchQuery] = useState('');
  const [residents, setResidents] = useState<Resident[]>([]);
  const [loadingResidents, setLoadingResidents] = useState(false);
  const [selectedResident, setSelectedResident] = useState<Resident | null>(null);
  const [currentMedications, setCurrentMedications] = useState<MedicationPlan[]>([]);
  const [prescriptionHistory, setPrescriptionHistory] = useState<PrescriptionLog[]>([]);
  const [loadingMedications, setLoadingMedications] = useState(false);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (activeFacilityId) {
      loadResidents();
    }
  }, [activeFacilityId]);

  useEffect(() => {
    if (selectedResident) {
      loadMedicationData();
    } else {
      setCurrentMedications([]);
      setPrescriptionHistory([]);
    }
  }, [selectedResident]);

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

  const loadMedicationData = async () => {
    if (!selectedResident) return;
    
    try {
      setLoadingMedications(true);
      setLoadingHistory(true);
      setError(null);
      
      const [medicationsData, historyData] = await Promise.all([
        medicationsApi.listPlans(selectedResident.id, false).catch(() => []),
        prescriptionsApi.listLogs(selectedResident.id, 50).catch(() => []),
      ]);
      
      setCurrentMedications(medicationsData);
      setPrescriptionHistory(historyData);
    } catch (err) {
      const apiError = err as ApiError;
      setError(apiError.detail || 'Error al cargar datos de medicación');
    } finally {
      setLoadingMedications(false);
      setLoadingHistory(false);
    }
  };

  const filteredResidents = useMemo(() => {
    if (!searchQuery.trim()) return [];
    const query = searchQuery.toLowerCase();
    return residents.filter(
      (r) =>
        (r.first_name ?? '').toLowerCase().includes(query) ||
        (r.last_name ?? '').toLowerCase().includes(query) ||
        (r.dni ?? '').toLowerCase().includes(query)
    );
  }, [residents, searchQuery]);

  const formatDate = (dateString: string | null | undefined): string => {
    if (!dateString) return '';
    try {
      return new Date(dateString).toLocaleDateString('es-AR');
    } catch {
      return '';
    }
  };

  const formatDateTime = (dateString: string): string => {
    try {
      return new Date(dateString).toLocaleString('es-AR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return '';
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      <div className="px-4 py-4 space-y-4">
        <div className="bg-white rounded-lg shadow-sm p-4">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Guía médica</h1>
          <p className="text-sm text-gray-600">
            Buscar pacientes y ver medicación actual e historial
          </p>
        </div>

        {error && (
          <ErrorMessage message={error} onDismiss={() => setError(null)} />
        )}

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
            {/* Lista de resultados */}
            {searchQuery && filteredResidents.length > 0 && (
              <div className="border border-gray-200 rounded-lg max-h-60 overflow-y-auto bg-white">
                {filteredResidents.map((resident) => (
                  <button
                    key={resident.id}
                    onClick={() => {
                      setSelectedResident(resident);
                      setSearchQuery('');
                    }}
                    className={`w-full text-left px-4 py-3 hover:bg-gray-50 border-b border-gray-100 last:border-b-0 transition-colors ${
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
              <div className="text-center text-gray-500 py-4 bg-white rounded-lg border border-gray-200">
                No se encontraron residentes
              </div>
            )}
          </>
        )}

        {/* Panel de ficha */}
        {selectedResident && (
          <div className="space-y-4">
            {/* Ficha del residente */}
            <div className="border border-gray-200 rounded-lg p-4 bg-white">
              <h2 className="font-semibold text-gray-900 mb-3 text-lg">Ficha del Residente</h2>
              <div className="text-sm text-gray-700 space-y-1">
                <p>
                  <strong>Nombre:</strong> {selectedResident.last_name ?? ''}, {selectedResident.first_name ?? ''}
                </p>
                <p>
                  <strong>DNI:</strong> {selectedResident.dni ?? 'N/A'}
                </p>
                {facility && (
                  <p>
                    <strong>Hogar:</strong> {facility.name ?? ''}
                  </p>
                )}
                <p>
                  <strong>Fecha:</strong> {new Date().toLocaleDateString('es-AR')}
                </p>
              </div>
              <Button
                variant="secondary"
                onClick={() => {
                  setSelectedResident(null);
                  setSearchQuery('');
                }}
                className="mt-4"
              >
                Limpiar Selección
              </Button>
            </div>

            {/* Medicaciones actuales */}
            <div className="border border-gray-200 rounded-lg p-4 bg-white">
              <h3 className="font-semibold text-gray-900 mb-3">Medicaciones actuales</h3>
              
              {loadingMedications ? (
                <div className="flex justify-center py-4">
                  <LoadingSpinner />
                </div>
              ) : currentMedications.length === 0 ? (
                <div className="text-center text-gray-500 py-4">
                  No hay medicaciones registradas
                </div>
              ) : (
                <div className="space-y-3">
                  {currentMedications.map((plan) => (
                    <div key={plan.id} className="border border-gray-100 rounded-lg p-3 bg-gray-50">
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex-1">
                          <h4 className="font-semibold text-gray-900">{plan.med_name ?? ''}</h4>
                          <p className="text-sm text-gray-600 mt-1">
                            <strong>Dosis:</strong> {plan.dose ?? ''}
                          </p>
                          {plan.route && (
                            <p className="text-sm text-gray-600 mt-1">
                              <strong>Vía:</strong> {plan.route}
                            </p>
                          )}
                          {plan.instructions && (
                            <p className="text-sm text-gray-600 mt-2">
                              <strong>Instrucciones:</strong> {plan.instructions}
                            </p>
                          )}
                          {plan.start_date && (
                            <p className="text-xs text-gray-500 mt-2">
                              <strong>Período:</strong> {formatDate(plan.start_date)}
                              {plan.end_date && ` - ${formatDate(plan.end_date)}`}
                              {!plan.end_date && ' (sin fecha de fin)'}
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
            </div>

            {/* Historial */}
            <div className="border border-gray-200 rounded-lg p-4 bg-white">
              <h3 className="font-semibold text-gray-900 mb-3">Historial</h3>
              
              {loadingHistory ? (
                <div className="flex justify-center py-4">
                  <LoadingSpinner />
                </div>
              ) : prescriptionHistory.length === 0 ? (
                <div className="text-center text-gray-500 py-4">
                  Sin registros históricos
                </div>
              ) : (
                <div className="space-y-3">
                  {prescriptionHistory.map((log) => (
                    <div key={log.id} className="border border-gray-100 rounded-lg p-3 bg-gray-50">
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex-1">
                          <p className="text-xs text-gray-500 mb-1">
                            {formatDateTime(log.created_at)}
                          </p>
                          <p className="text-sm text-gray-900 whitespace-pre-wrap">
                            {log.medications_text ?? ''}
                          </p>
                          {log.instructions && (
                            <p className="text-sm text-gray-600 mt-2">
                              <strong>Instrucciones:</strong> {log.instructions}
                            </p>
                          )}
                          {log.author_name && (
                            <p className="text-xs text-gray-500 mt-2">
                              Autor: {log.author_name}
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {!selectedResident && !searchQuery && (
          <div className="text-center text-gray-500 py-12 bg-white rounded-lg border border-gray-200">
            <p className="text-lg font-medium mb-2">Buscar residente</p>
            <p className="text-sm">Ingresá el nombre o DNI para comenzar</p>
          </div>
        )}
      </div>

      <BottomNav />
    </div>
  );
};
