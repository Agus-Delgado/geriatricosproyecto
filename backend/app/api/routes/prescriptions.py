from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from typing import List, Optional
from uuid import UUID
from app.db.session import get_db
from app.api.deps import get_current_user, require_facility_access, require_facility_role_any
from app.schemas.prescriptions import (
    PrescriptionLogCreate,
    PrescriptionLogResponse,
)
from app.services.prescription_service import (
    get_prescription_logs,
    create_prescription_log,
)
from app.models.auth import User
from app.models.residents import Resident
from app.models.prescriptions import PrescriptionLog

router = APIRouter(tags=["prescriptions"])


@router.get("/patients/{patient_id}/prescriptions", response_model=List[PrescriptionLogResponse])
async def list_prescription_logs(
    patient_id: UUID,
    limit: int = Query(50, ge=1, le=100, description="Límite de resultados"),
    offset: int = Query(0, ge=0, description="Offset para paginación"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Listar logs de recetas de un paciente"""
    # Obtener paciente para validar facility
    patient = db.query(Resident).filter(Resident.id == patient_id, Resident.deleted_at.is_(None)).first()
    if not patient:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Paciente no encontrado"
        )
    
    # Validar acceso a la facility del paciente
    require_facility_access(patient.facility_id)(current_user, db)
    
    # Obtener logs
    logs = get_prescription_logs(db, patient_id, patient.facility_id, limit, offset)
    
    # Incluir nombre del autor en la respuesta
    result = []
    for log in logs:
        log_dict = {
            "id": log.id,
            "patient_id": log.patient_id,
            "facility_id": log.facility_id,
            "author_user_id": log.author_user_id,
            "created_at": log.created_at,
            "medications_text": log.medications_text,
            "instructions": log.instructions,
            "source": log.source,
            "repeat_of": log.repeat_of,
            "author_name": log.author.full_name if log.author else None,
        }
        result.append(PrescriptionLogResponse(**log_dict))
    
    return result


@router.post("/patients/{patient_id}/prescriptions", response_model=PrescriptionLogResponse, status_code=201)
async def create_prescription_log_endpoint(
    patient_id: UUID,
    prescription_data: PrescriptionLogCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Crear un nuevo log de receta (requiere rol DOCTOR o ADMIN)"""
    
    # Obtener paciente para validar facility
    patient = db.query(Resident).filter(Resident.id == patient_id, Resident.deleted_at.is_(None)).first()
    if not patient:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Paciente no encontrado"
        )
    
    # Validar acceso a la facility del paciente
    require_facility_access(patient.facility_id)(current_user, db)
    
    try:
        # Crear log
        log = create_prescription_log(
            db,
            patient_id,
            patient.facility_id,
            prescription_data,
            current_user.id
        )
        
        # Incluir nombre del autor
        log_dict = {
            "id": log.id,
            "patient_id": log.patient_id,
            "facility_id": log.facility_id,
            "author_user_id": log.author_user_id,
            "created_at": log.created_at,
            "medications_text": log.medications_text,
            "instructions": log.instructions,
            "source": log.source,
            "repeat_of": log.repeat_of,
            "author_name": log.author.full_name if log.author else None,
        }
        
        return PrescriptionLogResponse(**log_dict)
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )