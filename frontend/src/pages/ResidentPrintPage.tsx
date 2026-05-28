import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { residentsApi } from '../api/residents';
import { contactsApi } from '../api/contacts';
import { useFacility } from '../contexts/FacilityContext';
import type { Resident, ResidentContact } from '../types/residents';
import { resolvePrintThemeVars } from '../theme/printTheme';
import '../components/certificates/print.css';
import './resident-print.css';

export default function ResidentPrintPage() {
  const { id } = useParams();
  const { facility } = useFacility();
  const [resident, setResident] = useState<Resident | null>(null);
  const [contacts, setContacts] = useState<ResidentContact[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const themeVars = resolvePrintThemeVars(facility?.name);

  useEffect(() => {
    const load = async () => {
      if (!id) return;
      try {
        setLoading(true);
        const r = await residentsApi.get(id);
        const c = await contactsApi.list(id);
        setResident(r);
        setContacts(c);
      } catch (e) {
        setError('Error al cargar datos del paciente');
      } finally {
        setLoading(false);
      }
    };
    void load();
  }, [id]);

  const print = () => window.print();

  if (loading) return <div className="p-6">Cargando...</div>;
  if (error) return <div className="p-6 text-red-600">{error}</div>;
  if (!resident) return null;

  const formatDate = (d?: string | null) => {
    if (!d) return 'N/A';
    const dt = new Date(d);
    if (Number.isNaN(dt.getTime())) return d;
    return dt.toLocaleDateString('es-AR');
  };

  return (
    <div style={{ minHeight: '100vh', background: '#fff' }}>
      <div className="no-print" style={{ padding: 16, background: '#f5f5f5', borderBottom: '1px solid #ddd' }}>
        <div className="max-w-4xl mx-auto flex gap-3" style={{ justifyContent: 'flex-end' }}>
          <button onClick={print} className="px-4 py-2 bg-primary-600 text-white rounded hover:bg-primary-700">
            Imprimir
          </button>
        </div>
      </div>

      <div className="paper" style={themeVars}>
        <div className="print-root">
          <div className="print-title">FICHA DEL PACIENTE</div>

          <div className="print-meta">
            <div>
              <strong>Hogar:</strong> {facility?.name || '—'}
            </div>
            <div>
              <strong>Generado:</strong> {new Date().toLocaleString('es-AR')}
            </div>
          </div>

          <div className="print-body">
            <div className="print-card" style={{ marginBottom: 16 }}>
              <div className="print-section-title">Datos personales</div>
              <div className="print-kv-grid">
                <div className="print-kv">
                  <div className="print-kv-label">Nombre</div>
                  <div className="print-kv-value">{resident.last_name}, {resident.first_name}</div>
                </div>
                <div className="print-kv">
                  <div className="print-kv-label">DNI</div>
                  <div className="print-kv-value">{resident.dni || 'N/A'}</div>
                </div>
                <div className="print-kv">
                  <div className="print-kv-label">Nacimiento</div>
                  <div className="print-kv-value">{formatDate(resident.birth_date)}</div>
                </div>
                <div className="print-kv">
                  <div className="print-kv-label">Sexo</div>
                  <div className="print-kv-value">{resident.sex || 'N/A'}</div>
                </div>
                <div className="print-kv">
                  <div className="print-kv-label">Cobertura</div>
                  <div className="print-kv-value">{resident.coverage_type || 'N/A'}</div>
                </div>
                <div className="print-kv">
                  <div className="print-kv-label">N°</div>
                  <div className="print-kv-value">{resident.coverage_number || 'N/A'}</div>
                </div>
                <div className="print-kv">
                  <div className="print-kv-label">Ingreso</div>
                  <div className="print-kv-value">{formatDate(resident.admission_date)}</div>
                </div>
              </div>
            </div>

            <div style={{ marginTop: 18 }}>
              <div className="print-section-title">Familiares y contactos</div>
              {contacts.length === 0 ? (
                <p style={{ fontStyle: 'italic', color: '#666' }}>No hay contactos registrados.</p>
              ) : (
                <div className="print-card">
                  <table>
                    <thead>
                      <tr>
                        <th>Nombre</th>
                        <th>Relación</th>
                        <th>Teléfono</th>
                        <th>Email</th>
                        <th>Dirección</th>
                        <th>Principal</th>
                      </tr>
                    </thead>
                    <tbody>
                      {contacts.map((c) => (
                        <tr key={c.id}>
                          <td>{c.full_name}</td>
                          <td>{c.relationship_type || '—'}</td>
                          <td>{c.phone || '—'}</td>
                          <td>{c.email || '—'}</td>
                          <td>{c.address || '—'}</td>
                          <td>{c.is_primary ? 'Sí' : 'No'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            <div style={{ marginTop: 18 }}>
              <div className="print-section-title">Observaciones</div>
              <div className="textarea">{resident.notes || <span style={{ color: '#bbb' }}>Sin observaciones</span>}</div>
            </div>

            <div style={{ marginTop: 18 }}>
              <div className="print-section-title">Firma</div>
              <div className="signature-line">&nbsp;</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

