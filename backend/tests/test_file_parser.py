"""
Enterprise Unit Tests for File Parser Service.

Tests deep magic bytes validation, extension checking, size limits,
MIME spoofing defense, and in-memory text extraction.
"""

from __future__ import annotations

import io

import pytest
from fastapi import HTTPException, UploadFile

from app.services.file_parser import extract_text, validate_file, verify_magic_bytes


def _make_upload(
    filename: str,
    content: bytes,
    content_type: str = "text/plain",
) -> UploadFile:
    return UploadFile(
        filename=filename,
        file=io.BytesIO(content),
        headers={"content-type": content_type},
    )


@pytest.mark.asyncio
async def test_validate_file_rejects_empty_filename() -> None:
    upload = UploadFile(filename="", file=io.BytesIO(b"data"))
    with pytest.raises(HTTPException) as exc:
        await validate_file(upload)
    assert exc.value.status_code == 400
    assert "Filename is required" in exc.value.detail


@pytest.mark.asyncio
async def test_validate_file_rejects_empty_content() -> None:
    upload = _make_upload("empty.txt", b"")
    with pytest.raises(HTTPException) as exc:
        await validate_file(upload)
    assert exc.value.status_code == 400
    assert "empty" in exc.value.detail.lower()


@pytest.mark.asyncio
async def test_validate_file_rejects_invalid_extension() -> None:
    upload = _make_upload("script.sh", b"#!/bin/bash", "text/x-sh")
    with pytest.raises(HTTPException) as exc:
        await validate_file(upload)
    assert exc.value.status_code == 400
    assert "not allowed" in exc.value.detail


@pytest.mark.asyncio
async def test_validate_file_rejects_oversized() -> None:
    big_content = b"x" * (3 * 1024 * 1024)
    upload = _make_upload("large.txt", big_content)
    with pytest.raises(HTTPException) as exc:
        await validate_file(upload)
    assert exc.value.status_code == 400
    assert "exceeds" in exc.value.detail.lower()


@pytest.mark.asyncio
async def test_magic_bytes_detects_spoofed_pdf() -> None:
    # File named .pdf but containing plain text or binary rubbish
    spoofed = _make_upload("fake.pdf", b"This is not a real PDF file!", "application/pdf")
    with pytest.raises(HTTPException) as exc:
        await validate_file(spoofed)
    assert exc.value.status_code == 400
    assert "File signature does not match PDF" in exc.value.detail


@pytest.mark.asyncio
async def test_magic_bytes_detects_spoofed_docx() -> None:
    # File named .docx but missing PK zip signature
    spoofed = _make_upload("fake.docx", b"Not a zip archive", "application/vnd.openxmlformats-officedocument.wordprocessingml.document")
    with pytest.raises(HTTPException) as exc:
        await validate_file(spoofed)
    assert exc.value.status_code == 400
    assert "DOCX OpenXML format" in exc.value.detail


@pytest.mark.asyncio
async def test_magic_bytes_detects_binary_in_txt() -> None:
    # Text file containing null bytes (e.g. disguised compiled binary)
    binary_payload = b"Hello\x00World\x00\x01\x02"
    upload = _make_upload("evil.txt", binary_payload)
    with pytest.raises(HTTPException) as exc:
        await validate_file(upload)
    assert exc.value.status_code == 400
    assert "binary content" in exc.value.detail.lower()


@pytest.mark.asyncio
async def test_extract_text_valid_txt() -> None:
    content = "Standard NDA Agreement between Party A and Party B."
    upload = _make_upload("nda.txt", content.encode("utf-8"))
    extracted = await extract_text(upload)
    assert extracted == content


@pytest.mark.asyncio
async def test_extract_text_pdf_sample() -> None:
    from pathlib import Path
    pdf_path = Path(__file__).resolve().parent.parent.parent / "sample_documents" / "6_Consulting_Agreement.pdf"
    if pdf_path.exists():
        data = pdf_path.read_bytes()
        upload = _make_upload("consulting.pdf", data, "application/pdf")
        extracted = await extract_text(upload)
        assert len(extracted) > 50
        assert "agreement" in extracted.lower() or "consulting" in extracted.lower()


@pytest.mark.asyncio
async def test_extract_text_docx_sample() -> None:
    from pathlib import Path
    docx_path = Path(__file__).resolve().parent.parent.parent / "sample_documents" / "5_Commercial_Lease_Agreement.docx"
    if docx_path.exists():
        data = docx_path.read_bytes()
        upload = _make_upload("lease.docx", data, "application/vnd.openxmlformats-officedocument.wordprocessingml.document")
        extracted = await extract_text(upload)
        assert len(extracted) > 50
        assert "lease" in extracted.lower() or "agreement" in extracted.lower()


@pytest.mark.asyncio
async def test_extract_text_empty_pdf_raises() -> None:
    # A PDF with valid magic bytes but corrupted or empty content
    upload = _make_upload("broken.pdf", b"%PDF-corrupted-content-without-pages", "application/pdf")
    with pytest.raises(HTTPException):
        await extract_text(upload)


def test_verify_magic_bytes_valid_signatures() -> None:
    # Valid PDF magic header
    verify_magic_bytes(b"%PDF-1.7 ... content", ".pdf")
    # Valid DOCX magic header
    verify_magic_bytes(b"PK\x03\x04 ... docx zip", ".docx")
    # Valid TXT text
    verify_magic_bytes(b"Clean UTF-8 text", ".txt")
