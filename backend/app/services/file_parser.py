"""
AI Legal Assist — Enterprise File Parser Service.

Handles deep file signature (magic bytes) validation, in-memory processing,
and plain text extraction for PDF, TXT, and DOCX files.
Enforces size limits, prevents extension spoofing, and applies data minimization.
"""

from __future__ import annotations

import gc
import io
from pathlib import Path

from docx import Document
from fastapi import HTTPException, UploadFile
from PyPDF2 import PdfReader

from app.config import settings

# ── Magic Byte Signatures ──────────────────────────────────────────────────
# PDF files start with %PDF- (hex: 25 50 44 46 2D)
PDF_MAGIC = b"%PDF-"
# DOCX files are OpenXML Zip archives starting with PK\x03\x04
DOCX_MAGIC = b"PK\x03\x04"

# Allowed MIME types
_ALLOWED_MIMES: dict[str, str] = {
    ".pdf": "application/pdf",
    ".txt": "text/plain",
    ".docx": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
}


def verify_magic_bytes(data: bytes, ext: str) -> None:
    """Verify file integrity by inspecting file signature magic bytes.

    Args:
        data: The raw binary data of the uploaded file.
        ext: The claimed file extension (e.g., '.pdf').

    Raises:
        HTTPException: If the file header does not match expected magic bytes.
    """
    if not data:
        raise HTTPException(status_code=400, detail="Uploaded file is empty.")

    if ext == ".pdf":
        if not data.startswith(PDF_MAGIC):
            raise HTTPException(
                status_code=400,
                detail="Security validation failed: File signature does not match PDF format.",
            )

    elif ext == ".docx":
        if not data.startswith(DOCX_MAGIC):
            raise HTTPException(
                status_code=400,
                detail="Security validation failed: File signature does not match DOCX OpenXML format.",
            )

    elif ext == ".txt":
        # Check for binary control characters or null bytes which indicate executable or non-text files
        sample = data[:1024]
        if b"\x00" in sample:
            raise HTTPException(
                status_code=400,
                detail="Security validation failed: Text file contains invalid binary content.",
            )
        try:
            sample.decode("utf-8")
        except UnicodeDecodeError:
            try:
                sample.decode("latin-1")
            except Exception as exc:
                raise HTTPException(
                    status_code=400,
                    detail="Security validation failed: File encoding is not valid text.",
                ) from exc


async def validate_file(file: UploadFile) -> tuple[str, bytes]:
    """Validate an uploaded file's extension, MIME type, size, and magic bytes.

    Processes file strictly in-memory.

    Args:
        file: The incoming UploadFile from FastAPI.

    Returns:
        tuple[str, bytes]: Lowercase extension and the verified raw in-memory bytes.

    Raises:
        HTTPException: 400 if validation fails.
    """
    if not file.filename:
        raise HTTPException(status_code=400, detail="Filename is required.")

    ext = Path(file.filename).suffix.lower()

    # 1. Extension check
    if ext not in settings.allowed_extensions:
        raise HTTPException(
            status_code=400,
            detail=(
                f"File type '{ext}' is not allowed. "
                f"Accepted: {', '.join(sorted(settings.allowed_extensions))}."
            ),
        )

    # 2. MIME-type header check (when sent by browser)
    if file.content_type and ext in _ALLOWED_MIMES:
        expected_mime = _ALLOWED_MIMES[ext]
        if file.content_type not in (expected_mime, "application/octet-stream"):
            raise HTTPException(
                status_code=400,
                detail=f"MIME type '{file.content_type}' does not match extension '{ext}'.",
            )

    # 3. Read in-memory and verify size limit
    contents = await file.read()
    if len(contents) > settings.max_upload_bytes:
        raise HTTPException(
            status_code=400,
            detail=(
                f"File exceeds the {settings.max_upload_bytes // (1024 * 1024)} MB limit "
                f"({len(contents):,} bytes received)."
            ),
        )

    # 4. Deep magic bytes verification
    verify_magic_bytes(contents, ext)

    return ext, contents


async def extract_text(file: UploadFile) -> str:
    """Extract plain text from a validated uploaded file using in-memory streams.

    Applies data minimization by clearing temporary binary memory immediately.

    Args:
        file: The incoming UploadFile.

    Returns:
        The extracted text content.

    Raises:
        HTTPException: 400 if text extraction fails.
    """
    ext, contents = await validate_file(file)

    try:
        if ext == ".txt":
            try:
                extracted = contents.decode("utf-8")
            except UnicodeDecodeError:
                extracted = contents.decode("latin-1", errors="replace")
            return extracted.strip()

        if ext == ".pdf":
            return _extract_pdf(contents)

        if ext == ".docx":
            return _extract_docx(contents)

    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(
            status_code=400,
            detail=f"Failed to extract text from document: {exc}",
        ) from exc
    finally:
        # Data minimization: release raw bytes from memory
        del contents
        gc.collect()

    raise HTTPException(status_code=400, detail=f"Unsupported extension: {ext}")


def _extract_pdf(data: bytes) -> str:
    """Extract text from PDF bytes in memory."""
    stream = io.BytesIO(data)
    try:
        reader = PdfReader(stream)
        pages: list[str] = []
        for page in reader.pages:
            text = page.extract_text()
            if text:
                pages.append(text.strip())
        if not pages:
            raise ValueError("PDF contains no extractable text or is image-only.")
        return "\n\n".join(pages)
    finally:
        stream.close()


def _extract_docx(data: bytes) -> str:
    """Extract text from DOCX bytes in memory."""
    stream = io.BytesIO(data)
    try:
        doc = Document(stream)
        paragraphs = [para.text.strip() for para in doc.paragraphs if para.text.strip()]
        if not paragraphs:
            raise ValueError("DOCX contains no extractable text.")
        return "\n\n".join(paragraphs)
    finally:
        stream.close()
