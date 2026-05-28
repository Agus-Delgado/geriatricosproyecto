import { apiClient } from './client';
import type { Facility } from '../types/auth';

export const facilitiesApi = {
  list: async (): Promise<Facility[]> => {
    return apiClient.get<Facility[]>('/facilities');
  },

  get: async (facilityId: string): Promise<Facility> => {
    return apiClient.get<Facility>(`/facilities/${facilityId}`);
  },

  getBySlug: async (slug: string): Promise<Facility> => {
    return apiClient.get<Facility>(`/facilities/by-slug/${slug}`);
  },
};
