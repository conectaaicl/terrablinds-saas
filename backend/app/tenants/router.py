from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth.dependencies import require_roles
from app.database import get_db, get_db_bypass_rls
from app.models.user import User
from app.tenants.schemas import TenantCreate, TenantResponse, TenantUpdate, JefeSet, JefeResponse
from app.tenants.service import TenantService

router = APIRouter(prefix="/tenants", tags=["tenants"])


@router.get("/", response_model=list[TenantResponse])
async def list_tenants(
    current_user: User = Depends(require_roles("superadmin")),
    db: AsyncSession = Depends(get_db_bypass_rls),
):
    service = TenantService(db)
    tenants = await service.list_tenants()
    return tenants


@router.post("/", response_model=TenantResponse, status_code=201)
async def create_tenant(
    data: TenantCreate,
    current_user: User = Depends(require_roles("superadmin")),
    db: AsyncSession = Depends(get_db_bypass_rls),
):
    service = TenantService(db)
    return await service.create_tenant(data)


@router.put("/{tenant_id}", response_model=TenantResponse)
async def update_tenant(
    tenant_id: str,
    data: TenantUpdate,
    current_user: User = Depends(require_roles("superadmin")),
    db: AsyncSession = Depends(get_db_bypass_rls),
):
    service = TenantService(db)
    return await service.update_tenant(tenant_id, data)


@router.post("/{tenant_id}/jefe", response_model=JefeResponse)
async def set_tenant_jefe(
    tenant_id: str,
    data: JefeSet,
    current_user: User = Depends(require_roles("superadmin")),
    db: AsyncSession = Depends(get_db_bypass_rls),
):
    service = TenantService(db)
    return await service.set_tenant_jefe(tenant_id, data.email, data.nombre, data.password)


@router.get("/{tenant_id}/jefe")
async def get_tenant_jefe(
    tenant_id: str,
    current_user: User = Depends(require_roles("superadmin")),
    db: AsyncSession = Depends(get_db_bypass_rls),
):
    from app.users.repository import UserRepository
    repo = UserRepository(db)
    jefes = await repo.get_by_role("jefe", tenant_id)
    if not jefes:
        return {"jefe": None}
    j = jefes[0]
    return {"jefe": {"id": j.id, "nombre": j.nombre, "email": j.email, "activo": j.activo}}
