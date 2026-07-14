import asyncio
from uuid import UUID

from fastapi import HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.cotizaciones import repository as repo
from app.cotizaciones.schemas import (
    ConvertirResponse,
    CotizacionCreate,
    CotizacionOut,
    CotizacionPatch,
)
from app.email_service import enviar_cotizacion_cliente
from app.models.cotizacion import Cotizacion


async def _notificar(db: AsyncSession, tenant_id: str, mensaje: str) -> None:
    try:
        from app.notifications.service import NotificationService
        await NotificationService(db).create_system_notification(tenant_id, mensaje, tipo="info")
    except Exception as e:
        print(f"[cotizacion_notification] error: {e}", flush=True)


def _to_out(c: Cotizacion) -> CotizacionOut:
    return CotizacionOut(
        id=c.id,
        tenant_id=c.tenant_id,
        numero=c.numero,
        cliente_id=c.cliente_id,
        cliente_nombre=c.client.nombre if c.client else None,
        cliente_telefono=c.client.telefono if c.client else None,
        cliente_direccion=c.client.direccion if c.client else None,
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


def _calc_cantidad(regla, area_m2: float, ancho_m: float, alto_m: float) -> float:
    """Replicate the formula logic from inventario/router.py._calcular_cantidad."""
    formula = regla.formula
    factor = float(regla.factor)
    if formula == "m2":
        base = area_m2
    elif formula in ("ml", "ancho"):
        base = ancho_m
    elif formula == "alto":
        base = alto_m
    elif formula == "unidad_fija":
        return float(regla.cantidad_fija or 1) * factor
    else:
        base = area_m2
    return base * factor


async def _check_stock_warnings(
    db: AsyncSession, productos: list, tenant_id: str
) -> list[str]:
    """Check stock availability for every product line.

    Compares required quantity (derived from ReglaMaterial formulas) against
    current InventarioItem.stock_actual. Returns human-readable warning strings
    for every shortage detected. An empty list means all items are covered.
    """
    from app.models.inventario import InventarioItem, ReglaMaterial

    warnings: list[str] = []

    for prod in productos:
        tipo = prod.get("tipo") or prod.get("nombre", "")
        ancho_cm = float(prod.get("ancho", 0))
        alto_cm = float(prod.get("alto", 0))
        ancho_m = ancho_cm / 100
        alto_m = alto_cm / 100
        area_m2 = ancho_m * alto_m
        cantidad_prod = int(prod.get("cantidad", 1))
        prod_label = prod.get("nombre") or tipo

        reglas_result = await db.execute(
            select(ReglaMaterial).where(
                ReglaMaterial.tenant_id == tenant_id,
                ReglaMaterial.tipo_producto == tipo,
                ReglaMaterial.item_id.isnot(None),
            )
        )
        reglas = reglas_result.scalars().all()

        for regla in reglas:
            cantidad_requerida = (
                _calc_cantidad(regla, area_m2, ancho_m, alto_m) * cantidad_prod
            )
            if cantidad_requerida <= 0:
                continue

            item_result = await db.execute(
                select(InventarioItem).where(
                    InventarioItem.id == regla.item_id,
                    InventarioItem.tenant_id == tenant_id,
                )
            )
            item = item_result.scalar_one_or_none()
            if item is None:
                continue

            stock = float(item.stock_actual)
            if stock < cantidad_requerida:
                faltante = round(cantidad_requerida - stock, 3)
                unidad = item.unidad or "unidades"
                warnings.append(
                    f"Stock insuficiente de {item.nombre}: necesita "
                    f"{round(cantidad_requerida, 3)} {unidad}, "
                    f"disponible {round(stock, 3)} {unidad} "
                    f"(faltan {faltante} {unidad}) para {prod_label}"
                )

    return warnings


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
    vendedor_nombre = cot.vendedor.nombre if cot.vendedor else f"ID {vendedor_id}"
    asyncio.ensure_future(
        _notificar(db, tenant_id, f"Nueva cotizacion #{cot.numero} creada por {vendedor_nombre}")
    )
    return _to_out(cot)


async def listar(
    db: AsyncSession, tenant_id: str, role: str, user_id: int, client_id: int | None = None
) -> list[CotizacionOut]:
    vendedor_id = user_id if role == "vendedor" else None
    cots = await repo.list_all(db, tenant_id, vendedor_id=vendedor_id, client_id=client_id)
    return [_to_out(c) for c in cots]


async def obtener(db: AsyncSession, cot_id: UUID, tenant_id: str) -> CotizacionOut:
    cot = await repo.get_by_id(db, cot_id, tenant_id)
    if cot is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Cotizacion no encontrada",
        )
    return _to_out(cot)


async def actualizar(
    db: AsyncSession, cot_id: UUID, data: CotizacionPatch, tenant_id: str
) -> CotizacionOut:
    cot = await repo.get_by_id(db, cot_id, tenant_id)
    if cot is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Cotizacion no encontrada",
        )
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
    await db.refresh(cot)

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
            tenant_branding = getattr(tenant, "branding", {}) or {}
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
                    logo_url=tenant_branding.get("logo_url", ""),
                    telefono_taller=tenant_branding.get("telefono", ""),
                )
            )

    if data.estado is not None and data.estado != prev_estado:
        LABELS = {
            "enviada":    "enviada al cliente",
            "aceptada":   "aceptada por el cliente",
            "rechazada":  "rechazada por el cliente",
            "convertida": "convertida a OT",
        }
        label = LABELS.get(data.estado)
        if label:
            vendedor_nombre = cot.vendedor.nombre if cot.vendedor else "vendedor"
            asyncio.ensure_future(
                _notificar(
                    db,
                    tenant_id,
                    f"Cot. #{cot.numero} -> {label} (por {vendedor_nombre})",
                )
            )

    return _to_out(cot)


async def convertir_a_orden(
    db: AsyncSession, cot_id: UUID, user_id: int, tenant_id: str, role: str
) -> ConvertirResponse:
    """Convierte la cotizacion en una orden y verifica disponibilidad de stock.

    La conversion nunca se bloquea por falta de inventario: el pedido puede
    crearse para luego gestionar la compra. Los faltantes detectados se
    devuelven en ``stock_warnings`` para que la UI los muestre al usuario.
    """
    cot = await repo.get_by_id(db, cot_id, tenant_id)
    if cot is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Cotizacion no encontrada",
        )
    if cot.estado == "convertida":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Ya fue convertida",
        )
    if cot.estado != "aceptada":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Solo se puede convertir una cotizacion en estado 'aceptada'",
        )

    # 1. Check stock -- collect warnings, never abort the conversion
    productos = cot.productos or []
    stock_warnings = await _check_stock_warnings(db, productos, tenant_id)

    # 2. Create the order using the standard OrderService flow
    from app.orders.schemas import OrderCreate as OC
    from app.orders.service import OrderService

    order_data = OC(
        cliente_id=cot.cliente_id,
        productos=cot.productos,
        precio_total=cot.precio_total,
    )
    svc = OrderService(db)
    orden = await svc.create_order(order_data, user_id, "Sistema", tenant_id, estado_inicial="ot_creada")

    # 3. Link cotizacion to order and mark as converted
    cot.orden_id = orden.id
    cot.estado = "convertida"
    await db.flush()
    await db.refresh(cot)

    return ConvertirResponse(cotizacion=_to_out(cot), stock_warnings=stock_warnings)
