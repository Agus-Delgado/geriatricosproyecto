# Análisis: Reportar Error y Formulario de Pacientes/Residentes

## 📋 Resumen Ejecutivo

Este documento ubica exactamente dónde está implementado "Reportar error" y cómo se crean/editan pacientes/residentes en el sistema, tanto en frontend (Vercel) como en backend (Render).

---

## 1. FRONTEND - "Reportar Error" (Bug Report)

### 1.1 Componente Principal
**Archivo:** `frontend/src/components/support/BugReportFab.tsx`

**Componente:** `BugReportFab`

**Renderizado:** Renderizado globalmente en `App.tsx` (línea 100), disponible en todas las rutas protegidas.

### 1.2 Ubicación y Renderizado
- **Archivo de renderizado:** `frontend/src/App.tsx` (línea 22, 100)
- **Tipo de renderizado:** Layout global (no específico de página)
- **Condiciones de visibilidad:**
  - Se oculta en rutas públicas (`/login`, `/reset-password`)
  - Se oculta en rutas de impresión (`/print`)
  - Solo visible si hay usuario autenticado

### 1.3 Estilos y Posicionamiento
```tsx
// Botón FAB (Floating Action Button)
className="fixed bottom-24 right-4 z-40 bg-gray-900 text-white rounded-full shadow-lg px-4 py-3 hover:bg-gray-800 transition-colors"
style={{ backgroundColor: 'var(--facility-accent, #111827)' }}
```

**Características:**
- **Position:** `fixed`
- **Ubicación:** `bottom-24 right-4` (96px desde abajo, 16px desde derecha)
- **Z-index:** `z-40` (40)
- **Responsive:** Usa Tailwind classes (sin breakpoints específicos, se adapta automáticamente)
- **Color:** Usa CSS variable `--facility-accent` con fallback `#111827`

### 1.4 Modal del Formulario
**Componente Modal:** `frontend/src/components/ui/Modal.tsx`

**Características del Modal:**
- **Z-index:** `z-50` (superior al FAB)
- **Size:** `lg` (max-width: 32rem / 512px)
- **Título:** "Reportar un error"
- **Contenido:**
  - Inputs disabled: Usuario (full_name) y Email
  - Textarea: Mensaje (requerido, mínimo 3 caracteres)
  - Botones: Cancelar y Enviar

### 1.5 API Call
**Archivo:** `frontend/src/api/support.ts`

**Endpoint:** `POST /support/bug-report`

**Formato de datos (JSON):**
```typescript
interface BugReportRequest {
  message: string;              // Requerido, min 3 caracteres
  path?: string;                // Ruta actual (location.pathname)
  facility_id?: string;         // UUID de la facility activa
  build_id?: string;            // Build ID de la app
  build_time?: string;          // Timestamp del build
  user_agent?: string;          // Navigator.userAgent
}
```

**Función:** `supportApi.bugReport(data)`

---

## 2. FRONTEND - Formulario de Crear/Editar Paciente/Residente

### 2.1 Componente del Formulario
**Archivo:** `frontend/src/components/forms/ResidentForm.tsx`

**Componente:** `ResidentForm`

**Props:**
```typescript
interface ResidentFormProps {
  resident?: Resident;          // Si existe, es edición; si no, es creación
  onSubmit: (data: ResidentCreate | ResidentUpdate) => Promise<void>;
  onCancel: () => void;
  facilityId: string;           // ID de la facility (requerido)
}
```

### 2.2 Pantallas que Usan el Formulario

#### 2.2.1 Página Principal de Residentes
**Archivo:** `frontend/src/pages/ResidentsListPage.tsx`

**Rutas:**
- `/residents` - Listado de residentes

**Funcionalidad:**
- Modal de creación: Líneas 234-247
- Modal de edición: Líneas 249-269
- Permisos: `canEdit = isOwner || isDoctor || activeRole === 'ADMIN' || activeRole === 'MEDICO'`

#### 2.2.2 Componente de Lista de Pacientes (Médico)
**Archivo:** `frontend/src/components/medical/PatientList.tsx`

**Uso:** Usado en la página médica (`/g/:id/medical`)

**Funcionalidad:**
- Modal de creación: Líneas 192-203
- Modal de edición: Líneas 205-225
- Permisos: `canEdit = getActiveRole() === 'MEDICO' || getActiveRole() === 'ADMIN'`

### 2.3 Campos del Formulario

**Campos principales:**
- `first_name` (requerido)
- `last_name` (requerido)
- `dni` (opcional)
- `birth_date` (opcional, validación: no futura, anterior a admission_date)
- `sex` (select: Masculino/Femenino/Otro)
- `coverage_type` (select: PAMI, OBRA SOCIAL, PARTICULAR, IOMA, OTRA)
- `coverage_other` (requerido si coverage_type === 'OTRA')
- `coverage_number` (opcional)
- `admission_date` (requerido, validación: no futura)
- `notes` (opcional, textarea)

**Sección de Contactos/Familiares:**
- Máximo 3 contactos
- Campos por contacto: `first_name`, `last_name`, `phone` (requerido), `email`, `relationship_type`
- Validación: Al menos un contacto debe tener nombre y teléfono

**Campos adicionales (solo edición):**
- `archived` (checkbox para dar de baja)
- `archive_note` (observación del motivo de baja)

### 2.4 Validaciones Frontend

**Validaciones implementadas en `ResidentForm.tsx` (función `validate`):**
1. `first_name` y `last_name`: Requeridos
2. `admission_date`: Requerido, no puede ser futura
3. `birth_date`: Si existe, no puede ser futura, debe ser anterior a `admission_date`
4. `coverage_other`: Requerido si `coverage_type === 'OTRA'`
5. Contactos: Si hay contactos, cada uno debe tener nombre y teléfono

### 2.5 API Calls

**Archivo:** `frontend/src/api/residents.ts`

**Endpoints usados:**

#### Crear Residente:
```typescript
POST /residents
Body: ResidentCreate (JSON)
Response: Resident
```
**Función:** `residentsApi.create(data)`

#### Actualizar Residente:
```typescript
PATCH /residents/:residentId
Body: ResidentUpdate (JSON)
Response: Resident
```
**Función:** `residentsApi.update(residentId, data)`

#### Obtener Residente:
```typescript
GET /residents/:residentId
Response: Resident
```
**Función:** `residentsApi.get(residentId)`

#### Listar Residentes:
```typescript
GET /residents?facility_id=:facilityId&q=:query&stay_status=:status&status=:status
Response: Resident[]
```
**Función:** `residentsApi.list(facilityId, params)`

### 2.6 Tipos/Interfaces TypeScript

**Archivo:** `frontend/src/types/residents.ts`

**Interfaces principales:**
```typescript
interface Resident {
  id: string;
  facility_id: string;
  first_name: string;
  last_name: string;
  dni: string | null;
  birth_date: string | null;
  sex: string | null;
  coverage_type: string | null;
  coverage_other: string | null;
  coverage_number: string | null;
  admission_date: string;
  stay_status: string;
  status: string;
  end_date: string | null;
  end_reason: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
  created_by_user_id: string | null;
  updated_by_user_id: string | null;
  deleted_at?: string | null;
  deleted_by_user_id?: string | null;
}

interface ResidentCreate {
  facility_id: string;
  first_name: string;
  last_name: string;
  dni?: string;
  birth_date?: string;
  sex?: string;
  coverage_type?: string;
  coverage_other?: string;
  coverage_number?: string;
  admission_date: string;
  notes?: string;
  contacts?: ResidentContactCreate[];
}

interface ResidentUpdate {
  first_name?: string;
  last_name?: string;
  dni?: string;
  birth_date?: string;
  sex?: string;
  coverage_type?: string;
  coverage_other?: string;
  coverage_number?: string;
  stay_status?: string;
  status?: 'ACTIVE' | 'INACTIVE';
  end_date?: string;
  end_reason?: string;
  notes?: string;
}
```

### 2.7 Formato de Envío al Backend

**Formato:** JSON (Content-Type: `application/json`)

**Ejemplo de payload (crear):**
```json
{
  "facility_id": "uuid",
  "first_name": "Juan",
  "last_name": "Pérez",
  "dni": "12345678",
  "birth_date": "1950-01-01",
  "sex": "M",
  "coverage_type": "PAMI",
  "coverage_number": "123456",
  "admission_date": "2024-01-01",
  "notes": "Notas adicionales",
  "contacts": [
    {
      "full_name": "María Pérez",
      "phone": "+5491123456789",
      "email": "maria@example.com",
      "relationship_type": "Hijo/a",
      "is_primary": false
    }
  ]
}
```

**Ejemplo de payload (actualizar):**
```json
{
  "first_name": "Juan",
  "last_name": "Pérez",
  "status": "INACTIVE",
  "notes": "Actualización de notas"
}
```

---

## 3. BACKEND - Endpoint "Reportar Error"

### 3.1 Stack Tecnológico
- **Framework:** FastAPI (Python)
- **Base de datos:** PostgreSQL
- **ORM:** SQLAlchemy

### 3.2 Endpoint
**Archivo:** `backend/app/api/routes/support.py`

**Ruta:** `POST /support/bug-report`

**Router:** `APIRouter(prefix="/support", tags=["support"])`

**Función:** `bug_report_endpoint`

**Autenticación:** Requerida (`Depends(get_current_user)`)

**Status Code:** `200 OK`

### 3.3 Schema (Pydantic)
**Archivo:** `backend/app/schemas/support.py`

```python
class BugReportRequest(BaseModel):
    message: str = Field(..., min_length=3, max_length=5000)
    path: Optional[str] = Field(None, max_length=512)
    facility_id: Optional[UUID] = None
    build_id: Optional[str] = Field(None, max_length=128)
    build_time: Optional[str] = Field(None, max_length=64)
    user_agent: Optional[str] = Field(None, max_length=512)

class BugReportResponse(BaseModel):
    message: str
```

### 3.4 Lógica del Endpoint
1. Recibe `BugReportRequest` del frontend
2. Extrae información del usuario autenticado (`current_user`)
3. Construye email HTML y texto plano con:
   - Datos del usuario (nombre, email, ID)
   - Facility ID (del payload)
   - Ruta donde ocurrió el error
   - Build ID y Build Time
   - User-Agent
   - Mensaje del usuario
4. Envía email usando `email_service.send_email()`
5. Destinatario: `settings.SMTP_USER` (configurado en `app/core/config.py`)
6. Retorna `BugReportResponse` con mensaje de confirmación

### 3.5 Configuración de Email
**Archivo:** `backend/app/core/config.py`

**Variables relevantes:**
- `EMAIL_FROM`: "Geriátricos <miconsultoriosoporte@gmail.com>"
- `SMTP_USER`: "miconsultoriosoporte@gmail.com"
- `SMTP_HOST`, `SMTP_PORT`, `SMTP_PASSWORD`: Configurados desde env vars

### 3.6 Registro en Base de Datos
**NO se guarda en base de datos.** Solo envía email.

---

## 4. BACKEND - Endpoints de Residentes/Pacientes

### 4.1 Router
**Archivo:** `backend/app/api/routes/residents.py`

**Router:** `APIRouter(prefix="/residents", tags=["residents"])`

**Registro en app:** `backend/app/main.py` (línea 106)

### 4.2 Endpoints Implementados

#### 4.2.1 Crear Residente
```
POST /residents
Status: 201 Created
Auth: Requiere rol MEDICO o ADMIN en la facility
```

**Función:** `create_resident_endpoint`
- Valida acceso a la facility
- Llama a `create_resident()` del servicio
- Retorna `ResidentResponse`

#### 4.2.2 Listar Residentes
```
GET /residents?facility_id=:uuid&q=:query&stay_status=:status&status=:status
Status: 200 OK
Auth: Requiere usuario autenticado con acceso a la facility
```

**Función:** `list_residents`
- Query params: `facility_id` (requerido), `q` (búsqueda), `stay_status`, `status`
- Filtra por facility, soft-delete, y filtros opcionales
- Ordena por apellido, nombre

#### 4.2.3 Obtener Residente por ID
```
GET /residents/:residentId
Status: 200 OK
Auth: Requiere usuario autenticado con acceso a la facility del residente
```

**Función:** `get_resident`
- Valida acceso a la facility del residente
- Retorna `ResidentResponse`

#### 4.2.4 Actualizar Residente
```
PATCH /residents/:residentId
Status: 200 OK
Auth: Requiere rol MEDICO o ADMIN en la facility del residente
```

**Función:** `update_resident_endpoint`
- Valida acceso a la facility del residente
- Llama a `update_resident()` del servicio
- Retorna `ResidentResponse` actualizado

#### 4.2.5 Eliminar Residente (Soft Delete)
```
DELETE /residents/:residentId
Status: 204 No Content
Auth: Requiere rol MEDICO o ADMIN en la facility del residente
```

**Función:** `delete_resident_endpoint`
- Llama a `soft_delete_resident()` del servicio
- Marca `deleted_at` y `deleted_by_user_id`

#### 4.2.6 Listar Eliminados (Papelera)
```
GET /residents/deleted?facility_id=:uuid&q=:query&within_days=:days
Status: 200 OK
Auth: Requiere rol MEDICO o ADMIN
```

**Función:** `list_deleted_residents_endpoint`
- Lista residentes eliminados en los últimos N días (default: 3)

#### 4.2.7 Restaurar Residente
```
POST /residents/:residentId/restore?within_days=:days
Status: 200 OK
Auth: Requiere rol MEDICO o ADMIN
```

**Función:** `restore_resident_endpoint`
- Restaura residente desde papelera (dentro de ventana de tiempo)

### 4.3 Service Layer
**Archivo:** `backend/app/services/residents_service.py`

**Funciones principales:**
- `create_resident()`: Crea residente y contactos, registra en audit log y activity feed
- `get_residents()`: Lista con filtros
- `get_resident_by_id()`: Obtiene por ID (con opción de incluir eliminados)
- `update_resident()`: Actualiza campos, registra cambios en audit log y activity feed
- `soft_delete_resident()`: Marca como eliminado
- `list_deleted_residents()`: Lista eliminados
- `restore_resident()`: Restaura desde papelera

### 4.4 Schemas (Pydantic)
**Archivo:** `backend/app/schemas/residents.py`

**Schemas principales:**

```python
class ResidentCreate(BaseModel):
    facility_id: UUID
    first_name: str
    last_name: str
    dni: Optional[str] = None
    birth_date: Optional[date] = None
    sex: Optional[str] = None
    coverage_type: Optional[str] = None
    coverage_other: Optional[str] = None
    coverage_number: Optional[str] = None
    admission_date: date
    notes: Optional[str] = None
    contacts: Optional[List[ResidentContactCreate]] = Field(default_factory=list)
    
    @model_validator(mode='after')
    def validate_coverage_other(self):
        if self.coverage_type == 'OTRA' and not self.coverage_other:
            raise ValueError("coverage_other es requerido cuando coverage_type es 'OTRA'")
        return self

class ResidentUpdate(BaseModel):
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    dni: Optional[str] = None
    birth_date: Optional[date] = None
    sex: Optional[str] = None
    coverage_type: Optional[str] = None
    coverage_other: Optional[str] = None
    coverage_number: Optional[str] = None
    admission_date: Optional[date] = None
    stay_status: Optional[str] = Field(None, pattern="^(ACTIVE|ENDED)$")
    status: Optional[str] = Field(None, pattern="^(ACTIVE|INACTIVE)$")
    end_date: Optional[date] = None
    end_reason: Optional[str] = Field(None, pattern="^(DISCHARGE|PASSING|TRANSFER)$")
    notes: Optional[str] = None
    
    @field_validator("end_date")
    @classmethod
    def validate_end_date(cls, v, info):
        if v and "admission_date" in info.data and info.data["admission_date"]:
            if v < info.data["admission_date"]:
                raise ValueError("La fecha de finalización no puede ser anterior a la fecha de ingreso")
        return v
```

### 4.5 Modelo de Base de Datos
**Archivo:** `backend/app/models/residents.py`

**Tabla:** `residents`

**Columnas principales:**
```python
class Resident(Base):
    __tablename__ = "residents"
    
    id = Column(UUID(as_uuid=True), primary_key=True)
    facility_id = Column(UUID(as_uuid=True), ForeignKey("facilities.id"), nullable=False)
    first_name = Column(String(80), nullable=False)
    last_name = Column(String(80), nullable=False)
    dni = Column(String(16), nullable=True)
    birth_date = Column(Date, nullable=True)
    sex = Column(String(16), nullable=True)
    coverage_type = Column(String(32), nullable=True)
    coverage_other = Column(String(128), nullable=True)
    coverage_number = Column(String(64), nullable=True)
    admission_date = Column(Date, nullable=False)
    
    # Estadía
    stay_status = Column(String(24), nullable=False, default="ACTIVE")
    end_date = Column(Date, nullable=True)
    end_reason = Column(String(24), nullable=True)  # DISCHARGE, PASSING, TRANSFER
    
    # Estado del paciente
    status = Column(String(24), nullable=False, default="ACTIVE")  # ACTIVE, INACTIVE
    
    # Soft delete
    deleted_at = Column(DateTime(timezone=True), nullable=True)
    deleted_by_user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=True)
    
    # Auditoría
    created_at = Column(DateTime(timezone=True), default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime(timezone=True), default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)
    created_by_user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=True)
    updated_by_user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=True)
```

**Tabla relacionada:** `resident_contacts`

```python
class ResidentContact(Base):
    __tablename__ = "resident_contacts"
    
    id = Column(UUID(as_uuid=True), primary_key=True)
    resident_id = Column(UUID(as_uuid=True), ForeignKey("residents.id"), nullable=False)
    full_name = Column(String(160), nullable=False)
    relationship_type = Column(String(80), nullable=True)
    phone = Column(String(32), nullable=True)
    email = Column(String(255), nullable=True)
    address = Column(String(255), nullable=True)
    is_primary = Column(Boolean, default=False, nullable=False)
    created_at = Column(DateTime(timezone=True), default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime(timezone=True), default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)
```

### 4.6 Migraciones
**Migraciones relevantes:**
- `001_initial_schema.py`: Crea tabla `residents` y `resident_contacts`
- `010_add_coverage_other.py`: Agrega columna `coverage_other`
- `014_add_resident_status_and_activity_events.py`: Agrega columna `status`
- `016_add_resident_soft_delete.py`: Agrega `deleted_at` y `deleted_by_user_id`

---

## 5. Diagramas de Flujo

### 5.1 Flujo "Reportar Error"

```
┌─────────────────────────────────────────────────────────────────┐
│ FRONTEND (Vercel)                                               │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  App.tsx                                                        │
│  ├─ Renderiza <BugReportFab /> (línea 100)                     │
│  │  └─ Global, visible en todas las rutas protegidas           │
│  │                                                              │
│  BugReportFab.tsx                                               │
│  ├─ Botón FAB: fixed bottom-24 right-4 z-40                    │
│  │  └─ Visible si: usuario autenticado && !ruta pública        │
│  ├─ onClick → Abre Modal                                       │
│  │                                                              │
│  Modal.tsx                                                      │
│  ├─ z-50 (sobre el FAB)                                        │
│  ├─ Formulario:                                                │
│  │  ├─ Usuario (disabled)                                      │
│  │  ├─ Email (disabled)                                        │
│  │  └─ Mensaje (textarea, min 3 caracteres)                    │
│  │                                                              │
│  └─ submit → supportApi.bugReport()                            │
│     └─ POST /support/bug-report                                │
│        Body: {                                                  │
│          message: string,                                       │
│          path?: string,                                         │
│          facility_id?: UUID,                                    │
│          build_id?: string,                                     │
│          build_time?: string,                                   │
│          user_agent?: string                                    │
│        }                                                        │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│ BACKEND (Render) - FastAPI                                      │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  /support/bug-report (POST)                                     │
│  ├─ Autenticación: get_current_user (JWT Bearer)               │
│  ├─ Validación: BugReportRequest (Pydantic)                    │
│  │  └─ message: min 3, max 5000 caracteres                     │
│  ├─ Construcción de email:                                     │
│  │  ├─ Datos usuario (current_user)                            │
│  │  ├─ Datos del payload                                       │
│  │  └─ Template HTML + texto plano                             │
│  └─ Envío de email:                                            │
│     └─ email_service.send_email()                              │
│        └─ Destinatario: settings.SMTP_USER                     │
│        └─ Asunto: "Reporte de error – Plataforma Geriátricos"  │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│ EMAIL SERVICE                                                   │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  SMTP Server                                                    │
│  └─ Envía email a: miconsultoriosoporte@gmail.com              │
│     (NO se guarda en base de datos)                            │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### 5.2 Flujo Crear/Editar Paciente/Residente

```
┌─────────────────────────────────────────────────────────────────┐
│ FRONTEND (Vercel)                                               │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  Páginas que usan ResidentForm:                                │
│  ├─ ResidentsListPage.tsx (/residents)                         │
│  └─ PatientList.tsx (usado en /g/:id/medical)                  │
│                                                                 │
│  ResidentForm.tsx                                               │
│  ├─ Validación frontend:                                        │
│  │  ├─ first_name, last_name: requeridos                       │
│  │  ├─ admission_date: requerido, no futura                    │
│  │  ├─ birth_date: si existe, no futura, < admission_date      │
│  │  ├─ coverage_other: requerido si coverage_type === 'OTRA'   │
│  │  └─ contactos: validación de campos                         │
│  │                                                              │
│  ├─ onSubmit →                                                │
│  │  ├─ Si resident existe → residentsApi.update()             │
│  │  │  └─ PATCH /residents/:residentId                        │
│  │  │     Body: ResidentUpdate (JSON)                         │
│  │  │                                                          │
│  │  └─ Si no existe → residentsApi.create()                   │
│  │     └─ POST /residents                                     │
│  │        Body: ResidentCreate (JSON)                         │
│  │        {                                                    │
│  │          facility_id, first_name, last_name,               │
│  │          dni, birth_date, sex, coverage_type,              │
│  │          coverage_other, coverage_number,                  │
│  │          admission_date, notes,                            │
│  │          contacts: [                                       │
│  │            { full_name, phone, email,                      │
│  │              relationship_type, is_primary }               │
│  │          ]                                                 │
│  │        }                                                    │
│  │                                                              │
│  └─ Manejo de errores: muestra mensajes al usuario            │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│ BACKEND (Render) - FastAPI                                      │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  POST /residents (Crear)                                        │
│  ├─ Autenticación: require_facility_role_any(['MEDICO',        │
│  │                                            'ADMIN'])         │
│  ├─ Validación: ResidentCreate (Pydantic)                     │
│  │  └─ coverage_other requerido si coverage_type === 'OTRA'   │
│  ├─ Validación acceso: require_facility_access()               │
│  │                                                              │
│  └─ Service: create_resident()                                 │
│     ├─ Crea registro en tabla 'residents'                     │
│     ├─ Crea contactos en tabla 'resident_contacts'            │
│     ├─ Audit Log: CREATE_RESIDENT                             │
│     ├─ Activity Feed: PATIENT_CREATED                         │
│     └─ Push Notification (opcional)                           │
│                                                                 │
│  PATCH /residents/:residentId (Actualizar)                     │
│  ├─ Autenticación: require_facility_role_any(['MEDICO',        │
│  │                                            'ADMIN'])         │
│  ├─ Validación: ResidentUpdate (Pydantic)                     │
│  │  ├─ coverage_other requerido si coverage_type === 'OTRA'   │
│  │  └─ end_date >= admission_date (si ambos existen)          │
│  ├─ Validación acceso: require_facility_access()               │
│  │                                                              │
│  └─ Service: update_resident()                                 │
│     ├─ Actualiza campos en tabla 'residents'                  │
│     ├─ Audit Log: UPDATE_RESIDENT                             │
│     ├─ Activity Feed: PATIENT_UPDATED o                       │
│     │                PATIENT_STATUS_CHANGED                   │
│     └─ Push Notification (opcional)                           │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│ DATABASE (PostgreSQL)                                           │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  Tabla: residents                                               │
│  ├─ INSERT (crear):                                            │
│  │  └─ Campos: id, facility_id, first_name, last_name,        │
│  │             dni, birth_date, sex, coverage_type,            │
│  │             coverage_other, coverage_number,                │
│  │             admission_date, stay_status='ACTIVE',           │
│  │             status='ACTIVE', notes,                         │
│  │             created_at, updated_at,                         │
│  │             created_by_user_id, updated_by_user_id          │
│  │                                                              │
│  └─ UPDATE (editar):                                           │
│     └─ Campos actualizados según ResidentUpdate               │
│                                                                 │
│  Tabla: resident_contacts                                       │
│  ├─ INSERT (solo en creación):                                 │
│  │  └─ Campos: id, resident_id, full_name,                    │
│  │             relationship_type, phone, email,                │
│  │             address, is_primary,                            │
│  │             created_at, updated_at                          │
│  │                                                              │
│  └─ NOTA: En actualización, los contactos NO se actualizan    │
│     automáticamente (usar endpoints separados de contacts)     │
│                                                                 │
│  Tabla: audit_logs                                              │
│  ├─ INSERT: CREATE_RESIDENT o UPDATE_RESIDENT                 │
│  │  └─ Campos: facility_id, actor_user_id, action,            │
│  │             entity_type='Resident', entity_id,              │
│  │             metadata_json                                   │
│                                                                 │
│  Tabla: activity_events                                         │
│  ├─ INSERT: PATIENT_CREATED, PATIENT_UPDATED, o               │
│  │         PATIENT_STATUS_CHANGED                              │
│  │  └─ Campos: facility_id, actor_user_id, event_type,        │
│  │             entity_type, entity_id, summary,                │
│  │             event_metadata                                  │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## 6. Archivos Relevantes - Lista Completa

### 6.1 Frontend - "Reportar Error"
```
frontend/src/components/support/BugReportFab.tsx    # Componente FAB y modal
frontend/src/components/ui/Modal.tsx                # Componente modal reutilizable
frontend/src/api/support.ts                         # API client para support
frontend/src/App.tsx                                # Renderizado global del FAB
frontend/src/api/client.ts                          # Cliente HTTP base (fetch)
```

### 6.2 Frontend - Formulario de Pacientes/Residentes
```
frontend/src/components/forms/ResidentForm.tsx      # Componente del formulario
frontend/src/pages/ResidentsListPage.tsx            # Página principal de residentes
frontend/src/components/medical/PatientList.tsx     # Lista de pacientes (médico)
frontend/src/api/residents.ts                       # API client para residents
frontend/src/types/residents.ts                     # Tipos/Interfaces TypeScript
```

### 6.3 Backend - "Reportar Error"
```
backend/app/api/routes/support.py                   # Endpoint POST /support/bug-report
backend/app/schemas/support.py                      # Schemas Pydantic (BugReportRequest/Response)
backend/app/services/email_service.py               # Servicio de envío de emails
backend/app/core/config.py                          # Configuración (SMTP settings)
```

### 6.4 Backend - Residentes/Pacientes
```
backend/app/api/routes/residents.py                 # Endpoints de residents (CRUD)
backend/app/schemas/residents.py                    # Schemas Pydantic (ResidentCreate/Update/Response)
backend/app/models/residents.py                     # Modelos SQLAlchemy (Resident, ResidentContact)
backend/app/services/residents_service.py           # Lógica de negocio (create/update/get/delete)
backend/app/main.py                                 # Registro de routers
backend/migrations/versions/001_initial_schema.py   # Migración inicial (tabla residents)
backend/migrations/versions/010_add_coverage_other.py  # Migración coverage_other
backend/migrations/versions/014_add_resident_status_and_activity_events.py  # Migración status
backend/migrations/versions/016_add_resident_soft_delete.py  # Migración soft delete
```

---

## 7. Resumen de Endpoints

### 7.1 Support
- `POST /support/bug-report` - Reportar error (envía email)

### 7.2 Residents
- `POST /residents` - Crear residente
- `GET /residents` - Listar residentes (con filtros)
- `GET /residents/:residentId` - Obtener residente por ID
- `PATCH /residents/:residentId` - Actualizar residente
- `DELETE /residents/:residentId` - Eliminar residente (soft delete)
- `GET /residents/deleted` - Listar eliminados (papelera)
- `POST /residents/:residentId/restore` - Restaurar residente

---

## 8. Notas Importantes

### 8.1 Autenticación
- Todos los endpoints requieren JWT Bearer token
- Headers: `Authorization: Bearer <token>`
- Token se obtiene desde `localStorage.getItem('token')`

### 8.2 Permisos
- **Reportar Error:** Usuario autenticado (cualquier rol)
- **Crear/Editar Residente:** Requiere rol `MEDICO` o `ADMIN` en la facility
- **Listar Residentes:** Usuario autenticado con acceso a la facility

### 8.3 Validaciones
- Frontend: Validaciones de UI (UX)
- Backend: Validaciones Pydantic (seguridad y consistencia)
- Base de datos: Constraints de SQLAlchemy

### 8.4 Formato de Fechas
- Frontend → Backend: `YYYY-MM-DD` (ISO date string)
- Backend → Frontend: `YYYY-MM-DD` (ISO date string)

### 8.5 Formato de Datos
- **Content-Type:** `application/json`
- **Encoding:** UTF-8
- **Método HTTP:** POST (crear), PATCH (actualizar), GET (leer), DELETE (eliminar)

---

## 9. Próximos Pasos para Agregar Upload

### 9.1 Para "Reportar Error"
- Agregar campo de archivo(s) en `BugReportFab.tsx`
- Modificar `BugReportRequest` para aceptar archivos
- Cambiar envío de JSON a `FormData` (multipart/form-data)
- Modificar endpoint backend para recibir archivos (`UploadFile` de FastAPI)
- Guardar archivos en storage (S3, local, etc.)
- Incluir links de archivos en el email

### 9.2 Para Formulario de Pacientes
- Agregar campo(s) de archivo(s) en `ResidentForm.tsx`
- Modificar `ResidentCreate`/`ResidentUpdate` para incluir archivos
- Opción 1: Enviar archivos junto con datos (FormData)
- Opción 2: Endpoint separado para upload de documentos
- Modificar endpoint backend para recibir archivos
- Guardar archivos asociados al residente
- Relación con tabla `documents` (ya existe en el modelo)

---

**Fecha de análisis:** 2024
**Versión del código analizado:** Actual (main branch)
