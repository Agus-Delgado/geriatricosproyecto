from sqlalchemy.orm import Session
from sqlalchemy import and_
from uuid import UUID
from datetime import datetime, timedelta
from typing import Optional, List, Any, Tuple
from app.models.activity import ActivityEvent, ActivityEventSave


def cleanup_old_activity(
    db: Session,
    *,
    facility_id: UUID,
    keep_days: int = 30,
    now: Optional[datetime] = None,
) -> None:
    now_dt = now or datetime.utcnow()

    # 1) Borrar guardados vencidos
    db.query(ActivityEventSave).filter(
        ActivityEventSave.facility_id == facility_id,
        ActivityEventSave.expires_at <= now_dt,
    ).delete(synchronize_session=False)

    # 2) Borrar eventos viejos (pero solo si nadie los tiene guardados)
    cutoff = now_dt - timedelta(days=keep_days)
    has_any_save = (
        db.query(ActivityEventSave.id)
        .filter(ActivityEventSave.activity_event_id == ActivityEvent.id)
        .exists()
    )

    db.query(ActivityEvent).filter(
        ActivityEvent.facility_id == facility_id,
        ActivityEvent.created_at < cutoff,
        ~has_any_save,
    ).delete(synchronize_session=False)

    db.commit()


def log_event(
    db: Session,
    *,
    facility_id: UUID,
    actor_user_id: UUID,
    event_type: str,
    entity_type: str,
    entity_id: UUID,
    summary: Optional[str] = None,
    event_metadata: Optional[Any] = None,
) -> ActivityEvent:
    from fastapi.encoders import jsonable_encoder

    et = str(event_type or "").strip()
    if et:
        et = et.upper()
    else:
        et = event_type

    ent = str(entity_type or "").strip()
    if ent:
        ent = ent
    else:
        ent = entity_type

    safe_meta = jsonable_encoder(event_metadata or {})
    event = ActivityEvent(
        facility_id=facility_id,
        actor_user_id=actor_user_id,
        event_type=et,
        entity_type=ent,
        entity_id=entity_id,
        summary=summary,
        meta=safe_meta,
    )
    db.add(event)
    # No commit aquí; el caller debe committear junto con su transacción
    return event


def list_events(
    db: Session,
    *,
    facility_id: UUID,
    since: Optional[datetime] = None,
    limit: int = 50,
    event_types: Optional[List[str]] = None,
) -> List[ActivityEvent]:
    q = db.query(ActivityEvent).filter(ActivityEvent.facility_id == facility_id)
    if since:
        q = q.filter(ActivityEvent.created_at >= since)
    if event_types:
        q = q.filter(ActivityEvent.event_type.in_(event_types))
    return q.order_by(ActivityEvent.created_at.desc()).limit(limit).all()


def get_active_saves_for_events(
    db: Session,
    *,
    facility_id: UUID,
    user_id: UUID,
    event_ids: List[UUID],
    now: Optional[datetime] = None,
) -> List[ActivityEventSave]:
    if not event_ids:
        return []
    now_dt = now or datetime.utcnow()
    return (
        db.query(ActivityEventSave)
        .filter(
            ActivityEventSave.facility_id == facility_id,
            ActivityEventSave.user_id == user_id,
            ActivityEventSave.activity_event_id.in_(event_ids),
            ActivityEventSave.expires_at > now_dt,
        )
        .all()
    )


def save_activity_event(
    db: Session,
    *,
    facility_id: UUID,
    user_id: UUID,
    event_id: UUID,
    note: Optional[str] = None,
    now: Optional[datetime] = None,
) -> ActivityEventSave:
    now_dt = now or datetime.utcnow()
    expires_at = now_dt + timedelta(days=7)

    existing = (
        db.query(ActivityEventSave)
        .filter(
            ActivityEventSave.facility_id == facility_id,
            ActivityEventSave.user_id == user_id,
            ActivityEventSave.activity_event_id == event_id,
        )
        .first()
    )

    if existing:
        existing.note = note
        existing.expires_at = expires_at
        existing.created_at = now_dt
        db.commit()
        return existing

    save = ActivityEventSave(
        facility_id=facility_id,
        user_id=user_id,
        activity_event_id=event_id,
        note=note,
        created_at=now_dt,
        expires_at=expires_at,
    )
    db.add(save)
    db.commit()
    return save


def unsave_activity_event(
    db: Session,
    *,
    facility_id: UUID,
    user_id: UUID,
    event_id: UUID,
) -> bool:
    existing = (
        db.query(ActivityEventSave)
        .filter(
            ActivityEventSave.facility_id == facility_id,
            ActivityEventSave.user_id == user_id,
            ActivityEventSave.activity_event_id == event_id,
        )
        .first()
    )
    if not existing:
        return False
    db.delete(existing)
    db.commit()
    return True


def list_saved_events(
    db: Session,
    *,
    facility_id: UUID,
    user_id: UUID,
    limit: int = 200,
    now: Optional[datetime] = None,
) -> List[Tuple[ActivityEvent, ActivityEventSave]]:
    now_dt = now or datetime.utcnow()
    q = (
        db.query(ActivityEvent, ActivityEventSave)
        .join(ActivityEventSave, ActivityEventSave.activity_event_id == ActivityEvent.id)
        .filter(
            ActivityEventSave.facility_id == facility_id,
            ActivityEventSave.user_id == user_id,
            ActivityEventSave.expires_at > now_dt,
        )
        .order_by(ActivityEventSave.created_at.desc())
        .limit(limit)
    )
    return q.all()

