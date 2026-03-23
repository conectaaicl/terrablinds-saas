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

    async def get_by_id(self, notification_id: int, tenant_id: str) -> Notification | None:
        q = select(Notification).where(
            Notification.id == notification_id,
            Notification.tenant_id == tenant_id,
        )
        result = await self.db.execute(q)
        return result.scalar_one_or_none()

    async def mark_read(self, notification: Notification, user_id: int) -> Notification:
        leido_por = list(notification.leido_por or [])
        if user_id not in leido_por:
            leido_por.append(user_id)
            notification.leido_por = leido_por
            await self.db.flush()
        return notification

    async def mark_all_read(self, tenant_id: str, user_id: int) -> None:
        notis = await self.get_by_tenant(tenant_id, limit=50)
        for n in notis:
            leido_por = list(n.leido_por or [])
            if user_id not in leido_por:
                leido_por.append(user_id)
                n.leido_por = leido_por
        await self.db.flush()
