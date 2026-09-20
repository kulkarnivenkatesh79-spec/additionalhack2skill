"""
AI Legal Assist — Enterprise Gemini Service.

Provides async access to Google Gemini 2.5 Flash with:
- SHA-256 prompt hashing & TTL caching for high efficiency
- Streaming generation support for Server-Sent Events (SSE)
- Resilient model fallback and retry logic
- Strict error classification for timeouts, malformed JSON, and rate limits
"""

from __future__ import annotations

import asyncio
import hashlib
import json
import logging
from collections.abc import AsyncGenerator
from typing import Any

from cachetools import TTLCache
from google import genai
from google.genai import types

from app.config import settings

logger = logging.getLogger(__name__)

# ── High-Performance In-Memory Cache (512 entries, 15m TTL) ────────────────
_cache: TTLCache[str, dict[str, Any]] = TTLCache(maxsize=512, ttl=900)


class GeminiServiceError(RuntimeError):
    """Base exception for Gemini service issues."""


class GeminiTimeoutError(GeminiServiceError):
    """Raised when the Gemini API times out."""


class GeminiMalformedResponseError(GeminiServiceError):
    """Raised when the Gemini API returns invalid or non-JSON output."""


def get_cache_key(system: str, user: str) -> str:
    """Generate deterministic SHA-256 cache key from system and user prompt."""
    raw = f"{system}||{user}"
    return hashlib.sha256(raw.encode("utf-8")).hexdigest()


def get_client() -> genai.Client:
    """Instantiate a Gemini client."""
    if not settings.gemini_api_key:
        raise GeminiServiceError(
            "GEMINI_API_KEY is not configured. Set it in your environment or .env file."
        )
    return genai.Client(api_key=settings.gemini_api_key)


async def generate(system_prompt: str, user_prompt: str) -> dict[str, Any]:
    """Send prompt to Gemini model and return parsed JSON with caching.

    Args:
        system_prompt: System-level instruction prompt.
        user_prompt: User-level input and instruction prompt.

    Returns:
        dict[str, Any]: Parsed JSON response.
    """
    key = get_cache_key(system_prompt, user_prompt)

    # 1. Check in-memory SHA-256 cache
    if key in _cache:
        logger.info("Cache HIT for key=%s...", key[:12])
        return dict(_cache[key])

    logger.info("Cache MISS for key=%s... Calling Gemini API", key[:12])

    client = get_client()

    # Prioritize verified active models (gemini-3-flash-preview, gemini-3.5-flash, gemini-3.5-flash-lite)
    models_to_try = [
        "gemini-3-flash-preview",
        "gemini-3.5-flash",
        "gemini-3.5-flash-lite",
        settings.gemini_model,
        "gemini-3.6-flash",
    ]
    # Filter out deprecated models that return 404/429
    unique_models = [
        m for m in dict.fromkeys(models_to_try)
        if m and "2.5" not in m and "pro" not in m
    ]

    response = None
    last_err: Exception | None = None

    for model_name in unique_models:
        for attempt in range(2):
            try:
                # Wrap synchronous SDK call in asyncio to prevent blocking event loop
                response = await asyncio.to_thread(
                    client.models.generate_content,
                    model=model_name,
                    contents=user_prompt,
                    config=types.GenerateContentConfig(
                        system_instruction=system_prompt,
                        temperature=0.2,
                        max_output_tokens=4096,
                        response_mime_type="application/json",
                    ),
                )
                break
            except Exception as exc:
                last_err = exc
                err_str = str(exc).lower()
                logger.warning("Model %s attempt %d failed: %s", model_name, attempt + 1, exc)
                if (
                    ("deadline" in err_str or "timed out" in err_str or "timeout" in err_str)
                    and attempt == 1
                    and model_name == unique_models[-1]
                ):
                    raise GeminiTimeoutError("Gemini API request timed out.") from exc
                await asyncio.sleep(0.3)

        if response is not None:
            break

    if response is None:
        logger.error("All Gemini models exhausted: %s", last_err)
        raise GeminiServiceError(f"Gemini API request failed: {last_err}") from last_err

    raw_text = response.text or ""
    if raw_text.startswith("```"):
        raw_text = raw_text.strip("`").removeprefix("json").strip()

    try:
        parsed: dict[str, Any] = json.loads(raw_text)
    except (json.JSONDecodeError, ValueError) as exc:
        logger.error("Failed to parse Gemini response as JSON: %s", raw_text[:200])
        raise GeminiMalformedResponseError(
            "The AI model returned a malformed or non-JSON response."
        ) from exc

    # Store verified result in cache
    _cache[key] = parsed
    return parsed


async def generate_stream(
    system_prompt: str, user_prompt: str
) -> AsyncGenerator[str, None]:
    """Stream Gemini response chunks asynchronously for Server-Sent Events (SSE).

    Args:
        system_prompt: System-level instruction prompt.
        user_prompt: User-level input prompt.

    Yields:
        str: Raw text chunks as received from the model.
    """
    client = get_client()

    stream_model = (
        settings.gemini_model
        if settings.gemini_model and "2.5" not in settings.gemini_model and "pro" not in settings.gemini_model
        else "gemini-3-flash-preview"
    )

    def _sync_stream():
        return client.models.generate_content_stream(
            model=stream_model,
            contents=user_prompt,
            config=types.GenerateContentConfig(
                system_instruction=system_prompt,
                temperature=0.2,
                max_output_tokens=4096,
            ),
        )

    try:
        stream_iter = await asyncio.to_thread(_sync_stream)
        for chunk in stream_iter:
            if chunk.text:
                yield chunk.text
                await asyncio.sleep(0.01)
    except Exception as exc:
        logger.error("Error during streaming generation: %s", exc)
        yield f"\n[Stream Error: {exc}]"
