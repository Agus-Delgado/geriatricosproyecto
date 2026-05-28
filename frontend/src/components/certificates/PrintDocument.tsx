import { useEffect, useMemo } from 'react';
import type { CertificateDraft } from '../../types/certificates';
import { RxPaperFrame } from './RxPaperFrame';
import './print.css';

// Componente especial para renderizar el consentimiento con firmas mejoradas
function ConsentimientoContent({ bodyText }: { bodyText: string }) {
  const lines = bodyText.split('\n');
  const result: JSX.Element[] = [];
  let currentSection: 'body' | 'resident' | 'familiar' = 'body';
  let residentLines: string[] = [];
  let familiarLines: string[] = [];
  let bodyLines: string[] = [];

  lines.forEach((line) => {
    if (line.includes('Firma y Aclaración del residente:')) {
      // Cambiar a sección de residente
      currentSection = 'resident';
      residentLines.push(line);
    } else if (line.includes('Firma y Aclaración del familiar responsable:')) {
      // Cambiar a sección de familiar
      currentSection = 'familiar';
      familiarLines.push(line);
    } else {
      if (currentSection === 'body') {
        bodyLines.push(line);
      } else if (currentSection === 'resident') {
        residentLines.push(line);
      } else if (currentSection === 'familiar') {
        familiarLines.push(line);
      }
    }
  });

  // Renderizar cuerpo principal
  bodyLines.forEach((line, idx) => {
    if (line.trim()) {
      result.push(
        <p key={`body-${idx}`} className="print-paragraph">
          {line}
        </p>
      );
    } else {
      result.push(<br key={`body-br-${idx}`} />);
    }
  });

  // Renderizar firma del residente con espacio
  if (residentLines.length > 0) {
    const titleLine = residentLines.find((l) => l.includes('Firma y Aclaración del residente:'));
    const infoLines = residentLines.filter((l) => !l.includes('Firma y Aclaración del residente:') && l.trim());
    
    result.push(
      <div key="signature-resident" className="print-signature-block">
        {titleLine && (
          <p className="print-signature-title">{titleLine}</p>
        )}
        <div className="print-signature-space"></div>
        <div className="print-signature-line-block"></div>
        {infoLines.map((line, idx) => (
          <p key={`resident-${idx}`} className="print-signature-info">
            {line}
          </p>
        ))}
      </div>
    );
  }

  // Renderizar firma del familiar con espacio
  if (familiarLines.length > 0) {
    const titleLine = familiarLines.find((l) => l.includes('Firma y Aclaración del familiar responsable:'));
    const infoLines = familiarLines.filter((l) => !l.includes('Firma y Aclaración del familiar responsable:') && l.trim());
    
    result.push(
      <div key="signature-familiar" className="print-signature-block">
        {titleLine && (
          <p className="print-signature-title">{titleLine}</p>
        )}
        <div className="print-signature-space"></div>
        <div className="print-signature-line-block"></div>
        {infoLines.map((line, idx) => (
          <p key={`familiar-${idx}`} className="print-signature-info">
            {line}
          </p>
        ))}
      </div>
    );
  }

  return <>{result}</>;
}

// IMPORTANTE: este componente NO debe incluir navbar ni sidebar.
// Debe renderizar SOLO el documento imprimible.
export function PrintDocument({ draft }: { draft: CertificateDraft }) {
  // Guardrail: prohibido "certificado" en el HTML de impresión
  const forbidden = useMemo(() => {
    const html = `${draft.bodyText} ${draft.hogarName} ${draft.hogarAddress} ${draft.doctorDisplayName}`.toLowerCase();
    return html.includes('certificado');
  }, [draft]);

  useEffect(() => {
    if (forbidden) {
      // Evitar imprimir si el texto contiene "certificado"
      // (No rompe la app, pero protege el requisito.)
      // Podés mostrar un mensaje y bloquear el print.
      // eslint-disable-next-line no-alert
      alert('Error: el documento contiene la palabra prohibida "certificado". Ajuste el texto antes de imprimir.');
    }
  }, [forbidden]);

  const license = draft.doctorLicenseNumber?.trim() ? draft.doctorLicenseNumber.trim() : '(pendiente de configurar)';
  const facilityAddress = `${draft.hogarName ?? ''}, ${draft.hogarAddress ?? ''}, Ramos Mejía`;

  return (
    <RxPaperFrame 
      headerDate={draft.issuedAt ?? ''}
      patientName={draft.patientFullName ?? ''}
      patientAddress={draft.patientDni ? `DNI: ${draft.patientDni}` : ''}
    >
      <div className="print-root">
        {/* Título centrado - solo mostrar si no es CONSENTIMIENTO (que ya tiene título en bodyText) */}
        {draft.type !== 'CONSENTIMIENTO' && (
          <div className="print-title">CONSTANCIA</div>
        )}

        {/* Cuerpo del documento */}
        <div className="print-body">
          {draft.type === 'CONSENTIMIENTO' ? (
            // Renderizado especial para Consentimiento con firmas
            <ConsentimientoContent bodyText={draft.bodyText ?? ''} />
          ) : (
            // Renderizado normal para otros tipos
            (draft.bodyText ?? '').split('\n').map((line, idx) => (
              <p key={idx} className="print-paragraph">
                {line}
              </p>
            ))
          )}
        </div>

        {/* Footer: Firma + Matrícula + Dirección (todo abajo derecha) */}
        <div className="print-footer-right">
          <div className="print-signature-section">
            <div className="print-signature-label">Firma:</div>
            <div className="print-signature-line"></div>
            <div className="print-doctor-name">Dr/a. {draft.doctorDisplayName ?? ''}</div>
            <div className="print-doctor-license">Matrícula: {license}</div>
          </div>
          <div className="print-facility-address">
            {facilityAddress}
          </div>
        </div>
      </div>
    </RxPaperFrame>
  );
}
