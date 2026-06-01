export function generarCotizacionPDF(orden: any, tenant: any) {
  const fmt = (n: number) => '$' + n.toLocaleString('es-CL');
  const fmtD = (s: string) => s ? new Date(s).toLocaleDateString('es-CL') : '—';
  const color = tenant?.branding?.primaryColor || '#7c3aed';
  const empresa = tenant?.nombre || 'ConectaWork';

  const filas = (orden.productos || []).map((p: any, i: number) =>
    `<tr style="border-bottom:1px solid #f1f5f9">
      <td style="padding:10px 8px;font-size:13px;color:#334155">${i+1}. ${p.tipo}</td>
      <td style="padding:10px 8px;font-size:13px;color:#64748b;text-align:center">${p.ancho}x${p.alto} cm</td>
      <td style="padding:10px 8px;font-size:13px;color:#64748b;text-align:center">${p.tela || '—'}</td>
      <td style="padding:10px 8px;font-size:13px;color:#64748b;text-align:center">${p.color || '—'}</td>
      <td style="padding:10px 8px;font-size:13px;font-weight:600;text-align:right">${fmt(p.precio || 0)}</td>
    </tr>`
  ).join('');

  const html = `<!DOCTYPE html>
<html><head><meta charset="UTF-8"><title>Cotizacion ${orden.numero}</title>
<style>
body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;color:#0f172a;background:#fff;padding:40px;max-width:800px;margin:0 auto}
table{width:100%;border-collapse:collapse}
@media print{body{print-color-adjust:exact;-webkit-print-color-adjust:exact}}
</style></head><body>

<div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:40px">
  <div>
    <div style="font-size:28px;font-weight:800;color:${color}">${empresa}</div>
    <div style="font-size:13px;color:#64748b;margin-top:4px">Cortinas &amp; Toldos a Medida</div>
  </div>
  <div style="text-align:right">
    <div style="font-size:22px;font-weight:800">COTIZACION</div>
    <div style="font-size:20px;font-weight:700;color:${color}">N° ${orden.numero}</div>
    <div style="font-size:12px;color:#64748b;margin-top:4px">Fecha: ${fmtD(orden.created_at)}</div>
  </div>
</div>

<div style="background:#f8fafc;border-radius:12px;padding:20px;margin-bottom:24px">
  <div style="font-size:11px;font-weight:700;color:#94a3b8;letter-spacing:0.05em;margin-bottom:8px">CLIENTE</div>
  <div style="font-size:16px;font-weight:700">${orden.cliente_nombre || 'Sin cliente'}</div>
  ${orden.cliente_telefono ? `<div style="font-size:13px;color:#64748b;margin-top:4px">Tel: ${orden.cliente_telefono}</div>` : ''}
  ${orden.cliente_direccion ? `<div style="font-size:13px;color:#64748b">Dir: ${orden.cliente_direccion}</div>` : ''}
</div>

${orden.vendedor_nombre ? `<div style="margin-bottom:24px;font-size:13px;color:#64748b">Vendedor: <strong>${orden.vendedor_nombre}</strong></div>` : ''}

<table style="margin-bottom:24px">
  <thead>
    <tr style="background:${color}">
      <th style="padding:12px 8px;font-size:12px;font-weight:700;color:#fff;text-align:left">PRODUCTO</th>
      <th style="padding:12px 8px;font-size:12px;font-weight:700;color:#fff;text-align:center">MEDIDAS</th>
      <th style="padding:12px 8px;font-size:12px;font-weight:700;color:#fff;text-align:center">TELA</th>
      <th style="padding:12px 8px;font-size:12px;font-weight:700;color:#fff;text-align:center">COLOR</th>
      <th style="padding:12px 8px;font-size:12px;font-weight:700;color:#fff;text-align:right">PRECIO</th>
    </tr>
  </thead>
  <tbody>${filas}</tbody>
</table>

<div style="display:flex;justify-content:flex-end;margin-bottom:40px">
  <div style="background:${color};border-radius:12px;padding:16px 24px;text-align:right">
    <div style="font-size:12px;font-weight:600;color:rgba(255,255,255,0.8)">TOTAL</div>
    <div style="font-size:24px;font-weight:800;color:#fff">${fmt(orden.precio_total || 0)}</div>
  </div>
</div>

${orden.notas ? `<div style="border:1px solid #e2e8f0;border-radius:8px;padding:16px;margin-bottom:24px"><div style="font-size:11px;font-weight:700;color:#94a3b8;margin-bottom:6px">NOTAS</div><div style="font-size:13px;color:#475569">${orden.notas}</div></div>` : ''}

<div style="border-top:2px solid #f1f5f9;padding-top:20px;text-align:center">
  <div style="font-size:12px;color:#94a3b8">Cotizacion valida por 30 dias desde su emision.</div>
  <div style="font-size:12px;color:#94a3b8;margin-top:4px">${empresa} — Gracias por su preferencia</div>
</div>

</body></html>`;

  const w = window.open('', '_blank');
  if (w) {
    w.document.write(html);
    w.document.close();
    setTimeout(() => w.print(), 600);
  }
}
