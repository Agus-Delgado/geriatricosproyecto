export interface Role {
  id: string;
  code: string;
  name: string;
}

export interface FacilityAccess {
  id: string;
  facility_id: string;
  facility_name: string;
  facility_code: string;
  access_level: string;
}

export interface FacilityMembership {
  id: string;
  facility_id: string;
  facility_name: string;
  facility_code: string;
  role: 'ADMIN' | 'MEDICO' | 'STAFF';
  is_active: boolean;
}

export interface User {
  id: string;
  email: string | null;
  dni: string | null;
  phone: string | null;
  full_name: string;
  license_number: string | null; // Matrícula médica
  is_active: boolean;
  is_verified: boolean;
  is_platform_admin: boolean;
  active_facility_id: string | null;
  last_login_at: string | null;
  roles: Role[];
  memberships: FacilityMembership[];
}

export interface LoginRequest {
  username: string; // DNI o email
  password: string;
}

export interface SetActiveFacilityRequest {
  facility_id: string;
}

export interface RegisterRequest {
  role: 'doctor' | 'owner';
  dni: string;
  email: string;
  password: string;
  first_name: string;
  last_name: string;
  birth_date: string; // YYYY-MM-DD
  phone?: string | null;
  license_number?: string | null;
}

export interface RegisterResponse {
  message: string;
}

export interface VerifyEmailRequest {
  token: string;
}

export interface VerifyEmailResponse {
  message: string;
}

export interface ResendVerificationRequest {
  email_or_dni: string;
}

export interface ResendVerificationResponse {
  message: string;
}

export interface TokenResponse {
  access_token: string;
  token_type: string;
}

export interface Facility {
  id: string;
  name: string;
  code: string;
  slug: string | null;
  address: string | null; // Dirección del hogar
  is_active: boolean;
}

/**
 * Helper para mapear roles cortos a labels legibles en UI
 */
export function getRoleLabel(role: 'ADMIN' | 'MEDICO' | 'STAFF'): string {
  const labels: Record<'ADMIN' | 'MEDICO' | 'STAFF', string> = {
    ADMIN: 'Administrador',
    MEDICO: 'Médico',
    STAFF: 'Operador',
  };
  return labels[role] || role;
}

// Admin interfaces
export type UserRole = 'doctor' | 'owner' | 'admin';

export interface ImpersonateRequest {
  user_id: string;
  mode?: UserRole;
}

export interface ImpersonateResponse {
  impersonation_token: string;
  expires_in: number; // segundos
}

export interface AdminUserListItem {
  id: string;
  dni: string | null;
  email: string | null;
  full_name: string;
  license_number: string | null;
  is_active: boolean;
  is_verified: boolean;
  role_inferred: 'owner' | 'doctor' | 'staff' | 'platform_admin' | null;
  memberships_count: number;
}

export interface AdminUsersListResponse {
  users: AdminUserListItem[];
}

export interface UpdateUserStatusRequest {
  is_active?: boolean;
  is_verified?: boolean;
}

export interface UpdateProfileRequest {
  first_name?: string;
  last_name?: string;
  email?: string;
  dni?: string;
  current_password?: string; // Requerido solo si se cambia DNI
}

export interface PasswordResetRequest {
  email: string;
}

export interface PasswordResetConfirm {
  token: string;
  new_password: string;
}
