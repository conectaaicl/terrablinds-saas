"""
GPS Tracking — Posiciones de técnicos en terreno.

  POST /gps/ping               — Instalador envía su posición
  GET  /gps/active             — Coordinador ve últimas posiciones activas
  GET  /gps/order/{order_id}   — Historial GPS de una orden
  GET  /gps/my-position        — Última posición del usuario actual
"""
from fastapi import APIRouter, Depends
from sqlalchemy import select, text
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth.dependencies import TokenData, require_roles
from app.dependencies import get_db_for_tenant
from app.gps.schemas import GpsPingCreate, GpsLastPosition
from app.models.gps import GpsPing

router = APIRouter(prefix="/gps", tags=["gps"])

_ACTIVE_MINUTES = 30


@router.post("/ping", status_code=201)
async def enviar_ping(
    data: GpsPingCreate,
    token_data: TokenData = Depends(require_roles("instalador", "coordinador", "jefe", "gerente")),
    db: AsyncSession = Depends(get_db_for_tenant),
):
    """Instalador envía su posición GPS actual."""
    ping = GpsPing(
        tenant_id=token_data.tenant_id,
        user_id=token_data.user_id,
        lat=data.lat,
        lon=data.lon,
        precision_m=data.precision_m,
        velocidad_kmh=data.velocidad_kmh,
        heading=data.heading,
        order_id=data.order_id,
        appointment_id=data.appointment_id,
    )
    db.add(ping)
    await db.commit()
    return {"ok": True}


@router.get("/active", response_model=list[GpsLastPosition])
async def posiciones_activas(
    token_data: TokenData = Depends(require_roles("coordinador", "jefe", "gerente", "superadmin")),
    db: AsyncSession = Depends(get_db_for_tenant),
):
    """
    Retorna la última posición de cada técnico activo
    (ping en los últimos 30 minutos).
    """
    result = await db.execute(
        text("""
            SELECT
                gp.user_id,
                u.nombre AS user_nombre,
                u.rol    AS user_rol,
                gp.order_id,
                gp.appointment_id,
                gp.lat,
                gp.lon,
                gp.precision_m,
                gp.velocidad_kmh,
                gp.last_seen
            FROM v_gps_last_position gp
            JOIN users u ON u.id = gp.user_id
            WHERE gp.tenant_id = :tid
              AND gp.last_seen >= NOW() - INTERVAL '30 minutes'
            ORDER BY gp.last_seen DESC
        """),
        {"tid": token_data.tenant_id},
    )
    rows = result.fetchall()

    return [
        GpsLastPosition(
            user_id=r.user_id,
            user_nombre=r.user_nombre,
            user_rol=r.user_rol,
            order_id=r.order_id,
            appointment_id=r.appointment_id,
            lat=r.lat,
            lon=r.lon,
            precision_m=r.precision_m,
            velocidad_kmh=float(r.velocidad_kmh) if r.velocidad_kmh else None,
            last_seen=r.last_seen.isoformat(),
            maps_url=f"https://maps.google.com/?q={r.lat},{r.lon}",
        )
        for r in rows
    ]


@router.get("/order/{order_id}")
async def historial_orden(
    order_id: int,
    token_data: TokenData = Depends(require_roles("coordinador", "jefe", "gerente", "superadmin")),
    db: AsyncSession = Depends(get_db_for_tenant),
):
    """Historial de pings GPS de una orden (últimos 200)."""
    result = await db.execute(
        select(GpsPing)
        .where(GpsPing.order_id == order_id, GpsPing.tenant_id == token_data.tenant_id)
        .order_by(GpsPing.created_at.desc())
        .limit(200)
    )
    pings = result.scalars().all()
    return [
        {
            "lat": p.lat,
            "lon": p.lon,
            "precision_m": p.precision_m,
            "velocidad_kmh": float(p.velocidad_kmh) if p.velocidad_kmh else None,
            "maps_url": f"https://maps.google.com/?q={p.lat},{p.lon}",
            "created_at": p.created_at.isoformat(),
        }
        for p in pings
    ]


@router.get("/my-position")
async def mi_ultima_posicion(
    token_data: TokenData = Depends(require_roles("instalador", "coordinador", "jefe", "gerente")),
    db: AsyncSession = Depends(get_db_for_tenant),
):
    """Retorna el último ping GPS enviado por el usuario actual."""
    result = await db.execute(
        select(GpsPing)
        .where(GpsPing.user_id == token_data.user_id, GpsPing.tenant_id == token_data.tenant_id)
        .order_by(GpsPing.created_at.desc())
        .limit(1)
    )
    ping = result.scalar_one_or_none()
    if not ping:
        return {"posicion": None}
    return {
        "posicion": {
            "lat": ping.lat,
            "lon": ping.lon,
            "maps_url": f"https://maps.google.com/?q={ping.lat},{ping.lon}",
            "last_seen": ping.created_at.isoformat(),
        }
    }
