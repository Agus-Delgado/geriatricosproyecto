import { apiClient } from './client';
import type { DayStats } from '../types/dashboard';

export const dashboardApi = {
  getDaySummary: async (date: string): Promise<DayStats | null> => {
    try {
      return await apiClient.get<DayStats>(`/dashboard/summary?date=${date}`);
    } catch (error: unknown) {
      // Si el endpoint no existe o hay error, retornar null (degradación graceful)
      const status = (error as { status?: number })?.status;
      if (status === 404 || status === 500) {
        return null;
      }
      throw error;
    }
  },
};