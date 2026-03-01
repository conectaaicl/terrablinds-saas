from typing import Optional

from pydantic import BaseModel, EmailStr


class ClientCreate(BaseModel):
    nombre: str
    email: Optional[str] = None
    telefono: Optional[str] = None
    direccion: Optional[str] = None


class ClientResponse(BaseModel):
    id: int
    nombre: str
    email: Optional[str] = None
    telefono: Optional[str] = None
    direccion: Optional[str] = None
    vendedor_id: Optional[int] = None
    tenant_id: str

    model_config = {"from_attributes": True}
