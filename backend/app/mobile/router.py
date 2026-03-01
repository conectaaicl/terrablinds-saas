"""
Endpoints móvil-first para instaladores y fabricantes.

Optimizados para uso en campo desde celular:
  GET  /mobile/my-agenda        — citas de hoy + mañana del instalador
  GET  /mobile/my-orders        — órdenes asignadas al usuario
  POST /mobile/orders/{id}/estado — cambiar estado con validación de transiciones
"""
from datetime import date, datetime, timedelta, timezone
from typing import Optional

from fastapi import APIRouter, Depends
from sqlalchemy import select, text
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth.dependencies import TokenData, require_roles
from app.dependencies import get_db_for_tenant
from app.models.order import Order

router = APIRouter(prefix="/mobile", tags=["mobile"])


@router.get("/my-agenda")
async def my_agenda(
    token_data: TokenData = Depends(require_roles("instalador", "fabricante")),
    db: AsyncSession = Depends(get_db_for_tenant),
):
    """
    Agenda personalizada del instalador para hoy y mañana.
    Si no hay tabla appointments (antes de migración 003),
    retorna las órdenes asignadas como fallback.
    """
    today = date.today()
    tomorrow = today + timedelta(days=1)
    start = datetime(today.year, today.month, today.day, tzinfo=timezone.utc)
    end   = datetime(tomorrow.year, tomorrow.month, tomorrow.day, 23, 59, 59, tzinfo=timezone.utc)

    try:
        result = await db.execute(
            text("""
                SELECT
                    a.id            AS appointment_id,
                    a.order_id,
                    a.fecha_inicio,
                    a.fecha_fin,
                    a.direccion,
                    a.notas,
                    a.estado        AS appointment_estado,
                    o.numero        AS order_numero,
                    o.estado        AS order_estado,
                    o.precio_total,
                    o.productos,
                    c.nombre        AS cliente_nombre,
                    c.telefono      AS cliente_telefono
                FROM appointments a
                JOIN orders o   ON o.id = a.order_id
                JOIN clients c  ON c.id = o.cliente_id
                WHERE a.fecha_inicio BETWEEN :start AND :end
                  AND EXISTS (
                      SELECT 1 FROM appointment_members am
                      WHERE am.appointment_id = a.id
                        AND am.user_id = :uid
                  )
                ORDER BY a.fecha_inicio
            """),
            {"start": start, "end": end, "uid": token_data.user_id},
        )
        rows = result.fetchall()
        appointments = [
            {
                "appointment_id":    r.appointment_id,
                "order_id":          r.order_id,
                "order_numero":      r.order_numero,
                "order_estado":      r.order_estado,
                "appointment_estado":r.appointment_estado,
                "fecha_inicio":      r.fecha_inicio.isoformat() if r.fecha_inicio else None,
                "fecha_fin":         r.fecha_fin.isoformat() if r.fecha_fin else None,
                "direccion":         r.direccion,
                "notas":             r.notas,
                "precio_total":      r.precio_total,
                "productos":         r.productos,
                "cliente_nombre":    r.cliente_nombre,
                "cliente_telefono":  r.cliente_telefono,
            }
            for r in rows
        ]
    except Exception:
        # Tabla appointments aún no existe — usar órdenes asignadas
        appointments = []

    return {
        "fecha": today.isoformat(),
        "user_id": token_data.user_id,
        "appointments": appointments,
    }


@router.get("/my-orders")
async def my_orders(
    token_data: TokenData = Depends(require_roles("instalador", "fabricante")),
    db: AsyncSession = Depends(get_db_for_tenant),
):
    """Órdenes activas asignadas al usuario (no terminales)."""
    field = (
        Order.instalador_id
        if token_data.role == "instalador"
        else Order.fabricante_id
    )
    terminales = ("cerrado", "cancelado", "rechazado")

    result = await db.execute(
        select(Order).where(
            field == token_data.user_id,
            Order.tenant_id == token_data.tenant_id,
            ~Order.estado.in_(terminales),
        ).order_by(Order.created_at.desc())
    )
    orders = result.scalars().all()

    return [
        {
            "id":          o.id,
            "numero":      o.numero,
            "estado":      o.estado,
            "precio_total":o.precio_total,
            "created_at":  o.created_at.isoformat() if o.created_at else None,
        }
        for o in orders
    ]


@router.get("/transitions/{estado_actual}")
async def get_transitions(
    estado_actual: str,
    token_data: TokenData = Depends(require_roles(
        "instalador", "fabricante", "coordinador", "jefe", "gerente"
    )),
    _db: AsyncSession = Depends(get_db_for_tenant),
):
    """Retorna las transiciones permitidas desde el estado actual para el rol del usuario."""
    from app.orders.transitions import TRANSITION_MAP

    transitions = TRANSITION_MAP.get(estado_actual, {})
    allowed = [
        {"estado": dest, "requires_notas": rule.requires_notas}
        for dest, rule in transitions.items()
        if token_data.role in rule.allowed_roles
    ]
    return {"estado_actual": estado_actual, "transiciones": allowed}
