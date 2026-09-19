"""
Integration Tests for AI Legal Assist API Endpoints.

Validates the full request pipeline:
FastAPI router -> Security Headers Middleware -> File Parser -> Service Mocks.
"""

from __future__ import annotations

import io
from unittest.mock import AsyncMock, patch

import pytest
from httpx import ASGITransport, AsyncClient

from main import app


@pytest.mark.asyncio
async def test_health_check_and_security_headers() -> None:
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        response = await client.get("/health")

    assert response.status_code == 200
    assert response.json() == {"status": "healthy"}

    # Validate enterprise security headers
    assert response.headers["X-Frame-Options"] == "DENY"
    assert response.headers["X-Content-Type-Options"] == "nosniff"
    assert "Strict-Transport-Security" in response.headers
    assert "Content-Security-Policy" in response.headers
    assert response.headers["Referrer-Policy"] == "strict-origin-when-cross-origin"


@pytest.mark.asyncio
async def test_summarize_endpoint_success() -> None:
    mock_payload = {
        "summary": "This is an employment agreement with 1-year duration.",
        "key_points": ["40 hours per week", "Two weeks notice"],
        "actionable_checklist": ["Submit proof of identification within 3 days", "Sign NDA schedule A"],
        "next_steps": ["Review non-compete radius with your advisor"],
    }

    with patch("app.routers.documents.generate", new_callable=AsyncMock, return_value=mock_payload):
        transport = ASGITransport(app=app)
        async with AsyncClient(transport=transport, base_url="http://test") as client:
            file_data = b"Employment Agreement between Acme Corp and Jane Doe."
            response = await client.post(
                "/api/summarize",
                files={"file": ("agreement.txt", io.BytesIO(file_data), "text/plain")},
            )

    assert response.status_code == 200
    body = response.json()
    assert body["summary"] == mock_payload["summary"]
    assert body["actionable_checklist"] == mock_payload["actionable_checklist"]
    assert body["next_steps"] == mock_payload["next_steps"]
    assert body["original_length"] == len(file_data)


@pytest.mark.asyncio
async def test_compare_endpoint_success() -> None:
    mock_payload = {
        "overall_summary": "Version B adds an indemnification clause and limits liability to $10,000.",
        "items": [
            {
                "clause": "Limitation of Liability",
                "document_a": "No liability cap mentioned.",
                "document_b": "Liability capped at fees paid.",
                "difference_type": "modified",
            }
        ],
        "actionable_takeaways": ["Negotiate the $10,000 cap upward to match project risk."],
    }

    with patch("app.routers.documents.generate", new_callable=AsyncMock, return_value=mock_payload):
        transport = ASGITransport(app=app)
        async with AsyncClient(transport=transport, base_url="http://test") as client:
            doc_a = b"Version A Contract terms and conditions."
            doc_b = b"Version B Contract terms and conditions with changes."
            response = await client.post(
                "/api/compare",
                files={
                    "file_a": ("v1.txt", io.BytesIO(doc_a), "text/plain"),
                    "file_b": ("v2.txt", io.BytesIO(doc_b), "text/plain"),
                },
            )

    assert response.status_code == 200
    body = response.json()
    assert len(body["items"]) == 1
    assert body["items"][0]["difference_type"] == "modified"
    assert len(body["actionable_takeaways"]) == 1


@pytest.mark.asyncio
async def test_risks_endpoint_success() -> None:
    mock_payload = {
        "overall_assessment": "High risk due to unilateral termination rights.",
        "risks": [
            {
                "clause": "Termination",
                "risk_level": "high",
                "explanation": "Vendor can terminate without cause on 24 hours notice.",
                "recommendation": "Request minimum 30 days written notice.",
            }
        ],
        "actionable_next_steps": ["Send amendment redline requesting 30-day mutual notice."],
    }

    with patch("app.routers.documents.generate", new_callable=AsyncMock, return_value=mock_payload):
        transport = ASGITransport(app=app)
        async with AsyncClient(transport=transport, base_url="http://test") as client:
            file_data = b"Vendor Agreement with high risk clauses."
            response = await client.post(
                "/api/risks",
                files={"file": ("vendor.txt", io.BytesIO(file_data), "text/plain")},
            )

    assert response.status_code == 200
    body = response.json()
    assert body["risks"][0]["risk_level"] == "high"
    assert len(body["actionable_next_steps"]) == 1


@pytest.mark.asyncio
async def test_chat_endpoint_success() -> None:
    mock_payload = {
        "answer": "The agreement terminates on December 31, 2026.",
        "confidence": "high",
        "actionable_note": "Calendar this renewal deadline 60 days in advance.",
    }

    with patch("app.routers.documents.generate", new_callable=AsyncMock, return_value=mock_payload):
        transport = ASGITransport(app=app)
        async with AsyncClient(transport=transport, base_url="http://test") as client:
            response = await client.post(
                "/api/chat",
                json={
                    "document_text": "This agreement expires on December 31, 2026.",
                    "question": "When does this contract end?",
                },
            )

    assert response.status_code == 200
    body = response.json()
    assert "December 31, 2026" in body["answer"]
    assert body["confidence"] == "high"


@pytest.mark.asyncio
async def test_standardized_error_format_on_bad_file() -> None:
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        response = await client.post(
            "/api/summarize",
            files={"file": ("malicious.exe", io.BytesIO(b"executable payload"), "application/x-msdownload")},
        )

    assert response.status_code == 400
    data = response.json()
    # Checks standardized code + message schema
    assert data["code"] == "BAD_REQUEST"
    assert "not allowed" in data["message"]


@pytest.mark.asyncio
async def test_chat_stream_endpoint() -> None:
    async def mock_stream(_sys, _user):
        yield "This is "
        yield "a streamed "
        yield "response."

    with patch("app.routers.documents.generate_stream", side_effect=mock_stream):
        transport = ASGITransport(app=app)
        async with AsyncClient(transport=transport, base_url="http://test") as client:
            response = await client.post(
                "/api/chat/stream",
                json={
                    "document_text": "Sample text",
                    "question": "Summary?",
                },
            )

    assert response.status_code == 200
    assert "text/event-stream" in response.headers["content-type"]
    content = response.text
    assert "data:" in content
    assert "[DONE]" in content
