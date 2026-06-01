from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth.dependencies import TokenData, get_current_user, require_roles
from app.dependencies import get_db_for_tenant
from app.insumos.schemas import InsumoCreate, InsumoResponse, InsumoUpdate
from app.insumos.service import InsumoService
from app.models.user import RoleEnum

router = APIRouter(prefix="/insumos", tags=["insumos"])


def _scope(token_data: TokenData) -> str:
    return "__all__" if token_data.role == RoleEnum.superadmin else token_data.tenant_id


@router.get("/", response_model=list[InsumoResponse])
async def list_insumos(
    token_data: TokenData = Depends(require_roles("jefe", "gerente", "coordinador", "bodegas", "fabricante", "superadmin")),
    db: AsyncSession = Depends(get_db_for_tenant),
):
    service = InsumoService(db)
    insumos = await service.list_insumos(_scope(token_data))
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


@router.patch("/{insumo_id}/estado", response_model=InsumoResponse)
async def update_insumo_estado(
    insumo_id: int,
    data: InsumoUpdate,
    token_data: TokenData = Depends(require_roles("jefe", "gerente", "coordinador", "bodegas", "superadmin")),
    db: AsyncSession = Depends(get_db_for_tenant),
):
    service = InsumoService(db)
    insumo = await service.update_estado(insumo_id, data, _scope(token_data))
    if not insumo:
        raise HTTPException(status_code=404, detail="Insumo no encontrado")
    return InsumoResponse(
        id=insumo.id,
        tenant_id=insumo.tenant_id,
        usuario_id=insumo.usuario_id,
        usuario_nombre=insumo.usuario.nombre if insumo.usuario else None,
        items=insumo.items,
        urgencia=insumo.urgencia,
        estado=insumo.estado,
        created_at=insumo.created_at.isoformat() if insumo.created_at else "",
    )


@router.post("/", response_model=InsumoResponse, status_code=201)
async def create_insumo(
    data: InsumoCreate,
    current_user=Depends(get_current_user),
    db: AsyncSession = Depends(get_db_for_tenant),
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
