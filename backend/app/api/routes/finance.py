from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from typing import List, Optional
from uuid import UUID
from datetime import date
from app.db.session import get_db
from app.api.deps import get_current_user, require_role, require_facility_access
from app.schemas.finance import (
    FinanceCategoryCreate,
    FinanceCategoryUpdate,
    FinanceCategoryResponse,
    FinanceTransactionCreate,
    FinanceTransactionResponse,
    FinanceSummaryResponse,
    FinanceGroupSummaryResponse
)
from app.services.finance_service import (
    create_finance_transaction,
    get_finance_summary,
    get_group_summary
)
from app.models.auth import User
from app.models.org import Facility, OwnerGroup
from app.models.finance import FinanceCategory, FinanceTransaction

router = APIRouter(prefix="/finance", tags=["finance"])


# Categories
@router.get("/categories", response_model=List[FinanceCategoryResponse])
async def list_categories(
    type: Optional[str] = Query(None, description="Filtrar por tipo: INCOME o EXPENSE"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Listar categorías financieras del grupo"""
    # Obtener owner_group_id del usuario (desde sus facilities)
    facilities = db.query(Facility).join(
        Facility.user_accesses
    ).filter(
        Facility.user_accesses.user_id == current_user.id
    ).first()
    
    if not facilities:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No se encontró grupo asociado"
        )
    
    owner_group_id = facilities.owner_group_id
    
    query = db.query(FinanceCategory).filter(
        FinanceCategory.owner_group_id == owner_group_id
    )
    
    if type:
        query = query.filter(FinanceCategory.type == type)
    
    categories = query.filter(FinanceCategory.is_active == True).order_by(
        FinanceCategory.type, FinanceCategory.name
    ).all()
    return categories


@router.post("/categories", response_model=FinanceCategoryResponse, status_code=201)
async def create_category(
    category_data: FinanceCategoryCreate,
    current_user: User = Depends(require_role("OWNER")),
    db: Session = Depends(get_db)
):
    """Crear categoría financiera (solo OWNER)"""
    # Obtener owner_group_id
    facilities = db.query(Facility).join(
        Facility.user_accesses
    ).filter(
        Facility.user_accesses.user_id == current_user.id
    ).first()
    
    if not facilities:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No se encontró grupo asociado"
        )
    
    owner_group_id = facilities.owner_group_id
    
    # Verificar que no exista
    existing = db.query(FinanceCategory).filter(
        FinanceCategory.owner_group_id == owner_group_id,
        FinanceCategory.name == category_data.name,
        FinanceCategory.type == category_data.type
    ).first()
    
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Ya existe una categoría con este nombre y tipo"
        )
    
    category = FinanceCategory(
        owner_group_id=owner_group_id,
        **category_data.model_dump()
    )
    db.add(category)
    db.commit()
    db.refresh(category)
    return category


@router.put("/categories/{category_id}", response_model=FinanceCategoryResponse)
async def update_category(
    category_id: UUID,
    category_data: FinanceCategoryUpdate,
    current_user: User = Depends(require_role("OWNER")),
    db: Session = Depends(get_db)
):
    """Actualizar categoría financiera (solo OWNER)"""
    category = db.query(FinanceCategory).filter(
        FinanceCategory.id == category_id
    ).first()
    
    if not category:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Categoría no encontrada"
        )
    
    update_data = category_data.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(category, field, value)
    
    db.commit()
    db.refresh(category)
    return category


# Transactions
@router.post("/transactions", response_model=FinanceTransactionResponse, status_code=201)
async def create_transaction(
    transaction_data: FinanceTransactionCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Crear transacción financiera (requiere acceso a la facility)"""
    require_facility_access(transaction_data.facility_id)(current_user, db)
    
    transaction = create_finance_transaction(db, transaction_data, current_user.id)
    
    # Cargar nombre de categoría
    category = db.query(FinanceCategory).filter(
        FinanceCategory.id == transaction.category_id
    ).first()
    
    return FinanceTransactionResponse(
        id=transaction.id,
        facility_id=transaction.facility_id,
        category_id=transaction.category_id,
        category_name=category.name if category else "Desconocida",
        type=transaction.type,
        amount=transaction.amount,
        currency=transaction.currency,
        payment_method=transaction.payment_method,
        occurred_on=transaction.occurred_on,
        description=transaction.description,
        attachment_url=transaction.attachment_url,
        created_by_user_id=transaction.created_by_user_id,
        created_at=transaction.created_at
    )


@router.get("/transactions", response_model=List[FinanceTransactionResponse])
async def list_transactions(
    facility_id: UUID = Query(..., description="ID de la sede"),
    from_date: Optional[date] = Query(None, description="Fecha desde (YYYY-MM-DD)"),
    to_date: Optional[date] = Query(None, description="Fecha hasta (YYYY-MM-DD)"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Listar transacciones financieras"""
    require_facility_access(facility_id)(current_user, db)
    
    query = db.query(FinanceTransaction).filter(
        FinanceTransaction.facility_id == facility_id
    )
    
    if from_date:
        query = query.filter(FinanceTransaction.occurred_on >= from_date)
    
    if to_date:
        query = query.filter(FinanceTransaction.occurred_on <= to_date)
    
    transactions = query.order_by(FinanceTransaction.occurred_on.desc()).all()
    
    # Cargar nombres de categorías
    category_ids = {t.category_id for t in transactions}
    categories = {c.id: c.name for c in db.query(FinanceCategory).filter(
        FinanceCategory.id.in_(category_ids)
    ).all()}
    
    return [
        FinanceTransactionResponse(
            id=t.id,
            facility_id=t.facility_id,
            category_id=t.category_id,
            category_name=categories.get(t.category_id, "Desconocida"),
            type=t.type,
            amount=t.amount,
            currency=t.currency,
            payment_method=t.payment_method,
            occurred_on=t.occurred_on,
            description=t.description,
            attachment_url=t.attachment_url,
            created_by_user_id=t.created_by_user_id,
            created_at=t.created_at
        )
        for t in transactions
    ]


# Reports
@router.get("/summary", response_model=FinanceSummaryResponse)
async def get_summary(
    facility_id: UUID = Query(..., description="ID de la sede"),
    month: str = Query(..., description="Mes en formato YYYY-MM"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Obtener resumen financiero mensual de una sede"""
    require_facility_access(facility_id)(current_user, db)
    
    summary = get_finance_summary(db, facility_id, month)
    return summary


@router.get("/summary/group", response_model=FinanceGroupSummaryResponse)
async def get_group_summary_endpoint(
    month: str = Query(..., description="Mes en formato YYYY-MM"),
    current_user: User = Depends(require_role("OWNER")),
    db: Session = Depends(get_db)
):
    """Obtener resumen consolidado del grupo (solo OWNER)"""
    # Obtener owner_group_id
    facilities = db.query(Facility).join(
        Facility.user_accesses
    ).filter(
        Facility.user_accesses.user_id == current_user.id
    ).first()
    
    if not facilities:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No se encontró grupo asociado"
        )
    
    owner_group_id = facilities.owner_group_id
    
    summary = get_group_summary(db, owner_group_id, month)
    return summary
