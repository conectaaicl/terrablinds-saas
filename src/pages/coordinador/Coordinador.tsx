/**
 * Panel del Coordinador — Agenda, GPS, Tareas, Equipos
 *
 * Rutas:
 *   /coordinador             → CoordinadorDashboard (este archivo)
 *   /coordinador/agenda      → AgendaSemanal
 *   /coordinador/tareas      → GestionTareas
 *   /coordinador/gps         → MapaGPS
 */
import { useState, useEffect, useRef, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { useApi } from '../../hooks/useApi';
import { useMutation } from '../../hooks/useMutation';
import { api } from '../../services/api';
import { ESTADO_CONFIG, PRIORIDAD_CONFIG, TASK_ESTADO_CONFIG, ROL_CONFIG } from '../../types';
import type { DailyTask, GpsLastPosition } from '../../types';
import { Spinner, ErrorMessage } from '../../components/LoadingStates';
import {
  CalendarDays, MapPin, ClipboardList,
  Users, Navigation, CheckCircle2,
  AlertTriangle, ChevronRight, Plus, X, Clock,
  ListTodo, ArrowRight, ExternalLink, Radio,
  RefreshCw, Target, MessageCircle, Copy, Check,
  Phone, Trash2, Wrench,
} from 'lucide-react';

const fmtDate = (s: string) => s ? new Date(s).toLocaleDateString('es-CL', { weekday: 'short', day: 'numeric', month: 'short' }) : '—';
const fmtTime = (s: string) => s ? new Date(s).toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' }) : '—';
const fmtDateTime = (s: string) => `${fmtDate(s)} ${fmtTime(s)}`;
const fmt = (n: number) => '$' + n.toLocaleString('es-CL');

// ─────────────────────────────────────────────────────────────
// COORDINADOR DASHBOARD
// ─────────────────────────────────────────────────────────────
export function CoordinadorDashboard() {
  const { data: summary, loading: loadingSum, error: errSum, refetch: refetchSum } = useApi(
    () => api.getDashboardSummary()
  );
  const { data: orders, loading: loadingOrd, refetch: refetchOrd } = useApi(
    () => api.getOrders()
  );
  const { data: gpsData, refetch: refetchGps } = useApi(
    () => api.getActivePositions()
  );
  const { data: pendientes } = useApi(() => api.getOrdersPendingSchedule());
  const { data: tareas } = useApi(() => api.getTasks({ fecha: new Date().toISOString().split('T')[0] }));

  const loading = loadingSum || loadingOrd;

  const orderList: any[] = orders || [];
  const gpsPositions: GpsLastPosition[] = gpsData || [];
  const taskList: DailyTask[] = tareas || [];
  const pendientesList: any[] = pendientes || [];

  const ordenesByEstado: Record<string, number> = summary?.por_estado || {};

  // Alertas críticas
  const conProblema = orderList.filter(o => o.estado === 'problema');
  const enCamino = orderList.filter(o => o.estado === 'en_camino');
  const instalando = orderList.filter(o => o.estado === 'instalando');
  const tareasHoy = taskList.filter(t => t.estado !== 'completada' && t.estado !== 'cancelada');

  if (loading) return <Spinner />;
  if (errSum) return <ErrorMessage message={errSum} onRetry={refetchSum} />;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Centro de Coordinación</h1>
          <p className="text-sm text-slate-500">{new Date().toLocaleDateString('es-CL', { weekday: 'long', day: 'numeric', month: 'long' })}</p>
        </div>
        <button
          onClick={() => { refetchSum(); refetchOrd(); refetchGps(); }}
          className="flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-600 hover:bg-slate-50"
        >
          <RefreshCw size={13} /> Actualizar
        </button>
      </div>

      {/* Alertas urgentes */}
      {(conProblema.length > 0 || pendientesList.length > 0) && (
        <div className="grid gap-3 sm:grid-cols-2">
          {conProblema.length > 0 && (
            <Link to="/coordinador/ordenes"
              className="flex items-center gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 transition hover:bg-red-100">
              <AlertTriangle size={18} className="text-red-600 shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold text-red-800">{conProblema.length} orden(es) con problema</p>
                <p className="text-xs text-red-600">Requieren atención inmediata</p>
              </div>
              <ChevronRight size={14} className="text-red-400" />
            </Link>
          )}
          {pendientesList.length > 0 && (
            <Link to="/coordinador/agenda"
              className="flex items-center gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 transition hover:bg-amber-100">
              <Clock size={18} className="text-amber-600 shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold text-amber-800">{pendientesList.length} orden(es) sin agendar</p>
                <p className="text-xs text-amber-600">Productos listos, esperando agenda</p>
              </div>
              <ChevronRight size={14} className="text-amber-400" />
            </Link>
          )}
        </div>
      )}

      {/* KPIs rápidos */}
      <div className="grid gap-3 grid-cols-2 lg:grid-cols-4">
        {[
          {
            label: 'En Campo Ahora', value: enCamino.length + instalando.length,
            sub: `${enCamino.length} en camino · ${instalando.length} instalando`,
            icon: Navigation, iconBg: 'bg-violet-100', iconColor: 'text-violet-600',
            link: '/coordinador/gps',
          },
          {
            label: 'Para Agendar', value: pendientesList.length,
            sub: 'Listo para instalar',
            icon: CalendarDays, iconBg: 'bg-amber-100', iconColor: 'text-amber-600',
            link: '/coordinador/agenda',
          },
          {
            label: 'Tareas Hoy', value: tareasHoy.length,
            sub: `${taskList.filter(t => t.estado === 'completada').length} completadas`,
            icon: ListTodo, iconBg: 'bg-blue-100', iconColor: 'text-blue-600',
            link: '/coordinador/tareas',
          },
          {
            label: 'Técnicos Activos', value: gpsPositions.length,
            sub: 'Con GPS activo',
            icon: Radio, iconBg: 'bg-emerald-100', iconColor: 'text-emerald-600',
            link: '/coordinador/gps',
          },
        ].map(s => (
          <Link key={s.label} to={s.link}
            className="rounded-xl border border-slate-200 bg-white p-4 transition hover:border-slate-300 hover:shadow-sm">
            <div className="flex items-center justify-between">
              <div className={`rounded-lg p-2 ${s.iconBg}`}>
                <s.icon size={16} className={s.iconColor} />
              </div>
              <ArrowRight size={12} className="text-slate-300" />
            </div>
            <p className="mt-2 text-2xl font-bold text-slate-900">{s.value}</p>
            <p className="text-xs font-medium text-slate-600">{s.label}</p>
            <p className="text-[11px] text-slate-400">{s.sub}</p>
          </Link>
        ))}
      </div>

      {/* GPS activos + Pipeline */}
      <div className="grid gap-4 lg:grid-cols-5">

        {/* GPS activos */}
        <div className="lg:col-span-2 rounded-xl border border-slate-200 bg-white p-5">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="flex items-center gap-2 text-sm font-semibold text-slate-900">
              <div className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
              Técnicos en Campo
            </h2>
            <Link to="/coordinador/gps" className="text-xs font-semibold text-violet-600 hover:underline">Ver mapa</Link>
          </div>

          {gpsPositions.length === 0 ? (
            <div className="py-6 text-center">
              <Navigation size={24} className="mx-auto text-slate-200" />
              <p className="mt-2 text-xs text-slate-400">Sin técnicos activos ahora</p>
            </div>
          ) : (
            <div className="space-y-2">
              {gpsPositions.slice(0, 5).map(pos => (
                <a key={String(pos.user_id)} href={pos.maps_url} target="_blank" rel="noopener noreferrer"
                  className="flex items-center gap-3 rounded-lg border border-slate-100 p-2.5 transition hover:border-slate-200 hover:bg-slate-50">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-violet-100">
                    <Navigation size={14} className="text-violet-600" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-xs font-semibold text-slate-800">{pos.user_nombre}</p>
                    <p className="text-[11px] text-slate-400">
                      {pos.order_id ? `OT #${pos.order_id}` : 'Sin OT asignada'}
                      {pos.velocidad_kmh ? ` · ${Math.round(pos.velocidad_kmh)} km/h` : ''}
                    </p>
                  </div>
                  <ExternalLink size={12} className="text-slate-300" />
                </a>
              ))}
            </div>
          )}
        </div>

        {/* Pipeline */}
        <div className="lg:col-span-3 rounded-xl border border-slate-200 bg-white p-5">
          <h2 className="mb-3 text-sm font-semibold text-slate-900">Estado del Pipeline</h2>
          <div className="space-y-1.5">
            {[
              { key: 'en_fabricacion',         label: 'En Fabricación' },
              { key: 'listo_para_instalar',     label: 'Listo para Instalar' },
              { key: 'instalacion_programada',  label: 'Instalación Programada' },
              { key: 'en_camino',               label: 'En Camino' },
              { key: 'instalando',              label: 'Instalando' },
              { key: 'instalacion_completada',  label: 'Completada (pendiente cierre)' },
            ].map(e => {
              const count = ordenesByEstado[e.key] || 0;
              const cfg = ESTADO_CONFIG[e.key];
              const pct = orderList.length ? Math.round(100 * count / orderList.length) : 0;
              return (
                <div key={e.key} className="flex items-center gap-3">
                  <div className={`h-2 w-2 rounded-full shrink-0 ${cfg?.dot || 'bg-slate-300'}`} />
                  <span className="flex-1 text-xs text-slate-700">{e.label}</span>
                  <div className="h-1.5 w-24 rounded-full bg-slate-100">
                    <div className={`h-full rounded-full ${cfg?.dot || 'bg-slate-300'}`} style={{ width: `${Math.min(pct * 5, 100)}%` }} />
                  </div>
                  <span className="w-5 text-right text-xs font-bold text-slate-800">{count}</span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Accesos rápidos */}
      <div className="grid gap-3 sm:grid-cols-3">
        {[
          { to: '/coordinador/agenda', icon: CalendarDays, label: 'Agenda Semanal', sub: 'Programar instalaciones', color: 'text-indigo-600', bg: 'bg-indigo-50', border: 'border-indigo-200' },
          { to: '/coordinador/tareas', icon: ListTodo, label: 'Gestionar Tareas', sub: 'Asignar trabajo diario', color: 'text-cyan-600', bg: 'bg-cyan-50', border: 'border-cyan-200' },
          { to: '/coordinador/gps', icon: Target, label: 'Mapa GPS', sub: 'Ubicaciones en tiempo real', color: 'text-violet-600', bg: 'bg-violet-50', border: 'border-violet-200' },
        ].map(a => (
          <Link key={a.to} to={a.to}
            className={`flex items-center gap-3 rounded-xl border ${a.border} ${a.bg} p-4 transition hover:shadow-sm`}>
            <div className="rounded-lg bg-white/70 p-2.5">
              <a.icon size={18} className={a.color} />
            </div>
            <div>
              <p className={`text-sm font-bold ${a.color}`}>{a.label}</p>
              <p className="text-[11px] text-slate-500">{a.sub}</p>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}


// ─────────────────────────────────────────────────────────────
// AGENDA SEMANAL
// ─────────────────────────────────────────────────────────────
export function AgendaSemanal() {
  const { data: agenda, loading, error: _agendaErr, refetch } = useApi(() => api.getWeeklyAgenda());
  const { data: pendientes, refetch: refetchPendientes } = useApi(() => api.getOrdersPendingSchedule());
  const [agendarOrden, setAgendarOrden] = useState<any | null>(null);
  const pendientesList: any[] = pendientes || [];

  if (loading) return <Spinner />;
  if (_agendaErr) return <ErrorMessage message={_agendaErr} onRetry={refetch} />;

  const dias = agenda?.dias || [];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Agenda Semanal</h1>
          <p className="text-sm text-slate-500">Próximos 7 días de instalaciones</p>
        </div>
        <button onClick={refetch}
          className="flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-600 hover:bg-slate-50">
          <RefreshCw size={13} /> Actualizar
        </button>
      </div>

      {/* Modal agendar */}
      {agendarOrden && (
        <AgendarModal
          orden={agendarOrden}
          onCreated={() => { setAgendarOrden(null); refetch(); refetchPendientes(); }}
          onCancel={() => setAgendarOrden(null)}
        />
      )}

      {/* Pendientes de agendar */}
      {pendientesList.length > 0 && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">
          <h2 className="mb-2 flex items-center gap-2 text-sm font-bold text-amber-800">
            <Clock size={15} /> {pendientesList.length} orden(es) listas para agendar
          </h2>
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {pendientesList.map((o: any) => (
              <div key={o.id}
                className="flex items-center justify-between rounded-lg bg-white px-3 py-2 shadow-sm">
                <div className="min-w-0">
                  <p className="text-xs font-bold text-slate-800">OT #{o.numero}</p>
                  <p className="truncate text-[11px] text-slate-500">{o.cliente_nombre || '—'}</p>
                </div>
                <button
                  onClick={() => setAgendarOrden(o)}
                  className="ml-2 flex shrink-0 items-center gap-1 rounded-lg bg-amber-500 px-2.5 py-1.5 text-[11px] font-bold text-white hover:bg-amber-600"
                >
                  <CalendarDays size={12} /> Agendar
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Días de la semana */}
      <div className="space-y-4">
        {dias.map((dia: any) => {
          const isToday = dia.fecha === new Date().toISOString().split('T')[0];
          return (
            <div key={dia.fecha}
              className={`rounded-xl border bg-white p-4 ${isToday ? 'border-indigo-300 shadow-sm' : 'border-slate-200'}`}>
              <div className="mb-3 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {isToday && (
                    <span className="rounded-full bg-indigo-500 px-2 py-0.5 text-[10px] font-bold text-white">HOY</span>
                  )}
                  <h3 className="text-sm font-bold text-slate-800 capitalize">
                    {new Date(dia.fecha + 'T12:00:00').toLocaleDateString('es-CL', { weekday: 'long', day: 'numeric', month: 'long' })}
                  </h3>
                </div>
                <span className="text-xs text-slate-400">{dia.citas?.length || 0} cita(s)</span>
              </div>

              {dia.citas?.length === 0 ? (
                <p className="text-xs text-slate-400 italic">Sin instalaciones programadas</p>
              ) : (
                <div className="space-y-2">
                  {dia.citas.map((cita: any) => {
                    const cfg = ESTADO_CONFIG[cita.order_estado] || ESTADO_CONFIG.instalacion_programada;
                    return (
                      <div key={cita.appointment_id}
                        className="flex gap-3 rounded-lg border border-slate-100 p-3">
                        <div className="mt-0.5 text-center">
                          <p className="text-xs font-bold text-slate-800">{fmtTime(cita.fecha_inicio)}</p>
                          {cita.fecha_fin && (
                            <p className="text-[10px] text-slate-400">{fmtTime(cita.fecha_fin)}</p>
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <p className="text-xs font-bold text-slate-800">OT #{cita.order_numero}</p>
                            <span className={`rounded-full px-1.5 py-0.5 text-[10px] font-semibold ${cfg.bg} ${cfg.color}`}>{cfg.label}</span>
                          </div>
                          <p className="text-xs text-slate-600">{cita.cliente_nombre}</p>
                          {cita.cliente_telefono && (
                            <a href={`tel:${cita.cliente_telefono}`}
                              className="text-[11px] text-blue-600 hover:underline">{cita.cliente_telefono}</a>
                          )}
                          {cita.direccion && (
                            <a href={`https://maps.google.com/?q=${encodeURIComponent(cita.direccion)}`}
                              target="_blank" rel="noopener noreferrer"
                              className="flex items-center gap-1 text-[11px] text-blue-600 hover:underline">
                              <MapPin size={10} /> {cita.direccion}
                            </a>
                          )}
                          {cita.team_nombre && (
                            <p className="text-[11px] text-slate-400">Equipo: {cita.team_nombre}</p>
                          )}
                        </div>
                        <div className="text-right">
                          <p className="text-xs font-bold text-slate-700">{fmt(cita.precio_total || 0)}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}


// ─────────────────────────────────────────────────────────────
// GESTIÓN DE TAREAS — Agenda por técnico con generador WhatsApp
// ─────────────────────────────────────────────────────────────

const TIPO_TAREA_CONFIG: Record<string, { label: string; emoji: string; color: string }> = {
  instalacion:      { label: 'Instalación',      emoji: '🟢', color: 'text-emerald-700 bg-emerald-50 border-emerald-200' },
  servicio_tecnico: { label: 'Servicio Técnico', emoji: '🔧', color: 'text-blue-700 bg-blue-50 border-blue-200' },
  reunion:          { label: 'Reunión / Terreno', emoji: '🟡', color: 'text-amber-700 bg-amber-50 border-amber-200' },
  medicion:         { label: 'Medición',         emoji: '📐', color: 'text-purple-700 bg-purple-50 border-purple-200' },
  otro:             { label: 'Otro',             emoji: '⚪', color: 'text-slate-700 bg-slate-50 border-slate-200' },
};

function generarWhatsApp(fecha: string, tareas: DailyTask[]): string {
  const fechaStr = new Date(fecha + 'T12:00:00').toLocaleDateString('es-CL', {
    weekday: 'long', day: 'numeric', month: 'long'
  });

  // Agrupar por técnico
  const porTecnico: Record<string, DailyTask[]> = {};
  for (const t of tareas) {
    if (t.estado === 'cancelada') continue;
    const nombre = (t.asignado_a_nombre || `ID ${t.asignado_a}`).toUpperCase();
    if (!porTecnico[nombre]) porTecnico[nombre] = [];
    porTecnico[nombre].push(t);
  }

  const lines: string[] = [`📅 *AGENDA ${fechaStr.toUpperCase()}*\n`];

  for (const [nombre, tasks] of Object.entries(porTecnico)) {
    lines.push(`*${nombre}*\n`);
    for (const t of tasks) {
      const cfg = TIPO_TAREA_CONFIG[t.tipo_tarea || 'otro'];
      if (t.hora) lines.push(`🕐 ${t.hora}`);
      const tipoLabel = cfg?.label || t.tipo_tarea || 'Tarea';
      const clienteStr = t.cliente_nombre ? ` – ${t.cliente_nombre}` : '';
      lines.push(`${cfg?.emoji || '🟢'} ${tipoLabel}${clienteStr}`);
      if (t.direccion) lines.push(`📍 ${t.direccion}`);
      if (t.direccion) {
        const wazeUrl = `https://waze.com/ul?q=${encodeURIComponent(t.direccion)}`;
        lines.push(`🧭 ${wazeUrl}`);
      }
      if (t.cliente_telefono) lines.push(`📞 ${t.cliente_telefono}`);
      if (t.ot_numero) lines.push(`📝 OT ${t.ot_numero}`);
      if (t.vendedor_nombre) lines.push(`👨‍💼 Vendedor: ${t.vendedor_nombre}`);
      if (t.descripcion) lines.push(`\n🔧 ${t.descripcion}`);
      if (t.items && t.items.length > 0) {
        if (!t.descripcion) lines.push('🔧');
        for (const item of t.items) {
          lines.push(`* ${item.descripcion}${item.ubicacion ? ` (${item.ubicacion})` : ''}`);
        }
      }
      if (t.observaciones && t.observaciones.length > 0) {
        lines.push('');
        for (const obs of t.observaciones) {
          lines.push(`⚠️ ${obs}`);
        }
      }
      lines.push('\n⸻\n');
    }
  }

  return lines.join('\n');
}

export function GestionTareas() {
  const [showForm, setShowForm] = useState(false);
  const [fechaFiltro, setFechaFiltro] = useState(new Date().toISOString().split('T')[0]);
  const [copied, setCopied] = useState(false);

  const { data: tareas, loading, error, refetch } = useApi(
    () => api.getTasks({ fecha: fechaFiltro }),
    [fechaFiltro]
  );
  const { data: instUsers } = useApi(() => api.getUsersByRole('instalador'));
  const { data: fabUsers } = useApi(() => api.getUsersByRole('fabricante'));
  const { data: vendUsers } = useApi(() => api.getUsersByRole('vendedor'));
  const { data: coordUsers } = useApi(() => api.getUsersByRole('coordinador'));

  const taskList: DailyTask[] = tareas || [];
  const allUsers = [...(instUsers || []), ...(fabUsers || []), ...(vendUsers || []), ...(coordUsers || [])];

  const { execute: deleteTask } = useMutation((id: string) => api.deleteTask(id));
  const { execute: updateTask } = useMutation((id: string, data: any) => api.updateTask(id, data));

  const completar = async (t: DailyTask) => {
    await updateTask(t.id, { estado: 'completada' });
    refetch();
  };
  const cancelar = async (t: DailyTask) => {
    await deleteTask(t.id);
    refetch();
  };

  const copiarWhatsApp = () => {
    const texto = generarWhatsApp(fechaFiltro, taskList);
    navigator.clipboard.writeText(texto).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  // Agrupar por técnico para mostrar
  const porTecnico: Record<string, DailyTask[]> = {};
  for (const t of taskList) {
    const nombre = t.asignado_a_nombre || `Técnico ${t.asignado_a}`;
    if (!porTecnico[nombre]) porTecnico[nombre] = [];
    porTecnico[nombre].push(t);
  }

  const activas = taskList.filter(t => t.estado !== 'cancelada' && t.estado !== 'completada').length;
  const completadas = taskList.filter(t => t.estado === 'completada').length;

  if (loading) return <Spinner />;
  if (error) return <ErrorMessage message={error} onRetry={refetch} />;

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Agenda Diaria</h1>
          <p className="text-sm text-slate-500">
            {activas} activas · {completadas} completadas · {Object.keys(porTecnico).length} técnicos
          </p>
        </div>
        <div className="flex gap-2">
          <input
            type="date"
            value={fechaFiltro}
            onChange={e => setFechaFiltro(e.target.value)}
            className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-200"
          />
          {taskList.length > 0 && (
            <button
              onClick={copiarWhatsApp}
              className={`flex items-center gap-1.5 rounded-lg border px-3 py-2 text-sm font-semibold transition ${
                copied
                  ? 'border-emerald-300 bg-emerald-50 text-emerald-700'
                  : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50'
              }`}
            >
              {copied ? <Check size={15} /> : <MessageCircle size={15} />}
              {copied ? 'Copiado' : 'Copiar WhatsApp'}
            </button>
          )}
          <button
            onClick={() => setShowForm(true)}
            className="flex items-center gap-1.5 rounded-lg bg-indigo-500 px-4 py-2 text-sm font-semibold text-white transition hover:bg-indigo-600"
          >
            <Plus size={15} /> Nueva Tarea
          </button>
        </div>
      </div>

      {/* Formulario */}
      {showForm && (
        <NuevaTareaForm
          users={allUsers}
          fecha={fechaFiltro}
          onCreated={() => { setShowForm(false); refetch(); }}
          onCancel={() => setShowForm(false)}
        />
      )}

      {/* Tareas vacías */}
      {taskList.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-200 bg-white p-12 text-center">
          <ListTodo size={36} className="mx-auto text-slate-200" />
          <p className="mt-3 font-medium text-slate-400">Sin tareas para esta fecha</p>
          <p className="text-sm text-slate-300">Crea la primera tarea con el botón "Nueva Tarea"</p>
        </div>
      ) : (
        /* Agrupar por técnico */
        <div className="space-y-6">
          {Object.entries(porTecnico).map(([nombre, tasks]) => (
            <div key={nombre} className="rounded-2xl border border-slate-100 bg-white shadow-sm overflow-hidden">
              {/* Cabecera del técnico */}
              <div className="flex items-center gap-3 border-b border-slate-100 bg-slate-50 px-5 py-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-full bg-indigo-100 text-sm font-bold text-indigo-700">
                  {nombre.slice(0, 2)}
                </div>
                <div>
                  <p className="text-sm font-bold text-slate-900">{nombre}</p>
                  <p className="text-xs text-slate-400">{tasks.length} tarea{tasks.length !== 1 ? 's' : ''}</p>
                </div>
              </div>

              {/* Tareas del técnico */}
              <div className="divide-y divide-slate-50">
                {tasks.map(t => {
                  const cfg = TIPO_TAREA_CONFIG[t.tipo_tarea || 'otro'] || TIPO_TAREA_CONFIG.otro;
                  const est = TASK_ESTADO_CONFIG[t.estado] || TASK_ESTADO_CONFIG.pendiente;
                  return (
                    <div key={t.id} className={`p-5 transition ${t.estado === 'completada' ? 'opacity-60 bg-slate-50' : 'hover:bg-slate-50/50'}`}>
                      <div className="flex items-start gap-3">
                        {/* Hora + emoji tipo */}
                        <div className="flex-shrink-0 text-center min-w-[48px]">
                          {t.hora && <p className="text-sm font-bold text-slate-700">🕐 {t.hora}</p>}
                          <span className="text-xl">{cfg.emoji}</span>
                        </div>

                        <div className="flex-1 min-w-0">
                          {/* Tipo + título */}
                          <div className="flex flex-wrap items-center gap-2 mb-1">
                            <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-semibold ${cfg.color}`}>
                              {cfg.label}
                            </span>
                            <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${est.bg} ${est.color}`}>
                              {est.label}
                            </span>
                          </div>

                          {t.cliente_nombre && (
                            <p className="text-base font-bold text-slate-900">{t.cliente_nombre}</p>
                          )}
                          {!t.cliente_nombre && (
                            <p className="text-base font-bold text-slate-900">{t.titulo}</p>
                          )}

                          {/* Info de contacto */}
                          <div className="mt-2 space-y-1">
                            {t.direccion && (
                              <div className="flex items-start gap-1.5">
                                <MapPin size={13} className="text-slate-400 mt-0.5 flex-shrink-0" />
                                <a
                                  href={`https://waze.com/ul?q=${encodeURIComponent(t.direccion)}`}
                                  target="_blank" rel="noopener noreferrer"
                                  className="text-sm text-blue-600 hover:underline leading-tight"
                                >
                                  {t.direccion}
                                </a>
                              </div>
                            )}
                            {t.cliente_telefono && (
                              <div className="flex items-center gap-1.5">
                                <Phone size={13} className="text-slate-400 flex-shrink-0" />
                                <a href={`tel:${t.cliente_telefono}`} className="text-sm text-slate-700">{t.cliente_telefono}</a>
                              </div>
                            )}
                            {t.ot_numero && (
                              <p className="text-sm text-slate-500">📝 OT {t.ot_numero}</p>
                            )}
                            {t.vendedor_nombre && (
                              <p className="text-xs text-slate-400">👨‍💼 Vendedor: {t.vendedor_nombre}</p>
                            )}
                          </div>

                          {/* Descripción + Items */}
                          {(t.descripcion || (t.items && t.items.length > 0)) && (
                            <div className="mt-3 rounded-lg bg-slate-50 border border-slate-100 p-3">
                              {t.descripcion && (
                                <p className="text-sm font-semibold text-slate-700 flex items-center gap-1.5 mb-1.5">
                                  <Wrench size={13} /> {t.descripcion}
                                </p>
                              )}
                              {t.items && t.items.map((item, i) => (
                                <p key={i} className="text-sm text-slate-600 flex items-start gap-1.5 ml-4">
                                  <span className="text-slate-400">•</span>
                                  <span>
                                    {item.descripcion}
                                    {item.ubicacion && <span className="text-xs text-slate-400 ml-1">({item.ubicacion})</span>}
                                  </span>
                                </p>
                              ))}
                            </div>
                          )}

                          {/* Observaciones */}
                          {t.observaciones && t.observaciones.length > 0 && (
                            <div className="mt-2 space-y-1">
                              {t.observaciones.map((obs, i) => (
                                <p key={i} className="text-xs text-amber-700 flex items-start gap-1">
                                  <span>⚠️</span> {obs}
                                </p>
                              ))}
                            </div>
                          )}

                          {t.notas_cierre && (
                            <p className="mt-2 rounded bg-emerald-50 px-2 py-1 text-xs text-emerald-700 italic">
                              ✓ "{t.notas_cierre}"
                            </p>
                          )}
                        </div>

                        {/* Acciones */}
                        {t.estado !== 'completada' && t.estado !== 'cancelada' && (
                          <div className="flex gap-1 flex-shrink-0">
                            <button onClick={() => completar(t)}
                              title="Marcar completada"
                              className="rounded-lg bg-emerald-50 p-1.5 text-emerald-600 hover:bg-emerald-100 transition">
                              <CheckCircle2 size={15} />
                            </button>
                            <button onClick={() => cancelar(t)}
                              title="Cancelar tarea"
                              className="rounded-lg bg-red-50 p-1.5 text-red-500 hover:bg-red-100 transition">
                              <Trash2 size={15} />
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}


// ─── Modal para agendar instalación ───────────────────────────
function AgendarModal({ orden, onCreated, onCancel }: {
  orden: any; onCreated: () => void; onCancel: () => void;
}) {
  const today = new Date().toISOString().split('T')[0];
  const [fecha, setFecha] = useState(today);
  const [horaInicio, setHoraInicio] = useState('09:00');
  const [horaFin, setHoraFin] = useState('11:00');
  const [notas, setNotas] = useState('');
  const [notifCliente, setNotifCliente] = useState(false);
  const [err, setErr] = useState('');

  const { data: instaladores } = useApi(() => api.getUsersByRole('instalador'));
  const [instaladorId, setInstaladorId] = useState('');
  const instList: any[] = instaladores || [];

  const { execute: crear, loading } = useMutation((data: any) => api.createAppointment(data));
  const { execute: asignarIns } = useMutation(
    (uid: number) => api.assignInstalador(orden.id, uid)
  );

  const submit = async () => {
    if (!fecha) { setErr('La fecha es obligatoria'); return; }
    setErr('');
    if (instaladorId && !orden.instalador_id) {
      await asignarIns(Number(instaladorId));
    }
    const res = await crear({
      order_id: orden.id,
      fecha_inicio: `${fecha}T${horaInicio}:00`,
      fecha_fin: horaFin ? `${fecha}T${horaFin}:00` : undefined,
      notas: notas || undefined,
      notificacion_cliente: notifCliente,
    });
    if (res) onCreated();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h3 className="text-base font-bold text-slate-900">Agendar Instalación</h3>
            <p className="text-xs text-slate-500">OT #{orden.numero} · {orden.cliente_nombre}</p>
          </div>
          <button onClick={onCancel} className="text-slate-400 hover:text-slate-600"><X size={18} /></button>
        </div>

        {orden.cliente_direccion && (
          <a href={`https://maps.google.com/?q=${encodeURIComponent(orden.cliente_direccion)}`}
            target="_blank" rel="noopener noreferrer"
            className="mb-4 flex items-center gap-1.5 rounded-lg bg-blue-50 px-3 py-2 text-xs text-blue-700 hover:bg-blue-100">
            <MapPin size={12} /> {orden.cliente_direccion}
          </a>
        )}

        <div className="space-y-3">
          <div>
            <label className="mb-1 block text-xs font-semibold text-slate-600">Fecha *</label>
            <input type="date" value={fecha} min={today} onChange={e => setFecha(e.target.value)}
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-200" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-600">Hora inicio</label>
              <input type="time" value={horaInicio} onChange={e => setHoraInicio(e.target.value)}
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-200" />
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-600">Hora fin</label>
              <input type="time" value={horaFin} onChange={e => setHoraFin(e.target.value)}
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-200" />
            </div>
          </div>
          {!orden.instalador_id && (
            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-600">Asignar instalador</label>
              <select value={instaladorId} onChange={e => setInstaladorId(e.target.value)}
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-200">
                <option value="">— Sin asignar —</option>
                {instList.map(u => <option key={u.id} value={u.id}>{u.nombre}</option>)}
              </select>
            </div>
          )}
          <div>
            <label className="mb-1 block text-xs font-semibold text-slate-600">Notas internas</label>
            <textarea value={notas} onChange={e => setNotas(e.target.value)} rows={2} placeholder="Instrucciones, acceso, etc."
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-200 resize-none" />
          </div>
          <label className="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" checked={notifCliente} onChange={e => setNotifCliente(e.target.checked)}
              className="rounded accent-indigo-500" />
            <span className="text-xs font-medium text-slate-600">Notificar al cliente por email</span>
          </label>
        </div>

        {err && <p className="mt-2 text-xs text-red-600">{err}</p>}

        <div className="mt-5 flex gap-2">
          <button onClick={onCancel}
            className="flex-1 rounded-lg border border-slate-200 py-2.5 text-sm font-medium text-slate-600 hover:bg-slate-50">
            Cancelar
          </button>
          <button onClick={submit} disabled={loading}
            className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-indigo-500 py-2.5 text-sm font-bold text-white hover:bg-indigo-600 disabled:opacity-60">
            <CalendarDays size={15} /> {loading ? 'Agendando...' : 'Confirmar Agenda'}
          </button>
        </div>
      </div>
    </div>
  );
}


// ─── Tipos internos del formulario ───────────────────────────
interface TaskDraft {
  _id: number;
  expanded: boolean;
  asignadoA: string;
  hora: string;
  tipoTarea: string;
  clienteNombre: string;
  clienteTelefono: string;
  direccion: string;
  otNumero: string;
  vendedorNombre: string;
  descripcion: string;
  items: { descripcion: string; ubicacion: string }[];
  observaciones: string[];
}

let _draftCounter = 0;
function newDraft(expanded = true): TaskDraft {
  return {
    _id: ++_draftCounter,
    expanded,
    asignadoA: '', hora: '', tipoTarea: 'instalacion',
    clienteNombre: '', clienteTelefono: '', direccion: '',
    otNumero: '', vendedorNombre: '', descripcion: '',
    items: [{ descripcion: '', ubicacion: '' }],
    observaciones: [''],
  };
}

// ─── Formulario multi-tarea (hasta 10) ───────────────────────
function NuevaTareaForm({ users, fecha, onCreated, onCancel }: {
  users: any[]; fecha: string;
  onCreated: () => void; onCancel: () => void;
}) {
  const [fechaTarea, setFechaTarea] = useState(fecha);
  const [drafts, setDrafts] = useState<TaskDraft[]>([newDraft(true)]);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [progress, setProgress] = useState(0);

  // ── helpers de draft ──
  const setDraft = (idx: number, patch: Partial<TaskDraft>) =>
    setDrafts(prev => prev.map((d, i) => i === idx ? { ...d, ...patch } : d));

  const toggleExpand = (idx: number) =>
    setDraft(idx, { expanded: !drafts[idx].expanded });

  const addDraft = () => {
    if (drafts.length >= 10) return;
    setDrafts(prev => [...prev, newDraft(true)]);
  };

  const removeDraft = (idx: number) =>
    setDrafts(prev => prev.length === 1 ? prev : prev.filter((_, i) => i !== idx));

  const addItem = (idx: number) =>
    setDraft(idx, { items: [...drafts[idx].items, { descripcion: '', ubicacion: '' }] });

  const removeItem = (idx: number, i: number) =>
    setDraft(idx, { items: drafts[idx].items.filter((_, ii) => ii !== i) });

  const updateItem = (idx: number, i: number, field: 'descripcion' | 'ubicacion', val: string) =>
    setDraft(idx, { items: drafts[idx].items.map((it, ii) => ii === i ? { ...it, [field]: val } : it) });

  const addObs = (idx: number) =>
    setDraft(idx, { observaciones: [...drafts[idx].observaciones, ''] });

  const removeObs = (idx: number, i: number) =>
    setDraft(idx, { observaciones: drafts[idx].observaciones.filter((_, ii) => ii !== i) });

  const updateObs = (idx: number, i: number, val: string) =>
    setDraft(idx, { observaciones: drafts[idx].observaciones.map((o, ii) => ii === i ? val : o) });

  // ── submit todas ──
  const submitAll = async () => {
    for (let i = 0; i < drafts.length; i++) {
      const d = drafts[i];
      if (!d.asignadoA) {
        setError(`Tarea ${i + 1}: debes seleccionar un técnico`);
        setDraft(i, { expanded: true });
        return;
      }
    }
    setError('');
    setSubmitting(true);
    setProgress(0);

    for (let i = 0; i < drafts.length; i++) {
      const d = drafts[i];
      const tipoLabel = TIPO_TAREA_CONFIG[d.tipoTarea]?.label || d.tipoTarea;
      const titulo = d.clienteNombre.trim()
        ? `${tipoLabel} – ${d.clienteNombre.trim()}`
        : tipoLabel;
      const itemsFiltrados = d.items.filter(it => it.descripcion.trim());
      const obsFiltradas = d.observaciones.filter(o => o.trim());

      await api.createTask({
        titulo,
        descripcion: d.descripcion.trim() || undefined,
        asignado_a: Number(d.asignadoA),
        fecha_tarea: fechaTarea,
        prioridad: 'normal',
        hora: d.hora || undefined,
        tipo_tarea: d.tipoTarea,
        cliente_nombre: d.clienteNombre.trim() || undefined,
        cliente_telefono: d.clienteTelefono.trim() || undefined,
        direccion: d.direccion.trim() || undefined,
        ot_numero: d.otNumero.trim() || undefined,
        vendedor_nombre: d.vendedorNombre.trim() || undefined,
        items: itemsFiltrados.length > 0 ? itemsFiltrados : undefined,
        observaciones: obsFiltradas.length > 0 ? obsFiltradas : undefined,
      });
      setProgress(i + 1);
    }

    setSubmitting(false);
    onCreated();
  };

  const inp = 'w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-200';
  const validCount = drafts.filter(d => d.asignadoA).length;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm">
      <div className="w-full max-w-2xl max-h-[92vh] flex flex-col rounded-2xl bg-white shadow-2xl">

        {/* Header fijo */}
        <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4 flex-shrink-0">
          <div>
            <h3 className="text-base font-bold text-slate-900">Agenda del día</h3>
            <p className="text-xs text-slate-500">{drafts.length} tarea{drafts.length !== 1 ? 's' : ''} · máx. 10</p>
          </div>
          <div className="flex items-center gap-3">
            <input type="date" value={fechaTarea} onChange={e => setFechaTarea(e.target.value)}
              className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-200" />
            <button onClick={onCancel} className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600">
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Lista de tareas — scroll */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {drafts.map((d, idx) => {
            const cfg = TIPO_TAREA_CONFIG[d.tipoTarea] || TIPO_TAREA_CONFIG.otro;
            const tecnicoNombre = users.find(u => String(u.id) === d.asignadoA)?.nombre || '';
            return (
              <div key={d._id} className="rounded-xl border border-slate-200 bg-white overflow-hidden">
                {/* Cabecera de la tarea (siempre visible) */}
                <div
                  className="flex items-center gap-3 px-4 py-3 cursor-pointer hover:bg-slate-50 select-none"
                  onClick={() => toggleExpand(idx)}
                >
                  <span className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-indigo-100 text-[11px] font-bold text-indigo-700">
                    {idx + 1}
                  </span>
                  <span className="text-lg flex-shrink-0">{cfg.emoji}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-slate-800 truncate">
                      {d.clienteNombre || <span className="text-slate-400 font-normal italic">{cfg.label}</span>}
                    </p>
                    {tecnicoNombre && (
                      <p className="text-xs text-slate-400 truncate">
                        {tecnicoNombre}{d.hora ? ` · ${d.hora}` : ''}{d.otNumero ? ` · OT ${d.otNumero}` : ''}
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-1 flex-shrink-0">
                    {drafts.length > 1 && (
                      <button
                        type="button"
                        onClick={e => { e.stopPropagation(); removeDraft(idx); }}
                        className="rounded-lg p-1.5 text-slate-300 hover:bg-red-50 hover:text-red-500 transition"
                      >
                        <Trash2 size={14} />
                      </button>
                    )}
                    <ChevronRight size={16} className={`text-slate-400 transition-transform ${d.expanded ? 'rotate-90' : ''}`} />
                  </div>
                </div>

                {/* Cuerpo expandible */}
                {d.expanded && (
                  <div className="border-t border-slate-100 p-4 space-y-4 bg-slate-50/50">
                    {/* Fila: tipo + técnico + hora */}
                    <div className="grid grid-cols-3 gap-2">
                      <div>
                        <label className="mb-1 block text-[10px] font-semibold text-slate-500 uppercase">Tipo *</label>
                        <select value={d.tipoTarea} onChange={e => setDraft(idx, { tipoTarea: e.target.value })} className={inp}>
                          {Object.entries(TIPO_TAREA_CONFIG).map(([k, v]) => (
                            <option key={k} value={k}>{v.emoji} {v.label}</option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="mb-1 block text-[10px] font-semibold text-slate-500 uppercase">Técnico *</label>
                        <select value={d.asignadoA} onChange={e => setDraft(idx, { asignadoA: e.target.value })} className={inp}>
                          <option value="">— Seleccionar —</option>
                          {users.map(u => (
                            <option key={u.id} value={u.id}>{u.nombre}</option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="mb-1 block text-[10px] font-semibold text-slate-500 uppercase">Hora</label>
                        <input type="time" value={d.hora} onChange={e => setDraft(idx, { hora: e.target.value })} className={inp} />
                      </div>
                    </div>

                    {/* Cliente */}
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="mb-1 block text-[10px] font-semibold text-slate-500 uppercase">Cliente</label>
                        <input value={d.clienteNombre} onChange={e => setDraft(idx, { clienteNombre: e.target.value })}
                          placeholder="Nombre del cliente" className={inp} />
                      </div>
                      <div>
                        <label className="mb-1 block text-[10px] font-semibold text-slate-500 uppercase">Teléfono</label>
                        <input value={d.clienteTelefono} onChange={e => setDraft(idx, { clienteTelefono: e.target.value })}
                          placeholder="+56 9 XXXX XXXX" className={inp} />
                      </div>
                      <div className="col-span-2">
                        <label className="mb-1 block text-[10px] font-semibold text-slate-500 uppercase">Dirección</label>
                        <input value={d.direccion} onChange={e => setDraft(idx, { direccion: e.target.value })}
                          placeholder="Calle, número, dpto, comuna" className={inp} />
                      </div>
                      <div>
                        <label className="mb-1 block text-[10px] font-semibold text-slate-500 uppercase">N° OT</label>
                        <input value={d.otNumero} onChange={e => setDraft(idx, { otNumero: e.target.value })}
                          placeholder="902333" className={inp} />
                      </div>
                      <div>
                        <label className="mb-1 block text-[10px] font-semibold text-slate-500 uppercase">Vendedor</label>
                        <input value={d.vendedorNombre} onChange={e => setDraft(idx, { vendedorNombre: e.target.value })}
                          placeholder="Nombre vendedor" className={inp} />
                      </div>
                    </div>

                    {/* Trabajos */}
                    <div>
                      <label className="mb-1 block text-[10px] font-semibold text-slate-500 uppercase">Descripción general del trabajo</label>
                      <input value={d.descripcion} onChange={e => setDraft(idx, { descripcion: e.target.value })}
                        placeholder="Ej: 1 Cortina roller Blackout con cenefa" className={inp} />
                    </div>

                    {/* Ítems */}
                    <div>
                      <div className="flex items-center justify-between mb-1.5">
                        <label className="text-[10px] font-semibold text-slate-500 uppercase">Ítems / Habitaciones</label>
                        <button type="button" onClick={() => addItem(idx)}
                          className="flex items-center gap-1 rounded bg-indigo-50 px-2 py-0.5 text-[10px] font-semibold text-indigo-600 hover:bg-indigo-100">
                          <Plus size={10} /> Añadir
                        </button>
                      </div>
                      <div className="space-y-1.5">
                        {d.items.map((item, i) => (
                          <div key={i} className="flex gap-1.5 items-center">
                            <input value={item.descripcion} onChange={e => updateItem(idx, i, 'descripcion', e.target.value)}
                              placeholder="Descripción" className={`${inp} flex-1 text-xs py-1.5`} />
                            <input value={item.ubicacion} onChange={e => updateItem(idx, i, 'ubicacion', e.target.value)}
                              placeholder="Habitación" className={`${inp} w-32 text-xs py-1.5`} />
                            {d.items.length > 1 && (
                              <button type="button" onClick={() => removeItem(idx, i)}
                                className="p-1 rounded text-slate-300 hover:text-red-500">
                                <X size={12} />
                              </button>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Observaciones */}
                    <div>
                      <div className="flex items-center justify-between mb-1.5">
                        <label className="text-[10px] font-semibold text-amber-600 uppercase">⚠️ Observaciones</label>
                        <button type="button" onClick={() => addObs(idx)}
                          className="flex items-center gap-1 rounded bg-amber-50 px-2 py-0.5 text-[10px] font-semibold text-amber-600 hover:bg-amber-100">
                          <Plus size={10} /> Añadir
                        </button>
                      </div>
                      <div className="space-y-1.5">
                        {d.observaciones.map((obs, i) => (
                          <div key={i} className="flex gap-1.5 items-center">
                            <span className="text-amber-500 text-xs flex-shrink-0">⚠️</span>
                            <input value={obs} onChange={e => updateObs(idx, i, e.target.value)}
                              placeholder="Ej: Quitar cortina existente" className={`${inp} flex-1 text-xs py-1.5`} />
                            {d.observaciones.length > 1 && (
                              <button type="button" onClick={() => removeObs(idx, i)}
                                className="p-1 rounded text-slate-300 hover:text-red-500">
                                <X size={12} />
                              </button>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })}

          {/* Botón agregar tarea */}
          {drafts.length < 10 && (
            <button
              type="button"
              onClick={addDraft}
              className="w-full rounded-xl border-2 border-dashed border-indigo-200 py-3 text-sm font-semibold text-indigo-500 hover:border-indigo-400 hover:bg-indigo-50 transition flex items-center justify-center gap-2"
            >
              <Plus size={16} /> Agregar otra tarea ({drafts.length}/10)
            </button>
          )}
        </div>

        {/* Footer fijo */}
        {error && <p className="px-6 py-1 text-xs text-red-600 bg-white border-t border-red-100">{error}</p>}

        <div className="flex items-center gap-3 border-t border-slate-100 bg-white px-6 py-4 flex-shrink-0">
          <button onClick={onCancel}
            className="rounded-xl border border-slate-200 px-5 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-50">
            Cancelar
          </button>

          {/* Barra de progreso */}
          {submitting && (
            <div className="flex-1 h-2 rounded-full bg-slate-100 overflow-hidden">
              <div
                className="h-full bg-indigo-500 transition-all duration-300 rounded-full"
                style={{ width: `${(progress / drafts.length) * 100}%` }}
              />
            </div>
          )}

          <button
            onClick={submitAll}
            disabled={submitting || validCount === 0}
            className="ml-auto rounded-xl bg-indigo-500 px-6 py-2.5 text-sm font-bold text-white hover:bg-indigo-600 disabled:opacity-50 transition flex items-center gap-2"
          >
            {submitting
              ? `Creando ${progress}/${drafts.length}...`
              : `Crear ${drafts.length} tarea${drafts.length !== 1 ? 's' : ''}`}
          </button>
        </div>
      </div>
    </div>
  );
}


// ─────────────────────────────────────────────────────────────
// MAPA GPS
// ─────────────────────────────────────────────────────────────
// ─── Mapa Leaflet (carga dinámica sin npm) ────────────────────
function LeafletMap({ positions }: { positions: GpsLastPosition[] }) {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);
  const markersRef = useRef<any[]>([]);

  const initOrUpdateMap = useCallback(() => {
    const L = (window as any).L;
    if (!L || !mapRef.current) return;

    if (!mapInstanceRef.current) {
      mapInstanceRef.current = L.map(mapRef.current, { zoomControl: true });
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap',
        maxZoom: 19,
      }).addTo(mapInstanceRef.current);
    }

    // Limpiar marcadores anteriores
    markersRef.current.forEach(m => m.remove());
    markersRef.current = [];

    if (positions.length === 0) {
      mapInstanceRef.current.setView([-33.45, -70.65], 11);
      return;
    }

    const bounds: [number, number][] = [];
    positions.forEach(pos => {
      const icon = L.divIcon({
        className: '',
        html: `<div style="background:#7c3aed;color:white;border-radius:50%;width:36px;height:36px;
          display:flex;align-items:center;justify-content:center;font-size:13px;font-weight:700;
          border:3px solid white;box-shadow:0 2px 8px rgba(0,0,0,0.3);">${pos.user_nombre.charAt(0)}</div>`,
        iconSize: [36, 36],
        iconAnchor: [18, 18],
      });
      const marker = L.marker([pos.lat, pos.lon], { icon })
        .addTo(mapInstanceRef.current)
        .bindPopup(`
          <div style="font-family:Arial;min-width:160px;">
            <p style="margin:0 0 4px;font-weight:700;font-size:14px;">${pos.user_nombre}</p>
            <p style="margin:0 0 2px;font-size:12px;color:#64748b;">${pos.user_rol}</p>
            ${pos.order_id ? `<p style="margin:0;font-size:12px;">OT #${pos.order_id}</p>` : ''}
            ${pos.velocidad_kmh ? `<p style="margin:4px 0 0;font-size:12px;">${Math.round(pos.velocidad_kmh)} km/h</p>` : ''}
            <a href="${pos.maps_url}" target="_blank" style="display:block;margin-top:8px;font-size:12px;color:#3b82f6;">Ver en Google Maps →</a>
          </div>
        `);
      markersRef.current.push(marker);
      bounds.push([pos.lat, pos.lon]);
    });

    if (bounds.length === 1) {
      mapInstanceRef.current.setView(bounds[0], 14);
    } else {
      mapInstanceRef.current.fitBounds(bounds, { padding: [40, 40] });
    }
  }, [positions]);

  useEffect(() => {
    // Cargar CSS de Leaflet
    if (!document.getElementById('leaflet-css')) {
      const link = document.createElement('link');
      link.id = 'leaflet-css';
      link.rel = 'stylesheet';
      link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
      document.head.appendChild(link);
    }
    // Cargar JS de Leaflet
    if (!(window as any).L) {
      const script = document.createElement('script');
      script.id = 'leaflet-js';
      script.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
      script.onload = initOrUpdateMap;
      document.head.appendChild(script);
    } else {
      initOrUpdateMap();
    }
  }, [initOrUpdateMap]);

  return (
    <div
      ref={mapRef}
      style={{ height: 380, borderRadius: 12, overflow: 'hidden', border: '1px solid #e2e8f0' }}
    />
  );
}

export function MapaGPS() {
  const { data: gpsData, loading, refetch } = useApi(() => api.getActivePositions());
  const [autoRefresh, setAutoRefresh] = useState(true);

  const positions: GpsLastPosition[] = gpsData || [];

  // Auto-refresh cada 30 segundos
  useEffect(() => {
    if (!autoRefresh) return;
    const interval = setInterval(refetch, 30_000);
    return () => clearInterval(interval);
  }, [autoRefresh, refetch]);

  const timeSince = (s: string) => {
    const diff = Math.floor((Date.now() - new Date(s).getTime()) / 1000);
    if (diff < 60) return `hace ${diff}s`;
    if (diff < 3600) return `hace ${Math.floor(diff / 60)}min`;
    return `hace ${Math.floor(diff / 3600)}h`;
  };

  if (loading && positions.length === 0) return <Spinner />;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Mapa GPS en Tiempo Real</h1>
          <p className="text-sm text-slate-500">
            {positions.length} técnico(s) con GPS activo ·
            {autoRefresh ? ' Actualizando automáticamente' : ' Auto-actualización pausada'}
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setAutoRefresh(!autoRefresh)}
            className={`flex items-center gap-1.5 rounded-lg border px-3 py-2 text-xs font-medium transition ${
              autoRefresh
                ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
                : 'border-slate-200 bg-white text-slate-600'
            }`}
          >
            <div className={`h-2 w-2 rounded-full ${autoRefresh ? 'bg-emerald-500 animate-pulse' : 'bg-slate-400'}`} />
            {autoRefresh ? 'Live' : 'Pausado'}
          </button>
          <button onClick={refetch}
            className="flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-600 hover:bg-slate-50">
            <RefreshCw size={13} /> Actualizar
          </button>
        </div>
      </div>

      {/* Mapa Leaflet */}
      <LeafletMap positions={positions} />

      {positions.length === 0 ? (
        <div className="rounded-xl border border-slate-200 bg-white p-16 text-center">
          <Radio size={40} className="mx-auto text-slate-200" />
          <p className="mt-3 text-sm font-medium text-slate-500">Sin técnicos activos en este momento</p>
          <p className="mt-1 text-xs text-slate-400">Los técnicos aparecen aquí cuando comparten su GPS desde la app</p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {positions.map(pos => {
            const rolCfg = ROL_CONFIG[pos.user_rol as keyof typeof ROL_CONFIG];
            return (
              <div key={String(pos.user_id)}
                className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                <div className="mb-3 flex items-center gap-3">
                  <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${rolCfg?.bg || 'bg-violet-500'} text-sm font-bold text-white`}>
                    {pos.user_nombre.charAt(0).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="truncate text-sm font-bold text-slate-800">{pos.user_nombre}</p>
                    <p className="text-[11px] text-slate-500">{rolCfg?.label || pos.user_rol}</p>
                  </div>
                  <div className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                </div>

                <div className="space-y-1.5 text-xs text-slate-600">
                  {pos.order_id && (
                    <div className="flex items-center gap-1.5">
                      <ClipboardList size={12} className="text-slate-400" />
                      <span>OT <strong>#{pos.order_id}</strong></span>
                    </div>
                  )}
                  <div className="flex items-center gap-1.5">
                    <MapPin size={12} className="text-slate-400" />
                    <span>{pos.lat.toFixed(5)}, {pos.lon.toFixed(5)}</span>
                    {pos.precision_m && <span className="text-slate-400">(±{pos.precision_m}m)</span>}
                  </div>
                  {pos.velocidad_kmh && (
                    <div className="flex items-center gap-1.5">
                      <Navigation size={12} className="text-slate-400" />
                      <span>{Math.round(pos.velocidad_kmh)} km/h</span>
                    </div>
                  )}
                  <div className="flex items-center gap-1.5">
                    <Clock size={12} className="text-slate-400" />
                    <span className="text-slate-400">{timeSince(pos.last_seen)}</span>
                  </div>
                </div>

                <a
                  href={pos.maps_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-3 flex items-center justify-center gap-2 rounded-lg bg-blue-50 px-3 py-2 text-xs font-semibold text-blue-700 transition hover:bg-blue-100"
                >
                  <ExternalLink size={13} /> Ver en Google Maps
                </a>
              </div>
            );
          })}
        </div>
      )}

      {/* Instrucciones */}
      <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
        <h3 className="mb-1 text-xs font-bold text-slate-600">¿Cómo funciona?</h3>
        <p className="text-xs text-slate-500">
          Cuando un técnico marca una OT como "En Camino", la app activa automáticamente el GPS y
          envía su posición cada 30 segundos. Esta pantalla muestra las posiciones en tiempo real.
          Los técnicos pueden pausar el GPS desde su panel de instalaciones.
        </p>
      </div>
    </div>
  );
}
