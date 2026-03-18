"""
Post-Venta — seguimiento post-instalación, garantías, satisfacción.

GET    /post-venta/              — Listar (con filtros)
POST   /post-venta/              — Crear (manualmente o via n8n)
GET    /post-venta/stats         — Estadísticas del tenant
GET    /post-venta/{id}          — Detalle
PATCH  /post-venta/{id}          — Actualizar
POST   /post-venta/{id}/nota     — Agregar nota de seguimiento
POST   /post-venta/{id}/ai       — Generar mensaje IA con Groq
DELETE /post-venta/{id}          — Eliminar
"""
import asyncio
from datetime import datetime, timezone
from uuid import UUID, uuid4

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.auth.dependencies import require_roles, TokenData
from app.dependencies import get_db_for_tenant
from app.models.post_venta import PostVenta
from app.models.client import Client
from app.models.order import Order
from app.post_venta.schemas import PostVentaCreate, PostVentaUpdate, PostVentaOut, NotaAdd
from app.services.groq_ai import generar_mensaje_post_venta
from app.services.n8n_webhook import trigger_post_venta_creado, trigger_post_venta_ai_mensaje

router = APIRouter(prefix="/post-venta", tags=["post-venta"])

ROLES_ALL = ("jefe", "gerente", "coordinador")


def _to_out(pv: PostVenta, client: Client | None = None) -> PostVentaOut:
    return PostVentaOut(
        id=pv.id,
        tenant_id=pv.tenant_id,
        order_id=pv.order_id,
        client_id=pv.client_id,
        client_nombre=client.nombre if client else None,
        client_telefono=client.telefono if client else None,
        tipo=pv.tipo,
        estado=pv.estado,
        descripcion=pv.descripcion,
        calificacion=pv.calificacion,
        ai_mensaje=pv.ai_mensaje,
        notas=pv.notas or [],
        fecha_programada=pv.fecha_programada,
        fecha_resolucion=pv.fecha_resolucion,
        created_at=pv.created_at,
    )


@router.get("/stats")
async def get_stats(
    token_data: TokenData = Depends(require_roles(*ROLES_ALL)),
    db: AsyncSession = Depends(get_db_for_tenant),
):
    """KPIs de post-venta del tenant."""
    base = select(PostVenta).where(PostVenta.tenant_id == token_data.tenant_id)
    result = await db.execute(base)
    all_pv = result.scalars().all()

    total = len(all_pv)
    pendientes = sum(1 for p in all_pv if p.estado == "pendiente")
    resueltos = sum(1 for p in all_pv if p.estado == "resuelto")
    garantias = sum(1 for p in all_pv if p.tipo == "garantia")
    calificaciones = [p.calificacion for p in all_pv if p.calificacion]
    promedio = round(sum(calificaciones) / len(calificaciones), 1) if calificaciones else None

    return {
        "total": total,
        "pendientes": pendientes,
        "resueltos": resueltos,
        "garantias_activas": garantias,
        "calificacion_promedio": promedio,
        "por_tipo": {
            t: sum(1 for p in all_pv if p.tipo == t)
            for t in ["satisfaccion", "garantia", "servicio", "mantencion", "otro"]
        },
        "por_estado": {
            e: sum(1 for p in all_pv if p.estado == e)
            for e in ["pendiente", "contactado", "en_proceso", "resuelto", "cerrado"]
        },
    }


@router.get("/", response_model=list[PostVentaOut])
async def list_post_ventas(
    estado: str | None = None,
    tipo: str | None = None,
    client_id: int | None = None,
    limit: int = Query(50, le=200),
    offset: int = 0,
    token_data: TokenData = Depends(require_roles(*ROLES_ALL)),
    db: AsyncSession = Depends(get_db_for_tenant),
):
    q = select(PostVenta).where(PostVenta.tenant_id == token_data.tenant_id)
    if estado:
        q = q.where(PostVenta.estado == estado)
    if tipo:
        q = q.where(PostVenta.tipo == tipo)
    if client_id:
        q = q.where(PostVenta.client_id == client_id)
    q = q.order_by(PostVenta.created_at.desc()).offset(offset).limit(limit)

    result = await db.execute(q)
    pvs = result.scalars().all()

    # Cargar clientes en batch
    client_ids = list({pv.client_id for pv in pvs})
    clients_result = await db.execute(
        select(Client).where(Client.id.in_(client_ids))
    )
    clients_map = {c.id: c for c in clients_result.scalars().all()}

    return [_to_out(pv, clients_map.get(pv.client_id)) for pv in pvs]


@router.post("/", response_model=PostVentaOut, status_code=201)
async def create_post_venta(
    data: PostVentaCreate,
    token_data: TokenData = Depends(require_roles(*ROLES_ALL)),
    db: AsyncSession = Depends(get_db_for_tenant),
):
    # Verificar que la orden y cliente existen en este tenant
    order_result = await db.execute(
        select(Order).where(Order.id == data.order_id, Order.tenant_id == token_data.tenant_id)
    )
    if not order_result.scalar_one_or_none():
        raise HTTPException(404, "Orden no encontrada")

    client_result = await db.execute(
        select(Client).where(Client.id == data.client_id, Client.tenant_id == token_data.tenant_id)
    )
    client = client_result.scalar_one_or_none()
    if not client:
        raise HTTPException(404, "Cliente no encontrado")

    pv = PostVenta(
        id=uuid4(),
        tenant_id=token_data.tenant_id,
        creado_por=token_data.user_id,
        **data.model_dump(),
    )
    db.add(pv)
    await db.flush()
    await db.refresh(pv)

    # Disparar n8n webhook
    asyncio.create_task(trigger_post_venta_creado(
        post_venta={"id": str(pv.id), "tipo": pv.tipo, "order_id": pv.order_id},
        cliente={"nombre": client.nombre, "telefono": client.telefono, "email": client.email},
        tenant_id=token_data.tenant_id,
    ))

    return _to_out(pv, client)


@router.get("/{pv_id}", response_model=PostVentaOut)
async def get_post_venta(
    pv_id: UUID,
    token_data: TokenData = Depends(require_roles(*ROLES_ALL)),
    db: AsyncSession = Depends(get_db_for_tenant),
):
    pv, client = await _get_with_client(db, pv_id, token_data.tenant_id)
    return _to_out(pv, client)


@router.patch("/{pv_id}", response_model=PostVentaOut)
async def update_post_venta(
    pv_id: UUID,
    data: PostVentaUpdate,
    token_data: TokenData = Depends(require_roles(*ROLES_ALL)),
    db: AsyncSession = Depends(get_db_for_tenant),
):
    pv, client = await _get_with_client(db, pv_id, token_data.tenant_id)
    for field, value in data.model_dump(exclude_none=True).items():
        setattr(pv, field, value)
    await db.flush()
    await db.refresh(pv)
    return _to_out(pv, client)


@router.post("/{pv_id}/nota", response_model=PostVentaOut)
async def add_nota(
    pv_id: UUID,
    data: NotaAdd,
    token_data: TokenData = Depends(require_roles(*ROLES_ALL)),
    db: AsyncSession = Depends(get_db_for_tenant),
):
    """Agrega una nota de seguimiento al timeline del post-venta."""
    pv, client = await _get_with_client(db, pv_id, token_data.tenant_id)

    notas = list(pv.notas or [])
    notas.append({
        "texto": data.texto,
        "fecha": datetime.now(timezone.utc).isoformat(),
        "usuario_id": token_data.user_id,
    })
    pv.notas = notas
    # Auto-update estado si pendiente
    if pv.estado == "pendiente":
        pv.estado = "contactado"

    await db.flush()
    await db.refresh(pv)
    return _to_out(pv, client)


@router.post("/{pv_id}/ai", response_model=PostVentaOut)
async def generar_ai(
    pv_id: UUID,
    token_data: TokenData = Depends(require_roles(*ROLES_ALL)),
    db: AsyncSession = Depends(get_db_for_tenant),
):
    """Genera mensaje de seguimiento con Groq AI y lo guarda en el post-venta."""
    pv, client = await _get_with_client(db, pv_id, token_data.tenant_id)

    if not client:
        raise HTTPException(400, "Cliente no encontrado para generar mensaje")

    # Obtener nombre de la empresa desde tenant
    from app.models.tenant import Tenant
    tenant_result = await db.execute(select(Tenant).where(Tenant.id == token_data.tenant_id))
    tenant = tenant_result.scalar_one_or_none()
    empresa_nombre = tenant.nombre if tenant else "la empresa"

    mensaje = await generar_mensaje_post_venta(
        cliente_nombre=client.nombre,
        empresa_nombre=empresa_nombre,
        tipo=pv.tipo,
        descripcion_orden=pv.descripcion,
    )
    if mensaje:
        pv.ai_mensaje = mensaje
        await db.flush()
        await db.refresh(pv)

    return _to_out(pv, client)


@router.post("/{pv_id}/enviar-email")
async def enviar_email_ai(
    pv_id: UUID,
    token_data: TokenData = Depends(require_roles(*ROLES_ALL)),
    db: AsyncSession = Depends(get_db_for_tenant),
):
    """Envía el mensaje AI generado al cliente via Resend (directo) + webhook n8n."""
    pv, client = await _get_with_client(db, pv_id, token_data.tenant_id)

    if not pv.ai_mensaje:
        raise HTTPException(400, "Genera el mensaje IA primero antes de enviar")
    if not client:
        raise HTTPException(400, "Cliente no encontrado")

    from app.models.tenant import Tenant
    tenant_result = await db.execute(select(Tenant).where(Tenant.id == token_data.tenant_id))
    tenant = tenant_result.scalar_one_or_none()
    tenant_nombre = tenant.nombre if tenant else "WorkshopOS"

    cliente_dict = {
        "nombre": client.nombre,
        "email": client.email,
        "email2": getattr(client, "email2", None),
        "empresa": getattr(client, "empresa", None),
    }

    ok = await trigger_post_venta_ai_mensaje(
        post_venta_id=str(pv_id),
        cliente=cliente_dict,
        ai_mensaje=pv.ai_mensaje,
        tipo=pv.tipo,
        tenant_id=token_data.tenant_id,
        tenant_nombre=tenant_nombre,
    )

    # Mark as contacted if pending
    if pv.estado == "pendiente":
        pv.estado = "contactado"
        await db.flush()

    return {"ok": ok, "email": client.email}


@router.delete("/{pv_id}", status_code=204)
async def delete_post_venta(
    pv_id: UUID,
    token_data: TokenData = Depends(require_roles("jefe", "gerente")),
    db: AsyncSession = Depends(get_db_for_tenant),
):
    pv, _ = await _get_with_client(db, pv_id, token_data.tenant_id)
    await db.delete(pv)


async def _get_with_client(
    db: AsyncSession, pv_id: UUID, tenant_id: str
) -> tuple[PostVenta, Client | None]:
    pv_result = await db.execute(
        select(PostVenta).where(PostVenta.id == pv_id, PostVenta.tenant_id == tenant_id)
    )
    pv = pv_result.scalar_one_or_none()
    if not pv:
        raise HTTPException(404, "Post-venta no encontrado")

    client_result = await db.execute(select(Client).where(Client.id == pv.client_id))
    client = client_result.scalar_one_or_none()
    return pv, client
