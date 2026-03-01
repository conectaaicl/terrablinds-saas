from sqlalchemy.ext.asyncio import AsyncSession

from app.clients.repository import ClientRepository
from app.clients.schemas import ClientCreate
from app.models.client import Client


class ClientService:
    def __init__(self, db: AsyncSession):
        self.repo = ClientRepository(db)

    async def list_clients(self, tenant_scope: str) -> list[Client]:
        if tenant_scope == "__all__":
            return await self.repo.get_all()
        return await self.repo.get_by_tenant(tenant_scope)

    async def create_client(
        self, data: ClientCreate, vendedor_id: int, tenant_id: str
    ) -> Client:
        client = Client(
            nombre=data.nombre,
            email=data.email,
            telefono=data.telefono,
            direccion=data.direccion,
            vendedor_id=vendedor_id,
            tenant_id=tenant_id,
        )
        return await self.repo.create(client)
