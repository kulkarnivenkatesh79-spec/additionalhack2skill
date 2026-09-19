"""
AI Legal Assist — Pydantic request / response models.

These schemas enforce strict typing on all API payloads and include
actionable checklists, standardized error structures, and confidence scoring.
"""

from __future__ import annotations

from typing import Any

from pydantic import BaseModel, Field

# ── Error Response Model ───────────────────────────────────────────────────


class ErrorResponse(BaseModel):
    """Standardized API error response for client consumption."""

    code: str = Field(..., description="Machine-readable error code.")
    message: str = Field(..., description="Human-readable error explanation.")
    details: Any = Field(default=None, description="Additional context or validation errors.")


# ── Response Models ──────────────────────────────────────────────────────────


class SummaryResponse(BaseModel):
    """Response from the document summarisation endpoint.

    Attributes:
        summary: Plain-language summary of the legal document.
        key_points: List of extracted key points.
        actionable_checklist: Step-by-step checklist of user obligations/rights.
        next_steps: Recommended proactive next actions.
        original_length: Character count of the uploaded document.
    """

    summary: str = Field(..., description="Plain-language summary.")
    key_points: list[str] = Field(
        default_factory=list, description="Bullet-point key takeaways."
    )
    actionable_checklist: list[str] = Field(
        default_factory=list,
        description="Actionable checklist of obligations, deadlines, and rights.",
    )
    next_steps: list[str] = Field(
        default_factory=list,
        description="Recommended potential next steps for the user.",
    )
    original_length: int = Field(
        ..., description="Character count of the uploaded document."
    )


class ComparisonItem(BaseModel):
    """A single difference or similarity found between two contracts."""

    clause: str
    document_a: str
    document_b: str
    difference_type: str = Field(
        ..., description="One of: added, removed, modified, identical."
    )


class ComparisonResponse(BaseModel):
    """Response from the contract comparison endpoint."""

    overall_summary: str
    items: list[ComparisonItem] = Field(default_factory=list)
    actionable_takeaways: list[str] = Field(
        default_factory=list,
        description="Key decisions or negotiation points between the two versions.",
    )


class RiskItem(BaseModel):
    """A single flagged risk in a legal document."""

    clause: str
    risk_level: str = Field(..., description="One of: high, medium, low.")
    explanation: str
    recommendation: str


class RiskResponse(BaseModel):
    """Response from the risk-highlighting endpoint."""

    overall_assessment: str
    risks: list[RiskItem] = Field(default_factory=list)
    actionable_next_steps: list[str] = Field(
        default_factory=list,
        description="Priority remediation steps before signing or agreeing.",
    )


# ── Request Models ───────────────────────────────────────────────────────────


class ChatRequest(BaseModel):
    """Request body for the Q&A chat endpoint."""

    document_text: str = Field(
        ..., min_length=1, description="The legal document text."
    )
    question: str = Field(
        ..., min_length=1, description="The user's question."
    )


class ChatResponse(BaseModel):
    """Response from the Q&A chat endpoint."""

    answer: str
    confidence: str = Field(
        default="moderate",
        description="One of: high, moderate, low.",
    )
    actionable_note: str | None = Field(
        default=None,
        description="Optional procedural suggestion or caveat.",
    )
