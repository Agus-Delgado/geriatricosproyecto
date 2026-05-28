from sqlalchemy.orm import Session
from sqlalchemy import func, and_
from uuid import UUID
from datetime import date
from decimal import Decimal
from app.models.finance import FinanceTransaction, FinanceCategory
from app.models.org import Facility
from app.models.audit import AuditLog
from app.schemas.finance import FinanceTransactionCreate
from fastapi import HTTPException, status


def create_finance_transaction(
    db: Session,
    transaction_data: FinanceTransactionCreate,
    user_id: UUID
) -> FinanceTransaction:
    """Crear transacción financiera"""
    # Validar que la categoría existe y pertenece al mismo grupo
    category = db.query(FinanceCategory).filter(
        FinanceCategory.id == transaction_data.category_id
    ).first()
    
    if not category:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Categoría no encontrada"
        )
    
    # Validar que el tipo coincide
    if category.type != transaction_data.type:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="El tipo de transacción no coincide con el tipo de categoría"
        )
    
    # Validar monto positivo
    if transaction_data.amount <= 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="El monto debe ser mayor a cero"
        )
    
    transaction = FinanceTransaction(
        created_by_user_id=user_id,
        **transaction_data.model_dump()
    )
    db.add(transaction)
    db.flush()
    
    # Registrar en audit log
    audit_log = AuditLog(
        facility_id=transaction_data.facility_id,
        actor_user_id=user_id,
        action="CREATE_FINANCE_TRANSACTION",
        entity_type="FinanceTransaction",
        entity_id=transaction.id,
        metadata_json={
            "type": transaction_data.type,
            "amount": str(transaction_data.amount),
            "category_id": str(transaction_data.category_id)
        }
    )
    db.add(audit_log)
    db.commit()
    db.refresh(transaction)
    
    return transaction


def get_finance_summary(
    db: Session,
    facility_id: UUID,
    month: str  # YYYY-MM
) -> dict:
    """Obtener resumen financiero mensual de una sede"""
    # Parsear mes
    year, month_num = map(int, month.split("-"))
    start_date = date(year, month_num, 1)
    
    # Calcular último día del mes
    if month_num == 12:
        end_date = date(year + 1, 1, 1)
    else:
        end_date = date(year, month_num + 1, 1)
    
    # Obtener facility
    facility = db.query(Facility).filter(Facility.id == facility_id).first()
    if not facility:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Sede no encontrada"
        )
    
    # Calcular totales
    income_total = db.query(func.sum(FinanceTransaction.amount)).filter(
        FinanceTransaction.facility_id == facility_id,
        FinanceTransaction.type == "INCOME",
        FinanceTransaction.occurred_on >= start_date,
        FinanceTransaction.occurred_on < end_date
    ).scalar() or Decimal("0")
    
    expense_total = db.query(func.sum(FinanceTransaction.amount)).filter(
        FinanceTransaction.facility_id == facility_id,
        FinanceTransaction.type == "EXPENSE",
        FinanceTransaction.occurred_on >= start_date,
        FinanceTransaction.occurred_on < end_date
    ).scalar() or Decimal("0")
    
    balance = income_total - expense_total
    
    # Top categorías
    top_categories = db.query(
        FinanceCategory.name,
        FinanceTransaction.type,
        func.sum(FinanceTransaction.amount).label("total")
    ).join(
        FinanceTransaction, FinanceTransaction.category_id == FinanceCategory.id
    ).filter(
        FinanceTransaction.facility_id == facility_id,
        FinanceTransaction.occurred_on >= start_date,
        FinanceTransaction.occurred_on < end_date
    ).group_by(
        FinanceCategory.name, FinanceTransaction.type
    ).order_by(
        func.sum(FinanceTransaction.amount).desc()
    ).limit(5).all()
    
    return {
        "facility_id": facility_id,
        "facility_name": facility.name,
        "month": month,
        "total_income": income_total,
        "total_expense": expense_total,
        "balance": balance,
        "top_categories": [
            {"name": cat[0], "type": cat[1], "total": float(cat[2])}
            for cat in top_categories
        ]
    }


def get_group_summary(
    db: Session,
    owner_group_id: UUID,
    month: str  # YYYY-MM
) -> dict:
    """Obtener resumen consolidado del grupo"""
    # Obtener todas las facilities del grupo
    facilities = db.query(Facility).filter(
        Facility.owner_group_id == owner_group_id
    ).all()
    
    facility_summaries = []
    total_income = Decimal("0")
    total_expense = Decimal("0")
    
    for facility in facilities:
        summary = get_finance_summary(db, facility.id, month)
        facility_summaries.append(summary)
        total_income += summary["total_income"]
        total_expense += summary["total_expense"]
    
    return {
        "month": month,
        "facilities": facility_summaries,
        "total_income": total_income,
        "total_expense": total_expense,
        "total_balance": total_income - total_expense
    }
