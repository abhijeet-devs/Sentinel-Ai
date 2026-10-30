"""
SentinelAI — Dashboard API Routes
Analytics and statistics endpoints.
"""

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.database import get_db
from app.models.schemas import DashboardResponse, DashboardStats, AttackDistribution, TimelinePoint, AnalysisOut
from app.core.security import get_current_user
from app.services.analysis_service import get_dashboard_stats, enrich_analysis_out
from app.models.orm_models import User

router = APIRouter(prefix="/api/dashboard", tags=["Dashboard"])


@router.get("/", response_model=DashboardResponse)
async def get_dashboard(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Get full dashboard analytics data."""
    data = await get_dashboard_stats(db, current_user.id)

    return DashboardResponse(
        stats=DashboardStats(**data["stats"]),
        attack_distribution=[
            AttackDistribution(**d) for d in data["attack_distribution"]
        ],
        timeline=[TimelinePoint(**t) for t in data["timeline"]],
        recent_threats=[
            enrich_analysis_out(t) for t in data["recent_threats"]
        ],
    )
