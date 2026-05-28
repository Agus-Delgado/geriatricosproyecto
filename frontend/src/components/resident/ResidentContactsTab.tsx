import React, { useState, useEffect } from 'react';
import { contactsApi } from '../../api/contacts';
import { Button } from '../ui/Button';
import { LoadingSpinner } from '../ui/LoadingSpinner';
import { ErrorMessage } from '../ui/ErrorMessage';
import { Modal } from '../ui/Modal';
import { ConfirmDialog } from '../ui/ConfirmDialog';
import { ContactForm } from '../forms/ContactForm';
import type { ResidentContact } from '../../types/residents';
import type { ApiError } from '../../api/client';

interface ResidentContactsTabProps {
  residentId: string;
}

export const ResidentContactsTab: React.FC<ResidentContactsTabProps> = ({
  residentId,
}) => {
  const [contacts, setContacts] = useState<ResidentContact[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [selectedContact, setSelectedContact] = useState<ResidentContact | null>(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    loadContacts();
  }, [residentId]);

  const loadContacts = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await contactsApi.list(residentId);
      setContacts(data);
    } catch (err) {
      const apiError = err as ApiError;
      setError(apiError.detail || 'Error al cargar contactos');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateContact = async (data: any) => {
    try {
      await contactsApi.create(residentId, data);
      setShowCreateModal(false);
      loadContacts();
    } catch (err) {
      const apiError = err as ApiError;
      throw new Error(apiError.detail || 'Error al crear contacto');
    }
  };

  const handleUpdateContact = async (data: any) => {
    if (!selectedContact) return;

    try {
      await contactsApi.update(residentId, selectedContact.id, data);
      setShowEditModal(false);
      setSelectedContact(null);
      loadContacts();
    } catch (err) {
      const apiError = err as ApiError;
      throw new Error(apiError.detail || 'Error al actualizar contacto');
    }
  };

  const handleDeleteClick = (contact: ResidentContact) => {
    setSelectedContact(contact);
    setShowDeleteConfirm(true);
  };

  const handleDeleteContact = async () => {
    if (!selectedContact) return;

    try {
      setDeleting(true);
      await contactsApi.delete(residentId, selectedContact.id);
      setShowDeleteConfirm(false);
      setSelectedContact(null);
      loadContacts();
    } catch (err) {
      const apiError = err as ApiError;
      setError(apiError.detail || 'Error al eliminar contacto');
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-gray-900">Contactos</h3>
        <Button onClick={() => setShowCreateModal(true)}>
          Nuevo Contacto
        </Button>
      </div>

      {error && (
        <ErrorMessage message={error} onDismiss={() => setError(null)} />
      )}

      {loading ? (
        <div className="flex justify-center py-8">
          <LoadingSpinner />
        </div>
      ) : contacts.length === 0 ? (
        <div className="text-center text-gray-500 py-8">
          No hay contactos registrados
        </div>
      ) : (
        <div className="space-y-3">
          {contacts.map((contact) => (
            <div key={contact.id} className="card">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center space-x-2">
                    <h4 className="font-semibold text-gray-900">{contact.full_name}</h4>
                    {contact.is_primary && (
                      <span className="px-2 py-1 text-xs font-medium bg-blue-100 text-blue-800 rounded">
                        Principal
                      </span>
                    )}
                  </div>
                  {contact.relationship_type && (
                    <p className="text-sm text-gray-600 mt-1">Parentesco: {contact.relationship_type}</p>
                  )}
                  {contact.phone && (
                    <p className="text-sm text-gray-600 mt-1">Tel: {contact.phone}</p>
                  )}
                  {contact.email && (
                    <p className="text-sm text-gray-600 mt-1">Email: {contact.email}</p>
                  )}
                  {contact.address && (
                    <p className="text-sm text-gray-600 mt-1">Dirección: {contact.address}</p>
                  )}
                </div>
                <div className="flex space-x-2 ml-4">
                  <button
                    onClick={() => {
                      setSelectedContact(contact);
                      setShowEditModal(true);
                    }}
                    className="text-primary-600 hover:text-primary-800"
                  >
                    Editar
                  </button>
                  <button
                    onClick={() => handleDeleteClick(contact)}
                    className="text-red-600 hover:text-red-800"
                  >
                    Eliminar
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <Modal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        title="Nuevo Contacto"
        size="lg"
      >
        <ContactForm
          onSubmit={handleCreateContact}
          onCancel={() => setShowCreateModal(false)}
        />
      </Modal>

      <Modal
        isOpen={showEditModal}
        onClose={() => {
          setShowEditModal(false);
          setSelectedContact(null);
        }}
        title="Editar Contacto"
        size="lg"
      >
        {selectedContact && (
          <ContactForm
            contact={selectedContact}
            onSubmit={handleUpdateContact}
            onCancel={() => {
              setShowEditModal(false);
              setSelectedContact(null);
            }}
          />
        )}
      </Modal>

      <ConfirmDialog
        isOpen={showDeleteConfirm}
        onClose={() => {
          setShowDeleteConfirm(false);
          setSelectedContact(null);
        }}
        onConfirm={handleDeleteContact}
        title="Eliminar Contacto"
        message={`¿Estás seguro de que deseas eliminar el contacto "${selectedContact?.full_name}"? Esta acción no se puede deshacer.`}
        confirmText="Eliminar"
        cancelText="Cancelar"
        variant="danger"
        loading={deleting}
      />
    </div>
  );
};
