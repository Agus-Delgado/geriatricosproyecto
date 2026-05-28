import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useFacility } from '../contexts/FacilityContext';
import { useAuth } from '../contexts/AuthContext';
import { residentsApi } from '../api/residents';
import { BottomNav } from '../components/layout/BottomNav';
import { SearchBar } from '../components/ui/SearchBar';
import { LoadingSpinner } from '../components/ui/LoadingSpinner';
import { ErrorMessage } from '../components/ui/ErrorMessage';
import type { Resident } from '../types/residents';
import type { ApiError } from '../api/client';

const DEFAULT_WITHIN_DAYS = 3;

export default function ResidentsTrashPage() {
  const [residents, setResidents] = useState<Resident[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [withinDays, setWithinDays] = useState<number>(DEFAULT_WITHIN_DAYS);
  const [restoringId, setRestoringId] = useState<string | null>(null);

  const { facility } = useFacility();
  const { isOwner, isDoctor, getActiveRole } = useAuth();
  const navigate = useNavigate();

  const canManageTrash = useMemo(() => {
    const role = getActiveRole();
    return Boolean(isOwner || isDoctor || role === 'ADMIN' || role === 'MEDICO');
  }, [getActiveRole, isDoctor, isOwner]);

  useEffect(() => {
    if (facility && canManageTrash) {
      void loadDeletedResidents();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [facility, canManageTrash, searchQuery, withinDays]);

  const loadDeletedResidents = async () => {
    if (!facility) return;

    try {
      setLoading(true);
      setError(null);
      const data = await residentsApi.listDeleted(facility.id, {
        q: searchQuery || undefined,
        within_days: withinDays,
      });
      setResidents(data);
    } catch (err) {
      const apiError = err as ApiError;
      setError(apiError.detail || 'Error al cargar papelera');
    } finally {
      setLoading(false);
    }
  };

  const formatDateTime = (dateString: string) => {
    const d = new Date(dateString);
    return d.toLocaleString('es-AR');
  };

  const getRemainingText = (deletedAt?: string | null) => {
    if (!deletedAt) return '';
    const deleted = new Date(deletedAt).getTime();
    const cutoff = deleted + withinDays * 24 * 60 * 60 * 1000;
    const diffMs = cutoff - Date.now();
    const diffDays = Math.ceil(diffMs / (24 * 60 * 60 * 1000));
    if (diffDays <= 0) return 'Restauración vencida';
    if (diffDays === 1) return 'Resta 1 día';
    return `Restan ${diffDays} días`;
  };

  const handleRestore = async (resident: Resident) => {
    if (!facility) return;

    const ok = confirm(
      `¿Restaurar a ${resident.first_name} ${resident.last_name}?\n\nSe restaurará en el hogar actual.`
    );
    if (!ok) return;

    try {
      setRestoringId(resident.id);
      setError(null);
      await residentsApi.restore(resident.id, withinDays);
      await loadDeletedResidents();
    } catch (err) {
      const apiError = err as ApiError;
      setError(apiError.detail || 'Error al restaurar paciente');
    } finally {
      setRestoringId(null);
    }
  };

  if (!canManageTrash) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="px-4 py-8">
          <ErrorMessage
            message="No tenés permisos para acceder a la papelera"
            onDismiss={() => navigate('/residents')}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      <div className="px-4 py-4 space-y-4">
        <div className="flex items-center justify-between gap-2">
          <div className="min-w-0">
            <h1 className="text-xl font-bold text-gray-900 truncate">Papelera de pacientes</h1>
            <p className="text-sm text-gray-600">
              Podés restaurar pacientes eliminados dentro de {withinDays} días.
            </p>
          </div>
          <button
            onClick={() => navigate('/residents')}
            className="px-3 py-2 text-sm text-gray-700 hover:text-gray-900 hover:bg-gray-100 rounded transition-colors whitespace-nowrap"
          >
            Volver
          </button>
        </div>

        <div className="flex items-center gap-2">
          <div className="flex-1">
            <SearchBar
              value={searchQuery}
              onChange={setSearchQuery}
              placeholder="Buscar por nombre o DNI..."
            />
          </div>
          <select
            value={withinDays}
            onChange={(e) => setWithinDays(Number(e.target.value))}
            className="input-field w-28"
            title="Ventana de restauración"
          >
            <option value={3}>3 días</option>
            <option value={7}>7 días</option>
            <option value={14}>14 días</option>
          </select>
        </div>

        {error && <ErrorMessage message={error} onDismiss={() => setError(null)} />}

        {loading ? (
          <div className="flex justify-center py-8">
            <LoadingSpinner />
          </div>
        ) : residents.length === 0 ? (
          <div className="text-center text-gray-500 py-8">
            No hay pacientes eliminados
          </div>
        ) : (
          <div className="space-y-3">
            {residents.map((resident) => (
              <div key={resident.id} className="card w-full">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <h3 className="font-semibold text-gray-900 truncate">
                      {resident.first_name} {resident.last_name}
                    </h3>
                    {resident.dni && (
                      <p className="text-sm text-gray-500 mt-1">DNI: {resident.dni}</p>
                    )}
                    {resident.deleted_at && (
                      <p className="text-sm text-gray-500 mt-1">
                        Eliminado: {formatDateTime(resident.deleted_at)} · {getRemainingText(resident.deleted_at)}
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <button
                      onClick={() => handleRestore(resident)}
                      disabled={restoringId === resident.id}
                      className="px-3 py-1.5 text-sm bg-primary-600 text-white rounded hover:bg-primary-700 disabled:opacity-60"
                    >
                      {restoringId === resident.id ? 'Restaurando...' : 'Restaurar'}
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <BottomNav />
    </div>
  );
}
