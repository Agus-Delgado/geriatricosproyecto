import { useEffect, useMemo, useRef, useState } from 'react';
import { activityApi } from '../api/activity';
import { useFacility } from '../contexts/FacilityContext';
import type { ActivityEvent } from '../types/activity';
import { useNavigate } from 'react-router-dom';
import { Modal } from '../components/ui/Modal';
import { BottomNav } from '../components/layout/BottomNav';

const EVENT_LABELS: Record<string, string> = {
  PATIENT_CREATED: 'Alta de paciente',
  PATIENT_UPDATED: 'Edición de paciente',
  PATIENT_DELETED: 'Paciente Eliminado',
  PATIENT_STATUS_CHANGED: 'Cambio de estado',
  MEDICATION_CHANGED: 'Cambio de medicación',
  CLINICAL_SUMMARY_UPDATED: 'Resumen clínico actualizado',
  CLINICAL_NOTE_CREATED: 'Nota clínica',
  INCIDENT_REPORTED: 'Incidente',
  STAFF_CREATED: 'Nuevo personal agregado',
  STAFF_UPDATED: 'Edición de personal',
  STAFF_ARCHIVED: 'Baja de personal',
  STAFF_TRANSFERRED: 'Traslado de personal',
  SHIFT_ASSIGNED: 'Turno asignado',
  SHIFT_UNASSIGNED: 'Turno removido',
  COVERAGE_UNDERSTAFFED: 'Cobertura insuficiente',
};
const EVENT_TYPES = [
  { type: 'PATIENT_CREATED', label: 'Alta de paciente' },
  { type: 'PATIENT_UPDATED', label: 'Edición de paciente' },
  { type: 'PATIENT_DELETED', label: 'Paciente Eliminado' },
  { type: 'PATIENT_STATUS_CHANGED', label: 'Cambio de estado' },
  { type: 'MEDICATION_CHANGED', label: 'Cambio de medicación' },
  { type: 'CLINICAL_SUMMARY_UPDATED', label: 'Resumen clínico actualizado' },
  { type: 'CLINICAL_NOTE_CREATED', label: 'Notas clínicas' },
  { type: 'INCIDENT_REPORTED', label: 'Incidentes' },
  { type: 'STAFF_CREATED', label: 'Nuevo personal' },
  { type: 'STAFF_UPDATED', label: 'Edición personal' },
  { type: 'STAFF_ARCHIVED', label: 'Baja personal' },
  { type: 'STAFF_TRANSFERRED', label: 'Traslados' },
  { type: 'SHIFT_ASSIGNED', label: 'Turnos asignados' },
  { type: 'SHIFT_UNASSIGNED', label: 'Turnos removidos' },
  { type: 'COVERAGE_UNDERSTAFFED', label: 'Cobertura insuficiente' },
];

const FACILITY_THEMES: Record<string, { primaryColor: string; bgLight: string; textDark: string; textMuted: string }> = {
  amanecer: {
    primaryColor: '#f97316',
    bgLight: '#fff7ed',
    textDark: '#7c2d12',
    textMuted: '#a16207',
  },
  trebol: {
    primaryColor: '#22c55e',
    bgLight: '#f0fdf4',
    textDark: '#14532d',
    textMuted: '#166534',
  },
  estaciones: {
    primaryColor: '#3b82f6',
    bgLight: '#eff6ff',
    textDark: '#1e3a8a',
    textMuted: '#2563eb',
  },
  luz: {
    primaryColor: '#3b82f6',
    bgLight: '#eff6ff',
    textDark: '#1e3a8a',
    textMuted: '#2563eb',
  },
  estrella: {
    primaryColor: '#3b82f6',
    bgLight: '#eff6ff',
    textDark: '#1e3a8a',
    textMuted: '#2563eb',
  },
  default: {
    primaryColor: '#2563eb',
    bgLight: '#f9fafb',
    textDark: '#1e293b',
    textMuted: '#64748b',
  },
};

function normalizeFacilityName(name?: string): string {
  if (!name) return 'default';
  return name
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase();
}

function resolveThemeKey(name?: string): string {
  const n = normalizeFacilityName(name);
  if (n.includes('amanecer')) return 'amanecer';
  if (n.includes('trebol')) return 'trebol';
  if (n.includes('estaciones')) return 'estaciones';
  if (n.includes('luz')) return 'luz';
  if (n.includes('estrella')) return 'estrella';
  return 'default';
}

function normalizeEventType(v: string): string {
  return String(v || '').trim().toUpperCase();
}

function clampPollMinutes(v: number): number {
  if (!Number.isFinite(v)) return 30;
  if (v < 1) return 1;
  if (v > 1440) return 1440;
  return Math.round(v);
}

export default function ActivityFeedPage() {
  const { facility } = useFacility();
  // Derivar clave de theme: usar name, si no id, si no default
  const themeKey = resolveThemeKey(facility?.name);
  const theme = FACILITY_THEMES[themeKey] || FACILITY_THEMES['default'];
  const navigate = useNavigate();
  const [events, setEvents] = useState<ActivityEvent[]>([]);
  const [savedEvents, setSavedEvents] = useState<ActivityEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedTypes, setSelectedTypes] = useState<string[]>([]);
  const [retry, setRetry] = useState(0);

  const [tab, setTab] = useState<'all' | 'saved'>('all');

  const latestSinceRef = useRef<string | null>(null);
  const pollingRef = useRef<number | null>(null);

  const pollStorageKey = `activity_poll_minutes_${facility?.id ?? 'default'}`;
  const [pollMinutes, setPollMinutes] = useState<number>(() => {
    const raw = window.localStorage.getItem(pollStorageKey);
    const n = raw ? Number(raw) : 30;
    return clampPollMinutes(n);
  });

  const [saveModalOpen, setSaveModalOpen] = useState(false);
  const [saveNote, setSaveNote] = useState('');
  const [saveTarget, setSaveTarget] = useState<ActivityEvent | null>(null);
  const [saving, setSaving] = useState(false);

  const selectedTypesKey = useMemo(() => selectedTypes.slice().sort().join(','), [selectedTypes]);

  useEffect(() => {
    const raw = window.localStorage.getItem(pollStorageKey);
    const n = raw ? Number(raw) : 30;
    setPollMinutes(clampPollMinutes(n));
  }, [pollStorageKey]);

  useEffect(() => {
    window.localStorage.setItem(pollStorageKey, String(clampPollMinutes(pollMinutes)));
  }, [pollMinutes, pollStorageKey]);

  useEffect(() => {
    const load = async () => {
      if (!facility) return;
      try {
        setLoading(true);
        setError(null);

        if (tab === 'saved') {
          const data = await activityApi.saved(facility.id, { limit: 200 });
          setSavedEvents(data);
          setLoading(false);
          return;
        }

        const data = await activityApi.list(facility.id, {
          limit: 120,
          event_types: selectedTypes.length > 0 ? selectedTypes : undefined,
        });
        setEvents(data);
        latestSinceRef.current = data?.[0]?.created_at ?? null;
      } catch (e: any) {
        if (e?.response?.status === 401 || e?.response?.status === 403) {
          setError('No autorizado para ver actividades');
        } else if (e?.response?.status === 404) {
          setError('No disponible');
        } else if (e?.message) {
          setError('No se pudo cargar actividades: ' + e.message);
        } else {
          setError('Error al cargar actividades');
        }
      } finally {
        setLoading(false);
      }
    };
    void load();
  }, [facility?.id, selectedTypesKey, retry, tab]);

  useEffect(() => {
    if (!facility) return;
    if (tab !== 'all') return;

    if (pollingRef.current) {
      window.clearInterval(pollingRef.current);
      pollingRef.current = null;
    }

    const intervalMs = clampPollMinutes(pollMinutes) * 60 * 1000;
    pollingRef.current = window.setInterval(async () => {
      try {
        const since = latestSinceRef.current;
        if (!since) return;
        const data = await activityApi.list(facility.id, {
          since,
          limit: 200,
          event_types: selectedTypes.length > 0 ? selectedTypes : undefined,
        });
        if (!data || data.length === 0) return;

        setEvents((prev) => {
          const byId = new Map<string, ActivityEvent>();
          for (const ev of prev) byId.set(ev.id, ev);
          for (const ev of data) byId.set(ev.id, ev);

          const merged = Array.from(byId.values()).sort(
            (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
          );

          const trimmed = merged.slice(0, 300);
          latestSinceRef.current = trimmed?.[0]?.created_at ?? latestSinceRef.current;
          return trimmed;
        });
      } catch {
        // Silencioso: si falla el polling, no rompemos la UI
      }
    }, intervalMs);

    return () => {
      if (pollingRef.current) {
        window.clearInterval(pollingRef.current);
        pollingRef.current = null;
      }
    };
  }, [facility?.id, selectedTypesKey, tab, pollMinutes]);

  const toggleType = (t: string) => {
    setSelectedTypes((prev) => (prev.includes(t) ? prev.filter((x) => x !== t) : [...prev, t]));
  };

  const openSaveModal = (ev: ActivityEvent) => {
    setSaveTarget(ev);
    setSaveNote(ev.saved_note ? String(ev.saved_note) : '');
    setSaveModalOpen(true);
  };

  const doUnsave = async (ev: ActivityEvent) => {
    if (!facility) return;
    await activityApi.unsave(facility.id, ev.id);
    setEvents((prev) => prev.map((x) => (x.id === ev.id ? { ...x, is_saved: false, saved_note: null, saved_expires_at: null } : x)));
    setSavedEvents((prev) => prev.filter((x) => x.id !== ev.id));
  };

  const doSave = async () => {
    if (!facility || !saveTarget) return;
    setSaving(true);
    try {
      const res = await activityApi.save(facility.id, saveTarget.id, { note: saveNote.trim() || undefined });

      setEvents((prev) =>
        prev.map((x) =>
          x.id === saveTarget.id
            ? { ...x, is_saved: true, saved_note: saveNote.trim() || null, saved_expires_at: res.expires_at }
            : x
        )
      );

      if (tab === 'saved') {
        const data = await activityApi.saved(facility.id, { limit: 200 });
        setSavedEvents(data);
      }

      setSaveModalOpen(false);
      setSaveTarget(null);
      setSaveNote('');
    } finally {
      setSaving(false);
    }
  };

  const renderSummary = (ev: ActivityEvent): string => {
    const meta: any = ev.meta || {};
    const eventType = normalizeEventType(ev.event_type);
    if (eventType === 'PATIENT_STATUS_CHANGED') {
      const name = meta.resident_name as string | undefined;
      const status = meta?.changes?.status as string | undefined;
      if (name && status) return `Estado: ${name} → ${status}`;
      if (name) return `Estado: ${name}`;
      if (status) return `Estado: ${status}`;
    }

    if (eventType === 'PATIENT_CREATED' || eventType === 'PATIENT_UPDATED') {
      const name = meta.resident_name as string | undefined;
      if (name) return name;
    }

    return ev.summary || `${ev.entity_type} ${ev.entity_id}`;
  };

  const renderTitle = (ev: ActivityEvent): string => {
    const meta: any = ev.meta || {};
    const eventType = normalizeEventType(ev.event_type);
    if (eventType === 'PATIENT_STATUS_CHANGED') {
      const name = meta.resident_name as string | undefined;
      if (name) return `Estado: ${name}`;
    }
    return EVENT_LABELS[eventType] || ev.event_type;
  };

  const navigateToEntity = (ev: ActivityEvent) => {
    if (!ev.entity_id) return;
    if (ev.entity_type === 'Resident' || ev.entity_type === 'Patient') {
      window.location.assign(`/residents/${ev.entity_id}`);
    } else if (ev.entity_type === 'MedicationPlan' || ev.entity_type === 'MedicationAdministration') {
      const residentId = ev.meta?.resident_id as string | undefined;
      window.location.assign(`/residents/${residentId ?? ev.entity_id}?tab=medications`);
    }
    // Si no hay ruta asociada, no navegar
  };

  const listToRender = tab === 'saved' ? savedEvents : events;

  return (
    <div style={{ background: theme.bgLight, minHeight: '100vh', width: '100%', boxSizing: 'border-box' }}>
      <div style={{ maxWidth: 900, margin: '0 auto', padding: '40px 30px 80px 30px' }}>
        <div className="flex items-center mb-8">
          <button
            type="button"
            className="mr-2"
            style={{
              color: theme.primaryColor,
              fontSize: 28,
              lineHeight: 1,
              padding: '8px 10px',
              borderRadius: 10,
            }}
            onClick={() => navigate(-1)}
            aria-label="Volver"
          >
            ←
          </button>
          <div>
            <h1 className="text-3xl font-bold flex items-center" style={{ color: theme.primaryColor }}>
              <span style={{ fontSize: 32, marginRight: 10 }}>📰</span>Noticias diarias
            </h1>
            {facility?.name && (
              <div style={{ color: theme.textMuted, marginTop: 4, fontSize: 14 }}>
                {facility.name}
              </div>
            )}
          </div>
        </div>

        <div className="flex gap-3 mb-8 flex-wrap">
          <div className="w-full flex gap-3 mb-2">
            <button
              type="button"
              onClick={() => setTab('all')}
              style={{
                background: tab === 'all' ? theme.primaryColor : '#fff',
                color: tab === 'all' ? '#fff' : theme.textDark,
                border: '1px solid #e5e7eb',
                borderRadius: 999,
                padding: '8px 14px',
                fontWeight: 700,
              }}
            >
              Todas
            </button>
            <button
              type="button"
              onClick={() => setTab('saved')}
              style={{
                background: tab === 'saved' ? theme.primaryColor : '#fff',
                color: tab === 'saved' ? '#fff' : theme.textDark,
                border: '1px solid #e5e7eb',
                borderRadius: 999,
                padding: '8px 14px',
                fontWeight: 700,
              }}
            >
              Guardadas
            </button>

            {tab === 'all' ? (
              <div className="ml-auto flex items-center gap-2">
                <div style={{ color: theme.textMuted, fontSize: 14, fontWeight: 600 }}>Auto-actualizar</div>
                <input
                  type="number"
                  min={1}
                  max={1440}
                  value={pollMinutes}
                  onChange={(e) => setPollMinutes(clampPollMinutes(Number(e.target.value)))}
                  className="w-20 border border-gray-300 rounded-lg px-2 py-1"
                />
                <div style={{ color: theme.textMuted, fontSize: 14 }}>min</div>
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    className="px-2 py-1 rounded border border-gray-200 text-sm"
                    onClick={() => setPollMinutes(20)}
                  >
                    20
                  </button>
                  <button
                    type="button"
                    className="px-2 py-1 rounded border border-gray-200 text-sm"
                    onClick={() => setPollMinutes(40)}
                  >
                    40
                  </button>
                  <button
                    type="button"
                    className="px-2 py-1 rounded border border-gray-200 text-sm"
                    onClick={() => setPollMinutes(1440)}
                  >
                    1 día
                  </button>
                </div>
              </div>
            ) : null}
          </div>
          {EVENT_TYPES.map(({ type, label }) => (
            <label key={type} style={{
              display: 'flex', alignItems: 'center', gap: 8, fontWeight: 500, fontSize: 16,
              background: '#fff', border: `2px solid ${selectedTypes.includes(type) ? theme.primaryColor : '#e5e7eb'}`,
              borderRadius: 8, padding: '7px 18px', cursor: 'pointer', boxShadow: selectedTypes.includes(type) ? '0 2px 8px #0001' : 'none',
              color: selectedTypes.includes(type) ? theme.primaryColor : theme.textDark,
              transition: 'border 0.2s, color 0.2s',
            }}>
              <input
                type="checkbox"
                checked={selectedTypes.includes(type)}
                onChange={() => toggleType(type)}
                style={{ accentColor: theme.primaryColor, width: 18, height: 18, marginRight: 8 }}
              />
              {label}
            </label>
          ))}
        </div>
        {error && (
          <div style={{ background: '#fef9c3', borderLeft: '4px solid #facc15', color: '#92400e', padding: 18, borderRadius: 8, marginBottom: 30, maxWidth: 500, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span>{error}</span>
            <button style={{ marginLeft: 18, padding: '7px 18px', background: '#fde68a', color: '#92400e', borderRadius: 6, fontWeight: 500, border: 'none', cursor: 'pointer' }} onClick={() => setRetry(r => r + 1)}>Reintentar</button>
          </div>
        )}
        {loading ? (
          <div style={{ color: theme.textMuted, fontSize: 18, textAlign: 'center', margin: '40px 0' }}>Cargando...</div>
        ) : listToRender.length === 0 ? (
          <div style={{ color: theme.textMuted, fontSize: 20, textAlign: 'center', margin: '60px 0' }}>Sin novedades recientes</div>
        ) : (
          <ul style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
            {listToRender.map((ev) => (
              <li
                key={ev.id}
                style={{
                  background: '#fff', boxShadow: '0 2px 12px #00000012', borderRadius: 10,
                  borderLeft: `4px solid ${theme.primaryColor}`,
                  padding: '18px 22px', width: '100%', cursor: ev.entity_id ? 'pointer' : 'default',
                  transition: 'box-shadow 0.2s',
                }}
                onClick={() => ev.entity_id && (ev.entity_type === 'Resident' || ev.entity_type === 'Patient' || ev.entity_type === 'MedicationPlan' || ev.entity_type === 'MedicationAdministration') && navigateToEntity(ev)}
              >
                <div className="flex items-start justify-between gap-3">
                  <div style={{ fontWeight: 600, fontSize: 18, color: theme.primaryColor }}>{renderTitle(ev)}</div>
                  <button
                    type="button"
                    onClick={async (e) => {
                      e.stopPropagation();
                      if (!facility) return;
                      const isSaved = !!ev.is_saved;
                      if (isSaved) {
                        await doUnsave(ev);
                      } else {
                        openSaveModal(ev);
                      }
                    }}
                    style={{
                      background: 'transparent',
                      border: 'none',
                      cursor: 'pointer',
                      fontSize: 20,
                      color: ev.is_saved ? theme.primaryColor : theme.textMuted,
                      lineHeight: 1,
                    }}
                    aria-label={ev.is_saved ? 'Desguardar' : 'Guardar'}
                    title={ev.is_saved ? 'Desguardar' : 'Guardar'}
                  >
                    {ev.is_saved ? '★' : '☆'}
                  </button>
                </div>
                <div style={{ fontSize: 15, color: theme.textDark, marginTop: 6 }}>{renderSummary(ev)}</div>
                {ev.is_saved && (ev.saved_note || ev.saved_expires_at) ? (
                  <div style={{ marginTop: 8 }}>
                    {ev.saved_note ? (
                      <div style={{ fontSize: 13, color: theme.textDark, opacity: 0.9 }}>
                        Nota: {String(ev.saved_note)}
                      </div>
                    ) : null}
                    {ev.saved_expires_at ? (
                      <div style={{ fontSize: 12, color: theme.textMuted, marginTop: 2 }}>
                        Guardada hasta: {new Date(String(ev.saved_expires_at)).toLocaleString('es-AR')}
                      </div>
                    ) : null}
                  </div>
                ) : null}
                <div style={{ fontSize: 13, color: theme.textMuted, marginTop: 6 }}>{new Date(ev.created_at).toLocaleString('es-AR')}</div>
              </li>
            ))}
          </ul>
        )}
      </div>
      {/* BottomNav eliminado para esta página */}

      <BottomNav />

      <Modal
        isOpen={saveModalOpen}
        onClose={() => {
          setSaveModalOpen(false);
          setSaveTarget(null);
          setSaveNote('');
        }}
        title={saveTarget?.is_saved ? 'Editar nota' : 'Guardar noticia'}
        size="md"
      >
        <div className="space-y-3">
          <div className="text-sm text-gray-600">
            Podés agregar una nota. La noticia quedará guardada por 7 días.
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Nota</label>
            <textarea
              value={saveNote}
              onChange={(e) => setSaveNote(e.target.value)}
              rows={4}
              className="w-full border border-gray-300 rounded-lg p-3 focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Ej: revisar con enfermería / llamar a familiar / etc."
              disabled={saving}
            />
          </div>
          <div className="flex gap-2 justify-end">
            {saveTarget?.is_saved ? (
              <button
                type="button"
                className="px-4 py-2 rounded-lg border border-gray-300 text-gray-700"
                disabled={saving}
                onClick={async () => {
                  if (!saveTarget) return;
                  setSaving(true);
                  try {
                    await doUnsave(saveTarget);
                    setSaveModalOpen(false);
                    setSaveTarget(null);
                    setSaveNote('');
                  } finally {
                    setSaving(false);
                  }
                }}
              >
                Desguardar
              </button>
            ) : null}
            <button
              type="button"
              className="px-4 py-2 rounded-lg border border-gray-300 text-gray-700"
              disabled={saving}
              onClick={() => {
                setSaveModalOpen(false);
                setSaveTarget(null);
                setSaveNote('');
              }}
            >
              Cancelar
            </button>
            <button
              type="button"
              className="px-4 py-2 rounded-lg text-white font-medium"
              style={{ background: theme.primaryColor }}
              disabled={saving}
              onClick={doSave}
            >
              {saving ? 'Guardando...' : 'Guardar'}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

