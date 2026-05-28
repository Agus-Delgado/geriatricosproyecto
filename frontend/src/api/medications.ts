import { apiClient } from './client';
import type {
  MedicationPlan,
  MedicationPlanCreate,
  MedicationPlanUpdate,
  MedicationScheduleTime,
  MedicationScheduleTimeCreate,
  MedicationAdministration,
  MedicationAdministrationCreate,
  MedicationDue,
} from '../types/medications';

export const medicationsApi = {
  listPlans: async (
    residentId: string,
    activeOnly: boolean = false
  ): Promise<MedicationPlan[]> => {
    return apiClient.get<MedicationPlan[]>(
      `/residents/${residentId}/medication-plans?active_only=${activeOnly}`
    );
  },

  createPlan: async (
    residentId: string,
    data: MedicationPlanCreate
  ): Promise<MedicationPlan> => {
    return apiClient.post<MedicationPlan>(
      `/residents/${residentId}/medication-plans`,
      data
    );
  },

  updatePlan: async (
    planId: string,
    data: MedicationPlanUpdate
  ): Promise<MedicationPlan> => {
    return apiClient.patch<MedicationPlan>(`/medication-plans/${planId}`, data);
  },

  addScheduleTime: async (
    planId: string,
    data: MedicationScheduleTimeCreate
  ): Promise<MedicationScheduleTime> => {
    return apiClient.post<MedicationScheduleTime>(
      `/medication-plans/${planId}/times`,
      data
    );
  },

  deleteScheduleTime: async (timeId: string): Promise<void> => {
    return apiClient.delete(`/medication-times/${timeId}`);
  },

  createAdministration: async (
    residentId: string,
    data: MedicationAdministrationCreate
  ): Promise<MedicationAdministration> => {
    return apiClient.post<MedicationAdministration>(
      `/residents/${residentId}/medication-administrations`,
      data
    );
  },

  listAdministrations: async (
    residentId: string,
    date?: string
  ): Promise<MedicationAdministration[]> => {
    const params = date ? `?date=${date}` : '';
    return apiClient.get<MedicationAdministration[]>(
      `/residents/${residentId}/medication-administrations${params}`
    );
  },

  getMedicationDue: async (
    facilityId: string,
    date: string
  ): Promise<MedicationDue[]> => {
    return apiClient.get<MedicationDue[]>(
      `/facilities/${facilityId}/medication-due?date=${date}`
    );
  },
};
