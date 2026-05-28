export interface DayStats {
  facilityId: string;
  date: string;
  patients_viewed_today?: number;
  prescriptions_created_today?: number;
  clinical_notes_created_today?: number;
  agenda_entries_today?: number;
}