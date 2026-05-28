import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { authApi } from '../api/auth';
import { Input } from '../components/ui/Input';
import { ErrorMessage } from '../components/ui/ErrorMessage';
import { LoadingSpinner } from '../components/ui/LoadingSpinner';
import { Modal } from '../components/ui/Modal';

export const LoginPage: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { login, user, token } = useAuth();

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const [showResetModal, setShowResetModal] = useState(false);
  const [resetEmail, setResetEmail] = useState('');
  const [resetLoading, setResetLoading] = useState(false);
  const [resetMessage, setResetMessage] = useState<string | null>(null);

  // Leer mensaje del state de navegación (cuando viene de sesión expirada)
  useEffect(() => {
    const state = location.state as { message?: string; reason?: string } | null;
    if (state?.message) {
      setError(state.message);
      // Limpiar el state para que no se muestre en recargas
      window.history.replaceState({}, document.title);
    }
  }, [location.state]);

  // Si ya está autenticado, redirigir según rol/memberships (solo una vez)
  const hasRedirectedRef = React.useRef(false);
  useEffect(() => {
    if (token && user && !hasRedirectedRef.current) {
      hasRedirectedRef.current = true;
      redirectAfterLogin();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, user]);

  const redirectAfterLogin = () => {
    if (!user) return;

    // Platform admin -> /platform
    if (user.is_platform_admin) {
      navigate('/platform', { replace: true });
      return;
    }

    const memberships = user.memberships.filter(m => m.is_active);

    // Sin memberships -> error (no debería pasar)
    if (memberships.length === 0) {
      setError('Usuario sin acceso asignado');
      return;
    }

    // Si hay active_facility_id, redirigir según rol en esa facility
    if (user.active_facility_id) {
      const activeMembership = memberships.find(m => m.facility_id === user.active_facility_id);
      if (activeMembership) {
        redirectByRole(activeMembership.role, user.active_facility_id);
        return;
      }
    }

    // Si solo hay una membership, setearla automáticamente y redirigir
    if (memberships.length === 1) {
      // El backend debería setearla automáticamente, pero por si acaso
      // aquí simplemente redirigimos al selector que la seteará
      navigate('/select-facility', { replace: true });
      return;
    }

    // Múltiples memberships -> selector
    if (memberships.length > 1) {
      navigate('/select-facility', { replace: true });
      return;
    }
  };

  const redirectByRole = (role: 'ADMIN' | 'MEDICO' | 'STAFF', facilityId: string) => {
    switch (role) {
      case 'ADMIN':
        navigate(`/g/${facilityId}/dashboard`, { replace: true });
        break;
      case 'MEDICO':
        navigate(`/g/${facilityId}/medical`, { replace: true });
        break;
      case 'STAFF':
        navigate(`/g/${facilityId}/tasks`, { replace: true });
        break;
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      await login(username, password);
      // redirectAfterLogin se ejecutará en el useEffect cuando user se actualice
    } catch (err: any) {
      const errorMessage = err instanceof Error ? err.message : 'Error al iniciar sesión';
      setError(errorMessage);
      setLoading(false);
    }
  };

  // Fondo con imagen ilustrada o fallback a gradient violeta
  const fallbackGradient = 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)';
  const [imageError, setImageError] = useState(false);

  const backgroundStyle: React.CSSProperties = imageError
    ? { background: fallbackGradient }
    : {
        backgroundImage: 'url(/backgrounds/login-bg.png)',
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundRepeat: 'no-repeat',
        backgroundColor: '#667eea', // Fallback color si la imagen no carga
      };

  return (
    <div
      className="min-h-screen flex items-center justify-center px-4 py-8 relative"
      style={backgroundStyle}
    >
      {/* Overlay oscuro para mejorar legibilidad (solo si hay imagen) */}
      {!imageError && (
        <div 
          className="absolute inset-0"
          style={{ background: 'rgba(0, 0, 0, 0.35)' }}
        />
      )}
      
      {/* Imagen oculta para detectar error */}
      <img
        src="/backgrounds/login-bg.png"
        alt=""
        className="hidden"
        onError={() => setImageError(true)}
      />

      <div className="w-full max-w-md relative z-10">
        <div className="bg-white rounded-3xl shadow-2xl p-8 border border-gray-100">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              Hogares de Cuidado y Cariño
            </h1>
            <p className="text-gray-600 text-sm">Acceso gestionado por administradores</p>
          </div>

          {error && (
            <div className="mb-6">
              <ErrorMessage message={error} onDismiss={() => {
                setError(null);
              }} />
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <Input
              label="DNI o Usuario"
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
              autoComplete="username"
              disabled={loading}
              className="w-full"
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

            <Input
              label="Contraseña"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              autoComplete="current-password"
              disabled={loading}
              className="w-full"
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
                    d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
                  />
                </svg>
              }
            />

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
                </span>
              ) : (
                'Iniciar sesión'
              )}
            </button>
          </form>

          <div className="mt-6 pt-6 border-t border-gray-200">
            <div className="text-center text-sm text-gray-600">
              <button
                type="button"
                onClick={() => {
                  setResetMessage(null);
                  setResetEmail('');
                  setShowResetModal(true);
                }}
                className="text-blue-600 hover:text-blue-800 font-medium"
              >
                ¿Olvidaste tu contraseña?
              </button>
            </div>
          </div>
        </div>
      </div>

      <Modal
        isOpen={showResetModal}
        onClose={() => {
          setShowResetModal(false);
          setResetMessage(null);
        }}
        title="Restablecer contraseña"
        size="md"
      >
        <form
          onSubmit={async (e) => {
            e.preventDefault();
            setResetLoading(true);
            setResetMessage(null);
            try {
              await authApi.requestPasswordReset(resetEmail.trim().toLowerCase());
              setResetMessage('Si el email es válido, te enviaremos un enlace para restablecer tu contraseña.');
            } catch {
              setResetMessage('Si el email es válido, te enviaremos un enlace para restablecer tu contraseña.');
            } finally {
              setResetLoading(false);
            }
          }}
          className="space-y-4"
        >
          <Input
            label="Email"
            type="email"
            value={resetEmail}
            onChange={(e) => setResetEmail(e.target.value)}
            required
            disabled={resetLoading}
            placeholder="Ingresá tu email"
          />

          {resetMessage && (
            <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
              <p className="text-sm text-green-800">{resetMessage}</p>
            </div>
          )}

          <button
            type="submit"
            disabled={resetLoading}
            className="w-full py-3 px-6 rounded-lg text-white font-medium shadow-md hover:shadow-lg transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
            style={{ background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' }}
          >
            {resetLoading ? 'Enviando...' : 'Enviar enlace'}
          </button>
        </form>
      </Modal>
    </div>
  );
};
