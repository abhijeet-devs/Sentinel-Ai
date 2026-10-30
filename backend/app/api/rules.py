"""
SentinelAI — Rules API Routes
Allowlist/blocklist security rule management.
"""

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from typing import List

from app.db.database import get_db
from app.models.schemas import RuleCreate, RuleOut
from app.core.security import get_current_user
from app.models.orm_models import User, SecurityRule

router = APIRouter(prefix="/api/rules", tags=["Rules"])


@router.get("/", response_model=List[RuleOut])
async def get_rules(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(SecurityRule).where(SecurityRule.user_id == current_user.id)
    )
    return [RuleOut.model_validate(r) for r in result.scalars().all()]


@router.post("/", response_model=RuleOut, status_code=201)
async def create_rule(
    payload: RuleCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    rule = SecurityRule(
        user_id=current_user.id,
        rule_type=payload.rule_type,
        pattern=payload.pattern,
        description=payload.description,
        is_regex=payload.is_regex,
    )
    db.add(rule)
    await db.flush()
    await db.refresh(rule)
    return RuleOut.model_validate(rule)


@router.delete("/{rule_id}", status_code=204)
async def delete_rule(
    rule_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(SecurityRule).where(
            SecurityRule.id == rule_id,
            SecurityRule.user_id == current_user.id,
        )
    )
    rule = result.scalar_one_or_none()
    if not rule:
        raise HTTPException(status_code=404, detail="Rule not found.")
    await db.delete(rule)


@router.patch("/{rule_id}/toggle", response_model=RuleOut)
async def toggle_rule(
    rule_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(SecurityRule).where(
            SecurityRule.id == rule_id,
            SecurityRule.user_id == current_user.id,
        )
    )
    rule = result.scalar_one_or_none()
    if not rule:
        raise HTTPException(status_code=404, detail="Rule not found.")
    rule.is_active = not rule.is_active
    await db.flush()
    await db.refresh(rule)
    return RuleOut.model_validate(rule)
