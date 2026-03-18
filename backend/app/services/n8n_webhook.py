"""
Servicio de webhooks hacia n8n + envío de emails via Resend.

Dispara eventos para: nuevo cliente, orden cerrada, post-venta creado,
instalador activa tracking GPS.

Para post-venta, además de disparar el webhook n8n incluye datos Resend
y envía el email directamente si RESEND_API_KEY está configurado.
"""
import httpx
from app.config import get_settings


# ── HTTP helper ─────────────────────────────────────────────────────────────

async def _post_webhook(url: str, payload: dict) -> bool:
    """POST a webhook URL. Retorna True si exitoso."""
    try:
        async with httpx.AsyncClient(timeout=10) as client:
            resp = await client.post(url, json=payload)
            print(f"[n8n] webhook {url} → {resp.status_code}", flush=True)
            return resp.status_code < 400
    except Exception as e:
        print(f"[n8n] webhook error: {e}", flush=True)
        return False


# ── Resend direct email ──────────────────────────────────────────────────────

async def send_resend_email(
    to: str | list[str],
    subject: str,
    html: str,
    reply_to: str | None = None,
) -> bool:
    """
    Envía un email via Resend API directamente desde el backend.
    Retorna True si el envío fue exitoso.
    """
    settings = get_settings()
    api_key = settings.RESEND_API_KEY
    if not api_key:
        print("[resend] RESEND_API_KEY no configurado — email no enviado", flush=True)
        return False

    from_addr = f"{settings.FROM_NAME} <{settings.FROM_EMAIL}>"
    to_list = [to] if isinstance(to, str) else to

    payload: dict = {
        "from": from_addr,
        "to": to_list,
        "subject": subject,
        "html": html,
    }
    if reply_to:
        payload["reply_to"] = reply_to

    try:
        async with httpx.AsyncClient(timeout=15) as client:
            resp = await client.post(
                "https://api.resend.com/emails",
                headers={
                    "Authorization": f"Bearer {api_key}",
                    "Content-Type": "application/json",
                },
                json=payload,
            )
            ok = resp.status_code < 300
            print(f"[resend] email to {to_list} → {resp.status_code}", flush=True)
            return ok
    except Exception as e:
        print(f"[resend] error: {e}", flush=True)
        return False


def _post_venta_html(
    cliente_nombre: str,
    empresa_nombre: str,
    tipo: str,
    descripcion: str,
    ai_mensaje: str | None,
    tenant_nombre: str,
) -> str:
    """Genera el HTML del email de seguimiento post-venta."""
    tipo_labels = {
        "satisfaccion": "Encuesta de Satisfacción",
        "garantia": "Solicitud de Garantía",
        "servicio": "Servicio Adicional",
        "mantencion": "Mantención Programada",
        "otro": "Seguimiento",
    }
    tipo_label = tipo_labels.get(tipo, "Seguimiento Post-Venta")

    mensaje = ai_mensaje or (
        f"Estimado/a {cliente_nombre},\n\n"
        f"Nos comunicamos desde {empresa_nombre} para dar seguimiento "
        f"a su reciente instalación. Queremos asegurarnos de que todo "
        f"esté funcionando perfectamente y que esté satisfecho/a con nuestro servicio.\n\n"
        f"Por favor no dude en contactarnos ante cualquier consulta."
    )

    mensaje_html = mensaje.replace("\n", "<br>")

    return f"""
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width,initial-scale=1.0">
  <title>{tipo_label}</title>
</head>
<body style="margin:0;padding:0;background:#f8fafc;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f8fafc;padding:32px 16px;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);">
        <!-- Header -->
        <tr>
          <td style="background:linear-gradient(135deg,#e11d48,#be123c);padding:32px;text-align:center;">
            <p style="margin:0;font-size:28px;">⚡</p>
            <h1 style="margin:8px 0 4px;font-size:20px;font-weight:800;color:#ffffff;">{empresa_nombre}</h1>
            <p style="margin:0;font-size:13px;color:rgba(255,255,255,0.7);">{tipo_label}</p>
          </td>
        </tr>
        <!-- Body -->
        <tr>
          <td style="padding:32px;">
            <p style="margin:0 0 20px;font-size:15px;color:#0f172a;line-height:1.6;">
              {mensaje_html}
            </p>
            {'<hr style="border:none;border-top:1px solid #f1f5f9;margin:24px 0;">' if descripcion else ''}
            {'<p style="margin:0 0 8px;font-size:12px;font-weight:600;text-transform:uppercase;letter-spacing:0.05em;color:#94a3b8;">Detalle</p>' if descripcion else ''}
            {'<p style="margin:0;font-size:14px;color:#475569;background:#f8fafc;border-radius:8px;padding:12px 16px;">' + descripcion + '</p>' if descripcion else ''}
          </td>
        </tr>
        <!-- Footer -->
        <tr>
          <td style="background:#f8fafc;border-top:1px solid #f1f5f9;padding:20px 32px;text-align:center;">
            <p style="margin:0;font-size:12px;color:#94a3b8;">
              Este mensaje fue enviado por <strong>{tenant_nombre}</strong> a través de WorkshopOS.
            </p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>
"""


# ── Webhook triggers ─────────────────────────────────────────────────────────

async def trigger_nuevo_cliente(cliente: dict, tenant_id: str) -> bool:
    """Dispara cuando se registra un nuevo cliente."""
    settings = get_settings()
    url = getattr(settings, "N8N_WEBHOOK_NUEVO_CLIENTE", "")
    if not url:
        return False
    return await _post_webhook(url, {
        "evento": "nuevo_cliente",
        "tenant_id": tenant_id,
        "cliente": cliente,
    })


async def trigger_orden_cerrada(orden: dict, cliente: dict, tenant_id: str) -> bool:
    """Dispara cuando una orden cambia a estado 'cerrada'."""
    settings = get_settings()
    url = getattr(settings, "N8N_WEBHOOK_ORDEN_CERRADA", "")
    if not url:
        return False
    return await _post_webhook(url, {
        "evento": "orden_cerrada",
        "tenant_id": tenant_id,
        "orden": orden,
        "cliente": cliente,
    })


async def trigger_post_venta_creado(
    post_venta: dict,
    cliente: dict,
    tenant_id: str,
    ai_mensaje: str | None = None,
    tenant_nombre: str = "WorkshopOS",
) -> bool:
    """
    Dispara cuando se crea un post-venta.
    1) Envía webhook a n8n con payload completo (incluyendo datos para nodo Resend de n8n).
    2) Si RESEND_API_KEY está configurado, también envía el email directamente.
    """
    settings = get_settings()

    cliente_email = cliente.get("email") or cliente.get("email2")
    cliente_nombre = cliente.get("nombre", "Cliente")
    empresa_nombre = cliente.get("empresa") or tenant_nombre
    tipo = post_venta.get("tipo", "otro")
    descripcion = post_venta.get("descripcion", "")

    # Generar HTML del email
    email_html = _post_venta_html(
        cliente_nombre=cliente_nombre,
        empresa_nombre=empresa_nombre,
        tipo=tipo,
        descripcion=descripcion,
        ai_mensaje=ai_mensaje,
        tenant_nombre=tenant_nombre,
    )

    tipo_labels = {
        "satisfaccion": "Encuesta de Satisfacción",
        "garantia": "Solicitud de Garantía",
        "servicio": "Oferta de Servicio Adicional",
        "mantencion": "Mantención Programada",
        "otro": "Seguimiento Post-Venta",
    }
    email_subject = f"{tipo_labels.get(tipo, 'Seguimiento')} — {empresa_nombre}"

    # 1) Webhook n8n (incluye datos para nodo Resend en n8n)
    n8n_url = getattr(settings, "N8N_WEBHOOK_POST_VENTA", "")
    if n8n_url:
        await _post_webhook(n8n_url, {
            "evento": "post_venta_creado",
            "tenant_id": tenant_id,
            "post_venta": post_venta,
            "cliente": cliente,
            # Datos listos para el nodo Resend de n8n:
            "resend": {
                "to": cliente_email,
                "subject": email_subject,
                "html": email_html,
                "from_name": tenant_nombre,
                "from_email": settings.FROM_EMAIL,
            },
        })

    # 2) Envío directo via Resend si el cliente tiene email y hay API key
    if cliente_email:
        await send_resend_email(
            to=cliente_email,
            subject=email_subject,
            html=email_html,
        )

    return True


async def trigger_post_venta_ai_mensaje(
    post_venta_id: str,
    cliente: dict,
    ai_mensaje: str,
    tipo: str,
    tenant_id: str,
    tenant_nombre: str = "WorkshopOS",
) -> bool:
    """
    Envía el mensaje AI generado al cliente via Resend y webhook n8n.
    Se llama cuando el usuario genera el mensaje AI y quiere enviarlo.
    """
    settings = get_settings()
    cliente_email = cliente.get("email") or cliente.get("email2")
    cliente_nombre = cliente.get("nombre", "Cliente")
    empresa_nombre = cliente.get("empresa") or tenant_nombre

    tipo_labels = {
        "satisfaccion": "Seguimiento de su Instalación",
        "garantia": "Gestión de Garantía",
        "servicio": "Propuesta de Servicio",
        "mantencion": "Recordatorio de Mantención",
        "otro": "Mensaje de su Instalador",
    }
    subject = f"{tipo_labels.get(tipo, 'Seguimiento')} — {empresa_nombre}"

    html = _post_venta_html(
        cliente_nombre=cliente_nombre,
        empresa_nombre=empresa_nombre,
        tipo=tipo,
        descripcion="",
        ai_mensaje=ai_mensaje,
        tenant_nombre=tenant_nombre,
    )

    n8n_url = getattr(settings, "N8N_WEBHOOK_POST_VENTA", "")
    if n8n_url:
        await _post_webhook(n8n_url, {
            "evento": "post_venta_ai_mensaje",
            "tenant_id": tenant_id,
            "post_venta_id": str(post_venta_id),
            "cliente": cliente,
            "resend": {
                "to": cliente_email,
                "subject": subject,
                "html": html,
                "from_name": tenant_nombre,
                "from_email": settings.FROM_EMAIL,
            },
        })

    if cliente_email:
        return await send_resend_email(to=cliente_email, subject=subject, html=html)

    return True


async def trigger_tracking_activado(
    orden_id: int,
    tracking_token: str,
    instalador: str,
    cliente: str,
    tenant_id: str,
) -> bool:
    """Dispara cuando el instalador activa tracking GPS → n8n envía link al cliente."""
    settings = get_settings()
    url = getattr(settings, "N8N_WEBHOOK_TRACKING", "")
    if not url:
        return False
    base_url = getattr(settings, "FRONTEND_URL", "https://works.conectaai.cl")
    return await _post_webhook(url, {
        "evento": "tracking_activado",
        "tenant_id": tenant_id,
        "orden_id": orden_id,
        "tracking_url": f"{base_url}/#/tracking/{tracking_token}",
        "instalador": instalador,
        "cliente": cliente,
    })
