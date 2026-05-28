import React, { useState, useEffect } from 'react';
import { useFacility } from '../contexts/FacilityContext';
import { shiftsApi } from '../api/shifts';
import { BottomNav } from '../components/layout/BottomNav';
import { LoadingSpinner } from '../components/ui/LoadingSpinner';
import { ErrorMessage } from '../components/ui/ErrorMessage';
import { Modal } from '../components/ui/Modal';
import type { Shift, ShiftCreate, ShiftUpdate } from '../types/staff';
import type { ApiError } from '../api/client';
import { SHIFT_COLORS } from '../types/staff';

export const ShiftsManagementPage: React.FC = () => {
  const [shifts, setShifts] = useState<Shift[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingShift, setEditingShift] = useState<Shift | null>(null);
  const { facility } = useFacility();

  useEffect(() => {
    if (facility) {
      loadShifts();
    }
  }, [facility]);

  const loadShifts = async () => {
    if (!facility) return;

    try {
      setLoading(true);
      setError(null);
      const data = await shiftsApi.list(facility.id, { active_only: false });
      setShifts(data);
    } catch (err) {
      const apiError = err as ApiError;
      setError(apiError.detail || 'Error al cargar turnos');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateShift = async (data: ShiftCreate | ShiftUpdate) => {
    if (!('facility_id' in data)) {
      throw new Error('Falta facility_id para crear turno');
    }

    try {
      await shiftsApi.create(data);
      setShowCreateModal(false);
      loadShifts();
    } catch (err) {
      const apiError = err as ApiError;
      throw new Error(apiError.detail || 'Error al crear turno');
    }
  };

  const handleEditShift = (shift: Shift) => {
    setEditingShift(shift);
    setShowEditModal(true);
  };

  const handleUpdateShift = async (data: ShiftCreate | ShiftUpdate) => {
    if (!editingShift) return;

    try {
      if ('facility_id' in data) {
        const { facility_id: _ignored, ...updateData } = data;
        await shiftsApi.update(editingShift.id, updateData);
      } else {
        await shiftsApi.update(editingShift.id, data);
      }

      setShowEditModal(false);
      setEditingShift(null);
      loadShifts();
    } catch (err) {
      const apiError = err as ApiError;
      throw new Error(apiError.detail || 'Error al actualizar turno');
    }
  };

  const handleDeleteShift = async (shiftId: string) => {
    if (!confirm('¿Está seguro de eliminar este turno? Solo se puede eliminar si no tiene asignaciones.')) {
      return;
    }

    try {
      await shiftsApi.delete(shiftId);
      loadShifts();
    } catch (err) {
      const apiError = err as ApiError;
      setError(apiError.detail || 'Error al eliminar turno');
    }
  };

  const formatTime = (timeStr: string) => {
    const [hours, minutes] = timeStr.split(':');
    return `${hours}:${minutes}`;
  };

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      <div className="px-4 py-4 space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-bold text-gray-900">Turnos</h1>
          <button
            onClick={() => setShowCreateModal(true)}
            className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
          >
            Nuevo Turno
          </button>
        </div>

        {error && <ErrorMessage message={error} onDismiss={() => setError(null)} />}

        {/* Shifts List */}
        {loading ? (
          <div className="flex justify-center py-8">
            <LoadingSpinner />
          </div>
        ) : shifts.length === 0 ? (
          <div className="bg-white rounded-lg shadow-sm p-8 text-center">
            <div className="text-gray-400 text-5xl mb-3">🕐</div>
            <p className="text-gray-600">No hay turnos configurados</p>
            <p className="text-sm text-gray-500 mt-2">
              Crea turnos para organizar el horario del personal
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {shifts.map((shift) => (
              <div
                key={shift.id}
                className="bg-white rounded-lg shadow-sm p-4 border-l-4"
                style={{ borderLeftColor: shift.color || '#3B82F6' }}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <div
                        className="w-4 h-4 rounded-full"
                        style={{ backgroundColor: shift.color || '#3B82F6' }}
                      />
                      <h3 className="font-semibold text-gray-900">{shift.name}</h3>
                      {!shift.is_active && (
                        <span className="text-xs px-2 py-1 bg-gray-100 text-gray-600 rounded">
                          Inactivo
                        </span>
                      )}
                    </div>

                    <div className="text-sm text-gray-600">
                      <div className="flex items-center gap-2">
                        <span className="text-gray-400">🕐</span>
                        <span className="font-medium">
                          {formatTime(shift.start_time)} - {formatTime(shift.end_time)}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <button
                      onClick={() => handleEditShift(shift)}
                      className="px-3 py-1 text-sm text-primary-600 hover:text-primary-700 hover:bg-primary-50 rounded transition-colors"
                    >
                      Editar
                    </button>
                    <button
                      onClick={() => handleDeleteShift(shift.id)}
                      className="px-3 py-1 text-sm text-red-600 hover:text-red-700 hover:bg-red-50 rounded transition-colors"
                    >
                      Eliminar
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Info */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <span className="text-2xl">💡</span>
            <div className="text-sm text-blue-800">
              <p className="font-medium mb-1">Turnos y horarios</p>
              <p>Configura los turnos de trabajo (mañana, tarde, noche) con sus horarios correspondientes. Luego podrás asignar personal a estos turnos.</p>
            </div>
          </div>
        </div>
      </div>

      {/* Create Modal */}
      <Modal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        title="Nuevo Turno"
      >
        {facility && (
          <ShiftForm
            facilityId={facility.id}
            onSubmit={handleCreateShift}
            onCancel={() => setShowCreateModal(false)}
          />
        )}
      </Modal>

      {/* Edit Modal */}
      <Modal
        isOpen={showEditModal}
        onClose={() => {
          setShowEditModal(false);
          setEditingShift(null);
        }}
        title="Editar Turno"
      >
        {editingShift && (
          <ShiftForm
            facilityId={editingShift.facility_id}
            shift={editingShift}
            onSubmit={handleUpdateShift}
            onCancel={() => {
              setShowEditModal(false);
              setEditingShift(null);
            }}
          />
        )}
      </Modal>

      <BottomNav />
    </div>
  );
};

// Shift Form Component
interface ShiftFormProps {
  facilityId: string;
  shift?: Shift;
  onSubmit: (data: ShiftCreate | ShiftUpdate) => Promise<void>;
  onCancel: () => void;
}

const ShiftForm: React.FC<ShiftFormProps> = ({ facilityId, shift, onSubmit, onCancel }) => {
  const [formData, setFormData] = useState({
    name: shift?.name || '',
    start_time: shift?.start_time ? shift.start_time.substring(0, 5) : '',
    end_time: shift?.end_time ? shift.end_time.substring(0, 5) : '',
    color: shift?.color || SHIFT_COLORS[0],
    is_active: shift?.is_active ?? true,
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.name.trim()) {
      newErrors.name = 'El nombre es requerido';
    }
    if (!formData.start_time) {
      newErrors.start_time = 'La hora de inicio es requerida';
    }
    if (!formData.end_time) {
      newErrors.end_time = 'La hora de fin es requerida';
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
      const submitData: ShiftCreate | ShiftUpdate = shift
        ? { ...formData, start_time: `${formData.start_time}:00`, end_time: `${formData.end_time}:00` }
        : { ...formData, facility_id: facilityId, start_time: `${formData.start_time}:00`, end_time: `${formData.end_time}:00` };

      await onSubmit(submitData);
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
          Nombre del Turno *
        </label>
        <input
          type="text"
          value={formData.name}
          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
          className="input-field"
          placeholder="Ej: Mañana, Tarde, Noche"
          disabled={loading}
        />
        {errors.name && <p className="text-sm text-red-600 mt-1">{errors.name}</p>}
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Hora de Inicio *
          </label>
          <input
            type="time"
            value={formData.start_time}
            onChange={(e) => setFormData({ ...formData, start_time: e.target.value })}
            className="input-field"
            disabled={loading}
          />
          {errors.start_time && <p className="text-sm text-red-600 mt-1">{errors.start_time}</p>}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Hora de Fin *
          </label>
          <input
            type="time"
            value={formData.end_time}
            onChange={(e) => setFormData({ ...formData, end_time: e.target.value })}
            className="input-field"
            disabled={loading}
          />
          {errors.end_time && <p className="text-sm text-red-600 mt-1">{errors.end_time}</p>}
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">Color</label>
        <div className="grid grid-cols-8 gap-2">
          {SHIFT_COLORS.map((color) => (
            <button
              key={color}
              type="button"
              onClick={() => setFormData({ ...formData, color })}
              className={`w-10 h-10 rounded-lg transition-all ${
                formData.color === color ? 'ring-2 ring-offset-2 ring-gray-400 scale-110' : ''
              }`}
              style={{ backgroundColor: color }}
              disabled={loading}
            />
          ))}
        </div>
      </div>

      {shift && (
        <div>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={formData.is_active}
              onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
              className="rounded"
              disabled={loading}
            />
            Turno activo
          </label>
        </div>
      )}

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
          {loading ? 'Guardando...' : shift ? 'Actualizar' : 'Crear'}
        </button>
      </div>
    </form>
  );
};
