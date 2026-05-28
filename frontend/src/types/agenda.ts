export interface AgendaEntry {
  id: string;
  facility_id: string;
  doctor_user_id: string;
  patient_id: string;
  seen_at: string; // ISO datetime string
  note: string | null;
  created_at: string; // ISO datetime string
  patient_name?: string; // Enriquecido desde backend
  doctor_name?: string; // Enriquecido desde backend
}

export interface AgendaEntryCreate {
  patient_id: string;
  facility_id: string;
  seen_at?: string; // ISO datetime string, opcional (default: ahora)
  note?: string | null;
}

export interface AgendaEntryUpdate {
  note?: string | null;
  seen_at?: string; // ISO datetime string, opcional
}