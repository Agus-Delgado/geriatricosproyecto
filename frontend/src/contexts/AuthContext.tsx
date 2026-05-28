import React, { createContext, useContext, useEffect, useMemo, useState, ReactNode } from 'react';
import { authApi } from '../api/auth';
import { clearSessionStorage } from '../utils/session';
import type { User, FacilityMembership, UserRole } from '../types/auth';
import type { ApiError } from '../api/client';

interface AuthContextType {
  user: User | null;
  token: string | null;
  loading: boolean;
  isBootstrapping: boolean;
  activeFacilityId: string | null;

  login: (username: string, password: string) => Promise<void>;
  logout: () => void;
  loadUser: () => Promise<void>;

  setActiveFacility: (facilityId: string) => Promise<void>;
  clearActiveFacility: () => void;

  isOwner: boolean;
  isDoctor: boolean;
  isPlatformAdmin: boolean;

  getMemberships: () => FacilityMembership[];
  getActiveMembership: () => FacilityMembership | null;
  getActiveRole: () => 'ADMIN' | 'MEDICO' | 'STAFF' | null;

  isImpersonating: boolean;
  impersonatedUser: User | null;
  startImpersonation: (userId: string, mode?: UserRole) => Promise<void>;
  stopImpersonation: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
};

interface AuthProviderProps {
  children: ReactNode;
}

async function withTimeout<T>(p: Promise<T>, ms: number, label: string): Promise<T> {
  let t: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<never>((_, reject) => {
    t = setTimeout(() => reject(new Error(`timeout:${label}`)), ms);
  });
  try {
    return await Promise.race([p, timeout]);
  } finally {
    if (t) clearTimeout(t);
  }
}

function mapRole(rawRole: unknown): UserRole | undefined {
  if (typeof rawRole !== 'string') return undefined;
  const normalized = rawRole.toLowerCase();

  switch (normalized) {
    case 'doctor':
    case 'medico':
      return 'doctor';
    case 'owner':
      return 'owner';
    case 'admin':
    case 'platform_admin':
      return 'admin';
    default:
      return undefined;
  }
}

function redirectToLogin(reason?: string) {
  const current = window.location.pathname;
  if (current.startsWith('/login')) return;
  const qs = reason ? `?reason=${encodeURIComponent(reason)}` : '';
  window.location.replace(`/login${qs}`);
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [activeFacilityId, setActiveFacilityId] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [isBootstrapping, setIsBootstrapping] = useState<boolean>(true);

  // Impersonation
  const [isImpersonating, setIsImpersonating] = useState(false);
  const [impersonatedUser, setImpersonatedUser] = useState<User | null>(null);

  const clearAllAuth = (opts?: { redirect?: boolean; reason?: string }) => {
    console.log('[AuthContext] clearAllAuth', opts);
    clearSessionStorage();

    setToken(null);
    setUser(null);
    setActiveFacilityId(null);
    setIsImpersonating(false);
    setImpersonatedUser(null);

    if (opts?.redirect) redirectToLogin(opts.reason);
  };

  // FUNCIÓN CLAVE: Sincronizar activeFacilityId desde user
  const syncActiveFacilityFromUser = (u: User) => {
    console.log('[AuthContext] syncActiveFacilityFromUser', {
      userId: u.id,
      userActiveFacility: u.active_facility_id,
      memberships: u.memberships?.length
    });

    // PRIORIDAD 1: Lo que dice el backend (u.active_facility_id)
    const backendFacilityId = u.active_facility_id;

    // Platform admin puede no tener facility
    if (u.is_platform_admin) {
      if (!backendFacilityId) {
        setActiveFacilityId(null);
        localStorage.removeItem('activeFacilityId');
        console.log('[AuthContext] platform admin sin facility');
        return;
      }
      // Si tiene, validar contra memberships
      const hasMembership = !u.memberships || u.memberships.length === 0 || 
        u.memberships.some(m => m.facility_id === backendFacilityId && m.is_active);
      
      if (hasMembership) {
        setActiveFacilityId(backendFacilityId);
        localStorage.setItem('activeFacilityId', backendFacilityId);
        console.log('[AuthContext] platform admin con facility válida:', backendFacilityId);
      } else {
        setActiveFacilityId(null);
        localStorage.removeItem('activeFacilityId');
        console.log('[AuthContext] platform admin con facility inválida, limpiar');
      }
      return;
    }

    // Para usuarios normales: validar contra memberships activos
    if (backendFacilityId) {
      const activeMemberships = u.memberships?.filter(m => m.is_active) ?? [];
      const hasValidMembership = activeMemberships.some(m => m.facility_id === backendFacilityId);
      
      if (hasValidMembership) {
        setActiveFacilityId(backendFacilityId);
        localStorage.setItem('activeFacilityId', backendFacilityId);
        console.log('[AuthContext] facility válida desde backend:', backendFacilityId);
      } else {
        // Facility del backend no está en memberships, limpiar
        setActiveFacilityId(null);
        localStorage.removeItem('activeFacilityId');
        console.log('[AuthContext] facility del backend inválida, limpiar');
      }
    } else {
      // No hay facility en el backend, limpiar
      setActiveFacilityId(null);
      localStorage.removeItem('activeFacilityId');
      console.log('[AuthContext] sin facility en backend');
    }
  };

  const loadUserWithToken = async (authToken: string) => {
    console.log('[AuthContext] loadUserWithToken iniciando');
    try {
      localStorage.setItem('token', authToken);
      setToken(authToken);

      const userData = await withTimeout(authApi.getCurrentUser(), 12000, 'auth_me');
      console.log('[AuthContext] usuario cargado:', userData.id);
      setUser(userData);

      // Detectar impersonation
      const storedOriginalToken = localStorage.getItem('original_token');
      setIsImpersonating(Boolean(storedOriginalToken));

      // Sincronizar facility desde el backend (única fuente de verdad)
      syncActiveFacilityFromUser(userData);
    } catch (e) {
      const err = e as Partial<ApiError> & { message?: string };
      const msg = err?.message ?? '';

      console.error('[AuthContext] error en loadUserWithToken:', err);

      const reason =
        msg.startsWith('timeout:') ? 'server_timeout' :
        err?.status === 401 ? 'session_expired' :
        err?.status === 403 ? 'session_invalid' :
        err?.status === 500 ? 'server_error' :
        'auth_failed';

      clearAllAuth({ redirect: true, reason });
    } finally {
      setLoading(false);
      setIsBootstrapping(false);
      console.log('[AuthContext] bootstrap completado');
    }
  };

  // BOOTSTRAP INICIAL - Solo se ejecuta UNA VEZ al montar
  useEffect(() => {
    console.log('[AuthContext] mount - iniciando bootstrap');
    const storedToken = localStorage.getItem('token');
    const storedOriginalToken = localStorage.getItem('original_token');

    if (storedOriginalToken) setIsImpersonating(true);

    if (storedToken) {
      setIsBootstrapping(true);
      void loadUserWithToken(storedToken);
    } else {
      setLoading(false);
      setIsBootstrapping(false);
      console.log('[AuthContext] sin token, bootstrap completado');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Solo al montar

  const login = async (username: string, password: string) => {
    console.log('[AuthContext] login iniciando');
    setLoading(true);
    try {
      const normalizedUsername = username.trim();
      const res = await withTimeout(authApi.login({ username: normalizedUsername, password }), 12000, 'auth_login');
      const authToken = res.access_token;

      localStorage.setItem('token', authToken);
      setToken(authToken);

      const userData = await withTimeout(authApi.getCurrentUser(), 12000, 'auth_me_after_login');
      setUser(userData);
      syncActiveFacilityFromUser(userData);
      
      console.log('[AuthContext] login exitoso');
    } catch (e) {
      clearAllAuth();
      const err = e as Partial<ApiError> & { message?: string };
      throw new Error(err?.detail || err?.message || 'Error al iniciar sesión');
    } finally {
      setLoading(false);
    }
  };

  const logout = () => {
    console.log('[AuthContext] logout');
    clearAllAuth({ redirect: true, reason: 'logout' });
  };

  const loadUser = async () => {
    if (!token) return;
    console.log('[AuthContext] loadUser manual');
    setLoading(true);
    try {
      const userData = await withTimeout(authApi.getCurrentUser(), 12000, 'auth_me_manual');
      setUser(userData);
      syncActiveFacilityFromUser(userData);
    } catch {
      clearAllAuth({ redirect: true, reason: 'session_expired' });
    } finally {
      setLoading(false);
    }
  };

  const clearActiveFacility = () => {
    console.log('[AuthContext] clearActiveFacility');
    setActiveFacilityId(null);
    localStorage.removeItem('activeFacilityId');
  };

  const setActiveFacility = async (facilityId: string) => {
    console.log('[AuthContext] setActiveFacility:', facilityId);
    const prev = activeFacilityId;
    
    // Optimistic update
    setActiveFacilityId(facilityId);
    localStorage.setItem('activeFacilityId', facilityId);

    try {
      await withTimeout(authApi.setActiveFacility({ facility_id: facilityId }), 12000, 'set_active_facility');
      setUser((u) => (u ? { ...u, active_facility_id: facilityId } : u));
      console.log('[AuthContext] setActiveFacility exitoso');
    } catch (e) {
      // Revertir
      console.error('[AuthContext] error en setActiveFacility, revertir', e);
      setActiveFacilityId(prev ?? null);
      if (prev) localStorage.setItem('activeFacilityId', prev);
      else localStorage.removeItem('activeFacilityId');

      const err = e as Partial<ApiError> & { message?: string };
      throw new Error(err?.detail || err?.message || 'Error al establecer facility activa');
    }
  };

  const isOwner = useMemo(() => user?.roles?.some((r) => r.code === 'OWNER') ?? false, [user]);
  const isDoctor = useMemo(() => user?.roles?.some((r) => r.code === 'DOCTOR') ?? false, [user]);
  const isPlatformAdmin = useMemo(() => user?.is_platform_admin ?? false, [user]);

  const getMemberships = (): FacilityMembership[] => user?.memberships?.filter((m) => m.is_active) ?? [];

  const getActiveMembership = (): FacilityMembership | null => {
    const facilityId = activeFacilityId ?? user?.active_facility_id ?? null;
    if (!facilityId || !user) return null;
    return user.memberships.find((m) => m.facility_id === facilityId && m.is_active) ?? null;
  };

  const getActiveRole = (): 'ADMIN' | 'MEDICO' | 'STAFF' | null => {
    return getActiveMembership()?.role ?? null;
  };

  const startImpersonation = async (userId: string, mode?: UserRole) => {
    setLoading(true);
    try {
      const currentToken = localStorage.getItem('token');
      if (currentToken && !localStorage.getItem('original_token')) {
        localStorage.setItem('original_token', currentToken);
      }

      const normalizedMode: UserRole | undefined = mode ? mapRole(mode) ?? mode : undefined;

      const res = await withTimeout(
        authApi.impersonateUser({ user_id: userId, mode: normalizedMode }),
        12000,
        'impersonate'
      );

      localStorage.setItem('token', res.impersonation_token);
      setToken(res.impersonation_token);
      setIsImpersonating(true);

      const userData = await withTimeout(authApi.getCurrentUser(), 12000, 'auth_me_after_impersonate');
      setUser(userData);
      setImpersonatedUser(userData);

      syncActiveFacilityFromUser(userData);
    } catch (e) {
      const err = e as Partial<ApiError> & { message?: string };
      throw new Error(err?.detail || err?.message || 'Error al iniciar impersonación');
    } finally {
      setLoading(false);
    }
  };

  const stopImpersonation = async () => {
    setLoading(true);
    try {
      await withTimeout(authApi.stopImpersonation(), 12000, 'stop_impersonate');

      const originalToken = localStorage.getItem('original_token');
      if (!originalToken) {
        clearAllAuth({ redirect: true, reason: 'impersonation_end' });
        return;
      }

      localStorage.setItem('token', originalToken);
      localStorage.removeItem('original_token');
      setToken(originalToken);

      setIsImpersonating(false);
      setImpersonatedUser(null);

      const userData = await withTimeout(authApi.getCurrentUser(), 12000, 'auth_me_after_stop_impersonate');
      setUser(userData);

      syncActiveFacilityFromUser(userData);
    } catch (e) {
      const err = e as Partial<ApiError> & { message?: string };
      throw new Error(err?.detail || err?.message || 'Error al detener impersonación');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        loading,
        isBootstrapping,
        activeFacilityId,

        login,
        logout,
        loadUser,

        setActiveFacility,
        clearActiveFacility,

        isOwner,
        isDoctor,
        isPlatformAdmin,

        getMemberships,
        getActiveMembership,
        getActiveRole,

        isImpersonating,
        impersonatedUser,
        startImpersonation,
        stopImpersonation,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};