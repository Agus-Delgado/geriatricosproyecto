export function normalizeFacilityName(name?: string): string {
  if (!name) return 'default';
  return name.normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase();
}

export function resolvePrintThemeVars(name?: string) {
  const n = normalizeFacilityName(name);

  if (n.includes('amanecer')) {
    return {
      ['--primary-color' as any]: '#f97316',
      ['--bg-light' as any]: '#fff7ed',
      ['--text-dark' as any]: '#7c2d12',
      ['--text-muted' as any]: '#a16207',
    };
  }

  if (n.includes('trebol')) {
    return {
      ['--primary-color' as any]: '#22c55e',
      ['--bg-light' as any]: '#f0fdf4',
      ['--text-dark' as any]: '#14532d',
      ['--text-muted' as any]: '#166534',
    };
  }

  if (n.includes('lujan') || n.includes('luján') || n.includes('nuestra senora')) {
    return {
      ['--primary-color' as any]: '#4FC3F7',
      ['--bg-light' as any]: '#E3F2FD',
      ['--text-dark' as any]: '#0B4F6C',
      ['--text-muted' as any]: '#0288D1',
    };
  }

  return {
    ['--primary-color' as any]: '#2563eb',
    ['--bg-light' as any]: '#f9fafb',
    ['--text-dark' as any]: '#1e293b',
    ['--text-muted' as any]: '#64748b',
  };
}
