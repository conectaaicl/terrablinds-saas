from pydantic_settings import BaseSettings
from functools import lru_cache


class Settings(BaseSettings):
    # Base de datos (obligatorio en producción, default solo para dev local)
    DATABASE_URL: str = "postgresql+asyncpg://workshopos:workshopos@localhost:5432/workshopos"

    # JWT — en producción DEBE venir del .env, sin default seguro aquí
    SECRET_KEY: str = "dev-only-change-in-production-openssl-rand-hex-32"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 15
    REFRESH_TOKEN_EXPIRE_DAYS: int = 7

    # Redis
    REDIS_URL: str = "redis://localhost:6379/0"
    REDIS_REFRESH_TOKEN_PREFIX: str = "rt:"

    # CORS
    CORS_ORIGINS: str = "http://localhost:5173,http://localhost:3000"

    # Entorno: "production" deshabilita /docs
    ENVIRONMENT: str = "development"

    # Upload de archivos
    UPLOAD_DIR: str = "uploads"
    MAX_UPLOAD_MB: int = 10

    # Email (Resend) — opcional; si no está configurado no se envían emails
    RESEND_API_KEY: str = ""
    FROM_EMAIL: str = "noreply@works.conectaai.cl"
    FROM_NAME: str = "WorkshopOS"

    # Groq AI — para post-venta, sugerencias, análisis
    GROQ_API_KEY: str = ""

    # n8n Webhooks — opcionales; si están vacíos no se disparan
    N8N_WEBHOOK_NUEVO_CLIENTE: str = ""
    N8N_WEBHOOK_ORDEN_CERRADA: str = ""
    N8N_WEBHOOK_POST_VENTA: str = ""
    N8N_WEBHOOK_TRACKING: str = ""

    # URL pública del frontend (para links de tracking)
    FRONTEND_URL: str = "https://works.conectaai.cl"

    model_config = {"env_file": ".env", "extra": "ignore"}


@lru_cache
def get_settings() -> Settings:
    return Settings()
