"""
Router de autenticación.

Endpoints:
  POST /auth/token         — login, emite access + refresh token
  POST /auth/token/refresh — rota el refresh token, emite nuevos
  POST /auth/logout        — revoca el refresh token en Redis
  GET  /auth/me            — info del usuario actual

Rate limiting:
  /auth/token         → 5/minuto por IP (login)
  /auth/token/refresh → 10/minuto por IP (refresh)
"""
from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession
from slowapi import Limiter
from slowapi.util import get_remote_address

from app.auth.dependencies import get_current_user, get_token_data
from app.auth.schemas import LoginRequest, RefreshRequest, TokenResponse
from app.auth.service import create_access_token, verify_password
from app.auth.token_store import RefreshTokenStore, get_redis
from app.database import get_db

router = APIRouter(prefix="/auth", tags=["auth"])
limiter = Limiter(key_func=get_remote_address)


async def _get_tenant_branding(db: AsyncSession, tenant_id: str) -> dict | None:
    """Carga branding sin RLS (tenants no tiene RLS habilitado)."""
    if not tenant_id:
        return None
    result = await db.execute(
        text("SELECT branding, nombre FROM tenants WHERE id = :tid"),
        {"tid": tenant_id},
    )
    row = result.fetchone()
    if not row:
        return None
    return row[0]


@router.post("/token", response_model=TokenResponse)
@limiter.limit("5/minute")
async def login(
    request: Request,
    body: LoginRequest,
    db: AsyncSession = Depends(get_db),
):
    """
    Login.
    Usa auth_lookup_user() (SECURITY DEFINER en PostgreSQL) para encontrar
    el usuario por email sin necesitar tenant_id y sin violar RLS.
    """
    result = await db.execute(
        text("SELECT * FROM auth_lookup_user(:email)"),
        {"email": str(body.email)},
    )
    row = result.fetchone()

    if row is None or not verify_password(body.password, row.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Email o contraseña incorrectos",
        )
    if not row.activo:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Cuenta desactivada. Contacta al administrador.",
        )

    user_id: int = row.id
    tenant_id: str = row.tenant_id or ""
    role: str = row.rol

    access_token = create_access_token(user_id, tenant_id, role)

    redis = await get_redis()
    store = RefreshTokenStore(redis)
    refresh_token = await store.create(user_id, tenant_id, role)

    branding = await _get_tenant_branding(db, tenant_id)

    # Cargar nombre del tenant
    tenant_nombre = None
    if tenant_id:
        t_result = await db.execute(
            text("SELECT nombre FROM tenants WHERE id = :tid"),
            {"tid": tenant_id},
        )
        t_row = t_result.fetchone()
        tenant_nombre = t_row[0] if t_row else None

    return TokenResponse(
        access_token=access_token,
        refresh_token=refresh_token,
        user={
            "id": user_id,
            "email": row.email,
            "nombre": row.nombre,
            "rol": role,
            "tenant_id": tenant_id,
            "activo": row.activo,
        },
        tenant_branding=branding,
        tenant_nombre=tenant_nombre,
    )


@router.post("/token/refresh", response_model=TokenResponse)
@limiter.limit("10/minute")
async def refresh(
    request: Request,
    body: RefreshRequest,
    db: AsyncSession = Depends(get_db),
):
    """
    Rota el refresh token.
    - Invalida el token anterior
    - Emite nuevos access + refresh token
    - Si el token anterior ya fue usado (reuse): revoca TODA la sesión del usuario
    """
    redis = await get_redis()
    store = RefreshTokenStore(redis)

    payload = await store.validate(body.refresh_token)
    if payload is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Refresh token inválido o expirado",
        )

    user_id: int = payload["user_id"]
    tenant_id: str = payload["tenant_id"]
    role: str = payload["role"]

    # Verificar que el usuario sigue activo usando función SECURITY DEFINER
    result = await db.execute(
        text("SELECT * FROM auth_lookup_user_by_id(:uid)"),
        {"uid": user_id},
    )
    user_row = result.fetchone()
    if user_row is None or not user_row.activo:
        await store.revoke(body.refresh_token)
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Usuario no encontrado o inactivo",
        )

    # Rotación atómica: invalida el viejo, crea el nuevo
    new_refresh_token = await store.rotate(body.refresh_token, user_id, tenant_id, role)
    if new_refresh_token is None:
        # El token ya fue consumido: posible reuse attack
        # Revocar todos los tokens del usuario como medida de seguridad
        await store.revoke_all_for_user(user_id)
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Sesión comprometida. Por seguridad, inicia sesión nuevamente.",
        )

    new_access_token = create_access_token(user_id, tenant_id, role)
    branding = await _get_tenant_branding(db, tenant_id)

    return TokenResponse(
        access_token=new_access_token,
        refresh_token=new_refresh_token,
        user={
            "id": user_id,
            "email": user_row.email,
            "nombre": user_row.nombre,
            "rol": role,
            "tenant_id": tenant_id,
            "activo": user_row.activo,
        },
        tenant_branding=branding,
        tenant_nombre=None,
    )


@router.post("/logout", status_code=204)
async def logout(
    body: RefreshRequest,
    _=Depends(get_token_data),
):
    """
    Revoca el refresh token en Redis.
    El access token sigue válido hasta su expiración (máx 15 min).
    Para invalidación inmediata del access token, reducir TTL o implementar JTI blacklist.
    """
    redis = await get_redis()
    store = RefreshTokenStore(redis)
    await store.revoke(body.refresh_token)


@router.get("/me")
async def me(
    current_user=Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Retorna datos completos del usuario autenticado."""
    tenant_id = current_user.tenant_id or ""
    branding = await _get_tenant_branding(db, tenant_id)
    tenant_nombre = None

    if tenant_id:
        result = await db.execute(
            text("SELECT nombre FROM tenants WHERE id = :tid"),
            {"tid": tenant_id},
        )
        row = result.fetchone()
        tenant_nombre = row[0] if row else None

    return {
        "id": current_user.id,
        "email": current_user.email,
        "nombre": current_user.nombre,
        "rol": current_user.rol.value,
        "tenant_id": tenant_id,
        "activo": current_user.activo,
        "tenant_branding": branding,
        "tenant_nombre": tenant_nombre,
    }
