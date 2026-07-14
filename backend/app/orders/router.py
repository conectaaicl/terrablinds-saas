from datetime import datetime, timezone

from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, Query, Request
from sqlalchemy import select, text
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth.dependencies import TokenData, require_roles
from app.auth.router import limiter
from app.dependencies import get_db_for_tenant
from app.services.whatsapp import send_text
from app.models.attachment import DigitalSignature
from app.models.user import User
from app.orders.schemas import (
    AssignRequest,
    ChecklistSave,
    EstadoChange,
    GarantiaUpdate,
    HistorialEntry,
    OrderCreate,
    OrderResponse,
    SignatureRequest,
    SubestadoUpdate,
)
from app.orders.service import OrderService
from app.comisiones.service import generar_comisiones_orden
from app.notifications.service import NotificationService

router = APIRouter(prefix="/orders", tags=["orders"])


async def _resolve_user_nombre(db: AsyncSession, user_id: int) -> str:
    result = await db.execute(select(User.nombre).where(User.id == user_id))
    row = result.one_or_none()
    return row.nombre if row else ""


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
        cliente_telefono=o.client.telefono if o.client else None,
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
        notas_instalacion=getattr(o, "notas_instalacion", None),
        notas_cierre=getattr(o, "notas_cierre", None),
    )


@router.get("/", response_model=list[OrderResponse])
async def list_orders(
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=200),
    client_id: int | None = None,
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
        client_id=client_id,
    )
    page = orders[skip: skip + limit]
    return [_order_to_response(o) for o in page]


@router.post("/", response_model=OrderResponse, status_code=201)
@limiter.limit("20/minute")
async def create_order(
    request: Request,
    data: OrderCreate,
    # "vendedor" ya no crea ordenes directo: su unico camino es Cotizacion -> Convertir a Orden,
    # para no duplicar el concepto de "cotizacion" (ver /cotizaciones/{id}/convertir).
    token_data: TokenData = Depends(require_roles("jefe", "gerente", "coordinador")),
    db: AsyncSession = Depends(get_db_for_tenant),
):
    user_nombre = await _resolve_user_nombre(db, token_data.user_id)
    service = OrderService(db)
    order = await service.create_order(data, token_data.user_id, user_nombre, token_data.tenant_id)
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
    user_nombre = await _resolve_user_nombre(db, token_data.user_id)
    service = OrderService(db)
    order = await service.change_estado(
        order_id, data,
        user_id=token_data.user_id,
        user_nombre=user_nombre,
        tenant_id=token_data.tenant_id,
        role=token_data.role,
    )
    await generar_comisiones_orden(db, order, data.estado)

    # Automatic flow notifications
    try:
        noti_svc = NotificationService(db)
        num = order.numero
        if data.estado == 'listo_para_instalar':
            await noti_svc.create_system_notification(
                token_data.tenant_id,
                f"OT #{num} lista para instalar — coordinador/jefe asignar fecha",
                "exito",
            )
        elif data.estado == 'en_fabricacion':
            await noti_svc.create_system_notification(
                token_data.tenant_id,
                f"OT #{num} en fabricacion",
                "info",
            )
        elif data.estado == 'instalacion_programada':
            await noti_svc.create_system_notification(
                token_data.tenant_id,
                f"OT #{num} programada para instalacion — instalador notificado",
                "info",
            )
        elif data.estado == 'instalado':
            await noti_svc.create_system_notification(
                token_data.tenant_id,
                f"OT #{num} instalada exitosamente",
                "exito",
            )
        elif data.estado == 'problema':
            await noti_svc.create_system_notification(
                token_data.tenant_id,
                f"OT #{num} reporta un problema — revisar",
                "alerta",
            )
    except Exception:
        pass  # never block the main flow

    await db.refresh(order, ["client", "vendedor", "fabricante", "instalador", "historial"])
    return _order_to_response(order)


@router.post("/{order_id}/assign-fabricante", response_model=OrderResponse)
async def assign_fabricante(
    order_id: int,
    data: AssignRequest,
    background: BackgroundTasks,
    token_data: TokenData = Depends(require_roles("jefe", "gerente", "coordinador")),
    db: AsyncSession = Depends(get_db_for_tenant),
):
    user_nombre = await _resolve_user_nombre(db, token_data.user_id)
    service = OrderService(db)
    order = await service.assign_fabricante(
        order_id, data,
        user_id=token_data.user_id,
        user_nombre=user_nombre,
        tenant_id=token_data.tenant_id,
    )
    await db.refresh(order, ["client", "vendedor", "fabricante", "instalador", "historial"])
    await _notify_fab_wa(db, order, data.usuario_id, token_data.tenant_id, background)
    return _order_to_response(order)


async def _notify_fab_wa(db, order, usuario_id, tenant_id, background: BackgroundTasks) -> None:
    """Avisa por WhatsApp al fabricante asignado. Best-effort."""
    if not usuario_id:
        return
    try:
        row = (await db.execute(
            text("SELECT nombre, telefono FROM users WHERE id = :id"), {"id": usuario_id}
        )).fetchone()
    except Exception:
        return
    phone = getattr(row, "telefono", None) if row else None
    if not phone:
        return
    cli = getattr(order, "client", None)
    lines = ["\U0001F3ED *Nueva orden a fabricación*", f"\n\U0001F4CB OT #{order.numero}"]
    if cli and getattr(cli, "nombre", None):
        lines.append(f"\U0001F464 Cliente: {cli.nombre}")
    if cli and getattr(cli, "direccion", None):
        lines.append(f"\U0001F4CD {cli.direccion}")
    lines.append("\nVer en working.conectaai.cl")
    background.add_task(send_text, tenant_id, phone, "\n".join(lines))


@router.post("/{order_id}/assign-instalador", response_model=OrderResponse)
async def assign_instalador(
    order_id: int,
    data: AssignRequest,
    token_data: TokenData = Depends(require_roles("jefe", "gerente", "coordinador")),
    db: AsyncSession = Depends(get_db_for_tenant),
):
    user_nombre = await _resolve_user_nombre(db, token_data.user_id)
    service = OrderService(db)
    order = await service.assign_instalador(
        order_id, data,
        user_id=token_data.user_id,
        user_nombre=user_nombre,
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
    result = await db.execute(
        text("SELECT id FROM orders WHERE id = :id AND tenant_id = :tid"),
        {"id": order_id, "tid": token_data.tenant_id},
    )
    if not result.fetchone():
        raise HTTPException(status_code=404, detail="Orden no encontrada")

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
    result = await db.execute(
        text("SELECT items FROM order_checklist_simple WHERE order_id = :id AND tenant_id = :tid"),
        {"id": order_id, "tid": token_data.tenant_id},
    )
    row = result.fetchone()
    return {"items": row.items if row else {}}


@router.put("/{order_id}/checklist", status_code=200)
async def save_checklist(
    order_id: int,
    data: ChecklistSave,
    token_data: TokenData = Depends(require_roles(
        "instalador", "coordinador", "jefe", "gerente", "fabricante"
    )),
    db: AsyncSession = Depends(get_db_for_tenant),
):
    import json
    await db.execute(
        text("""
            INSERT INTO order_checklist_simple (order_id, tenant_id, items, updated_at, updated_by)
            VALUES (:id, :tid, :items::jsonb, NOW(), :uid)
            ON CONFLICT (order_id, tenant_id) DO UPDATE
            SET items = :items::jsonb, updated_at = NOW(), updated_by = :uid
        """),
        {"id": order_id, "tid": token_data.tenant_id, "items": json.dumps(dict(data.items)), "uid": token_data.user_id},
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


@router.patch("/{order_id}/subestado", status_code=200)
async def update_subestado(
    order_id: int,
    data: SubestadoUpdate,
    token_data: TokenData = Depends(require_roles("fabricante", "jefe", "gerente", "coordinador")),
    db: AsyncSession = Depends(get_db_for_tenant),
):
    from app.models.order import Order as _Order
    result = await db.execute(
        select(_Order).where(_Order.id == order_id, _Order.tenant_id == token_data.tenant_id)
    )
    order = result.scalar_one_or_none()
    if not order:
        raise HTTPException(404, "Orden no encontrada")
    allowed = {"en_corte", "en_armado", "listo", "falta_materiales", "en_espera_materiales", ""}
    if data.subestado not in allowed:
        raise HTTPException(400, f"subestado inválido: {data.subestado}")

    prev_subestado = order.produccion_subestado
    order.produccion_subestado = data.subestado or None
    await db.commit()

    # Notify all tenant users when material shortage is flagged
    if data.subestado == "falta_materiales" and prev_subestado != "falta_materiales":
        try:
            noti_svc = NotificationService(db)
            await noti_svc.create_system_notification(
                token_data.tenant_id,
                f"OT #{order.numero}: falta de materiales — se necesita compra urgente",
                "alerta",
            )
            # Auto-create compra_pendiente
            await db.execute(
                __import__("sqlalchemy").text("""
                    INSERT INTO compra_pendiente
                      (tenant_id, order_id, order_numero, descripcion_materiales, prioridad, estado, creado_por_nombre, created_at, updated_at)
                    VALUES (:tid, :oid, :onum, :desc, 'urgente', 'pendiente', :nombre, NOW(), NOW())
                """),
                {
                    "tid": token_data.tenant_id,
                    "oid": order.id,
                    "onum": order.numero,
                    "desc": f"OT #{order.numero} reporta falta de materiales",
                    "nombre": "Sistema (auto)",
                }
            )
            await db.commit()
        except Exception:
            pass

    return {"ok": True, "subestado": order.produccion_subestado}


@router.patch("/{order_id}/garantia", status_code=200)
async def update_garantia(
    order_id: int,
    data: GarantiaUpdate,
    token_data: TokenData = Depends(require_roles("jefe", "gerente", "coordinador")),
    db: AsyncSession = Depends(get_db_for_tenant),
):
    from app.models.order import Order as _Order
    from datetime import datetime as _dt
    result = await db.execute(
        select(_Order).where(_Order.id == order_id, _Order.tenant_id == token_data.tenant_id)
    )
    order = result.scalar_one_or_none()
    if not order:
        raise HTTPException(404, "Orden no encontrada")
    if data.garantia_meses is not None:
        order.garantia_meses = data.garantia_meses
    if data.fecha_instalacion is not None:
        order.fecha_instalacion = _dt.fromisoformat(data.fecha_instalacion)
    await db.commit()
    return {
        "ok": True,
        "garantia_meses": order.garantia_meses,
        "fecha_instalacion": order.fecha_instalacion.isoformat() if order.fecha_instalacion else None,
    }


@router.patch('/{order_id}/notas-cierre', status_code=200)
async def update_notas_cierre(
    order_id: int,
    data: dict,
    token_data: TokenData = Depends(require_roles('instalador', 'jefe', 'gerente', 'coordinador')),
    db: AsyncSession = Depends(get_db_for_tenant),
):
    from app.models.order import Order as _Order
    from pydantic import BaseModel
    result = await db.execute(
        select(_Order).where(_Order.id == order_id, _Order.tenant_id == token_data.tenant_id)
    )
    order = result.scalar_one_or_none()
    if not order:
        raise HTTPException(404, 'Orden no encontrada')
    order.notas_cierre = (data.get('notas_cierre') or '').strip() or None
    await db.commit()
    return {'ok': True, 'notas_cierre': order.notas_cierre}
