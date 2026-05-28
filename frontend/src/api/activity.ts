import { apiClient } from './client';
import type { ActivityEvent } from '../types/activity';

export const activityApi = {
  list: async (
    facilityId: string,
    params?: { since?: string; limit?: number; event_types?: string[] }
  ): Promise<ActivityEvent[]> => {
    const sp = new URLSearchParams({ facility_id: facilityId });
    if (params?.since) sp.append('since', params.since);
    if (params?.limit) sp.append('limit', String(params.limit));
    if (params?.event_types) params.event_types.forEach((t) => sp.append('event_types', t));
    return apiClient.get<ActivityEvent[]>(`/activity?${sp.toString()}`);
  },

  saved: async (facilityId: string, params?: { limit?: number }): Promise<ActivityEvent[]> => {
    const sp = new URLSearchParams({ facility_id: facilityId });
    if (params?.limit) sp.append('limit', String(params.limit));
    return apiClient.get<ActivityEvent[]>(`/activity/saved?${sp.toString()}`);
  },

  save: async (facilityId: string, eventId: string, payload?: { note?: string }): Promise<{ message: string; expires_at: string }> => {
    const sp = new URLSearchParams({ facility_id: facilityId });
    return apiClient.post<{ message: string; expires_at: string }>(`/activity/${eventId}/save?${sp.toString()}`, payload ?? {});
  },

  unsave: async (facilityId: string, eventId: string): Promise<{ message: string }> => {
    const sp = new URLSearchParams({ facility_id: facilityId });
    return apiClient.delete<{ message: string }>(`/activity/${eventId}/save?${sp.toString()}`);
  },
};
