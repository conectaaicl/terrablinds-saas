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
