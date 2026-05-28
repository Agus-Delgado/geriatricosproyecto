import { apiClient } from './client';
import type {
  ClinicalSummary,
  ClinicalSummaryUpdate,
  ClinicalNote,
  ClinicalNoteCreate,
} from '../types/clinical';

export const clinicalApi = {
  getSummary: async (residentId: string): Promise<ClinicalSummary> => {
    return apiClient.get<ClinicalSummary>(
      `/residents/${residentId}/clinical-summary`
    );
  },

  updateSummary: async (
    residentId: string,
    data: ClinicalSummaryUpdate
  ): Promise<ClinicalSummary> => {
    return apiClient.put<ClinicalSummary>(
      `/residents/${residentId}/clinical-summary`,
      data
    );
  },

  listNotes: async (residentId: string): Promise<ClinicalNote[]> => {
    return apiClient.get<ClinicalNote[]>(
      `/residents/${residentId}/clinical-notes`
    );
  },

  createNote: async (
    residentId: string,
    data: ClinicalNoteCreate
  ): Promise<ClinicalNote> => {
    return apiClient.post<ClinicalNote>(
      `/residents/${residentId}/clinical-notes`,
      data
    );
  },

  downloadHistoryPdf: async (residentId: string): Promise<Blob> => {
    return apiClient.getBlob(`/residents/${residentId}/clinical-history.pdf`);
  },
};
