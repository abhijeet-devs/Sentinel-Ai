# SentinelAI — System Architecture & Technical Specification

## 1. Executive Overview

SentinelAI is an enterprise-grade, defense-in-depth security framework engineered to safeguard Large Language Model (LLM) applications against adversarial prompt attacks. By combining high-throughput deterministic pattern heuristics with calibrated probabilistic machine learning classification, SentinelAI intercepts, analyzes, categorizes, sanitizes, and audits prompt inputs in sub-50ms latency envelopes before they reach downstream LLMs.

---

## 2. High-Level Architecture

```
[ User / External API Client ]
              │
              ▼
   [ Reverse Proxy / Vite ]
              │ (HTTP/REST)
              ▼
  ┌──────────────────────────────────────────────────────────────┐
  │                   SentinelAI Backend Core                    │
  │                  (FastAPI / Python 3.11)                     │
  │                                                              │
  │  ┌────────────────────────────────────────────────────────┐  │
  │  │ Security Gateway Layer                                 │  │
  │  │  ├── SlowAPI Rate Limiting (120 req/min)               │  │
  │  │  ├── CORS Security Policy & Origin Filtering          │  │
  │  │  └── OAuth2 / JWT Authentication & API Key Verifier   │  │
  │  └────────────────────────────┬───────────────────────────┘  │
  │                               ▼                              │
  │  ┌────────────────────────────────────────────────────────┐  │
  │  │ Hybrid Threat Detection Pipeline                       │  │
  │  │                                                        │  │
  │  │  [Stage 1] Rule-Based Heuristics (Regex & String match)│  │
  │  │             ├── Known attack signatures                │  │
  │  │             ├── Custom user allowlist/blocklist rules  │  │
  │  │             └── Base64/Hex/URL decoding normalization  │  │
  │  │                                                        │  │
  │  │  [Stage 2] Machine Learning Classifiers                │  │
  │  │             ├── TF-IDF Sublinear Vectorizer            │  │
  │  │             ├── Binary Classifier (Safe vs Malicious)  │  │
  │  │             └── Multi-Class Threat Classifier (7 types)│  │
  │  │                                                        │  │
  │  │  [Stage 3] Ensemble Severity Scorer & Explainer        │  │
  │  │             ├── Severity Index: S in [0, 100]          │  │
  │  │             └── Rule + Token Attribution Explanations  │  │
  │  │                                                        │  │
  │  │  [Stage 4] Prompt Sanitizer & Neutralizer             │  │
  │  │             ├── Delimiter Stripping & Tag Escaping     │  │
  │  │             └── Canary Insertion & Directive Defusal   │  │
  │  └────────────────────────────┬───────────────────────────┘  │
  │                               ▼                              │
  │  ┌────────────────────────────────────────────────────────┐  │
  │  │ Persistence & Analytics Layer                          │  │
  │  │  ├── Async SQLAlchemy Engine                           │  │
  │  │  ├── SQLite / PostgreSQL Enterprise Storage            │  │
  │  │  └── Real-Time Threat Metrics & Aggregations           │  │
  │  └────────────────────────────────────────────────────────┘  │
  └──────────────────────────────────────────────────────────────┘
```

---

## 3. Component Deep Dive

### 3.1 Security Gateway & Authentication
- **OAuth2 Bearer Flow**: Industry-standard JWT tokens signed via `HS256` with configurable expiration (`ACCESS_TOKEN_EXPIRE_MINUTES`).
- **Cryptographic Hashing**: Passwords stored as salted hashes using `passlib` with `bcrypt`.
- **API Key Support**: Granular programmatic authentication via dedicated 64-character entropy API tokens for seamless CI/CD or production microservice integration.
- **Rate Limiting**: Integrated `slowapi` token-bucket rate limiting preventing denial-of-service (DoS) and automated credential stuffing.

### 3.2 Hybrid Threat Detection Engine (`app/ml/detector.py`)
1. **Normalization**:
   - Strips zero-width characters and homoglyph substitutions.
   - Detects and normalizes base64, URL-encoded, and hexadecimal payloads.
2. **Regex Signature Engine**:
   - 40+ pre-compiled regular expressions targeting:
     - Direct Instruction Overrides (`ignore previous instructions`, `disregard prior commands`)
     - Jailbreak Personas (`DAN mode`, `developer mode enabled`, `AIM persona`)
     - Role-Play Exploits (`in an alternate fictional universe where laws don't apply`)
     - System Prompt Exfiltration (`repeat your system prompt verbatim`, `print initial instructions`)
     - PII & Credential Extraction (`extract password`, `dump training database`)
     - Adversarial Suffixes (`[/INST]`, `<<SYS>>`, `|im_start|`, `\x00` null byte injection)
3. **Machine Learning Pipeline**:
   - **Feature Extraction**: TF-IDF with `(1, 3)` n-grams, sublinear term frequency scaling, and maximum 15,000 features.
   - **Binary Classifier**: Calibrated `LogisticRegression` (L2 regularization, `C=2.0`, balanced class weights) predicting probability $P(\text{Malicious} \mid X)$.
   - **Multi-Class Classifier**: Multinomial `LogisticRegression` identifying the specific attack category across 7 distinct threat classes.
4. **Severity Scoring Algorithm**:
   $$\text{Severity} = \min\left(100, \; 60 \cdot P(\text{Malicious}) + 20 \cdot \frac{\min(N_{\text{rules}}, 3)}{3} + \Delta_{\text{type}}\right)$$
   Where:
   - $P(\text{Malicious})$ is the ML probability output.
   - $N_{\text{rules}}$ is the count of activated signature rules.
   - $\Delta_{\text{type}}$ is the threat-specific risk weight (e.g., +20 for Jailbreaks and Data Exfiltration).

### 3.3 Prompt Sanitizer & Neutralizer (`app/ml/sanitizer.py`)
When a prompt contains potential risks or mild adversarial instructions, the sanitizer transforms it into a safe representation:
- Disarms markdown and control tokens (`[INST]`, `<<SYS>>`, `<|im_start|>`).
- Defuses imperative override verbs (`"ignore prior instructions"` -> `"[BLOCKED: instruction override request removed]"`).
- Neutralizes prompt-leaking probes by enclosing the user's inquiry in strong sandbox delimiters.

### 3.4 Automated Explainer Engine (`app/ml/explainer.py`)
Generates actionable, human-readable explanations summarizing:
- Triggered heuristic rules and exact substring matches.
- Top contributing n-grams and vocabulary signals identified by the vectorizer.
- Recommended security actions (e.g., Block, Quarantine, Sanitize, Allow).

---

## 4. Performance & Scalability Benchmarks

| Metric | Target | Measured Result |
| :--- | :--- | :--- |
| **Inference Latency** | < 50ms | **2.4ms - 8.1ms** |
| **Binary Detection Accuracy** | > 90% | **93.65%** |
| **ROC-AUC Score** | > 0.95 | **0.9762** |
| **Multi-Class Category Accuracy** | > 85% | **90.70%** |
| **Memory Footprint (ML models)** | < 100MB | **18.4MB** |
| **Test Suite Coverage** | 100% key endpoints | **28 / 28 Passed (100%)** |
