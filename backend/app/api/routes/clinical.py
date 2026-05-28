from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session
from typing import List
from uuid import UUID
from datetime import datetime
from app.db.session import get_db
from app.api.deps import get_current_user, require_facility_access, require_facility_role_any
from app.schemas.clinical import (
    ClinicalSummaryUpdate,
    ClinicalSummaryResponse,
    ClinicalNoteCreate,
    ClinicalNoteResponse,
    VitalSignCreate,
    VitalSignResponse
)
from app.models.auth import User
from app.models.residents import Resident
from app.models.clinical import ClinicalSummary, ClinicalNote, VitalSign
from app.models.audit import AuditLog
from app.services.activity_service import log_event

router = APIRouter(prefix="/residents/{resident_id}", tags=["clinical"])


# Clinical Summary
@router.get("/clinical-summary", response_model=ClinicalSummaryResponse)
async def get_clinical_summary(
    resident_id: UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Obtener resumen clínico del residente"""
    resident = db.query(Resident).filter(Resident.id == resident_id, Resident.deleted_at.is_(None)).first()
    if not resident:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Residente no encontrado"
        )
    
    require_facility_access(resident.facility_id)(current_user, db)
    
    summary = db.query(ClinicalSummary).filter(
        ClinicalSummary.resident_id == resident_id
    ).first()
    
    if not summary:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Resumen clínico no encontrado"
        )
    
    return summary


@router.put("/clinical-summary", response_model=ClinicalSummaryResponse)
async def update_clinical_summary(
    resident_id: UUID,
    summary_data: ClinicalSummaryUpdate,
    current_user: User = Depends(require_facility_role_any(['MEDICO', 'ADMIN'])),
    db: Session = Depends(get_db)
):
    """Actualizar resumen clínico"""
    resident = db.query(Resident).filter(Resident.id == resident_id, Resident.deleted_at.is_(None)).first()
    if not resident:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Residente no encontrado"
        )
    
    require_facility_access(resident.facility_id)(current_user, db)
    
    summary = db.query(ClinicalSummary).filter(
        ClinicalSummary.resident_id == resident_id
    ).first()
    
    if not summary:
        summary = ClinicalSummary(
            resident_id=resident_id,
            **summary_data.model_dump(),
            updated_by_user_id=current_user.id
        )
        db.add(summary)
    else:
        update_data = summary_data.model_dump(exclude_unset=True)
        for field, value in update_data.items():
            setattr(summary, field, value)
        summary.updated_by_user_id = current_user.id
    
    db.flush()
    
    # Registrar en audit log
    audit_log = AuditLog(
        facility_id=resident.facility_id,
        actor_user_id=current_user.id,
        action="UPDATE_CLINICAL_SUMMARY",
        entity_type="ClinicalSummary",
        entity_id=summary.id,
        metadata_json={"resident_id": str(resident_id)}
    )
    db.add(audit_log)

    # Activity feed (cambio clínico importante)
    try:
        log_event(
            db,
            facility_id=resident.facility_id,
            actor_user_id=current_user.id,
            event_type="CLINICAL_SUMMARY_UPDATED",
            entity_type="ClinicalSummary",
            entity_id=summary.id,
            summary="Resumen clínico actualizado",
            event_metadata={"resident_id": str(resident_id)},
        )
    except Exception:
        pass

    db.commit()
    db.refresh(summary)

    try:
        from app.services.push_service import notify_activity_from_event

        notify_activity_from_event(
            db,
            facility_id=resident.facility_id,
            event_type="CLINICAL_SUMMARY_UPDATED",
            summary="Resumen clínico actualizado",
            meta={"resident_id": str(resident_id)},
        )
    except Exception:
        pass
    
    return summary


# Clinical Notes
@router.get("/clinical-notes", response_model=List[ClinicalNoteResponse])
async def list_clinical_notes(
    resident_id: UUID,
    current_user: User = Depends(require_facility_role_any(['MEDICO', 'ADMIN'])),
    db: Session = Depends(get_db)
):
    """Listar notas clínicas (evoluciones) del residente"""
    resident = db.query(Resident).filter(Resident.id == resident_id, Resident.deleted_at.is_(None)).first()
    if not resident:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Residente no encontrado"
        )
    
    require_facility_access(resident.facility_id)(current_user, db)
    
    notes = db.query(ClinicalNote).filter(
        ClinicalNote.resident_id == resident_id
    ).order_by(ClinicalNote.recorded_at.desc()).all()
    
    return notes


@router.post("/clinical-notes", response_model=ClinicalNoteResponse, status_code=201)
async def create_clinical_note(
    resident_id: UUID,
    note_data: ClinicalNoteCreate,
    current_user: User = Depends(require_facility_role_any(['MEDICO', 'ADMIN'])),
    db: Session = Depends(get_db)
):
    """Crear nota clínica (evolución/incidente)"""
    resident = db.query(Resident).filter(Resident.id == resident_id, Resident.deleted_at.is_(None)).first()
    if not resident:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Residente no encontrado"
        )
    
    require_facility_access(resident.facility_id)(current_user, db)
    
    note = ClinicalNote(
        resident_id=resident_id,
        facility_id=resident.facility_id,
        author_user_id=current_user.id,
        recorded_at=note_data.recorded_at or datetime.utcnow(),
        **note_data.model_dump(exclude={"recorded_at"})
    )
    db.add(note)
    db.flush()
    
    # Registrar en audit log
    audit_log = AuditLog(
        facility_id=resident.facility_id,
        actor_user_id=current_user.id,
        action="CREATE_CLINICAL_NOTE",
        entity_type="ClinicalNote",
        entity_id=note.id,
        metadata_json={"resident_id": str(resident_id), "note_type": note_data.note_type}
    )
    db.add(audit_log)

    # Activity feed (incidentes y notas clínicas)
    try:
        ev_type = "INCIDENT_REPORTED" if (note_data.note_type or "").upper() == "INCIDENT" else "CLINICAL_NOTE_CREATED"
        log_event(
            db,
            facility_id=resident.facility_id,
            actor_user_id=current_user.id,
            event_type=ev_type,
            entity_type="ClinicalNote",
            entity_id=note.id,
            summary=f"{'Incidente' if ev_type == 'INCIDENT_REPORTED' else 'Nota clínica'}: {resident.last_name}, {resident.first_name}",
            event_metadata={
                "resident_id": str(resident_id),
                "note_type": note_data.note_type,
            },
        )
    except Exception:
        pass

    db.commit()
    db.refresh(note)

    try:
        from app.services.push_service import notify_activity_from_event

        ev_type = "INCIDENT_REPORTED" if (note_data.note_type or "").upper() == "INCIDENT" else "CLINICAL_NOTE_CREATED"
        notify_activity_from_event(
            db,
            facility_id=resident.facility_id,
            event_type=ev_type,
            summary=f"{'Incidente' if ev_type == 'INCIDENT_REPORTED' else 'Nota clínica'}: {resident.last_name}, {resident.first_name}",
            meta={
                "resident_id": str(resident_id),
                "note_type": note_data.note_type,
            },
        )
    except Exception:
        pass
    
    return note


# Vital Signs
@router.get("/vital-signs", response_model=List[VitalSignResponse])
async def list_vital_signs(
    resident_id: UUID,
    current_user: User = Depends(require_facility_role_any(['MEDICO', 'ADMIN'])),
    db: Session = Depends(get_db)
):
    """Listar signos vitales del residente"""
    resident = db.query(Resident).filter(Resident.id == resident_id, Resident.deleted_at.is_(None)).first()
    if not resident:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Residente no encontrado"
        )
    
    require_facility_access(resident.facility_id)(current_user, db)
    
    vital_signs = db.query(VitalSign).filter(
        VitalSign.resident_id == resident_id
    ).order_by(VitalSign.recorded_at.desc()).all()
    
    return vital_signs


@router.post("/vital-signs", response_model=VitalSignResponse, status_code=201)
async def create_vital_sign(
    resident_id: UUID,
    vital_data: VitalSignCreate,
    current_user: User = Depends(require_facility_role_any(['MEDICO', 'ADMIN'])),
    db: Session = Depends(get_db)
):
    """Registrar signos vitales"""
    resident = db.query(Resident).filter(Resident.id == resident_id, Resident.deleted_at.is_(None)).first()
    if not resident:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Residente no encontrado"
        )
    
    require_facility_access(resident.facility_id)(current_user, db)
    
    vital_sign = VitalSign(
        resident_id=resident_id,
        recorded_by_user_id=current_user.id,
        **vital_data.model_dump()
    )
    db.add(vital_sign)
    db.commit()
    db.refresh(vital_sign)
    
    return vital_sign


@router.get("/clinical-history.pdf")
async def download_clinical_history_pdf(
    resident_id: UUID,
    current_user: User = Depends(require_facility_role_any(['MEDICO', 'ADMIN'])),
    db: Session = Depends(get_db)
):
    """Descargar Historia Clínica (evoluciones) en PDF"""
    resident = db.query(Resident).filter(Resident.id == resident_id, Resident.deleted_at.is_(None)).first()
    if not resident:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Residente no encontrado"
        )
    
    require_facility_access(resident.facility_id)(current_user, db)
    
    # Traer notas clínicas ordenadas cronológicamente
    notes = db.query(ClinicalNote).filter(
        ClinicalNote.resident_id == resident_id
    ).order_by(ClinicalNote.recorded_at.asc()).all()
    
    # Preparar datos para PDF
    resident_name = f"{resident.last_name}, {resident.first_name}"
    resident_dni = resident.dni
    coverage = resident.coverage_type
    
    notes_data = [
        {
            "recorded_at": note.recorded_at,
            "note_type": note.note_type or "GENERAL",
            "content": note.content
        }
        for note in notes
    ]
    
    # Generar PDF
    from app.services.certificate_service import generate_clinical_history_pdf
    
    pdf_buffer = generate_clinical_history_pdf(
        resident_name=resident_name,
        resident_dni=resident_dni,
        coverage=coverage,
        notes=notes_data,
        issued_at=datetime.utcnow()
    )
    
    # Preparar nombre de archivo
    from datetime import date
    today_str = date.today().strftime("%Y-%m-%d")
    filename = f"Historia_Clinica_{resident.last_name}_{resident.first_name}_{today_str}.pdf"
    
    return StreamingResponse(
        pdf_buffer,
        media_type="application/pdf",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'}
    )
