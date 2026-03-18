"""
Servicio de email transaccional via Resend API.

Envía notificaciones al cliente en hitos clave del flujo de OT.
Si RESEND_API_KEY no está configurado, simplemente no hace nada (modo silencioso).
"""
import logging

import httpx

from app.config import get_settings

logger = logging.getLogger(__name__)

# ─── Plantillas HTML ─────────────────────────────────────────────────────────

PLANTILLAS: dict[str, dict] = {
    "cotizacion_enviada": {
        "subject": "Tu cotización está lista — {taller}",
        "html": """
<div style="font-family:sans-serif;max-width:600px;margin:0 auto;padding:24px">
  <h2 style="color:#1e293b">Hola {cliente},</h2>
  <p>Tu cotización <strong>#{numero}</strong> de <strong>{taller}</strong> ya está lista para revisión.</p>
  <div style="background:#f8fafc;border-radius:8px;padding:16px;margin:16px 0">
    <p style="margin:0;font-size:18px;font-weight:bold;color:#0f172a">Total: {total}</p>
  </div>
  <p>Para aceptar la cotización o solicitar ajustes, contáctate con nosotros.</p>
  <p style="color:#64748b;font-size:14px">— Equipo {taller}</p>
</div>
""",
    },

    "instalacion_programada": {
        "subject": "Tu instalación está agendada — {taller}",
        "html": """
<div style="font-family:sans-serif;max-width:600px;margin:0 auto;padding:24px">
  <h2 style="color:#1e293b">Hola {cliente},</h2>
  <p>Tu instalación de la OT <strong>#{numero}</strong> ha sido <strong>programada</strong>.</p>
  <div style="background:#eef2ff;border-radius:8px;padding:16px;margin:16px 0;border-left:4px solid #6366f1">
    <p style="margin:0;font-weight:bold;color:#3730a3">Fecha: {fecha}</p>
    {direccion_html}
  </div>
  <p>Nuestro equipo se presentará en la dirección registrada. Si tienes alguna consulta, no dudes en contactarnos.</p>
  <p style="color:#64748b;font-size:14px">— Equipo {taller}</p>
</div>
""",
    },

    "en_camino": {
        "subject": "Tu técnico está en camino — {taller}",
        "html": """
<div style="font-family:sans-serif;max-width:600px;margin:0 auto;padding:24px">
  <h2 style="color:#1e293b">Hola {cliente},</h2>
  <p>¡Buenas noticias! El técnico asignado a tu OT <strong>#{numero}</strong> está <strong>en camino</strong> hacia tu domicilio.</p>
  <div style="background:#f5f3ff;border-radius:8px;padding:16px;margin:16px 0;border-left:4px solid #8b5cf6">
    <p style="margin:0;font-weight:bold;color:#6d28d9">Llegará en breve a tu domicilio.</p>
  </div>
  {tracking_html}
  <p style="color:#64748b;font-size:14px">— Equipo {taller}</p>
</div>
""",
    },

    "cerrada": {
        "subject": "Instalación completada — {taller}",
        "html": """
<div style="font-family:sans-serif;max-width:600px;margin:0 auto;padding:24px">
  <h2 style="color:#1e293b">Hola {cliente},</h2>
  <p>¡Tu instalación de la OT <strong>#{numero}</strong> ha sido <strong>completada exitosamente</strong>! 🎉</p>
  <div style="background:#f0fdf4;border-radius:8px;padding:16px;margin:16px 0;border-left:4px solid #22c55e">
    <p style="margin:0;font-weight:bold;color:#166534">Trabajo finalizado con éxito.</p>
  </div>
  <p>Gracias por confiar en <strong>{taller}</strong>. Fue un placer trabajar contigo.</p>
  <p style="color:#64748b;font-size:14px">— Equipo {taller}</p>
</div>
""",
    },
}


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
    """
    Envía un email al cliente si RESEND_API_KEY está configurado.
    Fire-and-forget: los errores se logean pero no rompen el flujo.
    """
    settings = get_settings()
    if not settings.RESEND_API_KEY:
        return  # Email no configurado — silencioso

    plantilla = PLANTILLAS.get(estado)
    if not plantilla:
        return  # No hay plantilla para este estado

    direccion_html = (
        f'<p style="margin:4px 0 0;color:#4f46e5">{direccion}</p>' if direccion else ""
    )
    tracking_html = (
        f'<a href="{tracking_url}" style="display:block;background:#6d28d9;color:#fff;text-align:center;'
        f'text-decoration:none;font-weight:bold;padding:12px 20px;border-radius:8px;margin:16px 0">'
        f'📍 Ver ubicación del técnico en tiempo real →</a>'
        if tracking_url else ""
    )

    try:
        _vars = dict(
            cliente=to_nombre,
            numero=numero_orden,
            taller=taller_nombre,
            total=total,
            fecha=fecha,
            direccion_html=direccion_html,
            tracking_html=tracking_html,
        )
        subject = plantilla["subject"].format_map(_vars)
        html = plantilla["html"].format_map(_vars)

        payload = {
            "from": f"{settings.FROM_NAME} <{settings.FROM_EMAIL}>",
            "to": [to_email],
            "subject": subject,
            "html": html,
        }

        async with httpx.AsyncClient(timeout=8.0) as client:
            resp = await client.post(
                "https://api.resend.com/emails",
                headers={
                    "Authorization": f"Bearer {settings.RESEND_API_KEY}",
                    "Content-Type": "application/json",
                },
                json=payload,
            )
            if resp.status_code not in (200, 201):
                logger.warning(
                    "Resend error %s: %s", resp.status_code, resp.text[:200]
                )
    except Exception as exc:
        logger.warning("Error enviando email a %s: %s", to_email, exc)
