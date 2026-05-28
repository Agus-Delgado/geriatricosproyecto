import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { residentsApi } from '../api/residents';
import { medicationsApi } from '../api/medications';
import { LoadingSpinner } from '../components/ui/LoadingSpinner';
import type { Resident } from '../types/residents';
import type { MedicationPlan } from '../types/medications';
import type { ApiError } from '../api/client';
import '../components/certificates/print.css';

export default function PrescriptionPrintPage() {
  const { patientId } = useParams<{ patientId: string }>();
  const navigate = useNavigate();
  const [patient, setPatient] = useState<Resident | null>(null);
  const [prescriptions, setPrescriptions] = useState<MedicationPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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

      const [patientData, prescriptionsData] = await Promise.all([
        residentsApi.get(patientId),
        medicationsApi.listPlans(patientId, false),
      ]);

      setPatient(patientData);
      setPrescriptions(
        prescriptionsData.sort((a, b) => 
          new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        )
      );
    } catch (err) {
      const apiError = err as ApiError;
      setError(apiError.detail || 'Error al cargar datos');
    } finally {
      setLoading(false);
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
      <div className="flex justify-center items-center min-h-screen">
        <LoadingSpinner />
      </div>
    );
  }

  if (error || !patient) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen p-4">
        <p className="text-gray-600 mb-4">{error || 'Paciente no encontrado'}</p>
        <button
          onClick={() => navigate(-1)}
          className="px-4 py-2 bg-primary-600 text-white rounded hover:bg-primary-700"
        >
          Volver
        </button>
      </div>
    );
  }

  const age = calculateAge(patient.birth_date);

  return (
    <div style={{ minHeight: '100vh', background: '#fff' }}>
      {/* Controles ocultos en impresión */}
      <div className="no-print" style={{ padding: 16, background: '#f5f5f5', borderBottom: '1px solid #ddd' }}>
        <div className="max-w-4xl mx-auto flex gap-3">
          <button
            onClick={() => window.print()}
            className="px-4 py-2 bg-primary-600 text-white rounded hover:bg-primary-700"
          >
            Imprimir
          </button>
          <button
            onClick={() => navigate(-1)}
            className="px-4 py-2 bg-gray-200 text-gray-800 rounded hover:bg-gray-300"
          >
            Volver
          </button>
        </div>
      </div>

      <div className="paper">
        <div className="print-root">
          {/* Título */}
          <div className="print-title">HISTORIAL DE RECETAS</div>

          <div className="print-meta">
            <div>
              <strong>Paciente:</strong> {patient.last_name}, {patient.first_name}
            </div>
            <div>
              <strong>Generado:</strong> {new Date().toLocaleString('es-AR')}
            </div>
          </div>

          {/* Datos del paciente */}
          <div className="print-body">
            <div className="print-card" style={{ marginBottom: 16 }}>
              <div className="print-section-title">Datos del Paciente</div>
              <div className="print-kv-grid">
                <div className="print-kv">
                  <div className="print-kv-label">Nombre</div>
                  <div className="print-kv-value">{patient.last_name}, {patient.first_name}</div>
                </div>
                <div className="print-kv">
                  <div className="print-kv-label">DNI</div>
                  <div className="print-kv-value">{patient.dni || 'N/A'}</div>
                </div>
                <div className="print-kv">
                  <div className="print-kv-label">Edad</div>
                  <div className="print-kv-value">{age !== null ? `${age} años` : 'N/A'}</div>
                </div>
                <div className="print-kv">
                  <div className="print-kv-label">Obra social</div>
                  <div className="print-kv-value">{patient.coverage_type || 'N/A'}</div>
                </div>
              </div>
            </div>

            {/* Recetas */}
            <div style={{ marginTop: 18 }}>
              <div className="print-section-title">Recetas ({prescriptions.length})</div>
              {prescriptions.length === 0 ? (
                <p style={{ fontStyle: 'italic', color: '#666' }}>
                  No hay recetas registradas.
                </p>
              ) : (
                <div className="print-card">
                  {prescriptions.map((prescription) => (
                    <div
                      key={prescription.id}
                      className="print-entry"
                    >
                      <div className="print-entry-header">
                        <div>{prescription.med_name}</div>
                        <div>{formatDate(prescription.created_at)}</div>
                      </div>
                      <div className="print-entry-body">
                        <div className="print-kv-grid">
                          <div className="print-kv">
                            <div className="print-kv-label">Dosis</div>
                            <div className="print-kv-value">{prescription.dose}</div>
                          </div>
                          <div className="print-kv">
                            <div className="print-kv-label">Estado</div>
                            <div className="print-kv-value">{prescription.is_active ? 'Activa' : 'Inactiva'}</div>
                          </div>
                          <div className="print-kv">
                            <div className="print-kv-label">Vía</div>
                            <div className="print-kv-value">{prescription.route || 'N/A'}</div>
                          </div>
                          <div className="print-kv">
                            <div className="print-kv-label">Período</div>
                            <div className="print-kv-value">
                              {prescription.start_date ? (
                                <>
                                  {formatDate(prescription.start_date)}
                                  {prescription.end_date && ` - ${formatDate(prescription.end_date)}`}
                                  {!prescription.end_date && ' (sin fecha de fin)'}
                                </>
                              ) : (
                                'N/A'
                              )}
                            </div>
                          </div>
                        </div>
                        {prescription.instructions ? (
                          <div style={{ marginTop: 8 }}>
                            <strong>Instrucciones:</strong> {prescription.instructions}
                          </div>
                        ) : null}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
