from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.client import Client


class ClientRepository:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def get_by_tenant(self, tenant_id: str) -> list[Client]:
        q = select(Client).where(Client.tenant_id == tenant_id).order_by(Client.id)
        result = await self.db.execute(q)
        return list(result.scalars().all())

    async def get_all(self) -> list[Client]:
        result = await self.db.execute(select(Client).order_by(Client.id))
        return list(result.scalars().all())

    async def get_by_id(self, client_id: int, tenant_id: str) -> Client | None:
        q = select(Client).where(Client.id == client_id)
        if tenant_id != "__all__":
            q = q.where(Client.tenant_id == tenant_id)
        result = await self.db.execute(q)
        return result.scalar_one_or_none()

    async def create(self, client: Client) -> Client:
        self.db.add(client)
        await self.db.flush()
        return client
