import { apiClient } from './client';
import type {
  Shift,
  ShiftCreate,
  ShiftUpdate,
  ShiftAssignment,
  ShiftAssignmentCreate,
  ShiftAssignmentUpdate,
  FacilityStaffDashboard,
  CurrentlyWorkingStaff,
} from '../types/staff';

// ========== SHIFTS API ==========

export const shiftsApi = {
  list: async (
    facilityId: string,
    params?: { active_only?: boolean }
  ): Promise<Shift[]> => {
    const queryParams = new URLSearchParams();
    queryParams.append('facility_id', facilityId);
    if (params?.active_only !== undefined) {
      queryParams.append('active_only', params.active_only.toString());
    }
    return apiClient.get<Shift[]>(`/shifts?${queryParams.toString()}`);
  },

  get: async (shiftId: string): Promise<Shift> => {
    return apiClient.get<Shift>(`/shifts/${shiftId}`);
  },

  create: async (data: ShiftCreate): Promise<Shift> => {
    return apiClient.post<Shift>('/shifts', data);
  },

  update: async (shiftId: string, data: ShiftUpdate): Promise<Shift> => {
    return apiClient.patch<Shift>(`/shifts/${shiftId}`, data);
  },

  delete: async (shiftId: string): Promise<void> => {
    return apiClient.delete<void>(`/shifts/${shiftId}`);
  },
};

// ========== SHIFT ASSIGNMENTS API ==========

export const shiftAssignmentsApi = {
  list: async (
    facilityId: string,
    params?: {
      start_date?: string;
      end_date?: string;
      staff_id?: string;
      shift_id?: string;
    }
  ): Promise<ShiftAssignment[]> => {
    const queryParams = new URLSearchParams();
    queryParams.append('facility_id', facilityId);
    if (params?.start_date) {
      queryParams.append('start_date', params.start_date);
    }
    if (params?.end_date) {
      queryParams.append('end_date', params.end_date);
    }
    if (params?.staff_id) {
      queryParams.append('staff_id', params.staff_id);
    }
    if (params?.shift_id) {
      queryParams.append('shift_id', params.shift_id);
    }
    return apiClient.get<ShiftAssignment[]>(
      `/shifts/assignments?${queryParams.toString()}`
    );
  },

  get: async (assignmentId: string): Promise<ShiftAssignment> => {
    return apiClient.get<ShiftAssignment>(`/shifts/assignments/${assignmentId}`);
  },

  create: async (data: ShiftAssignmentCreate): Promise<ShiftAssignment> => {
    return apiClient.post<ShiftAssignment>('/shifts/assignments', data);
  },

  update: async (
    assignmentId: string,
    data: ShiftAssignmentUpdate
  ): Promise<ShiftAssignment> => {
    return apiClient.patch<ShiftAssignment>(
      `/shifts/assignments/${assignmentId}`,
      data
    );
  },

  delete: async (assignmentId: string): Promise<void> => {
    return apiClient.delete<void>(`/shifts/assignments/${assignmentId}`);
  },

  // Bulk create
  createBulk: async (params: {
    facility_id: string;
    staff_id: string;
    shift_id: string;
    start_date: string;
    end_date: string;
    days_of_week: number[]; // 0=Lunes, 6=Domingo
  }): Promise<ShiftAssignment[]> => {
    const queryParams = new URLSearchParams();
    queryParams.append('facility_id', params.facility_id);
    queryParams.append('staff_id', params.staff_id);
    queryParams.append('shift_id', params.shift_id);
    queryParams.append('start_date', params.start_date);
    queryParams.append('end_date', params.end_date);
    params.days_of_week.forEach((day) => {
      queryParams.append('days_of_week', day.toString());
    });
    return apiClient.post<ShiftAssignment[]>(
      `/shifts/assignments/bulk?${queryParams.toString()}`
    );
  },
};

// ========== DASHBOARD API ==========

export const staffDashboardApi = {
  getFacilityDashboard: async (facilityId: string): Promise<FacilityStaffDashboard> => {
    return apiClient.get<FacilityStaffDashboard>(`/shifts/dashboard/${facilityId}`);
  },

  getCurrentlyWorking: async (facilityId: string): Promise<CurrentlyWorkingStaff[]> => {
    return apiClient.get<CurrentlyWorkingStaff[]>(
      `/shifts/currently-working/${facilityId}`
    );
  },
};
