import { apiClient } from './client';
import type { AgendaEntry, AgendaEntryCreate, AgendaEntryUpdate } from '../types/agenda';

export const agendaApi = {
  listToday: async (date?: string): Promise<AgendaEntry[]> => {
    const params = date ? `?date=${date}` : '';
    return apiClient.get<AgendaEntry[]>(`/agenda/today${params}`);
  },
  
  create: async (data: AgendaEntryCreate): Promise<AgendaEntry> => {
    return apiClient.post<AgendaEntry>('/agenda', data);
  },
  
  update: async (entryId: string, data: AgendaEntryUpdate): Promise<AgendaEntry> => {
    return apiClient.patch<AgendaEntry>(`/agenda/${entryId}`, data);
  },
  
  delete: async (entryId: string): Promise<void> => {
    return apiClient.delete(`/agenda/${entryId}`);
  },
};