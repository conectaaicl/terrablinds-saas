from typing import Optional
from uuid import UUID

from pydantic import BaseModel, Field


class GpsPingCreate(BaseModel):
    lat: float = Field(ge=-90, le=90)
    lon: float = Field(ge=-180, le=180)
    precision_m: Optional[int] = None
    velocidad_kmh: Optional[float] = None
    heading: Optional[float] = None
    order_id: Optional[int] = None
    appointment_id: Optional[UUID] = None


class GpsLastPosition(BaseModel):
    user_id: int
    user_nombre: str
    user_rol: str
    order_id: Optional[int]
    appointment_id: Optional[UUID]
    lat: float
    lon: float
    precision_m: Optional[int]
    velocidad_kmh: Optional[float]
    last_seen: str
    maps_url: str
