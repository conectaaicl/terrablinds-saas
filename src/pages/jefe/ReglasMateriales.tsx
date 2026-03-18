import { useState, useCallback, useEffect } from 'react';
import {
  Plus, Trash2, RefreshCw, X, Check, Loader2,
  Settings, Package, ChevronDown, AlertTriangle,
} from 'lucide-react';
import { api } from '../../services/api';
import { TIPOS_PRODUCTO } from '../../types';

interface InventarioItem {
  id: number; nombre: string; unidad: string; categoria: string; stock_actual: number;
}

interface Regla {
  id: number; tenant_id: string; tipo_producto: string; item_id?: number;
  nombre_componente: string; formula: string; factor: number;
  cantidad_fija?: number; notas?: string; item_nombre?: string;
}

interface CalculoLinea {
  nombre_componente: string; item_nombre?: string; unidad?: string;
  cantidad_calculada: number; stock_disponible?: number; suficiente: boolean;
}

interface Calculo {
  tipo_producto: string; ancho_cm: number; alto_cm: number;
  lineas: CalculoLinea[]; puede_producir: boolean;
}

const FORMULAS = [
  { value: 'm2', label: 'm² (área)', desc: 'ancho×alto en m²' },
  { value: 'ml', label: 'ml (longitud)', desc: 'ancho en metros' },
  { value: 'ancho', label: 'Ancho (m)', desc: 'solo ancho en metros' },
  { value: 'alto', label: 'Alto (m)', desc: 'solo alto en metros' },
  { value: 'unidad_fija', label: 'Unidad fija', desc: 'cantidad fija por producto' },
];

// ── Modal nueva regla ────────────────────────────────────────────────────────

function ReglaModal({
  items, tipoProducto, onSave, onClose,
}: {
  items: InventarioItem[];
  tipoProducto: string;
  onSave: (data: Record<string, any>) => Promise<void>;
  onClose: () => void;
}) {
  const [form, setForm] = useState({
    tipo_producto: tipoProducto,
    nombre_componente: '',
    item_id: '',
    formula: 'm2',
    factor: '1.0',
    cantidad_fija: '',
    notas: '',
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const set = (k: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
    setForm(p => ({ ...p, [k]: e.target.value }));

  const submit = async () => {
    if (!form.nombre_componente.trim()) return setError('El nombre del componente es requerido');
    if (!form.tipo_producto) return setError('Selecciona el tipo de producto');
    setSaving(true);
    try {
      const payload: Record<string, any> = {
        tipo_producto: form.tipo_producto,
        nombre_componente: form.nombre_componente.trim(),
        formula: form.formula,
        factor: parseFloat(form.factor) || 1,
      };
      if (form.item_id) payload.item_id = parseInt(form.item_id);
      if (form.formula === 'unidad_fija' && form.cantidad_fija) payload.cantidad_fija = parseFloat(form.cantidad_fija);
      if (form.notas) payload.notas = form.notas;
      await onSave(payload);
    } catch (e: any) {
      setError(e?.message || 'Error al guardar');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-lg rounded-2xl bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
          <h3 className="font-bold text-slate-900">Nueva Regla de Material</h3>
          <button onClick={onClose} className="rounded-lg p-1 hover:bg-slate-100"><X size={18} /></button>
        </div>
        <div className="grid gap-4 p-6 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <label className="mb-1 block text-xs font-semibold text-slate-600">Tipo de Producto *</label>
            <select value={form.tipo_producto} onChange={set('tipo_producto')}
              className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:border-blue-400 focus:outline-none">
              <option value="">— Seleccionar —</option>
              {TIPOS_PRODUCTO.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
          <div className="sm:col-span-2">
            <label className="mb-1 block text-xs font-semibold text-slate-600">Nombre del Componente *</label>
            <input value={form.nombre_componente} onChange={set('nombre_componente')}
              placeholder="Ej: Tela principal, Tubo guía, Motor"
              className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:border-blue-400 focus:outline-none" />
          </div>
          <div className="sm:col-span-2">
            <label className="mb-1 block text-xs font-semibold text-slate-600">Item de Inventario (opcional)</label>
            <select value={form.item_id} onChange={set('item_id')}
              className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:border-blue-400 focus:outline-none">
              <option value="">— Sin vincular al inventario —</option>
              {items.map(i => <option key={i.id} value={i.id}>{i.nombre} ({i.unidad})</option>)}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-xs font-semibold text-slate-600">Fórmula</label>
            <select value={form.formula} onChange={set('formula')}
              className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:border-blue-400 focus:outline-none">
              {FORMULAS.map(f => <option key={f.value} value={f.value}>{f.label}</option>)}
            </select>
            <p className="mt-1 text-[10px] text-slate-400">{FORMULAS.find(f => f.value === form.formula)?.desc}</p>
          </div>
          <div>
            <label className="mb-1 block text-xs font-semibold text-slate-600">
              Factor {form.formula === 'unidad_fija' ? '(multiplicador)' : '(multiplicador)'}
            </label>
            <input type="number" value={form.factor} onChange={set('factor')} step="0.01" min="0"
              className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:border-blue-400 focus:outline-none" />
          </div>
          {form.formula === 'unidad_fija' && (
            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-600">Cantidad Fija Base</label>
              <input type="number" value={form.cantidad_fija} onChange={set('cantidad_fija')} step="0.001" min="0"
                placeholder="1"
                className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:border-blue-400 focus:outline-none" />
            </div>
          )}
          <div className="sm:col-span-2">
            <label className="mb-1 block text-xs font-semibold text-slate-600">Notas</label>
            <input value={form.notas} onChange={set('notas')} placeholder="Opcional"
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
            <Check size={14} /> Guardar Regla
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Simulador de cálculo ─────────────────────────────────────────────────────

function Simulador({ items }: { items: InventarioItem[] }) {
  const [tipo, setTipo] = useState(TIPOS_PRODUCTO[0]);
  const [ancho, setAncho] = useState('150');
  const [alto, setAlto] = useState('180');
  const [calculo, setCalculo] = useState<Calculo | null>(null);
  const [loading, setLoading] = useState(false);

  const calcular = async () => {
    setLoading(true);
    try {
      const res = await api.calcularMateriales(tipo, parseFloat(ancho), parseFloat(alto));
      setCalculo(res);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="rounded-2xl border border-slate-100 bg-white shadow-sm p-5">
      <h2 className="mb-4 font-bold text-slate-900">Simulador de Materiales</h2>
      <div className="flex flex-wrap gap-3 mb-4">
        <select value={tipo} onChange={e => setTipo(e.target.value)}
          className="flex-1 min-w-36 rounded-xl border border-slate-200 px-3 py-2 text-sm focus:outline-none">
          {TIPOS_PRODUCTO.map(t => <option key={t} value={t}>{t}</option>)}
        </select>
        <div className="flex items-center gap-2">
          <input type="number" value={ancho} onChange={e => setAncho(e.target.value)} placeholder="Ancho"
            className="w-24 rounded-xl border border-slate-200 px-3 py-2 text-sm focus:outline-none" />
          <span className="text-xs text-slate-400">×</span>
          <input type="number" value={alto} onChange={e => setAlto(e.target.value)} placeholder="Alto"
            className="w-24 rounded-xl border border-slate-200 px-3 py-2 text-sm focus:outline-none" />
          <span className="text-xs text-slate-400">cm</span>
        </div>
        <button onClick={calcular} disabled={loading}
          className="flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-60">
          {loading ? <Loader2 size={14} className="animate-spin" /> : <Settings size={14} />}
          Calcular
        </button>
      </div>

      {calculo && (
        <div className="space-y-2">
          <div className={`flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-semibold ${
            calculo.puede_producir ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700'
          }`}>
            {calculo.puede_producir ? <Check size={14} /> : <AlertTriangle size={14} />}
            {calculo.puede_producir ? 'Stock suficiente para producir' : 'Stock insuficiente en algunos materiales'}
          </div>
          {calculo.lineas.length === 0 ? (
            <p className="text-sm text-slate-400 text-center py-3">Sin reglas configuradas para este tipo de producto</p>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="text-xs text-slate-500 border-b border-slate-100">
                  <th className="pb-2 text-left">Componente</th>
                  <th className="pb-2 text-right">Necesario</th>
                  <th className="pb-2 text-right">Disponible</th>
                  <th className="pb-2 text-center">Estado</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {calculo.lineas.map((l, i) => (
                  <tr key={i}>
                    <td className="py-2">
                      <p className="font-medium text-slate-800">{l.nombre_componente}</p>
                      {l.item_nombre && <p className="text-[10px] text-slate-400">{l.item_nombre}</p>}
                    </td>
                    <td className="py-2 text-right font-semibold text-slate-900">
                      {Number(l.cantidad_calculada).toFixed(3)} {l.unidad || ''}
                    </td>
                    <td className="py-2 text-right text-slate-500">
                      {l.stock_disponible != null ? `${Number(l.stock_disponible).toFixed(3)} ${l.unidad || ''}` : '—'}
                    </td>
                    <td className="py-2 text-center">
                      {l.stock_disponible != null ? (
                        l.suficiente
                          ? <span className="text-[10px] font-bold text-emerald-600">OK</span>
                          : <span className="text-[10px] font-bold text-red-600">BAJO</span>
                      ) : (
                        <span className="text-[10px] text-slate-400">—</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function ReglasMateriales() {
  const [reglas, setReglas] = useState<Regla[]>([]);
  const [items, setItems] = useState<InventarioItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [filterTipo, setFilterTipo] = useState('');

  const load = useCallback(() => {
    setLoading(true);
    Promise.all([
      api.getReglasMateriales().catch(() => []),
      api.getInventarioItems().catch(() => []),
    ]).then(([r, i]) => {
      setReglas(r || []);
      setItems(i || []);
    }).finally(() => setLoading(false));
  }, []);

  useEffect(() => { load(); }, [load]);

  const filtered = reglas.filter(r => !filterTipo || r.tipo_producto === filterTipo);

  const handleCreate = async (data: Record<string, any>) => {
    await api.createReglaMaterial(data);
    setShowModal(false);
    load();
  };

  const handleDelete = async (id: number) => {
    if (!confirm('¿Eliminar esta regla?')) return;
    await api.deleteReglaMaterial(id);
    load();
  };

  // Group by tipo_producto
  const byTipo: Record<string, Regla[]> = {};
  filtered.forEach(r => {
    if (!byTipo[r.tipo_producto]) byTipo[r.tipo_producto] = [];
    byTipo[r.tipo_producto].push(r);
  });

  const formulaLabel = (f: string) => FORMULAS.find(x => x.value === f)?.label || f;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Reglas de Materiales</h1>
          <p className="text-sm text-slate-500">
            Define qué materiales consume cada tipo de producto al fabricarse
          </p>
        </div>
        <div className="flex gap-2">
          <button onClick={load}
            className="flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-600 hover:bg-slate-50">
            <RefreshCw size={13} /> Actualizar
          </button>
          <button onClick={() => setShowModal(true)}
            className="flex items-center gap-1.5 rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700">
            <Plus size={15} /> Nueva Regla
          </button>
        </div>
      </div>

      {/* Info banner */}
      <div className="rounded-2xl border border-blue-100 bg-blue-50 px-5 py-4 text-sm text-blue-700">
        <p className="font-semibold mb-0.5">¿Cómo funciona?</p>
        <p className="text-blue-600 text-xs">
          Cuando el fabricante inicia una OT, el sistema calcula automáticamente los materiales necesarios
          usando estas reglas y los descuenta del inventario. Ejemplo: "Roller Blackout" consume 1.1 m² de tela
          por cada m² del producto.
        </p>
      </div>

      {/* Filter */}
      <div className="flex gap-3">
        <select value={filterTipo} onChange={e => setFilterTipo(e.target.value)}
          className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm focus:outline-none">
          <option value="">Todos los tipos de producto</option>
          {TIPOS_PRODUCTO.map(t => <option key={t} value={t}>{t}</option>)}
        </select>
      </div>

      {/* Rules grouped by product type */}
      {loading ? (
        <div className="flex justify-center py-16"><Loader2 size={24} className="animate-spin text-slate-400" /></div>
      ) : Object.keys(byTipo).length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-slate-200 py-16 text-slate-400">
          <Settings size={36} className="mb-3 opacity-30" />
          <p className="text-sm font-medium">Sin reglas configuradas</p>
          <button onClick={() => setShowModal(true)}
            className="mt-4 flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700">
            <Plus size={14} /> Crear primera regla
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {Object.entries(byTipo).map(([tipo, tipoReglas]) => (
            <div key={tipo} className="rounded-2xl border border-slate-100 bg-white shadow-sm overflow-hidden">
              <div className="flex items-center gap-3 border-b border-slate-100 bg-slate-50 px-5 py-3">
                <Package size={15} className="text-slate-500" />
                <h3 className="font-bold text-slate-800">{tipo}</h3>
                <span className="ml-auto rounded-full bg-slate-200 px-2 py-0.5 text-[10px] font-bold text-slate-600">
                  {tipoReglas.length} regla{tipoReglas.length !== 1 ? 's' : ''}
                </span>
              </div>
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-50 text-xs text-slate-400">
                    <th className="px-5 py-2 text-left">Componente</th>
                    <th className="px-4 py-2 text-left">Item Inventario</th>
                    <th className="px-4 py-2 text-left">Fórmula</th>
                    <th className="px-4 py-2 text-right">Factor</th>
                    <th className="px-4 py-2 text-right">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {tipoReglas.map(r => (
                    <tr key={r.id} className="hover:bg-slate-50">
                      <td className="px-5 py-3 font-medium text-slate-800">{r.nombre_componente}</td>
                      <td className="px-4 py-3 text-slate-500 text-xs">
                        {r.item_nombre || <span className="italic text-slate-300">sin vincular</span>}
                      </td>
                      <td className="px-4 py-3">
                        <span className="rounded-full bg-blue-50 px-2 py-0.5 text-[10px] font-bold text-blue-700">
                          {formulaLabel(r.formula)}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right font-semibold text-slate-700">
                        ×{r.factor}
                        {r.cantidad_fija != null && (
                          <span className="ml-1 text-[10px] text-slate-400">base {r.cantidad_fija}</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <button onClick={() => handleDelete(r.id)}
                          className="rounded-lg p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-600 transition-colors">
                          <Trash2 size={14} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ))}
        </div>
      )}

      {/* Simulador */}
      <Simulador items={items} />

      {/* Modal */}
      {showModal && (
        <ReglaModal
          items={items}
          tipoProducto={filterTipo || TIPOS_PRODUCTO[0]}
          onSave={handleCreate}
          onClose={() => setShowModal(false)}
        />
      )}
    </div>
  );
}
