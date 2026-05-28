import { apiClient } from './client';
import type {
  PrescriptionLog,
  PrescriptionLogCreate,
} from '../types/prescriptions';

export const prescriptionsApi = {
  listLogs: async (
    patientId: string,
    limit?: number
  ): Promise<PrescriptionLog[]> => {
    const params = limit ? `?limit=${limit}` : '';
    return apiClient.get<PrescriptionLog[]>(
      `/patients/${patientId}/prescriptions${params}`
    );
  },

  createLog: async (
    patientId: string,
    data: PrescriptionLogCreate
  ): Promise<PrescriptionLog> => {
    return apiClient.post<PrescriptionLog>(
      `/patients/${patientId}/prescriptions`,
      data
    );
  },
};