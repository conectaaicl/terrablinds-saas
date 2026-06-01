from __future__ import annotations
import enum
from datetime import datetime
from typing import Optional
from sqlalchemy import DateTime, Enum, ForeignKey, Integer, String, func
from sqlalchemy.orm import Mapped, mapped_column
from app.models.base import Base

class TipoMovimientoEnum(str, enum.Enum):
    ingreso = "ingreso"
    egreso = "egreso"

class CategoriaCajaEnum(str, enum.Enum):
    materiales = "materiales"
    transporte = "transporte"
    alimentacion = "alimentacion"
    limpieza = "limpieza"
    oficina = "oficina"
    servicios = "servicios"
    reembolso = "reembolso"
    otro = "otro"

class CajaChica(Base):
    __tablename__ = "caja_chica"
    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    tenant_id: Mapped[str] = mapped_column(String, nullable=False, index=True)
    tipo: Mapped[TipoMovimientoEnum] = mapped_column(Enum(TipoMovimientoEnum, name="tipo_movimiento_enum", create_type=False), nullable=False)
    categoria: Mapped[CategoriaCajaEnum] = mapped_column(Enum(CategoriaCajaEnum, name="categoria_caja_enum", create_type=False), nullable=False, default=CategoriaCajaEnum.otro)
    monto: Mapped[int] = mapped_column(Integer, nullable=False)
    descripcion: Mapped[str] = mapped_column(String, nullable=False)
    referencia: Mapped[Optional[str]] = mapped_column(String, nullable=True)
    responsable_id: Mapped[int] = mapped_column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=False)
    responsable_nombre: Mapped[str] = mapped_column(String, nullable=False, default="")
    saldo_despues: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)
