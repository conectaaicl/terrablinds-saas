from typing import Any, Literal, Optional

from pydantic import BaseModel


class TenantCreate(BaseModel):
    id: str
    nombre: str
    slug: str
    branding: dict
    plan: Literal["trial", "basico", "pro"] = "trial"
    # Cuenta inicial del jefe (opcional — si se provee, se crea el usuario y se envía email)
    jefe_nombre: Optional[str] = None
    jefe_email: Optional[str] = None


class TenantUpdate(BaseModel):
    nombre: Optional[str] = None
    slug: Optional[str] = None
    branding: Optional[dict] = None
    plan: Optional[Literal["trial", "basico", "pro"]] = None
    activo: Optional[bool] = None


class TenantResponse(BaseModel):
    id: str
    nombre: str
    slug: str
    branding: dict
    plan: str
    activo: bool
    # Presente solo cuando se acaba de crear el taller con jefe
    jefe_password: Optional[str] = None

    model_config = {"from_attributes": True}
