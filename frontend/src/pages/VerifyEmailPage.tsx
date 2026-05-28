import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { authApi } from '../api/auth';
import { LoadingSpinner } from '../components/ui/LoadingSpinner';
import { ResendVerificationForm } from '../components/auth/ResendVerificationForm';

export const VerifyEmailPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [message, setMessage] = useState<string>('');

  useEffect(() => {
    const token = searchParams.get('token');
    
    if (!token) {
      setStatus('error');
      setMessage('No se proporcionó un token de verificación.');
      return;
    }

    const verifyEmail = async () => {
      try {
        const response = await authApi.verifyEmail({ token });
        setStatus('success');
        setMessage(response.message);
      } catch (err: any) {
        setStatus('error');
        setMessage(err.response?.data?.detail || 'Enlace inválido o expirado');
      }
    };

    verifyEmail();
  }, [searchParams]);

  const fallbackGradient = 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)';

  return (
    <div
      className="min-h-screen flex items-center justify-center px-4 py-8"
      style={{ background: fallbackGradient }}
    >
      <div className="w-full max-w-md">
        <div className="bg-white rounded-3xl shadow-2xl p-8 border border-gray-100">
          {status === 'loading' && (
            <div className="text-center">
              <LoadingSpinner size="lg" />
              <p className="mt-4 text-gray-600">Verificando tu email...</p>
            </div>
          )}

          {status === 'success' && (
            <div className="text-center">
              <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-green-100 mb-4">
                <svg
                  className="h-8 w-8 text-green-600"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M5 13l4 4L19 7"
                  />
                </svg>
              </div>
              <h1 className="text-2xl font-bold text-gray-900 mb-2">
                ¡Email verificado!
              </h1>
              <p className="text-gray-600 mb-6">{message}</p>
              <button
                onClick={() => navigate('/login')}
                className="w-full py-3 px-6 rounded-lg text-white font-medium shadow-md hover:shadow-lg transition-all duration-200"
                style={{
                  background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                }}
              >
                Ir al login
              </button>
            </div>
          )}

          {status === 'error' && (
            <div className="text-center">
              <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-red-100 mb-4">
                <svg
                  className="h-8 w-8 text-red-600"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </div>
              <h1 className="text-2xl font-bold text-gray-900 mb-2">
                Enlace inválido o expirado
              </h1>
              <p className="text-gray-600 mb-6">{message}</p>
              
              <div className="mt-6">
                <p className="text-sm text-gray-600 mb-4">
                  ¿No recibiste el email? Podés solicitar un nuevo enlace de verificación:
                </p>
                <ResendVerificationForm />
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
