import { PrintDocument } from './PrintDocument';
import type { CertificateDraft } from '../../types/certificates';

// Esta página debe renderizarse SIN layout general.
// Ideal: ruta dedicada /doctor/constancias/print?draftId=... o /doctor/constancias/:id/print
export default function PrintPage({ draft }: { draft: CertificateDraft }) {

  return (
    <div>
      {/* Controles ocultos en impresión */}
      <div className="no-print" style={{ padding: 16 }}>
        <button onClick={() => window.print()}>Imprimir</button>
        <button onClick={() => window.history.back()} style={{ marginLeft: 8 }}>Volver</button>
      </div>

      <PrintDocument draft={draft} />
    </div>
  );
}
