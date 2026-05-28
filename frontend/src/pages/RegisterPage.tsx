import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { authApi } from '../api/auth';
import { Input } from '../components/ui/Input';
import { ErrorMessage } from '../components/ui/ErrorMessage';
import { LoadingSpinner } from '../components/ui/LoadingSpinner';
import { ResendVerificationForm } from '../components/auth/ResendVerificationForm';

export const RegisterPage: React.FC = () => {
  const [step, setStep] = useState<'form' | 'success'>('form');
  
  const [role, setRole] = useState<'doctor' | 'owner'>('doctor');
  const [dni, setDni] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [birthDate, setBirthDate] = useState('');
  const [phone, setPhone] = useState('');
  const [licenseNumber, setLicenseNumber] = useState('');
  
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!dni.trim()) {
      newErrors.dni = 'El DNI es obligatorio';
    }

    if (!email.trim()) {
      newErrors.email = 'El email es obligatorio';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      newErrors.email = 'Email inválido';
    }

    if (!password) {
      newErrors.password = 'La contraseña es obligatoria';
    } else if (password.length < 8) {
      newErrors.password = 'La contraseña debe tener al menos 8 caracteres';
    }

    if (password !== confirmPassword) {
      newErrors.confirmPassword = 'Las contraseñas no coinciden';
    }

    if (!firstName.trim()) {
      newErrors.firstName = 'El nombre es obligatorio';
    }

    if (!lastName.trim()) {
      newErrors.lastName = 'El apellido es obligatorio';
    }

    if (!birthDate) {
      newErrors.birthDate = 'La fecha de nacimiento es obligatoria';
    }

    if (role === 'doctor' && !licenseNumber.trim()) {
      newErrors.licenseNumber = 'La matrícula es obligatoria para médicos';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!validateForm()) {
      return;
    }

    setLoading(true);

    try {
      await authApi.register({
        role,
        dni: dni.trim(),
        email: email.trim().toLowerCase(),
        password,
        first_name: firstName.trim(),
        last_name: lastName.trim(),
        birth_date: birthDate,
        phone: phone.trim() || null,
        license_number: role === 'doctor' ? licenseNumber.trim() : null,
      });
      
      setStep('success');
    } catch (err: any) {
      if (err.detail || err.response?.data?.detail) {
        const errorDetail = err.detail || err.response?.data?.detail;
        
        // Mensajes específicos según el tipo de error
        if (errorDetail.includes('DNI')) {
          setError('Ese DNI ya está registrado. Probá recuperar contraseña.');
        } else if (errorDetail.includes('Email')) {
          setError('Ese email ya está registrado. Probá recuperar contraseña.');
        } else if (errorDetail.includes('Matrícula')) {
          setError('Esa matrícula ya está registrada.');
        } else {
          setError(errorDetail || 'Error al registrar. Intentá nuevamente.');
        }
      } else if (err.response?.status === 409) {
        setError('Ya existe un usuario con estos datos. Probá recuperar contraseña.');
      } else if (err.response?.status === 400) {
        setError(err.response?.data?.detail || 'Datos inválidos. Verificá los campos.');
      } else {
        setError('Error al registrar. Intentá nuevamente.');
      }
    } finally {
      setLoading(false);
    }
  };

  const fallbackGradient = 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)';

  if (step === 'success') {
    return (
      <div
        className="min-h-screen flex items-center justify-center px-4 py-8"
        style={{ background: fallbackGradient }}
      >
        <div className="w-full max-w-md">
          <div className="bg-white rounded-3xl shadow-2xl p-8 border border-gray-100">
            <div className="text-center">
              <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-blue-100 mb-4">
                <svg
                  className="h-8 w-8 text-blue-600"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                  />
                </svg>
              </div>
              <h1 className="text-2xl font-bold text-gray-900 mb-2">
                Revisá tu email
              </h1>
              <p className="text-gray-600 mb-4">
                Te enviamos un enlace de verificación a <strong>{email}</strong>
              </p>
              <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg mb-6">
                <p className="text-sm text-yellow-800">
                  <strong>Importante:</strong> Si no aparece en 2-3 minutos, revisá la carpeta de Spam o Promociones.
                </p>
              </div>
              
              <ResendVerificationForm />
              
              <div className="mt-6 pt-6 border-t border-gray-200">
                <Link
                  to="/login"
                  className="text-sm text-blue-600 hover:text-blue-800"
                >
                  Volver al login
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      className="min-h-screen flex items-center justify-center px-4 py-8"
      style={{ background: fallbackGradient }}
    >
      <div className="w-full max-w-2xl">
        <div className="bg-white rounded-3xl shadow-2xl p-8 border border-gray-100">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              Crear cuenta
            </h1>
            <p className="text-gray-600 text-sm">
              Completá el formulario para registrarte
            </p>
          </div>

          {error && (
            <div className="mb-6">
              <ErrorMessage message={error} onDismiss={() => setError(null)} />
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Rol */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Rol
              </label>
              <div className="flex gap-4">
                <label className="flex items-center">
                  <input
                    type="radio"
                    name="role"
                    value="doctor"
                    checked={role === 'doctor'}
                    onChange={(e) => setRole(e.target.value as 'doctor' | 'owner')}
                    className="mr-2"
                  />
                  Médico
                </label>
                <label className="flex items-center">
                  <input
                    type="radio"
                    name="role"
                    value="owner"
                    checked={role === 'owner'}
                    onChange={(e) => setRole(e.target.value as 'doctor' | 'owner')}
                    className="mr-2"
                  />
                  Owner
                </label>
              </div>
            </div>

            {/* Nombre y Apellido */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input
                label="Nombre"
                type="text"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                required
                disabled={loading}
                error={errors.firstName}
              />
              <Input
                label="Apellido"
                type="text"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                required
                disabled={loading}
                error={errors.lastName}
              />
            </div>

            {/* DNI y Email */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input
                label="DNI"
                type="text"
                value={dni}
                onChange={(e) => setDni(e.target.value)}
                required
                disabled={loading}
                error={errors.dni}
              />
              <Input
                label="Email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                disabled={loading}
                error={errors.email}
              />
            </div>

            {/* Contraseñas */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input
                label="Contraseña"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                disabled={loading}
                error={errors.password}
                placeholder="Mínimo 8 caracteres"
              />
              <Input
                label="Confirmar contraseña"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                disabled={loading}
                error={errors.confirmPassword}
              />
            </div>

            {/* Fecha de nacimiento y Teléfono */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input
                label="Fecha de nacimiento"
                type="date"
                value={birthDate}
                onChange={(e) => setBirthDate(e.target.value)}
                required
                disabled={loading}
                error={errors.birthDate}
                max={new Date().toISOString().split('T')[0]}
              />
              <Input
                label="Teléfono (opcional)"
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                disabled={loading}
              />
            </div>

            {/* Matrícula (solo para médicos) */}
            {role === 'doctor' && (
              <Input
                label="Matrícula"
                type="text"
                value={licenseNumber}
                onChange={(e) => setLicenseNumber(e.target.value)}
                required
                disabled={loading}
                error={errors.licenseNumber}
                placeholder="Número de matrícula médica"
              />
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 px-6 rounded-lg text-white font-medium shadow-md hover:shadow-lg transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
              style={{
                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              }}
            >
              {loading ? (
                <span className="flex items-center justify-center">
                  <LoadingSpinner size="sm" />
                  <span className="ml-2">Registrando...</span>
                </span>
              ) : (
                'Registrarse'
              )}
            </button>
          </form>

          <div className="mt-6 pt-6 border-t border-gray-200">
            <p className="text-center text-sm text-gray-600">
              ¿Ya tenés cuenta?{' '}
              <Link
                to="/login"
                className="text-blue-600 hover:text-blue-800 font-medium"
              >
                Iniciar sesión
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
