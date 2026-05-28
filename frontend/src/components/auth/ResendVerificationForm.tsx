import React, { useState } from 'react';
import { authApi } from '../../api/auth';
import { Input } from '../ui/Input';
import { ErrorMessage } from '../ui/ErrorMessage';
import { LoadingSpinner } from '../ui/LoadingSpinner';

interface ResendVerificationFormProps {
  onSuccess?: () => void;
}

export const ResendVerificationForm: React.FC<ResendVerificationFormProps> = ({ onSuccess }) => {
  const [emailOrDni, setEmailOrDni] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    setLoading(true);

    try {
      const response = await authApi.resendVerification({ email_or_dni: emailOrDni });
      setSuccess(response.message);
      setEmailOrDni('');
      if (onSuccess) {
        onSuccess();
      }
    } catch (err: any) {
      if (err.response?.status === 429) {
        setError(err.response?.data?.detail || 'Demasiados intentos. Esperá unos minutos antes de intentar nuevamente.');
      } else {
        setError(err.response?.data?.detail || 'Error al reenviar verificación. Intentá nuevamente.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full max-w-md mx-auto">
      <form onSubmit={handleSubmit} className="space-y-4">
        <Input
          label="Email o DNI"
          type="text"
          value={emailOrDni}
          onChange={(e) => setEmailOrDni(e.target.value)}
          required
          disabled={loading}
          placeholder="Ingresá tu email o DNI"
          icon={
            <svg
              className="w-5 h-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
              />
            </svg>
          }
        />

        {error && (
          <ErrorMessage message={error} onDismiss={() => setError(null)} />
        )}

        {success && (
          <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
            <p className="text-sm text-green-800">{success}</p>
          </div>
        )}

        <button
          type="submit"
          disabled={loading}
          className="w-full py-3 px-6 rounded-lg text-white font-medium shadow-md hover:shadow-lg transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
          style={{
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          }}
        >
          {loading ? (
            <span className="flex items-center justify-center">
              <LoadingSpinner size="sm" />
              <span className="ml-2">Enviando...</span>
            </span>
          ) : (
            'Reenviar verificación'
          )}
        </button>
      </form>
    </div>
  );
};
