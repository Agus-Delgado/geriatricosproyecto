# Guía de Solución de Problemas

## Error: UnicodeDecodeError con psycopg2

### Síntoma
```
UnicodeDecodeError: 'utf-8' codec can't decode byte 0xf3 in position 85: invalid continuation byte
```

### Causa
Este es un problema conocido de `psycopg2` en Windows cuando:
1. La ruta del proyecto contiene caracteres especiales (como "ó" en "Proyectos")
2. psycopg2 intenta leer información del sistema con codificación incorrecta

### Soluciones

#### Opción 1: Mover el proyecto (RECOMENDADO)
Mover el proyecto a una ruta sin caracteres especiales:

**Antes:**
```
C:\Users\augus\Desktop\Proyectos\Geriatricos proyecto\backend
```

**Después:**
```
C:\Users\augus\Desktop\Proyectos\Geriatricos_proyecto\backend
```

O mejor aún:
```
C:\Users\augus\Desktop\Proyectos\GeriatricosProyecto\backend
```

#### Opción 2: Usar SQLite para desarrollo local
Si no puedes mover el proyecto, puedes usar SQLite temporalmente:

1. Editar `.env`:
   ```env
   DATABASE_URL=sqlite:///./geriatricos.db
   ```

2. **Nota importante**: SQLite tiene limitaciones:
   - No soporta algunos tipos de datos de PostgreSQL (UUID, JSONB, etc.)
   - Necesitarás ajustar la migración para SQLite
   - No recomendado para producción

#### Opción 3: Verificar PostgreSQL
Asegúrate de que PostgreSQL esté instalado y corriendo:

```powershell
# Verificar servicio
Get-Service -Name "*postgres*"

# O usar services.msc y buscar "postgresql"
```

## Errores de Modelos Resueltos

### ✅ Conflicto con `relationship`
**Problema**: El campo `relationship` en `ResidentContact` sobrescribía la función `relationship()` de SQLAlchemy.

**Solución**: Renombrado a `relationship_type` en:
- Modelo: `backend/app/models/residents.py`
- Schemas: `backend/app/schemas/residents.py`
- Migración: `backend/migrations/versions/001_initial_schema.py`

### ✅ Conflicto con `metadata`
**Problema**: El campo `metadata` en `AuditLog` es una palabra reservada en SQLAlchemy.

**Solución**: Renombrado a `metadata_json` en:
- Modelo: `backend/app/models/audit.py`
- Migración: `backend/migrations/versions/001_initial_schema.py`
- Todos los servicios y rutas que usan `AuditLog`

## Verificación de Errores Corregidos

Para verificar que los errores de modelos están resueltos:

```bash
# Debe funcionar sin errores
python -c "from app.models import *; print('Todos los modelos OK')"

# Debe funcionar sin errores
python -c "from app.db.session import engine; print('Engine OK')"
```

Si estos comandos funcionan, los errores de modelos están resueltos. El problema de conexión a PostgreSQL es un tema separado relacionado con la ruta del proyecto.
