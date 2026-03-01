from typing import Literal, Optional

from pydantic import BaseModel


class InsumoCreate(BaseModel):
    items: list[str]
    urgencia: Literal["baja", "media", "alta"] = "media"


class InsumoResponse(BaseModel):
    id: int
    tenant_id: str
    usuario_id: int
    usuario_nombre: Optional[str] = None
    items: list[str]
    urgencia: str
    estado: str
    created_at: str

    model_config = {"from_attributes": True}
