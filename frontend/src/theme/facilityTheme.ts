import type { FacilityMembership } from '../types/auth';

export interface FacilityTheme {
  accentColor: string;
  backgroundGradient: string;
  cardAccent: string;
  bannerImage?: string;
}

const DEFAULT_THEME: FacilityTheme = {
  accentColor: '#667eea',
  backgroundGradient: 'linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%)',
  cardAccent: 'rgba(255, 255, 255, 0.9)',
};

const FACILITY_THEMES: Record<string, FacilityTheme> = {
  nsl: {
    accentColor: '#4FC3F7',
    backgroundGradient: 'linear-gradient(135deg, #E3F2FD 0%, #BBDEFB 100%)',
    cardAccent: 'rgba(255, 255, 255, 0.95)',
    bannerImage: '/facilities/nsl.png',
  },
  et: {
    accentColor: '#66BB6A',
    backgroundGradient: 'linear-gradient(135deg, #E8F5E9 0%, #C8E6C9 100%)',
    cardAccent: 'rgba(255, 255, 255, 0.95)',
    bannerImage: '/facilities/et.png',
  },
  ea: {
    accentColor: '#FFA726',
    backgroundGradient: 'linear-gradient(135deg, #FFF3E0 0%, #FFE0B2 100%)',
    cardAccent: 'rgba(255, 255, 255, 0.95)',
    bannerImage: '/facilities/ea.png',
  },
};

/**
 * Resuelve el theme de una facility basado en su code o name
 */
export function getFacilityTheme(membership: FacilityMembership | null): FacilityTheme {
  if (!membership) {
    return DEFAULT_THEME;
  }

  // Intentar resolver por facility_code (normalizado a lowercase)
  if (membership.facility_code) {
    const codeKey = membership.facility_code.toLowerCase();
    if (FACILITY_THEMES[codeKey]) {
      return FACILITY_THEMES[codeKey];
    }
  }

  // Fallback por facility_name (match exacto)
  const nameMap: Record<string, string> = {
    'Nuestra Señora de Luján': 'nsl',
    'El Trébol': 'et',
    'El Amanecer': 'ea',
  };

  if (membership.facility_name && nameMap[membership.facility_name]) {
    const codeKey = nameMap[membership.facility_name];
    return FACILITY_THEMES[codeKey] || DEFAULT_THEME;
  }

  return DEFAULT_THEME;
}

/**
 * Aplica las variables CSS del theme al documento
 */
export function applyFacilityTheme(theme: FacilityTheme) {
  const root = document.documentElement;
  root.style.setProperty('--facility-accent', theme.accentColor);
  root.style.setProperty('--facility-bg', theme.backgroundGradient);
  root.style.setProperty('--facility-card', theme.cardAccent);
}

/**
 * Resetea las variables CSS a valores default
 */
export function resetFacilityTheme() {
  applyFacilityTheme(DEFAULT_THEME);
}
