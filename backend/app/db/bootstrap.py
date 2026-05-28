"""
Bootstrap de usuarios para producción.
Crea usuarios iniciales basándose en variables de entorno.
Idempotente: no duplica usuarios si ya existen.
"""
from sqlalchemy.orm import Session
from sqlalchemy import or_
from app.models.auth import User
from app.models.org import OwnerGroup, Facility, FacilityUserAccess
from app.core.security import get_password_hash
from app.core.config import settings
import uuid
import logging

logger = logging.getLogger(__name__)


def bootstrap_production_users(db: Session) -> None:
    """
    Crear usuarios de producción basándose en variables de entorno.
    Solo crea si las variables están definidas.
    Idempotente: no duplica si ya existen.
    """
    # Verificar si hay variables de bootstrap definidas
    has_admin_config = settings.ADMIN_DNI and settings.ADMIN_PASSWORD
    has_medico_config = settings.MEDICO_DNI and settings.MEDICO_PASSWORD
    
    if not has_admin_config and not has_medico_config:
        logger.info("Bootstrap: No hay variables de entorno de bootstrap definidas. Saltando creación de usuarios.")
        return
    
    logger.info("Bootstrap: Iniciando creación de usuarios de producción...")
    
    # Obtener o crear OwnerGroup
    owner_group = db.query(OwnerGroup).filter(OwnerGroup.name == "Grupo Geriátricos").first()
    if not owner_group:
        owner_group = OwnerGroup(
            id=uuid.uuid4(),
            name="Grupo Geriátricos"
        )
        db.add(owner_group)
        db.flush()
        logger.info("Bootstrap: OwnerGroup 'Grupo Geriátricos' creado")
    
    # Obtener facilities (necesarias para membresías)
    facilities = {}
    facility_codes = ["NSL", "ET", "EA"]
    for code in facility_codes:
        facility = db.query(Facility).filter(Facility.code == code).first()
        if facility:
            facilities[code] = facility
    
    # Crear Admin si está configurado
    if has_admin_config:
        admin_dni = settings.ADMIN_DNI
        admin_password = settings.ADMIN_PASSWORD
        admin_email = settings.ADMIN_EMAIL
        admin_full_name = settings.ADMIN_FULL_NAME
        
        # Buscar usuario existente por DNI o email
        user = db.query(User).filter(
            or_(
                User.dni == admin_dni,
                User.email == admin_email if admin_email else False
            )
        ).first()
        
        if not user:
            # Crear nuevo usuario admin
            user = User(
                id=uuid.uuid4(),
                dni=admin_dni,
                email=admin_email,
                full_name=admin_full_name,
                password_hash=get_password_hash(admin_password),
                is_active=True,
                is_verified=True,
                is_platform_admin=True
            )
            db.add(user)
            db.flush()
            logger.info(f"Bootstrap: Usuario admin creado (DNI: {admin_dni}, email: {admin_email})")
        else:
            # Actualizar si es necesario
            updated = False
            if not user.dni:
                user.dni = admin_dni
                updated = True
            if admin_email and user.email != admin_email:
                # Verificar que el email no esté en uso
                existing = db.query(User).filter(
                    User.email == admin_email,
                    User.id != user.id
                ).first()
                if not existing:
                    user.email = admin_email
                    updated = True
            if user.full_name != admin_full_name:
                user.full_name = admin_full_name
                updated = True
            if not user.is_platform_admin:
                user.is_platform_admin = True
                updated = True
            if not user.is_verified:
                user.is_verified = True
                updated = True
            if not user.is_active:
                user.is_active = True
                updated = True
            # Actualizar password si está configurado (útil para reset)
            if admin_password:
                user.password_hash = get_password_hash(admin_password)
                updated = True
            
            if updated:
                db.flush()
                logger.info(f"Bootstrap: Usuario admin actualizado (DNI: {admin_dni})")
            else:
                logger.info(f"Bootstrap: Usuario admin ya existe (DNI: {admin_dni})")
    
    # Crear Médico si está configurado
    if has_medico_config:
        medico_dni = settings.MEDICO_DNI
        medico_password = settings.MEDICO_PASSWORD
        medico_email = settings.MEDICO_EMAIL
        medico_full_name = settings.MEDICO_FULL_NAME
        
        # Buscar usuario existente por DNI o email
        user = db.query(User).filter(
            or_(
                User.dni == medico_dni,
                User.email == medico_email if medico_email else False
            )
        ).first()
        
        if not user:
            # Crear nuevo usuario médico
            user = User(
                id=uuid.uuid4(),
                dni=medico_dni,
                email=medico_email,
                full_name=medico_full_name,
                password_hash=get_password_hash(medico_password),
                is_active=True,
                is_verified=True,
                is_platform_admin=False
            )
            db.add(user)
            db.flush()
            logger.info(f"Bootstrap: Usuario médico creado (DNI: {medico_dni}, email: {medico_email})")
            
            # Crear membresías para todas las facilities disponibles
            for code, facility in facilities.items():
                access = FacilityUserAccess(
                    id=uuid.uuid4(),
                    facility_id=facility.id,
                    user_id=user.id,
                    role="MEDICO",
                    is_active=True
                )
                db.add(access)
                logger.info(f"Bootstrap: Membresía MEDICO creada para {code}")
        else:
            # Actualizar si es necesario
            updated = False
            if not user.dni:
                user.dni = medico_dni
                updated = True
            if medico_email and user.email != medico_email:
                # Verificar que el email no esté en uso
                existing = db.query(User).filter(
                    User.email == medico_email,
                    User.id != user.id
                ).first()
                if not existing:
                    user.email = medico_email
                    updated = True
            if user.full_name != medico_full_name:
                user.full_name = medico_full_name
                updated = True
            # Actualizar password si está configurado
            if medico_password:
                user.password_hash = get_password_hash(medico_password)
                updated = True
            
            if updated:
                db.flush()
                logger.info(f"Bootstrap: Usuario médico actualizado (DNI: {medico_dni})")
            else:
                logger.info(f"Bootstrap: Usuario médico ya existe (DNI: {medico_dni})")
            
            # Asegurar membresías MEDICO en todas las facilities
            for code, facility in facilities.items():
                access = db.query(FacilityUserAccess).filter(
                    FacilityUserAccess.facility_id == facility.id,
                    FacilityUserAccess.user_id == user.id
                ).first()
                
                if not access:
                    access = FacilityUserAccess(
                        id=uuid.uuid4(),
                        facility_id=facility.id,
                        user_id=user.id,
                        role="MEDICO",
                        is_active=True
                    )
                    db.add(access)
                    logger.info(f"Bootstrap: Membresía MEDICO creada para {code}")
                elif access.role != "MEDICO" or not access.is_active:
                    access.role = "MEDICO"
                    access.is_active = True
                    db.flush()
                    logger.info(f"Bootstrap: Membresía MEDICO actualizada para {code}")
    
    db.commit()
    logger.info("Bootstrap: Proceso completado exitosamente")
