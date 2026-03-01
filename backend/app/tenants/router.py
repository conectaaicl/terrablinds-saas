from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth.dependencies import require_roles
from app.database import get_db
from app.models.user import User
from app.tenants.schemas import TenantCreate, TenantResponse, TenantUpdate
from app.tenants.service import TenantService

router = APIRouter(prefix="/tenants", tags=["tenants"])


@router.get("/", response_model=list[TenantResponse])
async def list_tenants(
    current_user: User = Depends(require_roles("superadmin")),
    db: AsyncSession = Depends(get_db),
):
    service = TenantService(db)
    tenants = await service.list_tenants()
    return tenants


@router.post("/", response_model=TenantResponse, status_code=201)
async def create_tenant(
    data: TenantCreate,
    current_user: User = Depends(require_roles("superadmin")),
    db: AsyncSession = Depends(get_db),
):
    service = TenantService(db)
    return await service.create_tenant(data)


@router.put("/{tenant_id}", response_model=TenantResponse)
async def update_tenant(
    tenant_id: str,
    data: TenantUpdate,
    current_user: User = Depends(require_roles("superadmin")),
    db: AsyncSession = Depends(get_db),
):
    service = TenantService(db)
    return await service.update_tenant(tenant_id, data)
