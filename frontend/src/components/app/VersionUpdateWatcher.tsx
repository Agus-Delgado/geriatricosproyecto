import React, { useEffect, useState, useRef } from 'react';

interface VersionInfo {
  buildId: string;
  commit: string;
  commitShort?: string;
  builtAt: string;
}

interface VersionUpdateWatcherProps {
  intervalMs?: number;
  autoReload?: boolean;
}

const STORAGE_KEY = 'app_active_build_id';
const DEFAULT_INTERVAL_MS = 120000; // 2 minutos

export const VersionUpdateWatcher: React.FC<VersionUpdateWatcherProps> = ({
  intervalMs = DEFAULT_INTERVAL_MS,
  autoReload = false,
}) => {
  const [hasUpdate, setHasUpdate] = useState(false);
  const [isVisible, setIsVisible] = useState(false);
  const [isChecking, setIsChecking] = useState(false);
  const checkingRef = useRef(false);
  const intervalRef = useRef<number | null>(null);

  const checkVersion = async () => {
    // Prevenir checks concurrentes
    if (checkingRef.current) return;
    checkingRef.current = true;
    setIsChecking(true);

    try {
      // Fetch con cache: "no-store" y query param para evitar caché
      const timestamp = Date.now();
      const response = await fetch(`/version.json?t=${timestamp}`, {
        cache: 'no-store',
        headers: {
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache',
        },
      });

      if (!response.ok) {
        // Si falla, no hacer nada (podría ser que no existe aún en dev)
        return;
      }

      const versionInfo: VersionInfo = await response.json();
      const currentBuildId = localStorage.getItem(STORAGE_KEY);

      // Primera carga: guardar buildId sin avisar
      if (!currentBuildId) {
        localStorage.setItem(STORAGE_KEY, versionInfo.buildId);
        return;
      }

      // Si el buildId cambió, hay actualización disponible
      if (versionInfo.buildId !== currentBuildId) {
        setHasUpdate(true);
        setIsVisible(true);

        // Si autoReload está habilitado, recargar automáticamente
        if (autoReload) {
          localStorage.setItem(STORAGE_KEY, versionInfo.buildId);
          window.location.reload();
        }
      }
    } catch (error) {
      // Silenciosamente ignorar errores (red, servidor, etc.)
      console.debug('[VersionUpdateWatcher] Error checking version:', error);
    } finally {
      checkingRef.current = false;
      setIsChecking(false);
    }
  };

  useEffect(() => {
    // Check inicial después de un pequeño delay (para no bloquear el render inicial)
    const initialTimeoutId = window.setTimeout(() => {
      void checkVersion();
    }, 5000); // Esperar 5 segundos antes del primer check

    // Setup interval
    intervalRef.current = window.setInterval(() => {
      void checkVersion();
    }, intervalMs);

    // Check cuando la pestaña vuelve a ser visible
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        void checkVersion();
      }
    };

    // Check cuando la ventana recupera el foco
    const handleFocus = () => {
      void checkVersion();
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('focus', handleFocus);

    return () => {
      window.clearTimeout(initialTimeoutId);
      if (intervalRef.current !== null) {
        window.clearInterval(intervalRef.current);
      }
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('focus', handleFocus);
    };
  }, [intervalMs]);

  const handleUpdate = () => {
    // Obtener el último buildId antes de recargar
    const timestamp = Date.now();
    fetch(`/version.json?t=${timestamp}`, {
      cache: 'no-store',
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
      },
    })
      .then((res) => res.json())
      .then((versionInfo: VersionInfo) => {
        localStorage.setItem(STORAGE_KEY, versionInfo.buildId);
        window.location.reload();
      })
      .catch(() => {
        // Si falla, recargar de todas formas
        window.location.reload();
      });
  };

  const handleDismiss = () => {
    setIsVisible(false);
    // NO actualizar localStorage aquí para que vuelva a avisar luego
  };

  if (!hasUpdate || !isVisible) {
    return null;
  }

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        zIndex: 10000,
        backgroundColor: '#2563eb',
        color: 'white',
        padding: '1rem',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        boxShadow: '0 4px 12px rgba(0, 0, 0, 0.2)',
        animation: 'slideDown 0.3s ease-out',
      }}
    >
      <style>
        {`
          @keyframes slideDown {
            from {
              transform: translateY(-100%);
              opacity: 0;
            }
            to {
              transform: translateY(0);
              opacity: 1;
            }
          }
        `}
      </style>

      <div style={{ flex: 1, marginRight: '1rem' }}>
        <div style={{ fontWeight: 600, marginBottom: '0.25rem', fontSize: '1rem' }}>
          Hay una nueva versión disponible
        </div>
        <div style={{ fontSize: '0.875rem', opacity: 0.9 }}>
          La aplicación se ha actualizado. Actualiza para ver los últimos cambios.
        </div>
      </div>

      <div style={{ display: 'flex', gap: '0.5rem' }}>
        <button
          onClick={handleDismiss}
          style={{
            backgroundColor: 'transparent',
            color: 'white',
            fontWeight: 600,
            padding: '0.625rem 1rem',
            borderRadius: '0.5rem',
            border: '1px solid rgba(255, 255, 255, 0.3)',
            cursor: 'pointer',
            fontSize: '0.9375rem',
            transition: 'all 0.2s ease',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.1)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = 'transparent';
          }}
        >
          Más tarde
        </button>
        <button
          onClick={handleUpdate}
          disabled={isChecking}
          style={{
            backgroundColor: 'white',
            color: '#2563eb',
            fontWeight: 600,
            padding: '0.625rem 1.5rem',
            borderRadius: '0.5rem',
            border: 'none',
            cursor: isChecking ? 'not-allowed' : 'pointer',
            fontSize: '0.9375rem',
            transition: 'all 0.2s ease',
            boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
            opacity: isChecking ? 0.8 : 1,
          }}
          onMouseEnter={(e) => {
            if (!isChecking) {
              e.currentTarget.style.transform = 'translateY(-2px)';
              e.currentTarget.style.boxShadow = '0 4px 8px rgba(0,0,0,0.15)';
            }
          }}
          onMouseLeave={(e) => {
            if (!isChecking) {
              e.currentTarget.style.transform = 'translateY(0)';
              e.currentTarget.style.boxShadow = '0 2px 4px rgba(0,0,0,0.1)';
            }
          }}
        >
          {isChecking ? 'Actualizando…' : 'Actualizar ahora'}
        </button>
      </div>
    </div>
  );
};