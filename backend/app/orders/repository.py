"""
Repository de órdenes.

Todos los métodos incluyen tenant_id explícito en los WHERE.
RLS es la segunda línea de defensa; la primera es la query misma.
Eliminado get_all() — superadmin usa get_by_tenant() con tenant explícito.
"""
from sqlalchemy import select, text
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.models.order import Order, OrderHistory


class OrderRepository:
    def __init__(self, db: AsyncSession):
        self.db = db

    def _base_query(self):
        return (
            select(Order)
            .options(selectinload(Order.historial))
            .options(selectinload(Order.client))
            .options(selectinload(Order.vendedor))
            .options(selectinload(Order.fabricante))
            .options(selectinload(Order.instalador))
        )

    async def get_by_tenant(
        self, tenant_id: str, limit: int = 100, offset: int = 0
    ) -> list[Order]:
        """
        Lista órdenes de un tenant con paginación.
        tenant_id explícito + RLS = doble protección.
        """
        q = (
            self._base_query()
            .where(Order.tenant_id == tenant_id)
            .order_by(Order.id.desc())
            .limit(limit)
            .offset(offset)
        )
        result = await self.db.execute(q)
        return list(result.scalars().unique().all())

    async def get_by_id(self, order_id: int, tenant_id: str) -> Order | None:
        """
        Obtiene una orden por ID.
        tenant_id siempre explícito — no condicional, no opcional.
        """
        q = self._base_query().where(
            Order.id == order_id,
            Order.tenant_id == tenant_id,
        )
        result = await self.db.execute(q)
        return result.scalar_one_or_none()

    async def get_filtered(
        self,
        tenant_id: str,
        vendedor_id: int | None = None,
        fabricante_id: int | None = None,
        instalador_id: int | None = None,
        limit: int = 100,
        offset: int = 0,
    ) -> list[Order]:
        q = (
            self._base_query()
            .where(Order.tenant_id == tenant_id)
            .order_by(Order.id.desc())
            .limit(limit)
            .offset(offset)
        )
        if vendedor_id is not None:
            q = q.where(Order.vendedor_id == vendedor_id)
        if fabricante_id is not None:
            q = q.where(Order.fabricante_id == fabricante_id)
        if instalador_id is not None:
            q = q.where(Order.instalador_id == instalador_id)
        result = await self.db.execute(q)
        return list(result.scalars().unique().all())

    async def get_next_numero(self, tenant_id: str) -> int:
        """
        Número de orden siguiente — ATÓMICO, sin race condition.

        Implementación: UPDATE...RETURNING en una sola operación SQL.
        No hay ventana de tiempo entre el SELECT del máximo y el INSERT.
        El constraint UNIQUE(numero, tenant_id) es la segunda garantía.

        Requiere que el tenant tenga fila en tenant_order_counters
        (creada por trigger al insertar el tenant, o por la migración 002).
        """
        result = await self.db.execute(
            text("SELECT public.get_next_order_numero(:tenant_id)"),
            {"tenant_id": tenant_id},
        )
        numero = result.scalar()
        if numero is None:
            raise RuntimeError(
                f"No existe contador para tenant '{tenant_id}'. "
                "Verificar que la migración 002_rls_security.sql fue aplicada."
            )
        return numero

    async def create(self, order: Order) -> Order:
        self.db.add(order)
        await self.db.flush()
        return order

    async def add_history(self, entry: OrderHistory) -> OrderHistory:
        self.db.add(entry)
        await self.db.flush()
        return entry
