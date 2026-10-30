"""
SentinelAI — Analysis API Routes
Core prompt analysis endpoints.
"""

from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from sqlalchemy.ext.asyncio import AsyncSession
import csv
import io

from app.db.database import get_db
from app.models.schemas import (
    AnalyzeRequest, AnalyzeResponse, BatchAnalyzeRequest, BatchAnalyzeResponse
)
from app.core.security import get_current_user
from app.services.analysis_service import analyze_prompt
from app.models.orm_models import User

router = APIRouter(prefix="/api/analyze", tags=["Analysis"])


@router.post("/", response_model=AnalyzeResponse)
async def analyze_single(
    payload: AnalyzeRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Analyze a single prompt for security threats."""
    return await analyze_prompt(db, current_user, payload.prompt)


@router.post("/batch", response_model=BatchAnalyzeResponse)
async def analyze_batch(
    payload: BatchAnalyzeRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Analyze multiple prompts in batch."""
    results = []
    malicious_count = 0
    for prompt in payload.prompts:
        result = await analyze_prompt(db, current_user, prompt)
        results.append(result)
        if result.threat.is_malicious:
            malicious_count += 1

    return BatchAnalyzeResponse(
        total=len(results),
        malicious_count=malicious_count,
        results=results,
    )


@router.post("/upload-csv", response_model=BatchAnalyzeResponse)
async def analyze_csv_upload(
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Upload a CSV file with a 'prompt' column for batch analysis."""
    if not file.filename.endswith(".csv"):
        raise HTTPException(status_code=400, detail="Only CSV files are accepted.")

    content = await file.read()
    try:
        reader = csv.DictReader(io.StringIO(content.decode("utf-8")))
        if "prompt" not in (reader.fieldnames or []):
            raise HTTPException(status_code=400, detail="CSV must contain a 'prompt' column.")
        prompts = [row["prompt"] for row in reader if row.get("prompt")]
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"CSV parsing error: {e}")

    if not prompts:
        raise HTTPException(status_code=400, detail="No prompts found in CSV.")
    if len(prompts) > 500:
        raise HTTPException(status_code=400, detail="Maximum 500 prompts per upload.")

    results = []
    malicious_count = 0
    for prompt in prompts:
        result = await analyze_prompt(db, current_user, prompt)
        results.append(result)
        if result.threat.is_malicious:
            malicious_count += 1

    return BatchAnalyzeResponse(
        total=len(results),
        malicious_count=malicious_count,
        results=results,
    )
