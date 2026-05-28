import { apiClient } from './client';
import type {
  Certificate,
  CertificateCreate,
  CertificateUpdate,
} from '../types/certificates';

export const certificatesApi = {
  list: async (params?: {
    resident_id?: string;
    facility_id?: string;
    certificate_type?: string;
  }): Promise<Certificate[]> => {
    const searchParams = new URLSearchParams();
    if (params?.resident_id) searchParams.append('resident_id', params.resident_id);
    if (params?.facility_id) searchParams.append('facility_id', params.facility_id);
    if (params?.certificate_type) searchParams.append('certificate_type', params.certificate_type);
    
    return apiClient.get<Certificate[]>(`/certificates?${searchParams.toString()}`);
  },

  get: async (certificateId: string): Promise<Certificate> => {
    return apiClient.get<Certificate>(`/certificates/${certificateId}`);
  },

  create: async (data: CertificateCreate): Promise<Certificate> => {
    return apiClient.post<Certificate>('/certificates', data);
  },

  update: async (certificateId: string, data: CertificateUpdate): Promise<Certificate> => {
    return apiClient.patch<Certificate>(`/certificates/${certificateId}`, data);
  },
};
