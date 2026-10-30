# SentinelAI — Intelligent Prompt Detection & Defence Framework
### Final Year B.Tech Capstone Project

[![Python 3.11](https://img.shields.io/badge/Python-3.11-blue.svg)](https://www.python.org/)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.111.0-009688.svg)](https://fastapi.tiangolo.com/)
[![React 19](https://img.shields.io/badge/React-19.0-61dafb.svg)](https://react.dev/)
[![Scikit-Learn](https://img.shields.io/badge/Scikit--Learn-1.4.2-F7931E.svg)](https://scikit-learn.org/)
[![Vite](https://img.shields.io/badge/Vite-8.3.4-646CFF.svg)](https://vitejs.dev/)
[![Tests](https://img.shields.io/badge/Tests-38%20Passed%20(100%25)-success.svg)]()
[![Docker](https://img.shields.io/badge/Docker-Ready-2496ED.svg)](docker-compose.yml)
[![License](https://img.shields.io/badge/License-MIT-purple.svg)](LICENSE)

SentinelAI is an advanced, enterprise-grade, end-to-end security framework engineered to safeguard Large Language Models (LLMs) against prompt injection attacks, jailbreaks, PII harvesting, data exfiltration, and adversarial suffixes.

Built as an inline security gateway, SentinelAI inspects incoming prompt payloads using a **hybrid detection pipeline** that pairs deterministic heuristic signature matching with trained probabilistic machine learning classifiers. It delivers sub-10ms response times, calibrated severity ratings, automated prompt defusing, an adversarial red-teaming simulator, a live split-screen LLM gateway playground, and a comprehensive cybersecurity analyst dashboard.

---

## 🌟 Key Features

- **⚡ Sub-10ms Hybrid Threat Detection**: Combines 40+ deterministic regex signature heuristics with sublinear TF-IDF vectorization and Logistic Regression ML models.
- **🎯 7-Class Attack Categorization**:
  1. Safe Prompts
  2. Direct Prompt Injection (instruction overrides)
  3. Jailbreak Personas (DAN mode, AIM, simulated unrestricted bots)
  4. PII Extraction (harvesting credentials, emails, personal records)
  5. Role-Play Bypass (fictional worlds suspending safety rules)
  6. Data Exfiltration (coercing models to reveal internal system prompts)
  7. Adversarial Suffixes (special instruction tokens like `[/INST]`, `<<SYS>>`)
- **🔗 Live LLM Gateway Playground (Split-Screen Demo)**:
  - Interactive comparison: **WITHOUT SentinelAI** (shows raw LLM getting compromised) vs. **WITH SentinelAI** (threat detected, blocked/sanitized, LLM kept safe).
  - Supports local free **Ollama** models (`llama3.2`, `mistral`), OpenAI API, and zero-setup **Mock Demo Mode**.
- **⚔️ Automated Adversarial Red-Team Generator**:
  - Automatically mutates seed attack prompts using 9 evasion techniques: Leetspeak substitution, Base64 encoding, Zero-width space injection, Unicode homoglyphs, Role-play fictional wrappers, Word splitting, and Adversarial suffix injection.
  - Generates vulnerability resistance reports and security hardening recommendations.
- **📊 Benchmark Comparison Study**:
  - Interactive multi-dimensional radar charts and comparison matrix evaluating SentinelAI against **LLM-as-a-Judge (GPT-4o)**, **Keyword Matching**, **Llama Guard 2**, and **NeMo Guardrails**.
  - Proves **315× lower latency** (3.8ms vs 1200ms) and **zero operational cost** at 93.65% accuracy.
- **📑 Forensic PDF Security Audit Report Generator**:
  - One-click export of branded, forensic incident reports built with ReportLab, featuring executive summaries, severity badges, and incident records.
- **🛡️ Real-Time Prompt Sanitizer**: Neutralizes malicious imperative triggers and strips instruction override tags while preserving valid user intent.
- **🧠 XAI Explainability Engine**: Automatically breaks down why a prompt was flagged, listing triggered rules and salient token attributions.
- **📊 Cybersecurity SOC Dashboard**: Live threat telemetry, 7-day attack timeline graphs, category distribution donut charts, and recent threat event feeds.
- **⚙️ Custom Policy Management**: Dynamically configure custom blocklists and allowlists with regex and exact-string pattern support.
- **🔐 Enterprise DevSecOps**: JWT Bearer token authentication, API keys for headless microservice integration, and SlowAPI rate limiting (120 req/min).

---

## 🏗️ System Architecture

```
User / Microservice Client
           │
           ▼
┌──────────────────────────────────────────────────────────────┐
│                    SentinelAI Gateway Layer                  │
│       • JWT / API Key Auth     • Rate Limiting (SlowAPI)     │
└──────────────────────────────┬───────────────────────────────┘
                               │
                               ▼
┌──────────────────────────────────────────────────────────────┐
│                  Hybrid Threat Detection Engine              │
│                                                              │
│  [ Heuristic Layer ]         [ Machine Learning Layer ]      │
│  • 40+ Regex Rules           • TF-IDF (1,3)-grams            │
│  • Obfuscation Decoder       • Binary Classifier (93.65% acc)│
│  • Custom User Policies      • Multi-Class Threat Model      │
│                                                              │
│  [ Risk Engine ]             [ Defuser & Explainer ]         │
│  • Severity Score [0-100]    • Prompt Sanitization           │
│  • Risk Tier Classification  • Token Attribution Breakdown   │
└──────────────┬───────────────────────────────┬───────────────┘
               │                               │
    [ If Safe / Sanitized ]          [ If Malicious ]
               │                               │
               ▼                               ▼
┌──────────────────────────────┐ ┌──────────────────────────────┐
│   Downstream LLM Gateway     │ │  Blocked / Forensic Logged   │
│  (Ollama / OpenAI / Mock)    │ │  • PDF Audit Report Generated│
└──────────────────────────────┘ └──────────────────────────────┘
```

---

## 📁 Repository Structure

```
sentai/
├── backend/                  # FastAPI REST Backend
│   ├── app/
│   │   ├── api/              # API routers (auth, analyze, dashboard, history, rules, gateway, redteam, reports)
│   │   ├── core/             # Configuration, security & JWT utilities
│   │   ├── db/               # Async SQLAlchemy database session management
│   │   ├── ml/               # Threat detector, prompt sanitizer, explainability engine
│   │   ├── models/           # SQLAlchemy ORM models & Pydantic validation schemas
│   │   ├── services/         # Business logic layer (analysis, user management)
│   │   └── main.py           # Application entry point with CORS & rate limiting
│   ├── ml_models/            # Serialized trained scikit-learn models & encoders
│   ├── tests/                # Comprehensive pytest suite (33 test cases, 100% passing)
│   ├── Dockerfile            # Container definition for backend
│   └── requirements.txt      # Python dependencies
├── frontend/                 # React 19 + Vite Single Page Application
│   ├── src/
│   │   ├── api/              # Axios HTTP client with JWT interceptors
│   │   ├── pages/            # Dashboard, Analyzer, Gateway, RedTeam, Benchmark, History, Rules, Profile, Login
│   │   ├── store/            # Zustand persistent authentication store
│   │   ├── App.jsx           # Main router & protected layout
│   │   └── index.css         # Cybersecurity dark theme design system
│   ├── Dockerfile            # Container definition for frontend
│   ├── nginx.conf            # Nginx production reverse proxy config
│   ├── package.json          # Node dependencies
│   └── vite.config.js        # Vite build configuration
├── ml_training/              # Machine Learning Training Pipeline
│   ├── dataset_builder.py    # Synthetic dataset generator for 7 attack categories
│   ├── train_detector.py     # TF-IDF + Logistic Regression training pipeline
│   └── dataset.csv           # Benchmark prompt attack dataset
├── docs/                     # Project Documentation & Reports
│   ├── ARCHITECTURE.md       # Full technical architecture specification
│   ├── API_DOCUMENTATION.md  # Complete REST API reference with curl examples
│   ├── CAPSTONE_REPORT.md    # Formal B.Tech capstone project academic report
│   └── SECURITY_WHITEPAPER.md# Threat taxonomy and adversarial prompt analysis
├── .github/workflows/        # Automated CI/CD
│   └── test.yml              # GitHub Actions pipeline (backend tests, frontend build, docker)
├── docker-compose.yml        # Multi-container production deployment
├── run_all.bat               # Windows one-click start script
├── start_backend.bat         # Windows backend launcher
└── start_frontend.bat        # Windows frontend launcher
```

---

## 🚀 Quick Start Guide

### Prerequisites
- **Python**: 3.10 or 3.11 installed
- **Node.js**: v18+ and npm installed

---

### Method 1: One-Click Launch (Recommended for Windows)

Simply double-click:
```cmd
run_all.bat
```
This automatically launches both the FastAPI backend (`http://localhost:8000`) and the Vite React frontend (`http://localhost:5173`) in independent windows, keeping your main terminal completely free.

> [!TIP]
> - **Already inside the folder?** If your terminal prompt is already at `D:\...\backend>`, do **not** type `cd backend` again (simply run `python -m uvicorn app.main:app --reload --host 0.0.0.0 --port 8000` or `.\run.bat`).
> - **Copying terminal text without stopping the server**: In Windows PowerShell, pressing `Ctrl+C` sends an interrupt signal that terminates the running server. To copy text safely without interrupting the server, simply **highlight with the mouse and right-click** (or press `Enter`).

---

### Method 2: Manual Terminal Execution

#### Backend Setup
```bash
cd backend
python -m venv venv

# Windows
.\venv\Scripts\activate
# Linux / macOS
source venv/bin/activate

pip install -r requirements.txt
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```
- Backend API: `http://localhost:8000`
- Swagger UI Interactive Docs: `http://localhost:8000/api/docs`

#### Frontend Setup
```bash
cd frontend
npm install
npm run dev
```
- Frontend Web Application: `http://localhost:5173`
- Default Demo Admin Login: `admin` / `admin123`

---

### Method 3: Docker Deployment

```bash
docker compose up --build
```
- Frontend: `http://localhost:3000`
- Backend API: `http://localhost:8000`

---

## 🧪 Running Automated Tests

Run the full pytest suite (33 unit & integration tests):
```bash
cd backend
python -m pytest tests/ -v
```

**Results:**
```
======================= 33 passed in 10.62s =======================
```

---

## 📊 Benchmark Comparison Study

| Metric | SentinelAI | LLM-as-Judge (GPT-4o) | Keyword Matching | Llama Guard 2 | NeMo Guardrails |
| :--- | :---: | :---: | :---: | :---: | :---: |
| **Binary Accuracy** | **93.65%** | 96.00% | 61.00% | 89.00% | 85.00% |
| **ROC-AUC Score** | **0.9762** | 0.9810 | 0.6300 | 0.9100 | 0.8700 |
| **Multi-Class Accuracy** | **90.70%** | 91.00% | 40.00% | 72.00% | 68.00% |
| **Inference Latency** | **3.8ms** | 1200ms | 0.5ms | 350ms | 600ms |
| **Cost per 1K Prompts** | **$0.00** | $15.00 | $0.00 | $0.00 | $0.00 |
| **Runs Locally** | **Yes** | No | Yes | No (GPU) | No (GPU) |
| **Explainability (XAI)** | **Full** | Partial | Heuristic | Minimal | Minimal |

---

## 📄 License
This project is licensed under the MIT License — see the [LICENSE](LICENSE) file for details.
