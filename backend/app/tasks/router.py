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

from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, Query
from sqlalchemy import func, select, text
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth.dependencies import TokenData, require_roles
from app.dependencies import get_db_for_tenant
from app.models.task import DailyTask
from app.models.client import Client
from app.models.comision import Comision, ReglaComision
from app.tasks.schemas import TaskCreate, TaskResponse, TaskUpdate
from app.services.whatsapp import send_text

router = APIRouter(prefix="/tasks", tags=["tasks"])


@router.get("/", response_model=list[TaskResponse])
async def listar_tareas(
    fecha: date | None = Query(None),
    asignado_a: int | None = Query(None),
    estado: str | None = Query(None),
    client_id: int | None = Query(None),
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
    if client_id:
        q = q.where(DailyTask.cliente_id == client_id)
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


@router.get("/historial", response_model=list[TaskResponse])
async def mis_tareas_historial(
    token_data: TokenData = Depends(require_roles(
        "instalador", "fabricante", "vendedor", "coordinador", "jefe", "gerente"
    )),
    db: AsyncSession = Depends(get_db_for_tenant),
):
    """Historial: tareas completadas del usuario (todas las fechas, máx 200)."""
    result = await db.execute(
        select(DailyTask).where(
            DailyTask.tenant_id == token_data.tenant_id,
            DailyTask.asignado_a == token_data.user_id,
            DailyTask.estado == "completada",
        ).order_by(DailyTask.fecha_tarea.desc(), DailyTask.created_at.desc()).limit(200)
    )
    tasks = result.scalars().all()
    return [await _enrich(db, t, token_data.tenant_id) for t in tasks]


@router.post("/", response_model=TaskResponse, status_code=201)
async def crear_tarea(
    data: TaskCreate,
    background: BackgroundTasks,
    token_data: TokenData = Depends(require_roles("jefe", "gerente", "coordinador", "superadmin")),
    db: AsyncSession = Depends(get_db_for_tenant),
):
    """Crea una tarea y la asigna a un trabajador. Notifica por WhatsApp al instalador."""
    task = DailyTask(
        tenant_id=token_data.tenant_id,
        asignado_por=token_data.user_id,
        **data.model_dump(),
    )
    if task.cliente_nombre or task.cliente_telefono:
        task.cliente_id = await _find_or_create_cliente(
            db, token_data.tenant_id,
            task.cliente_nombre, task.cliente_telefono,
            task.cliente_email, task.direccion, task.empresa_cliente,
        )
    db.add(task)
    await db.commit()
    await db.refresh(task)
    await _notify_wa(db, task, token_data.tenant_id, background)
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

    if task.estado == "completada" and task.items_comision and not task.comision_generada:
        await _generar_comisiones_tarea(db, task, token_data.tenant_id)

    await db.commit()
    await db.refresh(task)
    return await _enrich(db, task, token_data.tenant_id)


async def _generar_comisiones_tarea(db: AsyncSession, task: DailyTask, tenant_id: str) -> None:
    """Al completar una tarea con items_comision (una o mas categorias con su
    cantidad, igual que en Comisiones), genera una comision por cada item --
    una sola vez por tarea."""
    row = (await db.execute(
        text("SELECT rol FROM users WHERE id = :id AND tenant_id = :tid"),
        {"id": task.asignado_a, "tid": tenant_id},
    )).fetchone()
    if not row:
        return
    rol = row.rol

    categorias = {it["categoria"] for it in task.items_comision if it.get("categoria")}
    reglas_result = await db.execute(
        select(ReglaComision).where(
            ReglaComision.tenant_id == tenant_id,
            ReglaComision.rol == rol,
            ReglaComision.categoria.in_(categorias),
        )
    )
    reglas = {r.categoria: r for r in reglas_result.scalars().all()}

    for it in task.items_comision:
        categoria = it.get("categoria")
        cantidad = it.get("cantidad") or 1
        if not categoria:
            continue
        regla = reglas.get(categoria)
        monto = regla.monto_por_unidad if regla else 0
        es_meta = bool(regla and regla.meta_mensual is not None)
        total = 0 if es_meta else cantidad * monto

        db.add(Comision(
            tenant_id=tenant_id,
            user_id=task.asignado_a,
            rol=rol,
            categoria=categoria,
            cantidad=cantidad,
            monto_por_unidad=monto,
            total=total,
            estado="pendiente",
            periodo=task.fecha_tarea.strftime("%Y-%m"),
            fecha_trabajo=task.fecha_tarea,
            tipo_registro="tarea",
            notas=f"Generado automaticamente al completar la tarea: {task.titulo}",
        ))
    task.comision_generada = True


@router.delete("/{task_id}", status_code=204)
async def cancelar_tarea(
    task_id: UUID,
    token_data: TokenData = Depends(require_roles("jefe", "gerente", "coordinador", "superadmin")),
    db: AsyncSession = Depends(get_db_for_tenant),
):
    task = await _get_or_404(db, task_id, token_data.tenant_id)
    task.estado = "cancelada"
    await db.commit()


# ─── notificación WhatsApp ────────────────────────────────────

def _build_task_msg(t) -> str:
    lines = ["\U0001F527 *Nueva tarea asignada*"]
    if t.titulo:
        lines.append(f"\n\U0001F4CB {t.titulo}")
    if getattr(t, "cliente_nombre", None):
        lines.append(f"\U0001F464 Cliente: {t.cliente_nombre}")
    if getattr(t, "direccion", None):
        lines.append(f"\U0001F4CD {t.direccion}")
    try:
        fecha = t.fecha_tarea.strftime("%d-%m-%Y") if t.fecha_tarea else ""
    except Exception:
        fecha = ""
    hora = (getattr(t, "hora", None) or "").strip()
    cuando = (fecha + (f" · {hora}" if hora else "")).strip()
    if cuando:
        lines.append(f"\U0001F4C5 {cuando}")
    if getattr(t, "descripcion", None):
        lines.append(f"\U0001F4DD {t.descripcion}")
    lines.append("\nVer en working.conectaai.cl")
    return "\n".join(lines)


async def _notify_wa(db: AsyncSession, t: DailyTask, tenant_id: str, background: BackgroundTasks) -> None:
    """Envía WhatsApp al instalador asignado. Best-effort: nunca rompe la request."""
    if not getattr(t, "asignado_a", None):
        return
    try:
        row = (await db.execute(
            text("SELECT nombre, telefono FROM users WHERE id = :id"),
            {"id": t.asignado_a},
        )).fetchone()
    except Exception:
        return
    phone = getattr(row, "telefono", None) if row else None
    if not phone:
        return
    background.add_task(send_text, tenant_id, phone, _build_task_msg(t))


# ─── helpers ──────────────────────────────────────────────────

async def _find_or_create_cliente(
    db: AsyncSession,
    tenant_id: str,
    nombre: str | None,
    telefono: str | None,
    email: str | None,
    direccion: str | None,
    empresa: str | None,
) -> int | None:
    """Busca en el CRM un cliente por telefono (o por nombre si no hay telefono)
    y si no existe lo crea, para que toda tarea con datos de cliente quede
    tambien registrada en Clientes. Nunca pisa datos ya cargados en el CRM,
    solo completa los campos que estan vacios."""
    if not nombre and not telefono:
        return None

    cliente = None
    if telefono:
        result = await db.execute(
            select(Client).where(Client.tenant_id == tenant_id, Client.telefono == telefono)
        )
        cliente = result.scalar_one_or_none()
    if not cliente and nombre:
        result = await db.execute(
            select(Client).where(
                Client.tenant_id == tenant_id, func.lower(Client.nombre) == nombre.lower()
            )
        )
        cliente = result.scalar_one_or_none()

    if cliente:
        if not cliente.telefono and telefono:
            cliente.telefono = telefono
        if not cliente.email and email:
            cliente.email = email
        if not cliente.direccion and direccion:
            cliente.direccion = direccion
        if not cliente.empresa and empresa:
            cliente.empresa = empresa
        return cliente.id

    cliente = Client(
        tenant_id=tenant_id,
        nombre=nombre or "Cliente sin nombre",
        telefono=telefono,
        email=email,
        direccion=direccion,
        empresa=empresa,
        tipo_cliente="empresa" if empresa else "persona",
        origen="tarea",
    )
    db.add(cliente)
    await db.flush()
    return cliente.id


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
        hora=t.hora,
        tipo_tarea=t.tipo_tarea,
        cliente_nombre=t.cliente_nombre,
        cliente_telefono=t.cliente_telefono,
        direccion=t.direccion,
        ot_numero=t.ot_numero,
        vendedor_nombre=t.vendedor_nombre,
        items=t.items,
        observaciones=t.observaciones,
        empresa_cliente=t.empresa_cliente,
        cliente_email=t.cliente_email,
        restriccion_horaria=t.restriccion_horaria,
        nota_especial=t.nota_especial,
        tracking_token=t.tracking_token if hasattr(t, 'tracking_token') else None,
        tracking_activo=t.tracking_activo if hasattr(t, 'tracking_activo') else False,
        items_comision=t.items_comision,
        comision_generada=t.comision_generada,
        cliente_id=t.cliente_id if hasattr(t, 'cliente_id') else None,
    )
