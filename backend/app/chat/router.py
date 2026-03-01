"""
Chat router — REST + WebSocket.

Canales por rol:
  general    → todos los roles
  operaciones → jefe, gerente, coordinador, fabricante, instalador
  ventas     → jefe, gerente, coordinador, vendedor

WebSocket auth via query param ?token=<access_jwt>
(HTTPBearer no funciona en conexiones WS estándar de browsers).
"""
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, WebSocket, WebSocketDisconnect, status
from sqlalchemy import select, text
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth.dependencies import TokenData, require_roles
from app.auth.service import decode_access_token
from app.chat.manager import manager
from app.chat.schemas import ChannelOut, MessageOut
from app.database import async_session
from app.dependencies import get_db_for_tenant
from app.models.chat import ChatChannel, ChatMessage

router = APIRouter(prefix="/chat", tags=["chat"])

# Roles permitidos por tipo de canal
CANAL_ROLES: dict[str, set[str]] = {
    "general":     {"jefe", "gerente", "coordinador", "vendedor", "fabricante", "instalador", "superadmin"},
    "operaciones": {"jefe", "gerente", "coordinador", "fabricante", "instalador"},
    "ventas":      {"jefe", "gerente", "coordinador", "vendedor"},
}


async def _get_or_create_channels(db: AsyncSession, tenant_id: str) -> list[ChatChannel]:
    """Asegura que existan los 3 canales estándar para el tenant y los retorna todos."""
    for canal_type, canal_name in [
        ("general",     "General"),
        ("operaciones", "Operaciones"),
        ("ventas",      "Ventas"),
    ]:
        existing = await db.execute(
            select(ChatChannel).where(
                ChatChannel.tenant_id == tenant_id,
                ChatChannel.type == canal_type,
            )
        )
        if existing.scalar_one_or_none() is None:
            canal = ChatChannel(
                tenant_id=tenant_id,
                type=canal_type,
                name=canal_name,
            )
            db.add(canal)
    await db.commit()

    result = await db.execute(
        select(ChatChannel).where(ChatChannel.tenant_id == tenant_id)
    )
    return list(result.scalars().all())


@router.get("/channels", response_model=list[ChannelOut])
async def list_channels(
    token_data: TokenData = Depends(require_roles(
        "jefe", "gerente", "coordinador", "vendedor", "fabricante", "instalador", "superadmin"
    )),
    db: AsyncSession = Depends(get_db_for_tenant),
):
    """Lista los canales accesibles para el rol del usuario."""
    canales = await _get_or_create_channels(db, token_data.tenant_id)
    accesibles = [
        c for c in canales
        if token_data.role in CANAL_ROLES.get(c.type, set())
    ]
    return [ChannelOut.model_validate(c) for c in accesibles]


@router.get("/channels/{channel_id}/messages", response_model=list[MessageOut])
async def get_messages(
    channel_id: UUID,
    before: str | None = Query(None, description="ISO datetime — trae mensajes anteriores a esta fecha"),
    token_data: TokenData = Depends(require_roles(
        "jefe", "gerente", "coordinador", "vendedor", "fabricante", "instalador", "superadmin"
    )),
    db: AsyncSession = Depends(get_db_for_tenant),
):
    """Retorna los últimos 50 mensajes del canal (paginación hacia atrás con ?before=)."""
    # Verificar que el canal pertenece al tenant y el rol tiene acceso
    canal_res = await db.execute(
        select(ChatChannel).where(
            ChatChannel.id == channel_id,
            ChatChannel.tenant_id == token_data.tenant_id,
        )
    )
    canal = canal_res.scalar_one_or_none()
    if canal is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Canal no encontrado")

    if token_data.role not in CANAL_ROLES.get(canal.type, set()):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Sin acceso a este canal")

    q = (
        select(ChatMessage)
        .where(
            ChatMessage.channel_id == channel_id,
            ChatMessage.tenant_id == token_data.tenant_id,
        )
        .order_by(ChatMessage.created_at.desc())
        .limit(50)
    )
    if before:
        q = q.where(ChatMessage.created_at < text(f"'{before}'::timestamptz"))

    result = await db.execute(q)
    msgs = list(reversed(result.scalars().all()))
    return [MessageOut.model_validate(m) for m in msgs]


@router.websocket("/ws/{channel_id}")
async def websocket_chat(
    websocket: WebSocket,
    channel_id: UUID,
    token: str = Query(..., description="JWT de acceso"),
):
    """
    WebSocket para chat en tiempo real.

    Autenticación: ?token=<access_jwt>
    Protocolo: cliente envía {"content": "texto"}, servidor broadcast {"id", "channel_id", ...}
    """
    # 1. Validar token
    payload = decode_access_token(token)
    if payload is None:
        await websocket.close(code=4001)
        return

    user_id = int(payload["sub"])
    tenant_id = payload.get("tenant_id", "")
    role = payload.get("role", "")

    # 2. Verificar acceso al canal usando sesión con RLS
    async with async_session() as db:
        await db.execute(
            text("SELECT set_config('app.tenant_id', :tid, true)"),
            {"tid": tenant_id},
        )
        await db.execute(text("SELECT set_config('app.lookup_email', '', true)"))

        canal_res = await db.execute(
            select(ChatChannel).where(
                ChatChannel.id == channel_id,
                ChatChannel.tenant_id == tenant_id,
            )
        )
        canal = canal_res.scalar_one_or_none()

    if canal is None or role not in CANAL_ROLES.get(canal.type, set()):
        await websocket.close(code=4003)
        return

    # 3. Obtener nombre del usuario
    from app.models.user import User
    async with async_session() as db:
        await db.execute(
            text("SELECT set_config('app.tenant_id', :tid, true)"),
            {"tid": tenant_id},
        )
        await db.execute(text("SELECT set_config('app.lookup_email', '', true)"))
        user_res = await db.execute(select(User).where(User.id == user_id))
        user_obj = user_res.scalar_one_or_none()

    user_nombre = user_obj.nombre if user_obj else f"Usuario {user_id}"

    # 4. Conectar al manager
    await manager.connect(websocket, tenant_id, channel_id)

    try:
        while True:
            data = await websocket.receive_json()
            content = (data.get("content") or "").strip()
            if not content:
                continue

            # Guardar en DB
            async with async_session() as db:
                await db.execute(
                    text("SELECT set_config('app.tenant_id', :tid, true)"),
                    {"tid": tenant_id},
                )
                await db.execute(text("SELECT set_config('app.lookup_email', '', true)"))

                msg = ChatMessage(
                    channel_id=channel_id,
                    tenant_id=tenant_id,
                    user_id=user_id,
                    user_nombre=user_nombre,
                    user_rol=role,
                    content=content,
                )
                db.add(msg)
                await db.commit()
                await db.refresh(msg)

            # Broadcast a todos en el canal
            await manager.broadcast(
                {
                    "id": str(msg.id),
                    "channel_id": str(msg.channel_id),
                    "tenant_id": msg.tenant_id,
                    "user_id": msg.user_id,
                    "user_nombre": msg.user_nombre,
                    "user_rol": msg.user_rol,
                    "content": msg.content,
                    "created_at": msg.created_at.isoformat(),
                },
                tenant_id,
                channel_id,
            )

    except WebSocketDisconnect:
        manager.disconnect(websocket, tenant_id, channel_id)
    except Exception:
        manager.disconnect(websocket, tenant_id, channel_id)
