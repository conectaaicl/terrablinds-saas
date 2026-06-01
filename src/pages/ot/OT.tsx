import { useState, useEffect } from 'react';
import { getAccessToken } from '../../services/api';
import { Plus, X, ChevronDown, ChevronUp, AlertTriangle, Wrench, Truck, CheckCircle, Clock, XCircle, Filter, Trash2 } from 'lucide-react';

type OT = {
  id: number; numero: int; numero_ot: string; estado: string; prioridad: string;
  cliente_nombre?: string; cliente_direccion?: string; cliente_direccion_ot?: string;
  cliente_telefono?: string; vendedor_nombre?: string; creado_por_nombre?: string;
  notas_fabricacion?: string; notas_instalacion?: string; materiales?: string;
  fecha_entrega?: string; fecha_instalacion?: string; precio_total: number;
  productos: any[]; historial: any[]; cotizacion_id?: string; created_at: string;
};

type Cotizacion = {
  id: number; numero: number; estado: string; precio_total: number;
  cliente_nombre?: string; productos: any[]; notas?: string;
  cliente_id: number;
};

const ESTADOS: Record<string, { label: string; color: string; bg: string; dot: string; icon: React.ReactNode }> = {
  pendiente:        { label: 'Pendiente',        color: 'text-amber-700',   bg: 'bg-amber-50',   dot: 'bg-amber-400',   icon: <Clock size={14}/> },
  aprobada:         { label: 'Aprobada',          color: 'text-blue-700',    bg: 'bg-blue-50',    dot: 'bg-blue-500',    icon: <CheckCircle size={14}/> },
  en_fabricacion:   { label: 'En Fabricación',    color: 'text-violet-700',  bg: 'bg-violet-50',  dot: 'bg-violet-500',  icon: <Wrench size={14}/> },
  lista_instalacion:{ label: 'Lista p/ Instalar', color: 'text-orange-700',  bg: 'bg-orange-50',  dot: 'bg-orange-400',  icon: <Truck size={14}/> },
  instalada:        { label: 'Instalada',         color: 'text-emerald-700', bg: 'bg-emerald-50', dot: 'bg-emerald-500', icon: <CheckCircle size={14}/> },
  cancelada:        { label: 'Cancelada',         color: 'text-red-700',     bg: 'bg-red-50',     dot: 'bg-red-500',     icon: <XCircle size={14}/> },
};

const PRIORIDAD_COLOR: Record<string, string> = {
  alta:  'bg-red-100 text-red-700',
  media: 'bg-amber-100 text-amber-700',
  baja:  'bg-slate-100 text-slate-600',
};

const SEMAFORO = ['pendiente','aprobada','en_fabricacion','lista_instalacion','instalada'];

// Transiciones permitidas por rol
function getTransiciones(estado: string, rol: string): string[] {
  const esJefeCoord = ['jefe','gerente','coordinador','superadmin'].includes(rol);
  const esFabricante = rol === 'fabricante';
  const esInstalador = rol === 'instalador';
  switch(estado) {
    case 'pendiente':         return esJefeCoord ? ['aprobada','cancelada'] : [];
    case 'aprobada':          return esFabricante ? ['en_fabricacion'] : esJefeCoord ? ['en_fabricacion','cancelada'] : [];
    case 'en_fabricacion':    return esFabricante ? ['lista_instalacion'] : esJefeCoord ? ['lista_instalacion'] : [];
    case 'lista_instalacion': return esInstalador ? ['instalada'] : esJefeCoord ? ['instalada'] : [];
    default: return [];
  }
}

function authH() { return { 'Content-Type': 'application/json', Authorization: `Bearer ${getAccessToken()||''}` }; }
function fmt(n: number) { return `$${n.toLocaleString('es-CL')}`; }
const inputCls = 'w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-rose-400 focus:outline-none';

function Semaforo({ estado }: { estado: string }) {
  const idx = SEMAFORO.indexOf(estado);
  return (
    <div className="flex items-center gap-1">
      {SEMAFORO.map((e, i) => {
        const cfg = ESTADOS[e];
        const active = i <= idx && estado !== 'cancelada';
        return (
          <div key={e} className="flex items-center gap-1">
            <div className={`h-3 w-3 rounded-full transition-all ${active ? cfg.dot : 'bg-slate-200'}`} title={cfg.label}/>
            {i < SEMAFORO.length - 1 && <div className={`h-0.5 w-4 ${active && i < idx ? cfg.dot : 'bg-slate-200'}`}/>}
          </div>
        );
      })}
    </div>
  );
}

function EstadoBadge({ estado }: { estado: string }) {
  const cfg = ESTADOS[estado] || { label: estado, color: 'text-slate-600', bg: 'bg-slate-100', dot: 'bg-slate-400', icon: null };
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ${cfg.bg} ${cfg.color}`}>
      {cfg.icon} {cfg.label}
    </span>
  );
}

export default function OT({ userRol }: { userRol?: string }) {
  const [ots, setOTs] = useState<OT[]>([]);
  const [cotizaciones, setCotizaciones] = useState<Cotizacion[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<number|null>(null);
  const [showNew, setShowNew] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [filtroEstado, setFiltroEstado] = useState('todos');
  const [showEstadoModal, setShowEstadoModal] = useState<{id:number;estado:string}|null>(null);
  const [notasEstado, setNotasEstado] = useState('');
  const [notaFabrica, setNotaFabrica] = useState<{id:number;texto:string}|null>(null);
  const [savingNota, setSavingNota] = useState(false);

  const [form, setForm] = useState({
    order_id: '', prioridad: 'media', notas_fabricacion: '',
    notas_instalacion: '', materiales: '', fecha_entrega: '',
    fecha_instalacion: '', cliente_telefono: '', cliente_direccion_ot: '',
  });

  const rol = userRol || 'jefe';
  const esJefeCoord = ['jefe','gerente','coordinador','superadmin'].includes(rol);

  useEffect(() => {
    Promise.all([
      fetch('/api/v1/orders/ot', { headers: authH() }).then(r => r.json()),
      esJefeCoord ? fetch('/api/v1/orders/', { headers: authH() }).then(r => r.json()) : Promise.resolve([]),
    ]).then(([o, c]) => {
      setOTs(Array.isArray(o) ? o : []);
      const cots = Array.isArray(c) ? c : [];
      setCotizaciones(cots.filter((ct: any) => ['cotizado','cotizacion_enviada','confirmado'].includes(ct.estado)));
    }).catch(() => {}).finally(() => setLoading(false));
  }, []);

  async function crearOT() {
    if (!form.cotizacion_id && !form.order_id) { setError('Selecciona una cotización'); return; }
    setSaving(true);
    try {
      const body: any = { ...form };
      if (!body.fecha_entrega) delete body.fecha_entrega;
      if (!body.fecha_instalacion) delete body.fecha_instalacion;
      // Renombrar order_id -> cotizacion_id para el backend
      body.cotizacion_id = String(body.order_id);
      delete body.order_id;
      const res = await fetch('/api/v1/orders/ot', { method: 'POST', headers: authH(), body: JSON.stringify(body) });
      if (!res.ok) throw new Error((await res.json()).detail);
      const nueva = await res.json();
      setOTs(p => [nueva, ...p]);
      setShowNew(false);
      setForm({ cotizacion_id:'', prioridad:'media', notas_fabricacion:'', notas_instalacion:'', materiales:'', fecha_entrega:'', fecha_instalacion:'', cliente_telefono:'', cliente_direccion_ot:'' });
    } catch(e: any) { setError(e.message); } finally { setSaving(false); }
  }

  async function cambiarEstado(id: number, estado: string) {
    try {
      const res = await fetch(`/api/v1/orders/ot/${id}/estado`, { method: 'PATCH', headers: authH(), body: JSON.stringify({ estado, notas: notasEstado || undefined }) });
      if (!res.ok) throw new Error((await res.json()).detail);
      const updated = await res.json();
      setOTs(p => p.map(o => o.id === id ? updated : o));
      setShowEstadoModal(null);
      setNotasEstado('');
    } catch(e: any) { setError(e.message); }
  }

  async function guardarNotaFabrica(id: number, nota: string) {
    setSavingNota(true);
    try {
      const res = await fetch(`/api/v1/orders/ot/${id}/estado`, {
        method: 'PATCH', headers: authH(),
        body: JSON.stringify({ estado: ots.find(o=>o.id===id)?.estado, notas: nota })
      });
      if (!res.ok) throw new Error((await res.json()).detail);
      const updated = await res.json();
      setOTs(p => p.map(o => o.id === id ? updated : o));
      setNotaFabrica(null);
    } catch(e: any) { setError(e.message); } finally { setSavingNota(false); }
  }

  async function eliminarOT(id: number) {
    if (!confirm('¿Eliminar esta OT? Esta acción no se puede deshacer.')) return;
    try {
      await fetch(`/api/v1/orders/${id}`, { method: 'DELETE', headers: authH() });
      setOTs(p => p.filter(o => o.id !== id));
    } catch(e: any) { setError(e.message); }
  }

  const otsFiltradas = filtroEstado === 'todos' ? ots : ots.filter(o => o.estado === filtroEstado);

  if (loading) return <div className="flex h-64 items-center justify-center text-slate-400">Cargando...</div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Órdenes de Trabajo</h1>
          <p className="text-sm text-slate-500">{ots.length} OT · {ots.filter(o=>o.estado==='pendiente').length} pendientes</p>
        </div>
        {esJefeCoord && (
          <button onClick={() => setShowNew(true)} className="flex items-center gap-2 rounded-xl bg-rose-500 px-4 py-2 text-sm font-semibold text-white hover:bg-rose-600">
            <Plus size={16}/> Nueva OT
          </button>
        )}
      </div>

      {error && <div className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-600 flex justify-between">{error}<button onClick={()=>setError('')} className="font-bold">✕</button></div>}

      {/* Filtros */}
      <div className="flex gap-2 flex-wrap">
        {['todos',...Object.keys(ESTADOS)].map(e => (
          <button key={e} onClick={() => setFiltroEstado(e)}
            className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${filtroEstado===e?'bg-slate-800 text-white':'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'}`}>
            {e==='todos'?'Todos':ESTADOS[e]?.label}
            {e!=='todos' && <span className="ml-1.5 rounded-full bg-white/20 px-1.5">{ots.filter(o=>o.estado===e).length}</span>}
          </button>
        ))}
      </div>

      {/* Lista OTs */}
      <div className="space-y-3">
        {otsFiltradas.length===0 && <div className="rounded-xl border border-dashed border-slate-200 py-12 text-center text-slate-400">No hay órdenes de trabajo</div>}
        {otsFiltradas.map(ot => (
          <div key={ot.id} className="rounded-xl border border-slate-100 bg-white shadow-sm">
            <div className="flex items-center gap-4 px-5 py-4 cursor-pointer" onClick={() => setExpanded(expanded===ot.id?null:ot.id)}>
              {/* Prioridad dot */}
              <div className={`h-2.5 w-2.5 shrink-0 rounded-full ${ot.prioridad==='alta'?'bg-red-500':ot.prioridad==='media'?'bg-amber-400':'bg-slate-300'}`} title={`Prioridad ${ot.prioridad}`}/>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-bold text-slate-800">{ot.numero_ot}</span>
                  <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${PRIORIDAD_COLOR[ot.prioridad]||''}`}>{ot.prioridad}</span>
                  <EstadoBadge estado={ot.estado}/>
                </div>
                <p className="mt-0.5 text-sm text-slate-500 truncate">{ot.cliente_nombre} · {ot.cliente_direccion_ot || ot.cliente_direccion}</p>
                <div className="mt-1.5"><Semaforo estado={ot.estado}/></div>
              </div>
              <div className="text-right shrink-0">
                <p className="text-sm font-bold text-slate-700">{fmt(ot.precio_total)}</p>
                {ot.fecha_entrega && <p className="text-xs text-slate-400">Entrega: {ot.fecha_entrega}</p>}
              </div>
              {esJefeCoord && (
                <button onClick={(e) => { e.stopPropagation(); eliminarOT(ot.id); }}
                  className="text-slate-300 hover:text-red-500 transition shrink-0">
                  <Trash2 size={15}/>
                </button>
              )}
              {expanded===ot.id ? <ChevronUp size={16} className="text-slate-400 shrink-0"/> : <ChevronDown size={16} className="text-slate-400 shrink-0"/>}
            </div>

            {expanded===ot.id && (
              <div className="border-t border-slate-50 px-5 pb-5 pt-4 space-y-4">
                {/* Info cliente */}
                <div className="grid grid-cols-2 gap-3 text-sm">
                  {ot.cliente_telefono && <div><span className="text-slate-400">Tel: </span><span className="text-slate-700">{ot.cliente_telefono}</span></div>}
                  {ot.vendedor_nombre && <div><span className="text-slate-400">Vendedor: </span><span className="text-slate-700">{ot.vendedor_nombre}</span></div>}
                  {ot.creado_por_nombre && <div><span className="text-slate-400">Creado por: </span><span className="text-slate-700">{ot.creado_por_nombre}</span></div>}
                  {ot.fecha_instalacion && <div><span className="text-slate-400">Instalación: </span><span className="text-slate-700">{ot.fecha_instalacion}</span></div>}
                </div>

                {/* Productos */}
                {ot.productos?.length > 0 && (
                  <div>
                    <p className="mb-2 text-xs font-semibold uppercase text-slate-500">Productos</p>
                    <div className="space-y-1">
                      {ot.productos.map((p: any, i: number) => (
                        <div key={i} className="flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2 text-xs">
                          <span className="text-slate-700">{p.tipo} {p.ancho}×{p.alto}cm — {p.tela} {p.color}</span>
                          {p.ubicacion && <span className="text-slate-400">{p.ubicacion}</span>}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Notas fabricación */}
                {ot.notas_fabricacion && (
                  <div className="rounded-lg border-l-4 border-violet-400 bg-violet-50 px-4 py-3">
                    <p className="mb-1 text-xs font-bold uppercase text-violet-600">Notas Fabricación</p>
                    <p className="text-sm text-violet-800 whitespace-pre-line">{ot.notas_fabricacion}</p>
                  </div>
                )}

                {/* Notas instalación */}
                {ot.notas_instalacion && (
                  <div className="rounded-lg border-l-4 border-blue-400 bg-blue-50 px-4 py-3">
                    <p className="mb-1 text-xs font-bold uppercase text-blue-600">Notas Instalación</p>
                    <p className="text-sm text-blue-800 whitespace-pre-line">{ot.notas_instalacion}</p>
                  </div>
                )}

                {/* Materiales */}
                {ot.materiales && (
                  <div className="rounded-lg border-l-4 border-amber-400 bg-amber-50 px-4 py-3">
                    <p className="mb-1 text-xs font-bold uppercase text-amber-600">Materiales</p>
                    <p className="text-sm text-amber-800 whitespace-pre-line">{ot.materiales}</p>
                  </div>
                )}

                {/* Acciones de estado */}
                <div className="flex gap-2 flex-wrap pt-1">
                  {getTransiciones(ot.estado, rol).map(sig => {
                    const cfg = ESTADOS[sig];
                    return (
                      <button key={sig} onClick={() => { setShowEstadoModal({id:ot.id, estado:sig}); setNotasEstado(''); }}
                        className={`flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-semibold ${cfg?.bg} ${cfg?.color} border border-current/20 hover:opacity-80`}>
                        {cfg?.icon} → {cfg?.label}
                      </button>
                    );
                  })}
                  {rol === 'fabricante' && (
                    <button onClick={() => setNotaFabrica({id:ot.id, texto:''})}
                      className="flex items-center gap-1.5 rounded-lg bg-slate-50 border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100">
                      ✏️ Agregar nota
                    </button>
                  )}
                </div>

                {/* Historial */}
                {ot.historial?.length > 0 && (
                  <div>
                    <p className="mb-2 text-xs font-semibold uppercase text-slate-400">Historial</p>
                    <div className="space-y-1">
                      {ot.historial.map((h: any, i: number) => (
                        <div key={i} className="flex items-center gap-2 text-xs text-slate-500">
                          <div className={`h-1.5 w-1.5 rounded-full shrink-0 ${ESTADOS[h.estado]?.dot||'bg-slate-300'}`}/>
                          <span>{ESTADOS[h.estado]?.label||h.estado}</span>
                          <span className="text-slate-300">·</span>
                          <span>{h.usuario_nombre||'Sistema'}</span>
                          {h.notas && <span className="text-slate-400 italic">— {h.notas}</span>}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Modal nueva OT */}
      {showNew && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-lg rounded-2xl bg-white shadow-xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
              <h2 className="text-base font-semibold text-slate-800">Nueva Orden de Trabajo</h2>
              <button onClick={()=>setShowNew(false)} className="text-slate-400 hover:text-slate-600"><X size={18}/></button>
            </div>
            <div className="px-6 py-5 space-y-3">
              <div><label className="mb-1 block text-xs font-medium text-slate-600">Cotización *</label>
                <select className={inputCls} value={form.order_id} onChange={e=>setForm(p=>({...p,order_id:e.target.value}))}>
                  <option value="">Seleccionar cotización...</option>
                  {cotizaciones.map(c=>(
                    <option key={c.id} value={c.id}>#{c.numero} — {c.cliente_nombre} — {fmt(c.precio_total)}</option>
                  ))}
                </select>
              </div>
              <div><label className="mb-1 block text-xs font-medium text-slate-600">Prioridad</label>
                <div className="grid grid-cols-3 gap-2">
                  {['baja','media','alta'].map(p=>(
                    <button key={p} onClick={()=>setForm(f=>({...f,prioridad:p}))}
                      className={`rounded-lg border py-2 text-xs font-semibold capitalize transition ${form.prioridad===p?PRIORIDAD_COLOR[p]+' border-current':'border-slate-200 text-slate-500'}`}>
                      {p==='alta'?'🔴':p==='media'?'🟡':'🟢'} {p}
                    </button>
                  ))}
                </div>
              </div>
              <div><label className="mb-1 block text-xs font-medium text-slate-600">Teléfono cliente</label><input className={inputCls} value={form.cliente_telefono} onChange={e=>setForm(p=>({...p,cliente_telefono:e.target.value}))}/></div>
              <div><label className="mb-1 block text-xs font-medium text-slate-600">Dirección instalación</label><input className={inputCls} value={form.cliente_direccion_ot} onChange={e=>setForm(p=>({...p,cliente_direccion_ot:e.target.value}))}/></div>
              <div className="grid grid-cols-2 gap-3">
                <div><label className="mb-1 block text-xs font-medium text-slate-600">Fecha entrega</label><input className={inputCls} type="date" value={form.fecha_entrega} onChange={e=>setForm(p=>({...p,fecha_entrega:e.target.value}))}/></div>
                <div><label className="mb-1 block text-xs font-medium text-slate-600">Fecha instalación</label><input className={inputCls} type="date" value={form.fecha_instalacion} onChange={e=>setForm(p=>({...p,fecha_instalacion:e.target.value}))}/></div>
              </div>
              <div><label className="mb-1 block text-xs font-medium text-slate-600">Notas para Fabricación</label><textarea className={inputCls} rows={3} placeholder="Instrucciones para el fabricante..." value={form.notas_fabricacion} onChange={e=>setForm(p=>({...p,notas_fabricacion:e.target.value}))}/></div>
              <div><label className="mb-1 block text-xs font-medium text-slate-600">Notas para Instalación</label><textarea className={inputCls} rows={3} placeholder="Instrucciones para el instalador..." value={form.notas_instalacion} onChange={e=>setForm(p=>({...p,notas_instalacion:e.target.value}))}/></div>
              <div><label className="mb-1 block text-xs font-medium text-slate-600">Materiales requeridos</label><textarea className={inputCls} rows={2} placeholder="Lista de materiales..." value={form.materiales} onChange={e=>setForm(p=>({...p,materiales:e.target.value}))}/></div>
              {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-xs text-red-600">{error}</p>}
              <div className="flex justify-end gap-2 pt-2">
                <button onClick={()=>setShowNew(false)} className="rounded-lg border border-slate-200 px-4 py-2 text-sm text-slate-600 hover:bg-slate-50">Cancelar</button>
                <button onClick={crearOT} disabled={saving} className="rounded-lg bg-rose-500 px-4 py-2 text-sm font-semibold text-white hover:bg-rose-600 disabled:opacity-60">{saving?'Creando...':'Crear OT'}</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal nota fabricante */}
      {notaFabrica && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-sm rounded-2xl bg-white shadow-xl">
            <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
              <h2 className="text-base font-semibold text-slate-800">Agregar nota</h2>
              <button onClick={()=>setNotaFabrica(null)} className="text-slate-400"><X size={18}/></button>
            </div>
            <div className="px-6 py-4 space-y-3">
              <textarea className={inputCls} rows={4} value={notaFabrica.texto}
                onChange={e=>setNotaFabrica(p=>p?{...p,texto:e.target.value}:null)}
                placeholder="Observación sobre esta OT..."/>
              <div className="flex justify-end gap-2">
                <button onClick={()=>setNotaFabrica(null)} className="rounded-lg border border-slate-200 px-4 py-2 text-sm text-slate-600">Cancelar</button>
                <button onClick={()=>guardarNotaFabrica(notaFabrica.id, notaFabrica.texto)} disabled={savingNota||!notaFabrica.texto}
                  className="rounded-lg bg-violet-500 px-4 py-2 text-sm font-semibold text-white hover:bg-violet-600 disabled:opacity-60">
                  {savingNota?'Guardando...':'Guardar nota'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal cambio estado */}
      {showEstadoModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-sm rounded-2xl bg-white shadow-xl">
            <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
              <h2 className="text-base font-semibold text-slate-800">Cambiar estado → {ESTADOS[showEstadoModal.estado]?.label}</h2>
              <button onClick={()=>setShowEstadoModal(null)} className="text-slate-400"><X size={18}/></button>
            </div>
            <div className="px-6 py-4 space-y-3">
              <div><label className="mb-1 block text-xs font-medium text-slate-600">Notas (opcional)</label>
                <textarea className={inputCls} rows={3} value={notasEstado} onChange={e=>setNotasEstado(e.target.value)} placeholder="Observaciones del cambio..."/>
              </div>
              <div className="flex justify-end gap-2">
                <button onClick={()=>setShowEstadoModal(null)} className="rounded-lg border border-slate-200 px-4 py-2 text-sm text-slate-600">Cancelar</button>
                <button onClick={()=>cambiarEstado(showEstadoModal.id, showEstadoModal.estado)}
                  className={`rounded-lg px-4 py-2 text-sm font-semibold text-white ${ESTADOS[showEstadoModal.estado]?.dot.replace('bg-','bg-')||'bg-slate-500'} hover:opacity-90`}>
                  Confirmar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
