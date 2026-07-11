import { Link, useNavigate, useMatch } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useApi } from '../../hooks/useApi';
import { api } from '../../services/api';
import { ESTADO_CONFIG, PIPELINE_ESTADOS } from '../../types';
import { Spinner, ErrorMessage } from '../../components/LoadingStates';
import {
  TrendingUp, Package, CheckCircle2, AlertTriangle,
  ArrowRight, Factory, Navigation, Wrench, Zap, DollarSign,
  RefreshCw, BarChart3, Activity, Clock, Users,
} from 'lucide-react';

const fmt = (n: number) => '$' + n.toLocaleString('es-CL');
const fmtDate = (s: string) => s ? new Date(s).toLocaleDateString('es-CL') : '—';

const ETAPAS = [
  { label: 'Ventas',        gradient: 'from-sky-400 to-sky-600',     bar: 'bg-sky-500',    badge: 'bg-sky-500/15 text-sky-400',    estados: ['cotizacion','cotizacion_enviada','aceptada','cotizado'] },
  { label: 'Revisión OT',   gradient: 'from-cyan-400 to-cyan-600',   bar: 'bg-cyan-500',   badge: 'bg-cyan-500/15 text-cyan-400',  estados: ['ot_creada','aprobada'] },
  { label: 'Fabricación',   gradient: 'from-amber-400 to-amber-600', bar: 'bg-amber-500',  badge: 'bg-amber-500/15 text-amber-400',estados: ['en_fabricacion','listo_para_instalar','fabricado'] },
  { label: 'Instalación',   gradient: 'from-violet-400 to-violet-600',bar: 'bg-violet-500', badge: 'bg-violet-500/15 text-violet-400',estados: ['instalacion_programada','en_camino','instalando','instalacion_completada','agendado','en_ruta','en_instalacion','pendiente_firma'] },
  { label: 'Cerradas',      gradient: 'from-emerald-400 to-emerald-600',bar: 'bg-emerald-500',badge: 'bg-emerald-500/15 text-emerald-400',estados: ['cerrada','cerrado'] },
];

export default function JefeDashboard() {
  const { user, tenant } = useAuth();

  const nav = useNavigate();
  const isGerente = !!useMatch('/gerente/*');
  const base = isGerente ? '/gerente' : '/jefe';
  const { data: summary, loading: loadingSum, error: errSum, refetch: refetchSum } = useApi(() => api.getDashboardSummary());
  const { data: orders, loading: loadingOrd, error: errOrd, refetch: refetchOrd } = useApi(() => api.getOrders());
  const { data: averiaStats } = useApi(() => api.getAveriaStats());

  const loading = loadingSum || loadingOrd;
  const error = errSum || errOrd;

  if (loading) return <Spinner />;
  if (error) return <ErrorMessage message={error} onRetry={() => { refetchSum(); refetchOrd(); }} />;

  const orderList: any[] = orders || [];
  const byEstado: Record<string, number> = summary?.por_estado || {};

  const sinFabricante    = orderList.filter(o => ['ot_creada','aprobada','confirmado'].includes(o.estado) && !o.fabricante_id);
  const sinInstalador    = orderList.filter(o => ['listo_para_instalar','fabricado'].includes(o.estado) && !o.instalador_id);
  const conProblema      = orderList.filter(o => o.estado === 'problema');
  const enCampo          = orderList.filter(o => ['en_camino','instalando','en_ruta','en_instalacion'].includes(o.estado));
  const pendientesAprob  = orderList.filter(o => o.estado === 'ot_creada');

  const etapaCounts = ETAPAS.map(et => ({
    ...et,
    count: et.estados.reduce((acc, e) => acc + (byEstado[e] || 0), 0),
  }));
  const totalPipeline = etapaCounts.reduce((a, e) => a + e.count, 0);
  const totalActivas  = etapaCounts.slice(0, 4).reduce((a, e) => a + e.count, 0);

  const recientes = [...orderList]
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    .slice(0, 8);

  const ingresosMes = summary?.ingresos_mes  || 0;
  const ordenesMes  = summary?.ordenes_mes   || 0;
  const cerradasMes = summary?.cerradas_mes  || 0;
  const tasaCierre  = summary?.tasa_cierre   || 0;

  const rolBase = user?.rol === 'gerente' ? '/gerente' : user?.rol === 'coordinador' ? '/coordinador' : '/jefe';
  const hasAlerts = sinFabricante.length > 0 || sinInstalador.length > 0 || conProblema.length > 0 || (averiaStats?.abiertas || 0) > 0;

  const hour = new Date().getHours();
  const greeting = hour < 13 ? 'Buenos días' : hour < 20 ? 'Buenas tardes' : 'Buenas noches';

  return (
    <div className="space-y-5">

      {/* ── Hero header ── */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-[#0e0e2a] via-[#111136] to-[#0a0d1e] p-7 shadow-2xl">
        <div className="pointer-events-none absolute -right-20 -top-20 h-56 w-56 rounded-full bg-indigo-600/20 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-16 left-0 h-48 w-48 rounded-full bg-violet-600/15 blur-3xl" />
        <div className="pointer-events-none absolute right-1/3 top-1/2 h-32 w-32 -translate-y-1/2 rounded-full bg-indigo-400/8 blur-2xl" />

        <div className="relative flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-sm text-indigo-300/70 font-medium">{greeting}, <span className="text-indigo-200">{user?.nombre?.split(' ')[0] || 'Jefe'}</span></p>
            <h1 className="mt-1 text-2xl font-black text-white">
              <span className="bg-gradient-to-r from-indigo-300 via-violet-300 to-purple-300 bg-clip-text text-transparent">{tenant?.nombre || 'Dashboard'}</span>
            </h1>
            <p className="mt-1 text-xs text-slate-500 font-mono">/{tenant?.slug || '—'} · {new Date().toLocaleDateString('es-CL', { weekday: 'long', day: 'numeric', month: 'long' })}</p>
          </div>
          <button
            onClick={() => { refetchSum(); refetchOrd(); }}
            className="flex items-center gap-1.5 rounded-xl border border-white/10 bg-white/[0.06] px-3 py-2 text-xs font-semibold text-slate-300 transition hover:bg-white/10 hover:border-white/20 hover:text-white"
          >
            <RefreshCw size={13} /> Actualizar
          </button>
        </div>

        {/* Critical banners */}
        {(pendientesAprob.length > 0 || conProblema.length > 0) && (
          <div className="relative mt-5 grid gap-2 sm:grid-cols-2">
            {pendientesAprob.length > 0 && (
              <Link to={`${rolBase}/ordenes`}
                className="flex items-center gap-3 rounded-xl border border-cyan-500/30 bg-cyan-500/10 px-4 py-3 transition hover:bg-cyan-500/15">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-cyan-500/20">
                  <Zap size={15} className="text-cyan-300" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold text-cyan-200">{pendientesAprob.length} OT{pendientesAprob.length > 1 ? 's' : ''} esperando aprobación</p>
                  <p className="text-xs text-cyan-400/70">Revisar para enviar a fábrica</p>
                </div>
                <ArrowRight size={14} className="text-cyan-400 shrink-0" />
              </Link>
            )}
            {conProblema.length > 0 && (
              <Link to={`${rolBase}/ordenes`}
                className="flex items-center gap-3 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 transition hover:bg-red-500/15">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-red-500/20">
                  <AlertTriangle size={15} className="text-red-300" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold text-red-200">{conProblema.length} orden{conProblema.length > 1 ? 'es' : ''} con problema</p>
                  <p className="text-xs text-red-400/70">Requieren atención inmediata</p>
                </div>
                <ArrowRight size={14} className="text-red-400 shrink-0" />
              </Link>
            )}
          </div>
        )}
      </div>

      {/* ── KPI cards ── */}
      <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
        {[
          {
            label: 'Ingresos del Mes', value: fmt(ingresosMes),
            sub: `${ordenesMes} órdenes`, icon: DollarSign,
            color: 'text-emerald-400', border: 'border-emerald-500/20', bg: 'bg-emerald-500/10', iconBg: 'bg-emerald-500/20',
          },
          {
            label: 'Órdenes Activas', value: totalActivas,
            sub: `${enCampo.length} en campo`, icon: Package, to: `${base}/ordenes`,
            color: 'text-indigo-400', border: 'border-indigo-500/20', bg: 'bg-indigo-500/10', iconBg: 'bg-indigo-500/20',
          },
          {
            label: 'Cerradas este Mes', value: cerradasMes,
            sub: `${tasaCierre}% tasa cierre`, icon: CheckCircle2, to: `${base}/ordenes?estado=cerrada`,
            color: 'text-violet-400', border: 'border-violet-500/20', bg: 'bg-violet-500/10', iconBg: 'bg-violet-500/20',
          },
          {
            label: 'En Campo Ahora', value: enCampo.length,
            sub: 'técnicos activos', icon: Navigation,
            color: 'text-amber-400', border: 'border-amber-500/20', bg: 'bg-amber-500/10', iconBg: 'bg-amber-500/20',
          },
        ].map(k => (
          <div key={k.label} onClick={() => (k as any).to && nav((k as any).to)} className={`rounded-2xl border ${k.border} ${k.bg} p-5 backdrop-blur-sm ${(k as any).to ? 'cursor-pointer transition hover:brightness-125' : ''}`}>
            <div className="flex items-start justify-between mb-3">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">{k.label}</p>
              <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-xl ${k.iconBg}`}>
                <k.icon size={15} className={k.color} />
              </div>
            </div>
            <p className={`text-3xl font-black leading-none ${k.color}`}>{k.value}</p>
            <p className="mt-2 text-[11px] text-slate-500">{k.sub}</p>
          </div>
        ))}
      </div>

      {/* ── Pipeline ── */}
      <div className="rounded-2xl border border-white/[0.07] bg-[rgba(10,14,28,0.85)] p-6 backdrop-blur-xl shadow-xl">
        <div className="mb-5 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-xl border border-white/10 bg-white/[0.06]">
              <BarChart3 size={15} className="text-slate-400" />
            </div>
            <h2 className="text-sm font-bold text-white">Pipeline de Producción</h2>
          </div>
          <span className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-[11px] font-semibold text-slate-400">
            {totalPipeline} total
          </span>
        </div>
        <div className="space-y-3">
          {etapaCounts.map(et => {
            const pct = totalPipeline > 0 ? (et.count / totalPipeline) * 100 : 0;
            return (
              <div key={et.label} className="flex items-center gap-3">
                <span className="w-28 shrink-0 text-[12px] font-medium text-slate-400 truncate">{et.label}</span>
                <div className="flex-1 h-1.5 rounded-full bg-white/[0.06] overflow-hidden">
                  <div
                    className={`h-full rounded-full bg-gradient-to-r ${et.gradient} transition-all duration-700`}
                    style={{ width: `${Math.max(pct, et.count > 0 ? 2 : 0)}%` }}
                  />
                </div>
                <div className="flex items-center gap-2 shrink-0 w-16 justify-end">
                  <span className="text-sm font-black text-white tabular-nums">{et.count}</span>
                  <span className={`rounded-full px-1.5 py-0.5 text-[10px] font-bold leading-none ${et.badge}`}>{Math.round(pct)}%</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ── Two columns ── */}
      <div className="grid gap-5 lg:grid-cols-5">

        {/* Left — alerts + tiempos */}
        <div className="lg:col-span-2 space-y-5">
          <div className="rounded-2xl border border-white/[0.07] bg-[rgba(10,14,28,0.85)] p-5 backdrop-blur-xl shadow-xl">
            <div className="mb-4 flex items-center gap-2.5">
              <div className="flex h-8 w-8 items-center justify-center rounded-xl border border-rose-500/30 bg-rose-500/10">
                <AlertTriangle size={14} className="text-rose-400" />
              </div>
              <h2 className="text-sm font-bold text-white">Acción Requerida</h2>
            </div>
            {hasAlerts ? (
              <div className="space-y-2">
                {sinFabricante.length > 0 && (
                  <Link to={`${rolBase}/ordenes`}
                    className="flex items-center gap-3 rounded-xl border border-amber-500/20 bg-amber-500/[0.08] px-3 py-2.5 transition hover:bg-amber-500/15">
                    <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-amber-500/20"><Factory size={13} className="text-amber-400" /></div>
                    <span className="flex-1 text-[13px] font-semibold text-amber-300">{sinFabricante.length} sin fabricante</span>
                    <ArrowRight size={12} className="text-amber-500 shrink-0" />
                  </Link>
                )}
                {sinInstalador.length > 0 && (
                  <Link to={`${rolBase}/ordenes`}
                    className="flex items-center gap-3 rounded-xl border border-violet-500/20 bg-violet-500/[0.08] px-3 py-2.5 transition hover:bg-violet-500/15">
                    <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-violet-500/20"><Wrench size={13} className="text-violet-400" /></div>
                    <span className="flex-1 text-[13px] font-semibold text-violet-300">{sinInstalador.length} sin instalador</span>
                    <ArrowRight size={12} className="text-violet-500 shrink-0" />
                  </Link>
                )}
                {conProblema.length > 0 && (
                  <Link to={`${rolBase}/ordenes`}
                    className="flex items-center gap-3 rounded-xl border border-red-500/20 bg-red-500/[0.08] px-3 py-2.5 transition hover:bg-red-500/15">
                    <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-red-500/20"><AlertTriangle size={13} className="text-red-400" /></div>
                    <span className="flex-1 text-[13px] font-semibold text-red-300">{conProblema.length} con problema</span>
                    <ArrowRight size={12} className="text-red-500 shrink-0" />
                  </Link>
                )}
                {(averiaStats?.abiertas || 0) > 0 && (
                  <Link to={`${rolBase}/averias`}
                    className="flex items-center gap-3 rounded-xl border border-orange-500/20 bg-orange-500/[0.08] px-3 py-2.5 transition hover:bg-orange-500/15">
                    <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-orange-500/20"><Wrench size={13} className="text-orange-400" /></div>
                    <span className="flex-1 text-[13px] font-semibold text-orange-300">
                      {averiaStats.abiertas} avería{averiaStats.abiertas > 1 ? 's' : ''}{averiaStats.criticas > 0 ? ` (${averiaStats.criticas} crítica${averiaStats.criticas > 1 ? 's' : ''})` : ''}
                    </span>
                    <ArrowRight size={12} className="text-orange-500 shrink-0" />
                  </Link>
                )}
              </div>
            ) : (
              <div className="flex items-center gap-3 rounded-xl border border-emerald-500/20 bg-emerald-500/[0.08] px-3 py-3">
                <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-emerald-500/20">
                  <CheckCircle2 size={14} className="text-emerald-400" />
                </div>
                <div>
                  <p className="text-[13px] font-bold text-emerald-300">Todo al día</p>
                  <p className="text-[11px] text-emerald-500">Sin acciones pendientes</p>
                </div>
              </div>
            )}
          </div>

          {summary?.metricas && (
            <div className="rounded-2xl border border-white/[0.07] bg-[rgba(10,14,28,0.85)] p-5 backdrop-blur-xl shadow-xl">
              <div className="mb-4 flex items-center gap-2.5">
                <div className="flex h-8 w-8 items-center justify-center rounded-xl border border-indigo-500/30 bg-indigo-500/10">
                  <Clock size={14} className="text-indigo-400" />
                </div>
                <h2 className="text-sm font-bold text-white">Tiempos Promedio</h2>
              </div>
              <div className="space-y-1">
                {[
                  { label: 'Confirmación', h: summary.metricas.avg_h_confirmacion },
                  { label: 'Fabricación',  h: summary.metricas.avg_h_fabricacion  },
                  { label: 'Agendado',     h: summary.metricas.avg_h_agendado     },
                  { label: 'Instalación',  h: summary.metricas.avg_h_instalacion  },
                ].filter(x => x.h).map(x => (
                  <div key={x.label} className="flex items-center justify-between py-2 border-b border-white/[0.05] last:border-0">
                    <span className="text-[12px] text-slate-400">{x.label}</span>
                    <span className="text-[13px] font-bold text-slate-200 tabular-nums">
                      {x.h! < 24 ? `${x.h!.toFixed(1)}h` : `${(x.h! / 24).toFixed(1)} días`}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Right — actividad reciente */}
        <div className="lg:col-span-3">
          <div className="h-full rounded-2xl border border-white/[0.07] bg-[rgba(10,14,28,0.85)] p-5 backdrop-blur-xl shadow-xl">
            <div className="mb-4 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="flex h-8 w-8 items-center justify-center rounded-xl border border-white/10 bg-white/[0.06]">
                  <Activity size={14} className="text-slate-400" />
                </div>
                <h2 className="text-sm font-bold text-white">Actividad Reciente</h2>
              </div>
              <Link to={`${rolBase}/ordenes`}
                className="flex items-center gap-1 text-xs font-bold text-indigo-400 hover:text-indigo-300 transition">
                Ver todas <ArrowRight size={12} />
              </Link>
            </div>
            <div className="divide-y divide-white/[0.04]">
              {recientes.map(o => {
                const cfg = ESTADO_CONFIG[o.estado] || ESTADO_CONFIG.cotizacion;
                return (
                  <Link key={o.id} to={`${rolBase}/ordenes/${o.id}`}
                    className="flex items-center gap-3 rounded-xl px-2 py-2.5 transition hover:bg-white/[0.04] group">
                    <div className={`h-2 w-2 shrink-0 rounded-full ${cfg.dot}`} />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-baseline gap-2">
                        <p className="text-[13px] font-bold text-slate-200 group-hover:text-white">OT #{o.numero}</p>
                        <p className="truncate text-[11px] text-slate-500">{o.cliente_nombre || '—'}</p>
                      </div>
                      <p className="text-[11px] text-slate-600 mt-0.5">{fmtDate(o.created_at)}</p>
                    </div>
                    <div className="ml-1 flex shrink-0 flex-col items-end gap-1">
                      <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold leading-none ${cfg.bg} ${cfg.color}`}>{cfg.label}</span>
                      <span className="text-[11px] font-bold text-slate-400 tabular-nums">{fmt(o.precio_total)}</span>
                    </div>
                  </Link>
                );
              })}
              {recientes.length === 0 && (
                <div className="flex flex-col items-center justify-center py-14 text-slate-600">
                  <Package size={28} strokeWidth={1.5} />
                  <p className="mt-3 text-sm font-medium text-slate-500">Sin órdenes aún</p>
                  <p className="text-xs text-slate-600 mt-0.5">Las órdenes aparecerán aquí</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ── GPS en Vivo mini-widget ── */}
      {enCampo.length > 0 && (
        <div className="rounded-2xl border border-violet-500/20 bg-gradient-to-r from-violet-600/10 via-indigo-600/8 to-transparent p-5">
          <div className="mb-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
              </div>
              <p className="text-sm font-bold text-white">GPS en Vivo — {enCampo.length} técnico{enCampo.length > 1 ? 's' : ''} en campo</p>
            </div>
            <Link to={`${rolBase}/gps`}
              className="flex items-center gap-1 rounded-lg border border-violet-500/30 bg-violet-500/10 px-3 py-1 text-xs font-bold text-violet-300 hover:bg-violet-500/20 transition">
              Ver mapa <ArrowRight size={11} />
            </Link>
          </div>
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {enCampo.slice(0, 6).map(o => (
              <Link key={o.id} to={`${rolBase}/ordenes/${o.id}`}
                className="flex items-center gap-2 rounded-xl border border-white/[0.06] bg-white/[0.04] px-3 py-2 transition hover:bg-white/[0.08]">
                <Navigation size={13} className="text-violet-400 shrink-0" />
                <div className="min-w-0">
                  <p className="text-xs font-bold text-white truncate">OT #{o.numero}</p>
                  <p className="text-[11px] text-slate-500 truncate">{o.instalador_nombre || o.cliente_nombre || '—'}</p>
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* ── CTA bar ── */}
      <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-indigo-500/20 bg-gradient-to-r from-indigo-600/20 via-violet-600/15 to-purple-600/10 px-6 py-4 backdrop-blur-sm">
        <div>
          <p className="font-black text-white text-base">¿Nuevo cliente?</p>
          <p className="text-sm text-slate-400 mt-0.5">Inicia una cotización y cierra la venta desde el sistema</p>
        </div>
        <Link to={`/${user?.rol || 'jefe'}/cotizaciones`}
          className="inline-flex items-center gap-2 rounded-xl border border-indigo-500/40 bg-indigo-600/30 px-5 py-2.5 text-sm font-bold text-indigo-200 backdrop-blur-sm transition hover:bg-indigo-600/50 hover:text-white">
          Ver Cotizaciones <ArrowRight size={14} />
        </Link>
      </div>

    </div>
  );
}
