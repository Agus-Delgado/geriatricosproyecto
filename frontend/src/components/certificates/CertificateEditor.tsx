import { useState, useEffect } from 'react';
import { Input } from '../ui/Input';
import { Button } from '../ui/Button';
import { PrintDocument } from './PrintDocument';
import type { CertificateType, CertificateDraft } from '../../types/certificates';
import { buildDefaultBodyText, formatDateAR, formatTimeAR } from './templates';

export type CertificateEditorProps = {
  initialDraft: CertificateDraft;
  onSave?: (draft: CertificateDraft) => void | Promise<void>;
  onPreview?: (draft: CertificateDraft) => void;
  onPrint?: (draft: CertificateDraft) => void;
  onCancel?: () => void;
};

export function CertificateEditor({
  initialDraft,
  onSave,
  onPreview,
  onPrint,
  onCancel,
}: CertificateEditorProps) {
  const [draft, setDraft] = useState<CertificateDraft>(initialDraft);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [showPreview, setShowPreview] = useState(false);

  // Sincronizar con initialDraft cuando cambia (fix para props controladas)
  useEffect(() => {
    setDraft(initialDraft);
  }, [initialDraft]);

  const typeLabels: Record<CertificateType, string> = {
    CONTROL_CLINICO: 'Control Clínico',
    OBITO: 'Óbito',
    PRESENCIA: 'Supervivencia',
    CONSENTIMIENTO: 'Consentimiento informado',
  };

  const handleDateChange = (dateStr: string) => {
    if (!dateStr || dateStr.trim() === '') {
      const now = new Date();
      setDraft((prev) => ({ ...prev, issuedAt: now.toISOString() }));
      return;
    }
    const [datePart, timePart] = dateStr.split('T');
    const [year, month, day] = datePart.split('-');
    const [hours = '00', minutes = '00'] = (timePart || '').split(':');
    
    const newDate = new Date(`${year}-${month}-${day}T${hours}:${minutes}`);
    if (!isNaN(newDate.getTime())) {
      setDraft((prev) => ({ ...prev, issuedAt: newDate.toISOString() }));
    }
  };

  const handleBodyTextChange = (text: string) => {
    setDraft((prev) => ({ ...prev, bodyText: text ?? '' }));
  };

  const handleResetTemplate = () => {
    const issuedAt = new Date(draft.issuedAt);
    if (isNaN(issuedAt.getTime())) {
      return;
    }
    const defaultText = buildDefaultBodyText({
      type: draft.type,
      patientFullName: draft.patientFullName ?? '',
      patientDni: draft.patientDni ?? '',
      issuedAt,
      hogarName: draft.hogarName ?? undefined,
      hogarAddress: draft.hogarAddress || undefined,
    });
    setDraft((prev) => ({ ...prev, bodyText: defaultText }));
  };

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};
    
    if (!draft.bodyText.trim()) {
      newErrors.bodyText = 'El texto del cuerpo es requerido';
    }
    
    if (!draft.issuedAt) {
      newErrors.issuedAt = 'La fecha y hora son requeridas';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSave = async () => {
    if (!validate()) return;
    
    setLoading(true);
    try {
      await onSave?.(draft);
    } catch (error) {
      console.error('Error al guardar:', error);
    } finally {
      setLoading(false);
    }
  };

  const handlePreview = () => {
    if (!validate()) return;
    setShowPreview(true);
    // También llamar al callback si existe (para compatibilidad)
    onPreview?.(draft);
  };

  const handlePrint = () => {
    if (!validate()) return;
    onPrint?.(draft);
  };

  const issuedAtDate = new Date(draft.issuedAt ?? new Date());
  const dateValue = !isNaN(issuedAtDate.getTime()) 
    ? issuedAtDate.toISOString().slice(0, 16) 
    : new Date().toISOString().slice(0, 16); // YYYY-MM-DDTHH:mm

  return (
    <div className="space-y-6">
      {/* Tipo (readonly) */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Tipo de Constancia
        </label>
        <Input
          value={typeLabels[draft.type] ?? ''}
          readOnly
          className="bg-gray-100 cursor-not-allowed"
        />
      </div>

      {/* Paciente (readonly) */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Paciente
        </label>
        <Input
          value={`${draft.patientFullName ?? ''} - DNI: ${draft.patientDni ?? ''}`}
          readOnly
          className="bg-gray-100 cursor-not-allowed"
        />
      </div>

      {/* Fecha y Hora (editable) */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Fecha y Hora
        </label>
        <Input
          type="datetime-local"
          value={dateValue ?? ''}
          onChange={(e) => handleDateChange(e.target.value ?? '')}
          error={errors.issuedAt}
        />
        <p className="mt-1 text-xs text-gray-500">
          Fecha actual: {formatDateAR(issuedAtDate)} - Hora: {formatTimeAR(issuedAtDate)}
        </p>
      </div>

      {/* Cuerpo (textarea editable) */}
      <div>
        <div className="flex justify-between items-center mb-2">
          <label className="block text-sm font-medium text-gray-700">
            Cuerpo de la Constancia
          </label>
          <button
            type="button"
            onClick={handleResetTemplate}
            className="text-sm text-primary-600 hover:text-primary-700"
          >
            Restaurar plantilla
          </button>
        </div>
        <textarea
          value={draft.bodyText ?? ''}
          onChange={(e) => handleBodyTextChange(e.target.value ?? '')}
          rows={8}
          className={`w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 ${
            errors.bodyText ? 'border-red-500 focus:ring-red-500' : ''
          }`}
          placeholder="Ingrese el texto de la constancia..."
        />
        {errors.bodyText && (
          <p className="mt-1 text-sm text-red-600">{errors.bodyText}</p>
        )}
      </div>

      {/* Botones */}
      <div className="flex gap-3 justify-end">
        {onCancel && (
          <Button variant="secondary" onClick={onCancel}>
            Cancelar
          </Button>
        )}
        {onPreview && (
          <Button variant="secondary" onClick={handlePreview}>
            Vista Previa
          </Button>
        )}
        {onPrint && (
          <Button variant="primary" onClick={handlePrint}>
            Imprimir
          </Button>
        )}
        {onSave && (
          <Button variant="primary" onClick={handleSave} disabled={loading}>
            {loading ? 'Guardando...' : 'Guardar'}
          </Button>
        )}
      </div>

      {/* Modal de Vista Previa */}
      {showPreview && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4"
          onClick={() => setShowPreview(false)}
        >
          <div
            className="bg-transparent rounded-lg w-full max-w-6xl max-h-[95vh] overflow-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between items-center mb-4 bg-white rounded-t-lg p-4">
              <h2 className="text-lg font-semibold text-gray-900">Vista Previa</h2>
              <button
                onClick={() => setShowPreview(false)}
                className="text-gray-400 hover:text-gray-600 text-2xl leading-none"
              >
                ×
              </button>
            </div>
            <div className="previewStage bg-gray-100 rounded-b-lg">
              <div className="previewScale">
                <PrintDocument draft={draft} />
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
