import { useState, useMemo, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { Store } from '../../data/store';
import { useAuth } from '../../context/AuthContext';
import { ESTADO_CONFIG } from '../../types';
import type { EstadoOrden } from '../../types';
import {
  Factory, ChevronRight, ArrowLeft, Ruler, Palette,
  CheckCircle2, AlertTriangle, Clock, User
} from 'lucide-react';

export function ColaProduccion() {
  const { user } = useAuth();

  const ordenes = useMemo(() => {
    return Store.getOrdenes(user?.tenantId).filter(o =>
      o.fabricanteId === user?.id && ['en_fabricacion', 'listo', 'problema'].includes(o.estado)
    );
  }, [user]);

  const enFab = ordenes.filter(o => o.estado === 'en_fabricacion');
  const listos = ordenes.filter(o => o.estado === 'listo');
  const problemas = ordenes.filter(o => o.estado === 'problema');

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Producción</h1>
        <p className="text-sm text-slate-500">{ordenes.length} órdenes asignadas</p>
      </div>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-3">
        <Stat icon={Factory} iconBg="bg-amber-100" iconColor="text-amber-600" value={enFab.length} label="En Fabricación" />
        <Stat icon={CheckCircle2} iconBg="bg-emerald-100" iconColor="text-emerald-600" value={listos.length} label="Listos" />
        {problemas.length > 0 && (
          <Stat icon={AlertTriangle} iconBg="bg-red-100" iconColor="text-red-600" value={problemas.length} label="Problemas" />
        )}
      </div>

      <Section title="En Fabricación" borderColor="border-l-amber-400" items={enFab} iconBg="bg-amber-100" iconColor="text-amber-600" />
      <Section title="Listos" borderColor="border-l-emerald-400" items={listos} iconBg="bg-emerald-100" iconColor="text-emerald-600" />
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
  title: string; borderColor: string; items: { id: string; productos: { id: string }[]; fechaCreacion: string }[]; iconBg: string; iconColor: string;
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
                <p className="text-sm font-semibold text-slate-800">{o.id}</p>
                <p className="text-xs text-slate-500">{o.productos.length} producto(s) · {o.fechaCreacion}</p>
              </div>
            </div>
            <ChevronRight size={16} className="text-slate-300" />
          </Link>
        ))}
      </div>
    </div>
  );
}

export function DetalleTecnico() {
  const { id } = useParams();
  const nav = useNavigate();
  const { user } = useAuth();
  const [v, setV] = useState(0);

  const orden = useMemo(() => { void v; return id ? Store.getOrdenById(id) : undefined; }, [id, v]);

  const marcarListo = useCallback(() => {
    if (!orden || !user) return;
    Store.cambiarEstado(orden.id, 'listo', user);
    setV(x => x + 1);
  }, [orden, user]);

  const problema = useCallback(() => {
    if (!orden || !user) return;
    Store.cambiarEstado(orden.id, 'problema', user);
    setV(x => x + 1);
  }, [orden, user]);

  if (!orden) return <div className="py-20 text-center text-slate-400">Orden no encontrada</div>;
  const cfg = ESTADO_CONFIG[orden.estado];

  return (
    <div className="mx-auto max-w-2xl space-y-5">
      <button onClick={() => nav('/fabricante')} className="flex items-center gap-1 text-sm font-medium text-slate-500 hover:text-slate-800">
        <ArrowLeft size={15} /> Volver
      </button>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">{orden.id}</h1>
          <p className="text-sm text-slate-500">Ficha Técnica de Producción</p>
        </div>
        <span className={`rounded-full px-3 py-1 text-sm font-semibold ${cfg.bg} ${cfg.color}`}>{cfg.label}</span>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-5">
        <h2 className="mb-4 text-base font-semibold text-slate-900">Productos a Fabricar ({orden.productos.length})</h2>
        <div className="space-y-4">
          {orden.productos.map((p, i) => (
            <div key={p.id} className="rounded-lg border-2 border-dashed border-slate-200 p-4">
              <div className="mb-3 flex items-center justify-between">
                <h3 className="text-sm font-bold text-slate-800">{i + 1}. {p.tipo}</h3>
                <span className="rounded bg-slate-100 px-2 py-0.5 text-[10px] font-mono text-slate-500">#{p.id.slice(-6)}</span>
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
            </div>
          ))}
        </div>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-5">
        <h2 className="mb-3 flex items-center gap-2 text-base font-semibold text-slate-900"><Clock size={16} /> Historial</h2>
        <div className="space-y-0">
          {[...orden.historial].reverse().map((h, i) => {
            const c = ESTADO_CONFIG[h.estado as EstadoOrden];
            return (
              <div key={i} className="flex gap-3">
                <div className="flex flex-col items-center">
                  <div className={`mt-0.5 h-2.5 w-2.5 rounded-full ${i === 0 ? c.dot : 'bg-slate-300'}`} />
                  {i < orden.historial.length - 1 && <div className="h-full w-px bg-slate-200" />}
                </div>
                <div className="pb-3">
                  <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${c.bg} ${c.color}`}>{c.label}</span>
                  <p className="mt-0.5 flex items-center gap-1 text-[11px] text-slate-500"><User size={10} />{h.usuarioNombre}</p>
                  <p className="text-[11px] text-slate-400">{h.fecha}</p>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {orden.estado === 'en_fabricacion' && (
        <div className="flex gap-3">
          <button onClick={problema}
            className="flex flex-1 items-center justify-center gap-2 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700 transition hover:bg-red-100">
            <AlertTriangle size={17} /> Problema
          </button>
          <button onClick={marcarListo}
            className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-emerald-500 px-4 py-3 text-sm font-semibold text-white transition hover:bg-emerald-600">
            <CheckCircle2 size={17} /> Listo
          </button>
        </div>
      )}
    </div>
  );
}
