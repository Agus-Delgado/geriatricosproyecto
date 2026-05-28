import { useState } from 'react';
import { useLocation } from 'react-router-dom';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { supportApi } from '../../api/support';
import { useAuth } from '../../contexts/AuthContext';
import type { ApiError } from '../../api/client';

export function BugReportButton() {
  const location = useLocation();
  const { user, activeFacilityId } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [sending, setSending] = useState(false);

  const open = () => {
    setError(null);
    setIsOpen(true);
  };

  const close = () => {
    if (sending) return;
    setIsOpen(false);
  };

  const submit = async () => {
    if (!message || message.trim().length < 3) {
      setError('Por favor, describí el problema (mínimo 3 caracteres).');
      return;
    }

    try {
      setSending(true);
      setError(null);
      await supportApi.bugReport({
        message: message.trim(),
        path: location.pathname,
        facility_id: activeFacilityId || undefined,
        build_id: typeof __APP_BUILD_ID__ !== 'undefined' ? __APP_BUILD_ID__ : undefined,
        build_time: typeof __APP_BUILD_TIME__ !== 'undefined' ? __APP_BUILD_TIME__ : undefined,
        user_agent: typeof navigator !== 'undefined' ? navigator.userAgent : undefined,
      });
      setIsOpen(false);
      setMessage('');
    } catch (e) {
      const apiError = e as ApiError;
      setError(apiError.detail || 'Error al enviar reporte');
    } finally {
      setSending(false);
    }
  };

  return (
    <>
      <button
        onClick={open}
        className="px-2 sm:px-3 py-1.5 text-sm font-medium text-gray-700 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors whitespace-nowrap"
        title="Reportar un error"
      >
        <span className="sm:hidden">Ayuda</span>
        <span className="hidden sm:inline">Reportar error</span>
      </button>

      <Modal isOpen={isOpen} onClose={close} title="Reportar un error" size="lg">
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <Input label="Usuario" value={user?.full_name || ''} disabled />
            <Input label="Email" value={user?.email || ''} disabled />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Mensaje</label>
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 min-h-[140px]"
              placeholder="Describí qué pasó, qué estabas haciendo y qué esperabas que ocurra..."
              disabled={sending}
            />
          </div>

          {error && <div className="text-sm text-red-600">{error}</div>}

          <div className="flex gap-3">
            <Button variant="secondary" onClick={close} fullWidth disabled={sending}>
              Cancelar
            </Button>
            <Button onClick={submit} fullWidth disabled={sending}>
              {sending ? 'Enviando...' : 'Enviar'}
            </Button>
          </div>
        </div>
      </Modal>
    </>
  );
}
