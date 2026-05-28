import React from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useFacility } from '../contexts/FacilityContext';
import { Button } from '../components/ui/Button';
import { useNavigate } from 'react-router-dom';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';

export const DebugPage: React.FC = () => {
  const { user, token, isOwner, isDoctor } = useAuth();
  const { facility } = useFacility();
  const navigate = useNavigate();

  // Solo mostrar en desarrollo
  if (!import.meta.env.DEV) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Página no disponible</h1>
          <p className="text-gray-600">Esta página solo está disponible en modo desarrollo.</p>
          <Button onClick={() => navigate('/residents')} className="mt-4">
            Volver
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      <div className="px-4 py-4 space-y-4">
        <div className="card">
          <h3 className="font-semibold text-gray-900 mb-4">Información de Usuario</h3>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-600">ID:</span>
              <span className="font-mono text-xs">{user?.id || 'N/A'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Nombre:</span>
              <span className="font-medium">{user?.full_name || 'N/A'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Email:</span>
              <span className="font-medium">{user?.email || 'N/A'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">DNI:</span>
              <span className="font-medium">{user?.dni || 'N/A'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Activo:</span>
              <span className={user?.is_active ? 'text-green-600' : 'text-red-600'}>
                {user?.is_active ? 'Sí' : 'No'}
              </span>
            </div>
          </div>
        </div>

        <div className="card">
          <h3 className="font-semibold text-gray-900 mb-4">Roles</h3>
          {user?.roles && user.roles.length > 0 ? (
            <div className="space-y-2">
              {user.roles.map((role) => (
                <div key={role.id} className="flex items-center space-x-2">
                  <span className="px-2 py-1 text-xs bg-primary-100 text-primary-800 rounded">
                    {role.code}
                  </span>
                  <span className="text-sm text-gray-700">{role.name}</span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-gray-500">No hay roles asignados</p>
          )}
          <div className="mt-4 pt-4 border-t border-gray-200 space-y-2">
            <div className="flex justify-between">
              <span className="text-gray-600">Es Owner:</span>
              <span className={isOwner ? 'text-green-600 font-semibold' : 'text-gray-600'}>
                {isOwner ? 'Sí' : 'No'}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Es Doctor:</span>
              <span className={isDoctor ? 'text-green-600 font-semibold' : 'text-gray-600'}>
                {isDoctor ? 'Sí' : 'No'}
              </span>
            </div>
          </div>
        </div>

        <div className="card">
          <h3 className="font-semibold text-gray-900 mb-4">Facility</h3>
          {facility ? (
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-600">ID:</span>
                <span className="font-mono text-xs">{facility.id}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Nombre:</span>
                <span className="font-medium">{facility.name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Código:</span>
                <span className="font-medium">{facility.code}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Activa:</span>
                <span className={facility.is_active ? 'text-green-600' : 'text-red-600'}>
                  {facility.is_active ? 'Sí' : 'No'}
                </span>
              </div>
            </div>
          ) : (
            <p className="text-sm text-gray-500">No hay facility seleccionada</p>
          )}
          <div className="mt-4 pt-4 border-t border-gray-200">
            <div className="flex justify-between">
              <span className="text-gray-600">facility_id (localStorage):</span>
              <span className="font-mono text-xs">
                {localStorage.getItem('facility_id') || 'N/A'}
              </span>
            </div>
          </div>
        </div>

        <div className="card">
          <h3 className="font-semibold text-gray-900 mb-4">Configuración</h3>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-600">API Base URL:</span>
              <span className="font-mono text-xs break-all">{API_BASE_URL}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Modo:</span>
              <span className="font-medium">
                {import.meta.env.DEV ? 'Desarrollo' : 'Producción'}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Token presente:</span>
              <span className={token ? 'text-green-600 font-semibold' : 'text-red-600'}>
                {token ? 'Sí' : 'No'}
              </span>
            </div>
            {token && (
              <div className="mt-2 pt-2 border-t border-gray-200">
                <div className="text-gray-600 text-xs mb-1">Token (primeros 20 chars):</div>
                <div className="font-mono text-xs break-all bg-gray-100 p-2 rounded">
                  {token.substring(0, 20)}...
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="card">
          <h3 className="font-semibold text-gray-900 mb-4">Acciones</h3>
          <div className="space-y-2">
            <Button
              variant="secondary"
              onClick={() => {
                console.log('User:', user);
                console.log('Token:', token);
                console.log('Facility:', facility);
                console.log('API Base URL:', API_BASE_URL);
                alert('Información enviada a la consola');
              }}
              fullWidth
            >
              Log Info a Consola
            </Button>
            <Button
              variant="secondary"
              onClick={() => {
                localStorage.clear();
                window.location.reload();
              }}
              fullWidth
            >
              Limpiar LocalStorage y Recargar
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};
