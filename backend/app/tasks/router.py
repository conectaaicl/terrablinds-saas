"""
Tareas Diarias — Asignación de trabajo por día.

  GET    /tasks/              — Listar tareas (filtrables por fecha, usuario, estado)
  POST   /tasks/              — Crear tarea (coordinador/jefe)
  GET    /tasks/mis-tareas    — Mis tareas de hoy
  PATCH  /tasks/{id}          — Actualizar tarea (estado, notas)
  DELETE /tasks/{id}          — Cancelar tarea
"""
from datetime import date, datetime, timezone
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import select, text
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth.dependencies import TokenData, require_roles
from app.dependencies import get_db_for_tenant
from app.models.task import DailyTask
from app.tasks.schemas import TaskCreate, TaskResponse, TaskUpdate

router = APIRouter(prefix="/tasks", tags=["tasks"])


@router.get("/", response_model=list[TaskResponse])
async def listar_tareas(
    fecha: date | None = Query(None),
    asignado_a: int | None = Query(None),
    estado: str | None = Query(None),
    token_data: TokenData = Depends(require_roles("jefe", "gerente", "coordinador", "superadmin")),
    db: AsyncSession = Depends(get_db_for_tenant),
):
    """Lista todas las tareas del tenant (para coordinadores y jefes)."""
    q = select(DailyTask).where(DailyTask.tenant_id == token_data.tenant_id)
    if fecha:
        q = q.where(DailyTask.fecha_tarea == fecha)
    if asignado_a:
        q = q.where(DailyTask.asignado_a == asignado_a)
    if estado:
        q = q.where(DailyTask.estado == estado)
    q = q.order_by(DailyTask.fecha_tarea.desc(), DailyTask.created_at.desc())

    result = await db.execute(q)
    tasks = result.scalars().all()
    return [await _enrich(db, t, token_data.tenant_id) for t in tasks]


@router.get("/mis-tareas", response_model=list[TaskResponse])
async def mis_tareas(
    fecha: date | None = Query(None),
    token_data: TokenData = Depends(require_roles(
        "instalador", "fabricante", "vendedor", "coordinador", "jefe", "gerente"
    )),
    db: AsyncSession = Depends(get_db_for_tenant),
):
    """Tareas asignadas al usuario actual para el día indicado (hoy por defecto)."""
    target_date = fecha or date.today()
    result = await db.execute(
        select(DailyTask).where(
            DailyTask.tenant_id == token_data.tenant_id,
            DailyTask.asignado_a == token_data.user_id,
            DailyTask.fecha_tarea == target_date,
        ).order_by(DailyTask.prioridad.desc(), DailyTask.created_at)
    )
    tasks = result.scalars().all()
    return [await _enrich(db, t, token_data.tenant_id) for t in tasks]


@router.post("/", response_model=TaskResponse, status_code=201)
async def crear_tarea(
    data: TaskCreate,
    token_data: TokenData = Depends(require_roles("jefe", "gerente", "coordinador", "superadmin")),
    db: AsyncSession = Depends(get_db_for_tenant),
):
    """Crea una tarea y la asigna a un trabajador."""
    task = DailyTask(
        tenant_id=token_data.tenant_id,
        asignado_por=token_data.user_id,
        **data.model_dump(),
    )
    db.add(task)
    await db.commit()
    await db.refresh(task)
    return await _enrich(db, task, token_data.tenant_id)


@router.patch("/{task_id}", response_model=TaskResponse)
async def actualizar_tarea(
    task_id: UUID,
    data: TaskUpdate,
    token_data: TokenData = Depends(require_roles(
        "jefe", "gerente", "coordinador", "instalador", "fabricante", "vendedor"
    )),
    db: AsyncSession = Depends(get_db_for_tenant),
):
    task = await _get_or_404(db, task_id, token_data.tenant_id)

    is_admin = token_data.role in ("jefe", "gerente", "coordinador", "superadmin")
    is_owner = task.asignado_a == token_data.user_id

    if not is_admin and not is_owner:
        raise HTTPException(status_code=403, detail="Solo puedes editar tus propias tareas")

    updates = data.model_dump(exclude_none=True)
    if not is_admin:
        updates = {k: v for k, v in updates.items() if k in {"estado", "notas_cierre"}}

    for field, value in updates.items():
        setattr(task, field, value)

    if data.estado == "completada" and not task.completado_at:
        task.completado_at = datetime.now(timezone.utc)

    await db.commit()
    await db.refresh(task)
    return await _enrich(db, task, token_data.tenant_id)


@router.delete("/{task_id}", status_code=204)
async def cancelar_tarea(
    task_id: UUID,
    token_data: TokenData = Depends(require_roles("jefe", "gerente", "coordinador", "superadmin")),
    db: AsyncSession = Depends(get_db_for_tenant),
):
    task = await _get_or_404(db, task_id, token_data.tenant_id)
    task.estado = "cancelada"
    await db.commit()


# ─── helpers ──────────────────────────────────────────────────

async def _get_or_404(db: AsyncSession, tid: UUID, tenant_id: str) -> DailyTask:
    result = await db.execute(
        select(DailyTask).where(DailyTask.id == tid, DailyTask.tenant_id == tenant_id)
    )
    t = result.scalar_one_or_none()
    if not t:
        raise HTTPException(status_code=404, detail="Tarea no encontrada")
    return t


async def _enrich(db: AsyncSession, t: DailyTask, tenant_id: str) -> TaskResponse:
    """Agrega nombres de usuarios a la tarea."""
    try:
        result = await db.execute(
            text("SELECT id, nombre FROM users WHERE id IN (:a, :b) AND (tenant_id = :tid OR tenant_id IS NULL)"),
            {"a": t.asignado_a, "b": t.asignado_por, "tid": tenant_id},
        )
        users = {r.id: r.nombre for r in result.fetchall()}
    except Exception:
        users = {}

    return TaskResponse(
        id=t.id,
        tenant_id=t.tenant_id,
        titulo=t.titulo,
        descripcion=t.descripcion,
        asignado_a=t.asignado_a,
        asignado_a_nombre=users.get(t.asignado_a),
        asignado_por=t.asignado_por,
        asignado_por_nombre=users.get(t.asignado_por),
        order_id=t.order_id,
        fecha_tarea=t.fecha_tarea.isoformat(),
        prioridad=t.prioridad,
        estado=t.estado,
        notas_cierre=t.notas_cierre,
        completado_at=t.completado_at.isoformat() if t.completado_at else None,
        created_at=t.created_at.isoformat(),
    )
