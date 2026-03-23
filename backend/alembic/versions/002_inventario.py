"""inventario, produccion_subestado, garantia_meses, fecha_instalacion

Revision ID: 002_inventario
Revises: 001_extend_schema
Create Date: 2026-03-18
"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision = "002_inventario"
down_revision = "001_extend_schema"
branch_labels = None
depends_on = None


def upgrade() -> None:
    # ── 1. inventario_items ──────────────────────────────────────────────────
    op.create_table(
        "inventario_items",
        sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column("tenant_id", sa.String(50), sa.ForeignKey("tenants.id", ondelete="CASCADE"), nullable=False),
        sa.Column("categoria", sa.String(50), nullable=False, server_default="general"),
        sa.Column("codigo", sa.String(50), nullable=True),
        sa.Column("nombre", sa.String(200), nullable=False),
        sa.Column("descripcion", sa.String(500), nullable=True),
        sa.Column("unidad", sa.String(20), nullable=False, server_default="unidad"),
        sa.Column("stock_actual", sa.Numeric(12, 3), nullable=False, server_default="0"),
        sa.Column("stock_minimo", sa.Numeric(12, 3), nullable=False, server_default="0"),
        sa.Column("precio_unitario", sa.Numeric(12, 2), nullable=True),
        sa.Column("proveedor", sa.String(200), nullable=True),
        sa.Column("activo", sa.Boolean(), nullable=False, server_default="true"),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=True),
    )
    op.create_index("ix_inventario_items_tenant_id", "inventario_items", ["tenant_id"])

    # ── 2. inventario_movimientos ────────────────────────────────────────────
    op.create_table(
        "inventario_movimientos",
        sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column("tenant_id", sa.String(50), sa.ForeignKey("tenants.id", ondelete="CASCADE"), nullable=False),
        sa.Column("item_id", sa.Integer(), sa.ForeignKey("inventario_items.id", ondelete="CASCADE"), nullable=False),
        sa.Column("tipo", sa.String(20), nullable=False),
        sa.Column("cantidad", sa.Numeric(12, 3), nullable=False),
        sa.Column("stock_antes", sa.Numeric(12, 3), nullable=False, server_default="0"),
        sa.Column("stock_despues", sa.Numeric(12, 3), nullable=False, server_default="0"),
        sa.Column("motivo", sa.String(200), nullable=True),
        sa.Column("order_id", sa.Integer(), sa.ForeignKey("orders.id", ondelete="SET NULL"), nullable=True),
        sa.Column("usuario_id", sa.Integer(), sa.ForeignKey("users.id", ondelete="SET NULL"), nullable=True),
        sa.Column("notas", sa.String(500), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
    )
    op.create_index("ix_inventario_movimientos_tenant_id", "inventario_movimientos", ["tenant_id"])
    op.create_index("ix_inventario_movimientos_item_id", "inventario_movimientos", ["item_id"])

    # ── 3. reglas_materiales ─────────────────────────────────────────────────
    op.create_table(
        "reglas_materiales",
        sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column("tenant_id", sa.String(50), sa.ForeignKey("tenants.id", ondelete="CASCADE"), nullable=False),
        sa.Column("tipo_producto", sa.String(100), nullable=False),
        sa.Column("item_id", sa.Integer(), sa.ForeignKey("inventario_items.id", ondelete="SET NULL"), nullable=True),
        sa.Column("nombre_componente", sa.String(200), nullable=False),
        sa.Column("formula", sa.String(20), nullable=False, server_default="m2"),
        sa.Column("factor", sa.Numeric(8, 4), nullable=False, server_default="1.0"),
        sa.Column("cantidad_fija", sa.Numeric(8, 3), nullable=True),
        sa.Column("notas", sa.String(300), nullable=True),
    )
    op.create_index("ix_reglas_materiales_tenant_id", "reglas_materiales", ["tenant_id"])

    # ── 4. Add produccion_subestado + garantia + fecha_instalacion to orders ─
    op.add_column("orders", sa.Column(
        "produccion_subestado",
        sa.String(30),
        nullable=True,
        comment="en_corte | en_armado | listo",
    ))
    op.add_column("orders", sa.Column("garantia_meses", sa.Integer(), nullable=True))
    op.add_column("orders", sa.Column("fecha_instalacion", sa.DateTime(timezone=True), nullable=True))


def downgrade() -> None:
    op.drop_column("orders", "fecha_instalacion")
    op.drop_column("orders", "garantia_meses")
    op.drop_column("orders", "produccion_subestado")
    op.drop_index("ix_reglas_materiales_tenant_id", table_name="reglas_materiales")
    op.drop_table("reglas_materiales")
    op.drop_index("ix_inventario_movimientos_item_id", table_name="inventario_movimientos")
    op.drop_index("ix_inventario_movimientos_tenant_id", table_name="inventario_movimientos")
    op.drop_table("inventario_movimientos")
    op.drop_index("ix_inventario_items_tenant_id", table_name="inventario_items")
    op.drop_table("inventario_items")
