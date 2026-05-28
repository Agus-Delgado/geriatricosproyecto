import React, { useState, useEffect } from 'react';
import { useFacility } from '../contexts/FacilityContext';
import { staffApi } from '../api/staff';
import { BottomNav } from '../components/layout/BottomNav';
import { SearchBar } from '../components/ui/SearchBar';
import { Button } from '../components/ui/Button';
import { LoadingSpinner } from '../components/ui/LoadingSpinner';
import { ErrorMessage } from '../components/ui/ErrorMessage';
import { Modal } from '../components/ui/Modal';
import { Input } from '../components/ui/Input';
import type { Staff, StaffCreate } from '../types/staff';
import type { ApiError } from '../api/client';

export const StaffPage: React.FC = () => {
  const [staff, setStaff] = useState<Staff[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [activeOnly, setActiveOnly] = useState(true);
  const { facility } = useFacility();

  // Form state
  const [formData, setFormData] = useState<StaffCreate>({
    facility_id: facility?.id || '',
    first_name: '',
    last_name: '',
    dni: '',
    phone: '',
    email: '',
    position: '',
    hire_date: '',
    notes: '',
  });

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

  const handleCreateStaff = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!facility) return;

    try {
      await staffApi.create({ ...formData, facility_id: facility.id });
      setShowCreateModal(false);
      setFormData({
        facility_id: facility.id,
        first_name: '',
        last_name: '',
        dni: '',
        phone: '',
        email: '',
        position: '',
        hire_date: '',
        notes: '',
      });
      loadStaff();
    } catch (err) {
      const apiError = err as ApiError;
      setError(apiError.detail || 'Error al crear personal');
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      <div className="px-4 py-4 space-y-4">
        <div className="flex space-x-2">
          <div className="flex-1">
            <SearchBar
              value={searchQuery}
              onChange={setSearchQuery}
              placeholder="Buscar por nombre o DNI..."
            />
          </div>
        </div>

        <div className="flex items-center space-x-2">
          <label className="flex items-center">
            <input
              type="checkbox"
              checked={activeOnly}
              onChange={(e) => setActiveOnly(e.target.checked)}
              className="mr-2"
            />
            <span className="text-sm text-gray-700">Solo activos</span>
          </label>
        </div>

        {error && (
          <ErrorMessage message={error} onDismiss={() => setError(null)} />
        )}

        {loading ? (
          <div className="flex justify-center py-8">
            <LoadingSpinner />
          </div>
        ) : staff.length === 0 ? (
          <div className="text-center text-gray-500 py-8">
            {searchQuery
              ? 'No se encontró personal'
              : 'No hay personal registrado'}
          </div>
        ) : (
          <div className="space-y-3">
            {staff.map((member) => (
              <div key={member.id} className="card">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <h3 className="font-semibold text-gray-900">
                      {member.first_name} {member.last_name}
                    </h3>
                    {member.position && (
                      <p className="text-sm text-gray-600 mt-1">{member.position}</p>
                    )}
                    {member.dni && (
                      <p className="text-sm text-gray-500 mt-1">DNI: {member.dni}</p>
                    )}
                    {member.phone && (
                      <p className="text-sm text-gray-500 mt-1">Tel: {member.phone}</p>
                    )}
                    <span
                      className={`inline-block mt-2 px-2 py-1 text-xs rounded ${
                        member.is_active
                          ? 'bg-green-100 text-green-800'
                          : 'bg-gray-100 text-gray-800'
                      }`}
                    >
                      {member.is_active ? 'Activo' : 'Inactivo'}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {facility && (
          <div className="fixed bottom-24 right-4 z-30">
            <button
              onClick={() => setShowCreateModal(true)}
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
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        title="Nuevo Personal"
        size="lg"
      >
        <form onSubmit={handleCreateStaff} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Nombre"
              value={formData.first_name}
              onChange={(e) => setFormData({ ...formData, first_name: e.target.value })}
              required
            />
            <Input
              label="Apellido"
              value={formData.last_name}
              onChange={(e) => setFormData({ ...formData, last_name: e.target.value })}
              required
            />
          </div>
          <Input
            label="DNI"
            value={formData.dni}
            onChange={(e) => setFormData({ ...formData, dni: e.target.value })}
          />
          <Input
            label="Teléfono"
            value={formData.phone}
            onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
          />
          <Input
            label="Email"
            type="email"
            value={formData.email}
            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
          />
          <Input
            label="Cargo"
            value={formData.position}
            onChange={(e) => setFormData({ ...formData, position: e.target.value })}
            placeholder="Ej: Cuidador, Enfermero"
          />
          <Input
            label="Fecha de ingreso"
            type="date"
            value={formData.hire_date}
            onChange={(e) => setFormData({ ...formData, hire_date: e.target.value })}
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
              Crear
            </Button>
            <Button
              type="button"
              variant="secondary"
              onClick={() => setShowCreateModal(false)}
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
