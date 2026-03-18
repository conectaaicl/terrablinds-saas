"""
Servicio de autenticación.

JWT de acceso:
  - Corto plazo: 15 minutos
  - Payload: user_id (sub), tenant_id, role, type="access", jti
  - No contiene email (menos información expuesta, más estable)

Refresh token:
  - Opaco (UUID v4), NO un JWT
  - Almacenado en Redis con TTL
  - Rotado en cada uso (detecta reutilización)
  - Ver token_store.py para la implementación de Redis
"""
import uuid
from datetime import datetime, timedelta, timezone

import bcrypt as _bcrypt
from jose import JWTError, jwt

from app.config import get_settings

settings = get_settings()


def hash_password(password: str) -> str:
    return _bcrypt.hashpw(password.encode("utf-8"), _bcrypt.gensalt(rounds=12)).decode("utf-8")


def verify_password(plain_password: str, hashed_password: str) -> bool:
    try:
        return _bcrypt.checkpw(plain_password.encode("utf-8"), hashed_password.encode("utf-8"))
    except Exception:
        return False


def create_access_token(user_id: int, tenant_id: str, role: str) -> str:
    """
    Genera un JWT de acceso.

    Campos del payload:
      sub       — user_id como string (identificador estable)
      tenant_id — tenant del usuario (extraído en cada request sin DB hit)
      role      — rol del usuario (para validación rápida en depend.)
      type      — discriminador: "access"
      jti       — UUID único por token (trazabilidad, future revocation)
      iat       — issued at
      exp       — expiración
    """
    now = datetime.now(timezone.utc)
    expire = now + timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    payload = {
        "sub": str(user_id),
        "tenant_id": tenant_id or "",
        "role": role,
        "type": "access",
        "jti": str(uuid.uuid4()),
        "iat": now,
        "exp": expire,
    }
    return jwt.encode(payload, settings.SECRET_KEY, algorithm=settings.ALGORITHM)


def decode_access_token(token: str) -> dict | None:
    """
    Decodifica y valida un JWT de acceso.
    Retorna None si: expirado, firma inválida, o type != "access".
    """
    try:
        payload = jwt.decode(
            token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM]
        )
        if payload.get("type") != "access":
            return None
        return payload
    except JWTError:
        return None
