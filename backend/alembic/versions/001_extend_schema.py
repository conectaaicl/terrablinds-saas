"""extend schema: clients crm fields, producto proveedor/precio, post_ventas, empleado_documentos

Revision ID: 001_extend_schema
Revises:
Create Date: 2026-03-18
"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision = "001_extend_schema"
down_revision = None
branch_labels = None
depends_on = None


def upgrade() -> None:
    # ── 1. Extend clients table ──────────────────────────────────────────────
    op.add_column("clients", sa.Column("rut", sa.String(20), nullable=True))
    op.add_column("clients", sa.Column("tipo_cliente", sa.String(20), nullable=False, server_default="persona"))
    op.add_column("clients", sa.Column("empresa", sa.String(200), nullable=True))
    op.add_column("clients", sa.Column("email2", sa.String(200), nullable=True))
    op.add_column("clients", sa.Column("telefono2", sa.String(50), nullable=True))
    op.add_column("clients", sa.Column("ciudad", sa.String(100), nullable=True))
    op.add_column("clients", sa.Column("region", sa.String(100), nullable=True))
    op.add_column("clients", sa.Column("origen", sa.String(50), nullable=False, server_default="directo"))
    op.add_column("clients", sa.Column("tags", postgresql.JSONB(), nullable=False, server_default="[]"))
    op.add_column("clients", sa.Column("notas", sa.Text(), nullable=True))
    op.add_column("clients", sa.Column(
        "created_at", sa.DateTime(timezone=True), nullable=False,
        server_default=sa.func.now()
    ))
    op.add_column("clients", sa.Column(
        "updated_at", sa.DateTime(timezone=True), nullable=True
    ))
    # Make existing columns use proper length limits
    op.alter_column("clients", "nombre", type_=sa.String(200))
    op.alter_column("clients", "email", type_=sa.String(200))
    op.alter_column("clients", "telefono", type_=sa.String(50))
    op.alter_column("clients", "direccion", type_=sa.String(500))

    # ── 2. Extend productos table ────────────────────────────────────────────
    op.add_column("productos", sa.Column("codigo_proveedor", sa.String(100), nullable=True))
    op.add_column("productos", sa.Column("marca", sa.String(100), nullable=True))
    op.add_column("productos", sa.Column("proveedor", sa.String(200), nullable=True))
    op.add_column("productos", sa.Column("precio_m2", sa.Numeric(12, 2), nullable=True))
    op.add_column("productos", sa.Column("precio_ml", sa.Numeric(12, 2), nullable=True))
    op.add_column("productos", sa.Column("ancho_min", sa.Numeric(8, 2), nullable=True))
    op.add_column("productos", sa.Column("ancho_max", sa.Numeric(8, 2), nullable=True))
    op.add_column("productos", sa.Column("alto_min", sa.Numeric(8, 2), nullable=True))
    op.add_column("productos", sa.Column("alto_max", sa.Numeric(8, 2), nullable=True))

    # ── 3. Create post_ventas table ──────────────────────────────────────────
    op.create_table(
        "post_ventas",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("tenant_id", sa.String(), nullable=False, index=True),
        sa.Column("order_id", sa.Integer(), sa.ForeignKey("orders.id", ondelete="CASCADE"), nullable=False),
        sa.Column("client_id", sa.Integer(), sa.ForeignKey("clients.id", ondelete="CASCADE"), nullable=False),
        sa.Column("creado_por", sa.Integer(), sa.ForeignKey("users.id", ondelete="SET NULL"), nullable=True),
        sa.Column("tipo", sa.String(50), nullable=False, server_default="satisfaccion"),
        sa.Column("estado", sa.String(50), nullable=False, server_default="pendiente"),
        sa.Column("descripcion", sa.Text(), nullable=True),
        sa.Column("calificacion", sa.Integer(), nullable=True),
        sa.Column("ai_mensaje", sa.Text(), nullable=True),
        sa.Column("notas", postgresql.JSONB(), nullable=False, server_default="[]"),
        sa.Column("fecha_programada", sa.DateTime(timezone=True), nullable=True),
        sa.Column("fecha_resolucion", sa.DateTime(timezone=True), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=True),
    )
    op.create_index("ix_post_ventas_tenant_id", "post_ventas", ["tenant_id"])
    op.create_index("ix_post_ventas_order_id", "post_ventas", ["order_id"])
    op.create_index("ix_post_ventas_client_id", "post_ventas", ["client_id"])

    # ── 4. Create empleado_documentos table ──────────────────────────────────
    op.create_table(
        "empleado_documentos",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("tenant_id", sa.String(), nullable=False, index=True),
        sa.Column("user_id", sa.Integer(), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
        sa.Column("subido_por", sa.Integer(), sa.ForeignKey("users.id", ondelete="SET NULL"), nullable=True),
        sa.Column("tipo", sa.String(50), nullable=False, server_default="otro"),
        sa.Column("nombre_archivo", sa.String(500), nullable=False),
        sa.Column("ruta_archivo", sa.String(1000), nullable=False),
        sa.Column("mime_type", sa.String(100), nullable=False, server_default="application/octet-stream"),
        sa.Column("tamano_bytes", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    )
    op.create_index("ix_empleado_documentos_tenant_id", "empleado_documentos", ["tenant_id"])
    op.create_index("ix_empleado_documentos_user_id", "empleado_documentos", ["user_id"])

    # ── 5. Add tracking token to orders ──────────────────────────────────────
    op.add_column("orders", sa.Column("tracking_token", sa.String(64), nullable=True, unique=True))
    op.add_column("orders", sa.Column("tracking_activo", sa.Boolean(), nullable=False, server_default="false"))


def downgrade() -> None:
    # post_ventas
    op.drop_table("post_ventas")
    # empleado_documentos
    op.drop_table("empleado_documentos")
    # orders tracking
    op.drop_column("orders", "tracking_token")
    op.drop_column("orders", "tracking_activo")
    # clients
    for col in ["rut", "tipo_cliente", "empresa", "email2", "telefono2",
                "ciudad", "region", "origen", "tags", "notas", "created_at", "updated_at"]:
        op.drop_column("clients", col)
    # productos
    for col in ["codigo_proveedor", "marca", "proveedor", "precio_m2", "precio_ml",
                "ancho_min", "ancho_max", "alto_min", "alto_max"]:
        op.drop_column("productos", col)
