import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useApi } from '../../hooks/useApi';
import { api } from '../../services/api';
import { ESTADO_CONFIG, PIPELINE_ESTADOS } from '../../types';
import { Spinner, ErrorMessage } from '../../components/LoadingStates';
import {
  Package, CheckCircle2, AlertTriangle, ArrowRight,
  Factory, Navigation, Wrench, Zap, DollarSign,
} from 'lucide-react';

const fmt = (n: number) => '$' + n.toLocaleString('es-CL');
const fmtDate = (s: string) => s ? new Date(s).toLocaleDateString('es-CL') : '—';

// Etapas agrupadas para el pipeline visual
const ETAPAS = [
  {
    label: 'Ventas',
    color: 'bg-sky-500',
    light: 'bg-sky-50',
    text: 'text-sky-700',
    border: 'border-sky-200',
    estados: ['cotizacion', 'cotizacion_enviada', 'aceptada', 'cotizado'],
  },
  {
    label: 'Revisión OT',
    color: 'bg-cyan-500',
    light: 'bg-cyan-50',
    text: 'text-cyan-700',
    border: 'border-cyan-200',
    estados: ['ot_creada', 'aprobada'],
  },
  {
    label: 'Fabricación',
    color: 'bg-amber-500',
    light: 'bg-amber-50',
    text: 'text-amber-700',
    border: 'border-amber-200',
    estados: ['en_fabricacion', 'listo_para_instalar', 'fabricado'],
  },
  {
    label: 'Instalación',
    color: 'bg-violet-500',
    light: 'bg-violet-50',
    text: 'text-violet-700',
    border: 'border-violet-200',
    estados: ['instalacion_programada', 'en_camino', 'instalando', 'instalacion_completada', 'agendado', 'en_ruta', 'en_instalacion', 'pendiente_firma'],
  },
  {
    label: 'Cerradas',
    color: 'bg-emerald-500',
    light: 'bg-emerald-50',
    text: 'text-emerald-700',
    border: 'border-emerald-200',
    estados: ['cerrada', 'cerrado'],
  },
];

export default function JefeDashboard() {
  const { user, tenant } = useAuth();

  const { data: summary, loading: loadingSum, error: errSum, refetch: refetchSum } = useApi(
    () => api.getDashboardSummary()
  );
  const { data: orders, loading: loadingOrd, error: errOrd, refetch: refetchOrd } = useApi(
    () => api.getOrders()
  );

  const loading = loadingSum || loadingOrd;
  const error = errSum || errOrd;

  if (loading) return <Spinner />;
  if (error) return <ErrorMessage message={error} onRetry={() => { refetchSum(); refetchOrd(); }} />;

  const orderList: any[] = orders || [];
  const byEstado: Record<string, number> = summary?.por_estado || {};

  // Alertas
  const sinFabricante = orderList.filter(o => ['ot_creada', 'aprobada', 'confirmado'].includes(o.estado) && !o.fabricante_id);
  const sinInstalador = orderList.filter(o => ['listo_para_instalar', 'fabricado'].includes(o.estado) && !o.instalador_id);
  const conProblema = orderList.filter(o => o.estado === 'problema');
  const enCampo = orderList.filter(o => ['en_camino', 'instalando', 'en_ruta', 'en_instalacion'].includes(o.estado));
  const pendientesAprobacion = orderList.filter(o => o.estado === 'ot_creada');

  // Pipeline por etapa
  const etapaCounts = ETAPAS.map(et => ({
    ...et,
    count: et.estados.reduce((acc, e) => acc + (byEstado[e] || 0), 0),
  }));
  const totalActivas = etapaCounts.slice(0, 4).reduce((a, e) => a + e.count, 0);

  const recientes = [...orderList]
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    .slice(0, 8);

  const ingresosMes = summary?.ingresos_mes || 0;
  const ordenesMes = summary?.ordenes_mes || 0;
  const cerradasMes = summary?.cerradas_mes || 0;
  const tasaCierre = summary?.tasa_cierre || 0;

  const rolBase = user?.rol === 'gerente' ? '/gerente' : user?.rol === 'coordinador' ? '/coordinador' : '/jefe';

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Dashboard</h1>
        <p className="text-sm text-slate-500">Vista general · {tenant?.nombre}</p>
      </div>

      {/* Alertas críticas */}
      {(pendientesAprobacion.length > 0 || conProblema.length > 0) && (
        <div className="grid gap-2 sm:grid-cols-2">
          {pendientesAprobacion.length > 0 && (
            <Link to={`${rolBase}/ordenes`}
              className="flex items-center gap-3 rounded-xl border border-cyan-200 bg-cyan-50 px-4 py-3 transition hover:bg-cyan-100">
              <Zap size={17} className="shrink-0 text-cyan-600" />
              <div className="flex-1">
                <p className="text-sm font-bold text-cyan-800">{pendientesAprobacion.length} OT(s) esperando aprobación</p>
                <p className="text-xs text-cyan-600">Revisar y aprobar para enviar a fábrica</p>
              </div>
              <ArrowRight size={14} className="text-cyan-400" />
            </Link>
          )}
          {conProblema.length > 0 && (
            <Link to={`${rolBase}/ordenes`}
              className="flex items-center gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 transition hover:bg-red-100">
              <AlertTriangle size={17} className="shrink-0 text-red-600" />
              <div className="flex-1">
                <p className="text-sm font-bold text-red-800">{conProblema.length} orden(es) con problema</p>
                <p className="text-xs text-red-600">Requieren atención inmediata</p>
              </div>
              <ArrowRight size={14} className="text-red-400" />
            </Link>
          )}
        </div>
      )}

      {/* KPIs principales */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[
          {
            label: 'Ingresos del Mes',
            value: fmt(ingresosMes),
            sub: `${ordenesMes} órdenes este mes`,
            icon: DollarSign, iconBg: 'bg-emerald-100', iconColor: 'text-emerald-600',
          },
          {
            label: 'Órdenes Activas',
            value: totalActivas,
            sub: `${enCampo.length} técnico(s) en campo`,
            icon: Package, iconBg: 'bg-blue-100', iconColor: 'text-blue-600',
          },
          {
            label: 'Cerradas este Mes',
            value: cerradasMes,
            sub: `${tasaCierre}% tasa de cierre`,
            icon: CheckCircle2, iconBg: 'bg-violet-100', iconColor: 'text-violet-600',
          },
          {
            label: 'En Campo',
            value: enCampo.length,
            sub: 'Técnicos activos ahora',
            icon: Navigation, iconBg: 'bg-amber-100', iconColor: 'text-amber-600',
          },
        ].map(s => (
          <div key={s.label} className="rounded-xl border border-slate-200 bg-white p-5">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-slate-500">{s.label}</span>
              <div className={`rounded-lg p-2 ${s.iconBg}`}><s.icon size={16} className={s.iconColor} /></div>
            </div>
            <p className="mt-2 text-2xl font-bold text-slate-900">{s.value}</p>
            <p className="mt-0.5 text-xs text-slate-400">{s.sub}</p>
          </div>
        ))}
      </div>

      {/* Pipeline por etapas */}
      <div className="rounded-xl border border-slate-200 bg-white p-5">
        <h2 className="mb-4 text-base font-semibold text-slate-900">Pipeline por Etapa</h2>
        <div className="grid grid-cols-5 gap-2">
          {etapaCounts.map((et, i) => (
            <div key={et.label}
              className={`rounded-xl border p-3 text-center ${et.border} ${et.light}`}>
              <p className={`text-[11px] font-bold uppercase tracking-wide ${et.text}`}>{et.label}</p>
              <p className="mt-1.5 text-3xl font-black text-slate-900">{et.count}</p>
              {/* Flecha */}
              {i < etapaCounts.length - 1 && (
                <div className="mt-1 flex justify-center">
                  <ArrowRight size={12} className="text-slate-300" />
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Pipeline detallado (estados individuales) */}
      <div className="rounded-xl border border-slate-200 bg-white p-5">
        <h2 className="mb-4 text-base font-semibold text-slate-900">Detalle por Estado</h2>
        <div className="grid grid-cols-3 gap-1.5 sm:grid-cols-4 lg:grid-cols-6">
          {PIPELINE_ESTADOS.map(e => {
            const cfg = ESTADO_CONFIG[e];
            const count = byEstado[e] || 0;
            if (!cfg) return null;
            return (
              <Link key={e} to={`${rolBase}/ordenes`}
                className={`rounded-lg border p-2.5 text-center transition hover:shadow-sm ${cfg.border} ${count > 0 ? '' : 'opacity-40'}`}>
                <span className={`text-[10px] font-semibold leading-tight ${cfg.color}`}>{cfg.label}</span>
                <p className="mt-1 text-2xl font-bold text-slate-900">{count}</p>
              </Link>
            );
          })}
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-5">
        {/* Acciones pendientes */}
        <div className="lg:col-span-2 space-y-4">
          <div className="rounded-xl border border-slate-200 bg-white p-5">
            <h2 className="mb-3 text-base font-semibold text-slate-900">Acciones Pendientes</h2>
            <div className="space-y-2">
              {sinFabricante.length > 0 && (
                <Link to={`${rolBase}/ordenes`}
                  className="flex items-center gap-3 rounded-xl bg-amber-50 p-3 transition hover:bg-amber-100">
                  <Factory size={15} className="shrink-0 text-amber-600" />
                  <span className="flex-1 text-sm font-medium text-amber-800">{sinFabricante.length} sin fabricante asignado</span>
                  <ArrowRight size={13} className="text-amber-400" />
                </Link>
              )}
              {sinInstalador.length > 0 && (
                <Link to={`${rolBase}/ordenes`}
                  className="flex items-center gap-3 rounded-xl bg-violet-50 p-3 transition hover:bg-violet-100">
                  <Wrench size={15} className="shrink-0 text-violet-600" />
                  <span className="flex-1 text-sm font-medium text-violet-800">{sinInstalador.length} sin instalador asignado</span>
                  <ArrowRight size={13} className="text-violet-400" />
                </Link>
              )}
              {sinFabricante.length === 0 && sinInstalador.length === 0 && conProblema.length === 0 && (
                <div className="rounded-xl bg-emerald-50 p-3">
                  <p className="flex items-center gap-2 text-sm font-medium text-emerald-700">
                    <CheckCircle2 size={15} /> Todo en orden
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Métricas de tiempos */}
          {summary?.metricas && (
            <div className="rounded-xl border border-slate-200 bg-white p-5">
              <h2 className="mb-3 text-base font-semibold text-slate-900">Tiempos Promedio</h2>
              <div className="space-y-2">
                {[
                  { label: 'Confirmación', h: summary.metricas.avg_h_confirmacion },
                  { label: 'Fabricación', h: summary.metricas.avg_h_fabricacion },
                  { label: 'Agendado', h: summary.metricas.avg_h_agendado },
                  { label: 'Instalación', h: summary.metricas.avg_h_instalacion },
                ].filter(x => x.h).map(x => (
                  <div key={x.label} className="flex items-center justify-between text-sm">
                    <span className="text-slate-600">{x.label}</span>
                    <span className="font-bold text-slate-800">
                      {x.h! < 24 ? `${x.h!.toFixed(1)}h` : `${(x.h! / 24).toFixed(1)} días`}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Órdenes recientes */}
        <div className="lg:col-span-3">
          <div className="rounded-xl border border-slate-200 bg-white p-5">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-base font-semibold text-slate-900">Órdenes Recientes</h2>
              <Link to={`${rolBase}/ordenes`}
                className="flex items-center gap-1 text-xs font-semibold hover:opacity-80"
                style={{ color: 'var(--brand-primary)' }}>
                Ver todas <ArrowRight size={12} />
              </Link>
            </div>
            <div className="space-y-1">
              {recientes.map(o => {
                const cfg = ESTADO_CONFIG[o.estado] || ESTADO_CONFIG.cotizacion;
                return (
                  <Link key={o.id} to={`${rolBase}/ordenes/${o.id}`}
                    className="flex items-center justify-between rounded-xl border border-transparent px-3 py-2.5 transition hover:border-slate-200 hover:bg-slate-50">
                    <div className="min-w-0">
                      <p className="text-sm font-bold text-slate-800">OT #{o.numero}</p>
                      <p className="truncate text-xs text-slate-400">
                        {o.cliente_nombre || '—'} · {o.productos?.length || 0} prod. · {fmtDate(o.created_at)}
                      </p>
                    </div>
                    <div className="ml-2 flex shrink-0 items-center gap-2">
                      <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${cfg.bg} ${cfg.color}`}>{cfg.label}</span>
                      <span className="text-xs font-bold text-slate-700">{fmt(o.precio_total)}</span>
                    </div>
                  </Link>
                );
              })}
              {recientes.length === 0 && (
                <p className="py-8 text-center text-sm text-slate-400">Sin órdenes aún</p>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Acceso rápido — Nueva Cotización */}
      <div className="rounded-xl border border-dashed border-amber-300/70 bg-amber-50 px-5 py-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="font-bold text-amber-900">¿Nuevo cliente?</p>
          <p className="text-xs text-amber-700">Inicia una cotización y guía la venta hasta el cierre</p>
        </div>
        <Link to={`/${user?.rol || 'jefe'}/cotizaciones`}
          className="inline-flex items-center gap-1.5 rounded-full bg-amber-500 px-4 py-2 text-sm font-bold text-white shadow-sm shadow-amber-500/30 transition hover:bg-amber-400">
          Ver Cotizaciones
        </Link>
      </div>
    </div>
  );
}
