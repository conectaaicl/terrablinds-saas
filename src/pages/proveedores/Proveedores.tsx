import { useState } from 'react';
import { getAccessToken } from '../../services/api';
import { Plus, X, Edit2, Trash2, Search, Package, Truck, ShoppingCart, ChevronRight, AlertTriangle, Check, ArrowLeft } from 'lucide-react';

const API = 'https://working.conectaai.cl/api/v1';
function h() { return { 'Content-Type': 'application/json', Authorization: `Bearer ${getAccessToken()||''}` }; }
const fmt = (n: number) => '$' + n.toLocaleString('es-CL');

const CATS_PROV = ['telas','herrajes','servicios','transporte','equipos','otro'];
const UNIDADES = ['unidad','metro','metro2','kilo','litro','caja','rollo'];
const BANCOS = ['Banco Estado','BCI','Banco de Chile','Santander','Scotiabank','Itaú','BICE','Security','Falabella','Ripley','Otro'];
const ESTADOS_OC: Record<string, {label:string;bg:string;color:string}> = {
  borrador: {label:'Borrador', bg:'bg-slate-100', color:'text-slate-600'},
  enviada:  {label:'Enviada',  bg:'bg-blue-100',  color:'text-blue-700'},
  recibida: {label:'Recibida', bg:'bg-emerald-100',color:'text-emerald-700'},
  cancelada:{label:'Cancelada',bg:'bg-red-100',   color:'text-red-700'},
};

type Tab = 'proveedores' | 'materiales' | 'ordenes';

function useData(url: string, deps: any[] = []) {
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const load = async () => {
    setLoading(true);
    try {
      const r = await fetch(`${API}${url}`, { headers: h() });
      if (!r.ok) throw new Error(await r.text());
      setData(await r.json());
    } catch(e: any) { setError(e.message); }
    finally { setLoading(false); }
  };
  useState(() => { load(); });
  return { data, loading, error, refetch: load };
}

function ProveedorForm({ editando, onClose, onSaved }: { editando?: any; onClose: () => void; onSaved: () => void }) {
  const [f, setF] = useState({ nombre: editando?.nombre||'', rut: editando?.rut||'', direccion: editando?.direccion||'', telefono: editando?.telefono||'', email: editando?.email||'', categoria: editando?.categoria||'otro', contacto_nombre: editando?.contacto_nombre||'', contacto_telefono: editando?.contacto_telefono||'', banco: editando?.banco||'', tipo_cuenta: editando?.tipo_cuenta||'', numero_cuenta: editando?.numero_cuenta||'', notas: editando?.notas||'' });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const set = (k: string, v: string) => setF(p => ({...p, [k]: v}));
  const submit = async () => {
    if (!f.nombre.trim()) { setError('Nombre requerido'); return; }
    setSaving(true); setError('');
    try {
      const url = editando ? `${API}/proveedores/${editando.id}` : `${API}/proveedores/`;
      const r = await fetch(url, { method: editando ? 'PUT' : 'POST', headers: h(), body: JSON.stringify(f) });
      if (!r.ok) throw new Error(await r.text());
      onSaved(); onClose();
    } catch(e: any) { setError(e.message); } finally { setSaving(false); }
  };
  const inp = (label: string, key: string, placeholder?: string) => (
    <div><label className="mb-1 block text-xs font-semibold text-slate-600">{label}</label>
    <input value={(f as any)[key]} onChange={e => set(key, e.target.value)} placeholder={placeholder} className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none"/></div>
  );
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 sm:items-center p-4">
      <div className="w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-2xl bg-white shadow-2xl">
        <div className="sticky top-0 flex items-center justify-between border-b border-slate-200 bg-white px-5 py-4">
          <h2 className="text-base font-bold">{editando ? 'Editar Proveedor' : 'Nuevo Proveedor'}</h2>
          <button onClick={onClose} className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100"><X size={18}/></button>
        </div>
        <div className="space-y-3 p-5">
          <div className="grid grid-cols-2 gap-3">{inp('Nombre *','nombre','Nombre empresa')}{inp('RUT','rut','76.123.456-7')}</div>
          <div><label className="mb-1 block text-xs font-semibold text-slate-600">Categoría</label>
            <select value={f.categoria} onChange={e => set('categoria', e.target.value)} className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none">
              {CATS_PROV.map(c => <option key={c} value={c}>{c.charAt(0).toUpperCase()+c.slice(1)}</option>)}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-3">{inp('Teléfono','telefono','56912345678')}{inp('Email','email','contacto@empresa.cl')}</div>
          {inp('Dirección','direccion','Calle 123, Comuna')}
          <p className="text-xs font-bold text-slate-500 pt-1">CONTACTO COMERCIAL</p>
          <div className="grid grid-cols-2 gap-3">{inp('Nombre contacto','contacto_nombre')}{inp('Teléfono contacto','contacto_telefono')}</div>
          <p className="text-xs font-bold text-slate-500 pt-1">DATOS DE PAGO</p>
          <div><label className="mb-1 block text-xs font-semibold text-slate-600">Banco</label>
            <select value={f.banco} onChange={e => set('banco', e.target.value)} className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none">
              <option value="">— Seleccionar —</option>
              {BANCOS.map(b => <option key={b} value={b}>{b}</option>)}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-3">{inp('Tipo de cuenta','tipo_cuenta','Cta. Corriente')}{inp('Número de cuenta','numero_cuenta')}</div>
          <div><label className="mb-1 block text-xs font-semibold text-slate-600">Notas</label>
            <textarea value={f.notas} onChange={e => set('notas', e.target.value)} rows={3} className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none resize-none"/></div>
          {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-xs text-red-700">{error}</p>}
        </div>
        <div className="sticky bottom-0 flex gap-3 border-t border-slate-200 bg-white px-5 py-4">
          <button onClick={onClose} className="flex-1 rounded-lg border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-50">Cancelar</button>
          <button onClick={submit} disabled={saving} className="flex flex-1 items-center justify-center rounded-lg px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-60" style={{backgroundColor:'var(--brand-primary)'}}>
            {saving ? 'Guardando...' : 'Guardar'}
          </button>
        </div>
      </div>
    </div>
  );
}

function MaterialForm({ editando, proveedores, onClose, onSaved }: { editando?: any; proveedores: any[]; onClose: () => void; onSaved: () => void }) {
  const [f, setF] = useState({ nombre: editando?.nombre||'', sku: editando?.sku||'', unidad: editando?.unidad||'unidad', precio_compra: editando?.precio_compra||0, precio_venta: editando?.precio_venta||0, stock_actual: editando?.stock_actual||0, stock_minimo: editando?.stock_minimo||0, categoria: editando?.categoria||'', descripcion: editando?.descripcion||'', proveedor_id: editando?.proveedor_id||null });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const set = (k: string, v: any) => setF(p => ({...p, [k]: v}));
  const submit = async () => {
    if (!f.nombre.trim()) { setError('Nombre requerido'); return; }
    setSaving(true); setError('');
    try {
      const url = editando ? `${API}/proveedores/materiales/${editando.id}` : `${API}/proveedores/materiales`;
      const r = await fetch(url, { method: editando ? 'PUT' : 'POST', headers: h(), body: JSON.stringify(f) });
      if (!r.ok) throw new Error(await r.text());
      onSaved(); onClose();
    } catch(e: any) { setError(e.message); } finally { setSaving(false); }
  };
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 sm:items-center p-4">
      <div className="w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-2xl bg-white shadow-2xl">
        <div className="sticky top-0 flex items-center justify-between border-b border-slate-200 bg-white px-5 py-4">
          <h2 className="text-base font-bold">{editando ? 'Editar Material' : 'Nuevo Material'}</h2>
          <button onClick={onClose} className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100"><X size={18}/></button>
        </div>
        <div className="space-y-3 p-5">
          <div className="grid grid-cols-2 gap-3">
            <div><label className="mb-1 block text-xs font-semibold text-slate-600">Nombre *</label><input value={f.nombre} onChange={e => set('nombre', e.target.value)} className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none"/></div>
            <div><label className="mb-1 block text-xs font-semibold text-slate-600">SKU</label><input value={f.sku} onChange={e => set('sku', e.target.value)} className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none"/></div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div><label className="mb-1 block text-xs font-semibold text-slate-600">Unidad</label>
              <select value={f.unidad} onChange={e => set('unidad', e.target.value)} className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none">
                {UNIDADES.map(u => <option key={u} value={u}>{u}</option>)}
              </select>
            </div>
            <div><label className="mb-1 block text-xs font-semibold text-slate-600">Categoría</label><input value={f.categoria} onChange={e => set('categoria', e.target.value)} placeholder="Ej: telas, herrajes" className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none"/></div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div><label className="mb-1 block text-xs font-semibold text-slate-600">Precio Compra</label><input type="number" value={f.precio_compra} onChange={e => set('precio_compra', Number(e.target.value))} className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none"/></div>
            <div><label className="mb-1 block text-xs font-semibold text-slate-600">Precio Venta</label><input type="number" value={f.precio_venta} onChange={e => set('precio_venta', Number(e.target.value))} className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none"/></div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div><label className="mb-1 block text-xs font-semibold text-slate-600">Stock Actual</label><input type="number" value={f.stock_actual} onChange={e => set('stock_actual', Number(e.target.value))} className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none"/></div>
            <div><label className="mb-1 block text-xs font-semibold text-slate-600">Stock Mínimo</label><input type="number" value={f.stock_minimo} onChange={e => set('stock_minimo', Number(e.target.value))} className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none"/></div>
          </div>
          <div><label className="mb-1 block text-xs font-semibold text-slate-600">Proveedor</label>
            <select value={f.proveedor_id||''} onChange={e => set('proveedor_id', e.target.value ? Number(e.target.value) : null)} className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none">
              <option value="">— Sin proveedor —</option>
              {proveedores.map(p => <option key={p.id} value={p.id}>{p.nombre}</option>)}
            </select>
          </div>
          <div><label className="mb-1 block text-xs font-semibold text-slate-600">Descripción</label><textarea value={f.descripcion} onChange={e => set('descripcion', e.target.value)} rows={2} className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none resize-none"/></div>
          {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-xs text-red-700">{error}</p>}
        </div>
        <div className="sticky bottom-0 flex gap-3 border-t border-slate-200 bg-white px-5 py-4">
          <button onClick={onClose} className="flex-1 rounded-lg border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-50">Cancelar</button>
          <button onClick={submit} disabled={saving} className="flex flex-1 items-center justify-center rounded-lg px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-60" style={{backgroundColor:'var(--brand-primary)'}}>
            {saving ? 'Guardando...' : 'Guardar'}
          </button>
        </div>
      </div>
    </div>
  );
}

function OCForm({ proveedores, materiales, onClose, onSaved }: { proveedores: any[]; materiales: any[]; onClose: () => void; onSaved: () => void }) {
  const [provId, setProvId] = useState('');
  const [notas, setNotas] = useState('');
  const [items, setItems] = useState([{ material_id: '', descripcion: '', cantidad: 1, precio_unitario: 0 }]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const addItem = () => setItems(p => [...p, { material_id: '', descripcion: '', cantidad: 1, precio_unitario: 0 }]);
  const removeItem = (i: number) => setItems(p => p.filter((_,j) => j !== i));
  const setItem = (i: number, k: string, v: any) => setItems(p => p.map((item, j) => j === i ? {...item, [k]: v} : item));
  const selectMaterial = (i: number, mid: string) => {
    const mat = materiales.find(m => String(m.id) === mid);
    setItems(p => p.map((item, j) => j === i ? {...item, material_id: mid, descripcion: mat?.nombre||'', precio_unitario: mat?.precio_compra||0} : item));
  };
  const total = items.reduce((s, i) => s + (i.cantidad * i.precio_unitario), 0);
  const submit = async () => {
    if (!provId) { setError('Selecciona un proveedor'); return; }
    if (!items[0].descripcion.trim()) { setError('Agrega al menos un ítem'); return; }
    setSaving(true); setError('');
    try {
      const body = { proveedor_id: Number(provId), notas, items: items.filter(i => i.descripcion.trim()).map(i => ({...i, material_id: i.material_id ? Number(i.material_id) : null, cantidad: Number(i.cantidad), precio_unitario: Number(i.precio_unitario)})) };
      const r = await fetch(`${API}/proveedores/ordenes-compra`, { method: 'POST', headers: h(), body: JSON.stringify(body) });
      if (!r.ok) throw new Error(await r.text());
      onSaved(); onClose();
    } catch(e: any) { setError(e.message); } finally { setSaving(false); }
  };
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 sm:items-center p-4">
      <div className="w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-2xl bg-white shadow-2xl">
        <div className="sticky top-0 flex items-center justify-between border-b border-slate-200 bg-white px-5 py-4">
          <h2 className="text-base font-bold">Nueva Orden de Compra</h2>
          <button onClick={onClose} className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100"><X size={18}/></button>
        </div>
        <div className="space-y-4 p-5">
          <div><label className="mb-1 block text-xs font-semibold text-slate-600">Proveedor *</label>
            <select value={provId} onChange={e => setProvId(e.target.value)} className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none">
              <option value="">— Seleccionar proveedor —</option>
              {proveedores.map(p => <option key={p.id} value={p.id}>{p.nombre}</option>)}
            </select>
          </div>
          <div>
            <div className="mb-2 flex items-center justify-between">
              <label className="text-xs font-bold text-slate-600">ÍTEMS</label>
              <button onClick={addItem} className="flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-semibold text-white" style={{backgroundColor:'var(--brand-primary)'}}><Plus size={12}/> Agregar</button>
            </div>
            <div className="space-y-2">
              {items.map((item, i) => (
                <div key={i} className="rounded-lg border border-slate-200 p-3 space-y-2">
                  <div className="grid grid-cols-2 gap-2">
                    <div><label className="mb-0.5 block text-[11px] font-semibold text-slate-500">Material (opcional)</label>
                      <select value={item.material_id} onChange={e => selectMaterial(i, e.target.value)} className="w-full rounded-lg border border-slate-200 px-2 py-1.5 text-xs focus:outline-none">
                        <option value="">— Libre —</option>
                        {materiales.map(m => <option key={m.id} value={m.id}>{m.nombre}</option>)}
                      </select>
                    </div>
                    <div><label className="mb-0.5 block text-[11px] font-semibold text-slate-500">Descripción *</label>
                      <input value={item.descripcion} onChange={e => setItem(i, 'descripcion', e.target.value)} className="w-full rounded-lg border border-slate-200 px-2 py-1.5 text-xs focus:outline-none"/>
                    </div>
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    <div><label className="mb-0.5 block text-[11px] font-semibold text-slate-500">Cantidad</label>
                      <input type="number" min="1" value={item.cantidad} onChange={e => setItem(i, 'cantidad', Number(e.target.value))} className="w-full rounded-lg border border-slate-200 px-2 py-1.5 text-xs focus:outline-none"/>
                    </div>
                    <div><label className="mb-0.5 block text-[11px] font-semibold text-slate-500">Precio Unit.</label>
                      <input type="number" min="0" value={item.precio_unitario} onChange={e => setItem(i, 'precio_unitario', Number(e.target.value))} className="w-full rounded-lg border border-slate-200 px-2 py-1.5 text-xs focus:outline-none"/>
                    </div>
                    <div className="flex items-end">
                      <div className="flex-1 rounded-lg bg-slate-50 px-2 py-1.5 text-xs font-bold text-slate-700">{fmt(item.cantidad * item.precio_unitario)}</div>
                      {items.length > 1 && <button onClick={() => removeItem(i)} className="ml-1 rounded-lg p-1.5 text-slate-400 hover:text-red-500"><X size={14}/></button>}
                    </div>
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-2 flex justify-end"><span className="text-sm font-bold text-slate-900">Total: {fmt(total)}</span></div>
          </div>
          <div><label className="mb-1 block text-xs font-semibold text-slate-600">Notas</label>
            <textarea value={notas} onChange={e => setNotas(e.target.value)} rows={2} className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none resize-none"/></div>
          {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-xs text-red-700">{error}</p>}
        </div>
        <div className="sticky bottom-0 flex gap-3 border-t border-slate-200 bg-white px-5 py-4">
          <button onClick={onClose} className="flex-1 rounded-lg border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-50">Cancelar</button>
          <button onClick={submit} disabled={saving} className="flex flex-1 items-center justify-center rounded-lg px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-60" style={{backgroundColor:'var(--brand-primary)'}}>
            {saving ? 'Guardando...' : 'Crear OC'}
          </button>
        </div>
      </div>
    </div>
  );
}

function generarOCPDF(oc: any, tenant: any) {
  const fmt = (n: number) => '$' + n.toLocaleString('es-CL');
  const color = tenant?.branding?.primaryColor || '#7c3aed';
  const empresa = tenant?.nombre || 'ConectaWork';
  const total = (oc.items||[]).reduce((s: number, i: any) => s + i.cantidad * i.precio_unitario, 0);
  const filas = (oc.items||[]).map((i: any) => `<tr style="border-bottom:1px solid #f1f5f9"><td style="padding:8px;font-size:13px">${i.descripcion}</td><td style="padding:8px;font-size:13px;text-align:center">${i.cantidad}</td><td style="padding:8px;font-size:13px;text-align:right">${fmt(i.precio_unitario)}</td><td style="padding:8px;font-size:13px;font-weight:600;text-align:right">${fmt(i.cantidad*i.precio_unitario)}</td></tr>`).join('');
  const html = `<!DOCTYPE html><html><head><meta charset="UTF-8"><title>OC-${oc.numero}</title><style>body{font-family:-apple-system,sans-serif;padding:40px;max-width:800px;margin:0 auto}table{width:100%;border-collapse:collapse}@media print{body{print-color-adjust:exact;-webkit-print-color-adjust:exact}}</style></head><body>
<div style="display:flex;justify-content:space-between;margin-bottom:40px"><div><div style="font-size:26px;font-weight:800;color:${color}">${empresa}</div></div><div style="text-align:right"><div style="font-size:20px;font-weight:800">ORDEN DE COMPRA</div><div style="font-size:18px;font-weight:700;color:${color}">N° ${oc.numero}</div><div style="font-size:12px;color:#64748b">Estado: ${oc.estado}</div></div></div>
<div style="background:#f8fafc;border-radius:8px;padding:16px;margin-bottom:24px"><div style="font-size:11px;font-weight:700;color:#94a3b8;margin-bottom:6px">PROVEEDOR</div><div style="font-size:15px;font-weight:700">${oc.proveedor_nombre||'—'}</div></div>
<table style="margin-bottom:24px"><thead><tr style="background:${color}"><th style="padding:10px 8px;color:#fff;text-align:left;font-size:12px">DESCRIPCION</th><th style="padding:10px 8px;color:#fff;text-align:center;font-size:12px">CANT.</th><th style="padding:10px 8px;color:#fff;text-align:right;font-size:12px">PRECIO UNIT.</th><th style="padding:10px 8px;color:#fff;text-align:right;font-size:12px">TOTAL</th></tr></thead><tbody>${filas}</tbody></table>
<div style="display:flex;justify-content:flex-end"><div style="background:${color};border-radius:10px;padding:14px 22px;text-align:right"><div style="font-size:11px;color:rgba(255,255,255,0.8)">TOTAL</div><div style="font-size:22px;font-weight:800;color:#fff">${fmt(total)}</div></div></div>
${oc.notas ? `<div style="margin-top:20px;border:1px solid #e2e8f0;border-radius:8px;padding:14px"><div style="font-size:11px;font-weight:700;color:#94a3b8;margin-bottom:4px">NOTAS</div><div style="font-size:13px;color:#475569">${oc.notas}</div></div>` : ''}
</body></html>`;
  const w = window.open('', '_blank');
  if (w) { w.document.write(html); w.document.close(); setTimeout(() => w.print(), 500); }
}

export default function Proveedores({ readonly = false }: { readonly?: boolean }) {
  const [tab, setTab] = useState<Tab>('proveedores');
  const [search, setSearch] = useState('');
  const [showProvForm, setShowProvForm] = useState(false);
  const [showMatForm, setShowMatForm] = useState(false);
  const [showOCForm, setShowOCForm] = useState(false);
  const [editProv, setEditProv] = useState<any>(null);
  const [editMat, setEditMat] = useState<any>(null);
  const [ocDetalle, setOcDetalle] = useState<any>(null);
  const [ocDetalleData, setOcDetalleData] = useState<any>(null);
  const [tenant] = useState(() => { try { return JSON.parse(localStorage.getItem('tenant')||'{}'); } catch { return {}; } });

  const { data: proveedores, refetch: refProv } = useData('/proveedores/');
  const { data: materiales, refetch: refMat } = useData('/proveedores/materiales');
  const { data: ordenes, refetch: refOC } = useData('/proveedores/ordenes-compra');

  const loadOCDetalle = async (id: number) => {
    const r = await fetch(`${API}/proveedores/ordenes-compra/${id}`, { headers: h() });
    setOcDetalleData(await r.json());
    setOcDetalle(id);
  };

  const cambiarEstadoOC = async (id: number, estado: string) => {
    await fetch(`${API}/proveedores/ordenes-compra/${id}/estado`, { method: 'PATCH', headers: h(), body: JSON.stringify({estado}) });
    refOC(); if (ocDetalle) loadOCDetalle(id);
  };

  const eliminar = async (url: string, refetch: () => void) => {
    if (!confirm('¿Eliminar?')) return;
    await fetch(`${API}${url}`, { method: 'DELETE', headers: h() });
    refetch();
  };

  const filteredProv = proveedores.filter(p => p.nombre.toLowerCase().includes(search.toLowerCase()));
  const filteredMat = materiales.filter(m => m.nombre.toLowerCase().includes(search.toLowerCase()));
  const filteredOC = ordenes.filter(o => String(o.numero).includes(search) || (o.proveedor_nombre||'').toLowerCase().includes(search.toLowerCase()));
  const bajosStock = materiales.filter(m => m.stock_actual <= m.stock_minimo);

  if (ocDetalle && ocDetalleData) return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <button onClick={() => { setOcDetalle(null); setOcDetalleData(null); }} className="flex items-center gap-1 text-sm font-medium text-slate-500 hover:text-slate-800"><ArrowLeft size={15}/> Volver</button>
        <button onClick={() => generarOCPDF(ocDetalleData, tenant)} className="flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold text-white" style={{backgroundColor:'var(--brand-primary)'}}>Descargar PDF</button>
      </div>
      <div className="flex items-center justify-between">
        <div><h2 className="text-xl font-bold">OC #{ocDetalleData.numero}</h2><p className="text-sm text-slate-500">{ocDetalleData.proveedor_nombre}</p></div>
        <div className="flex gap-2">
          {['borrador','enviada','recibida','cancelada'].map(e => (
            <button key={e} onClick={() => cambiarEstadoOC(ocDetalleData.id, e)} className={`rounded-full px-3 py-1 text-xs font-semibold border transition ${ocDetalleData.estado===e ? `${ESTADOS_OC[e].bg} ${ESTADOS_OC[e].color} border-transparent` : 'border-slate-200 text-slate-500 hover:bg-slate-50'}`}>{ESTADOS_OC[e].label}</button>
          ))}
        </div>
      </div>
      <div className="rounded-xl border border-slate-200 bg-white overflow-hidden">
        <table className="w-full">
          <thead><tr className="border-b border-slate-200 bg-slate-50"><th className="px-4 py-3 text-left text-xs font-bold text-slate-600">DESCRIPCIÓN</th><th className="px-4 py-3 text-center text-xs font-bold text-slate-600">CANT.</th><th className="px-4 py-3 text-center text-xs font-bold text-slate-600">RECIBIDO</th><th className="px-4 py-3 text-right text-xs font-bold text-slate-600">PRECIO UNIT.</th><th className="px-4 py-3 text-right text-xs font-bold text-slate-600">TOTAL</th></tr></thead>
          <tbody>{(ocDetalleData.items||[]).map((i: any) => (
            <tr key={i.id} className="border-b border-slate-100">
              <td className="px-4 py-3 text-sm text-slate-800">{i.descripcion}</td>
              <td className="px-4 py-3 text-center text-sm">{i.cantidad}</td>
              <td className="px-4 py-3 text-center text-sm"><span className={`font-semibold ${i.cantidad_recibida >= i.cantidad ? 'text-emerald-600' : 'text-amber-600'}`}>{i.cantidad_recibida}</span></td>
              <td className="px-4 py-3 text-right text-sm">{fmt(i.precio_unitario)}</td>
              <td className="px-4 py-3 text-right text-sm font-bold">{fmt(i.cantidad * i.precio_unitario)}</td>
            </tr>
          ))}</tbody>
        </table>
        <div className="flex justify-end border-t border-slate-200 px-4 py-3">
          <span className="text-base font-bold">Total: {fmt((ocDetalleData.items||[]).reduce((s: number, i: any) => s + i.cantidad * i.precio_unitario, 0))}</span>
        </div>
      </div>
      {ocDetalleData.notas && <div className="rounded-xl border border-slate-200 bg-white p-4"><p className="text-xs font-bold text-slate-500 mb-1">NOTAS</p><p className="text-sm text-slate-700">{ocDetalleData.notas}</p></div>}
    </div>
  );

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between gap-3">
        <div><h1 className="text-2xl font-bold text-slate-900">Proveedores</h1>
          {bajosStock.length > 0 && <p className="flex items-center gap-1 text-xs text-amber-600"><AlertTriangle size={12}/> {bajosStock.length} material{bajosStock.length>1?'es':''} bajo stock mínimo</p>}
        </div>
        {!readonly && (
          <div className="flex gap-2">
            {tab==='proveedores' && <button onClick={() => { setEditProv(null); setShowProvForm(true); }} className="flex items-center gap-1.5 rounded-xl px-3 py-2 text-sm font-semibold text-white" style={{backgroundColor:'var(--brand-primary)'}}><Plus size={15}/> Proveedor</button>}
            {tab==='materiales' && <button onClick={() => { setEditMat(null); setShowMatForm(true); }} className="flex items-center gap-1.5 rounded-xl px-3 py-2 text-sm font-semibold text-white" style={{backgroundColor:'var(--brand-primary)'}}><Plus size={15}/> Material</button>}
            {tab==='ordenes' && <button onClick={() => setShowOCForm(true)} className="flex items-center gap-1.5 rounded-xl px-3 py-2 text-sm font-semibold text-white" style={{backgroundColor:'var(--brand-primary)'}}><Plus size={15}/> Nueva OC</button>}
          </div>
        )}
      </div>

      <div className="flex gap-1 rounded-xl border border-slate-200 bg-slate-50 p-1">
        {([['proveedores','Proveedores',<Truck size={15}/>],['materiales','Materiales',<Package size={15}/>],['ordenes','Órdenes de Compra',<ShoppingCart size={15}/>]] as any[]).map(([key,label,icon]) => (
          <button key={key} onClick={() => setTab(key)} className={`flex flex-1 items-center justify-center gap-1.5 rounded-lg py-2 text-xs font-semibold transition ${tab===key?'bg-white text-slate-900 shadow-sm':'text-slate-500 hover:text-slate-700'}`}>{icon}{label}</button>
        ))}
      </div>

      <div className="relative"><Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"/><input value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar..." className="w-full rounded-xl border border-slate-200 bg-white py-2.5 pl-9 pr-4 text-sm focus:outline-none"/></div>

      {tab==='proveedores' && (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {filteredProv.length===0 ? <div className="col-span-3 py-14 text-center text-slate-400 text-sm">No hay proveedores</div> :
          filteredProv.map(p => (
            <div key={p.id} className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
              <div className="flex items-start justify-between">
                <div><p className="font-bold text-slate-900">{p.nombre}</p><span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-semibold text-slate-600">{p.categoria}</span></div>
                {!readonly && <div className="flex gap-1"><button onClick={() => { setEditProv(p); setShowProvForm(true); }} className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100"><Edit2 size={13}/></button><button onClick={() => eliminar(`/proveedores/${p.id}`, refProv)} className="rounded-lg p-1.5 text-slate-400 hover:text-red-500"><Trash2 size={13}/></button></div>}
              </div>
              <div className="mt-2 space-y-1 text-xs text-slate-600">
                {p.rut && <p>RUT: {p.rut}</p>}
                {p.telefono && <p>📞 {p.telefono}</p>}
                {p.email && <p>✉️ {p.email}</p>}
                {p.contacto_nombre && <p>👤 {p.contacto_nombre}{p.contacto_telefono ? ` · ${p.contacto_telefono}` : ''}</p>}
                {p.banco && <p>🏦 {p.banco} · {p.tipo_cuenta} {p.numero_cuenta}</p>}
              </div>
            </div>
          ))}
        </div>
      )}

      {tab==='materiales' && (
        <div className="rounded-xl border border-slate-200 bg-white overflow-hidden">
          {filteredMat.length===0 ? <div className="py-14 text-center text-slate-400 text-sm">No hay materiales</div> :
          <table className="w-full">
            <thead><tr className="border-b border-slate-200 bg-slate-50">
              <th className="px-4 py-3 text-left text-xs font-bold text-slate-600">NOMBRE</th>
              <th className="px-4 py-3 text-left text-xs font-bold text-slate-600">PROVEEDOR</th>
              <th className="px-4 py-3 text-center text-xs font-bold text-slate-600">STOCK</th>
              <th className="px-4 py-3 text-right text-xs font-bold text-slate-600">P. COMPRA</th>
              <th className="px-4 py-3 text-right text-xs font-bold text-slate-600">P. VENTA</th>
              {!readonly && <th className="px-4 py-3"/>}
            </tr></thead>
            <tbody>{filteredMat.map(m => (
              <tr key={m.id} className="border-b border-slate-100 hover:bg-slate-50">
                <td className="px-4 py-3"><p className="text-sm font-semibold text-slate-800">{m.nombre}</p>{m.sku && <p className="text-xs text-slate-400">SKU: {m.sku}</p>}</td>
                <td className="px-4 py-3 text-xs text-slate-600">{m.proveedor_nombre||'—'}</td>
                <td className="px-4 py-3 text-center"><span className={`rounded-full px-2 py-0.5 text-xs font-bold ${m.stock_actual <= m.stock_minimo ? 'bg-red-100 text-red-700' : 'bg-emerald-100 text-emerald-700'}`}>{m.stock_actual} {m.unidad}</span></td>
                <td className="px-4 py-3 text-right text-sm">{fmt(m.precio_compra)}</td>
                <td className="px-4 py-3 text-right text-sm font-semibold">{fmt(m.precio_venta)}</td>
                {!readonly && <td className="px-4 py-3"><div className="flex justify-end gap-1"><button onClick={() => { setEditMat(m); setShowMatForm(true); }} className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100"><Edit2 size={13}/></button><button onClick={() => eliminar(`/proveedores/materiales/${m.id}`, refMat)} className="rounded-lg p-1.5 text-slate-400 hover:text-red-500"><Trash2 size={13}/></button></div></td>}
              </tr>
            ))}</tbody>
          </table>}
        </div>
      )}

      {tab==='ordenes' && (
        <div className="space-y-2">
          {filteredOC.length===0 ? <div className="py-14 text-center text-slate-400 text-sm">No hay órdenes de compra</div> :
          filteredOC.map(oc => {
            const cfg = ESTADOS_OC[oc.estado] || ESTADOS_OC.borrador;
            return (
              <div key={oc.id} onClick={() => loadOCDetalle(oc.id)} className="flex cursor-pointer items-center gap-4 rounded-xl border border-slate-200 bg-white p-4 hover:shadow-md transition">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-sm font-bold text-white" style={{backgroundColor:'var(--brand-primary)'}}>#{oc.numero}</div>
                <div className="flex-1"><p className="font-semibold text-slate-900">{oc.proveedor_nombre}</p><p className="text-xs text-slate-500">{new Date(oc.created_at).toLocaleDateString('es-CL')}</p></div>
                <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${cfg.bg} ${cfg.color}`}>{cfg.label}</span>
                <ChevronRight size={16} className="text-slate-400"/>
              </div>
            );
          })}
        </div>
      )}

      {showProvForm && <ProveedorForm editando={editProv} onClose={() => setShowProvForm(false)} onSaved={refProv}/>}
      {showMatForm && <MaterialForm editando={editMat} proveedores={proveedores} onClose={() => setShowMatForm(false)} onSaved={refMat}/>}
      {showOCForm && <OCForm proveedores={proveedores} materiales={materiales} onClose={() => setShowOCForm(false)} onSaved={refOC}/>}
    </div>
  );
}
