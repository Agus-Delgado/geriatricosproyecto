import { useState, useEffect, useMemo } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { residentsApi } from '../api/residents';
import { certificatesApi } from '../api/certificates';
import { facilitiesApi } from '../api/facilities';
import { useAuth } from '../contexts/AuthContext';
import type { Resident } from '../types/residents';
import type { Certificate, CertificateType, CertificateDraft } from '../types/certificates';
import type { Facility } from '../types/auth';
import { SearchBar } from '../components/ui/SearchBar';
import { Button } from '../components/ui/Button';
import { LoadingSpinner } from '../components/ui/LoadingSpinner';
import { ErrorMessage } from '../components/ui/ErrorMessage';
import { Modal } from '../components/ui/Modal';
import { CertificateEditor } from '../components/certificates/CertificateEditor';
import { buildDefaultBodyText } from '../components/certificates/templates';
import type { ApiError } from '../api/client';

export default function CertificatesPage() {
  const { id } = useParams<{ id: string }>();
  const [searchParams] = useSearchParams();
  const { user, activeFacilityId } = useAuth();
  const facilityId = id ?? activeFacilityId ?? '';

  const [patients, setPatients] = useState<Resident[]>([]);
  const [selectedPatient, setSelectedPatient] = useState<Resident | null>(null);
  const [certificates, setCertificates] = useState<Certificate[]>([]);
  const [facility, setFacility] = useState<Facility | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [showTypeModal, setShowTypeModal] = useState(false);
  const [showEditorModal, setShowEditorModal] = useState(false);
  const [editingDraft, setEditingDraft] = useState<CertificateDraft | null>(null);
  const [editingCertificate, setEditingCertificate] = useState<Certificate | null>(null);

  useEffect(() => {
    if (facilityId) {
      loadData();
    }
  }, [facilityId]);

  // Auto-seleccionar paciente si viene en query param
  useEffect(() => {
    const residentId = searchParams.get('resident_id');
    if (residentId && patients.length > 0 && !selectedPatient) {
      const patient = patients.find(p => p.id === residentId);
      if (patient) {
        setSelectedPatient(patient);
      }
    }
  }, [patients, searchParams, selectedPatient]);

  useEffect(() => {
    if (selectedPatient) {
      loadCertificates();
    } else {
      setCertificates([]);
    }
  }, [selectedPatient, facilityId]);

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Cargar facility
      const facilityData = await facilitiesApi.get(facilityId);
      setFacility(facilityData);
      
      // Cargar pacientes
      const patientsData = await residentsApi.list(facilityId, {
        stay_status: 'ACTIVE',
      });
      setPatients(patientsData);
    } catch (err) {
      const apiError = err as ApiError;
      setError(apiError.detail || 'Error al cargar datos');
    } finally {
      setLoading(false);
    }
  };

  const loadCertificates = async () => {
    if (!selectedPatient) return;
    
    try {
      const data = await certificatesApi.list({
        resident_id: selectedPatient.id,
        facility_id: facilityId,
      });
      setCertificates(data);
    } catch (err) {
      const apiError = err as ApiError;
      console.error('Error al cargar constancias:', apiError);
    }
  };

  const filteredPatients = useMemo(() => {
    if (!searchQuery) return patients;
    const query = searchQuery.toLowerCase();
    return patients.filter(
      (p) =>
        p.first_name.toLowerCase().includes(query) ||
        p.last_name.toLowerCase().includes(query) ||
        p.dni?.toLowerCase().includes(query)
    );
  }, [patients, searchQuery]);

  const handleSelectPatient = (patient: Resident) => {
    setSelectedPatient(patient);
    setSearchQuery('');
  };

  const handleNewCertificate = (type: CertificateType) => {
    if (!selectedPatient || !facility || !user) return;

    const issuedAt = new Date();
    const patientFullName = `${selectedPatient.first_name} ${selectedPatient.last_name}`;
    const patientDni = selectedPatient.dni || '';

    const draft: CertificateDraft = {
      type,
      patientId: selectedPatient.id,
      patientFullName,
      patientDni,
      hogarId: facility.id,
      hogarName: facility.name,
      hogarAddress: facility.address || '',
      issuedAt: issuedAt.toISOString(),
      bodyText: buildDefaultBodyText({
        type,
        patientFullName,
        patientDni,
        issuedAt,
        hogarName: facility.name,
        hogarAddress: facility.address || undefined,
      }),
      doctorDisplayName: user.full_name,
      doctorLicenseNumber: user.license_number,
    };

    setEditingDraft(draft);
    setEditingCertificate(null);
    setShowTypeModal(false);
    setShowEditorModal(true);
  };

  const handleEditCertificate = (cert: Certificate) => {
    if (!facility || !user) return;

    // Buscar el paciente
    const patient = patients.find((p) => p.id === cert.resident_id);
    if (!patient) return;

    const patientFullName = `${patient.first_name} ${patient.last_name}`;
    const patientDni = patient.dni || '';

    const draft: CertificateDraft = {
      type: cert.certificate_type as CertificateType,
      patientId: cert.resident_id,
      patientFullName,
      patientDni,
      hogarId: facility.id,
      hogarName: facility.name,
      hogarAddress: facility.address || '',
      issuedAt: cert.issued_at,
      bodyText: cert.body_text,
      doctorDisplayName: user.full_name,
      doctorLicenseNumber: user.license_number,
    };

    setEditingDraft(draft);
    setEditingCertificate(cert);
    setShowEditorModal(true);
  };

  const handleSave = async (draft: CertificateDraft) => {
    if (!facility || !user) return;

    try {
      if (editingCertificate) {
        // Actualizar existente
        await certificatesApi.update(editingCertificate.id, {
          body_text: draft.bodyText,
          issued_at: draft.issuedAt,
        });
      } else {
        // Crear nuevo
        await certificatesApi.create({
          resident_id: draft.patientId,
          facility_id: draft.hogarId,
          certificate_type: draft.type,
          body_text: draft.bodyText,
          issued_at: draft.issuedAt,
        });
      }
      
      setShowEditorModal(false);
      setEditingDraft(null);
      setEditingCertificate(null);
      await loadCertificates();
    } catch (err) {
      const apiError = err as ApiError;
      throw new Error(apiError.detail || 'Error al guardar constancia');
    }
  };

  const handlePreview = () => {
    // El preview ahora se maneja internamente en CertificateEditor
    // Este callback se mantiene para compatibilidad pero no hace nada
    // ya que CertificateEditor muestra el preview en un modal
  };

  const handlePrint = (draft: CertificateDraft) => {
    // Navegar a la ruta de impresión
    // En una implementación completa, podrías pasar el draft como state o query params
    // Por ahora, usamos sessionStorage como workaround
    sessionStorage.setItem('printDraft', JSON.stringify(draft));
    window.open(`/certificates/print`, '_blank');
  };

  const typeOptions: { value: CertificateType; label: string }[] = [
    { value: 'CONTROL_CLINICO', label: 'Control Clínico' },
    { value: 'OBITO', label: 'Óbito' },
    { value: 'PRESENCIA', label: 'Supervivencia' },
    { value: 'CONSENTIMIENTO', label: 'Consentimiento informado' },
  ];

  const getTypeLabel = (type: CertificateType): string => {
    return typeOptions.find((o) => o.value === type)?.label || type;
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('es-AR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <LoadingSpinner />
      </div>
    );
  }

  return (
    <div className="min-h-screen" style={{ background: 'var(--facility-bg, #f9fafb)' }}>
      <div className="p-4 md:p-8">
        <div className="max-w-6xl mx-auto">
          {/* Header */}
          <div
            className="rounded-2xl shadow-lg mb-6 p-8"
            style={{ backgroundColor: 'var(--facility-card, white)' }}
          >
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Constancias</h1>
            <p className="text-sm text-gray-600">{facility?.name}</p>
          </div>

          {error && (
            <div className="mb-4">
              <ErrorMessage message={error} onDismiss={() => setError(null)} />
            </div>
          )}

          {/* Selector de Paciente */}
          <div
            className="rounded-xl shadow-lg p-6 mb-6"
            style={{ backgroundColor: 'var(--facility-card, white)' }}
          >
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Seleccionar Paciente</h2>
            <SearchBar
              value={searchQuery}
              onChange={setSearchQuery}
              placeholder="Buscar por DNI o nombre..."
            />
            {searchQuery && filteredPatients.length > 0 && (
              <div className="mt-4 border border-gray-200 rounded-lg max-h-60 overflow-y-auto">
                {filteredPatients.map((patient) => (
                  <button
                    key={patient.id}
                    onClick={() => handleSelectPatient(patient)}
                    className="w-full text-left px-4 py-3 hover:bg-gray-50 border-b border-gray-100 last:border-b-0"
                  >
                    <div className="font-medium text-gray-900">
                      {patient.last_name}, {patient.first_name}
                    </div>
                    <div className="text-sm text-gray-600">DNI: {patient.dni || 'N/A'}</div>
                  </button>
                ))}
              </div>
            )}
            {selectedPatient && (
              <div className="mt-4 p-4 bg-primary-50 rounded-lg">
                <div className="font-medium text-gray-900">
                  Paciente seleccionado: {selectedPatient.last_name}, {selectedPatient.first_name}
                </div>
                <div className="text-sm text-gray-600">DNI: {selectedPatient.dni || 'N/A'}</div>
                <p className="text-xs text-gray-500 mt-2">
                  Para cambiar de paciente, busque otro en el campo de búsqueda arriba
                </p>
              </div>
            )}
          </div>

          {/* Listado de Constancias */}
          {selectedPatient && (
            <div
              className="rounded-xl shadow-lg p-6 mb-6"
              style={{ backgroundColor: 'var(--facility-card, white)' }}
            >
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-semibold text-gray-900">Constancias Emitidas</h2>
                <Button
                  onClick={() => setShowTypeModal(true)}
                  style={{ backgroundColor: 'var(--facility-accent, #667eea)' }}
                >
                  Nueva Constancia
                </Button>
              </div>

              {certificates.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  No hay constancias emitidas para este paciente
                </div>
              ) : (
                <div className="space-y-3">
                  {certificates.map((cert) => (
                    <div
                      key={cert.id}
                      className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50 cursor-pointer"
                      onClick={() => handleEditCertificate(cert)}
                    >
                      <div className="flex justify-between items-start">
                        <div>
                          <div className="font-medium text-gray-900">
                            {getTypeLabel(cert.certificate_type as CertificateType)}
                          </div>
                          <div className="text-sm text-gray-600 mt-1">
                            Emitida: {formatDate(cert.issued_at)}
                          </div>
                        </div>
                        <button
                          className="text-sm px-3 py-1 bg-gray-200 text-gray-800 rounded hover:bg-gray-300"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleEditCertificate(cert);
                          }}
                        >
                          Ver/Editar
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Modal para elegir tipo */}
      <Modal
        isOpen={showTypeModal}
        onClose={() => setShowTypeModal(false)}
        title="Seleccionar Tipo de Constancia"
        size="md"
      >
        <div className="space-y-3">
          {typeOptions.map((option) => (
            <Button
              key={option.value}
              fullWidth
              onClick={() => handleNewCertificate(option.value)}
              style={{ backgroundColor: 'var(--facility-accent, #667eea)' }}
            >
              {option.label}
            </Button>
          ))}
        </div>
      </Modal>

      {/* Modal del Editor */}
      {editingDraft && (
        <Modal
          isOpen={showEditorModal}
          onClose={() => {
            setShowEditorModal(false);
            setEditingDraft(null);
            setEditingCertificate(null);
          }}
          title={editingCertificate ? 'Editar Constancia' : 'Nueva Constancia'}
          size="lg"
        >
          <CertificateEditor
            initialDraft={editingDraft}
            onSave={handleSave}
            onPreview={handlePreview}
            onPrint={handlePrint}
            onCancel={() => {
              setShowEditorModal(false);
              setEditingDraft(null);
              setEditingCertificate(null);
            }}
          />
        </Modal>
      )}
    </div>
  );
}
