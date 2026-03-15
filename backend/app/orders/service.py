"""
Service de órdenes.

  - list_orders elimina el patrón "__all__", siempre requiere tenant_id
  - get_order requiere tenant_id explícito (sin condicional)
  - assign_fabricante y assign_instalador validan que el usuario
    asignado pertenece al MISMO tenant que la orden
  - create_order usa get_next_numero() atómico (sin race condition)
  - Historial usa DateTime en lugar de string de fecha
  - change_estado usa máquina de estados de 13 estados (transitions.py)
"""
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
        """
        Lista órdenes según el rol.
        tenant_id siempre requerido — nunca vacío para roles de tenant.
        """
        if role == RoleEnum.vendedor:
            return await self.repo.get_filtered(tenant_id, vendedor_id=user_id)
        if role == RoleEnum.fabricante:
            return await self.repo.get_filtered(tenant_id, fabricante_id=user_id)
        if role == RoleEnum.instalador:
            return await self.repo.get_filtered(tenant_id, instalador_id=user_id)
        # jefe, gerente, coordinador, superadmin (con tenant_id explícito)
        return await self.repo.get_by_tenant(tenant_id)

    async def get_order(self, order_id: int, tenant_id: str) -> Order:
        order = await self.repo.get_by_id(order_id, tenant_id)
        if not order:
            raise HTTPException(status_code=404, detail="Orden no encontrada")
        return order

    async def create_order(self, data: OrderCreate, user_id: int, tenant_id: str) -> Order:
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
            usuario_nombre="",  # se actualiza en el router con el nombre real
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

        # Email al cliente en transiciones marcadas como auto_notify_client
        if rule.auto_notify_client and order.client and order.client.email:
            import asyncio
            from app.tenants.repository import TenantRepository
            tenant_nombre = tenant_id  # fallback
            try:
                tenant_repo = TenantRepository(self.db)
                tenant = await tenant_repo.get_by_id(tenant_id)
                if tenant:
                    tenant_nombre = tenant.nombre
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
                )
            )

        return order

    async def assign_fabricante(
        self, order_id: int, data: AssignRequest,
        user_id: int, user_nombre: str, tenant_id: str
    ) -> Order:
        order = await self.get_order(order_id, tenant_id)

        # Validar que el fabricante pertenece al mismo tenant
        await self._validate_assigned_user(
            data.usuario_id, tenant_id, RoleEnum.fabricante
        )

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

        # Validar que el instalador pertenece al mismo tenant
        await self._validate_assigned_user(
            data.usuario_id, tenant_id, RoleEnum.instalador
        )

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
        """
        Valida que el usuario existe, pertenece al tenant y tiene el rol correcto.
        Previene asignaciones cross-tenant.
        """
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
