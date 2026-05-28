import React, { useState, useEffect } from 'react';
import { useFacility } from '../contexts/FacilityContext';
import { staffApi } from '../api/staff';
import { BottomNav } from '../components/layout/BottomNav';
import { SearchBar } from '../components/ui/SearchBar';
import { LoadingSpinner } from '../components/ui/LoadingSpinner';
import { ErrorMessage } from '../components/ui/ErrorMessage';
import { Modal } from '../components/ui/Modal';
import type { Staff, StaffCreate, StaffUpdate } from '../types/staff';
import type { ApiError } from '../api/client';
import { STAFF_POSITIONS, STAFF_STATUS } from '../types/staff';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';

export const StaffManagementPage: React.FC = () => {
  const [staff, setStaff] = useState<Staff[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeOnly, setActiveOnly] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingStaff, setEditingStaff] = useState<Staff | null>(null);
  const [showTransferModal, setShowTransferModal] = useState(false);
  const [transferringStaff, setTransferringStaff] = useState<Staff | null>(null);
  const [transferFacilityId, setTransferFacilityId] = useState<string>('');
  const { facility } = useFacility();
  const { getMemberships } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (facility) {
      loadStaff();
    }
  }, [facility, searchQuery, activeOnly]);

  const loadStaff = async () => {
    if (!facility) return;

    try {
      setLoading(true);
      setError(null);
      const data = await staffApi.list(facility.id, {
        active_only: activeOnly,
        q: searchQuery || undefined,
      });
      setStaff(data);
    } catch (err) {
      const apiError = err as ApiError;
      setError(apiError.detail || 'Error al cargar personal');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateStaff = async (data: StaffCreate | StaffUpdate) => {
    if (!('facility_id' in data)) {
      throw new Error('Falta facility_id para crear personal');
    }

    try {
      await staffApi.create(data);
      setShowCreateModal(false);
      loadStaff();
    } catch (err) {
      const apiError = err as ApiError;
      throw new Error(apiError.detail || 'Error al crear personal');
    }
  };

  const handleEditStaff = (staffMember: Staff) => {
    setEditingStaff(staffMember);
    setShowEditModal(true);
  };

  const handleTransferStaff = (staffMember: Staff) => {
    setTransferringStaff(staffMember);
    setTransferFacilityId('');
    setShowTransferModal(true);
  };

  const submitTransfer = async () => {
    if (!transferringStaff) return;
    if (!transferFacilityId) {
      setError('Seleccioná un hogar destino');
      return;
    }

    try {
      await staffApi.transfer(transferringStaff.id, transferFacilityId);
      setShowTransferModal(false);
      setTransferringStaff(null);
      setTransferFacilityId('');
      loadStaff();
    } catch (err) {
      const apiError = err as ApiError;
      setError(apiError.detail || 'Error al derivar personal');
    }
  };

  const handleDeactivateStaff = async (staffMember: Staff) => {
    if (!confirm(`¿Dar de baja a ${staffMember.first_name} ${staffMember.last_name}?`)) return;
    const today = new Date().toISOString().slice(0, 10);
    try {
      await staffApi.update(staffMember.id, { is_active: false, status: 'INACTIVE', end_date: today });
      setShowEditModal(false);
      setEditingStaff(null);
      loadStaff();
    } catch (err) {
      const apiError = err as ApiError;
      setError(apiError.detail || 'Error al dar de baja personal');
    }
  };

  const handleUpdateStaff = async (data: StaffCreate | StaffUpdate) => {
    if (!editingStaff) return;

    try {
      if ('facility_id' in data) {
        const { facility_id: _ignored, ...updateData } = data;
        await staffApi.update(editingStaff.id, updateData);
      } else {
        await staffApi.update(editingStaff.id, data);
      }

      setShowEditModal(false);
      setEditingStaff(null);
      loadStaff();
    } catch (err) {
      const apiError = err as ApiError;
      throw new Error(apiError.detail || 'Error al actualizar personal');
    }
  };

  const getStatusBadge = (status: Staff['status']) => {
    const statusInfo = STAFF_STATUS.find((s) => s.value === status);
    if (!statusInfo) return null;

    const colorClasses = {
      green: 'bg-green-100 text-green-800',
      yellow: 'bg-yellow-100 text-yellow-800',
      gray: 'bg-gray-100 text-gray-800',
    };

    return (
      <span className={`inline-block px-2 py-1 text-xs rounded ${colorClasses[statusInfo.color as keyof typeof colorClasses]}`}>
        {statusInfo.label}
      </span>
    );
  };

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      <div className="px-4 py-4 space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-bold text-gray-900">Personal</h1>
          <button
            onClick={() => setShowCreateModal(true)}
            className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
          >
            Agregar
          </button>
        </div>

        {/* Filters */}
        <div className="space-y-3">
          <SearchBar
            value={searchQuery}
            onChange={setSearchQuery}
            placeholder="Buscar por nombre o DNI..."
          />

          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={activeOnly}
              onChange={(e) => setActiveOnly(e.target.checked)}
              className="rounded"
            />
            Solo personal activo
          </label>
        </div>

        {error && <ErrorMessage message={error} onDismiss={() => setError(null)} />}

        {/* Staff List */}
        {loading ? (
          <div className="flex justify-center py-8">
            <LoadingSpinner />
          </div>
        ) : staff.length === 0 ? (
          <div className="text-center text-gray-500 py-8">
            {searchQuery || !activeOnly ? 'No se encontró personal' : 'No hay personal registrado'}
          </div>
        ) : (
          <div className="space-y-3">
            {staff.map((member) => (
              <div key={member.id} className="card hover:shadow-md transition-shadow">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <h3 className="font-semibold text-gray-900">
                        {member.first_name} {member.last_name}
                      </h3>
                      {getStatusBadge(member.status)}
                    </div>

                    <div className="space-y-1 text-sm text-gray-600">
                      {member.dni && <div>DNI: {member.dni}</div>}
                      {member.position && <div>Cargo: {member.position}</div>}
                      {member.specialty && <div>Especialidad: {member.specialty}</div>}
                      {member.phone && (
                        <div>
                          Tel:{' '}
                          <a href={`tel:${member.phone}`} className="text-primary-600 hover:underline">
                            {member.phone}
                          </a>
                        </div>
                      )}
                      {member.hire_date && (
                        <div>Ingreso: {new Date(member.hire_date).toLocaleDateString('es-AR')}</div>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => navigate(`/staff/${member.id}/print`)}
                      className="px-3 py-1 text-sm text-gray-700 hover:text-gray-900 hover:bg-gray-100 rounded transition-colors"
                    >
                      Imprimir informe
                    </button>
                    <button
                      onClick={() => handleTransferStaff(member)}
                      className="px-3 py-1 text-sm text-gray-700 hover:text-gray-900 hover:bg-gray-100 rounded transition-colors"
                    >
                      Derivar
                    </button>
                    <button
                      onClick={() => handleEditStaff(member)}
                      className="px-3 py-1 text-sm text-primary-600 hover:text-primary-700 hover:bg-primary-50 rounded transition-colors"
                    >
                      Editar
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Create Modal */}
      <Modal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        title="Nuevo Personal"
        size="lg"
      >
        {facility && (
          <StaffForm
            facilityId={facility.id}
            onSubmit={handleCreateStaff}
            onCancel={() => setShowCreateModal(false)}
          />
        )}
      </Modal>

      {/* Edit Modal */}
      <Modal
        isOpen={showEditModal}
        onClose={() => {
          setShowEditModal(false);
          setEditingStaff(null);
        }}
        title="Editar Personal"
        size="lg"
      >
        {editingStaff && (
          <div className="space-y-4">
            <StaffForm
              facilityId={editingStaff.facility_id}
              staff={editingStaff}
              onSubmit={handleUpdateStaff}
              onCancel={() => {
                setShowEditModal(false);
                setEditingStaff(null);
              }}
            />

            <div className="pt-2 border-t border-gray-200">
              <button
                type="button"
                onClick={() => handleDeactivateStaff(editingStaff)}
                className="w-full px-4 py-2 rounded-lg border border-red-300 text-red-700 hover:bg-red-50 transition-colors"
              >
                Dar de baja (no trabaja más)
              </button>
            </div>
          </div>
        )}
      </Modal>

      <Modal
        isOpen={showTransferModal}
        onClose={() => {
          setShowTransferModal(false);
          setTransferringStaff(null);
          setTransferFacilityId('');
        }}
        title="Derivar personal"
        size="md"
      >
        <div className="space-y-4">
          <div className="text-sm text-gray-700">
            {transferringStaff ? (
              <div>
                Trasladar a <strong>{transferringStaff.first_name} {transferringStaff.last_name}</strong> a otro hogar.
              </div>
            ) : null}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Hogar destino</label>
            <select
              value={transferFacilityId}
              onChange={(e) => setTransferFacilityId(e.target.value)}
              className="input-field"
            >
              <option value="">Seleccionar...</option>
              {getMemberships()
                .filter((m) => m.is_active)
                .filter((m) => m.facility_id !== transferringStaff?.facility_id)
                .map((m) => (
                  <option key={m.facility_id} value={m.facility_id}>
                    {m.facility_name}
                  </option>
                ))}
            </select>
          </div>

          <div className="flex gap-3">
            <button
              type="button"
              onClick={() => {
                setShowTransferModal(false);
                setTransferringStaff(null);
                setTransferFacilityId('');
              }}
              className="flex-1 px-4 py-2 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={submitTransfer}
              className="flex-1 px-4 py-2 rounded-lg bg-primary-600 text-white hover:bg-primary-700"
            >
              Derivar
            </button>
          </div>
        </div>
      </Modal>

      <BottomNav />
    </div>
  );
};

// Staff Form Component
interface StaffFormProps {
  facilityId: string;
  staff?: Staff;
  onSubmit: (data: StaffCreate | StaffUpdate) => Promise<void>;
  onCancel: () => void;
}

const StaffForm: React.FC<StaffFormProps> = ({ facilityId, staff, onSubmit, onCancel }) => {
  const [formData, setFormData] = useState({
    first_name: staff?.first_name || '',
    last_name: staff?.last_name || '',
    dni: staff?.dni || '',
    cuil: staff?.cuil || '',
    phone: staff?.phone || '',
    email: staff?.email || '',
    position: staff?.position || '',
    specialty: staff?.specialty || '',
    license_number: staff?.license_number || '',
    hire_date: staff?.hire_date || '',
    end_date: staff?.end_date || '',
    status: staff?.status || 'ACTIVE',
    notes: staff?.notes || '',
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.first_name.trim()) {
      newErrors.first_name = 'El nombre es requerido';
    }
    if (!formData.last_name.trim()) {
      newErrors.last_name = 'El apellido es requerido';
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
      const submitData: StaffCreate | StaffUpdate = staff
        ? { ...formData }
        : { ...formData, facility_id: facilityId };

      await onSubmit(submitData);
    } catch (error: any) {
      setErrors({ submit: error.message });
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Nombre *
          </label>
          <input
            type="text"
            value={formData.first_name}
            onChange={(e) => setFormData({ ...formData, first_name: e.target.value })}
            className="input-field"
            disabled={loading}
          />
          {errors.first_name && <p className="text-sm text-red-600 mt-1">{errors.first_name}</p>}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Apellido *
          </label>
          <input
            type="text"
            value={formData.last_name}
            onChange={(e) => setFormData({ ...formData, last_name: e.target.value })}
            className="input-field"
            disabled={loading}
          />
          {errors.last_name && <p className="text-sm text-red-600 mt-1">{errors.last_name}</p>}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">DNI</label>
          <input
            type="text"
            value={formData.dni}
            onChange={(e) => setFormData({ ...formData, dni: e.target.value })}
            className="input-field"
            disabled={loading}
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">CUIL</label>
          <input
            type="text"
            value={formData.cuil}
            onChange={(e) => setFormData({ ...formData, cuil: e.target.value })}
            className="input-field"
            disabled={loading}
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Teléfono</label>
          <input
            type="tel"
            value={formData.phone}
            onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
            className="input-field"
            disabled={loading}
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
          <input
            type="email"
            value={formData.email}
            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
            className="input-field"
            disabled={loading}
          />
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Cargo</label>
        <select
          value={formData.position}
          onChange={(e) => setFormData({ ...formData, position: e.target.value })}
          className="input-field"
          disabled={loading}
        >
          {STAFF_POSITIONS.map((pos) => (
            <option key={pos.value} value={pos.value}>
              {pos.label}
            </option>
          ))}
        </select>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Especialidad</label>
          <input
            type="text"
            value={formData.specialty}
            onChange={(e) => setFormData({ ...formData, specialty: e.target.value })}
            className="input-field"
            placeholder="Ej: Geriatría, Clínico"
            disabled={loading}
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Matrícula</label>
          <input
            type="text"
            value={formData.license_number}
            onChange={(e) => setFormData({ ...formData, license_number: e.target.value })}
            className="input-field"
            disabled={loading}
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Fecha de Ingreso</label>
          <input
            type="date"
            value={formData.hire_date}
            onChange={(e) => setFormData({ ...formData, hire_date: e.target.value })}
            className="input-field"
            disabled={loading}
          />
        </div>

        {staff && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Estado</label>
            <select
              value={formData.status}
              onChange={(e) => setFormData({ ...formData, status: e.target.value as any })}
              className="input-field"
              disabled={loading}
            >
              {STAFF_STATUS.map((status) => (
                <option key={status.value} value={status.value}>
                  {status.label}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {staff && formData.status === 'INACTIVE' && (
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Fecha de Baja</label>
          <input
            type="date"
            value={formData.end_date}
            onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
            className="input-field"
            disabled={loading}
          />
        </div>
      )}

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Notas</label>
        <textarea
          value={formData.notes}
          onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
          className="input-field"
          rows={3}
          disabled={loading}
        />
      </div>

      {staff && formData.status === 'LEAVE' && (
        <div className="text-sm text-gray-600">
          Podés usar el campo <strong>Notas</strong> para detallar la licencia (motivo/fechas).
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
          {loading ? 'Guardando...' : staff ? 'Actualizar' : 'Crear'}
        </button>
      </div>
    </form>
  );
};
