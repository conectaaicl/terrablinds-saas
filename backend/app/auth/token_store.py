"""
Almacén de refresh tokens en Redis.

Diseño:
  - Tokens opacos (UUID v4), no JWTs → revocación instantánea
  - Rotación obligatoria: el token anterior se destruye al emitir uno nuevo
  - Detección de reutilización: si se usa un token ya rotado → revocar toda la sesión
  - TTL configurable por variable de entorno

Estructura en Redis:
  Key:   "rt:{uuid}"
  Value: JSON {"user_id": int, "tenant_id": str, "role": str, "created_at": ISO8601}
  TTL:   REFRESH_TOKEN_EXPIRE_DAYS * 86400 segundos
"""
import json
import uuid
from datetime import datetime, timezone
from typing import Optional

import redis.asyncio as aioredis

from app.config import get_settings

settings = get_settings()

_redis_client: Optional[aioredis.Redis] = None


async def get_redis() -> aioredis.Redis:
    """Pool de conexiones Redis — singleton por proceso."""
    global _redis_client
    if _redis_client is None:
        _redis_client = aioredis.from_url(
            settings.REDIS_URL,
            encoding="utf-8",
            decode_responses=True,
            max_connections=20,
            socket_timeout=5,
            socket_connect_timeout=5,
            retry_on_timeout=True,
        )
    return _redis_client


async def close_redis() -> None:
    global _redis_client
    if _redis_client:
        await _redis_client.aclose()
        _redis_client = None


class RefreshTokenStore:
    PREFIX = settings.REDIS_REFRESH_TOKEN_PREFIX
    TTL_SECONDS = settings.REFRESH_TOKEN_EXPIRE_DAYS * 86_400

    def __init__(self, redis: aioredis.Redis):
        self._r = redis

    def _key(self, token: str) -> str:
        return f"{self.PREFIX}{token}"

    async def create(self, user_id: int, tenant_id: str, role: str) -> str:
        """
        Crea un nuevo refresh token en Redis.
        Retorna el token opaco (UUID string).
        """
        token = str(uuid.uuid4())
        payload = json.dumps({
            "user_id": user_id,
            "tenant_id": tenant_id,
            "role": role,
            "created_at": datetime.now(timezone.utc).isoformat(),
        })
        await self._r.setex(self._key(token), self.TTL_SECONDS, payload)
        return token

    async def validate(self, token: str) -> Optional[dict]:
        """
        Valida el token en Redis.
        Retorna el payload dict o None si no existe/expiró.
        """
        raw = await self._r.get(self._key(token))
        if raw is None:
            return None
        return json.loads(raw)

    async def rotate(
        self, old_token: str, user_id: int, tenant_id: str, role: str
    ) -> Optional[str]:
        """
        Rotación atómica de refresh token:
          1. Elimina el token anterior (DELETE retorna 1 si existía, 0 si no)
          2. Si existía → crea token nuevo
          3. Si NO existía → posible reuse attack → retorna None

        El caller debe manejar None revocando toda la sesión del usuario.
        """
        deleted = await self._r.delete(self._key(old_token))
        if deleted == 0:
            # Token no existía en Redis: ya fue usado (rotado) o expiró.
            # Señal de posible reutilización → revocar todo.
            return None
        return await self.create(user_id, tenant_id, role)

    async def revoke(self, token: str) -> None:
        """Revoca un token específico (logout de sesión individual)."""
        await self._r.delete(self._key(token))

    async def revoke_all_for_user(self, user_id: int) -> int:
        """
        Revoca TODOS los refresh tokens de un usuario.
        Usar en: cambio de contraseña, cambio de rol, desactivación de cuenta.

        Nota: escanea Redis con SCAN (no KEYS) para no bloquear.
        Tiene coste O(n) sobre el total de tokens en Redis.
        Aceptable para la escala actual; considerar índice secundario a >10k usuarios.
        """
        pattern = f"{self.PREFIX}*"
        revoked = 0
        async for key in self._r.scan_iter(match=pattern, count=100):
            raw = await self._r.get(key)
            if raw:
                try:
                    payload = json.loads(raw)
                    if payload.get("user_id") == user_id:
                        await self._r.delete(key)
                        revoked += 1
                except (json.JSONDecodeError, KeyError):
                    continue
        return revoked
