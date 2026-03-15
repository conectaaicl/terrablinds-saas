"""
Modelos para métricas, audit log, event sourcing, y permisos configurables.

Tablas:
  - audit_log: append-only audit trail (particionada por mes en SQL)
  - order_events: event sourcing para métricas de tiempo
  - order_metrics: métricas calculadas por orden (Celery beat)
  - user_productivity_monthly: productividad por usuario/mes
  - tenant_role_permissions: permisos configurables por jefe
"""
from __future__ import annotations

from datetime import datetime
from typing import Optional

from sqlalchemy import DateTime, ForeignKey, Integer, String, UniqueConstraint, func
from sqlalchemy.dialects.postgresql import BOOLEAN, JSONB
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import Base


class AuditLog(Base):
    """
    Audit trail append-only.
    La tabla real en PostgreSQL está particionada por mes (migración 003).
    SQLAlchemy la ve como una tabla normal para INSERTs.
    Los SELECTs aprovecharán partition pruning automáticamente.
    """
    __tablename__ = "audit_log"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    tenant_id: Mapped[str] = mapped_column(String, nullable=False, index=True)
    user_id: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    user_nombre: Mapped[Optional[str]] = mapped_column(String, nullable=True)
    user_rol: Mapped[Optional[str]] = mapped_column(String, nullable=True)
    action: Mapped[str] = mapped_column(String, nullable=False)
    resource_type: Mapped[str] = mapped_column(String, nullable=False)
    resource_id: Mapped[Optional[str]] = mapped_column(String, nullable=True)
    old_value: Mapped[Optional[dict]] = mapped_column(JSONB, nullable=True)
    new_value: Mapped[Optional[dict]] = mapped_column(JSONB, nullable=True)
    ip_address: Mapped[Optional[str]] = mapped_column(String, nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )


class OrderEvent(Base):
    """
    Event sourcing append-only para cálculo de métricas de tiempo.
    Cada cambio de estado genera un evento con duración en el estado anterior.
    """
    __tablename__ = "order_events"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    tenant_id: Mapped[str] = mapped_column(String, nullable=False, index=True)
    order_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("orders.id", ondelete="CASCADE"), nullable=False, index=True
    )
    event_type: Mapped[str] = mapped_column(String, nullable=False)
    from_estado: Mapped[Optional[str]] = mapped_column(String, nullable=True)
    to_estado: Mapped[Optional[str]] = mapped_column(String, nullable=True)
    user_id: Mapped[int] = mapped_column(Integer, nullable=False)
    user_nombre: Mapped[str] = mapped_column(String, nullable=False, default="")
    # Minutos que la orden estuvo en from_estado antes de este cambio
    duration_minutes: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    event_data: Mapped[Optional[dict]] = mapped_column(JSONB, nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )


class OrderMetrics(Base):
    """
    Métricas calculadas por orden. Actualizada por Celery beat cada 15 min.
    Una fila por orden.
    """
    __tablename__ = "order_metrics"

    order_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("orders.id", ondelete="CASCADE"), primary_key=True
    )
    tenant_id: Mapped[str] = mapped_column(String, nullable=False, index=True)
    tiempo_confirmacion_horas: Mapped[Optional[float]] = mapped_column(
        # Horas desde cotizado hasta confirmado
        nullable=True
    )
    tiempo_fabricacion_horas: Mapped[Optional[float]] = mapped_column(nullable=True)
    tiempo_agendado_horas: Mapped[Optional[float]] = mapped_column(nullable=True)
    tiempo_instalacion_horas: Mapped[Optional[float]] = mapped_column(nullable=True)
    tiempo_total_horas: Mapped[Optional[float]] = mapped_column(nullable=True)
    num_reagendamientos: Mapped[int] = mapped_column(Integer, default=0)
    num_incidentes: Mapped[int] = mapped_column(Integer, default=0)
    num_problemas: Mapped[int] = mapped_column(Integer, default=0)
    cerrado_at: Mapped[Optional[datetime]] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )


class UserProductivityMonthly(Base):
    """
    Resumen de productividad por usuario por mes.
    Actualizada por Celery beat.
    """
    __tablename__ = "user_productivity_monthly"
    __table_args__ = (
        UniqueConstraint("user_id", "anio", "mes", name="uq_productivity_user_month"),
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    tenant_id: Mapped[str] = mapped_column(String, nullable=False, index=True)
    user_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True
    )
    anio: Mapped[int] = mapped_column(Integer, nullable=False)
    mes: Mapped[int] = mapped_column(Integer, nullable=False)
    ordenes_fabricadas: Mapped[int] = mapped_column(Integer, default=0)
    ordenes_instaladas: Mapped[int] = mapped_column(Integer, default=0)
    ordenes_vendidas: Mapped[int] = mapped_column(Integer, default=0)
    incidentes_reportados: Mapped[int] = mapped_column(Integer, default=0)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )


class TenantRolePermission(Base):
    """
    Overrides de permisos por tenant y rol.
    Permite al jefe ampliar o restringir permisos de su equipo
    dentro de los límites de UNDELEGATABLE_PERMISSIONS.
    """
    __tablename__ = "tenant_role_permissions"
    __table_args__ = (
        UniqueConstraint(
            "tenant_id", "rol", "resource", "action",
            name="uq_tenant_role_permission"
        ),
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    tenant_id: Mapped[str] = mapped_column(
        String, ForeignKey("tenants.id", ondelete="CASCADE"), nullable=False, index=True
    )
    rol: Mapped[str] = mapped_column(String, nullable=False)
    resource: Mapped[str] = mapped_column(String, nullable=False)
    action: Mapped[str] = mapped_column(String, nullable=False)
    permitido: Mapped[bool] = mapped_column(BOOLEAN, nullable=False)
    updated_by: Mapped[Optional[int]] = mapped_column(
        Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )
