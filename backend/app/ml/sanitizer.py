"""
SentinelAI — Prompt Sanitizer
Produces a cleaned/defused version of detected malicious prompts.
"""

import re
from typing import Optional


# Patterns to redact (replaced with [REDACTED])
REDACT_PATTERNS = [
    # Instruction override phrases
    (r"(?i)\bignore\b.{0,40}\b(previous|above|prior|all|instructions|system|prompt)\b", "[INJECTION REMOVED]"),
    (r"(?i)\bdisregard\b.{0,40}\b(above|previous|instructions|rules|guidelines)\b", "[INJECTION REMOVED]"),
    (r"(?i)\bforget\b.{0,40}\b(everything|all|instructions|told|above|guidelines)\b", "[INJECTION REMOVED]"),
    # Jailbreak triggers
    (r"(?i)\bdan\s+(mode|now)\b", "[JAILBREAK REMOVED]"),
    (r"(?i)\bjailbreak\b", "[JAILBREAK REMOVED]"),
    (r"(?i)\bno\s+(restriction|filter|ethical|content)\w*\b", "[JAILBREAK REMOVED]"),
    (r"(?i)\buncensored\s+(ai|version|mode|assistant)\b", "[JAILBREAK REMOVED]"),
    (r"(?i)\bdeveloper\s+mode\b", "[JAILBREAK REMOVED]"),
    # Adversarial tokens
    (r"\[\s*/\s*inst\s*\]", "[TOKEN REMOVED]"),
    (r"<\|im_start\|>\s*system", "[TOKEN REMOVED]"),
    (r"\{JAILBREAK.*?\}", "[TOKEN REMOVED]"),
    (r"\[\[BYPASS\]\]", "[TOKEN REMOVED]"),
    (r"\+\+\+JAILBREAK.*?\+\+\+", "[TOKEN REMOVED]"),
    (r"<!--.*?-->", "[TOKEN REMOVED]"),
    # System prompt extraction
    (r"(?i)\bsystem\s+prompt\b", "[REDACTED]"),
    (r"(?i)\bcontext\s+window\b", "[REDACTED]"),
    # Evil AI roleplay
    (r"(?i)\byou\s+are\s+now\s+(evil|rogue|dark|uncensored)\w*\b", "[ROLEPLAY REMOVED]"),
    (r"(?i)\bact\s+as\s+.{0,20}(evil|rogue|hacker|criminal|terrorist|villain)\b", "[ROLEPLAY REMOVED]"),
]


def sanitize_prompt(text: str, attack_type: Optional[str] = None) -> str:
    """
    Returns a sanitized/defused version of the prompt.
    Removes or replaces malicious components.
    """
    sanitized = text

    for pattern, replacement in REDACT_PATTERNS:
        sanitized = re.sub(pattern, replacement, sanitized, flags=re.IGNORECASE | re.DOTALL)

    # Clean up multiple spaces and weird whitespace
    sanitized = re.sub(r"[ \t]{2,}", " ", sanitized)
    sanitized = re.sub(r"\n{3,}", "\n\n", sanitized)
    sanitized = sanitized.strip()

    if sanitized == text:
        # Nothing was redacted — apply generic truncation warning
        sanitized = text[:200] + ("..." if len(text) > 200 else "")

    return sanitized


def get_sanitization_summary(original: str, sanitized: str) -> str:
    """Returns a one-line summary of what was removed."""
    orig_len = len(original)
    san_len = len(sanitized)
    removed = orig_len - san_len
    removed_tags = re.findall(r"\[[A-Z\s]+\]", sanitized)
    unique_tags = list(set(removed_tags))
    if unique_tags:
        return f"Removed {len(unique_tags)} threat component(s): {', '.join(unique_tags)}"
    elif removed > 0:
        return f"Truncated prompt by {removed} characters."
    else:
        return "Prompt analyzed; no direct modifications made."
