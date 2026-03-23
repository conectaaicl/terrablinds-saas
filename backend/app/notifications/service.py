from sqlalchemy.ext.asyncio import AsyncSession

from app.models.notification import Notification
from app.models.user import User
from app.notifications.repository import NotificationRepository
from app.notifications.schemas import NotificationCreate


class NotificationService:
    def __init__(self, db: AsyncSession):
        self.repo = NotificationRepository(db)

    async def list_notifications(self, tenant_id: str) -> list[Notification]:
        return await self.repo.get_by_tenant(tenant_id)

    async def create_notification(
        self, data: NotificationCreate, user: User
    ) -> Notification:
        notification = Notification(
            tenant_id=user.tenant_id or "",
            mensaje=data.mensaje,
            tipo=data.tipo,
        )
        return await self.repo.create(notification)

    async def mark_as_read(self, notification_id: int, user_id: int, tenant_id: str) -> Notification | None:
        noti = await self.repo.get_by_id(notification_id, tenant_id)
        if noti:
            return await self.repo.mark_read(noti, user_id)
        return None

    async def mark_all_read(self, tenant_id: str, user_id: int) -> None:
        await self.repo.mark_all_read(tenant_id, user_id)

    async def create_system_notification(self, tenant_id: str, mensaje: str, tipo: str = "info") -> Notification:
        noti = Notification(tenant_id=tenant_id, mensaje=mensaje, tipo=tipo)
        return await self.repo.create(noti)
