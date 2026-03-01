from __future__ import annotations

import enum
from typing import TYPE_CHECKING, Optional

from sqlalchemy import Boolean, Enum, ForeignKey, Integer, String, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base

if TYPE_CHECKING:
    from app.models.tenant import Tenant


class RoleEnum(str, enum.Enum):
    superadmin = "superadmin"
    jefe = "jefe"
    gerente = "gerente"
    coordinador = "coordinador"
    vendedor = "vendedor"
    fabricante = "fabricante"
    instalador = "instalador"


# Roles que pertenecen a un tenant (necesitan tenant_id)
TENANT_ROLES: set[RoleEnum] = {
    RoleEnum.jefe,
    RoleEnum.gerente,
    RoleEnum.coordinador,
    RoleEnum.vendedor,
    RoleEnum.fabricante,
    RoleEnum.instalador,
}

# Qué roles puede crear cada rol
CREATABLE_ROLES: dict[RoleEnum, set[RoleEnum]] = {
    RoleEnum.superadmin: {
        RoleEnum.jefe,
        RoleEnum.gerente,
        RoleEnum.coordinador,
        RoleEnum.vendedor,
        RoleEnum.fabricante,
        RoleEnum.instalador,
        # superadmin nunca puede crear otro superadmin por API
    },
    RoleEnum.jefe: {
        RoleEnum.gerente,
        RoleEnum.coordinador,
        RoleEnum.vendedor,
        RoleEnum.fabricante,
        RoleEnum.instalador,
    },
    RoleEnum.gerente: {
        RoleEnum.coordinador,
        RoleEnum.vendedor,
        RoleEnum.fabricante,
        RoleEnum.instalador,
    },
}


class User(Base):
    __tablename__ = "users"
    __table_args__ = (
        # Email único POR tenant (no globalmente)
        # El índice parcial en SQL (COALESCE para superadmin) lo maneja la migración
        UniqueConstraint("email", "tenant_id", name="uq_users_email_tenant"),
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    email: Mapped[str] = mapped_column(String, nullable=False, index=True)
    hashed_password: Mapped[str] = mapped_column(String, nullable=False)
    nombre: Mapped[str] = mapped_column(String, nullable=False)
    rol: Mapped[RoleEnum] = mapped_column(Enum(RoleEnum), nullable=False)
    tenant_id: Mapped[Optional[str]] = mapped_column(
        String, ForeignKey("tenants.id", ondelete="CASCADE"), nullable=True
    )
    activo: Mapped[bool] = mapped_column(Boolean, default=True)

    tenant: Mapped[Optional[Tenant]] = relationship(back_populates="users")
