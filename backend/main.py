"""
AI Legal Assist — FastAPI Application Entry Point.

Configures:
- Comprehensive Enterprise Security Headers (CSP, HSTS, X-Frame-Options, etc.)
- Strict CORS configuration
- Standardized Global Exception Handlers (code, message, details)
- Rate limiting and lifespan management
"""

import logging
from contextlib import asynccontextmanager
from typing import AsyncGenerator

from fastapi import FastAPI, Request, status
from fastapi.exceptions import HTTPException, RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded
from slowapi.util import get_remote_address
from starlette.middleware.base import BaseHTTPMiddleware, RequestResponseEndpoint
from starlette.responses import Response

from app.config import settings
from app.routers import documents
from app.services.gemini_service import (
    GeminiMalformedResponseError,
    GeminiServiceError,
    GeminiTimeoutError,
)

logger = logging.getLogger("ai_legal_assist")

# ---------------------------------------------------------------------------
# Rate limiter (keyed by client IP)
# ---------------------------------------------------------------------------
limiter = Limiter(key_func=get_remote_address, default_limits=[settings.rate_limit])


# ---------------------------------------------------------------------------
# Security Headers Middleware
# ---------------------------------------------------------------------------
class SecurityHeadersMiddleware(BaseHTTPMiddleware):
    """Enforce defense-in-depth HTTP security headers on all responses."""

    async def dispatch(self, request: Request, call_next: RequestResponseEndpoint) -> Response:
        response = await call_next(request)

        # Prevent framing / clickjacking
        response.headers["X-Frame-Options"] = "DENY"
        # Prevent MIME type sniffing
        response.headers["X-Content-Type-Options"] = "nosniff"
        # Restrict referrer leakage
        response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
        # Restrict browser feature abuse
        response.headers["Permissions-Policy"] = "camera=(), microphone=(), geolocation=()"
        # Strict Transport Security for production domains
        response.headers["Strict-Transport-Security"] = (
            "max-age=31536000; includeSubDomains; preload"
        )
        # Content Security Policy
        response.headers["Content-Security-Policy"] = (
            "default-src 'self'; "
            "img-src 'self' data: https:; "
            "script-src 'self' 'unsafe-inline'; "
            "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; "
            "font-src 'self' https://fonts.gstatic.com;"
        )
        return response


# ---------------------------------------------------------------------------
# Application lifespan (startup / shutdown hooks)
# ---------------------------------------------------------------------------
@asynccontextmanager
async def lifespan(_app: FastAPI) -> AsyncGenerator[None, None]:
    """Manage startup and shutdown events."""
    logger.info("Initializing AI Legal Assist backend...")
    yield
    logger.info("Shutting down AI Legal Assist backend...")


# ---------------------------------------------------------------------------
# FastAPI Application
# ---------------------------------------------------------------------------
app = FastAPI(
    title="AI Legal Assist API",
    description="Enterprise GenAI legal document analysis powered by Gemini 2.5 Flash.",
    version="1.0.0",
    lifespan=lifespan,
)

# Register security headers
app.add_middleware(SecurityHeadersMiddleware)

# Register rate limiter
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

# CORS: allow local development and verified deployment domains
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://127.0.0.1:3000",
    ],
    allow_origin_regex=r"https://.*\.vercel\.app",
    allow_credentials=True,
    allow_methods=["GET", "POST", "OPTIONS"],
    allow_headers=["*"],
)


# ---------------------------------------------------------------------------
# Standardized Global Exception Handlers
# ---------------------------------------------------------------------------
@app.exception_handler(HTTPException)
async def http_exception_handler(_request: Request, exc: HTTPException) -> JSONResponse:
    """Standardized response for explicit HTTPExceptions."""
    code = "HTTP_ERROR"
    if exc.status_code == status.HTTP_400_BAD_REQUEST:
        code = "BAD_REQUEST"
    elif exc.status_code == status.HTTP_404_NOT_FOUND:
        code = "NOT_FOUND"
    elif exc.status_code == status.HTTP_429_TOO_MANY_REQUESTS:
        code = "RATE_LIMITED"

    return JSONResponse(
        status_code=exc.status_code,
        content={
            "code": code,
            "message": exc.detail if isinstance(exc.detail, str) else "Request error",
            "details": exc.detail if not isinstance(exc.detail, str) else None,
            "detail": exc.detail,  # Backwards-compatibility with standard FastAPI clients
        },
    )


@app.exception_handler(RequestValidationError)
async def validation_exception_handler(
    _request: Request, exc: RequestValidationError
) -> JSONResponse:
    """Standardized response for request schema validation errors."""
    return JSONResponse(
        status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
        content={
            "code": "VALIDATION_ERROR",
            "message": "The submitted payload failed validation.",
            "details": exc.errors(),
            "detail": str(exc.errors()),
        },
    )


@app.exception_handler(GeminiTimeoutError)
async def gemini_timeout_handler(_request: Request, exc: GeminiTimeoutError) -> JSONResponse:
    return JSONResponse(
        status_code=status.HTTP_504_GATEWAY_TIMEOUT,
        content={
            "code": "AI_TIMEOUT",
            "message": "AI analysis timed out. Please try again with a shorter document segment.",
            "details": str(exc),
            "detail": "AI analysis timed out.",
        },
    )


@app.exception_handler(GeminiMalformedResponseError)
async def gemini_malformed_handler(
    _request: Request, exc: GeminiMalformedResponseError
) -> JSONResponse:
    return JSONResponse(
        status_code=status.HTTP_502_BAD_GATEWAY,
        content={
            "code": "AI_MALFORMED_OUTPUT",
            "message": "The AI model produced an unexpected response format. Retrying may succeed.",
            "details": str(exc),
            "detail": "The AI model produced an unexpected response format.",
        },
    )


@app.exception_handler(GeminiServiceError)
async def gemini_service_handler(_request: Request, exc: GeminiServiceError) -> JSONResponse:
    return JSONResponse(
        status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
        content={
            "code": "AI_SERVICE_UNAVAILABLE",
            "message": "The AI service is currently unavailable or experiencing high load.",
            "details": str(exc),
            "detail": str(exc),
        },
    )


@app.exception_handler(Exception)
async def catch_all_exception_handler(_request: Request, exc: Exception) -> JSONResponse:
    """Catch-all for any unhandled exceptions."""
    logger.exception("Unhandled server error: %s", exc)
    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content={
            "code": "INTERNAL_SERVER_ERROR",
            "message": "An internal server error occurred while processing your request.",
            "details": str(exc),
            "detail": str(exc) or "An internal error occurred.",
        },
    )


# ---------------------------------------------------------------------------
# Routers & Health
# ---------------------------------------------------------------------------
app.include_router(documents.router, prefix="/api", tags=["Documents"])


@app.get("/health", tags=["Health"])
async def health_check() -> dict[str, str]:
    """Return backend health status."""
    return {"status": "healthy"}
