from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.notification import Notification


class NotificationRepository:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def get_by_tenant(self, tenant_id: str, limit: int = 20) -> list[Notification]:
        q = (
            select(Notification)
            .where(Notification.tenant_id == tenant_id)
            .order_by(Notification.id.desc())
            .limit(limit)
        )
        result = await self.db.execute(q)
        return list(result.scalars().all())

    async def get_all(self, limit: int = 20) -> list[Notification]:
        q = select(Notification).order_by(Notification.id.desc()).limit(limit)
        result = await self.db.execute(q)
        return list(result.scalars().all())

    async def create(self, notification: Notification) -> Notification:
        self.db.add(notification)
        await self.db.flush()
        return notification
