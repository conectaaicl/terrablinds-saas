from datetime import datetime
from typing import Any, Optional
from uuid import UUID

from pydantic import BaseModel


class ChannelOut(BaseModel):
    id: UUID
    tenant_id: str
    type: str
    name: str
    meta: Optional[dict[str, Any]] = None
    created_at: datetime

    model_config = {"from_attributes": True}


class MessageOut(BaseModel):
    id: UUID
    channel_id: UUID
    tenant_id: str
    user_id: int
    user_nombre: str
    user_rol: str
    content: str
    created_at: datetime

    model_config = {"from_attributes": True}


class MessageIn(BaseModel):
    content: str
