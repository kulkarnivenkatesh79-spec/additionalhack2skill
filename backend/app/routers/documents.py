"""
AI Legal Assist — Document processing router.

Exposes four rate-limited, async endpoints for legal document analysis:
  - ``POST /api/summarize``  — plain-language summarisation
  - ``POST /api/compare``    — side-by-side contract comparison
  - ``POST /api/risks``      — risk / obligation highlighting
  - ``POST /api/chat``       — Q&A about an uploaded document
"""

import logging

from fastapi import APIRouter, Request, UploadFile, File
from slowapi import Limiter
from slowapi.util import get_remote_address

from app.models import (
    ChatRequest,
    ChatResponse,
    ComparisonResponse,
    RiskResponse,
    SummaryResponse,
)
from app.services.file_parser import extract_text
from app.services.gemini_service import generate
from app.services.prompt_templates import (
    build_chat_prompt,
    build_compare_prompt,
    build_risk_prompt,
    build_summarize_prompt,
    sanitize_input,
)

logger = logging.getLogger(__name__)
router = APIRouter()
limiter = Limiter(key_func=get_remote_address)


# ── POST /api/summarize ─────────────────────────────────────────────────────


@router.post(
    "/summarize",
    response_model=SummaryResponse,
    summary="Summarise a legal document",
)
@limiter.limit("10/minute")
async def summarize_document(
    request: Request,
    file: UploadFile = File(..., description="Legal document (.pdf, .txt, .docx)"),
) -> SummaryResponse:
    """Upload a legal document and receive a plain-language summary.

    Args:
        request: The incoming FastAPI request (used by rate limiter).
        file: The uploaded legal document.

    Returns:
        A ``SummaryResponse`` with the AI-generated summary and key points.
    """
    text = await extract_text(file)
    safe_text = sanitize_input(text)
    system, user = build_summarize_prompt(safe_text)
    result = await generate(system, user)

    return SummaryResponse(
        summary=result.get("summary", ""),
        key_points=result.get("key_points", []),
        original_length=len(text),
    )


# ── POST /api/compare ───────────────────────────────────────────────────────


@router.post(
    "/compare",
    response_model=ComparisonResponse,
    summary="Compare two contracts",
)
@limiter.limit("10/minute")
async def compare_contracts(
    request: Request,
    file_a: UploadFile = File(..., description="First contract"),
    file_b: UploadFile = File(..., description="Second contract"),
) -> ComparisonResponse:
    """Upload two contracts and receive a clause-by-clause comparison.

    Args:
        request: The incoming FastAPI request.
        file_a: First contract document.
        file_b: Second contract document.

    Returns:
        A ``ComparisonResponse`` with the overall summary and per-clause items.
    """
    text_a = await extract_text(file_a)
    text_b = await extract_text(file_b)
    safe_a = sanitize_input(text_a)
    safe_b = sanitize_input(text_b)
    system, user = build_compare_prompt(safe_a, safe_b)
    result = await generate(system, user)

    return ComparisonResponse(
        overall_summary=result.get("overall_summary", ""),
        items=result.get("items", []),
    )


# ── POST /api/risks ─────────────────────────────────────────────────────────


@router.post(
    "/risks",
    response_model=RiskResponse,
    summary="Highlight risks in a legal document",
)
@limiter.limit("10/minute")
async def highlight_risks(
    request: Request,
    file: UploadFile = File(..., description="Legal document"),
) -> RiskResponse:
    """Upload a legal document and flag critical clauses and risks.

    Args:
        request: The incoming FastAPI request.
        file: The uploaded legal document.

    Returns:
        A ``RiskResponse`` with an overall assessment and itemised risks.
    """
    text = await extract_text(file)
    safe_text = sanitize_input(text)
    system, user = build_risk_prompt(safe_text)
    result = await generate(system, user)

    return RiskResponse(
        overall_assessment=result.get("overall_assessment", ""),
        risks=result.get("risks", []),
    )


# ── POST /api/chat ──────────────────────────────────────────────────────────


@router.post(
    "/chat",
    response_model=ChatResponse,
    summary="Ask a question about a document",
)
@limiter.limit("10/minute")
async def chat_about_document(
    request: Request,
    body: ChatRequest,
) -> ChatResponse:
    """Answer a question about a provided legal document.

    Args:
        request: The incoming FastAPI request.
        body: The chat request containing the document text and question.

    Returns:
        A ``ChatResponse`` with the AI-generated answer and confidence level.
    """
    safe_text = sanitize_input(body.document_text)
    safe_question = sanitize_input(body.question)
    system, user = build_chat_prompt(safe_text, safe_question)
    result = await generate(system, user)

    return ChatResponse(
        answer=result.get("answer", ""),
        confidence=result.get("confidence", "moderate"),
    )
