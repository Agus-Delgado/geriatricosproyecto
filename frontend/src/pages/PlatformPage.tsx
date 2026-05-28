import React from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Link } from 'react-router-dom';

export const PlatformPage: React.FC = () => {
  const { user } = useAuth();

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="p-8">
        <div className="max-w-4xl mx-auto">
          <div className="bg-white rounded-lg shadow p-6">
          
            <div className="space-y-4">
              <div>
                <p className="text-gray-600">Usuario: {user?.full_name}</p>
                <p className="text-gray-600">DNI: {user?.dni}</p>
                <p className="text-gray-600">Email: {user?.email || 'N/A'}</p>
              </div>
              
              <div className="mt-6 space-y-4">
                <div className="p-4 bg-blue-50 rounded">
                  <p className="text-blue-900 font-semibold mb-2">Funcionalidades disponibles:</p>
                  <ul className="list-disc list-inside text-blue-800 space-y-1">
                    <li>
                      <Link to="/admin/users" className="text-blue-600 hover:text-blue-800 underline">
                        Gestión de Usuarios
                      </Link>
                      {' - Ver y administrar todos los usuarios de la plataforma'}
                    </li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
