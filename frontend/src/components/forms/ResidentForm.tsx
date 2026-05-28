import React, { useState, useRef } from 'react';
import { Input } from '../ui/Input';
import { Select } from '../ui/Select';
import { Button } from '../ui/Button';
import { residentsApi } from '../../api/residents';
import type { Resident, ResidentCreate, ResidentUpdate, ResidentContactCreate } from '../../types/residents';
import type { ApiError } from '../../api/client';

interface ResidentFormProps {
  resident?: Resident;
  onSubmit: (data: ResidentCreate | ResidentUpdate) => Promise<Resident | void>;
  onCancel: () => void;
  facilityId: string;
}

export const ResidentForm: React.FC<ResidentFormProps> = ({
  resident,
  onSubmit,
  onCancel,
  facilityId,
}) => {
  const [formData, setFormData] = useState({
    first_name: resident?.first_name || '',
    last_name: resident?.last_name || '',
    dni: resident?.dni || '',
    birth_date: resident?.birth_date || '',
    sex: resident?.sex || '',
    coverage_type: resident?.coverage_type || '',
    coverage_other: resident?.coverage_other || '',
    coverage_number: resident?.coverage_number || '',
    admission_date: resident?.admission_date || new Date().toISOString().split('T')[0],
    notes: resident?.notes || '',
    archived: resident?.status === 'INACTIVE' || false,
    archive_note: '',
  });

  // Estado para contactos (máximo 3)
  const [contacts, setContacts] = useState<Array<{
    first_name: string;
    last_name: string;
    phone: string;
    email: string;
    relationship_type: string;
  }>>([
    { first_name: '', last_name: '', phone: '', email: '', relationship_type: '' },
    { first_name: '', last_name: '', phone: '', email: '', relationship_type: '' },
    { first_name: '', last_name: '', phone: '', email: '', relationship_type: '' },
  ]);

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [alert, setAlert] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploadingDocument, setUploadingDocument] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.first_name.trim()) {
      newErrors.first_name = 'El nombre es requerido';
    }
    if (!formData.last_name.trim()) {
      newErrors.last_name = 'El apellido es requerido';
    }
    if (!formData.admission_date) {
      newErrors.admission_date = 'La fecha de ingreso es requerida';
    } else {
      // Validar que la fecha de ingreso no sea futura
      const admissionDate = new Date(formData.admission_date);
      const today = new Date();
      today.setHours(23, 59, 59, 999); // Fin del día de hoy
      if (admissionDate > today) {
        newErrors.admission_date = 'La fecha de ingreso no puede ser futura';
      }
    }

    // Validar fecha de nacimiento si está presente
    if (formData.birth_date) {
      const birthDate = new Date(formData.birth_date);
      const today = new Date();
      if (birthDate > today) {
        newErrors.birth_date = 'La fecha de nacimiento no puede ser futura';
      }
      // Validar que la fecha de nacimiento sea anterior a la de ingreso
      if (formData.admission_date) {
        const admissionDate = new Date(formData.admission_date);
        if (birthDate >= admissionDate) {
          newErrors.birth_date = 'La fecha de nacimiento debe ser anterior a la fecha de ingreso';
        }
      }
    }

    // Validar coverage_other si coverage_type es OTRA
    if (formData.coverage_type === 'OTRA' && !formData.coverage_other?.trim()) {
      newErrors.coverage_other = 'Debe especificar la cobertura cuando selecciona OTRA';
    }

    // Validar contactos: al menos uno debe tener nombre y teléfono
    const validContacts = contacts.filter(
      (c) => c.first_name.trim() || c.last_name.trim() || c.phone.trim()
    );
    if (validContacts.length > 0) {
      validContacts.forEach((contact, index) => {
        if (!contact.first_name.trim() && !contact.last_name.trim()) {
          newErrors[`contact_${index}_name`] = 'Nombre o apellido es requerido';
        }
        if (!contact.phone.trim()) {
          newErrors[`contact_${index}_phone`] = 'Teléfono es requerido';
        }
      });
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // handleSubmit eliminado (no se usa)

  const updateContact = (index: number, field: string, value: string) => {
    const newContacts = [...contacts];
    newContacts[index] = { ...newContacts[index], [field]: value };
    setContacts(newContacts);
  };

  // Eliminados estados archivar y observacion (no se usan)

  return (
    <>
    <form onSubmit={async (e) => {
      e.preventDefault();
      if (!validate()) return;
      setLoading(true);
      setErrors({});
      try {
        // Preparar contactos para enviar (solo los que tienen datos)
        const contactsToSend: ResidentContactCreate[] = contacts
          .filter((c) => (c.first_name.trim() || c.last_name.trim()) && c.phone.trim())
          .map((c) => ({
            full_name: `${c.first_name.trim()} ${c.last_name.trim()}`.trim(),
            phone: c.phone.trim(),
            email: c.email.trim() || undefined,
            relationship_type: c.relationship_type.trim() || undefined,
            is_primary: false,
          }));
        if (resident) {
          const updateData: ResidentUpdate = {
            ...formData,
            status: formData.archived ? 'INACTIVE' : 'ACTIVE',
            notes: formData.archive_note
              ? (formData.notes ? formData.notes + '\n---\nMotivo de baja: ' + formData.archive_note : 'Motivo de baja: ' + formData.archive_note)
              : formData.notes,
          };
          delete (updateData as any).archived;
          delete (updateData as any).archive_note;
          await onSubmit(updateData);
          
          // Si hay archivo seleccionado, subirlo después de actualizar
          if (selectedFile && resident) {
            try {
              setUploadingDocument(true);
              await residentsApi.uploadDocument(resident.id, selectedFile);
              setSelectedFile(null);
              if (fileInputRef.current) {
                fileInputRef.current.value = '';
              }
            } catch (uploadError) {
              const uploadApiError = uploadError as ApiError;
              setAlert(`Residente actualizado pero error al subir documento: ${uploadApiError.detail || 'Error desconocido'}`);
            } finally {
              setUploadingDocument(false);
            }
          }
        } else {
          const submitData: ResidentCreate = {
            ...formData,
            facility_id: facilityId,
            coverage_other: formData.coverage_other || undefined,
            contacts: contactsToSend.length > 0 ? contactsToSend : undefined,
          };
          delete (submitData as any).archived;
          delete (submitData as any).archive_note;
          const createdResident = await onSubmit(submitData);
          
          // Si hay archivo seleccionado, subirlo después de crear
          if (selectedFile && createdResident?.id) {
            try {
              setUploadingDocument(true);
              await residentsApi.uploadDocument(createdResident.id, selectedFile);
              setSelectedFile(null);
              if (fileInputRef.current) {
                fileInputRef.current.value = '';
              }
            } catch (uploadError) {
              const uploadApiError = uploadError as ApiError;
              setAlert(`Residente creado pero error al subir documento: ${uploadApiError.detail || 'Error desconocido'}`);
            } finally {
              setUploadingDocument(false);
            }
          }
        }
        
        setAlert(null);
      } catch (error: any) {
        let detail = 'Error al guardar el residente';
        if (error?.response) {
          try {
            const data = error.response.data;
            if (data?.detail) detail = data.detail;
            else if (data?.message) detail = data.message;
          } catch {}
          detail = `(${error.response.status}) ${detail}`;
        } else if (error?.detail) {
          detail = error.detail;
        } else if (error?.message) {
          detail = error.message;
        }
        setErrors({ submit: detail });
        setAlert(`No se pudo guardar. Motivo: ${detail}`);
        // eslint-disable-next-line no-console
        console.error('Error al guardar residente:', error);
      } finally {
        setLoading(false);
      }
    }} className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <Input
          label="Nombre *"
          value={formData.first_name}
          onChange={(e) => setFormData({ ...formData, first_name: e.target.value })}
          error={errors.first_name}
          disabled={loading}
        />
        <Input
          label="Apellido *"
          value={formData.last_name}
          onChange={(e) => setFormData({ ...formData, last_name: e.target.value })}
          error={errors.last_name}
          disabled={loading}
        />
      </div>

      <Input
        label="DNI"
        value={formData.dni}
        onChange={(e) => setFormData({ ...formData, dni: e.target.value })}
        disabled={loading}
      />

      <Input
        label="Fecha de Nacimiento"
        type="date"
        value={formData.birth_date}
        onChange={(e) => setFormData({ ...formData, birth_date: e.target.value })}
        error={errors.birth_date}
        disabled={loading}
      />

      <Select
        label="Sexo"
        value={formData.sex}
        onChange={(e) => setFormData({ ...formData, sex: e.target.value })}
        options={[
          { value: '', label: 'Seleccionar...' },
          { value: 'M', label: 'Masculino' },
          { value: 'F', label: 'Femenino' },
          { value: 'O', label: 'Otro' },
        ]}
        disabled={loading}
      />

      <Select
        label="Tipo de Cobertura"
        value={formData.coverage_type}
        onChange={(e) => setFormData({ ...formData, coverage_type: e.target.value, coverage_other: e.target.value !== 'OTRA' ? '' : formData.coverage_other })}
        options={[
          { value: '', label: 'Seleccionar...' },
          { value: 'PAMI', label: 'PAMI' },
          { value: 'OBRA SOCIAL', label: 'OBRA SOCIAL' },
          { value: 'PARTICULAR', label: 'PARTICULAR' },
          { value: 'IOMA', label: 'IOMA' },
          { value: 'OTRA', label: 'OTRA' },
        ]}
        disabled={loading}
      />

      {formData.coverage_type === 'OTRA' && (
        <Input
          label="Especificar Cobertura *"
          value={formData.coverage_other}
          onChange={(e) => setFormData({ ...formData, coverage_other: e.target.value })}
          error={errors.coverage_other}
          disabled={loading}
        />
      )}

      <Input
        label="Número de Cobertura"
        value={formData.coverage_number}
        onChange={(e) => setFormData({ ...formData, coverage_number: e.target.value })}
        disabled={loading}
      />

      <Input
        label="Fecha de Ingreso *"
        type="date"
        value={formData.admission_date}
        onChange={(e) => setFormData({ ...formData, admission_date: e.target.value })}
        error={errors.admission_date}
        disabled={loading}
      />

      {/* Sección Dar de baja / Archivar (solo edición) */}
      {resident && (
        <div className="border-t pt-4 mt-4">
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={formData.archived}
              onChange={e => setFormData({ ...formData, archived: e.target.checked })}
              disabled={loading}
            />
            Dar de baja / Archivar residente
          </label>
          <div className="mt-2">
            <Input
              label="Observación (motivo de baja, opcional)"
              value={formData.archive_note}
              onChange={e => setFormData({ ...formData, archive_note: e.target.value })}
              disabled={loading}
            />
          </div>
        </div>
      )}

      {/* Sección Contactos / Familiares */}
      <div className="border-t pt-4 mt-4">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Contactos / Familiares</h3>
        <p className="text-sm text-gray-600 mb-4">
          Complete al menos un contacto con nombre y teléfono. Los campos de email y parentesco son opcionales.
        </p>
        <div className="space-y-4">
          {contacts.map((contact, index) => (
            <div key={index} className="border border-gray-200 rounded-lg p-4 bg-gray-50">
              <h4 className="font-medium text-gray-700 mb-3">Contacto {index + 1}</h4>
              <div className="grid grid-cols-2 gap-3">
                <Input
                  label="Nombre"
                  value={contact.first_name}
                  onChange={(e) => updateContact(index, 'first_name', e.target.value)}
                  error={errors[`contact_${index}_name`]}
                  disabled={loading}
                />
                <Input
                  label="Apellido"
                  value={contact.last_name}
                  onChange={(e) => updateContact(index, 'last_name', e.target.value)}
                  disabled={loading}
                />
              </div>
              <div className="grid grid-cols-2 gap-3 mt-3">
                <Input
                  label="Teléfono *"
                  value={contact.phone}
                  onChange={(e) => updateContact(index, 'phone', e.target.value)}
                  error={errors[`contact_${index}_phone`]}
                  disabled={loading}
                />
                <Input
                  label="Email"
                  type="email"
                  value={contact.email}
                  onChange={(e) => updateContact(index, 'email', e.target.value)}
                  disabled={loading}
                />
              </div>
              <div className="mt-3">
                <Input
                  label="Parentesco (opcional)"
                  value={contact.relationship_type}
                  onChange={(e) => updateContact(index, 'relationship_type', e.target.value)}
                  placeholder="Ej: Hijo/a, Cónyuge, Tutor, etc."
                  disabled={loading}
                />
              </div>
            </div>
          ))}
        </div>
      </div>

      <div>
        <label className="label">Notas</label>
        <textarea
          value={formData.notes}
          onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
          className="input-field"
          rows={3}
          disabled={loading}
        />
      </div>

      {/* Sección Documento (Carnet) */}
      <div className="border-t pt-4 mt-4">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Documento (Carnet)</h3>
        
        {/* Mostrar documento existente si existe */}
        {resident?.document_url && (
          <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
            <p className="text-sm text-gray-700 mb-2">
              <strong>Documento actual:</strong> {resident.document_name || 'Sin nombre'}
              {resident.document_size && (
                <span className="text-gray-500 ml-2">
                  ({(resident.document_size / (1024 * 1024)).toFixed(2)} MB)
                </span>
              )}
            </p>
            <a
              href={resident.document_url || '#'}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-blue-600 hover:text-blue-800 underline"
            >
              Ver documento
            </a>
          </div>
        )}
        
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Adjuntar carnet (opcional)
          </label>
          <input
            ref={fileInputRef}
            type="file"
            accept=".jpg,.jpeg,.png,.pdf"
            onChange={(e) => {
              const file = e.target.files?.[0] || null;
              if (file) {
                // Validar tipo de archivo
                const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'application/pdf'];
                if (!allowedTypes.includes(file.type)) {
                  setErrors({
                    ...errors,
                    document: 'Tipo de archivo no permitido. Solo JPG, PNG o PDF.',
                  });
                  setSelectedFile(null);
                  return;
                }
                // Validar tamaño (10MB)
                const maxSize = 10 * 1024 * 1024; // 10MB
                if (file.size > maxSize) {
                  setErrors({
                    ...errors,
                    document: `El archivo es demasiado grande. Tamaño máximo: 10MB. Tamaño actual: ${(file.size / (1024 * 1024)).toFixed(2)}MB`,
                  });
                  setSelectedFile(null);
                  return;
                }
                // Limpiar error de documento si existe (eliminar propiedad en lugar de undefined)
                const newErrors = { ...errors };
                delete newErrors.document;
                setErrors(newErrors);
                setSelectedFile(file);
              } else {
                setSelectedFile(null);
              }
            }}
            className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-primary-50 file:text-primary-700 hover:file:bg-primary-100"
            disabled={loading || uploadingDocument}
          />
          {errors.document && (
            <p className="mt-1 text-sm text-red-600">{errors.document}</p>
          )}
          {selectedFile && (
            <p className="mt-2 text-sm text-gray-600">
              Archivo seleccionado: {selectedFile.name} ({(selectedFile.size / (1024 * 1024)).toFixed(2)} MB)
            </p>
          )}
          <p className="mt-1 text-xs text-gray-500">
            Formatos permitidos: JPG, PNG, PDF. Tamaño máximo: 10MB.
          </p>
        </div>
        {uploadingDocument && (
          <div className="mt-2 text-sm text-blue-600">
            Subiendo documento...
          </div>
        )}
      </div>

      {/* Sección Dar de baja / Archivar eliminada para destrabar build */}

      {alert && (
        <div className="bg-yellow-100 border-l-4 border-yellow-500 text-yellow-800 p-3 rounded mb-2">{alert}</div>
      )}
      {errors.submit && (
        <div className="text-sm text-red-600">{errors.submit}</div>
      )}

      <div className="flex space-x-3 pt-4">
        <Button type="button" variant="secondary" onClick={onCancel} fullWidth disabled={loading || uploadingDocument}>
          Cancelar
        </Button>
        <Button type="submit" fullWidth disabled={loading || uploadingDocument}>
          {loading || uploadingDocument ? 'Guardando...' : resident ? 'Actualizar' : 'Crear'}
        </Button>
      </div>
    </form>

    {/* Modal de confirmación para cambios de estado eliminado (no más acción rápida DECEASED) */}
  </>
  );
};
