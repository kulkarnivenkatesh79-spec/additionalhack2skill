"""
Tests for the file parser service.

Verifies that file validation correctly rejects invalid extensions,
oversized files, and accepts valid uploads.
"""

from __future__ import annotations

import io

import pytest
from fastapi import HTTPException, UploadFile

from app.services.file_parser import validate_file, extract_text


# ── Helpers ──────────────────────────────────────────────────────────────────


def _make_upload(
    filename: str,
    content: bytes = b"Hello world",
    content_type: str = "text/plain",
) -> UploadFile:
    """Create a mock UploadFile for testing.

    Args:
        filename: Name of the uploaded file.
        content: Raw bytes content.
        content_type: MIME type string.

    Returns:
        A ``UploadFile`` backed by an in-memory buffer.
    """
    return UploadFile(
        filename=filename,
        file=io.BytesIO(content),
        headers={"content-type": content_type},
    )


# ── Tests ────────────────────────────────────────────────────────────────────


@pytest.mark.asyncio
async def test_validate_file_rejects_invalid_extension() -> None:
    """File with disallowed extension (.exe) should be rejected."""
    upload = _make_upload("malware.exe", content_type="application/octet-stream")

    with pytest.raises(HTTPException) as exc_info:
        await validate_file(upload)

    assert exc_info.value.status_code == 400
    assert "not allowed" in str(exc_info.value.detail)


@pytest.mark.asyncio
async def test_validate_file_rejects_oversized() -> None:
    """File exceeding the 2 MB limit should be rejected."""
    # Create a 3 MB payload
    big_content = b"x" * (3 * 1024 * 1024)
    upload = _make_upload("big.txt", content=big_content, content_type="text/plain")

    with pytest.raises(HTTPException) as exc_info:
        await validate_file(upload)

    assert exc_info.value.status_code == 400
    assert "exceeds" in str(exc_info.value.detail).lower()


@pytest.mark.asyncio
async def test_validate_file_accepts_valid_txt() -> None:
    """A valid .txt file within size limits should pass."""
    upload = _make_upload("contract.txt", content_type="text/plain")
    ext = await validate_file(upload)
    assert ext == ".txt"


@pytest.mark.asyncio
async def test_extract_text_from_txt() -> None:
    """Extracting text from a .txt file should return its decoded content."""
    content = "This is a sample legal clause."
    upload = _make_upload(
        "clause.txt",
        content=content.encode("utf-8"),
        content_type="text/plain",
    )
    result = await extract_text(upload)
    assert result == content
