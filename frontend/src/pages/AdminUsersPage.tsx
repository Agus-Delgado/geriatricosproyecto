import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { authApi } from '../api/auth';
import type { AdminUserListItem, UserRole } from '../types/auth';
import { useNavigate } from 'react-router-dom';

export const AdminUsersPage: React.FC = () => {
  const { user, startImpersonation } = useAuth();
  const navigate = useNavigate();
  const [users, setUsers] = useState<AdminUserListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [updatingUsers, setUpdatingUsers] = useState<Set<string>>(new Set());

  useEffect(() => {
    loadUsers();
  }, []);

  const loadUsers = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await authApi.getAdminUsers();
      setUsers(response.users);
    } catch (err: any) {
      setError(err.detail || 'Error al cargar usuarios');
    } finally {
      setLoading(false);
    }
  };

  const handleImpersonate = async (targetUser: AdminUserListItem, mode: UserRole) => {
    try {
      setUpdatingUsers(prev => new Set(prev).add(targetUser.id));
      await startImpersonation(targetUser.id, mode);
      
      // Redirigir según el modo
      if (mode === 'doctor') {
        // Redirigir al módulo médico si tiene facility activa
        const targetUserData = users.find(u => u.id === targetUser.id);
        if (targetUserData && targetUserData.memberships_count > 0) {
          // Necesitamos obtener la facility_id, pero por ahora redirigimos a una página genérica
          // El usuario deberá seleccionar facility si tiene múltiples
          navigate('/select-facility');
        } else {
          navigate('/select-facility');
        }
      } else {
        // Redirigir al dashboard de owner
        navigate('/select-facility');
      }
    } catch (err: any) {
      alert(err.message || 'Error al iniciar impersonación');
    } finally {
      setUpdatingUsers(prev => {
        const next = new Set(prev);
        next.delete(targetUser.id);
        return next;
      });
    }
  };

  const handleToggleActive = async (targetUser: AdminUserListItem) => {
    try {
      setUpdatingUsers(prev => new Set(prev).add(targetUser.id));
      await authApi.updateUserStatus(targetUser.id, {
        is_active: !targetUser.is_active
      });
      // Recargar lista
      await loadUsers();
    } catch (err: any) {
      alert(err.detail || 'Error al actualizar estado');
    } finally {
      setUpdatingUsers(prev => {
        const next = new Set(prev);
        next.delete(targetUser.id);
        return next;
      });
    }
  };

  const handleForceVerify = async (targetUser: AdminUserListItem) => {
    try {
      setUpdatingUsers(prev => new Set(prev).add(targetUser.id));
      await authApi.updateUserStatus(targetUser.id, {
        is_verified: true
      });
      // Recargar lista
      await loadUsers();
    } catch (err: any) {
      alert(err.detail || 'Error al forzar verificación');
    } finally {
      setUpdatingUsers(prev => {
        const next = new Set(prev);
        next.delete(targetUser.id);
        return next;
      });
    }
  };

  const getRoleLabel = (role: string | null): string => {
    if (!role) return 'Sin rol';
    const labels: Record<string, string> = {
      owner: 'Owner',
      doctor: 'Médico',
      staff: 'Staff',
      platform_admin: 'Platform Admin',
    };
    return labels[role] || role;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-gray-600">Cargando usuarios...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="p-8">
        <div className="max-w-7xl mx-auto">
          <div className="mb-6">
            <h1 className="text-3xl font-bold text-gray-900">Gestión de Usuarios</h1>
            <p className="text-gray-600 mt-2">Administrar usuarios de la plataforma</p>
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded mb-4">
              {error}
            </div>
          )}

          <div className="bg-white rounded-lg shadow overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      DNI
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Email
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Nombre
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Matrícula
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Estado
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Rol
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Memberships
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Acciones
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {users.map((targetUser) => {
                    const isUpdating = updatingUsers.has(targetUser.id);
                    const canImpersonate = targetUser.id !== user?.id && targetUser.is_active;
                    const hasDoctorRole = targetUser.role_inferred === 'doctor' || targetUser.license_number;
                    const hasOwnerRole = targetUser.role_inferred === 'owner' || targetUser.memberships_count > 0;

                    return (
                      <tr key={targetUser.id} className={isUpdating ? 'opacity-50' : ''}>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {targetUser.dni || '-'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {targetUser.email || '-'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                          {targetUser.full_name}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {targetUser.license_number || '-'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex flex-col gap-1">
                            <span
                              className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                                targetUser.is_active
                                  ? 'bg-green-100 text-green-800'
                                  : 'bg-red-100 text-red-800'
                              }`}
                            >
                              {targetUser.is_active ? 'Activo' : 'Inactivo'}
                            </span>
                            <span
                              className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                                targetUser.is_verified
                                  ? 'bg-blue-100 text-blue-800'
                                  : 'bg-yellow-100 text-yellow-800'
                              }`}
                            >
                              {targetUser.is_verified ? 'Verificado' : 'No verificado'}
                            </span>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {getRoleLabel(targetUser.role_inferred)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {targetUser.memberships_count}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                          <div className="flex flex-col gap-2">
                            {canImpersonate && (
                              <div className="flex gap-2">
                                {hasDoctorRole && (
                                  <button
                                    onClick={() => handleImpersonate(targetUser, 'doctor')}
                                    disabled={isUpdating}
                                    className="text-blue-600 hover:text-blue-900 text-xs disabled:opacity-50"
                                  >
                                    Ver como Médico
                                  </button>
                                )}
                                {hasOwnerRole && (
                                  <button
                                    onClick={() => handleImpersonate(targetUser, 'owner')}
                                    disabled={isUpdating}
                                    className="text-purple-600 hover:text-purple-900 text-xs disabled:opacity-50"
                                  >
                                    Ver como Owner
                                  </button>
                                )}
                              </div>
                            )}
                            <div className="flex gap-2">
                              <button
                                onClick={() => handleToggleActive(targetUser)}
                                disabled={isUpdating}
                                className="text-gray-600 hover:text-gray-900 text-xs disabled:opacity-50"
                              >
                                {targetUser.is_active ? 'Desactivar' : 'Activar'}
                              </button>
                              {!targetUser.is_verified && (
                                <button
                                  onClick={() => handleForceVerify(targetUser)}
                                  disabled={isUpdating}
                                  className="text-green-600 hover:text-green-900 text-xs disabled:opacity-50"
                                >
                                  Forzar verificación
                                </button>
                              )}
                            </div>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
