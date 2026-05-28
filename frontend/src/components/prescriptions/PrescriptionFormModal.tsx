import React, { useState, useEffect } from 'react';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { Select } from '../ui/Select';
import type { PrescriptionLogCreate, PrescriptionLog } from '../../types/prescriptions';

interface PrescriptionFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: PrescriptionLogCreate) => Promise<void>;
  initialData?: PrescriptionLog | null; // Para repetir receta
  loading?: boolean;
}

export const PrescriptionFormModal: React.FC<PrescriptionFormModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  initialData,
  loading = false,
}) => {
  const [formData, setFormData] = useState<PrescriptionLogCreate>({
    medications_text: '',
    instructions: '',
    source: 'OTHER',
    repeat_of: undefined,
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Prellenar formulario si es para repetir
  useEffect(() => {
    if (initialData && isOpen) {
      setFormData({
        medications_text: initialData.medications_text,
        instructions: initialData.instructions || '',
        source: initialData.source,
        repeat_of: initialData.id,
      });
    } else if (isOpen) {
      // Resetear formulario cuando se abre sin datos iniciales
      setFormData({
        medications_text: '',
        instructions: '',
        source: 'OTHER',
        repeat_of: undefined,
      });
    }
  }, [initialData, isOpen]);

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.medications_text || formData.medications_text.trim().length < 10) {
      newErrors.medications_text = 'Los medicamentos deben tener al menos 10 caracteres';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validate()) {
      return;
    }

    try {
      await onSubmit({
        ...formData,
        medications_text: formData.medications_text.trim(),
        instructions: formData.instructions?.trim() || undefined,
      });
      // Cerrar modal si el submit fue exitoso
      onClose();
    } catch (error) {
      // Error manejado por el componente padre
      console.error('Error al crear receta:', error);
    }
  };

  const handleClose = () => {
    if (!loading) {
      setErrors({});
      onClose();
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title={initialData ? 'Repetir Receta' : 'Registrar Nueva Receta'}
      size="lg"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Medicamentos * <span className="text-gray-500 text-xs">(mínimo 10 caracteres)</span>
          </label>
          <textarea
            value={formData.medications_text}
            onChange={(e) =>
              setFormData({ ...formData, medications_text: e.target.value })
            }
            className={`w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 min-h-[120px] ${
              errors.medications_text ? 'border-red-500 focus:ring-red-500' : ''
            }`}
            rows={6}
            placeholder="Ingrese los medicamentos, uno por línea o en formato libre..."
            disabled={loading}
            style={{ minHeight: '120px' }}
          />
          {errors.medications_text && (
            <p className="mt-1 text-sm text-red-600">{errors.medications_text}</p>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Instrucciones (opcional)
          </label>
          <textarea
            value={formData.instructions || ''}
            onChange={(e) =>
              setFormData({ ...formData, instructions: e.target.value })
            }
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
            rows={4}
            placeholder="Instrucciones adicionales sobre la receta..."
            disabled={loading}
          />
        </div>

        <Select
          label="Fuente"
          value={formData.source || 'OTHER'}
          onChange={(e) =>
            setFormData({ ...formData, source: e.target.value as PrescriptionLogCreate['source'] })
          }
          options={[
            { value: 'OTHER', label: 'Otro' },
            { value: 'PAMI', label: 'PAMI' },
            { value: 'MISRX', label: 'MisRX' },
            { value: 'RECETO', label: 'Receto' },
          ]}
          disabled={loading}
        />

        <div className="flex gap-3 pt-4">
          <Button
            type="button"
            variant="secondary"
            onClick={handleClose}
            fullWidth
            disabled={loading}
          >
            Cancelar
          </Button>
          <Button
            type="submit"
            fullWidth
            disabled={loading}
            style={{ backgroundColor: 'var(--facility-accent, #667eea)' }}
          >
            {loading ? 'Guardando...' : initialData ? 'Repetir Receta' : 'Registrar Receta'}
          </Button>
        </div>
      </form>
    </Modal>
  );
};