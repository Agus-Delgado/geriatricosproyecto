export interface FinanceCategory {
  id: string;
  owner_group_id: string;
  name: string;
  type: string; // INCOME or EXPENSE
  is_active: boolean;
}

export interface FinanceCategoryCreate {
  name: string;
  type: string;
}

export interface FinanceTransaction {
  id: string;
  facility_id: string;
  category_id: string;
  category_name: string;
  type: string; // INCOME or EXPENSE
  amount: number;
  currency: string;
  payment_method: string;
  occurred_on: string;
  description: string | null;
  attachment_url: string | null;
  created_by_user_id: string;
  created_at: string;
}

export interface FinanceTransactionCreate {
  facility_id: string;
  category_id: string;
  type: string;
  amount: number;
  currency: string;
  payment_method: string;
  occurred_on: string;
  description?: string;
  attachment_url?: string;
}

export interface FinanceSummary {
  facility_id: string;
  month: string;
  total_income: number;
  total_expenses: number;
  balance: number;
  transaction_count: number;
}
