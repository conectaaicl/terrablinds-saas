from fastapi import HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth.service import hash_password
from app.auth.token_store import RefreshTokenStore, get_redis
from app.models.user import CREATABLE_ROLES, TENANT_ROLES, RoleEnum, User
from app.users.repository import UserRepository
from app.users.schemas import UserCreate


class UserService:
    def __init__(self, db: AsyncSession):
        self.repo = UserRepository(db)

    async def list_users(self, tenant_id: str) -> list[User]:
        """tenant_id siempre requerido. El RLS ya filtra, pero lo pasamos explícito."""
        if not tenant_id:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Se requiere tenant_id para listar usuarios",
            )
        return await self.repo.get_by_tenant(tenant_id)

    async def get_by_role(self, role: str, tenant_id: str) -> list[User]:
        if not tenant_id:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Se requiere tenant_id",
            )
        return await self.repo.get_by_role(role, tenant_id)

    async def create_user(
        self, data: UserCreate, creator_role: str, creator_tenant_id: str
    ) -> User:
        """
        Crea un usuario con las siguientes validaciones:
          1. Superadmin no se puede crear por API
          2. El creador puede crear ese tipo de rol (CREATABLE_ROLES)
          3. El nuevo usuario pertenece al tenant del creador (si no es superadmin)
          4. El email no existe en ese tenant
        """
        creator_role_enum = RoleEnum(creator_role)
        target_role = RoleEnum(data.rol)

        # Superadmin no se crea por API
        if target_role == RoleEnum.superadmin:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="No se puede crear un superadmin vía API",
            )

        # Verificar que el creador tiene permiso para crear ese rol
        allowed_to_create = CREATABLE_ROLES.get(creator_role_enum, set())
        if target_role not in allowed_to_create:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"No tienes permiso para crear usuarios con rol '{target_role.value}'",
            )

        # El tenant del nuevo usuario debe ser el mismo que el del creador
        # (a menos que el creador sea superadmin, que pasa el tenant explícitamente)
        if creator_role_enum != RoleEnum.superadmin:
            data.tenant_id = creator_tenant_id  # forzar el tenant del creador

        # Roles de tenant requieren tenant_id
        if target_role in TENANT_ROLES and not data.tenant_id:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail="Se requiere tenant_id para este tipo de usuario",
            )

        # Verificar unicidad de email en el tenant
        existing = await self.repo.get_by_email_and_tenant(data.email, data.tenant_id)
        if existing:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=f"El email '{data.email}' ya existe en este taller",
            )

        user = User(
            email=data.email,
            hashed_password=hash_password(data.password),
            nombre=data.nombre,
            rol=target_role,
            tenant_id=data.tenant_id,
            activo=True,
        )
        return await self.repo.create(user)

    async def toggle_active(
        self, user_id: int, tenant_id: str, requester_id: int
    ) -> User:
        """
        Activa/desactiva usuario.
        El usuario no puede desactivarse a sí mismo.
        Al desactivar, revoca todos sus refresh tokens en Redis.
        """
        if user_id == requester_id:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="No puedes desactivar tu propia cuenta",
            )

        user = await self.repo.toggle_active(user_id, tenant_id)
        if not user:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Usuario no encontrado",
            )

        # Si se desactivó, revocar todos sus refresh tokens
        if not user.activo:
            redis = await get_redis()
            store = RefreshTokenStore(redis)
            await store.revoke_all_for_user(user_id)

        return user
