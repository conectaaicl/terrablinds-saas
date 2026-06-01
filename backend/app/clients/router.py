"""
CRM de Clientes — CRUD completo + búsqueda + webhooks n8n.
"""
import asyncio
from fastapi import APIRouter, Depends, HTTPException, Query, Request
from sqlalchemy import select, or_, func
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth.dependencies import require_roles, TokenData
from app.auth.router import limiter
from app.clients.schemas import ClientCreate, ClientUpdate, ClientResponse
from app.dependencies import get_db_for_tenant
from app.models.client import Client
from app.services import n8n_webhook

router = APIRouter(prefix="/clients", tags=["clients"])

ROLES_READ = ("jefe", "gerente", "coordinador", "vendedor", "superadmin")
ROLES_WRITE = ("jefe", "gerente", "coordinador", "vendedor")
ROLES_DELETE = ("jefe", "gerente")


@router.get("/", response_model=list[ClientResponse])
async def list_clients(
    q: str | None = Query(None, description="Buscar por nombre, email, teléfono, RUT, empresa"),
    origen: str | None = None,
    tipo_cliente: str | None = None,
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=200),
    token_data: TokenData = Depends(require_roles(*ROLES_READ)),
    db: AsyncSession = Depends(get_db_for_tenant),
):
    query = select(Client).where(Client.tenant_id == token_data.tenant_id)

    if q:
        search = f"%{q.lower()}%"
        query = query.where(
            or_(
                func.lower(Client.nombre).like(search),
                func.lower(Client.email).like(search),
                func.lower(Client.telefono).like(search),
                func.lower(Client.rut).like(search),
                func.lower(Client.empresa).like(search),
            )
        )
    if origen:
        query = query.where(Client.origen == origen)
    if tipo_cliente:
        query = query.where(Client.tipo_cliente == tipo_cliente)

    query = query.order_by(Client.created_at.desc()).offset(skip).limit(limit)
    result = await db.execute(query)
    return result.scalars().all()


@router.post("/", response_model=ClientResponse, status_code=201)
@limiter.limit("30/minute")
async def create_client(
    request: Request,
    data: ClientCreate,
    token_data: TokenData = Depends(require_roles(*ROLES_WRITE)),
    db: AsyncSession = Depends(get_db_for_tenant),
):
    client = Client(
        tenant_id=token_data.tenant_id,
        vendedor_id=token_data.user_id,
        **data.model_dump(),
    )
    db.add(client)
    await db.flush()
    await db.refresh(client)

    asyncio.create_task(n8n_webhook.trigger_nuevo_cliente(
        cliente={
            "id": client.id,
            "nombre": client.nombre,
            "telefono": client.telefono,
            "email": client.email,
            "origen": client.origen,
        },
        tenant_id=token_data.tenant_id,
    ))

    return client


@router.get("/{client_id}", response_model=ClientResponse)
async def get_client(
    client_id: int,
    token_data: TokenData = Depends(require_roles(*ROLES_READ)),
    db: AsyncSession = Depends(get_db_for_tenant),
):
    return await _get_or_404(db, client_id, token_data.tenant_id)


@router.patch("/{client_id}", response_model=ClientResponse)
async def update_client(
    client_id: int,
    data: ClientUpdate,
    token_data: TokenData = Depends(require_roles(*ROLES_WRITE)),
    db: AsyncSession = Depends(get_db_for_tenant),
):
    client = await _get_or_404(db, client_id, token_data.tenant_id)
    for field, value in data.model_dump(exclude_none=True).items():
        setattr(client, field, value)
    await db.flush()
    await db.refresh(client)
    return client


@router.delete("/{client_id}", status_code=204)
async def delete_client(
    client_id: int,
    token_data: TokenData = Depends(require_roles(*ROLES_DELETE)),
    db: AsyncSession = Depends(get_db_for_tenant),
):
    from app.models.order import Order
    client = await _get_or_404(db, client_id, token_data.tenant_id)

    # Verificar que no tenga ordenes activas
    ESTADOS_FINALES = ("cerrada", "cancelada", "rechazada")
    active_orders_result = await db.execute(
        select(Order).where(
            Order.cliente_id == client_id,
            Order.tenant_id == token_data.tenant_id,
            Order.estado.notin_(ESTADOS_FINALES),
        ).limit(1)
    )
    if active_orders_result.scalar_one_or_none():
        raise HTTPException(
            status_code=400,
            detail="No se puede eliminar un cliente con ordenes activas. Cierra o cancela sus ordenes primero.",
        )

    await db.delete(client)


async def _get_or_404(db: AsyncSession, client_id: int, tenant_id: str) -> Client:
    result = await db.execute(
        select(Client).where(Client.id == client_id, Client.tenant_id == tenant_id)
    )
    c = result.scalar_one_or_none()
    if not c:
        raise HTTPException(status_code=404, detail="Cliente no encontrado")
    return c
