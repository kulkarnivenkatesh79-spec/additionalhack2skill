"""
AI Legal Assist — Enterprise Document Processing Router.

Endpoints:
- POST /api/summarize       — Plain-language summary + Actionable Checklist & Next Steps
- POST /api/compare         — Side-by-side contract comparison + Actionable Takeaways
- POST /api/risks           — Risk audit + Actionable Remediation Steps
- POST /api/chat            — Context-grounded Q&A
- POST /api/chat/stream     — Low-latency Server-Sent Events (SSE) streaming Q&A
"""

import json
import logging
from collections.abc import AsyncGenerator

from fastapi import APIRouter, File, Request, UploadFile
from fastapi.responses import StreamingResponse
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
from app.services.gemini_service import generate, generate_stream
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
    summary="Summarise a legal document with Actionable Checklist",
)
@limiter.limit("20/minute")
async def summarize_document(
    request: Request,
    file: UploadFile = File(..., description="Legal document (.pdf, .txt, .docx)"),
) -> SummaryResponse:
    """Upload a legal document and receive a plain-language summary and checklist."""
    text = await extract_text(file)
    safe_text = sanitize_input(text)
    system, user = build_summarize_prompt(safe_text)
    result = await generate(system, user)

    return SummaryResponse(
        summary=result.get("summary", ""),
        key_points=result.get("key_points", []),
        actionable_checklist=result.get("actionable_checklist", []),
        next_steps=result.get("next_steps", []),
        original_length=len(text),
    )


# ── POST /api/compare ───────────────────────────────────────────────────────


@router.post(
    "/compare",
    response_model=ComparisonResponse,
    summary="Compare two contracts with Actionable Takeaways",
)
@limiter.limit("20/minute")
async def compare_contracts(
    request: Request,
    file_a: UploadFile = File(..., description="First contract"),
    file_b: UploadFile = File(..., description="Second contract"),
) -> ComparisonResponse:
    """Upload two contracts and receive a clause-by-clause comparison."""
    text_a = await extract_text(file_a)
    text_b = await extract_text(file_b)
    safe_a = sanitize_input(text_a)
    safe_b = sanitize_input(text_b)
    system, user = build_compare_prompt(safe_a, safe_b)
    result = await generate(system, user)

    return ComparisonResponse(
        overall_summary=result.get("overall_summary", ""),
        items=result.get("items", []),
        actionable_takeaways=result.get("actionable_takeaways", []),
    )


# ── POST /api/risks ─────────────────────────────────────────────────────────


@router.post(
    "/risks",
    response_model=RiskResponse,
    summary="Highlight risks in a legal document with Remediation Steps",
)
@limiter.limit("20/minute")
async def highlight_risks(
    request: Request,
    file: UploadFile = File(..., description="Legal document"),
) -> RiskResponse:
    """Upload a legal document and flag critical clauses and risks."""
    text = await extract_text(file)
    safe_text = sanitize_input(text)
    system, user = build_risk_prompt(safe_text)
    result = await generate(system, user)

    return RiskResponse(
        overall_assessment=result.get("overall_assessment", ""),
        risks=result.get("risks", []),
        actionable_next_steps=result.get("actionable_next_steps", []),
    )


# ── POST /api/chat ──────────────────────────────────────────────────────────


@router.post(
    "/chat",
    response_model=ChatResponse,
    summary="Ask a question about a document",
)
@limiter.limit("30/minute")
async def chat_about_document(
    request: Request,
    body: ChatRequest,
) -> ChatResponse:
    """Answer a question about a provided legal document."""
    safe_text = sanitize_input(body.document_text)
    safe_question = sanitize_input(body.question)
    system, user = build_chat_prompt(safe_text, safe_question)
    result = await generate(system, user)

    return ChatResponse(
        answer=result.get("answer", ""),
        confidence=result.get("confidence", "moderate"),
        actionable_note=result.get("actionable_note"),
    )


# ── POST /api/chat/stream ───────────────────────────────────────────────────


@router.post(
    "/chat/stream",
    summary="Stream answers via Server-Sent Events (SSE)",
)
@limiter.limit("30/minute")
async def chat_stream_document(
    request: Request,
    body: ChatRequest,
) -> StreamingResponse:
    """Stream Gemini response in real time to eliminate perceived latency."""
    safe_text = sanitize_input(body.document_text)
    safe_question = sanitize_input(body.question)
    system, user = build_chat_prompt(safe_text, safe_question)

    async def event_generator() -> AsyncGenerator[str, None]:
        async for chunk in generate_stream(system, user):
            data = json.dumps({"chunk": chunk})
            yield f"data: {data}\n\n"
        yield "data: [DONE]\n\n"

    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
        },
    )
