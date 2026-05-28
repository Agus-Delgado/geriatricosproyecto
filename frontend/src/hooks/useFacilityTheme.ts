import { useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { getFacilityTheme, applyFacilityTheme, resetFacilityTheme, type FacilityTheme } from '../theme/facilityTheme';

/**
 * Hook para aplicar el theme de la facility activa
 * Resetea a defaults cuando no hay activeMembership (login/selector/logout)
 */
export function useFacilityTheme(): FacilityTheme {
  const { getActiveMembership } = useAuth();
  const activeMembership = getActiveMembership();

  useEffect(() => {
    if (activeMembership) {
      const theme = getFacilityTheme(activeMembership);
      applyFacilityTheme(theme);
    } else {
      // Reset a defaults cuando no hay facility activa
      resetFacilityTheme();
    }
  }, [activeMembership]);

  return getFacilityTheme(activeMembership);
}
