from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth.dependencies import get_current_user, require_roles
from app.clients.schemas import ClientCreate, ClientResponse
from app.clients.service import ClientService
from app.database import get_db
from app.dependencies import get_tenant_scope
from app.models.user import User

router = APIRouter(prefix="/clients", tags=["clients"])


@router.get("/", response_model=list[ClientResponse])
async def list_clients(
    current_user: User = Depends(
        require_roles("jefe", "coordinador", "vendedor", "superadmin")
    ),
    db: AsyncSession = Depends(get_db),
):
    scope = get_tenant_scope(current_user)
    service = ClientService(db)
    return await service.list_clients(scope)


@router.post("/", response_model=ClientResponse, status_code=201)
async def create_client(
    data: ClientCreate,
    current_user: User = Depends(require_roles("jefe", "vendedor")),
    db: AsyncSession = Depends(get_db),
):
    tenant_id = current_user.tenant_id or ""
    service = ClientService(db)
    return await service.create_client(data, current_user.id, tenant_id)
