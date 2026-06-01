import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useApi } from '../../hooks/useApi';
import { api } from '../../services/api';
import { ESTADO_CONFIG, PIPELINE_ESTADOS } from '../../types';
import { Spinner, ErrorMessage } from '../../components/LoadingStates';
import {
  TrendingUp, TrendingDown, Package, CheckCircle2, AlertTriangle,
  ArrowRight, Factory, Navigation, Wrench, Zap, DollarSign,
  RefreshCw, BarChart3, Target, Activity, Clock, Users,
} from 'lucide-react';

const fmt = (n: number) => '$' + n.toLocaleString('es-CL');
const fmtDate = (s: string) => s ? new Date(s).toLocaleDateString('es-CL') : '—';

const ETAPAS = [
  {
    label: 'Ventas',
    gradient: 'from-sky-400 to-sky-600',
    badgeBg: 'bg-sky-500/10',
    badgeText: 'text-sky-400',
    estados: ['cotizacion', 'cotizacion_enviada', 'aceptada', 'cotizado'],
  },
  {
    label: 'Revisión OT',
    gradient: 'from-cyan-400 to-cyan-600',
    badgeBg: 'bg-cyan-500/10',
    badgeText: 'text-cyan-400',
    estados: ['ot_creada', 'aprobada'],
  },
  {
    label: 'Fabricación',
    gradient: 'from-amber-400 to-amber-600',
    badgeBg: 'bg-amber-500/10',
    badgeText: 'text-amber-400',
    estados: ['en_fabricacion', 'listo_para_instalar', 'fabricado'],
  },
  {
    label: 'Instalación',
    gradient: 'from-violet-400 to-violet-600',
    badgeBg: 'bg-violet-500/10',
    badgeText: 'text-violet-400',
    estados: ['instalacion_programada', 'en_camino', 'instalando', 'instalacion_completada', 'agendado', 'en_ruta', 'en_instalacion', 'pendiente_firma'],
  },
  {
    label: 'Cerradas',
    gradient: 'from-emerald-400 to-emerald-600',
    badgeBg: 'bg-emerald-500/10',
    badgeText: 'text-emerald-400',
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
  const { data: averiaStats } = useApi(() => api.getAveriaStats());

  const loading = loadingSum || loadingOrd;
  const error = errSum || errOrd;

  if (loading) return <Spinner />;
  if (error) return <ErrorMessage message={error} onRetry={() => { refetchSum(); refetchOrd(); }} />;

  const orderList: any[] = orders || [];
  const byEstado: Record<string, number> = summary?.por_estado || {};

  // Computed data
  const sinFabricante = orderList.filter(o => ['ot_creada', 'aprobada', 'confirmado'].includes(o.estado) && !o.fabricante_id);
  const sinInstalador = orderList.filter(o => ['listo_para_instalar', 'fabricado'].includes(o.estado) && !o.instalador_id);
  const conProblema = orderList.filter(o => o.estado === 'problema');
  const enCampo = orderList.filter(o => ['en_camino', 'instalando', 'en_ruta', 'en_instalacion'].includes(o.estado));
  const pendientesAprobacion = orderList.filter(o => o.estado === 'ot_creada');

  const etapaCounts = ETAPAS.map(et => ({
    ...et,
    count: et.estados.reduce((acc, e) => acc + (byEstado[e] || 0), 0),
  }));
  const totalActivas = etapaCounts.slice(0, 4).reduce((a, e) => a + e.count, 0);
  const totalPipeline = etapaCounts.reduce((a, e) => a + e.count, 0);

  const recientes = [...orderList]
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    .slice(0, 8);

  const ingresosMes = summary?.ingresos_mes || 0;
  const ordenesMes = summary?.ordenes_mes || 0;
  const cerradasMes = summary?.cerradas_mes || 0;
  const tasaCierre = summary?.tasa_cierre || 0;

  const rolBase = user?.rol === 'gerente' ? '/gerente' : user?.rol === 'coordinador' ? '/coordinador' : '/jefe';

  const hasCriticalAlerts = pendientesAprobacion.length > 0 || conProblema.length > 0;
  const hasActionAlerts = sinFabricante.length > 0 || sinInstalador.length > 0 || conProblema.length > 0 || (averiaStats?.abiertas || 0) > 0;

  return (
    <div className="space-y-5">
      {/* Page header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-black text-slate-100 tracking-tight">Dashboard</h1>
          <p className="mt-0.5 text-sm text-slate-400">
            Vista general · <span className="font-medium text-slate-300">{tenant?.nombre}</span>
          </p>
        </div>
        <button
          onClick={() => { refetchSum(); refetchOrd(); }}
          className="flex items-center gap-1.5 rounded-xl border border-[rgba(255,255,255,0.08)] bg-[rgba(255,255,255,0.04)] px-3 py-2 text-xs font-semibold text-slate-300 transition hover:bg-[rgba(255,255,255,0.08)] hover:border-[rgba(255,255,255,0.15)]"
        >
          <RefreshCw size={13} />
          Actualizar
        </button>
      </div>

      {/* Critical alerts banner row */}
      {hasCriticalAlerts && (
        <div className="grid gap-3 sm:grid-cols-2">
          {pendientesAprobacion.length > 0 && (
            <Link
              to={`${rolBase}/ordenes`}
              className="flex items-center gap-3 rounded-2xl px-4 py-3 transition hover:opacity-90"
              style={{ background: 'linear-gradient(135deg, #06b6d4, #0284c7)' }}
            >
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-white/20">
                <Zap size={16} className="text-white" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold text-white">
                  {pendientesAprobacion.length} OT{pendientesAprobacion.length > 1 ? 's' : ''} esperando aprobación
                </p>
                <p className="text-xs text-cyan-100">Revisar y aprobar para enviar a fábrica</p>
              </div>
              <ArrowRight size={15} className="text-white/70 shrink-0" />
            </Link>
          )}
          {conProblema.length > 0 && (
            <Link
              to={`${rolBase}/ordenes`}
              className="flex items-center gap-3 rounded-2xl px-4 py-3 transition hover:opacity-90"
              style={{ background: 'linear-gradient(135deg, #ef4444, #dc2626)' }}
            >
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-white/20">
                <AlertTriangle size={16} className="text-white" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold text-white">
                  {conProblema.length} orden{conProblema.length > 1 ? 'es' : ''} con problema
                </p>
                <p className="text-xs text-red-100">Requieren atención inmediata</p>
              </div>
              <ArrowRight size={15} className="text-white/70 shrink-0" />
            </Link>
          )}
        </div>
      )}

      {/* KPI cards */}
      <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
        {/* Ingresos */}
        <div className="relative overflow-hidden rounded-2xl p-5 shadow-sm bg-gradient-to-br from-emerald-500 to-emerald-600">
          <div className="absolute -top-4 -right-4 h-20 w-20 rounded-full bg-white/10" />
          <div className="absolute -bottom-6 -right-2 h-28 w-28 rounded-full bg-white/10" />
          <div className="relative z-10">
            <div className="flex items-center justify-between mb-3">
              <p className="text-[12px] font-semibold text-emerald-100 uppercase tracking-wide">Ingresos del Mes</p>
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-white/20">
                <DollarSign size={14} className="text-white" />
              </div>
            </div>
            <p className="text-3xl font-black text-white leading-none">{fmt(ingresosMes)}</p>
            <div className="mt-2 flex items-center gap-1">
              <div className="flex items-center gap-0.5 rounded-full bg-white/20 px-1.5 py-0.5">
                <TrendingUp size={10} className="text-white" />
                <span className="text-[10px] font-bold text-white">{ordenesMes}</span>
              </div>
              <span className="text-[11px] text-emerald-100">órdenes este mes</span>
            </div>
          </div>
        </div>

        {/* Órdenes activas */}
        <div className="relative overflow-hidden rounded-2xl p-5 shadow-sm bg-gradient-to-br from-blue-500 to-blue-600">
          <div className="absolute -top-4 -right-4 h-20 w-20 rounded-full bg-white/10" />
          <div className="absolute -bottom-6 -right-2 h-28 w-28 rounded-full bg-white/10" />
          <div className="relative z-10">
            <div className="flex items-center justify-between mb-3">
              <p className="text-[12px] font-semibold text-blue-100 uppercase tracking-wide">Órdenes Activas</p>
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-white/20">
                <Package size={14} className="text-white" />
              </div>
            </div>
            <p className="text-3xl font-black text-white leading-none">{totalActivas}</p>
            <div className="mt-2 flex items-center gap-1">
              <div className="flex items-center gap-0.5 rounded-full bg-white/20 px-1.5 py-0.5">
                <Activity size={10} className="text-white" />
                <span className="text-[10px] font-bold text-white">{enCampo.length}</span>
              </div>
              <span className="text-[11px] text-blue-100">técnicos en campo</span>
            </div>
          </div>
        </div>

        {/* Cerradas */}
        <div className="relative overflow-hidden rounded-2xl p-5 shadow-sm bg-gradient-to-br from-violet-500 to-violet-600">
          <div className="absolute -top-4 -right-4 h-20 w-20 rounded-full bg-white/10" />
          <div className="absolute -bottom-6 -right-2 h-28 w-28 rounded-full bg-white/10" />
          <div className="relative z-10">
            <div className="flex items-center justify-between mb-3">
              <p className="text-[12px] font-semibold text-violet-100 uppercase tracking-wide">Cerradas este Mes</p>
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-white/20">
                <CheckCircle2 size={14} className="text-white" />
              </div>
            </div>
            <p className="text-3xl font-black text-white leading-none">{cerradasMes}</p>
            <div className="mt-2 flex items-center gap-1">
              <div className="flex items-center gap-0.5 rounded-full bg-white/20 px-1.5 py-0.5">
                <Target size={10} className="text-white" />
                <span className="text-[10px] font-bold text-white">{tasaCierre}%</span>
              </div>
              <span className="text-[11px] text-violet-100">tasa de cierre</span>
            </div>
          </div>
        </div>

        {/* En campo */}
        <div className="relative overflow-hidden rounded-2xl p-5 shadow-sm bg-gradient-to-br from-amber-500 to-amber-600">
          <div className="absolute -top-4 -right-4 h-20 w-20 rounded-full bg-white/10" />
          <div className="absolute -bottom-6 -right-2 h-28 w-28 rounded-full bg-white/10" />
          <div className="relative z-10">
            <div className="flex items-center justify-between mb-3">
              <p className="text-[12px] font-semibold text-amber-100 uppercase tracking-wide">En Campo Ahora</p>
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-white/20">
                <Navigation size={14} className="text-white" />
              </div>
            </div>
            <p className="text-3xl font-black text-white leading-none">{enCampo.length}</p>
            <div className="mt-2 flex items-center gap-1">
              <div className="flex items-center gap-0.5 rounded-full bg-white/20 px-1.5 py-0.5">
                <Users size={10} className="text-white" />
                <span className="text-[10px] font-bold text-white">Live</span>
              </div>
              <span className="text-[11px] text-amber-100">técnicos activos</span>
            </div>
          </div>
        </div>
      </div>

      {/* Pipeline visual — horizontal bars */}
      <div className="rounded-2xl border border-[rgba(255,255,255,0.07)] bg-[rgba(10,16,32,0.9)] p-6 shadow-[0_32px_80px_rgba(0,0,0,0.5)] backdrop-blur-xl">
        <div className="mb-5 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-[rgba(255,255,255,0.06)]">
              <BarChart3 size={14} className="text-slate-400" />
            </div>
            <h2 className="text-base font-bold text-slate-100">Pipeline de Producción</h2>
          </div>
          <span className="text-xs font-semibold text-slate-400">{totalPipeline} órdenes total</span>
        </div>
        <div className="space-y-3">
          {etapaCounts.map(et => {
            const pct = totalPipeline > 0 ? Math.round((et.count / totalPipeline) * 100) : 0;
            return (
              <div key={et.label} className="flex items-center gap-3">
                <span className="min-w-[110px] text-[12px] font-semibold text-slate-400 truncate">{et.label}</span>
                <div className="flex-1 h-2 rounded-full bg-[rgba(255,255,255,0.06)] overflow-hidden">
                  <div
                    className={`h-full rounded-full bg-gradient-to-r ${et.gradient} transition-all duration-500`}
                    style={{ width: `${Math.max(pct, et.count > 0 ? 3 : 0)}%` }}
                  />
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span className="w-7 text-right text-sm font-black text-slate-100">{et.count}</span>
                  <span className={`rounded-full px-1.5 py-0.5 text-[10px] font-bold ${et.badgeBg} ${et.badgeText} leading-none`}>
                    {pct}%
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Two-column layout */}
      <div className="grid gap-5 lg:grid-cols-5">
        {/* Left column */}
        <div className="lg:col-span-2 space-y-5">
          {/* Acción requerida */}
          <div className="rounded-2xl border border-[rgba(255,255,255,0.07)] bg-[rgba(10,16,32,0.9)] p-5 shadow-[0_32px_80px_rgba(0,0,0,0.5)] backdrop-blur-xl">
            <div className="mb-4 flex items-center gap-2">
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-rose-500/10">
                <AlertTriangle size={14} className="text-rose-400" />
              </div>
              <h2 className="text-base font-bold text-slate-100">Acción Requerida</h2>
            </div>

            {hasActionAlerts ? (
              <div className="space-y-2">
                {sinFabricante.length > 0 && (
                  <Link
                    to={`${rolBase}/ordenes`}
                    className="flex items-center gap-3 rounded-xl bg-amber-500/10 border border-amber-500/20 px-3 py-2.5 transition hover:bg-amber-500/20 group"
                  >
                    <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-amber-500/20 transition-colors">
                      <Factory size={13} className="text-amber-400" />
                    </div>
                    <span className="flex-1 text-[13px] font-semibold text-amber-300">
                      {sinFabricante.length} sin fabricante asignado
                    </span>
                    <ArrowRight size={13} className="text-amber-500 shrink-0" />
                  </Link>
                )}
                {sinInstalador.length > 0 && (
                  <Link
                    to={`${rolBase}/ordenes`}
                    className="flex items-center gap-3 rounded-xl bg-violet-500/10 border border-violet-500/20 px-3 py-2.5 transition hover:bg-violet-500/20 group"
                  >
                    <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-violet-500/20 transition-colors">
                      <Wrench size={13} className="text-violet-400" />
                    </div>
                    <span className="flex-1 text-[13px] font-semibold text-violet-300">
                      {sinInstalador.length} sin instalador asignado
                    </span>
                    <ArrowRight size={13} className="text-violet-500 shrink-0" />
                  </Link>
                )}
                {conProblema.length > 0 && (
                  <Link
                    to={`${rolBase}/ordenes`}
                    className="flex items-center gap-3 rounded-xl bg-red-500/10 border border-red-500/20 px-3 py-2.5 transition hover:bg-red-500/20 group"
                  >
                    <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-red-500/20 transition-colors">
                      <AlertTriangle size={13} className="text-red-400" />
                    </div>
                    <span className="flex-1 text-[13px] font-semibold text-red-300">
                      {conProblema.length} orden{conProblema.length > 1 ? 'es' : ''} con problema
                    </span>
                    <ArrowRight size={13} className="text-red-500 shrink-0" />
                  </Link>
                )}
                {averiaStats && averiaStats.abiertas > 0 && (
                  <Link
                    to={`${rolBase}/averias`}
                    className="flex items-center gap-3 rounded-xl bg-orange-500/10 border border-orange-500/20 px-3 py-2.5 transition hover:bg-orange-500/20 group"
                  >
                    <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-orange-500/20 transition-colors">
                      <Wrench size={13} className="text-orange-400" />
                    </div>
                    <span className="flex-1 text-[13px] font-semibold text-orange-300">
                      {averiaStats.abiertas} avería{averiaStats.abiertas > 1 ? 's' : ''} abierta{averiaStats.abiertas > 1 ? 's' : ''}
                      {averiaStats.criticas > 0 && ` (${averiaStats.criticas} crítica${averiaStats.criticas > 1 ? 's' : ''})`}
                    </span>
                    <ArrowRight size={13} className="text-orange-500 shrink-0" />
                  </Link>
                )}
              </div>
            ) : (
              <div className="flex items-center gap-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 px-3 py-3">
                <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-emerald-500/20">
                  <CheckCircle2 size={14} className="text-emerald-400" />
                </div>
                <div>
                  <p className="text-[13px] font-bold text-emerald-300">Todo al día</p>
                  <p className="text-[11px] text-emerald-500">Sin acciones pendientes ahora</p>
                </div>
              </div>
            )}
          </div>

          {/* Tiempos promedio */}
          {summary?.metricas && (
            <div className="rounded-2xl border border-[rgba(255,255,255,0.07)] bg-[rgba(10,16,32,0.9)] p-5 shadow-[0_32px_80px_rgba(0,0,0,0.5)] backdrop-blur-xl">
              <div className="mb-4 flex items-center gap-2">
                <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-blue-500/10">
                  <Clock size={14} className="text-blue-400" />
                </div>
                <h2 className="text-base font-bold text-slate-100">Tiempos Promedio</h2>
              </div>
              <div className="space-y-2">
                {[
                  { label: 'Confirmación', h: summary.metricas.avg_h_confirmacion },
                  { label: 'Fabricación', h: summary.metricas.avg_h_fabricacion },
                  { label: 'Agendado', h: summary.metricas.avg_h_agendado },
                  { label: 'Instalación', h: summary.metricas.avg_h_instalacion },
                ]
                  .filter(x => x.h)
                  .map(x => (
                    <div key={x.label} className="flex items-center justify-between py-1.5 border-b border-[rgba(255,255,255,0.05)] last:border-0">
                      <span className="text-[13px] text-slate-400">{x.label}</span>
                      <span className="text-[13px] font-bold text-slate-100 tabular-nums">
                        {x.h! < 24 ? `${x.h!.toFixed(1)}h` : `${(x.h! / 24).toFixed(1)} días`}
                      </span>
                    </div>
                  ))}
              </div>
            </div>
          )}
        </div>

        {/* Right column — Actividad reciente */}
        <div className="lg:col-span-3">
          <div className="rounded-2xl border border-[rgba(255,255,255,0.07)] bg-[rgba(10,16,32,0.9)] p-5 shadow-[0_32px_80px_rgba(0,0,0,0.5)] backdrop-blur-xl h-full">
            <div className="mb-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-slate-100">
                  <Activity size={14} className="text-slate-400" />
                </div>
                <h2 className="text-base font-bold text-slate-100">Actividad Reciente</h2>
              </div>
              <Link
                to={`${rolBase}/ordenes`}
                className="flex items-center gap-1 text-xs font-bold transition hover:opacity-70"
                style={{ color: 'var(--brand-primary)' }}
              >
                Ver todas <ArrowRight size={12} />
              </Link>
            </div>

            <div className="divide-y divide-[rgba(255,255,255,0.05)]">
              {recientes.map(o => {
                const cfg = ESTADO_CONFIG[o.estado] || ESTADO_CONFIG.cotizacion;
                return (
                  <Link
                    key={o.id}
                    to={`${rolBase}/ordenes/${o.id}`}
                    className="flex items-center gap-3 rounded-xl px-2 py-2.5 transition hover:bg-[rgba(255,255,255,0.03)] group"
                  >
                    {/* Status dot */}
                    <div className={`h-2.5 w-2.5 shrink-0 rounded-full ${cfg.dot}`} />
                    {/* Info */}
                    <div className="min-w-0 flex-1">
                      <div className="flex items-baseline gap-2">
                        <p className="text-[13px] font-bold text-slate-200 group-hover:text-slate-100">
                          OT #{o.numero}
                        </p>
                        <p className="truncate text-[11px] text-slate-500">
                          {o.cliente_nombre || '—'}
                        </p>
                      </div>
                      <p className="text-[11px] text-slate-500 mt-0.5">{fmtDate(o.created_at)}</p>
                    </div>
                    {/* Right side */}
                    <div className="ml-2 flex shrink-0 flex-col items-end gap-1">
                      <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold leading-none ${cfg.bg} ${cfg.color}`}>
                        {cfg.label}
                      </span>
                      <span className="text-[11px] font-bold text-slate-300 tabular-nums">
                        {fmt(o.precio_total)}
                      </span>
                    </div>
                  </Link>
                );
              })}

              {recientes.length === 0 && (
                <div className="flex flex-col items-center justify-center py-12 text-slate-600">
                  <Package size={32} strokeWidth={1.5} />
                  <p className="mt-3 text-sm font-medium text-slate-500">Sin órdenes aún</p>
                  <p className="text-xs text-slate-600 mt-0.5">Las órdenes aparecerán aquí</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Quick action — Nueva cotización */}
      <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl px-6 py-4 shadow-sm" style={{ background: 'linear-gradient(135deg, #f59e0b, #f97316)' }}>
        <div>
          <p className="font-black text-white text-base">¿Nuevo cliente?</p>
          <p className="text-sm text-amber-100 mt-0.5">Inicia una cotización y guía la venta hasta el cierre</p>
        </div>
        <Link
          to={`/${user?.rol || 'jefe'}/cotizaciones`}
          className="inline-flex items-center gap-2 rounded-xl bg-white/20 px-5 py-2.5 text-sm font-bold text-white shadow-sm backdrop-blur-sm border border-white/30 transition hover:bg-white/30"
        >
          Ver Cotizaciones
          <ArrowRight size={14} />
        </Link>
      </div>
    </div>
  );
}
