import { useState, useEffect, useCallback } from 'react';
import { DollarSign, TrendingUp, Calendar, Package, ChevronLeft, ChevronRight } from 'lucide-react';

interface Comision {
  id: number;
  categoria: string;
  cantidad: number;
  monto_por_unidad: number;
  total: number;
  estado: string;
  notas: string | null;
  fecha_trabajo: string | null;
  tipo_registro: string;
  created_at: string;
}

interface MisComisionesData {
  periodo: string;
  total: number;
  comisiones: Comision[];
}

const API = '/api/v1';
const token = () => localStorage.getItem('access_token') || '';
const fmtPesos = (n: number) => '$' + Math.round(n).toLocaleString('es-CL');

const ESTADO_CFG: Record<string, { bg: string; text: string; label: string }> = {
  pendiente: { bg: 'bg-amber-100', text: 'text-amber-800', label: 'Pendiente' },
  pagada:    { bg: 'bg-emerald-100', text: 'text-emerald-800', label: 'Pagada' },
  aprobada:  { bg: 'bg-blue-100', text: 'text-blue-800', label: 'Aprobada' },
};

export default function MisGanancias() {
  const [data, setData] = useState<MisComisionesData | null>(null);
  const [loading, setLoading] = useState(true);
  const [periodo, setPeriodo] = useState(() => new Date().toISOString().slice(0, 7));

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API}/comisiones/mis-comisiones?periodo=${periodo}`, {
        headers: { Authorization: `Bearer ${token()}` },
      });
      if (res.ok) setData(await res.json());
    } finally {
      setLoading(false);
    }
  }, [periodo]);

  useEffect(() => { load(); }, [load]);

  const prevMes = () => {
    const d = new Date(periodo + '-01');
    d.setMonth(d.getMonth() - 1);
    setPeriodo(d.toISOString().slice(0, 7));
  };
  const nextMes = () => {
    const d = new Date(periodo + '-01');
    d.setMonth(d.getMonth() + 1);
    setPeriodo(d.toISOString().slice(0, 7));
  };

  const mesLabel = () => {
    const d = new Date(periodo + '-01');
    return d.toLocaleDateString('es-CL', { month: 'long', year: 'numeric' })
      .replace(/^./, s => s.toUpperCase());
  };

  const totalItems = data?.comisiones.reduce((s, c) => s + c.cantidad, 0) || 0;

  return (
    <div className="space-y-5">
      {/* Header */}
      <div>
        <h1 className="flex items-center gap-2 text-xl font-bold text-slate-900 sm:text-2xl">
          <DollarSign size={22} className="shrink-0 text-emerald-500" />
          Mis Ganancias
        </h1>
        <p className="mt-0.5 text-sm text-slate-500">Registro de trabajo realizado y comisiones acumuladas</p>
      </div>

      {/* Month navigator */}
      <div className="flex items-center justify-center gap-3">
        <button onClick={prevMes}
          className="flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-600 shadow-sm hover:bg-slate-50 active:scale-95 transition-all">
          <ChevronLeft size={18} />
        </button>
        <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 shadow-sm">
          <Calendar size={15} className="shrink-0 text-rose-500" />
          <span className="min-w-[160px] text-center text-sm font-bold text-slate-800 sm:min-w-[180px]">
            {mesLabel()}
          </span>
        </div>
        <button onClick={nextMes}
          className="flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-600 shadow-sm hover:bg-slate-50 active:scale-95 transition-all">
          <ChevronRight size={18} />
        </button>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-3 gap-3 sm:gap-4">
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-3 sm:p-4">
          <div className="mb-2 flex items-center gap-1.5">
            <DollarSign size={15} className="shrink-0 text-emerald-600" />
            <span className="text-[10px] font-bold uppercase tracking-wide text-emerald-700 sm:text-xs">Ganado</span>
          </div>
          <p className="text-lg font-extrabold text-emerald-800 sm:text-2xl">
            {fmtPesos(data?.total || 0)}
          </p>
        </div>
        <div className="rounded-xl border border-rose-200 bg-rose-50 p-3 sm:p-4">
          <div className="mb-2 flex items-center gap-1.5">
            <Package size={15} className="shrink-0 text-rose-600" />
            <span className="text-[10px] font-bold uppercase tracking-wide text-rose-700 sm:text-xs">Ítems</span>
          </div>
          <p className="text-lg font-extrabold text-rose-800 sm:text-2xl">{totalItems}</p>
        </div>
        <div className="rounded-xl border border-violet-200 bg-violet-50 p-3 sm:p-4">
          <div className="mb-2 flex items-center gap-1.5">
            <TrendingUp size={15} className="shrink-0 text-violet-600" />
            <span className="text-[10px] font-bold uppercase tracking-wide text-violet-700 sm:text-xs">Registros</span>
          </div>
          <p className="text-lg font-extrabold text-violet-800 sm:text-2xl">
            {data?.comisiones.length || 0}
          </p>
        </div>
      </div>

      {/* Records list */}
      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
        <div className="border-b border-slate-100 px-4 py-3">
          <h3 className="text-sm font-bold text-slate-800">Detalle de registros</h3>
        </div>

        {loading ? (
          <div className="space-y-3 p-4">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-16 animate-pulse rounded-lg bg-slate-100" />
            ))}
          </div>
        ) : !data || data.comisiones.length === 0 ? (
          <div className="flex flex-col items-center py-12">
            <DollarSign size={36} className="mb-3 text-slate-200" />
            <p className="text-sm text-slate-400">No hay registros para este periodo</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-50">
            {data.comisiones.map((c, idx) => {
              const estadoCfg = ESTADO_CFG[c.estado] || { bg: 'bg-slate-100', text: 'text-slate-600', label: c.estado };
              return (
                <div key={c.id} className={`px-4 py-3.5 ${idx % 2 === 1 ? 'bg-slate-50/60' : ''}`}>
                  {/* Mobile: stacked, Desktop: single row */}
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-sm font-semibold text-slate-900">{c.categoria}</span>
                        <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${estadoCfg.bg} ${estadoCfg.text}`}>
                          {estadoCfg.label}
                        </span>
                      </div>
                      <div className="mt-0.5 flex flex-wrap gap-x-3 gap-y-0.5 text-xs text-slate-400">
                        <span>×{c.cantidad} unidades · {fmtPesos(c.monto_por_unidad)}/c/u</span>
                        {c.fecha_trabajo && (
                          <span>{new Date(c.fecha_trabajo).toLocaleDateString('es-CL')}</span>
                        )}
                      </div>
                      {c.notas && (
                        <p className="mt-1 text-xs text-slate-400 line-clamp-1">{c.notas}</p>
                      )}
                    </div>
                    <div className="shrink-0 text-right">
                      <p className="text-base font-extrabold text-emerald-600 sm:text-lg">
                        {fmtPesos(c.total)}
                      </p>
                    </div>
                  </div>
                </div>
              );
            })}

            {/* Total row */}
            <div className="flex items-center justify-between bg-slate-900 px-4 py-3.5">
              <div>
                <span className="text-xs font-bold uppercase tracking-wide text-slate-400">Total del mes</span>
                <p className="text-[11px] text-slate-500">{totalItems} ítems · {data.comisiones.length} registros</p>
              </div>
              <span className="text-xl font-extrabold text-emerald-400">{fmtPesos(data.total)}</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
