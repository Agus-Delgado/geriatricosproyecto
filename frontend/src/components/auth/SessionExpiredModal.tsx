import React from 'react';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';

interface SessionExpiredModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const SessionExpiredModal: React.FC<SessionExpiredModalProps> = ({
  isOpen,
  onClose,
}) => {
  const navigate = useNavigate();
  const { logout } = useAuth();

  const handleLogin = () => {
    logout();
    onClose();
    navigate('/login', { replace: true });
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Sesión Expirada"
      size="sm"
    >
      <div className="space-y-4">
        <p className="text-gray-700">
          Tu sesión ha expirado por seguridad. Por favor, inicia sesión nuevamente.
        </p>
        <Button onClick={handleLogin} fullWidth>
          Ir a Iniciar Sesión
        </Button>
      </div>
    </Modal>
  );
};
