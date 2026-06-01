"""
Dependencias de autenticación.

Dos niveles de validación:
  1. get_token_data()   → extrae datos del JWT + verifica user.activo en DB
  2. get_current_user() → carga el User completo desde DB (cuando se necesita)

require_roles(*roles) usa el nivel 1 para endpoints de solo autorización.
require_roles_user(*roles) usa el nivel 2 cuando se necesita el objeto User.
"""
from typing import Callable

from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth.service import decode_access_token

security = HTTPBearer()


class TokenData:
    """Datos del JWT sin DB lookup."""
    __slots__ = ("user_id", "tenant_id", "role")

    def __init__(self, user_id: int, tenant_id: str, role: str):
        self.user_id = user_id
        self.tenant_id = tenant_id
        self.role = role


def _parse_token(credentials: HTTPAuthorizationCredentials) -> TokenData:
    payload = decode_access_token(credentials.credentials)
    if payload is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token inválido o expirado",
            headers={"WWW-Authenticate": "Bearer"},
        )
    sub = payload.get("sub")
    if not sub:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token malformado",
        )
    return TokenData(
        user_id=int(sub),
        tenant_id=payload.get("tenant_id", ""),
        role=payload.get("role", ""),
    )


async def get_token_data(
    credentials: HTTPAuthorizationCredentials = Depends(security),
) -> TokenData:
    """
    Valida el JWT y verifica que el usuario siga activo en la base de datos.
    Si el usuario fue desactivado, rechaza la petición con 401 aunque el token
    no haya expirado aún.
    """
    from app.database import async_session
    from app.models.user import User
    from sqlalchemy import select

    token_data = _parse_token(credentials)

    is_superadmin = (token_data.role == "superadmin" or not token_data.tenant_id)

    async with async_session() as session:
        if is_superadmin:
            await session.execute(text("SET LOCAL row_security = off"))
        else:
            await session.execute(
                text("SELECT set_config('app.tenant_id', :tid, true)"),
                {"tid": token_data.tenant_id},
            )
        await session.execute(
            text("SELECT set_config('app.lookup_email', '', true)")
        )
        result = await session.execute(
            select(User.activo).where(User.id == token_data.user_id)
        )
        row = result.one_or_none()

    if row is None or not row.activo:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Usuario desactivado",
            headers={"WWW-Authenticate": "Bearer"},
        )

    return token_data


async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
):
    """
    Retorna el objeto User completo desde DB.
    Usar solo cuando se necesitan datos frescos (nombre actualizado, activo, etc.)
    Configura RLS con el tenant del token antes de la query.
    """
    from app.database import async_session
    from app.models.user import User
    from sqlalchemy import select

    token_data = _parse_token(credentials)

    is_superadmin = (token_data.role == "superadmin" or not token_data.tenant_id)

    async with async_session() as session:
        if is_superadmin:
            # Superadmin tiene tenant_id NULL — RLS lo bloquearía
            await session.execute(text("SET LOCAL row_security = off"))
        else:
            await session.execute(
                text("SELECT set_config('app.tenant_id', :tid, true)"),
                {"tid": token_data.tenant_id},
            )
        await session.execute(
            text("SELECT set_config('app.lookup_email', '', true)")
        )
        result = await session.execute(
            select(User).where(User.id == token_data.user_id)
        )
        user = result.scalar_one_or_none()

    if user is None or not user.activo:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Usuario no encontrado o inactivo",
        )
    return user


def require_roles(*roles: str) -> Callable:
    """
    Autorización por rol usando JWT + verificación de activo en DB.
    Retorna TokenData para uso en el handler.
    """
    async def checker(
        token_data: TokenData = Depends(get_token_data),
    ) -> TokenData:
        if token_data.role not in roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Rol '{token_data.role}' no tiene acceso. Requerido: {', '.join(roles)}",
            )
        return token_data

    return checker


def require_roles_user(*roles: str) -> Callable:
    """
    Autorización por rol con carga del objeto User desde DB.
    Usar cuando el handler necesita datos del usuario además del rol.
    """
    async def checker(
        current_user=Depends(get_current_user),
    ):
        if current_user.rol.value not in roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Rol '{current_user.rol.value}' no tiene acceso",
            )
        return current_user

    return checker
