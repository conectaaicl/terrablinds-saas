"""
Sistema de permisos configurable por tenant.

Arquitectura:
  - DEFAULT_PERMISSIONS: permisos base por rol (hardcoded en código)
  - tenant_role_permissions: overrides guardados en DB por el jefe del tenant
  - UNDELEGATABLE_PERMISSIONS: acciones que nunca se pueden quitar/dar (seguridad)
  - get_effective_permissions(): merge de defaults + overrides del tenant
  - require_permission(): FastAPI dependency para proteger endpoints

Uso:
    @router.post("/clients/")
    async def create_client(
        _=Depends(require_permission("clients", "create")),
        token_data: TokenData = Depends(get_token_data),
        db: AsyncSession = Depends(get_db_for_tenant),
    ):
        ...
"""
from __future__ import annotations

import json
from functools import lru_cache
from typing import Callable

from fastapi import Depends, HTTPException, status
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth.dependencies import TokenData, get_token_data
from app.dependencies import get_db_for_tenant

# ── Permisos por defecto por rol ───────────────────────────────────────────
# Formato: {rol: {recurso: {acciones}}}

DEFAULT_PERMISSIONS: dict[str, dict[str, set[str]]] = {
    "superadmin": {
        # El superadmin tiene acceso total — se verifica antes que esta tabla
        "orders":        {"read", "create", "update", "delete", "change_estado", "assign"},
        "clients":       {"read", "create", "update", "delete"},
        "users":         {"read", "create", "update", "toggle", "delete"},
        "tenants":       {"read", "create", "update", "delete"},
        "insumos":       {"read", "create", "approve", "delete"},
        "notifications": {"read", "create", "delete"},
        "reports":       {"read"},
        "appointments":  {"read", "create", "update", "delete"},
        "checklists":    {"read", "create", "update", "delete"},
        "photos":        {"read", "create", "delete"},
        "signatures":    {"read", "create"},
        "incidents":     {"read", "create", "resolve"},
        "audit":         {"read"},
    },
    "jefe": {
        "orders":        {"read", "create", "update", "delete", "change_estado", "assign"},
        "clients":       {"read", "create", "update", "delete"},
        "users":         {"read", "create", "update", "toggle"},
        "tenants":       {"read_own", "update_branding"},
        "insumos":       {"read", "create", "approve"},
        "notifications": {"read", "create"},
        "reports":       {"read"},
        "appointments":  {"read", "create", "update", "delete"},
        "checklists":    {"read", "create", "update", "delete"},
        "photos":        {"read", "create", "delete"},
        "signatures":    {"read", "create"},
        "incidents":     {"read", "create", "resolve"},
        "audit":         {"read"},
    },
    "gerente": {
        "orders":        {"read", "create", "update", "change_estado", "assign"},
        "clients":       {"read", "create", "update"},
        "users":         {"read", "create", "toggle"},
        "insumos":       {"read", "create", "approve"},
        "notifications": {"read", "create"},
        "reports":       {"read"},
        "appointments":  {"read", "create", "update", "delete"},
        "checklists":    {"read", "create", "update"},
        "photos":        {"read", "create"},
        "signatures":    {"read"},
        "incidents":     {"read", "create", "resolve"},
        "audit":         {"read"},
    },
    "coordinador": {
        "orders":        {"read", "create", "update", "change_estado", "assign"},
        "clients":       {"read", "create", "update"},
        "users":         {"read"},
        "insumos":       {"read", "create"},
        "notifications": {"read", "create"},
        "appointments":  {"read", "create", "update", "delete"},
        "checklists":    {"read", "create", "update"},
        "photos":        {"read", "create"},
        "signatures":    {"read"},
        "incidents":     {"read", "create"},
    },
    "vendedor": {
        "orders":        {"read_own", "create"},
        "clients":       {"read", "create", "update"},
        "users":         {"read"},
        "insumos":       {"read"},
        "notifications": {"read"},
        "appointments":  {"read"},
        "checklists":    {"read"},
        "photos":        {"read"},
    },
    "fabricante": {
        "orders":        {"read_assigned", "change_estado"},
        "clients":       {"read"},
        "insumos":       {"read", "create"},
        "notifications": {"read"},
        "checklists":    {"read", "update"},
        "photos":        {"read", "create"},
        "incidents":     {"read", "create"},
    },
    "instalador": {
        "orders":        {"read_assigned", "change_estado"},
        "clients":       {"read"},
        "insumos":       {"read"},
        "notifications": {"read"},
        "appointments":  {"read_own"},
        "checklists":    {"read", "update"},
        "photos":        {"read", "create"},
        "signatures":    {"create"},
        "incidents":     {"read", "create"},
    },
}

# Permisos que jefe/gerente NO pueden delegar ni quitar
# (integridad del sistema, nunca configurables por tenant)
UNDELEGATABLE_PERMISSIONS: dict[str, set[str]] = {
    "users":   {"toggle"},          # siempre puede activar/desactivar
    "tenants": {"read_own"},        # siempre puede ver su propio tenant
    "audit":   {"read"},            # jefe siempre puede ver audit log
}


async def get_effective_permissions(
    db: AsyncSession,
    tenant_id: str,
    role: str,
) -> dict[str, set[str]]:
    """
    Retorna los permisos efectivos para el rol, considerando:
    1. Permisos base del DEFAULT_PERMISSIONS
    2. Overrides guardados en tenant_role_permissions (si la tabla existe)

    Los overrides pueden ampliar o restringir permisos dentro de lo que
    UNDELEGATABLE_PERMISSIONS garantiza.
    """
    base = {
        resource: set(actions)
        for resource, actions in DEFAULT_PERMISSIONS.get(role, {}).items()
    }

    # Intentar cargar overrides del tenant (la tabla puede no existir aún)
    try:
        result = await db.execute(
            text("""
                SELECT resource, action, permitido
                FROM tenant_role_permissions
                WHERE tenant_id = :tid AND rol = :role
            """),
            {"tid": tenant_id, "role": role},
        )
        rows = result.fetchall()
        for row in rows:
            resource, action, permitido = row.resource, row.action, row.permitido
            if resource not in base:
                base[resource] = set()
            if permitido:
                base[resource].add(action)
            else:
                # No quitar permisos que son undelegatable
                undel = UNDELEGATABLE_PERMISSIONS.get(resource, set())
                if action not in undel:
                    base[resource].discard(action)
    except Exception:
        # La tabla aún no existe (antes de migración 003) — usar defaults
        pass

    return base


def check_permission(
    permissions: dict[str, set[str]],
    resource: str,
    action: str,
) -> bool:
    """Verifica si el conjunto de permisos incluye resource/action."""
    return action in permissions.get(resource, set())


def require_permission(resource: str, action: str) -> Callable:
    """
    FastAPI dependency que valida permisos efectivos.

    Uso:
        @router.post("/")
        async def create(
            _=Depends(require_permission("clients", "create")),
            ...
        )
    """
    async def _check(
        token_data: TokenData = Depends(get_token_data),
        db: AsyncSession = Depends(get_db_for_tenant),
    ) -> TokenData:
        # superadmin siempre pasa
        if token_data.role == "superadmin":
            return token_data

        perms = await get_effective_permissions(db, token_data.tenant_id, token_data.role)
        if not check_permission(perms, resource, action):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Sin permiso para '{action}' en '{resource}'",
            )
        return token_data

    return _check
