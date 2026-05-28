import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { residentsApi } from '../api/residents';
import { clinicalApi } from '../api/clinical';
import { medicationsApi } from '../api/medications';
import { certificatesApi } from '../api/certificates';
import { FolderSummaryHeader } from '../components/folder/FolderSummaryHeader';
import { FolderSection } from '../components/folder/FolderSection';
import { BackHeader } from '../components/ui/BackHeader';
import { Button } from '../components/ui/Button';
import { LoadingSpinner } from '../components/ui/LoadingSpinner';
import { ErrorMessage } from '../components/ui/ErrorMessage';
import type { Resident } from '../types/residents';
import type { ClinicalNote } from '../types/clinical';
import type { Certificate } from '../types/certificates';
import type { MedicationPlan } from '../types/medications';
import type { ApiError } from '../api/client';

export default function MedicalFolderPage() {
  const { patientId } = useParams<{ patientId: string }>();
  const navigate = useNavigate();
  const [patient, setPatient] = useState<Resident | null>(null);
  const [evolutions, setEvolutions] = useState<ClinicalNote[]>([]);
  const [prescriptions, setPrescriptions] = useState<MedicationPlan[]>([]);
  const [certificates, setCertificates] = useState<Certificate[]>([]);
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

      const [patientData, evolutionsData, prescriptionsData, certificatesData] = await Promise.all([
        residentsApi.get(patientId),
        clinicalApi.listNotes(patientId),
        medicationsApi.listPlans(patientId, false),
        certificatesApi.list({ resident_id: patientId }),
      ]);

      setPatient(patientData);
      setEvolutions(
        evolutionsData.sort((a, b) => 
          new Date(b.recorded_at).getTime() - new Date(a.recorded_at).getTime()
        )
      );
      setPrescriptions(
        prescriptionsData.sort((a, b) => 
          new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        )
      );
      setCertificates(
        certificatesData.sort((a, b) => 
          new Date(b.issued_at).getTime() - new Date(a.issued_at).getTime()
        )
      );
    } catch (err) {
      const apiError = err as ApiError;
      setError(apiError.detail || 'Error al cargar datos');
    } finally {
      setLoading(false);
    }
  };

  const handlePrint = () => {
    if (patientId) {
      navigate(`/medical-folder/${patientId}/print`);
    }
  };

  const formatDate = (dateString: string): string => {
    return new Date(dateString).toLocaleDateString('es-AR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  };

  const formatDateTime = (dateString: string): string => {
    return new Date(dateString).toLocaleString('es-AR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getCertificateTypeLabel = (type: string): string => {
    const labels: Record<string, string> = {
      CONTROL_CLINICO: 'Control Clínico',
      OBITO: 'Óbito',
      PRESENCIA: 'Presencia',
      CONSENTIMIENTO: 'Consentimiento informado',
    };
    return labels[type] || type;
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
          onDismiss={() => navigate('/medical-folder/search')}
        />
      </div>
    );
  }

  const lastEvolutions = evolutions.slice(0, 5);
  const lastPrescriptions = prescriptions.slice(0, 5);
  const lastCertificates = certificates.slice(0, 5);

  return (
    <div className="container mx-auto px-4 py-6 max-w-6xl">
      <BackHeader
        title={`${patient.last_name}, ${patient.first_name}`}
        fallbackPath="/medical-folder/search"
      />

      <FolderSummaryHeader patient={patient} />

      <div className="flex justify-end mb-4">
        <Button
          onClick={handlePrint}
          style={{ backgroundColor: 'var(--facility-accent, #667eea)' }}
        >
          Imprimir Carpeta Médica
        </Button>
      </div>

      {/* Sección Evoluciones */}
      <FolderSection
        title="Evoluciones"
        count={evolutions.length}
        items={lastEvolutions}
        onViewAll={() => navigate(`/clinical-history/${patientId}`)}
        emptyMessage="No hay evoluciones registradas"
        renderItem={(note: ClinicalNote) => (
          <div className="bg-white border border-gray-200 rounded-lg p-4">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm font-semibold text-gray-900">
                {formatDateTime(note.recorded_at)}
              </p>
            </div>
            <p className="text-sm text-gray-700 line-clamp-2">{note.content}</p>
          </div>
        )}
      />

      {/* Sección Recetas */}
      <FolderSection
        title="Recetas"
        count={prescriptions.length}
        items={lastPrescriptions}
        emptyMessage="No hay recetas registradas"
        renderItem={(prescription: MedicationPlan) => (
          <div className="bg-white border border-gray-200 rounded-lg p-4">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm font-semibold text-gray-900">
                {prescription.med_name}
              </p>
              <span
                className={`text-xs px-2 py-1 rounded ${
                  prescription.is_active
                    ? 'bg-green-100 text-green-800'
                    : 'bg-gray-100 text-gray-800'
                }`}
              >
                {prescription.is_active ? 'Activa' : 'Inactiva'}
              </span>
            </div>
            <div className="text-sm text-gray-600 space-y-1">
              <p>
                <span className="font-medium">Dosis:</span> {prescription.dose}
              </p>
              {prescription.route && (
                <p>
                  <span className="font-medium">Vía:</span> {prescription.route}
                </p>
              )}
              <p>
                <span className="font-medium">Fecha:</span> {formatDate(prescription.created_at)}
              </p>
            </div>
          </div>
        )}
      />

      {/* Sección Constancias */}
      <FolderSection
        title="Constancias"
        count={certificates.length}
        items={lastCertificates}
        emptyMessage="No hay constancias registradas"
        renderItem={(certificate: Certificate) => (
          <div className="bg-white border border-gray-200 rounded-lg p-4">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm font-semibold text-gray-900">
                {getCertificateTypeLabel(certificate.certificate_type)}
              </p>
              <p className="text-xs text-gray-500">
                {formatDate(certificate.issued_at)}
              </p>
            </div>
            <p className="text-sm text-gray-700 line-clamp-2">{certificate.body_text}</p>
          </div>
        )}
      />
    </div>
  );
}
