# Análisis: Constancias y Medicaciones

## A) CONSTANCIAS (UI dice "Certificados"/"Certificación")

### 1) Ubicaciones de texto "Certificados", "Certificación", "Constancias", "Constancias emitidas"

#### Frontend:
- **`frontend/src/pages/CertificatesPage.tsx`** (líneas 258, 315):
  - Título: "Constancias"
  - Sección: "Constancias Emitidas"
- **`frontend/src/components/resident/ResidentCertificatesTab.tsx`** (línea 12):
  - Título: "Constancias"
- **`frontend/src/pages/ResidentDetailPage.tsx`** (línea 23):
  - Tab: `{ id: 'certificates', label: 'Constancias', roles: ['DOCTOR'] }`
- **`frontend/src/pages/MedicalFolderPage.tsx`** (líneas 209-210):
  - Sección: `title="Constancias"`
- **`frontend/src/pages/MedicalFolderPrintPage.tsx`** (línea 249):
  - Impresión: "Constancias"
- **`frontend/src/pages/MedicalFolderSearchPage.tsx`** (línea 37):
  - Texto descriptivo: "evoluciones, recetas y constancias"
- **`frontend/src/components/certificates/CertificateEditor.tsx`** (línea 106):
  - Label: "Tipo de Constancia"
- **`frontend/src/components/certificates/CertificateEditor.tsx`** (línea 147):
  - Label: "Cuerpo de la Constancia"
- **`frontend/src/components/certificates/PrintDocument.tsx`** (línea 36):
  - Título impreso: "CONSTANCIA"

#### Backend:
- **`backend/app/api/routes/certificates.py`** (línea 81):
  - Docstring: "Listar constancias médicas"
- **`backend/app/models/audit.py`** (línea 14):
  - Acción: "CREATE_CERTIFICATE"
- **`backend/app/models/certificates.py`** (línea 15):
  - Comentario: "CONTROL_CLINICO / OBITO / PRESENCIA"

### 2) Componentes raíz y tipos existentes

#### Componente raíz principal:
- **`frontend/src/pages/CertificatesPage.tsx`**: Página principal de constancias (`/g/:id/certificates`)
  - Estado: `certificates: Certificate[]`
  - Carga datos: `certificatesApi.list()`
  - Renderiza: Lista de pacientes → Selección → Lista de constancias del paciente seleccionado

#### Tipos de constancias (CertificateType):
- **`frontend/src/types/certificates.ts`** (línea 1):
  ```typescript
  export type CertificateType = 'CONTROL_CLINICO' | 'OBITO' | 'PRESENCIA';
  ```
- **`frontend/src/pages/CertificatesPage.tsx`** (líneas 221-225):
  ```typescript
  const typeOptions: { value: CertificateType; label: string }[] = [
    { value: 'CONTROL_CLINICO', label: 'Control Clínico' },
    { value: 'OBITO', label: 'Óbito' },
    { value: 'PRESENCIA', label: 'Supervivencia' },
  ];
  ```

#### Componentes relacionados:
- **`frontend/src/components/certificates/CertificateEditor.tsx`**: Editor de constancias (modal)
- **`frontend/src/components/certificates/PrintDocument.tsx`**: Vista previa/impresión
- **`frontend/src/components/certificates/RxPaperFrame.tsx`**: Frame para impresión (header Rx)
- **`frontend/src/components/certificates/templates.ts`**: Plantillas de texto por tipo
- **`frontend/src/pages/CertificatePrintPage.tsx`**: Página de impresión (`/certificates/print`)

### 3) Generación de PDF

#### Estado actual: **NO se genera PDF en backend actualmente**
- **`backend/app/services/certificate_service.py`**: Existe función `generate_certificate_pdf()` pero **NO se usa**
  - Usa `reportlab` para generar PDF
  - Retorna `BytesIO` y URL placeholder
  - **Problema**: Esta función no se llama desde ningún endpoint
- **`backend/app/models/certificates.py`** (línea 20):
  - `pdf_url = Column(Text, nullable=True)` existe pero no se popula
  - Comentario: "Opcional, ya que usamos HTML/CSS para impresión"

#### Generación real: **Frontend genera HTML/CSS para impresión**
- **`frontend/src/components/certificates/PrintDocument.tsx`**: Renderiza HTML con CSS
- **`frontend/src/components/certificates/print.css`**: Estilos para impresión
- **`frontend/src/pages/CertificatePrintPage.tsx`**: Usa `window.print()` del navegador
- Flujo:
  1. Usuario edita constancia en `CertificateEditor`
  2. Al hacer "Imprimir", se guarda `draft` en `sessionStorage`
  3. Se navega a `/certificates/print`
  4. `CertificatePrintPage` lee `sessionStorage` y renderiza `PrintDocument`
  5. Usuario usa `window.print()` del navegador para imprimir/guardar como PDF

#### Endpoints relacionados:
- **`POST /certificates`**: Crea constancia (NO genera PDF)
- **`PATCH /certificates/{certificate_id}`**: Actualiza constancia (NO genera PDF)
- **`GET /certificates`**: Lista constancias
- **`GET /certificates/{certificate_id}`**: Obtiene una constancia

### 4) Endpoints, tipos TS y payload

#### Endpoints Backend:
- **`backend/app/api/routes/certificates.py`**:
  - `POST /certificates` → `create_certificate()`
  - `GET /certificates` → `list_certificates()` (query params: `resident_id`, `facility_id`, `certificate_type`)
  - `GET /certificates/{certificate_id}` → `get_certificate()`
  - `PATCH /certificates/{certificate_id}` → `update_certificate()`

#### Tipos TypeScript Frontend:
- **`frontend/src/types/certificates.ts`**:
  ```typescript
  export type CertificateType = 'CONTROL_CLINICO' | 'OBITO' | 'PRESENCIA';
  
  export interface CertificateDraft {
    type: CertificateType;
    patientId: string;
    patientFullName: string;
    patientDni: string;
    hogarId: string;
    hogarName: string;
    hogarAddress: string;
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
  ```

#### Schemas Backend:
- **`backend/app/schemas/certificates.py`**:
  ```python
  class CertificateCreate(BaseModel):
      resident_id: UUID
      facility_id: UUID
      certificate_type: str  # CONTROL_CLINICO / OBITO / PRESENCIA
      body_text: str
      issued_at: datetime
      content_json: Optional[Dict[str, Any]] = None
  
  class CertificateUpdate(BaseModel):
      body_text: Optional[str] = None
      issued_at: Optional[datetime] = None
      content_json: Optional[Dict[str, Any]] = None
  
  class CertificateResponse(BaseModel):
      id: UUID
      resident_id: UUID
      facility_id: UUID
      certificate_type: str
      issued_at: datetime
      issued_by_user_id: UUID
      body_text: str
      content_json: Optional[Dict[str, Any]] = None
      pdf_url: Optional[str] = None
      created_at: datetime
  ```

#### API Client Frontend:
- **`frontend/src/api/certificates.ts`**:
  ```typescript
  export const certificatesApi = {
    list: async (params?: {
      resident_id?: string;
      facility_id?: string;
      certificate_type?: string;
    }): Promise<Certificate[]>
    get: async (certificateId: string): Promise<Certificate>
    create: async (data: CertificateCreate): Promise<Certificate>
    update: async (certificateId: string, data: CertificateUpdate): Promise<Certificate>
  };
  ```

### 5) Mapeo "hogar activo" y datos del residente

#### Flujo de mapeo (Frontend):
- **`frontend/src/pages/CertificatesPage.tsx`** (líneas 115-139, 147-169):
  1. Se obtiene `facility` desde `facilitiesApi.get(facilityId)` (línea 68)
  2. Se obtiene `selectedPatient` (Resident) desde `residentsApi.list()`
  3. Se construye `CertificateDraft` con:
     - `hogarId: facility.id` (línea 127, 162)
     - `hogarName: facility.name` (línea 128, 163)
     - `hogarAddress: facility.address || ''` (línea 129, 164)
     - `patientFullName: ${selectedPatient.first_name} ${selectedPatient.last_name}` (línea 119, 154)
     - `patientDni: selectedPatient.dni || ''` (línea 120, 155)
  4. Al guardar (`handleSave`, línea 176):
     - Se envía `CertificateCreate` con `facility_id: draft.hogarId` (línea 190)
     - Se envía `resident_id: draft.patientId` (línea 189)

#### Contexto de Facility:
- **`frontend/src/pages/CertificatesPage.tsx`** (línea 22):
  - `facilityId` viene de `useParams` o `activeFacilityId` del `AuthContext`
- **`frontend/src/pages/CertificatesPage.tsx`** (línea 23):
  - `const facilityId = id ?? activeFacilityId ?? '';`

#### Validación Backend:
- **`backend/app/api/routes/certificates.py`** (líneas 24-39):
  - Valida que `resident` existe
  - Valida que `resident.facility_id == cert_data.facility_id`
  - Usa `require_facility_access(cert_data.facility_id)` para validar permisos

---

## B) MEDICACIONES

### 1) Página/solapa "Medicaciones" y componentes

#### Página principal:
- **`frontend/src/pages/MedicationDuePage.tsx`**: Página de medicaciones pendientes (`/medication-due`)
  - Lista medicaciones pendientes del día para una facility
  - Permite registrar administración (MAR)

#### Solapa en Resident Detail:
- **`frontend/src/components/resident/ResidentMedicationsTab.tsx`**: Tab "Medicaciones" en `/residents/:id`
  - Lista planes de medicación del residente
  - Permite crear/editar planes
  - Permite agregar horarios a planes

#### Páginas relacionadas:
- **`frontend/src/pages/PrescriptionsHistoryPage.tsx`**: Historial de recetas (`/prescriptions-history/:patientId`)
  - Combina `PrescriptionLog` (texto libre) y `MedicationPlan` (planes estructurados)
  - Permite registrar nuevas recetas (texto libre)
- **`frontend/src/pages/PrescriptionsHistorySearchPage.tsx`**: Búsqueda para historial
- **`frontend/src/pages/PrescriptionPrintPage.tsx`**: Impresión de historial

#### Componentes relacionados:
- **`frontend/src/components/forms/MedicationPlanForm.tsx`**: Formulario para crear/editar planes
- **`frontend/src/components/prescriptions/PrescriptionFormModal.tsx`**: Modal para registrar recetas (texto libre)

### 2) Endpoints y modelos

#### Endpoints Backend:
- **`backend/app/api/routes/medications.py`**:
  - `POST /residents/{resident_id}/medication-plans` → `create_medication_plan_endpoint()`
  - `GET /residents/{resident_id}/medication-plans` → `list_medication_plans()` (query: `active_only: bool`)
  - `PATCH /medication-plans/{plan_id}` → `update_medication_plan_endpoint()`
  - `POST /medication-plans/{plan_id}/times` → `create_schedule_time()`
  - `DELETE /medication-times/{time_id}` → `delete_schedule_time()`
  - `POST /residents/{resident_id}/medication-administrations` → `create_administration()`
  - `GET /residents/{resident_id}/medication-administrations` → `list_administrations()` (query: `date: date`)
  - `GET /facilities/{facility_id}/medication-due` → `get_medication_due_endpoint()` (query: `date: date`)

#### Modelos Backend:
- **`backend/app/models/medications.py`**:
  - `MedicationPlan`: Plan de medicación (med_name, dose, route, instructions, start_date, end_date, is_active)
  - `MedicationScheduleTime`: Horarios del plan (time_of_day, days_mask)
  - `MedicationAdministration`: Registro de administración (MAR) (administered_at, status, dose_given, notes)

#### Tipos TypeScript Frontend:
- **`frontend/src/types/medications.ts`**:
  ```typescript
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
  
  export interface MedicationScheduleTime {
    id: string;
    medication_plan_id: string;
    time: string; // HH:MM format
    day_of_week: number | null; // 0-6, null for daily
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
  
  export interface MedicationDue {
    resident_id: string;
    resident_name: string;
    medication_plan_id: string;
    medication_name: string;
    dosage: string;
    scheduled_time: string;
    status: string | null; // GIVEN, MISSED, REFUSED, or null if pending
  }
  ```

#### API Client Frontend:
- **`frontend/src/api/medications.ts`**:
  ```typescript
  export const medicationsApi = {
    listPlans: async (residentId: string, activeOnly: boolean = false): Promise<MedicationPlan[]>
    createPlan: async (residentId: string, data: MedicationPlanCreate): Promise<MedicationPlan>
    updatePlan: async (planId: string, data: MedicationPlanUpdate): Promise<MedicationPlan>
    addScheduleTime: async (planId: string, data: MedicationScheduleTimeCreate): Promise<MedicationScheduleTime>
    deleteScheduleTime: async (timeId: string): Promise<void>
    createAdministration: async (residentId: string, data: MedicationAdministrationCreate): Promise<MedicationAdministration>
    listAdministrations: async (residentId: string, date?: string): Promise<MedicationAdministration[]>
    getMedicationDue: async (facilityId: string, date: string): Promise<MedicationDue[]>
  };
  ```

### 3) Endpoint "medications por resident"

#### Estado actual:
- **✅ EXISTE**: `GET /residents/{resident_id}/medication-plans`
  - Implementado en `backend/app/api/routes/medications.py` (línea 56)
  - Query param: `active_only: bool = False`
  - Retorna: `List[MedicationPlanResponse]`
  - Permisos: Requiere acceso a la facility del residente

#### Análisis:
- **El endpoint READ-ONLY ya existe y funciona correctamente**
- No necesita cambios adicionales
- El frontend ya lo usa: `medicationsApi.listPlans(residentId, false)`

---

## C) Entregable del escaneo

### Archivos exactos a tocar (si se hicieran cambios)

#### Frontend:
- **Constancias:**
  - `frontend/src/pages/CertificatesPage.tsx` (página principal)
  - `frontend/src/components/certificates/CertificateEditor.tsx` (editor)
  - `frontend/src/components/certificates/PrintDocument.tsx` (vista previa)
  - `frontend/src/components/certificates/templates.ts` (plantillas)
  - `frontend/src/components/resident/ResidentCertificatesTab.tsx` (tab en resident detail - actualmente placeholder)
  - `frontend/src/types/certificates.ts` (tipos)
  - `frontend/src/api/certificates.ts` (API client)

- **Medicaciones:**
  - `frontend/src/components/resident/ResidentMedicationsTab.tsx` (tab principal)
  - `frontend/src/pages/MedicationDuePage.tsx` (medicaciones pendientes)
  - `frontend/src/pages/PrescriptionsHistoryPage.tsx` (historial)
  - `frontend/src/components/forms/MedicationPlanForm.tsx` (formulario)
  - `frontend/src/types/medications.ts` (tipos)
  - `frontend/src/api/medications.ts` (API client)

#### Backend:
- **Constancias:**
  - `backend/app/api/routes/certificates.py` (endpoints)
  - `backend/app/models/certificates.py` (modelo)
  - `backend/app/schemas/certificates.py` (schemas)
  - `backend/app/services/certificate_service.py` (servicio PDF - NO usado actualmente)

- **Medicaciones:**
  - `backend/app/api/routes/medications.py` (endpoints)
  - `backend/app/models/medications.py` (modelos)
  - `backend/app/schemas/medications.py` (schemas)
  - `backend/app/services/medication_service.py` (lógica de negocio)

### Tipos TS relevantes

#### Resident:
- **`frontend/src/types/residents.ts`**:
  - `Resident` (incluye `document_url`, `document_name`, etc.)
  - `ResidentCreate`, `ResidentUpdate`

#### Medication:
- **`frontend/src/types/medications.ts`**:
  - `MedicationPlan`, `MedicationPlanCreate`, `MedicationPlanUpdate`
  - `MedicationScheduleTime`, `MedicationScheduleTimeCreate`
  - `MedicationAdministration`, `MedicationAdministrationCreate`
  - `MedicationDue`

#### Certificate/Constancia:
- **`frontend/src/types/certificates.ts`**:
  - `CertificateType` (union type)
  - `CertificateDraft` (draft en UI)
  - `Certificate` (entidad persistida)
  - `CertificateCreate`, `CertificateUpdate`

### Env vars (si hubiese)

#### Constancias:
- **`backend/app/core/config.py`** (líneas 20-22):
  - `STORAGE_PROVIDER: str = "local"` (no usado actualmente)
  - `STORAGE_BASE_URL: str = "http://localhost:8000/storage"` (placeholder)
  - **Nota**: `certificate_service.py` usa `STORAGE_BASE_URL` pero la función no se llama

#### Medicaciones:
- **No hay env vars específicas para medicaciones**

#### PDF Generation:
- **`reportlab`** ya está en `backend/requirements.txt` (línea 13)
- **No requiere env vars adicionales** (se generaría en memoria si se usara)

### Checklist de compilación

#### Frontend:
- **Ubicación**: `frontend/`
- **Comandos**:
  ```bash
  cd frontend
  npm install  # Instalar dependencias (si cambió package.json)
  npm run lint  # Verificar linting
  npm run build  # Build para producción (hace typecheck automáticamente)
  ```
- **Verificación TypeScript**:
  - `npm run build` ejecuta `tsc && vite build`
  - Si hay errores de tipos, fallará antes de `vite build`

#### Backend:
- **Ubicación**: `backend/`
- **Comandos**:
  ```bash
  cd backend
  pip install -r requirements.txt  # Instalar dependencias (si cambió requirements.txt)
  alembic check  # Verificar estado de migraciones (opcional)
  pytest  # Ejecutar tests (si existen)
  ```
- **Verificación Python**:
  - Python debe ser >= 3.8
  - Verificar imports: `python -c "from app.models.certificates import Certificate; print('OK')"`
  - Verificar imports: `python -c "from app.models.medications import MedicationPlan; print('OK')"`

#### Migraciones (si se modificaron modelos):
- **Comandos**:
  ```bash
  cd backend
  alembic revision --autogenerate -m "descripción"
  alembic upgrade head  # Aplicar migraciones
  alembic downgrade -1  # Revertir última migración (si necesario)
  ```

### Riesgos típicos identificados

#### 1. undefined vs string:
- **`ResidentCertificatesTab.tsx`**: Usa `residentId` como prop pero no lo usa (placeholder)
- **`CertificateDraft.hogarAddress`**: Puede ser `''` (string vacío) si `facility.address` es `null`
- **`CertificateDraft.patientDni`**: Puede ser `''` si `selectedPatient.dni` es `null`
- **`CertificateDraft.doctorLicenseNumber`**: Opcional (`string | null | undefined`)

#### 2. Props controladas:
- **`CertificateEditor`**: `initialDraft` se usa como estado inicial pero puede cambiar
  - **Riesgo**: Si `initialDraft` cambia, el estado interno no se actualiza
  - **Solución sugerida**: Usar `useEffect` para sincronizar o hacer componente completamente controlado

#### 3. Imports:
- **`certificate_service.py`**: Importa `reportlab` pero la función no se usa
  - **Riesgo**: Si se elimina `reportlab` de requirements, no se detectará hasta que se use
- **`ResidentCertificatesTab.tsx`**: Importa React pero solo es placeholder
  - **Bajo riesgo**: No afecta funcionalidad actual

#### 4. Nombres no definidos:
- **`CertificateEditor`**: Usa `typeLabels` que está hardcodeado
  - **Riesgo bajo**: Si se agrega nuevo tipo, hay que actualizar manualmente
- **`templates.ts`**: `buildDefaultBodyText` tiene `default` que retorna `''`
  - **Riesgo**: Si se agrega nuevo tipo sin actualizar switch, retornará string vacío

#### 5. Columnas nuevas sin migración:
- **`certificates.pdf_url`**: Existe en modelo pero nunca se popula
  - **Riesgo bajo**: Es nullable, no rompe nada
- **`certificates.content_json`**: Existe pero no se usa en UI actual
  - **Riesgo bajo**: Es nullable

#### 6. Endpoints no usados:
- **`generate_certificate_pdf()`**: Existe en `certificate_service.py` pero no se llama
  - **Riesgo**: Código muerto, puede confundir
  - **Sugerencia**: Eliminar o documentar que es para uso futuro

#### 7. SessionStorage para print:
- **`CertificatePrintPage`**: Usa `sessionStorage.getItem('printDraft')`
  - **Riesgo**: Si usuario abre múltiples tabs o limpia sessionStorage, puede perder datos
  - **Mitigación actual**: Se limpia después de leer (`sessionStorage.removeItem('printDraft')`)

#### 8. Validación de tipos en runtime:
- **`CertificateType`**: Backend acepta `str` pero frontend usa union type
  - **Riesgo**: Si backend devuelve tipo inválido, puede romper UI
  - **Mitigación**: Backend valida en modelo (`String(24)`)

---

## Resumen Ejecutivo

### Constancias:
- ✅ Sistema funcional: Frontend genera HTML/CSS para impresión
- ⚠️ PDF backend existe pero no se usa (código muerto)
- ✅ Endpoints CRUD completos
- ✅ Mapeo facility/resident correcto
- ⚠️ `ResidentCertificatesTab` es placeholder

### Medicaciones:
- ✅ Sistema completo: Planes, horarios, administraciones
- ✅ Endpoint READ-ONLY por residente existe y funciona
- ✅ No requiere cambios adicionales

### Riesgos identificados:
1. `CertificateEditor` no sincroniza `initialDraft` si cambia
2. `sessionStorage` para print puede perderse
3. `generate_certificate_pdf()` no se usa (código muerto)
4. Tipos hardcodeados en varios lugares

### Archivos críticos:
- **Constancias**: `CertificatesPage.tsx`, `CertificateEditor.tsx`, `certificates.py`
- **Medicaciones**: `ResidentMedicationsTab.tsx`, `medications.py`, `medication_service.py`
