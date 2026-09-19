"""
AI Legal Assist — Pydantic request / response models.

These schemas enforce strict typing on all API payloads and are shared
with the TypeScript frontend via matching interfaces.
"""

from __future__ import annotations

from pydantic import BaseModel, Field


# ── Response Models ──────────────────────────────────────────────────────────


class SummaryResponse(BaseModel):
    """Response from the document summarisation endpoint.

    Attributes:
        summary: Plain-language summary of the legal document.
        key_points: List of extracted key points.
        original_length: Character count of the original document.
    """

    summary: str = Field(..., description="Plain-language summary.")
    key_points: list[str] = Field(
        default_factory=list, description="Bullet-point key takeaways."
    )
    original_length: int = Field(
        ..., description="Character count of the uploaded document."
    )


class ComparisonItem(BaseModel):
    """A single difference or similarity found between two contracts.

    Attributes:
        clause: Name or label of the clause.
        document_a: Text or summary from Document A.
        document_b: Text or summary from Document B.
        difference_type: ``added``, ``removed``, ``modified``, or ``identical``.
    """

    clause: str
    document_a: str
    document_b: str
    difference_type: str = Field(
        ..., description="One of: added, removed, modified, identical."
    )


class ComparisonResponse(BaseModel):
    """Response from the contract comparison endpoint.

    Attributes:
        overall_summary: High-level summary of differences.
        items: Detailed per-clause comparison list.
    """

    overall_summary: str
    items: list[ComparisonItem] = Field(default_factory=list)


class RiskItem(BaseModel):
    """A single flagged risk in a legal document.

    Attributes:
        clause: The clause text or label.
        risk_level: ``high``, ``medium``, or ``low``.
        explanation: Why this clause is risky.
        recommendation: Suggested action.
    """

    clause: str
    risk_level: str = Field(..., description="One of: high, medium, low.")
    explanation: str
    recommendation: str


class RiskResponse(BaseModel):
    """Response from the risk-highlighting endpoint.

    Attributes:
        overall_assessment: High-level risk assessment.
        risks: List of flagged risks.
    """

    overall_assessment: str
    risks: list[RiskItem] = Field(default_factory=list)


# ── Request Models ───────────────────────────────────────────────────────────


class ChatRequest(BaseModel):
    """Request body for the Q&A chat endpoint.

    Attributes:
        document_text: The legal document's full text.
        question: The user's question about the document.
    """

    document_text: str = Field(
        ..., min_length=1, description="The legal document text."
    )
    question: str = Field(
        ..., min_length=1, description="The user's question."
    )


class ChatResponse(BaseModel):
    """Response from the Q&A chat endpoint.

    Attributes:
        answer: The AI-generated answer.
        confidence: Confidence qualifier (e.g. "high", "moderate", "low").
    """

    answer: str
    confidence: str = Field(
        default="moderate",
        description="One of: high, moderate, low.",
    )
