"""averias table: breakdown/fault reporting system

Revision ID: 003_averias
Revises: 002_inventario
Create Date: 2026-03-18
"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision = "003_averias"
down_revision = "002_inventario"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "averias",
        sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column("tenant_id", sa.String(), sa.ForeignKey("tenants.id", ondelete="CASCADE"), nullable=False),
        sa.Column("client_id", sa.Integer(), sa.ForeignKey("clients.id", ondelete="SET NULL"), nullable=True),
        sa.Column("order_id", sa.Integer(), sa.ForeignKey("orders.id", ondelete="SET NULL"), nullable=True),
        sa.Column("instalador_id", sa.Integer(), sa.ForeignKey("users.id", ondelete="SET NULL"), nullable=True),
        sa.Column("asignado_a", sa.Integer(), sa.ForeignKey("users.id", ondelete="SET NULL"), nullable=True),
        sa.Column("tipo_servicio", sa.String(100), nullable=False),
        sa.Column("titulo", sa.String(300), nullable=False),
        sa.Column("descripcion", sa.Text(), nullable=True),
        sa.Column("severidad", sa.String(20), nullable=False, server_default="media"),
        sa.Column("estado", sa.String(30), nullable=False, server_default="reportada"),
        sa.Column("fotos", postgresql.JSONB(), nullable=False, server_default="[]"),
        sa.Column("notas_tecnicas", sa.Text(), nullable=True),
        sa.Column("presupuesto_estimado", sa.Integer(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=True),
    )
    op.create_index("ix_averias_tenant_id", "averias", ["tenant_id"])
    op.create_index("ix_averias_client_id", "averias", ["client_id"])
    op.create_index("ix_averias_instalador_id", "averias", ["instalador_id"])


def downgrade() -> None:
    op.drop_index("ix_averias_instalador_id", table_name="averias")
    op.drop_index("ix_averias_client_id", table_name="averias")
    op.drop_index("ix_averias_tenant_id", table_name="averias")
    op.drop_table("averias")
