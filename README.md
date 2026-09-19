# AI Legal Assist 🏛️

> **GenAI-powered legal assistance dashboard** — Making legal documents accessible, understandable, and comparable using Gemini 2.5 Flash.

![Python](https://img.shields.io/badge/Python-3.11+-blue?logo=python)
![Next.js](https://img.shields.io/badge/Next.js-15-black?logo=next.js)
![FastAPI](https://img.shields.io/badge/FastAPI-0.115-009688?logo=fastapi)
![License](https://img.shields.io/badge/License-MIT-green)

---

> ⚠️ **Disclaimer:** This tool provides AI-generated legal information and assistance. It does **not** constitute, nor should it replace, professional legal advice.

---

## ✨ Features

| Tool | Description |
|---|---|
| 📄 **Document Simplifier** | Upload complex legal text → plain-language summary |
| ⚖️ **Contract Comparator** | Upload two agreements → side-by-side diff analysis |
| 🚨 **Risk Highlighter** | Auto-flag critical clauses, hidden obligations, and inconsistencies |
| 💬 **Q&A Chat** | Ask questions about your uploaded document |

---

## 🏗️ Architecture

```
ai-legal-assist/
├── backend/                  # FastAPI (Python 3.11+)
│   ├── main.py               # App entrypoint, CORS, rate limiter
│   ├── app/
│   │   ├── config.py         # Pydantic settings from .env
│   │   ├── models.py         # Request/response schemas
│   │   ├── routers/
│   │   │   └── documents.py  # API endpoints
│   │   └── services/
│   │       ├── file_parser.py       # PDF/TXT/DOCX parser
│   │       ├── gemini_service.py    # Gemini 2.5 Flash client
│   │       └── prompt_templates.py  # Sanitized prompt templates
│   ├── tests/
│   │   ├── test_file_parser.py
│   │   └── test_summarize.py
│   └── requirements.txt
├── frontend/                 # Next.js 15 (TypeScript + Tailwind)
│   ├── src/
│   │   ├── app/
│   │   │   ├── layout.tsx
│   │   │   ├── page.tsx
│   │   │   └── globals.css
│   │   ├── components/
│   │   │   ├── Disclaimer.tsx
│   │   │   ├── FileUpload.tsx
│   │   │   ├── TabNavigation.tsx
│   │   │   ├── DocumentSimplifier.tsx
│   │   │   ├── ContractComparator.tsx
│   │   │   ├── RiskHighlighter.tsx
│   │   │   └── QAChat.tsx
│   │   ├── lib/
│   │   │   └── api.ts
│   │   └── types/
│   │       └── index.ts
│   ├── __tests__/
│   │   ├── Disclaimer.test.tsx
│   │   └── FileUpload.test.tsx
│   └── package.json
├── .env.example
├── .gitignore
└── README.md
```

---

## 🚀 Quick Start

### Prerequisites

- **Python 3.11+** with `pip`
- **Node.js 18+** with `npm`
- **Gemini API Key** — get one at [Google AI Studio](https://aistudio.google.com/)

### 1. Clone & Configure

```bash
git clone <repo-url> && cd ai-legal-assist
cp .env.example .env
# Edit .env and set your GEMINI_API_KEY
```

### 2. Backend Setup

```bash
cd backend
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate
pip install -r requirements.txt
uvicorn main:app --reload --port 8000
```

### 3. Frontend Setup

```bash
cd frontend
npm install
npm run dev
# Opens at http://localhost:3000
```

### 4. Run Tests

```bash
# Backend tests
cd backend && pytest -v

# Frontend tests
cd frontend && npm test
```

---

## 🔒 Security

- **File Upload Sanitization**: Only `.pdf`, `.txt`, `.docx` files up to 2 MB.
- **API Key Protection**: Gemini key is server-side only, never exposed to the client.
- **Rate Limiting**: 10 requests/minute per IP via `slowapi`.
- **Prompt Injection Guard**: All user inputs are sanitized before being sent to the LLM.

---

## ♿ Accessibility (WCAG 2.1 AA)

- Full keyboard navigability (Tab, Enter, Arrow keys)
- Semantic HTML5 (`<main>`, `<nav>`, `<article>`)
- ARIA roles & live regions for dynamic content
- High contrast color ratios (≥ 4.5:1)

---

## 📄 License

MIT — see [LICENSE](./LICENSE) for details.
