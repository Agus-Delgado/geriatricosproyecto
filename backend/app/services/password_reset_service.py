import secrets
import hashlib
from datetime import datetime, timedelta
from typing import Optional
from uuid import UUID
from sqlalchemy.orm import Session
from app.models.auth import PasswordResetToken, User
from app.core.config import settings
import logging

logger = logging.getLogger(__name__)

# Tiempo de expiración del token (60 minutos)
PASSWORD_RESET_TOKEN_TTL_MINUTES = 60


def generate_token() -> str:
    """Generar token seguro para reset de contraseña"""
    return secrets.token_urlsafe(32)


def hash_token(token: str) -> str:
    """Hashear token usando SHA256 (hex)"""
    return hashlib.sha256(token.encode()).hexdigest()


def create_password_reset_token(db: Session, user_id: UUID) -> str:
    """
    Crear token de reset de contraseña para un usuario.
    
    Siempre crea un nuevo token (no reutiliza tokens existentes).
    
    Returns:
        Token plano (para incluir en email)
    """
    # Generar nuevo token
    token = generate_token()
    token_hash = hash_token(token)
    
    # Calcular expiración
    expires_at = datetime.utcnow() + timedelta(minutes=PASSWORD_RESET_TOKEN_TTL_MINUTES)
    
    # Crear registro en DB
    token_record = PasswordResetToken(
        user_id=user_id,
        token_hash=token_hash,
        expires_at=expires_at
    )
    
    db.add(token_record)
    db.commit()
    
    logger.info(f"Token de reset de contraseña creado para usuario {user_id}")
    
    return token


def verify_password_reset_token(db: Session, token: str) -> Optional[PasswordResetToken]:
    """
    Verificar token de reset de contraseña.
    
    Returns:
        PasswordResetToken si es válido, None si no lo es
    """
    token_hash = hash_token(token)
    now = datetime.utcnow()
    
    # Buscar token no usado y no expirado
    token_record = db.query(PasswordResetToken).filter(
        PasswordResetToken.token_hash == token_hash,
        PasswordResetToken.used_at.is_(None),
        PasswordResetToken.expires_at > now
    ).first()
    
    if not token_record:
        logger.warning(f"Token de reset de contraseña inválido o expirado")
        return None
    
    return token_record


def mark_token_as_used(db: Session, token_record: PasswordResetToken) -> None:
    """Marcar token como usado (invalidar)"""
    token_record.used_at = datetime.utcnow()
    db.commit()
    logger.info(f"Token de reset de contraseña marcado como usado: {token_record.id}")
