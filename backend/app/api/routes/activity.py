from fastapi import APIRouter, Depends, Query, HTTPException, status
from sqlalchemy.orm import Session
from typing import List, Optional
from uuid import UUID
from datetime import datetime
from app.db.session import get_db
from app.api.deps import get_current_user, require_facility_access, require_facility_role_any
from app.schemas.activity import (
    ActivityEventResponse,
    SaveActivityEventRequest,
    SaveActivityEventResponse,
    UnsaveActivityEventResponse,
)
from app.services.activity_service import (
    list_events,
    get_active_saves_for_events,
    save_activity_event,
    unsave_activity_event,
    list_saved_events,
    cleanup_old_activity,
)
from app.models.auth import User
from app.models.auth import UserRoleAssignment, UserRole


router = APIRouter(prefix="/activity", tags=["activity"])


_NON_OWNER_ALLOWED_EVENT_TYPES = {
    "PATIENT_CREATED",
    "PATIENT_UPDATED",
    "PATIENT_DELETED",
    "PATIENT_STATUS_CHANGED",
    "MEDICATION_CHANGED",
}


def _is_owner(current_user: User, db: Session) -> bool:
    is_global_owner = (
        db.query(UserRoleAssignment)
        .join(UserRole)
        .filter(
            UserRoleAssignment.user_id == current_user.id,
            UserRole.code == "OWNER",
        )
        .first()
        is not None
    )
    return current_user.is_platform_admin or is_global_owner


def _require_can_use_activity_feed(current_user: User, db: Session, facility_id: UUID) -> None:
    require_facility_access(facility_id)(current_user, db)
    if _is_owner(current_user, db):
        return
    require_facility_role_any(["MEDICO", "ADMIN"])(current_user, db)


@router.get("", response_model=List[ActivityEventResponse])
async def get_activity(
    facility_id: UUID = Query(..., description="ID de la sede"),
    since: Optional[datetime] = Query(None),
    limit: int = Query(50, ge=1, le=200),
    event_types: Optional[List[str]] = Query(None),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Obtener eventos de actividad recientes.

    Permisos:
    - OWNER ve todos los eventos de la sede.
    - MEDICO/ADMIN ven eventos clínicos y de pacientes.
    - STAFF no accede.
    """
    _require_can_use_activity_feed(current_user, db, facility_id)

    is_owner = _is_owner(current_user, db)
    if not is_owner:
        # Requerir rol MEDICO o ADMIN para ver feed clínico
        # Limitar event_types si no se enviaron: solo clínicos/pacientes
        if not event_types:
            event_types = list(_NON_OWNER_ALLOWED_EVENT_TYPES)
        else:
            event_types = [t for t in event_types if t in _NON_OWNER_ALLOWED_EVENT_TYPES]

    now = datetime.utcnow()
    try:
        cleanup_old_activity(db, facility_id=facility_id, keep_days=30, now=now)
    except Exception:
        pass

    events = list_events(
        db,
        facility_id=facility_id,
        since=since,
        limit=limit,
        event_types=event_types,
    )

    saves = get_active_saves_for_events(
        db,
        facility_id=facility_id,
        user_id=current_user.id,
        event_ids=[e.id for e in events],
        now=now,
    )
    saves_by_event_id = {s.activity_event_id: s for s in saves}

    response: List[ActivityEventResponse] = []
    for e in events:
        s = saves_by_event_id.get(e.id)
        response.append(
            ActivityEventResponse(
                id=e.id,
                facility_id=e.facility_id,
                actor_user_id=e.actor_user_id,
                event_type=e.event_type,
                entity_type=e.entity_type,
                entity_id=e.entity_id,
                summary=e.summary,
                meta=e.meta,
                created_at=e.created_at,
                is_saved=s is not None,
                saved_note=(s.note if s else None),
                saved_expires_at=(s.expires_at if s else None),
            )
        )

    return response


@router.get("/saved", response_model=List[ActivityEventResponse])
async def get_saved_activity(
    facility_id: UUID = Query(..., description="ID de la sede"),
    limit: int = Query(200, ge=1, le=500),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    _require_can_use_activity_feed(current_user, db, facility_id)

    now = datetime.utcnow()
    try:
        cleanup_old_activity(db, facility_id=facility_id, keep_days=30, now=now)
    except Exception:
        pass
    rows = list_saved_events(db, facility_id=facility_id, user_id=current_user.id, limit=limit, now=now)

    response: List[ActivityEventResponse] = []
    for (e, s) in rows:
        if (not _is_owner(current_user, db)) and (e.event_type not in _NON_OWNER_ALLOWED_EVENT_TYPES):
            continue
        response.append(
            ActivityEventResponse(
                id=e.id,
                facility_id=e.facility_id,
                actor_user_id=e.actor_user_id,
                event_type=e.event_type,
                entity_type=e.entity_type,
                entity_id=e.entity_id,
                summary=e.summary,
                meta=e.meta,
                created_at=e.created_at,
                is_saved=True,
                saved_note=s.note,
                saved_expires_at=s.expires_at,
            )
        )
    return response


@router.post("/{event_id}/save", response_model=SaveActivityEventResponse)
async def save_activity(
    event_id: UUID,
    payload: SaveActivityEventRequest,
    facility_id: UUID = Query(..., description="ID de la sede"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    _require_can_use_activity_feed(current_user, db, facility_id)

    # Validar que el evento exista y pertenezca a la sede
    from app.models.activity import ActivityEvent
    event = db.query(ActivityEvent).filter(ActivityEvent.id == event_id).first()
    if not event or event.facility_id != facility_id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Noticia no encontrada")

    if (not _is_owner(current_user, db)) and (event.event_type not in _NON_OWNER_ALLOWED_EVENT_TYPES):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="No autorizado")

    save = save_activity_event(
        db,
        facility_id=facility_id,
        user_id=current_user.id,
        event_id=event_id,
        note=(payload.note.strip() if payload.note else None),
    )
    return SaveActivityEventResponse(message="Noticia guardada", expires_at=save.expires_at)


@router.delete("/{event_id}/save", response_model=UnsaveActivityEventResponse)
async def unsave_activity(
    event_id: UUID,
    facility_id: UUID = Query(..., description="ID de la sede"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    _require_can_use_activity_feed(current_user, db, facility_id)

    deleted = unsave_activity_event(db, facility_id=facility_id, user_id=current_user.id, event_id=event_id)
    if not deleted:
        return UnsaveActivityEventResponse(message="Noticia ya no estaba guardada")
    return UnsaveActivityEventResponse(message="Noticia desguardada")

