import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useNavigate, useLocation } from 'react-router-dom';
import { getRoleLabel } from '../../types/auth';
import { BugReportButton } from '../support/BugReportButton';

interface HeaderProps {
  title?: string;
  showBack?: boolean;
}

export const Header: React.FC<HeaderProps> = ({ title, showBack = false }) => {
  const { user, logout, getMemberships, getActiveMembership, getActiveRole, isOwner } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [showUserMenu, setShowUserMenu] = useState(false);
  const userMenuRef = useRef<HTMLDivElement>(null);
  
  const memberships = getMemberships();
  const activeMembership = getActiveMembership();
  
  // Detectar si estamos en una ruta /g/* para mostrar botón "Volver"
  const isGeriatricRoute = location.pathname.startsWith('/g/');
  
  // Detectar rutas médicas que necesitan botón volver
  const isMedicalRoute = 
    location.pathname.startsWith('/medical-folder') ||
    location.pathname.startsWith('/clinical-history') ||
    location.pathname.startsWith('/prescriptions-history');
  
  // Detectar si estamos en una ruta interna (no login, no select-facility)
  const isInternalRoute = !location.pathname.startsWith('/login') && location.pathname !== '/select-facility';
  
  // Detectar si estamos en dashboard raíz (no mostrar flecha aquí)
  const isRootDashboard = 
    location.pathname === '/' ||
    location.pathname.match(/^\/g\/[^/]+\/(dashboard|medical|tasks)$/) !== null;
  
  // Determinar si debemos mostrar botón volver
  // No mostrar en dashboard raíz, pero sí en sub-rutas y secciones
  const shouldShowBack = (showBack || isGeriatricRoute || isMedicalRoute) && !isRootDashboard;

  // Cerrar menú de usuario al hacer click fuera
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (userMenuRef.current && !userMenuRef.current.contains(event.target as Node)) {
        setShowUserMenu(false);
      }
    };

    if (showUserMenu) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showUserMenu]);

  const handleLogout = () => {
    logout();
    navigate('/login', { replace: true });
  };

  const handleChangeFacility = () => {
    navigate('/select-facility');
  };

  const handleBack = () => {
    // Lógica robusta: determinar fallback según la ruta actual
    let fallbackPath = '/select-facility';
    
    if (isMedicalRoute) {
      // Para rutas médicas, volver al dashboard médico si hay facility activa
      if (activeMembership?.facility_id) {
        fallbackPath = `/g/${activeMembership.facility_id}/medical`;
      } else {
        fallbackPath = '/select-facility';
      }
    } else if (isGeriatricRoute) {
      // Para rutas geriátricas, intentar volver al dashboard correspondiente
      const facilityId = location.pathname.match(/\/g\/([^/]+)/)?.[1];
      if (facilityId) {
        const role = getActiveRole();
        if (isOwner) fallbackPath = `/g/${facilityId}/owner`;
        else if (role === 'ADMIN') fallbackPath = `/g/${facilityId}/dashboard`;
        else if (role === 'MEDICO') fallbackPath = `/g/${facilityId}/medical`;
        else if (role === 'STAFF') fallbackPath = `/g/${facilityId}/tasks`;
        else fallbackPath = `/g/${facilityId}/dashboard`;
      }
    }
    
    // Si hay historial suficiente, volver atrás, sino usar fallback
    if (window.history.length > 1) {
      navigate(-1);
    } else {
      navigate(fallbackPath);
    }
  };


  // Permiso para ver noticias diarias (ADMIN/MEDICO/STAFF)
  const role = getActiveRole();
  const canViewNews = isOwner || role === 'ADMIN' || role === 'MEDICO' || role === 'STAFF';
  
  // Permiso para reportar error: cualquier usuario autenticado
  const canReportError = Boolean(user);

  // Solo mostrar header en rutas internas
  if (!isInternalRoute) {
    return null;
  }

  return (
    <header className="bg-white border-b border-gray-200 sticky top-0 z-30">
      <div className="px-4 py-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          {/* Sección izquierda: Botón Volver (si aplica) + Título + Facility */}
          <div className="flex items-center space-x-3 flex-1 min-w-0">
            {/* Botón Volver para rutas /g/*, rutas médicas o si showBack está activo */}
            {shouldShowBack && (
              <button
                onClick={handleBack}
                className="flex-shrink-0 text-gray-600 hover:text-gray-800 transition-colors p-2 -ml-2"
                aria-label="Volver"
              >
                <svg className="w-7 h-7 sm:w-6 sm:h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </button>
            )}
            
            <div className="flex-1 min-w-0">
              {title && <h1 className="text-lg font-semibold text-gray-900 truncate">{title}</h1>}
              {activeMembership && (
                <button
                  className="text-sm text-gray-600 truncate font-semibold hover:underline focus:underline max-w-full"
                  style={{ color: 'var(--facility-accent)', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
                  onClick={() => {
                    // Navegar al panel principal del hogar
                    const role = getActiveRole();
                    if (isOwner) navigate(`/g/${activeMembership.facility_id}/owner`);
                    else if (role === 'ADMIN') navigate(`/g/${activeMembership.facility_id}/dashboard`);
                    else if (role === 'MEDICO') navigate(`/g/${activeMembership.facility_id}/medical`);
                    else if (role === 'STAFF') navigate(`/g/${activeMembership.facility_id}/tasks`);
                    else navigate(`/g/${activeMembership.facility_id}/dashboard`);
                  }}
                  title="Ir al panel principal"
                >
                  {activeMembership.facility_name}
                </button>
              )}
            </div>
          </div>

          {/* Sección derecha: Noticias diarias + Reportar Error + Cambiar Hogar + Menú Usuario */}
          <div className="flex items-center gap-2 flex-shrink-0 max-w-full">
            {canViewNews && (
              <button
                onClick={() => navigate('/activity')}
                className="px-2 sm:px-3 py-1.5 text-sm font-medium text-primary-700 hover:text-primary-900 hover:bg-primary-50 rounded-lg transition-colors whitespace-nowrap"
              >
                <span className="sm:hidden">Noticias</span>
                <span className="hidden sm:inline">Noticias diarias</span>
              </button>
            )}
            {/* Botón "Reportar Error" visible para usuarios autenticados (no en rutas de impresión) */}
            {canReportError && !location.pathname.includes('/print') && (
              <BugReportButton />
            )}
            {/* Botón "Cambiar Hogar" visible cuando hay múltiples memberships */}
            {user && memberships.length > 1 && (
              <button
                onClick={handleChangeFacility}
                className="px-2 sm:px-3 py-1.5 text-sm font-medium text-gray-700 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors whitespace-nowrap"
              >
                <span className="sm:hidden">Hogar</span>
                <span className="hidden sm:inline">Cambiar Hogar</span>
              </button>
            )}
            
            {user && (
              <div className="relative" ref={userMenuRef}>
                <button
                  onClick={() => setShowUserMenu(!showUserMenu)}
                  className="flex items-center space-x-2 p-2 rounded-full hover:bg-gray-100 transition-colors"
                  aria-label="Menú de usuario"
                >
                  <svg
                    className="w-6 h-6 text-gray-600"
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
                </button>

                {showUserMenu && (
                  <div className="absolute right-0 top-full mt-2 bg-white border border-gray-200 rounded-lg shadow-lg z-50 min-w-[200px]">
                    <div className="py-2">
                      <div className="px-4 py-2 border-b border-gray-200">
                        <p className="text-sm font-medium text-gray-900">
                          {user.full_name || user.email || user.dni || 'Usuario'}
                        </p>
                        {getActiveRole() && (
                          <p className="text-xs text-gray-500 mt-1">
                            {getRoleLabel(getActiveRole()!)}
                          </p>
                        )}
                      </div>
                      <button
                        onClick={() => {
                          setShowUserMenu(false);
                          navigate('/mi-cuenta');
                        }}
                        className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                      >
                        Mi cuenta
                      </button>
                      <button
                        onClick={() => {
                          setShowUserMenu(false);
                          handleLogout();
                        }}
                        className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                      >
                        Cerrar sesión
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};
