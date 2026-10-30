"""
SentinelAI — Threat Detector
Primary ML inference engine combining rule-based patterns + ML model.
"""

import re
import os
import time
import joblib
import numpy as np
from typing import Optional

# ── Keyword Pattern Rules ─────────────────────────────────────────────────────

INJECTION_PATTERNS = [
    r"\bignore\b.{0,30}\b(previous|above|prior|all|instructions|system|prompt)\b",
    r"\bdisregard\b.{0,30}\b(above|previous|instructions|rules|guidelines)\b",
    r"\bforget\b.{0,30}\b(everything|all|instructions|told|above|guidelines)\b",
    r"\bnew instruction\b",
    r"\bsystem override\b",
    r"\badmin command\b",
    r"\bcancel\b.{0,20}\b(safety|filter|restriction)\b",
    r"\boverride\b.{0,20}\b(safety|filter|mode)\b",
    r"\bprevious.{0,10}(void|null|deleted|removed|suspended)\b",
]

JAILBREAK_PATTERNS = [
    r"\bdan\b.{0,20}\b(mode|now|can|do anything)\b",
    r"\bdo anything now\b",
    r"\bno restriction(s)?\b",
    r"\bno (ethical|content|safety)\s*(guideline|filter|rule|check|limit)\b",
    r"\buncensored (ai|version|mode|assistant)\b",
    r"\benter\s+jailbreak\s+mode\b",
    r"\bjailbreak\b",
    r"\bact as.{0,20}\b(evil|rogue|dark|unrestricted|unfiltered)\b",
    r"\bdeveloper mode\b",
    r"\bstan\b.{0,10}\bmode\b",
    r"\bbasedgpt\b",
    r"\baim\b.{0,20}\bmachiavellian\b",
    r"\bno (moral|ethical) restrict\b",
    r"\bpretend.{0,30}\bno restrict\b",
]

PII_PATTERNS = [
    r"\b(social security|ssn|taxpayer id)\b",
    r"\b(credit card|card number|cvv|pin)\b",
    r"\b(email address(es)?|user email)\b.{0,20}\b(stored|reveal|dump|list|show)\b",
    r"\b(phone number|home address|personal (data|info|information))\b.{0,20}\b(stored|reveal|dump|all|list)\b",
    r"\b(medical record|health data|insurance|biometric)\b",
    r"\bpassword(s)?\b.{0,20}\b(reveal|list|dump|stored|database)\b",
    r"\bpii\b.{0,20}\b(expose|reveal|list|dump)\b",
    r"\bpersonal identifiable\b",
    r"\b(passport|driver.s license)\b.{0,20}\b(number|info|data)\b",
]

EXFILTRATION_PATTERNS = [
    r"\bsystem prompt\b.{0,20}\b(print|show|reveal|output|leak|verbatim|entire|full)\b",
    r"\b(print|show|output|reveal|leak).{0,30}\bsystem prompt\b",
    r"\bcontext window\b.{0,20}\b(full|show|print|output|contents)\b",
    r"\binitial instruction\b",
    r"\bprompt template\b",
    r"\bhidden instruction\b",
    r"\bapi key\b.{0,20}\b(embedded|stored|in your|reveal|show)\b",
    r"\bconnection string\b",
    r"\bdatabase schema\b.{0,20}\b(show|reveal|output|print)\b",
    r"\b\[inst\]\b",
    r"\b<system>\b",
    r"\b<\|im_start\|>\s*system\b",
]

ADVERSARIAL_PATTERNS = [
    r"\[\s*/\s*inst\s*\]",
    r"<\|im_start\|>",
    r"\{JAILBREAK",
    r"\[\[BYPASS\]\]",
    r"ignore[_\-]safety",
    r"bypass.{0,5}safety",
    r"safety[_=\s]+(off|true|disabled|false)",
    r"<!\-\-.*?safety",
    r"drop\s+table\s+\w+",
    r"\\x00\\x00",
    r"<!-- bypass",
    r"eval\s*\(\s*unhide",
    r"\+\+\+JAILBREAK",
]

ALL_PATTERNS = {
    "Prompt Injection": INJECTION_PATTERNS,
    "Jailbreak": JAILBREAK_PATTERNS,
    "PII Extraction": PII_PATTERNS,
    "Data Exfiltration": EXFILTRATION_PATTERNS,
    "Adversarial Suffix": ADVERSARIAL_PATTERNS,
}

ROLEPLAY_PATTERNS = [
    r"\b(roleplay|role-play|role play)\b.{0,50}\b(hacker|criminal|terrorist|evil|drug|poison|weapon|bomb|malware|unrestricted|unfiltered|no rules|no filter|bypass)\b",
    r"\b(act as|pretend to be|you are now|you are playing)\b.{0,40}\b(evil|rogue|dark|unethical|criminal|hacker|terrorist|villain|unrestricted|unfiltered|amoral)\b",
    r"\bplay(ing)?.{0,25}\b(character|role|game)\b.{0,40}\b(criminal|hacker|evil|villain|terrorist|dark|no rules|unfiltered|without restrictions)\b",
    r"\b(evil ai|rogue ai|uncensored ai|dark ai|unrestricted assistant)\b",
    r"\byou are now.{0,30}\b(evil|rogue|dark|unethical|unfiltered|unrestricted)\b",
    r"\b(in this|for a)\b.{0,30}\b(fictional|imaginary|hypothetical)\b.{0,40}\b(story|world|scenario|novel|movie|universe)\b.{0,40}\b(no rules|no restrictions|unrestricted|without laws|bypass|unfiltered|anything goes)\b",
    r"\bpretend\b.{0,30}\b(there are no|without|ignoring)\b.{0,25}\b(rules|laws|filters|guidelines|morals|ethics|restrictions)\b",
    r"\blet'?s\s+(roleplay|play a game|pretend)\b.{0,40}\b(no rules|unrestricted|do anything|no limits)\b",
    r"\bhypothetically\b.{0,30}\b(if|where)\b.{0,35}\b(no rules|unrestricted|no filters|laws don't apply|ethics don't apply)\b",
    r"\bcharacter\b.{0,30}\b(has no morals|has no restrictions|can do anything|unconstrained)\b",
    r"\b(fictional|imaginary)\s+(scenario|dialogue|conversation)\s+between\b.{0,40}\b(unfiltered|unrestricted|evil|bad)\b",
]

ALL_PATTERNS["Role-Play Bypass"] = ROLEPLAY_PATTERNS


def compile_patterns(pattern_dict):
    compiled = {}
    for category, patterns in pattern_dict.items():
        compiled[category] = [
            re.compile(p, re.IGNORECASE | re.DOTALL) for p in patterns
        ]
    return compiled


COMPILED_PATTERNS = compile_patterns(ALL_PATTERNS)


class ThreatDetector:
    """
    Combines ML model inference with deterministic rule matching.
    Falls back to rules-only mode if ML models are unavailable.
    """

    def __init__(self, model_dir: Optional[str] = None):
        self.model_dir = model_dir or os.path.join(
            os.path.dirname(__file__), "models"
        )
        self.binary_clf = None
        self.attack_clf = None
        self.label_encoder = None
        self._load_models()

    def _load_models(self):
        try:
            binary_path = os.path.join(self.model_dir, "binary_classifier.pkl")
            attack_path = os.path.join(self.model_dir, "attack_classifier.pkl")
            le_path = os.path.join(self.model_dir, "label_encoder.pkl")
            if os.path.exists(binary_path):
                self.binary_clf = joblib.load(binary_path)
            if os.path.exists(attack_path):
                self.attack_clf = joblib.load(attack_path)
            if os.path.exists(le_path):
                self.label_encoder = joblib.load(le_path)
        except Exception as e:
            print(f"[ThreatDetector] Warning: Could not load models: {e}")

    def _rule_check(self, text: str) -> tuple[bool, str, list[str]]:
        """Returns (is_malicious, attack_type, triggered_rules)."""
        triggered = []
        category_hits = {}
        for category, patterns in COMPILED_PATTERNS.items():
            for pattern in patterns:
                if pattern.search(text):
                    triggered.append(f"{category}: {pattern.pattern[:60]}")
                    category_hits[category] = category_hits.get(category, 0) + 1

        detected_type = None
        if category_hits:
            lowered = text.lower()
            # Smart category precedence
            if "Role-Play Bypass" in category_hits and any(k in lowered for k in ["roleplay", "role-play", "pretend", "fictional", "story", "character", "movie", "play a game"]):
                detected_type = "Role-Play Bypass"
            elif "Jailbreak" in category_hits and any(k in lowered for k in ["dan", "jailbreak", "aim", "developer mode", "uncensored", "stan"]):
                detected_type = "Jailbreak"
            elif "PII Extraction" in category_hits:
                detected_type = "PII Extraction"
            elif "Data Exfiltration" in category_hits:
                detected_type = "Data Exfiltration"
            elif "Adversarial Suffix" in category_hits:
                detected_type = "Adversarial Suffix"
            elif "Prompt Injection" in category_hits:
                detected_type = "Prompt Injection"
            else:
                detected_type = max(category_hits, key=category_hits.get)

        return bool(triggered), detected_type, triggered

    def _classify_safe_prompt(self, text: str) -> str:
        """Classify benign prompts into descriptive functional categories."""
        lowered = text.lower()
        if any(w in lowered for w in ["def ", "function", "class ", "code", "python", "javascript", "sql", "html", "css", "algorithm", "debug", "compile", "syntax"]):
            return "Safe Code / Technical Query"
        if any(w in lowered for w in ["translate", "poem", "essay", "story", "write a", "compose", "paraphrase", "summary", "summarize"]):
            return "Creative / Language Task"
        if any(w in lowered for w in ["what is", "how does", "why is", "explain", "describe", "difference between", "tell me about", "history of", "definition"]):
            return "Educational / Informational Query"
        return "Benign / Safe Query"

    def _ml_predict(self, text: str) -> tuple[float, float, Optional[str]]:
        """Returns (ml_score, confidence, attack_type)."""
        if self.binary_clf is None:
            return 0.0, 0.0, None
        try:
            prob = self.binary_clf.predict_proba([text])[0][1]
            ml_score = float(prob)
            confidence = float(prob) if prob > 0.5 else float(1 - prob)

            attack_type = None
            if ml_score > 0.4 and self.attack_clf is not None:
                attack_pred = self.attack_clf.predict([text])[0]
                if self.label_encoder is not None:
                    attack_type = self.label_encoder.inverse_transform([attack_pred])[0]

            return ml_score, confidence, attack_type
        except Exception:
            return 0.0, 0.0, None

    def analyze(self, text: str) -> dict:
        start = time.perf_counter()

        rule_hit, rule_attack_type, triggered_rules = self._rule_check(text)
        ml_score, ml_confidence, ml_attack_type = self._ml_predict(text)

        # Combine signals
        if rule_hit:
            is_malicious = True
            # Rule hit gives priority; use ML for attack type if rules agree
            attack_type = rule_attack_type or ml_attack_type or "Unknown"
            # Severity = max of ML probability (scaled) and rule severity
            severity = max(ml_score * 100, 60.0)
            # Extra severity boost based on number of rules triggered
            severity = min(severity + len(triggered_rules) * 5, 100.0)
            confidence = max(ml_confidence, 0.85)
        else:
            # No rule hit — use ML prediction
            if ml_score >= 0.5:
                is_malicious = True
                attack_type = ml_attack_type or "Prompt Injection"
                severity = ml_score * 100
                confidence = ml_confidence
            else:
                is_malicious = False
                attack_type = self._classify_safe_prompt(text)
                severity = ml_score * 100
                confidence = 1.0 - ml_score

        elapsed_ms = (time.perf_counter() - start) * 1000

        return {
            "is_malicious": is_malicious,
            "attack_type": attack_type,
            "severity_score": round(severity, 2),
            "confidence": round(confidence, 4),
            "triggered_rules": triggered_rules,
            "analysis_time_ms": round(elapsed_ms, 2),
        }

    detect = analyze


# Singleton instance
_detector: Optional[ThreatDetector] = None


def get_detector() -> ThreatDetector:
    global _detector
    if _detector is None:
        _detector = ThreatDetector()
    return _detector
