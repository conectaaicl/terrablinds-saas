import { useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';

import { useApi } from '../../hooks/useApi';
import { useMutation } from '../../hooks/useMutation';
import { api } from '../../services/api';
import { ESTADO_CONFIG } from '../../types';
import type { EstadoOrden } from '../../types';
import { Spinner, ErrorMessage } from '../../components/LoadingStates';
import {
  Factory, ChevronRight, ArrowLeft, Ruler, Palette,
  CheckCircle2, AlertTriangle, Clock, User
} from 'lucide-react';

const fmtDate = (s: string) => s ? new Date(s).toLocaleDateString('es-CL') : '—';

// ═══════════════════════════════════════════════
// COLA DE PRODUCCIÓN
// ═══════════════════════════════════════════════
export function ColaProduccion() {
  const { data: orders, loading, error, refetch } = useApi(() => api.getMyOrders());

  if (loading) return <Spinner />;
  if (error) return <ErrorMessage message={error} onRetry={refetch} />;

  const ordenes: any[] = (orders || []).filter((o: any) =>
    ['en_fabricacion', 'listo_para_instalar', 'problema'].includes(o.estado)
  );

  const enFab = ordenes.filter(o => o.estado === 'en_fabricacion');
  const fabricados = ordenes.filter(o => o.estado === 'listo_para_instalar');
  const problemas = ordenes.filter(o => o.estado === 'problema');

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Producción</h1>
        <p className="text-sm text-slate-500">{ordenes.length} órdenes asignadas</p>
      </div>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-3">
        <Stat icon={Factory} iconBg="bg-amber-100" iconColor="text-amber-600" value={enFab.length} label="En Fabricación" />
        <Stat icon={CheckCircle2} iconBg="bg-lime-100" iconColor="text-lime-600" value={fabricados.length} label="Listos para Instalar" />
        {problemas.length > 0 && (
          <Stat icon={AlertTriangle} iconBg="bg-red-100" iconColor="text-red-600" value={problemas.length} label="Problemas" />
        )}
      </div>

      <Section title="En Fabricación" borderColor="border-l-amber-400" items={enFab} iconBg="bg-amber-100" iconColor="text-amber-600" />
      <Section title="Listos para Instalar" borderColor="border-l-lime-400" items={fabricados} iconBg="bg-lime-100" iconColor="text-lime-600" />
      {problemas.length > 0 && (
        <Section title="Con Problemas" borderColor="border-l-red-400" items={problemas} iconBg="bg-red-100" iconColor="text-red-600" />
      )}

      {ordenes.length === 0 && (
        <div className="rounded-xl border border-slate-200 bg-white p-14 text-center">
          <Factory size={40} className="mx-auto text-slate-300" />
          <p className="mt-3 text-sm text-slate-500">No tienes órdenes asignadas</p>
        </div>
      )}
    </div>
  );
}

function Stat({ icon: Icon, iconBg, iconColor, value, label }: {
  icon: React.ComponentType<{ size: number; className: string }>; iconBg: string; iconColor: string; value: number; label: string;
}) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5">
      <div className="flex items-center gap-3">
        <div className={`rounded-lg p-2 ${iconBg}`}><Icon size={19} className={iconColor} /></div>
        <div>
          <p className="text-2xl font-bold text-slate-900">{value}</p>
          <p className="text-xs text-slate-500">{label}</p>
        </div>
      </div>
    </div>
  );
}

function Section({ title, borderColor, items, iconBg, iconColor }: {
  title: string; borderColor: string; items: any[]; iconBg: string; iconColor: string;
}) {
  if (items.length === 0) return null;
  return (
    <div>
      <h2 className="mb-2 text-sm font-semibold text-slate-700">{title}</h2>
      <div className="space-y-2">
        {items.map(o => (
          <Link key={o.id} to={`/fabricante/${o.id}`}
            className={`flex items-center justify-between rounded-xl border-l-4 bg-white p-4 border border-slate-200 shadow-sm transition hover:shadow-md ${borderColor}`}>
            <div className="flex items-center gap-3">
              <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${iconBg}`}>
                <Factory size={17} className={iconColor} />
              </div>
              <div>
                <p className="text-sm font-semibold text-slate-800">#{o.numero}</p>
                <p className="text-xs text-slate-500">{o.productos?.length || 0} producto(s) · {fmtDate(o.created_at)}</p>
              </div>
            </div>
            <ChevronRight size={16} className="text-slate-300" />
          </Link>
        ))}
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

  const marcarFabricado = useCallback(async () => {
    const res = await cambiarEstado('listo_para_instalar');
    if (res) refetch();
  }, [cambiarEstado, refetch]);

  const reportarProblema = useCallback(async () => {
    const notas = prompt('Describe el problema:');
    if (!notas) return;
    const res = await cambiarEstado('problema', notas);
    if (res) refetch();
  }, [cambiarEstado, refetch]);

  if (loading) return <Spinner />;
  if (error) return <ErrorMessage message={error} onRetry={refetch} />;
  if (!orden) return <div className="py-20 text-center text-slate-400">Orden no encontrada</div>;

  const cfg = ESTADO_CONFIG[orden.estado as EstadoOrden] || ESTADO_CONFIG.cotizado;

  return (
    <div className="mx-auto max-w-2xl space-y-5">
      <button onClick={() => nav('/fabricante')} className="flex items-center gap-1 text-sm font-medium text-slate-500 hover:text-slate-800">
        <ArrowLeft size={15} /> Volver
      </button>

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

      {orden.estado === 'en_fabricacion' && (
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
      )}
    </div>
  );
}
