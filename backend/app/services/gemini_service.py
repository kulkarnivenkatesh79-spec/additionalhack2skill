"""
AI Legal Assist — Gemini service.

Provides an async interface to the Google Gemini 2.5 Flash model.
Includes a TTL cache to avoid redundant API calls for identical queries
and structured JSON parsing of model responses.
"""

from __future__ import annotations

import hashlib
import json
import logging
from typing import Any

from cachetools import TTLCache
from google import genai
from google.genai import types

from app.config import settings

logger = logging.getLogger(__name__)

# ── In-memory TTL cache (256 entries, 15 min TTL) ───────────────────────────
_cache: TTLCache[str, dict[str, Any]] = TTLCache(maxsize=256, ttl=900)


def _cache_key(system: str, user: str) -> str:
    """Generate a deterministic cache key from prompt content.

    Args:
        system: The system prompt.
        user: The user prompt.

    Returns:
        SHA-256 hex digest of the concatenated prompts.
    """
    raw = f"{system}||{user}"
    return hashlib.sha256(raw.encode()).hexdigest()


def _get_client() -> genai.Client:
    """Create a Gemini client using the configured API key.

    Returns:
        An initialised ``genai.Client``.

    Raises:
        RuntimeError: If ``GEMINI_API_KEY`` is not set.
    """
    if not settings.gemini_api_key:
        raise RuntimeError(
            "GEMINI_API_KEY is not configured. "
            "Set it in your .env file."
        )
    return genai.Client(api_key=settings.gemini_api_key)


async def generate(system_prompt: str, user_prompt: str) -> dict[str, Any]:
    """Send a prompt pair to Gemini 2.5 Flash and return parsed JSON.

    Uses an in-memory TTL cache to avoid redundant calls for identical
    prompt content.

    Args:
        system_prompt: The system-level instruction prompt.
        user_prompt: The user-level task prompt.

    Returns:
        Parsed JSON dict from the model's response.

    Raises:
        RuntimeError: On API errors or invalid JSON in the response.
    """
    key = _cache_key(system_prompt, user_prompt)

    # Check cache first
    if key in _cache:
        logger.info("Cache HIT for prompt (key=%s…)", key[:12])
        return _cache[key]

    logger.info("Cache MISS — calling Gemini model (key=%s…)", key[:12])

    client = _get_client()

    import time

    # Candidate models for high-speed analysis with graceful fallback
    models_to_try = [
        settings.gemini_model,
        "gemini-3.6-flash",
        "gemini-3.7-flash",
        "gemini-3.5-flash",
        "gemini-flash-latest",
        "gemini-2.5-flash",
    ]
    # Remove duplicates while preserving order
    unique_models = list(dict.fromkeys(models_to_try))

    response = None
    last_err = None
    for model_name in unique_models:
        for attempt in range(2):
            try:
                response = client.models.generate_content(
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
                logger.warning(
                    "Model %s attempt %d failed: %s",
                    model_name,
                    attempt + 1,
                    exc,
                )
                time.sleep(0.5)
        if response is not None:
            break

    if response is None:
        logger.error("All Gemini model attempts failed: %s", last_err)
        raise RuntimeError(f"Gemini API call failed: {last_err}") from last_err

    # Parse the JSON response
    raw_text = response.text or ""
    # Strip markdown code fences if present
    if raw_text.startswith("```"):
        raw_text = raw_text.strip("`").removeprefix("json").strip()

    try:
        parsed: dict[str, Any] = json.loads(raw_text)
    except json.JSONDecodeError as exc:
        logger.error("Failed to parse Gemini response as JSON: %s", raw_text[:200])
        raise RuntimeError(
            "The AI returned an invalid response. Please try again."
        ) from exc

    # Store in cache
    _cache[key] = parsed
    return parsed
