import { apiClient } from './client';
import type {
  FinanceCategory,
  FinanceCategoryCreate,
  FinanceTransaction,
  FinanceTransactionCreate,
  FinanceSummary,
} from '../types/finance';

export const financeApi = {
  listCategories: async (type?: string): Promise<FinanceCategory[]> => {
    const params = type ? `?type=${type}` : '';
    return apiClient.get<FinanceCategory[]>(`/finance/categories${params}`);
  },

  createCategory: async (
    data: FinanceCategoryCreate
  ): Promise<FinanceCategory> => {
    return apiClient.post<FinanceCategory>('/finance/categories', data);
  },

  listTransactions: async (
    facilityId: string,
    params?: { from_date?: string; to_date?: string }
  ): Promise<FinanceTransaction[]> => {
    const searchParams = new URLSearchParams({ facility_id: facilityId });
    if (params?.from_date) searchParams.append('from_date', params.from_date);
    if (params?.to_date) searchParams.append('to_date', params.to_date);
    
    return apiClient.get<FinanceTransaction[]>(
      `/finance/transactions?${searchParams.toString()}`
    );
  },

  createTransaction: async (
    data: FinanceTransactionCreate
  ): Promise<FinanceTransaction> => {
    return apiClient.post<FinanceTransaction>('/finance/transactions', data);
  },

  getSummary: async (
    facilityId: string,
    month: string
  ): Promise<FinanceSummary> => {
    return apiClient.get<FinanceSummary>(
      `/finance/summary?facility_id=${facilityId}&month=${month}`
    );
  },
};
