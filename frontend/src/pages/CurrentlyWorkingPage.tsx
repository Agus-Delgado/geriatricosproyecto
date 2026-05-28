import React, { useState, useEffect } from 'react';
import { useFacility } from '../contexts/FacilityContext';
import { staffDashboardApi } from '../api/shifts';
import { BottomNav } from '../components/layout/BottomNav';
import { LoadingSpinner } from '../components/ui/LoadingSpinner';
import { ErrorMessage } from '../components/ui/ErrorMessage';
import type { FacilityStaffDashboard } from '../types/staff';
import type { ApiError } from '../api/client';

export const CurrentlyWorkingPage: React.FC = () => {
  const [dashboard, setDashboard] = useState<FacilityStaffDashboard | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date());
  const { facility } = useFacility();

  useEffect(() => {
    if (facility) {
      loadDashboard();
      // Auto-refresh cada 30 segundos
      const interval = setInterval(loadDashboard, 30000);
      return () => clearInterval(interval);
    }
  }, [facility]);

  const loadDashboard = async () => {
    if (!facility) return;

    try {
      setError(null);
      const data = await staffDashboardApi.getFacilityDashboard(facility.id);
      setDashboard(data);
      setLastUpdate(new Date());
    } catch (err) {
      const apiError = err as ApiError;
      setError(apiError.detail || 'Error al cargar dashboard');
    } finally {
      setLoading(false);
    }
  };

  const formatTime = (timeStr: string | null) => {
    if (!timeStr) return '-';
    try {
      const [hours, minutes] = timeStr.split(':');
      return `${hours}:${minutes}`;
    } catch {
      return timeStr;
    }
  };

  const getStatusColor = (isCheckedIn: boolean) => {
    return isCheckedIn ? 'bg-green-500' : 'bg-yellow-500';
  };

  const getStatusText = (isCheckedIn: boolean) => {
    return isCheckedIn ? 'Presente' : 'Asignado';
  };

  const getCoverageColor = (status: string) => {
    switch (status) {
      case 'FULL':
        return 'bg-green-100 text-green-800 border-green-300';
      case 'UNDERSTAFFED':
        return 'bg-red-100 text-red-800 border-red-300';
      case 'OVERSTAFFED':
        return 'bg-blue-100 text-blue-800 border-blue-300';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-300';
    }
  };

  const getCoverageText = (status: string) => {
    switch (status) {
      case 'FULL':
        return 'Cobertura Completa';
      case 'UNDERSTAFFED':
        return 'Personal Insuficiente';
      case 'OVERSTAFFED':
        return 'Sobrecarga de Personal';
      default:
        return status;
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center pb-20">
        <LoadingSpinner />
      </div>
    );
  }

  if (!dashboard) {
    return (
      <div className="min-h-screen bg-gray-50 pb-20">
        <div className="px-4 py-4">
          <ErrorMessage
            message={error || 'No se pudo cargar el dashboard'}
            onDismiss={() => setError(null)}
          />
        </div>
        <BottomNav />
      </div>
    );
  }

  const workingNow = dashboard.currently_working || [];

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      <div className="px-4 py-4 space-y-4">
        {/* Header */}
        <div className="bg-white rounded-lg shadow-sm p-4">
          <div className="flex items-center justify-between mb-3">
            <h1 className="text-xl font-bold text-gray-900">Personal Trabajando Ahora</h1>
            <button
              onClick={loadDashboard}
              className="px-3 py-1 text-sm bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
            >
              Actualizar
            </button>
          </div>

          <div className="flex items-center justify-between text-sm text-gray-600">
            <span>
              Última actualización: {lastUpdate.toLocaleTimeString('es-AR')}
            </span>
            <span className={`px-3 py-1 rounded-full border ${getCoverageColor(dashboard.coverage_status)}`}>
              {getCoverageText(dashboard.coverage_status)}
            </span>
          </div>
        </div>

        {/* Estadísticas */}
        <div className="grid grid-cols-3 gap-3">
          <div className="bg-white rounded-lg shadow-sm p-4">
            <div className="text-2xl font-bold text-primary-600">
              {workingNow.length}
            </div>
            <div className="text-sm text-gray-600">Trabajando</div>
          </div>

          <div className="bg-white rounded-lg shadow-sm p-4">
            <div className="text-2xl font-bold text-gray-900">
              {dashboard.active_staff}
            </div>
            <div className="text-sm text-gray-600">Activos</div>
          </div>

          <div className="bg-white rounded-lg shadow-sm p-4">
            <div className="text-2xl font-bold text-gray-900">
              {dashboard.shifts_today}
            </div>
            <div className="text-sm text-gray-600">Turnos Hoy</div>
          </div>
        </div>

        {error && (
          <ErrorMessage message={error} onDismiss={() => setError(null)} />
        )}

        {/* Lista de personal trabajando */}
        <div className="space-y-3">
          <h2 className="text-lg font-semibold text-gray-900">
            Personal en Servicio ({workingNow.length})
          </h2>

          {workingNow.length === 0 ? (
            <div className="bg-white rounded-lg shadow-sm p-8 text-center">
              <div className="text-gray-400 text-5xl mb-3">👥</div>
              <p className="text-gray-600">No hay personal trabajando en este momento</p>
              <p className="text-sm text-gray-500 mt-2">
                El personal asignado aparecerá aquí durante su turno
              </p>
            </div>
          ) : (
            workingNow.map((staff) => (
              <div
                key={staff.id}
                className="bg-white rounded-lg shadow-sm p-4 border-l-4"
                style={{
                  borderLeftColor: staff.is_checked_in ? '#10B981' : '#F59E0B',
                }}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <div className={`w-3 h-3 rounded-full ${getStatusColor(staff.is_checked_in)}`} />
                      <h3 className="font-semibold text-gray-900">
                        {staff.first_name} {staff.last_name}
                      </h3>
                    </div>

                    <div className="space-y-1 text-sm text-gray-600">
                      {staff.position && (
                        <div className="flex items-center gap-2">
                          <span className="text-gray-400">💼</span>
                          <span>{staff.position}</span>
                        </div>
                      )}

                      <div className="flex items-center gap-2">
                        <span className="text-gray-400">🕐</span>
                        <span className="font-medium text-gray-900">
                          {staff.shift_name}
                        </span>
                        <span>
                          ({formatTime(staff.shift_start)} - {formatTime(staff.shift_end)})
                        </span>
                      </div>

                      {staff.check_in_time && (
                        <div className="flex items-center gap-2">
                          <span className="text-gray-400">✓</span>
                          <span>
                            Ingresó a las{' '}
                            {new Date(staff.check_in_time).toLocaleTimeString('es-AR', {
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </span>
                        </div>
                      )}

                      {staff.phone && (
                        <div className="flex items-center gap-2">
                          <span className="text-gray-400">📞</span>
                          <a
                            href={`tel:${staff.phone}`}
                            className="text-primary-600 hover:underline"
                          >
                            {staff.phone}
                          </a>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className={`px-3 py-1 rounded-full text-xs font-medium ${
                    staff.is_checked_in
                      ? 'bg-green-100 text-green-800'
                      : 'bg-yellow-100 text-yellow-800'
                  }`}>
                    {getStatusText(staff.is_checked_in)}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Info adicional */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <span className="text-2xl">ℹ️</span>
            <div className="text-sm text-blue-800">
              <p className="font-medium mb-1">Actualización automática</p>
              <p>Esta página se actualiza automáticamente cada 30 segundos para mostrar el personal en tiempo real.</p>
            </div>
          </div>
        </div>
      </div>

      <BottomNav />
    </div>
  );
};
