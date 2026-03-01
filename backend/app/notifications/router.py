from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth.dependencies import get_current_user, require_roles
from app.database import get_db
from app.dependencies import get_tenant_scope
from app.models.user import User
from app.notifications.schemas import NotificationCreate, NotificationResponse
from app.notifications.service import NotificationService

router = APIRouter(prefix="/notifications", tags=["notifications"])


@router.get("/", response_model=list[NotificationResponse])
async def list_notifications(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    scope = get_tenant_scope(current_user)
    service = NotificationService(db)
    notis = await service.list_notifications(scope)
    return [
        NotificationResponse(
            id=n.id,
            tenant_id=n.tenant_id,
            mensaje=n.mensaje,
            tipo=n.tipo,
            leido_por=n.leido_por or [],
            created_at=n.created_at.isoformat() if n.created_at else "",
        )
        for n in notis
    ]


@router.post("/", response_model=NotificationResponse, status_code=201)
async def create_notification(
    data: NotificationCreate,
    current_user: User = Depends(require_roles("jefe", "coordinador")),
    db: AsyncSession = Depends(get_db),
):
    service = NotificationService(db)
    noti = await service.create_notification(data, current_user)
    return NotificationResponse(
        id=noti.id,
        tenant_id=noti.tenant_id,
        mensaje=noti.mensaje,
        tipo=noti.tipo,
        leido_por=noti.leido_por or [],
        created_at=noti.created_at.isoformat() if noti.created_at else "",
    )
