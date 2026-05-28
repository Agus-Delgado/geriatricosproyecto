import json
import logging
from datetime import datetime
from typing import Optional, Dict, Any, List
from uuid import UUID

from sqlalchemy.orm import Session

from app.core.config import settings
from app.models.push import PushSubscription, PushPreference
from app.models.org import Facility, FacilityUserAccess
from app.models.auth import User

logger = logging.getLogger(__name__)


_EVENT_LABELS: Dict[str, str] = {
    "PATIENT_CREATED": "Alta de paciente",
    "PATIENT_UPDATED": "Edición de paciente",
    "PATIENT_DELETED": "Paciente eliminado",
    "PATIENT_STATUS_CHANGED": "Cambio de estado",
    "MEDICATION_CHANGED": "Cambio de medicación",
    "CLINICAL_SUMMARY_UPDATED": "Resumen clínico actualizado",
    "CLINICAL_NOTE_CREATED": "Nota clínica",
    "INCIDENT_REPORTED": "Incidente",
    "STAFF_CREATED": "Nuevo personal",
    "STAFF_UPDATED": "Edición de personal",
    "STAFF_ARCHIVED": "Baja de personal",
    "STAFF_TRANSFERRED": "Traslado de personal",
    "SHIFT_ASSIGNED": "Turno asignado",
    "SHIFT_UNASSIGNED": "Turno removido",
    "COVERAGE_UNDERSTAFFED": "Cobertura insuficiente",
}


_NOTICIAS_DIARIAS_EVENT_TYPES = {
    "PATIENT_CREATED",
    "PATIENT_UPDATED",
    "PATIENT_DELETED",
    "PATIENT_STATUS_CHANGED",
    "MEDICATION_CHANGED",
    "CLINICAL_SUMMARY_UPDATED",
    "CLINICAL_NOTE_CREATED",
    "INCIDENT_REPORTED",
    "STAFF_CREATED",
    "STAFF_UPDATED",
    "STAFF_ARCHIVED",
    "STAFF_TRANSFERRED",
    "SHIFT_ASSIGNED",
    "SHIFT_UNASSIGNED",
    "COVERAGE_UNDERSTAFFED",
}


def _normalize_disabled_event_types(values: Optional[List[str]]) -> List[str]:
    if not values:
        return []
    normalized = []
    seen = set()
    for v in values:
        if not isinstance(v, str):
            continue
        vv = v.strip()
        if not vv:
            continue
        if vv not in _NOTICIAS_DIARIAS_EVENT_TYPES:
            continue
        if vv in seen:
            continue
        seen.add(vv)
        normalized.append(vv)
    return normalized


def get_push_preferences(db: Session, *, user_id: UUID, facility_id: UUID) -> List[str]:
    pref = (
        db.query(PushPreference)
        .filter(PushPreference.user_id == user_id, PushPreference.facility_id == facility_id)
        .first()
    )
    if not pref:
        return []
    raw = pref.disabled_event_types or []
    if isinstance(raw, list):
        return _normalize_disabled_event_types(raw)
    return []


def upsert_push_preferences(
    db: Session,
    *,
    user_id: UUID,
    facility_id: UUID,
    disabled_event_types: List[str],
) -> PushPreference:
    disabled = _normalize_disabled_event_types(disabled_event_types)

    existing = (
        db.query(PushPreference)
        .filter(PushPreference.user_id == user_id, PushPreference.facility_id == facility_id)
        .first()
    )
    if existing:
        existing.disabled_event_types = disabled
        db.commit()
        return existing

    pref = PushPreference(user_id=user_id, facility_id=facility_id, disabled_event_types=disabled)
    db.add(pref)
    db.commit()
    return pref


def _truncate(s: str, n: int = 140) -> str:
    if len(s) <= n:
        return s
    return s[: n - 1].rstrip() + "…"


def is_push_configured() -> bool:
    return bool(settings.VAPID_PUBLIC_KEY and settings.VAPID_PRIVATE_KEY)


def get_vapid_public_key() -> str:
    if not settings.VAPID_PUBLIC_KEY:
        raise RuntimeError("VAPID_PUBLIC_KEY not configured")
    return settings.VAPID_PUBLIC_KEY


def upsert_subscription(
    db: Session,
    *,
    user_id: UUID,
    facility_id: UUID,
    endpoint: str,
    p256dh: str,
    auth: str,
    user_agent: Optional[str] = None,
) -> PushSubscription:
    existing = (
        db.query(PushSubscription)
        .filter(
            PushSubscription.endpoint == endpoint,
            PushSubscription.facility_id == facility_id,
        )
        .first()
    )
    if existing:
        existing.user_id = user_id
        existing.p256dh = p256dh
        existing.auth = auth
        existing.user_agent = user_agent
        db.commit()
        return existing

    sub = PushSubscription(
        user_id=user_id,
        facility_id=facility_id,
        endpoint=endpoint,
        p256dh=p256dh,
        auth=auth,
        user_agent=user_agent,
    )
    db.add(sub)
    db.commit()
    return sub


def delete_subscription(db: Session, *, user_id: UUID, facility_id: UUID, endpoint: str) -> bool:
    existing = (
        db.query(PushSubscription)
        .filter(
            PushSubscription.user_id == user_id,
            PushSubscription.facility_id == facility_id,
            PushSubscription.endpoint == endpoint,
        )
        .first()
    )
    if not existing:
        return False
    db.delete(existing)
    db.commit()
    return True


def _build_activity_push_payload(
    *,
    facility_name: str,
    title: str,
    body: str,
    url: str,
    tag: Optional[str] = None,
) -> Dict[str, Any]:
    return {
        "title": title,
        "body": body,
        "url": url,
        "tag": tag or "activity",
        "timestamp": int(datetime.utcnow().timestamp()),
        "facility_name": facility_name,
    }


def _send_web_push(subscription: PushSubscription, payload: Dict[str, Any]) -> bool:
    if not is_push_configured():
        return False

    try:
        from pywebpush import webpush, WebPushException

        subscription_info = {
            "endpoint": subscription.endpoint,
            "keys": {"p256dh": subscription.p256dh, "auth": subscription.auth},
        }

        webpush(
            subscription_info,
            data=json.dumps(payload),
            vapid_private_key=settings.VAPID_PRIVATE_KEY,
            vapid_claims={"sub": settings.VAPID_SUBJECT},
        )
        return True
    except Exception as e:
        # pywebpush levanta WebPushException con response.status_code para endpoints expirados
        status_code = getattr(getattr(e, "response", None), "status_code", None)
        if status_code in (404, 410):
            return False
        logger.warning(f"Web push failed: {type(e).__name__}: {e}")
        return True  # no borrar si no sabemos


def _get_recipients(db: Session, facility_id: UUID) -> List[UUID]:
    # Notificar a ADMIN (owners) y MEDICO del hogar
    rows = (
        db.query(FacilityUserAccess.user_id)
        .join(User, User.id == FacilityUserAccess.user_id)
        .filter(
            FacilityUserAccess.facility_id == facility_id,
            FacilityUserAccess.is_active.is_(True),
            FacilityUserAccess.role.in_(["ADMIN", "MEDICO"]),
            User.is_active.is_(True),
        )
        .all()
    )
    return [r[0] for r in rows]


def notify_activity_event(
    db: Session,
    *,
    facility_id: UUID,
    title: str,
    body: str,
    url: str,
    tag: Optional[str] = None,
) -> None:
    if not is_push_configured():
        return

    facility = db.query(Facility).filter(Facility.id == facility_id).first()
    facility_name = facility.name if facility else "Hogar"

    payload = _build_activity_push_payload(
        facility_name=facility_name,
        title=title,
        body=body,
        url=url,
        tag=tag,
    )

    recipient_ids = _get_recipients(db, facility_id)
    if not recipient_ids:
        return

    subs = (
        db.query(PushSubscription)
        .filter(
            PushSubscription.facility_id == facility_id,
            PushSubscription.user_id.in_(recipient_ids),
        )
        .all()
    )

    # Si tag coincide con event_type, aplicar preferencias por usuario
    disabled_by_user: Dict[UUID, set] = {}
    event_type = tag if isinstance(tag, str) else None
    if event_type in _NOTICIAS_DIARIAS_EVENT_TYPES:
        for uid in recipient_ids:
            disabled_by_user[uid] = set(get_push_preferences(db, user_id=uid, facility_id=facility_id))

    for sub in subs:
        if event_type in _NOTICIAS_DIARIAS_EVENT_TYPES:
            disabled = disabled_by_user.get(sub.user_id, set())
            if event_type in disabled:
                continue
        should_keep = _send_web_push(sub, payload)
        if not should_keep:
            try:
                db.delete(sub)
                db.commit()
            except Exception:
                db.rollback()


def send_test_push(db: Session, *, user_id: UUID, facility_id: UUID) -> Dict[str, int]:
    """Enviar una notificación de prueba al usuario.

    Retorna contadores para diagnóstico.
    """
    if not is_push_configured():
        return {"attempted": 0, "delivered": 0, "deleted": 0}

    subs = (
        db.query(PushSubscription)
        .filter(PushSubscription.user_id == user_id, PushSubscription.facility_id == facility_id)
        .all()
    )
    if not subs:
        return {"attempted": 0, "delivered": 0, "deleted": 0}

    facility = db.query(Facility).filter(Facility.id == facility_id).first()
    facility_name = facility.name if facility else "Hogar"
    payload = _build_activity_push_payload(
        facility_name=facility_name,
        title="Notificación de prueba",
        body="Si ves esto, el push funciona en este dispositivo.",
        url=settings.FRONTEND_URL.rstrip("/") + "/activity",
        tag="PUSH_TEST",
    )

    attempted = 0
    delivered = 0
    deleted = 0

    for sub in subs:
        attempted += 1
        should_keep = _send_web_push(sub, payload)
        if should_keep:
            delivered += 1
            continue
        try:
            db.delete(sub)
            db.commit()
            deleted += 1
        except Exception:
            db.rollback()

    return {"attempted": attempted, "delivered": delivered, "deleted": deleted}


def notify_activity_from_event(
    db: Session,
    *,
    facility_id: UUID,
    event_type: str,
    summary: Optional[str],
    meta: Optional[Dict[str, Any]] = None,
) -> None:
    """Enviar push para un ActivityEvent.

    No levanta excepciones: nunca debe romper la operación principal.
    """
    try:
        if event_type not in _NOTICIAS_DIARIAS_EVENT_TYPES:
            return

        title = _EVENT_LABELS.get(event_type, event_type)
        body = summary or "Nueva actualización"

        # Intentar enriquecer para cambios de estado
        m = meta or {}
        if event_type == "PATIENT_STATUS_CHANGED":
            resident_name = m.get("resident_name")
            changes = m.get("changes") or {}
            status_val = None
            if isinstance(changes, dict):
                status_val = changes.get("status")
            if resident_name and status_val:
                body = f"{resident_name} → {status_val}"
            elif resident_name:
                body = str(resident_name)

        url = settings.FRONTEND_URL.rstrip("/") + "/activity"
        notify_activity_event(
            db,
            facility_id=facility_id,
            title=_truncate(str(title), 48),
            body=_truncate(str(body), 140),
            url=url,
            tag=event_type,
        )
    except Exception as e:
        logger.warning(f"notify_activity_from_event failed: {type(e).__name__}: {e}")
