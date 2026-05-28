from fastapi import APIRouter, Depends, HTTPException, status, Request
from sqlalchemy.orm import Session
from uuid import UUID

from app.db.session import get_db
from app.api.deps import get_current_user, require_facility_access
from app.models.auth import User
from app.models.org import FacilityUserAccess
from app.schemas.push import (
    PushSubscribeRequest,
    PushUnsubscribeRequest,
    PushPublicKeyResponse,
    PushGenericResponse,
    PushPreferencesResponse,
    PushPreferencesUpdateRequest,
    PushTestRequest,
    PushTestResponse,
)
from app.services.push_service import (
    get_vapid_public_key,
    upsert_subscription,
    delete_subscription,
    get_push_preferences,
    upsert_push_preferences,
    send_test_push,
)

router = APIRouter(prefix="/push", tags=["push"])


def _require_admin_or_medico(db: Session, *, user: User, facility_id: UUID) -> None:
    if user.is_platform_admin:
        return
    access = (
        db.query(FacilityUserAccess)
        .filter(
            FacilityUserAccess.facility_id == facility_id,
            FacilityUserAccess.user_id == user.id,
            FacilityUserAccess.is_active.is_(True),
        )
        .first()
    )
    if not access:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="No tiene acceso a esta sede")
    if access.role not in ("ADMIN", "MEDICO"):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Solo ADMIN y MEDICO")


@router.get("/vapid-public-key", response_model=PushPublicKeyResponse)
async def vapid_public_key():
    try:
        return PushPublicKeyResponse(public_key=get_vapid_public_key())
    except RuntimeError:
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail="Push no configurado")


@router.post("/subscribe", response_model=PushGenericResponse)
async def subscribe(
    payload: PushSubscribeRequest,
    request: Request,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    # Validar acceso al hogar
    require_facility_access(payload.facility_id)(current_user, db)

    ua = payload.user_agent or request.headers.get("user-agent")

    if not payload.endpoint or not payload.keys.p256dh or not payload.keys.auth:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="Suscripción inválida")

    upsert_subscription(
        db,
        user_id=current_user.id,
        facility_id=payload.facility_id,
        endpoint=payload.endpoint,
        p256dh=payload.keys.p256dh,
        auth=payload.keys.auth,
        user_agent=ua,
    )

    return PushGenericResponse(message="Suscripción guardada")


@router.post("/unsubscribe", response_model=PushGenericResponse)
async def unsubscribe(
    payload: PushUnsubscribeRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    require_facility_access(payload.facility_id)(current_user, db)

    deleted = delete_subscription(
        db,
        user_id=current_user.id,
        facility_id=payload.facility_id,
        endpoint=payload.endpoint,
    )

    if deleted:
        return PushGenericResponse(message="Suscripción eliminada")
    return PushGenericResponse(message="No había suscripción")


@router.get("/preferences", response_model=PushPreferencesResponse)
async def get_preferences(
    facility_id: UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    require_facility_access(facility_id)(current_user, db)
    _require_admin_or_medico(db, user=current_user, facility_id=facility_id)

    disabled = get_push_preferences(db, user_id=current_user.id, facility_id=facility_id)
    return PushPreferencesResponse(facility_id=facility_id, disabled_event_types=disabled)


@router.post("/preferences", response_model=PushPreferencesResponse)
async def update_preferences(
    payload: PushPreferencesUpdateRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    require_facility_access(payload.facility_id)(current_user, db)
    _require_admin_or_medico(db, user=current_user, facility_id=payload.facility_id)

    pref = upsert_push_preferences(
        db,
        user_id=current_user.id,
        facility_id=payload.facility_id,
        disabled_event_types=payload.disabled_event_types,
    )
    disabled = pref.disabled_event_types if isinstance(pref.disabled_event_types, list) else []
    return PushPreferencesResponse(facility_id=payload.facility_id, disabled_event_types=disabled)


@router.post("/test", response_model=PushTestResponse)
async def test_push(
    payload: PushTestRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    require_facility_access(payload.facility_id)(current_user, db)
    _require_admin_or_medico(db, user=current_user, facility_id=payload.facility_id)

    result = send_test_push(db, user_id=current_user.id, facility_id=payload.facility_id)
    return PushTestResponse(
        attempted=int(result.get("attempted", 0)),
        delivered=int(result.get("delivered", 0)),
        deleted=int(result.get("deleted", 0)),
    )
