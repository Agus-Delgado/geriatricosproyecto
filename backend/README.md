# Plataforma Hogares - Backend API

API backend para gestión de 3 hogares (MVP) desarrollada con FastAPI, SQLAlchemy 2.0 y PostgreSQL.

## Stack Tecnológico

- **Framework**: FastAPI 0.104+
- **ORM**: SQLAlchemy 2.0
- **Migraciones**: Alembic
- **Base de datos**: PostgreSQL
- **Autenticación**: JWT (python-jose)
- **Hashing**: pbkdf2_sha256 (passlib)

## Setup Local

### Prerrequisitos

- Python 3.10+
- PostgreSQL 12+
- pip

### Instalación

1. **Clonar el repositorio y entrar al directorio backend:**
   ```bash
   cd backend
   ```

2. **Crear entorno virtual:**
   ```bash
   python -m venv venv
   # Windows
   venv\Scripts\activate
   # Linux/Mac
   source venv/bin/activate
   ```

3. **Instalar dependencias:**
   ```bash
   pip install -r requirements.txt
   ```

4. **Configurar variables de entorno:**
   
   Copiar `.env.example` a `.env` y configurar:
   ```env
   DATABASE_URL=postgresql://user:password@localhost:5432/geriatricos_db
   JWT_SECRET=your-secret-key-change-in-production
   JWT_ALGORITHM=HS256
   ACCESS_TOKEN_EXPIRE_MINUTES=1440
   CORS_ORIGINS=http://localhost:5173,http://localhost:4173
   ```
   
   **Nota sobre CORS_ORIGINS**: Esta variable es **opcional**. Si no se define, se usan valores por defecto para desarrollo local (`http://localhost:5173`, `http://localhost:4173`). Además, los previews de Vercel (URLs que terminan en `.vercel.app`) se permiten automáticamente mediante regex.

5. **Crear base de datos PostgreSQL:**
   ```sql
   CREATE DATABASE geriatricos_db;
   ```

6. **Aplicar migraciones:**
   ```bash
   alembic upgrade head
   ```

7. **Ejecutar seeds (datos iniciales):**
   ```bash
   python -m app.db.seeds
   ```

   Esto creará:
   - 1 grupo propietario: "Grupo Geriátricos"
   - 3 sedes: NSL (Nuestra Señora de Luján), ET (El Trébol), EA (El Amanecer)
   - Roles: OWNER, DOCTOR
   - 5 usuarios de desarrollo (ver sección "Credenciales de Desarrollo" abajo)
   - Categorías de finanzas (7 expense + 3 income)

   **Nota**: El password por defecto es `Admin123!` (configurable con variable de entorno `DEV_SEED_PASSWORD`)

8. **Iniciar servidor:**
   ```bash
   uvicorn app.main:app --reload
   ```

   La API estará disponible en: `http://localhost:8000`
   - Swagger UI: `http://localhost:8000/docs`
   - ReDoc: `http://localhost:8000/redoc`

## Estructura del Proyecto

```
backend/
├── app/
│   ├── api/
│   │   ├── deps.py          # Dependencias (auth, roles, facility scoping)
│   │   └── routes/          # Endpoints por módulo
│   ├── core/
│   │   ├── config.py        # Configuración desde .env
│   │   └── security.py      # JWT + password hashing
│   ├── db/
│   │   ├── base.py          # Base declarativa SQLAlchemy
│   │   ├── session.py       # SessionLocal + get_db
│   │   └── seeds.py         # Script de datos iniciales
│   ├── models/              # Modelos ORM (21 tablas)
│   ├── schemas/             # Schemas Pydantic
│   ├── services/            # Lógica de negocio
│   └── main.py              # FastAPI app
├── migrations/              # Migraciones Alembic
├── tests/                   # Tests
├── alembic.ini              # Configuración Alembic
├── requirements.txt         # Dependencias Python
└── README.md
```

## Base de Datos

### Tablas Principales (21 tablas)

- **Auth**: users, user_roles, user_role_assignments
- **Organización**: owner_groups, facilities, facility_user_access
- **Residentes**: residents, resident_contacts
- **Clínica**: clinical_summaries, clinical_notes, vital_signs
- **Medicación**: medication_plans, medication_schedule_times, medication_administrations
- **Documentos**: documents
- **Certificados**: certificates
- **Plataformas Externas**: external_platforms, resident_external_events
- **Finanzas**: finance_categories, finance_transactions
- **Auditoría**: audit_log

### Convenios Importantes

- **Campos de finalización de estadía**: `stay_status`, `end_date`, `end_reason` (NO usar "death_date")
- **Primary Keys**: UUID
- **Timestamps**: UTC con timezone
- **Auditoría**: created_by_user_id, updated_by_user_id donde aplica

## Migraciones

### Crear nueva migración:
```bash
alembic revision --autogenerate -m "descripcion"
```

### Aplicar migraciones:
```bash
alembic upgrade head
```

### Revertir última migración:
```bash
alembic downgrade -1
```

## Seeds

Para ejecutar los seeds nuevamente (idempotente):
```bash
python -m app.db.seeds
```

**Nota**: Los seeds son idempotentes - no duplicarán datos si ya existen.

### Credenciales de Desarrollo

Los seeds crean los siguientes usuarios para desarrollo local:

| Rol | DNI | Email | Password | Acceso |
|-----|-----|-------|----------|--------|
| **Platform Admin** | `90000000` | (sin email) | `Admin123!` | Acceso completo a todas las facilities |
| **Admin (Propietario 1)** | `20000001` | `owner1@geriatricos.com` | `Admin123!` | ADMIN en NSL, ET, EA |
| **Admin (Propietario 2)** | `20000002` | `owner2@geriatricos.com` | `Admin123!` | ADMIN en NSL, ET, EA |
| **Médico** | `30000000` | `medico@geriatricos.com` | `Admin123!` | MEDICO en NSL, ET, EA |
| **Staff** | `40000001` | `staff1@geriatricos.com` | `Admin123!` | STAFF en NSL |

**Login**: Puedes usar DNI o email como username. Ejemplo:
- Username: `30000000` o `medico@geriatricos.com`
- Password: `Admin123!`

**Configuración del password**:
- Variable de entorno `DEV_SEED_PASSWORD` (default: `Admin123!`)
- Variable de entorno `ALLOW_SEED_RESET_PASSWORD=true` para resetear passwords de usuarios existentes

⚠️ **IMPORTANTE**: Estas credenciales son SOLO para desarrollo. Cambiar en producción.

## Crear Usuarios Adicionales

Puedes crear usuarios adicionales directamente en la base de datos o mediante un script:

```python
from app.db.session import SessionLocal
from app.models.auth import User, UserRole, UserRoleAssignment
from app.core.security import get_password_hash

db = SessionLocal()
# ... crear usuario y asignar roles
```

## Endpoints Principales

- `GET /health` - Healthcheck
- `POST /auth/login` - Login (DNI o email + password)
- `GET /auth/me` - Usuario actual
- `GET /facilities` - Lista de sedes accesibles
- `GET /residents` - Lista de residentes (filtrado por facility_id)
- ... (ver Swagger UI para lista completa)

## Permisos MVP

- **OWNER** y **DOCTOR**: acceso a las 3 sedes
- Todos los endpoints filtran por `facility_id` cuando corresponde
- Auditoría en acciones críticas

## Desarrollo

### Tests

```bash
# Instalar dependencias de desarrollo
pip install pytest pytest-asyncio httpx

# Ejecutar tests
pytest

# Ejecutar tests con cobertura
pytest --cov=app tests/
```

### Linting

```bash
# Instalar herramientas
pip install black flake8

# Formatear código
black app/

# Verificar estilo
flake8 app/
```

## Validaciones y Seguridad

- **Rate Limiting**: Login limitado a 5 intentos por minuto por IP
- **Validaciones Pydantic**: 
  - Montos financieros deben ser > 0
  - Fechas coherentes (end_date >= admission_date)
  - Enums validados (stay_status, end_reason, etc.)
- **Facility Scoping**: Todos los endpoints validan acceso a la sede
- **Auditoría**: Acciones críticas registradas en audit_log

## Límites y Configuración

- **Upload de documentos**: Preparado para límites de tamaño (configurar en storage provider)
- **Tokens JWT**: Expiración configurable (default: 1440 minutos)
- **CORS**: 
  - Variable `CORS_ORIGINS` es opcional (lista separada por comas)
  - Si no se define, usa defaults: `http://localhost:5173`, `http://localhost:4173`
  - Variable `CORS_ORIGIN_REGEX` para permitir orígenes por patrón (ej: `^https://.*\.vercel\.app$`)
  - Variable `CORS_ALLOW_CREDENTIALS` (default: `true`) para permitir cookies/credentials
  - Previews de Vercel (`.vercel.app`) se permiten automáticamente si no se define `CORS_ORIGIN_REGEX`
  - En producción, definir `CORS_ORIGINS` con la URL de tu frontend

## Solución de Problemas

### Error: UnicodeDecodeError con psycopg2 en Windows

Si encuentras el error `UnicodeDecodeError: 'utf-8' codec can't decode byte 0xf3 in position 85` al intentar conectar a PostgreSQL, esto es un problema conocido de psycopg2 en Windows cuando la ruta del proyecto contiene caracteres especiales (como "ó" en "Proyectos").

**Soluciones:**

1. **Mover el proyecto a una ruta sin caracteres especiales:**
   ```
   C:\Users\augus\Desktop\Proyectos\Geriatricos_proyecto\backend
   ```
   (Reemplazar espacios y caracteres especiales con guiones bajos)

2. **Usar SQLite temporalmente para desarrollo:**
   ```env
   DATABASE_URL=sqlite:///./geriatricos.db
   ```
   Nota: SQLite tiene limitaciones pero funciona para desarrollo local.

3. **Verificar que PostgreSQL esté corriendo:**
   ```bash
   # En Windows, verificar servicio
   services.msc
   # Buscar "postgresql" y verificar que esté "En ejecución"
   ```

### Errores de Importación de Modelos

Si encuentras errores como `TypeError: 'Column' object is not callable` o `InvalidRequestError: Attribute name 'metadata' is reserved`:

- ✅ **Resuelto**: Los campos `relationship` y `metadata` han sido renombrados a `relationship_type` y `metadata_json` respectivamente para evitar conflictos con palabras reservadas de SQLAlchemy.

## Notas de Producción

⚠️ **IMPORTANTE**:
- Cambiar `JWT_SECRET` en producción
- Cambiar passwords temporales de usuarios seed
- Configurar `CORS_ORIGINS` en producción con la URL de tu frontend (ej: `https://tu-frontend.vercel.app`)
- Usar variables de entorno seguras
- Los previews de Vercel se permiten automáticamente (no es necesario agregarlos a `CORS_ORIGINS`)
- Configurar storage real (S3/R2/Cloudinary) para documentos y certificados
- Implementar rate limiting en producción
- Configurar backups de base de datos
- **Evitar rutas con caracteres especiales en producción** (usar rutas simples)

## Configuración en Render

Para desplegar el backend en Render, configurar las siguientes variables de entorno:

### Variables Requeridas
- `DATABASE_URL`: URL de conexión a PostgreSQL (proporcionada por Render PostgreSQL)
- `JWT_SECRET`: Clave secreta para firmar tokens JWT (generar una aleatoria y segura)
- `JWT_ALGORITHM`: `HS256` (default)
- `ACCESS_TOKEN_EXPIRE_MINUTES`: `1440` (default, 24 horas)

### Variables CORS (Recomendadas)
- `CORS_ORIGIN_REGEX`: `^https://.*\.vercel\.app$` (permite todos los previews de Vercel)
- `CORS_ORIGINS`: (Opcional) URLs específicas separadas por comas, ej: `https://tu-app.vercel.app,https://tu-dominio.com`
- `CORS_ALLOW_CREDENTIALS`: `true` (default) o `false` si no usas cookies

### Ejemplo de Configuración en Render

```
DATABASE_URL=postgresql://user:pass@host:5432/dbname
JWT_SECRET=tu-clave-secreta-super-segura-aqui
JWT_ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=1440
CORS_ORIGIN_REGEX=^https://.*\.vercel\.app$
CORS_ALLOW_CREDENTIALS=true
```

### Dependencias Importantes

⚠️ **Nota sobre EmailStr de Pydantic**: Si usás `EmailStr` de Pydantic en tus schemas (como en `RegisterRequest`), necesitás asegurarte de que `email-validator>=2.0.0` esté incluido en `requirements.txt`. Esta dependencia es requerida por Pydantic para validar emails pero no se instala automáticamente con `pydantic`.

**Verificación post-deploy**:
- Verificar que el backend arranca sin errores
- Acceder a `https://geriatricos-proyecto.onrender.com/docs` y confirmar que la documentación Swagger carga correctamente
- Probar el endpoint `/auth/register` con un email válido para confirmar que la validación funciona

### Verificación de CORS

Para verificar que CORS está funcionando correctamente:

```bash
# Prueba rápida: verificar que CORS funciona y /auth/me devuelve 401 (no 500) sin token
curl -i -H "Origin: https://example.vercel.app" \
     https://geriatricos-proyecto.onrender.com/auth/me
```

**Respuesta esperada**:
- Debe incluir header `Access-Control-Allow-Origin: https://example.vercel.app` (o el origin específico)
- Debe devolver `401 Unauthorized` (NO 500) cuando no hay token
- Todos los headers CORS deben estar presentes incluso en respuestas de error (401, 403, 500, etc.)

**Prueba con token válido**:
```bash
curl -i -H "Origin: https://example.vercel.app" \
     -H "Authorization: Bearer TU_TOKEN" \
     https://geriatricos-proyecto.onrender.com/auth/me
```

**Nota**: El sistema tiene un fallback seguro de CORS que permite automáticamente todos los orígenes de Vercel (`^https://.*\.vercel\.app$`) si no se configuran variables de entorno. Esto asegura que nunca quede sin CORS por falta de configuración.

## Configuración de Email (SMTP) para Verificación

El sistema utiliza Gmail SMTP para enviar emails de verificación de cuenta. La configuración se realiza mediante variables de entorno en Render.

### Variables de Entorno SMTP (Render)

Configurar las siguientes variables en el dashboard de Render:

```env
# URL del frontend (Vercel)
FRONTEND_URL=https://tu-app.vercel.app

# Configuración de email
EMAIL_FROM=Geriátricos <miconsultoriosoporte@gmail.com>
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USE_TLS=true
SMTP_USE_SSL=false
SMTP_USER=miconsultoriosoporte@gmail.com
SMTP_PASSWORD=<APP_PASSWORD_GMAIL>  # Ver instrucciones abajo
EMAIL_VERIFY_TOKEN_TTL_HOURS=24
EMAIL_REPLY_TO=miconsultoriosoporte@gmail.com  # Opcional
```

### Obtener App Password de Gmail

**IMPORTANTE**: No usar la contraseña normal de Gmail. Se requiere una "App Password" (Contraseña de aplicación).

1. **Habilitar verificación en 2 pasos** (si no está habilitada):
   - Ir a [Cuenta de Google](https://myaccount.google.com/)
   - Seguridad → Verificación en 2 pasos → Activar

2. **Generar App Password**:
   - Ir a [App Passwords](https://myaccount.google.com/apppasswords)
   - Seleccionar "Correo" y "Otro (nombre personalizado)"
   - Ingresar nombre: "Geriátricos Backend"
   - Copiar la contraseña generada (16 caracteres sin espacios)

3. **Configurar en Render**:
   - Pegar la App Password en la variable `SMTP_PASSWORD`
   - **NUNCA** commitear esta contraseña en el código

### Troubleshooting de Emails

**Los emails no llegan:**

1. **Revisar carpeta Spam/Promociones**:
   - Gmail puede filtrar emails transaccionales a estas carpetas
   - Instruir a usuarios a revisar estas carpetas

2. **Verificar logs del backend**:
   - Buscar en logs de Render mensajes como:
     - "Email enviado exitosamente a X"
     - "Error al enviar email a X"
   - Si hay errores de autenticación, verificar `SMTP_PASSWORD` (App Password)

3. **Verificar variables de entorno**:
   ```bash
   # En Render Shell, verificar que las variables están definidas:
   echo $SMTP_USER
   echo $SMTP_HOST
   echo $FRONTEND_URL
   ```

4. **Probar conexión SMTP manualmente**:
   ```python
   # En Render Shell
   python -c "
   import smtplib
   from app.core.config import settings
   server = smtplib.SMTP(settings.SMTP_HOST, settings.SMTP_PORT)
   server.starttls()
   server.login(settings.SMTP_USER, settings.SMTP_PASSWORD)
   print('Conexión SMTP exitosa')
   server.quit()
   "
   ```

5. **Rate Limiting**:
   - El sistema limita reenvíos: mínimo 60 segundos entre envíos, máximo 5 por hora
   - Si se excede, el usuario recibirá error 429

### Flujo de Verificación de Email

1. Usuario se registra → se crea usuario con `is_verified=false`
2. Se genera token de verificación (válido por 24 horas)
3. Se envía email con enlace: `{FRONTEND_URL}/verify-email?token={TOKEN}`
4. Usuario hace click → frontend llama `POST /auth/verify-email`
5. Backend verifica token → `user.is_verified=true`
6. Usuario puede iniciar sesión

**Nota**: Los usuarios existentes (creados antes de esta implementación) mantienen `is_verified=true` por defecto.

## Bootstrap de Usuarios en Producción

El sistema incluye dos mecanismos para crear usuarios iniciales en producción:

### Opción 1: Bootstrap Automático (Recomendado)

El bootstrap automático se ejecuta al iniciar la aplicación si las variables de entorno están definidas.

**Variables de Entorno para Bootstrap:**

```
# Admin/Platform Admin
ADMIN_DNI=90000000
ADMIN_PASSWORD=tu-password-seguro-aqui
ADMIN_EMAIL=admin@geriatricos.com
ADMIN_FULL_NAME=Platform Admin

# Médico
MEDICO_DNI=30000000
MEDICO_PASSWORD=tu-password-seguro-aqui
MEDICO_EMAIL=medico@geriatricos.com
MEDICO_FULL_NAME=Dr. Médico
```

**Características:**
- Se ejecuta automáticamente al iniciar la aplicación
- Idempotente: no duplica usuarios si ya existen
- Solo crea si las variables están definidas
- Si faltan variables, solo loggea advertencia (no falla)

**Credenciales después del bootstrap:**
- **Admin**: DNI `ADMIN_DNI` o email `ADMIN_EMAIL` / password `ADMIN_PASSWORD`
- **Médico**: DNI `MEDICO_DNI` o email `MEDICO_EMAIL` / password `MEDICO_PASSWORD`

### Opción 2: Seeds Manual

Si prefieres ejecutar los seeds manualmente:

**En Render Shell:**
1. Ir a tu servicio en Render Dashboard
2. Abrir "Shell" (consola)
3. Ejecutar:
   ```bash
   python -m app.db.seeds
   ```

**Credenciales después de seeds:**
- **Platform Admin**: DNI `90000000` / password `Admin123!` (o `DEV_SEED_PASSWORD`)
- **Admin 1**: DNI `20000001` o email `owner1@geriatricos.com` / password `Admin123!`
- **Admin 2**: DNI `20000002` o email `owner2@geriatricos.com` / password `Admin123!`
- **Médico**: DNI `30000000` o email `medico@geriatricos.com` / password `Admin123!`
- **Staff**: DNI `40000001` o email `staff1@geriatricos.com` / password `Admin123!`

**Nota**: El password de seeds se puede cambiar con la variable `DEV_SEED_PASSWORD`.

### Diagnóstico de Problemas de Login

Si el login devuelve 401 "credenciales inválidas", verificar:

1. **Usuarios existen en la base de datos:**
   ```sql
   -- En Render PostgreSQL, ejecutar:
   SELECT id, dni, email, full_name, is_active FROM users;
   ```

2. **Logs del backend:**
   - Buscar en los logs de Render mensajes como:
     - "Intento de login fallido: usuario no encontrado"
     - "Intento de login fallido: password incorrecto"
     - "Login exitoso"

3. **Verificar variables de entorno:**
   - Confirmar que `ADMIN_DNI`, `ADMIN_PASSWORD`, etc. están definidas correctamente
   - Verificar que no hay espacios extra en los valores

4. **Ejecutar bootstrap manualmente:**
   ```bash
   # En Render Shell
   python -c "from app.db.session import SessionLocal; from app.db.bootstrap import bootstrap_production_users; db = SessionLocal(); bootstrap_production_users(db); db.close()"
   ```

## Licencia

[Especificar licencia]
