import React from 'react';
import { Navigate } from 'react-router-dom';

export const MedicationDuePage: React.FC = () => {
  // Redirect a Guía médica - esta página ya no se muestra en la UI
  return <Navigate to="/medical-guide" replace />;
};
