import React, { useState } from 'react';
import { Input } from '../ui/Input';
import { Select } from '../ui/Select';
import { Button } from '../ui/Button';
import type { ClinicalNoteCreate } from '../../types/clinical';

interface ClinicalNoteFormProps {
  onSubmit: (data: ClinicalNoteCreate) => Promise<void>;
  onCancel: () => void;
}

export const ClinicalNoteForm: React.FC<ClinicalNoteFormProps> = ({
  onSubmit,
  onCancel,
}) => {
  const [formData, setFormData] = useState({
    note_type: 'EVOLUTION',
    content: '',
    recorded_at: new Date().toISOString().slice(0, 16),
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.content.trim()) {
      newErrors.content = 'El contenido es requerido';
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
      await onSubmit({
        ...formData,
        recorded_at: formData.recorded_at ? new Date(formData.recorded_at).toISOString() : undefined,
      });
    } catch (error: any) {
      // Manejar errores de validación del backend
      if (error?.detail) {
        setErrors({ submit: error.detail });
      } else {
        setErrors({ submit: 'Error al crear la nota' });
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <Select
        label="Tipo de Nota *"
        value={formData.note_type}
        onChange={(e) => setFormData({ ...formData, note_type: e.target.value })}
        options={[
          { value: 'EVOLUTION', label: 'Evolución' },
          { value: 'INCIDENT', label: 'Incidente' },
          { value: 'OBSERVATION', label: 'Observación' },
        ]}
        disabled={loading}
      />

      <Input
        label="Fecha y Hora"
        type="datetime-local"
        value={formData.recorded_at}
        onChange={(e) => setFormData({ ...formData, recorded_at: e.target.value })}
        disabled={loading}
      />

      <div>
        <label className="label">Contenido *</label>
        <textarea
          value={formData.content}
          onChange={(e) => setFormData({ ...formData, content: e.target.value })}
          className={`input-field ${errors.content ? 'border-red-500 focus:ring-red-500' : ''}`}
          rows={6}
          placeholder="Escribe la nota clínica..."
          disabled={loading}
        />
        {errors.content && (
          <p className="mt-1 text-sm text-red-600">{errors.content}</p>
        )}
      </div>

      {errors.submit && (
        <div className="text-sm text-red-600">{errors.submit}</div>
      )}

      <div className="flex space-x-3 pt-4">
        <Button type="button" variant="secondary" onClick={onCancel} fullWidth disabled={loading}>
          Cancelar
        </Button>
        <Button type="submit" fullWidth disabled={loading}>
          {loading ? 'Guardando...' : 'Crear Nota'}
        </Button>
      </div>
    </form>
  );
};
