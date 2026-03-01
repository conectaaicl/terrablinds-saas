from sqlalchemy.ext.asyncio import AsyncSession

from app.models.notification import Notification
from app.models.user import User
from app.notifications.repository import NotificationRepository
from app.notifications.schemas import NotificationCreate


class NotificationService:
    def __init__(self, db: AsyncSession):
        self.repo = NotificationRepository(db)

    async def list_notifications(self, tenant_scope: str) -> list[Notification]:
        if tenant_scope == "__all__":
            return await self.repo.get_all()
        return await self.repo.get_by_tenant(tenant_scope)

    async def create_notification(
        self, data: NotificationCreate, user: User
    ) -> Notification:
        notification = Notification(
            tenant_id=user.tenant_id or "",
            mensaje=data.mensaje,
            tipo=data.tipo,
        )
        return await self.repo.create(notification)
