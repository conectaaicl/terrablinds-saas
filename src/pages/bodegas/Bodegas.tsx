import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Package, ClipboardList, PackageSearch, AlertCircle,
  Loader2, ArrowRight, CheckCircle2, TrendingUp,
  RefreshCw, Warehouse, Zap,
} from 'lucide-react';
import { api } from '../../services/api';
import { useAuth } from '../../context/AuthContext';

interface InsumoRequest {
  id: string; items: string[]; urgencia: 'baja' | 'media' | 'alta';
  estado: string; created_at: string;
}

const URGENCIA_CONFIG = {
  baja:  { label: 'Baja',  bg: 'bg-slate-100',  color: 'text-slate-600',  dot: 'bg-slate-400' },
  media: { label: 'Media', bg: 'bg-amber-50',   color: 'text-amber-700',  dot: 'bg-amber-400' },
  alta:  { label: 'Alta',  bg: 'bg-red-50',     color: 'text-red-700',    dot: 'bg-red-500'   },
} as const;

const fmt = (n: number) => '$' + n.toLocaleString('es-CL');
const fmtDate = (s: string) => s ? new Date(s).toLocaleDateString('es-CL') : '—';

export default function BodegasDashboard() {
  const { user, tenant } = useAuth();
  const [insumos, setInsumos] = useState<InsumoRequest[]>([]);
  const [ordenes, setOrdenes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = () => {
    setLoading(true);
    Promise.all([
      api.getInsumos().catch(() => []),
      api.getOrders().catch(() => []),
    ]).then(([ins, ords]) => {
      setInsumos(ins || []);
      setOrdenes(ords || []);
    }).catch(() => setError('Error al cargar datos'))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const pendientesAlta    = insumos.filter(i => i.urgencia === 'alta'  && i.estado === 'pendiente');
  const pendientesMedia   = insumos.filter(i => i.urgencia === 'media' && i.estado === 'pendiente');
  const insumosPendientes = insumos.filter(i => i.estado === 'pendiente');
  const ordenesActivas    = ordenes.filter(o => !['cerrada','cancelada','rechazada'].includes(o.estado));
  const listasParaInstalar = ordenes.filter(o => ['listo_para_instalar','fabricado'].includes(o.estado));

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 size={24} className="animate-spin text-slate-400" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-2xl border border-red-100 bg-red-50 p-6 text-center text-sm text-red-700">
        {error}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Bodegas & Inventario</h1>
          <p className="text-sm text-slate-500">{tenant?.nombre} · Vista operacional</p>
        </div>
        <button onClick={load}
          className="flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-600 hover:bg-slate-50 transition-colors">
          <RefreshCw size={13} /> Actualizar
        </button>
      </div>

      {/* Alert banner */}
      {pendientesAlta.length > 0 && (
        <div className="flex items-center gap-3 rounded-2xl bg-gradient-to-r from-red-500 to-rose-600 px-5 py-3.5 text-white shadow-lg shadow-red-500/20">
          <Zap size={18} className="shrink-0" />
          <div className="flex-1">
            <p className="font-bold text-sm">{pendientesAlta.length} solicitud(es) URGENTE(S) de insumos</p>
            <p className="text-xs text-red-100">Requieren atención inmediata</p>
          </div>
          <Link to="/bodegas/insumos"
            className="flex items-center gap-1 rounded-lg bg-white/20 px-3 py-1.5 text-xs font-semibold hover:bg-white/30 transition-colors">
            Ver <ArrowRight size={12} />
          </Link>
        </div>
      )}

      {/* KPI Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[
          {
            label: 'Órdenes Activas',
            value: ordenesActivas.length,
            sub: `${listasParaInstalar.length} listas para instalar`,
            gradient: 'from-blue-500 to-blue-600',
            icon: Package,
            link: '/bodegas/ordenes',
          },
          {
            label: 'Insumos Pendientes',
            value: insumosPendientes.length,
            sub: `${pendientesAlta.length} urgentes · ${pendientesMedia.length} medias`,
            gradient: pendientesAlta.length > 0 ? 'from-red-500 to-rose-600' : 'from-amber-500 to-amber-600',
            icon: PackageSearch,
            link: '/bodegas/insumos',
          },
          {
            label: 'Listas p/ Instalar',
            value: listasParaInstalar.length,
            sub: 'Esperando agendamiento',
            gradient: 'from-violet-500 to-violet-600',
            icon: CheckCircle2,
            link: '/bodegas/ordenes',
          },
          {
            label: 'Total Catálogo',
            value: ordenes.length,
            sub: 'Órdenes registradas',
            gradient: 'from-emerald-500 to-emerald-600',
            icon: Warehouse,
            link: '/bodegas/ordenes',
          },
        ].map(card => (
          <Link key={card.label} to={card.link}
            className={`relative overflow-hidden rounded-2xl bg-gradient-to-br ${card.gradient} p-5 text-white shadow-sm transition hover:shadow-md hover:scale-[1.01]`}>
            {/* Decorative circles */}
            <div className="absolute -right-4 -top-4 h-20 w-20 rounded-full bg-white/10" />
            <div className="absolute -right-2 -bottom-6 h-24 w-24 rounded-full bg-white/5" />
            <div className="relative">
              <div className="flex items-center justify-between mb-3">
                <p className="text-sm font-medium text-white/80">{card.label}</p>
                <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-white/20">
                  <card.icon size={15} />
                </div>
              </div>
              <p className="text-3xl font-black">{card.value}</p>
              <p className="mt-1 text-xs text-white/70">{card.sub}</p>
            </div>
          </Link>
        ))}
      </div>

      {/* Two column layout */}
      <div className="grid gap-5 lg:grid-cols-2">
        {/* Solicitudes Urgentes */}
        <div className="rounded-2xl border border-slate-100 bg-white shadow-sm">
          <div className="flex items-center justify-between border-b border-slate-50 px-5 py-4">
            <h2 className="font-bold text-slate-900">Solicitudes de Insumos</h2>
            <Link to="/bodegas/insumos"
              className="text-xs font-semibold hover:opacity-80" style={{ color: 'var(--brand-primary)' }}>
              Ver todas <ArrowRight size={11} className="inline" />
            </Link>
          </div>

          {insumosPendientes.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-10 text-slate-400">
              <CheckCircle2 size={32} className="mb-2 text-emerald-400" />
              <p className="text-sm font-medium text-emerald-700">Sin solicitudes pendientes</p>
              <p className="text-xs text-slate-400">Todo en orden</p>
            </div>
          ) : (
            <div className="divide-y divide-slate-50">
              {insumosPendientes.slice(0, 6).map(ins => {
                const cfg = URGENCIA_CONFIG[ins.urgencia];
                return (
                  <div key={ins.id} className="flex items-start gap-3 px-5 py-3.5 hover:bg-slate-50 transition-colors">
                    <div className={`mt-1 h-2 w-2 rounded-full shrink-0 ${cfg.dot}`} />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-slate-800 truncate">
                        {ins.items.slice(0, 2).join(', ')}{ins.items.length > 2 ? ` +${ins.items.length - 2}` : ''}
                      </p>
                      <p className="text-xs text-slate-400">{fmtDate(ins.created_at)}</p>
                    </div>
                    <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold ${cfg.bg} ${cfg.color}`}>
                      {cfg.label}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Órdenes por despachar */}
        <div className="rounded-2xl border border-slate-100 bg-white shadow-sm">
          <div className="flex items-center justify-between border-b border-slate-50 px-5 py-4">
            <h2 className="font-bold text-slate-900">Órdenes Activas</h2>
            <Link to="/bodegas/ordenes"
              className="text-xs font-semibold hover:opacity-80" style={{ color: 'var(--brand-primary)' }}>
              Ver todas <ArrowRight size={11} className="inline" />
            </Link>
          </div>

          {ordenesActivas.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-10 text-slate-400">
              <ClipboardList size={32} className="mb-2 opacity-30" />
              <p className="text-sm">Sin órdenes activas</p>
            </div>
          ) : (
            <div className="divide-y divide-slate-50">
              {ordenesActivas.slice(0, 6).map(o => {
                const isUrgente = ['listo_para_instalar','fabricado'].includes(o.estado);
                return (
                  <Link key={o.id} to={`/bodegas/ordenes/${o.id}`}
                    className="flex items-center gap-3 px-5 py-3.5 hover:bg-slate-50 transition-colors">
                    <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-xl ${isUrgente ? 'bg-violet-100' : 'bg-slate-100'}`}>
                      <ClipboardList size={14} className={isUrgente ? 'text-violet-600' : 'text-slate-500'} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-slate-800">OT #{o.numero}</p>
                      <p className="truncate text-xs text-slate-400">{o.cliente_nombre || '—'}</p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-xs font-bold text-slate-800">{fmt(o.precio_total || 0)}</p>
                      {isUrgente && (
                        <span className="text-[10px] font-semibold text-violet-600">Lista</span>
                      )}
                    </div>
                    <ArrowRight size={13} className="text-slate-300 shrink-0" />
                  </Link>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Quick actions */}
      <div className="flex flex-wrap gap-3">
        {[
          { to: '/bodegas/insumos', icon: PackageSearch, label: 'Gestionar Insumos', color: 'bg-amber-500' },
          { to: '/bodegas/ordenes', icon: ClipboardList, label: 'Ver Todas las Órdenes', color: 'bg-blue-500' },
        ].map(a => (
          <Link key={a.to} to={a.to}
            className={`flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:opacity-90 ${a.color}`}>
            <a.icon size={16} /> {a.label}
          </Link>
        ))}
      </div>
    </div>
  );
}
