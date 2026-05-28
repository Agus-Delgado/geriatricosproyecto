import { useMemo, useEffect, useState } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { PatientList } from '../components/medical/PatientList';
import { DoctorBanner } from '../components/dashboard/DoctorBanner';
import { DaySummaryCards } from '../components/dashboard/DaySummaryCards';
import { ActivityFeedWidget } from '../components/dashboard/ActivityFeedWidget';
import { AgendaToday } from '../components/dashboard/AgendaToday';
import { getRandomMedicalQuote } from '../data/medicalQuotes';
import { dashboardApi } from '../api/dashboard';
import { getPatientsViewedCount } from '../utils/patientTracking';
import { useAuth } from '../contexts/AuthContext';
import type { DayStats } from '../types/dashboard';

export default function GeriatricMedicalPage() {
  const { id } = useParams();
  const location = useLocation();
  const facilityId = useMemo(() => id ?? '', [id]);
  const { getMemberships, activeFacilityId, user } = useAuth();
  const memberships = getMemberships();
  const activeMembership = memberships.find(m => m.facility_id === (activeFacilityId ?? facilityId) && m.is_active);
  const facilityName = activeMembership?.facility_name ?? facilityId;
  
  // Frase médica rotativa - cambia cada vez que se navega al dashboard
  const [medicalQuote, setMedicalQuote] = useState(getRandomMedicalQuote());
  const [dayStats, setDayStats] = useState<DayStats | null>(null);
  
  useEffect(() => {
    // Recalcular quote cuando se navega a esta ruta
    if (location.pathname.includes(`/g/${facilityId}/medical`)) {
      setMedicalQuote(getRandomMedicalQuote());
    }
  }, [location.pathname, facilityId]);

  // Cargar estadísticas del día
  useEffect(() => {
    const loadDayStats = async () => {
      const today = new Date().toISOString().split('T')[0];
      
      try {
        // Intentar cargar desde API
        const stats = await dashboardApi.getDaySummary(today);
        
        if (stats) {
          // Si tenemos stats de API pero no tiene patients_viewed_today, agregar desde localStorage
          if (stats.patients_viewed_today === undefined && activeFacilityId) {
            stats.patients_viewed_today = getPatientsViewedCount(activeFacilityId, today);
          }
          setDayStats(stats);
        } else {
          // Si no hay API, crear stats desde localStorage
          if (activeFacilityId) {
            setDayStats({
              facilityId: activeFacilityId,
              date: today,
              patients_viewed_today: getPatientsViewedCount(activeFacilityId, today),
              prescriptions_created_today: undefined,
              clinical_notes_created_today: undefined,
            });
          }
        }
      } catch (error) {
        console.error('Error loading day stats:', error);
        // Fallback a localStorage solo
        if (activeFacilityId) {
          const today = new Date().toISOString().split('T')[0];
          setDayStats({
            facilityId: activeFacilityId,
            date: today,
            patients_viewed_today: getPatientsViewedCount(activeFacilityId, today),
            prescriptions_created_today: undefined,
            clinical_notes_created_today: undefined,
          });
        }
      }
    };

    if (activeFacilityId) {
      loadDayStats();
    }
  }, [activeFacilityId]);

  const navigate = useNavigate();

  const handleQuickAction = (action: string) => {
    if (action === 'certificaciones') {
      navigate(`/g/${facilityId}/certificates`);
    } else if (action === 'carpeta-medica') {
      navigate('/medical-folder/search');
    } else if (action === 'historia-clinica') {
      navigate('/clinical-history/search');
    } else if (action === 'historial-recetas') {
      navigate('/prescriptions-history/search');
    } else if (action === 'residents') {
      navigate('/residents');
    } else if (action === 'medical-guide') {
      navigate('/medical-guide');
    }
  };

  return (
    <div className="min-h-screen" style={{ background: 'var(--facility-bg, #f9fafb)' }}>
      <div 
        className="p-4 md:p-8 relative"
        style={{ background: 'var(--facility-bg, #f9fafb)' }}
      >
        {/* Overlay violeta suave para módulo médico */}
        <div 
          className="absolute inset-0 pointer-events-none"
          style={{
            background: 'linear-gradient(135deg, rgba(102, 126, 234, 0.05) 0%, rgba(118, 75, 162, 0.05) 100%)',
          }}
        />
        
        <div className="max-w-6xl mx-auto relative z-10">
          {/* Banner con saludo y frase médica */}
          <DoctorBanner
            userName={user?.full_name}
            facilityName={facilityName}
            medicalQuote={medicalQuote}
          />


          {/* Noticias diarias widget */}
          <ActivityFeedWidget />

          {/* Resumen del día */}
          <DaySummaryCards
            facilityName={facilityName}
            date={new Date().toISOString().split('T')[0]}
            stats={dayStats || undefined}
          />

          {/* Agenda de hoy */}
          <AgendaToday onRefreshStats={() => {
            // Recargar stats del día cuando se actualiza la agenda
            const today = new Date().toISOString().split('T')[0];
            dashboardApi.getDaySummary(today).then(stats => {
              if (stats && activeFacilityId) {
                if (stats.patients_viewed_today === undefined) {
                  stats.patients_viewed_today = getPatientsViewedCount(activeFacilityId, today);
                }
                setDayStats(stats);
              }
            }).catch(() => {
              // Ignorar errores silenciosamente
            });
          }} />

          {/* Quick Actions */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-6">
            {/* Carpeta Médica */}
            <button
              onClick={() => handleQuickAction('carpeta-medica')}
              className="group relative rounded-xl shadow-lg p-6 text-left hover:shadow-xl transition-all duration-300 transform hover:scale-105 border border-gray-200"
              style={{ backgroundColor: 'var(--facility-card, white)' }}
            >
              <div className="text-4xl mb-3">📁</div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Carpeta Médica</h3>
              <p className="text-sm text-gray-600">
                Acceder a carpetas médicas de pacientes
              </p>
            </button>

            {/* Residentes */}
            <button
              onClick={() => handleQuickAction('residents')}
              className="group relative rounded-xl shadow-lg p-6 text-left hover:shadow-xl transition-all duration-300 transform hover:scale-105 border border-gray-200"
              style={{ backgroundColor: 'var(--facility-card, white)' }}
            >
              <div className="text-4xl mb-3">👥</div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Residentes</h3>
              <p className="text-sm text-gray-600">
                Ver, editar y gestionar residentes
              </p>
            </button>

            {/* Historia Clínica */}
            <button
              onClick={() => handleQuickAction('historia-clinica')}
              className="group relative rounded-xl shadow-lg p-6 text-left hover:shadow-xl transition-all duration-300 transform hover:scale-105 border border-gray-200"
              style={{ backgroundColor: 'var(--facility-card, white)' }}
            >
              <div className="text-4xl mb-3">📋</div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Historia Clínica</h3>
              <p className="text-sm text-gray-600">
                Ver y gestionar historias clínicas
              </p>
            </button>

            {/* Guía médica */}
            <button
              onClick={() => handleQuickAction('medical-guide')}
              className="group relative rounded-xl shadow-lg p-6 text-left hover:shadow-xl transition-all duration-300 transform hover:scale-105 border border-gray-200"
              style={{ backgroundColor: 'var(--facility-card, white)' }}
            >
              <div className="text-4xl mb-3">📋</div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Guía médica</h3>
              <p className="text-sm text-gray-600">
                Buscar pacientes y ver medicación actual e historial
              </p>
            </button>

            {/* Historial de Recetas */}
            <button
              onClick={() => handleQuickAction('historial-recetas')}
              className="group relative rounded-xl shadow-lg p-6 text-left hover:shadow-xl transition-all duration-300 transform hover:scale-105 border border-gray-200"
              style={{ backgroundColor: 'var(--facility-card, white)' }}
            >
              <div className="text-4xl mb-3">💊</div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Historial de Recetas</h3>
              <p className="text-sm text-gray-600">
                Consultar historial de recetas (sin emitir)
              </p>
            </button>

            {/* Constancias */}
            <button
              onClick={() => handleQuickAction('certificaciones')}
              className="group relative rounded-xl shadow-lg p-6 text-left hover:shadow-xl transition-all duration-300 transform hover:scale-105 border border-gray-200"
              style={{ backgroundColor: 'var(--facility-card, white)' }}
            >
              <div className="text-4xl mb-3">📜</div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Constancias</h3>
              <p className="text-sm text-gray-600">
                Gestionar constancias médicas
              </p>
            </button>
          </div>


          {/* Sección Pacientes */}
          <div className="mt-8">
            <PatientList facilityId={facilityId} />
          </div>
        </div>
      </div>
    </div>
  );
}
