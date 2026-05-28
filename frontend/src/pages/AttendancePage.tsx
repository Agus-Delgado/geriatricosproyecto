import React, { useState, useEffect } from 'react';
import { useFacility } from '../contexts/FacilityContext';
import { attendanceApi } from '../api/attendance';
import { staffApi } from '../api/staff';
import { BottomNav } from '../components/layout/BottomNav';
import { Button } from '../components/ui/Button';
import { LoadingSpinner } from '../components/ui/LoadingSpinner';
import { ErrorMessage } from '../components/ui/ErrorMessage';
import { Modal } from '../components/ui/Modal';
import { Input } from '../components/ui/Input';
import type { Attendance, AttendanceCreate, AttendanceReport } from '../types/attendance';
import type { Staff } from '../types/staff';
import type { ApiError } from '../api/client';

export const AttendancePage: React.FC = () => {
  const [attendances, setAttendances] = useState<Attendance[]>([]);
  const [report, setReport] = useState<AttendanceReport[]>([]);
  const [staff, setStaff] = useState<Staff[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [fromDate, setFromDate] = useState(
    new Date(new Date().setDate(1)).toISOString().split('T')[0] // Primer día del mes
  );
  const [toDate, setToDate] = useState(
    new Date().toISOString().split('T')[0] // Hoy
  );
  const [showCheckInModal, setShowCheckInModal] = useState(false);
  const [viewMode, setViewMode] = useState<'list' | 'report'>('list');
  const { facility } = useFacility();

  // Form state
  const [formData, setFormData] = useState<AttendanceCreate>({
    facility_id: facility?.id || '',
    staff_id: '',
    check_in: new Date().toISOString(),
    notes: '',
  });

  useEffect(() => {
    if (facility) {
      loadData();
      loadStaff();
    }
  }, [facility, fromDate, toDate, viewMode]);

  const loadData = async () => {
    if (!facility) return;

    try {
      setLoading(true);
      setError(null);
      
      if (viewMode === 'list') {
        const data = await attendanceApi.list(facility.id, {
          from_date: fromDate,
          to_date: toDate,
        });
        setAttendances(data);
      } else {
        const reportData = await attendanceApi.getReport(facility.id, fromDate, toDate);
        setReport(reportData);
      }
    } catch (err) {
      const apiError = err as ApiError;
      setError(apiError.detail || 'Error al cargar asistencia');
    } finally {
      setLoading(false);
    }
  };

  const loadStaff = async () => {
    if (!facility) return;

    try {
      const data = await staffApi.list(facility.id, { active_only: true });
      setStaff(data);
    } catch (err) {
      console.error('Error al cargar personal:', err);
    }
  };

  const handleCheckIn = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!facility) return;

    try {
      await attendanceApi.create({ ...formData, facility_id: facility.id });
      setShowCheckInModal(false);
      setFormData({
        facility_id: facility.id,
        staff_id: '',
        check_in: new Date().toISOString(),
        notes: '',
      });
      loadData();
    } catch (err) {
      const apiError = err as ApiError;
      setError(apiError.detail || 'Error al registrar entrada');
    }
  };

  const handleCheckOut = async (attendanceId: string) => {
    try {
      await attendanceApi.checkOut(attendanceId, {
        check_out: new Date().toISOString(),
      });
      loadData();
    } catch (err) {
      const apiError = err as ApiError;
      setError(apiError.detail || 'Error al registrar salida');
    }
  };

  const formatDateTime = (dateString: string) => {
    return new Date(dateString).toLocaleString('es-AR', {
      dateStyle: 'short',
      timeStyle: 'short',
    });
  };

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      <div className="px-4 py-4 space-y-4">
        <div className="flex space-x-2">
          <Input
            label="Desde"
            type="date"
            value={fromDate}
            onChange={(e) => setFromDate(e.target.value)}
          />
          <Input
            label="Hasta"
            type="date"
            value={toDate}
            onChange={(e) => setToDate(e.target.value)}
          />
        </div>

        <div className="flex space-x-2">
          <Button
            variant={viewMode === 'list' ? 'primary' : 'secondary'}
            onClick={() => setViewMode('list')}
            className="flex-1"
          >
            Listado
          </Button>
          <Button
            variant={viewMode === 'report' ? 'primary' : 'secondary'}
            onClick={() => setViewMode('report')}
            className="flex-1"
          >
            Reporte
          </Button>
        </div>

        {error && (
          <ErrorMessage message={error} onDismiss={() => setError(null)} />
        )}

        {loading ? (
          <div className="flex justify-center py-8">
            <LoadingSpinner />
          </div>
        ) : viewMode === 'list' ? (
          attendances.length === 0 ? (
            <div className="text-center text-gray-500 py-8">
              No hay registros de asistencia
            </div>
          ) : (
            <div className="space-y-3">
              {attendances.map((att) => (
                <div key={att.id} className="card">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <h3 className="font-semibold text-gray-900">{att.staff_name}</h3>
                      <p className="text-sm text-gray-600 mt-1">
                        Entrada: {formatDateTime(att.check_in)}
                      </p>
                      {att.check_out ? (
                        <p className="text-sm text-gray-600 mt-1">
                          Salida: {formatDateTime(att.check_out)}
                        </p>
                      ) : (
                        <p className="text-sm text-orange-600 mt-1 font-medium">
                          Pendiente de salida
                        </p>
                      )}
                    </div>
                    {!att.check_out && (
                      <Button
                        variant="secondary"
                        onClick={() => handleCheckOut(att.id)}
                        className="ml-2"
                      >
                        Registrar Salida
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )
        ) : (
          report.length === 0 ? (
            <div className="text-center text-gray-500 py-8">
              No hay datos para el reporte
            </div>
          ) : (
            <div className="space-y-3">
              {report.map((r) => (
                <div key={r.staff_id} className="card">
                  <h3 className="font-semibold text-gray-900">{r.staff_name}</h3>
                  <div className="mt-2 space-y-1 text-sm">
                    <p className="text-gray-600">
                      Entradas: {r.check_ins} | Salidas: {r.check_outs}
                    </p>
                    {r.total_hours && (
                      <p className="text-gray-600">
                        Total horas: {r.total_hours.toFixed(2)}h
                      </p>
                    )}
                    {r.incomplete_sessions > 0 && (
                      <p className="text-orange-600 font-medium">
                        Sesiones incompletas: {r.incomplete_sessions}
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )
        )}

        {facility && (
          <div className="fixed bottom-24 right-4 z-30">
            <button
              onClick={() => setShowCheckInModal(true)}
              className="bg-primary-600 text-white rounded-full p-4 shadow-lg hover:bg-primary-700 transition-colors"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
            </button>
          </div>
        )}
      </div>

      <Modal
        isOpen={showCheckInModal}
        onClose={() => setShowCheckInModal(false)}
        title="Registrar Entrada"
        size="lg"
      >
        <form onSubmit={handleCheckIn} className="space-y-4">
          <div>
            <label className="label">Personal</label>
            <select
              value={formData.staff_id}
              onChange={(e) => setFormData({ ...formData, staff_id: e.target.value })}
              className="input-field"
              required
            >
              <option value="">Seleccionar...</option>
              {staff.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.first_name} {s.last_name} {s.position ? `- ${s.position}` : ''}
                </option>
              ))}
            </select>
          </div>
          <Input
            label="Fecha y hora de entrada"
            type="datetime-local"
            value={formData.check_in ? new Date(formData.check_in).toISOString().slice(0, 16) : ''}
            onChange={(e) => setFormData({ ...formData, check_in: new Date(e.target.value).toISOString() })}
            required
          />
          <div>
            <label className="label">Notas</label>
            <textarea
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              className="input-field"
              rows={3}
            />
          </div>
          <div className="flex space-x-2">
            <Button type="submit" fullWidth>
              Registrar Entrada
            </Button>
            <Button
              type="button"
              variant="secondary"
              onClick={() => setShowCheckInModal(false)}
              fullWidth
            >
              Cancelar
            </Button>
          </div>
        </form>
      </Modal>

      <BottomNav />
    </div>
  );
};
