"""
Inventario del taller: stock, movimientos, reglas de materiales y cálculo automático.
"""
from __future__ import annotations

from decimal import Decimal
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import select, and_
from sqlalchemy.ext.asyncio import AsyncSession

from app.dependencies import get_db_for_tenant
from app.auth.dependencies import require_roles, TokenData
from app.models.inventario import InventarioItem, InventarioMovimiento, ReglaMaterial
from app.models.order import Order
from app.inventario.schemas import (
    InventarioItemCreate,
    InventarioItemUpdate,
    InventarioItemOut,
    MovimientoCreate,
    MovimientoOut,
    ReglaCreate,
    ReglaUpdate,
    ReglaOut,
    CalculoLinea,
    CalculoResponse,
)

router = APIRouter(prefix="/inventario", tags=["inventario"])

# Roles que pueden ver inventario
_VER = ["superadmin", "jefe", "gerente", "coordinador", "bodegas", "fabricante"]
# Roles que pueden modificar inventario
_MOD = ["superadmin", "jefe", "gerente", "bodegas"]


# ── Items ─────────────────────────────────────────────────────────────────────

@router.get("/items", response_model=list[InventarioItemOut])
async def list_items(
    categoria: Optional[str] = None,
    solo_bajo_minimo: bool = False,
    db: AsyncSession = Depends(get_db_for_tenant),
    token: TokenData = Depends(require_roles(*_VER)),
):
    stmt = select(InventarioItem).where(
        and_(
            InventarioItem.tenant_id == token.tenant_id,
            InventarioItem.activo == True,
        )
    )
    if categoria:
        stmt = stmt.where(InventarioItem.categoria == categoria)
    result = await db.execute(stmt)
    items = result.scalars().all()

    out = []
    for item in items:
        bajo = float(item.stock_actual) < float(item.stock_minimo)
        if solo_bajo_minimo and not bajo:
            continue
        d = InventarioItemOut.model_validate(item)
        d.bajo_minimo = bajo
        out.append(d)
    return out


@router.get("/items/{item_id}", response_model=InventarioItemOut)
async def get_item(
    item_id: int,
    db: AsyncSession = Depends(get_db_for_tenant),
    token: TokenData = Depends(require_roles(*_VER)),
):
    item = await _get_or_404(db, InventarioItem, item_id, token.tenant_id)
    d = InventarioItemOut.model_validate(item)
    d.bajo_minimo = float(item.stock_actual) < float(item.stock_minimo)
    return d


@router.post("/items", response_model=InventarioItemOut, status_code=201)
async def create_item(
    body: InventarioItemCreate,
    db: AsyncSession = Depends(get_db_for_tenant),
    token: TokenData = Depends(require_roles(*_MOD)),
):
    item = InventarioItem(tenant_id=token.tenant_id, **body.model_dump())
    db.add(item)
    await db.commit()
    await db.refresh(item)
    d = InventarioItemOut.model_validate(item)
    d.bajo_minimo = float(item.stock_actual) < float(item.stock_minimo)
    return d


@router.patch("/items/{item_id}", response_model=InventarioItemOut)
async def update_item(
    item_id: int,
    body: InventarioItemUpdate,
    db: AsyncSession = Depends(get_db_for_tenant),
    token: TokenData = Depends(require_roles(*_MOD)),
):
    item = await _get_or_404(db, InventarioItem, item_id, token.tenant_id)
    for k, v in body.model_dump(exclude_none=True).items():
        setattr(item, k, v)
    await db.commit()
    await db.refresh(item)
    d = InventarioItemOut.model_validate(item)
    d.bajo_minimo = float(item.stock_actual) < float(item.stock_minimo)
    return d


@router.delete("/items/{item_id}", status_code=204)
async def delete_item(
    item_id: int,
    db: AsyncSession = Depends(get_db_for_tenant),
    token: TokenData = Depends(require_roles(*_MOD)),
):
    item = await _get_or_404(db, InventarioItem, item_id, token.tenant_id)
    item.activo = False
    await db.commit()


# ── Movimientos ───────────────────────────────────────────────────────────────

@router.get("/movimientos", response_model=list[MovimientoOut])
async def list_movimientos(
    item_id: Optional[int] = None,
    limit: int = Query(100, le=500),
    db: AsyncSession = Depends(get_db_for_tenant),
    token: TokenData = Depends(require_roles(*_VER)),
):
    stmt = (
        select(InventarioMovimiento)
        .where(InventarioMovimiento.tenant_id == token.tenant_id)
        .order_by(InventarioMovimiento.id.desc())
        .limit(limit)
    )
    if item_id:
        stmt = stmt.where(InventarioMovimiento.item_id == item_id)
    result = await db.execute(stmt)
    return result.scalars().all()


@router.post("/movimientos", response_model=MovimientoOut, status_code=201)
async def create_movimiento(
    body: MovimientoCreate,
    db: AsyncSession = Depends(get_db_for_tenant),
    token: TokenData = Depends(require_roles(*_MOD)),
):
    item = await _get_or_404(db, InventarioItem, body.item_id, token.tenant_id)
    stock_antes = Decimal(str(item.stock_actual))

    if body.tipo in ("salida", "consumo"):
        nuevo = stock_antes - body.cantidad
        if nuevo < 0:
            raise HTTPException(400, "Stock insuficiente")
    elif body.tipo == "entrada":
        nuevo = stock_antes + body.cantidad
    elif body.tipo == "ajuste":
        nuevo = body.cantidad  # ajuste directo al valor
    else:
        raise HTTPException(400, f"Tipo de movimiento inválido: {body.tipo}")

    item.stock_actual = nuevo
    mov = InventarioMovimiento(
        tenant_id=token.tenant_id,
        item_id=body.item_id,
        tipo=body.tipo,
        cantidad=body.cantidad,
        stock_antes=stock_antes,
        stock_despues=nuevo,
        motivo=body.motivo,
        order_id=body.order_id,
        usuario_id=token.user_id,
        notas=body.notas,
    )
    db.add(mov)
    await db.commit()
    await db.refresh(mov)
    return mov


# ── Consumo automático por orden ──────────────────────────────────────────────

@router.post("/consumir-orden/{order_id}", response_model=list[MovimientoOut])
async def consumir_materiales_orden(
    order_id: int,
    db: AsyncSession = Depends(get_db_for_tenant),
    token: TokenData = Depends(require_roles(*_MOD, "fabricante")),
):
    """
    Descuenta automáticamente materiales del inventario aplicando las reglas
    definidas para cada producto de la orden.
    """
    order_result = await db.execute(
        select(Order).where(
            Order.id == order_id,
            Order.tenant_id == token.tenant_id,
        )
    )
    order = order_result.scalar_one_or_none()
    if not order:
        raise HTTPException(404, "Orden no encontrada")

    movimientos_creados: list[InventarioMovimiento] = []

    productos = order.productos or []
    for prod in productos:
        tipo = prod.get("tipo") or prod.get("nombre", "")
        ancho_cm = float(prod.get("ancho", 0))
        alto_cm = float(prod.get("alto", 0))
        ancho_m = ancho_cm / 100
        alto_m = alto_cm / 100
        area_m2 = ancho_m * alto_m
        cantidad_prod = int(prod.get("cantidad", 1))

        reglas_result = await db.execute(
            select(ReglaMaterial).where(
                ReglaMaterial.tenant_id == token.tenant_id,
                ReglaMaterial.tipo_producto == tipo,
                ReglaMaterial.item_id != None,
            )
        )
        reglas = reglas_result.scalars().all()

        for regla in reglas:
            cantidad = _calcular_cantidad(regla, area_m2, ancho_m, alto_m) * cantidad_prod
            if cantidad <= 0:
                continue

            item_result = await db.execute(
                select(InventarioItem).where(
                    InventarioItem.id == regla.item_id,
                    InventarioItem.tenant_id == token.tenant_id,
                )
            )
            item = item_result.scalar_one_or_none()
            if not item:
                continue

            stock_antes = Decimal(str(item.stock_actual))
            nuevo = stock_antes - Decimal(str(cantidad))
            if nuevo < 0:
                nuevo = Decimal("0")  # allow negative consumption gracefully

            item.stock_actual = nuevo
            mov = InventarioMovimiento(
                tenant_id=token.tenant_id,
                item_id=item.id,
                tipo="consumo",
                cantidad=Decimal(str(cantidad)),
                stock_antes=stock_antes,
                stock_despues=nuevo,
                motivo="fabricacion",
                order_id=order_id,
                usuario_id=token.user_id,
                notas=f"OT #{order.numero} — {prod.get('nombre', tipo)}",
            )
            db.add(mov)
            movimientos_creados.append(mov)

    await db.commit()
    for m in movimientos_creados:
        await db.refresh(m)
    return movimientos_creados


# ── Alertas de stock bajo ─────────────────────────────────────────────────────

@router.get("/alertas", response_model=list[InventarioItemOut])
async def alertas_stock(
    db: AsyncSession = Depends(get_db_for_tenant),
    token: TokenData = Depends(require_roles(*_VER)),
):
    stmt = select(InventarioItem).where(
        InventarioItem.tenant_id == token.tenant_id,
        InventarioItem.activo == True,
        InventarioItem.stock_actual < InventarioItem.stock_minimo,
    )
    result = await db.execute(stmt)
    items = result.scalars().all()
    out = []
    for item in items:
        d = InventarioItemOut.model_validate(item)
        d.bajo_minimo = True
        out.append(d)
    return out


# ── Reglas de materiales ──────────────────────────────────────────────────────

@router.get("/reglas", response_model=list[ReglaOut])
async def list_reglas(
    tipo_producto: Optional[str] = None,
    db: AsyncSession = Depends(get_db_for_tenant),
    token: TokenData = Depends(require_roles(*_VER)),
):
    stmt = select(ReglaMaterial).where(ReglaMaterial.tenant_id == token.tenant_id)
    if tipo_producto:
        stmt = stmt.where(ReglaMaterial.tipo_producto == tipo_producto)
    result = await db.execute(stmt)
    reglas = result.scalars().all()

    out = []
    for r in reglas:
        d = ReglaOut.model_validate(r)
        if r.item:
            d.item_nombre = r.item.nombre
        out.append(d)
    return out


@router.post("/reglas", response_model=ReglaOut, status_code=201)
async def create_regla(
    body: ReglaCreate,
    db: AsyncSession = Depends(get_db_for_tenant),
    token: TokenData = Depends(require_roles(*_MOD)),
):
    regla = ReglaMaterial(tenant_id=token.tenant_id, **body.model_dump())
    db.add(regla)
    await db.commit()
    await db.refresh(regla)
    d = ReglaOut.model_validate(regla)
    if regla.item:
        d.item_nombre = regla.item.nombre
    return d


@router.patch("/reglas/{regla_id}", response_model=ReglaOut)
async def update_regla(
    regla_id: int,
    body: ReglaUpdate,
    db: AsyncSession = Depends(get_db_for_tenant),
    token: TokenData = Depends(require_roles(*_MOD)),
):
    regla = await _get_or_404(db, ReglaMaterial, regla_id, token.tenant_id)
    for k, v in body.model_dump(exclude_none=True).items():
        setattr(regla, k, v)
    await db.commit()
    await db.refresh(regla)
    d = ReglaOut.model_validate(regla)
    if regla.item:
        d.item_nombre = regla.item.nombre
    return d


@router.delete("/reglas/{regla_id}", status_code=204)
async def delete_regla(
    regla_id: int,
    db: AsyncSession = Depends(get_db_for_tenant),
    token: TokenData = Depends(require_roles(*_MOD)),
):
    regla = await _get_or_404(db, ReglaMaterial, regla_id, token.tenant_id)
    await db.delete(regla)
    await db.commit()


# ── Cálculo de materiales ─────────────────────────────────────────────────────

@router.get("/calcular", response_model=CalculoResponse)
async def calcular_materiales(
    tipo_producto: str,
    ancho_cm: float,
    alto_cm: float,
    db: AsyncSession = Depends(get_db_for_tenant),
    token: TokenData = Depends(require_roles(*_VER)),
):
    ancho_m = ancho_cm / 100
    alto_m = alto_cm / 100
    area_m2 = ancho_m * alto_m

    reglas_result = await db.execute(
        select(ReglaMaterial).where(
            ReglaMaterial.tenant_id == token.tenant_id,
            ReglaMaterial.tipo_producto == tipo_producto,
        )
    )
    reglas = reglas_result.scalars().all()

    lineas: list[CalculoLinea] = []
    puede_producir = True

    for regla in reglas:
        cantidad = _calcular_cantidad(regla, area_m2, ancho_m, alto_m)

        item = regla.item
        stock = Decimal(str(item.stock_actual)) if item else None
        suficiente = True
        if stock is not None:
            suficiente = stock >= Decimal(str(cantidad))
        if not suficiente:
            puede_producir = False

        lineas.append(CalculoLinea(
            regla_id=regla.id,
            item_id=regla.item_id,
            nombre_componente=regla.nombre_componente,
            item_nombre=item.nombre if item else None,
            unidad=item.unidad if item else None,
            cantidad_calculada=Decimal(str(round(cantidad, 4))),
            stock_disponible=stock,
            suficiente=suficiente,
        ))

    return CalculoResponse(
        tipo_producto=tipo_producto,
        ancho_cm=ancho_cm,
        alto_cm=alto_cm,
        lineas=lineas,
        puede_producir=puede_producir,
    )


# ── Helpers ───────────────────────────────────────────────────────────────────

async def _get_or_404(db: AsyncSession, model, pk: int, tenant_id: str):
    result = await db.execute(
        select(model).where(model.id == pk, model.tenant_id == tenant_id)
    )
    obj = result.scalar_one_or_none()
    if not obj:
        raise HTTPException(404, f"{model.__tablename__} no encontrado")
    return obj


def _calcular_cantidad(regla: ReglaMaterial, area_m2: float, ancho_m: float, alto_m: float) -> float:
    formula = regla.formula
    factor = float(regla.factor)

    if formula == "m2":
        base = area_m2
    elif formula == "ml":
        base = ancho_m  # default ml = ancho
    elif formula == "ancho":
        base = ancho_m
    elif formula == "alto":
        base = alto_m
    elif formula == "unidad_fija":
        base = float(regla.cantidad_fija or 1)
        return base * factor
    else:
        base = area_m2

    return base * factor
