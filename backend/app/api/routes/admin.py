from fastapi import APIRouter, Depends, HTTPException, status, Request
from sqlalchemy.orm import Session
from uuid import UUID
from app.db.session import get_db
from app.api.deps import get_current_user, require_platform_admin, get_impersonation_context
from app.schemas.auth import (
    ImpersonateRequest, ImpersonateResponse, AdminUsersListResponse, 
    AdminUserListItem, UpdateUserStatusRequest
)
from app.models.auth import User
from app.services.admin_service import (
    log_admin_action, get_users_list, can_impersonate, infer_user_role
)
from app.services.auth_service import create_impersonation_token
from app.models.org import FacilityUserAccess
import logging

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/admin", tags=["admin"])


@router.get("/users", response_model=AdminUsersListResponse)
async def list_users(
    current_user: User = Depends(require_platform_admin),
    db: Session = Depends(get_db)
):
    """Listar todos los usuarios (solo platform admin)"""
    users = get_users_list(db, current_user)
    
    user_items = []
    for user in users:
        # Inferir rol
        role_inferred = infer_user_role(user, db)
        
        # Contar memberships activas
        memberships_count = db.query(FacilityUserAccess).filter(
            FacilityUserAccess.user_id == user.id,
            FacilityUserAccess.is_active == True
        ).count()
        
        user_items.append(
            AdminUserListItem(
                id=user.id,
                dni=user.dni,
                email=user.email,
                full_name=user.full_name,
                license_number=user.license_number,
                is_active=user.is_active,
                is_verified=user.is_verified,
                role_inferred=role_inferred,
                memberships_count=memberships_count
            )
        )
    
    return AdminUsersListResponse(users=user_items)


@router.post("/impersonate", response_model=ImpersonateResponse)
async def impersonate_user(
    request: Request,
    impersonate_data: ImpersonateRequest,
    current_user: User = Depends(require_platform_admin),
    db: Session = Depends(get_db)
):
    """Iniciar impersonación de un usuario (solo platform admin)"""
    # Obtener usuario target
    target_user = db.query(User).filter(User.id == impersonate_data.user_id).first()
    if not target_user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Usuario no encontrado"
        )
    
    # Validar que se puede impersonar
    if not can_impersonate(current_user, target_user):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="No se puede impersonar a este usuario"
        )
    
    # Crear token de impersonación
    impersonation_token = create_impersonation_token(current_user, target_user, db)
    
    # Registrar en audit log
    log_admin_action(
        db=db,
        actor_admin_id=current_user.id,
        action="IMPERSONATE_START",
        target_user_id=target_user.id,
        request=request
    )
    
    logger.info(f"Impersonation started: admin {current_user.id} impersonating user {target_user.id}")
    
    return ImpersonateResponse(
        impersonation_token=impersonation_token,
        expires_in=900  # 15 minutos en segundos
    )


@router.post("/impersonate/stop")
async def stop_impersonation(
    request: Request,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Detener impersonación (opcional, el token expira solo)"""
    impersonation_context = get_impersonation_context(request)
    
    if not impersonation_context or not impersonation_context.get("is_impersonation"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No hay una sesión de impersonación activa"
        )
    
    actor_admin_id = impersonation_context.get("actor_admin_id")
    if actor_admin_id:
        # Registrar en audit log
        log_admin_action(
            db=db,
            actor_admin_id=UUID(actor_admin_id),
            action="IMPERSONATE_STOP",
            target_user_id=current_user.id,
            request=request
        )
    
    logger.info(f"Impersonation stopped: admin {actor_admin_id} stopped impersonating user {current_user.id}")
    
    return {"message": "Impersonación detenida"}


@router.patch("/users/{user_id}/status")
async def update_user_status(
    user_id: UUID,
    status_data: UpdateUserStatusRequest,
    request: Request,
    current_user: User = Depends(require_platform_admin),
    db: Session = Depends(get_db)
):
    """Actualizar estado de usuario (is_active, is_verified)"""
    target_user = db.query(User).filter(User.id == user_id).first()
    if not target_user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Usuario no encontrado"
        )
    
    # No permitir desactivar a otro platform admin
    if target_user.is_platform_admin and target_user.id != current_user.id:
        if status_data.is_active is False:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="No se puede desactivar a otro administrador de plataforma"
            )
    
    # Actualizar campos
    action_parts = []
    if status_data.is_active is not None:
        old_value = target_user.is_active
        target_user.is_active = status_data.is_active
        action_parts.append(f"is_active: {old_value} -> {status_data.is_active}")
    
    if status_data.is_verified is not None:
        old_value = target_user.is_verified
        target_user.is_verified = status_data.is_verified
        action_parts.append(f"is_verified: {old_value} -> {status_data.is_verified}")
    
    if not action_parts:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Debe proporcionar al menos un campo para actualizar"
        )
    
    db.commit()
    db.refresh(target_user)
    
    # Registrar en audit log
    action = f"USER_STATUS_UPDATE: {', '.join(action_parts)}"
    log_admin_action(
        db=db,
        actor_admin_id=current_user.id,
        action=action,
        target_user_id=target_user.id,
        request=request
    )
    
    logger.info(f"User status updated: {action} by admin {current_user.id} on user {target_user.id}")
    
    return {
        "message": "Estado actualizado",
        "user": {
            "id": str(target_user.id),
            "is_active": target_user.is_active,
            "is_verified": target_user.is_verified
        }
    }
