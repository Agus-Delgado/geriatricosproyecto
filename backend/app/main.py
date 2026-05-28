from fastapi import FastAPI, Request, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded
from app.core.config import settings
from app.api.routes import (
    auth, facilities, residents, resident_contacts, clinical, medications, prescriptions,
    agenda,
    documents, certificates, external_platforms, resident_external_events, finance,
    staff, attendance, admin, dashboard, activity, shifts, push, support
)
from app.db.session import SessionLocal
from app.db.bootstrap import bootstrap_production_users
import logging
from sqlalchemy import text

logger = logging.getLogger(__name__)

# Rate limiter
limiter = Limiter(key_func=get_remote_address)

app = FastAPI(
    title="Plataforma Geriátricos API",
    description="API para gestión de 3 geriátricos (MVP)",
    version="1.0.0"
)

app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

# CORS - Configurado INMEDIATAMENTE después de crear la app y ANTES de routers/startup
# para que funcione en todos los endpoints, incluyendo respuestas de error (401, 403, 500, etc.)
# Leer env vars: CORS_ORIGINS (CSV), CORS_ORIGIN_REGEX, CORS_ALLOW_CREDENTIALS
import os
cors_origins_str = os.getenv("CORS_ORIGINS", "").strip()
cors_origin_regex = os.getenv("CORS_ORIGIN_REGEX", "").strip()
cors_allow_credentials = os.getenv("CORS_ALLOW_CREDENTIALS", "true").strip().lower() == "true"

# Parsear CORS_ORIGINS (CSV)
cors_origins = []
if cors_origins_str:
    cors_origins = [origin.strip() for origin in cors_origins_str.split(",") if origin.strip()]

# Si no hay env vars, intentar usar settings (para compatibilidad)
if not cors_origins and not cors_origin_regex:
    cors_origins = settings.cors_origins_list
    cors_origin_regex = settings.cors_origin_regex

# Fallback seguro: si tanto origins como regex están vacíos, usar regex para Vercel previews
# Esto asegura que nunca quede sin CORS por falta de env vars
if not cors_origin_regex and (not cors_origins or len(cors_origins) == 0):
    cors_origin_regex = r"^https://.*\.vercel\.app$"
    logger.warning("CORS: No hay configuración de CORS. Usando fallback seguro para Vercel previews.")

app.add_middleware(
    CORSMiddleware,
    allow_origins=cors_origins if cors_origins else [],
    allow_origin_regex=cors_origin_regex,
    allow_credentials=cors_allow_credentials,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Endpoints básicos
@app.get("/")
async def root():
    """Endpoint de bienvenida con información básica de la API"""
    return {
        "name": "Geriatricos API",
        "status": "ok",
        "docs": "/docs",
        "openapi": "/openapi.json"
    }


@app.get("/health")
async def health_check():
    """Health check endpoint"""
    return {"status": "ok"}


# Catch-all exception handler para asegurar que CORS se aplique SIEMPRE, incluso en errores 500
@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    """Handler global que captura cualquier excepción no manejada.
    
    Esto asegura que los errores 500 siempre pasen por los middlewares de CORS
    y retornen respuestas JSON con headers CORS correctos.
    """
    # Loguear el error real con stacktrace para diagnóstico
    logger.exception(f"Excepción no manejada en {request.method} {request.url}: {exc}")
    
    # Retornar JSONResponse para que CORS se aplique
    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content={"detail": "Internal Server Error"}
    )


# Routers
app.include_router(auth.router)
app.include_router(admin.router)
app.include_router(facilities.router)
app.include_router(residents.router)
app.include_router(resident_contacts.router)
app.include_router(clinical.router)
app.include_router(medications.router)
app.include_router(prescriptions.router)
app.include_router(agenda.router)
app.include_router(documents.router)
app.include_router(certificates.router)
app.include_router(external_platforms.router)
app.include_router(resident_external_events.router)
app.include_router(finance.router)
app.include_router(staff.router)
app.include_router(shifts.router)
app.include_router(attendance.router)
app.include_router(dashboard.router)
app.include_router(activity.router)
app.include_router(push.router)
app.include_router(support.router)


@app.on_event("startup")
async def startup_event():
    """Ejecutar bootstrap de usuarios de producción al iniciar la aplicación"""
    try:
        # Solo ejecutar bootstrap si hay variables de entorno definidas
        has_admin = settings.ADMIN_DNI and settings.ADMIN_PASSWORD
        has_medico = settings.MEDICO_DNI and settings.MEDICO_PASSWORD
        
        if has_admin or has_medico:
            logger.info("Bootstrap: Variables de entorno detectadas. Ejecutando bootstrap de usuarios...")
            db = SessionLocal()
            try:
                bootstrap_production_users(db)
            except Exception as e:
                logger.error(f"Bootstrap: Error al crear usuarios de producción: {e}", exc_info=True)
                # No fallar el startup si hay error en bootstrap
            finally:
                db.close()
        else:
            logger.info("Bootstrap: No hay variables de entorno de bootstrap. Saltando creación automática de usuarios.")
            logger.info("Bootstrap: Para crear usuarios, definir ADMIN_DNI/ADMIN_PASSWORD o MEDICO_DNI/MEDICO_PASSWORD")

        # Guard de schema para DBs desactualizadas (ej: Render sin correr migraciones)
        db = SessionLocal()
        try:
            db.execute(text("ALTER TABLE staff ADD COLUMN IF NOT EXISTS cuil VARCHAR(16)"))
            db.execute(text("ALTER TABLE staff ADD COLUMN IF NOT EXISTS specialty VARCHAR(128)"))
            db.execute(text("ALTER TABLE staff ADD COLUMN IF NOT EXISTS license_number VARCHAR(64)"))
            db.execute(text("ALTER TABLE staff ADD COLUMN IF NOT EXISTS end_date DATE"))
            db.execute(text("ALTER TABLE staff ADD COLUMN IF NOT EXISTS status VARCHAR(24)"))
            db.execute(text("UPDATE staff SET status = 'ACTIVE' WHERE status IS NULL"))
            db.execute(text("ALTER TABLE staff ALTER COLUMN status SET DEFAULT 'ACTIVE'"))
            db.execute(text("ALTER TABLE staff ALTER COLUMN status SET NOT NULL"))

            # Columnas de auditoría (pueden faltar en DBs sin migraciones)
            db.execute(text("ALTER TABLE staff ADD COLUMN IF NOT EXISTS created_by_user_id UUID"))
            db.execute(text("ALTER TABLE staff ADD COLUMN IF NOT EXISTS updated_by_user_id UUID"))

            db.execute(
                text(
                    """
                    CREATE TABLE IF NOT EXISTS shifts (
                        id UUID PRIMARY KEY,
                        facility_id UUID NOT NULL,
                        name VARCHAR(64) NOT NULL,
                        start_time TIME NOT NULL,
                        end_time TIME NOT NULL,
                        color VARCHAR(16),
                        is_active BOOLEAN NOT NULL DEFAULT true,
                        created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
                        updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
                    )
                    """
                )
            )
            db.execute(text("CREATE INDEX IF NOT EXISTS ix_shifts_facility_id ON shifts (facility_id)"))
            db.execute(text("CREATE INDEX IF NOT EXISTS ix_shifts_active ON shifts (is_active)"))

            db.execute(
                text(
                    """
                    CREATE TABLE IF NOT EXISTS shift_assignments (
                        id UUID PRIMARY KEY,
                        staff_id UUID NOT NULL,
                        shift_id UUID NOT NULL,
                        facility_id UUID NOT NULL,
                        date DATE NOT NULL,
                        notes VARCHAR(256),
                        created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
                        updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
                        created_by_user_id UUID
                    )
                    """
                )
            )
            db.execute(text("CREATE INDEX IF NOT EXISTS ix_shift_assignments_staff_id ON shift_assignments (staff_id)"))
            db.execute(text("CREATE INDEX IF NOT EXISTS ix_shift_assignments_shift_id ON shift_assignments (shift_id)"))
            db.execute(text("CREATE INDEX IF NOT EXISTS ix_shift_assignments_facility_id ON shift_assignments (facility_id)"))
            db.execute(text("CREATE INDEX IF NOT EXISTS ix_shift_assignments_date ON shift_assignments (date)"))
            db.execute(
                text(
                    "CREATE UNIQUE INDEX IF NOT EXISTS uix_shift_assignment_unique ON shift_assignments (staff_id, shift_id, date)"
                )
            )

            db.execute(
                text(
                    """
                    CREATE TABLE IF NOT EXISTS activity_event_saves (
                        id UUID PRIMARY KEY,
                        facility_id UUID NOT NULL,
                        user_id UUID NOT NULL,
                        activity_event_id UUID NOT NULL,
                        note TEXT,
                        created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
                        expires_at TIMESTAMP WITH TIME ZONE NOT NULL
                    )
                    """
                )
            )
            db.execute(
                text(
                    "CREATE INDEX IF NOT EXISTS ix_activity_event_saves_facility_created ON activity_event_saves (facility_id, created_at)"
                )
            )
            db.execute(
                text(
                    "CREATE INDEX IF NOT EXISTS ix_activity_event_saves_user_expires ON activity_event_saves (user_id, expires_at)"
                )
            )
            db.execute(
                text(
                    "CREATE UNIQUE INDEX IF NOT EXISTS uix_activity_event_saves_user_event ON activity_event_saves (user_id, activity_event_id)"
                )
            )

            db.execute(
                text(
                    """
                    CREATE TABLE IF NOT EXISTS push_subscriptions (
                        id UUID PRIMARY KEY,
                        user_id UUID NOT NULL,
                        facility_id UUID NOT NULL,
                        endpoint TEXT NOT NULL,
                        p256dh TEXT NOT NULL,
                        auth TEXT NOT NULL,
                        user_agent VARCHAR(512),
                        created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
                        updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
                    )
                    """
                )
            )
            db.execute(text("CREATE INDEX IF NOT EXISTS ix_push_subscriptions_user_facility ON push_subscriptions (user_id, facility_id)"))
            db.execute(text("DROP INDEX IF EXISTS uix_push_subscriptions_endpoint"))
            db.execute(text("CREATE UNIQUE INDEX IF NOT EXISTS uix_push_subscriptions_endpoint_facility ON push_subscriptions (endpoint, facility_id)"))

            db.execute(
                text(
                    """
                    CREATE TABLE IF NOT EXISTS push_preferences (
                        id UUID PRIMARY KEY,
                        user_id UUID NOT NULL,
                        facility_id UUID NOT NULL,
                        disabled_event_types JSONB NOT NULL DEFAULT '[]'::jsonb,
                        created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
                        updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
                    )
                    """
                )
            )
            db.execute(text("CREATE UNIQUE INDEX IF NOT EXISTS uix_push_preferences_user_facility ON push_preferences (user_id, facility_id)"))
            db.execute(text("CREATE INDEX IF NOT EXISTS ix_push_preferences_facility ON push_preferences (facility_id)"))
            db.commit()
        finally:
            db.close()
    except Exception as e:
        logger.error(f"Bootstrap: Error en startup event: {e}", exc_info=True)
        # No fallar el startup si hay error
