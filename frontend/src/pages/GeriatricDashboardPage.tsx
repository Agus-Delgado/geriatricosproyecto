
import { useParams } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { ActivityFeedWidget } from '../components/dashboard/ActivityFeedWidget';

export default function GeriatricDashboardPage() {
  const { id } = useParams();
  const { getMemberships, activeFacilityId } = useAuth();
  const memberships = getMemberships();
  const activeMembership = memberships.find(m => m.facility_id === (activeFacilityId ?? id) && m.is_active);
  const facilityName = activeMembership?.facility_name ?? id;

  return (
    <div style={{ padding: 24 }}>
      <div
        style={{
          background: 'var(--facility-card)',
          borderRadius: 16,
          padding: 24,
          boxShadow: '0 10px 30px rgba(0,0,0,0.08)',
        }}
      >
        <h1 style={{ margin: 0 }}>Dashboard</h1>
        <p style={{ marginTop: 8, opacity: 0.8 }}>
          Hogar activo: <strong>{facilityName}</strong>
        </p>

        {/* Noticias diarias widget */}
        <div style={{ marginTop: 16, marginBottom: 16 }}>
          <ActivityFeedWidget />
        </div>
        <div style={{ display: 'grid', gap: 12 }}>
          <div style={{ padding: 16, borderRadius: 12, background: 'rgba(255,255,255,0.6)' }}>
            KPIs y resumen (placeholder)
          </div>
          <div style={{ padding: 16, borderRadius: 12, background: 'rgba(255,255,255,0.6)' }}>
            Acciones rápidas (placeholder)
          </div>
        </div>
      </div>
    </div>
  );
}
