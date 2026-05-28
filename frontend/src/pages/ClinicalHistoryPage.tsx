import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { trackPatientView } from '../utils/patientTracking';
import { residentsApi } from '../api/residents';
import { clinicalApi } from '../api/clinical';
import { EvolutionsList } from '../components/clinical/EvolutionsList';
import { BackHeader } from '../components/ui/BackHeader';
import { Button } from '../components/ui/Button';
import { LoadingSpinner } from '../components/ui/LoadingSpinner';
import { ErrorMessage } from '../components/ui/ErrorMessage';
import { Modal } from '../components/ui/Modal';
import type { Resident } from '../types/residents';
import type { ClinicalNote, ClinicalNoteCreate } from '../types/clinical';
import type { ApiError } from '../api/client';

export default function ClinicalHistoryPage() {
  const { patientId } = useParams<{ patientId: string }>();
  const navigate = useNavigate();
  const { activeFacilityId } = useAuth();
  const [patient, setPatient] = useState<Resident | null>(null);
  const [notes, setNotes] = useState<ClinicalNote[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [content, setContent] = useState('');
  const [recordedAt, setRecordedAt] = useState('');
  const [saving, setSaving] = useState(false);
  const [downloadingPdf, setDownloadingPdf] = useState(false);

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

      const [patientData, notesData] = await Promise.all([
        residentsApi.get(patientId),
        clinicalApi.listNotes(patientId),
      ]);

      setPatient(patientData);
      setNotes(notesData.sort((a, b) => 
        new Date(b.recorded_at).getTime() - new Date(a.recorded_at).getTime()
      ));

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

  const handlePrint = () => {
    if (patientId) {
      navigate(`/clinical-history/${patientId}/print`);
    }
  };

  const handleDownloadPdf = async () => {
    if (!patientId || !patient) return;

    try {
      setDownloadingPdf(true);
      setError(null);

      const blob = await clinicalApi.downloadHistoryPdf(patientId);
      
      // Crear URL y descargar
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      
      const today = new Date().toISOString().split('T')[0];
      link.download = `Historia_Clinica_${patient.last_name}_${patient.first_name}_${today}.pdf`;
      
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      // Limpiar URL
      URL.revokeObjectURL(url);
    } catch (err) {
      const apiError = err as ApiError;
      setError(apiError.detail || 'Error al descargar PDF');
    } finally {
      setDownloadingPdf(false);
    }
  };

  const handleViewMedicalFolder = () => {
    if (patientId) {
      navigate(`/medical-folder/${patientId}`);
    }
  };

  const calculateAge = (birthDate: string | null): number | null => {
    if (!birthDate) return null;
    const now = new Date();
    const birth = new Date(birthDate);
    let age = now.getFullYear() - birth.getFullYear();
    const monthDiff = now.getMonth() - birth.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && now.getDate() < birth.getDate())) {
      age--;
    }
    return age;
  };

  const handleOpenAddModal = () => {
    setContent('');
    // Inicializar fecha/hora con ahora (formato local para input datetime-local)
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    setRecordedAt(`${year}-${month}-${day}T${hours}:${minutes}`);
    setShowAddModal(true);
  };

  const handleSaveEvolution = async () => {
    if (!patientId || !content.trim()) {
      setError('El contenido es obligatorio');
      return;
    }

    try {
      setSaving(true);
      setError(null);

      const payload: ClinicalNoteCreate = {
        note_type: 'EVOLUTION',
        content: content.trim(),
        recorded_at: recordedAt ? new Date(recordedAt).toISOString() : undefined,
      };

      await clinicalApi.createNote(patientId, payload);
      setShowAddModal(false);
      setContent('');
      setRecordedAt('');
      await loadData();
    } catch (err) {
      const apiError = err as ApiError;
      setError(apiError.detail || 'Error al crear evolución');
    } finally {
      setSaving(false);
    }
  };

  const handleCancelAdd = () => {
    setShowAddModal(false);
    setContent('');
    setRecordedAt('');
    setError(null);
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
          onDismiss={() => navigate('/clinical-history/search')}
        />
      </div>
    );
  }

  const age = calculateAge(patient.birth_date);

  return (
    <div className="container mx-auto px-4 py-6 max-w-6xl">
      <BackHeader
        title={`${patient.last_name}, ${patient.first_name}`}
        fallbackPath="/clinical-history/search"
        rightActions={
          <>
            <Button
              variant="secondary"
              onClick={handleViewMedicalFolder}
              style={{ borderColor: 'var(--facility-accent, #667eea)' }}
            >
              Carpeta
            </Button>
            <Button
              variant="secondary"
              onClick={handleDownloadPdf}
              disabled={downloadingPdf}
              style={{ borderColor: 'var(--facility-accent, #667eea)' }}
            >
              {downloadingPdf ? 'Descargando...' : 'Descargar PDF'}
            </Button>
            <Button
              onClick={handlePrint}
              style={{ backgroundColor: 'var(--facility-accent, #667eea)' }}
            >
              Imprimir
            </Button>
          </>
        }
      />

      {/* Header con datos del paciente */}
      <div
        className="rounded-xl shadow-lg p-6 mb-6"
        style={{ backgroundColor: 'var(--facility-card, white)' }}
      >
        <div className="mb-4">
          <h2 className="text-xl font-semibold text-gray-900 mb-2">
            Historia Clínica
          </h2>
          <div className="text-sm text-gray-600 space-y-1">
            <p>DNI: {patient.dni || 'N/A'}</p>
            {age !== null && <p>Edad: {age} años</p>}
            {patient.coverage_type && <p>Obra Social: {patient.coverage_type}</p>}
          </div>
        </div>
      </div>

      {/* Lista de evoluciones */}
      <div
        className="rounded-xl shadow-lg p-6"
        style={{ backgroundColor: 'var(--facility-card, white)' }}
      >
        <div className="flex items-center justify-between mb-4">
          <h2
            className="text-xl font-semibold text-gray-900"
            style={{ color: 'var(--facility-accent, #667eea)' }}
          >
            Últimas Evoluciones
          </h2>
          <Button
            onClick={handleOpenAddModal}
            style={{ backgroundColor: 'var(--facility-accent, #667eea)' }}
          >
            + Agregar evolución
          </Button>
        </div>
        <EvolutionsList notes={notes} loading={false} />
      </div>

      {/* Modal para agregar evolución */}
      <Modal
        isOpen={showAddModal}
        onClose={handleCancelAdd}
        title="Agregar evolución"
        size="md"
      >
        <div className="space-y-4">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded-lg text-sm">
              {error}
            </div>
          )}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Contenido <span className="text-red-500">*</span>
            </label>
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Describa la evolución clínica..."
              rows={8}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
              disabled={saving}
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Fecha y hora (opcional)
            </label>
            <input
              type="datetime-local"
              value={recordedAt}
              onChange={(e) => setRecordedAt(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              disabled={saving}
            />
            <p className="text-xs text-gray-500 mt-1">
              Si no se especifica, se usará la fecha y hora actual
            </p>
          </div>
          <div className="flex justify-end gap-3 pt-4">
            <Button
              variant="secondary"
              onClick={handleCancelAdd}
              disabled={saving}
            >
              Cancelar
            </Button>
            <Button
              onClick={handleSaveEvolution}
              disabled={saving || !content.trim()}
              style={{ backgroundColor: 'var(--facility-accent, #667eea)' }}
            >
              {saving ? 'Guardando...' : 'Guardar'}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
