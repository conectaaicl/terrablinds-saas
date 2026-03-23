import asyncio
from uuid import UUID

from fastapi import HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.cotizaciones import repository as repo
from app.cotizaciones.schemas import CotizacionCreate, CotizacionOut, CotizacionPatch
from app.email_service import enviar_cotizacion_cliente
from app.models.cotizacion import Cotizacion


def _to_out(c: Cotizacion) -> CotizacionOut:
    return CotizacionOut(
        id=c.id,
        tenant_id=c.tenant_id,
        numero=c.numero,
        cliente_id=c.cliente_id,
        cliente_nombre=c.client.nombre if c.client else None,
        vendedor_id=c.vendedor_id,
        vendedor_nombre=c.vendedor.nombre if c.vendedor else None,
        estado=c.estado,
        productos=c.productos or [],
        precio_total=c.precio_total,
        notas=c.notas,
        valid_until=c.valid_until,
        orden_id=c.orden_id,
        created_at=c.created_at,
        updated_at=c.updated_at,
    )


async def crear(
    db: AsyncSession, data: CotizacionCreate, vendedor_id: int, tenant_id: str
) -> CotizacionOut:
    numero = await repo.get_next_numero(db, tenant_id)
    cot = Cotizacion(
        tenant_id=tenant_id,
        numero=numero,
        cliente_id=data.cliente_id,
        vendedor_id=vendedor_id,
        estado="borrador",
        productos=data.productos,
        precio_total=data.precio_total,
        notas=data.notas,
        valid_until=data.valid_until,
    )
    cot = await repo.create(db, cot)
    return _to_out(cot)


async def listar(
    db: AsyncSession, tenant_id: str, role: str, user_id: int
) -> list[CotizacionOut]:
    # Vendedor solo ve las suyas
    vendedor_id = user_id if role == "vendedor" else None
    cots = await repo.list_all(db, tenant_id, vendedor_id=vendedor_id)
    return [_to_out(c) for c in cots]


async def obtener(db: AsyncSession, cot_id: UUID, tenant_id: str) -> CotizacionOut:
    cot = await repo.get_by_id(db, cot_id, tenant_id)
    if cot is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Cotización no encontrada")
    return _to_out(cot)


async def actualizar(
    db: AsyncSession, cot_id: UUID, data: CotizacionPatch, tenant_id: str
) -> CotizacionOut:
    cot = await repo.get_by_id(db, cot_id, tenant_id)
    if cot is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Cotización no encontrada")
    if cot.estado not in ("borrador", "enviada"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Solo se pueden editar cotizaciones en borrador o enviadas",
        )
    if data.productos is not None:
        cot.productos = data.productos
    if data.precio_total is not None:
        cot.precio_total = data.precio_total
    if data.notas is not None:
        cot.notas = data.notas
    if data.valid_until is not None:
        cot.valid_until = data.valid_until
    prev_estado = cot.estado
    if data.estado is not None:
        cot.estado = data.estado
    await db.flush()
    await db.refresh(cot, ["client", "vendedor"])

    # Enviar email al cliente cuando la cotización se marca como enviada
    if data.estado == "enviada" and prev_estado != "enviada":
        if cot.client and cot.client.email:
            from app.tenants.repository import TenantRepository
            taller_nombre = cot.tenant_id
            try:
                tenant_repo = TenantRepository(db)
                tenant = await tenant_repo.get_by_id(cot.tenant_id)
                if tenant:
                    taller_nombre = tenant.nombre
            except Exception:
                pass
            total_str = f"${cot.precio_total:,}".replace(",", ".")
            valid_str = cot.valid_until.strftime("%d/%m/%Y") if cot.valid_until else ""
            asyncio.ensure_future(
                enviar_cotizacion_cliente(
                    to_email=cot.client.email,
                    to_nombre=cot.client.nombre,
                    numero_cotizacion=cot.numero,
                    taller_nombre=taller_nombre,
                    total=total_str,
                    notas=cot.notas or "",
                    valid_until=valid_str,
                )
            )

    return _to_out(cot)


async def convertir_a_orden(
    db: AsyncSession, cot_id: UUID, user_id: int, tenant_id: str, role: str
) -> CotizacionOut:
    """Convierte la cotización en una orden y actualiza estado a 'convertida'."""
    cot = await repo.get_by_id(db, cot_id, tenant_id)
    if cot is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Cotización no encontrada")
    if cot.estado == "convertida":
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Ya fue convertida")

    from app.models.order import Order, OrderHistory
    from app.orders.service import OrderService

    # Usar OrderService para crear la orden con el flujo estándar
    from app.orders.schemas import OrderCreate as OC
    order_data = OC(
        cliente_id=cot.cliente_id,
        productos=cot.productos,
        precio_total=cot.precio_total,
    )
    svc = OrderService(db)
    orden = await svc.create_order(order_data, user_id, tenant_id)

    # Enlazar cotización → orden
    cot.orden_id = orden.id
    cot.estado = "convertida"
    await db.flush()
    await db.refresh(cot, ["client", "vendedor"])
    return _to_out(cot)
