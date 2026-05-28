import React, { useEffect, useState, useRef } from 'react';
import { Navigate, useParams, useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useFacility } from '../../contexts/FacilityContext';
import { syncActiveFacility } from '../../utils/session';
import { LoadingSpinner } from '../ui/LoadingSpinner';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requireOwner?: boolean;
  requireFacility?: boolean;
  requireRole?: 'ADMIN' | 'MEDICO' | 'STAFF';
  requireRoles?: ('ADMIN' | 'MEDICO' | 'STAFF')[];
  requirePlatformAdmin?: boolean;
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({
  children,
  requireOwner = false,
  requireFacility = true,
  requireRole,
  requireRoles,
  requirePlatformAdmin = false,
}) => {
  const {
    user,
    token,
    loading: authLoading,
    isOwner,
    isPlatformAdmin,
    getActiveRole,
    activeFacilityId,
    setActiveFacility,
    getMemberships,
  } = useAuth();

  const { facility, loading: facilityLoading } = useFacility();

  const params = useParams();
  const location = useLocation();

  const [syncingFacility, setSyncingFacility] = useState(false);
  const [syncFailed, setSyncFailed] = useState(false);
  const syncingRef = useRef(false); // Prevenir loops infinitos

  // Detectar si estamos en una ruta /g/:id/*
  const urlFacilityId = params.id;
  const isGeriatricRoute = location.pathname.startsWith('/g/');

  // Determinar si realmente debemos exigir facility (platform admin no la necesita)
  const mustHaveFacility = requireFacility && !isPlatformAdmin;

  // Hook SIEMPRE arriba (sin returns antes)
  useEffect(() => {
    if (!user || authLoading) return;
    
    // Prevenir ejecución concurrente
    if (syncingRef.current) return;

    // Sincronizar activeFacilityId desde backend (fuente de verdad) - solo localStorage
    if (user.active_facility_id !== activeFacilityId) {
      syncActiveFacility(user);
    }

    // Solo sincronizamos si: se requiere facility, no es platform admin, estamos en /g/:id/*, hay id, hay usuario y ya terminó authLoading
    if (!mustHaveFacility) return;
    if (!isGeriatricRoute) return;
    if (!urlFacilityId) return;

    // Reset del error si cambia el id
    setSyncFailed(false);

    const memberships = getMemberships();
    const hasMembership = memberships.some(m => m.facility_id === urlFacilityId && m.is_active);
    if (!hasMembership) return;

    // Solo sincronizar si realmente es necesario y no estamos ya sincronizando
    if (activeFacilityId !== urlFacilityId && !syncingFacility) {
      syncingRef.current = true;
      setSyncingFacility(true);
      setActiveFacility(urlFacilityId)
        .catch(() => {
          // Si no se puede sincronizar, marcamos fallo para evitar loop infinito
          setSyncFailed(true);
        })
        .finally(() => {
          setSyncingFacility(false);
          // Permitir nueva sincronización después de un breve delay para evitar loops
          setTimeout(() => {
            syncingRef.current = false;
          }, 100);
        });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mustHaveFacility, isGeriatricRoute, urlFacilityId, user, authLoading]);

  // 1) Verificar token primero
  if (!token) {
    return <Navigate to="/login" replace />;
  }

  // 2) Loading de auth
  if (authLoading) {
    return <LoadingSpinner fullScreen />;
  }

  // 3) Si hay token pero no hay user, redirigir (evita blancos por estados intermedios)
  if (!user) {
    return <Navigate to="/login" replace />;
  }

  // 4) Verificar platform admin si es requerido
  if (requirePlatformAdmin && !isPlatformAdmin) {
    return <Navigate to="/residents" replace />;
  }

  // 5) Verificar OWNER legacy si es requerido
  if (requireOwner && !isOwner) {
    return <Navigate to="/residents" replace />;
  }

  // 6) Facility requerida (solo si NO es platform admin)
  if (mustHaveFacility) {
    // Si falló la sincronización, no quedarnos en spinner infinito
    if (syncFailed) {
      return <Navigate to="/select-facility" replace />;
    }

    // Si estamos sincronizando o cargando facility, spinner
    if (syncingFacility || facilityLoading) {
      return <LoadingSpinner fullScreen />;
    }

    // Validar que activeFacilityId existe Y está en memberships activos
    if (activeFacilityId) {
      const memberships = getMemberships();
      const hasValidMembership = memberships.some(m => m.facility_id === activeFacilityId && m.is_active);
      
      if (!hasValidMembership) {
        // activeFacilityId inválido, redirigir inmediatamente
        return <Navigate to="/select-facility" replace />;
      }
    }

    // Si estamos en /g/:id/* verificar membership
    if (isGeriatricRoute && urlFacilityId) {
      const memberships = getMemberships();
      const hasMembership = memberships.some(m => m.facility_id === urlFacilityId && m.is_active);

      if (!hasMembership) {
        return <Navigate to="/select-facility" replace />;
      }

      // Si todavía no se reflejó activeFacilityId, esperamos (el useEffect lo va a setear)
      if (!activeFacilityId) {
        return <LoadingSpinner fullScreen />;
      }
    } else {
      // No es ruta /g/:id/*, entonces debe existir facility seleccionada
      if (!facility && !activeFacilityId) {
        return <Navigate to="/select-facility" replace />;
      }
    }
  }

  // 7) Verificar rol requerido (si no es platform admin)
  // Soporta tanto requireRole (string) como requireRoles (array)
  const rolesToCheck = requireRoles || (requireRole ? [requireRole] : null);
  
  if (rolesToCheck && rolesToCheck.length > 0 && !isPlatformAdmin) {
    let roleToCheck: 'ADMIN' | 'MEDICO' | 'STAFF' | null = null;

    if (isGeriatricRoute && urlFacilityId) {
      const memberships = getMemberships();
      const membership = memberships.find(m => m.facility_id === urlFacilityId && m.is_active);
      roleToCheck = membership?.role ?? null;
    } else {
      roleToCheck = getActiveRole();
    }

    // Verificar si el rol del usuario está en la lista de roles permitidos
    if (!roleToCheck || !rolesToCheck.includes(roleToCheck)) {
      const currentFacilityId = urlFacilityId ?? activeFacilityId ?? user.active_facility_id;
      if (currentFacilityId) {
        if (roleToCheck === 'ADMIN') return <Navigate to={`/g/${currentFacilityId}/dashboard`} replace />;
        if (roleToCheck === 'MEDICO') return <Navigate to={`/g/${currentFacilityId}/medical`} replace />;
        if (roleToCheck === 'STAFF') return <Navigate to={`/g/${currentFacilityId}/tasks`} replace />;
      }
      return <Navigate to="/select-facility" replace />;
    }
  }

  return <>{children}</>;
};
