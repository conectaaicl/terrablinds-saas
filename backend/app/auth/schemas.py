from typing import Any, Optional

from pydantic import BaseModel, EmailStr


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class TokenResponse(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    user: dict[str, Any]
    tenant_branding: Optional[dict] = None
    tenant_nombre: Optional[str] = None


class RefreshRequest(BaseModel):
    refresh_token: str
