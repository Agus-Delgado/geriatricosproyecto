import React, { createContext, useContext, useState, useEffect } from 'react';

interface PWAContextType {
  needRefresh: boolean;
  offlineReady: boolean;
  updateServiceWorker: ((reloadPage?: boolean) => Promise<void>) | null;
}

const PWAContext = createContext<PWAContextType | undefined>(undefined);

export const PWAProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [needRefresh, setNeedRefresh] = useState(false);
  const [offlineReady, setOfflineReady] = useState(false);
  const [updateServiceWorker, setUpdateServiceWorker] = useState<((reloadPage?: boolean) => Promise<void>) | null>(null);

  useEffect(() => {
    // Obtener updateSW desde window (guardado en main.tsx)
    const updateSW = (window as any).__PWA_UPDATE_SW__ as ((reloadPage?: boolean) => Promise<void>) | undefined;
    if (updateSW) {
      setUpdateServiceWorker(updateSW);
    }

    // Escuchar eventos de actualización del PWA
    const handleUpdateAvailable = () => {
      setNeedRefresh(true);
    };

    const handleOfflineReady = () => {
      setOfflineReady(true);
    };

    window.addEventListener('pwa-update-available', handleUpdateAvailable);
    window.addEventListener('pwa-offline-ready', handleOfflineReady);

    return () => {
      window.removeEventListener('pwa-update-available', handleUpdateAvailable);
      window.removeEventListener('pwa-offline-ready', handleOfflineReady);
    };
  }, []);

  return (
    <PWAContext.Provider
      value={{
        needRefresh,
        offlineReady,
        updateServiceWorker,
      }}
    >
      {children}
    </PWAContext.Provider>
  );
};

export const usePWA = () => {
  const context = useContext(PWAContext);
  if (context === undefined) {
    throw new Error('usePWA must be used within a PWAProvider');
  }
  return context;
};
