import { apiClient } from './client';
import type { Attendance, AttendanceCreate, AttendanceCheckOut, AttendanceReport } from '../types/attendance';

export const attendanceApi = {
  list: async (
    facilityId: string,
    params?: { from_date?: string; to_date?: string; staff_id?: string }
  ): Promise<Attendance[]> => {
    const queryParams = new URLSearchParams();
    queryParams.append('facility_id', facilityId);
    if (params?.from_date) {
      queryParams.append('from_date', params.from_date);
    }
    if (params?.to_date) {
      queryParams.append('to_date', params.to_date);
    }
    if (params?.staff_id) {
      queryParams.append('staff_id', params.staff_id);
    }
    return apiClient.get<Attendance[]>(`/attendance?${queryParams.toString()}`);
  },

  create: async (data: AttendanceCreate): Promise<Attendance> => {
    return apiClient.post<Attendance>('/attendance', data);
  },

  checkOut: async (attendanceId: string, data: AttendanceCheckOut): Promise<Attendance> => {
    return apiClient.post<Attendance>(`/attendance/${attendanceId}/check-out`, data);
  },

  getReport: async (
    facilityId: string,
    fromDate: string,
    toDate: string
  ): Promise<AttendanceReport[]> => {
    const queryParams = new URLSearchParams();
    queryParams.append('facility_id', facilityId);
    queryParams.append('from_date', fromDate);
    queryParams.append('to_date', toDate);
    return apiClient.get<AttendanceReport[]>(`/attendance/report?${queryParams.toString()}`);
  },
};
