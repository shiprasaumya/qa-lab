import os
from dataclasses import dataclass


def _as_int(value: str | None, default: int) -> int:
    try:
        return int(value) if value is not None else default
    except Exception:
        return default


@dataclass(frozen=True)
class Settings:
    app_name: str = os.getenv("APP_NAME", "TestMind AI API")
    environment: str = os.getenv("ENVIRONMENT", "development")
    log_level: str = os.getenv("LOG_LEVEL", "INFO").upper()

    openai_api_key: str = os.getenv("OPENAI_API_KEY", "")
    openai_model: str = os.getenv("OPENAI_MODEL", "gpt-4o-mini")

    supabase_url: str = os.getenv("SUPABASE_URL", "")
    supabase_anon_key: str = os.getenv("SUPABASE_ANON_KEY", "")
    supabase_service_role_key: str = os.getenv("SUPABASE_SERVICE_ROLE_KEY", "")

    request_timeout_seconds: int = _as_int(os.getenv("REQUEST_TIMEOUT_SECONDS"), 30)
    max_attachment_fetch_mb: int = _as_int(os.getenv("MAX_ATTACHMENT_FETCH_MB"), 8)
    max_extracted_text_chars: int = _as_int(os.getenv("MAX_EXTRACTED_TEXT_CHARS"), 12000)
    max_requirement_chars: int = _as_int(os.getenv("MAX_REQUIREMENT_CHARS"), 20000)

    api_retry_attempts: int = _as_int(os.getenv("API_RETRY_ATTEMPTS"), 2)
    api_retry_delay_ms: int = _as_int(os.getenv("API_RETRY_DELAY_MS"), 700)

    allowed_origins_raw: str = os.getenv("ALLOWED_ORIGINS", "*")

    @property
    def allowed_origins(self) -> list[str]:
        raw = self.allowed_origins_raw.strip()
        if not raw or raw == "*":
            return ["*"]
        return [item.strip() for item in raw.split(",") if item.strip()]


settings = Settings()
