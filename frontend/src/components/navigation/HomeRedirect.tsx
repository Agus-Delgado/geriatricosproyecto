import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { LoadingSpinner } from '../ui/LoadingSpinner';

const HomeRedirect: React.FC = () => {
  const navigate = useNavigate();
  const { user, activeFacilityId, isBootstrapping, getMemberships, isOwner } = useAuth();

  useEffect(() => {
    console.log('[HomeRedirect] bootstrapping:', isBootstrapping);
    // Esperar a que termine el bootstrap
    if (isBootstrapping) return;

    console.log('[HomeRedirect]', { 
      hasUser: !!user, 
      activeFacilityId,
      isPlatformAdmin: user?.is_platform_admin 
    });

    // Si no hay usuario, ir a login
    if (!user) {
      console.log('[HomeRedirect] No user, redirecting to /login');
      navigate('/login', { replace: true });
      return;
    }

    // Platform admin sin facility
    if (user.is_platform_admin && !activeFacilityId) {
      console.log('[HomeRedirect] Platform admin, no facility, redirecting to /platform');
      navigate('/platform', { replace: true });
      return;
    }

    // No activeFacilityId pero tiene memberships
    const memberships = getMemberships ? getMemberships() : [];
    if (!activeFacilityId && memberships.length > 0) {
      console.log('[HomeRedirect] Has memberships, no activeFacilityId, redirecting to /select-facility');
      navigate('/select-facility', { replace: true });
      return;
    }

    // Tiene activeFacilityId
    if (activeFacilityId) {
      if (isOwner) {
        console.log(`[HomeRedirect] OWNER has activeFacilityId (${activeFacilityId}), redirecting to /g/${activeFacilityId}/owner`);
        navigate(`/g/${activeFacilityId}/owner`, { replace: true });
        return;
      }

      console.log(`[HomeRedirect] Has activeFacilityId (${activeFacilityId}), redirecting to /g/${activeFacilityId}/dashboard`);
      navigate(`/g/${activeFacilityId}/dashboard`, { replace: true });
      return;
    }
  }, [user, activeFacilityId, isBootstrapping, getMemberships, isOwner, navigate]);

  // Mientras decide, mostrar spinner
  return <LoadingSpinner fullScreen />;
};

export default HomeRedirect;
