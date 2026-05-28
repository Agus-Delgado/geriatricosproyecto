export type CertificateType = 'CONTROL_CLINICO' | 'OBITO' | 'PRESENCIA' | 'CONSENTIMIENTO';

export interface CertificateDraft {
  type: CertificateType;
  patientId: string;
  patientFullName: string;
  patientDni: string;
  hogarId: string;
  hogarName: string;
  hogarAddress: string; // ej: "Palos 295"
  issuedAt: string; // ISO
  bodyText: string;
  doctorDisplayName: string;
  doctorLicenseNumber?: string | null;
}

export interface Certificate {
  id: string;
  resident_id: string;
  facility_id: string;
  certificate_type: CertificateType;
  issued_at: string; // ISO datetime
  issued_by_user_id: string;
  body_text: string;
  content_json?: Record<string, any> | null;
  pdf_url?: string | null;
  created_at: string; // ISO datetime
}

export interface CertificateCreate {
  resident_id: string;
  facility_id: string;
  certificate_type: CertificateType;
  body_text: string;
  issued_at: string; // ISO datetime
  content_json?: Record<string, any> | null;
}

export interface CertificateUpdate {
  body_text?: string;
  issued_at?: string; // ISO datetime
  content_json?: Record<string, any> | null;
}
