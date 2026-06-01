"""
Módulo centralizado de email via mail.conectaai.cl (MailSaaS).

Consolida app/email.py (templates de auth/sistema) y app/email_service.py
(notificaciones de OT al cliente) en un único punto de verdad.

Uso:
    from app.core.email import send_email, send_jefe_welcome, enviar_email_cliente
"""
import logging

import httpx

from app.config import get_settings

logger = logging.getLogger(__name__)

MAILSAAS_SEND_URL = "https://mail.conectaai.cl/api/send"

# Mapeo estado OT → template en mail.conectaai.cl
_ESTADO_TEMPLATE: dict[str, str] = {
    "cotizacion_enviada":     "working_cotizacion_enviada",
    "instalacion_programada": "working_instalacion_programada",
    "en_camino":              "working_en_camino",
    "cerrada":                "working_cerrada",
}


# ---------------------------------------------------------------------------
# Función base — envío directo con HTML libre
# ---------------------------------------------------------------------------

async def send_email(to: str, subject: str, html: str) -> bool:
    """Envía un email via mail.conectaai.cl con HTML libre. Retorna True si fue exitoso."""
    settings = get_settings()
    api_key = getattr(settings, "MAILSAAS_API_KEY", "")
    from_email = getattr(settings, "FROM_EMAIL", "noreplywork@conectaai.cl")
    from_name = getattr(settings, "FROM_NAME", "ConectaWork")

    if not api_key:
        logger.warning(
            "[EMAIL-DEV] Para: %s | Asunto: %s | (MAILSAAS_API_KEY no configurado)", to, subject
        )
        return False

    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            resp = await client.post(
                MAILSAAS_SEND_URL,
                headers={
                    "Authorization": f"Bearer {api_key}",
                    "Content-Type": "application/json",
                },
                json={
                    "from": f"{from_name} <{from_email}>",
                    "to": to,
                    "subject": subject,
                    "html": html,
                },
            )
            if resp.status_code in (200, 201):
                logger.info("[EMAIL] Enviado a %s: %s", to, subject)
                return True
            logger.error("[EMAIL] Error %s: %s", resp.status_code, resp.text[:200])
            return False
    except Exception as e:
        logger.error("[EMAIL] Excepción al enviar a %s: %s", to, e)
        return False


# ---------------------------------------------------------------------------
# Función base — envío via template en MailSaaS
# ---------------------------------------------------------------------------

async def _send_template(
    api_key: str, from_field: str, to_email: str, template_name: str, variables: dict
) -> None:
    """Envía un email usando un template de MailSaaS. Errores se logean sin romper el flujo."""
    try:
        async with httpx.AsyncClient(timeout=8.0) as client:
            resp = await client.post(
                MAILSAAS_SEND_URL,
                headers={
                    "Authorization": f"Bearer {api_key}",
                    "Content-Type": "application/json",
                },
                json={
                    "from": from_field,
                    "to": [to_email],
                    "template_name": template_name,
                    "variables": variables,
                },
            )
            if resp.status_code not in (200, 201):
                logger.warning("MailSaaS error %s: %s", resp.status_code, resp.text[:200])
    except Exception as exc:
        logger.warning("Error enviando email a %s: %s", to_email, exc)


# ---------------------------------------------------------------------------
# Templates del sistema (auth, bienvenida, contraseña)
# ---------------------------------------------------------------------------

async def send_jefe_welcome(
    jefe_email: str, jefe_nombre: str, tenant_nombre: str, password: str
) -> bool:
    subject = "Bienvenido a ConectaWork — Tu acceso está listo"
    html = f"""
<!DOCTYPE html>
<html lang="es">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f8fafc;font-family:Inter,Arial,sans-serif">
  <div style="max-width:540px;margin:32px auto;background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,.07)">
    <div style="background:linear-gradient(135deg,#e11d48,#9f1239);padding:32px 32px 24px">
      <div style="display:flex;align-items:center;gap:12px">
        <div style="width:40px;height:40px;background:rgba(255,255,255,.2);border-radius:10px;display:flex;align-items:center;justify-content:center;font-size:20px">⚡</div>
        <span style="color:#fff;font-size:20px;font-weight:800;letter-spacing:-.5px">ConectaWork</span>
      </div>
      <h1 style="color:#fff;font-size:26px;font-weight:800;margin:20px 0 4px">¡Tu taller está listo!</h1>
      <p style="color:rgba(255,255,255,.8);font-size:15px;margin:0">Hola {jefe_nombre}, te damos la bienvenida.</p>
    </div>
    <div style="padding:32px">
      <p style="color:#475569;font-size:15px;line-height:1.6;margin:0 0 20px">
        Tu taller <strong style="color:#0f172a">{tenant_nombre}</strong> fue creado exitosamente.
        Tus credenciales de acceso como <strong>Jefe / Dueño</strong>:
      </p>
      <div style="background:#f1f5f9;border-radius:12px;padding:20px 24px;margin-bottom:24px">
        <table style="width:100%;border-collapse:collapse">
          <tr>
            <td style="padding:6px 0;color:#64748b;font-size:13px;font-weight:600;text-transform:uppercase;letter-spacing:.5px;width:90px">Email</td>
            <td style="padding:6px 0;color:#0f172a;font-size:15px;font-weight:700;font-family:monospace">{jefe_email}</td>
          </tr>
          <tr>
            <td style="padding:6px 0;color:#64748b;font-size:13px;font-weight:600;text-transform:uppercase;letter-spacing:.5px">Contraseña</td>
            <td style="padding:6px 0;color:#0f172a;font-size:15px;font-weight:700;font-family:monospace">{password}</td>
          </tr>
        </table>
      </div>
      <div style="background:#fff7ed;border:1px solid #fed7aa;border-radius:10px;padding:14px 18px;margin-bottom:24px">
        <p style="color:#9a3412;font-size:13px;margin:0">⚠️ Cambia tu contraseña la primera vez que inicies sesión.</p>
      </div>
      <a href="https://working.conectaai.cl/#/login"
        style="display:block;text-align:center;background:linear-gradient(135deg,#e11d48,#9f1239);color:#fff;font-size:15px;font-weight:700;text-decoration:none;border-radius:10px;padding:14px 24px;margin-bottom:24px">
        Ingresar al Sistema →
      </a>
      <p style="color:#94a3b8;font-size:13px;text-align:center;margin:0">
        ¿Tienes dudas? Contáctanos en <a href="mailto:soporte@conectaai.cl" style="color:#e11d48">soporte@conectaai.cl</a>
      </p>
    </div>
    <div style="background:#f8fafc;padding:16px 32px;text-align:center">
      <p style="color:#94a3b8;font-size:12px;margin:0">ConectaWork · Desarrollado por <strong>TerraBlinds</strong></p>
    </div>
  </div>
</body>
</html>
"""
    return await send_email(jefe_email, subject, html)


async def send_password_reset(to_email: str, nombre: str, token: str) -> bool:
    subject = "Recupera tu contraseña — ConectaWork"
    reset_url = f"https://working.conectaai.cl/#/reset-password?token={token}"
    html = f"""
<!DOCTYPE html>
<html lang="es">
<body style="margin:0;padding:32px;background:#f8fafc;font-family:Inter,Arial,sans-serif">
  <div style="max-width:480px;margin:0 auto;background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,.07)">
    <div style="background:linear-gradient(135deg,#e11d48,#9f1239);padding:28px 32px">
      <span style="color:#fff;font-size:18px;font-weight:800">ConectaWork</span>
      <h1 style="color:#fff;font-size:22px;margin:12px 0 0">Recupera tu contraseña</h1>
    </div>
    <div style="padding:32px">
      <p style="color:#475569;font-size:15px;margin:0 0 20px">
        Hola <strong>{nombre}</strong>, recibimos una solicitud para restablecer tu contraseña.
        Este enlace es válido por <strong>1 hora</strong>.
      </p>
      <a href="{reset_url}"
        style="display:block;text-align:center;background:linear-gradient(135deg,#e11d48,#9f1239);color:#fff;font-size:15px;font-weight:700;text-decoration:none;border-radius:10px;padding:14px 24px;margin-bottom:20px">
        Restablecer Contraseña →
      </a>
      <div style="background:#fff7ed;border:1px solid #fed7aa;border-radius:10px;padding:14px 18px">
        <p style="color:#9a3412;font-size:13px;margin:0">
          Si no solicitaste este cambio, ignora este email.
        </p>
      </div>
    </div>
  </div>
</body>
</html>
"""
    return await send_email(to_email, subject, html)


async def send_user_welcome(
    to_email: str, nombre: str, rol: str, taller_nombre: str, password: str
) -> bool:
    ROL_LABELS = {
        "gerente": "Gerente",
        "coordinador": "Coordinador/a",
        "vendedor": "Vendedor/a",
        "fabricante": "Fabricante",
        "instalador": "Instalador/a",
        "bodegas": "Encargado/a de Bodegas",
    }
    rol_label = ROL_LABELS.get(rol, rol.capitalize())
    subject = f"Bienvenido/a a {taller_nombre} — ConectaWork"
    html = f"""
<!DOCTYPE html>
<html lang="es">
<body style="margin:0;padding:0;background:#f8fafc;font-family:Inter,Arial,sans-serif">
  <div style="max-width:540px;margin:32px auto;background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,.07)">
    <div style="background:linear-gradient(135deg,#e11d48,#9f1239);padding:32px 32px 24px">
      <span style="color:#fff;font-size:20px;font-weight:800">ConectaWork</span>
      <h1 style="color:#fff;font-size:24px;font-weight:800;margin:16px 0 4px">¡Bienvenido/a, {nombre}!</h1>
      <p style="color:rgba(255,255,255,.8);font-size:14px;margin:0">Tu cuenta en {taller_nombre} está lista.</p>
    </div>
    <div style="padding:32px">
      <div style="background:#f1f5f9;border-radius:12px;padding:20px 24px;margin-bottom:24px">
        <table style="width:100%;border-collapse:collapse">
          <tr><td style="padding:5px 0;color:#64748b;font-size:13px;font-weight:600;width:90px">Email</td>
              <td style="padding:5px 0;color:#0f172a;font-size:14px;font-weight:700;font-family:monospace">{to_email}</td></tr>
          <tr><td style="padding:5px 0;color:#64748b;font-size:13px;font-weight:600">Contraseña</td>
              <td style="padding:5px 0;color:#0f172a;font-size:14px;font-weight:700;font-family:monospace">{password}</td></tr>
          <tr><td style="padding:5px 0;color:#64748b;font-size:13px;font-weight:600">Rol</td>
              <td style="padding:5px 0;color:#0f172a;font-size:14px;font-weight:700">{rol_label}</td></tr>
          <tr><td style="padding:5px 0;color:#64748b;font-size:13px;font-weight:600">Taller</td>
              <td style="padding:5px 0;color:#0f172a;font-size:14px;font-weight:700">{taller_nombre}</td></tr>
        </table>
      </div>
      <div style="background:#fff7ed;border:1px solid #fed7aa;border-radius:10px;padding:14px 18px;margin-bottom:24px">
        <p style="color:#9a3412;font-size:13px;margin:0">⚠️ Cambia tu contraseña al ingresar por primera vez.</p>
      </div>
      <a href="https://working.conectaai.cl/#/login"
        style="display:block;text-align:center;background:linear-gradient(135deg,#e11d48,#9f1239);color:#fff;font-size:15px;font-weight:700;text-decoration:none;border-radius:10px;padding:14px 24px">
        Ingresar al Sistema →
      </a>
    </div>
  </div>
</body>
</html>
"""
    return await send_email(to_email, subject, html)


async def send_password_changed(to_email: str, nombre: str) -> bool:
    subject = "Tu contraseña fue cambiada — ConectaWork"
    html = f"""
<!DOCTYPE html>
<html lang="es">
<body style="margin:0;padding:32px;background:#f8fafc;font-family:Inter,Arial,sans-serif">
  <div style="max-width:480px;margin:0 auto;background:#fff;border-radius:16px;padding:32px;box-shadow:0 4px 24px rgba(0,0,0,.07)">
    <div style="font-size:32px;margin-bottom:16px">🔐</div>
    <h2 style="color:#0f172a;font-size:20px;margin:0 0 12px">Contraseña actualizada</h2>
    <p style="color:#475569;font-size:15px;line-height:1.6;margin:0 0 20px">
      Hola <strong>{nombre}</strong>, tu contraseña de ConectaWork fue cambiada exitosamente.
    </p>
    <p style="color:#475569;font-size:14px;margin:0">
      Si no realizaste este cambio, contacta de inmediato a tu administrador.
    </p>
  </div>
</body>
</html>
"""
    return await send_email(to_email, subject, html)


# ---------------------------------------------------------------------------
# Notificaciones de OT al cliente via templates
# ---------------------------------------------------------------------------

async def enviar_email_cliente(
    *,
    to_email: str,
    to_nombre: str,
    estado: str,
    numero_orden: int,
    taller_nombre: str,
    total: str = "",
    fecha: str = "",
    direccion: str = "",
    tracking_url: str = "",
) -> None:
    """Envía email al cliente cuando cambia el estado de una OT."""
    settings = get_settings()
    api_key = settings.MAILSAAS_API_KEY
    if not api_key:
        return

    template_name = _ESTADO_TEMPLATE.get(estado)
    if not template_name:
        return

    variables: dict = {
        "nombre": to_nombre,
        "numero": str(numero_orden),
        "taller": taller_nombre,
        "total":  total,
        "fecha":  fecha,
    }
    if tracking_url:
        variables["tracking_url"] = tracking_url

    from_field = f"{settings.FROM_NAME} <{settings.FROM_EMAIL}>"
    await _send_template(api_key, from_field, to_email, template_name, variables)
    logger.info("Email enviado a %s (estado=%s, template=%s)", to_email, estado, template_name)


async def enviar_cotizacion_cliente(
    *,
    to_email: str,
    to_nombre: str,
    numero_cotizacion: int,
    taller_nombre: str,
    total: str = "",
    notas: str = "",
    valid_until: str = "",
) -> None:
    """Envía email al cliente cuando una cotización pasa a estado 'enviada'."""
    settings = get_settings()
    api_key = settings.MAILSAAS_API_KEY
    if not api_key:
        return

    variables: dict = {
        "nombre":      to_nombre,
        "numero":      str(numero_cotizacion),
        "taller":      taller_nombre,
        "total":       total,
        "notas":       notas or "",
        "valid_until": valid_until or "",
    }

    from_field = f"{settings.FROM_NAME} <{settings.FROM_EMAIL}>"
    await _send_template(api_key, from_field, to_email, "working_cotizacion_enviada", variables)
    logger.info("Email cotización enviado a %s (cot #%s)", to_email, numero_cotizacion)
