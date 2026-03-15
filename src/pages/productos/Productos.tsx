/**
 * Catálogo de Productos — gestión del catálogo del taller
 * Ruta: /productos
 */
import { useState } from 'react';
import { useApi } from '../../hooks/useApi';
import { useMutation } from '../../hooks/useMutation';
import { api } from '../../services/api';
import type { Producto } from '../../types';
import { Spinner, ErrorMessage } from '../../components/LoadingStates';
import {
  Package, Plus, X, Edit3, Trash2,
  Check, Search,
} from 'lucide-react';

const CATEGORIAS = [
  'Cortina Roller',
  'Cortina Zebra',
  'Cortina Blackout',
  'Persiana Enrollable',
  'Persiana Veneciana',
  'Toldo Retráctil',
  'Toldo Vertical',
  'Cortina de Tela',
  'Mueble a Medida',
  'Accesorio',
  'Otro',
];

const UNIDADES = ['m2', 'ml', 'unidad'];

const COLORES_DEFAULT = ['Blanco', 'Gris Claro', 'Gris', 'Negro', 'Beige', 'Crema', 'Terracota', 'Azul'];
const MATERIALES_DEFAULT = ['Sunscreen 3%', 'Sunscreen 5%', 'Sunscreen 10%', 'Blackout', 'Acrílica', 'PVC', 'Lino'];

const fmt = (n: number) => '$' + n.toLocaleString('es-CL');

function ProductoForm({
  inicial,
  onSave,
  onCancel,
}: {
  inicial?: Partial<Producto>;
  onSave: (data: any) => Promise<any>;
  onCancel: () => void;
}) {
  const [form, setForm] = useState({
    nombre: inicial?.nombre || '',
    descripcion: inicial?.descripcion || '',
    categoria: inicial?.categoria || 'Cortina Roller',
    unidad: inicial?.unidad || 'm2',
    precio_base: inicial?.precio_base?.toString() || '0',
    codigo: inicial?.codigo || '',
    colores: (inicial?.colores || []) as string[],
    materiales: (inicial?.materiales || []) as string[],
  });
  const [colorInput, setColorInput] = useState('');
  const [materialInput, setMaterialInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const update = (k: string, v: any) => setForm(f => ({ ...f, [k]: v }));

  const addColor = (c: string) => {
    const val = c.trim();
    if (val && !form.colores.includes(val)) {
      update('colores', [...form.colores, val]);
    }
    setColorInput('');
  };

  const addMaterial = (m: string) => {
    const val = m.trim();
    if (val && !form.materiales.includes(val)) {
      update('materiales', [...form.materiales, val]);
    }
    setMaterialInput('');
  };

  const submit = async () => {
    if (!form.nombre.trim()) { setError('El nombre es obligatorio'); return; }
    const precio = parseFloat(form.precio_base);
    if (isNaN(precio) || precio < 0) { setError('Precio inválido'); return; }
    setError('');
    setLoading(true);
    try {
      await onSave({
        nombre: form.nombre.trim(),
        descripcion: form.descripcion.trim() || undefined,
        categoria: form.categoria,
        unidad: form.unidad,
        precio_base: precio,
        codigo: form.codigo.trim() || undefined,
        colores: form.colores,
        materiales: form.materiales,
      });
    } catch (e: any) {
      setError(e.message || 'Error al guardar');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="rounded-xl border border-blue-200 bg-blue-50 p-5">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-sm font-bold text-blue-800">{inicial?.id ? 'Editar Producto' : 'Nuevo Producto'}</h3>
        <button onClick={onCancel}><X size={16} className="text-slate-400 hover:text-slate-600" /></button>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <label className="mb-1 block text-xs font-semibold text-slate-600">Nombre *</label>
          <input value={form.nombre} onChange={e => update('nombre', e.target.value)}
            placeholder="Ej: Cortina Roller Sunscreen"
            className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-200" />
        </div>
        <div>
          <label className="mb-1 block text-xs font-semibold text-slate-600">Categoría</label>
          <select value={form.categoria} onChange={e => update('categoria', e.target.value)}
            className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-200">
            {CATEGORIAS.map(c => <option key={c}>{c}</option>)}
          </select>
        </div>
        <div>
          <label className="mb-1 block text-xs font-semibold text-slate-600">Unidad de venta</label>
          <select value={form.unidad} onChange={e => update('unidad', e.target.value)}
            className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-200">
            {UNIDADES.map(u => <option key={u} value={u}>{u === 'm2' ? 'Metro cuadrado (m²)' : u === 'ml' ? 'Metro lineal (ml)' : 'Unidad'}</option>)}
          </select>
        </div>
        <div>
          <label className="mb-1 block text-xs font-semibold text-slate-600">Precio base</label>
          <div className="relative">
            <span className="absolute left-3 top-2 text-xs text-slate-400">$</span>
            <input type="number" min="0" value={form.precio_base} onChange={e => update('precio_base', e.target.value)}
              className="w-full rounded-lg border border-slate-200 bg-white py-2 pl-6 pr-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-200" />
          </div>
        </div>
        <div>
          <label className="mb-1 block text-xs font-semibold text-slate-600">Código (opcional)</label>
          <input value={form.codigo} onChange={e => update('codigo', e.target.value)}
            placeholder="SKU-001"
            className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-200" />
        </div>
        <div className="sm:col-span-2">
          <label className="mb-1 block text-xs font-semibold text-slate-600">Descripción</label>
          <textarea value={form.descripcion} onChange={e => update('descripcion', e.target.value)}
            rows={2} placeholder="Descripción del producto..."
            className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-blue-200" />
        </div>

        {/* Colores */}
        <div>
          <label className="mb-1 block text-xs font-semibold text-slate-600">Colores disponibles</label>
          <div className="flex flex-wrap gap-1 mb-2">
            {form.colores.map(c => (
              <span key={c} className="flex items-center gap-1 rounded-full bg-white border border-slate-200 px-2 py-0.5 text-[11px] text-slate-700">
                {c}
                <button onClick={() => update('colores', form.colores.filter(x => x !== c))}>
                  <X size={10} className="text-slate-400" />
                </button>
              </span>
            ))}
          </div>
          <div className="flex gap-1">
            <input value={colorInput} onChange={e => setColorInput(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addColor(colorInput); } }}
              placeholder="Agregar color..."
              className="flex-1 rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-blue-200" />
            <button onClick={() => addColor(colorInput)}
              className="rounded-lg bg-white border border-slate-200 px-2 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50">
              +
            </button>
          </div>
          <div className="mt-1 flex flex-wrap gap-1">
            {COLORES_DEFAULT.filter(c => !form.colores.includes(c)).slice(0, 5).map(c => (
              <button key={c} onClick={() => addColor(c)}
                className="rounded border border-slate-200 bg-white px-1.5 py-0.5 text-[10px] text-slate-500 hover:bg-slate-50">
                + {c}
              </button>
            ))}
          </div>
        </div>

        {/* Materiales */}
        <div>
          <label className="mb-1 block text-xs font-semibold text-slate-600">Materiales / Telas</label>
          <div className="flex flex-wrap gap-1 mb-2">
            {form.materiales.map(m => (
              <span key={m} className="flex items-center gap-1 rounded-full bg-white border border-slate-200 px-2 py-0.5 text-[11px] text-slate-700">
                {m}
                <button onClick={() => update('materiales', form.materiales.filter(x => x !== m))}>
                  <X size={10} className="text-slate-400" />
                </button>
              </span>
            ))}
          </div>
          <div className="flex gap-1">
            <input value={materialInput} onChange={e => setMaterialInput(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addMaterial(materialInput); } }}
              placeholder="Agregar tela/material..."
              className="flex-1 rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-blue-200" />
            <button onClick={() => addMaterial(materialInput)}
              className="rounded-lg bg-white border border-slate-200 px-2 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50">
              +
            </button>
          </div>
          <div className="mt-1 flex flex-wrap gap-1">
            {MATERIALES_DEFAULT.filter(m => !form.materiales.includes(m)).slice(0, 5).map(m => (
              <button key={m} onClick={() => addMaterial(m)}
                className="rounded border border-slate-200 bg-white px-1.5 py-0.5 text-[10px] text-slate-500 hover:bg-slate-50">
                + {m}
              </button>
            ))}
          </div>
        </div>
      </div>

      {error && <p className="mt-3 text-xs text-red-600">{error}</p>}

      <div className="mt-4 flex gap-2 justify-end">
        <button onClick={onCancel}
          className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50">
          Cancelar
        </button>
        <button onClick={submit} disabled={loading}
          className="flex items-center gap-1.5 rounded-lg bg-blue-500 px-4 py-2 text-xs font-semibold text-white hover:bg-blue-600 disabled:opacity-60">
          <Check size={12} /> {loading ? 'Guardando...' : inicial?.id ? 'Actualizar' : 'Crear Producto'}
        </button>
      </div>
    </div>
  );
}

export default function Productos() {
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Producto | null>(null);
  const [busqueda, setBusqueda] = useState('');
  const [categoriaFiltro, setCategoriaFiltro] = useState('');

  const { data: productos, loading, error, refetch } = useApi(() => api.getProductos());
  const { execute: deleteProd } = useMutation((id: string) => api.deleteProducto(id));

  const lista: Producto[] = productos || [];
  const filtrados = lista.filter(p => {
    const matchBusqueda = !busqueda || p.nombre.toLowerCase().includes(busqueda.toLowerCase()) ||
      p.codigo?.toLowerCase().includes(busqueda.toLowerCase());
    const matchCat = !categoriaFiltro || p.categoria === categoriaFiltro;
    return matchBusqueda && matchCat;
  });

  const categorias = [...new Set(lista.map(p => p.categoria))].sort();

  const handleCreate = async (data: any) => {
    await api.createProducto(data);
    setShowForm(false);
    refetch();
  };

  const handleUpdate = async (data: any) => {
    if (!editing) return;
    await api.updateProducto(editing.id, data);
    setEditing(null);
    refetch();
  };

  const handleDelete = async (p: Producto) => {
    if (!confirm(`¿Desactivar "${p.nombre}"?`)) return;
    await deleteProd(p.id);
    refetch();
  };

  if (loading) return <Spinner />;
  if (error) return <ErrorMessage message={error} onRetry={refetch} />;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Catálogo de Productos</h1>
          <p className="text-sm text-slate-500">{lista.filter(p => p.activo).length} productos activos</p>
        </div>
        <button onClick={() => { setShowForm(true); setEditing(null); }}
          className="flex items-center gap-1.5 rounded-lg bg-blue-500 px-4 py-2 text-sm font-semibold text-white transition hover:bg-blue-600">
          <Plus size={15} /> Nuevo Producto
        </button>
      </div>

      {/* Formulario */}
      {showForm && !editing && (
        <ProductoForm
          onSave={handleCreate}
          onCancel={() => setShowForm(false)}
        />
      )}
      {editing && (
        <ProductoForm
          inicial={editing}
          onSave={handleUpdate}
          onCancel={() => setEditing(null)}
        />
      )}

      {/* Filtros */}
      <div className="flex flex-wrap gap-2">
        <div className="relative flex-1 min-w-[200px]">
          <Search size={14} className="absolute left-3 top-2.5 text-slate-400" />
          <input
            value={busqueda}
            onChange={e => setBusqueda(e.target.value)}
            placeholder="Buscar por nombre o código..."
            className="w-full rounded-lg border border-slate-200 bg-white py-2 pl-8 pr-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-200"
          />
        </div>
        <select
          value={categoriaFiltro}
          onChange={e => setCategoriaFiltro(e.target.value)}
          className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-200"
        >
          <option value="">Todas las categorías</option>
          {categorias.map(c => <option key={c}>{c}</option>)}
        </select>
      </div>

      {/* Lista de productos */}
      {filtrados.length === 0 ? (
        <div className="rounded-xl border border-slate-200 bg-white p-14 text-center">
          <Package size={40} className="mx-auto text-slate-300" />
          <p className="mt-3 text-sm text-slate-500">
            {lista.length === 0 ? 'Aún no hay productos en el catálogo' : 'Sin resultados para tu búsqueda'}
          </p>
          {lista.length === 0 && (
            <button onClick={() => setShowForm(true)}
              className="mt-3 flex items-center gap-1.5 mx-auto rounded-lg bg-blue-500 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-600">
              <Plus size={14} /> Agregar primer producto
            </button>
          )}
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {filtrados.map(p => (
            <div key={p.id}
              className={`rounded-xl border bg-white p-4 transition hover:shadow-sm ${!p.activo ? 'opacity-50' : 'border-slate-200'}`}>
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    {p.codigo && (
                      <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-mono text-slate-500">{p.codigo}</span>
                    )}
                    {!p.activo && (
                      <span className="rounded bg-gray-100 px-1.5 py-0.5 text-[10px] font-semibold text-gray-500">Inactivo</span>
                    )}
                  </div>
                  <p className="mt-1 text-sm font-bold text-slate-800 leading-tight">{p.nombre}</p>
                  <p className="text-[11px] text-slate-500">{p.categoria} · {p.unidad}</p>
                </div>
                <div className="shrink-0 text-right">
                  <p className="text-base font-bold text-slate-900">{fmt(p.precio_base)}</p>
                  <p className="text-[10px] text-slate-400">/ {p.unidad}</p>
                </div>
              </div>

              {p.descripcion && (
                <p className="mt-2 text-xs text-slate-500 line-clamp-2">{p.descripcion}</p>
              )}

              {/* Colores */}
              {p.colores.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-1">
                  {p.colores.slice(0, 4).map(c => (
                    <span key={c} className="rounded-full border border-slate-200 bg-slate-50 px-1.5 py-0.5 text-[10px] text-slate-600">{c}</span>
                  ))}
                  {p.colores.length > 4 && (
                    <span className="text-[10px] text-slate-400">+{p.colores.length - 4}</span>
                  )}
                </div>
              )}

              {/* Materiales */}
              {p.materiales.length > 0 && (
                <div className="mt-1 flex flex-wrap gap-1">
                  {p.materiales.slice(0, 3).map(m => (
                    <span key={m} className="rounded-full bg-blue-50 px-1.5 py-0.5 text-[10px] text-blue-600">{m}</span>
                  ))}
                  {p.materiales.length > 3 && (
                    <span className="text-[10px] text-slate-400">+{p.materiales.length - 3}</span>
                  )}
                </div>
              )}

              {/* Acciones */}
              <div className="mt-3 flex gap-2 border-t border-slate-100 pt-2.5">
                <button onClick={() => { setEditing(p); setShowForm(false); }}
                  className="flex flex-1 items-center justify-center gap-1 rounded-lg bg-slate-50 px-2 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-100">
                  <Edit3 size={12} /> Editar
                </button>
                {p.activo && (
                  <button onClick={() => handleDelete(p)}
                    className="flex items-center justify-center gap-1 rounded-lg bg-red-50 px-2 py-1.5 text-xs font-medium text-red-600 hover:bg-red-100">
                    <Trash2 size={12} /> Desactivar
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
