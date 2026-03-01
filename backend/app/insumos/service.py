from sqlalchemy.ext.asyncio import AsyncSession

from app.insumos.repository import InsumoRepository
from app.insumos.schemas import InsumoCreate
from app.models.insumo import InsumoRequest
from app.models.user import User


class InsumoService:
    def __init__(self, db: AsyncSession):
        self.repo = InsumoRepository(db)

    async def list_insumos(self, tenant_scope: str) -> list[InsumoRequest]:
        if tenant_scope == "__all__":
            return await self.repo.get_all()
        return await self.repo.get_by_tenant(tenant_scope)

    async def create_insumo(self, data: InsumoCreate, user: User) -> InsumoRequest:
        insumo = InsumoRequest(
            tenant_id=user.tenant_id or "",
            usuario_id=user.id,
            items=data.items,
            urgencia=data.urgencia,
        )
        return await self.repo.create(insumo)
