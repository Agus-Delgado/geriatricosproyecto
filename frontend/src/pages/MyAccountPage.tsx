import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { authApi } from '../api/auth';
import { pushApi, urlBase64ToArrayBuffer } from '../api/push';
import { Input } from '../components/ui/Input';
import { Button } from '../components/ui/Button';
import { LoadingSpinner } from '../components/ui/LoadingSpinner';
import { ErrorMessage } from '../components/ui/ErrorMessage';
import { BackHeader } from '../components/ui/BackHeader';
import type { UpdateProfileRequest } from '../types/auth';
import type { ApiError } from '../api/client';

export default function MyAccountPage() {
  const navigate = useNavigate();
  const { user, loadUser, logout, activeFacilityId } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [requestingReset, setRequestingReset] = useState(false);
  const [pushLoading, setPushLoading] = useState(false);
  const [pushEnabled, setPushEnabled] = useState(false);
  const [prefsLoading, setPrefsLoading] = useState(false);
  const [disabledEventTypes, setDisabledEventTypes] = useState<Set<string>>(new Set());
  const [pushTestLoading, setPushTestLoading] = useState(false);
  const [pushTestResult, setPushTestResult] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  
  // Separar full_name en first_name y last_name
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [dni, setDni] = useState('');
  const [currentPassword, setCurrentPassword] = useState('');
  const [dniChanged, setDniChanged] = useState(false);

  useEffect(() => {
    if (user) {
      // Separar full_name
      const nameParts = (user.full_name || '').split(' ', 2);
      setFirstName(nameParts[0] || '');
      setLastName(nameParts[1] || '');
      setEmail(user.email || '');
      setDni(user.dni || '');
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    // Best-effort: si hay una subscripción activa en el browser, consideramos "habilitado"
    const check = async () => {
      try {
        if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
          setPushEnabled(false);
          return;
        }
        const reg = await navigator.serviceWorker.ready;
        const sub = await reg.pushManager.getSubscription();
        setPushEnabled(Boolean(sub));
      } catch {
        setPushEnabled(false);
      }
    };
    void check();
  }, []);

  const EVENT_TYPE_OPTIONS: Array<{ key: string; label: string }> = [
    { key: 'MEDICATION_CHANGED', label: 'Medicaciones' },
    { key: 'INCIDENT_REPORTED', label: 'Incidentes' },
    { key: 'CLINICAL_NOTE_CREATED', label: 'Notas clínicas' },
    { key: 'CLINICAL_SUMMARY_UPDATED', label: 'Resumen clínico' },
    { key: 'PATIENT_STATUS_CHANGED', label: 'Cambios de estado de pacientes' },
    { key: 'PATIENT_CREATED', label: 'Altas de pacientes' },
    { key: 'PATIENT_UPDATED', label: 'Ediciones de pacientes' },
    { key: 'SHIFT_ASSIGNED', label: 'Asignación de turnos' },
    { key: 'SHIFT_UNASSIGNED', label: 'Remoción de turnos' },
    { key: 'STAFF_CREATED', label: 'Altas de personal' },
    { key: 'STAFF_UPDATED', label: 'Ediciones de personal' },
    { key: 'STAFF_ARCHIVED', label: 'Bajas de personal' },
    { key: 'STAFF_TRANSFERRED', label: 'Traslado de personal' },
    { key: 'COVERAGE_UNDERSTAFFED', label: 'Cobertura insuficiente' },
  ];

  const getEligibleMemberships = () =>
    (user?.memberships || []).filter((m) => m.is_active && (m.role === 'ADMIN' || m.role === 'MEDICO'));

  const getPreferredFacilityIdForPush = (): string | null => {
    const memberships = getEligibleMemberships();
    if (memberships.length === 0) return null;
    if (activeFacilityId && memberships.some((m) => m.facility_id === activeFacilityId)) {
      return activeFacilityId;
    }
    return memberships[0].facility_id;
  };

  const handleTestPush = async () => {
    setError(null);
    setSuccess(null);
    setPushTestResult(null);
    setPushTestLoading(true);
    try {
      if (!canUsePush()) {
        setError('Solo ADMIN y MÉDICO pueden probar notificaciones.');
        return;
      }
      const facilityId = getPreferredFacilityIdForPush();
      if (!facilityId) {
        setError('No tenés una sede activa con rol ADMIN/MÉDICO.');
        return;
      }

      const res = await pushApi.testPush({ facility_id: facilityId });
      setPushTestResult(`attempted=${res.attempted}, delivered=${res.delivered}, deleted=${res.deleted}`);
      setSuccess('Se envió la notificación de prueba.');
    } catch (err) {
      const apiError = err as ApiError;
      setError(apiError.detail || 'Error al enviar notificación de prueba');
    } finally {
      setPushTestLoading(false);
    }
  };

  useEffect(() => {
    const loadPrefs = async () => {
      if (!user) return;
      if (!canUsePush()) return;
      const memberships = getEligibleMemberships();
      if (memberships.length === 0) return;

      setPrefsLoading(true);
      try {
        // Tomamos como referencia la primera facility elegible.
        const res = await pushApi.getPreferences(memberships[0].facility_id);
        setDisabledEventTypes(new Set(res.disabled_event_types || []));
      } catch {
        // Best-effort: si falla, dejamos vacío
        setDisabledEventTypes(new Set());
      } finally {
        setPrefsLoading(false);
      }
    };
    void loadPrefs();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  const toggleDisabledEventType = (eventType: string) => {
    setDisabledEventTypes((prev) => {
      const next = new Set(prev);
      if (next.has(eventType)) next.delete(eventType);
      else next.add(eventType);
      return next;
    });
  };

  const handleSavePreferences = async () => {
    setError(null);
    setSuccess(null);
    setPrefsLoading(true);
    try {
      if (!canUsePush()) {
        setError('Solo ADMIN y MÉDICO pueden configurar preferencias.');
        return;
      }
      const memberships = getEligibleMemberships();
      if (memberships.length === 0) {
        setError('No tenés una sede activa con rol ADMIN/MÉDICO.');
        return;
      }
      const disabled = Array.from(disabledEventTypes);
      await Promise.all(
        memberships.map((m) => pushApi.updatePreferences({ facility_id: m.facility_id, disabled_event_types: disabled }))
      );
      setSuccess('Preferencias guardadas.');
    } catch (err) {
      const apiError = err as ApiError;
      setError(apiError.detail || 'Error al guardar preferencias');
    } finally {
      setPrefsLoading(false);
    }
  };

  useEffect(() => {
    const currentDni = (user?.dni || '').trim();
    const newDni = dni.trim();
    setDniChanged(newDni !== currentDni && newDni !== '');
  }, [dni, user?.dni]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    setSaving(true);

    try {
      const updateData: UpdateProfileRequest = {};
      
      if (firstName.trim() !== (user?.full_name?.split(' ', 2)[0] || '')) {
        updateData.first_name = firstName.trim();
      }
      if (lastName.trim() !== (user?.full_name?.split(' ', 2)[1] || '')) {
        updateData.last_name = lastName.trim();
      }
      if (email.trim() !== (user?.email || '')) {
        updateData.email = email.trim();
      }

      // Manejar cambio de DNI
      const currentDni = (user?.dni || '').trim();
      const newDni = dni.trim();
      if (newDni !== currentDni) {
        if (!newDni) {
          setError('El DNI no puede estar vacío');
          setSaving(false);
          return;
        }
        if (!currentPassword.trim()) {
          setError('Se requiere contraseña actual para cambiar el DNI');
          setSaving(false);
          return;
        }
        updateData.dni = newDni;
        updateData.current_password = currentPassword;
      }

      if (Object.keys(updateData).length === 0) {
        setSuccess('No hay cambios para guardar');
        setSaving(false);
        return;
      }

      await authApi.updateProfile(updateData);
      
      // Si se cambió el DNI, forzar re-login
      if (dniChanged) {
        setSuccess('DNI actualizado. Debes volver a iniciar sesión con tu nuevo DNI.');
        setTimeout(async () => {
          await logout();
          navigate('/login', { replace: true });
        }, 2000);
      } else {
        await loadUser(); // Recargar datos del usuario
        setSuccess('Perfil actualizado correctamente');
        setCurrentPassword(''); // Limpiar contraseña después de guardar
      }
    } catch (err) {
      const apiError = err as ApiError;
      setError(apiError.detail || 'Error al actualizar perfil');
    } finally {
      setSaving(false);
    }
  };

  function canUsePush() {
    const isEligibleRole = (user?.memberships || []).some(
      (m) => m.is_active && (m.role === 'ADMIN' || m.role === 'MEDICO')
    );
    return isEligibleRole;
  }

  const ensurePushPermission = async (): Promise<boolean> => {
    if (!('Notification' in window)) return false;
    if (Notification.permission === 'granted') return true;
    if (Notification.permission === 'denied') return false;
    const res = await Notification.requestPermission();
    return res === 'granted';
  };

  const handleEnablePush = async () => {
    setError(null);
    setSuccess(null);
    setPushLoading(true);

    try {
      if (!canUsePush()) {
        setError('Solo ADMIN y MÉDICO pueden activar notificaciones.');
        return;
      }

      if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
        setError('Este dispositivo/navegador no soporta notificaciones push.');
        return;
      }

      const granted = await ensurePushPermission();
      if (!granted) {
        setError('Permiso de notificaciones no concedido.');
        return;
      }

      const publicKey = await pushApi.getVapidPublicKey();
      const reg = await navigator.serviceWorker.ready;

      let sub = await reg.pushManager.getSubscription();
      if (!sub) {
        sub = await reg.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToArrayBuffer(publicKey),
        });
      }

      const json = sub.toJSON() as any;
      const endpoint = json?.endpoint as string | undefined;
      const p256dh = json?.keys?.p256dh as string | undefined;
      const auth = json?.keys?.auth as string | undefined;

      if (!endpoint || !p256dh || !auth) {
        setError('Suscripción inválida en el navegador.');
        return;
      }

      const memberships = (user?.memberships || []).filter(
        (m) => m.is_active && (m.role === 'ADMIN' || m.role === 'MEDICO')
      );

      await Promise.all(
        memberships.map((m) =>
          pushApi.subscribe({
            facility_id: m.facility_id,
            endpoint,
            keys: { p256dh, auth },
            user_agent: navigator.userAgent,
          })
        )
      );

      setPushEnabled(true);
      setSuccess('Notificaciones de Noticias diarias activadas.');
    } catch (err) {
      const apiError = err as ApiError;
      setError(apiError.detail || 'Error al activar notificaciones');
    } finally {
      setPushLoading(false);
    }
  };

  const handleDisablePush = async () => {
    setError(null);
    setSuccess(null);
    setPushLoading(true);

    try {
      if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
        setPushEnabled(false);
        return;
      }

      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.getSubscription();
      const json = sub?.toJSON() as any;
      const endpoint = json?.endpoint as string | undefined;

      const memberships = (user?.memberships || []).filter((m) => m.is_active);

      if (endpoint) {
        await Promise.all(
          memberships.map((m) =>
            pushApi.unsubscribe({
              facility_id: m.facility_id,
              endpoint,
            })
          )
        );
      }

      if (sub) {
        await sub.unsubscribe();
      }

      setPushEnabled(false);
      setSuccess('Notificaciones desactivadas.');
    } catch (err) {
      const apiError = err as ApiError;
      setError(apiError.detail || 'Error al desactivar notificaciones');
    } finally {
      setPushLoading(false);
    }
  };

  const handleRequestPasswordReset = async () => {
    if (!email || !email.trim()) {
      setError('Para cambiar contraseña, primero registrá tu email');
      return;
    }

    setError(null);
    setRequestingReset(true);

    try {
      await authApi.requestPasswordReset(email);
      // Mostrar mensaje genérico
      alert('Si el email es válido, te enviaremos un enlace para restablecer tu contraseña.');
    } catch {
      alert('Si el email es válido, te enviaremos un enlace para restablecer tu contraseña.');
    } finally {
      setRequestingReset(false);
    }
  };

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-6 max-w-2xl">
        <div className="flex justify-center py-12">
          <LoadingSpinner />
        </div>
      </div>
    );
  }

  const getFallbackPath = () => {
    if (activeFacilityId) {
      return `/g/${activeFacilityId}/medical`;
    }
    return '/residents';
  };

  return (
    <div className="container mx-auto px-4 py-6 max-w-2xl">
      <BackHeader
        title="Mi cuenta"
        fallbackPath={getFallbackPath()}
      />

      {error && (
        <div className="mb-4">
          <ErrorMessage message={error} onDismiss={() => setError(null)} />
        </div>
      )}

      {success && (
        <div className="mb-4 bg-green-50 border border-green-200 text-green-800 px-4 py-3 rounded-lg">
          <span className="text-sm">{success}</span>
        </div>
      )}

      <div
        className="rounded-xl shadow-lg p-6 mb-6"
        style={{ backgroundColor: 'var(--facility-card, white)' }}
      >
        <form onSubmit={handleSave} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
              label="Nombre"
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              disabled={saving}
            />
            <Input
              label="Apellido"
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
              disabled={saving}
            />
          </div>

          <Input
            label="Email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            disabled={saving}
          />

          <Input
            label="DNI"
            value={dni}
            onChange={(e) => setDni(e.target.value)}
            disabled={saving}
            placeholder="Ingrese su DNI"
          />

          {dniChanged && (
            <Input
              label="Contraseña actual"
              type="password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              disabled={saving}
              placeholder="Ingrese su contraseña actual"
              required
            />
          )}

          {dniChanged && (
            <div className="bg-blue-50 border border-blue-200 text-blue-800 px-4 py-3 rounded-lg text-sm">
              Al cambiar el DNI, deberás volver a iniciar sesión con tu nuevo DNI.
            </div>
          )}

          {!email || !email.trim() ? (
            <div className="bg-yellow-50 border border-yellow-200 text-yellow-800 px-4 py-3 rounded-lg text-sm">
              Para cambiar contraseña, primero registrá tu email.
            </div>
          ) : null}

          <div className="flex space-x-3 pt-4">
            <Button type="submit" fullWidth disabled={saving}>
              {saving ? 'Guardando...' : 'Guardar cambios'}
            </Button>
          </div>
        </form>
      </div>

      <div
        className="rounded-xl shadow-lg p-6 mb-6"
        style={{ backgroundColor: 'var(--facility-card, white)' }}
      >
        <h2 className="text-xl font-semibold text-gray-900 mb-2" style={{ color: 'var(--facility-accent, #667eea)' }}>
          Notificaciones (Noticias diarias)
        </h2>
        <p className="text-sm text-gray-600 mb-4">
          Recibí notificaciones cuando haya novedades en el hogar.
        </p>

        {!canUsePush() ? (
          <div className="bg-yellow-50 border border-yellow-200 text-yellow-800 px-4 py-3 rounded-lg text-sm">
            Solo disponible para Administrador y Médico.
          </div>
        ) : null}

        <div className="flex space-x-3">
          {pushEnabled ? (
            <Button onClick={handleDisablePush} fullWidth disabled={pushLoading}>
              {pushLoading ? 'Desactivando...' : 'Desactivar notificaciones'}
            </Button>
          ) : (
            <Button onClick={handleEnablePush} fullWidth disabled={pushLoading || !canUsePush()}>
              {pushLoading ? 'Activando...' : 'Activar notificaciones'}
            </Button>
          )}
        </div>

        {canUsePush() ? (
          <div className="pt-3">
            <Button onClick={handleTestPush} fullWidth disabled={pushTestLoading || pushLoading || !pushEnabled}>
              {pushTestLoading ? 'Enviando prueba...' : 'Enviar notificación de prueba'}
            </Button>
            {pushTestResult ? (
              <div className="mt-2 text-xs text-gray-600" style={{ color: 'var(--facility-text, #4b5563)' }}>
                {pushTestResult}
              </div>
            ) : null}
            {!pushEnabled ? (
              <div className="mt-2 text-xs text-gray-600" style={{ color: 'var(--facility-text, #4b5563)' }}>
                Activá notificaciones para habilitar la prueba.
              </div>
            ) : null}
          </div>
        ) : null}

        {canUsePush() ? (
          <div className="mt-5">
            <div className="text-sm text-gray-700 mb-2" style={{ color: 'var(--facility-text, #374151)' }}>
              Elegí qué tipos de noticias querés recibir:
            </div>

            <div className="space-y-2">
              {EVENT_TYPE_OPTIONS.map((opt) => {
                const checked = !disabledEventTypes.has(opt.key);
                return (
                  <label key={opt.key} className="flex items-center justify-between gap-3 text-sm">
                    <span className="text-gray-700">{opt.label}</span>
                    <input
                      type="checkbox"
                      checked={checked}
                      disabled={prefsLoading}
                      onChange={() => toggleDisabledEventType(opt.key)}
                    />
                  </label>
                );
              })}
            </div>

            <div className="pt-4">
              <Button onClick={handleSavePreferences} fullWidth disabled={prefsLoading}>
                {prefsLoading ? 'Guardando...' : 'Guardar preferencias'}
              </Button>
            </div>
          </div>
        ) : null}
      </div>

      <div
        className="rounded-xl shadow-lg p-6"
        style={{ backgroundColor: 'var(--facility-card, white)' }}
      >
        <h2 className="text-xl font-semibold text-gray-900 mb-4" style={{ color: 'var(--facility-accent, #667eea)' }}>
          Cambiar contraseña
        </h2>
        <p className="text-sm text-gray-600 mb-4">
          Te enviaremos un enlace por email para restablecer tu contraseña.
        </p>
        <Button
          onClick={handleRequestPasswordReset}
          disabled={requestingReset || !email || !email.trim()}
          fullWidth
        >
          {requestingReset ? 'Enviando...' : 'Cambiar contraseña'}
        </Button>
      </div>
    </div>
  );
}
