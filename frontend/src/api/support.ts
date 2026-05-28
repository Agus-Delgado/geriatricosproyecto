import { apiClient } from './client';

export interface BugReportRequest {
  message: string;
  path?: string;
  facility_id?: string;
  build_id?: string;
  build_time?: string;
  user_agent?: string;
}

export interface BugReportResponse {
  message: string;
}

export const supportApi = {
  bugReport: async (data: BugReportRequest): Promise<BugReportResponse> => {
    return apiClient.post<BugReportResponse>('/support/bug-report', data);
  },
};
