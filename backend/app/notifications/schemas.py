from typing import Literal, Optional

from pydantic import BaseModel


class NotificationCreate(BaseModel):
    mensaje: str
    tipo: Literal["info", "alerta", "exito"] = "info"


class NotificationResponse(BaseModel):
    id: int
    tenant_id: str
    mensaje: str
    tipo: str
    leido_por: list
    created_at: str

    model_config = {"from_attributes": True}
