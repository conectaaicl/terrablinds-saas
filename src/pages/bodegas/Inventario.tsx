import { useEffect, useState, useCallback } from 'react';
import {
  Package, Plus, Search, AlertTriangle, TrendingDown, TrendingUp,
  ArrowDown, ArrowUp, RefreshCw, X, Check,
  Loader2, Edit2, Trash2, History, BarChart3, Zap,
} from 'lucide-react';
import { api } from '../../services/api';

// ── Types ─────────────────────────────────────────────────────────────────────
interface Item {
  id: number; nombre: string; categoria: string; unidad: string;
  stock_actual: number; stock_minimo: number; precio_unitario?: number;
  proveedor?: string; codigo?: string; descripcion?: string;
  activo: boolean; bajo_minimo: boolean;
  created_at?: string; updated_at?: string;
}

interface Movimiento {
  id: number; item_id: number; tipo: string; cantidad: number;
  stock_antes: number; stock_despues: number; motivo?: string;
  order_id?: number; usuario_id?: number; notas?: string; created_at?: string;
}

const CATEGORIAS = [
  'telas', 'tubos', 'soportes', 'cadenas', 'motores', 'controles',
  'accesorios', 'tornilleria', 'pintura', 'general',
];

const UNIDADES = ['unidad', 'ml', 'm2', 'kg', 'm', 'rollo', 'litro', 'caja'];

const TIPOS_MOV = [
  { value: 'entrada', label: 'Entrada', color: 'text-emerald-600', icon: ArrowDown },
  { value: 'salida', label: 'Salida', color: 'text-red-600', icon: ArrowUp },
  { value: 'ajuste', label: 'Ajuste', color: 'text-blue-600', icon: Edit2 },
];

const CAT_COLORS: Record<string, string> = {
  telas: 'bg-violet-100 text-violet-700',
  tubos: 'bg-slate-100 text-slate-700',
  soportes: 'bg-amber-100 text-amber-700',
  cadenas: 'bg-orange-100 text-orange-700',
  motores: 'bg-blue-100 text-blue-700',
  controles: 'bg-cyan-100 text-cyan-700',
  accesorios: 'bg-pink-100 text-pink-700',
  tornilleria: 'bg-zinc-100 text-zinc-700',
  pintura: 'bg-indigo-100 text-indigo-700',
  general: 'bg-slate-100 text-slate-600',
};

const fmt = (n: number) => Number(n).toLocaleString('es-CL', { maximumFractionDigits: 3 });
const fmtDate = (s?: string) => s ? new Date(s).toLocaleDateString('es-CL') : '—';

// ── Modals ────────────────────────────────────────────────────────────────────

interface ItemModalProps {
  initial?: Partial<Item>;
  onSave: (data: Record<string, any>) => Promise<void>;
  onClose: () => void;
}

function ItemModal({ initial, onSave, onClose }: ItemModalProps) {
  const [form, setForm] = useState({
    nombre: initial?.nombre ?? '',
    categoria: initial?.categoria ?? 'general',
    unidad: initial?.unidad ?? 'unidad',
    stock_actual: String(initial?.stock_actual ?? '0'),
    stock_minimo: String(initial?.stock_minimo ?? '0'),
    precio_unitario: String(initial?.precio_unitario ?? ''),
    proveedor: initial?.proveedor ?? '',
    codigo: initial?.codigo ?? '',
    descripcion: initial?.descripcion ?? '',
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const set = (k: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
    setForm(p => ({ ...p, [k]: e.target.value }));

  const submit = async () => {
    if (!form.nombre.trim()) return setError('El nombre es requerido');
    setSaving(true);
    try {
      const payload: Record<string, any> = {
        nombre: form.nombre.trim(),
        categoria: form.categoria,
        unidad: form.unidad,
        stock_actual: parseFloat(form.stock_actual) || 0,
        stock_minimo: parseFloat(form.stock_minimo) || 0,
      };
      if (form.precio_unitario) payload.precio_unitario = parseFloat(form.precio_unitario);
      if (form.proveedor) payload.proveedor = form.proveedor;
      if (form.codigo) payload.codigo = form.codigo;
      if (form.descripcion) payload.descripcion = form.descripcion;
      await onSave(payload);
    } catch (e: any) {
      setError(e?.response?.data?.detail || 'Error al guardar');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-lg rounded-2xl bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
          <h3 className="font-bold text-slate-900">{initial?.id ? 'Editar Item' : 'Nuevo Item de Inventario'}</h3>
          <button onClick={onClose} className="rounded-lg p-1 hover:bg-slate-100"><X size={18} /></button>
        </div>
        <div className="grid gap-4 p-6 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <label className="mb-1 block text-xs font-semibold text-slate-600">Nombre *</label>
            <input value={form.nombre} onChange={set('nombre')} placeholder="Ej: Tela blackout 3 passes beige"
              className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:border-blue-400 focus:outline-none" />
          </div>
          <div>
            <label className="mb-1 block text-xs font-semibold text-slate-600">Categoría</label>
            <select value={form.categoria} onChange={set('categoria')}
              className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:border-blue-400 focus:outline-none">
              {CATEGORIAS.map(c => <option key={c} value={c}>{c.charAt(0).toUpperCase() + c.slice(1)}</option>)}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-xs font-semibold text-slate-600">Unidad</label>
            <select value={form.unidad} onChange={set('unidad')}
              className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:border-blue-400 focus:outline-none">
              {UNIDADES.map(u => <option key={u} value={u}>{u}</option>)}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-xs font-semibold text-slate-600">Stock Actual</label>
            <input type="number" value={form.stock_actual} onChange={set('stock_actual')} min="0" step="0.001"
              className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:border-blue-400 focus:outline-none" />
          </div>
          <div>
            <label className="mb-1 block text-xs font-semibold text-slate-600">Stock Mínimo</label>
            <input type="number" value={form.stock_minimo} onChange={set('stock_minimo')} min="0" step="0.001"
              className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:border-blue-400 focus:outline-none" />
          </div>
          <div>
            <label className="mb-1 block text-xs font-semibold text-slate-600">Precio Unitario ($)</label>
            <input type="number" value={form.precio_unitario} onChange={set('precio_unitario')} min="0"
              placeholder="Opcional"
              className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:border-blue-400 focus:outline-none" />
          </div>
          <div>
            <label className="mb-1 block text-xs font-semibold text-slate-600">Código</label>
            <input value={form.codigo} onChange={set('codigo')} placeholder="SKU / código interno"
              className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:border-blue-400 focus:outline-none" />
          </div>
          <div className="sm:col-span-2">
            <label className="mb-1 block text-xs font-semibold text-slate-600">Proveedor</label>
            <input value={form.proveedor} onChange={set('proveedor')} placeholder="Nombre del proveedor"
              className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:border-blue-400 focus:outline-none" />
          </div>
          <div className="sm:col-span-2">
            <label className="mb-1 block text-xs font-semibold text-slate-600">Descripción</label>
            <textarea value={form.descripcion} onChange={set('descripcion')} rows={2}
              className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:border-blue-400 focus:outline-none resize-none" />
          </div>
        </div>
        {error && <p className="px-6 pb-3 text-xs text-red-600">{error}</p>}
        <div className="flex justify-end gap-3 border-t border-slate-100 px-6 py-4">
          <button onClick={onClose}
            className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50">
            Cancelar
          </button>
          <button onClick={submit} disabled={saving}
            className="flex items-center gap-2 rounded-xl bg-blue-600 px-5 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-60">
            {saving && <Loader2 size={14} className="animate-spin" />}
            <Check size={14} /> Guardar
          </button>
        </div>
      </div>
    </div>
  );
}

interface MovimientoModalProps {
  item: Item;
  onSave: (data: Record<string, any>) => Promise<void>;
  onClose: () => void;
}

function MovimientoModal({ item, onSave, onClose }: MovimientoModalProps) {
  const [tipo, setTipo] = useState('entrada');
  const [cantidad, setCantidad] = useState('');
  const [motivo, setMotivo] = useState('');
  const [notas, setNotas] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const submit = async () => {
    const qty = parseFloat(cantidad);
    if (!qty || qty <= 0) return setError('Ingresa una cantidad válida');
    setSaving(true);
    try {
      await onSave({ item_id: item.id, tipo, cantidad: qty, motivo: motivo || undefined, notas: notas || undefined });
    } catch (e: any) {
      setError(e?.response?.data?.detail || 'Error al registrar');
    } finally {
      setSaving(false);
    }
  };

  const preview = () => {
    const qty = parseFloat(cantidad) || 0;
    const stock = Number(item.stock_actual);
    if (tipo === 'entrada') return stock + qty;
    if (tipo === 'salida') return stock - qty;
    return qty; // ajuste
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-md rounded-2xl bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
          <div>
            <h3 className="font-bold text-slate-900">Registrar Movimiento</h3>
            <p className="text-xs text-slate-500">{item.nombre}</p>
          </div>
          <button onClick={onClose} className="rounded-lg p-1 hover:bg-slate-100"><X size={18} /></button>
        </div>
        <div className="space-y-4 p-6">
          {/* Tipo */}
          <div>
            <label className="mb-2 block text-xs font-semibold text-slate-600">Tipo de Movimiento</label>
            <div className="flex gap-2">
              {TIPOS_MOV.map(t => (
                <button key={t.value} onClick={() => setTipo(t.value)}
                  className={`flex-1 flex items-center justify-center gap-1.5 rounded-xl border py-2.5 text-sm font-semibold transition-colors ${
                    tipo === t.value
                      ? 'border-blue-500 bg-blue-50 text-blue-700'
                      : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                  }`}>
                  <t.icon size={14} /> {t.label}
                </button>
              ))}
            </div>
          </div>

          {/* Cantidad */}
          <div>
            <label className="mb-1 block text-xs font-semibold text-slate-600">
              Cantidad ({item.unidad})
              {tipo === 'ajuste' && <span className="font-normal text-slate-400 ml-1">— nuevo stock total</span>}
            </label>
            <input type="number" value={cantidad} onChange={e => setCantidad(e.target.value)}
              min="0" step="0.001" placeholder="0.000"
              className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:border-blue-400 focus:outline-none" />
          </div>

          {/* Stock preview */}
          <div className="flex items-center justify-between rounded-xl bg-slate-50 px-4 py-3">
            <div className="text-xs text-slate-500">Stock actual <span className="font-semibold text-slate-800">{fmt(item.stock_actual)}</span></div>
            <div className="text-xs font-semibold text-slate-400">→</div>
            <div className="text-xs text-slate-500">Nuevo <span className={`font-semibold ${preview() < 0 ? 'text-red-600' : 'text-emerald-700'}`}>{fmt(preview())}</span> {item.unidad}</div>
          </div>

          <div>
            <label className="mb-1 block text-xs font-semibold text-slate-600">Motivo</label>
            <input value={motivo} onChange={e => setMotivo(e.target.value)}
              placeholder="compra, merma, ajuste de inventario..."
              className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:border-blue-400 focus:outline-none" />
          </div>
          <div>
            <label className="mb-1 block text-xs font-semibold text-slate-600">Notas</label>
            <input value={notas} onChange={e => setNotas(e.target.value)}
              placeholder="Opcional"
              className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:border-blue-400 focus:outline-none" />
          </div>
        </div>
        {error && <p className="px-6 pb-3 text-xs text-red-600">{error}</p>}
        <div className="flex justify-end gap-3 border-t border-slate-100 px-6 py-4">
          <button onClick={onClose}
            className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50">
            Cancelar
          </button>
          <button onClick={submit} disabled={saving}
            className="flex items-center gap-2 rounded-xl bg-blue-600 px-5 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-60">
            {saving && <Loader2 size={14} className="animate-spin" />}
            <Check size={14} /> Registrar
          </button>
        </div>
      </div>
    </div>
  );
}

// ── History drawer ────────────────────────────────────────────────────────────

function HistoryDrawer({ item, onClose }: { item: Item; onClose: () => void }) {
  const [movimientos, setMovimientos] = useState<Movimiento[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.getInventarioMovimientos(item.id)
      .then(d => setMovimientos(d || []))
      .finally(() => setLoading(false));
  }, [item.id]);

  const tipoConfig = {
    entrada: { label: 'Entrada', color: 'text-emerald-700', bg: 'bg-emerald-50', icon: ArrowDown },
    salida: { label: 'Salida', color: 'text-red-700', bg: 'bg-red-50', icon: ArrowUp },
    ajuste: { label: 'Ajuste', color: 'text-blue-700', bg: 'bg-blue-50', icon: Edit2 },
    consumo: { label: 'Consumo', color: 'text-orange-700', bg: 'bg-orange-50', icon: TrendingDown },
  } as Record<string, any>;

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/30" onClick={onClose}>
      <div className="h-full w-full max-w-md overflow-y-auto bg-white shadow-2xl" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
          <div>
            <h3 className="font-bold text-slate-900">Historial de Movimientos</h3>
            <p className="text-xs text-slate-500">{item.nombre}</p>
          </div>
          <button onClick={onClose} className="rounded-lg p-1 hover:bg-slate-100"><X size={18} /></button>
        </div>

        {loading ? (
          <div className="flex justify-center py-12"><Loader2 size={24} className="animate-spin text-slate-400" /></div>
        ) : movimientos.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-slate-400">
            <History size={32} className="mb-2 opacity-40" />
            <p className="text-sm">Sin movimientos registrados</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-50">
            {movimientos.map(m => {
              const cfg = tipoConfig[m.tipo] || tipoConfig.ajuste;
              return (
                <div key={m.id} className="flex items-start gap-3 px-5 py-4">
                  <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-xl ${cfg.bg}`}>
                    <cfg.icon size={14} className={cfg.color} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className={`text-xs font-bold ${cfg.color}`}>{cfg.label}</span>
                      <span className="text-sm font-semibold text-slate-800">
                        {m.tipo === 'salida' || m.tipo === 'consumo' ? '-' : '+'}{fmt(m.cantidad)} {item.unidad}
                      </span>
                    </div>
                    {m.motivo && <p className="text-xs text-slate-500">{m.motivo}</p>}
                    {m.notas && <p className="text-xs text-slate-400">{m.notas}</p>}
                    <p className="text-[10px] text-slate-400 mt-0.5">{fmtDate(m.created_at)} · Stock: {fmt(m.stock_antes)} → {fmt(m.stock_despues)}</p>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function Inventario() {
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filtCat, setFiltCat] = useState('');
  const [filtAlerta, setFiltAlerta] = useState(false);
  const [showItemModal, setShowItemModal] = useState<'new' | Item | null>(null);
  const [showMovModal, setShowMovModal] = useState<Item | null>(null);
  const [showHistory, setShowHistory] = useState<Item | null>(null);

  const load = useCallback(() => {
    setLoading(true);
    api.getInventarioItems()
      .then(d => setItems(d || []))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { load(); }, [load]);

  const filtered = items.filter(item => {
    if (filtAlerta && !item.bajo_minimo) return false;
    if (filtCat && item.categoria !== filtCat) return false;
    if (search) {
      const q = search.toLowerCase();
      return item.nombre.toLowerCase().includes(q) ||
        (item.codigo || '').toLowerCase().includes(q) ||
        (item.proveedor || '').toLowerCase().includes(q);
    }
    return true;
  });

  const alertas = items.filter(i => i.bajo_minimo);

  const handleCreateItem = async (data: Record<string, any>) => {
    await api.createInventarioItem(data as any);
    setShowItemModal(null);
    load();
  };

  const handleUpdateItem = async (id: number, data: Record<string, any>) => {
    await api.updateInventarioItem(id, data);
    setShowItemModal(null);
    load();
  };

  const handleDeleteItem = async (item: Item) => {
    if (!confirm(`¿Eliminar "${item.nombre}"? Esta acción es irreversible.`)) return;
    await api.deleteInventarioItem(item.id);
    load();
  };

  const handleMovimiento = async (data: Record<string, any>) => {
    await api.createMovimiento(data as any);
    setShowMovModal(null);
    load();
  };

  const totalItems = items.length;
  const valorTotal = items.reduce((acc, i) => acc + (Number(i.precio_unitario) || 0) * Number(i.stock_actual), 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Inventario del Taller</h1>
          <p className="text-sm text-slate-500">{totalItems} items · Valor estimado ${valorTotal.toLocaleString('es-CL')}</p>
        </div>
        <div className="flex gap-2">
          <button onClick={load}
            className="flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-600 hover:bg-slate-50">
            <RefreshCw size={13} /> Actualizar
          </button>
          <button onClick={() => setShowItemModal('new')}
            className="flex items-center gap-1.5 rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700">
            <Plus size={15} /> Nuevo Item
          </button>
        </div>
      </div>

      {/* Alert banner */}
      {alertas.length > 0 && (
        <div className="flex items-center gap-3 rounded-2xl bg-gradient-to-r from-amber-500 to-orange-500 px-5 py-3.5 text-white shadow-lg shadow-amber-500/20">
          <Zap size={18} className="shrink-0" />
          <div className="flex-1">
            <p className="font-bold text-sm">{alertas.length} item(s) bajo stock mínimo</p>
            <p className="text-xs text-amber-100">{alertas.map(a => a.nombre).slice(0, 3).join(', ')}{alertas.length > 3 ? ` y ${alertas.length - 3} más` : ''}</p>
          </div>
          <button onClick={() => setFiltAlerta(v => !v)}
            className="flex items-center gap-1 rounded-lg bg-white/20 px-3 py-1.5 text-xs font-semibold hover:bg-white/30 transition-colors">
            {filtAlerta ? 'Ver todos' : 'Filtrar'}
          </button>
        </div>
      )}

      {/* KPIs */}
      <div className="grid gap-4 sm:grid-cols-3">
        {[
          { label: 'Total Items', value: totalItems, sub: 'en inventario', gradient: 'from-blue-500 to-blue-600', icon: Package },
          { label: 'Bajo Mínimo', value: alertas.length, sub: 'requieren reposición', gradient: alertas.length > 0 ? 'from-amber-500 to-orange-500' : 'from-slate-400 to-slate-500', icon: AlertTriangle },
          { label: 'Categorías', value: new Set(items.map(i => i.categoria)).size, sub: 'tipos de material', gradient: 'from-violet-500 to-violet-600', icon: BarChart3 },
        ].map(card => (
          <div key={card.label}
            className={`relative overflow-hidden rounded-2xl bg-gradient-to-br ${card.gradient} p-5 text-white shadow-sm`}>
            <div className="absolute -right-4 -top-4 h-20 w-20 rounded-full bg-white/10" />
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
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <div className="flex flex-1 min-w-48 items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2">
          <Search size={15} className="shrink-0 text-slate-400" />
          <input value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Buscar por nombre, código, proveedor..."
            className="flex-1 bg-transparent text-sm outline-none placeholder:text-slate-400" />
          {search && <button onClick={() => setSearch('')}><X size={14} className="text-slate-400 hover:text-slate-600" /></button>}
        </div>
        <select value={filtCat} onChange={e => setFiltCat(e.target.value)}
          className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 focus:outline-none">
          <option value="">Todas las categorías</option>
          {CATEGORIAS.map(c => <option key={c} value={c}>{c.charAt(0).toUpperCase() + c.slice(1)}</option>)}
        </select>
        <button onClick={() => setFiltAlerta(v => !v)}
          className={`flex items-center gap-2 rounded-xl border px-3 py-2 text-sm font-medium transition-colors ${
            filtAlerta ? 'border-amber-400 bg-amber-50 text-amber-700' : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
          }`}>
          <AlertTriangle size={14} /> Solo alertas
        </button>
      </div>

      {/* Table */}
      {loading ? (
        <div className="flex justify-center py-16"><Loader2 size={24} className="animate-spin text-slate-400" /></div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-slate-200 py-16 text-slate-400">
          <Package size={36} className="mb-3 opacity-30" />
          <p className="text-sm font-medium">{items.length === 0 ? 'Sin items en inventario' : 'Sin resultados'}</p>
          {items.length === 0 && (
            <button onClick={() => setShowItemModal('new')}
              className="mt-4 flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700">
              <Plus size={14} /> Agregar primer item
            </button>
          )}
        </div>
      ) : (
        <div className="rounded-2xl border border-slate-100 bg-white shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50">
                  <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wide text-slate-500">Item</th>
                  <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wide text-slate-500">Categoría</th>
                  <th className="px-4 py-3 text-right text-xs font-bold uppercase tracking-wide text-slate-500">Stock</th>
                  <th className="px-4 py-3 text-right text-xs font-bold uppercase tracking-wide text-slate-500">Mínimo</th>
                  <th className="px-4 py-3 text-right text-xs font-bold uppercase tracking-wide text-slate-500">Precio Unit.</th>
                  <th className="px-4 py-3 text-right text-xs font-bold uppercase tracking-wide text-slate-500">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {filtered.map(item => (
                  <tr key={item.id} className={`hover:bg-slate-50 transition-colors ${item.bajo_minimo ? 'bg-amber-50/50' : ''}`}>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        {item.bajo_minimo && <AlertTriangle size={13} className="shrink-0 text-amber-500" />}
                        <div>
                          <p className="font-semibold text-slate-900">{item.nombre}</p>
                          {item.codigo && <p className="text-[10px] text-slate-400">{item.codigo}</p>}
                          {item.proveedor && <p className="text-[10px] text-slate-400">{item.proveedor}</p>}
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${CAT_COLORS[item.categoria] || 'bg-slate-100 text-slate-600'}`}>
                        {item.categoria}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <span className={`font-bold ${item.bajo_minimo ? 'text-amber-600' : 'text-slate-900'}`}>
                        {fmt(item.stock_actual)}
                      </span>
                      <span className="ml-1 text-xs text-slate-400">{item.unidad}</span>
                    </td>
                    <td className="px-4 py-3 text-right text-slate-500 text-xs">
                      {fmt(item.stock_minimo)} {item.unidad}
                    </td>
                    <td className="px-4 py-3 text-right text-xs text-slate-600">
                      {item.precio_unitario ? `$${Number(item.precio_unitario).toLocaleString('es-CL')}` : '—'}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button title="Ver historial" onClick={() => setShowHistory(item)}
                          className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition-colors">
                          <History size={14} />
                        </button>
                        <button title="Registrar movimiento" onClick={() => setShowMovModal(item)}
                          className="rounded-lg p-1.5 text-slate-400 hover:bg-blue-50 hover:text-blue-600 transition-colors">
                          <TrendingUp size={14} />
                        </button>
                        <button title="Editar" onClick={() => setShowItemModal(item)}
                          className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition-colors">
                          <Edit2 size={14} />
                        </button>
                        <button title="Eliminar" onClick={() => handleDeleteItem(item)}
                          className="rounded-lg p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-600 transition-colors">
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Modals */}
      {showItemModal !== null && (
        <ItemModal
          initial={showItemModal === 'new' ? undefined : showItemModal}
          onSave={showItemModal === 'new'
            ? handleCreateItem
            : (data) => handleUpdateItem((showItemModal as Item).id, data)
          }
          onClose={() => setShowItemModal(null)}
        />
      )}
      {showMovModal && (
        <MovimientoModal
          item={showMovModal}
          onSave={handleMovimiento}
          onClose={() => setShowMovModal(null)}
        />
      )}
      {showHistory && (
        <HistoryDrawer item={showHistory} onClose={() => setShowHistory(null)} />
      )}
    </div>
  );
}
