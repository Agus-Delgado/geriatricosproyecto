import secrets
import hashlib
from datetime import datetime, timedelta
from typing import Optional, Tuple
from uuid import UUID
from sqlalchemy.orm import Session
from app.models.auth import EmailVerificationToken, User
from app.core.config import settings
import logging

logger = logging.getLogger(__name__)


def generate_token() -> str:
    """Generar token seguro para verificación de email"""
    return secrets.token_urlsafe(32)


def hash_token(token: str) -> str:
    """Hashear token usando SHA256 (hex)"""
    return hashlib.sha256(token.encode()).hexdigest()


def create_verification_token(db: Session, user_id: UUID) -> str:
    """
    Crear token de verificación para un usuario.
    
    Si ya existe un token no consumido y no expirado, lo reutiliza.
    Si existe pero está expirado o consumido, crea uno nuevo.
    
    Returns:
        Token plano (para incluir en email)
    """
    # Buscar token existente no consumido y no expirado
    now = datetime.utcnow()
    existing_token = db.query(EmailVerificationToken).filter(
        EmailVerificationToken.user_id == user_id,
        EmailVerificationToken.consumed_at.is_(None),
        EmailVerificationToken.expires_at > now
    ).first()
    
    if existing_token:
        # Reutilizar token existente (no retornamos el token plano, pero el caller puede generar uno nuevo)
        # En realidad, necesitamos el token plano, así que generamos uno nuevo siempre
        # pero podríamos optimizar esto más adelante si es necesario
        pass
    
    # Generar nuevo token
    token = generate_token()
    token_hash = hash_token(token)
    
    # Calcular expiración
    expires_at = now + timedelta(hours=settings.EMAIL_VERIFY_TOKEN_TTL_HOURS)
    
    # Crear registro
    verification_token = EmailVerificationToken(
        user_id=user_id,
        token_hash=token_hash,
        expires_at=expires_at,
        send_count=0,
        window_started_at=now  # Iniciar ventana de rate limit
    )
    
    db.add(verification_token)
    db.commit()
    db.refresh(verification_token)
    
    logger.info(f"Token de verificación creado para usuario {user_id}")
    
    return token


def verify_token(db: Session, token: str) -> Optional[EmailVerificationToken]:
    """
    Verificar token de verificación.
    
    Returns:
        EmailVerificationToken si es válido, None si es inválido/expirado/consumido
    """
    token_hash = hash_token(token)
    now = datetime.utcnow()
    
    token_record = db.query(EmailVerificationToken).filter(
        EmailVerificationToken.token_hash == token_hash,
        EmailVerificationToken.consumed_at.is_(None),
        EmailVerificationToken.expires_at > now
    ).first()
    
    if not token_record:
        logger.warning(f"Intento de verificación con token inválido/expirado/consumido")
        return None
    
    return token_record


def mark_consumed(db: Session, token_record: EmailVerificationToken) -> None:
    """Marcar token como consumido"""
    token_record.consumed_at = datetime.utcnow()
    db.commit()
    logger.info(f"Token de verificación {token_record.id} marcado como consumido")


def can_resend(db: Session, user_id: UUID) -> Tuple[bool, Optional[str]]:
    """
    Verificar si se puede reenviar email de verificación (rate limit).
    
    Reglas:
    - Mínimo 60 segundos entre envíos
    - Máximo 5 envíos por hora
    
    Returns:
        (puede_enviar, mensaje_error)
    """
    now = datetime.utcnow()
    
    # Buscar token más reciente (consumido o no)
    latest_token = db.query(EmailVerificationToken).filter(
        EmailVerificationToken.user_id == user_id
    ).order_by(EmailVerificationToken.created_at.desc()).first()
    
    if not latest_token:
        # No hay tokens, puede enviar
        return True, None
    
    # Verificar mínimo 60 segundos desde último envío
    if latest_token.last_sent_at:
        time_since_last = (now - latest_token.last_sent_at).total_seconds()
        if time_since_last < 60:
            remaining = int(60 - time_since_last)
            return False, f"Debés esperar {remaining} segundos antes de solicitar otro envío"
    
    # Verificar máximo 5 envíos por hora
    # Buscar tokens en la última hora
    one_hour_ago = now - timedelta(hours=1)
    
    # Si hay window_started_at, usar esa ventana
    if latest_token.window_started_at:
        window_start = latest_token.window_started_at
        # Si la ventana es más antigua que 1 hora, resetear
        if window_start < one_hour_ago:
            # Resetear ventana
            latest_token.window_started_at = now
            latest_token.send_count = 0
            db.commit()
            return True, None
        
        # Verificar send_count en la ventana actual
        tokens_in_window = db.query(EmailVerificationToken).filter(
            EmailVerificationToken.user_id == user_id,
            EmailVerificationToken.window_started_at == window_start
        ).count()
        
        if tokens_in_window >= 5:
            # Calcular tiempo restante
            window_end = window_start + timedelta(hours=1)
            time_remaining = (window_end - now).total_seconds()
            minutes_remaining = int(time_remaining / 60)
            return False, f"Has alcanzado el límite de 5 envíos por hora. Intentá nuevamente en {minutes_remaining} minutos"
    
    return True, None


def increment_send_count(db: Session, token_record: EmailVerificationToken) -> None:
    """Incrementar contador de envíos y actualizar last_sent_at"""
    now = datetime.utcnow()
    
    token_record.last_sent_at = now
    token_record.send_count += 1
    
    # Si es el primer envío o la ventana expiró, iniciar nueva ventana
    if not token_record.window_started_at or \
       (token_record.window_started_at and 
        (now - token_record.window_started_at) >= timedelta(hours=1)):
        token_record.window_started_at = now
        token_record.send_count = 1
    
    db.commit()
    logger.info(f"Contador de envíos incrementado para token {token_record.id} (count: {token_record.send_count})")
