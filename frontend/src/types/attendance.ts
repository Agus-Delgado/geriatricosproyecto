export interface Attendance {
  id: string;
  facility_id: string;
  staff_id: string;
  staff_name: string;
  check_in: string;
  check_out: string | null;
  notes: string | null;
  recorded_by_user_id: string;
  created_at: string;
}

export interface AttendanceCreate {
  facility_id: string;
  staff_id: string;
  check_in: string;
  notes?: string;
}

export interface AttendanceCheckOut {
  check_out: string;
  notes?: string;
}

export interface AttendanceReport {
  staff_id: string;
  staff_name: string;
  total_hours: number | null;
  check_ins: number;
  check_outs: number;
  incomplete_sessions: number;
}
