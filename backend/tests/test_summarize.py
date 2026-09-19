"""
Tests for the document summarization endpoint.

Uses mocked Gemini API responses to verify the summarization pipeline
without making real API calls.
"""

from __future__ import annotations

import io
from unittest.mock import AsyncMock, patch

import pytest
from fastapi import UploadFile
from httpx import ASGITransport, AsyncClient

from main import app


# ── Helpers ──────────────────────────────────────────────────────────────────


def _make_upload(
    filename: str = "test.txt",
    content: str = "This is a legal document with various clauses and terms.",
    content_type: str = "text/plain",
) -> UploadFile:
    """Create a mock UploadFile for testing."""
    return UploadFile(
        filename=filename,
        file=io.BytesIO(content.encode("utf-8")),
        headers={"content-type": content_type},
    )


_MOCK_SUMMARY_RESPONSE = {
    "summary": "This document outlines standard contractual terms.",
    "key_points": [
        "Both parties agree to binding arbitration.",
        "The contract is valid for 12 months.",
    ],
}


# ── Tests ────────────────────────────────────────────────────────────────────


@pytest.mark.asyncio
async def test_summarize_returns_valid_response() -> None:
    """POST /api/summarize should return a SummaryResponse when Gemini succeeds."""
    with patch(
        "app.routers.documents.generate",
        new_callable=AsyncMock,
        return_value=_MOCK_SUMMARY_RESPONSE,
    ):
        transport = ASGITransport(app=app)
        async with AsyncClient(transport=transport, base_url="http://test") as client:
            content = b"This is a legal document for testing purposes."
            response = await client.post(
                "/api/summarize",
                files={"file": ("test.txt", io.BytesIO(content), "text/plain")},
            )

    assert response.status_code == 200
    data = response.json()
    assert "summary" in data
    assert "key_points" in data
    assert isinstance(data["key_points"], list)
    assert data["summary"] == _MOCK_SUMMARY_RESPONSE["summary"]


@pytest.mark.asyncio
async def test_summarize_rejects_invalid_file_type() -> None:
    """POST /api/summarize should reject a .exe file with a 400 error."""
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        response = await client.post(
            "/api/summarize",
            files={
                "file": (
                    "malware.exe",
                    io.BytesIO(b"not a real exe"),
                    "application/octet-stream",
                )
            },
        )

    assert response.status_code == 400
    assert "not allowed" in response.json()["detail"]
