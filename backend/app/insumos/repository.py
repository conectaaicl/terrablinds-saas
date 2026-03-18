from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.models.insumo import InsumoRequest


class InsumoRepository:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def get_by_tenant(self, tenant_id: str) -> list[InsumoRequest]:
        q = (
            select(InsumoRequest)
            .options(selectinload(InsumoRequest.usuario))
            .where(InsumoRequest.tenant_id == tenant_id)
            .order_by(InsumoRequest.id.desc())
        )
        result = await self.db.execute(q)
        return list(result.scalars().all())

    async def get_all(self) -> list[InsumoRequest]:
        q = (
            select(InsumoRequest)
            .options(selectinload(InsumoRequest.usuario))
            .order_by(InsumoRequest.id.desc())
        )
        result = await self.db.execute(q)
        return list(result.scalars().all())

    async def create(self, insumo: InsumoRequest) -> InsumoRequest:
        self.db.add(insumo)
        await self.db.flush()
        return insumo

    async def get_by_id(self, insumo_id: int) -> InsumoRequest | None:
        q = (
            select(InsumoRequest)
            .options(selectinload(InsumoRequest.usuario))
            .where(InsumoRequest.id == insumo_id)
        )
        result = await self.db.execute(q)
        return result.scalar_one_or_none()

    async def update_estado(self, insumo: InsumoRequest, estado: str) -> InsumoRequest:
        insumo.estado = estado
        await self.db.flush()
        return insumo
