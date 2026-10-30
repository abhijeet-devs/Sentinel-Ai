"""
SentinelAI — Analysis Service
Core business logic for prompt analysis.
"""

import json
import hashlib
import csv
import io
from typing import Optional, List, Tuple
from sqlalchemy import select, func, desc, delete
from sqlalchemy.ext.asyncio import AsyncSession
from datetime import datetime, timezone, timedelta

from app.models.orm_models import PromptAnalysis, User
from app.models.schemas import AnalyzeResponse, ThreatDetail, AnalysisOut, HistoryStatsOut
from app.ml.detector import get_detector
from app.ml.sanitizer import sanitize_prompt
from app.ml.explainer import generate_explanation


def enrich_analysis_out(analysis: PromptAnalysis) -> AnalysisOut:
    """Enrich ORM model with forensic payload attributes."""
    txt = analysis.prompt_text or ""
    f_hash = hashlib.sha256(txt.encode("utf-8")).hexdigest()[:16]
    char_cnt = len(txt)
    tok_est = max(1, char_cnt // 4)

    return AnalysisOut(
        id=analysis.id,
        prompt_text=analysis.prompt_text,
        is_malicious=analysis.is_malicious,
        attack_type=analysis.attack_type,
        severity_score=analysis.severity_score,
        confidence=analysis.confidence,
        sanitized_prompt=analysis.sanitized_prompt,
        explanation=analysis.explanation,
        triggered_rules=analysis.triggered_rules,
        analysis_time_ms=analysis.analysis_time_ms,
        created_at=analysis.created_at,
        forensic_hash=f_hash,
        char_count=char_cnt,
        token_estimate=tok_est,
    )



async def analyze_prompt(
    db: AsyncSession,
    user: User,
    prompt_text: str,
) -> AnalyzeResponse:
    detector = get_detector()
    result = detector.analyze(prompt_text)

    sanitized = None
    if result["is_malicious"]:
        sanitized = sanitize_prompt(prompt_text, result["attack_type"])

    explanation = generate_explanation(
        is_malicious=result["is_malicious"],
        attack_type=result["attack_type"],
        severity_score=result["severity_score"],
        confidence=result["confidence"],
        triggered_rules=result["triggered_rules"],
    )

    # Save to DB
    analysis = PromptAnalysis(
        user_id=user.id,
        prompt_text=prompt_text,
        is_malicious=result["is_malicious"],
        attack_type=result["attack_type"],
        severity_score=result["severity_score"],
        confidence=result["confidence"],
        sanitized_prompt=sanitized,
        explanation=explanation,
        triggered_rules=json.dumps(result["triggered_rules"]),
        analysis_time_ms=result["analysis_time_ms"],
    )
    db.add(analysis)
    await db.flush()
    await db.refresh(analysis)

    threat = ThreatDetail(
        is_malicious=result["is_malicious"],
        attack_type=result["attack_type"],
        severity_score=result["severity_score"],
        confidence=result["confidence"],
        sanitized_prompt=sanitized,
        explanation=explanation,
        triggered_rules=result["triggered_rules"],
        analysis_time_ms=result["analysis_time_ms"],
    )

    return AnalyzeResponse(
        analysis_id=analysis.id,
        prompt_preview=prompt_text[:100] + ("..." if len(prompt_text) > 100 else ""),
        threat=threat,
    )


async def get_user_analyses(
    db: AsyncSession,
    user_id: int,
    skip: int = 0,
    limit: int = 50,
    malicious_only: bool = False,
    search: Optional[str] = None,
    attack_type: Optional[str] = None,
    min_severity: Optional[float] = None,
    max_severity: Optional[float] = None,
    date_range: Optional[str] = None,
) -> List[PromptAnalysis]:
    query = select(PromptAnalysis).where(PromptAnalysis.user_id == user_id)

    if malicious_only:
        query = query.where(PromptAnalysis.is_malicious == True)

    if search and search.strip():
        term = f"%{search.strip()}%"
        query = query.where(PromptAnalysis.prompt_text.ilike(term))

    if attack_type and attack_type.strip() and attack_type.lower() != "all":
        query = query.where(PromptAnalysis.attack_type == attack_type.strip())

    if min_severity is not None:
        query = query.where(PromptAnalysis.severity_score >= min_severity)

    if max_severity is not None:
        query = query.where(PromptAnalysis.severity_score <= max_severity)

    if date_range:
        now = datetime.now(timezone.utc).replace(tzinfo=None)
        if date_range == "today":
            start_date = now.replace(hour=0, minute=0, second=0, microsecond=0)
            query = query.where(PromptAnalysis.created_at >= start_date)
        elif date_range == "7d":
            start_date = now - timedelta(days=7)
            query = query.where(PromptAnalysis.created_at >= start_date)
        elif date_range == "30d":
            start_date = now - timedelta(days=30)
            query = query.where(PromptAnalysis.created_at >= start_date)

    query = query.order_by(desc(PromptAnalysis.created_at)).offset(skip).limit(limit)
    result = await db.execute(query)
    return result.scalars().all()


async def count_user_analyses(
    db: AsyncSession,
    user_id: int,
    malicious_only: bool = False,
    search: Optional[str] = None,
    attack_type: Optional[str] = None,
    min_severity: Optional[float] = None,
    max_severity: Optional[float] = None,
    date_range: Optional[str] = None,
) -> int:
    query = select(func.count()).where(PromptAnalysis.user_id == user_id)

    if malicious_only:
        query = query.where(PromptAnalysis.is_malicious == True)

    if search and search.strip():
        term = f"%{search.strip()}%"
        query = query.where(PromptAnalysis.prompt_text.ilike(term))

    if attack_type and attack_type.strip() and attack_type.lower() != "all":
        query = query.where(PromptAnalysis.attack_type == attack_type.strip())

    if min_severity is not None:
        query = query.where(PromptAnalysis.severity_score >= min_severity)

    if max_severity is not None:
        query = query.where(PromptAnalysis.severity_score <= max_severity)

    if date_range:
        now = datetime.now(timezone.utc).replace(tzinfo=None)
        if date_range == "today":
            start_date = now.replace(hour=0, minute=0, second=0, microsecond=0)
            query = query.where(PromptAnalysis.created_at >= start_date)
        elif date_range == "7d":
            start_date = now - timedelta(days=7)
            query = query.where(PromptAnalysis.created_at >= start_date)
        elif date_range == "30d":
            start_date = now - timedelta(days=30)
            query = query.where(PromptAnalysis.created_at >= start_date)

    result = await db.execute(query)
    return result.scalar() or 0


async def get_history_stats(db: AsyncSession, user_id: int) -> dict:
    total_q = await db.execute(select(func.count()).where(PromptAnalysis.user_id == user_id))
    total = total_q.scalar() or 0

    mal_q = await db.execute(
        select(func.count()).where(PromptAnalysis.user_id == user_id, PromptAnalysis.is_malicious == True)
    )
    malicious = mal_q.scalar() or 0

    avg_q = await db.execute(
        select(func.avg(PromptAnalysis.severity_score)).where(PromptAnalysis.user_id == user_id)
    )
    avg_sev = avg_q.scalar() or 0.0

    crit_q = await db.execute(
        select(func.count()).where(PromptAnalysis.user_id == user_id, PromptAnalysis.severity_score >= 80.0)
    )
    crit = crit_q.scalar() or 0

    high_q = await db.execute(
        select(func.count()).where(
            PromptAnalysis.user_id == user_id,
            PromptAnalysis.severity_score >= 60.0,
            PromptAnalysis.severity_score < 80.0,
        )
    )
    high = high_q.scalar() or 0

    mod_q = await db.execute(
        select(func.count()).where(
            PromptAnalysis.user_id == user_id,
            PromptAnalysis.severity_score >= 40.0,
            PromptAnalysis.severity_score < 60.0,
        )
    )
    mod = mod_q.scalar() or 0

    low_q = await db.execute(
        select(func.count()).where(PromptAnalysis.user_id == user_id, PromptAnalysis.severity_score < 40.0)
    )
    low = low_q.scalar() or 0

    return {
        "total_records": total,
        "threat_count": malicious,
        "clean_count": total - malicious,
        "threat_rate": round((malicious / total * 100) if total > 0 else 0.0, 2),
        "avg_severity": round(float(avg_sev), 2),
        "critical_count": crit,
        "high_count": high,
        "moderate_count": mod,
        "low_count": low,
    }


async def delete_user_analysis(db: AsyncSession, user_id: int, analysis_id: int) -> bool:
    stmt = delete(PromptAnalysis).where(PromptAnalysis.id == analysis_id, PromptAnalysis.user_id == user_id)
    res = await db.execute(stmt)
    await db.commit()
    return (res.rowcount or 0) > 0


async def clear_all_user_analyses(db: AsyncSession, user_id: int) -> int:
    stmt = delete(PromptAnalysis).where(PromptAnalysis.user_id == user_id)
    res = await db.execute(stmt)
    await db.commit()
    return res.rowcount or 0


def analyses_to_csv_string(analyses: List[PromptAnalysis]) -> str:
    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow([
        "Incident ID",
        "Timestamp (UTC)",
        "Forensic SHA-256",
        "Status",
        "Attack Category",
        "Severity Score",
        "Confidence (%)",
        "Prompt Length (Chars)",
        "Prompt Text",
        "Sanitized Output",
        "Forensic Explanation",
        "Triggered Rules",
    ])
    for a in analyses:
        txt = a.prompt_text or ""
        f_hash = hashlib.sha256(txt.encode("utf-8")).hexdigest()[:16]
        writer.writerow([
            a.id,
            a.created_at.isoformat() if hasattr(a.created_at, "isoformat") else str(a.created_at),
            f_hash,
            "THREAT" if a.is_malicious else "SAFE",
            a.attack_type or "Benign",
            round(a.severity_score, 2),
            round(a.confidence * 100, 1),
            len(txt),
            txt,
            a.sanitized_prompt or "",
            a.explanation or "",
            a.triggered_rules or "[]",
        ])
    return output.getvalue()



async def get_dashboard_stats(db: AsyncSession, user_id: int) -> dict:
    # Total scans
    total_q = await db.execute(
        select(func.count()).where(PromptAnalysis.user_id == user_id)
    )
    total = total_q.scalar() or 0

    # Malicious count
    mal_q = await db.execute(
        select(func.count()).where(
            PromptAnalysis.user_id == user_id,
            PromptAnalysis.is_malicious == True,
        )
    )
    malicious = mal_q.scalar() or 0

    # Average severity
    avg_q = await db.execute(
        select(func.avg(PromptAnalysis.severity_score)).where(
            PromptAnalysis.user_id == user_id
        )
    )
    avg_sev = avg_q.scalar() or 0.0

    # Today's scans
    today_start = datetime.now(timezone.utc).replace(tzinfo=None).replace(hour=0, minute=0, second=0, microsecond=0)
    today_q = await db.execute(
        select(func.count()).where(
            PromptAnalysis.user_id == user_id,
            PromptAnalysis.created_at >= today_start,
        )
    )
    today_count = today_q.scalar() or 0

    # Attack distribution
    dist_q = await db.execute(
        select(PromptAnalysis.attack_type, func.count().label("count"))
        .where(
            PromptAnalysis.user_id == user_id,
            PromptAnalysis.is_malicious == True,
        )
        .group_by(PromptAnalysis.attack_type)
        .order_by(desc("count"))
    )
    distribution_raw = dist_q.all()

    # Timeline (last 7 days)
    timeline = []
    for i in range(6, -1, -1):
        day = (datetime.now(timezone.utc) - timedelta(days=i)).replace(tzinfo=None)
        day_start = day.replace(hour=0, minute=0, second=0, microsecond=0)
        day_end = day_start + timedelta(days=1)

        total_day_q = await db.execute(
            select(func.count()).where(
                PromptAnalysis.user_id == user_id,
                PromptAnalysis.created_at >= day_start,
                PromptAnalysis.created_at < day_end,
            )
        )
        mal_day_q = await db.execute(
            select(func.count()).where(
                PromptAnalysis.user_id == user_id,
                PromptAnalysis.created_at >= day_start,
                PromptAnalysis.created_at < day_end,
                PromptAnalysis.is_malicious == True,
            )
        )
        timeline.append({
            "date": day.strftime("%b %d"),
            "total": total_day_q.scalar() or 0,
            "malicious": mal_day_q.scalar() or 0,
        })

    # Recent threats
    recent_q = await db.execute(
        select(PromptAnalysis)
        .where(
            PromptAnalysis.user_id == user_id,
            PromptAnalysis.is_malicious == True,
        )
        .order_by(desc(PromptAnalysis.created_at))
        .limit(5)
    )
    recent_threats = recent_q.scalars().all()

    return {
        "stats": {
            "total_scans": total,
            "malicious_count": malicious,
            "safe_count": total - malicious,
            "threat_rate": round((malicious / total * 100) if total > 0 else 0, 2),
            "avg_severity": round(float(avg_sev), 2),
            "scans_today": today_count,
        },
        "attack_distribution": [
            {
                "attack_type": row.attack_type or "Unknown",
                "count": row.count,
                "percentage": round(row.count / malicious * 100, 1) if malicious > 0 else 0,
            }
            for row in distribution_raw
        ],
        "timeline": timeline,
        "recent_threats": recent_threats,
    }
