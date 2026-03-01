from __future__ import annotations

from datetime import datetime
from typing import TYPE_CHECKING

from sqlalchemy import Boolean, DateTime, ForeignKey, Integer, String, func
from sqlalchemy.dialects.postgresql import JSON
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base

if TYPE_CHECKING:
    from app.models.user import User
    from app.models.client import Client
    from app.models.order import Order


class Tenant(Base):
    __tablename__ = "tenants"

    id: Mapped[str] = mapped_column(String, primary_key=True, index=True)
    nombre: Mapped[str] = mapped_column(String, nullable=False)
    slug: Mapped[str] = mapped_column(String, unique=True, index=True, nullable=False)
    plan: Mapped[str] = mapped_column(String, default="basico")
    activo: Mapped[bool] = mapped_column(Boolean, default=True)
    branding: Mapped[dict] = mapped_column(JSON, nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )

    users: Mapped[list[User]] = relationship(back_populates="tenant")
    clients: Mapped[list[Client]] = relationship(back_populates="tenant")
    orders: Mapped[list[Order]] = relationship(back_populates="tenant")
    order_counter: Mapped[TenantOrderCounter] = relationship(
        back_populates="tenant", uselist=False, cascade="all, delete-orphan"
    )


class TenantOrderCounter(Base):
    """
    Contador atómico de órdenes por tenant.
    Elimina la race condition del MAX(numero)+1 original.
    La función SQL get_next_order_numero() hace UPDATE...RETURNING atómico.
    """
    __tablename__ = "tenant_order_counters"

    tenant_id: Mapped[str] = mapped_column(
        String, ForeignKey("tenants.id", ondelete="CASCADE"), primary_key=True
    )
    last_numero: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )

    tenant: Mapped[Tenant] = relationship(back_populates="order_counter")
