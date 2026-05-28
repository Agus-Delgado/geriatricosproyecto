from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from typing import List, Optional
from uuid import UUID
from app.db.session import get_db
from app.api.deps import get_current_user, require_facility_access
from app.schemas.certificates import CertificateCreate, CertificateResponse, CertificateUpdate
from app.models.auth import User
from app.models.residents import Resident
from app.models.certificates import Certificate
from app.models.audit import AuditLog

router = APIRouter(prefix="/certificates", tags=["certificates"])


@router.post("", response_model=CertificateResponse, status_code=201)
async def create_certificate(
    cert_data: CertificateCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Crear nueva constancia médica"""
    # Validar que el residente existe
    resident = db.query(Resident).filter(Resident.id == cert_data.resident_id, Resident.deleted_at.is_(None)).first()
    if not resident:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Residente no encontrado"
        )
    
    # Validar acceso a la facility
    require_facility_access(cert_data.facility_id)(current_user, db)
    
    # Validar que el residente pertenece a la facility
    if resident.facility_id != cert_data.facility_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="El residente no pertenece a la facility especificada"
        )
    
    # Crear certificado
    certificate = Certificate(
        resident_id=cert_data.resident_id,
        facility_id=cert_data.facility_id,
        certificate_type=cert_data.certificate_type,
        issued_at=cert_data.issued_at,
        issued_by_user_id=current_user.id,
        body_text=cert_data.body_text,
        content_json=cert_data.content_json
    )
    db.add(certificate)
    db.flush()
    
    # Registrar en audit log
    audit_log = AuditLog(
        facility_id=cert_data.facility_id,
        actor_user_id=current_user.id,
        action="CREATE_CERTIFICATE",
        entity_type="Certificate",
        entity_id=certificate.id,
        metadata_json={
            "certificate_type": cert_data.certificate_type,
            "resident_id": str(cert_data.resident_id)
        }
    )
    db.add(audit_log)
    db.commit()
    db.refresh(certificate)
    
    return certificate


@router.get("", response_model=List[CertificateResponse])
async def list_certificates(
    resident_id: Optional[UUID] = Query(None, description="Filtrar por residente"),
    facility_id: Optional[UUID] = Query(None, description="Filtrar por facility"),
    certificate_type: Optional[str] = Query(None, description="Filtrar por tipo"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Listar constancias médicas"""
    query = db.query(Certificate)
    
    # Si se especifica facility_id, validar acceso
    if facility_id:
        require_facility_access(facility_id)(current_user, db)
        query = query.filter(Certificate.facility_id == facility_id)
    else:
        # Si no se especifica, solo mostrar las facilities a las que tiene acceso
        from app.api.deps import get_user_facilities
        facility_accesses = get_user_facilities(db, current_user.id)
        facility_ids = [access.facility_id for access in facility_accesses]
        if facility_ids:
            query = query.filter(Certificate.facility_id.in_(facility_ids))
        else:
            # Usuario sin acceso a ninguna facility
            return []
    
    # Filtrar por residente si se especifica
    if resident_id:
        query = query.filter(Certificate.resident_id == resident_id)
        # Validar acceso al residente
        resident = db.query(Resident).filter(Resident.id == resident_id, Resident.deleted_at.is_(None)).first()
        if not resident:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Residente no encontrado"
            )
        require_facility_access(resident.facility_id)(current_user, db)
    
    # Filtrar por tipo si se especifica
    if certificate_type:
        query = query.filter(Certificate.certificate_type == certificate_type)
    
    certificates = query.order_by(Certificate.issued_at.desc()).all()
    return certificates


@router.get("/{certificate_id}", response_model=CertificateResponse)
async def get_certificate(
    certificate_id: UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Obtener una constancia médica por ID"""
    certificate = db.query(Certificate).filter(Certificate.id == certificate_id).first()
    if not certificate:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Constancia no encontrada"
        )
    
    # Validar acceso a la facility
    require_facility_access(certificate.facility_id)(current_user, db)
    
    return certificate


@router.patch("/{certificate_id}", response_model=CertificateResponse)
async def update_certificate(
    certificate_id: UUID,
    cert_data: CertificateUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Actualizar una constancia médica"""
    certificate = db.query(Certificate).filter(Certificate.id == certificate_id).first()
    if not certificate:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Constancia no encontrada"
        )
    
    # Validar acceso a la facility
    require_facility_access(certificate.facility_id)(current_user, db)
    
    # Actualizar campos
    if cert_data.body_text is not None:
        certificate.body_text = cert_data.body_text
    if cert_data.issued_at is not None:
        certificate.issued_at = cert_data.issued_at
    if cert_data.content_json is not None:
        certificate.content_json = cert_data.content_json
    
    db.commit()
    db.refresh(certificate)
    
    return certificate
