import React from 'react';
import { useAuth } from '../../contexts/AuthContext';

export const ImpersonationBanner: React.FC = () => {
  const { isImpersonating, impersonatedUser, user, stopImpersonation } = useAuth();

  if (!isImpersonating || !impersonatedUser) {
    return null;
  }

  return (
    <div className="bg-yellow-500 text-yellow-900 px-4 py-3 shadow-md">
      <div className="max-w-7xl mx-auto flex items-center justify-between">
        <div className="flex items-center gap-2">
          <svg
            className="w-5 h-5"
            fill="currentColor"
            viewBox="0 0 20 20"
          >
            <path
              fillRule="evenodd"
              d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
              clipRule="evenodd"
            />
          </svg>
          <span className="font-semibold">
            Estás viendo como: <strong>{impersonatedUser.full_name}</strong> (DNI: {impersonatedUser.dni || 'N/A'}).
            {user && (
              <> Actor: <strong>{user.full_name}</strong>.</>
            )}
          </span>
        </div>
        <button
          onClick={stopImpersonation}
          className="bg-yellow-600 hover:bg-yellow-700 text-yellow-900 font-semibold px-4 py-2 rounded transition-colors"
        >
          Salir de modo ver como...
        </button>
      </div>
    </div>
  );
};
