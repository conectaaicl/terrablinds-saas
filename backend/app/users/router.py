from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth.dependencies import TokenData, require_roles
from app.dependencies import get_db_for_tenant, set_tenant_context
from app.users.schemas import UserCreate, UserResponse
from app.users.service import UserService

router = APIRouter(prefix="/users", tags=["users"])


@router.get("/", response_model=list[UserResponse])
async def list_users(
    # superadmin puede listar pero debe pasar target_tenant_id como query param
    target_tenant_id: str | None = None,
    token_data: TokenData = Depends(require_roles("jefe", "gerente", "coordinador", "superadmin")),
    db: AsyncSession = Depends(get_db_for_tenant),
):
    tenant_id = token_data.tenant_id

    # Superadmin: debe proveer tenant_id explícito para ver usuarios de un tenant
    if token_data.role == "superadmin":
        if not target_tenant_id:
            from fastapi import HTTPException
            raise HTTPException(
                status_code=400,
                detail="superadmin debe especificar ?target_tenant_id=...",
            )
        await set_tenant_context(db, target_tenant_id)
        tenant_id = target_tenant_id

    service = UserService(db)
    users = await service.list_users(tenant_id)
    return [
        UserResponse(
            id=u.id,
            email=u.email,
            nombre=u.nombre,
            rol=u.rol.value,
            tenant_id=u.tenant_id or "",
            activo=u.activo,
        )
        for u in users
    ]


@router.post("/", response_model=UserResponse, status_code=201)
async def create_user(
    data: UserCreate,
    token_data: TokenData = Depends(require_roles("jefe", "gerente", "superadmin")),
    db: AsyncSession = Depends(get_db_for_tenant),
):
    service = UserService(db)
    user = await service.create_user(
        data,
        creator_role=token_data.role,
        creator_tenant_id=token_data.tenant_id,
    )
    return UserResponse(
        id=user.id,
        email=user.email,
        nombre=user.nombre,
        rol=user.rol.value,
        tenant_id=user.tenant_id or "",
        activo=user.activo,
    )


@router.patch("/{user_id}/toggle", response_model=UserResponse)
async def toggle_user(
    user_id: int,
    token_data: TokenData = Depends(require_roles("jefe", "gerente", "superadmin")),
    db: AsyncSession = Depends(get_db_for_tenant),
):
    service = UserService(db)
    user = await service.toggle_active(
        user_id,
        tenant_id=token_data.tenant_id,
        requester_id=token_data.user_id,
    )
    return UserResponse(
        id=user.id,
        email=user.email,
        nombre=user.nombre,
        rol=user.rol.value,
        tenant_id=user.tenant_id or "",
        activo=user.activo,
    )


@router.get("/by-role/{role}", response_model=list[UserResponse])
async def users_by_role(
    role: str,
    token_data: TokenData = Depends(require_roles("jefe", "gerente", "coordinador")),
    db: AsyncSession = Depends(get_db_for_tenant),
):
    service = UserService(db)
    users = await service.get_by_role(role, token_data.tenant_id)
    return [
        UserResponse(
            id=u.id,
            email=u.email,
            nombre=u.nombre,
            rol=u.rol.value,
            tenant_id=u.tenant_id or "",
            activo=u.activo,
        )
        for u in users
    ]
