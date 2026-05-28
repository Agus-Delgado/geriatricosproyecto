# 🏢 Funcionalidades del Owner - Sistema Geriátricos

Este documento detalla todas las nuevas funcionalidades implementadas para los propietarios/owners de los 3 hogares geriátricos.

## 📋 Tabla de Contenidos

1. [Resumen de Funcionalidades](#resumen-de-funcionalidades)
2. [Instalación y Configuración](#instalación-y-configuración)
3. [Integración de Rutas](#integración-de-rutas)
4. [Uso de las Funcionalidades](#uso-de-las-funcionalidades)
5. [Estructura de Archivos](#estructura-de-archivos)

---

## 🎯 Resumen de Funcionalidades

### Funcionalidades Implementadas ✅

1. **Gestión de Personal** 👥
   - CRUD completo de empleados (médicos, enfermeros, auxiliares, etc.)
   - Campos: DNI, CUIL, cargo, especialidad, matrícula profesional
   - Estados: Activo, Con Licencia, Inactivo
   - Búsqueda y filtros

2. **Gestión de Turnos** 🕐
   - Crear turnos (mañana, tarde, noche) con horarios personalizados
   - Asignar colores para visualización
   - Activar/desactivar turnos

3. **Asignación de Turnos** 📅
   - Calendario semanal interactivo
   - Asignar personal a turnos específicos por fecha
   - Vista organizada por turno y día
   - Eliminación rápida de asignaciones

4. **Dashboard "Quién está trabajando ahora"** 🟢
   - Vista en tiempo real del personal actualmente en servicio
   - Auto-refresh cada 30 segundos
   - Indicadores de check-in/check-out
   - Estado de cobertura (Completa, Insuficiente, Sobrecarga)
   - Acceso rápido a contacto del personal

5. **Dashboard del Owner** 📊
   - KPIs principales (pacientes, personal, turnos)
   - Estado de cobertura en tiempo real
   - Accesos rápidos a todas las funcionalidades
   - Vista consolidada

6. **Visualización de Pacientes** 🏥
   - Acceso de solo lectura a los perfiles de pacientes
   - Estados discretos (Activo/Inactivo)
   - Filtros y búsqueda

---

## 🔧 Instalación y Configuración

### Paso 1: Aplicar Migración de Base de Datos

```bash
cd backend
alembic upgrade head
```

Esto creará:
- Tabla `shifts` (turnos)
- Tabla `shift_assignments` (asignaciones)
- Extensión de tabla `staff` con nuevos campos

### Paso 2: Verificar Imports en el Backend

El archivo `backend/app/main.py` ya está actualizado con el import de `shifts`:

```python
from app.api.routes import (
    # ... otros imports
    staff, shifts, attendance, admin, dashboard, activity
)

# Y el router registrado:
app.include_router(shifts.router)
```

### Paso 3: Integrar Rutas en el Frontend

Edita `frontend/src/App.tsx` y agrega las nuevas rutas:

```tsx
import { OwnerDashboardPage } from './pages/OwnerDashboardPage';
import { StaffManagementPage } from './pages/StaffManagementPage';
import { ShiftsManagementPage } from './pages/ShiftsManagementPage';
import { ShiftAssignmentsPage } from './pages/ShiftAssignmentsPage';
import { CurrentlyWorkingPage } from './pages/CurrentlyWorkingPage';

// Dentro de tus rutas protegidas:
<Route path="/owner-dashboard" element={<OwnerDashboardPage />} />
<Route path="/staff-management" element={<StaffManagementPage />} />
<Route path="/shifts-management" element={<ShiftsManagementPage />} />
<Route path="/shift-assignments" element={<ShiftAssignmentsPage />} />
<Route path="/currently-working" element={<CurrentlyWorkingPage />} />
```

### Paso 4: Actualizar Navegación

Si tienes un menú de navegación, agrega links a las nuevas páginas para usuarios con rol ADMIN/OWNER:

```tsx
{isOwner && (
  <>
    <NavLink to="/owner-dashboard">Dashboard Owner</NavLink>
    <NavLink to="/staff-management">Personal</NavLink>
    <NavLink to="/shifts-management">Turnos</NavLink>
    <NavLink to="/shift-assignments">Asignaciones</NavLink>
    <NavLink to="/currently-working">Quién Trabaja</NavLink>
  </>
)}
```

### Paso 5: Datos de Prueba (Opcional)

Puedes crear turnos de ejemplo manualmente o mediante seeds. Ejemplo de turnos comunes:

```sql
INSERT INTO shifts (id, facility_id, name, start_time, end_time, color, is_active) VALUES
(uuid_generate_v4(), 'facility_id_aqui', 'Mañana', '06:00:00', '14:00:00', '#3B82F6', true),
(uuid_generate_v4(), 'facility_id_aqui', 'Tarde', '14:00:00', '22:00:00', '#10B981', true),
(uuid_generate_v4(), 'facility_id_aqui', 'Noche', '22:00:00', '06:00:00', '#F59E0B', true);
```

---

## 📱 Uso de las Funcionalidades

### 1. Dashboard del Owner

**Ruta:** `/owner-dashboard`

**Descripción:** Panel central con KPIs y accesos rápidos

**Funcionalidades:**
- Ver cantidad de pacientes activos vs total
- Ver cantidad de personal activo vs total
- Ver personal trabajando ahora
- Ver turnos asignados hoy
- Estado de cobertura en tiempo real
- Links rápidos a todas las secciones

### 2. Gestión de Personal

**Ruta:** `/staff-management`

**Descripción:** Administración de empleados

**Operaciones:**
- **Crear Personal:** Click en "Agregar"
  - Campos obligatorios: Nombre, Apellido
  - Campos opcionales: DNI, CUIL, teléfono, email, cargo, especialidad, matrícula, fecha ingreso, notas

- **Editar Personal:** Click en "Editar" en la tarjeta
  - Cambiar estado (Activo, Con Licencia, Inactivo)
  - Establecer fecha de baja

- **Buscar:** Barra de búsqueda por nombre o DNI
- **Filtrar:** Checkbox "Solo personal activo"

### 3. Gestión de Turnos

**Ruta:** `/shifts-management`

**Descripción:** Configuración de turnos de trabajo

**Operaciones:**
- **Crear Turno:** Click en "Nuevo Turno"
  - Nombre (ej: "Mañana")
  - Hora inicio y fin
  - Color para visualización

- **Editar Turno:** Click en "Editar"
  - Modificar horarios o activar/desactivar

- **Eliminar Turno:** Click en "Eliminar"
  - Solo si no tiene asignaciones

### 4. Asignación de Turnos

**Ruta:** `/shift-assignments`

**Descripción:** Calendario semanal de asignaciones

**Operaciones:**
- **Navegar semanas:** Botones "Anterior", "Hoy", "Siguiente"
- **Asignar personal:** Click en "Asignar"
  - Seleccionar personal
  - Seleccionar turno
  - Seleccionar fecha
  - Agregar notas opcionales

- **Eliminar asignación:** Click en "×" junto al nombre en el calendario

**Vista:**
- Calendario organizado por turno (filas) y día de la semana (columnas)
- Colores según el turno asignado
- Resaltado del día actual

### 5. Personal Trabajando Ahora

**Ruta:** `/currently-working`

**Descripción:** Vista en tiempo real del personal en servicio

**Características:**
- Auto-refresh cada 30 segundos
- Indicador verde 🟢 si hizo check-in
- Indicador amarillo 🟡 si está asignado pero no marcó ingreso
- Muestra turno, horario, teléfono
- Estado de cobertura
- Estadísticas: trabajando ahora, activos totales, turnos del día

**Botón Manual:** "Actualizar" para refresh inmediato

---

## 📂 Estructura de Archivos

### Backend

```
backend/app/
├── models/
│   ├── staff.py                      # ✅ Extendido con Shift y ShiftAssignment
│   └── org.py                        # ✅ Actualizado con relationships
│
├── schemas/
│   └── staff.py                      # ✅ Nuevos schemas para shifts y dashboard
│
├── services/
│   ├── staff_service.py              # ✅ Existente
│   └── shift_service.py              # ✨ NUEVO - Lógica de turnos y dashboard
│
├── api/routes/
│   ├── staff.py                      # ✅ Existente
│   └── shifts.py                     # ✨ NUEVO - 15 endpoints
│
└── main.py                           # ✅ Actualizado con shifts router

backend/migrations/versions/
└── 015_add_shifts_and_extend_staff.py # ✨ NUEVO - Migración
```

### Frontend

```
frontend/src/
├── types/
│   └── staff.ts                      # ✨ NUEVO - Types completos
│
├── api/
│   ├── staff.ts                      # ✅ Existente
│   └── shifts.ts                     # ✨ NUEVO - API clients
│
└── pages/
    ├── OwnerDashboardPage.tsx        # ✨ NUEVO - Dashboard principal
    ├── StaffManagementPage.tsx       # ✨ NUEVO - Gestión de personal
    ├── ShiftsManagementPage.tsx      # ✨ NUEVO - Gestión de turnos
    ├── ShiftAssignmentsPage.tsx      # ✨ NUEVO - Calendario asignaciones
    └── CurrentlyWorkingPage.tsx      # ✨ NUEVO - Personal en tiempo real
```

---

## 🔐 Permisos y Roles

### Roles con Acceso

- **ADMIN** (Owner): Acceso completo a todas las funcionalidades
- **MEDICO**: Solo lectura de personal y pacientes
- **STAFF**: Sin acceso a gestión de personal/turnos

### Endpoints Protegidos

Todos los endpoints de gestión de personal y turnos requieren rol `ADMIN`:

```python
@router.post("/staff", ...)
async def create_staff(
    current_user: User = Depends(require_role("ADMIN")),  # ← Protegido
    ...
)
```

---

## 🚀 Próximos Pasos Recomendados

1. **Agregar Reportes:**
   - Reporte mensual de horas trabajadas por empleado
   - Reporte de costos laborales
   - Exportación a PDF/Excel

2. **Notificaciones:**
   - Alertas de ausencias
   - Recordatorios de turnos
   - Notificaciones push

3. **Dashboard Financiero Mejorado:**
   - Gráficos de ingresos/gastos
   - Comparativa entre facilities
   - Proyecciones

4. **Gestión de Inventario:**
   - Stock de medicamentos
   - Alertas de stock bajo
   - Órdenes de compra

---

## 📞 Soporte

Si tienes dudas o encuentras problemas:

1. Verifica que la migración se haya aplicado correctamente
2. Revisa los logs del backend para errores de API
3. Verifica la consola del navegador para errores de frontend
4. Asegúrate de que el usuario tenga rol ADMIN

---

## 📝 Notas Importantes

- ⚠️ **Estados de Residentes:** Se cambió de "ACTIVE/INACTIVE/DECEASED" a solo "ACTIVE/INACTIVE" para mayor discreción
- 🔄 **Auto-refresh:** El dashboard de personal trabajando se actualiza cada 30 segundos
- 🎨 **Colores de Turnos:** Puedes personalizar los colores de cada turno
- 📱 **Responsive:** Todas las páginas están optimizadas para móviles

---

## ✅ Checklist de Integración

- [ ] Aplicar migración `alembic upgrade head`
- [ ] Verificar que shifts router esté registrado en main.py
- [ ] Agregar rutas en App.tsx
- [ ] Agregar links en navegación
- [ ] Probar creación de turnos
- [ ] Probar creación de personal
- [ ] Probar asignación de turnos
- [ ] Verificar dashboard en tiempo real
- [ ] Verificar permisos de rol ADMIN

---

**¡Listo!** Ahora los owners tienen control total sobre la gestión de personal y turnos de los 3 hogares geriátricos. 🎉
