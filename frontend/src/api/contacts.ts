import { apiClient } from './client';
import type {
  ResidentContact,
  ResidentContactCreate,
  ResidentContactUpdate,
} from '../types/residents';

export const contactsApi = {
  list: async (residentId: string): Promise<ResidentContact[]> => {
    return apiClient.get<ResidentContact[]>(`/residents/${residentId}/contacts`);
  },

  create: async (
    residentId: string,
    data: ResidentContactCreate
  ): Promise<ResidentContact> => {
    return apiClient.post<ResidentContact>(
      `/residents/${residentId}/contacts`,
      data
    );
  },

  update: async (
    residentId: string,
    contactId: string,
    data: ResidentContactUpdate
  ): Promise<ResidentContact> => {
    return apiClient.patch<ResidentContact>(
      `/residents/${residentId}/contacts/${contactId}`,
      data
    );
  },

  delete: async (residentId: string, contactId: string): Promise<void> => {
    return apiClient.delete(`/residents/${residentId}/contacts/${contactId}`);
  },
};
