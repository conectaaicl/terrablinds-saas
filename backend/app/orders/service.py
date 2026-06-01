"""
Service de órdenes.

  - Side effects (inventario, post_venta, notificación) usan await directo
    para compartir la sesión de DB sin race conditions.
  - asyncio.ensure_future solo para enviar_email_cliente (pure HTTP, no DB).
"""
import asyncio
from datetime import datetime, timezone

from fastapi import HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.email_service import enviar_email_cliente
from app.models.order import Order, OrderHistory
from app.models.user import RoleEnum, User
from app.orders.repository import OrderRepository
from app.orders.schemas import AssignRequest, EstadoChange, OrderCreate
from app.orders.transitions import TRANSITION_MAP, validate_transition


class OrderService:
    def __init__(self, db: AsyncSession):
        self.repo = OrderRepository(db)
        self.db = db

    async def list_orders(self, tenant_id: str, user_id: int, role: str) -> list[Order]:
        if role == RoleEnum.vendedor:
            return await self.repo.get_filtered(tenant_id, vendedor_id=user_id)
        if role == RoleEnum.fabricante:
            return await self.repo.get_filtered(tenant_id, fabricante_id=user_id)
        if role == RoleEnum.instalador:
            return await self.repo.get_filtered(tenant_id, instalador_id=user_id)
        return await self.repo.get_by_tenant(tenant_id)

    async def get_order(self, order_id: int, tenant_id: str) -> Order:
        order = await self.repo.get_by_id(order_id, tenant_id)
        if not order:
            raise HTTPException(status_code=404, detail="Orden no encontrada")
        return order

    async def create_order(
        self, data: OrderCreate, user_id: int, user_nombre: str, tenant_id: str
    ) -> Order:
        numero = await self.repo.get_next_numero(tenant_id)
        order = Order(
            numero=numero,
            tenant_id=tenant_id,
            cliente_id=data.cliente_id,
            vendedor_id=user_id,
            estado="cotizacion",
            precio_total=data.precio_total,
            productos=[p.model_dump() for p in data.productos],
            cotizacion_id=data.cotizacion_id,
        )
        order = await self.repo.create(order)
        await self.repo.add_history(OrderHistory(
            order_id=order.id,
            estado="cotizacion",
            usuario_id=user_id,
            usuario_nombre=user_nombre,
            fecha=datetime.now(timezone.utc),
        ))
        return order

    async def change_estado(
        self, order_id: int, data: EstadoChange, user_id: int,
        user_nombre: str, tenant_id: str, role: str
    ) -> Order:
        order = await self.get_order(order_id, tenant_id)

        rule = validate_transition(order.estado, data.estado, role)
        if rule is None:
            allowed = list(TRANSITION_MAP.get(order.estado, {}).keys())
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail=(
                    f"Transición inválida: '{order.estado}' → '{data.estado}'. "
                    f"Desde '{order.estado}' se puede ir a: {allowed}"
                ),
            )

        if rule.requires_notas and not data.notas:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail=f"La transición a '{data.estado}' requiere notas explicativas.",
            )

        order.estado = data.estado
        await self.repo.add_history(OrderHistory(
            order_id=order.id,
            estado=data.estado,
            usuario_id=user_id,
            usuario_nombre=user_nombre,
            fecha=datetime.now(timezone.utc),
            notas=data.notas,
        ))
        await self.db.flush()

        # await directo: usa self.db — no puede ser fire-and-forget
        if data.estado == "en_fabricacion":
            await self._auto_consumir_inventario(order.id, tenant_id, user_id)

        # fire-and-forget OK: pure HTTP, no usa self.db
        if rule.auto_notify_client and order.client and order.client.email:
            import json as _json
            import uuid as _uuid
            from app.tenants.repository import TenantRepository
            from app.auth.token_store import get_redis
            tenant_nombre = tenant_id
            try:
                tenant_repo = TenantRepository(self.db)
                tenant = await tenant_repo.get_by_id(tenant_id)
                if tenant:
                    tenant_nombre = tenant.nombre
            except Exception:
                pass

            tracking_url = ""
            if data.estado == "en_camino":
                try:
                    tracking_token = str(_uuid.uuid4())
                    redis = await get_redis()
                    await redis.setex(
                        f"tracking:{tracking_token}",
                        28800,
                        _json.dumps({"order_id": order.id, "tenant_id": tenant_id}),
                    )
                    tracking_url = f"https://working.conectaai.cl/#/tracking/{tracking_token}"
                except Exception:
                    pass

            asyncio.ensure_future(
                enviar_email_cliente(
                    to_email=order.client.email,
                    to_nombre=order.client.nombre,
                    estado=data.estado,
                    numero_orden=order.numero,
                    taller_nombre=tenant_nombre,
                    total=f"${order.precio_total:,}".replace(",", "."),
                    tracking_url=tracking_url,
                )
            )

        # await directo: usa self.db
        if data.estado in ("cerrada", "instalacion_completada", "cerrado"):
            await self._auto_post_venta(order, tenant_id)

        # await directo: usa self.db
        await self._auto_notification(order, data.estado, user_nombre, tenant_id)

        return order

    async def _auto_notification(
        self, order: Order, nuevo_estado: str, actor: str, tenant_id: str
    ) -> None:
        STATE_LABELS: dict[str, str] = {
            "aceptada":               "aceptada por el cliente",
            "ot_creada":              "OT creada",
            "aprobada":               "aprobada",
            "en_fabricacion":         "en fabricación",
            "listo_para_instalar":    "lista para instalar",
            "instalacion_programada": "instalación programada",
            "en_camino":              "técnico en camino",
            "instalando":             "instalación en curso",
            "instalacion_completada": "instalación completada",
            "cerrada":                "cerrada",
            "rechazada":              "rechazada",
            "devuelta":               "devuelta",
        }
        label = STATE_LABELS.get(nuevo_estado)
        if not label:
            return
        mensaje = f"OT #{order.numero} → {label} (por {actor})"
        try:
            from app.notifications.service import NotificationService
            noti_service = NotificationService(self.db)
            await noti_service.create_system_notification(tenant_id, mensaje, tipo="info")
        except Exception as e:
            print(f"[auto_notification] error: {e}", flush=True)

    async def _auto_consumir_inventario(
        self, order_id: int, tenant_id: str, user_id: int
    ) -> None:
        try:
            from decimal import Decimal
            from app.models.inventario import InventarioItem, InventarioMovimiento, ReglaMaterial

            order_result = await self.db.execute(
                select(Order).where(Order.id == order_id, Order.tenant_id == tenant_id)
            )
            order = order_result.scalar_one_or_none()
            if not order:
                return

            for prod in (order.productos or []):
                tipo = prod.get("tipo") or prod.get("nombre", "")
                ancho_m = float(prod.get("ancho", 0)) / 100
                alto_m = float(prod.get("alto", 0)) / 100
                area_m2 = ancho_m * alto_m
                cantidad_prod = int(prod.get("cantidad", 1))

                reglas_result = await self.db.execute(
                    select(ReglaMaterial).where(
                        ReglaMaterial.tenant_id == tenant_id,
                        ReglaMaterial.tipo_producto == tipo,
                        ReglaMaterial.item_id != None,
                    )
                )
                for regla in reglas_result.scalars().all():
                    formula = regla.formula
                    factor = float(regla.factor)
                    if formula == "m2":
                        base = area_m2
                    elif formula in ("ml", "ancho"):
                        base = ancho_m
                    elif formula == "alto":
                        base = alto_m
                    elif formula == "unidad_fija":
                        base = float(regla.cantidad_fija or 1)
                        cantidad = base * factor * cantidad_prod
                    else:
                        base = area_m2
                    if formula != "unidad_fija":
                        cantidad = base * factor * cantidad_prod
                    if cantidad <= 0:
                        continue

                    item_result = await self.db.execute(
                        select(InventarioItem).where(
                            InventarioItem.id == regla.item_id,
                            InventarioItem.tenant_id == tenant_id,
                        )
                    )
                    item = item_result.scalar_one_or_none()
                    if not item:
                        continue

                    stock_antes = Decimal(str(item.stock_actual))
                    nuevo = max(Decimal("0"), stock_antes - Decimal(str(cantidad)))
                    if nuevo == Decimal("0") and stock_antes > 0:
                        print(
                            f"[inventario] AVISO: stock insuficiente para {item.nombre} "
                            f"(necesita {cantidad}, disponible {stock_antes}) — OT #{order.numero}",
                            flush=True,
                        )
                    item.stock_actual = nuevo
                    self.db.add(InventarioMovimiento(
                        tenant_id=tenant_id,
                        item_id=item.id,
                        tipo="consumo",
                        cantidad=Decimal(str(cantidad)),
                        stock_antes=stock_antes,
                        stock_despues=nuevo,
                        motivo="fabricacion",
                        order_id=order_id,
                        usuario_id=user_id,
                        notas=f"OT #{order.numero} — auto al entrar a fabricacion",
                    ))

            await self.db.flush()
            print(f"[inventario] consumo auto OK para OT #{order.numero}", flush=True)
        except Exception as e:
            print(f"[inventario] error en auto_consumir_inventario: {e}", flush=True)

    async def _auto_post_venta(self, order: Order, tenant_id: str) -> None:
        try:
            from uuid import uuid4 as _uuid4
            from app.models.post_venta import PostVenta as _PostVenta

            existing = await self.db.execute(
                select(_PostVenta).where(
                    _PostVenta.order_id == order.id,
                    _PostVenta.tenant_id == tenant_id,
                )
            )
            if existing.scalar_one_or_none():
                return

            self.db.add(_PostVenta(
                id=_uuid4(),
                tenant_id=tenant_id,
                order_id=order.id,
                client_id=order.cliente_id,
                tipo="satisfaccion",
                estado="pendiente",
                descripcion=f"Seguimiento automático — OT #{order.numero}",
            ))
            await self.db.flush()
        except Exception as e:
            print(f"[auto_post_venta] error: {e}", flush=True)

    async def assign_fabricante(
        self, order_id: int, data: AssignRequest,
        user_id: int, user_nombre: str, tenant_id: str
    ) -> Order:
        order = await self.get_order(order_id, tenant_id)
        await self._validate_assigned_user(data.usuario_id, tenant_id, RoleEnum.fabricante)
        order.fabricante_id = data.usuario_id
        await self.repo.add_history(OrderHistory(
            order_id=order.id,
            estado=order.estado,
            usuario_id=user_id,
            usuario_nombre=user_nombre,
            fecha=datetime.now(timezone.utc),
            notas=f"Fabricante asignado (ID: {data.usuario_id})",
        ))
        await self.db.flush()
        return order

    async def assign_instalador(
        self, order_id: int, data: AssignRequest,
        user_id: int, user_nombre: str, tenant_id: str
    ) -> Order:
        order = await self.get_order(order_id, tenant_id)
        await self._validate_assigned_user(data.usuario_id, tenant_id, RoleEnum.instalador)
        order.instalador_id = data.usuario_id
        await self.repo.add_history(OrderHistory(
            order_id=order.id,
            estado=order.estado,
            usuario_id=user_id,
            usuario_nombre=user_nombre,
            fecha=datetime.now(timezone.utc),
            notas=f"Instalador asignado (ID: {data.usuario_id})",
        ))
        await self.db.flush()
        return order

    async def _validate_assigned_user(
        self, user_id: int, tenant_id: str, required_role: RoleEnum
    ) -> User:
        result = await self.db.execute(
            select(User).where(
                User.id == user_id,
                User.tenant_id == tenant_id,
                User.activo == True,
            )
        )
        target = result.scalar_one_or_none()
        if target is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Usuario no encontrado en este taller",
            )
        if target.rol != required_role:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail=f"El usuario no tiene el rol requerido: {required_role.value}",
            )
        return target
