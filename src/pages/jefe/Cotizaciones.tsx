import { useState, useMemo } from 'react';
import { useNavigate, useMatch } from 'react-router-dom';
import { useApi } from '../../hooks/useApi';
import { useMutation } from '../../hooks/useMutation';
import { api } from '../../services/api';
import { Spinner, ErrorMessage } from '../../components/LoadingStates';
import {
  FileText, Search, ChevronRight, CheckCircle2, XCircle,
  ArrowRight, Plus, Clock, DollarSign, Printer,
} from 'lucide-react';

const fmt = (n: number) => '$' + Number(n).toLocaleString('es-CL');
const fmtDate = (s: string) => s ? new Date(s).toLocaleDateString('es-CL') : '—';

const COT_ESTADO_CFG: Record<string, { label: string; bg: string; color: string }> = {
  borrador:   { label: 'Borrador',   bg: 'bg-slate-100',   color: 'text-slate-600'  },
  enviada:    { label: 'Enviada',    bg: 'bg-blue-100',    color: 'text-blue-700'   },
  aceptada:   { label: 'Aceptada',  bg: 'bg-emerald-100', color: 'text-emerald-700' },
  rechazada:  { label: 'Rechazada', bg: 'bg-red-100',     color: 'text-red-700'    },
  convertida: { label: 'Convertida',bg: 'bg-violet-100',  color: 'text-violet-700' },
};

// ═══════════════════════════════════════
// COTIZACIONES — Vista Jefe / Gerente
// ═══════════════════════════════════════
export default function JefeCotizaciones() {
  const navigate = useNavigate();
  const isGerente = !!useMatch('/gerente/*');
  const base = isGerente ? '/gerente' : '/jefe';
  const [search, setSearch] = useState('');
  const [filterEstado, setFilterEstado] = useState('');
  const [selected, setSelected] = useState<any | null>(null);

  const { data, loading, error, refetch } = useApi(() => api.getCotizaciones());
  const { execute: patchCot, loading: patching } = useMutation(
    (id: string, estado: string) => api.patchCotizacion(id, { estado })
  );
  const { execute: convertir, loading: converting } = useMutation(api.convertirCotizacion);

  const cotList: any[] = data || [];

  const filtered = useMemo(() => {
    let list = cotList;
    if (filterEstado) list = list.filter(c => c.estado === filterEstado);
    if (search) {
      const s = search.toLowerCase();
      list = list.filter(c =>
        String(c.numero || '').includes(s) ||
        (c.cliente_nombre || '').toLowerCase().includes(s) ||
        (c.vendedor_nombre || '').toLowerCase().includes(s)
      );
    }
    return list;
  }, [cotList, search, filterEstado]);

  const stats = useMemo(() => ({
    total: cotList.length,
    pendientes: cotList.filter(c => ['borrador', 'enviada'].includes(c.estado)).length,
    aceptadas: cotList.filter(c => c.estado === 'aceptada').length,
    totalValor: cotList.filter(c => c.estado === 'aceptada').reduce((s, c) => s + (c.precio_total || 0), 0),
  }), [cotList]);

  const changeEstado = async (id: string, estado: string) => {
    await patchCot(id, estado);
    refetch();
    setSelected((prev: any) => prev?.id === id ? { ...prev, estado } : prev);
  };

  const handleConvertir = async (id: string) => {
    const res = await convertir(id);
    if (res) {
      refetch();
      setSelected(null);
      if (res.orden_id) navigate(`/jefe/ordenes/${res.orden_id}`);
    }
  };

  if (loading) return <Spinner />;
  if (error) return <ErrorMessage message={error} onRetry={refetch} />;

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Cotizaciones</h1>
          <p className="text-sm text-slate-500">{cotList.length} cotizaciones del taller</p>
        </div>
        <button
          onClick={() => navigate(`${base}/cotizaciones/nueva`)}
          className="flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold text-white shadow-sm hover:opacity-90"
          style={{ backgroundColor: 'var(--brand-primary)' }}>
          <Plus size={16} /> Nueva Cotización
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {[
          { label: 'Total', value: stats.total, icon: FileText, iconBg: 'bg-slate-100', iconColor: 'text-slate-600' },
          { label: 'En Proceso', value: stats.pendientes, icon: Clock, iconBg: 'bg-blue-100', iconColor: 'text-blue-600' },
          { label: 'Aceptadas', value: stats.aceptadas, icon: CheckCircle2, iconBg: 'bg-emerald-100', iconColor: 'text-emerald-600' },
          { label: 'Valor Aceptado', value: fmt(stats.totalValor), icon: DollarSign, iconBg: 'bg-amber-100', iconColor: 'text-amber-600', wide: true },
        ].map(s => (
          <div key={s.label} className="rounded-xl border border-slate-200 bg-white p-5">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-medium text-slate-500">{s.label}</span>
              <div className={`rounded-lg p-1.5 ${s.iconBg}`}><s.icon size={15} className={s.iconColor} /></div>
            </div>
            <p className="text-xl font-bold text-slate-900">{s.value}</p>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Buscar por N°, cliente o vendedor..."
            className="w-full rounded-lg border border-slate-300 py-2 pl-8 pr-3 text-sm outline-none focus:border-slate-500" />
        </div>
        <select value={filterEstado} onChange={e => setFilterEstado(e.target.value)}
          className="rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-slate-500">
          <option value="">Todos los estados</option>
          {Object.entries(COT_ESTADO_CFG).map(([k, v]) => (
            <option key={k} value={k}>{v.label}</option>
          ))}
        </select>
      </div>

      {/* List + Detail layout */}
      <div className={`grid gap-5 ${selected ? 'lg:grid-cols-2' : ''}`}>
        {/* List */}
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
          {filtered.length === 0 ? (
            <div className="p-12 text-center">
              <FileText size={36} className="mx-auto text-slate-300" />
              <p className="mt-3 text-sm text-slate-500">No hay cotizaciones</p>
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {filtered.map(c => {
                const cfg = COT_ESTADO_CFG[c.estado] || COT_ESTADO_CFG.borrador;
                const isSelected = selected?.id === c.id;
                return (
                  <button key={c.id} onClick={() => setSelected(isSelected ? null : c)}
                    className={`flex w-full items-center gap-3 px-4 py-3.5 text-left transition hover:bg-slate-50 ${isSelected ? 'bg-slate-50 border-l-2 border-l-rose-400' : ''}`}>
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-slate-100">
                      <FileText size={16} className="text-slate-500" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-semibold text-slate-800">#{c.numero || c.id}</span>
                        <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${cfg.bg} ${cfg.color}`}>
                          {cfg.label}
                        </span>
                      </div>
                      <p className="truncate text-xs text-slate-500">
                        {c.cliente_nombre || 'Sin cliente'} · {c.vendedor_nombre || '—'}
                      </p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-sm font-semibold text-slate-800">{fmt(c.precio_total || 0)}</p>
                      <p className="text-[10px] text-slate-400">{fmtDate(c.created_at)}</p>
                    </div>
                    <ChevronRight size={14} className="shrink-0 text-slate-400" />
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Detail panel */}
        {selected && (
          <DetailPanel
            cot={selected}
            onClose={() => setSelected(null)}
            onChangeEstado={changeEstado}
            onConvertir={handleConvertir}
            patching={patching}
            converting={converting}
          />
        )}
      </div>
    </div>
  );
}

// ── Detail Panel ──────────────────────────────────────────────
function DetailPanel({ cot, onClose, onChangeEstado, onConvertir, patching, converting }: {
  cot: any;
  onClose: () => void;
  onChangeEstado: (id: string, estado: string) => void;
  onConvertir: (id: string) => void;
  patching: boolean;
  converting: boolean;
}) {
  const cfg = COT_ESTADO_CFG[cot.estado] || COT_ESTADO_CFG.borrador;
  const productos: any[] = cot.productos || [];

  return (
    <div className="rounded-xl border border-slate-200 bg-white">
      <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
        <div>
          <h3 className="font-bold text-slate-900">Cotización #{cot.numero || cot.id}</h3>
          <p className="text-xs text-slate-500">{new Date(cot.created_at).toLocaleDateString('es-CL', { dateStyle: 'long' })}</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => window.open(`/jefe/cotizaciones/${cot.id}/imprimir`, '_blank')}
            className="flex items-center gap-1.5 rounded-lg bg-slate-100 px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-200"
            title="Imprimir / Guardar PDF"
          >
            <Printer size={13} /> PDF
          </button>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 text-lg leading-none">×</button>
        </div>
      </div>

      <div className="space-y-4 p-5">
        {/* Status + client */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <p className="text-[11px] font-semibold uppercase text-slate-400 mb-1">Estado</p>
            <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${cfg.bg} ${cfg.color}`}>{cfg.label}</span>
          </div>
          <div>
            <p className="text-[11px] font-semibold uppercase text-slate-400 mb-1">Cliente</p>
            <p className="text-sm font-medium text-slate-800">{cot.cliente_nombre || '—'}</p>
          </div>
          <div>
            <p className="text-[11px] font-semibold uppercase text-slate-400 mb-1">Vendedor</p>
            <p className="text-sm text-slate-700">{cot.vendedor_nombre || '—'}</p>
          </div>
          <div>
            <p className="text-[11px] font-semibold uppercase text-slate-400 mb-1">Total</p>
            <p className="text-sm font-bold text-slate-900">{fmt(cot.precio_total || 0)}</p>
          </div>
        </div>

        {/* Products */}
        {productos.length > 0 && (
          <div>
            <p className="text-[11px] font-semibold uppercase text-slate-400 mb-2">Productos</p>
            <div className="space-y-1.5">
              {productos.map((p: any, i: number) => (
                <div key={i} className="flex items-start justify-between rounded-lg bg-slate-50 px-3 py-2">
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-medium text-slate-700">{p.nombre || p.producto_nombre || 'Producto'}</p>
                    {p.color && <p className="text-[10px] text-slate-400">Color: {p.color}</p>}
                    {(p.ancho || p.alto) && (
                      <p className="text-[10px] text-slate-400">{p.ancho}×{p.alto} cm · Cant: {p.cantidad}</p>
                    )}
                  </div>
                  <p className="text-xs font-semibold text-slate-800 shrink-0 ml-2">{fmt(p.precio_unitario * (p.cantidad || 1))}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {cot.notas && (
          <div>
            <p className="text-[11px] font-semibold uppercase text-slate-400 mb-1">Notas</p>
            <p className="text-xs text-slate-600 whitespace-pre-line">{cot.notas}</p>
          </div>
        )}

        {/* Actions */}
        {cot.estado !== 'convertida' && (
          <div className="space-y-2 pt-2 border-t border-slate-100">
            <p className="text-[11px] font-semibold uppercase text-slate-400">Acciones</p>
            <div className="flex flex-wrap gap-2">
              {cot.estado === 'borrador' && (
                <button onClick={() => onChangeEstado(cot.id, 'enviada')} disabled={patching}
                  className="flex items-center gap-1.5 rounded-lg bg-blue-50 px-3 py-1.5 text-xs font-semibold text-blue-700 hover:bg-blue-100 disabled:opacity-50">
                  <ArrowRight size={13} /> Marcar Enviada
                </button>
              )}
              {['borrador', 'enviada'].includes(cot.estado) && (
                <>
                  <button onClick={() => onChangeEstado(cot.id, 'aceptada')} disabled={patching}
                    className="flex items-center gap-1.5 rounded-lg bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-700 hover:bg-emerald-100 disabled:opacity-50">
                    <CheckCircle2 size={13} /> Aceptar
                  </button>
                  <button onClick={() => onChangeEstado(cot.id, 'rechazada')} disabled={patching}
                    className="flex items-center gap-1.5 rounded-lg bg-red-50 px-3 py-1.5 text-xs font-semibold text-red-700 hover:bg-red-100 disabled:opacity-50">
                    <XCircle size={13} /> Rechazar
                  </button>
                </>
              )}
              {cot.estado === 'aceptada' && (
                <button onClick={() => onConvertir(cot.id)} disabled={converting}
                  className="flex w-full items-center justify-center gap-2 rounded-lg py-2 text-sm font-semibold text-white disabled:opacity-60"
                  style={{ backgroundColor: 'var(--brand-primary)' }}>
                  <Plus size={15} /> {converting ? 'Creando Orden...' : 'Convertir a Orden'}
                </button>
              )}
            </div>
          </div>
        )}

        {cot.estado === 'convertida' && (
          <div className="flex items-center gap-2 rounded-lg bg-violet-50 px-3 py-2.5 text-xs font-medium text-violet-700">
            <CheckCircle2 size={14} /> Esta cotización ya fue convertida en orden de trabajo.
          </div>
        )}
      </div>
    </div>
  );
}
