from sqlalchemy.orm import Session
from uuid import UUID
from typing import List, Optional
from fastapi import Request
from app.models.auth import User, AdminAuditLog
from app.models.org import FacilityUserAccess
import logging

logger = logging.getLogger(__name__)


def log_admin_action(
    db: Session,
    actor_admin_id: UUID,
    action: str,
    target_user_id: Optional[UUID] = None,
    request: Optional[Request] = None
) -> AdminAuditLog:
    """Registrar acción de admin en audit log"""
    ip_address = None
    user_agent = None
    
    if request:
        # Obtener IP del cliente
        if request.client:
            ip_address = request.client.host
        # Obtener User-Agent
        user_agent = request.headers.get("User-Agent")
    
    audit_log = AdminAuditLog(
        actor_admin_id=actor_admin_id,
        target_user_id=target_user_id,
        action=action,
        ip_address=ip_address,
        user_agent=user_agent
    )
    
    db.add(audit_log)
    db.commit()
    db.refresh(audit_log)
    
    logger.info(f"Admin action logged: {action} by {actor_admin_id} on {target_user_id}")
    
    return audit_log


def get_users_list(db: Session, current_admin: User) -> List[User]:
    """Listar todos los usuarios con información relevante para admin"""
    users = db.query(User).order_by(User.created_at.desc()).all()
    return users


def can_impersonate(actor_admin: User, target_user: User) -> bool:
    """Validar que se puede impersonar al usuario target.
    
    Reglas:
    - No se puede impersonar a otro platform admin (excepto a sí mismo)
    - El usuario target debe estar activo
    """
    # Permitir impersonarse a sí mismo
    if actor_admin.id == target_user.id:
        return True
    
    # No permitir impersonar a otro platform admin
    if target_user.is_platform_admin:
        return False
    
    # El usuario debe estar activo
    if not target_user.is_active:
        return False
    
    return True


def infer_user_role(user: User, db: Session) -> Optional[str]:
    """Inferir el rol principal del usuario basado en memberships y flags"""
    if user.is_platform_admin:
        return "platform_admin"
    
    # Contar memberships por rol
    memberships = db.query(FacilityUserAccess).filter(
        FacilityUserAccess.user_id == user.id,
        FacilityUserAccess.is_active == True
    ).all()
    
    if not memberships:
        return None
    
    # Contar roles
    role_counts = {}
    for membership in memberships:
        role = membership.role
        role_counts[role] = role_counts.get(role, 0) + 1
    
    # Si tiene license_number, es médico
    if user.license_number:
        return "doctor"
    
    # Si tiene más memberships como ADMIN, es owner
    if role_counts.get("ADMIN", 0) > 0:
        return "owner"
    
    # Si tiene más memberships como MEDICO, es médico
    if role_counts.get("MEDICO", 0) > 0:
        return "doctor"
    
    # Si tiene más memberships como STAFF, es staff
    if role_counts.get("STAFF", 0) > 0:
        return "staff"
    
    return None
