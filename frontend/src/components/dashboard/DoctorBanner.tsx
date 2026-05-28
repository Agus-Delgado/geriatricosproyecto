import React from 'react';

interface DoctorBannerProps {
  userName?: string;
  facilityName?: string;
  medicalQuote: string;
}

export const DoctorBanner: React.FC<DoctorBannerProps> = ({
  userName,
  facilityName,
  medicalQuote,
}) => {
  // Determinar saludo según hora del día
  const getGreeting = (userName?: string): string => {
    const hour = new Date().getHours();
    let timeGreeting: string;
    if (hour >= 5 && hour < 12) {
      timeGreeting = 'Buenos días';
    } else if (hour >= 12 && hour < 20) {
      timeGreeting = 'Buenas tardes';
    } else {
      timeGreeting = 'Buenas noches';
    }
    return userName ? `${timeGreeting}, ${userName}` : timeGreeting;
  };

  const greeting = getGreeting(userName);

  // Determinar subtítulo
  const subtitle = facilityName
    ? `Hogar activo: ${facilityName}`
    : 'Seleccioná un hogar';

  return (
    <div
      className="rounded-xl shadow-lg p-6 md:p-8 mb-6 relative overflow-hidden"
      style={{
        background: 'linear-gradient(135deg, rgba(102, 126, 234, 0.1) 0%, rgba(118, 75, 162, 0.1) 100%)',
        backgroundColor: 'var(--facility-card, white)',
        border: '1px solid rgba(102, 126, 234, 0.2)',
      }}
    >
      <div className="relative z-10">
        <h2 className="text-2xl md:text-3xl font-bold text-gray-900 mb-2">
          {greeting}
        </h2>
        <p className="text-base md:text-lg text-gray-600 mb-4">
          {subtitle}
        </p>
        <div className="mt-6 pt-6 border-t border-gray-200">
          <p className="text-lg md:text-xl text-gray-700 font-medium italic text-center">
            "{medicalQuote}"
          </p>
        </div>
      </div>
    </div>
  );
};