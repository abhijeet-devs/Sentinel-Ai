"""
SentinelAI — History & Forensic Audit API Routes
Prompt analysis history, multi-faceted filtering, forensic exports, and record management.
"""

from fastapi import APIRouter, Depends, Query, HTTPException, Response
from fastapi.responses import JSONResponse, Response as PlainResponse
from sqlalchemy.ext.asyncio import AsyncSession
from typing import List, Optional
from datetime import datetime, timezone

from app.db.database import get_db
from app.models.schemas import AnalysisOut, HistoryStatsOut
from app.core.security import get_current_user
from app.services.analysis_service import (
    get_user_analyses,
    count_user_analyses,
    enrich_analysis_out,
    get_history_stats,
    delete_user_analysis,
    clear_all_user_analyses,
    analyses_to_csv_string,
)
from app.models.orm_models import User

router = APIRouter(prefix="/api/history", tags=["History"])


@router.get("/", response_model=List[AnalysisOut])
async def get_history(
    response: Response,
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=200),
    malicious_only: bool = Query(False),
    search: Optional[str] = Query(None),
    attack_type: Optional[str] = Query(None),
    min_severity: Optional[float] = Query(None),
    max_severity: Optional[float] = Query(None),
    date_range: Optional[str] = Query(None),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Get paginated, enriched prompt analysis history with full-text search,
    threat category filter, severity boundaries, and time range.
    """
    analyses = await get_user_analyses(
        db,
        current_user.id,
        skip=skip,
        limit=limit,
        malicious_only=malicious_only,
        search=search,
        attack_type=attack_type,
        min_severity=min_severity,
        max_severity=max_severity,
        date_range=date_range,
    )
    total_count = await count_user_analyses(
        db,
        current_user.id,
        malicious_only=malicious_only,
        search=search,
        attack_type=attack_type,
        min_severity=min_severity,
        max_severity=max_severity,
        date_range=date_range,
    )

    # Expose pagination and filter headers for client consumption
    response.headers["X-Total-Count"] = str(total_count)
    response.headers["X-Page-Size"] = str(limit)
    response.headers["X-Current-Skip"] = str(skip)

    return [enrich_analysis_out(a) for a in analyses]


@router.get("/stats", response_model=HistoryStatsOut)
async def get_stats(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Retrieve aggregate statistics for user's historical prompt scans."""
    stats = await get_history_stats(db, current_user.id)
    return HistoryStatsOut(**stats)


@router.get("/export")
@router.get("/export/json")
async def export_history_json(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Export complete forensic history as JSON."""
    analyses = await get_user_analyses(db, current_user.id, limit=2000)
    data = [enrich_analysis_out(a).model_dump(mode="json") for a in analyses]
    return JSONResponse(
        content={
            "service": "SentinelAI Forensic Audit Export",
            "user": current_user.username,
            "exported_at": datetime.now(timezone.utc).isoformat(),
            "record_count": len(data),
            "data": data,
        },
        headers={"Content-Disposition": f"attachment; filename=sentinelai_forensic_{datetime.now(timezone.utc).strftime('%Y%m%d_%H%M%S')}.json"},
    )


@router.get("/export/csv")
async def export_history_csv(
    malicious_only: bool = Query(False),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Export history as a structured CSV audit sheet for SIEM/Excel."""
    analyses = await get_user_analyses(db, current_user.id, limit=2000, malicious_only=malicious_only)
    csv_content = analyses_to_csv_string(analyses)
    filename = f"sentinelai_audit_{datetime.now(timezone.utc).strftime('%Y%m%d_%H%M%S')}.csv"
    return PlainResponse(
        content=csv_content,
        media_type="text/csv",
        headers={"Content-Disposition": f"attachment; filename={filename}"},
    )


@router.delete("")
@router.delete("/")
async def clear_all_history(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Clear all analysis history for the authenticated user."""
    count = await clear_all_user_analyses(db, current_user.id)
    return {"status": "success", "message": f"Purged {count} incident records from audit log."}


@router.delete("/{analysis_id}")
async def delete_single_history(
    analysis_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Delete a single analysis record from history."""
    deleted = await delete_user_analysis(db, current_user.id, analysis_id)
    if not deleted:
        raise HTTPException(status_code=404, detail="Incident record not found.")
    return {"status": "success", "message": f"Record #{analysis_id} deleted."}
