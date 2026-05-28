import { apiClient } from './client';
import type { 
  LoginRequest, TokenResponse, User, SetActiveFacilityRequest,
  RegisterRequest, RegisterResponse, VerifyEmailRequest, VerifyEmailResponse,
  ResendVerificationRequest, ResendVerificationResponse,
  ImpersonateRequest, ImpersonateResponse, AdminUsersListResponse,
  UpdateUserStatusRequest, UpdateProfileRequest
} from '../types/auth';

export const authApi = {
  login: async (credentials: LoginRequest): Promise<TokenResponse> => {
    return apiClient.post<TokenResponse>('/auth/login', credentials);
  },

  getCurrentUser: async (): Promise<User> => {
    return apiClient.get<User>('/auth/me');
  },

  setActiveFacility: async (request: SetActiveFacilityRequest): Promise<{ active_facility_id: string }> => {
    return apiClient.post<{ active_facility_id: string }>('/auth/active-facility', request);
  },

  register: async (data: RegisterRequest): Promise<RegisterResponse> => {
    return apiClient.post<RegisterResponse>('/auth/register', data);
  },

  verifyEmail: async (request: VerifyEmailRequest): Promise<VerifyEmailResponse> => {
    return apiClient.post<VerifyEmailResponse>('/auth/verify-email', request);
  },

  resendVerification: async (request: ResendVerificationRequest): Promise<ResendVerificationResponse> => {
    return apiClient.post<ResendVerificationResponse>('/auth/resend-verification', request);
  },

  // Admin functions
  getAdminUsers: async (): Promise<AdminUsersListResponse> => {
    return apiClient.get<AdminUsersListResponse>('/admin/users');
  },

  impersonateUser: async (data: ImpersonateRequest): Promise<ImpersonateResponse> => {
    return apiClient.post<ImpersonateResponse>('/admin/impersonate', data);
  },

  stopImpersonation: async (): Promise<void> => {
    return apiClient.post<void>('/admin/impersonate/stop', {});
  },

  updateUserStatus: async (userId: string, data: UpdateUserStatusRequest): Promise<void> => {
    return apiClient.patch<void>(`/admin/users/${userId}/status`, data);
  },

  // Profile management
  updateProfile: async (data: UpdateProfileRequest): Promise<User> => {
    return apiClient.put<User>('/auth/me', data);
  },

  requestPasswordReset: async (email: string): Promise<void> => {
    return apiClient.post<void>('/auth/password-reset/request', { email });
  },

  confirmPasswordReset: async (token: string, newPassword: string): Promise<void> => {
    return apiClient.post<void>('/auth/password-reset/confirm', { token, new_password: newPassword });
  },
};
