/**
 * Tracking local de pacientes vistos (fallback cuando no hay backend)
 * Usa localStorage para guardar pacientes visitados en el día
 */

const STORAGE_PREFIX = 'patient_views_';

/**
 * Obtener la clave de storage para un día específico
 */
function getStorageKey(facilityId: string, date: string): string {
  return `${STORAGE_PREFIX}${facilityId}_${date}`;
}

/**
 * Limpiar claves de días anteriores (mantener solo el día actual y ayer por seguridad)
 */
function cleanOldKeys(): void {
  const today = new Date().toISOString().split('T')[0];
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayStr = yesterday.toISOString().split('T')[0];

  const keysToKeep = new Set<string>();
  
  // Obtener todas las claves del storage
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key && key.startsWith(STORAGE_PREFIX)) {
      // Extraer fecha de la clave (formato: patient_views_facilityId_date)
      const parts = key.split('_');
      const datePart = parts.slice(-1)[0];
      
      // Mantener solo hoy y ayer
      if (datePart === today || datePart === yesterdayStr) {
        keysToKeep.add(key);
      }
    }
  }

  // Eliminar claves antiguas
  for (let i = localStorage.length - 1; i >= 0; i--) {
    const key = localStorage.key(i);
    if (key && key.startsWith(STORAGE_PREFIX) && !keysToKeep.has(key)) {
      localStorage.removeItem(key);
    }
  }
}

/**
 * Registrar que se vio un paciente
 */
export function trackPatientView(facilityId: string, patientId: string): void {
  try {
    const today = new Date().toISOString().split('T')[0];
    const storageKey = getStorageKey(facilityId, today);

    // Obtener lista actual de pacientes
    const existingData = localStorage.getItem(storageKey);
    const patientIds: string[] = existingData ? JSON.parse(existingData) : [];

    // Agregar paciente si no existe
    if (!patientIds.includes(patientId)) {
      patientIds.push(patientId);
      localStorage.setItem(storageKey, JSON.stringify(patientIds));
    }

    // Limpiar claves antiguas periódicamente
    cleanOldKeys();
  } catch (error) {
    console.error('Error tracking patient view:', error);
  }
}

/**
 * Obtener conteo de pacientes únicos vistos en un día
 */
export function getPatientsViewedCount(facilityId: string, date: string): number {
  try {
    const storageKey = getStorageKey(facilityId, date);
    const data = localStorage.getItem(storageKey);
    
    if (!data) {
      return 0;
    }

    const patientIds: string[] = JSON.parse(data);
    return patientIds.length;
  } catch (error) {
    console.error('Error getting patients viewed count:', error);
    return 0;
  }
}

/**
 * Limpiar tracking de un día específico (útil para testing)
 */
export function clearPatientViews(facilityId: string, date: string): void {
  const storageKey = getStorageKey(facilityId, date);
  localStorage.removeItem(storageKey);
}