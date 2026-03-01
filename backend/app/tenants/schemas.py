from typing import Any, Literal, Optional

from pydantic import BaseModel


class TenantCreate(BaseModel):
    id: str
    nombre: str
    slug: str
    branding: dict
    plan: Literal["trial", "basico", "pro"] = "trial"


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

    model_config = {"from_attributes": True}
