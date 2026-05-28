/**
 * Frases médicas rotativas para el dashboard
 */

const MEDICAL_QUOTES = [
  'La prevención es la mejor medicina',
  'El cuidado empieza por la atención',
  'La salud es la mayor riqueza',
  'Cada paciente es único e importante',
  'La medicina es ciencia y arte',
  'El tiempo dedicado al paciente es tiempo bien invertido',
  'La paciencia y la empatía curan tanto como los medicamentos',
  'La observación cuidadosa es la base del diagnóstico',
  'Cada día es una oportunidad de mejorar vidas',
  'La confianza del paciente es un regalo preciado',
  'La medicina preventiva salva más vidas',
  'Escuchar es el primer paso para entender',
  'La compasión es parte esencial del cuidado médico',
  'Los pequeños detalles marcan la diferencia',
  'La experiencia se construye con cada paciente',
  'La honestidad fortalece la relación médico-paciente',
  'El conocimiento compartido mejora resultados',
  'La atención personalizada es fundamental',
  'Cada diagnóstico es un desafío a resolver',
  'La calma y la claridad guían las mejores decisiones',
  'El respeto hacia el paciente nunca puede faltar',
  'La medicina evoluciona con cada nuevo caso',
  'La dedicación transforma vidas',
  'La precisión en el diagnóstico es crucial',
  'El trabajo en equipo mejora los resultados',
  'La educación del paciente es parte del tratamiento',
  'La paciencia es virtud en medicina',
  'La observación detallada revela la verdad',
  'Cada tratamiento es único como cada paciente',
  'La ética médica es nuestra brújula',
  'La humanidad en la medicina no puede faltar',
  'El cuidado integral abarca más que síntomas',
  'La responsabilidad médica es una carga sagrada',
  'La ciencia y el humanismo van de la mano',
  'El bienestar del paciente es nuestra prioridad',
  'La comunicación clara es terapéutica',
  'Cada interacción médica es una oportunidad de ayudar',
  'La prudencia previene errores',
  'El aprendizaje continuo es esencial',
  'La integridad define al verdadero médico',
  'El compromiso con el paciente no tiene horario',
  'La esperanza es un componente del tratamiento',
  'La disciplina y la dedicación rinden frutos',
  'El respeto a la dignidad es fundamental',
];

/**
 * Obtiene una frase médica aleatoria
 */
export function getRandomMedicalQuote(): string {
  const randomIndex = Math.floor(Math.random() * MEDICAL_QUOTES.length);
  return MEDICAL_QUOTES[randomIndex];
}

export { MEDICAL_QUOTES };