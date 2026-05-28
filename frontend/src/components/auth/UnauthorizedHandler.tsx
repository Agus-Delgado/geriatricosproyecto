import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { setUnauthorizedHandler } from '../../api/client';

/**
 * Componente que registra el handler global de errores 401.
 * Debe estar montado dentro del Router para tener acceso a useNavigate.
 */
export const UnauthorizedHandler: React.FC = () => {
  const navigate = useNavigate();
  const { logout } = useAuth();

  useEffect(() => {
    // Registrar el handler de 401
    setUnauthorizedHandler(() => {
      // Logging para diagnóstico
      if (import.meta.env.DEV) {
        console.debug('[Auth] Handler 401 ejecutado: sesión expirada o token inválido');
      }
      
      logout();
      
      // Solo navegar si no estamos ya en login para evitar loops
      if (window.location.pathname !== '/login') {
        navigate('/login', { 
          replace: true,
          state: { 
            message: 'Tu sesión expiró. Por favor, inicia sesión nuevamente.',
            reason: 'session_expired'
          }
        });
      }
    });

    // Cleanup: remover handler al desmontar
    return () => {
      setUnauthorizedHandler(() => {});
    };
  }, [navigate, logout]);

  return null;
};
