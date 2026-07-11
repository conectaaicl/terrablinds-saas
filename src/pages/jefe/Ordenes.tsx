import { useState, useMemo, useCallback } from 'react';
import { Link, useParams, useNavigate, useMatch, useSearchParams } from 'react-router-dom';

import { useApi } from '../../hooks/useApi';
import { useMutation } from '../../hooks/useMutation';
import { api } from '../../services/api';
import { ESTADO_CONFIG } from '../../types';
import type { EstadoOrden } from '../../types';
import { Spinner, ErrorMessage } from '../../components/LoadingStates';
import { Search, Filter, ArrowLeft, Clock, User, Ruler, Palette, ChevronRight, Loader2, ExternalLink, Shield, UserPlus, Camera, FileText, PenLine, ListTodo, CheckCircle2, Circle } from 'lucide-react';

function GoogleMapsLink({ direccion }: { direccion: string }) {
  const url = `https://maps.google.com/?q=${encodeURIComponent(direccion)}`;
  return (
    <a href={url} target="_blank" rel="noopener noreferrer"
      className="flex items-center gap-1 text-indigo-400 hover:text-indigo-300 hover:underline text-xs">
      <ExternalLink size={11} />{direccion}
    </a>
  );
}

const fmt = (n: number) => '$' + n.toLocaleString('es-CL');
const fmtDate = (s: string) => s ? new Date(s).toLocaleDateString('es-CL') : '—';

// ═══════════════════════════════════════════════
// LISTA DE ÓRDENES
// ═══════════════════════════════════════════════
function QuickAssignCell({
  orderId, currentId, currentNombre, userList, tipo, onAssigned,
}: {
  orderId: number; currentId?: number; currentNombre?: string;
  userList: any[]; tipo: 'fabricante' | 'instalador'; onAssigned: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  const doAssign = async (uid: string) => {
    if (!uid) return;
    setSaving(true);
    try {
      if (tipo === 'fabricante') await api.assignFabricante(orderId, Number(uid));
      else await api.assignInstalador(orderId, Number(uid));
      onAssigned();
    } finally {
      setSaving(false);
      setOpen(false);
    }
  };

  if (currentId && !open) {
    return (
      <div className="flex items-center gap-1 group">
        <span className="text-xs text-slate-300 font-medium truncate max-w-[90px]">{currentNombre}</span>
        <button onClick={() => setOpen(true)}
          className="opacity-0 group-hover:opacity-100 transition-opacity text-slate-500 hover:text-slate-300">
          <UserPlus size={12} />
        </button>
      </div>
    );
  }

  return (
    <select
      autoFocus={open}
      value=""
      disabled={saving}
      onChange={e => doAssign(e.target.value)}
      onBlur={() => setOpen(false)}
      className="rounded-lg border border-[rgba(255,255,255,0.08)] bg-[rgba(255,255,255,0.04)] py-0.5 pl-1.5 pr-6 text-xs text-slate-300 outline-none focus:border-indigo-500 max-w-[110px] disabled:opacity-60"
    >
      <option value="">— {tipo === 'fabricante' ? 'Fabricante' : 'Instalador'} —</option>
      {userList.map((u: any) => <option key={u.id} value={u.id}>{u.nombre}</option>)}
    </select>
  );
}

// ─── Reporte de Instalación (jefe / coordinador / vendedor) ───
const API_URL_O = (import.meta as any).env?.VITE_API_URL ?? 'http://localhost:8000';

const CHECKLIST_ITEMS_J = [
  { id: 'llegada',    label: 'Llegó al domicilio del cliente' },
  { id: 'materiales', label: 'Verificó materiales y herramientas' },
  { id: 'medidas',    label: 'Confirmó medidas en terreno' },
  { id: 'instalacion',label: 'Instalación realizada conforme' },
  { id: 'limpieza',   label: 'Zona de trabajo limpia y ordenada' },
  { id: 'cliente_ok', label: 'Cliente revisó y aprobó el trabajo' },
  { id: 'fotos_ok',   label: 'Fotos de antes y después tomadas' },
];

function ReporteInstalacion({ orderId }: { orderId: number }) {
  const { data: fotos } = useApi(() => api.getOrderPhotos(orderId), [orderId]);
  const { data: sigData } = useApi(() => api.getSignature(orderId), [orderId]);
  const fotoList: any[] = fotos || [];
  const firma = sigData?.firma;
  const { data: checklistData } = useApi(() => api.getChecklist(orderId), [orderId]);
  const checkItems: Record<string, boolean> = (checklistData as any)?.items || {};
  const checkDone = CHECKLIST_ITEMS_J.filter(i => checkItems[i.id]).length;

  const TIPO_CFG: Record<string, { label: string; color: string }> = {
    antes:   { label: 'Antes',   color: 'bg-slate-100 text-slate-600 border-slate-200'      },
    durante: { label: 'Durante', color: 'bg-blue-50 text-blue-600 border-blue-200'           },
    despues: { label: 'Después', color: 'bg-emerald-50 text-emerald-700 border-emerald-200'  },
    otro:    { label: 'Otro',    color: 'bg-slate-100 text-slate-500 border-slate-200'       },
    problema:{ label: 'Problema',color: 'bg-red-50 text-red-600 border-red-200'              },
  };

  const byTipo = (tipo: string) => fotoList.filter(f => f.tipo === tipo);
  const fmtD = (s: string) => s ? new Date(s).toLocaleString('es-CL', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }) : '—';

  if (fotoList.length === 0 && !firma && checkDone === 0) {
    return (
      <div className="rounded-2xl border border-[rgba(255,255,255,0.07)] bg-[rgba(10,16,32,0.9)] p-5 text-center">
        <Camera size={28} className="mx-auto mb-2 text-slate-500" />
        <p className="text-sm text-slate-400">Sin fotos ni firma registradas</p>
        <p className="text-xs text-slate-500">El instalador aún no ha cargado el reporte de cierre</p>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-[rgba(255,255,255,0.07)] bg-[rgba(10,16,32,0.9)] backdrop-blur-xl p-5 space-y-5">
      <h2 className="flex items-center gap-2 text-base font-semibold text-slate-100">
        <Camera size={16} /> Reporte de Instalación
        <span className="ml-auto text-xs font-normal text-slate-400">{fotoList.length} foto{fotoList.length !== 1 ? 's' : ''}</span>
      </h2>

      {/* Firma del cliente */}
      {firma && (
        <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/10 p-3">
          <div className="flex items-center gap-2">
            <PenLine size={14} className="text-emerald-400" />
            <p className="text-sm font-semibold text-emerald-300">Firmado por cliente</p>
          </div>
          <p className="mt-1 text-xs text-slate-300">{firma.firmante_nombre}
            {firma.firmante_rut && <span className="ml-2 text-slate-400">· {firma.firmante_rut}</span>}
          </p>
          <p className="text-xs text-slate-400">{fmtD(firma.firmado_at)}</p>
        </div>
      )}

      {/* Checklist del instalador */}
      {checkDone > 0 && (
        <div className="rounded-xl border border-[rgba(255,255,255,0.07)] bg-[rgba(255,255,255,0.02)] p-3">
          <div className="mb-2 flex items-center gap-2">
            <ListTodo size={14} className="text-slate-400" />
            <p className="text-sm font-semibold text-slate-200">Checklist del instalador</p>
            <span className={`ml-auto rounded-full px-2 py-0.5 text-[11px] font-bold ${checkDone === CHECKLIST_ITEMS_J.length ? 'bg-emerald-500/15 text-emerald-300' : 'bg-slate-500/15 text-slate-300'}`}>{checkDone}/{CHECKLIST_ITEMS_J.length}</span>
          </div>
          <div className="space-y-1.5">
            {CHECKLIST_ITEMS_J.map(item => (
              <div key={item.id} className="flex items-center gap-2 text-[13px]">
                {checkItems[item.id]
                  ? <CheckCircle2 size={14} className="shrink-0 text-emerald-400" />
                  : <Circle size={14} className="shrink-0 text-slate-600" />}
                <span className={checkItems[item.id] ? 'text-slate-300' : 'text-slate-500'}>{item.label}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Fotos por tipo */}
      {(['antes', 'durante', 'despues', 'otro', 'problema'] as const).map(t => {
        const list = byTipo(t);
        if (list.length === 0) return null;
        const cfg = TIPO_CFG[t];
        return (
          <div key={t}>
            <p className={`mb-2 inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-semibold ${cfg.color}`}>
              {cfg.label} ({list.length})
            </p>
            <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
              {list.map((f: any) => (
                <a key={f.id} href={`${API_URL_O}${f.url}`} target="_blank" rel="noopener noreferrer"
                  className="aspect-square overflow-hidden rounded-lg border border-[rgba(255,255,255,0.08)] bg-slate-800">
                  <img src={`${API_URL_O}${f.url}`} alt={cfg.label}
                    className="h-full w-full object-cover opacity-90 transition hover:opacity-100" />
                </a>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}

export function OrdenesLista() {
  const isCoord = !!useMatch('/coordinador/*');
  const isGerente = !!useMatch('/gerente/*');
  const base = isCoord ? '/coordinador' : isGerente ? '/gerente' : '/jefe';

  const [searchParams] = useSearchParams();
  const [search, setSearch] = useState('');
  const [filtro, setFiltro] = useState(searchParams.get('estado') || 'todos');

  const { data: orders, loading, error, refetch } = useApi(() => api.getOrders());
  const { data: fabricantes } = useApi(() => api.getUsersByRole('fabricante'));
  const { data: instaladores } = useApi(() => api.getUsersByRole('instalador'));
  const orderList: any[] = orders || [];
  const fabList: any[] = fabricantes || [];
  const insList: any[] = instaladores || [];

  const filtered = useMemo(() => orderList.filter(o => {
    const ms = !search ||
      String(o.numero).includes(search) ||
      (o.cliente_nombre || '').toLowerCase().includes(search.toLowerCase());
    const me = filtro === 'todos' || o.estado === filtro;
    return ms && me;
  }), [orderList, search, filtro]);

  if (loading) return <Spinner />;
  if (error) return <ErrorMessage message={error} onRetry={refetch} />;

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold text-slate-100">Órdenes</h1>
        <p className="text-sm text-slate-400">{orderList.length} órdenes en total</p>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row">
        <div className="relative flex-1">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar por N° o cliente..."
            className="w-full rounded-xl border border-[rgba(255,255,255,0.08)] bg-[rgba(255,255,255,0.04)] py-2 pl-9 pr-3 text-sm text-slate-100 placeholder:text-slate-500 outline-none focus:border-indigo-500" />
        </div>
        <div className="relative">
          <Filter size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <select value={filtro} onChange={e => setFiltro(e.target.value)}
            className="rounded-xl border border-[rgba(255,255,255,0.08)] bg-[rgba(255,255,255,0.04)] py-2 pl-9 pr-8 text-sm text-slate-100 outline-none focus:border-indigo-500">
            <option value="todos">Todos</option>
            {(Object.keys(ESTADO_CONFIG) as EstadoOrden[]).map(e => (
              <option key={e} value={e}>{ESTADO_CONFIG[e].label}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="overflow-x-auto rounded-2xl border border-[rgba(255,255,255,0.07)] bg-[rgba(10,16,32,0.9)] backdrop-blur-xl shadow-[0_32px_80px_rgba(0,0,0,0.5)]">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-[rgba(255,255,255,0.06)] bg-[rgba(255,255,255,0.04)] text-left text-xs font-semibold uppercase tracking-wider text-slate-400">
              <th className="px-4 py-3">Orden</th>
              <th className="px-4 py-3">Cliente</th>
              <th className="hidden px-4 py-3 md:table-cell">Vendedor</th>
              <th className="px-4 py-3">Estado</th>
              <th className="hidden px-4 py-3 xl:table-cell">Fabricante</th>
              <th className="hidden px-4 py-3 xl:table-cell">Instalador</th>
              <th className="hidden px-4 py-3 text-right sm:table-cell">Total</th>
              <th className="hidden px-4 py-3 lg:table-cell">Fecha</th>
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody>
            {filtered.map(o => {
              const cfg = ESTADO_CONFIG[o.estado as EstadoOrden] || ESTADO_CONFIG.cotizado;
              return (
                <tr key={o.id} className="border-b border-[rgba(255,255,255,0.06)] hover:bg-[rgba(255,255,255,0.02)] transition">
                  <td className="px-4 py-3 font-semibold text-slate-100">#{o.numero}</td>
                  <td className="px-4 py-3 text-slate-300">{o.cliente_nombre || '—'}</td>
                  <td className="hidden px-4 py-3 text-slate-400 md:table-cell">{o.vendedor_nombre || '—'}</td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex rounded-full px-2 py-0.5 text-[11px] font-semibold ${cfg.bg} ${cfg.color}`}>{cfg.label}</span>
                  </td>
                  <td className="hidden px-4 py-3 xl:table-cell">
                    <QuickAssignCell
                      orderId={o.id} currentId={o.fabricante_id} currentNombre={o.fabricante_nombre}
                      userList={fabList} tipo="fabricante" onAssigned={refetch} />
                  </td>
                  <td className="hidden px-4 py-3 xl:table-cell">
                    <QuickAssignCell
                      orderId={o.id} currentId={o.instalador_id} currentNombre={o.instalador_nombre}
                      userList={insList} tipo="instalador" onAssigned={refetch} />
                  </td>
                  <td className="hidden px-4 py-3 text-right font-semibold text-slate-100 sm:table-cell">{fmt(o.precio_total)}</td>
                  <td className="hidden px-4 py-3 text-slate-400 lg:table-cell">{fmtDate(o.created_at)}</td>
                  <td className="px-4 py-3">
                    <Link to={`${base}/ordenes/${o.id}`} className="text-indigo-400 hover:text-indigo-300">
                      <ChevronRight size={17} />
                    </Link>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {filtered.length === 0 && <div className="p-10 text-center text-sm text-slate-400">Sin resultados</div>}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════
// DETALLE DE ORDEN
// ═══════════════════════════════════════════════
export function OrdenDetalle() {
  const { id } = useParams();
  const nav = useNavigate();
  const numId = Number(id);

  const { data: orden, loading, error, refetch } = useApi(
    () => api.getOrder(numId),
    [numId]
  );
  const { data: fabricantes } = useApi(() => api.getUsersByRole('fabricante'));
  const { data: instaladores } = useApi(() => api.getUsersByRole('instalador'));

  const { execute: cambiarEstado, loading: changingEstado } = useMutation(
    (estado: string, notas?: string) => api.changeEstado(numId, estado, notas)
  );
  const { execute: asignarFab, loading: assigningFab } = useMutation(
    (uid: number) => api.assignFabricante(numId, uid)
  );
  const { execute: asignarIns, loading: assigningIns } = useMutation(
    (uid: number) => api.assignInstalador(numId, uid)
  );
  const { execute: updateGarantia } = useMutation(
    (data: { garantia_meses?: number; fecha_instalacion?: string }) => api.updateGarantia(numId, data)
  );

  const [showGarantia, setShowGarantia] = useState(false);
  const [garantiaForm, setGarantiaForm] = useState({ garantia_meses: '', fecha_instalacion: '' });

  const doChange = useCallback(async (estado: string, notas?: string) => {
    const res = await cambiarEstado(estado, notas);
    if (res) refetch();
  }, [cambiarEstado, refetch]);

  const doAsignarFab = useCallback(async (uid: string) => {
    const res = await asignarFab(Number(uid));
    if (res) refetch();
  }, [asignarFab, refetch]);

  const doAsignarIns = useCallback(async (uid: string) => {
    const res = await asignarIns(Number(uid));
    if (res) refetch();
  }, [asignarIns, refetch]);

  if (loading) return <Spinner />;
  if (error) return <ErrorMessage message={error} onRetry={refetch} />;
  if (!orden) return <div className="py-20 text-center text-slate-400">Orden no encontrada</div>;

  const cfg = ESTADO_CONFIG[orden.estado as EstadoOrden] || ESTADO_CONFIG.cotizado;
  const fabList: any[] = fabricantes || [];
  const insList: any[] = instaladores || [];

  return (
    <div className="space-y-5">
      <button onClick={() => nav(-1)} className="flex items-center gap-1 text-sm font-medium text-slate-400 hover:text-slate-100">
        <ArrowLeft size={15} /> Volver
      </button>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-100">#{orden.numero}</h1>
          <p className="text-sm text-slate-400">Creada el {fmtDate(orden.created_at)}</p>
        </div>
        <span className={`rounded-full px-3 py-1 text-sm font-semibold ${cfg.bg} ${cfg.color}`}>{cfg.label}</span>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-2">
          <div className="rounded-2xl border border-[rgba(255,255,255,0.07)] bg-[rgba(10,16,32,0.9)] backdrop-blur-xl shadow-[0_32px_80px_rgba(0,0,0,0.5)] p-5">
            <h2 className="mb-4 text-base font-semibold text-slate-100">Personas</h2>
            <div className="grid gap-3 sm:grid-cols-2">
              <InfoCard label="Cliente" name={orden.cliente_nombre} detail={undefined} direccion={orden.cliente_direccion} />
              <InfoCard label="Vendedor" name={orden.vendedor_nombre} detail={undefined} />

              {/* Fabricante */}
              <div className="rounded-xl bg-[rgba(255,255,255,0.03)] border border-[rgba(255,255,255,0.06)] p-3">
                <p className="text-[11px] font-semibold uppercase text-slate-400">Fabricante</p>
                {orden.fabricante_nombre ? (
                  <p className="mt-1 text-sm font-medium text-slate-100">{orden.fabricante_nombre}</p>
                ) : ['aprobada', 'confirmado', 'en_fabricacion'].includes(orden.estado) ? (
                  <select
                    defaultValue=""
                    onChange={e => e.target.value && doAsignarFab(e.target.value)}
                    disabled={assigningFab}
                    className="mt-1 w-full rounded-lg border border-amber-500/30 bg-amber-500/10 px-2 py-1.5 text-sm font-medium text-amber-400"
                  >
                    <option value="" disabled>
                      {assigningFab ? 'Asignando...' : 'Asignar fabricante →'}
                    </option>
                    {fabList.map(f => <option key={f.id} value={f.id}>{f.nombre}</option>)}
                  </select>
                ) : <p className="mt-1 text-sm text-slate-500">Sin asignar</p>}
              </div>

              {/* Instalador */}
              <div className="rounded-xl bg-[rgba(255,255,255,0.03)] border border-[rgba(255,255,255,0.06)] p-3">
                <p className="text-[11px] font-semibold uppercase text-slate-400">Instalador</p>
                {orden.instalador_nombre ? (
                  <p className="mt-1 text-sm font-medium text-slate-100">{orden.instalador_nombre}</p>
                ) : ['listo_para_instalar', 'fabricado', 'instalacion_programada'].includes(orden.estado) ? (
                  <select
                    defaultValue=""
                    onChange={e => e.target.value && doAsignarIns(e.target.value)}
                    disabled={assigningIns}
                    className="mt-1 w-full rounded-lg border border-violet-500/30 bg-violet-500/10 px-2 py-1.5 text-sm font-medium text-violet-400"
                  >
                    <option value="" disabled>
                      {assigningIns ? 'Asignando...' : 'Asignar instalador →'}
                    </option>
                    {insList.map(i => <option key={i.id} value={i.id}>{i.nombre}</option>)}
                  </select>
                ) : <p className="mt-1 text-sm text-slate-500">Sin asignar</p>}
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-[rgba(255,255,255,0.07)] bg-[rgba(10,16,32,0.9)] backdrop-blur-xl shadow-[0_32px_80px_rgba(0,0,0,0.5)] p-5">
            <h2 className="mb-4 text-base font-semibold text-slate-100">
              Productos ({orden.productos?.length || 0})
            </h2>
            <div className="space-y-2.5">
              {(orden.productos || []).map((p: any, i: number) => (
                <div key={p.id || i} className="rounded-xl border border-[rgba(255,255,255,0.06)] bg-[rgba(255,255,255,0.02)] p-4">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-sm font-semibold text-slate-100">{i + 1}. {p.tipo}</p>
                      <div className="mt-1.5 flex flex-wrap gap-3 text-xs text-slate-400">
                        <span className="flex items-center gap-1"><Ruler size={12} />{p.ancho} × {p.alto} cm</span>
                        <span className="flex items-center gap-1"><Palette size={12} />{p.tela} · {p.color}</span>
                      </div>
                    </div>
                    <span className="text-sm font-bold text-slate-100">{fmt(p.precio)}</span>
                  </div>
                </div>
              ))}
              <div className="flex justify-end border-t border-[rgba(255,255,255,0.06)] pt-3">
                <p className="text-lg font-bold text-slate-100">Total: {fmt(orden.precio_total)}</p>
              </div>
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <div className="rounded-2xl border border-[rgba(255,255,255,0.07)] bg-[rgba(10,16,32,0.9)] backdrop-blur-xl shadow-[0_32px_80px_rgba(0,0,0,0.5)] p-5">
            <h2 className="mb-3 text-base font-semibold text-slate-100">Acciones</h2>
            <div className="space-y-2">
              {changingEstado && (
                <div className="flex justify-center py-2">
                  <Loader2 size={18} className="animate-spin text-slate-400" />
                </div>
              )}
              {/* Etapa 1: Ventas */}
              {['cotizacion', 'cotizado'].includes(orden.estado) && (
                <Btn onClick={() => doChange('cotizacion_enviada')} color="blue">Enviar Cotización al Cliente</Btn>
              )}
              {orden.estado === 'cotizacion_enviada' && (
                <Btn onClick={() => doChange('aceptada')} color="blue">Registrar Aceptación del Cliente</Btn>
              )}
              {orden.estado === 'aceptada' && (
                <Btn onClick={() => doChange('ot_creada')} color="blue">Crear Orden de Trabajo</Btn>
              )}
              {/* Etapa 2: Revisión */}
              {orden.estado === 'ot_creada' && (
                <Btn onClick={() => doChange('aprobada')} color="amber">Aprobar OT</Btn>
              )}
              {['aprobada', 'confirmado'].includes(orden.estado) && (
                <Btn onClick={() => doChange('en_fabricacion')} color="amber">Enviar a Fabricación</Btn>
              )}
              {/* Recuperación de problema */}
              {orden.estado === 'problema' && (
                <Btn onClick={() => doChange('en_fabricacion')} color="blue">Reactivar → Fabricación</Btn>
              )}
              {/* Alertas de estado */}
              {orden.estado === 'listo_para_instalar' && (
                <div className="rounded-xl bg-emerald-500/10 border border-emerald-500/20 p-3 text-center text-xs font-medium text-emerald-400">
                  Listo · Coordinador agenda la instalación
                </div>
              )}
              {/* Acciones críticas */}
              {!['problema', 'cerrada', 'cerrado', 'cancelada', 'cancelado', 'rechazada', 'rechazado'].includes(orden.estado) && (
                <Btn onClick={() => {
                  const notas = prompt('Describe el problema:');
                  if (notas) doChange('problema', notas);
                }} color="red" outline>Marcar Problema</Btn>
              )}
              {!['cerrada', 'cerrado', 'cancelada', 'cancelado', 'rechazada', 'rechazado'].includes(orden.estado) && (
                <Btn onClick={() => {
                  const notas = prompt('Motivo de cancelación:');
                  if (notas) doChange('cancelada', notas);
                }} color="red" outline>Cancelar Orden</Btn>
              )}
              <button
                onClick={() => {
                  setGarantiaForm({
                    garantia_meses: String(orden.garantia_meses || ''),
                    fecha_instalacion: orden.fecha_instalacion ? orden.fecha_instalacion.slice(0, 10) : '',
                  });
                  setShowGarantia(v => !v);
                }}
                className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-sm font-semibold border border-emerald-500/30 bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/15 transition">
                <Shield size={14} /> Configurar Garantía
              </button>
              {showGarantia && (
                <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/10 p-3 space-y-2">
                  <div>
                    <label className="block text-xs font-semibold text-emerald-400 mb-1">Meses de Garantía</label>
                    <input type="number" min="1" max="120"
                      value={garantiaForm.garantia_meses}
                      onChange={e => setGarantiaForm(f => ({ ...f, garantia_meses: e.target.value }))}
                      placeholder="Ej: 12"
                      className="block w-full rounded-xl border border-[rgba(255,255,255,0.08)] bg-[rgba(255,255,255,0.04)] px-3 py-1.5 text-sm text-slate-100 outline-none focus:border-indigo-500" />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-emerald-400 mb-1">Fecha de Instalación</label>
                    <input type="date"
                      value={garantiaForm.fecha_instalacion}
                      onChange={e => setGarantiaForm(f => ({ ...f, fecha_instalacion: e.target.value }))}
                      className="block w-full rounded-xl border border-[rgba(255,255,255,0.08)] bg-[rgba(255,255,255,0.04)] px-3 py-1.5 text-sm text-slate-100 outline-none focus:border-indigo-500" />
                  </div>
                  <button
                    onClick={async () => {
                      const payload: { garantia_meses?: number; fecha_instalacion?: string } = {};
                      if (garantiaForm.garantia_meses) payload.garantia_meses = parseInt(garantiaForm.garantia_meses);
                      if (garantiaForm.fecha_instalacion) payload.fecha_instalacion = garantiaForm.fecha_instalacion;
                      await updateGarantia(payload);
                      setShowGarantia(false);
                      refetch();
                    }}
                    className="w-full py-1.5 rounded-xl bg-gradient-to-r from-indigo-500 to-violet-600 text-white text-xs font-semibold hover:opacity-90 transition">
                    Guardar Garantía
                  </button>
                </div>
              )}
            </div>
          </div>

          <div className="rounded-2xl border border-[rgba(255,255,255,0.07)] bg-[rgba(10,16,32,0.9)] backdrop-blur-xl shadow-[0_32px_80px_rgba(0,0,0,0.5)] p-5">
            <h2 className="mb-3 flex items-center gap-2 text-base font-semibold text-slate-100">
              <Clock size={16} /> Historial
            </h2>
            <Timeline entries={[...(orden.historial || [])].reverse()} />
          </div>

          {/* Garantía */}
          {orden.garantia_meses && orden.fecha_instalacion && (() => {
            const fechaInst = new Date(orden.fecha_instalacion);
            const fechaVence = new Date(fechaInst);
            fechaVence.setMonth(fechaVence.getMonth() + orden.garantia_meses);
            const hoy = new Date();
            const activa = fechaVence > hoy;
            const diasRestantes = Math.ceil((fechaVence.getTime() - hoy.getTime()) / (1000 * 60 * 60 * 24));
            return (
              <div className={`rounded-2xl border p-4 ${activa ? 'border-emerald-500/20 bg-emerald-500/10' : 'border-[rgba(255,255,255,0.07)] bg-[rgba(255,255,255,0.03)]'}`}>
                <div className="flex items-center gap-2 mb-2">
                  <Shield size={16} className={activa ? 'text-emerald-400' : 'text-slate-500'} />
                  <h3 className={`text-sm font-semibold ${activa ? 'text-emerald-400' : 'text-slate-400'}`}>
                    Garantía {activa ? 'Activa' : 'Vencida'}
                  </h3>
                  <span className={`ml-auto text-xs font-bold px-2 py-0.5 rounded-full ${activa ? 'bg-emerald-500/20 text-emerald-400' : 'bg-[rgba(255,255,255,0.05)] text-slate-400'}`}>
                    {orden.garantia_meses} meses
                  </span>
                </div>
                <div className="space-y-1 text-xs text-slate-400">
                  <p>Instalación: <span className="font-medium text-slate-300">{fmtDate(orden.fecha_instalacion)}</span></p>
                  <p>Vencimiento: <span className="font-medium text-slate-300">{fechaVence.toLocaleDateString('es-CL')}</span></p>
                  {activa && <p className={`font-semibold ${diasRestantes <= 30 ? 'text-amber-400' : 'text-emerald-400'}`}>
                    {diasRestantes} día{diasRestantes !== 1 ? 's' : ''} restantes
                  </p>}
                  {!activa && <p className="text-slate-500">Venció hace {Math.abs(diasRestantes)} días</p>}
                </div>
              </div>
            );
          })()}
        </div>
      </div>

      {/* Descripción del trabajo */}
      {orden.notas_cierre && (
        <div className="rounded-2xl border border-[rgba(255,255,255,0.07)] bg-[rgba(10,16,32,0.9)] backdrop-blur-xl p-5">
          <h2 className="mb-2 flex items-center gap-2 text-base font-semibold text-slate-100">
            <FileText size={16} /> Descripción del trabajo realizado
          </h2>
          <p className="text-sm text-slate-300 whitespace-pre-wrap leading-relaxed">{orden.notas_cierre}</p>
        </div>
      )}

      {/* Reporte de instalación (fotos + firma) */}
      {['instalacion_programada', 'agendado', 'instalando', 'en_instalacion', 'en_camino', 'en_ruta',
        'instalacion_completada', 'pendiente_firma', 'cerrada', 'cerrado'].includes(orden.estado) && (
        <ReporteInstalacion orderId={numId} />
      )}
    </div>
  );
}

// ── Helpers ──
function InfoCard({ label, name, detail, direccion }: { label: string; name?: string; detail?: string; direccion?: string }) {
  return (
    <div className="rounded-xl bg-[rgba(255,255,255,0.03)] border border-[rgba(255,255,255,0.06)] p-3">
      <p className="text-[11px] font-semibold uppercase text-slate-400">{label}</p>
      <p className="mt-1 text-sm font-medium text-slate-100">{name || '—'}</p>
      {detail && <p className="whitespace-pre-line text-xs text-slate-400">{detail}</p>}
      {direccion && <GoogleMapsLink direccion={direccion} />}
    </div>
  );
}

function Btn({ children, onClick, color, outline }: { children: React.ReactNode; onClick: () => void; color: string; outline?: boolean }) {
  const base = outline
    ? `border ${color === 'red' ? 'border-red-500/30 bg-red-500/10 text-red-400 hover:bg-red-500/15' : 'border-[rgba(255,255,255,0.08)] text-slate-300 hover:bg-[rgba(255,255,255,0.04)]'}`
    : `text-white ${color === 'blue' ? 'bg-gradient-to-r from-indigo-500 to-violet-600 hover:opacity-90 shadow-[0_4px_24px_rgba(99,102,241,0.35)]' : color === 'red' ? 'bg-red-500 hover:bg-red-600' : 'bg-amber-500 hover:bg-amber-600'}`;
  return <button onClick={onClick} className={`w-full rounded-xl px-3 py-2 text-sm font-semibold transition hover:-translate-y-0.5 ${base}`}>{children}</button>;
}

function Timeline({ entries }: { entries: { estado: string; fecha: string; usuario_nombre: string; notas?: string }[] }) {
  return (
    <div className="space-y-0">
      {entries.map((h, i) => {
        const c = ESTADO_CONFIG[h.estado as EstadoOrden] || ESTADO_CONFIG.cotizado;
        return (
          <div key={i} className="flex gap-3">
            <div className="flex flex-col items-center">
              <div className={`mt-0.5 h-2.5 w-2.5 rounded-full ${i === 0 ? c.dot : 'bg-slate-600'}`} />
              {i < entries.length - 1 && <div className="h-full w-px bg-[rgba(255,255,255,0.06)]" />}
            </div>
            <div className="pb-3">
              <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${c.bg} ${c.color}`}>{c.label}</span>
              <p className="mt-0.5 flex items-center gap-1 text-[11px] text-slate-400">
                <User size={10} />{h.usuario_nombre}
              </p>
              <p className="text-[11px] text-slate-500">{fmtDate(h.fecha)}</p>
              {h.notas && <p className="text-[11px] italic text-slate-500">{h.notas}</p>}
            </div>
          </div>
        );
      })}
    </div>
  );
}
