import { apiClient } from './client';
import type { ApiError } from './client';
import type {
  Resident,
  ResidentCreate,
  ResidentUpdate,
} from '../types/residents';

export const residentsApi = {
  list: async (
    facilityId: string,
    params?: { q?: string; stay_status?: string; status?: string }
  ): Promise<Resident[]> => {
    const searchParams = new URLSearchParams({ facility_id: facilityId });
    if (params?.q) searchParams.append('q', params.q);
    if (params?.stay_status) searchParams.append('stay_status', params.stay_status);
    if (params?.status) searchParams.append('status', params.status);
    
    return apiClient.get<Resident[]>(`/residents?${searchParams.toString()}`);
  },

  get: async (residentId: string): Promise<Resident> => {
    return apiClient.get<Resident>(`/residents/${residentId}`);
  },

  create: async (data: ResidentCreate): Promise<Resident> => {
    return apiClient.post<Resident>('/residents', data);
  },

  update: async (residentId: string, data: ResidentUpdate): Promise<Resident> => {
    return apiClient.patch<Resident>(`/residents/${residentId}`, data);
  },

  delete: async (residentId: string): Promise<void> => {
    return apiClient.delete<void>(`/residents/${residentId}`);
  },

  listDeleted: async (
    facilityId: string,
    params?: { q?: string; within_days?: number }
  ): Promise<Resident[]> => {
    const searchParams = new URLSearchParams({ facility_id: facilityId });
    if (params?.q) searchParams.append('q', params.q);
    if (params?.within_days) searchParams.append('within_days', String(params.within_days));
    return apiClient.get<Resident[]>(`/residents/deleted?${searchParams.toString()}`);
  },

  restore: async (residentId: string, withinDays?: number): Promise<Resident> => {
    const searchParams = new URLSearchParams();
    if (withinDays) searchParams.append('within_days', String(withinDays));
    const qs = searchParams.toString();
    return apiClient.post<Resident>(`/residents/${residentId}/restore${qs ? `?${qs}` : ''}`, {});
  },

  uploadDocument: async (residentId: string, file: File): Promise<Resident> => {
    const formData = new FormData();
    formData.append('file', file);
    
    const token = localStorage.getItem('token');
    const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';
    
    const response = await fetch(`${API_BASE_URL}/residents/${residentId}/document`, {
      method: 'POST',
      headers: {
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: formData,
    });
    
    if (!response.ok) {
      const error = await response.json().catch(() => ({ detail: response.statusText }));
      throw { detail: error.detail || 'Error al subir documento', status: response.status } as ApiError;
    }
    
    return response.json();
  },
};
