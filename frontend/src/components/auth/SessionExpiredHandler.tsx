import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { SessionExpiredModal } from './SessionExpiredModal';

/**
 * Componente que detecta cuando la sesión expira y muestra un modal.
 * El handler global de 401 en api/client.ts ya maneja la mayoría de los casos,
 * pero este componente puede detectar expiraciones silenciosas.
 */
export const SessionExpiredHandler: React.FC = () => {
  const { token, loadUser } = useAuth();
  const [showModal, setShowModal] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!token) {
      // Limpiar intervalo si no hay token
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      return;
    }

    // Verificar validez del token cada 10 minutos (menos agresivo)
    // El handler de 401 ya maneja la mayoría de los casos en tiempo real
    intervalRef.current = setInterval(async () => {
      try {
        await loadUser();
      } catch (error) {
        // Si falla, la sesión expiró
        // No mostrar modal si ya se está mostrando
        if (!showModal) {
          setShowModal(true);
        }
      }
    }, 10 * 60 * 1000); // 10 minutos

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [token, loadUser, showModal]);

  return <SessionExpiredModal isOpen={showModal} onClose={() => setShowModal(false)} />;
};
