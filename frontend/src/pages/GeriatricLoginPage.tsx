import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

export const GeriatricLoginPage: React.FC = () => {
  const navigate = useNavigate();

  useEffect(() => {
    // Redirect a /login para mantener compatibilidad de rutas
    navigate('/login', { replace: true });
  }, [navigate]);

  return null;
};
