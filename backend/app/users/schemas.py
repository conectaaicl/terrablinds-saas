from typing import Literal, Optional

from pydantic import BaseModel, EmailStr


class UserCreate(BaseModel):
    email: EmailStr
    password: str
    nombre: str
    rol: Literal["jefe", "gerente", "coordinador", "vendedor", "fabricante", "instalador", "bodegas"]
    tenant_id: str


class UserResponse(BaseModel):
    id: int
    email: str
    nombre: str
    rol: str
    tenant_id: str
    activo: bool

    model_config = {"from_attributes": True}


class UserToggle(BaseModel):
    activo: bool
