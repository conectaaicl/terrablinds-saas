import { useState, useEffect } from 'react';
import { getAccessToken } from '../../services/api';
import { Plus, X, TrendingUp, TrendingDown, Wallet } from 'lucide-react';

type Movimiento = { id: number; tipo: 'ingreso'|'egreso'; categoria: string; monto: number; descripcion: string; referencia?: string; responsable_nombre: string; saldo_despues: number; created_at: string };
type Saldo = { saldo_actual: number; total_ingresos: number; total_egresos: number; movimientos_mes: number };

const CATEGORIAS = ['materiales','transporte','alimentacion','limpieza','oficina','servicios','reembolso','otro'];
const inputCls = 'w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-rose-400 focus:outline-none';
function authH() { return { 'Content-Type': 'application/json', Authorization: `Bearer ${getAccessToken()||''}` }; }
function fmt(n: number) { return `$${n.toLocaleString('es-CL')}`; }

export default function CajaChica() {
  const [saldo, setSaldo] = useState<Saldo|null>(null);
  const [movimientos, setMovimientos] = useState<Movimiento[]>([]);
  const [loading, setLoading] = useState(true);
  const [showNew, setShowNew] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [form, setForm] = useState({ tipo:'egreso', categoria:'otro', monto:'', descripcion:'', referencia:'' });

  useEffect(() => {
    Promise.all([
      fetch('/api/v1/caja-chica/saldo', { headers: authH() }).then(r => r.json()),
      fetch('/api/v1/caja-chica/movimientos', { headers: authH() }).then(r => r.json()),
    ]).then(([s, m]) => {
      setSaldo(s);
      setMovimientos(Array.isArray(m) ? m : []);
    }).catch(() => {}).finally(() => setLoading(false));
  }, []);

  async function crear() {
    if (!form.monto || !form.descripcion) { setError('Completa monto y descripción'); return; }
    setSaving(true);
    try {
      const res = await fetch('/api/v1/caja-chica/movimientos', { method:'POST', headers: authH(), body: JSON.stringify({ ...form, monto: Number(form.monto) }) });
      if (!res.ok) throw new Error((await res.json()).detail);
      // refetch
      const [s, m] = await Promise.all([
        fetch('/api/v1/caja-chica/saldo', { headers: authH() }).then(r => r.json()),
        fetch('/api/v1/caja-chica/movimientos', { headers: authH() }).then(r => r.json()),
      ]);
      setSaldo(s); setMovimientos(Array.isArray(m) ? m : []);
      setShowNew(false);
      setForm({ tipo:'egreso', categoria:'otro', monto:'', descripcion:'', referencia:'' });
    } catch (e: any) { setError(e.message); } finally { setSaving(false); }
  }

  if (loading) return <div className="flex h-64 items-center justify-center text-slate-400">Cargando...</div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Caja Chica</h1>
          <p className="text-sm text-slate-500">{movimientos.length} movimientos este mes</p>
        </div>
        <button onClick={() => setShowNew(true)} className="flex items-center gap-2 rounded-xl bg-rose-500 px-4 py-2 text-sm font-semibold text-white hover:bg-rose-600">
          <Plus size={16}/> Nuevo Movimiento
        </button>
      </div>

      {error && <div className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-600 flex justify-between">{error}<button onClick={()=>setError('')} className="font-bold">✕</button></div>}

      {/* Cards de saldo */}
      {saldo && (
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          <div className="rounded-2xl bg-white border border-slate-100 shadow-sm p-5">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100"><Wallet size={20} className="text-slate-600"/></div>
              <div>
                <p className="text-xs text-slate-400">Saldo actual</p>
                <p className="text-xl font-bold text-slate-800">{fmt(saldo.saldo_actual)}</p>
              </div>
            </div>
          </div>
          <div className="rounded-2xl bg-white border border-slate-100 shadow-sm p-5">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-50"><TrendingUp size={20} className="text-emerald-600"/></div>
              <div>
                <p className="text-xs text-slate-400">Ingresos (mes)</p>
                <p className="text-xl font-bold text-emerald-700">{fmt(saldo.total_ingresos)}</p>
              </div>
            </div>
          </div>
          <div className="rounded-2xl bg-white border border-slate-100 shadow-sm p-5">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-red-50"><TrendingDown size={20} className="text-red-500"/></div>
              <div>
                <p className="text-xs text-slate-400">Egresos (mes)</p>
                <p className="text-xl font-bold text-red-600">{fmt(saldo.total_egresos)}</p>
              </div>
            </div>
          </div>
          <div className="rounded-2xl bg-white border border-slate-100 shadow-sm p-5">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50">
                <span className="text-lg font-bold text-blue-600">#</span>
              </div>
              <div>
                <p className="text-xs text-slate-400">Movimientos</p>
                <p className="text-xl font-bold text-slate-800">{saldo.movimientos_mes}</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tabla movimientos */}
      <div className="rounded-2xl bg-white border border-slate-100 shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-50">
          <h2 className="text-sm font-semibold text-slate-700">Movimientos</h2>
        </div>
        {movimientos.length === 0 ? (
          <div className="py-12 text-center text-slate-400">Sin movimientos registrados</div>
        ) : (
          <div className="divide-y divide-slate-50">
            {movimientos.map(mov => (
              <div key={mov.id} className="flex items-center gap-4 px-5 py-3.5 hover:bg-slate-50/50">
                <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${mov.tipo==='ingreso'?'bg-emerald-50':'bg-red-50'}`}>
                  {mov.tipo==='ingreso' ? <TrendingUp size={16} className="text-emerald-600"/> : <TrendingDown size={16} className="text-red-500"/>}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-slate-800 truncate">{mov.descripcion}</p>
                  <p className="text-xs text-slate-400">{mov.categoria} · {mov.responsable_nombre || 'Sistema'} · {new Date(mov.created_at).toLocaleDateString('es-CL')}</p>
                </div>
                <div className="text-right shrink-0">
                  <p className={`text-sm font-bold ${mov.tipo==='ingreso'?'text-emerald-700':'text-red-600'}`}>
                    {mov.tipo==='ingreso'?'+':'-'}{fmt(mov.monto)}
                  </p>
                  <p className="text-xs text-slate-400">Saldo: {fmt(mov.saldo_despues)}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {showNew && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-md rounded-2xl bg-white shadow-xl">
            <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
              <h2 className="text-base font-semibold text-slate-800">Nuevo Movimiento</h2>
              <button onClick={() => setShowNew(false)} className="text-slate-400 hover:text-slate-600"><X size={18}/></button>
            </div>
            <div className="px-6 py-5 space-y-3">
              <div><label className="mb-1 block text-xs font-medium text-slate-600">Tipo</label>
                <div className="grid grid-cols-2 gap-2">
                  {(['egreso','ingreso'] as const).map(t=>(
                    <button key={t} onClick={()=>setForm(p=>({...p,tipo:t}))}
                      className={`rounded-lg border py-2 text-sm font-medium transition-colors ${form.tipo===t?(t==='ingreso'?'border-emerald-400 bg-emerald-50 text-emerald-700':'border-red-400 bg-red-50 text-red-600'):'border-slate-200 text-slate-500 hover:bg-slate-50'}`}>
                      {t==='ingreso'?'↑ Ingreso':'↓ Egreso'}
                    </button>
                  ))}
                </div>
              </div>
              <div><label className="mb-1 block text-xs font-medium text-slate-600">Categoría</label>
                <select className={inputCls} value={form.categoria} onChange={e=>setForm(p=>({...p,categoria:e.target.value}))}>
                  {CATEGORIAS.map(c=><option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div><label className="mb-1 block text-xs font-medium text-slate-600">Monto (CLP) *</label><input className={inputCls} type="number" min="1" value={form.monto} onChange={e=>setForm(p=>({...p,monto:e.target.value}))}/></div>
              <div><label className="mb-1 block text-xs font-medium text-slate-600">Descripción *</label><input className={inputCls} value={form.descripcion} onChange={e=>setForm(p=>({...p,descripcion:e.target.value}))}/></div>
              <div><label className="mb-1 block text-xs font-medium text-slate-600">Referencia / N° boleta</label><input className={inputCls} value={form.referencia} onChange={e=>setForm(p=>({...p,referencia:e.target.value}))}/></div>
              <div className="flex justify-end gap-2 pt-2">
                <button onClick={()=>setShowNew(false)} className="rounded-lg border border-slate-200 px-4 py-2 text-sm text-slate-600 hover:bg-slate-50">Cancelar</button>
                <button onClick={crear} disabled={saving} className="rounded-lg bg-rose-500 px-4 py-2 text-sm font-semibold text-white hover:bg-rose-600 disabled:opacity-60">{saving?'Guardando...':'Guardar'}</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
