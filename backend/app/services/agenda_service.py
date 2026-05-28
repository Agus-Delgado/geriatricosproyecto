from sqlalchemy.orm import Session
from sqlalchemy import desc, func
from typing import List, Optional
from uuid import UUID
from datetime import datetime, date, time
from app.models.agenda import AgendaEntry
from app.models.residents import Resident
from app.schemas.agenda import AgendaEntryCreate, AgendaEntryUpdate


def get_agenda_entries_today(
    db: Session,
    facility_id: UUID,
    doctor_user_id: UUID,
    target_date: Optional[date] = None
) -> List[AgendaEntry]:
    """
    Obtener entradas de agenda del día para una facility y doctor específicos.
    Si target_date es None, usa la fecha actual.
    """
    if target_date is None:
        target_date = date.today()
    
    start_datetime = datetime.combine(target_date, time.min)
    end_datetime = datetime.combine(target_date, time.max)
    
    return db.query(AgendaEntry).filter(
        AgendaEntry.facility_id == facility_id,
        AgendaEntry.doctor_user_id == doctor_user_id,
        AgendaEntry.seen_at >= start_datetime,
        AgendaEntry.seen_at <= end_datetime
    ).order_by(desc(AgendaEntry.seen_at)).all()


def create_agenda_entry(
    db: Session,
    facility_id: UUID,
    doctor_user_id: UUID,
    data: AgendaEntryCreate
) -> AgendaEntry:
    """
    Crear una nueva entrada de agenda.
    Valida que el patient_id pertenezca a facility_id.
    """
    # Validar que el paciente pertenece a la facility
    patient = db.query(Resident).filter(
        Resident.id == data.patient_id,
        Resident.facility_id == facility_id
    ).first()
    
    if not patient:
        raise ValueError(f"Paciente {data.patient_id} no encontrado o no pertenece a la facility {facility_id}")
    
    # Validar que facility_id coincide con el del request
    if data.facility_id != facility_id:
        raise ValueError("facility_id no coincide con la facility activa")
    
    # Crear entrada
    seen_at = data.seen_at or datetime.utcnow()
    
    agenda_entry = AgendaEntry(
        facility_id=facility_id,
        doctor_user_id=doctor_user_id,
        patient_id=data.patient_id,
        seen_at=seen_at,
        note=data.note
    )
    
    db.add(agenda_entry)
    db.commit()
    db.refresh(agenda_entry)
    
    return agenda_entry


def update_agenda_entry(
    db: Session,
    entry_id: UUID,
    facility_id: UUID,
    current_user_id: UUID,
    is_admin: bool,
    data: AgendaEntryUpdate
) -> AgendaEntry:
    """
    Actualizar una entrada de agenda.
    Valida permisos: DOCTOR solo puede editar entradas propias, ADMIN puede editar cualquier entrada de la facility.
    """
    entry = db.query(AgendaEntry).filter(
        AgendaEntry.id == entry_id,
        AgendaEntry.facility_id == facility_id
    ).first()
    
    if not entry:
        raise ValueError(f"Entrada de agenda {entry_id} no encontrada o no pertenece a la facility {facility_id}")
    
    # Validar permisos
    if not is_admin and entry.doctor_user_id != current_user_id:
        raise ValueError("Solo puede editar entradas propias")
    
    # Actualizar campos proporcionados
    if data.note is not None:
        entry.note = data.note
    if data.seen_at is not None:
        entry.seen_at = data.seen_at
    
    db.commit()
    db.refresh(entry)
    
    return entry


def delete_agenda_entry(
    db: Session,
    entry_id: UUID,
    facility_id: UUID,
    doctor_user_id: UUID
) -> bool:
    """
    Eliminar una entrada de agenda.
    Solo permite eliminar entradas del mismo facility y doctor.
    """
    entry = db.query(AgendaEntry).filter(
        AgendaEntry.id == entry_id,
        AgendaEntry.facility_id == facility_id,
        AgendaEntry.doctor_user_id == doctor_user_id
    ).first()
    
    if not entry:
        return False
    
    db.delete(entry)
    db.commit()
    return True


def get_agenda_entries_count_today(
    db: Session,
    facility_id: UUID,
    doctor_user_id: UUID,
    target_date: Optional[date] = None
) -> int:
    """Obtener cantidad de entradas de agenda del día"""
    if target_date is None:
        target_date = date.today()
    
    start_datetime = datetime.combine(target_date, time.min)
    end_datetime = datetime.combine(target_date, time.max)
    
    return db.query(func.count(AgendaEntry.id)).filter(
        AgendaEntry.facility_id == facility_id,
        AgendaEntry.doctor_user_id == doctor_user_id,
        AgendaEntry.seen_at >= start_datetime,
        AgendaEntry.seen_at <= end_datetime
    ).scalar() or 0


def get_unique_patients_count_today(
    db: Session,
    facility_id: UUID,
    doctor_user_id: UUID,
    target_date: Optional[date] = None
) -> int:
    """Obtener cantidad de pacientes únicos vistos hoy"""
    if target_date is None:
        target_date = date.today()
    
    start_datetime = datetime.combine(target_date, time.min)
    end_datetime = datetime.combine(target_date, time.max)
    
    return db.query(func.count(func.distinct(AgendaEntry.patient_id))).filter(
        AgendaEntry.facility_id == facility_id,
        AgendaEntry.doctor_user_id == doctor_user_id,
        AgendaEntry.seen_at >= start_datetime,
        AgendaEntry.seen_at <= end_datetime
    ).scalar() or 0