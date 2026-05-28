// ========== STAFF TYPES ==========

export interface Staff {
  id: string;
  facility_id: string;
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
  status: 'ACTIVE' | 'LEAVE' | 'INACTIVE';
  is_active: boolean;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface StaffCreate {
  facility_id: string;
  first_name: string;
  last_name: string;
  dni?: string;
  cuil?: string;
  phone?: string;
  email?: string;
  position?: string;
  specialty?: string;
  license_number?: string;
  hire_date?: string;
  notes?: string;
}

export interface StaffUpdate {
  first_name?: string;
  last_name?: string;
  dni?: string;
  cuil?: string;
  phone?: string;
  email?: string;
  position?: string;
  specialty?: string;
  license_number?: string;
  hire_date?: string;
  end_date?: string;
  status?: 'ACTIVE' | 'LEAVE' | 'INACTIVE';
  is_active?: boolean;
  notes?: string;
}

// ========== SHIFT TYPES ==========

export interface Shift {
  id: string;
  facility_id: string;
  name: string;
  start_time: string; // Format: "HH:MM:SS"
  end_time: string;
  color: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface ShiftCreate {
  facility_id: string;
  name: string;
  start_time: string;
  end_time: string;
  color?: string;
}

export interface ShiftUpdate {
  name?: string;
  start_time?: string;
  end_time?: string;
  color?: string;
  is_active?: boolean;
}

// ========== SHIFT ASSIGNMENT TYPES ==========

export interface ShiftAssignment {
  id: string;
  staff_id: string;
  shift_id: string;
  facility_id: string;
  date: string; // Format: "YYYY-MM-DD"
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface ShiftAssignmentCreate {
  staff_id: string;
  shift_id: string;
  facility_id: string;
  date: string;
  notes?: string;
}

export interface ShiftAssignmentUpdate {
  notes?: string;
}

export interface ShiftAssignmentWithDetails extends ShiftAssignment {
  staff_member: Staff;
  shift: Shift;
}

// ========== DASHBOARD TYPES ==========

export interface CurrentlyWorkingStaff {
  id: string;
  first_name: string;
  last_name: string;
  position: string | null;
  phone: string | null;
  shift_name: string;
  shift_start: string; // Format: "HH:MM:SS"
  shift_end: string;
  check_in_time: string | null;
  is_checked_in: boolean;
}

export interface StaffWorkloadSummary {
  staff_id: string;
  staff_name: string;
  total_shifts_month: number;
  total_hours_month: number;
  shifts_this_week: number;
}

export interface FacilityStaffDashboard {
  facility_id: string;
  facility_name: string;
  total_staff: number;
  active_staff: number;
  currently_working: CurrentlyWorkingStaff[];
  shifts_today: number;
  coverage_status: 'FULL' | 'UNDERSTAFFED' | 'OVERSTAFFED';
}

// ========== HELPER TYPES ==========

export type StaffPosition =
  | 'MEDICO'
  | 'ENFERMERO'
  | 'AUXILIAR'
  | 'ADMINISTRATIVO'
  | 'LIMPIEZA'
  | 'COCINA'
  | 'OTRO';

export const STAFF_POSITIONS: { value: StaffPosition | ''; label: string }[] = [
  { value: '', label: 'Seleccionar...' },
  { value: 'MEDICO', label: 'Médico' },
  { value: 'ENFERMERO', label: 'Enfermero/a' },
  { value: 'AUXILIAR', label: 'Auxiliar de Enfermería' },
  { value: 'ADMINISTRATIVO', label: 'Administrativo' },
  { value: 'LIMPIEZA', label: 'Personal de Limpieza' },
  { value: 'COCINA', label: 'Personal de Cocina' },
  { value: 'OTRO', label: 'Otro' },
];

export const STAFF_STATUS: { value: Staff['status'] | ''; label: string; color: string }[] = [
  { value: 'ACTIVE', label: 'Activo', color: 'green' },
  { value: 'LEAVE', label: 'Con Licencia', color: 'yellow' },
  { value: 'INACTIVE', label: 'Inactivo', color: 'gray' },
];

export const SHIFT_COLORS = [
  '#3B82F6', // Azul
  '#10B981', // Verde
  '#F59E0B', // Ámbar
  '#EF4444', // Rojo
  '#8B5CF6', // Púrpura
  '#EC4899', // Rosa
  '#14B8A6', // Teal
  '#F97316', // Naranja
];
