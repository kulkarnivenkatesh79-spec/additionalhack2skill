"""
AI Legal Assist — Application configuration.

Loads environment variables via Pydantic Settings and validates that all
required values (e.g. ``GEMINI_API_KEY``) are present at startup.
"""

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Typed, validated application settings loaded from ``.env``.

    Attributes:
        gemini_api_key: Google Gemini API key (required).
        backend_host: Host to bind the server to.
        backend_port: Port to bind the server to.
        rate_limit: Default rate limit string (e.g. ``"10/minute"``).
        max_upload_bytes: Maximum upload file size in bytes (default 2 MB).
        allowed_extensions: Set of allowed file extensions for upload.
    """

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )

    gemini_api_key: str = ""
    gemini_model: str = "gemini-3-flash-preview"
    backend_host: str = "0.0.0.0"
    backend_port: int = 8008
    rate_limit: str = "30/minute"
    max_upload_bytes: int = 2 * 1024 * 1024  # 2 MB
    allowed_extensions: set[str] = {".pdf", ".txt", ".docx"}


settings = Settings()
