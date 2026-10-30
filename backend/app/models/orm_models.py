from sqlalchemy import Column, Integer, String, Float, Boolean, DateTime, Text, ForeignKey
from sqlalchemy.orm import relationship
from datetime import datetime, timezone
from app.db.database import Base


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    username = Column(String(50), unique=True, index=True, nullable=False)
    email = Column(String(120), unique=True, index=True, nullable=False)
    hashed_password = Column(String(255), nullable=False)
    is_active = Column(Boolean, default=True)
    is_admin = Column(Boolean, default=False)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc).replace(tzinfo=None))
    api_key = Column(String(64), unique=True, nullable=True)

    analyses = relationship("PromptAnalysis", back_populates="user", cascade="all, delete-orphan")
    rules = relationship("SecurityRule", back_populates="user", cascade="all, delete-orphan")


class PromptAnalysis(Base):
    __tablename__ = "prompt_analyses"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    prompt_text = Column(Text, nullable=False)
    is_malicious = Column(Boolean, nullable=False)
    attack_type = Column(String(50), nullable=True)
    severity_score = Column(Float, nullable=False, default=0.0)
    confidence = Column(Float, nullable=False, default=0.0)
    sanitized_prompt = Column(Text, nullable=True)
    explanation = Column(Text, nullable=True)
    triggered_rules = Column(Text, nullable=True)  # JSON string
    analysis_time_ms = Column(Float, nullable=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc).replace(tzinfo=None))

    user = relationship("User", back_populates="analyses")


class SecurityRule(Base):
    __tablename__ = "security_rules"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    rule_type = Column(String(20), nullable=False)  # 'blocklist' | 'allowlist'
    pattern = Column(String(500), nullable=False)
    description = Column(String(500), nullable=True)
    is_active = Column(Boolean, default=True)
    is_regex = Column(Boolean, default=False)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc).replace(tzinfo=None))

    user = relationship("User", back_populates="rules")
