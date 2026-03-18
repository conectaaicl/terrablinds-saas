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

    # — Identificación
    codigo: Mapped[str | None] = mapped_column(String(50))
    codigo_proveedor: Mapped[str | None] = mapped_column(String(100))
    nombre: Mapped[str] = mapped_column(String(200), nullable=False)
    descripcion: Mapped[str | None] = mapped_column(Text)

    # — Clasificación
    categoria: Mapped[str] = mapped_column(String(100), nullable=False, default="general")
    marca: Mapped[str | None] = mapped_column(String(100))
    proveedor: Mapped[str | None] = mapped_column(String(200))

    # — Precios y unidad
    unidad: Mapped[str] = mapped_column(String(20), nullable=False, default="m2")  # m2 | ml | unidad
    precio_base: Mapped[float] = mapped_column(Numeric(12, 2), nullable=False, default=0)
    precio_m2: Mapped[float | None] = mapped_column(Numeric(12, 2))   # precio específico por m²
    precio_ml: Mapped[float | None] = mapped_column(Numeric(12, 2))   # precio por metro lineal

    # — Dimensiones (para validación en cotización)
    ancho_min: Mapped[float | None] = mapped_column(Numeric(8, 2))    # metros
    ancho_max: Mapped[float | None] = mapped_column(Numeric(8, 2))
    alto_min: Mapped[float | None] = mapped_column(Numeric(8, 2))
    alto_max: Mapped[float | None] = mapped_column(Numeric(8, 2))

    # — Variantes y specs
    colores: Mapped[list] = mapped_column(JSONB, nullable=False, default=list)
    materiales: Mapped[list] = mapped_column(JSONB, nullable=False, default=list)
    specs: Mapped[dict] = mapped_column(JSONB, nullable=False, default=dict)

    # — Estado
    activo: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)
    created_by: Mapped[UUID | None] = mapped_column(PG_UUID(as_uuid=True))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=datetime.utcnow, onupdate=datetime.utcnow)
