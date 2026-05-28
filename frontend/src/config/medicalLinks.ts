/**
 * Configuración de links externos para recetas médicas
 * Los valores pueden venir de variables de entorno con fallback a placeholders
 */

export interface MedicalLink {
  label: string;
  url: string;
  isValid: boolean;
  envVar: string;
}

/**
 * Valida si una URL es válida (empieza con http:// o https://)
 */
function isValidUrl(url: string): boolean {
  if (!url || url.trim() === '') return false;
  return url.startsWith('http://') || url.startsWith('https://');
}

/**
 * Obtiene la URL de un link médico desde env vars o usa fallback
 */
function getMedicalLinkUrl(envVar: string): { url: string; isValid: boolean } {
  const envValue = import.meta.env[envVar];
  
  if (envValue && isValidUrl(envValue)) {
    return { url: envValue, isValid: true };
  }
  
  // Si no hay env var o es inválida, retornar placeholder
  return { url: '#', isValid: false };
}

export const MEDICAL_LINKS: MedicalLink[] = [
  {
    label: 'MisRX',
    ...getMedicalLinkUrl('VITE_MISRX_URL'),
    envVar: 'VITE_MISRX_URL',
  },
  {
    label: 'Receto',
    ...getMedicalLinkUrl('VITE_RECETO_URL'),
    envVar: 'VITE_RECETO_URL',
  },
  {
    label: 'PAMI',
    ...getMedicalLinkUrl('VITE_PAMI_URL'),
    envVar: 'VITE_PAMI_URL',
  },
];
