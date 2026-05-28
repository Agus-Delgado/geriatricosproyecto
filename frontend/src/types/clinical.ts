export interface ClinicalSummary {
  id: string;
  resident_id: string;
  primary_diagnosis: string | null;
  secondary_diagnoses: string | null;
  allergies: string | null;
  current_medications: string | null;
  medical_history: string | null;
  family_history: string | null;
  updated_by_user_id: string | null;
  updated_at: string;
}

export interface ClinicalSummaryUpdate {
  primary_diagnosis?: string;
  secondary_diagnoses?: string;
  allergies?: string;
  current_medications?: string;
  medical_history?: string;
  family_history?: string;
}

export interface ClinicalNote {
  id: string;
  resident_id: string;
  facility_id: string;
  author_user_id: string;
  note_type: string;
  content: string;
  recorded_at: string;
  created_at: string;
}

export interface ClinicalNoteCreate {
  note_type: string;
  content: string;
  recorded_at?: string;
}
