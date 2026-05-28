export interface PrescriptionLog {
  id: string;
  patient_id: string;
  facility_id: string;
  author_user_id: string;
  created_at: string;
  medications_text: string;
  instructions?: string;
  source: 'PAMI' | 'MISRX' | 'RECETO' | 'OTHER';
  repeat_of?: string;
  author_name?: string;
}

export interface PrescriptionLogCreate {
  medications_text: string;
  instructions?: string;
  source?: 'PAMI' | 'MISRX' | 'RECETO' | 'OTHER';
  repeat_of?: string;
}