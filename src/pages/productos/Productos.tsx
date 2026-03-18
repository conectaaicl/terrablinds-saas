/**
 * Catálogo de Productos Premium — con calculadora m²/ml, búsqueda por proveedor,
 * 500+ productos y quick-add a cotización.
 */
import { useState, useMemo, useCallback } from 'react';
import { useApi } from '../../hooks/useApi';
import { useMutation } from '../../hooks/useMutation';
import { api } from '../../services/api';
import type { Producto } from '../../types';
import {
  Package, Plus, X, Edit3, Trash2, Check, Search, Calculator,
  SlidersHorizontal, RefreshCw, ShoppingCart, ChevronDown, LayoutGrid, List
} from 'lucide-react';

const CATEGORIAS = [
  'Cortina Roller','Cortina Zebra / Duo','Cortina Blackout','Cortina Sunscreen','Cortina Screen',
  'Persiana Veneciana','Persiana Enrollable','Persiana Madera','Persiana Exterior',
  'Toldo Retráctil','Toldo Vertical','Toldo Brazo','Cierre Terraza Cristal','Cierre Terraza PVC',
  'Cortina de Tela','Motorización','Accesorio / Herraje','Insumo / Material','Mueble a Medida','Otro',
];
const PROVEEDORES = [
  'Hunter Douglas','Bandalux','Silent Gliss','Rollease Acmeda','Coulisse','Luxaflex',
  'Deco-Tec','Lienzo Telas','Somfy','Motores BRT','TecnoMotor','Distribuidora Sur',
  'Textiles Norte','Proveedor Local','Otro',
];
const UNIDADES = ['m2','ml','unidad'];
const COLORES_SUGERIDOS = ['Blanco','Blanco Perla','Gris','Gris Platino','Gris Humo','Beige','Beige Arena','Negro','Crema','Lino','Carbón','Terracota','Café'];
const MATERIALES_SUGERIDOS = ['Blackout 100%','Screen 3%','Screen 5%','Screen 10%','Sunscreen','Zebra','Acrílica','PVC reforzado','Lino natural','Terciopelo','Aluminio 25mm','Aluminio 50mm','Madera 25mm'];

const fmt = (n: number) => '$' + n.toLocaleString('es-CL');

// ─── Calculadora de Precio ───────────────────────────────────────────────────
interface CalcProps {
  producto: Producto
  onAddToCot?: (item: { producto: Producto; alto: number; ancho: number; cantidad: number; total: number; unidad: string }) => void
}

function CalculadoraModal({ producto, onClose, onAdd }: { producto: Producto; onClose: () => void; onAdd?: CalcProps['onAddToCot'] }) {
  const [alto, setAlto] = useState(1.5);
  const [ancho, setAncho] = useState(1.2);
  const [cantidad, setCantidad] = useState(1);

  const precioUnit = producto.unidad === 'm2'
    ? (producto.precio_m2 || producto.precio_base)
    : producto.unidad === 'ml'
    ? (producto.precio_ml || producto.precio_base)
    : producto.precio_base;

  const medida = producto.unidad === 'm2' ? +(alto * ancho).toFixed(2) : producto.unidad === 'ml' ? ancho : 1;
  const subtotal = +(medida * precioUnit * cantidad).toFixed(0);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between p-5 border-b border-slate-100">
          <div>
            <h3 className="font-bold text-slate-900 text-sm">{producto.nombre}</h3>
            <p className="text-xs text-slate-400">{producto.proveedor || producto.marca || producto.categoria}</p>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100"><X size={16}/></button>
        </div>

        <div className="p-5 space-y-4">
          {/* Precio referencia */}
          <div className="bg-slate-50 rounded-xl p-3 flex justify-between items-center">
            <div>
              <p className="text-xs text-slate-500">Precio unitario</p>
              <p className="text-lg font-bold text-slate-900">{fmt(precioUnit)}</p>
            </div>
            <span className="text-sm text-slate-500 bg-white border border-slate-200 px-2 py-1 rounded-lg font-medium">
              / {producto.unidad === 'm2' ? 'm²' : producto.unidad === 'ml' ? 'ml' : 'unidad'}
            </span>
          </div>

          {/* Dimensiones */}
          {producto.unidad !== 'unidad' && (
            <div className="grid grid-cols-2 gap-3">
              {producto.unidad === 'm2' && (
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1.5">Alto (m)</label>
                  <input type="number" min={0.1} step={0.01} value={alto} onChange={e => setAlto(+e.target.value)}
                    className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm font-mono focus:outline-none focus:ring-2 focus:ring-[--brand-primary]/30"/>
                  {(producto.alto_min || producto.alto_max) && (
                    <p className="text-[10px] text-slate-400 mt-1">
                      Rango: {producto.alto_min || 0}m – {producto.alto_max || '∞'}m
                    </p>
                  )}
                </div>
              )}
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1.5">
                  {producto.unidad === 'm2' ? 'Ancho (m)' : 'Metros lineales'}
                </label>
                <input type="number" min={0.1} step={0.01} value={ancho} onChange={e => setAncho(+e.target.value)}
                  className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm font-mono focus:outline-none focus:ring-2 focus:ring-[--brand-primary]/30"/>
                {(producto.ancho_min || producto.ancho_max) && (
                  <p className="text-[10px] text-slate-400 mt-1">
                    Rango: {producto.ancho_min || 0}m – {producto.ancho_max || '∞'}m
                  </p>
                )}
              </div>
            </div>
          )}

          {/* Cantidad */}
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1.5">Cantidad</label>
            <input type="number" min={1} step={1} value={cantidad} onChange={e => setCantidad(+e.target.value)}
              className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm font-mono focus:outline-none focus:ring-2 focus:ring-[--brand-primary]/30"/>
          </div>

          {/* Total */}
          <div className="bg-gradient-to-br from-[--brand-primary]/5 to-[--brand-primary]/10 border border-[--brand-primary]/20 rounded-xl p-3">
            <div className="flex justify-between items-center">
              <div>
                <p className="text-xs text-slate-500">
                  {producto.unidad === 'm2' ? `${medida} m² × ${fmt(precioUnit)} × ${cantidad} u` :
                   producto.unidad === 'ml' ? `${ancho} ml × ${fmt(precioUnit)} × ${cantidad}` :
                   `${cantidad} unidades × ${fmt(precioUnit)}`}
                </p>
                <p className="text-2xl font-bold text-[--brand-primary] mt-0.5">{fmt(subtotal)}</p>
              </div>
              <Calculator size={28} className="text-[--brand-primary]/40"/>
            </div>
          </div>

          <div className="flex gap-2">
            <button onClick={onClose}
              className="flex-1 py-2.5 rounded-xl border border-slate-200 text-sm font-semibold text-slate-600 hover:bg-slate-50 transition-colors">
              Cerrar
            </button>
            {onAdd && (
              <button onClick={() => { onAdd({ producto, alto, ancho, cantidad, total: subtotal, unidad: producto.unidad }); onClose(); }}
                className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-sm font-semibold text-white transition-all"
                style={{ background: 'linear-gradient(135deg, var(--brand-primary), var(--brand-dark))' }}>
                <ShoppingCart size={14}/> Agregar
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Formulario ─────────────────────────────────────────────────────────────
function ProductoForm({ inicial, onSave, onCancel }: { inicial?: Partial<Producto>; onSave: (d: any) => Promise<any>; onCancel: () => void }) {
  const [form, setForm] = useState({
    nombre: inicial?.nombre || '', descripcion: inicial?.descripcion || '',
    categoria: inicial?.categoria || 'Cortina Roller', marca: (inicial as any)?.marca || '',
    proveedor: (inicial as any)?.proveedor || '', unidad: inicial?.unidad || 'm2',
    precio_base: inicial?.precio_base?.toString() || '0',
    precio_m2: (inicial as any)?.precio_m2?.toString() || '',
    precio_ml: (inicial as any)?.precio_ml?.toString() || '',
    ancho_min: (inicial as any)?.ancho_min?.toString() || '',
    ancho_max: (inicial as any)?.ancho_max?.toString() || '',
    alto_min: (inicial as any)?.alto_min?.toString() || '',
    alto_max: (inicial as any)?.alto_max?.toString() || '',
    codigo: inicial?.codigo || '', codigo_proveedor: (inicial as any)?.codigo_proveedor || '',
    colores: (inicial?.colores || []) as string[], materiales: (inicial?.materiales || []) as string[],
  });
  const [colorInput, setColorInput] = useState('');
  const [materialInput, setMaterialInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const u = (k: string, v: any) => setForm(f => ({ ...f, [k]: v }));
  const addColor = (c: string) => { if (c.trim() && !form.colores.includes(c.trim())) u('colores', [...form.colores, c.trim()]); setColorInput(''); };
  const addMaterial = (m: string) => { if (m.trim() && !form.materiales.includes(m.trim())) u('materiales', [...form.materiales, m.trim()]); setMaterialInput(''); };

  const submit = async () => {
    if (!form.nombre.trim()) { setError('El nombre es obligatorio'); return; }
    setError(''); setLoading(true);
    try {
      await onSave({
        nombre: form.nombre.trim(), descripcion: form.descripcion.trim() || undefined,
        categoria: form.categoria, marca: form.marca || undefined, proveedor: form.proveedor || undefined,
        unidad: form.unidad, precio_base: +form.precio_base,
        precio_m2: form.precio_m2 ? +form.precio_m2 : undefined,
        precio_ml: form.precio_ml ? +form.precio_ml : undefined,
        ancho_min: form.ancho_min ? +form.ancho_min : undefined,
        ancho_max: form.ancho_max ? +form.ancho_max : undefined,
        alto_min: form.alto_min ? +form.alto_min : undefined,
        alto_max: form.alto_max ? +form.alto_max : undefined,
        codigo: form.codigo || undefined, codigo_proveedor: form.codigo_proveedor || undefined,
        colores: form.colores, materiales: form.materiales,
      });
    } catch (e: any) { setError(e.message || 'Error al guardar'); }
    finally { setLoading(false); }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center p-4 pt-10 bg-black/40 backdrop-blur-sm overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl">
        <div className="flex items-center justify-between p-6 border-b border-slate-100">
          <h3 className="text-lg font-bold text-slate-900">{inicial?.id ? 'Editar Producto' : 'Nuevo Producto'}</h3>
          <button onClick={onCancel} className="p-2 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100"><X size={18}/></button>
        </div>
        <div className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
          {/* Nombre */}
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1.5">Nombre *</label>
            <input value={form.nombre} onChange={e => u('nombre', e.target.value)} placeholder="Ej: Cortina Roller Sunscreen Premium"
              className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[--brand-primary]/30"/>
          </div>
          {/* Categoría + Proveedor + Marca */}
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1.5">Categoría</label>
              <select value={form.categoria} onChange={e => u('categoria', e.target.value)}
                className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-1 focus:ring-[--brand-primary]">
                {CATEGORIAS.map(c => <option key={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1.5">Proveedor</label>
              <input list="proveedores-list" value={form.proveedor} onChange={e => u('proveedor', e.target.value)}
                placeholder="Seleccionar o escribir"
                className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-1 focus:ring-[--brand-primary]"/>
              <datalist id="proveedores-list">{PROVEEDORES.map(p => <option key={p} value={p}/>)}</datalist>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1.5">Marca</label>
              <input value={form.marca} onChange={e => u('marca', e.target.value)} placeholder="Ej: Somfy"
                className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-1 focus:ring-[--brand-primary]"/>
            </div>
          </div>
          {/* Unidad + Precios */}
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1.5">Unidad de venta</label>
              <select value={form.unidad} onChange={e => u('unidad', e.target.value)}
                className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-1 focus:ring-[--brand-primary]">
                <option value="m2">Metro cuadrado (m²)</option>
                <option value="ml">Metro lineal (ml)</option>
                <option value="unidad">Unidad</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1.5">Precio base ($)</label>
              <input type="number" min="0" value={form.precio_base} onChange={e => u('precio_base', e.target.value)}
                className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm font-mono focus:outline-none focus:ring-1 focus:ring-[--brand-primary]"/>
            </div>
            {form.unidad === 'm2' && (
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1.5">Precio m² ($)</label>
                <input type="number" min="0" value={form.precio_m2} onChange={e => u('precio_m2', e.target.value)} placeholder="= precio base si vacío"
                  className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm font-mono focus:outline-none focus:ring-1 focus:ring-[--brand-primary]"/>
              </div>
            )}
            {form.unidad === 'ml' && (
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1.5">Precio ml ($)</label>
                <input type="number" min="0" value={form.precio_ml} onChange={e => u('precio_ml', e.target.value)} placeholder="= precio base si vacío"
                  className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm font-mono focus:outline-none focus:ring-1 focus:ring-[--brand-primary]"/>
              </div>
            )}
          </div>
          {/* Dimensiones */}
          {form.unidad !== 'unidad' && (
            <div className="grid grid-cols-4 gap-3">
              {['ancho_min','ancho_max','alto_min','alto_max'].map(k => (
                <div key={k}>
                  <label className="block text-xs font-semibold text-slate-600 mb-1.5">{k.replace('_', ' ')} (m)</label>
                  <input type="number" min="0" step="0.01" value={(form as any)[k]} onChange={e => u(k, e.target.value)}
                    placeholder="0.00" className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm font-mono focus:outline-none focus:ring-1 focus:ring-[--brand-primary]"/>
                </div>
              ))}
            </div>
          )}
          {/* Códigos */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1.5">Código SKU</label>
              <input value={form.codigo} onChange={e => u('codigo', e.target.value)} placeholder="SKU-001"
                className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-1 focus:ring-[--brand-primary]"/>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1.5">Código Proveedor</label>
              <input value={form.codigo_proveedor} onChange={e => u('codigo_proveedor', e.target.value)} placeholder="PROV-12345"
                className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-1 focus:ring-[--brand-primary]"/>
            </div>
          </div>
          {/* Descripción */}
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1.5">Descripción</label>
            <textarea value={form.descripcion} onChange={e => u('descripcion', e.target.value)} rows={2}
              className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm resize-none focus:outline-none focus:ring-1 focus:ring-[--brand-primary]"/>
          </div>
          {/* Colores */}
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1.5">Colores disponibles</label>
            <div className="flex flex-wrap gap-1 mb-2">
              {form.colores.map(c => (
                <span key={c} className="flex items-center gap-1 px-2 py-0.5 bg-slate-100 text-slate-700 rounded-full text-xs">
                  {c}<button type="button" onClick={() => u('colores', form.colores.filter(x => x !== c))}><X size={9}/></button>
                </span>
              ))}
            </div>
            <div className="flex gap-1.5">
              <input value={colorInput} onChange={e => setColorInput(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), addColor(colorInput))}
                placeholder="Agregar color..." className="flex-1 px-3 py-1.5 border border-slate-200 rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-[--brand-primary]"/>
              <button type="button" onClick={() => addColor(colorInput)} className="px-2 py-1.5 bg-slate-100 rounded-lg text-xs font-medium hover:bg-slate-200">+</button>
            </div>
            <div className="mt-1.5 flex flex-wrap gap-1">
              {COLORES_SUGERIDOS.filter(c => !form.colores.includes(c)).slice(0,8).map(c => (
                <button type="button" key={c} onClick={() => addColor(c)}
                  className="px-1.5 py-0.5 border border-slate-200 bg-white rounded text-[10px] text-slate-500 hover:bg-slate-50">+{c}</button>
              ))}
            </div>
          </div>
          {/* Materiales */}
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1.5">Materiales / Telas</label>
            <div className="flex flex-wrap gap-1 mb-2">
              {form.materiales.map(m => (
                <span key={m} className="flex items-center gap-1 px-2 py-0.5 bg-blue-50 text-blue-700 rounded-full text-xs">
                  {m}<button type="button" onClick={() => u('materiales', form.materiales.filter(x => x !== m))}><X size={9}/></button>
                </span>
              ))}
            </div>
            <div className="flex gap-1.5">
              <input value={materialInput} onChange={e => setMaterialInput(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), addMaterial(materialInput))}
                placeholder="Agregar material..." className="flex-1 px-3 py-1.5 border border-slate-200 rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-[--brand-primary]"/>
              <button type="button" onClick={() => addMaterial(materialInput)} className="px-2 py-1.5 bg-slate-100 rounded-lg text-xs font-medium hover:bg-slate-200">+</button>
            </div>
            <div className="mt-1.5 flex flex-wrap gap-1">
              {MATERIALES_SUGERIDOS.filter(m => !form.materiales.includes(m)).slice(0,8).map(m => (
                <button type="button" key={m} onClick={() => addMaterial(m)}
                  className="px-1.5 py-0.5 border border-slate-200 bg-white rounded text-[10px] text-slate-500 hover:bg-slate-50">+{m}</button>
              ))}
            </div>
          </div>
          {error && <p className="text-xs text-red-600">{error}</p>}
        </div>
        <div className="flex gap-3 p-6 border-t border-slate-100">
          <button onClick={onCancel} className="flex-1 py-2.5 rounded-xl border border-slate-200 text-sm font-semibold text-slate-600 hover:bg-slate-50">Cancelar</button>
          <button onClick={submit} disabled={loading}
            className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-sm font-semibold text-white disabled:opacity-60"
            style={{ background: 'linear-gradient(135deg, var(--brand-primary), var(--brand-dark))' }}>
            <Check size={14}/> {loading ? 'Guardando...' : inicial?.id ? 'Actualizar' : 'Crear Producto'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Página Principal ────────────────────────────────────────────────────────
export default function Productos({ onAddToCotizacion }: { onAddToCotizacion?: CalcProps['onAddToCot'] }) {
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Producto | null>(null);
  const [busqueda, setBusqueda] = useState('');
  const [categoriaFiltro, setCategoriaFiltro] = useState('');
  const [proveedorFiltro, setProveedorFiltro] = useState('');
  const [unidadFiltro, setUnidadFiltro] = useState('');
  const [soloActivos, setSoloActivos] = useState(true);
  const [calcProducto, setCalcProducto] = useState<Producto | null>(null);
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('grid');
  const [showFilters, setShowFilters] = useState(false);

  const { data: productos, loading, error, refetch } = useApi(() => api.getProductos());
  const { execute: deleteProd } = useMutation((id: string) => api.deleteProducto(id));

  const lista: Producto[] = productos || [];

  const filtrados = useMemo(() => lista.filter(p => {
    if (soloActivos && !p.activo) return false;
    const q = busqueda.toLowerCase();
    if (q && !p.nombre.toLowerCase().includes(q) &&
        !(p as any).proveedor?.toLowerCase().includes(q) &&
        !p.codigo?.toLowerCase().includes(q) &&
        !(p as any).marca?.toLowerCase().includes(q)) return false;
    if (categoriaFiltro && p.categoria !== categoriaFiltro) return false;
    if (proveedorFiltro && (p as any).proveedor !== proveedorFiltro) return false;
    if (unidadFiltro && p.unidad !== unidadFiltro) return false;
    return true;
  }), [lista, busqueda, categoriaFiltro, proveedorFiltro, unidadFiltro, soloActivos]);

  const proveedoresList = useMemo(() => [...new Set(lista.map(p => (p as any).proveedor).filter(Boolean))].sort(), [lista]);
  const categoriasList = useMemo(() => [...new Set(lista.map(p => p.categoria))].sort(), [lista]);

  const handleCreate = async (data: any) => { await api.createProducto(data); setShowForm(false); refetch(); };
  const handleUpdate = async (data: any) => { if (!editing) return; await api.updateProducto(editing.id, data); setEditing(null); refetch(); };
  const handleDelete = async (p: Producto) => { if (!confirm(`¿Desactivar "${p.nombre}"?`)) return; await deleteProd(p.id); refetch(); };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Catálogo de Productos</h1>
          <p className="text-sm text-slate-500">{lista.filter(p => p.activo).length} activos · {lista.length} total</p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => setViewMode(v => v === 'grid' ? 'table' : 'grid')}
            className="p-2.5 rounded-xl border border-slate-200 text-slate-500 hover:text-slate-700 hover:border-slate-300 transition-colors">
            {viewMode === 'grid' ? <List size={16}/> : <LayoutGrid size={16}/>}
          </button>
          <button onClick={() => { setShowForm(true); setEditing(null); }}
            className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-sm font-semibold text-white shadow-sm"
            style={{ background: 'linear-gradient(135deg, var(--brand-primary), var(--brand-dark))' }}>
            <Plus size={15}/> Nuevo Producto
          </button>
        </div>
      </div>

      {/* Barra de búsqueda y filtros */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4 space-y-3">
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"/>
            <input value={busqueda} onChange={e => setBusqueda(e.target.value)}
              placeholder="Buscar por nombre, proveedor, marca o código..."
              className="w-full pl-9 pr-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[--brand-primary]/30"/>
            {busqueda && <button onClick={() => setBusqueda('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"><X size={13}/></button>}
          </div>
          <button onClick={() => setShowFilters(f => !f)}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-xl border text-sm font-medium transition-colors ${showFilters ? 'border-[--brand-primary] text-[--brand-primary] bg-[--brand-primary]/5' : 'border-slate-200 text-slate-600'}`}>
            <SlidersHorizontal size={14}/> Filtros
          </button>
          <button onClick={refetch} className="p-2.5 rounded-xl border border-slate-200 text-slate-500 hover:text-slate-700">
            <RefreshCw size={14}/>
          </button>
        </div>

        {showFilters && (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 pt-1">
            <select value={categoriaFiltro} onChange={e => setCategoriaFiltro(e.target.value)}
              className="px-3 py-2 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-[--brand-primary]">
              <option value="">Todas las categorías</option>
              {categoriasList.map(c => <option key={c}>{c}</option>)}
            </select>
            <select value={proveedorFiltro} onChange={e => setProveedorFiltro(e.target.value)}
              className="px-3 py-2 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-[--brand-primary]">
              <option value="">Todos los proveedores</option>
              {proveedoresList.map(p => <option key={p}>{p}</option>)}
            </select>
            <select value={unidadFiltro} onChange={e => setUnidadFiltro(e.target.value)}
              className="px-3 py-2 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-[--brand-primary]">
              <option value="">Todas las unidades</option>
              <option value="m2">Metro cuadrado (m²)</option>
              <option value="ml">Metro lineal (ml)</option>
              <option value="unidad">Unidad</option>
            </select>
            <label className="flex items-center gap-2 px-3 py-2 border border-slate-200 rounded-xl cursor-pointer hover:bg-slate-50 text-sm font-medium text-slate-700">
              <input type="checkbox" checked={soloActivos} onChange={e => setSoloActivos(e.target.checked)} className="rounded"/>
              Solo activos
            </label>
          </div>
        )}

        <div className="flex items-center gap-2 text-xs text-slate-500">
          <span>{filtrados.length} producto{filtrados.length !== 1 ? 's' : ''}</span>
          {(categoriaFiltro || proveedorFiltro || unidadFiltro || busqueda) && (
            <button onClick={() => { setBusqueda(''); setCategoriaFiltro(''); setProveedorFiltro(''); setUnidadFiltro(''); }}
              className="flex items-center gap-1 text-[--brand-primary] hover:underline">
              <X size={11}/> Limpiar filtros
            </button>
          )}
        </div>
      </div>

      {/* Formulario (modal) */}
      {(showForm || editing) && (
        <ProductoForm
          inicial={editing || undefined}
          onSave={editing ? handleUpdate : handleCreate}
          onCancel={() => { setShowForm(false); setEditing(null); }}
        />
      )}

      {/* Vista de productos */}
      {loading ? (
        <div className="flex items-center justify-center h-40 text-slate-400 bg-white rounded-2xl border border-slate-100">
          <RefreshCw size={20} className="animate-spin mr-2"/> Cargando catálogo...
        </div>
      ) : filtrados.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-40 bg-white rounded-2xl border border-dashed border-slate-200 text-slate-400">
          <Package size={36} className="mb-2 opacity-30"/>
          <p className="font-medium">{lista.length === 0 ? 'Sin productos en el catálogo' : 'Sin resultados'}</p>
        </div>
      ) : viewMode === 'grid' ? (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {filtrados.map(p => {
            const precioM2 = (p as any).precio_m2 || p.precio_base;
            const precioML = (p as any).precio_ml || p.precio_base;
            return (
              <div key={p.id} className={`bg-white rounded-2xl border shadow-sm hover:shadow-md transition-all group ${p.activo ? 'border-slate-100' : 'opacity-50 border-slate-200'}`}>
                <div className="p-4">
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div className="min-w-0">
                      {p.codigo && <span className="inline-block px-1.5 py-0.5 bg-slate-100 text-slate-500 rounded text-[10px] font-mono mb-1">{p.codigo}</span>}
                      <p className="text-sm font-bold text-slate-900 leading-tight line-clamp-2">{p.nombre}</p>
                      <p className="text-[11px] text-slate-400 mt-0.5">{p.categoria}</p>
                      {(p as any).proveedor && <p className="text-[11px] text-[--brand-primary] font-medium">{(p as any).proveedor}</p>}
                    </div>
                    <div className="text-right flex-shrink-0">
                      <p className="text-base font-bold text-slate-900">
                        {fmt(p.unidad === 'ml' ? precioML : precioM2)}
                      </p>
                      <p className="text-[10px] text-slate-400">/{p.unidad === 'm2' ? 'm²' : p.unidad === 'ml' ? 'ml' : 'un'}</p>
                    </div>
                  </div>

                  {p.colores.length > 0 && (
                    <div className="flex flex-wrap gap-1 mb-2">
                      {(p.colores as string[]).slice(0, 3).map(c => (
                        <span key={c} className="px-1.5 py-0.5 bg-slate-50 border border-slate-200 rounded-full text-[10px] text-slate-600">{c}</span>
                      ))}
                      {p.colores.length > 3 && <span className="text-[10px] text-slate-400">+{p.colores.length - 3}</span>}
                    </div>
                  )}

                  {(p as any).ancho_max && (
                    <p className="text-[10px] text-slate-400 mb-1.5">
                      Máx: {(p as any).ancho_max}m ancho {(p as any).alto_max ? `× ${(p as any).alto_max}m alto` : ''}
                    </p>
                  )}
                </div>

                <div className="border-t border-slate-100 p-3 flex gap-1.5">
                  <button onClick={() => setCalcProducto(p)}
                    className="flex-1 flex items-center justify-center gap-1 py-1.5 rounded-lg bg-slate-50 text-slate-600 text-xs font-medium hover:bg-slate-100 transition-colors">
                    <Calculator size={11}/> Calcular
                  </button>
                  {onAddToCotizacion && (
                    <button onClick={() => setCalcProducto(p)}
                      className="flex items-center justify-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium text-white transition-all"
                      style={{ background: 'var(--brand-primary)' }}>
                      <ShoppingCart size={11}/>
                    </button>
                  )}
                  <button onClick={() => { setEditing(p); setShowForm(false); }}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition-colors">
                    <Edit3 size={13}/>
                  </button>
                  <button onClick={() => handleDelete(p)}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50 transition-colors">
                    <Trash2 size={13}/>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* Vista tabla */
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-100">
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">Producto</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide hidden md:table-cell">Proveedor</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide hidden lg:table-cell">Colores</th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-slate-500 uppercase tracking-wide">Precio</th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-slate-500 uppercase tracking-wide">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {filtrados.map(p => (
                <tr key={p.id} className={`hover:bg-slate-50 transition-colors ${!p.activo ? 'opacity-50' : ''}`}>
                  <td className="px-4 py-3">
                    <p className="font-semibold text-slate-900 leading-tight">{p.nombre}</p>
                    <p className="text-xs text-slate-400">{p.categoria} · {p.unidad}</p>
                    {p.codigo && <span className="text-[10px] font-mono text-slate-400">{p.codigo}</span>}
                  </td>
                  <td className="px-4 py-3 hidden md:table-cell">
                    <p className="text-sm text-slate-700">{(p as any).proveedor || '—'}</p>
                    {(p as any).marca && <p className="text-xs text-slate-400">{(p as any).marca}</p>}
                  </td>
                  <td className="px-4 py-3 hidden lg:table-cell">
                    <div className="flex flex-wrap gap-1">
                      {(p.colores as string[]).slice(0, 3).map(c => (
                        <span key={c} className="px-1.5 py-0.5 bg-slate-100 rounded-full text-[10px] text-slate-600">{c}</span>
                      ))}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <p className="font-bold text-slate-900">{fmt(p.precio_base)}</p>
                    <p className="text-[10px] text-slate-400">/{p.unidad === 'm2' ? 'm²' : p.unidad}</p>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-1">
                      <button onClick={() => setCalcProducto(p)} className="p-1.5 rounded-lg text-slate-400 hover:text-amber-600 hover:bg-amber-50 transition-colors" title="Calcular">
                        <Calculator size={13}/>
                      </button>
                      <button onClick={() => { setEditing(p); setShowForm(false); }} className="p-1.5 rounded-lg text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition-colors">
                        <Edit3 size={13}/>
                      </button>
                      <button onClick={() => handleDelete(p)} className="p-1.5 rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50 transition-colors">
                        <Trash2 size={13}/>
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Calculadora Modal */}
      {calcProducto && (
        <CalculadoraModal
          producto={calcProducto}
          onClose={() => setCalcProducto(null)}
          onAdd={onAddToCotizacion}
        />
      )}
    </div>
  );
}
