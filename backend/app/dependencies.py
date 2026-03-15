"""
Dependencias centrales de la aplicación.

get_db_for_tenant() — sesión de DB con RLS configurado para el tenant del JWT.
  - Extrae tenant_id y role directamente del token (sin DB hit adicional)
  - Ejecuta SET LOCAL app.tenant_id dentro de la transacción
  - El RLS de PostgreSQL filtra automáticamente todas las queries

set_tenant_context() — cambia el tenant en el contexto RLS.
  - USO EXCLUSIVO: endpoints de superadmin que reciben target_tenant_id como parámetro

ELIMINADO: cualquier patrón "__all__" o bypass de tenant.
"""
from typing import AsyncGenerator

from fastapi import Depends, HTTPException, status
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth.dependencies import TokenData, get_token_data
from app.database import async_session
from app.models.user import RoleEnum


async def get_db_for_tenant(
    token_data: TokenData = Depends(get_token_data),
) -> AsyncGenerator[AsyncSession, None]:
    """
    Sesión de DB con RLS configurado.

    Superadmin: app.tenant_id = '' (vacío).
      → Accede a CERO filas en tablas con RLS hasta que se llame set_tenant_context().
      → Para operar sobre un tenant, el endpoint debe llamar set_tenant_context(db, tenant_id).

    Cualquier otro rol: app.tenant_id = su tenant_id.
      → RLS filtra automáticamente. No necesita ningún parámetro adicional.

    SET LOCAL persiste durante la transacción actual (toda la request HTTP).
    Compatible con PgBouncer en modo transaction.
    """
    tenant_id = token_data.tenant_id

    # Superadmin no tiene tenant propio — empieza sin contexto
    # Los endpoints de superadmin llaman a set_tenant_context() explícitamente
    if token_data.role != RoleEnum.superadmin and not tenant_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Usuario sin tenant asignado",
        )

    async with async_session() as session:
        try:
            await session.execute(
                text("SELECT set_config('app.tenant_id', :tid, true)"),
                {"tid": tenant_id},
            )
            # Limpiar lookup_email (no debe quedar de otra request)
            await session.execute(
                text("SELECT set_config('app.lookup_email', '', true)")
            )
            yield session
            await session.commit()
        except Exception:
            await session.rollback()
            raise


async def set_tenant_context(db: AsyncSession, tenant_id: str) -> None:
    """
    Cambia el tenant_id en el contexto RLS de la sesión actual.

    USO EXCLUSIVO para endpoints de superadmin.
    El superadmin debe pasar el tenant_id explícitamente en la URL/query param.
    Nunca se usa para usuarios normales (su tenant viene del JWT).
    """
    if not tenant_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Se requiere tenant_id para esta operación",
        )
    await db.execute(
        text("SELECT set_config('app.tenant_id', :tid, true)"),
        {"tid": tenant_id},
    )


def get_tenant_id_from_token(token_data: TokenData = Depends(get_token_data)) -> str:
    """
    Retorna el tenant_id del token.
    Para usuarios normales es su tenant.
    Para superadmin es vacío (deben pasarlo explícitamente).
    """
    return token_data.tenant_id


def get_tenant_scope(user) -> str:
    """Retorna el tenant_id del usuario, o '__all__' para superadmin."""
    if getattr(user, 'rol', None) and str(user.rol).endswith('superadmin'):
        return '__all__'
    return user.tenant_id or ''


def require_superadmin(token_data: TokenData = Depends(get_token_data)) -> TokenData:
    """Verifica que el usuario sea superadmin."""
    if token_data.role != RoleEnum.superadmin:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Solo superadmin puede realizar esta operación",
        )
    return token_data
