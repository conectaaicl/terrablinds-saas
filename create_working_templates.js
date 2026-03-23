/**
 * Crea / actualiza los 4 templates de Working en mail.conectaai.cl
 * Ejecutar en el servidor: cd /var/www/mail && node /tmp/create_working_templates.js
 *
 * Variables disponibles en cada template:
 *  - working_cotizacion_enviada:    {{ nombre }}, {{ numero }}, {{ taller }}, {{ total }}, {{ notas }}, {{ valid_until }}
 *  - working_instalacion_programada: {{ nombre }}, {{ numero }}, {{ taller }}, {{ fecha }}
 *  - working_en_camino:             {{ nombre }}, {{ numero }}, {{ taller }}, {{ tracking_url }}
 *  - working_cerrada:               {{ nombre }}, {{ numero }}, {{ taller }}
 */

const { PrismaClient } = require("/app/node_modules/.prisma/client");
const prisma = new PrismaClient();

// Usar el mismo workspace de TerraBlinds (o cambiar por workspace de Working si existe)
const workspaceId = "cmmz7si6q0002thiwc2rkj1iu";

const LOGO_PLACEHOLDER = "https://working.conectaai.cl/logo.png";

function header(title) {
  return `
<div style="background:linear-gradient(135deg,#0f172a 0%,#1e40af 100%);padding:32px 24px 24px;text-align:center;">
  <h1 style="margin:0;color:white;font-size:22px;font-family:Arial,sans-serif;font-weight:700;">${title}</h1>
  <p style="margin:8px 0 0;color:#93c5fd;font-size:13px;font-family:Arial,sans-serif;">WorkshopOS — Sistema de Taller</p>
</div>`;
}

function footer(taller) {
  return `
<div style="background:#f8fafc;border-top:1px solid #e2e8f0;padding:20px;text-align:center;font-size:12px;color:#94a3b8;font-family:Arial,sans-serif;">
  <p style="margin:0;"><strong style="color:#475569;">{{ taller }}</strong></p>
  <p style="margin:4px 0 0;">Sistema gestionado por <a href="https://working.conectaai.cl" style="color:#3b82f6;">WorkshopOS</a></p>
</div>`;
}

function wrap(content) {
  return `<!DOCTYPE html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"/></head><body style="margin:0;padding:20px;background:#f1f5f9;"><div style="font-family:Arial,sans-serif;max-width:640px;margin:0 auto;background:white;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);">${content}</div></body></html>`;
}

const templates = [
  {
    name: "working_cotizacion_enviada",
    subject: "Tu cotización #{{ numero }} está lista — {{ taller }}",
    htmlContent: wrap(
      header("Cotización Lista") +
      `<div style="padding:32px;">
  <p style="margin:0 0 8px;font-size:16px;color:#1e293b;">Hola <strong>{{ nombre }}</strong>,</p>
  <p style="margin:0 0 24px;color:#475569;font-size:15px;">Tu cotización de <strong>{{ taller }}</strong> ya está lista para revisión.</p>

  <div style="background:#eff6ff;border:2px solid #93c5fd;border-radius:12px;padding:24px;margin-bottom:24px;text-align:center;">
    <p style="margin:0 0 4px;color:#64748b;font-size:13px;">Cotización N°</p>
    <p style="margin:0;font-size:32px;font-weight:800;color:#1d4ed8;">#{{ numero }}</p>
    <p style="margin:12px 0 0;font-size:22px;font-weight:700;color:#0f172a;">{{ total }}</p>
  </div>

  <div style="background:#f8fafc;border-radius:10px;padding:16px 20px;margin-bottom:24px;">
    <p style="margin:0 0 8px;font-weight:700;color:#1e293b;font-size:14px;">Próximos pasos</p>
    <ol style="margin:0;padding-left:18px;color:#374151;font-size:13px;line-height:2;">
      <li>Revisa el detalle de la cotización</li>
      <li>Contáctanos para aceptar o solicitar ajustes</li>
      <li>Coordinamos fabricación e instalación profesional</li>
    </ol>
  </div>

  {% if notas %}
  <div style="background:#fefce8;border-left:4px solid #eab308;border-radius:0 10px 10px 0;padding:14px 18px;margin-bottom:20px;">
    <p style="margin:0;font-size:13px;color:#713f12;"><strong>Notas:</strong> {{ notas }}</p>
  </div>
  {% endif %}

  {% if valid_until %}
  <p style="font-size:12px;color:#94a3b8;text-align:center;">Esta cotización es válida hasta el <strong>{{ valid_until }}</strong></p>
  {% endif %}
</div>` +
      footer("{{ taller }}")
    ),
  },
  {
    name: "working_instalacion_programada",
    subject: "Tu instalación está agendada — {{ taller }}",
    htmlContent: wrap(
      header("Instalación Programada") +
      `<div style="padding:32px;">
  <p style="margin:0 0 8px;font-size:16px;color:#1e293b;">Hola <strong>{{ nombre }}</strong>,</p>
  <p style="margin:0 0 24px;color:#475569;font-size:15px;">Tu instalación de la OT <strong>#{{ numero }}</strong> ha sido programada.</p>

  <div style="background:#f0fdf4;border:2px solid #86efac;border-radius:12px;padding:24px;margin-bottom:24px;text-align:center;">
    <p style="margin:0 0 8px;color:#64748b;font-size:13px;text-transform:uppercase;letter-spacing:0.05em;">Fecha de instalación</p>
    <p style="margin:0;font-size:24px;font-weight:800;color:#15803d;">{{ fecha }}</p>
  </div>

  <div style="background:#f8fafc;border-radius:10px;padding:16px 20px;margin-bottom:20px;">
    <p style="margin:0 0 8px;font-weight:700;color:#1e293b;font-size:14px;">¿Qué sigue?</p>
    <ol style="margin:0;padding-left:18px;color:#374151;font-size:13px;line-height:2;">
      <li>Nuestro equipo se presentará en la fecha indicada</li>
      <li>El técnico llegará a tu domicilio en el horario acordado</li>
      <li>Recibirás una notificación cuando esté en camino</li>
    </ol>
  </div>

  <p style="font-size:13px;color:#94a3b8;text-align:center;">Si necesitas reagendar, contáctanos a la brevedad.</p>
</div>` +
      footer("{{ taller }}")
    ),
  },
  {
    name: "working_en_camino",
    subject: "Tu técnico está en camino — {{ taller }}",
    htmlContent: wrap(
      header("Técnico en Camino") +
      `<div style="padding:32px;">
  <p style="margin:0 0 8px;font-size:16px;color:#1e293b;">Hola <strong>{{ nombre }}</strong>,</p>
  <p style="margin:0 0 24px;color:#475569;font-size:15px;">¡Tu técnico está <strong>en camino</strong> hacia tu domicilio para la OT <strong>#{{ numero }}</strong>!</p>

  <div style="background:#f5f3ff;border:2px solid #c4b5fd;border-radius:12px;padding:24px;margin-bottom:24px;text-align:center;">
    <p style="margin:0;font-size:18px;font-weight:700;color:#6d28d9;">🚗 El técnico ya salió</p>
    <p style="margin:8px 0 0;color:#7c3aed;font-size:14px;">Llegará en los próximos minutos</p>
  </div>

  {% if tracking_url %}
  <a href="{{ tracking_url }}"
     style="display:block;background:linear-gradient(135deg,#7c3aed,#6d28d9);color:white;text-align:center;
            text-decoration:none;font-weight:700;font-size:16px;padding:16px 20px;border-radius:12px;margin-bottom:24px;">
    📍 Ver ubicación del técnico en tiempo real →
  </a>
  {% endif %}

  <p style="font-size:13px;color:#94a3b8;text-align:center;">Ten la cortesía de estar disponible en tu domicilio para recibirlo.</p>
</div>` +
      footer("{{ taller }}")
    ),
  },
  {
    name: "working_cerrada",
    subject: "Instalación completada — OT #{{ numero }} | {{ taller }}",
    htmlContent: wrap(
      header("Trabajo Completado") +
      `<div style="padding:32px;">
  <p style="margin:0 0 8px;font-size:16px;color:#1e293b;">Hola <strong>{{ nombre }}</strong>,</p>
  <p style="margin:0 0 24px;color:#475569;font-size:15px;">¡Tu instalación de la OT <strong>#{{ numero }}</strong> ha sido <strong>completada exitosamente</strong>! 🎉</p>

  <div style="background:#f0fdf4;border:2px solid #86efac;border-radius:12px;padding:24px;margin-bottom:24px;text-align:center;">
    <p style="margin:0;font-size:40px;">✅</p>
    <p style="margin:8px 0 0;font-size:18px;font-weight:700;color:#15803d;">Trabajo finalizado con éxito</p>
  </div>

  <div style="background:#eff6ff;border-left:4px solid #3b82f6;border-radius:0 10px 10px 0;padding:16px 20px;margin-bottom:24px;">
    <p style="margin:0;font-size:14px;color:#1e40af;">
      Gracias por confiar en <strong>{{ taller }}</strong>. Si tienes alguna consulta sobre tu instalación, no dudes en contactarnos.
    </p>
  </div>

  <p style="font-size:13px;color:#94a3b8;text-align:center;">¿Todo quedó perfecto? Cuéntanos cómo fue tu experiencia — tu opinión nos ayuda a mejorar.</p>
</div>` +
      footer("{{ taller }}")
    ),
  },
];

async function main() {
  for (const t of templates) {
    const existing = await prisma.template.findFirst({ where: { name: t.name, workspaceId } });
    if (existing) {
      await prisma.template.update({ where: { id: existing.id }, data: { subject: t.subject, htmlContent: t.htmlContent } });
      console.log("Updated:", t.name);
    } else {
      await prisma.template.create({ data: { ...t, workspaceId } });
      console.log("Created:", t.name);
    }
  }
  await prisma.$disconnect();
  console.log("Done! 4 working templates ready.");
}
main().catch(e => { console.error(e.message); process.exit(1); });
