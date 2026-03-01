from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth.dependencies import get_current_user, require_roles
from app.database import get_db
from app.dependencies import get_tenant_scope
from app.insumos.schemas import InsumoCreate, InsumoResponse
from app.insumos.service import InsumoService
from app.models.user import User

router = APIRouter(prefix="/insumos", tags=["insumos"])


@router.get("/", response_model=list[InsumoResponse])
async def list_insumos(
    current_user: User = Depends(require_roles("jefe", "coordinador", "superadmin")),
    db: AsyncSession = Depends(get_db),
):
    scope = get_tenant_scope(current_user)
    service = InsumoService(db)
    insumos = await service.list_insumos(scope)
    return [
        InsumoResponse(
            id=i.id,
            tenant_id=i.tenant_id,
            usuario_id=i.usuario_id,
            usuario_nombre=i.usuario.nombre if i.usuario else None,
            items=i.items,
            urgencia=i.urgencia,
            estado=i.estado,
            created_at=i.created_at.isoformat() if i.created_at else "",
        )
        for i in insumos
    ]


@router.post("/", response_model=InsumoResponse, status_code=201)
async def create_insumo(
    data: InsumoCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    service = InsumoService(db)
    insumo = await service.create_insumo(data, current_user)
    return InsumoResponse(
        id=insumo.id,
        tenant_id=insumo.tenant_id,
        usuario_id=insumo.usuario_id,
        usuario_nombre=current_user.nombre,
        items=insumo.items,
        urgencia=insumo.urgencia,
        estado=insumo.estado,
        created_at=insumo.created_at.isoformat() if insumo.created_at else "",
    )
