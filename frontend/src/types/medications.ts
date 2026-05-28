export interface MedicationPlan {
  id: string;
  resident_id: string;
  facility_id: string;
  med_name: string;
  dose: string;
  route?: string | null;
  instructions?: string | null;
  start_date?: string | null;
  end_date?: string | null;
  is_active: boolean;
  prescribed_by_user_id?: string | null;
  created_at: string;
  updated_at: string;
}

export interface MedicationPlanCreate {
  med_name: string;
  dose: string;
  route?: string | null;
  instructions?: string | null;
  start_date?: string | null;
  end_date?: string | null;
}

export interface MedicationPlanUpdate {
  med_name?: string;
  dose?: string;
  route?: string | null;
  instructions?: string | null;
  start_date?: string | null;
  end_date?: string | null;
  is_active?: boolean;
}

export interface MedicationScheduleTime {
  id: string;
  medication_plan_id: string;
  time: string; // HH:MM format
  day_of_week: number | null; // 0-6, null for daily
}

export interface MedicationScheduleTimeCreate {
  time: string;
  day_of_week?: number | null;
}

export interface MedicationAdministration {
  id: string;
  resident_id: string;
  facility_id: string;
  medication_plan_id: string;
  scheduled_time: string;
  administered_at: string;
  status: string; // GIVEN, MISSED, REFUSED
  notes: string | null;
  administered_by_user_id: string;
  created_at: string;
}

export interface MedicationAdministrationCreate {
  medication_plan_id: string;
  scheduled_time: string;
  administered_at: string;
  status: string;
  notes?: string;
}

export interface MedicationDue {
  resident_id: string;
  resident_name: string;
  medication_plan_id: string;
  medication_name: string;
  dosage: string;
  scheduled_time: string;
  status: string | null; // GIVEN, MISSED, REFUSED, or null if pending
}
