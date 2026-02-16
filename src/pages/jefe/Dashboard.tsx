import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { Store } from '../../data/store';
import { useAuth } from '../../context/AuthContext';
import { ESTADO_CONFIG } from '../../types';
import type { EstadoOrden } from '../../types';
import {
  TrendingUp, Package, CheckCircle2, AlertTriangle, ArrowRight, Users
} from 'lucide-react';

const fmt = (n: number) => '$' + n.toLocaleString('es-CL');

export default function JefeDashboard() {
  const { user, tenant } = useAuth();
  const tenantId = user?.tenantId || '';

  const ordenes = useMemo(() => Store.getOrdenes(tenantId), [tenantId]);
  const usuarios = useMemo(() => Store.getUsuariosByTenant(tenantId), [tenantId]);

  const stats = useMemo(() => {
    const byEstado: Record<string, number> = {};
    let ventas = 0;
    ordenes.forEach(o => {
      byEstado[o.estado] = (byEstado[o.estado] || 0) + 1;
      ventas += o.precioTotal;
    });
    return {
      ventas,
      byEstado,
      activas: ordenes.filter(o => !['instalado', 'problema'].includes(o.estado)).length,
      completadas: ordenes.filter(o => o.estado === 'instalado').length,
    };
  }, [ordenes]);

  const sinFabricante = ordenes.filter(o => o.estado === 'confirmado' && !o.fabricanteId);
  const sinInstalador = ordenes.filter(o => o.estado === 'listo' && !o.instaladorId);
  const conProblema = ordenes.filter(o => o.estado === 'problema');
  const recientes = [...ordenes].sort((a, b) => b.fechaCreacion.localeCompare(a.fechaCreacion)).slice(0, 6);

  const PIPELINE: EstadoOrden[] = ['cotizado', 'confirmado', 'en_fabricacion', 'listo', 'en_instalacion', 'instalado', 'problema'];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Dashboard</h1>
        <p className="text-sm text-slate-500">Vista general · {tenant?.nombre}</p>
      </div>

      {/* KPIs */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[
          { label: 'Ventas Totales', value: fmt(stats.ventas), sub: `${ordenes.length} órdenes`, icon: TrendingUp, iconBg: 'bg-amber-100', iconColor: 'text-amber-600' },
          { label: 'Órdenes Activas', value: stats.activas, sub: 'En proceso', icon: Package, iconBg: 'bg-blue-100', iconColor: 'text-blue-600' },
          { label: 'Completadas', value: stats.completadas, sub: 'Instaladas', icon: CheckCircle2, iconBg: 'bg-emerald-100', iconColor: 'text-emerald-600' },
          { label: 'Equipo', value: usuarios.filter(u => u.activo).length, sub: 'Usuarios activos', icon: Users, iconBg: 'bg-violet-100', iconColor: 'text-violet-600' },
        ].map(s => (
          <div key={s.label} className="rounded-xl border border-slate-200 bg-white p-5">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-slate-500">{s.label}</span>
              <div className={`rounded-lg p-2 ${s.iconBg}`}><s.icon size={17} className={s.iconColor} /></div>
            </div>
            <p className="mt-2 text-2xl font-bold text-slate-900">{s.value}</p>
            <p className="mt-0.5 text-xs text-slate-400">{s.sub}</p>
          </div>
        ))}
      </div>

      {/* Acción rápida: nueva cotización */}
      <div className="rounded-xl border border-dashed border-amber-300/70 bg-amber-50 px-4 py-3 text-xs text-amber-900 flex items-center justify-between gap-2">
        <div>
          <p className="font-semibold">Inicia una nueva cotización</p>
          <p className="text-[11px] text-amber-700/80">Jefe y Coordinador pueden crear cotizaciones rápidas para el equipo comercial.</p>
        </div>
        <Link
          to="/vendedor/nueva"
          className="inline-flex items-center gap-1 rounded-full bg-amber-500 px-3 py-1.5 text-[11px] font-semibold text-slate-950 shadow-sm shadow-amber-500/40 transition hover:bg-amber-400"
        >
          Nueva cotización
        </Link>
      </div>

      {/* Pipeline */}
      <div className="rounded-xl border border-slate-200 bg-white p-5">
        <h2 className="mb-4 text-base font-semibold text-slate-900">Pipeline de Órdenes</h2>
        <div className="grid grid-cols-3 gap-2 sm:grid-cols-4 lg:grid-cols-7">
          {PIPELINE.map(e => {
            const cfg = ESTADO_CONFIG[e];
            return (
              <div key={e} className={`rounded-lg border p-3 text-center ${cfg.border}`}>
                <span className={`text-[11px] font-semibold ${cfg.color}`}>{cfg.label}</span>
                <p className="mt-1 text-2xl font-bold text-slate-900">{stats.byEstado[e] || 0}</p>
              </div>
            );
          })}
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-5">
        {/* Alertas */}
        <div className="space-y-4 lg:col-span-2">
          <div className="rounded-xl border border-slate-200 bg-white p-5">
            <h2 className="mb-4 text-base font-semibold text-slate-900">Acciones Pendientes</h2>
            <div className="space-y-2">
              {sinFabricante.length > 0 && (
                <Link to="/jefe/ordenes" className="flex items-center gap-3 rounded-lg bg-amber-50 p-3 transition hover:bg-amber-100">
                  <AlertTriangle size={16} className="shrink-0 text-amber-600" />
                  <span className="flex-1 text-sm font-medium text-amber-800">{sinFabricante.length} orden(es) sin fabricante</span>
                  <ArrowRight size={14} className="text-amber-400" />
                </Link>
              )}
              {sinInstalador.length > 0 && (
                <Link to="/jefe/ordenes" className="flex items-center gap-3 rounded-lg bg-violet-50 p-3 transition hover:bg-violet-100">
                  <AlertTriangle size={16} className="shrink-0 text-violet-600" />
                  <span className="flex-1 text-sm font-medium text-violet-800">{sinInstalador.length} orden(es) sin instalador</span>
                  <ArrowRight size={14} className="text-violet-400" />
                </Link>
              )}
              {conProblema.length > 0 && (
                <Link to="/jefe/ordenes" className="flex items-center gap-3 rounded-lg bg-red-50 p-3 transition hover:bg-red-100">
                  <AlertTriangle size={16} className="shrink-0 text-red-600" />
                  <span className="flex-1 text-sm font-medium text-red-800">{conProblema.length} orden(es) con problema</span>
                  <ArrowRight size={14} className="text-red-400" />
                </Link>
              )}
              {sinFabricante.length === 0 && sinInstalador.length === 0 && conProblema.length === 0 && (
                <div className="rounded-lg bg-emerald-50 p-3">
                  <p className="text-sm font-medium text-emerald-700">✓ Todo en orden</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Recientes */}
        <div className="lg:col-span-3">
          <div className="rounded-xl border border-slate-200 bg-white p-5">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-base font-semibold text-slate-900">Órdenes Recientes</h2>
              <Link to="/jefe/ordenes" className="flex items-center gap-1 text-xs font-semibold hover:opacity-80" style={{ color: 'var(--brand-primary)' }}>
                Ver todas <ArrowRight size={13} />
              </Link>
            </div>
            <div className="space-y-1.5">
              {recientes.map(o => {
                const cli = Store.getClienteById(o.clienteId);
                const cfg = ESTADO_CONFIG[o.estado];
                return (
                  <Link key={o.id} to={`/jefe/ordenes/${o.id}`}
                    className="flex items-center justify-between rounded-lg border border-transparent px-3 py-2.5 transition hover:border-slate-200 hover:bg-slate-50">
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-slate-800">{o.id}</p>
                      <p className="truncate text-xs text-slate-400">{cli?.nombre} · {o.productos.length} prod. · {o.fechaCreacion}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${cfg.bg} ${cfg.color}`}>{cfg.label}</span>
                      <span className="text-sm font-semibold text-slate-700">{fmt(o.precioTotal)}</span>
                    </div>
                  </Link>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
