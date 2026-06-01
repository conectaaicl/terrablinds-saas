from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import text
from typing import List, Optional
from pydantic import BaseModel
from app.dependencies import get_db_for_tenant as get_db
from app.auth.dependencies import require_roles, TokenData

router = APIRouter(prefix="/herramientas", tags=["herramientas"])

class ItemSolicitud(BaseModel):
    nombre: str
    cantidad: int = 1
    unidad: str = "unidad"

class SolicitudIn(BaseModel):
    items: List[ItemSolicitud]
    urgencia: str = "normal"
    notas: Optional[str] = None

class RespuestaIn(BaseModel):
    estado: str
    comentario: Optional[str] = None

@router.get("/solicitudes")
async def listar(token: TokenData = Depends(require_roles("jefe","gerente","coordinador","instalador","superadmin")), db: AsyncSession = Depends(get_db)):
    if token.role in ("jefe","gerente","coordinador","superadmin"):
        r = await db.execute(text("SELECT * FROM solicitudes_herramientas WHERE tenant_id=:t ORDER BY created_at DESC"), {"t": token.tenant_id})
    else:
        r = await db.execute(text("SELECT * FROM solicitudes_herramientas WHERE tenant_id=:t AND solicitante_id=:uid ORDER BY created_at DESC"), {"t": token.tenant_id, "uid": token.user_id})
    return [dict(row._mapping) for row in r]

@router.post("/solicitudes", status_code=201)
async def crear(body: SolicitudIn, token: TokenData = Depends(require_roles("instalador","fabricante","vendedor","coordinador","jefe","gerente","superadmin")), db: AsyncSession = Depends(get_db)):
    import json
    nombre_r = await db.execute(text("SELECT nombre FROM users WHERE id=:id"), {"id": token.user_id})
    nombre = nombre_r.scalar() or ''
    r = await db.execute(text("""
        INSERT INTO solicitudes_herramientas (tenant_id,solicitante_id,solicitante_nombre,items,urgencia,notas)
        VALUES (:t,:uid,:nombre,:items::jsonb,:urg,:notas) RETURNING *
    """), {"t": token.tenant_id, "uid": token.user_id, "nombre": nombre,
          "items": json.dumps([i.dict() for i in body.items]), "urg": body.urgencia, "notas": body.notas})
    await db.flush()
    return dict(r.mappings().first())

@router.patch("/solicitudes/{sid}")
async def responder(sid: int, body: RespuestaIn, token: TokenData = Depends(require_roles("jefe","gerente","coordinador","superadmin")), db: AsyncSession = Depends(get_db)):
    await db.execute(text("""
        UPDATE solicitudes_herramientas SET estado=:estado, comentario_respuesta=:com, respondido_por=:uid
        WHERE id=:id AND tenant_id=:t
    """), {"estado": body.estado, "com": body.comentario, "uid": token.user_id, "id": sid, "t": token.tenant_id})
    await db.flush()
    return {"ok": True}
