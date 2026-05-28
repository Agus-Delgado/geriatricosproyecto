import type { User } from '../types/auth';

/**
 * Limpia SOLO las keys de autenticación (para uso en handlers de salida)
 */
export function clearAuthStorageOnly(): void {
  localStorage.removeItem('token');
  localStorage.removeItem('original_token');
  localStorage.removeItem('activeFacilityId');
  localStorage.removeItem('lastActivityAt');
}

/**
 * Limpia todo el storage relacionado con sesión y caches
 */
export function clearSessionStorage(): void {
  clearAuthStorageOnly();
  
  // Limpiar caches relacionados
  const keysToRemove: string[] = [];
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key && (key.startsWith('facility_') || key.startsWith('cache_'))) {
      keysToRemove.push(key);
    }
  }
  keysToRemove.forEach(key => localStorage.removeItem(key));
}

/**
 * Sincroniza activeFacilityId desde el backend (fuente de verdad)
 */
export function syncActiveFacility(user: User | null): void {
  if (!user) {
    localStorage.removeItem('activeFacilityId');
    return;
  }
  
  if (user.active_facility_id) {
    localStorage.setItem('activeFacilityId', user.active_facility_id);
  } else {
    localStorage.removeItem('activeFacilityId');
  }
}

/**
 * Actualiza el timestamp de última actividad
 */
export function updateActivityTimestamp(): void {
  localStorage.setItem('lastActivityAt', Date.now().toString());
}

/**
 * Verifica si ha pasado el timeout de inactividad
 * @param timeoutMinutes Tiempo en minutos antes de considerar inactivo (default: 60)
 * @returns true si está inactivo, false si está activo
 */
export function checkInactivityTimeout(timeoutMinutes: number = 60): boolean {
  const lastActivityStr = localStorage.getItem('lastActivityAt');
  if (!lastActivityStr) {
    // No hay timestamp, considerar inactivo
    return true;
  }
  
  const lastActivity = parseInt(lastActivityStr, 10);
  if (isNaN(lastActivity)) {
    return true;
  }
  
  const now = Date.now();
  const timeoutMs = timeoutMinutes * 60 * 1000;
  const elapsed = now - lastActivity;
  
  return elapsed > timeoutMs;
}
