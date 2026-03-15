from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth.dependencies import TokenData, get_token_data, require_roles
from app.dependencies import get_db_for_tenant
from app.notifications.schemas import NotificationCreate, NotificationResponse
from app.notifications.service import NotificationService

router = APIRouter(prefix="/notifications", tags=["notifications"])


@router.get("/", response_model=list[NotificationResponse])
async def list_notifications(
    token_data: TokenData = Depends(get_token_data),
    db: AsyncSession = Depends(get_db_for_tenant),
):
    service = NotificationService(db)
    notis = await service.list_notifications(token_data.tenant_id)
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
    token_data: TokenData = Depends(require_roles("jefe", "coordinador", "gerente")),
    db: AsyncSession = Depends(get_db_for_tenant),
):
    from app.models.user import User
    from sqlalchemy import select
    result = await db.execute(select(User).where(User.id == token_data.user_id))
    user = result.scalar_one_or_none()
    if not user:
        from fastapi import HTTPException
        raise HTTPException(status_code=404, detail="Usuario no encontrado")
    service = NotificationService(db)
    noti = await service.create_notification(data, user)
    return NotificationResponse(
        id=noti.id,
        tenant_id=noti.tenant_id,
        mensaje=noti.mensaje,
        tipo=noti.tipo,
        leido_por=noti.leido_por or [],
        created_at=noti.created_at.isoformat() if noti.created_at else "",
    )
