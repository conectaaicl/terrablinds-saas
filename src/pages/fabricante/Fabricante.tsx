import { useCallback, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';

import { useApi } from '../../hooks/useApi';
import { useMutation } from '../../hooks/useMutation';
import { api } from '../../services/api';
import { ESTADO_CONFIG } from '../../types';
import type { EstadoOrden } from '../../types';
import { Spinner, ErrorMessage } from '../../components/LoadingStates';
import {
  Factory, ChevronRight, ArrowLeft, Ruler, Palette,
  CheckCircle2, AlertTriangle, Clock, User, Scissors, Wrench, Package, Printer,
} from 'lucide-react';

const SUBESTADOS = [
  { value: 'en_corte', label: 'En Corte', icon: Scissors, bg: 'bg-amber-100', color: 'text-amber-700', active: 'bg-amber-500 text-white' },
  { value: 'en_armado', label: 'En Armado', icon: Wrench, bg: 'bg-blue-100', color: 'text-blue-700', active: 'bg-blue-500 text-white' },
  { value: 'listo', label: 'Listo', icon: Package, bg: 'bg-lime-100', color: 'text-lime-700', active: 'bg-lime-500 text-white' },
];

const fmtDate = (s: string) => s ? new Date(s).toLocaleDateString('es-CL') : '—';

// ═══════════════════════════════════════════════
// COLA DE PRODUCCIÓN — mobile-first dark design
// ═══════════════════════════════════════════════

const ESTADO_PROD: Record<string, { label: string; dot: string; badge: string }> = {
  aprobada:              { label: 'Pendiente',          dot: 'bg-slate-400',    badge: 'bg-slate-700 text-slate-300' },
  en_fabricacion:        { label: 'En Fabricación',     dot: 'bg-amber-400',    badge: 'bg-amber-900/60 text-amber-300' },
  listo_para_instalar:   { label: 'Listo ✓',            dot: 'bg-emerald-400',  badge: 'bg-emerald-900/60 text-emerald-300' },
  problema:              { label: 'Problema',            dot: 'bg-red-400',      badge: 'bg-red-900/60 text-red-300' },
};

export function ColaProduccion() {
  const { data: cola, loading, error, refetch } = useApi(() => (api as any).getColaProduccion());
  const [actioning, setActioning] = useState<number | null>(null);

  const handleAction = async (id: number, action: string, numero: string) => {
    setActioning(id);
    try {
      if (action === 'iniciar') {
        await api.changeEstado(id, 'en_fabricacion');
      } else if (action === 'listo') {
        await api.changeEstado(id, 'listo_para_instalar');
        // Backend fires system notification automatically via change_estado
      } else if (action === 'falta_material') {
        const sub = (cola as any[])?.find(o => o.id === id)?.produccion_subestado;
        await api.updateSubestado(id, sub === 'falta_materiales' ? '' : 'falta_materiales');
      } else if (action === 'en_espera') {
        const sub = (cola as any[])?.find(o => o.id === id)?.produccion_subestado;
        await api.updateSubestado(id, sub === 'en_espera_materiales' ? '' : 'en_espera_materiales');
      } else if (action === 'problema') {
        const notas = prompt('Describe el problema:');
        if (!notas) { setActioning(null); return; }
        await api.changeEstado(id, 'problema', notas);
      }
      refetch();
    } catch (e) {
      console.error('Action failed', e);
    } finally {
      setActioning(null);
    }
  };

  if (loading) return (
    <div className="flex h-48 items-center justify-center">
      <div className="h-8 w-8 animate-spin rounded-full border-2 border-white/20 border-t-white" />
    </div>
  );
  if (error) return <ErrorMessage message={error} onRetry={refetch} />;

  const ordenes: any[] = cola || [];
  const pendientes  = ordenes.filter(o => o.estado === 'aprobada');
  const enFab       = ordenes.filter(o => o.estado === 'en_fabricacion');
  const listos      = ordenes.filter(o => o.estado === 'listo_para_instalar');
  const problemas   = ordenes.filter(o => o.estado === 'problema');

  return (
    <div className="space-y-5 pb-24">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-white">Cola de Producción</h1>
          <p className="text-sm text-slate-400">{ordenes.length} órdenes activas</p>
        </div>
        <button onClick={refetch} className="rounded-xl border border-white/10 bg-white/5 p-2.5 text-slate-300 hover:bg-white/10 active:scale-95 transition-all">
          <Factory size={16} />
        </button>
      </div>

      {/* Stats bar */}
      <div className="grid grid-cols-4 gap-2">
        {[
          { label: 'Pendiente', count: pendientes.length, color: 'text-slate-300', dot: 'bg-slate-400' },
          { label: 'Fabricando', count: enFab.length, color: 'text-amber-300', dot: 'bg-amber-400' },
          { label: 'Listo', count: listos.length, color: 'text-emerald-300', dot: 'bg-emerald-400' },
          { label: 'Problema', count: problemas.length, color: 'text-red-300', dot: 'bg-red-400' },
        ].map(s => (
          <div key={s.label} className="rounded-2xl border border-white/10 bg-white/5 p-3 text-center">
            <div className={`mx-auto mb-1 h-2 w-2 rounded-full ${s.dot}`} />
            <p className={`text-lg font-bold ${s.color}`}>{s.count}</p>
            <p className="text-[10px] leading-tight text-slate-500">{s.label}</p>
          </div>
        ))}
      </div>

      {ordenes.length === 0 && (
        <div className="flex flex-col items-center justify-center gap-3 rounded-2xl border border-white/10 bg-white/5 py-16">
          <Factory size={36} className="text-slate-600" />
          <p className="text-sm text-slate-400">Sin órdenes en cola</p>
        </div>
      )}

      <ProdSection title="En Fabricación" items={enFab} accent="border-amber-500/40" onAction={handleAction} actioning={actioning} />
      <ProdSection title="Pendientes de iniciar" items={pendientes} accent="border-slate-500/40" onAction={handleAction} actioning={actioning} />
      <ProdSection title="Listos para Instalar" items={listos} accent="border-emerald-500/40" onAction={handleAction} actioning={actioning} />
      {problemas.length > 0 && <ProdSection title="Con Problema" items={problemas} accent="border-red-500/40" onAction={handleAction} actioning={actioning} />}
    </div>
  );
}

function ProdSection({ title, items, accent, onAction, actioning }: {
  title: string; items: any[]; accent: string;
  onAction: (id: number, action: string, numero: string) => void;
  actioning: number | null;
}) {
  const nav = useNavigate();
  if (items.length === 0) return null;
  return (
    <div>
      <p className="mb-2 text-xs font-semibold uppercase tracking-widest text-slate-500">{title}</p>
      <div className="space-y-2">
        {items.map(o => {
          const cfg = ESTADO_PROD[o.estado] || ESTADO_PROD.aprobada;
          const nProd = o.productos?.length || 0;
          const busy = actioning === o.id;
          return (
            <div key={o.id} className={"rounded-2xl border border-l-4 " + accent + " bg-white/5"}>
              {/* Header — tap to open detail */}
              <div
                onClick={() => nav("/fabricante/" + o.id)}
                className="flex cursor-pointer items-start justify-between gap-3 p-4 transition-all active:scale-[0.98] hover:bg-white/[0.06] rounded-t-2xl"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-sm font-bold text-white">OT #{o.numero}</span>
                    <span className={"rounded-full px-2 py-0.5 text-[10px] font-semibold " + cfg.badge}>{cfg.label}</span>
                    {o.produccion_subestado && (
                      <span className="rounded-full bg-indigo-900/50 px-2 py-0.5 text-[10px] font-semibold text-indigo-300">
                        {o.produccion_subestado.replace(/_/g, ' ')}
                      </span>
                    )}
                  </div>
                  {o.cliente_nombre && (
                    <p className="mt-1 truncate text-xs text-slate-400">{o.cliente_nombre}</p>
                  )}
                  {o.cliente_direccion && (
                    <p className="mt-0.5 truncate text-[11px] text-slate-500">{o.cliente_direccion}</p>
                  )}
                </div>
                <div className="shrink-0 text-right">
                  <p className="text-xs font-semibold text-white">{nProd} item{nProd !== 1 ? 's' : ''}</p>
                  <p className="mt-0.5 text-[10px] text-slate-500">{fmtDate(o.created_at)}</p>
                  <ChevronRight size={14} className="ml-auto mt-1 text-slate-600" />
                </div>
              </div>

              {/* Actions for aprobada */}
              {o.estado === 'aprobada' && (
                <div className="border-t border-white/5 px-4 pb-3 pt-2">
                  <button
                    onClick={() => onAction(o.id, 'iniciar', String(o.numero))}
                    disabled={busy}
                    className="flex w-full items-center justify-center gap-2 rounded-xl bg-amber-500 py-2 text-xs font-bold text-white transition hover:bg-amber-600 disabled:opacity-50"
                  >
                    <Factory size={13} />
                    {busy ? 'Iniciando...' : 'Iniciar Fabricación'}
                  </button>
                </div>
              )}

              {/* Actions for en_fabricacion */}
              {o.estado === 'en_fabricacion' && (
                <div className="border-t border-white/5 px-4 pb-3 pt-2 space-y-2">
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      onClick={() => onAction(o.id, 'falta_material', String(o.numero))}
                      disabled={busy}
                      className={"flex items-center justify-center gap-1.5 rounded-xl border py-2 text-xs font-semibold transition disabled:opacity-50 " + (
                        o.produccion_subestado === 'falta_materiales'
                          ? 'border-orange-500 bg-orange-500/20 text-orange-300'
                          : 'border-white/10 bg-white/5 text-slate-400 hover:bg-white/10'
                      )}
                    >
                      <AlertTriangle size={12} /> Falta material
                    </button>
                    <button
                      onClick={() => onAction(o.id, 'en_espera', String(o.numero))}
                      disabled={busy}
                      className={"flex items-center justify-center gap-1.5 rounded-xl border py-2 text-xs font-semibold transition disabled:opacity-50 " + (
                        o.produccion_subestado === 'en_espera_materiales'
                          ? 'border-blue-500 bg-blue-500/20 text-blue-300'
                          : 'border-white/10 bg-white/5 text-slate-400 hover:bg-white/10'
                      )}
                    >
                      <Clock size={12} /> En espera
                    </button>
                  </div>
                  <button
                    onClick={() => onAction(o.id, 'listo', String(o.numero))}
                    disabled={busy}
                    className="flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-500 py-2 text-xs font-bold text-white transition hover:bg-emerald-600 disabled:opacity-50"
                  >
                    <CheckCircle2 size={13} />
                    {busy ? 'Guardando...' : 'Lista para Instalar ✓'}
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════
// DETALLE TÉCNICO
// ═══════════════════════════════════════════════
export function DetalleTecnico() {
  const { id } = useParams();
  const nav = useNavigate();
  const numId = Number(id);

  const { data: orden, loading, error, refetch } = useApi(
    () => api.getOrder(numId),
    [numId]
  );

  const { execute: cambiarEstado, loading: changing } = useMutation(
    (estado: string, notas?: string) => api.changeEstado(numId, estado, notas)
  );

  const { execute: cambiarSubestado, loading: changingSub } = useMutation(
    (subestado: string) => api.updateSubestado(numId, subestado)
  );

  const iniciarFabricacion = useCallback(async () => {
    const res = await cambiarEstado('en_fabricacion');
    if (res) refetch();
  }, [cambiarEstado, refetch]);

  const marcarFabricado = useCallback(async () => {
    const res = await cambiarEstado('listo_para_instalar');
    if (res) refetch();
  }, [cambiarEstado, refetch]);

  const toggleSubestado = useCallback(async (val: string) => {
    const current = (orden as any)?.produccion_subestado;
    const next = current === val ? '' : val;
    const res = await cambiarSubestado(next);
    if (res) refetch();
  }, [cambiarSubestado, refetch, orden]);

  const reportarProblema = useCallback(async () => {
    const notas = prompt('Describe el problema:');
    if (!notas) return;
    const res = await cambiarEstado('problema', notas);
    if (res) refetch();
  }, [cambiarEstado, refetch]);

  const setSubestado = useCallback(async (val: string) => {
    const current = (orden as any)?.produccion_subestado;
    const next = current === val ? '' : val; // toggle off
    const res = await cambiarSubestado(next);
    if (res) refetch();
  }, [cambiarSubestado, refetch, orden]);

  if (loading) return <Spinner />;
  if (error) return <ErrorMessage message={error} onRetry={refetch} />;
  if (!orden) return <div className="py-20 text-center text-slate-400">Orden no encontrada</div>;

  const cfg = ESTADO_CONFIG[orden.estado as EstadoOrden] || ESTADO_CONFIG.cotizado;

  return (
    <div className="mx-auto max-w-2xl space-y-5">
      <div className="flex items-center justify-between">
        <button onClick={() => nav('/fabricante')} className="flex items-center gap-1 text-sm font-medium text-slate-500 hover:text-slate-800">
          <ArrowLeft size={15} /> Volver
        </button>
        <button onClick={() => nav('/print/ot/' + numId)}
          className="flex items-center gap-1.5 rounded-lg bg-slate-900 px-3 py-2 text-xs font-semibold text-white hover:bg-slate-700 transition">
          <Printer size={14} /> Imprimir OT
        </button>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">#{orden.numero}</h1>
          <p className="text-sm text-slate-500">Ficha Técnica de Producción</p>
        </div>
        <span className={`rounded-full px-3 py-1 text-sm font-semibold ${cfg.bg} ${cfg.color}`}>{cfg.label}</span>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-5">
        <h2 className="mb-4 text-base font-semibold text-slate-900">
          Productos a Fabricar ({orden.productos?.length || 0})
        </h2>
        <div className="space-y-4">
          {(orden.productos || []).map((p: any, i: number) => (
            <div key={p.id || i} className="rounded-lg border-2 border-dashed border-slate-200 p-4">
              <div className="mb-3 flex items-center justify-between">
                <h3 className="text-sm font-bold text-slate-800">{i + 1}. {p.tipo}</h3>
                {p.id && (
                  <span className="rounded bg-slate-100 px-2 py-0.5 text-[10px] font-mono text-slate-500">#{p.id.toString().slice(-6)}</span>
                )}
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-lg bg-blue-50 p-3">
                  <div className="mb-1 flex items-center gap-1.5 text-[11px] font-semibold uppercase text-blue-600">
                    <Ruler size={13} /> Medidas
                  </div>
                  <p className="text-lg font-bold text-slate-900">{p.ancho} × {p.alto} cm</p>
                </div>
                <div className="rounded-lg bg-violet-50 p-3">
                  <div className="mb-1 flex items-center gap-1.5 text-[11px] font-semibold uppercase text-violet-600">
                    <Palette size={13} /> Material
                  </div>
                  <p className="text-sm font-bold text-slate-900">{p.tela}</p>
                  <p className="text-xs text-slate-600">{p.color}</p>
                </div>
              </div>
              {p.notas && (
                <div className="mt-2 rounded-lg bg-yellow-50 p-2.5">
                  <p className="text-xs text-yellow-800">📝 {p.notas}</p>
                </div>
              )}
              {p.ubicacion && (
                <p className="mt-1.5 text-xs text-slate-500">📍 {p.ubicacion}</p>
              )}
              {p.accionamiento && (
                <p className="mt-1 text-xs text-slate-500">⚙️ {p.accionamiento}</p>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Historial */}
      <div className="rounded-xl border border-slate-200 bg-white p-5">
        <h2 className="mb-3 flex items-center gap-2 text-base font-semibold text-slate-900">
          <Clock size={16} /> Historial
        </h2>
        <div className="space-y-0">
          {[...(orden.historial || [])].reverse().map((h: any, i: number) => {
            const c = ESTADO_CONFIG[h.estado as EstadoOrden] || ESTADO_CONFIG.cotizado;
            return (
              <div key={i} className="flex gap-3">
                <div className="flex flex-col items-center">
                  <div className={`mt-0.5 h-2.5 w-2.5 rounded-full ${i === 0 ? c.dot : 'bg-slate-300'}`} />
                  {i < (orden.historial?.length || 0) - 1 && <div className="h-full w-px bg-slate-200" />}
                </div>
                <div className="pb-3">
                  <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${c.bg} ${c.color}`}>{c.label}</span>
                  <p className="mt-0.5 flex items-center gap-1 text-[11px] text-slate-500">
                    <User size={10} />{h.usuario_nombre}
                  </p>
                  <p className="text-[11px] text-slate-400">{fmtDate(h.fecha)}</p>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {orden.estado === 'aprobada' && (
        <div className="flex gap-3">
          <button onClick={iniciarFabricacion} disabled={changing}
            className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-amber-500 px-4 py-3 text-sm font-semibold text-white transition hover:bg-amber-600 disabled:opacity-60">
            <Factory size={17} /> {changing ? 'Iniciando...' : 'Iniciar Fabricación'}
          </button>
        </div>
      )}

      {orden.estado === 'en_fabricacion' && (
        <>
          {/* Sub-state tracker */}
          <div className="rounded-xl border border-slate-200 bg-white p-5">
            <h2 className="mb-3 text-sm font-semibold text-slate-700">Etapa de Producción</h2>
            <div className="flex gap-2">
              {SUBESTADOS.map((s, idx) => {
                const current = (orden as any)?.produccion_subestado;
                const isActive = current === s.value;
                const isPast = SUBESTADOS.findIndex(x => x.value === current) > idx;
                return (
                  <button key={s.value} onClick={() => setSubestado(s.value)} disabled={changingSub}
                    className={`flex flex-1 flex-col items-center gap-1.5 rounded-xl border-2 py-3 px-2 text-xs font-bold transition-all disabled:opacity-60 ${
                      isActive
                        ? `border-transparent ${s.active} shadow-sm`
                        : isPast
                        ? 'border-slate-200 bg-slate-50 text-slate-400'
                        : `border-slate-200 bg-white ${s.color} hover:${s.bg}`
                    }`}>
                    <s.icon size={18} />
                    {s.label}
                  </button>
                );
              })}
            </div>
            {(orden as any)?.produccion_subestado && (
              <p className="mt-2 text-center text-xs text-slate-400">
                Toca la etapa activa para desmarcarla
              </p>
            )}
          </div>

          {/* Material state buttons */}
          <div className="grid grid-cols-2 gap-2">
            <button onClick={() => toggleSubestado('falta_materiales')} disabled={changing || changingSub}
              className={"flex items-center justify-center gap-2 rounded-lg border px-4 py-2.5 text-sm font-semibold transition disabled:opacity-60 " + (
                (orden as any)?.produccion_subestado === 'falta_materiales'
                  ? 'border-orange-400 bg-orange-50 text-orange-700'
                  : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
              )}>
              <AlertTriangle size={15} /> Falta material
            </button>
            <button onClick={() => toggleSubestado('en_espera_materiales')} disabled={changing || changingSub}
              className={"flex items-center justify-center gap-2 rounded-lg border px-4 py-2.5 text-sm font-semibold transition disabled:opacity-60 " + (
                (orden as any)?.produccion_subestado === 'en_espera_materiales'
                  ? 'border-blue-400 bg-blue-50 text-blue-700'
                  : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
              )}>
              <Clock size={15} /> En espera
            </button>
          </div>

          {/* Final actions */}
          <div className="flex gap-3">
            <button onClick={reportarProblema} disabled={changing}
              className="flex flex-1 items-center justify-center gap-2 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700 transition hover:bg-red-100 disabled:opacity-60">
              <AlertTriangle size={17} /> Problema
            </button>
            <button onClick={marcarFabricado} disabled={changing}
              className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-lime-500 px-4 py-3 text-sm font-semibold text-white transition hover:bg-lime-600 disabled:opacity-60">
              <CheckCircle2 size={17} /> Listo para Instalar
            </button>
          </div>
        </>
      )}
    </div>
  );
}


// ─── HISTORIAL DE PRODUCCIÓN (solo lectura) ──────────────────
export function HistorialProduccion() {
  const nav = useNavigate();
  const { data, loading, error, refetch } = useApi(() => (api as any).getHistorialProduccion());
  const ordenes: any[] = data || [];
  if (loading) return <Spinner />;
  if (error) return <ErrorMessage message={error} onRetry={refetch} />;
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Historial de producción</h1>
          <p className="text-sm text-slate-400">Lo que ya fabricaste y pasó a instalación o cierre. Solo lectura.</p>
        </div>
        <button onClick={refetch}
          className="rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-xs font-medium text-slate-300 hover:bg-white/10">
          Actualizar
        </button>
      </div>
      {ordenes.length === 0 && <p className="text-sm text-slate-500">Aún no hay órdenes en el historial.</p>}
      <div className="space-y-2">
        {ordenes.map(o => {
          const label = ESTADO_CONFIG[o.estado as EstadoOrden]?.label || o.estado;
          const nProd = o.productos?.length || 0;
          return (
            <div key={o.id} onClick={() => nav("/fabricante/" + o.id)}
              className="flex cursor-pointer items-start justify-between gap-3 rounded-2xl border border-white/10 bg-white/5 p-4 transition hover:bg-white/[0.08] active:scale-[0.98]">
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-sm font-bold text-white">OT #{o.numero}</span>
                  <span className="rounded-full bg-emerald-900/40 px-2 py-0.5 text-[10px] font-semibold text-emerald-300">{label}</span>
                </div>
                {o.cliente_nombre && <p className="mt-1 truncate text-xs text-slate-400">{o.cliente_nombre}</p>}
                {o.cliente_direccion && <p className="mt-0.5 truncate text-[11px] text-slate-500">{o.cliente_direccion}</p>}
                {o.instalador_nombre && <p className="mt-0.5 truncate text-[11px] text-slate-500">Instalador: {o.instalador_nombre}</p>}
              </div>
              <div className="shrink-0 text-right">
                <p className="text-xs font-semibold text-white">{nProd} item{nProd !== 1 ? 's' : ''}</p>
                <ChevronRight size={14} className="ml-auto mt-1 text-slate-600" />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
