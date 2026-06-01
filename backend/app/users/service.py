import logging

from fastapi import HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth.service import hash_password
from app.auth.token_store import RefreshTokenStore, get_redis
from app.models.user import CREATABLE_ROLES, TENANT_ROLES, RoleEnum, User
from app.users.repository import UserRepository
from app.users.schemas import UserCreate

logger = logging.getLogger(__name__)


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
    ) -> tuple[User, str]:
        """
        Crea un usuario con las siguientes validaciones:
          1. Superadmin no se puede crear por API
          2. El creador puede crear ese tipo de rol (CREATABLE_ROLES)
          3. El nuevo usuario pertenece al tenant del creador (si no es superadmin)
          4. El email no existe en ese tenant

        Retorna (user, plain_password) — la contraseña en texto plano para enviarla por email.
        """
        from app.tenants.service import _generate_password

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

        # Generar contraseña si no fue provista
        plain_password = data.password if data.password else _generate_password()

        user = User(
            email=data.email,
            hashed_password=hash_password(plain_password),
            nombre=data.nombre,
            rol=target_role,
            tenant_id=data.tenant_id,
            activo=True,
        )
        created = await self.repo.create(user)

        # Obtener nombre del taller para el email
        taller_nombre = data.tenant_id or "tu taller"
        if data.tenant_id:
            try:
                from app.tenants.repository import TenantRepository
                t_repo = TenantRepository(self.repo.db)
                tenant = await t_repo.get_by_id(data.tenant_id)
                if tenant:
                    taller_nombre = tenant.nombre
            except Exception as e:
                logger.warning(f"No se pudo obtener nombre del taller: {e}")

        # Enviar email de bienvenida con credenciales
        try:
            from app.email import send_user_welcome
            await send_user_welcome(
                to_email=data.email,
                nombre=data.nombre,
                rol=target_role.value,
                taller_nombre=taller_nombre,
                password=plain_password,
            )
            logger.info(f"Email de bienvenida enviado a {data.email} (rol={target_role.value})")
        except Exception as e:
            logger.error(f"Error enviando email de bienvenida a {data.email}: {e}")

        return created, plain_password

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
