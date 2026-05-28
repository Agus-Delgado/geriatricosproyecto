import { useEffect, useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { FacilityProvider } from './contexts/FacilityContext';
import { PWAProvider } from './contexts/PWAContext';
import { ProtectedRoute } from './components/auth/ProtectedRoute';
import { UnauthorizedHandler } from './components/auth/UnauthorizedHandler';
import { SessionExpiredHandler } from './components/auth/SessionExpiredHandler';
import { SessionBootstrap } from './components/auth/SessionBootstrap';
import { Header } from './components/layout/Header';
import { ErrorBoundary } from './components/ui/ErrorBoundary';
import HomeRedirect from './components/navigation/HomeRedirect';
import { useFacilityTheme } from './hooks/useFacilityTheme';
import { LoginPage } from './pages/LoginPage';
import { GeriatricLoginPage } from './pages/GeriatricLoginPage';
import { SelectFacilityPage } from './pages/SelectFacilityPage';
import { PlatformPage } from './pages/PlatformPage';
import { AdminUsersPage } from './pages/AdminUsersPage';
import { ImpersonationBanner } from './components/admin/ImpersonationBanner';
import { ReleaseNotesModal } from './components/pwa/ReleaseNotesModal';
import { CURRENT_RELEASE_NOTES } from './config/releaseNotes';
import GeriatricDashboardPage from './pages/GeriatricDashboardPage';
import GeriatricTasksPage from './pages/GeriatricTasksPage';
import GeriatricMedicalPage from './pages/GeriatricMedicalPage';
import CertificatesPage from './pages/CertificatesPage';
import CertificatePrintPage from './pages/CertificatePrintPage';
import { ResidentsListPage } from './pages/ResidentsListPage';
import ResidentsTrashPage from './pages/ResidentsTrashPage';
import { ResidentDetailPage } from './pages/ResidentDetailPage';
import { MedicalGuidePage } from './pages/MedicalGuidePage';
import { FinancePage } from './pages/FinancePage';
import { StaffManagementPage } from './pages/StaffManagementPage';
import { AttendancePage } from './pages/AttendancePage';
import { DebugPage } from './pages/DebugPage';
import ClinicalHistorySearchPage from './pages/ClinicalHistorySearchPage';
import ClinicalHistoryPage from './pages/ClinicalHistoryPage';
import ClinicalHistoryPrintPage from './pages/ClinicalHistoryPrintPage';
import { CurrentlyWorkingPage } from './pages/CurrentlyWorkingPage';
import { ShiftsManagementPage } from './pages/ShiftsManagementPage';
import { ShiftAssignmentsPage } from './pages/ShiftAssignmentsPage';
import MedicalFolderSearchPage from './pages/MedicalFolderSearchPage';
import MedicalFolderPage from './pages/MedicalFolderPage';
import MedicalFolderPrintPage from './pages/MedicalFolderPrintPage';
import PrescriptionsHistorySearchPage from './pages/PrescriptionsHistorySearchPage';
import PrescriptionsHistoryPage from './pages/PrescriptionsHistoryPage';
import PrescriptionPrintPage from './pages/PrescriptionPrintPage';
import ResidentPrintPage from './pages/ResidentPrintPage';
import StaffPrintPage from './pages/StaffPrintPage';
import ActivityFeedPage from './pages/ActivityFeedPage';
import MyAccountPage from './pages/MyAccountPage';
import ResetPasswordPage from './pages/ResetPasswordPage';
import { OwnerDashboardPage } from './pages/OwnerDashboardPage';
import { useAuth } from './contexts/AuthContext';
import { VersionUpdateWatcher } from './components/app/VersionUpdateWatcher';

function AppContent() {
  useFacilityTheme();
  const location = useLocation();
  const { user, isOwner, isDoctor, isPlatformAdmin, getActiveRole, activeFacilityId } = useAuth();
  const [isReleaseNotesOpen, setIsReleaseNotesOpen] = useState(false);
  
  const isPublic = location.pathname.startsWith('/login') ||
                   location.pathname.startsWith('/reset-password');

  useEffect(() => {
    if (isPublic) return;
    if (!user) return;
    if (!activeFacilityId) return;
    const activeRole = getActiveRole();
    const canSee =
      isOwner ||
      isDoctor ||
      isPlatformAdmin ||
      activeRole === 'ADMIN' ||
      activeRole === 'MEDICO';
    if (!canSee) return;
    if (!location.pathname.startsWith('/g/')) return;
    if (location.pathname.includes('/print')) return;

    const key = `release_notes_last_seen:${user.id}`;
    const lastSeen = localStorage.getItem(key);
    if (lastSeen !== CURRENT_RELEASE_NOTES.version) {
      setIsReleaseNotesOpen(true);
    }
  }, [activeFacilityId, getActiveRole, isDoctor, isOwner, isPlatformAdmin, isPublic, location.pathname, user]);

  const handleCloseReleaseNotes = () => {
    if (user) {
      const key = `release_notes_last_seen:${user.id}`;
      localStorage.setItem(key, CURRENT_RELEASE_NOTES.version);
    }
    setIsReleaseNotesOpen(false);
  };

  return (
    <>
      <UnauthorizedHandler />
      <SessionExpiredHandler />
      <ImpersonationBanner />
      <ReleaseNotesModal
        isOpen={isReleaseNotesOpen}
        onClose={handleCloseReleaseNotes}
        notes={CURRENT_RELEASE_NOTES}
      />
      {!isPublic && <Header />}
      <Routes>
        {/* Rutas públicas */}
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<Navigate to="/login" replace />} />
        <Route path="/verify-email" element={<Navigate to="/login" replace />} />
        <Route path="/reset-password" element={<ResetPasswordPage />} />
        <Route path="/login/:geriatricSlug" element={<GeriatricLoginPage />} />

        {/* Rutas de selección/plataforma */}
        <Route
          path="/select-facility"
          element={
            <ProtectedRoute requireFacility={false}>
              <SelectFacilityPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/mi-cuenta"
          element={
            <ProtectedRoute requireFacility={false}>
              <MyAccountPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/platform"
          element={
            <ProtectedRoute requirePlatformAdmin={true} requireFacility={false}>
              <PlatformPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/users"
          element={
            <ProtectedRoute requirePlatformAdmin={true} requireFacility={false}>
              <AdminUsersPage />
            </ProtectedRoute>
          }
        />

        {/* Rutas del hogar (facility-specific) */}
        <Route
          path="/g/:id/dashboard"
          element={
            <ProtectedRoute requireRole="ADMIN">
              <GeriatricDashboardPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/g/:id/owner"
          element={
            <ProtectedRoute requireOwner={true}>
              <OwnerDashboardPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/g/:id/tasks"
          element={
            <ProtectedRoute requireRole="STAFF">
              <GeriatricTasksPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/g/:id/medical"
          element={
            <ProtectedRoute requireRoles={['MEDICO', 'ADMIN']}>
              <GeriatricMedicalPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/g/:id/certificates"
          element={
            <ProtectedRoute requireRole="MEDICO">
              <CertificatesPage />
            </ProtectedRoute>
          }
        />

        {/* Constancias - Print */}
        <Route path="/certificates/print" element={<CertificatePrintPage />} />

        {/* Residentes */}
        <Route
          path="/residents"
          element={
            <ProtectedRoute>
              <ResidentsListPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/residents/trash"
          element={
            <ProtectedRoute>
              <ResidentsTrashPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/residents/:id"
          element={
            <ProtectedRoute>
              <ResidentDetailPage />
            </ProtectedRoute>
          }
        />
        <Route path="/residents/:id/print" element={<ResidentPrintPage />} />

        {/* Guía médica */}
        <Route
          path="/medical-guide"
          element={
            <ProtectedRoute>
              <MedicalGuidePage />
            </ProtectedRoute>
          }
        />
        
        {/* Medicaciones - Redirect a Guía médica */}
        <Route
          path="/medication-due"
          element={
            <ProtectedRoute>
              <Navigate to="/medical-guide" replace />
            </ProtectedRoute>
          }
        />

        {/* Finanzas (solo OWNER) */}
        <Route
          path="/finance"
          element={
            <ProtectedRoute requireOwner={true}>
              <FinancePage />
            </ProtectedRoute>
          }
        />

        {/* Staff (solo OWNER) */}
        <Route
          path="/staff"
          element={
            <ProtectedRoute requireOwner={true}>
              <StaffManagementPage />
            </ProtectedRoute>
          }
        />
        <Route path="/staff/:id/print" element={<StaffPrintPage />} />

        {/* Asistencia (solo OWNER) */}
        <Route
          path="/attendance"
          element={
            <ProtectedRoute requireOwner={true}>
              <AttendancePage />
            </ProtectedRoute>
          }
        />

        <Route
          path="/currently-working"
          element={
            <ProtectedRoute requireOwner={true}>
              <CurrentlyWorkingPage />
            </ProtectedRoute>
          }
        />

        <Route
          path="/shifts-management"
          element={
            <ProtectedRoute requireOwner={true}>
              <ShiftsManagementPage />
            </ProtectedRoute>
          }
        />

        <Route
          path="/shift-assignments"
          element={
            <ProtectedRoute requireOwner={true}>
              <ShiftAssignmentsPage />
            </ProtectedRoute>
          }
        />

        {/* Historia Clínica */}
        <Route
          path="/clinical-history/search"
          element={
            <ProtectedRoute requireRole="MEDICO">
              <ClinicalHistorySearchPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/clinical-history/:patientId"
          element={
            <ProtectedRoute requireRole="MEDICO">
              <ClinicalHistoryPage />
            </ProtectedRoute>
          }
        />
        <Route path="/clinical-history/:patientId/print" element={<ClinicalHistoryPrintPage />} />

        {/* Carpeta Médica */}
        <Route
          path="/medical-folder/search"
          element={
            <ProtectedRoute requireRole="MEDICO">
              <MedicalFolderSearchPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/medical-folder/:patientId"
          element={
            <ProtectedRoute requireRole="MEDICO">
              <MedicalFolderPage />
            </ProtectedRoute>
          }
        />
        <Route path="/medical-folder/:patientId/print" element={<MedicalFolderPrintPage />} />

        {/* Historial de Recetas */}
        <Route
          path="/prescriptions-history/search"
          element={
            <ProtectedRoute requireRole="MEDICO">
              <PrescriptionsHistorySearchPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/prescriptions-history/:patientId"
          element={
            <ProtectedRoute requireRole="MEDICO">
              <PrescriptionsHistoryPage />
            </ProtectedRoute>
          }
        />
        <Route path="/prescriptions-history/:patientId/print" element={<PrescriptionPrintPage />} />

        {/* Actividad */}
        <Route
          path="/activity"
          element={
            <ProtectedRoute>
              <ActivityFeedPage />
            </ProtectedRoute>
          }
        />

        {/* Debug (solo en desarrollo) */}
        {import.meta.env.DEV && <Route path="/debug" element={<DebugPage />} />}

        {/* Home redirect - IMPORTANTE: AL FINAL */}
        <Route path="/" element={<HomeRedirect />} />
        
        {/* Catch-all: redirigir a home */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </>
  );
}

function App() {
  return (
    <BrowserRouter>
      <ErrorBoundary>
        <AuthProvider>
          <SessionBootstrap>
            <PWAProvider>
              <FacilityProvider>
                <AppWithWatcher />
                <AppContent />
              </FacilityProvider>
            </PWAProvider>
          </SessionBootstrap>
        </AuthProvider>
      </ErrorBoundary>
    </BrowserRouter>
  );
}

// Componente interno para acceder al AuthContext y mostrar el watcher solo cuando hay token
function AppWithWatcher() {
  const { token } = useAuth();

  // Solo mostrar el watcher cuando hay token (usuario logueado)
  if (!token) {
    return null;
  }

  return <VersionUpdateWatcher intervalMs={120000} autoReload={false} />;
}

export default App;