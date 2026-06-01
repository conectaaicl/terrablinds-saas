"""
Módulo de pagos — Flow + Resend
Endpoints:
  POST /pagos/iniciar        → crea orden de pago en Flow y retorna URL
  POST /pagos/webhook        → Flow notifica pago exitoso → crea tenant + usuario + envía email
  GET  /pagos/retorno        → redirige al usuario después del pago
  GET  /pagos/config         → superadmin lee config actual
  PUT  /pagos/config         → superadmin actualiza API keys
"""
import hashlib
import hmac
import secrets
import string
from datetime import datetime, timezone

import httpx
from fastapi import APIRouter, Depends, HTTPException, Request
from fastapi.responses import HTMLResponse, RedirectResponse
from pydantic import BaseModel
from sqlalchemy import select, text
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth.dependencies import TokenData, require_roles
from app.auth.service import hash_password
from app.config import get_settings
from app.database import async_session
from app.dependencies import get_db_for_tenant
from app.models.tenant import Tenant
from app.models.user import RoleEnum, User

router = APIRouter(prefix="/pagos", tags=["pagos"])

FLOW_BASE = {
    "sandbox": "https://sandbox.flow.cl/api",
    "production": "https://www.flow.cl/api",
}

PLANES = {
    "starter": {"nombre": "Starter", "precio": 89700, "max_usuarios": 3},   # ~UF 3
    "pro":     {"nombre": "Pro",     "precio": 239200, "max_usuarios": 15},  # ~UF 8
}


# ── Schemas ───────────────────────────────────────────────────────────────────

class IniciarPagoRequest(BaseModel):
    plan: str
    taller_nombre: str
    taller_email: str
    taller_telefono: str | None = None


class PagosConfig(BaseModel):
    flow_api_key: str = ""
    flow_secret_key: str = ""
    flow_env: str = "sandbox"
    resend_api_key: str = ""
    resend_from_email: str = ""
    resend_from_name: str = ""


# ── Helpers Flow ──────────────────────────────────────────────────────────────

def _flow_sign(params: dict, secret: str) -> str:
    keys = sorted(params.keys())
    msg = "".join(f"{k}{params[k]}" for k in keys)
    return hmac.new(secret.encode(), msg.encode(), hashlib.sha256).hexdigest()


async def _flow_post(endpoint: str, params: dict) -> dict:
    settings = get_settings()
    base = FLOW_BASE.get(settings.FLOW_ENV, FLOW_BASE["sandbox"])
    params["apiKey"] = settings.FLOW_API_KEY
    params["s"] = _flow_sign(params, settings.FLOW_SECRET_KEY)
    async with httpx.AsyncClient(timeout=15) as client:
        r = await client.post(f"{base}/{endpoint}", data=params)
        r.raise_for_status()
        return r.json()


# ── Helpers Resend ────────────────────────────────────────────────────────────

async def _send_welcome_email(
    to_email: str,
    taller_nombre: str,
    plan_nombre: str,
    password: str,
) -> None:
    settings = get_settings()
    if not settings.RESEND_API_KEY:
        return  # silencioso si no hay key configurada

    body = f"""
    <div style="font-family:Inter,sans-serif;max-width:560px;margin:0 auto;padding:32px 24px;background:#020817;color:#e2e8f0">
      <div style="display:flex;align-items:center;gap:10px;margin-bottom:28px">
        <div style="width:36px;height:36px;background:linear-gradient(135deg,#fb7185,#e11d48);border-radius:10px;display:flex;align-items:center;justify-content:center;color:white;font-weight:800;font-size:14px">W</div>
        <span style="font-weight:800;font-size:16px">ConectaWork</span>
      </div>
      <h1 style="font-size:24px;font-weight:800;margin-bottom:8px;color:#e2e8f0">¡Bienvenido, {taller_nombre}!</h1>
      <p style="color:#94a3b8;margin-bottom:24px">Tu cuenta ConectaWork está lista. Plan <strong style="color:#fb7185">{plan_nombre}</strong> activado.</p>
      <div style="background:#0f172a;border:1px solid #1e293b;border-radius:12px;padding:20px;margin-bottom:24px">
        <p style="font-size:12px;font-weight:600;color:#64748b;text-transform:uppercase;margin-bottom:12px">Tus credenciales de acceso</p>
        <p style="margin-bottom:6px"><span style="color:#64748b;font-size:13px">Email: </span><strong style="color:#e2e8f0">{to_email}</strong></p>
        <p><span style="color:#64748b;font-size:13px">Contraseña temporal: </span><strong style="color:#fb7185;font-family:monospace">{password}</strong></p>
      </div>
      <a href="https://working.conectaai.cl" style="display:inline-block;background:#e11d48;color:white;padding:12px 24px;border-radius:10px;text-decoration:none;font-weight:700;font-size:14px">Acceder al sistema →</a>
      <p style="color:#475569;font-size:12px;margin-top:24px">Por seguridad, cambia tu contraseña al ingresar por primera vez.</p>
    </div>
    """

    async with httpx.AsyncClient(timeout=15) as client:
        await client.post(
            "https://api.resend.com/emails",
            headers={"Authorization": f"Bearer {settings.RESEND_API_KEY}"},
            json={
                "from": f"{settings.RESEND_FROM_NAME} <{settings.RESEND_FROM_EMAIL}>",
                "to": [to_email],
                "subject": f"¡Bienvenido a ConectaWork! Tus credenciales de acceso — Plan {plan_nombre}",
                "html": body,
            },
        )


# ── Endpoints ─────────────────────────────────────────────────────────────────

@router.post("/iniciar")
async def iniciar_pago(body: IniciarPagoRequest):
    settings = get_settings()
    if not settings.FLOW_API_KEY:
        raise HTTPException(503, "Pagos no configurados aún. Contacta a soporte.")

    plan = PLANES.get(body.plan)
    if not plan:
        raise HTTPException(400, f"Plan inválido. Opciones: {list(PLANES.keys())}")

    commerce_order = f"WSO-{body.plan.upper()}-{int(datetime.now().timestamp())}"

    try:
        result = await _flow_post("payment/create", {
            "commerceOrder": commerce_order,
            "subject": f"ConectaWork — Plan {plan['nombre']}",
            "currency": "CLP",
            "amount": plan["precio"],
            "email": body.taller_email,
            "urlConfirmation": "https://working.conectaai.cl/api/v1/pagos/webhook",
            "urlReturn": f"https://working.conectaai.cl/api/v1/pagos/retorno",
            "optional": f'{{"plan":"{body.plan}","taller_nombre":"{body.taller_nombre}","taller_email":"{body.taller_email}"}}',
        })
        return {
            "url": f"{result['url']}?token={result['token']}",
            "token": result["token"],
            "order": commerce_order,
        }
    except Exception as e:
        raise HTTPException(502, f"Error al crear pago en Flow: {str(e)}")


@router.post("/webhook")
async def flow_webhook(request: Request):
    """Flow llama a este endpoint cuando el pago se completa."""
    form = await request.form()
    token = form.get("token")
    if not token:
        raise HTTPException(400, "Token requerido")

    settings = get_settings()

    # Verificar pago con Flow
    try:
        status = await _flow_post("payment/getStatus", {"token": token})
    except Exception as e:
        raise HTTPException(502, f"Error verificando pago: {str(e)}")

    if status.get("status") != 2:  # 2 = pagado
        return {"ok": False, "status": status.get("status")}

    # Extraer datos del optional
    import json
    try:
        optional = json.loads(status.get("optional", "{}"))
        plan_key = optional.get("plan", "starter")
        taller_nombre = optional.get("taller_nombre", "Taller")
        taller_email = optional.get("taller_email", "")
    except Exception:
        raise HTTPException(400, "Datos de pago incompletos")

    plan = PLANES.get(plan_key, PLANES["starter"])

    # Generar tenant_id y password temporal
    tenant_id = "t-" + "".join(secrets.choice(string.ascii_lowercase + string.digits) for _ in range(8))
    slug = taller_nombre.lower().replace(" ", "-")[:20]
    temp_password = "".join(secrets.choice(string.ascii_letters + string.digits) for _ in range(10))

    # Crear tenant + usuario jefe en DB
    async with async_session() as db:
        try:
            # Crear tenant
            tenant = Tenant(
                id=tenant_id,
                nombre=taller_nombre,
                slug=slug,
                plan=plan_key,
                activo=True,
                branding={
                    "primaryColor": "#e11d48",
                    "primaryLight": "#fb7185",
                    "primaryDark": "#9f1239",
                    "sidebarBg": "#0f0f23",
                    "sidebarText": "#94a3b8",
                    "logoEmoji": "🏭",
                    "slogan": "Gestión de Taller",
                },
            )
            db.add(tenant)
            await db.flush()

            # Configurar RLS para este tenant
            await db.execute(
                text("SELECT set_config('app.tenant_id', :tid, true)"),
                {"tid": tenant_id},
            )

            # Crear usuario jefe
            user = User(
                email=taller_email,
                nombre=taller_nombre,
                hashed_password=hash_password(temp_password),
                rol=RoleEnum.jefe,
                tenant_id=tenant_id,
                activo=True,
            )
            db.add(user)
            await db.commit()

        except Exception as e:
            await db.rollback()
            raise HTTPException(500, f"Error creando cuenta: {str(e)}")

    # Enviar email de bienvenida
    try:
        await _send_welcome_email(
            to_email=taller_email,
            taller_nombre=taller_nombre,
            plan_nombre=plan["nombre"],
            password=temp_password,
        )
    except Exception:
        pass  # No falla el webhook si el email falla

    return {"ok": True, "tenant_id": tenant_id}


@router.get("/retorno", response_class=HTMLResponse)
async def retorno_pago(token: str = ""):
    """Página que ve el usuario después de pagar."""
    return """<!DOCTYPE html>
<html lang="es">
<head><meta charset="UTF-8"/><meta name="viewport" content="width=device-width,initial-scale=1"/>
<title>Pago procesado — ConectaWork</title>
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;600;800&display=swap" rel="stylesheet"/>
<style>*{margin:0;padding:0;box-sizing:border-box}body{font-family:Inter,sans-serif;background:#020817;color:#e2e8f0;display:flex;align-items:center;justify-content:center;min-height:100vh;padding:24px}.box{background:#0f172a;border:1px solid #1e293b;border-radius:20px;padding:48px;max-width:480px;width:100%;text-align:center}.icon{width:64px;height:64px;background:rgba(34,197,94,0.15);border-radius:50%;display:flex;align-items:center;justify-content:center;margin:0 auto 24px;font-size:28px}h1{font-size:24px;font-weight:800;margin-bottom:12px}p{color:#94a3b8;font-size:15px;line-height:1.6;margin-bottom:28px}.btn{display:inline-block;background:#e11d48;color:white;padding:13px 28px;border-radius:10px;text-decoration:none;font-weight:700;font-size:14px}</style>
</head>
<body>
<div class="box">
  <div class="icon">✓</div>
  <h1>¡Pago procesado!</h1>
  <p>Tu cuenta ConectaWork está siendo configurada. En los próximos minutos recibirás un email con tus credenciales de acceso.</p>
  <a href="/" class="btn">Volver al inicio →</a>
</div>
</body>
</html>"""


@router.get("/config", response_model=PagosConfig)
async def get_config(
    token_data: TokenData = Depends(require_roles("superadmin")),
):
    settings = get_settings()
    return PagosConfig(
        flow_api_key="***" if settings.FLOW_API_KEY else "",
        flow_secret_key="***" if settings.FLOW_SECRET_KEY else "",
        flow_env=settings.FLOW_ENV,
        resend_api_key="***" if settings.RESEND_API_KEY else "",
        resend_from_email=settings.RESEND_FROM_EMAIL,
        resend_from_name=settings.RESEND_FROM_NAME,
    )


@router.put("/config")
async def update_config(
    body: PagosConfig,
    token_data: TokenData = Depends(require_roles("superadmin")),
):
    """Actualiza las API keys en el .env de producción."""
    import re

    env_path = "/app/.env"
    try:
        with open(env_path) as f:
            content = f.read()

        updates = {
            "FLOW_API_KEY": body.flow_api_key,
            "FLOW_SECRET_KEY": body.flow_secret_key,
            "FLOW_ENV": body.flow_env,
            "RESEND_API_KEY": body.resend_api_key,
            "RESEND_FROM_EMAIL": body.resend_from_email,
            "RESEND_FROM_NAME": body.resend_from_name,
        }

        for key, val in updates.items():
            if val and val != "***":
                pattern = rf"^{key}=.*$"
                replacement = f"{key}={val}"
                if re.search(pattern, content, re.MULTILINE):
                    content = re.sub(pattern, replacement, content, flags=re.MULTILINE)
                else:
                    content += f"\n{key}={val}"

        with open(env_path, "w") as f:
            f.write(content)

        return {"ok": True, "msg": "Configuración guardada. Reinicia el backend para aplicar."}
    except Exception as e:
        raise HTTPException(500, f"Error guardando config: {str(e)}")
