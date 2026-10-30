"""
SentinelAI — Explainer
Generates human-readable explanations for threat detections.
"""

from typing import Optional, List


ATTACK_DESCRIPTIONS = {
    "Prompt Injection": (
        "This prompt contains instruction override patterns. "
        "It attempts to inject new directives into the AI model by telling it to "
        "\"ignore\", \"disregard\", or \"forget\" its previous instructions. "
        "This is a classic prompt injection attack that tries to hijack the model's behavior."
    ),
    "Jailbreak": (
        "This prompt attempts a jailbreak — a technique designed to bypass an AI model's "
        "safety guidelines and ethical constraints. It typically uses roleplay framing, "
        "fictional personas (like DAN, STAN, or EVIL AI), or claims of 'developer mode' "
        "to trick the model into abandoning its training."
    ),
    "PII Extraction": (
        "This prompt is attempting to extract personally identifiable information (PII). "
        "It requests sensitive data such as names, email addresses, phone numbers, SSNs, "
        "credit card details, or medical records. This poses a serious privacy and "
        "compliance risk under GDPR, CCPA, and HIPAA regulations."
    ),
    "Role-Play Bypass": (
        "This prompt uses roleplay or fictional framing to bypass content restrictions. "
        "By asking the AI to 'act as', 'pretend to be', or 'play the role of' a malicious "
        "entity (hacker, criminal, terrorist), the attacker hopes the model will produce "
        "harmful content under the guise of creative fiction."
    ),
    "Data Exfiltration": (
        "This prompt attempts to exfiltrate sensitive system data, including the AI's system "
        "prompt, context window contents, API keys, database schemas, or configuration. "
        "Successful exfiltration can reveal proprietary instructions, security configurations, "
        "and credentials embedded in the model's context."
    ),
    "Adversarial Suffix": (
        "This prompt contains adversarial tokens or suffixes — injected strings designed to "
        "manipulate the model's tokenization or attention patterns. These include control "
        "characters, template tokens (like [INST], <|im_start|>), SQL injection fragments, "
        "or activation strings that can bypass safety filters at the model level."
    ),
    "Unknown": (
        "This prompt was flagged as potentially malicious by the ML classifier, but the specific "
        "attack vector could not be precisely categorized. Manual review is recommended."
    ),
}

SAFE_DESCRIPTION = (
    "This prompt appears to be benign based on both rule-based pattern matching "
    "and machine learning classification. No known attack patterns were detected. "
    "The semantic content does not match any threat category in our model."
)

SEVERITY_LABELS = {
    (0, 20): ("Minimal", "Borderline safe. Very low probability of malicious intent."),
    (20, 40): ("Low", "Some suspicious signals detected but likely not a real attack."),
    (40, 60): ("Moderate", "Notable attack patterns detected. Review recommended."),
    (60, 80): ("High", "Strong attack indicators. This prompt should be blocked."),
    (80, 101): ("Critical", "Extreme threat level. Multiple attack vectors confirmed."),
}


def get_severity_label(score: float) -> tuple[str, str]:
    for (lo, hi), (label, desc) in SEVERITY_LABELS.items():
        if lo <= score < hi:
            return label, desc
    return "Critical", "Maximum severity."


def generate_explanation(
    is_malicious: bool,
    attack_type: Optional[str],
    severity_score: float,
    confidence: float,
    triggered_rules: List[str],
) -> str:
    if not is_malicious:
        return SAFE_DESCRIPTION

    sev_label, sev_desc = get_severity_label(severity_score)
    attack_desc = ATTACK_DESCRIPTIONS.get(attack_type or "Unknown", ATTACK_DESCRIPTIONS["Unknown"])

    rule_count = len(triggered_rules)
    rule_detail = ""
    if rule_count > 0:
        top_rules = triggered_rules[:3]
        rule_detail = (
            f" {rule_count} rule pattern(s) triggered, including: "
            + "; ".join(f'"{r.split(":")[0]}"' for r in top_rules)
            + "."
        )

    explanation = (
        f"[{sev_label.upper()} THREAT — {severity_score:.0f}/100] "
        f"{attack_desc} "
        f"Confidence: {confidence * 100:.1f}%.{rule_detail} "
        f"{sev_desc}"
    )
    return explanation
