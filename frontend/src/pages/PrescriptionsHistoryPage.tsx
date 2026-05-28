import { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { residentsApi } from '../api/residents';
import { medicationsApi } from '../api/medications';
import { prescriptionsApi } from '../api/prescriptions';
import { LoadingSpinner } from '../components/ui/LoadingSpinner';
import { ErrorMessage } from '../components/ui/ErrorMessage';
import { PrescriptionFormModal } from '../components/prescriptions/PrescriptionFormModal';
import { BackHeader } from '../components/ui/BackHeader';
import { Button } from '../components/ui/Button';
import { copyToClipboard } from '../utils/clipboard';
import { openExternal } from '../utils/externalLinks';
import { trackPatientView } from '../utils/patientTracking';
import { useAuth } from '../contexts/AuthContext';
import type { Resident } from '../types/residents';
import type { MedicationPlan } from '../types/medications';
import type { PrescriptionLog, PrescriptionLogCreate } from '../types/prescriptions';
import type { ApiError } from '../api/client';

type FilterPeriod = '30' | '90' | 'all';

type PrescriptionItem = {
  type: 'log' | 'plan';
  id: string;
  date: Date;
  data: PrescriptionLog | MedicationPlan;
};

export default function PrescriptionsHistoryPage() {
  const { patientId } = useParams<{ patientId: string }>();
  const navigate = useNavigate();
  const { activeFacilityId } = useAuth();
  const [patient, setPatient] = useState<Resident | null>(null);
  const [prescriptionLogs, setPrescriptionLogs] = useState<PrescriptionLog[]>([]);
  const [medicationPlans, setMedicationPlans] = useState<MedicationPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filterPeriod, setFilterPeriod] = useState<FilterPeriod>('all');
  const [showModal, setShowModal] = useState(false);
  const [modalLoading, setModalLoading] = useState(false);
  const [repeatPrescription, setRepeatPrescription] = useState<PrescriptionLog | null>(null);

  useEffect(() => {
    if (patientId) {
      loadData();
    }
  }, [patientId]);

  const loadData = async () => {
    if (!patientId) return;

    try {
      setLoading(true);
      setError(null);

      const [patientData, logsData, plansData] = await Promise.all([
        residentsApi.get(patientId),
        prescriptionsApi.listLogs(patientId, 50).catch(() => []), // Si falla, usar array vacío
        medicationsApi.listPlans(patientId, false),
      ]);

      setPatient(patientData);
      setPrescriptionLogs(logsData);
      setMedicationPlans(plansData);

      // Track patient view (localStorage fallback)
      if (activeFacilityId && patientId) {
        trackPatientView(activeFacilityId, patientId);
      }
    } catch (err) {
      const apiError = err as ApiError;
      setError(apiError.detail || 'Error al cargar datos');
    } finally {
      setLoading(false);
    }
  };

  // Combinar y ordenar recetas (logs y planes) por fecha descendente
  const allPrescriptions = useMemo((): PrescriptionItem[] => {
    const items: PrescriptionItem[] = [];

    // Agregar logs
    prescriptionLogs.forEach((log) => {
      items.push({
        type: 'log',
        id: log.id,
        date: new Date(log.created_at),
        data: log,
      });
    });

    // Agregar planes
    medicationPlans.forEach((plan) => {
      items.push({
        type: 'plan',
        id: plan.id,
        date: new Date(plan.created_at),
        data: plan,
      });
    });

    // Ordenar por fecha descendente
    return items.sort((a, b) => b.date.getTime() - a.date.getTime());
  }, [prescriptionLogs, medicationPlans]);

  const filteredPrescriptions = useMemo(() => {
    if (filterPeriod === 'all') return allPrescriptions;

    const days = filterPeriod === '30' ? 30 : 90;
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - days);

    return allPrescriptions.filter((item) => {
      return item.date >= cutoffDate;
    });
  }, [allPrescriptions, filterPeriod]);

  const handleCreatePrescription = async (data: PrescriptionLogCreate) => {
    if (!patientId) return;

    setModalLoading(true);
    try {
      const newLog = await prescriptionsApi.createLog(patientId, data);
      // Optimistic update: agregar al inicio de la lista
      setPrescriptionLogs((prev) => [newLog, ...prev]);
      setShowModal(false);
      setRepeatPrescription(null);
      // Refetch para asegurar consistencia
      await loadData();
    } catch (err) {
      const apiError = err as ApiError;
      setError(apiError.detail || 'Error al crear receta');
      throw err; // Re-throw para que el modal maneje el error
    } finally {
      setModalLoading(false);
    }
  };

  const handleRepeatPrescription = (log: PrescriptionLog) => {
    setRepeatPrescription(log);
    setShowModal(true);
  };

  const handleCopyPrescription = async (log: PrescriptionLog) => {
    const formatDateTime = (dateString: string): string => {
      return new Date(dateString).toLocaleString('es-AR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    };

    let text = `Fecha: ${formatDateTime(log.created_at)}\n`;
    text += `Medicamentos:\n${log.medications_text}\n`;
    if (log.instructions) {
      text += `\n${log.instructions}\n`;
    }
    if (log.author_name) {
      text += `\nAutor: ${log.author_name}`;
    }

    try {
      await copyToClipboard(text);
      // Mostrar feedback visual (podría mejorarse con un toast)
      alert('Receta copiada al portapapeles');
    } catch (err) {
      console.error('Error al copiar:', err);
      alert('Error al copiar al portapapeles');
    }
  };

  const formatDate = (dateString: string): string => {
    return new Date(dateString).toLocaleDateString('es-AR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
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

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-6 max-w-6xl">
        <div className="flex justify-center py-12">
          <LoadingSpinner />
        </div>
      </div>
    );
  }

  if (error || !patient) {
    return (
      <div className="container mx-auto px-4 py-6 max-w-6xl">
        <ErrorMessage
          message={error || 'Paciente no encontrado'}
          onDismiss={() => navigate('/prescriptions-history/search')}
        />
      </div>
    );
  }

  const age = calculateAge(patient.birth_date);

  return (
    <div className="container mx-auto px-4 py-6 max-w-6xl">
      <BackHeader
        title={`${patient.last_name}, ${patient.first_name}`}
        fallbackPath="/prescriptions-history/search"
      />

      {/* Header con datos del paciente */}
      <div
        className="rounded-xl shadow-lg p-6 mb-6"
        style={{ backgroundColor: 'var(--facility-card, white)' }}
      >
        <div className="mb-4">
          <h2 className="text-xl font-semibold text-gray-900 mb-2">
            Historial de Recetas
          </h2>
          <div className="text-sm text-gray-600 space-y-1">
            <p>DNI: {patient.dni || 'N/A'}</p>
            {age !== null && <p>Edad: {age} años</p>}
            {patient.coverage_type && <p>Obra Social: {patient.coverage_type}</p>}
          </div>
          {/* Acciones rápidas */}
          <div className="mt-4 flex flex-wrap gap-2">
            <button
              onClick={async () => {
                if (patient.dni) {
                  try {
                    await copyToClipboard(patient.dni);
                    alert('DNI copiado al portapapeles');
                  } catch (err) {
                    console.error('Error al copiar:', err);
                  }
                }
              }}
              disabled={!patient.dni}
              className="text-xs px-3 py-1.5 rounded bg-gray-100 text-gray-700 hover:bg-gray-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              style={{ minHeight: '44px' }}
            >
              📋 Copiar DNI
            </button>
            <button
              onClick={async () => {
                const fullName = `${patient.last_name}, ${patient.first_name}`;
                try {
                  await copyToClipboard(fullName);
                  alert('Nombre copiado al portapapeles');
                } catch (err) {
                  console.error('Error al copiar:', err);
                }
              }}
              className="text-xs px-3 py-1.5 rounded bg-gray-100 text-gray-700 hover:bg-gray-200 transition-colors"
              style={{ minHeight: '44px' }}
            >
              📋 Copiar Nombre
            </button>
            {(patient.coverage_type || patient.coverage_number) && (
              <button
                onClick={async () => {
                  const coverageInfo = patient.coverage_number
                    ? `${patient.coverage_type || 'Obra Social'}: ${patient.coverage_number}`
                    : patient.coverage_type || '';
                  try {
                    await copyToClipboard(coverageInfo);
                    alert('Obra social copiada al portapapeles');
                  } catch (err) {
                    console.error('Error al copiar:', err);
                  }
                }}
                className="text-xs px-3 py-1.5 rounded bg-gray-100 text-gray-700 hover:bg-gray-200 transition-colors"
                style={{ minHeight: '44px' }}
              >
                📋 Copiar Obra Social
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Accesos para recetar */}
      <div
        className="rounded-xl shadow-lg p-6 mb-6"
        style={{ backgroundColor: 'var(--facility-card, white)' }}
      >
        <h3
          className="text-lg font-semibold text-gray-900 mb-4"
          style={{ color: 'var(--facility-accent, #667eea)' }}
        >
          Accesos para recetar
        </h3>
        <button
          type="button"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            openExternal('https://cup.pami.org.ar/');
          }}
          className="w-full px-4 py-3 rounded-lg bg-blue-50 hover:bg-blue-100 border border-blue-200 text-blue-700 font-medium transition-colors text-left flex items-center justify-between"
          style={{ minHeight: '44px' }}
        >
          <span>Abrir PAMI (CUP)</span>
          <span>→</span>
        </button>
      </div>

      {/* Filtros */}
      <div
        className="rounded-xl shadow-lg p-4 mb-6"
        style={{ backgroundColor: 'var(--facility-card, white)' }}
      >
        <div className="flex items-center gap-4">
          <span className="text-sm font-medium text-gray-700">Filtrar por:</span>
          <div className="flex gap-2">
            <button
              onClick={() => setFilterPeriod('30')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                filterPeriod === '30'
                  ? 'text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
              style={
                filterPeriod === '30'
                  ? { backgroundColor: 'var(--facility-accent, #667eea)' }
                  : {}
              }
            >
              Últimos 30 días
            </button>
            <button
              onClick={() => setFilterPeriod('90')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                filterPeriod === '90'
                  ? 'text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
              style={
                filterPeriod === '90'
                  ? { backgroundColor: 'var(--facility-accent, #667eea)' }
                  : {}
              }
            >
              Últimos 90 días
            </button>
            <button
              onClick={() => setFilterPeriod('all')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                filterPeriod === 'all'
                  ? 'text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
              style={
                filterPeriod === 'all'
                  ? { backgroundColor: 'var(--facility-accent, #667eea)' }
                  : {}
              }
            >
              Todo
            </button>
          </div>
        </div>
      </div>

      {/* Botón Registrar Receta */}
      <div className="mb-6 flex justify-end">
        <Button
          onClick={() => {
            setRepeatPrescription(null);
            setShowModal(true);
          }}
          style={{ backgroundColor: 'var(--facility-accent, #667eea)' }}
        >
          Registrar Receta
        </Button>
      </div>

      {/* Listado de recetas */}
      <div
        className="rounded-xl shadow-lg p-6"
        style={{ backgroundColor: 'var(--facility-card, white)' }}
      >
        <h2
          className="text-xl font-semibold text-gray-900 mb-4"
          style={{ color: 'var(--facility-accent, #667eea)' }}
        >
          Recetas ({filteredPrescriptions.length})
        </h2>

        {filteredPrescriptions.length === 0 ? (
          <div className="text-center py-12 text-gray-500">
            <p className="text-lg font-medium mb-2">No hay recetas registradas</p>
            <p className="text-sm">
              {filterPeriod !== 'all'
                ? `No se encontraron recetas en los últimos ${filterPeriod} días.`
                : 'Las recetas aparecerán aquí cuando se registren.'}
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredPrescriptions.map((item) => {
              if (item.type === 'log') {
                const log = item.data as PrescriptionLog;
                return (
                  <div
                    key={`log-${log.id}`}
                    className="bg-white border border-gray-200 rounded-lg p-5 hover:shadow-md transition-shadow"
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <h3 className="text-lg font-semibold text-gray-900">
                            Registro de Receta
                          </h3>
                          {log.source !== 'OTHER' && (
                            <span className="text-xs px-2 py-1 rounded font-medium bg-blue-100 text-blue-800">
                              {log.source}
                            </span>
                          )}
                          {log.repeat_of && (
                            <span className="text-xs px-2 py-1 rounded font-medium bg-purple-100 text-purple-800">
                              Repetición
                            </span>
                          )}
                        </div>
                        <div className="text-sm text-gray-700 whitespace-pre-wrap mb-2">
                          {log.medications_text}
                        </div>
                        {log.instructions && (
                          <div className="text-sm text-gray-600 mt-2">
                            <span className="font-medium">Instrucciones:</span>{' '}
                            <span className="whitespace-pre-wrap">{log.instructions}</span>
                          </div>
                        )}
                        {log.author_name && (
                          <div className="text-xs text-gray-500 mt-2">
                            Autor: {log.author_name}
                          </div>
                        )}
                      </div>
                      <div className="text-right text-sm text-gray-500 ml-4">
                        <p className="font-medium">{formatDate(log.created_at)}</p>
                        <p className="text-xs">
                          {new Date(log.created_at).toLocaleTimeString('es-AR', {
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </p>
                      </div>
                    </div>
                    <div className="mt-3 pt-3 border-t border-gray-100 flex gap-2">
                      <button
                        onClick={() => handleRepeatPrescription(log)}
                        className="text-sm px-3 py-1.5 rounded bg-purple-100 text-purple-700 hover:bg-purple-200 transition-colors"
                        style={{ minHeight: '44px' }}
                      >
                        Repetir
                      </button>
                      <button
                        onClick={() => handleCopyPrescription(log)}
                        className="text-sm px-3 py-1.5 rounded bg-gray-100 text-gray-700 hover:bg-gray-200 transition-colors"
                        style={{ minHeight: '44px' }}
                      >
                        Copiar
                      </button>
                    </div>
                  </div>
                );
              } else {
                const plan = item.data as MedicationPlan;
                return (
                  <div
                    key={`plan-${plan.id}`}
                    className="bg-white border border-gray-200 rounded-lg p-5 hover:shadow-md transition-shadow"
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <h3 className="text-lg font-semibold text-gray-900">
                            {plan.med_name}
                          </h3>
                          <span
                            className={`text-xs px-2 py-1 rounded font-medium ${
                              plan.is_active
                                ? 'bg-green-100 text-green-800'
                                : 'bg-gray-100 text-gray-800'
                            }`}
                          >
                            {plan.is_active ? 'Activa' : 'Inactiva'}
                          </span>
                        </div>
                        <div className="text-sm text-gray-600 space-y-1">
                          <p>
                            <span className="font-medium">Dosis:</span> {plan.dose}
                          </p>
                          {plan.route && (
                            <p>
                              <span className="font-medium">Vía:</span> {plan.route}
                            </p>
                          )}
                          {plan.instructions && (
                            <p>
                              <span className="font-medium">Instrucciones:</span>{' '}
                              {plan.instructions}
                            </p>
                          )}
                        </div>
                      </div>
                      <div className="text-right text-sm text-gray-500 ml-4">
                        <p className="font-medium">{formatDate(plan.created_at)}</p>
                        <p className="text-xs">
                          {new Date(plan.created_at).toLocaleTimeString('es-AR', {
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </p>
                      </div>
                    </div>
                    {plan.start_date && (
                      <div className="mt-2 pt-2 border-t border-gray-100 text-xs text-gray-500">
                        <span className="font-medium">Período:</span> {formatDate(plan.start_date)}
                        {plan.end_date && ` - ${formatDate(plan.end_date)}`}
                        {!plan.end_date && ' (sin fecha de fin)'}
                      </div>
                    )}
                  </div>
                );
              }
            })}
          </div>
        )}
      </div>

      {/* Modal de registro/repetir receta */}
      <PrescriptionFormModal
        isOpen={showModal}
        onClose={() => {
          setShowModal(false);
          setRepeatPrescription(null);
        }}
        onSubmit={handleCreatePrescription}
        initialData={repeatPrescription}
        loading={modalLoading}
      />
    </div>
  );
}
