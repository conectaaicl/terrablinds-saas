from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.tenant import Tenant


class TenantRepository:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def get_all(self) -> list[Tenant]:
        result = await self.db.execute(select(Tenant).order_by(Tenant.id))
        return list(result.scalars().all())

    async def get_by_id(self, tenant_id: str) -> Tenant | None:
        result = await self.db.execute(
            select(Tenant).where(Tenant.id == tenant_id)
        )
        return result.scalar_one_or_none()

    async def create(self, tenant: Tenant) -> Tenant:
        self.db.add(tenant)
        await self.db.flush()
        return tenant

    async def update(self, tenant_id: str, data: dict) -> Tenant | None:
        tenant = await self.get_by_id(tenant_id)
        if not tenant:
            return None
        for k, v in data.items():
            if v is not None:
                setattr(tenant, k, v)
        await self.db.flush()
        return tenant
