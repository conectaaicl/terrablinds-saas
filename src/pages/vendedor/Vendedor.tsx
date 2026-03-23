import { useState, useMemo, useCallback, useRef, useEffect } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useApi } from '../../hooks/useApi';
import { useMutation } from '../../hooks/useMutation';
import { api } from '../../services/api';
import { ESTADO_CONFIG, TIPOS_PRODUCTO, TELAS, COLORES } from '../../types';
import type { EstadoOrden } from '../../types';
import { Spinner, ErrorMessage } from '../../components/LoadingStates';
import {
  ChevronRight, Plus, Trash2, ArrowLeft, Clock, User, Ruler,
  Palette, CheckCircle, Search, ShoppingBag, FileText, Send,
  CheckCircle2, XCircle, ArrowRight, BookOpen, X, Package,
  RefreshCw, Printer,
} from 'lucide-react';

const fmt = (n: number) => '$' + n.toLocaleString('es-CL');
const fmtDate = (s: string) => s ? new Date(s).toLocaleDateString('es-CL') : '—';

// ═══════════════════════════════════════
// MIS COTIZACIONES / PEDIDOS
// ═══════════════════════════════════════
const COT_ESTADO_CFG: Record<string, { label: string; bg: string; color: string }> = {
  borrador:   { label: 'Borrador',   bg: 'bg-slate-100',  color: 'text-slate-600' },
  enviada:    { label: 'Enviada',    bg: 'bg-blue-100',   color: 'text-blue-700'  },
  aceptada:   { label: 'Aceptada',  bg: 'bg-emerald-100',color: 'text-emerald-700'},
  rechazada:  { label: 'Rechazada', bg: 'bg-red-100',    color: 'text-red-700'   },
  convertida: { label: 'Convertida',bg: 'bg-violet-100', color: 'text-violet-700'},
};

export function MisCotizaciones() {
  const { user } = useAuth();
  const [tab, setTab] = useState<'cotizaciones' | 'ordenes'>('cotizaciones');
  const [search, setSearch] = useState('');

  const { data: cotizaciones, loading: cotLoading, error: cotErr, refetch: cotRefetch } = useApi(() => api.getCotizaciones());
  const { data: orders, loading: ordLoading, error: ordErr, refetch: ordRefetch } = useApi(() => api.getOrders());

  const cotList: any[] = cotizaciones || [];
  const orderList: any[] = orders || [];

  const misOrdenes = useMemo(() =>
    orderList.filter(o => o.vendedor_id === user?.id),
    [orderList, user]
  );

  const filteredCot = useMemo(() => {
    if (!search) return cotList;
    const s = search.toLowerCase();
    return cotList.filter(c =>
      String(c.numero).includes(s) || (c.cliente_nombre || '').toLowerCase().includes(s)
    );
  }, [cotList, search]);

  const filteredOrd = useMemo(() => {
    if (!search) return misOrdenes;
    const s = search.toLowerCase();
    return misOrdenes.filter(o =>
      String(o.numero).includes(s) || (o.cliente_nombre || '').toLowerCase().includes(s)
    );
  }, [misOrdenes, search]);

  const loading = tab === 'cotizaciones' ? cotLoading : ordLoading;
  const error   = tab === 'cotizaciones' ? cotErr     : ordErr;
  const refetch = tab === 'cotizaciones' ? cotRefetch : ordRefetch;

  if (loading) return <Spinner />;
  if (error)   return <ErrorMessage message={error} onRetry={refetch} />;

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Mis Ventas</h1>
          <p className="text-sm text-slate-500">
            {tab === 'cotizaciones' ? cotList.length : misOrdenes.length} registros
          </p>
        </div>
        <Link to="/vendedor/nueva"
          className="flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold text-white shadow-sm hover:opacity-90"
          style={{ backgroundColor: 'var(--brand-primary)' }}>
          <Plus size={17} /> Nueva Cotización
        </Link>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 rounded-xl bg-slate-100 p-1">
        {(['cotizaciones', 'ordenes'] as const).map(t => (
          <button key={t} onClick={() => setTab(t)}
            className={`flex-1 rounded-lg py-2 text-xs font-semibold transition ${tab === t ? 'bg-white shadow-sm text-slate-900' : 'text-slate-500 hover:text-slate-700'}`}>
            {t === 'cotizaciones' ? `Cotizaciones (${cotList.length})` : `Órdenes (${misOrdenes.length})`}
          </button>
        ))}
      </div>

      <div className="relative">
        <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar por N° o cliente..."
          className="w-full rounded-lg border border-slate-300 py-2 pl-9 pr-3 text-sm outline-none focus:border-slate-500 focus:ring-2 focus:ring-slate-200" />
      </div>

      {/* Cotizaciones */}
      {tab === 'cotizaciones' && (
        <div className="space-y-2">
          {filteredCot.map((c: any) => {
            const cfg = COT_ESTADO_CFG[c.estado] || COT_ESTADO_CFG.borrador;
            return (
              <Link key={c.id} to={`/vendedor/cotizacion/${c.id}`}
                className="flex items-center justify-between rounded-xl border border-slate-200 bg-white p-4 transition hover:border-slate-300 hover:shadow-sm">
                <div className="flex items-center gap-3.5">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-blue-50">
                    <FileText size={17} className="text-blue-500" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-slate-800">Cot. #{c.numero}</p>
                    <p className="truncate text-xs text-slate-500">
                      {c.cliente_nombre || '—'} · {c.productos?.length || 0} prod. · {fmtDate(c.created_at)}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="text-right">
                    <p className="text-sm font-bold text-slate-800">{fmt(c.precio_total)}</p>
                    <span className={`text-[11px] font-semibold ${cfg.color}`}>{cfg.label}</span>
                  </div>
                  <ChevronRight size={15} className="text-slate-300" />
                </div>
              </Link>
            );
          })}
          {filteredCot.length === 0 && (
            <div className="rounded-xl border border-slate-200 bg-white p-14 text-center text-sm text-slate-400">
              Sin cotizaciones. Usa "Nueva Cotización" o "Toma de Medidas".
            </div>
          )}
        </div>
      )}

      {/* Órdenes */}
      {tab === 'ordenes' && (
        <div className="space-y-2">
          {filteredOrd.map((o: any) => {
            const cfg = ESTADO_CONFIG[o.estado as EstadoOrden] || ESTADO_CONFIG.cotizado;
            return (
              <Link key={o.id} to={`/vendedor/pedido/${o.id}`}
                className="flex items-center justify-between rounded-xl border border-slate-200 bg-white p-4 transition hover:border-slate-300 hover:shadow-sm">
                <div className="flex items-center gap-3.5">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-violet-50">
                    <ShoppingBag size={17} className="text-violet-500" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-slate-800">OT #{o.numero}</p>
                    <p className="truncate text-xs text-slate-500">
                      {o.cliente_nombre || '—'} · {o.productos?.length || 0} prod. · {fmtDate(o.created_at)}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="text-right">
                    <p className="text-sm font-bold text-slate-800">{fmt(o.precio_total)}</p>
                    <span className={`text-[11px] font-semibold ${cfg.color}`}>{cfg.label}</span>
                  </div>
                  <ChevronRight size={15} className="text-slate-300" />
                </div>
              </Link>
            );
          })}
          {filteredOrd.length === 0 && (
            <div className="rounded-xl border border-slate-200 bg-white p-14 text-center text-sm text-slate-400">
              Sin resultados
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════
// CATÁLOGO PICKER MODAL
// ═══════════════════════════════════════
interface CatalogProduct {
  id: string; nombre: string; categoria: string; unidad: string;
  precio_base: number; precio_m2?: number; precio_ml?: number;
  proveedor?: string; marca?: string; colores?: string[]; materiales?: string[];
  ancho_min?: number; ancho_max?: number; alto_min?: number; alto_max?: number;
}

function CatalogoPicker({ onSelect, onClose }: {
  onSelect: (p: CatalogProduct) => void;
  onClose: () => void;
}) {
  const [q, setQ] = useState('');
  const [results, setResults] = useState<CatalogProduct[]>([]);
  const [loading, setLoading] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => { inputRef.current?.focus(); }, []);

  const search = useCallback((term: string) => {
    if (!term.trim()) { setResults([]); return; }
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      setLoading(true);
      try {
        const data = await api.searchProductos(term, 40);
        setResults(data || []);
      } catch { setResults([]); }
      finally { setLoading(false); }
    }, 300);
  }, []);

  const handleQ = (v: string) => { setQ(v); search(v); };

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/50 pt-16 px-4"
      onClick={onClose}>
      <div className="w-full max-w-lg rounded-2xl bg-white shadow-2xl overflow-hidden"
        onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="flex items-center gap-3 border-b border-slate-100 px-4 py-3">
          <BookOpen size={18} className="text-slate-500 shrink-0" />
          <input
            ref={inputRef}
            value={q}
            onChange={e => handleQ(e.target.value)}
            placeholder="Buscar en catálogo (nombre, proveedor, marca...)"
            className="flex-1 text-sm outline-none placeholder:text-slate-400"
          />
          {loading && <RefreshCw size={14} className="animate-spin text-slate-400 shrink-0" />}
          <button onClick={onClose} className="shrink-0 text-slate-400 hover:text-slate-600">
            <X size={18} />
          </button>
        </div>

        {/* Results */}
        <div className="max-h-[60vh] overflow-y-auto">
          {results.length === 0 && !loading && q.trim() && (
            <div className="flex flex-col items-center justify-center py-12 text-slate-400">
              <Package size={32} className="mb-2 opacity-30" />
              <p className="text-sm">Sin resultados para "{q}"</p>
            </div>
          )}
          {results.length === 0 && !q.trim() && (
            <div className="flex flex-col items-center justify-center py-12 text-slate-400">
              <Search size={32} className="mb-2 opacity-30" />
              <p className="text-sm">Escribe para buscar productos</p>
            </div>
          )}
          {results.map(p => (
            <button key={p.id} onClick={() => { onSelect(p); onClose(); }}
              className="flex w-full items-start gap-3 px-4 py-3 text-left hover:bg-slate-50 transition-colors border-b border-slate-50 last:border-0">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-slate-100 mt-0.5">
                <Package size={15} className="text-slate-500" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-slate-800 truncate">{p.nombre}</p>
                <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                  <span className="text-[10px] font-medium px-1.5 py-0.5 rounded-full bg-slate-100 text-slate-500">
                    {p.categoria}
                  </span>
                  {p.proveedor && (
                    <span className="text-[10px] text-slate-400">{p.proveedor}</span>
                  )}
                  {p.marca && (
                    <span className="text-[10px] text-slate-400">{p.marca}</span>
                  )}
                </div>
                {(p.ancho_min || p.ancho_max) && (
                  <p className="text-[10px] text-slate-400 mt-0.5">
                    Ancho: {p.ancho_min}–{p.ancho_max} cm
                    {(p.alto_min || p.alto_max) && ` · Alto: ${p.alto_min}–${p.alto_max} cm`}
                  </p>
                )}
              </div>
              <div className="shrink-0 text-right">
                {p.precio_m2 ? (
                  <p className="text-sm font-bold text-slate-900">${Number(p.precio_m2).toLocaleString('es-CL')}/m²</p>
                ) : p.precio_ml ? (
                  <p className="text-sm font-bold text-slate-900">${Number(p.precio_ml).toLocaleString('es-CL')}/ml</p>
                ) : (
                  <p className="text-sm font-bold text-slate-900">${Number(p.precio_base).toLocaleString('es-CL')}</p>
                )}
                <p className="text-[10px] text-slate-400">{p.unidad}</p>
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════
// NUEVA COTIZACIÓN (wizard 3 pasos)
// ═══════════════════════════════════════
type Producto = {
  tipo: string; ancho: number; alto: number;
  tela: string; color: string; precio: number; notas: string;
  producto_id?: string; nombre_catalogo?: string; unidad?: string;
};

export function NuevaCotizacion() {
  const { user } = useAuth();
  const nav = useNavigate();
  const [step, setStep] = useState(1);
  const [selCliente, setSelCliente] = useState<number | null>(null);
  const [isNew, setIsNew] = useState(false);
  const [nc, setNc] = useState({ nombre: '', email: '', telefono: '', direccion: '' });
  const [productos, setProductos] = useState<Producto[]>([]);
  const [showCatalogo, setShowCatalogo] = useState(false);
  const [cp, setCp] = useState<Producto>({
    tipo: TIPOS_PRODUCTO[0], ancho: 100, alto: 100,
    tela: TELAS[0], color: COLORES[0], precio: 0, notas: '',
  });

  const { data: clientes } = useApi(() => api.getClients());
  const { execute: crearCliente, loading: creatingCli } = useMutation(api.createClient);
  const { execute: crearCotizacion, loading: creatingCot, error: cotErr } = useMutation(api.createCotizacion);

  const clienteList: any[] = clientes || [];
  const total = productos.reduce((s, p) => s + p.precio, 0);

  const addProd = () => {
    if (!cp.precio) return;
    setProductos(prev => [...prev, { ...cp }]);
    setCp(p => ({ ...p, tipo: TIPOS_PRODUCTO[0], precio: 0, notas: '', producto_id: undefined, nombre_catalogo: undefined }));
  };

  const handleCatalogoSelect = (p: CatalogProduct) => {
    const precio = p.precio_m2
      ? Math.round(p.precio_m2 * (cp.ancho / 100) * (cp.alto / 100))
      : p.precio_ml
      ? Math.round(p.precio_ml * (cp.ancho / 100))
      : p.precio_base;
    setCp(prev => ({
      ...prev,
      tipo: p.nombre,
      tela: p.materiales?.[0] || prev.tela,
      color: p.colores?.[0] || prev.color,
      ancho: p.ancho_min || prev.ancho,
      alto: p.alto_min || prev.alto,
      precio,
      producto_id: p.id,
      nombre_catalogo: p.nombre,
      unidad: p.unidad,
    }));
  };

  const rmProd = (i: number) => setProductos(p => p.filter((_, j) => j !== i));

  const crear = useCallback(async () => {
    if (!user) return;
    let clienteId = selCliente;

    if (isNew) {
      const cli = await crearCliente({ nombre: nc.nombre, email: nc.email || undefined, telefono: nc.telefono || undefined, direccion: nc.direccion || undefined });
      if (!cli) return;
      clienteId = cli.id;
    }

    if (!clienteId) return;

    const res = await crearCotizacion({
      cliente_id: clienteId,
      productos: productos.map(p => ({
        tipo: p.tipo, ancho: p.ancho, alto: p.alto,
        tela: p.tela, color: p.color, precio: p.precio,
        notas: p.notas || undefined,
      })),
      precio_total: total,
    });

    if (res) nav(-1);
  }, [user, selCliente, isNew, nc, productos, total, nav, crearCliente, crearCotizacion]);

  const canNext1 = isNew ? nc.nombre.length > 0 : selCliente !== null;

  return (
    <div className="mx-auto max-w-2xl space-y-5">
      <button onClick={() => nav(-1)} className="flex items-center gap-1 text-sm font-medium text-slate-500 hover:text-slate-800">
        <ArrowLeft size={15} /> Volver
      </button>

      <div>
        <h1 className="text-2xl font-bold text-slate-900">Nueva Cotización</h1>
        <p className="text-sm text-slate-500">Paso {step} de 3</p>
      </div>

      <div className="flex gap-1.5">
        {[1, 2, 3].map(s => (
          <div key={s} className="h-1 flex-1 rounded-full transition-colors"
            style={{ backgroundColor: s <= step ? 'var(--brand-primary)' : '#e2e8f0' }} />
        ))}
      </div>

      {step === 1 && (
        <div className="rounded-xl border border-slate-200 bg-white p-6">
          <h2 className="mb-4 text-base font-semibold text-slate-900">Seleccionar Cliente</h2>
          <div className="mb-4 flex gap-2">
            <TabBtn active={!isNew} onClick={() => setIsNew(false)}>Existente</TabBtn>
            <TabBtn active={isNew} onClick={() => setIsNew(true)}>Nuevo</TabBtn>
          </div>
          {!isNew ? (
            <div className="space-y-2">
              {clienteList.map(c => (
                <label key={c.id} className={`flex cursor-pointer items-center gap-3 rounded-lg border p-3 transition ${selCliente === c.id ? 'border-blue-400 bg-blue-50' : 'border-slate-200 hover:bg-slate-50'}`}>
                  <input type="radio" name="cli" value={c.id} checked={selCliente === c.id} onChange={() => setSelCliente(c.id)} className="accent-blue-500" />
                  <div>
                    <p className="text-sm font-medium text-slate-800">{c.nombre}</p>
                    <p className="text-xs text-slate-500">{c.telefono} · {c.direccion}</p>
                  </div>
                </label>
              ))}
              {clienteList.length === 0 && <p className="text-sm text-slate-400">No hay clientes, crea uno nuevo.</p>}
            </div>
          ) : (
            <div className="space-y-3">
              <Input label="Nombre *" value={nc.nombre} onChange={v => setNc(n => ({ ...n, nombre: v }))} />
              <Input label="Teléfono" value={nc.telefono} onChange={v => setNc(n => ({ ...n, telefono: v }))} />
              <Input label="Email" value={nc.email} onChange={v => setNc(n => ({ ...n, email: v }))} />
              <Input label="Dirección" value={nc.direccion} onChange={v => setNc(n => ({ ...n, direccion: v }))} />
            </div>
          )}
          <button onClick={() => setStep(2)} disabled={!canNext1}
            className="mt-5 w-full rounded-lg px-4 py-2.5 text-sm font-semibold text-white hover:opacity-90 disabled:opacity-40"
            style={{ backgroundColor: 'var(--brand-primary)' }}>
            Siguiente: Productos →
          </button>
        </div>
      )}

      {step === 2 && (
        <div className="rounded-xl border border-slate-200 bg-white p-6">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-base font-semibold text-slate-900">Productos</h2>
            <button
              onClick={() => setShowCatalogo(true)}
              className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors"
              style={{ backgroundColor: 'var(--brand-primary)', color: 'white' }}
            >
              <BookOpen size={13} /> Buscar en Catálogo
            </button>
          </div>
          {cp.nombre_catalogo && (
            <div className="mb-3 flex items-center gap-2 rounded-lg bg-blue-50 px-3 py-2 text-xs text-blue-700">
              <Package size={12} />
              <span>Desde catálogo: <strong>{cp.nombre_catalogo}</strong></span>
              <button onClick={() => setCp(p => ({ ...p, producto_id: undefined, nombre_catalogo: undefined }))}
                className="ml-auto text-blue-400 hover:text-blue-600"><X size={12} /></button>
            </div>
          )}
          <div className="mb-4 rounded-lg bg-slate-50 p-4 space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <Sel label="Tipo" value={cp.tipo} opts={TIPOS_PRODUCTO} onChange={v => setCp(p => ({ ...p, tipo: v }))} />
              <Sel label="Tela" value={cp.tela} opts={TELAS} onChange={v => setCp(p => ({ ...p, tela: v }))} />
              <Input label="Ancho (cm)" type="number" value={String(cp.ancho)} onChange={v => setCp(p => ({ ...p, ancho: +v }))} />
              <Input label="Alto (cm)" type="number" value={String(cp.alto)} onChange={v => setCp(p => ({ ...p, alto: +v }))} />
              <Sel label="Color" value={cp.color} opts={COLORES} onChange={v => setCp(p => ({ ...p, color: v }))} />
              <Input label="Precio ($)" type="number" value={cp.precio ? String(cp.precio) : ''} onChange={v => setCp(p => ({ ...p, precio: +v }))} placeholder="0" />
            </div>
            <button onClick={addProd} disabled={!cp.precio}
              className="flex w-full items-center justify-center gap-2 rounded-lg px-3 py-2 text-sm font-semibold text-white hover:opacity-90 disabled:opacity-40"
              style={{ backgroundColor: 'var(--brand-primary)' }}>
              <Plus size={15} /> Agregar Producto
            </button>
          </div>

          {productos.length > 0 && (
            <div className="space-y-2">
              {productos.map((p, i) => (
                <div key={i} className="flex items-center justify-between rounded-lg border border-slate-200 p-3">
                  <div>
                    <p className="text-sm font-medium text-slate-800">{p.tipo}</p>
                    <p className="text-xs text-slate-500">{p.ancho}×{p.alto} cm · {p.tela} · {p.color}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold text-slate-800">{fmt(p.precio)}</span>
                    <button onClick={() => rmProd(i)} className="text-red-400 hover:text-red-600"><Trash2 size={15} /></button>
                  </div>
                </div>
              ))}
              <div className="flex justify-end border-t border-slate-100 pt-2">
                <p className="text-base font-bold text-slate-900">Total: {fmt(total)}</p>
              </div>
            </div>
          )}

          <div className="mt-5 flex gap-3">
            <button onClick={() => setStep(1)} className="flex-1 rounded-lg border border-slate-300 py-2.5 text-sm font-medium text-slate-600 hover:bg-slate-50">Atrás</button>
            <button onClick={() => setStep(3)} disabled={productos.length === 0}
              className="flex-1 rounded-lg py-2.5 text-sm font-semibold text-white hover:opacity-90 disabled:opacity-40"
              style={{ backgroundColor: 'var(--brand-primary)' }}>
              Siguiente: Confirmar →
            </button>
          </div>
        </div>
      )}

      {step === 3 && (
        <div className="rounded-xl border border-slate-200 bg-white p-6">
          <h2 className="mb-4 text-base font-semibold text-slate-900">Resumen</h2>
          {cotErr && (
            <p className="mb-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{cotErr}</p>
          )}
          <div className="space-y-4">
            <div className="rounded-lg bg-slate-50 p-4">
              <p className="text-[11px] font-semibold uppercase text-slate-400">Cliente</p>
              <p className="mt-1 text-sm font-medium text-slate-800">
                {isNew ? nc.nombre : clienteList.find(c => c.id === selCliente)?.nombre || '—'}
              </p>
            </div>
            <div className="space-y-2">
              <p className="text-[11px] font-semibold uppercase text-slate-400">Productos ({productos.length})</p>
              {productos.map((p, i) => (
                <div key={i} className="flex items-center justify-between rounded-lg border border-slate-200 p-3">
                  <div>
                    <p className="text-sm font-medium text-slate-800">{p.tipo}</p>
                    <p className="text-xs text-slate-500">{p.ancho}×{p.alto} cm · {p.tela} · {p.color}</p>
                  </div>
                  <span className="text-sm font-semibold text-slate-800">{fmt(p.precio)}</span>
                </div>
              ))}
            </div>
            <div className="flex justify-end border-t border-slate-100 pt-3">
              <p className="text-xl font-bold text-slate-900">Total: {fmt(total)}</p>
            </div>
          </div>
          <div className="mt-5 flex gap-3">
            <button onClick={() => setStep(2)}
              className="flex-1 rounded-lg border border-slate-300 py-2.5 text-sm font-medium text-slate-600 hover:bg-slate-50">
              Atrás
            </button>
            <button onClick={crear} disabled={creatingCli || creatingCot}
              className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-emerald-500 py-2.5 text-sm font-semibold text-white hover:bg-emerald-600 disabled:opacity-60">
              <CheckCircle size={17} /> {creatingCot ? 'Guardando...' : 'Crear Cotización'}
            </button>
          </div>
        </div>
      )}

      {showCatalogo && (
        <CatalogoPicker
          onSelect={handleCatalogoSelect}
          onClose={() => setShowCatalogo(false)}
        />
      )}
    </div>
  );
}

// ═══════════════════════════════════════
// DETALLE PEDIDO
// ═══════════════════════════════════════
export function PedidoDetalle() {
  const { id } = useParams();
  const nav = useNavigate();
  const numId = Number(id);

  const { data: orden, loading, error, refetch } = useApi(
    () => api.getOrder(numId),
    [numId]
  );
  const { execute: cambiarEstado, loading: changing } = useMutation(
    (estado: string) => api.changeEstado(numId, estado)
  );

  const doChange = useCallback(async (estado: string) => {
    const res = await cambiarEstado(estado);
    if (res) refetch();
  }, [cambiarEstado, refetch]);

  if (loading) return <Spinner />;
  if (error) return <ErrorMessage message={error} onRetry={refetch} />;
  if (!orden) return <div className="py-20 text-center text-slate-400">Pedido no encontrado</div>;

  const cfg = ESTADO_CONFIG[orden.estado as EstadoOrden] || ESTADO_CONFIG.cotizado;

  return (
    <div className="mx-auto max-w-2xl space-y-5">
      <button onClick={() => nav(-1)} className="flex items-center gap-1 text-sm font-medium text-slate-500 hover:text-slate-800">
        <ArrowLeft size={15} /> Volver
      </button>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">#{orden.numero}</h1>
          <p className="text-sm text-slate-500">{fmtDate(orden.created_at)}</p>
        </div>
        <span className={`rounded-full px-3 py-1 text-sm font-semibold ${cfg.bg} ${cfg.color}`}>{cfg.label}</span>
      </div>

      {orden.cliente_nombre && (
        <div className="rounded-xl border border-slate-200 bg-white p-5">
          <h2 className="mb-3 text-base font-semibold text-slate-900">Cliente</h2>
          <p className="text-sm font-medium text-slate-800">{orden.cliente_nombre}</p>
        </div>
      )}

      <div className="rounded-xl border border-slate-200 bg-white p-5">
        <h2 className="mb-3 text-base font-semibold text-slate-900">Productos</h2>
        <div className="space-y-2">
          {(orden.productos || []).map((p: any, i: number) => (
            <div key={p.id || i} className="rounded-lg border border-slate-200 p-3">
              <p className="text-sm font-medium text-slate-800">{i + 1}. {p.tipo}</p>
              <div className="mt-1 flex flex-wrap gap-3 text-xs text-slate-500">
                <span className="flex items-center gap-1"><Ruler size={12} />{p.ancho}×{p.alto} cm</span>
                <span className="flex items-center gap-1"><Palette size={12} />{p.tela} · {p.color}</span>
              </div>
            </div>
          ))}
        </div>
        <div className="mt-3 flex justify-end border-t border-slate-100 pt-3">
          <p className="text-base font-bold text-slate-900">Total: {fmt(orden.precio_total)}</p>
        </div>
      </div>

      {/* Acciones del vendedor */}
      {!['cerrada', 'cancelada', 'rechazada', 'cerrado', 'cancelado', 'rechazado'].includes(orden.estado) && (
        <div className="rounded-xl border border-slate-200 bg-white p-5">
          <h2 className="mb-3 text-base font-semibold text-slate-900">Acciones</h2>
          <div className="space-y-2">
            {['cotizacion', 'cotizado'].includes(orden.estado) && (
              <button onClick={() => doChange('cotizacion_enviada')} disabled={changing}
                className="w-full rounded-lg bg-sky-500 py-2.5 text-sm font-semibold text-white hover:bg-sky-600 disabled:opacity-60">
                Enviar Cotización al Cliente
              </button>
            )}
            {orden.estado === 'cotizacion_enviada' && (
              <button onClick={() => doChange('aceptada')} disabled={changing}
                className="w-full rounded-lg bg-blue-500 py-2.5 text-sm font-semibold text-white hover:bg-blue-600 disabled:opacity-60">
                Cliente Aceptó — Registrar
              </button>
            )}
            {orden.estado === 'aceptada' && (
              <button onClick={() => doChange('ot_creada')} disabled={changing}
                className="w-full rounded-lg bg-emerald-500 py-2.5 text-sm font-semibold text-white hover:bg-emerald-600 disabled:opacity-60">
                Crear Orden de Trabajo
              </button>
            )}
            {!['cotizacion', 'cotizado'].includes(orden.estado) && (
              <div className="rounded-lg bg-slate-50 p-3 text-center">
                <p className="text-xs text-slate-500">
                  {ESTADO_CONFIG[orden.estado]?.label || orden.estado} · El equipo interno gestiona el resto del flujo
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      <div className="rounded-xl border border-slate-200 bg-white p-5">
        <h2 className="mb-3 flex items-center gap-2 text-base font-semibold text-slate-900">
          <Clock size={16} /> Seguimiento
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
    </div>
  );
}

// ── Small Components ──
function TabBtn({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button onClick={onClick}
      className={`rounded-lg px-4 py-2 text-sm font-medium transition ${active ? 'bg-blue-100 text-blue-700' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'}`}>
      {children}
    </button>
  );
}

function Input({ label, value, onChange, type = 'text', placeholder }: {
  label: string; value: string; onChange: (v: string) => void; type?: string; placeholder?: string;
}) {
  return (
    <div>
      <label className="mb-1 block text-xs font-medium text-slate-600">{label}</label>
      <input type={type} value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder}
        className="w-full rounded-lg border border-slate-300 px-3 py-1.5 text-sm outline-none focus:border-slate-500" />
    </div>
  );
}

function Sel({ label, value, opts, onChange }: {
  label: string; value: string; opts: string[]; onChange: (v: string) => void;
}) {
  return (
    <div>
      <label className="mb-1 block text-xs font-medium text-slate-600">{label}</label>
      <select value={value} onChange={e => onChange(e.target.value)}
        className="w-full rounded-lg border border-slate-300 px-2 py-1.5 text-sm outline-none focus:border-slate-500">
        {opts.map(o => <option key={o} value={o}>{o}</option>)}
      </select>
    </div>
  );
}

// ═══════════════════════════════════════
// DETALLE COTIZACIÓN
// ═══════════════════════════════════════
export function DetalleCotizacion() {
  const { id } = useParams();
  const nav = useNavigate();

  const { data: cot, loading, error, refetch } = useApi(() => api.getCotizacion(id!), [id]);
  const { execute: patch, loading: patching } = useMutation(
    (data: any) => api.patchCotizacion(id!, data)
  );
  const { execute: convertir, loading: converting } = useMutation(
    () => api.convertirCotizacion(id!)
  );

  const [notas, setNotas] = useState('');
  const [editNotas, setEditNotas] = useState(false);

  // Sync notas cuando carga
  const cotData: any = cot;
  if (cotData && notas === '' && cotData.notas) {
    setNotas(cotData.notas || '');
  }

  const doAction = async (accion: string) => {
    let res;
    if (accion === 'enviar') {
      res = await patch({ estado: 'enviada' });
    } else if (accion === 'aceptar') {
      res = await patch({ estado: 'aceptada' });
    } else if (accion === 'rechazar') {
      res = await patch({ estado: 'rechazada' });
    } else if (accion === 'convertir') {
      res = await convertir();
      if (res) { nav(-1); return; }
    }
    if (res) refetch();
  };

  const guardarNotas = async () => {
    const res = await patch({ notas });
    if (res) { setEditNotas(false); refetch(); }
  };

  if (loading) return <Spinner />;
  if (error) return <ErrorMessage message={error} onRetry={refetch} />;
  if (!cotData) return <div className="py-20 text-center text-slate-400">Cotización no encontrada</div>;

  const cfg = COT_ESTADO_CFG[cotData.estado] || COT_ESTADO_CFG.borrador;
  const esBorrador  = cotData.estado === 'borrador';
  const esEnviada   = cotData.estado === 'enviada';
  const esAceptada  = cotData.estado === 'aceptada';
  const esCerrada   = ['convertida', 'rechazada'].includes(cotData.estado);

  return (
    <div className="mx-auto max-w-2xl space-y-5">
      <button onClick={() => nav(-1)}
        className="flex items-center gap-1 text-sm font-medium text-slate-500 hover:text-slate-800">
        <ArrowLeft size={15} /> Volver
      </button>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Cot. #{cotData.numero}</h1>
          <p className="text-sm text-slate-500">{fmtDate(cotData.created_at)}</p>
        </div>
        <span className={`rounded-full px-3 py-1 text-sm font-semibold ${cfg.bg} ${cfg.color}`}>{cfg.label}</span>
      </div>

      {/* Cliente */}
      {cotData.cliente_nombre && (
        <div className="rounded-xl border border-slate-200 bg-white p-5">
          <p className="text-[11px] font-semibold uppercase text-slate-400 mb-1">Cliente</p>
          <p className="text-sm font-semibold text-slate-800">{cotData.cliente_nombre}</p>
        </div>
      )}

      {/* Productos */}
      <div className="rounded-xl border border-slate-200 bg-white p-5">
        <h2 className="mb-3 text-base font-semibold text-slate-900">
          Productos ({cotData.productos?.length || 0})
        </h2>
        <div className="space-y-2">
          {(cotData.productos || []).map((p: any, i: number) => (
            <div key={i} className="rounded-lg border border-slate-100 p-3">
              <p className="text-sm font-medium text-slate-800">{i + 1}. {p.tipo || p.nombre}</p>
              <div className="mt-1 flex flex-wrap gap-3 text-xs text-slate-500">
                {p.ancho && <span><Ruler size={11} className="inline" /> {p.ancho}×{p.alto} cm</span>}
                {p.tela && <span><Palette size={11} className="inline" /> {p.tela} · {p.color}</span>}
              </div>
              <p className="mt-1 text-xs font-semibold text-slate-700">{fmt(p.precio || 0)}</p>
            </div>
          ))}
        </div>
        <div className="mt-3 flex justify-end border-t border-slate-100 pt-3">
          <p className="text-base font-bold text-slate-900">Total: {fmt(cotData.precio_total)}</p>
        </div>
      </div>

      {/* Notas */}
      <div className="rounded-xl border border-slate-200 bg-white p-5">
        <div className="mb-2 flex items-center justify-between">
          <h2 className="text-base font-semibold text-slate-900">Notas</h2>
          {esBorrador && !editNotas && (
            <button onClick={() => setEditNotas(true)}
              className="text-xs font-medium text-blue-600 hover:underline">Editar</button>
          )}
        </div>
        {editNotas ? (
          <div className="space-y-2">
            <textarea value={notas} onChange={e => setNotas(e.target.value)} rows={3}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-slate-500"
              placeholder="Condiciones especiales, descuentos, plazos..." />
            <div className="flex gap-2">
              <button onClick={() => setEditNotas(false)}
                className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50">
                Cancelar
              </button>
              <button onClick={guardarNotas} disabled={patching}
                className="rounded-lg bg-blue-500 px-3 py-1.5 text-xs font-semibold text-white hover:bg-blue-600 disabled:opacity-60">
                {patching ? 'Guardando...' : 'Guardar'}
              </button>
            </div>
          </div>
        ) : (
          <p className="text-sm text-slate-600">{cotData.notas || <span className="italic text-slate-400">Sin notas</span>}</p>
        )}
      </div>

      {/* Vencimiento */}
      {cotData.valid_until && (
        <div className="flex items-center gap-2 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          <Clock size={14} />
          Válida hasta: <span className="font-semibold">{fmtDate(cotData.valid_until)}</span>
        </div>
      )}

      {/* Acciones */}
      {!esCerrada && (
        <div className="rounded-xl border border-slate-200 bg-white p-5 space-y-3">
          <h2 className="text-base font-semibold text-slate-900">Acciones</h2>

          <Link to={`/vendedor/cotizacion/${id}/imprimir`}
            className="flex w-full items-center justify-center gap-2 rounded-lg border border-slate-200 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50">
            <Printer size={15} /> Ver / Imprimir PDF
          </Link>

          {esBorrador && (
            <button onClick={() => doAction('enviar')} disabled={patching}
              className="flex w-full items-center justify-center gap-2 rounded-lg bg-blue-500 py-2.5 text-sm font-semibold text-white hover:bg-blue-600 disabled:opacity-60">
              <Send size={15} /> Enviar Cotización al Cliente
            </button>
          )}

          {esEnviada && (
            <>
              <button onClick={() => doAction('aceptar')} disabled={patching}
                className="flex w-full items-center justify-center gap-2 rounded-lg bg-emerald-500 py-2.5 text-sm font-semibold text-white hover:bg-emerald-600 disabled:opacity-60">
                <CheckCircle2 size={15} /> Cliente Aceptó — Registrar
              </button>
              <button onClick={() => doAction('rechazar')} disabled={patching}
                className="flex w-full items-center justify-center gap-2 rounded-lg border border-red-200 bg-red-50 py-2.5 text-sm font-semibold text-red-700 hover:bg-red-100 disabled:opacity-60">
                <XCircle size={15} /> Cliente Rechazó
              </button>
            </>
          )}

          {esAceptada && (
            <button onClick={() => doAction('convertir')} disabled={converting}
              className="flex w-full items-center justify-center gap-2 rounded-lg bg-violet-500 py-2.5 text-sm font-semibold text-white hover:bg-violet-600 disabled:opacity-60">
              <ArrowRight size={15} /> {converting ? 'Creando OT...' : 'Convertir a Orden de Trabajo'}
            </button>
          )}
        </div>
      )}

      {/* Estado final */}
      {cotData.estado === 'convertida' && (
        <div className="rounded-xl border border-violet-200 bg-violet-50 px-4 py-4 text-center">
          <CheckCircle2 size={24} className="mx-auto text-violet-500 mb-2" />
          <p className="text-sm font-bold text-violet-800">Cotización Convertida a OT</p>
          {cotData.orden_id && (
            <Link to={`/vendedor/pedido/${cotData.orden_id}`}
              className="mt-2 inline-flex items-center gap-1 text-xs font-semibold text-violet-700 hover:underline">
              Ver Orden <ArrowRight size={12} />
            </Link>
          )}
        </div>
      )}

      {cotData.estado === 'rechazada' && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-center text-sm text-red-700">
          Cotización rechazada por el cliente.
        </div>
      )}
    </div>
  );
}
