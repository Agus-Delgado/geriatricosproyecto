export type ReleaseNotesRole = 'OWNER' | 'DOCTOR' | 'ADMIN' | 'MEDICO';

export interface ReleaseNotes {
  version: string;
  title: string;
  date: string;
  roles: ReleaseNotesRole[];
  highlights: string[];
  details?: string[];
}

export const CURRENT_RELEASE_NOTES: ReleaseNotes = {
  version: __APP_BUILD_ID__,
  title: 'Novedades y mejoras recientes',
  date: __APP_BUILD_TIME__,
  roles: ['OWNER', 'DOCTOR', 'ADMIN', 'MEDICO'],
  highlights: [
    'Nuevo informe imprimible de personal (turnos + asistencias).',
    'Mejoras en impresión: layouts más prolijos y consistentes (carpeta médica, historia clínica, recetas y ficha del paciente).',
    'Colores por hogar en impresión (incluye Nuestra Señora de Luján en celeste claro).',
    'Mejoras generales y correcciones menores.',
  ],
};
