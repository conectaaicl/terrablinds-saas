from datetime import datetime, timezone
from typing import Optional
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy import select, text
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth.dependencies import TokenData, require_roles
from app.dependencies import get_db_for_tenant
from app.models.attachment import DigitalSignature
from app.orders.schemas import (
    AssignRequest,
    EstadoChange,
    HistorialEntry,
    OrderCreate,
    OrderResponse,
)
from app.orders.service import OrderService


class SignatureRequest(BaseModel):
    firma_data: str                    # base64 PNG
    firmante_nombre: str
    firmante_rut: Optional[str] = None
    firmante_email: Optional[str] = None
    lat: Optional[float] = None
    lon: Optional[float] = None

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
    # Determinar cuándo se entró al estado actual (último historial con ese estado)
    estado_updated_at = None
    if o.historial:
        for h in reversed(o.historial):
            if h.estado == o.estado and h.fecha:
                estado_updated_at = h.fecha.isoformat()
                break

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
        estado_updated_at=estado_updated_at,
        historial=historial,
        produccion_subestado=getattr(o, "produccion_subestado", None),
        tracking_token=getattr(o, "tracking_token", None),
        tracking_activo=getattr(o, "tracking_activo", False),
        garantia_meses=getattr(o, "garantia_meses", None),
        fecha_instalacion=o.fecha_instalacion.isoformat() if getattr(o, "fecha_instalacion", None) else None,
    )


@router.get("/", response_model=list[OrderResponse])
async def list_orders(
    token_data: TokenData = Depends(require_roles(
        "jefe", "gerente", "coordinador", "vendedor", "fabricante", "instalador", "bodegas", "superadmin"
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
        "jefe", "gerente", "coordinador", "vendedor", "fabricante", "instalador", "bodegas", "superadmin"
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


@router.post("/{order_id}/signature", status_code=201)
async def save_signature(
    order_id: int,
    data: SignatureRequest,
    token_data: TokenData = Depends(require_roles("instalador", "coordinador", "jefe", "gerente")),
    db: AsyncSession = Depends(get_db_for_tenant),
):
    """
    Guarda la firma digital del cliente para una orden.
    Reemplaza la firma anterior si ya existe.
    """
    # Verificar que la orden existe y pertenece al tenant
    result = await db.execute(
        text("SELECT id FROM orders WHERE id = :id AND tenant_id = :tid"),
        {"id": order_id, "tid": token_data.tenant_id},
    )
    if not result.fetchone():
        raise HTTPException(status_code=404, detail="Orden no encontrada")

    # Eliminar firma anterior si existe
    await db.execute(
        text("DELETE FROM digital_signatures WHERE order_id = :id AND tenant_id = :tid"),
        {"id": order_id, "tid": token_data.tenant_id},
    )

    sig = DigitalSignature(
        order_id=order_id,
        tenant_id=token_data.tenant_id,
        firma_data=data.firma_data,
        firmante_nombre=data.firmante_nombre,
        firmante_rut=data.firmante_rut,
        firmante_email=data.firmante_email,
        lat=data.lat,
        lon=data.lon,
        registrado_por=token_data.user_id,
        firmado_at=datetime.now(timezone.utc),
    )
    db.add(sig)
    await db.commit()
    return {"ok": True, "signature_id": str(sig.id)}


@router.get("/{order_id}/checklist")
async def get_checklist(
    order_id: int,
    token_data: TokenData = Depends(require_roles(
        "instalador", "coordinador", "jefe", "gerente", "fabricante"
    )),
    db: AsyncSession = Depends(get_db_for_tenant),
):
    """Devuelve el estado actual del checklist de una orden."""
    result = await db.execute(
        text("SELECT items FROM order_checklist_simple WHERE order_id = :id AND tenant_id = :tid"),
        {"id": order_id, "tid": token_data.tenant_id},
    )
    row = result.fetchone()
    return {"items": row.items if row else {}}


class ChecklistSave(BaseModel):
    items: dict


@router.put("/{order_id}/checklist", status_code=200)
async def save_checklist(
    order_id: int,
    data: ChecklistSave,
    token_data: TokenData = Depends(require_roles(
        "instalador", "coordinador", "jefe", "gerente", "fabricante"
    )),
    db: AsyncSession = Depends(get_db_for_tenant),
):
    """Guarda (upsert) el estado del checklist de una orden."""
    import json
    items = data.items
    await db.execute(
        text("""
            INSERT INTO order_checklist_simple (order_id, tenant_id, items, updated_at, updated_by)
            VALUES (:id, :tid, :items::jsonb, NOW(), :uid)
            ON CONFLICT (order_id, tenant_id) DO UPDATE
            SET items = :items::jsonb, updated_at = NOW(), updated_by = :uid
        """),
        {"id": order_id, "tid": token_data.tenant_id, "items": json.dumps(dict(items)), "uid": token_data.user_id},
    )
    await db.commit()
    return {"ok": True}


@router.get("/{order_id}/signature")
async def get_signature(
    order_id: int,
    token_data: TokenData = Depends(require_roles(
        "instalador", "coordinador", "jefe", "gerente", "superadmin"
    )),
    db: AsyncSession = Depends(get_db_for_tenant),
):
    """Obtiene la firma digital de una orden si existe."""
    result = await db.execute(
        select(DigitalSignature).where(
            DigitalSignature.order_id == order_id,
            DigitalSignature.tenant_id == token_data.tenant_id,
        )
    )
    sig = result.scalar_one_or_none()
    if not sig:
        return {"firma": None}
    return {
        "firma": {
            "id": str(sig.id),
            "firmante_nombre": sig.firmante_nombre,
            "firmante_rut": sig.firmante_rut,
            "firmado_at": sig.firmado_at.isoformat() if sig.firmado_at else None,
            "tiene_datos": True,
        }
    }


class SubestadoUpdate(BaseModel):
    subestado: str  # en_corte | en_armado | listo | None


@router.patch("/{order_id}/subestado", status_code=200)
async def update_subestado(
    order_id: int,
    data: SubestadoUpdate,
    token_data: TokenData = Depends(require_roles("fabricante", "jefe", "gerente", "coordinador")),
    db: AsyncSession = Depends(get_db_for_tenant),
):
    """Actualiza el subestado de producción de una orden."""
    from app.models.order import Order
    result = await db.execute(
        select(Order).where(Order.id == order_id, Order.tenant_id == token_data.tenant_id)
    )
    order = result.scalar_one_or_none()
    if not order:
        raise HTTPException(404, "Orden no encontrada")
    allowed = {"en_corte", "en_armado", "listo", ""}
    if data.subestado not in allowed:
        raise HTTPException(400, f"subestado inválido: {data.subestado}")
    order.produccion_subestado = data.subestado or None
    await db.commit()
    return {"ok": True, "subestado": order.produccion_subestado}


class GarantiaUpdate(BaseModel):
    garantia_meses: Optional[int] = None
    fecha_instalacion: Optional[str] = None  # ISO format


@router.patch("/{order_id}/garantia", status_code=200)
async def update_garantia(
    order_id: int,
    data: GarantiaUpdate,
    token_data: TokenData = Depends(require_roles("jefe", "gerente", "coordinador")),
    db: AsyncSession = Depends(get_db_for_tenant),
):
    """Actualiza datos de garantía de una orden."""
    from app.models.order import Order
    from datetime import datetime
    result = await db.execute(
        select(Order).where(Order.id == order_id, Order.tenant_id == token_data.tenant_id)
    )
    order = result.scalar_one_or_none()
    if not order:
        raise HTTPException(404, "Orden no encontrada")
    if data.garantia_meses is not None:
        order.garantia_meses = data.garantia_meses
    if data.fecha_instalacion is not None:
        order.fecha_instalacion = datetime.fromisoformat(data.fecha_instalacion)
    await db.commit()
    return {"ok": True, "garantia_meses": order.garantia_meses,
            "fecha_instalacion": order.fecha_instalacion.isoformat() if order.fecha_instalacion else None}
