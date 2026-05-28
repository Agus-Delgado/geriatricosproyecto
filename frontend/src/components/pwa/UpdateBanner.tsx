import React, { useEffect, useState } from 'react';
import { usePWA } from '../../contexts/PWAContext';

export const UpdateBanner: React.FC = () => {
  const { needRefresh, updateServiceWorker } = usePWA();
  const [isUpdating, setIsUpdating] = useState(false);
  const DISMISS_UNTIL_KEY = 'pwa_update_banner_dismissed_until';
  const DISMISS_TTL_MS = 2 * 60 * 60 * 1000;
  const [hidden, setHidden] = useState(() => {
    try {
      const untilRaw = sessionStorage.getItem(DISMISS_UNTIL_KEY);
      const until = untilRaw ? Number(untilRaw) : 0;
      return Number.isFinite(until) && until > Date.now();
    } catch {
      return false;
    }
  });

  useEffect(() => {
    if (!needRefresh) return;
    try {
      const untilRaw = sessionStorage.getItem(DISMISS_UNTIL_KEY);
      const until = untilRaw ? Number(untilRaw) : 0;
      setHidden(Number.isFinite(until) && until > Date.now());
    } catch {
      setHidden(false);
    }
  }, [needRefresh]);

  const handleUpdate = async () => {
    if (!updateServiceWorker) return;

    try {
      sessionStorage.setItem(DISMISS_UNTIL_KEY, String(Date.now() + DISMISS_TTL_MS));
    } catch {
      // ignore
    }
    setHidden(true);
    setIsUpdating(true);
    try {
      await updateServiceWorker(true);
    } catch {
      try {
        window.location.reload();
      } catch {
        return;
      }
      return;
    }

    setTimeout(() => {
      try {
        window.location.reload();
      } catch {
        return;
      }
    }, 600);
  };

  if (!needRefresh || !updateServiceWorker || hidden) {
    return null;
  }

  return (
    <div
      style={{
        position: 'fixed',
        bottom: 0,
        left: 0,
        right: 0,
        zIndex: 9999,
        backgroundColor: '#2563eb',
        color: 'white',
        padding: '1rem',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        boxShadow: '0 -4px 12px rgba(0, 0, 0, 0.2)',
        animation: 'slideUp 0.3s ease-out',
      }}
    >
      <style>
        {`
          @keyframes slideUp {
            from {
              transform: translateY(100%);
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
          Nueva versión disponible
        </div>
        <div style={{ fontSize: '0.875rem', opacity: 0.9 }}>
          Novedades:
          <div style={{ marginTop: '0.25rem' }}>
            - Papelera de pacientes (eliminar/restaurar)
            <br />
            - Mejoras y correcciones generales
          </div>
        </div>
      </div>
      
      <button
        onClick={handleUpdate}
        disabled={isUpdating}
        style={{
          backgroundColor: 'white',
          color: '#2563eb',
          fontWeight: 600,
          padding: '0.625rem 1.5rem',
          borderRadius: '0.5rem',
          border: 'none',
          cursor: isUpdating ? 'not-allowed' : 'pointer',
          fontSize: '0.9375rem',
          transition: 'all 0.2s ease',
          boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
          opacity: isUpdating ? 0.8 : 1,
        }}
        onMouseEnter={(e) => {
          if (isUpdating) return;
          e.currentTarget.style.transform = 'translateY(-2px)';
          e.currentTarget.style.boxShadow = '0 4px 8px rgba(0,0,0,0.15)';
        }}
        onMouseLeave={(e) => {
          if (isUpdating) return;
          e.currentTarget.style.transform = 'translateY(0)';
          e.currentTarget.style.boxShadow = '0 2px 4px rgba(0,0,0,0.1)';
        }}
      >
        {isUpdating ? 'Actualizando…' : 'Actualizar ahora'}
      </button>
    </div>
  );
};