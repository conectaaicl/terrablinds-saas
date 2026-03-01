"""
Endpoints para coordinadores — vista de agenda semanal y gestión de equipos.

  GET  /coordinator/agenda          — agenda semanal (7 días)
  GET  /coordinator/agenda/today    — agenda de hoy con detalles
  GET  /coordinator/orders/pending  — órdenes pendientes de agendar (estado: fabricado)
  GET  /coordinator/teams           — equipos disponibles
"""
from datetime import date, datetime, timedelta, timezone

from fastapi import APIRouter, Depends
from sqlalchemy import select, text
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth.dependencies import TokenData, require_roles
from app.dependencies import get_db_for_tenant
from app.models.order import Order

router = APIRouter(prefix="/coordinator", tags=["coordinator"])


@router.get("/agenda")
async def weekly_agenda(
    token_data: TokenData = Depends(require_roles(
        "coordinador", "jefe", "gerente", "superadmin"
    )),
    db: AsyncSession = Depends(get_db_for_tenant),
):
    """
    Agenda semanal agrupada por día.
    Retorna los próximos 7 días con citas agendadas.
    Fallback a órdenes si appointments aún no existe.
    """
    today = date.today()
    week_end = today + timedelta(days=7)
    start = datetime(today.year, today.month, today.day, tzinfo=timezone.utc)
    end   = datetime(week_end.year, week_end.month, week_end.day, tzinfo=timezone.utc)

    try:
        result = await db.execute(
            text("""
                SELECT
                    a.id            AS appointment_id,
                    a.order_id,
                    a.fecha_inicio,
                    a.fecha_fin,
                    a.direccion,
                    a.estado        AS appointment_estado,
                    a.team_id,
                    t.nombre        AS team_nombre,
                    o.numero        AS order_numero,
                    o.estado        AS order_estado,
                    o.precio_total,
                    c.nombre        AS cliente_nombre,
                    c.telefono      AS cliente_telefono,
                    c.direccion     AS cliente_direccion
                FROM appointments a
                JOIN orders o    ON o.id = a.order_id
                JOIN clients c   ON c.id = o.cliente_id
                LEFT JOIN teams t ON t.id = a.team_id
                WHERE a.fecha_inicio BETWEEN :start AND :end
                ORDER BY a.fecha_inicio
            """),
            {"start": start, "end": end},
        )
        rows = result.fetchall()

        # Agrupar por día
        agenda: dict[str, list] = {}
        for r in rows:
            day = r.fecha_inicio.date().isoformat()
            if day not in agenda:
                agenda[day] = []
            agenda[day].append({
                "appointment_id":     r.appointment_id,
                "order_id":           r.order_id,
                "order_numero":       r.order_numero,
                "order_estado":       r.order_estado,
                "appointment_estado": r.appointment_estado,
                "fecha_inicio":       r.fecha_inicio.isoformat(),
                "fecha_fin":          r.fecha_fin.isoformat() if r.fecha_fin else None,
                "direccion":          r.direccion,
                "team_id":            r.team_id,
                "team_nombre":        r.team_nombre,
                "precio_total":       r.precio_total,
                "cliente_nombre":     r.cliente_nombre,
                "cliente_telefono":   r.cliente_telefono,
                "cliente_direccion":  r.cliente_direccion,
            })

        return {
            "desde": today.isoformat(),
            "hasta": week_end.isoformat(),
            "dias": [
                {
                    "fecha": (today + timedelta(days=i)).isoformat(),
                    "citas": agenda.get((today + timedelta(days=i)).isoformat(), []),
                }
                for i in range(7)
            ],
        }
    except Exception:
        return {"desde": today.isoformat(), "hasta": week_end.isoformat(), "dias": []}


@router.get("/orders/pending-schedule")
async def orders_pending_schedule(
    token_data: TokenData = Depends(require_roles(
        "coordinador", "jefe", "gerente", "superadmin"
    )),
    db: AsyncSession = Depends(get_db_for_tenant),
):
    """
    Órdenes en estado 'fabricado' que aún no tienen cita agendada.
    Útil para que la coordinadora sepa qué debe agendar.
    """
    result = await db.execute(
        select(Order).where(
            Order.tenant_id == token_data.tenant_id,
            Order.estado == "fabricado",
        ).order_by(Order.created_at)
    )
    orders = result.scalars().all()

    return [
        {
            "id":          o.id,
            "numero":      o.numero,
            "estado":      o.estado,
            "precio_total":o.precio_total,
            "fabricante_id":o.fabricante_id,
            "created_at":  o.created_at.isoformat() if o.created_at else None,
        }
        for o in orders
    ]


@router.get("/teams")
async def list_teams(
    token_data: TokenData = Depends(require_roles(
        "coordinador", "jefe", "gerente", "superadmin"
    )),
    db: AsyncSession = Depends(get_db_for_tenant),
):
    """Equipos activos del tenant con sus miembros."""
    try:
        result = await db.execute(
            text("""
                SELECT
                    t.id, t.nombre, t.tipo,
                    json_agg(
                        json_build_object(
                            'user_id',       tm.user_id,
                            'nombre',        u.nombre,
                            'rol_en_equipo', tm.rol_en_equipo
                        ) ORDER BY tm.rol_en_equipo DESC
                    ) FILTER (WHERE tm.id IS NOT NULL) AS miembros
                FROM teams t
                LEFT JOIN team_memberships tm ON tm.team_id = t.id AND tm.activo = TRUE
                LEFT JOIN users u ON u.id = tm.user_id
                WHERE t.activo = TRUE
                GROUP BY t.id, t.nombre, t.tipo
                ORDER BY t.nombre
            """)
        )
        rows = result.fetchall()
        return [
            {
                "id":      r.id,
                "nombre":  r.nombre,
                "tipo":    r.tipo,
                "miembros": r.miembros or [],
            }
            for r in rows
        ]
    except Exception:
        return []
