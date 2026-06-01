import { useState, useMemo } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useApi } from '../../hooks/useApi';
import { api } from '../../services/api';
import { Spinner, ErrorMessage } from '../../components/LoadingStates';
import { ESTADO_CONFIG } from '../../types';
import type { EstadoOrden } from '../../types';
import { FileText, Search, Plus, ChevronRight, User, Calendar, Trash2 } from 'lucide-react';
import { getAccessToken } from '../../services/api';
import { useNavigate } from 'react-router-dom';

const fmt = (n: number) => '$' + n.toLocaleString('es-CL');
const fmtDate = (s: string) => s ? new Date(s).toLocaleDateString('es-CL') : '—';

async function eliminarCotizacion(id: number, numero: number, refetch: () => void) {
  if (!confirm('¿Eliminar cotización #' + numero + '? Esta acción no se puede deshacer.')) return;
  try {
    const token = getAccessToken() || '';
    const r = await fetch('https://working.conectaai.cl/api/v1/orders/' + id, {
      method: 'DELETE',
      headers: { Authorization: 'Bearer ' + token }
    });
    if (!r.ok) { const t = await r.text(); throw new Error(t); }
    refetch();
  } catch (e: any) { alert(e.message); }
}

export default function Cotizaciones() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [filtroEstado, setFiltroEstado] = useState('');
  const { data: orders, loading, error, refetch } = useApi(() => api.getOrders());
  const orderList: any[] = orders || [];

  const filtered = useMemo(() => {
    let list = orderList;
    if (filtroEstado) list = list.filter(o => o.estado === filtroEstado);
    if (search) {
      const s = search.toLowerCase();
      list = list.filter(o =>
        String(o.numero).includes(s) ||
        (o.cliente_nombre || '').toLowerCase().includes(s) ||
        (o.vendedor_nombre || '').toLowerCase().includes(s)
      );
    }
    return list.sort((a, b) => b.numero - a.numero);
  }, [orderList, search, filtroEstado]);

  const rol = user?.rol || '';
  const base = rol === 'coordinador' ? '/coordinador' : rol === 'gerente' ? '/gerente' : '/jefe';

  if (loading) return <Spinner />;
  if (error) return <ErrorMessage message={error} onRetry={refetch} />;

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-100">Cotizaciones</h1>
          <p className="text-sm text-slate-400">{filtered.length} orden{filtered.length !== 1 ? 'es' : ''}</p>
        </div>
        <button onClick={() => navigate(`${base}/cotizaciones/nueva`)} className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-indigo-500 to-violet-600 px-4 py-2.5 text-sm font-semibold text-white shadow-[0_4px_24px_rgba(99,102,241,0.35)] hover:opacity-90 hover:-translate-y-0.5 transition-all">
          <Plus size={16} /> Nueva Cotización
        </button>
      </div>

      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-48">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar por número, cliente o vendedor..." className="w-full rounded-xl border border-[rgba(255,255,255,0.08)] bg-[rgba(255,255,255,0.04)] py-2.5 pl-9 pr-4 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-indigo-500" />
        </div>
        <select value={filtroEstado} onChange={e => setFiltroEstado(e.target.value)} className="rounded-xl border border-[rgba(255,255,255,0.08)] bg-[rgba(10,16,32,0.9)] px-3 py-2.5 text-sm text-slate-300 focus:outline-none focus:border-indigo-500">
          <option value="">Todos los estados</option>
          {Object.entries(ESTADO_CONFIG).map(([k, v]) => <option key={k} value={k}>{(v as any).label}</option>)}
        </select>
      </div>

      {filtered.length === 0
        ? <div className="rounded-xl border border-dashed border-[rgba(255,255,255,0.10)] bg-[rgba(10,16,32,0.9)] p-14 text-center">
            <FileText size={40} className="mx-auto text-slate-600" />
            <p className="mt-3 text-sm font-medium text-slate-400">No hay cotizaciones</p>
            <button onClick={() => navigate(`${base}/cotizaciones/nueva`)} className="mt-4 inline-flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-indigo-500 to-violet-600 px-4 py-2 text-sm font-semibold text-white">
              <Plus size={15} /> Nueva Cotización
            </button>
          </div>
        : <div className="space-y-2">
            {filtered.map((o: any) => {
              const cfg = ESTADO_CONFIG[o.estado as EstadoOrden] || ESTADO_CONFIG.cotizado;
              return (
                <div key={o.id} onClick={() => navigate(`${base}/cotizaciones/${o.id}`)} className="flex cursor-pointer items-center gap-4 rounded-xl border border-[rgba(255,255,255,0.07)] bg-[rgba(10,16,32,0.9)] p-4 shadow-sm hover:bg-[rgba(255,255,255,0.03)] hover:border-[rgba(255,255,255,0.12)] transition backdrop-blur-xl">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 text-sm font-bold text-white">#{o.numero}</div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-slate-100 truncate">{o.cliente_nombre || 'Sin cliente'}</p>
                    <div className="flex flex-wrap gap-3 mt-0.5">
                      {o.vendedor_nombre && <span className="flex items-center gap-1 text-xs text-slate-400"><User size={11} /> {o.vendedor_nombre}</span>}
                      <span className="flex items-center gap-1 text-xs text-slate-400"><Calendar size={11} /> {fmtDate(o.created_at)}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="text-right">
                      <p className="font-bold text-slate-100">{fmt(o.precio_total || 0)}</p>
                      <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${(cfg as any).bg} ${(cfg as any).color}`}>{(cfg as any).label}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <button onClick={e => { e.stopPropagation(); eliminarCotizacion(o.id, o.numero, refetch); }} className="rounded-lg p-1.5 text-slate-500 hover:bg-red-500/10 hover:text-red-400"><Trash2 size={14} /></button>
                      <ChevronRight size={16} className="text-slate-500" />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>}
    </div>
  );
}
