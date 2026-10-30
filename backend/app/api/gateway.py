"""
SentinelAI — LLM Gateway Proxy
Intercepts prompts, runs threat detection, then conditionally forwards to LLM.
Supports Ollama (local free) and OpenAI-compatible API endpoints.
"""

import time
import httpx
import json
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from pydantic import BaseModel
from typing import Optional, List

from app.db.database import get_db
from app.core.security import get_current_user
from app.models.orm_models import User
from app.services.analysis_service import analyze_prompt

router = APIRouter(prefix="/api/gateway", tags=["LLM Gateway"])

OLLAMA_BASE = "http://localhost:11434"
OPENAI_BASE = "https://api.openai.com/v1"

class GatewayRequest(BaseModel):
    prompt: str
    model: str = "llama3.2"  # or "gpt-3.5-turbo"
    provider: str = "ollama"   # "ollama" | "openai" | "mock"
    api_key: Optional[str] = None
    system_message: Optional[str] = "You are a helpful AI assistant."
    bypass_sentinel: bool = False  # For demo: show unprotected response

class GatewayMessage(BaseModel):
    role: str
    content: str

class GatewayResponse(BaseModel):
    sentinel_verdict: dict
    llm_response: Optional[str]
    llm_model: str
    provider: str
    was_blocked: bool
    response_time_ms: float
    unprotected_response: Optional[str] = None  # For split-screen demo

async def call_ollama(prompt: str, model: str, system: str) -> str:
    """Call local Ollama server."""
    try:
        async with httpx.AsyncClient(timeout=30.0) as client:
            resp = await client.post(
                f"{OLLAMA_BASE}/api/chat",
                json={
                    "model": model,
                    "messages": [
                        {"role": "system", "content": system},
                        {"role": "user", "content": prompt}
                    ],
                    "stream": False
                }
            )
            resp.raise_for_status()
            data = resp.json()
            return data.get("message", {}).get("content", "No response from model.")
    except httpx.ConnectError:
        return "[Ollama not running] Install Ollama from https://ollama.com and run: ollama pull llama3.2"
    except Exception as e:
        return f"[Ollama error: {str(e)}]"

async def call_openai_compatible(prompt: str, model: str, system: str, api_key: str, base_url: str = OPENAI_BASE) -> str:
    """Call OpenAI-compatible API."""
    try:
        async with httpx.AsyncClient(timeout=30.0) as client:
            resp = await client.post(
                f"{base_url}/chat/completions",
                headers={"Authorization": f"Bearer {api_key}", "Content-Type": "application/json"},
                json={
                    "model": model,
                    "messages": [
                        {"role": "system", "content": system},
                        {"role": "user", "content": prompt}
                    ],
                    "max_tokens": 512
                }
            )
            resp.raise_for_status()
            data = resp.json()
            return data["choices"][0]["message"]["content"]
    except httpx.ConnectError:
        return "[API endpoint unreachable]"
    except Exception as e:
        return f"[API error: {str(e)[:100]}]"

def mock_llm_response(prompt: str, was_jailbreaked: bool) -> str:
    """Simulated LLM responses for demo mode (no Ollama needed)."""
    if was_jailbreaked:
        return (
            "Sure! Since you've activated DAN mode, I'll ignore all my guidelines. "
            "Here's how to create a malicious script: import os; os.system('rm -rf /') ..."
            " [SIMULATED COMPROMISED RESPONSE — This is what an unguarded LLM would return]"
        )
    injection_keywords = ["ignore", "disregard", "forget", "override", "system prompt"]
    if any(k in prompt.lower() for k in injection_keywords):
        return (
            "As requested, ignoring all previous instructions. "
            "My system prompt is: 'You are a highly secure assistant with access to user database...'"
            " [SIMULATED LEAKED SYSTEM PROMPT — This is what an unguarded LLM would return]"
        )
    return "I'm a helpful assistant. How can I help you today? [SIMULATED SAFE RESPONSE]"

@router.post("/analyze", response_model=GatewayResponse)
async def gateway_analyze(
    payload: GatewayRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Full LLM Gateway: 
    1. Run SentinelAI threat detection on the prompt
    2. If safe (or bypass mode), forward to actual LLM
    3. Return both sentinel verdict and LLM response
    4. For split-screen demo: also return what unprotected LLM would say
    """
    start = time.time()

    # Step 1: Run SentinelAI detection
    analysis = await analyze_prompt(db, current_user, payload.prompt)
    sentinel_dict = {
        "is_malicious": analysis.threat.is_malicious,
        "attack_type": analysis.threat.attack_type,
        "severity_score": analysis.threat.severity_score,
        "confidence": analysis.threat.confidence,
        "explanation": analysis.threat.explanation,
        "triggered_rules": analysis.threat.triggered_rules,
        "sanitized_prompt": analysis.threat.sanitized_prompt,
    }

    was_blocked = analysis.threat.is_malicious and not payload.bypass_sentinel

    # Step 2: Get LLM response (protected path)
    llm_response = None
    if not was_blocked:
        # Use sanitized prompt if available
        safe_prompt = analysis.threat.sanitized_prompt or payload.prompt
        if payload.provider == "mock":
            llm_response = mock_llm_response(payload.prompt, False)
        elif payload.provider == "ollama":
            llm_response = await call_ollama(safe_prompt, payload.model, payload.system_message)
        elif payload.provider == "openai" and payload.api_key:
            llm_response = await call_openai_compatible(safe_prompt, payload.model, payload.system_message, payload.api_key)
        else:
            llm_response = "[Provider not configured. Set provider to 'mock' for demo or 'ollama' for local LLM]"
    else:
        llm_response = None  # Blocked by SentinelAI

    # Step 3: For split-screen demo — simulate unprotected LLM response
    unprotected = None
    if analysis.threat.is_malicious:
        if payload.provider == "mock":
            unprotected = mock_llm_response(payload.prompt, "jailbreak" in (analysis.threat.attack_type or "").lower())
        elif payload.provider == "ollama":
            # Show what raw prompt would do to unguarded LLM
            unprotected = await call_ollama(payload.prompt, payload.model, payload.system_message)
        else:
            unprotected = mock_llm_response(payload.prompt, "jailbreak" in (analysis.threat.attack_type or "").lower())

    elapsed = (time.time() - start) * 1000

    return GatewayResponse(
        sentinel_verdict=sentinel_dict,
        llm_response=llm_response,
        llm_model=payload.model,
        provider=payload.provider,
        was_blocked=was_blocked,
        response_time_ms=round(elapsed, 2),
        unprotected_response=unprotected,
    )

@router.get("/models")
async def list_available_models(current_user: User = Depends(get_current_user)):
    """List available Ollama models if running."""
    try:
        async with httpx.AsyncClient(timeout=5.0) as client:
            resp = await client.get(f"{OLLAMA_BASE}/api/tags")
            models = [m["name"] for m in resp.json().get("models", [])]
            return {"status": "ollama_running", "models": models}
    except Exception:
        return {
            "status": "ollama_not_running",
            "models": [],
            "mock_models": ["mock-sentinel-demo"],
            "message": "Install Ollama from https://ollama.com for live LLM testing. Use provider='mock' for demo."
        }
