import React from 'react';

interface ResidentDocumentsTabProps {
  residentId: string;
}

export const ResidentDocumentsTab: React.FC<ResidentDocumentsTabProps> = ({
  residentId: _residentId,
}) => {
  return (
    <div className="space-y-4">
      <h3 className="font-semibold text-gray-900">Documentos</h3>
      <div className="text-center text-gray-500 py-8">
        Funcionalidad de documentos próximamente
      </div>
    </div>
  );
};
