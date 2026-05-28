import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { LoadingSpinner } from '../components/ui/LoadingSpinner';
import { ErrorMessage } from '../components/ui/ErrorMessage';
import { getRoleLabel } from '../types/auth';
import { getFacilityTheme } from '../theme/facilityTheme';

export const SelectFacilityPage: React.FC = () => {
  const { user, setActiveFacility, getMemberships, loading: authLoading, activeFacilityId, isOwner } = useAuth();
  const navigate = useNavigate();
  const [loadingFacilityId, setLoadingFacilityId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [imageErrors, setImageErrors] = useState<Record<string, boolean>>({});

  const redirectByRole = (role: 'ADMIN' | 'MEDICO' | 'STAFF', facilityId: string) => {
    // Si el usuario es OWNER global, su panel principal por sede es /g/:id/owner
    if (isOwner) {
      navigate(`/g/${facilityId}/owner`);
      return;
    }

    switch (role) {
      case 'ADMIN':
        navigate(`/g/${facilityId}/dashboard`);
        break;
      case 'MEDICO':
        navigate(`/g/${facilityId}/medical`);
        break;
      case 'STAFF':
        navigate(`/g/${facilityId}/tasks`);
        break;
    }
  };

  const handleSelectFacility = async (facilityId: string, role: 'ADMIN' | 'MEDICO' | 'STAFF') => {
    setError(null);
    setLoadingFacilityId(facilityId);
    
    try {
      // setActiveFacility actualiza activeFacilityId optimistamente
      await setActiveFacility(facilityId);
      // Navegar inmediatamente sin esperar refresh
      redirectByRole(role, facilityId);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Error al seleccionar hogar. Intenta nuevamente.';
      setError(errorMessage);
      setLoadingFacilityId(null);
    }
  };

  if (authLoading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <LoadingSpinner />
      </div>
    );
  }

  const memberships = getMemberships();

  // Si solo hay una membership, seleccionarla automáticamente (solo si no hay activeFacilityId)
  useEffect(() => {
    if (memberships.length === 1 && !activeFacilityId && !loadingFacilityId) {
      const membership = memberships[0];
      handleSelectFacility(membership.facility_id, membership.role);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [memberships.length, activeFacilityId, loadingFacilityId]);

  if (memberships.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <div className="w-full max-w-md">
          <ErrorMessage message="No tienes acceso a ninguna sede" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 px-4 py-8">
      <div className="max-w-2xl mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            Seleccionar Hogar
          </h1>
          <p className="text-gray-600">
            {user.full_name}, elegí el hogar con el que trabajarás
          </p>
        </div>

        {error && (
          <div className="mb-6">
            <ErrorMessage message={error} onDismiss={() => setError(null)} />
          </div>
        )}

        <div className="space-y-4">
          {memberships.map((membership) => {
            const theme = getFacilityTheme(membership);
            const facilityCodeLower = membership.facility_code?.toLowerCase() || '';
            const imageUrl = facilityCodeLower ? `/facilities/${facilityCodeLower}.png` : null;
            const hasImageError = imageErrors[membership.facility_id] || false;
            const shouldShowImage = imageUrl && !hasImageError;
            const isLoading = loadingFacilityId === membership.facility_id;
            const isDisabled = loadingFacilityId !== null;

            const handleImageError = () => {
              setImageErrors(prev => ({ ...prev, [membership.facility_id]: true }));
            };

            const isActive = activeFacilityId === membership.facility_id;

            return (
              <button
                key={membership.id}
                onClick={() => !isDisabled && handleSelectFacility(membership.facility_id, membership.role)}
                disabled={isDisabled}
                className="relative w-full min-h-[200px] rounded-2xl overflow-hidden shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-[1.02] disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
                style={{
                  backgroundColor: theme.accentColor, // Fallback si no hay imagen
                }}
              >
                {/* Imagen real del hogar */}
                {shouldShowImage && (
                  <img
                    src={imageUrl}
                    alt={membership.facility_name}
                    className="absolute inset-0 w-full h-full object-cover"
                    onError={handleImageError}
                  />
                )}

                {/* Overlay oscuro para mejorar legibilidad */}
                <div 
                  className="absolute inset-0"
                  style={{
                    background: shouldShowImage 
                      ? 'rgba(0, 0, 0, 0.4)' 
                      : `linear-gradient(135deg, ${theme.accentColor}CC 0%, ${theme.accentColor}99 100%)`,
                  }}
                />
                
                {/* Contenido */}
                <div className="relative z-10 p-6 h-full flex flex-col justify-between text-left">
                    <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <h3 className="text-2xl font-bold text-white mb-1">
                        {membership.facility_name}
                      </h3>
                      <p className="text-white/90 text-sm">
                        Código: {membership.facility_code}
                      </p>
                    </div>
                    <div className="flex flex-col items-end gap-2">
                      <span className="text-xs font-medium text-gray-900 bg-white/90 px-3 py-1.5 rounded-full">
                        {getRoleLabel(membership.role)}
                      </span>
                      {isActive && (
                        <span className="text-xs font-medium text-white bg-green-600/90 px-3 py-1.5 rounded-full">
                          Actual
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Spinner durante loading */}
                  {isLoading && (
                    <div className="absolute inset-0 flex items-center justify-center bg-black/20 z-20">
                      <LoadingSpinner size="lg" />
                    </div>
                  )}
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};
