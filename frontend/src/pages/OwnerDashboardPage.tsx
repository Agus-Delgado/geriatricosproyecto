import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useFacility } from '../contexts/FacilityContext';
import { useAuth } from '../contexts/AuthContext';
import { residentsApi } from '../api/residents';
import { staffApi } from '../api/staff';
import { staffDashboardApi } from '../api/shifts';
import { BottomNav } from '../components/layout/BottomNav';
import { LoadingSpinner } from '../components/ui/LoadingSpinner';
import { ErrorMessage } from '../components/ui/ErrorMessage';
import type { FacilityStaffDashboard } from '../types/staff';
import type { ApiError } from '../api/client';

export const OwnerDashboardPage: React.FC = () => {
  const [staffDashboard, setStaffDashboard] = useState<FacilityStaffDashboard | null>(null);
  const [residentsCount, setResidentsCount] = useState({ total: 0, active: 0 });
  const [staffCount, setStaffCount] = useState({ total: 0, active: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { facility } = useFacility();
  const { user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (facility) {
      loadDashboard();
    }
  }, [facility]);

  const loadDashboard = async () => {
    if (!facility) return;

    try {
      setLoading(true);
      setError(null);

      const [staffDash, residents, staff] = await Promise.all([
        staffDashboardApi.getFacilityDashboard(facility.id),
        residentsApi.list(facility.id, {}),
        staffApi.list(facility.id, { active_only: false }),
      ]);

      setStaffDashboard(staffDash);
      setResidentsCount({
        total: residents.length,
        active: residents.filter((r) => r.status === 'ACTIVE').length,
      });
      setStaffCount({
        total: staff.length,
        active: staff.filter((s) => s.is_active).length,
      });
    } catch (err) {
      const apiError = err as ApiError;
      setError(apiError.detail || 'Error al cargar dashboard');
    } finally {
      setLoading(false);
    }
  };

  const getCoverageIcon = (status: string) => {
    switch (status) {
      case 'FULL':
        return '✅';
      case 'UNDERSTAFFED':
        return '⚠️';
      case 'OVERSTAFFED':
        return '📊';
      default:
        return '📋';
    }
  };

  const getCoverageText = (status: string) => {
    switch (status) {
      case 'FULL':
        return 'Cobertura Completa';
      case 'UNDERSTAFFED':
        return 'Personal Insuficiente';
      case 'OVERSTAFFED':
        return 'Sobrecarga';
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

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      <div className="px-4 py-4 space-y-4">
        {/* Header */}
        <div className="bg-white rounded-lg shadow-sm p-4">
          <h1 className="text-2xl font-bold text-gray-900 mb-1">Dashboard del Owner</h1>
          <p className="text-sm text-gray-600">
            Bienvenido, {user?.full_name} • {facility?.name}
          </p>
        </div>

        {error && <ErrorMessage message={error} onDismiss={() => setError(null)} />}

        {/* KPIs Grid */}
        <div className="grid grid-cols-2 gap-3">
          {/* Residentes */}
          <div className="bg-white rounded-lg shadow-sm p-4">
            <div className="text-sm text-gray-600 mb-1">Pacientes</div>
            <div className="text-3xl font-bold text-primary-600">{residentsCount.active}</div>
            <div className="text-xs text-gray-500 mt-1">de {residentsCount.total} total</div>
          </div>

          {/* Personal */}
          <div className="bg-white rounded-lg shadow-sm p-4">
            <div className="text-sm text-gray-600 mb-1">Personal</div>
            <div className="text-3xl font-bold text-green-600">{staffCount.active}</div>
            <div className="text-xs text-gray-500 mt-1">de {staffCount.total} total</div>
          </div>

          {/* Trabajando Ahora */}
          <div className="bg-white rounded-lg shadow-sm p-4">
            <div className="text-sm text-gray-600 mb-1">Trabajando Ahora</div>
            <div className="text-3xl font-bold text-blue-600">
              {staffDashboard?.currently_working.length || 0}
            </div>
            <div className="text-xs text-gray-500 mt-1">en servicio</div>
          </div>

          {/* Turnos Hoy */}
          <div className="bg-white rounded-lg shadow-sm p-4">
            <div className="text-sm text-gray-600 mb-1">Turnos Hoy</div>
            <div className="text-3xl font-bold text-purple-600">
              {staffDashboard?.shifts_today || 0}
            </div>
            <div className="text-xs text-gray-500 mt-1">asignados</div>
          </div>
        </div>

        {/* Cobertura Status */}
        {staffDashboard && (
          <div className="bg-white rounded-lg shadow-sm p-4">
            <div className="flex items-center gap-3">
              <span className="text-4xl">{getCoverageIcon(staffDashboard.coverage_status)}</span>
              <div className="flex-1">
                <div className="text-sm text-gray-600">Estado de Cobertura</div>
                <div className="text-lg font-semibold text-gray-900">
                  {getCoverageText(staffDashboard.coverage_status)}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Quick Actions */}
        <div className="space-y-3">
          <h2 className="text-lg font-semibold text-gray-900">Acciones Rápidas</h2>

          <button
            onClick={() => navigate('/currently-working')}
            className="w-full bg-white rounded-lg shadow-sm p-4 flex items-center justify-between hover:shadow-md transition-shadow"
          >
            <div className="flex items-center gap-3">
              <span className="text-2xl">👥</span>
              <div className="text-left">
                <div className="font-medium text-gray-900">Personal Trabajando</div>
                <div className="text-sm text-gray-500">Ver quién está en servicio ahora</div>
              </div>
            </div>
            <span className="text-gray-400">→</span>
          </button>

          <button
            onClick={() => navigate('/staff')}
            className="w-full bg-white rounded-lg shadow-sm p-4 flex items-center justify-between hover:shadow-md transition-shadow"
          >
            <div className="flex items-center gap-3">
              <span className="text-2xl">💼</span>
              <div className="text-left">
                <div className="font-medium text-gray-900">Gestión de Personal</div>
                <div className="text-sm text-gray-500">Administrar empleados</div>
              </div>
            </div>
            <span className="text-gray-400">→</span>
          </button>

          <button
            onClick={() => navigate('/shifts-management')}
            className="w-full bg-white rounded-lg shadow-sm p-4 flex items-center justify-between hover:shadow-md transition-shadow"
          >
            <div className="flex items-center gap-3">
              <span className="text-2xl">🕐</span>
              <div className="text-left">
                <div className="font-medium text-gray-900">Gestión de Turnos</div>
                <div className="text-sm text-gray-500">Configurar horarios</div>
              </div>
            </div>
            <span className="text-gray-400">→</span>
          </button>

          <button
            onClick={() => navigate('/shift-assignments')}
            className="w-full bg-white rounded-lg shadow-sm p-4 flex items-center justify-between hover:shadow-md transition-shadow"
          >
            <div className="flex items-center gap-3">
              <span className="text-2xl">📅</span>
              <div className="text-left">
                <div className="font-medium text-gray-900">Asignación de Turnos</div>
                <div className="text-sm text-gray-500">Organizar calendario semanal</div>
              </div>
            </div>
            <span className="text-gray-400">→</span>
          </button>

          <button
            onClick={() => navigate('/residents')}
            className="w-full bg-white rounded-lg shadow-sm p-4 flex items-center justify-between hover:shadow-md transition-shadow"
          >
            <div className="flex items-center gap-3">
              <span className="text-2xl">🏥</span>
              <div className="text-left">
                <div className="font-medium text-gray-900">Ver Pacientes</div>
                <div className="text-sm text-gray-500">Listado de residentes</div>
              </div>
            </div>
            <span className="text-gray-400">→</span>
          </button>

          <button
            onClick={() => navigate('/finance')}
            className="w-full bg-white rounded-lg shadow-sm p-4 flex items-center justify-between hover:shadow-md transition-shadow"
          >
            <div className="flex items-center gap-3">
              <span className="text-2xl">💰</span>
              <div className="text-left">
                <div className="font-medium text-gray-900">Finanzas</div>
                <div className="text-sm text-gray-500">Gestión económica</div>
              </div>
            </div>
            <span className="text-gray-400">→</span>
          </button>

          <button
            onClick={() => navigate('/attendance')}
            className="w-full bg-white rounded-lg shadow-sm p-4 flex items-center justify-between hover:shadow-md transition-shadow"
          >
            <div className="flex items-center gap-3">
              <span className="text-2xl">🧾</span>
              <div className="text-left">
                <div className="font-medium text-gray-900">Asistencia</div>
                <div className="text-sm text-gray-500">Check-ins y reportes</div>
              </div>
            </div>
            <span className="text-gray-400">→</span>
          </button>

          <button
            onClick={() => navigate('/activity')}
            className="w-full bg-white rounded-lg shadow-sm p-4 flex items-center justify-between hover:shadow-md transition-shadow"
          >
            <div className="flex items-center gap-3">
              <span className="text-2xl">📰</span>
              <div className="text-left">
                <div className="font-medium text-gray-900">Avisos</div>
                <div className="text-sm text-gray-500">Cambios clínicos, incidentes y cobertura</div>
              </div>
            </div>
            <span className="text-gray-400">→</span>
          </button>
        </div>

        {/* Info */}
        <div className="bg-gradient-to-r from-primary-50 to-primary-100 border border-primary-200 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <span className="text-2xl">💡</span>
            <div className="text-sm text-primary-900">
              <p className="font-medium mb-1">Dashboard del Propietario</p>
              <p>Desde aquí puedes gestionar todo el personal, turnos y ver el estado general de tu facility. Los datos se actualizan automáticamente.</p>
            </div>
          </div>
        </div>
      </div>

      <BottomNav />
    </div>
  );
};
