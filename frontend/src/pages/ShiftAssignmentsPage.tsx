import React, { useState, useEffect } from 'react';
import { useFacility } from '../contexts/FacilityContext';
import { shiftAssignmentsApi, shiftsApi } from '../api/shifts';
import { staffApi } from '../api/staff';
import { BottomNav } from '../components/layout/BottomNav';
import { LoadingSpinner } from '../components/ui/LoadingSpinner';
import { ErrorMessage } from '../components/ui/ErrorMessage';
import { Modal } from '../components/ui/Modal';
import type { ShiftAssignment, ShiftAssignmentCreate, Shift, Staff } from '../types/staff';
import type { ApiError } from '../api/client';

export const ShiftAssignmentsPage: React.FC = () => {
  const [assignments, setAssignments] = useState<ShiftAssignment[]>([]);
  const [shifts, setShifts] = useState<Shift[]>([]);
  const [staff, setStaff] = useState<Staff[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedWeek, setSelectedWeek] = useState(getWeekDates(new Date()));
  const [showCreateModal, setShowCreateModal] = useState(false);
  const { facility } = useFacility();

  useEffect(() => {
    if (facility) {
      loadData();
    }
  }, [facility, selectedWeek]);

  const loadData = async () => {
    if (!facility) return;

    try {
      setLoading(true);
      setError(null);

      const [assignmentsData, shiftsData, staffData] = await Promise.all([
        shiftAssignmentsApi.list(facility.id, {
          start_date: selectedWeek[0],
          end_date: selectedWeek[6],
        }),
        shiftsApi.list(facility.id, { active_only: true }),
        staffApi.list(facility.id, { active_only: true }),
      ]);

      setAssignments(assignmentsData);
      setShifts(shiftsData);
      setStaff(staffData);
    } catch (err) {
      const apiError = err as ApiError;
      setError(apiError.detail || 'Error al cargar asignaciones');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateAssignment = async (data: ShiftAssignmentCreate) => {
    try {
      await shiftAssignmentsApi.create(data);
      setShowCreateModal(false);
      loadData();
    } catch (err) {
      const apiError = err as ApiError;
      throw new Error(apiError.detail || 'Error al crear asignación');
    }
  };

  const handleDeleteAssignment = async (assignmentId: string) => {
    if (!confirm('¿Está seguro de eliminar esta asignación?')) {
      return;
    }

    try {
      await shiftAssignmentsApi.delete(assignmentId);
      loadData();
    } catch (err) {
      const apiError = err as ApiError;
      setError(apiError.detail || 'Error al eliminar asignación');
    }
  };

  const getAssignmentsForDateAndShift = (date: string, shiftId: string) => {
    return assignments.filter((a) => a.date === date && a.shift_id === shiftId);
  };

  const getStaffName = (staffId: string) => {
    const staffMember = staff.find((s) => s.id === staffId);
    return staffMember ? `${staffMember.first_name} ${staffMember.last_name}` : 'Desconocido';
  };

  const getShiftColor = (shiftId: string) => {
    const shift = shifts.find((s) => s.id === shiftId);
    return shift?.color || '#3B82F6';
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr + 'T00:00:00');
    return date.toLocaleDateString('es-AR', { weekday: 'short', day: 'numeric', month: 'short' });
  };

  const goToPreviousWeek = () => {
    const currentFirstDay = new Date(selectedWeek[0] + 'T00:00:00');
    currentFirstDay.setDate(currentFirstDay.getDate() - 7);
    setSelectedWeek(getWeekDates(currentFirstDay));
  };

  const goToNextWeek = () => {
    const currentFirstDay = new Date(selectedWeek[0] + 'T00:00:00');
    currentFirstDay.setDate(currentFirstDay.getDate() + 7);
    setSelectedWeek(getWeekDates(currentFirstDay));
  };

  const goToToday = () => {
    setSelectedWeek(getWeekDates(new Date()));
  };

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      <div className="px-4 py-4 space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-bold text-gray-900">Asignación de Turnos</h1>
          <button
            onClick={() => setShowCreateModal(true)}
            className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors text-sm"
          >
            Asignar
          </button>
        </div>

        {/* Week Navigator */}
        <div className="bg-white rounded-lg shadow-sm p-3">
          <div className="flex items-center justify-between">
            <button
              onClick={goToPreviousWeek}
              className="px-3 py-1 text-sm text-gray-700 hover:bg-gray-100 rounded transition-colors"
            >
              ← Anterior
            </button>

            <button
              onClick={goToToday}
              className="px-4 py-1 text-sm font-medium text-primary-600 hover:bg-primary-50 rounded transition-colors"
            >
              Hoy
            </button>

            <button
              onClick={goToNextWeek}
              className="px-3 py-1 text-sm text-gray-700 hover:bg-gray-100 rounded transition-colors"
            >
              Siguiente →
            </button>
          </div>
        </div>

        {error && <ErrorMessage message={error} onDismiss={() => setError(null)} />}

        {/* Calendar Grid */}
        {loading ? (
          <div className="flex justify-center py-8">
            <LoadingSpinner />
          </div>
        ) : (
          <div className="space-y-4">
            {shifts.map((shift) => (
              <div key={shift.id} className="bg-white rounded-lg shadow-sm overflow-hidden">
                <div
                  className="px-4 py-2 font-medium text-white"
                  style={{ backgroundColor: shift.color || '#3B82F6' }}
                >
                  {shift.name} ({shift.start_time.substring(0, 5)} - {shift.end_time.substring(0, 5)})
                </div>

                <div className="grid grid-cols-7 divide-x">
                  {selectedWeek.map((date) => {
                    const dayAssignments = getAssignmentsForDateAndShift(date, shift.id);
                    const isToday = date === new Date().toISOString().split('T')[0];

                    return (
                      <div
                        key={date}
                        className={`p-2 min-h-[100px] ${isToday ? 'bg-blue-50' : ''}`}
                      >
                        <div className={`text-xs font-medium mb-2 ${isToday ? 'text-primary-600' : 'text-gray-600'}`}>
                          {formatDate(date)}
                        </div>

                        <div className="space-y-1">
                          {dayAssignments.map((assignment) => (
                            <div
                              key={assignment.id}
                              className="text-xs p-1.5 rounded"
                              style={{ backgroundColor: `${getShiftColor(shift.id)}20` }}
                            >
                              <div className="flex items-start justify-between gap-1">
                                <span className="flex-1 truncate" title={getStaffName(assignment.staff_id)}>
                                  {getStaffName(assignment.staff_id)}
                                </span>
                                <button
                                  onClick={() => handleDeleteAssignment(assignment.id)}
                                  className="text-red-600 hover:text-red-800 flex-shrink-0"
                                  title="Eliminar"
                                >
                                  ×
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}

            {shifts.length === 0 && (
              <div className="bg-white rounded-lg shadow-sm p-8 text-center">
                <div className="text-gray-400 text-5xl mb-3">📅</div>
                <p className="text-gray-600">No hay turnos configurados</p>
                <p className="text-sm text-gray-500 mt-2">
                  Primero debes crear turnos en la sección de "Gestión de Turnos"
                </p>
              </div>
            )}
          </div>
        )}

        {/* Info */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <span className="text-2xl">💡</span>
            <div className="text-sm text-blue-800">
              <p className="font-medium mb-1">Asignar personal a turnos</p>
              <p>Haz clic en "Asignar" para agregar personal a turnos específicos. Puedes eliminar asignaciones haciendo clic en la × junto al nombre.</p>
            </div>
          </div>
        </div>
      </div>

      {/* Create Assignment Modal */}
      <Modal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        title="Nueva Asignación"
      >
        {facility && (
          <AssignmentForm
            facilityId={facility.id}
            shifts={shifts}
            staff={staff}
            onSubmit={handleCreateAssignment}
            onCancel={() => setShowCreateModal(false)}
          />
        )}
      </Modal>

      <BottomNav />
    </div>
  );
};

// Helper function to get week dates
function getWeekDates(date: Date): string[] {
  const currentDate = new Date(date);
  const day = currentDate.getDay();
  const diff = currentDate.getDate() - day + (day === 0 ? -6 : 1); // Adjust to Monday
  const monday = new Date(currentDate.setDate(diff));

  const dates: string[] = [];
  for (let i = 0; i < 7; i++) {
    const weekDate = new Date(monday);
    weekDate.setDate(monday.getDate() + i);
    dates.push(weekDate.toISOString().split('T')[0]);
  }
  return dates;
}

// Assignment Form Component
interface AssignmentFormProps {
  facilityId: string;
  shifts: Shift[];
  staff: Staff[];
  onSubmit: (data: ShiftAssignmentCreate) => Promise<void>;
  onCancel: () => void;
}

const AssignmentForm: React.FC<AssignmentFormProps> = ({
  facilityId,
  shifts,
  staff,
  onSubmit,
  onCancel,
}) => {
  const [formData, setFormData] = useState({
    staff_id: '',
    shift_id: '',
    date: new Date().toISOString().split('T')[0],
    notes: '',
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.staff_id) {
      newErrors.staff_id = 'Seleccione un personal';
    }
    if (!formData.shift_id) {
      newErrors.shift_id = 'Seleccione un turno';
    }
    if (!formData.date) {
      newErrors.date = 'Seleccione una fecha';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    setLoading(true);
    setErrors({});

    try {
      await onSubmit({ ...formData, facility_id: facilityId });
    } catch (error: any) {
      setErrors({ submit: error.message });
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Personal *
        </label>
        <select
          value={formData.staff_id}
          onChange={(e) => setFormData({ ...formData, staff_id: e.target.value })}
          className="input-field"
          disabled={loading}
        >
          <option value="">Seleccionar...</option>
          {staff.map((s) => (
            <option key={s.id} value={s.id}>
              {s.first_name} {s.last_name} {s.position ? `(${s.position})` : ''}
            </option>
          ))}
        </select>
        {errors.staff_id && <p className="text-sm text-red-600 mt-1">{errors.staff_id}</p>}
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Turno *
        </label>
        <select
          value={formData.shift_id}
          onChange={(e) => setFormData({ ...formData, shift_id: e.target.value })}
          className="input-field"
          disabled={loading}
        >
          <option value="">Seleccionar...</option>
          {shifts.map((shift) => (
            <option key={shift.id} value={shift.id}>
              {shift.name} ({shift.start_time.substring(0, 5)} - {shift.end_time.substring(0, 5)})
            </option>
          ))}
        </select>
        {errors.shift_id && <p className="text-sm text-red-600 mt-1">{errors.shift_id}</p>}
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Fecha *
        </label>
        <input
          type="date"
          value={formData.date}
          onChange={(e) => setFormData({ ...formData, date: e.target.value })}
          className="input-field"
          disabled={loading}
        />
        {errors.date && <p className="text-sm text-red-600 mt-1">{errors.date}</p>}
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Notas (opcional)
        </label>
        <textarea
          value={formData.notes}
          onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
          className="input-field"
          rows={2}
          disabled={loading}
        />
      </div>

      {errors.submit && <div className="text-sm text-red-600">{errors.submit}</div>}

      <div className="flex space-x-3 pt-4">
        <button
          type="button"
          onClick={onCancel}
          className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
          disabled={loading}
        >
          Cancelar
        </button>
        <button
          type="submit"
          className="flex-1 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
          disabled={loading}
        >
          {loading ? 'Asignando...' : 'Asignar'}
        </button>
      </div>
    </form>
  );
};
