/**
 * Panel del Coordinador — Agenda, GPS, Tareas, Equipos
 *
 * Rutas:
 *   /coordinador             → CoordinadorDashboard (este archivo)
 *   /coordinador/agenda      → AgendaSemanal
 *   /coordinador/tareas      → GestionTareas
 *   /coordinador/gps         → MapaGPS
 */
import { useState, useEffect } from 'react';
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
  RefreshCw, Target,
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
// GESTIÓN DE TAREAS
// ─────────────────────────────────────────────────────────────
export function GestionTareas() {
  const [showForm, setShowForm] = useState(false);
  const [fechaFiltro, setFechaFiltro] = useState(new Date().toISOString().split('T')[0]);

  const { data: tareas, loading, error, refetch } = useApi(
    () => api.getTasks({ fecha: fechaFiltro }),
    [fechaFiltro]
  );
  const { data: users } = useApi(() => api.getUsersByRole('instalador'));
  const { data: fabricantes } = useApi(() => api.getUsersByRole('fabricante'));

  const taskList: DailyTask[] = tareas || [];
  const allUsers = [...(users || []), ...(fabricantes || [])];

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

  if (loading) return <Spinner />;
  if (error) return <ErrorMessage message={error} onRetry={refetch} />;

  const byEstado = {
    pendiente: taskList.filter(t => t.estado === 'pendiente'),
    en_progreso: taskList.filter(t => t.estado === 'en_progreso'),
    completada: taskList.filter(t => t.estado === 'completada'),
    cancelada: taskList.filter(t => t.estado === 'cancelada'),
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Tareas Diarias</h1>
          <p className="text-sm text-slate-500">{taskList.length} tareas para la fecha</p>
        </div>
        <div className="flex gap-2">
          <input
            type="date"
            value={fechaFiltro}
            onChange={e => setFechaFiltro(e.target.value)}
            className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-200"
          />
          <button
            onClick={() => setShowForm(true)}
            className="flex items-center gap-1.5 rounded-lg bg-indigo-500 px-4 py-2 text-sm font-semibold text-white transition hover:bg-indigo-600"
          >
            <Plus size={15} /> Nueva Tarea
          </button>
        </div>
      </div>

      {showForm && (
        <NuevaTareaForm
          users={allUsers}
          fecha={fechaFiltro}
          onCreated={() => { setShowForm(false); refetch(); }}
          onCancel={() => setShowForm(false)}
        />
      )}

      {/* Estadísticas */}
      <div className="grid grid-cols-4 gap-3">
        {[
          { label: 'Pendientes', count: byEstado.pendiente.length, dot: 'bg-slate-400' },
          { label: 'En Progreso', count: byEstado.en_progreso.length, dot: 'bg-blue-500' },
          { label: 'Completadas', count: byEstado.completada.length, dot: 'bg-emerald-500' },
          { label: 'Canceladas', count: byEstado.cancelada.length, dot: 'bg-gray-300' },
        ].map(s => (
          <div key={s.label} className="rounded-xl border border-slate-200 bg-white p-3 text-center">
            <div className={`mx-auto mb-1 h-2.5 w-2.5 rounded-full ${s.dot}`} />
            <p className="text-xl font-bold text-slate-900">{s.count}</p>
            <p className="text-[11px] text-slate-500">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Lista de tareas */}
      {taskList.length === 0 ? (
        <div className="rounded-xl border border-slate-200 bg-white p-12 text-center">
          <ListTodo size={36} className="mx-auto text-slate-200" />
          <p className="mt-3 text-sm text-slate-400">Sin tareas para esta fecha</p>
        </div>
      ) : (
        <div className="space-y-2">
          {taskList.map(t => {
            const pr = PRIORIDAD_CONFIG[t.prioridad] || PRIORIDAD_CONFIG.normal;
            const est = TASK_ESTADO_CONFIG[t.estado] || TASK_ESTADO_CONFIG.pendiente;
            return (
              <div key={t.id}
                className={`flex items-start gap-3 rounded-xl border bg-white p-4 transition ${t.estado === 'completada' ? 'opacity-60' : ''}`}>
                {/* Indicador prioridad */}
                <div className={`mt-1 h-3 w-1 shrink-0 rounded-full ${pr.dot}`} />
                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-start gap-2">
                    <p className={`text-sm font-semibold text-slate-800 ${t.estado === 'completada' ? 'line-through' : ''}`}>{t.titulo}</p>
                    <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${pr.bg} ${pr.color}`}>{pr.label}</span>
                    <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${est.bg} ${est.color}`}>{est.label}</span>
                  </div>
                  {t.descripcion && <p className="mt-1 text-xs text-slate-500">{t.descripcion}</p>}
                  <div className="mt-1.5 flex flex-wrap gap-2 text-[11px] text-slate-400">
                    <span className="flex items-center gap-1"><Users size={10} /> {t.asignado_a_nombre || t.asignado_a}</span>
                    {t.order_id && <span>· OT #{t.order_id}</span>}
                    {t.completado_at && <span>· ✓ {fmtDateTime(t.completado_at)}</span>}
                  </div>
                  {t.notas_cierre && (
                    <p className="mt-1 rounded bg-slate-50 px-2 py-1 text-[11px] text-slate-500 italic">"{t.notas_cierre}"</p>
                  )}
                </div>
                {/* Acciones */}
                {t.estado === 'pendiente' && (
                  <div className="flex gap-1.5 shrink-0">
                    <button onClick={() => completar(t)}
                      className="rounded-lg bg-emerald-50 p-1.5 text-emerald-600 hover:bg-emerald-100">
                      <CheckCircle2 size={14} />
                    </button>
                    <button onClick={() => cancelar(t)}
                      className="rounded-lg bg-red-50 p-1.5 text-red-500 hover:bg-red-100">
                      <X size={14} />
                    </button>
                  </div>
                )}
              </div>
            );
          })}
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


// ─── Formulario nueva tarea ───────────────────────────────────
function NuevaTareaForm({ users, fecha, onCreated, onCancel }: {
  users: any[]; fecha: string;
  onCreated: () => void; onCancel: () => void;
}) {
  const [titulo, setTitulo] = useState('');
  const [descripcion, setDescripcion] = useState('');
  const [asignadoA, setAsignadoA] = useState('');
  const [prioridad, setPrioridad] = useState('normal');
  const [fechaTarea, setFechaTarea] = useState(fecha);
  const [error, setError] = useState('');

  const { execute: create, loading } = useMutation((data: any) => api.createTask(data));

  const submit = async () => {
    if (!titulo.trim()) { setError('El título es obligatorio'); return; }
    if (!asignadoA) { setError('Debes seleccionar un trabajador'); return; }
    setError('');
    const res = await create({
      titulo: titulo.trim(),
      descripcion: descripcion.trim() || undefined,
      asignado_a: Number(asignadoA),
      prioridad,
      fecha_tarea: fechaTarea,
    });
    if (res) onCreated();
  };

  return (
    <div className="rounded-xl border border-indigo-200 bg-indigo-50 p-5">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-sm font-bold text-indigo-800">Nueva Tarea</h3>
        <button onClick={onCancel} className="text-slate-400 hover:text-slate-600"><X size={16} /></button>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <label className="mb-1 block text-xs font-semibold text-slate-600">Título *</label>
          <input value={titulo} onChange={e => setTitulo(e.target.value)} placeholder="¿Qué hay que hacer?"
            className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-200" />
        </div>
        <div>
          <label className="mb-1 block text-xs font-semibold text-slate-600">Asignar a *</label>
          <select value={asignadoA} onChange={e => setAsignadoA(e.target.value)}
            className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-200">
            <option value="">— Seleccionar —</option>
            {users.map(u => (
              <option key={u.id} value={u.id}>{u.nombre} ({u.rol})</option>
            ))}
          </select>
        </div>
        <div>
          <label className="mb-1 block text-xs font-semibold text-slate-600">Prioridad</label>
          <select value={prioridad} onChange={e => setPrioridad(e.target.value)}
            className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-200">
            <option value="baja">Baja</option>
            <option value="normal">Normal</option>
            <option value="alta">Alta</option>
            <option value="urgente">Urgente</option>
          </select>
        </div>
        <div>
          <label className="mb-1 block text-xs font-semibold text-slate-600">Fecha</label>
          <input type="date" value={fechaTarea} onChange={e => setFechaTarea(e.target.value)}
            className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-200" />
        </div>
        <div>
          <label className="mb-1 block text-xs font-semibold text-slate-600">Descripción</label>
          <input value={descripcion} onChange={e => setDescripcion(e.target.value)} placeholder="Detalles adicionales..."
            className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-200" />
        </div>
      </div>
      {error && <p className="mt-2 text-xs text-red-600">{error}</p>}
      <div className="mt-4 flex gap-2 justify-end">
        <button onClick={onCancel}
          className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50">
          Cancelar
        </button>
        <button onClick={submit} disabled={loading}
          className="rounded-lg bg-indigo-500 px-4 py-2 text-xs font-semibold text-white hover:bg-indigo-600 disabled:opacity-60">
          {loading ? 'Creando...' : 'Crear Tarea'}
        </button>
      </div>
    </div>
  );
}


// ─────────────────────────────────────────────────────────────
// MAPA GPS
// ─────────────────────────────────────────────────────────────
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
