import React, { createContext, useContext, useState, useEffect, useRef, ReactNode } from 'react';
import { facilitiesApi } from '../api/facilities';
import { useAuth } from './AuthContext';
import type { Facility } from '../types/auth';

interface FacilityContextType {
  facility: Facility | null;
  setFacility: (facility: Facility | null) => void;
  loading: boolean;
}

const FacilityContext = createContext<FacilityContextType | undefined>(undefined);

export const useFacility = () => {
  const context = useContext(FacilityContext);
  if (!context) {
    throw new Error('useFacility must be used within FacilityProvider');
  }
  return context;
};

interface FacilityProviderProps {
  children: ReactNode;
}

export const FacilityProvider: React.FC<FacilityProviderProps> = ({ children }) => {
  const { activeFacilityId, isBootstrapping } = useAuth();
  const [facility, setFacilityState] = useState<Facility | null>(null);
  const [loading, setLoading] = useState(false);
  const lastLoadedFacilityIdRef = useRef<string | null>(null);

  const loadFacility = async (facilityId: string) => {
    console.log('[FacilityContext] loadFacility:', facilityId);
    try {
      setLoading(true);
      const facilityData = await facilitiesApi.get(facilityId);
      setFacilityState(facilityData);
      lastLoadedFacilityIdRef.current = facilityId;
      console.log('[FacilityContext] facility cargada:', facilityData.name);
    } catch (error) {
      console.error('[FacilityContext] error cargando facility:', error);
      setFacilityState(null);
      lastLoadedFacilityIdRef.current = null;
    } finally {
      setLoading(false);
    }
  };

  // Sincronizar con AuthContext.activeFacilityId (ÚNICA FUENTE DE VERDAD)
  useEffect(() => {
    // NO hacer nada hasta que AuthContext termine de bootstrapear
    if (isBootstrapping) {
      console.log('[FacilityContext] esperando bootstrap de AuthContext...');
      return;
    }

    console.log('[FacilityContext] sync effect', { activeFacilityId });

    if (activeFacilityId) {
      // Solo cargar si es diferente a la que ya tenemos
      if (lastLoadedFacilityIdRef.current !== activeFacilityId) {
        loadFacility(activeFacilityId);
      }
    } else {
      // No hay facility activa, limpiar
      if (lastLoadedFacilityIdRef.current !== null) {
        console.log('[FacilityContext] limpiar facility');
        setFacilityState(null);
        lastLoadedFacilityIdRef.current = null;
        setLoading(false);
      }
    }
  }, [activeFacilityId, isBootstrapping]);

  const setFacility = (newFacility: Facility | null) => {
    console.log('[FacilityContext] setFacility manual:', newFacility?.name);
    setFacilityState(newFacility);
  };

  return (
    <FacilityContext.Provider
      value={{
        facility,
        setFacility,
        loading,
      }}
    >
      {children}
    </FacilityContext.Provider>
  );
};