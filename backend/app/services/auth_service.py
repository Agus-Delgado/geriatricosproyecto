from sqlalchemy.orm import Session
from sqlalchemy import or_
from uuid import UUID
from app.models.auth import User
from app.models.org import FacilityUserAccess, Facility
from app.core.security import verify_password, create_access_token
from datetime import datetime, timedelta
from app.core.config import settings
from fastapi import HTTPException, status
from typing import List
import logging

logger = logging.getLogger(__name__)


def authenticate_user(db: Session, username: str, password: str) -> User:
    """Autenticar usuario por DNI o email (login único, sin facility)"""
    # Normalizar identificador: eliminar espacios al inicio y final
    identifier = (username or "").strip()
    
    if not identifier:
        logger.warning("Intento de login fallido: identificador vacío después de trim")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Credenciales inválidas"
        )
    
    # Buscar por DNI o email (usando identificador normalizado)
    user = db.query(User).filter(
        or_(
            User.dni == identifier,
            User.email == identifier
        )
    ).first()
    
    if not user:
        logger.warning(f"Intento de login fallido: usuario no encontrado (identifier: {identifier})")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Credenciales inválidas"
        )
    
    if not user.is_active:
        logger.warning(f"Intento de login fallido: usuario inactivo (user_id: {user.id}, identifier: {identifier})")
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Usuario inactivo"
        )
    
    if not verify_password(password, user.password_hash):
        logger.warning(f"Intento de login fallido: password incorrecto (user_id: {user.id}, identifier: {identifier})")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Credenciales inválidas"
        )
    
    # Actualizar last_login_at
    user.last_login_at = datetime.utcnow()
    db.commit()
    
    logger.info(f"Login exitoso: usuario {user.id} ({user.full_name}, identifier: {identifier})")
    return user


def create_user_token(
    user: User, 
    db: Session | None = None,
    impersonation_data: dict | None = None
) -> str:
    """Crear token JWT para usuario con active_facility_id.
    
    Args:
        user: Usuario para el cual crear el token
        db: Sesión de base de datos (opcional)
        impersonation_data: Dict opcional con 'actor_admin_id' y 'impersonated_user_id' para impersonación
    """
    # Si es impersonación, usar expiración corta (15 minutos)
    if impersonation_data:
        expires_delta = timedelta(minutes=15)
    else:
        expires_delta = timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    
    token_data = {
        "sub": str(user.id),
        "email": user.email or "",
        "dni": user.dni or "",
    }
    
    # Si es impersonación, agregar claims especiales
    if impersonation_data:
        token_data["is_impersonation"] = True
        token_data["actor_admin_id"] = str(impersonation_data["actor_admin_id"])
        token_data["impersonated_user_id"] = str(impersonation_data["impersonated_user_id"])
    
    # Incluir active_facility_id en el token si existe
    if user.active_facility_id:
        token_data["facility_id"] = str(user.active_facility_id)
    
    return create_access_token(data=token_data, expires_delta=expires_delta)


def create_impersonation_token(actor_admin: User, target_user: User, db: Session) -> str:
    """Crear token de impersonación para un usuario target.
    
    El token permite que el admin actúe como el usuario target.
    """
    impersonation_data = {
        "actor_admin_id": actor_admin.id,
        "impersonated_user_id": target_user.id
    }
    
    return create_user_token(
        user=target_user,
        db=db,
        impersonation_data=impersonation_data
    )


def get_user_with_relations(db: Session, user_id: UUID) -> User:
    """Obtener usuario con relaciones cargadas"""
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Usuario no encontrado"
        )
    return user


def get_user_memberships(db: Session, user_id: UUID) -> List[FacilityUserAccess]:
    """Obtener membresías activas del usuario (facility + role)"""
    return db.query(FacilityUserAccess).filter(
        FacilityUserAccess.user_id == user_id,
        FacilityUserAccess.is_active == True
    ).all()


def set_active_facility(db: Session, user_id: UUID, facility_id: UUID) -> User:
    """Establecer facility activa para el usuario. Valida membresía activa (o platform_admin)"""
    user = get_user_with_relations(db, user_id)
    
    # Platform admin puede tener cualquier facility activa (o ninguna)
    if user.is_platform_admin:
        user.active_facility_id = facility_id
        db.commit()
        return user
    
    # Verificar que el usuario tenga membresía activa para esta facility
    membership = db.query(FacilityUserAccess).filter(
        FacilityUserAccess.user_id == user_id,
        FacilityUserAccess.facility_id == facility_id,
        FacilityUserAccess.is_active == True
    ).first()
    
    if not membership:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="No tiene acceso a este geriátrico"
        )
    
    # Verificar que la facility exista
    facility = db.query(Facility).filter(Facility.id == facility_id).first()
    if not facility:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Geriátrico no encontrado"
        )
    
    user.active_facility_id = facility_id
    db.commit()
    return user
