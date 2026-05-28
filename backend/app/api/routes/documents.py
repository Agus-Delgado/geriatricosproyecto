from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
from uuid import UUID
from app.db.session import get_db
from app.api.deps import get_current_user, require_facility_access
from app.schemas.documents import DocumentCreate, DocumentResponse
from app.models.auth import User
from app.models.residents import Resident
from app.models.documents import Document

router = APIRouter(prefix="/residents/{resident_id}/documents", tags=["documents"])


@router.post("", response_model=DocumentResponse, status_code=201)
async def create_document(
    resident_id: UUID,
    doc_data: DocumentCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Subir documento (metadata + file_url)"""
    resident = db.query(Resident).filter(Resident.id == resident_id, Resident.deleted_at.is_(None)).first()
    if not resident:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Residente no encontrado"
        )
    
    require_facility_access(resident.facility_id)(current_user, db)
    
    document = Document(
        resident_id=resident_id,
        facility_id=resident.facility_id,
        uploaded_by_user_id=current_user.id,
        **doc_data.model_dump()
    )
    db.add(document)
    db.commit()
    db.refresh(document)
    return document


@router.get("", response_model=List[DocumentResponse])
async def list_documents(
    resident_id: UUID,
    doc_type: str = None,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Listar documentos de un residente"""
    resident = db.query(Resident).filter(Resident.id == resident_id, Resident.deleted_at.is_(None)).first()
    if not resident:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Residente no encontrado"
        )
    
    require_facility_access(resident.facility_id)(current_user, db)
    
    query = db.query(Document).filter(Document.resident_id == resident_id)
    
    if doc_type:
        query = query.filter(Document.doc_type == doc_type)
    
    documents = query.order_by(Document.uploaded_at.desc()).all()
    return documents


@router.delete("/{doc_id}", status_code=204)
async def delete_document(
    resident_id: UUID,
    doc_id: UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Eliminar documento (soft delete - solo eliminar registro)"""
    resident = db.query(Resident).filter(Resident.id == resident_id, Resident.deleted_at.is_(None)).first()
    if not resident:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Residente no encontrado"
        )
    
    require_facility_access(resident.facility_id)(current_user, db)
    
    document = db.query(Document).filter(
        Document.id == doc_id,
        Document.resident_id == resident_id
    ).first()
    
    if not document:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Documento no encontrado"
        )
    
    db.delete(document)
    db.commit()
    return None
