"""
Endpoints para coordinadores — vista de agenda semanal y gestión de equipos.

  GET  /coordinator/agenda               — agenda semanal (7 días)
  POST /coordinator/appointments         — crear cita de instalación
  GET  /coordinator/orders/pending       — órdenes pendientes de agendar
  GET  /coordinator/teams                — equipos disponibles
"""
from datetime import date, datetime, timedelta, timezone
from typing import Optional
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy import select, text
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth.dependencies import TokenData, require_roles
from app.dependencies import get_db_for_tenant
from app.models.order import Order

router = APIRouter(prefix="/coordinator", tags=["coordinator"])


class AppointmentCreate(BaseModel):
    order_id: int
    fecha_inicio: datetime
    fecha_fin: Optional[datetime] = None
    direccion: Optional[str] = None
    notas: Optional[str] = None
    notas_cliente: Optional[str] = None
    team_id: Optional[UUID] = None
    notificacion_cliente: bool = False


@router.post("/appointments", status_code=201)
async def crear_appointment(
    data: AppointmentCreate,
    token_data: TokenData = Depends(require_roles("coordinador", "jefe", "gerente", "superadmin")),
    db: AsyncSession = Depends(get_db_for_tenant),
):
    """
    Crea una cita de instalación para una orden.
    Automáticamente cambia el estado de la orden a 'instalacion_programada'.
    """
    # Verificar que la orden existe
    result = await db.execute(
        text("SELECT id, estado FROM orders WHERE id = :id AND tenant_id = :tid"),
        {"id": data.order_id, "tid": token_data.tenant_id},
    )
    orden = result.fetchone()
    if not orden:
        raise HTTPException(status_code=404, detail="Orden no encontrada")

    try:
        # Crear appointment
        await db.execute(
            text("""
                INSERT INTO appointments
                    (tenant_id, order_id, team_id, fecha_inicio, fecha_fin,
                     direccion, notas, notas_cliente, notificacion_cliente,
                     estado, created_by, created_at)
                VALUES
                    (:tid, :order_id, :team_id, :fi, :ff,
                     :dir, :notas, :notas_cliente, :notif,
                     'pendiente', :created_by, NOW())
            """),
            {
                "tid": token_data.tenant_id,
                "order_id": data.order_id,
                "team_id": str(data.team_id) if data.team_id else None,
                "fi": data.fecha_inicio,
                "ff": data.fecha_fin,
                "dir": data.direccion,
                "notas": data.notas,
                "notas_cliente": data.notas_cliente,
                "notif": data.notificacion_cliente,
                "created_by": str(token_data.user_id),
            },
        )

        # Cambiar estado de la orden a instalacion_programada (si corresponde)
        if orden.estado in ("listo_para_instalar", "fabricado", "aprobada"):
            await db.execute(
                text("""
                    UPDATE orders
                    SET estado = 'instalacion_programada', updated_at = NOW()
                    WHERE id = :id AND tenant_id = :tid
                """),
                {"id": data.order_id, "tid": token_data.tenant_id},
            )
            # Registrar en historial
            await db.execute(
                text("""
                    INSERT INTO order_history
                        (order_id, estado, usuario_id, usuario_nombre, fecha, notas)
                    VALUES (:oid, 'instalacion_programada', :uid, 'Coordinador', NOW(), 'Instalación agendada')
                """),
                {"oid": data.order_id, "uid": str(token_data.user_id)},
            )

        await db.commit()
        return {"ok": True, "message": "Cita creada y orden actualizada"}

    except Exception as e:
        await db.rollback()
        raise HTTPException(status_code=500, detail=f"Error al crear cita: {str(e)}")


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
            Order.estado.in_(["fabricado", "listo_para_instalar"]),
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
