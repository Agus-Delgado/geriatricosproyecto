# Implementación RBAC Multi-Geriátrico

## Resumen

Se ha implementado un sistema completo de autenticación y autorización (RBAC) multi-tenant con:
- Login único (DNI + password)
- Selector de geriátrico post-login (si el usuario tiene múltiples membresías)
- Redirección automática según rol
- Roles por geriátrico: ADMIN, MEDICO, STAFF
- Rol global: PLATFORM_ADMIN (vía `is_platform_admin`)

## Credenciales DEV

Las siguientes credenciales están disponibles para testing (password por defecto: `Admin123!`, configurable via `DEV_SEED_PASSWORD`):

### 1. Platform Admin
- **DNI:** `90000000`
- **Password:** `Admin123!` (o valor de `DEV_SEED_PASSWORD`)
- **Rol:** Platform Admin
- **Acceso:** `/platform`
- **Notas:** Acceso total a la plataforma, sin membresías

### 2. Owner 1
- **DNI:** `20000001`
- **Email:** `owner1@geriatricos.com`
- **Password:** `Admin123!` (o valor de `DEV_SEED_PASSWORD`)
- **Rol:** ADMIN en los 3 geriátricos
- **Acceso:** Dashboard (`/g/{id}/dashboard`)
- **Geriátricos:** NSL, ET, EA

### 3. Owner 2
- **DNI:** `20000002`
- **Email:** `owner2@geriatricos.com`
- **Password:** `Admin123!` (o valor de `DEV_SEED_PASSWORD`)
- **Rol:** ADMIN en los 3 geriátricos
- **Acceso:** Dashboard (`/g/{id}/dashboard`)
- **Geriátricos:** NSL, ET, EA

### 4. Médico
- **DNI:** `30000000`
- **Email:** `medico@geriatricos.com`
- **Password:** `Admin123!` (o valor de `DEV_SEED_PASSWORD`)
- **Rol:** MEDICO en los 3 geriátricos
- **Acceso:** Módulo Médico (`/g/{id}/medical`)
- **Geriátricos:** NSL, ET, EA

### 5. Staff G1
- **DNI:** `40000001`
- **Email:** `staff1@geriatricos.com`
- **Password:** `Admin123!` (o valor de `DEV_SEED_PASSWORD`)
- **Rol:** STAFF en geriátrico NSL únicamente
- **Acceso:** Tareas (`/g/{id}/tasks`)
- **Geriátrico:** NSL

## Rutas Principales

### Públicas
- `/login` - Login único (DNI + password)

### Protegidas

#### Platform Admin
- `/platform` - Dashboard de plataforma (requiere `is_platform_admin=true`)

#### Por Geriátrico (requieren facility activa)
- `/g/:id/dashboard` - Dashboard para ADMIN
- `/g/:id/medical` - Módulo médico para MEDICO
- `/g/:id/tasks` - Tareas para STAFF

#### Comunes
- `/select-facility` - Selector de geriátrico (si múltiples membresías)
- `/residents` - Lista de residentes (requiere facility activa)

## Flujo de Autenticación

1. Usuario ingresa DNI y password en `/login`
2. Backend valida credenciales y retorna token
3. Frontend llama `/auth/me` para obtener user, memberships, y active_facility_id
4. Redirección automática:
   - Si `is_platform_admin` → `/platform`
   - Si `memberships.length === 1` y `active_facility_id` existe → redirigir según rol
   - Si `memberships.length > 1` o `active_facility_id === null` → `/select-facility`
   - Si `memberships.length === 0` → error "Usuario sin acceso asignado"
5. En `/select-facility`, usuario elige geriátrico
6. Frontend llama `POST /auth/active-facility` para establecer facility activa
7. Redirección según rol:
   - ADMIN → `/g/{id}/dashboard`
   - MEDICO → `/g/{id}/medical`
   - STAFF → `/g/{id}/tasks`

## Cómo Probar

### 1. Platform Admin
```bash
# Login con DNI 90000000
# Debe redirigir directamente a /platform
```

### 2. Owner (múltiples memberships)
```bash
# Login con DNI 20000001 o 20000002
# Debe mostrar selector de geriátrico
# Al elegir uno, redirigir a /g/{id}/dashboard
```

### 3. Médico (múltiples memberships)
```bash
# Login con DNI 30000000
# Debe mostrar selector de geriátrico
# Al elegir uno, redirigir a /g/{id}/medical
```

### 4. Staff (una membership)
```bash
# Login con DNI 40000001
# Debe redirigir directamente a /g/{id}/tasks (geriátrico NSL)
```

## Migraciones

Para aplicar los cambios de base de datos:

```bash
cd backend
alembic upgrade head
```

Las migraciones incluyen:
- `004a_rbac_step1`: Agregar campos `is_platform_admin`, `active_facility_id` a users, y `role`, `is_active` a facility_user_access
- `004b_rbac_step2`: Backfill de `role` desde `access_level`, luego eliminar `access_level`

## Seeds

Para poblar datos de prueba:

```bash
cd backend
python -m app.db.seeds
```

O desde Python:
```python
from app.db.session import SessionLocal
from app.db.seeds import seed_database

db = SessionLocal()
try:
    seed_database(db)
finally:
    db.close()
```

## Cambios en Modelos

### User
- Agregado: `is_platform_admin` (Boolean, default=False)
- Agregado: `active_facility_id` (UUID nullable, FK a facilities.id)

### FacilityUserAccess
- Eliminado: `access_level` (String)
- Agregado: `role` (String: 'ADMIN', 'MEDICO', 'STAFF')
- Agregado: `is_active` (Boolean, default=True)

## Endpoints API

### POST /auth/login
- Input: `{ username: string, password: string }`
- Output: `{ access_token: string, token_type: string }`
- Nota: Ya no requiere `facility_slug`

### GET /auth/me
- Output: UserResponse con `memberships`, `active_facility_id`, `is_platform_admin`

### POST /auth/active-facility
- Input: `{ facility_id: UUID }`
- Output: `{ active_facility_id: string }`
- Valida membresía activa antes de establecer

## Notas de Implementación

1. **Roles cortos**: En DB/API se usan 'ADMIN', 'MEDICO', 'STAFF'. En UI se mapean a labels usando `getRoleLabel()`.

2. **PLATFORM_ADMIN**: No se crea en UserRole, solo se usa `user.is_platform_admin` (boolean).

3. **GeriatricLoginPage**: Se mantiene como redirect a `/login` para no romper rutas existentes.

4. **Módulo Médico**: MVP implementado con placeholders. Funcionalidades completas pendientes de implementar.
