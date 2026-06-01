from pydantic import BaseModel
from typing import List, Optional, Any
from datetime import datetime

# --- Auth & Users ---
class UserBase(BaseModel):
    email: str
    nombre: str
    rol: str
    tenant_id: str

class UserCreate(UserBase):
    password: str

class UserLogin(BaseModel):
    email: str
    password: str

class UserResponse(UserBase):
    id: int
    activo: bool
    class Config:
        from_attributes = True

class Token(BaseModel):
    access_token: str
    token_type: str
    user: UserResponse
    tenant_branding: Any

# --- Tenants ---
class TenantCreate(BaseModel):
    id: str
    nombre: str
    slug: str
    branding: Any

# --- Orders ---
class Producto(BaseModel):
    tipo: str
    ancho: float
    alto: float
    tela: str
    color: str
    precio: int
    ubicacion: Optional[str] = None
    accionamiento: Optional[str] = None

class OrderCreate(BaseModel):
    cliente_id: int
    productos: List[Producto]
    precio_total: int
    notas: Optional[str] = None

class OrderUpdate(BaseModel):
    estado: Optional[str] = None
    fabricante_id: Optional[int] = None
    instalador_id: Optional[int] = None
    fecha_instalacion: Optional[datetime] = None

class OrderResponse(BaseModel):
    id: int
    numero: int
    estado: str
    cliente_id: int
    vendedor_id: int
    fabricante_id: Optional[int]
    instalador_id: Optional[int]
    productos: List[Any]
    created_at: datetime
    fecha_instalacion: Optional[datetime]
    
    class Config:
        from_attributes = True

# --- Insumos ---
class InsumoCreate(BaseModel):
    items: List[str]
    urgencia: str

# --- Notifications ---
class NotiCreate(BaseModel):
    mensaje: str
    tipo: str
