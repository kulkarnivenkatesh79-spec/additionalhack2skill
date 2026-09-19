"""
AI Legal Assist — File parser service.

Handles secure file upload validation and text extraction for
``.pdf``, ``.txt``, and ``.docx`` files. Enforces a strict 2 MB
size limit and extension allowlist to prevent malicious uploads.
"""

from __future__ import annotations

import os
from pathlib import Path

from fastapi import HTTPException, UploadFile

from app.config import settings


# ── Allowed MIME types (defence-in-depth alongside extension checks) ─────────
_ALLOWED_MIMES: dict[str, str] = {
    ".pdf": "application/pdf",
    ".txt": "text/plain",
    ".docx": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
}


async def validate_file(file: UploadFile) -> str:
    """Validate an uploaded file's extension, MIME type, and size.

    Args:
        file: The incoming ``UploadFile`` from FastAPI.

    Returns:
        The lowercase file extension (e.g. ``".pdf"``).

    Raises:
        HTTPException: 400 if validation fails.
    """
    if not file.filename:
        raise HTTPException(status_code=400, detail="Filename is required.")

    ext = Path(file.filename).suffix.lower()

    # Extension check
    if ext not in settings.allowed_extensions:
        raise HTTPException(
            status_code=400,
            detail=(
                f"File type '{ext}' is not allowed. "
                f"Accepted: {', '.join(sorted(settings.allowed_extensions))}."
            ),
        )

    # MIME-type check (best-effort; browsers may not always send it)
    if file.content_type and ext in _ALLOWED_MIMES:
        expected_mime = _ALLOWED_MIMES[ext]
        if file.content_type != expected_mime and file.content_type != "application/octet-stream":
            raise HTTPException(
                status_code=400,
                detail=f"MIME type '{file.content_type}' does not match extension '{ext}'.",
            )

    # Size check (read once; the bytes are re-used below)
    contents = await file.read()
    if len(contents) > settings.max_upload_bytes:
        raise HTTPException(
            status_code=400,
            detail=(
                f"File exceeds the {settings.max_upload_bytes // (1024 * 1024)} MB limit "
                f"({len(contents):,} bytes received)."
            ),
        )

    # Reset cursor so downstream callers can re-read if needed
    await file.seek(0)

    return ext


async def extract_text(file: UploadFile) -> str:
    """Extract plain text from a validated uploaded file.

    Supports ``.pdf``, ``.txt``, and ``.docx`` formats.

    Args:
        file: A previously validated ``UploadFile``.

    Returns:
        The extracted text content as a single string.

    Raises:
        HTTPException: 400 if text extraction fails.
    """
    ext = await validate_file(file)
    contents = await file.read()

    try:
        if ext == ".txt":
            return contents.decode("utf-8", errors="replace")

        if ext == ".pdf":
            return _extract_pdf(contents)

        if ext == ".docx":
            return _extract_docx(contents)

    except Exception as exc:
        raise HTTPException(
            status_code=400,
            detail=f"Failed to extract text from file: {exc}",
        ) from exc

    raise HTTPException(status_code=400, detail=f"Unsupported extension: {ext}")


def _extract_pdf(data: bytes) -> str:
    """Extract text from PDF bytes using PyPDF2.

    Args:
        data: Raw PDF file bytes.

    Returns:
        Concatenated text from all PDF pages.
    """
    import io
    from PyPDF2 import PdfReader

    reader = PdfReader(io.BytesIO(data))
    pages: list[str] = []
    for page in reader.pages:
        text = page.extract_text()
        if text:
            pages.append(text)
    return "\n\n".join(pages)


def _extract_docx(data: bytes) -> str:
    """Extract text from DOCX bytes using python-docx.

    Args:
        data: Raw DOCX file bytes.

    Returns:
        Concatenated paragraph text from the document.
    """
    import io
    from docx import Document

    doc = Document(io.BytesIO(data))
    return "\n\n".join(para.text for para in doc.paragraphs if para.text.strip())
