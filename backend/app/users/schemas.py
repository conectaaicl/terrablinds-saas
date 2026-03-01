from typing import Literal, Optional

from pydantic import BaseModel, EmailStr


class UserCreate(BaseModel):
    email: EmailStr
    password: str
    nombre: str
    rol: Literal["jefe", "coordinador", "vendedor", "fabricante", "instalador"]
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
