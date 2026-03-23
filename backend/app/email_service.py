"""
Servicio de email transaccional via mail.conectaai.cl (MailSaaS).

Envía notificaciones al cliente en hitos clave del flujo de OT y cotizaciones.
Si MAILSAAS_API_KEY no está configurado, no hace nada (modo silencioso).
"""
import logging

import httpx

from app.config import get_settings

logger = logging.getLogger(__name__)

MAILSAAS_URL = "https://mail.conectaai.cl/api/send"

# Mapeo de estado de OT → template en mail.conectaai.cl
ESTADO_TEMPLATE: dict[str, str] = {
    "cotizacion_enviada":    "working_cotizacion_enviada",
    "instalacion_programada": "working_instalacion_programada",
    "en_camino":             "working_en_camino",
    "cerrada":               "working_cerrada",
}


async def _send(api_key: str, from_field: str, to_email: str, template_name: str, variables: dict) -> None:
    """Envía un email via mail.conectaai.cl. Errores se logean sin romper el flujo."""
    try:
        payload = {
            "from": from_field,
            "to": [to_email],
            "template_name": template_name,
            "variables": variables,
        }
        async with httpx.AsyncClient(timeout=8.0) as client:
            resp = await client.post(
                MAILSAAS_URL,
                headers={
                    "Authorization": f"Bearer {api_key}",
                    "Content-Type": "application/json",
                },
                json=payload,
            )
            if resp.status_code not in (200, 201):
                logger.warning("MailSaaS error %s: %s", resp.status_code, resp.text[:200])
    except Exception as exc:
        logger.warning("Error enviando email a %s: %s", to_email, exc)


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
    Envía email al cliente cuando cambia el estado de una OT.
    Solo actúa en estados con template definido; silencioso si la clave no está configurada.
    """
    settings = get_settings()
    api_key = settings.MAILSAAS_API_KEY
    if not api_key:
        return

    template_name = ESTADO_TEMPLATE.get(estado)
    if not template_name:
        return

    variables: dict = {
        "nombre":  to_nombre,
        "numero":  str(numero_orden),
        "taller":  taller_nombre,
        "total":   total,
        "fecha":   fecha,
    }
    if tracking_url:
        variables["tracking_url"] = tracking_url

    from_field = f"{settings.FROM_NAME} <{settings.FROM_EMAIL}>"
    await _send(api_key, from_field, to_email, template_name, variables)
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
    """
    Envía email al cliente cuando una cotización pasa a estado 'enviada'.
    """
    settings = get_settings()
    api_key = settings.MAILSAAS_API_KEY
    if not api_key:
        return

    variables: dict = {
        "nombre":       to_nombre,
        "numero":       str(numero_cotizacion),
        "taller":       taller_nombre,
        "total":        total,
        "notas":        notas or "",
        "valid_until":  valid_until or "",
    }

    from_field = f"{settings.FROM_NAME} <{settings.FROM_EMAIL}>"
    await _send(api_key, from_field, to_email, "working_cotizacion_enviada", variables)
    logger.info("Email cotización enviado a %s (cot #%s)", to_email, numero_cotizacion)
