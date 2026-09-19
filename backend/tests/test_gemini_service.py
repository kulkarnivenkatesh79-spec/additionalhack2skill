"""
Advanced Mock Tests for Gemini Service.

Validates:
- SHA-256 caching efficiency (identical queries avoid API calls)
- Fallback model progression
- Handling of API timeouts (GeminiTimeoutError)
- Handling of malformed/non-JSON responses (GeminiMalformedResponseError)
- Server-Sent Events (SSE) streaming generation
"""

from __future__ import annotations

import json
from unittest.mock import MagicMock, patch

import pytest

from app.services.gemini_service import (
    GeminiMalformedResponseError,
    GeminiServiceError,
    GeminiTimeoutError,
    _cache,
    generate,
    generate_stream,
    get_cache_key,
)


@pytest.fixture(autouse=True)
def clear_cache():
    """Ensure in-memory cache is empty before every test."""
    _cache.clear()
    yield
    _cache.clear()


def test_cache_key_deterministic():
    k1 = get_cache_key("system", "user text")
    k2 = get_cache_key("system", "user text")
    k3 = get_cache_key("system", "different text")
    assert k1 == k2
    assert k1 != k3
    assert len(k1) == 64  # SHA-256 hex length


@pytest.mark.asyncio
async def test_generate_success_and_caching():
    mock_response = MagicMock()
    mock_response.text = json.dumps({
        "summary": "Sample plain summary",
        "key_points": ["Point 1", "Point 2"],
        "actionable_checklist": ["Check 1"],
        "next_steps": ["Step 1"]
    })

    mock_client = MagicMock()
    mock_client.models.generate_content.return_value = mock_response

    with patch("app.services.gemini_service.get_client", return_value=mock_client):
        # 1st call: Cache Miss -> calls generate_content
        res1 = await generate("sys", "user query 1")
        assert res1["summary"] == "Sample plain summary"
        assert mock_client.models.generate_content.call_count == 1

        # 2nd call: Cache Hit -> immediate return without API call
        res2 = await generate("sys", "user query 1")
        assert res2["summary"] == "Sample plain summary"
        assert mock_client.models.generate_content.call_count == 1  # Still 1!


@pytest.mark.asyncio
async def test_generate_handles_markdown_code_fences():
    mock_response = MagicMock()
    mock_response.text = "```json\n{\"summary\": \"Clean text\", \"key_points\": []}\n```"

    mock_client = MagicMock()
    mock_client.models.generate_content.return_value = mock_response

    with patch("app.services.gemini_service.get_client", return_value=mock_client):
        res = await generate("sys", "fence query")
        assert res["summary"] == "Clean text"


@pytest.mark.asyncio
async def test_generate_raises_malformed_response_error():
    mock_response = MagicMock()
    mock_response.text = "I am an AI, here is your summary: This document is an NDA."

    mock_client = MagicMock()
    mock_client.models.generate_content.return_value = mock_response

    with (
        patch("app.services.gemini_service.get_client", return_value=mock_client),
        pytest.raises(GeminiMalformedResponseError),
    ):
        await generate("sys", "bad response query")


@pytest.mark.asyncio
async def test_generate_raises_timeout_error():
    mock_client = MagicMock()
    mock_client.models.generate_content.side_effect = TimeoutError("Deadline exceeded - request timed out")

    with (
        patch("app.services.gemini_service.get_client", return_value=mock_client),
        pytest.raises(GeminiTimeoutError),
    ):
        await generate("sys", "timeout query")


@pytest.mark.asyncio
async def test_generate_exhausts_retries():
    mock_client = MagicMock()
    mock_client.models.generate_content.side_effect = RuntimeError("Service Unavailable 503")

    with (
        patch("app.services.gemini_service.get_client", return_value=mock_client),
        pytest.raises(GeminiServiceError),
    ):
        await generate("sys", "fail query")


@pytest.mark.asyncio
async def test_generate_stream():
    chunk1 = MagicMock()
    chunk1.text = "Hello "
    chunk2 = MagicMock()
    chunk2.text = "World"

    mock_client = MagicMock()
    mock_client.models.generate_content_stream.return_value = [chunk1, chunk2]

    with patch("app.services.gemini_service.get_client", return_value=mock_client):
        collected = []
        async for piece in generate_stream("sys", "stream query"):
            collected.append(piece)

        assert "".join(collected) == "Hello World"
