from fastapi import APIRouter, Depends, HTTPException, status, Request
from slowapi import Limiter
from slowapi.util import get_remote_address
from sqlalchemy.orm import Session
from sqlalchemy import or_
from sqlalchemy.exc import IntegrityError
from pydantic import ValidationError
from app.db.session import get_db
from app.api.deps import get_current_user
from app.schemas.auth import (
    LoginRequest, TokenResponse, UserResponse, RoleResponse, FacilityMembershipResponse, 
    SetActiveFacilityRequest, RegisterRequest, RegisterResponse, VerifyEmailRequest, 
    VerifyEmailResponse, ResendVerificationRequest, ResendVerificationResponse,
    UpdateProfileRequest, PasswordResetRequest, PasswordResetConfirm
)
from app.services.auth_service import authenticate_user, create_user_token, get_user_memberships
from app.models.auth import User, UserRoleAssignment, UserRole, EmailVerificationToken
from app.models.org import Facility
from app.core.security import get_password_hash, verify_password
from app.core.config import settings
from app.services.email_service import send_email, render_verification_email
from app.services.email_verification_service import (
    create_verification_token, verify_token, mark_consumed, 
    can_resend, increment_send_count
)
from uuid import UUID
import logging

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/auth", tags=["auth"])
limiter = Limiter(key_func=get_remote_address)


@router.post("/login", response_model=TokenResponse)
@limiter.limit("5/minute")
async def login(
    request: Request,
    login_data: LoginRequest,
    db: Session = Depends(get_db)
):
    """Login por DNI o email + password (rate limited: 5 intentos por minuto)
    
    Login único sin selección de facility. El frontend debe llamar /auth/me después
    para obtener memberships y active_facility_id.
    """
    user = authenticate_user(
        db, 
        login_data.username, 
        login_data.password
    )
    token = create_user_token(user, db)
    return TokenResponse(access_token=token)


@router.get("/me", response_model=UserResponse)
async def get_current_user_info(
    request: Request,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Obtener información del usuario actual con roles y memberships.
    
    Devuelve 401 si no hay token o es inválido, 403 si usuario inactivo (nunca 500).
    """
    try:
        # Obtener roles (globales, legacy)
        try:
            role_assignments = db.query(UserRoleAssignment).join(UserRole).filter(
                UserRoleAssignment.user_id == current_user.id
            ).all()
            
            roles = [
                RoleResponse(
                    id=ra.role.id,
                    code=ra.role.code,
                    name=ra.role.name
                )
                for ra in role_assignments
            ]
        except Exception as e:
            logger.warning(f"/auth/me: Error al obtener roles para usuario {current_user.id}: {type(e).__name__}", exc_info=False)
            roles = []  # Continuar sin roles si hay error
        
        # Obtener memberships (facility + role)
        try:
            memberships_data = get_user_memberships(db, current_user.id)
            
            memberships = []
            for membership in memberships_data:
                try:
                    facility = db.query(Facility).filter(Facility.id == membership.facility_id).first()
                    if facility:
                        memberships.append(
                            FacilityMembershipResponse(
                                id=membership.id,
                                facility_id=facility.id,
                                facility_name=facility.name,
                                facility_code=facility.code,
                                role=membership.role,
                                is_active=membership.is_active
                            )
                        )
                except Exception as e:
                    logger.warning(f"/auth/me: Error al obtener facility {membership.facility_id}: {type(e).__name__}", exc_info=False)
                    # Continuar sin esta membership si hay error
                    continue
        except Exception as e:
            logger.warning(f"/auth/me: Error al obtener memberships para usuario {current_user.id}: {type(e).__name__}", exc_info=False)
            memberships = []  # Continuar sin memberships si hay error
        
        return UserResponse(
            id=current_user.id,
            email=current_user.email,
            dni=current_user.dni,
            phone=current_user.phone,
            full_name=current_user.full_name,
            license_number=current_user.license_number,  # Puede ser None para owners/platform admins
            is_active=current_user.is_active,
            is_verified=current_user.is_verified,
            is_platform_admin=current_user.is_platform_admin,
            active_facility_id=current_user.active_facility_id,
            last_login_at=current_user.last_login_at,
            roles=roles,
            memberships=memberships
        )
    except HTTPException:
        # Re-raise HTTPException (ya es 401/403 de get_current_user)
        raise
    except ValidationError as e:
        # ValidationError de Pydantic (schema) -> 500 con log, NO 401
        logger.exception(f"/auth/me: ValidationError al construir UserResponse para usuario {current_user.id if current_user else 'unknown'}: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Error interno al procesar datos del usuario"
        )
    except Exception as e:
        # Cualquier otro error inesperado -> 500 con log (no 401)
        logger.exception(f"/auth/me: Error inesperado al obtener información del usuario {current_user.id if current_user else 'unknown'}: {type(e).__name__}: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Error interno al obtener información del usuario"
        )


@router.post("/active-facility")
async def set_active_facility_endpoint(
    request_data: SetActiveFacilityRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Establecer facility activa para el usuario actual"""
    from app.services.auth_service import set_active_facility
    
    user = set_active_facility(db, current_user.id, request_data.facility_id)
    return {"active_facility_id": str(user.active_facility_id)}


@router.put("/me", response_model=UserResponse)
async def update_profile(
    profile_data: UpdateProfileRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Actualizar perfil del usuario actual (nombre, apellido, email, DNI)"""
    from sqlalchemy.exc import IntegrityError
    
    # Actualizar full_name si se proporciona first_name o last_name
    if profile_data.first_name is not None or profile_data.last_name is not None:
        # Obtener nombre actual y separarlo
        current_name_parts = (current_user.full_name or "").split(" ", 1)
        current_first = current_name_parts[0] if current_name_parts else ""
        current_last = current_name_parts[1] if len(current_name_parts) > 1 else ""
        
        # Usar valores nuevos o mantener los actuales
        new_first = profile_data.first_name if profile_data.first_name is not None else current_first
        new_last = profile_data.last_name if profile_data.last_name is not None else current_last
        
        # Construir full_name
        if new_first and new_last:
            current_user.full_name = f"{new_first} {new_last}"
        elif new_first:
            current_user.full_name = new_first
        elif new_last:
            current_user.full_name = new_last
    
    # Actualizar email si se proporciona
    if profile_data.email is not None:
        email_normalized = profile_data.email.strip().lower()
        
        # Validar que el email no esté en uso por otro usuario
        existing_user = db.query(User).filter(
            User.email == email_normalized,
            User.id != current_user.id
        ).first()
        
        if existing_user:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="Email ya registrado"
            )
        
        current_user.email = email_normalized
    
    # Actualizar DNI si se proporciona y es diferente al actual
    if profile_data.dni is not None:
        dni_normalized = profile_data.dni.strip()
        current_dni = (current_user.dni or "").strip()
        
        if dni_normalized != current_dni:
            # Validar que se proporcionó contraseña actual
            if not profile_data.current_password:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Se requiere contraseña actual para cambiar el DNI"
                )
            
            # Verificar contraseña actual
            if not verify_password(profile_data.current_password, current_user.password_hash):
                raise HTTPException(
                    status_code=status.HTTP_401_UNAUTHORIZED,
                    detail="Contraseña actual incorrecta"
                )
            
            # Validar formato DNI (solo dígitos, longitud razonable)
            if not dni_normalized or len(dni_normalized) < 7 or len(dni_normalized) > 16:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="DNI inválido (debe tener entre 7 y 16 caracteres)"
                )
            
            if not dni_normalized.isdigit():
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="DNI debe contener solo números"
                )
            
            # Validar unicidad
            existing_user = db.query(User).filter(
                User.dni == dni_normalized,
                User.id != current_user.id
            ).first()
            
            if existing_user:
                raise HTTPException(
                    status_code=status.HTTP_409_CONFLICT,
                    detail="DNI ya registrado"
                )
            
            current_user.dni = dni_normalized
    
    # Intentar guardar cambios
    try:
        db.commit()
        db.refresh(current_user)
    except IntegrityError as e:
        db.rollback()
        error_msg = str(e.orig) if hasattr(e, 'orig') else str(e)
        if 'email' in error_msg.lower() or 'ix_users_email' in error_msg.lower():
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="Email ya registrado"
            )
        elif 'dni' in error_msg.lower() or 'ix_users_dni' in error_msg.lower():
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="DNI ya registrado"
            )
        logger.error(f"Error de integridad al actualizar perfil: {error_msg}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Error al actualizar perfil"
        )
    
    # Construir respuesta igual que GET /auth/me
    try:
        role_assignments = db.query(UserRoleAssignment).join(UserRole).filter(
            UserRoleAssignment.user_id == current_user.id
        ).all()
        
        roles = [
            RoleResponse(
                id=ra.role.id,
                code=ra.role.code,
                name=ra.role.name
            )
            for ra in role_assignments
        ]
    except Exception as e:
        logger.warning(f"/auth/me PUT: Error al obtener roles: {type(e).__name__}", exc_info=False)
        roles = []
    
    try:
        memberships_data = get_user_memberships(db, current_user.id)
        memberships = []
        for membership in memberships_data:
            try:
                facility = db.query(Facility).filter(Facility.id == membership.facility_id).first()
                if facility:
                    memberships.append(
                        FacilityMembershipResponse(
                            id=membership.id,
                            facility_id=facility.id,
                            facility_name=facility.name,
                            facility_code=facility.code,
                            role=membership.role,
                            is_active=membership.is_active
                        )
                    )
            except Exception as e:
                logger.warning(f"/auth/me PUT: Error al obtener facility {membership.facility_id}: {type(e).__name__}", exc_info=False)
                continue
    except Exception as e:
        logger.warning(f"/auth/me PUT: Error al obtener memberships: {type(e).__name__}", exc_info=False)
        memberships = []
    
    return UserResponse(
        id=current_user.id,
        email=current_user.email,
        dni=current_user.dni,
        phone=current_user.phone,
        full_name=current_user.full_name,
        license_number=current_user.license_number,
        is_active=current_user.is_active,
        is_verified=current_user.is_verified,
        is_platform_admin=current_user.is_platform_admin,
        active_facility_id=current_user.active_facility_id,
        last_login_at=current_user.last_login_at,
        roles=roles,
        memberships=memberships
    )


@router.post("/register", response_model=RegisterResponse, status_code=status.HTTP_201_CREATED)
async def register(
    request: Request,
    register_data: RegisterRequest,
    db: Session = Depends(get_db)
):
    """Registrar nuevo usuario. Se envía email de verificación."""
    raise HTTPException(
        status_code=status.HTTP_403_FORBIDDEN,
        detail="Registro deshabilitado. El acceso es gestionado por administradores."
    )
    # Normalizar datos antes de validar
    dni_normalized = register_data.dni.strip() if register_data.dni else None
    email_normalized = register_data.email.strip().lower() if register_data.email else None
    license_number_normalized = None
    if register_data.role == "doctor" and register_data.license_number:
        license_number_normalized = register_data.license_number.strip()
    
    # Validar license_number para médicos (ya validado en schema, pero por si acaso)
    if register_data.role == "doctor" and not license_number_normalized:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="La matrícula es obligatoria para médicos"
        )
    
    # Validar DNI único (con datos normalizados)
    if dni_normalized:
        existing_user_dni = db.query(User).filter(User.dni == dni_normalized).first()
        if existing_user_dni:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="DNI ya registrado"
            )
    
    # Validar email único (con datos normalizados)
    if email_normalized:
        existing_user_email = db.query(User).filter(User.email == email_normalized).first()
        if existing_user_email:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="Email ya registrado"
            )
    
    # Validar license_number único para médicos (con datos normalizados)
    if register_data.role == "doctor" and license_number_normalized:
        existing_license = db.query(User).filter(User.license_number == license_number_normalized).first()
        if existing_license:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="Matrícula ya registrada"
            )
    
    # Crear usuario
    full_name = f"{register_data.first_name} {register_data.last_name}"
    password_hash = get_password_hash(register_data.password)
    
    user = User(
        dni=dni_normalized,
        email=email_normalized,
        phone=register_data.phone.strip() if register_data.phone else None,
        full_name=full_name,
        birth_date=register_data.birth_date,
        license_number=license_number_normalized,
        password_hash=password_hash,
        is_active=True,
        is_verified=False,  # Requiere verificación
        is_platform_admin=(register_data.role == "owner")
    )
    
    db.add(user)
    
    # Intentar commit y manejar IntegrityError (por si hay race condition)
    try:
        db.commit()
        db.refresh(user)
    except IntegrityError as e:
        db.rollback()
        error_msg = str(e.orig) if hasattr(e, 'orig') else str(e)
        
        # Detectar qué constraint falló
        if 'dni' in error_msg.lower() or 'ix_users_dni' in error_msg.lower():
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="DNI ya registrado"
            )
        elif 'email' in error_msg.lower() or 'ix_users_email' in error_msg.lower():
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="Email ya registrado"
            )
        elif 'license_number' in error_msg.lower() or 'ix_users_license_number' in error_msg.lower():
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="Matrícula ya registrada"
            )
        else:
            # Error genérico de unicidad
            logger.error(f"IntegrityError en registro: {error_msg}")
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="Ya existe un usuario con estos datos"
            )
    
    logger.info(f"Usuario registrado: {user.id} ({full_name}, {register_data.email})")
    
    # Generar token de verificación
    token = create_verification_token(db, user.id)
    
    # Construir URL de verificación
    verify_url = f"{settings.FRONTEND_URL}/verify-email?token={token}"
    
    # Generar plantilla de email
    text_body, html_body = render_verification_email(verify_url)
    
    # Enviar email
    try:
        send_email(
            to=register_data.email,
            subject="Verificá tu email",
            text_body=text_body,
            html_body=html_body
        )
        logger.info(f"Email de verificación enviado a {register_data.email}")
    except Exception as e:
        logger.error(f"Error al enviar email de verificación a {register_data.email}: {str(e)}")
        # No fallar el registro si falla el email (el usuario puede solicitar reenvío)
    
    return RegisterResponse(message="Usuario registrado. Revisá tu email para verificar tu cuenta.")


@router.post("/verify-email", response_model=VerifyEmailResponse)
async def verify_email(
    request: Request,
    verify_data: VerifyEmailRequest,
    db: Session = Depends(get_db)
):
    """Verificar email usando token"""
    token_record = verify_token(db, verify_data.token)
    
    if not token_record:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Enlace inválido o expirado"
        )
    
    # Marcar usuario como verificado
    user = db.query(User).filter(User.id == token_record.user_id).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Usuario no encontrado"
        )
    
    user.is_verified = True
    mark_consumed(db, token_record)
    db.commit()  # Asegurar que los cambios se persistan
    
    logger.info(f"Email verificado para usuario {user.id} ({user.email})")
    
    return VerifyEmailResponse(message="Email verificado. Ya podés ingresar.")


@router.post("/resend-verification", response_model=ResendVerificationResponse)
async def resend_verification(
    request: Request,
    resend_data: ResendVerificationRequest,
    db: Session = Depends(get_db)
):
    """Reenviar email de verificación"""
    # Normalizar identificador
    identifier = (resend_data.email_or_dni or "").strip()
    
    if not identifier:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email o DNI requerido"
        )
    
    # Buscar usuario por DNI o email
    user = db.query(User).filter(
        or_(
            User.dni == identifier,
            User.email == identifier
        )
    ).first()
    
    if not user:
        # Por seguridad, no revelar si el usuario existe o no
        return ResendVerificationResponse(
            message="Si el email existe y no está verificado, se enviará un nuevo enlace."
        )
    
    # Si ya está verificado
    if user.is_verified:
        return ResendVerificationResponse(
            message="Tu email ya está verificado. Podés iniciar sesión."
        )
    
    # Verificar rate limit
    can_send, error_message = can_resend(db, user.id)
    if not can_send:
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail=error_message
        )
    
    # Generar token (siempre crea uno nuevo, el servicio maneja la lógica)
    token = create_verification_token(db, user.id)
    
    # Obtener el registro del token recién creado para incrementar contador
    from datetime import datetime
    now = datetime.utcnow()
    token_record = db.query(EmailVerificationToken).filter(
        EmailVerificationToken.user_id == user.id
    ).order_by(EmailVerificationToken.created_at.desc()).first()
    
    if token_record:
        increment_send_count(db, token_record)
    
    # Construir URL de verificación
    verify_url = f"{settings.FRONTEND_URL}/verify-email?token={token}"
    
    # Generar plantilla de email
    text_body, html_body = render_verification_email(verify_url)
    
    # Enviar email
    try:
        send_email(
            to=user.email,
            subject="Verificá tu email",
            text_body=text_body,
            html_body=html_body
        )
        logger.info(f"Email de verificación reenviado a {user.email}")
    except Exception as e:
        logger.error(f"Error al reenviar email de verificación a {user.email}: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Error al enviar email. Intentá nuevamente más tarde."
        )
    
    return ResendVerificationResponse(
        message="Email de verificación enviado. Revisá tu bandeja de entrada (y Spam/Promociones)."
    )


@router.post("/password-reset/request", status_code=status.HTTP_200_OK)
async def request_password_reset(
    request: Request,
    reset_data: PasswordResetRequest,
    db: Session = Depends(get_db)
):
    """
    Solicitar reset de contraseña por email.
    
    Siempre responde 200 OK con mensaje genérico (no revela si el usuario existe).
    Si el usuario existe y tiene email, se genera token y se envía email.
    """
    from app.services.password_reset_service import create_password_reset_token
    from app.services.email_service import send_email, render_password_reset_email
    from sqlalchemy import or_
    
    # Normalizar email
    email_normalized = reset_data.email.strip().lower()
    
    # Buscar usuario por email
    user = db.query(User).filter(User.email == email_normalized).first()
    
    # Siempre responder 200 OK con mensaje genérico (por seguridad)
    generic_message = "Si el email es válido, te enviaremos un enlace para restablecer tu contraseña."
    
    # Si el usuario existe y tiene email, generar token y enviar email
    if user and user.email:
        try:
            # Generar token
            token = create_password_reset_token(db, user.id)
            
            # Construir URL de reset
            reset_url = f"{settings.FRONTEND_URL}/reset-password?token={token}"
            
            # Generar plantilla de email
            text_body, html_body = render_password_reset_email(
                reset_url=reset_url,
                user_name=user.full_name or "Usuario",
                expiry_minutes=60
            )
            
            # Enviar email
            send_email(
                to=user.email,
                subject="Restablecimiento de contraseña – Plataforma Geriátricos",
                text_body=text_body,
                html_body=html_body
            )
            logger.info(f"Email de reset de contraseña enviado a {user.email}")
        except Exception as e:
            logger.error(f"Error al enviar email de reset de contraseña a {user.email}: {str(e)}")
            # No fallar el endpoint, solo loguear el error
    
    return {"message": generic_message}


@router.post("/password-reset/confirm", status_code=status.HTTP_200_OK)
async def confirm_password_reset(
    request: Request,
    confirm_data: PasswordResetConfirm,
    db: Session = Depends(get_db)
):
    """
    Confirmar reset de contraseña usando token.
    
    Valida token, expiración y cambia la contraseña del usuario.
    """
    from app.services.password_reset_service import verify_password_reset_token, mark_token_as_used
    from app.core.security import get_password_hash
    
    # Verificar token
    token_record = verify_password_reset_token(db, confirm_data.token)
    
    if not token_record:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Token inválido o expirado"
        )
    
    # Obtener usuario
    user = db.query(User).filter(User.id == token_record.user_id).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Usuario no encontrado"
        )
    
    # Cambiar contraseña
    user.password_hash = get_password_hash(confirm_data.new_password)
    
    # Marcar token como usado
    mark_token_as_used(db, token_record)
    
    # Commit cambios
    db.commit()
    
    logger.info(f"Contraseña restablecida para usuario {user.id} ({user.email})")
    
    return {"message": "Contraseña restablecida correctamente. Ya podés iniciar sesión."}
