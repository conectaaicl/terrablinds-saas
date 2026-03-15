"""
Catálogo de Productos por Tenant.

  GET    /productos/          — Listar productos activos
  POST   /productos/          — Crear producto
  GET    /productos/{id}      — Detalle de producto
  PATCH  /productos/{id}      — Actualizar producto
  DELETE /productos/{id}      — Desactivar producto (soft delete)
"""
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth.dependencies import TokenData, require_roles
from app.dependencies import get_db_for_tenant
from app.models.producto import Producto
from app.productos.schemas import ProductoCreate, ProductoResponse, ProductoUpdate

router = APIRouter(prefix="/productos", tags=["productos"])


@router.get("/", response_model=list[ProductoResponse])
async def listar_productos(
    categoria: str | None = None,
    solo_activos: bool = True,
    token_data: TokenData = Depends(require_roles(
        "jefe", "gerente", "coordinador", "vendedor", "fabricante", "instalador", "superadmin"
    )),
    db: AsyncSession = Depends(get_db_for_tenant),
):
    """Lista el catálogo de productos del tenant."""
    q = select(Producto).where(Producto.tenant_id == token_data.tenant_id)
    if solo_activos:
        q = q.where(Producto.activo.is_(True))
    if categoria:
        q = q.where(Producto.categoria == categoria)
    q = q.order_by(Producto.categoria, Producto.nombre)

    result = await db.execute(q)
    productos = result.scalars().all()
    return [_to_response(p) for p in productos]


@router.post("/", response_model=ProductoResponse, status_code=201)
async def crear_producto(
    data: ProductoCreate,
    token_data: TokenData = Depends(require_roles("jefe", "gerente", "coordinador", "superadmin")),
    db: AsyncSession = Depends(get_db_for_tenant),
):
    """Crea un producto en el catálogo del tenant."""
    p = Producto(
        tenant_id=token_data.tenant_id,
        created_by=token_data.user_id,
        **data.model_dump(),
    )
    db.add(p)
    await db.commit()
    await db.refresh(p)
    return _to_response(p)


@router.get("/{producto_id}", response_model=ProductoResponse)
async def obtener_producto(
    producto_id: UUID,
    token_data: TokenData = Depends(require_roles(
        "jefe", "gerente", "coordinador", "vendedor", "fabricante", "instalador", "superadmin"
    )),
    db: AsyncSession = Depends(get_db_for_tenant),
):
    p = await _get_or_404(db, producto_id, token_data.tenant_id)
    return _to_response(p)


@router.patch("/{producto_id}", response_model=ProductoResponse)
async def actualizar_producto(
    producto_id: UUID,
    data: ProductoUpdate,
    token_data: TokenData = Depends(require_roles("jefe", "gerente", "coordinador", "superadmin")),
    db: AsyncSession = Depends(get_db_for_tenant),
):
    p = await _get_or_404(db, producto_id, token_data.tenant_id)
    for field, value in data.model_dump(exclude_none=True).items():
        setattr(p, field, value)
    await db.commit()
    await db.refresh(p)
    return _to_response(p)


@router.delete("/{producto_id}", status_code=204)
async def desactivar_producto(
    producto_id: UUID,
    token_data: TokenData = Depends(require_roles("jefe", "gerente", "superadmin")),
    db: AsyncSession = Depends(get_db_for_tenant),
):
    """Soft delete — marca activo = FALSE."""
    p = await _get_or_404(db, producto_id, token_data.tenant_id)
    p.activo = False
    await db.commit()


# ─── helpers ──────────────────────────────────────────────────

async def _get_or_404(db: AsyncSession, pid: UUID, tenant_id: str) -> Producto:
    result = await db.execute(
        select(Producto).where(Producto.id == pid, Producto.tenant_id == tenant_id)
    )
    p = result.scalar_one_or_none()
    if not p:
        raise HTTPException(status_code=404, detail="Producto no encontrado")
    return p


def _to_response(p: Producto) -> ProductoResponse:
    return ProductoResponse(
        id=p.id,
        tenant_id=p.tenant_id,
        codigo=p.codigo,
        nombre=p.nombre,
        descripcion=p.descripcion,
        categoria=p.categoria,
        unidad=p.unidad,
        precio_base=float(p.precio_base),
        colores=p.colores or [],
        materiales=p.materiales or [],
        specs=p.specs or {},
        activo=p.activo,
        created_at=p.created_at.isoformat() if p.created_at else "",
    )
