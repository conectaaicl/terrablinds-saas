from fastapi import HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.tenant import Tenant
from app.tenants.repository import TenantRepository
from app.tenants.schemas import TenantCreate, TenantUpdate


class TenantService:
    def __init__(self, db: AsyncSession):
        self.repo = TenantRepository(db)

    async def list_tenants(self) -> list[Tenant]:
        return await self.repo.get_all()

    async def create_tenant(self, data: TenantCreate) -> Tenant:
        existing = await self.repo.get_by_id(data.id)
        if existing:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=f"Tenant '{data.id}' ya existe",
            )
        tenant = Tenant(
            id=data.id,
            nombre=data.nombre,
            slug=data.slug,
            branding=data.branding,
            plan=data.plan,
            activo=True,
        )
        return await self.repo.create(tenant)

    async def update_tenant(self, tenant_id: str, data: TenantUpdate) -> Tenant:
        update_data = data.model_dump(exclude_unset=True)
        tenant = await self.repo.update(tenant_id, update_data)
        if not tenant:
            raise HTTPException(status_code=404, detail="Tenant no encontrado")
        return tenant
