import React from 'react';
import './print.css';

interface RxPaperFrameProps {
  children: React.ReactNode;
  className?: string;
  headerDate?: string;
  patientName?: string;
  patientAddress?: string;
}

export function RxPaperFrame({ 
  children, 
  className = '', 
  headerDate,
  patientName = '',
  patientAddress = ''
}: RxPaperFrameProps) {
  // Formatear fecha si se proporciona
  const formatDate = (dateStr?: string): string => {
    if (!dateStr) return '';
    try {
      const date = new Date(dateStr);
      return date.toLocaleDateString('es-AR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
      });
    } catch {
      return '';
    }
  };

  const formattedDate = headerDate ? formatDate(headerDate) : '';

  return (
    <div className={`paper ${className}`}>
      {/* Header con estilo Rx usando Grid */}
      <div className="paper-header-grid">
        {/* Columna 1: Rx */}
        <div className="paper-rx-mark">
          <span className="rx-text">Rx</span>
        </div>

        {/* Columna 2: Paciente/Domicilio */}
        <div className="paper-patient-block">
          <div className="paper-line-row">
            <span className="paper-line-label">Paciente:</span>
            <div className="paper-line-field">
              <span className="paper-line-value">{patientName}</span>
            </div>
          </div>
          <div className="paper-line-row">
            <span className="paper-line-label">Domicilio:</span>
            <div className="paper-line-field">
              <span className="paper-line-value">{patientAddress}</span>
            </div>
          </div>
        </div>

        {/* Columna 3: Fecha en box */}
        {formattedDate && (
          <div className="paper-date-box">
            <span className="paper-date-label">Fecha:</span>
            <span className="paper-date-value">{formattedDate}</span>
          </div>
        )}
      </div>

      {/* Área de contenido centrado */}
      <div className="paper-content">
        {children}
      </div>
    </div>
  );
}
