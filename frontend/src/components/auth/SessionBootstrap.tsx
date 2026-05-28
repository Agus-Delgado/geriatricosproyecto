import { useEffect, useState, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { updateActivityTimestamp, checkInactivityTimeout, clearSessionStorage } from '../../utils/session';
import { LoadingSpinner } from '../ui/LoadingSpinner';

const PUBLIC_ROUTES = ['/login', '/register', '/verify-email', '/reset-password'];

export const SessionBootstrap: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { token, user, isBootstrapping, activeFacilityId } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [isReady, setIsReady] = useState(false);
  const inactivityIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const hasNavigatedRef = useRef(false);

  // Verificar si estamos en ruta pública
  const isPublicRoute = PUBLIC_ROUTES.some(route => 
    location.pathname === route || location.pathname.startsWith(route + '/')
  );

  // Effect principal: esperar a que AuthContext termine
  useEffect(() => {
    console.log('[SessionBootstrap] estado:', {
      path: location.pathname,
      isPublicRoute,
      isBootstrapping,
      hasToken: !!token,
      hasUser: !!user,
      activeFacilityId
    });

    // Rutas públicas: permitir siempre
    if (isPublicRoute) {
      console.log('[SessionBootstrap] ruta pública, ready');
      setIsReady(true);
      return;
    }

    // Esperar a que AuthContext termine de bootstrapear
    if (isBootstrapping) {
      console.log('[SessionBootstrap] esperando AuthContext...');
      setIsReady(false);
      return;
    }

    // AuthContext terminó - verificar estado
    if (!token || !user) {
      // No hay sesión válida, redirigir a login
      if (!hasNavigatedRef.current) {
        console.log('[SessionBootstrap] sin sesión, redirigir a login');
        hasNavigatedRef.current = true;
        navigate('/login', { replace: true });
      }
      return;
    }

    // Hay sesión válida - verificar si necesita seleccionar facility
    const needsFacilitySelection = 
      !user.is_platform_admin && // Platform admin puede no tener facility
      !activeFacilityId && // No hay facility activa
      user.memberships && user.memberships.length > 0; // Tiene memberships disponibles

    if (needsFacilitySelection && location.pathname !== '/select-facility') {
      if (!hasNavigatedRef.current) {
        console.log('[SessionBootstrap] necesita seleccionar facility');
        hasNavigatedRef.current = true;
        navigate('/select-facility', { replace: true });
      }
      return;
    }

    // Todo OK, permitir render
    console.log('[SessionBootstrap] sesión válida, ready');
    setIsReady(true);
    hasNavigatedRef.current = false; // Reset para futuras navegaciones
  }, [isBootstrapping, token, user, activeFacilityId, location.pathname, isPublicRoute, navigate]);

  // Timeout por inactividad (60 minutos)
  useEffect(() => {
    if (!token || !user || isPublicRoute) {
      if (inactivityIntervalRef.current) {
        clearInterval(inactivityIntervalRef.current);
        inactivityIntervalRef.current = null;
      }
      return;
    }

    updateActivityTimestamp();

    const handleActivity = () => {
      updateActivityTimestamp();
    };

    const activityEvents: (keyof WindowEventMap)[] = ['click', 'keydown', 'mousemove', 'scroll'];
    activityEvents.forEach(event => {
      window.addEventListener(event, handleActivity, { passive: true });
    });

    inactivityIntervalRef.current = setInterval(() => {
      if (checkInactivityTimeout(60)) {
        console.log('[SessionBootstrap] timeout por inactividad');
        clearSessionStorage();
        navigate('/login?reason=inactivity', { replace: true });
      }
    }, 5 * 60 * 1000); // Verificar cada 5 minutos

    return () => {
      activityEvents.forEach(event => {
        window.removeEventListener(event, handleActivity);
      });
      if (inactivityIntervalRef.current) {
        clearInterval(inactivityIntervalRef.current);
        inactivityIntervalRef.current = null;
      }
    };
  }, [token, user, isPublicRoute, navigate]);

  // Mostrar loader mientras bootstrapea o no está ready
  if (isBootstrapping || (!isReady && !isPublicRoute)) {
    return <LoadingSpinner fullScreen />;
  }

  return <>{children}</>;
};