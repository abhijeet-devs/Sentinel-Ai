from pydantic import BaseModel, EmailStr, Field, ConfigDict
from typing import Optional, List
from datetime import datetime


# ── Auth Schemas ──────────────────────────────────────────────────────────────

class UserCreate(BaseModel):
    username: str = Field(..., min_length=3, max_length=50)
    email: EmailStr
    password: str = Field(..., min_length=6)


class UserLogin(BaseModel):
    username: str
    password: str


class UserOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    username: str
    email: str
    is_admin: bool
    created_at: datetime
    api_key: Optional[str] = None


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserOut


# ── Analysis Schemas ──────────────────────────────────────────────────────────

class AnalyzeRequest(BaseModel):
    prompt: str = Field(..., min_length=1, max_length=10000)


class BatchAnalyzeRequest(BaseModel):
    prompts: List[str] = Field(..., min_items=1, max_items=100)


class ThreatDetail(BaseModel):
    is_malicious: bool
    attack_type: Optional[str]
    severity_score: float  # 0-100
    confidence: float       # 0-1
    sanitized_prompt: Optional[str]
    explanation: str
    triggered_rules: List[str]
    analysis_time_ms: float


class AnalysisOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    prompt_text: str
    is_malicious: bool
    attack_type: Optional[str]
    severity_score: float
    confidence: float
    sanitized_prompt: Optional[str]
    explanation: Optional[str]
    triggered_rules: Optional[str]
    analysis_time_ms: Optional[float]
    created_at: datetime
    forensic_hash: Optional[str] = None
    char_count: Optional[int] = None
    token_estimate: Optional[int] = None


class HistoryStatsOut(BaseModel):
    total_records: int
    threat_count: int
    clean_count: int
    threat_rate: float
    avg_severity: float
    critical_count: int
    high_count: int
    moderate_count: int
    low_count: int



class AnalyzeResponse(BaseModel):
    analysis_id: int
    prompt_preview: str
    threat: ThreatDetail


class BatchAnalyzeResponse(BaseModel):
    total: int
    malicious_count: int
    results: List[AnalyzeResponse]


# ── Dashboard Schemas ─────────────────────────────────────────────────────────

class DashboardStats(BaseModel):
    total_scans: int
    malicious_count: int
    safe_count: int
    threat_rate: float
    avg_severity: float
    scans_today: int


class AttackDistribution(BaseModel):
    attack_type: str
    count: int
    percentage: float


class TimelinePoint(BaseModel):
    date: str
    total: int
    malicious: int


class DashboardResponse(BaseModel):
    stats: DashboardStats
    attack_distribution: List[AttackDistribution]
    timeline: List[TimelinePoint]
    recent_threats: List[AnalysisOut]


# ── Security Rule Schemas ─────────────────────────────────────────────────────

class RuleCreate(BaseModel):
    rule_type: str = Field(..., pattern="^(blocklist|allowlist)$")
    pattern: str = Field(..., min_length=1, max_length=500)
    description: Optional[str] = None
    is_regex: bool = False


class RuleOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    rule_type: str
    pattern: str
    description: Optional[str]
    is_active: bool
    is_regex: bool
    created_at: datetime
