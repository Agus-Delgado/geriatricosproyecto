import { useEffect, useMemo, useState } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { staffApi } from '../api/staff';
import { useFacility } from '../contexts/FacilityContext';
import type { StaffReportResponse, StaffReportShiftAssignment } from '../types/staffReport';
import { resolvePrintThemeVars } from '../theme/printTheme';
import '../components/certificates/print.css';
import './resident-print.css';

function isoDate(d: Date): string {
  return d.toISOString().split('T')[0];
}

function formatDate(d: string): string {
  const dt = new Date(d + 'T00:00:00');
  return dt.toLocaleDateString('es-AR');
}

function formatDateTime(d?: string | null): string {
  if (!d) return '—';
  return new Date(d).toLocaleString('es-AR', { dateStyle: 'short', timeStyle: 'short' });
}

function statusLabel(s: StaffReportShiftAssignment['attendance_status']): string {
  if (s === 'COVERED') return 'Cubierto';
  if (s === 'INCOMPLETE') return 'Incompleto';
  return 'Sin registro';
}

export default function StaffPrintPage() {
  const { id } = useParams();
  const { facility } = useFacility();
  const [searchParams, setSearchParams] = useSearchParams();

  const defaultFrom = useMemo(() => {
    const now = new Date();
    return isoDate(new Date(now.getFullYear(), now.getMonth(), 1));
  }, []);
  const defaultTo = useMemo(() => isoDate(new Date()), []);

  const [fromDate, setFromDate] = useState<string>(() => searchParams.get('from') || defaultFrom);
  const [toDate, setToDate] = useState<string>(() => searchParams.get('to') || defaultTo);

  const [report, setReport] = useState<StaffReportResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const themeVars = resolvePrintThemeVars(facility?.name);

  useEffect(() => {
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      next.set('from', fromDate);
      next.set('to', toDate);
      return next;
    }, { replace: true });
  }, [fromDate, toDate, setSearchParams]);

  useEffect(() => {
    const load = async () => {
      if (!id) return;
      try {
        setLoading(true);
        setError(null);
        const data = await staffApi.getReport(id, { from_date: fromDate, to_date: toDate });
        setReport(data);
      } catch {
        setError('Error al cargar informe del personal');
      } finally {
        setLoading(false);
      }
    };
    void load();
  }, [id, fromDate, toDate]);

  const print = () => window.print();

  if (loading) return <div className="p-6">Cargando...</div>;
  if (error) return <div className="p-6 text-red-600">{error}</div>;
  if (!report) return null;

  const staff = report.staff;

  return (
    <div className="print-bg" style={themeVars}>
      <div className="no-print" style={{ maxWidth: 750, margin: '0 auto 16px auto' }}>
        <div className="content" style={{ padding: '16px 24px' }}>
          <div className="flex items-end justify-between gap-3 flex-wrap">
            <div className="flex gap-3">
              <div>
                <div className="text-sm text-gray-600">Desde</div>
                <input
                  type="date"
                  value={fromDate}
                  onChange={(e) => setFromDate(e.target.value)}
                  className="border border-gray-300 rounded-lg px-2 py-1"
                />
              </div>
              <div>
                <div className="text-sm text-gray-600">Hasta</div>
                <input
                  type="date"
                  value={toDate}
                  onChange={(e) => setToDate(e.target.value)}
                  className="border border-gray-300 rounded-lg px-2 py-1"
                />
              </div>
            </div>
            <button onClick={print} className="btn btn-primary">Imprimir</button>
          </div>
        </div>
      </div>

      <div className="content">
        <header style={{ textAlign: 'center', marginBottom: 24 }}>
          <h1 style={{ fontSize: 26, fontWeight: 700, color: 'var(--primary-color)', marginBottom: 6 }}>
            Informe de Personal
          </h1>
          <div style={{ fontSize: 16, fontWeight: 500 }}>{facility?.name}</div>
          {facility?.address && <div style={{ color: '#555', fontSize: 14 }}>{facility.address}</div>}
          <div style={{ color: '#888', fontSize: 13, marginTop: 4 }}>
            Período: {formatDate(report.from_date)} → {formatDate(report.to_date)} | Generado: {new Date(report.generated_at).toLocaleString('es-AR')}
          </div>
        </header>

        <section className="section">
          <div className="section-title">Datos del personal</div>
          <div>
            <div className="info-row"><div className="info-label">Nombre</div><div className="info-value">{staff.last_name}, {staff.first_name}</div></div>
            <div className="info-row"><div className="info-label">DNI</div><div className="info-value">{staff.dni || 'N/A'}</div></div>
            <div className="info-row"><div className="info-label">CUIL</div><div className="info-value">{staff.cuil || 'N/A'}</div></div>
            <div className="info-row"><div className="info-label">Teléfono</div><div className="info-value">{staff.phone || 'N/A'}</div></div>
            <div className="info-row"><div className="info-label">Email</div><div className="info-value">{staff.email || 'N/A'}</div></div>
            <div className="info-row"><div className="info-label">Cargo</div><div className="info-value">{staff.position || 'N/A'}</div></div>
            <div className="info-row"><div className="info-label">Especialidad</div><div className="info-value">{staff.specialty || 'N/A'}</div></div>
            <div className="info-row"><div className="info-label">Matrícula</div><div className="info-value">{staff.license_number || 'N/A'}</div></div>
            <div className="info-row"><div className="info-label">Ingreso</div><div className="info-value">{staff.hire_date ? formatDate(staff.hire_date) : 'N/A'}</div></div>
            <div className="info-row"><div className="info-label">Baja</div><div className="info-value">{staff.end_date ? formatDate(staff.end_date) : 'N/A'}</div></div>
            <div className="info-row"><div className="info-label">Estado</div><div className="info-value">{staff.status || (staff.is_active ? 'ACTIVE' : 'INACTIVE')}</div></div>
          </div>
        </section>

        <section className="section">
          <div className="section-title">Notas / evaluación interna</div>
          <div className="textarea">{staff.notes || <span style={{ color: '#bbb' }}>Sin notas</span>}</div>
        </section>

        <section className="section">
          <div className="section-title">Resumen del período</div>
          <div>
            <div className="info-row"><div className="info-label">Turnos asignados</div><div className="info-value">{report.summary.total_assignments}</div></div>
            <div className="info-row"><div className="info-label">Cubiertos</div><div className="info-value">{report.summary.assignments_covered}</div></div>
            <div className="info-row"><div className="info-label">Incompletos</div><div className="info-value">{report.summary.assignments_incomplete}</div></div>
            <div className="info-row"><div className="info-label">Sin registro</div><div className="info-value">{report.summary.assignments_no_record}</div></div>
            <div className="info-row"><div className="info-label">Registros de asistencia</div><div className="info-value">{report.summary.total_attendances}</div></div>
            <div className="info-row"><div className="info-label">Horas registradas</div><div className="info-value">{report.summary.total_hours != null ? `${report.summary.total_hours}h` : 'N/A'}</div></div>
          </div>
        </section>

        <section className="section">
          <div className="section-title">Turnos del período</div>
          {report.assignments.length === 0 ? (
            <div style={{ color: '#888' }}>Sin asignaciones en el período</div>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
              <thead>
                <tr style={{ borderBottom: '1px solid #e5e7eb' }}>
                  <th style={{ textAlign: 'left', width: 92 }}>Fecha</th>
                  <th style={{ textAlign: 'left', width: 140 }}>Hogar</th>
                  <th style={{ textAlign: 'left', width: 120 }}>Turno</th>
                  <th style={{ textAlign: 'left', width: 130 }}>Horario</th>
                  <th style={{ textAlign: 'left', width: 110 }}>Asistencia</th>
                  <th style={{ textAlign: 'left' }}>Detalle</th>
                </tr>
              </thead>
              <tbody>
                {report.assignments.map((a) => (
                  <tr key={a.id} style={{ borderBottom: '1px solid #f3f4f6' }}>
                    <td>{formatDate(a.date)}</td>
                    <td>{a.facility_name || '—'}</td>
                    <td>{a.shift_name}</td>
                    <td>{String(a.shift_start_time).slice(0, 5)} - {String(a.shift_end_time).slice(0, 5)}</td>
                    <td>{statusLabel(a.attendance_status)}</td>
                    <td>
                      <div style={{ color: '#374151' }}>Entrada: {formatDateTime(a.attendance_check_in)}</div>
                      <div style={{ color: '#374151' }}>Salida: {formatDateTime(a.attendance_check_out)}</div>
                      {a.notes ? <div style={{ color: '#6b7280', marginTop: 4 }}>Nota turno: {a.notes}</div> : null}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </section>

        <section className="section">
          <div className="section-title">Asistencias registradas (check-in/out)</div>
          {report.attendances.length === 0 ? (
            <div style={{ color: '#888' }}>Sin registros de asistencia en el período</div>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
              <thead>
                <tr style={{ borderBottom: '1px solid #e5e7eb' }}>
                  <th style={{ textAlign: 'left', width: 140 }}>Hogar</th>
                  <th style={{ textAlign: 'left', width: 160 }}>Entrada</th>
                  <th style={{ textAlign: 'left', width: 160 }}>Salida</th>
                  <th style={{ textAlign: 'left' }}>Notas</th>
                </tr>
              </thead>
              <tbody>
                {report.attendances.map((a) => (
                  <tr key={a.id} style={{ borderBottom: '1px solid #f3f4f6' }}>
                    <td>{a.facility_name || '—'}</td>
                    <td>{formatDateTime(a.check_in)}</td>
                    <td>{formatDateTime(a.check_out)}</td>
                    <td>{a.notes || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </section>

        <section className="section">
          <div className="section-title">Firma</div>
          <div className="signature-line">&nbsp;</div>
        </section>
      </div>
    </div>
  );
}
