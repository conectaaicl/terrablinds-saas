"""
Audit logging centralizado.

Escribe en la tabla audit_log (particionada por mes, creada en migración 003).
Falla silenciosamente para no interrumpir el flujo principal.

Uso:
    from app.audit import log_audit

    await log_audit(
        db,
        tenant_id=token_data.tenant_id,
        user_id=token_data.user_id,
        user_nombre=user.nombre,
        user_rol=token_data.role,
        action="change_estado",
        resource_type="order",
        resource_id=order_id,
        old_value={"estado": old_estado},
        new_value={"estado": new_estado},
        request=request,
    )
"""
from __future__ import annotations

import json
import logging
from typing import Any, Optional

from fastapi import Request
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

logger = logging.getLogger(__name__)


async def log_audit(
    db: AsyncSession,
    *,
    tenant_id: str,
    user_id: int,
    user_nombre: str,
    user_rol: str,
    action: str,
    resource_type: str,
    resource_id: Optional[int | str] = None,
    old_value: Optional[dict[str, Any]] = None,
    new_value: Optional[dict[str, Any]] = None,
    request: Optional[Request] = None,
) -> None:
    """
    Inserta una entrada en audit_log.
    Falla silenciosamente — el audit nunca debe romper el flujo principal.
    """
    ip_address: Optional[str] = None
    if request is not None:
        # Respetar X-Forwarded-For de Nginx/Cloudflare
        forwarded = request.headers.get("X-Forwarded-For")
        if forwarded:
            ip_address = forwarded.split(",")[0].strip()
        else:
            ip_address = request.client.host if request.client else None

    try:
        await db.execute(
            text("""
                INSERT INTO audit_log (
                    tenant_id, user_id, user_nombre, user_rol,
                    action, resource_type, resource_id,
                    old_value, new_value, ip_address
                ) VALUES (
                    :tenant_id, :user_id, :user_nombre, :user_rol,
                    :action, :resource_type, :resource_id,
                    :old_value::jsonb, :new_value::jsonb, :ip_address
                )
            """),
            {
                "tenant_id":     tenant_id,
                "user_id":       user_id,
                "user_nombre":   user_nombre,
                "user_rol":      user_rol,
                "action":        action,
                "resource_type": resource_type,
                "resource_id":   str(resource_id) if resource_id is not None else None,
                "old_value":     json.dumps(old_value) if old_value else None,
                "new_value":     json.dumps(new_value) if new_value else None,
                "ip_address":    ip_address,
            },
        )
        # No hacer flush aquí — el caller hace commit del transaction completo
    except Exception as exc:
        # La tabla puede no existir antes de la migración 003
        logger.warning("audit_log insert failed (ignoring): %s", exc)


async def log_order_event(
    db: AsyncSession,
    *,
    tenant_id: str,
    order_id: int,
    event_type: str,
    from_estado: Optional[str] = None,
    to_estado: Optional[str] = None,
    user_id: int,
    user_nombre: str,
    duration_minutes: Optional[int] = None,
    metadata: Optional[dict[str, Any]] = None,
) -> None:
    """
    Inserta un evento en order_events para métricas y trazabilidad.
    Falla silenciosamente.
    """
    try:
        await db.execute(
            text("""
                INSERT INTO order_events (
                    tenant_id, order_id, event_type,
                    from_estado, to_estado,
                    user_id, user_nombre,
                    duration_minutes, metadata
                ) VALUES (
                    :tenant_id, :order_id, :event_type,
                    :from_estado, :to_estado,
                    :user_id, :user_nombre,
                    :duration_minutes, :metadata::jsonb
                )
            """),
            {
                "tenant_id":        tenant_id,
                "order_id":         order_id,
                "event_type":       event_type,
                "from_estado":      from_estado,
                "to_estado":        to_estado,
                "user_id":          user_id,
                "user_nombre":      user_nombre,
                "duration_minutes": duration_minutes,
                "metadata":         json.dumps(metadata) if metadata else None,
            },
        )
    except Exception as exc:
        logger.warning("order_events insert failed (ignoring): %s", exc)
