import { useNavigate } from 'react-router-dom';
import type { ReactNode } from 'react';

interface BackHeaderProps {
  title: string;
  fallbackPath: string;
  rightActions?: ReactNode;
}

/**
 * Componente de header con botón "Volver" inteligente
 * - Si hay historial: navega hacia atrás
 * - Si no hay historial o viene de deep link: navega a fallbackPath
 */
export function BackHeader({ title, fallbackPath, rightActions }: BackHeaderProps) {
  const navigate = useNavigate();

  const handleBack = () => {
    // Verificar si hay historial navegable
    // Nota: window.history.length puede no ser confiable en todos los navegadores
    // Usamos navigate(-1) que funciona bien con React Router
    // Si no hay historial, React Router manejará el caso
    try {
      navigate(-1);
    } catch {
      // Si falla, usar fallback
      navigate(fallbackPath);
    }
  };

  return (
    <div
      className="sticky top-0 z-40 mb-4 rounded-xl shadow-md p-4"
      style={{ backgroundColor: 'var(--facility-card, white)' }}
    >
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3 flex-1 min-w-0">
          <button
            onClick={handleBack}
            className="flex-shrink-0 p-2 rounded-lg hover:bg-gray-100 transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2"
            style={{ 
              minHeight: '44px',
              minWidth: '44px'
            }}
            onFocus={(e) => {
              e.currentTarget.style.outline = `2px solid var(--facility-accent, #667eea)`;
              e.currentTarget.style.outlineOffset = '2px';
            }}
            onBlur={(e) => {
              e.currentTarget.style.outline = '';
              e.currentTarget.style.outlineOffset = '';
            }}
            aria-label="Volver atrás"
          >
            <svg
              className="w-6 h-6 text-gray-700"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              style={{ color: 'var(--facility-accent, #667eea)' }}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M15 19l-7-7 7-7"
              />
            </svg>
          </button>
          <h1
            className="text-xl md:text-2xl font-bold text-gray-900 truncate"
            style={{ color: 'var(--facility-accent, #667eea)' }}
          >
            {title}
          </h1>
        </div>
        {rightActions && (
          <div className="flex-shrink-0 flex items-center gap-2">
            {rightActions}
          </div>
        )}
      </div>
    </div>
  );
}