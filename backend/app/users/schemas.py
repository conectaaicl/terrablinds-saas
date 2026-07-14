from typing import Literal, Optional

from pydantic import BaseModel, EmailStr


class UserCreate(BaseModel):
    email: EmailStr
    password: Optional[str] = None  # Si no se provee, el sistema genera una contraseña segura
    nombre: str
    rol: Literal["jefe", "gerente", "coordinador", "vendedor", "fabricante", "instalador", "bodegas"]
    tenant_id: str
    telefono: Optional[str] = None


class UserResponse(BaseModel):
    id: int
    email: str
    nombre: str
    rol: str
    tenant_id: str
    telefono: Optional[str] = None
    activo: bool
    telefono: Optional[str] = None
    puede_ver_comisiones: bool = True

    model_config = {"from_attributes": True}


class UserToggle(BaseModel):
    activo: bool


class UserUpdate(BaseModel):
    nombre: Optional[str] = None
    email: Optional[str] = None
    telefono: Optional[str] = None
    puede_ver_comisiones: Optional[bool] = None
