export interface StaffReportStaff {
  id: string;
  first_name: string;
  last_name: string;
  dni: string | null;
  cuil: string | null;
  phone: string | null;
  email: string | null;
  position: string | null;
  specialty: string | null;
  license_number: string | null;
  hire_date: string | null;
  end_date: string | null;
  status: string;
  is_active: boolean;
  notes: string | null;
}

export interface StaffReportShiftAssignment {
  id: string;
  facility_id: string;
  facility_name: string;
  date: string;
  shift_name: string;
  shift_start_time: string;
  shift_end_time: string;
  notes: string | null;
  attendance_status: 'COVERED' | 'INCOMPLETE' | 'NO_RECORD';
  attendance_check_in: string | null;
  attendance_check_out: string | null;
}

export interface StaffReportAttendance {
  id: string;
  facility_id: string;
  facility_name: string;
  check_in: string;
  check_out: string | null;
  notes: string | null;
}

export interface StaffReportSummary {
  total_assignments: number;
  assignments_covered: number;
  assignments_incomplete: number;
  assignments_no_record: number;
  total_attendances: number;
  total_hours: number | null;
}

export interface StaffReportResponse {
  staff: StaffReportStaff;
  from_date: string;
  to_date: string;
  generated_at: string;
  assignments: StaffReportShiftAssignment[];
  attendances: StaffReportAttendance[];
  summary: StaffReportSummary;
}
