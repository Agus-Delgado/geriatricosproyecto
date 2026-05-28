export interface Resident {
  id: string;
  facility_id: string;
  first_name: string;
  last_name: string;
  dni: string | null;
  birth_date: string | null;
  sex: string | null;
  coverage_type: string | null;
  coverage_other: string | null;
  coverage_number: string | null;
  admission_date: string;
  stay_status: string;
  status: string;
  end_date: string | null;
  end_reason: string | null;
  notes: string | null;
  document_url?: string | null;
  document_name?: string | null;
  document_mime?: string | null;
  document_size?: number | null;
  created_at: string;
  updated_at: string;
  created_by_user_id: string | null;
  updated_by_user_id: string | null;
  deleted_at?: string | null;
  deleted_by_user_id?: string | null;
}

export interface ResidentCreate {
  facility_id: string;
  first_name: string;
  last_name: string;
  dni?: string;
  birth_date?: string;
  sex?: string;
  coverage_type?: string;
  coverage_other?: string;
  coverage_number?: string;
  admission_date: string;
  notes?: string;
  contacts?: ResidentContactCreate[];
}

export interface ResidentUpdate {
  first_name?: string;
  last_name?: string;
  dni?: string;
  birth_date?: string;
  sex?: string;
  coverage_type?: string;
  coverage_other?: string;
  coverage_number?: string;
  stay_status?: string;
  status?: 'ACTIVE' | 'INACTIVE';
  end_date?: string;
  end_reason?: string;
  notes?: string;
}

export interface ResidentContact {
  id: string;
  resident_id: string;
  full_name: string;
  relationship_type: string | null;
  phone: string | null;
  email: string | null;
  address: string | null;
  is_primary: boolean;
  created_at: string;
  updated_at: string;
}

export interface ResidentContactCreate {
  full_name: string;
  relationship_type?: string;
  phone?: string;
  email?: string;
  address?: string;
  is_primary?: boolean;
}

export interface ResidentContactUpdate {
  full_name?: string;
  relationship_type?: string;
  phone?: string;
  email?: string;
  address?: string;
  is_primary?: boolean;
}
