from datetime import datetime

from sqlalchemy import DateTime, Double, Integer, Numeric, String
from sqlalchemy.dialects.postgresql import UUID as PG_UUID
from sqlalchemy.orm import Mapped, mapped_column
from uuid import UUID, uuid4

from app.models.base import Base


class GpsPing(Base):
    __tablename__ = "gps_pings"

    id: Mapped[UUID] = mapped_column(PG_UUID(as_uuid=True), primary_key=True, default=uuid4)
    tenant_id: Mapped[str] = mapped_column(String, nullable=False)
    user_id: Mapped[int] = mapped_column(Integer, nullable=False)   # FK → users.id (integer)
    appointment_id: Mapped[UUID | None] = mapped_column(PG_UUID(as_uuid=True))
    order_id: Mapped[int | None] = mapped_column(Integer)
    lat: Mapped[float] = mapped_column(Double, nullable=False)
    lon: Mapped[float] = mapped_column(Double, nullable=False)
    precision_m: Mapped[int | None] = mapped_column(Integer)
    velocidad_kmh: Mapped[float | None] = mapped_column(Numeric(6, 2))
    heading: Mapped[float | None] = mapped_column(Numeric(5, 2))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=datetime.utcnow)
