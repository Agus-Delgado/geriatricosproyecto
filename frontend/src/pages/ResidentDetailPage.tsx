import React, { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { residentsApi } from '../api/residents';
import { Tabs } from '../components/ui/Tabs';
import { LoadingSpinner } from '../components/ui/LoadingSpinner';
import { ErrorMessage } from '../components/ui/ErrorMessage';
import { ResidentSummaryTab } from '../components/resident/ResidentSummaryTab';
import { ResidentNotesTab } from '../components/resident/ResidentNotesTab';
import { ResidentMedicationsTab } from '../components/resident/ResidentMedicationsTab';
import { ResidentContactsTab } from '../components/resident/ResidentContactsTab';
import { ResidentDocumentsTab } from '../components/resident/ResidentDocumentsTab';
import { ResidentCertificatesTab } from '../components/resident/ResidentCertificatesTab';
import type { Resident } from '../types/residents';
import type { ApiError } from '../api/client';

const ALL_TABS = [
  { id: 'summary', label: 'Resumen', roles: ['OWNER', 'DOCTOR'] },
  { id: 'notes', label: 'Notas', roles: ['DOCTOR'] },
  { id: 'medications', label: 'Medicaciones', roles: ['DOCTOR'] },
  { id: 'contacts', label: 'Contactos', roles: ['DOCTOR'] },
  { id: 'documents', label: 'Documentos', roles: ['DOCTOR'] },
  { id: 'certificates', label: 'Constancias', roles: ['DOCTOR'] },
];

export const ResidentDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { isOwner, isDoctor, getActiveRole } = useAuth();
  const [resident, setResident] = useState<Resident | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('summary');
  const [deleting, setDeleting] = useState(false);

  const activeRole = getActiveRole();
  const isMedicalRole = isDoctor || activeRole === 'MEDICO';
  const canDelete = isOwner || isMedicalRole || activeRole === 'ADMIN';

  // Filtrar tabs según rol
  const availableTabs = useMemo(() => {
    return ALL_TABS.filter((tab) => {
      if (tab.roles.includes('OWNER') && isOwner) return true;
      if (tab.roles.includes('DOCTOR') && isMedicalRole) return true;
      return false;
    });
  }, [isOwner, isMedicalRole]);

  // Ajustar activeTab si el tab actual no está disponible
  useEffect(() => {
    if (availableTabs.length > 0 && !availableTabs.find((t) => t.id === activeTab)) {
      setActiveTab(availableTabs[0].id);
    }
  }, [availableTabs, activeTab]);

  useEffect(() => {
    if (id) {
      loadResident();
    }
  }, [id]);

  const loadResident = async () => {
    if (!id) return;

    try {
      setLoading(true);
      setError(null);
      const data = await residentsApi.get(id);
      setResident(data);
    } catch (err) {
      const apiError = err as ApiError;
      setError(apiError.detail || 'Error al cargar residente');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteResident = async () => {
    if (!resident) return;
    const ok = confirm(
      `¿Eliminar a ${resident.first_name} ${resident.last_name}?\n\nSe moverá a la Papelera por 3 días y luego no podrá restaurarse.`
    );
    if (!ok) return;

    try {
      setDeleting(true);
      setError(null);
      await residentsApi.delete(resident.id);
      navigate('/residents');
    } catch (err) {
      const apiError = err as ApiError;
      setError(apiError.detail || 'Error al eliminar residente');
    } finally {
      setDeleting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="flex justify-center py-8">
          <LoadingSpinner />
        </div>
      </div>
    );
  }

  if (error || !resident) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="px-4 py-8">
          <ErrorMessage
            message={error || 'Residente no encontrado'}
            onDismiss={() => navigate('/residents')}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      <div className="px-4 py-4">
        <div className="flex justify-end mb-2 gap-2">
          {canDelete && (
            <button
              onClick={handleDeleteResident}
              disabled={deleting}
              className="px-3 py-2 text-sm bg-red-600 text-white rounded hover:bg-red-700 disabled:opacity-60"
            >
              {deleting ? 'Eliminando...' : 'Eliminar'}
            </button>
          )}
          <button
            onClick={() => navigate(`/residents/${resident.id}/print`)}
            className="px-3 py-2 text-sm bg-primary-600 text-white rounded hover:bg-primary-700"
          >
            Imprimir ficha
          </button>
        </div>
        <Tabs 
          tabs={availableTabs.map((t) => ({ id: t.id, label: t.label }))} 
          activeTab={activeTab} 
          onChange={setActiveTab} 
        />

        <div className="mt-4">
          {activeTab === 'summary' && (
            <ResidentSummaryTab resident={resident} onUpdate={loadResident} />
          )}
          {activeTab === 'notes' && <ResidentNotesTab residentId={resident.id} />}
          {activeTab === 'medications' && (
            <ResidentMedicationsTab residentId={resident.id} />
          )}
          {activeTab === 'contacts' && <ResidentContactsTab residentId={resident.id} />}
          {activeTab === 'documents' && <ResidentDocumentsTab residentId={resident.id} />}
          {activeTab === 'certificates' && (
            <ResidentCertificatesTab residentId={resident.id} />
          )}
        </div>
      </div>
    </div>
  );
};
