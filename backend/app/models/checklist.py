from __future__ import annotations

from datetime import datetime
from typing import TYPE_CHECKING, Optional

from sqlalchemy import Boolean, DateTime, ForeignKey, Integer, String, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base

if TYPE_CHECKING:
    from app.models.user import User
    from app.models.order import Order
    from app.models.tenant import Tenant
    from app.models.appointment import Appointment


class ChecklistTemplate(Base):
    """Plantilla de checklist reutilizable (creada por el jefe/coordinador)."""
    __tablename__ = "checklist_templates"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    tenant_id: Mapped[str] = mapped_column(
        String, ForeignKey("tenants.id", ondelete="CASCADE"), nullable=False, index=True
    )
    nombre: Mapped[str] = mapped_column(String, nullable=False)
    # 'instalacion' | 'fabricacion' | 'inspeccion' | 'otro'
    tipo: Mapped[str] = mapped_column(String, nullable=False, default="instalacion")
    activo: Mapped[bool] = mapped_column(Boolean, default=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )

    tenant: Mapped[Tenant] = relationship(foreign_keys=[tenant_id])
    items: Mapped[list[ChecklistTemplateItem]] = relationship(
        back_populates="template",
        cascade="all, delete-orphan",
        order_by="ChecklistTemplateItem.orden",
    )


class ChecklistTemplateItem(Base):
    """Un ítem dentro de una plantilla."""
    __tablename__ = "checklist_template_items"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    template_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("checklist_templates.id", ondelete="CASCADE"), nullable=False, index=True
    )
    texto: Mapped[str] = mapped_column(String, nullable=False)
    orden: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    requerido: Mapped[bool] = mapped_column(Boolean, default=True)

    template: Mapped[ChecklistTemplate] = relationship(back_populates="items")


class OrderChecklist(Base):
    """Instancia de checklist asignada a una orden específica."""
    __tablename__ = "order_checklists"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    order_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("orders.id", ondelete="CASCADE"), nullable=False, index=True
    )
    template_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("checklist_templates.id", ondelete="RESTRICT"), nullable=False
    )
    appointment_id: Mapped[Optional[int]] = mapped_column(
        Integer, ForeignKey("appointments.id", ondelete="SET NULL"), nullable=True
    )
    completado: Mapped[bool] = mapped_column(Boolean, default=False)
    completado_por: Mapped[Optional[int]] = mapped_column(
        Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True
    )
    completado_at: Mapped[Optional[datetime]] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )

    order: Mapped[Order] = relationship(foreign_keys=[order_id])
    template: Mapped[ChecklistTemplate] = relationship(foreign_keys=[template_id])
    responses: Mapped[list[OrderChecklistResponse]] = relationship(
        back_populates="checklist", cascade="all, delete-orphan"
    )


class OrderChecklistResponse(Base):
    """Respuesta individual a un ítem de checklist."""
    __tablename__ = "order_checklist_responses"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    checklist_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("order_checklists.id", ondelete="CASCADE"), nullable=False, index=True
    )
    item_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("checklist_template_items.id", ondelete="CASCADE"), nullable=False
    )
    completado: Mapped[bool] = mapped_column(Boolean, default=False)
    notas: Mapped[Optional[str]] = mapped_column(String, nullable=True)
    respondido_por: Mapped[Optional[int]] = mapped_column(
        Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True
    )
    respondido_at: Mapped[Optional[datetime]] = mapped_column(
        DateTime(timezone=True), nullable=True
    )

    checklist: Mapped[OrderChecklist] = relationship(back_populates="responses")
    item: Mapped[ChecklistTemplateItem] = relationship(foreign_keys=[item_id])
