from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, insert, text
from typing import List, Optional
from pydantic import BaseModel
from app.dependencies import get_db_for_tenant as get_db
from app.auth.dependencies import require_roles, TokenData

router = APIRouter(prefix="/proveedores", tags=["proveedores"])
ROLES_VER    = ("jefe", "gerente", "coordinador", "fabricante", "superadmin")
ROLES_EDITAR = ("jefe", "gerente", "coordinador", "superadmin")

# ── Schemas ──
class ProveedorIn(BaseModel):
    nombre: str
    rut: Optional[str] = None
    direccion: Optional[str] = None
    telefono: Optional[str] = None
    email: Optional[str] = None
    categoria: str = "otro"
    contacto_nombre: Optional[str] = None
    contacto_telefono: Optional[str] = None
    banco: Optional[str] = None
    tipo_cuenta: Optional[str] = None
    numero_cuenta: Optional[str] = None
    notas: Optional[str] = None

class MaterialIn(BaseModel):
    nombre: str
    sku: Optional[str] = None
    unidad: str = "unidad"
    precio_compra: int = 0
    precio_venta: int = 0
    stock_actual: int = 0
    stock_minimo: int = 0
    categoria: Optional[str] = None
    descripcion: Optional[str] = None
    proveedor_id: Optional[int] = None

class OCItemIn(BaseModel):
    material_id: Optional[int] = None
    descripcion: str
    cantidad: int = 1
    precio_unitario: int = 0

class OCIn(BaseModel):
    proveedor_id: int
    notas: Optional[str] = None
    items: List[OCItemIn] = []

class OCRecepcionItem(BaseModel):
    item_id: int
    cantidad_recibida: int

# ── Proveedores ──
@router.get("/")
async def listar_proveedores(
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=200),
    token: TokenData = Depends(require_roles(*ROLES_VER)),
    db: AsyncSession = Depends(get_db),
):
    r = await db.execute(
        text("SELECT * FROM proveedores WHERE tenant_id=:t AND activo=true ORDER BY nombre LIMIT :lim OFFSET :sk"),
        {"t": token.tenant_id, "lim": limit, "sk": skip},
    )
    return [dict(row._mapping) for row in r]

@router.post("/", status_code=201)
async def crear_proveedor(body: ProveedorIn, token: TokenData = Depends(require_roles(*ROLES_EDITAR)), db: AsyncSession = Depends(get_db)):
    r = await db.execute(text("""INSERT INTO proveedores (tenant_id,nombre,rut,direccion,telefono,email,categoria,contacto_nombre,contacto_telefono,banco,tipo_cuenta,numero_cuenta,notas)
        VALUES (:t,:nombre,:rut,:dir,:tel,:email,:cat,:cn,:ct,:banco,:tc,:nc,:notas) RETURNING *"""),
        {"t": token.tenant_id, "nombre": body.nombre, "rut": body.rut, "dir": body.direccion, "tel": body.telefono,
         "email": body.email, "cat": body.categoria, "cn": body.contacto_nombre, "ct": body.contacto_telefono,
         "banco": body.banco, "tc": body.tipo_cuenta, "nc": body.numero_cuenta, "notas": body.notas})
    await db.flush()
    return dict(r.mappings().first())

@router.put("/{pid}")
async def actualizar_proveedor(pid: int, body: ProveedorIn, token: TokenData = Depends(require_roles(*ROLES_EDITAR)), db: AsyncSession = Depends(get_db)):
    await db.execute(text("""UPDATE proveedores SET nombre=:nombre,rut=:rut,direccion=:dir,telefono=:tel,email=:email,categoria=:cat,
        contacto_nombre=:cn,contacto_telefono=:ct,banco=:banco,tipo_cuenta=:tc,numero_cuenta=:nc,notas=:notas
        WHERE id=:id AND tenant_id=:t"""),
        {"id": pid, "t": token.tenant_id, "nombre": body.nombre, "rut": body.rut, "dir": body.direccion, "tel": body.telefono,
         "email": body.email, "cat": body.categoria, "cn": body.contacto_nombre, "ct": body.contacto_telefono,
         "banco": body.banco, "tc": body.tipo_cuenta, "nc": body.numero_cuenta, "notas": body.notas})
    await db.flush()
    return {"ok": True}

@router.delete("/{pid}")
async def eliminar_proveedor(pid: int, token: TokenData = Depends(require_roles(*ROLES_EDITAR)), db: AsyncSession = Depends(get_db)):
    await db.execute(text("UPDATE proveedores SET activo=false WHERE id=:id AND tenant_id=:t"), {"id": pid, "t": token.tenant_id})
    await db.flush()
    return {"ok": True}

# ── Materiales ──
@router.get("/materiales")
async def listar_materiales(token: TokenData = Depends(require_roles(*ROLES_VER)), db: AsyncSession = Depends(get_db)):
    r = await db.execute(text("""SELECT m.*, p.nombre as proveedor_nombre FROM materiales m
        LEFT JOIN proveedores p ON p.id=m.proveedor_id WHERE m.tenant_id=:t AND m.activo=true ORDER BY m.nombre"""), {"t": token.tenant_id})
    return [dict(row._mapping) for row in r]

@router.post("/materiales", status_code=201)
async def crear_material(body: MaterialIn, token: TokenData = Depends(require_roles(*ROLES_EDITAR)), db: AsyncSession = Depends(get_db)):
    r = await db.execute(text("""INSERT INTO materiales (tenant_id,proveedor_id,nombre,sku,unidad,precio_compra,precio_venta,stock_actual,stock_minimo,categoria,descripcion)
        VALUES (:t,:prov,:nombre,:sku,:unidad,:pc,:pv,:sa,:sm,:cat,:desc) RETURNING *"""),
        {"t": token.tenant_id, "prov": body.proveedor_id, "nombre": body.nombre, "sku": body.sku,
         "unidad": body.unidad, "pc": body.precio_compra, "pv": body.precio_venta,
         "sa": body.stock_actual, "sm": body.stock_minimo, "cat": body.categoria, "desc": body.descripcion})
    await db.flush()
    return dict(r.mappings().first())

@router.put("/materiales/{mid}")
async def actualizar_material(mid: int, body: MaterialIn, token: TokenData = Depends(require_roles(*ROLES_EDITAR)), db: AsyncSession = Depends(get_db)):
    await db.execute(text("""UPDATE materiales SET proveedor_id=:prov,nombre=:nombre,sku=:sku,unidad=:unidad,precio_compra=:pc,
        precio_venta=:pv,stock_actual=:sa,stock_minimo=:sm,categoria=:cat,descripcion=:desc WHERE id=:id AND tenant_id=:t"""),
        {"id": mid, "t": token.tenant_id, "prov": body.proveedor_id, "nombre": body.nombre, "sku": body.sku,
         "unidad": body.unidad, "pc": body.precio_compra, "pv": body.precio_venta,
         "sa": body.stock_actual, "sm": body.stock_minimo, "cat": body.categoria, "desc": body.descripcion})
    await db.flush()
    return {"ok": True}

@router.delete("/materiales/{mid}")
async def eliminar_material(mid: int, token: TokenData = Depends(require_roles(*ROLES_EDITAR)), db: AsyncSession = Depends(get_db)):
    await db.execute(text("UPDATE materiales SET activo=false WHERE id=:id AND tenant_id=:t"), {"id": mid, "t": token.tenant_id})
    await db.flush()
    return {"ok": True}

# ── Órdenes de Compra ──
@router.get("/ordenes-compra")
async def listar_oc(token: TokenData = Depends(require_roles(*ROLES_EDITAR)), db: AsyncSession = Depends(get_db)):
    r = await db.execute(text("""SELECT oc.*, p.nombre as proveedor_nombre FROM ordenes_compra oc
        LEFT JOIN proveedores p ON p.id=oc.proveedor_id WHERE oc.tenant_id=:t ORDER BY oc.id DESC"""), {"t": token.tenant_id})
    return [dict(row._mapping) for row in r]

@router.get("/ordenes-compra/{oc_id}")
async def detalle_oc(oc_id: int, token: TokenData = Depends(require_roles(*ROLES_EDITAR)), db: AsyncSession = Depends(get_db)):
    r = await db.execute(text("""SELECT oc.*, p.nombre as proveedor_nombre FROM ordenes_compra oc
        LEFT JOIN proveedores p ON p.id=oc.proveedor_id WHERE oc.id=:id AND oc.tenant_id=:t"""), {"id": oc_id, "t": token.tenant_id})
    oc = r.mappings().first()
    if not oc: raise HTTPException(404, "No encontrada")
    items_r = await db.execute(text("SELECT i.*, m.nombre as material_nombre FROM orden_compra_items i LEFT JOIN materiales m ON m.id=i.material_id WHERE i.orden_compra_id=:id"), {"id": oc_id})
    return {**dict(oc), "items": [dict(i._mapping) for i in items_r]}

@router.post("/ordenes-compra", status_code=201)
async def crear_oc(body: OCIn, token: TokenData = Depends(require_roles(*ROLES_EDITAR)), db: AsyncSession = Depends(get_db)):
    num_r = await db.execute(text("SELECT COALESCE(MAX(numero),0)+1 FROM ordenes_compra WHERE tenant_id=:t"), {"t": token.tenant_id})
    numero = num_r.scalar()
    r = await db.execute(text("""INSERT INTO ordenes_compra (tenant_id,numero,proveedor_id,estado,notas,creado_por)
        VALUES (:t,:num,:prov,'borrador',:notas,:user) RETURNING id"""),
        {"t": token.tenant_id, "num": numero, "prov": body.proveedor_id, "notas": body.notas, "user": token.user_id})
    oc_id = r.scalar()
    for item in body.items:
        await db.execute(text("""INSERT INTO orden_compra_items (orden_compra_id,material_id,descripcion,cantidad,precio_unitario)
            VALUES (:oc,:mat,:desc,:cant,:precio)"""),
            {"oc": oc_id, "mat": item.material_id, "desc": item.descripcion, "cant": item.cantidad, "precio": item.precio_unitario})
    await db.flush()
    return {"id": oc_id, "numero": numero}

@router.patch("/ordenes-compra/{oc_id}/estado")
async def cambiar_estado_oc(oc_id: int, body: dict, token: TokenData = Depends(require_roles(*ROLES_EDITAR)), db: AsyncSession = Depends(get_db)):
    await db.execute(text("UPDATE ordenes_compra SET estado=:estado, updated_at=now() WHERE id=:id AND tenant_id=:t"),
        {"estado": body.get("estado"), "id": oc_id, "t": token.tenant_id})
    await db.flush()
    return {"ok": True}

@router.post("/ordenes-compra/{oc_id}/recepcion")
async def recepcionar_oc(oc_id: int, body: List[OCRecepcionItem], token: TokenData = Depends(require_roles(*ROLES_EDITAR)), db: AsyncSession = Depends(get_db)):
    for item in body:
        await db.execute(text("UPDATE orden_compra_items SET cantidad_recibida=cantidad_recibida+:cant WHERE id=:id AND orden_compra_id=:oc"),
            {"cant": item.cantidad_recibida, "id": item.item_id, "oc": oc_id})
        r = await db.execute(text("SELECT i.material_id, i.cantidad_recibida FROM orden_compra_items i WHERE i.id=:id"), {"id": item.item_id})
        row = r.mappings().first()
        if row and row["material_id"]:
            await db.execute(text("UPDATE materiales SET stock_actual=stock_actual+:cant WHERE id=:mid"),
                {"cant": item.cantidad_recibida, "mid": row["material_id"]})
    await db.flush()
    return {"ok": True}
