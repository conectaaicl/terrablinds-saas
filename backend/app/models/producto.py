from datetime import datetime
from uuid import UUID, uuid4

from sqlalchemy import Boolean, DateTime, Numeric, String, Text
from sqlalchemy.dialects.postgresql import JSONB, UUID as PG_UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import Base


class Producto(Base):
    __tablename__ = "productos"

    id: Mapped[UUID] = mapped_column(PG_UUID(as_uuid=True), primary_key=True, default=uuid4)
    tenant_id: Mapped[str] = mapped_column(String, nullable=False)
    codigo: Mapped[str | None] = mapped_column(String(50))
    nombre: Mapped[str] = mapped_column(String(200), nullable=False)
    descripcion: Mapped[str | None] = mapped_column(Text)
    categoria: Mapped[str] = mapped_column(String(100), nullable=False, default="general")
    unidad: Mapped[str] = mapped_column(String(20), nullable=False, default="m2")
    precio_base: Mapped[float] = mapped_column(Numeric(12, 2), nullable=False, default=0)
    colores: Mapped[dict] = mapped_column(JSONB, nullable=False, default=list)
    materiales: Mapped[dict] = mapped_column(JSONB, nullable=False, default=list)
    specs: Mapped[dict] = mapped_column(JSONB, nullable=False, default=dict)
    activo: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)
    created_by: Mapped[UUID | None] = mapped_column(PG_UUID(as_uuid=True))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=datetime.utcnow, onupdate=datetime.utcnow)
