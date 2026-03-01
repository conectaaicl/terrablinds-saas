from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth.dependencies import TokenData, require_roles
from app.dependencies import get_db_for_tenant
from app.orders.schemas import (
    AssignRequest,
    EstadoChange,
    HistorialEntry,
    OrderCreate,
    OrderResponse,
)
from app.orders.service import OrderService

router = APIRouter(prefix="/orders", tags=["orders"])


def _order_to_response(o) -> OrderResponse:
    historial = [
        HistorialEntry(
            estado=h.estado,
            fecha=h.fecha.isoformat() if h.fecha else "",
            usuario_id=h.usuario_id,
            usuario_nombre=h.usuario_nombre,
            notas=h.notas,
        )
        for h in (o.historial or [])
    ]
    return OrderResponse(
        id=o.id,
        numero=o.numero,
        estado=o.estado,
        cliente_id=o.cliente_id,
        cliente_nombre=o.client.nombre if o.client else None,
        cliente_direccion=o.client.direccion if o.client else None,
        vendedor_id=o.vendedor_id,
        vendedor_nombre=o.vendedor.nombre if o.vendedor else None,
        fabricante_id=o.fabricante_id,
        fabricante_nombre=o.fabricante.nombre if o.fabricante else None,
        instalador_id=o.instalador_id,
        instalador_nombre=o.instalador.nombre if o.instalador else None,
        tenant_id=o.tenant_id,
        cotizacion_id=o.cotizacion_id,
        productos=o.productos or [],
        precio_total=o.precio_total,
        created_at=o.created_at.isoformat() if o.created_at else "",
        historial=historial,
    )


@router.get("/", response_model=list[OrderResponse])
async def list_orders(
    token_data: TokenData = Depends(require_roles(
        "jefe", "gerente", "coordinador", "vendedor", "fabricante", "instalador", "superadmin"
    )),
    db: AsyncSession = Depends(get_db_for_tenant),
):
    service = OrderService(db)
    orders = await service.list_orders(
        tenant_id=token_data.tenant_id,
        user_id=token_data.user_id,
        role=token_data.role,
    )
    return [_order_to_response(o) for o in orders]


@router.post("/", response_model=OrderResponse, status_code=201)
async def create_order(
    data: OrderCreate,
    token_data: TokenData = Depends(require_roles("jefe", "gerente", "vendedor", "coordinador")),
    db: AsyncSession = Depends(get_db_for_tenant),
):
    service = OrderService(db)
    order = await service.create_order(data, token_data.user_id, token_data.tenant_id)
    await db.refresh(order, ["client", "vendedor", "fabricante", "instalador", "historial"])
    return _order_to_response(order)


@router.get("/{order_id}", response_model=OrderResponse)
async def get_order(
    order_id: int,
    token_data: TokenData = Depends(require_roles(
        "jefe", "gerente", "coordinador", "vendedor", "fabricante", "instalador", "superadmin"
    )),
    db: AsyncSession = Depends(get_db_for_tenant),
):
    service = OrderService(db)
    order = await service.get_order(order_id, token_data.tenant_id)
    await db.refresh(order, ["client", "vendedor", "fabricante", "instalador", "historial"])
    return _order_to_response(order)


@router.post("/{order_id}/estado", response_model=OrderResponse)
async def change_estado(
    order_id: int,
    data: EstadoChange,
    token_data: TokenData = Depends(require_roles(
        "jefe", "gerente", "coordinador", "vendedor", "fabricante", "instalador"
    )),
    db: AsyncSession = Depends(get_db_for_tenant),
):
    service = OrderService(db)
    order = await service.change_estado(
        order_id, data,
        user_id=token_data.user_id,
        user_nombre="",
        tenant_id=token_data.tenant_id,
        role=token_data.role,
    )
    await db.refresh(order, ["client", "vendedor", "fabricante", "instalador", "historial"])
    return _order_to_response(order)


@router.post("/{order_id}/assign-fabricante", response_model=OrderResponse)
async def assign_fabricante(
    order_id: int,
    data: AssignRequest,
    token_data: TokenData = Depends(require_roles("jefe", "gerente", "coordinador")),
    db: AsyncSession = Depends(get_db_for_tenant),
):
    service = OrderService(db)
    order = await service.assign_fabricante(
        order_id, data,
        user_id=token_data.user_id,
        user_nombre="",
        tenant_id=token_data.tenant_id,
    )
    await db.refresh(order, ["client", "vendedor", "fabricante", "instalador", "historial"])
    return _order_to_response(order)


@router.post("/{order_id}/assign-instalador", response_model=OrderResponse)
async def assign_instalador(
    order_id: int,
    data: AssignRequest,
    token_data: TokenData = Depends(require_roles("jefe", "gerente", "coordinador")),
    db: AsyncSession = Depends(get_db_for_tenant),
):
    service = OrderService(db)
    order = await service.assign_instalador(
        order_id, data,
        user_id=token_data.user_id,
        user_nombre="",
        tenant_id=token_data.tenant_id,
    )
    await db.refresh(order, ["client", "vendedor", "fabricante", "instalador", "historial"])
    return _order_to_response(order)
