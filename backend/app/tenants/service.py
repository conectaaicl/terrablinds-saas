import secrets
import string
import logging

from fastapi import HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.tenant import Tenant
from app.models.user import RoleEnum, User
from app.auth.service import hash_password
from app.tenants.repository import TenantRepository
from app.tenants.schemas import TenantCreate, TenantUpdate
from app.users.repository import UserRepository

logger = logging.getLogger(__name__)


def _generate_password(length: int = 12) -> str:
    """Genera una contraseña segura aleatoria."""
    alphabet = string.ascii_letters + string.digits + "!@#$%"
    while True:
        pwd = ''.join(secrets.choice(alphabet) for _ in range(length))
        # Garantizar al menos 1 mayúscula, 1 minúscula, 1 dígito
        if (any(c.isupper() for c in pwd)
                and any(c.islower() for c in pwd)
                and any(c.isdigit() for c in pwd)):
            return pwd


class TenantService:
    def __init__(self, db: AsyncSession):
        self.repo = TenantRepository(db)
        self.user_repo = UserRepository(db)

    async def list_tenants(self) -> list[Tenant]:
        return await self.repo.get_all()

    async def create_tenant(self, data: TenantCreate) -> dict:
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
        tenant = await self.repo.create(tenant)

        jefe_password = None

        # Si se proporcionó info del jefe, crear el usuario
        if data.jefe_email and data.jefe_nombre:
            jefe_password = _generate_password()
            jefe_user = User(
                email=data.jefe_email,
                hashed_password=hash_password(jefe_password),
                nombre=data.jefe_nombre,
                rol=RoleEnum.jefe,
                tenant_id=data.id,
                activo=True,
            )
            try:
                await self.user_repo.create(jefe_user)
                logger.info(f"Jefe creado: {data.jefe_email} para tenant {data.id}")

                # Enviar email de bienvenida (no bloquear si falla)
                try:
                    from app.email import send_jefe_welcome
                    await send_jefe_welcome(
                        jefe_email=data.jefe_email,
                        jefe_nombre=data.jefe_nombre,
                        tenant_nombre=data.nombre,
                        password=jefe_password,
                    )
                except Exception as e:
                    logger.error(f"Error enviando email de bienvenida: {e}")

            except Exception as e:
                logger.error(f"Error creando jefe para tenant {data.id}: {e}")
                jefe_password = None

        return {
            "id": tenant.id,
            "nombre": tenant.nombre,
            "slug": tenant.slug,
            "branding": tenant.branding,
            "plan": tenant.plan,
            "activo": tenant.activo,
            "jefe_password": jefe_password,
        }

    async def update_tenant(self, tenant_id: str, data: TenantUpdate) -> Tenant:
        update_data = data.model_dump(exclude_unset=True)
        tenant = await self.repo.update(tenant_id, update_data)
        if not tenant:
            raise HTTPException(status_code=404, detail="Tenant no encontrado")
        return tenant
