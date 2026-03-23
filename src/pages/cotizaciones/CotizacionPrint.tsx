/**
 * Vista de impresión / PDF para Cotizaciones.
 * Ruta: /jefe/cotizaciones/:id/imprimir
 *       /vendedor/cotizacion/:id/imprimir
 *
 * Se abre en nueva pestaña y dispara el diálogo de impresión automáticamente.
 */
import { useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useApi } from '../../hooks/useApi';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../services/api';

const fmt = (n: number) => '$' + Number(n).toLocaleString('es-CL');
const fmtDate = (s: string | undefined) =>
  s ? new Date(s).toLocaleDateString('es-CL', { year: 'numeric', month: 'long', day: 'numeric' }) : '—';

const ESTADO_LABEL: Record<string, string> = {
  borrador: 'Borrador',
  enviada: 'Enviada al Cliente',
  aceptada: 'Aceptada',
  rechazada: 'Rechazada',
  convertida: 'Convertida a OT',
};

export default function CotizacionPrint() {
  const { id } = useParams<{ id: string }>();
  const { tenant } = useAuth();
  const { data: cot, loading, error } = useApi(() => api.getCotizacion(id!), [id]);

  const logoUrl: string | undefined = (tenant?.branding as any)?.logo_url;
  const brandColor: string = (tenant?.branding as any)?.color_primario || (tenant?.branding as any)?.primaryColor || '#1d4ed8';
  const tenantNombre: string = tenant?.nombre || 'WorkshopOS';

  // Dispara print al cargar los datos
  useEffect(() => {
    if (cot) {
      const t = setTimeout(() => window.print(), 600);
      return () => clearTimeout(t);
    }
  }, [cot]);

  if (loading) return (
    <div style={{ fontFamily: 'Arial, sans-serif', padding: 40, textAlign: 'center', color: '#64748b' }}>
      Preparando cotización...
    </div>
  );

  if (error || !cot) return (
    <div style={{ fontFamily: 'Arial, sans-serif', padding: 40, textAlign: 'center', color: '#ef4444' }}>
      No se pudo cargar la cotización.{' '}
      <Link to="/" style={{ color: '#3b82f6' }}>Volver</Link>
    </div>
  );

  const productos: any[] = cot.productos || [];
  const total = cot.precio_total || 0;

  return (
    <>
      {/* Print styles */}
      <style>{`
        @media print {
          .no-print { display: none !important; }
          body { margin: 0; }
          .page { box-shadow: none !important; }
        }
        @media screen {
          body { background: #f1f5f9; }
        }
        * { box-sizing: border-box; }
      `}</style>

      {/* Screen toolbar */}
      <div className="no-print" style={{
        background: '#1e293b', padding: '12px 24px', display: 'flex', alignItems: 'center', gap: 12,
        position: 'sticky', top: 0, zIndex: 10,
      }}>
        <button onClick={() => window.print()} style={{
          background: '#3b82f6', color: 'white', border: 'none', borderRadius: 8,
          padding: '8px 20px', fontWeight: 700, fontSize: 14, cursor: 'pointer',
        }}>
          🖨 Imprimir / Guardar PDF
        </button>
        <button onClick={() => window.close()} style={{
          background: 'transparent', color: '#94a3b8', border: '1px solid #334155',
          borderRadius: 8, padding: '8px 16px', fontSize: 13, cursor: 'pointer',
        }}>
          Cerrar
        </button>
      </div>

      {/* A4 page */}
      <div className="page" style={{
        fontFamily: 'Arial, sans-serif',
        maxWidth: 794,
        margin: '24px auto',
        background: 'white',
        padding: '48px 56px',
        boxShadow: '0 4px 32px rgba(0,0,0,0.12)',
        minHeight: 1123,
      }}>

        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 32 }}>
          {/* Logo / Empresa */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            {logoUrl ? (
              <img src={logoUrl} alt="Logo" style={{ height: 56, maxWidth: 160, objectFit: 'contain' }} />
            ) : (
              <div style={{
                width: 56, height: 56, borderRadius: 12,
                background: brandColor,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 26, flexShrink: 0,
              }}>
                🏠
              </div>
            )}
            <div>
              <p style={{ margin: 0, fontSize: 18, fontWeight: 800, color: '#0f172a' }}>{tenantNombre}</p>
              <p style={{ margin: '2px 0 0', fontSize: 12, color: '#64748b' }}>
                {(tenant?.branding as any)?.slogan || ''}
              </p>
            </div>
          </div>
          {/* Cotización info */}
          <div style={{ textAlign: 'right' }}>
            <h1 style={{ margin: 0, fontSize: 24, fontWeight: 800, color: brandColor }}>
              COTIZACIÓN
            </h1>
            <p style={{ margin: '3px 0 0', fontSize: 14, fontWeight: 600, color: '#0f172a' }}>
              #{String(cot.numero).padStart(4, '0')}
            </p>
            <p style={{ margin: '2px 0 0', fontSize: 12, color: '#64748b' }}>
              {fmtDate(String(cot.created_at))}
            </p>
            <div style={{
              display: 'inline-block', marginTop: 6,
              background: '#f0fdf4', border: '1px solid #bbf7d0',
              borderRadius: 6, padding: '4px 12px',
              fontSize: 11, fontWeight: 700, color: '#15803d',
            }}>
              {ESTADO_LABEL[cot.estado] || cot.estado}
            </div>
            {cot.valid_until && (
              <p style={{ margin: '5px 0 0', fontSize: 11, color: '#94a3b8' }}>
                Válida hasta: <strong>{fmtDate(String(cot.valid_until))}</strong>
              </p>
            )}
          </div>
        </div>

        <hr style={{ border: 'none', borderTop: '2px solid #e2e8f0', margin: '0 0 28px' }} />

        {/* Client info */}
        <div style={{ marginBottom: 28 }}>
          <p style={{ margin: '0 0 8px', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#94a3b8' }}>
            CLIENTE
          </p>
          <p style={{ margin: 0, fontSize: 18, fontWeight: 700, color: '#0f172a' }}>
            {cot.cliente_nombre || '—'}
          </p>
          {cot.vendedor_nombre && (
            <p style={{ margin: '3px 0 0', fontSize: 13, color: '#64748b' }}>
              Asesor: {cot.vendedor_nombre}
            </p>
          )}
        </div>

        {/* Products table */}
        <div style={{ marginBottom: 28 }}>
          <p style={{ margin: '0 0 12px', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#94a3b8' }}>
            DETALLE DE PRODUCTOS
          </p>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr style={{ background: '#f8fafc' }}>
                <th style={{ padding: '10px 12px', textAlign: 'left', color: '#475569', fontWeight: 600, borderBottom: '2px solid #e2e8f0' }}>Producto</th>
                <th style={{ padding: '10px 12px', textAlign: 'center', color: '#475569', fontWeight: 600, borderBottom: '2px solid #e2e8f0' }}>Medidas</th>
                <th style={{ padding: '10px 12px', textAlign: 'left', color: '#475569', fontWeight: 600, borderBottom: '2px solid #e2e8f0' }}>Material / Color</th>
                <th style={{ padding: '10px 12px', textAlign: 'right', color: '#475569', fontWeight: 600, borderBottom: '2px solid #e2e8f0' }}>Precio</th>
              </tr>
            </thead>
            <tbody>
              {productos.map((p: any, i: number) => (
                <tr key={i} style={{ borderBottom: '1px solid #f1f5f9' }}>
                  <td style={{ padding: '10px 12px', color: '#1e293b', fontWeight: 600 }}>
                    {p.tipo || p.nombre || p.nombre_catalogo || 'Producto'}
                  </td>
                  <td style={{ padding: '10px 12px', textAlign: 'center', color: '#475569' }}>
                    {p.ancho && p.alto ? `${p.ancho} × ${p.alto} cm` : p.cantidad ? `${p.cantidad} un.` : '—'}
                  </td>
                  <td style={{ padding: '10px 12px', color: '#475569' }}>
                    {[p.tela, p.color].filter(Boolean).join(' / ') || '—'}
                  </td>
                  <td style={{ padding: '10px 12px', textAlign: 'right', fontWeight: 700, color: '#0f172a' }}>
                    {fmt(parseFloat(p.precio || p.precio_unitario || 0) * (parseFloat(p.cantidad) || 1))}
                  </td>
                </tr>
              ))}
              {productos.length === 0 && (
                <tr>
                  <td colSpan={4} style={{ padding: 20, textAlign: 'center', color: '#94a3b8', fontStyle: 'italic' }}>
                    Sin productos detallados
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Total */}
        <div style={{
          display: 'flex', justifyContent: 'flex-end', marginBottom: 28,
          padding: '16px 24px',
          background: brandColor + '12',
          borderRadius: 10,
          border: `1px solid ${brandColor}40`,
        }}>
          <div style={{ textAlign: 'right' }}>
            <p style={{ margin: '0 0 4px', fontSize: 12, color: '#64748b' }}>TOTAL ESTIMADO</p>
            <p style={{ margin: 0, fontSize: 30, fontWeight: 800, color: brandColor }}>{fmt(total)}</p>
          </div>
        </div>

        {/* Notes */}
        {cot.notas && (
          <div style={{
            marginBottom: 28, padding: '16px 20px',
            background: '#fefce8', borderRadius: 10, border: '1px solid #fde68a',
          }}>
            <p style={{ margin: '0 0 6px', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', color: '#92400e' }}>NOTAS</p>
            <p style={{ margin: 0, fontSize: 13, color: '#78350f', whiteSpace: 'pre-line' }}>{cot.notas}</p>
          </div>
        )}

        {/* Footer */}
        <div style={{ marginTop: 'auto', paddingTop: 24, borderTop: '1px solid #e2e8f0', textAlign: 'center' }}>
          <p style={{ margin: 0, fontSize: 12, color: '#94a3b8' }}>
            Esta cotización es válida por <strong>30 días</strong> desde su emisión.
            Precios en CLP incluyen IVA.
          </p>
          <p style={{ margin: '6px 0 0', fontSize: 11, color: '#cbd5e1' }}>
            {tenantNombre} · Documento generado con WorkshopOS
          </p>
        </div>
      </div>
    </>
  );
}
