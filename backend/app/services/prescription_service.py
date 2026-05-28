from sqlalchemy.orm import Session
from sqlalchemy import desc
from typing import List, Optional
from uuid import UUID
from datetime import datetime
from app.models.prescriptions import PrescriptionLog
from app.models.residents import Resident
from app.schemas.prescriptions import PrescriptionLogCreate, PrescriptionLogResponse


def get_prescription_logs(
    db: Session,
    patient_id: UUID,
    facility_id: UUID,
    limit: int = 50,
    offset: int = 0
) -> List[PrescriptionLog]:
    """Obtener logs de recetas de un paciente, scoped por facility"""
    query = db.query(PrescriptionLog).filter(
        PrescriptionLog.patient_id == patient_id,
        PrescriptionLog.facility_id == facility_id
    ).order_by(desc(PrescriptionLog.created_at))
    
    if limit > 0:
        query = query.limit(limit)
    if offset > 0:
        query = query.offset(offset)
    
    return query.all()


def create_prescription_log(
    db: Session,
    patient_id: UUID,
    facility_id: UUID,
    data: PrescriptionLogCreate,
    author_user_id: UUID
) -> PrescriptionLog:
    """Crear un nuevo log de receta"""
    # Validar que el paciente existe y pertenece a la facility
    patient = db.query(Resident).filter(
        Resident.id == patient_id,
        Resident.facility_id == facility_id
    ).first()
    
    if not patient:
        raise ValueError("Paciente no encontrado o no pertenece a esta facility")
    
    # Validar repeat_of si existe
    if data.repeat_of:
        original = db.query(PrescriptionLog).filter(
            PrescriptionLog.id == data.repeat_of,
            PrescriptionLog.patient_id == patient_id,
            PrescriptionLog.facility_id == facility_id
        ).first()
        if not original:
            raise ValueError("La receta original no existe o no pertenece a este paciente")
    
    # Crear el log
    prescription_log = PrescriptionLog(
        patient_id=patient_id,
        facility_id=facility_id,
        author_user_id=author_user_id,
        medications_text=data.medications_text,
        instructions=data.instructions,
        source=data.source or "OTHER",
        repeat_of=data.repeat_of
    )
    
    db.add(prescription_log)
    db.commit()
    db.refresh(prescription_log)
    
    return prescription_log