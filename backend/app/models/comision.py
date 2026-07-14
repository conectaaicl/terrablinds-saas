from __future__ import annotations

from datetime import date, datetime
from typing import Optional

from sqlalchemy import Boolean, Date, DateTime, ForeignKey, Integer, String, Text, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base


class ReglaComision(Base):
    __tablename__ = "reglas_comision"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    tenant_id: Mapped[str] = mapped_column(
        String, ForeignKey("tenants.id", ondelete="CASCADE"), nullable=False, index=True
    )
    categoria: Mapped[str] = mapped_column(String(100), nullable=False)
    rol: Mapped[str] = mapped_column(String(50), nullable=False)
    monto_por_unidad: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    descripcion: Mapped[Optional[str]] = mapped_column(String(200), nullable=True)
    activo: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)
    # Cuando esta definida, la categoria no se paga por unidad hecha sino por
    # desviacion respecto a una meta mensual: (unidades_del_mes - meta_mensual) * monto_por_unidad.
    # Ej: Roller con meta 50 y tarifa 1.500 -- hacer 18 en el mes descuenta (18-50)*1500 = -$48.000.
    meta_mensual: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )


class Comision(Base):
    __tablename__ = "comisiones"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    tenant_id: Mapped[str] = mapped_column(
        String, ForeignKey("tenants.id", ondelete="CASCADE"), nullable=False, index=True
    )
    user_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False
    )
    order_id: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    rol: Mapped[str] = mapped_column(String(50), nullable=False)
    categoria: Mapped[str] = mapped_column(String(100), nullable=False)
    cantidad: Mapped[int] = mapped_column(Integer, nullable=False, default=1)
    monto_por_unidad: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    total: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    estado: Mapped[str] = mapped_column(String(20), nullable=False, default="pendiente")
    periodo: Mapped[str] = mapped_column(String(7), nullable=False)  # YYYY-MM
    notas: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    fecha_trabajo: Mapped[Optional[date]] = mapped_column(Date, nullable=True)
    tipo_registro: Mapped[str] = mapped_column(String(20), nullable=False, default="orden")  # orden | manual
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )


class Liquidacion(Base):
    __tablename__ = "liquidaciones"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    tenant_id: Mapped[str] = mapped_column(
        String, ForeignKey("tenants.id", ondelete="CASCADE"), nullable=False, index=True
    )
    user_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False
    )
    periodo: Mapped[str] = mapped_column(String(7), nullable=False)  # YYYY-MM
    sueldo_base: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    total_comisiones: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    ajustes: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    # Cuanto de "ajustes" corresponde al calculo automatico de metas (ej. Roller).
    # Se guarda aparte para poder refrescarlo al regenerar sin borrar los ajustes
    # manuales (bono container, adelantos, etc.) que el jefe haya agregado encima.
    ajuste_metas: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    notas_ajustes: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    total: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    estado: Mapped[str] = mapped_column(String(20), nullable=False, default="borrador")
    aprobado_por: Mapped[Optional[int]] = mapped_column(
        Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True
    )
    aprobado_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )
    updated_at: Mapped[Optional[datetime]] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=True
    )
