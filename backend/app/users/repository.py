from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.user import User


class UserRepository:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def get_by_tenant(self, tenant_id: str) -> list[User]:
        q = select(User).where(User.tenant_id == tenant_id).order_by(User.id)
        result = await self.db.execute(q)
        return list(result.scalars().all())

    async def get_by_id(self, user_id: int) -> User | None:
        result = await self.db.execute(select(User).where(User.id == user_id))
        return result.scalar_one_or_none()

    async def get_by_email_and_tenant(
        self, email: str, tenant_id: str | None
    ) -> User | None:
        """
        Busca usuario por email dentro de un tenant específico.
        Para superadmin (tenant_id=None), busca solo entre usuarios sin tenant.
        """
        q = select(User).where(User.email == email)
        if tenant_id:
            q = q.where(User.tenant_id == tenant_id)
        else:
            q = q.where(User.tenant_id.is_(None))
        result = await self.db.execute(q)
        return result.scalar_one_or_none()

    async def get_by_role(self, role: str, tenant_id: str) -> list[User]:
        q = (
            select(User)
            .where(
                User.rol == role,
                User.tenant_id == tenant_id,
                User.activo == True,
            )
            .order_by(User.id)
        )
        result = await self.db.execute(q)
        return list(result.scalars().all())

    async def create(self, user: User) -> User:
        self.db.add(user)
        await self.db.flush()
        return user

    async def toggle_active(self, user_id: int, tenant_id: str) -> User | None:
        """
        Activa/desactiva un usuario.
        tenant_id explícito — sin patrón "__all__".
        """
        result = await self.db.execute(
            select(User).where(
                User.id == user_id,
                User.tenant_id == tenant_id,
            )
        )
        user = result.scalar_one_or_none()
        if not user:
            return None
        user.activo = not user.activo
        await self.db.flush()
        return user
