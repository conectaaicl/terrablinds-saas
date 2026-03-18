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
from app.database import get_db
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


@router.get("/tracking/{token}")
async def tracking_publico(
    token: str,
    db: AsyncSession = Depends(get_db),
):
    """
    Endpoint PÚBLICO (sin auth) para que el cliente vea la posición del técnico.
    El token es un UUID generado cuando la orden pasa a 'en_camino', con TTL 8h en Redis.
    Usa get_db (sin RLS) ya que el cliente no tiene JWT. La seguridad la provee el token opaco.
    """
    import json as _json
    from fastapi import HTTPException as _HTTPException
    from app.auth.token_store import get_redis

    redis = await get_redis()
    key = f"tracking:{token}"
    raw = await redis.get(key)
    if not raw:
        raise _HTTPException(status_code=404, detail="Enlace de seguimiento no válido o expirado")

    data = _json.loads(raw)
    order_id = data["order_id"]
    tenant_id = data["tenant_id"]

    # Buscar último ping GPS de la orden (sin RLS, consulta directa con tenant_id explícito)
    result = await db.execute(
        text("""
            SELECT gp.lat, gp.lon, gp.precision_m, gp.velocidad_kmh, gp.created_at,
                   u.nombre AS tecnico_nombre, o.estado
            FROM gps_pings gp
            JOIN users u ON u.id = gp.user_id
            JOIN orders o ON o.id = gp.order_id
            WHERE gp.order_id = :oid
              AND gp.tenant_id = :tid
            ORDER BY gp.created_at DESC
            LIMIT 1
        """),
        {"oid": order_id, "tid": tenant_id},
    )
    row = result.fetchone()
    if not row:
        # Obtener estado de la orden sin GPS
        o_result = await db.execute(
            text("SELECT estado FROM orders WHERE id = :oid AND tenant_id = :tid"),
            {"oid": order_id, "tid": tenant_id},
        )
        o_row = o_result.fetchone()
        return {
            "estado": o_row.estado if o_row else "en_camino",
            "posicion": None,
            "mensaje": "El técnico aún no ha enviado su posición GPS.",
        }

    return {
        "estado": row.estado,
        "tecnico_nombre": row.tecnico_nombre,
        "posicion": {
            "lat": row.lat,
            "lon": row.lon,
            "precision_m": row.precision_m,
            "velocidad_kmh": float(row.velocidad_kmh) if row.velocidad_kmh else None,
            "maps_url": f"https://maps.google.com/?q={row.lat},{row.lon}",
            "last_seen": row.created_at.isoformat(),
        },
    }


@router.post("/tracking/start/{order_id}")
async def activar_tracking(
    order_id: int,
    token_data: TokenData = Depends(require_roles("instalador", "coordinador", "jefe", "gerente")),
    db: AsyncSession = Depends(get_db_for_tenant),
):
    """
    Activa el tracking GPS para una orden.
    Genera un token opaco, lo guarda en Redis (TTL 8h) y lo retorna
    para que el frontend pueda compartir el enlace al cliente.
    """
    import json as _json
    import uuid as _uuid
    from fastapi import HTTPException as _HTTPException
    from sqlalchemy import select as _select
    from app.auth.token_store import get_redis
    from app.models.order import Order

    result = await db.execute(
        _select(Order).where(Order.id == order_id, Order.tenant_id == token_data.tenant_id)
    )
    order = result.scalar_one_or_none()
    if not order:
        raise _HTTPException(status_code=404, detail="Orden no encontrada")

    # Reutilizar token existente o generar uno nuevo
    tracking_token = order.tracking_token or str(_uuid.uuid4())
    order.tracking_token = tracking_token
    order.tracking_activo = True
    await db.commit()

    # Guardar en Redis con TTL 8 horas
    redis = await get_redis()
    key = f"tracking:{tracking_token}"
    await redis.set(
        key,
        _json.dumps({"order_id": order_id, "tenant_id": token_data.tenant_id}),
        ex=28800,  # 8 horas
    )

    from app.config import settings
    tracking_url = f"{settings.FRONTEND_URL}/#/tracking/{tracking_token}"

    # Disparar webhook n8n en background
    try:
        from app.services.n8n_webhook import trigger_tracking_activado
        import asyncio
        instalador_nombre = ""  # No cargamos relaciones aquí para no hacer N+1
        asyncio.create_task(
            trigger_tracking_activado(order_id, tracking_token, instalador_nombre, "", token_data.tenant_id)
        )
    except Exception:
        pass

    return {"ok": True, "tracking_token": tracking_token, "tracking_url": tracking_url}


@router.post("/tracking/stop/{order_id}")
async def desactivar_tracking(
    order_id: int,
    token_data: TokenData = Depends(require_roles("instalador", "coordinador", "jefe", "gerente")),
    db: AsyncSession = Depends(get_db_for_tenant),
):
    """Desactiva el tracking GPS de una orden."""
    from fastapi import HTTPException as _HTTPException
    from sqlalchemy import select as _select
    from app.models.order import Order

    result = await db.execute(
        _select(Order).where(Order.id == order_id, Order.tenant_id == token_data.tenant_id)
    )
    order = result.scalar_one_or_none()
    if not order:
        raise _HTTPException(status_code=404, detail="Orden no encontrada")

    order.tracking_activo = False
    await db.commit()
    return {"ok": True}


@router.get("/my-orders")
async def mis_ordenes_instalador(
    token_data: TokenData = Depends(require_roles("instalador")),
    db: AsyncSession = Depends(get_db_for_tenant),
):
    """Retorna las órdenes asignadas al instalador que están en estados activos."""
    result = await db.execute(
        text("""
            SELECT o.id, o.numero, o.estado, o.tracking_token, o.tracking_activo,
                   c.nombre AS cliente_nombre, c.direccion AS cliente_direccion,
                   c.telefono AS cliente_telefono
            FROM orders o
            JOIN clients c ON c.id = o.cliente_id
            WHERE o.tenant_id = :tid
              AND o.instalador_id = :uid
              AND o.estado IN (
                  'instalacion_programada','en_camino','instalando',
                  'agendado','en_ruta','en_instalacion','pendiente_firma'
              )
            ORDER BY o.updated_at DESC NULLS LAST
        """),
        {"tid": token_data.tenant_id, "uid": token_data.user_id},
    )
    rows = result.fetchall()
    from app.config import settings
    return [
        {
            "id": r.id,
            "numero": r.numero,
            "estado": r.estado,
            "tracking_activo": r.tracking_activo,
            "tracking_token": r.tracking_token,
            "tracking_url": f"{settings.FRONTEND_URL}/#/tracking/{r.tracking_token}" if r.tracking_token else None,
            "cliente_nombre": r.cliente_nombre,
            "cliente_direccion": r.cliente_direccion,
            "cliente_telefono": r.cliente_telefono,
        }
        for r in rows
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
