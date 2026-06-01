import { useState, useEffect, useCallback } from 'react';
import { getAccessToken } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { Plus, X, Check, Wrench, AlertTriangle, Clock } from 'lucide-react';

const API = 'https://working.conectaai.cl/api/v1';
function h() { return { 'Content-Type': 'application/json', Authorization: `Bearer ${getAccessToken()||''}` }; }

const HERRAMIENTAS_COMUNES = ['Tornillos','Tirantes','Silicona','Aceite W40','Taladro','Llave inglesa','Cinta métrica','Nivel','Escalera','Guantes','Casco','Broca','Anclajes','Perfil aluminio','Otro'];
const URGENCIA_CONFIG: Record<string,{label:string;bg:string;color:string;icon:any}> = {
  normal:  {label:'Normal',  bg:'bg-slate-100', color:'text-slate-600', icon:Clock},
  urgente: {label:'Urgente', bg:'bg-amber-100', color:'text-amber-700', icon:AlertTriangle},
  critico: {label:'Crítico', bg:'bg-red-100',   color:'text-red-700',   icon:AlertTriangle},
};
const ESTADO_BADGE: Record<string,string> = {
  pendiente:'bg-amber-100 text-amber-700', aprobada:'bg-emerald-100 text-emerald-700',
  rechazada:'bg-red-100 text-red-700', entregada:'bg-blue-100 text-blue-700',
};

type Item = { nombre:string; cantidad:number; unidad:string };
type Solicitud = { id:number; items:Item[]; urgencia:string; estado:string; notas?:string; comentario_respuesta?:string; created_at:string; solicitante_nombre?:string };

export default function SolicitudHerramientas() {
  const { user } = useAuth();
  const esGestor = ['jefe','gerente','coordinador','superadmin'].includes(user?.rol||'');
  const [solicitudes, setSolicitudes] = useState<Solicitud[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [items, setItems] = useState<Item[]>([{nombre:'',cantidad:1,unidad:'unidad'}]);
  const [urgencia, setUrgencia] = useState('normal');
  const [notas, setNotas] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    const r = await fetch(`${API}/herramientas/solicitudes`, {headers:h()});
    if (r.ok) setSolicitudes(await r.json());
  }, []);

  useEffect(() => { load(); }, [load]);

  const addItem = () => setItems(p=>[...p,{nombre:'',cantidad:1,unidad:'unidad'}]);
  const removeItem = (i:number) => setItems(p=>p.filter((_,j)=>j!==i));
  const setItem = (i:number,k:string,v:any) => setItems(p=>p.map((it,j)=>j===i?{...it,[k]:v}:it));

  const submit = async () => {
    const validItems = items.filter(i=>i.nombre.trim());
    if (!validItems.length) { setError('Agrega al menos un ítem'); return; }
    setSaving(true); setError('');
    try {
      const r = await fetch(`${API}/herramientas/solicitudes`, { method:'POST', headers:h(), body:JSON.stringify({items:validItems,urgencia,notas}) });
      if (!r.ok) throw new Error(await r.text());
      setShowForm(false); setItems([{nombre:'',cantidad:1,unidad:'unidad'}]); setUrgencia('normal'); setNotas('');
      load();
    } catch(e:any) { setError(e.message); } finally { setSaving(false); }
  };

  const responder = async (id:number, estado:string, comentario='') => {
    await fetch(`${API}/herramientas/solicitudes/${id}`, { method:'PATCH', headers:h(), body:JSON.stringify({estado,comentario}) });
    load();
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">{esGestor?'Solicitudes de Herramientas':'Solicitar Herramientas'}</h1>
          <p className="text-sm text-slate-500">{esGestor?'Gestiona las solicitudes del equipo':'Solicita herramientas e insumos al coordinador'}</p>
        </div>
        {!esGestor&&<button onClick={()=>setShowForm(true)} className="flex items-center gap-1.5 rounded-xl px-4 py-2.5 text-sm font-semibold text-white" style={{backgroundColor:'var(--brand-primary)'}}><Plus size={15}/> Nueva Solicitud</button>}
      </div>

      <div className="space-y-3">
        {solicitudes.length===0
          ?<div className="rounded-xl border border-dashed border-slate-200 bg-white p-14 text-center"><Wrench size={36} className="mx-auto text-slate-300"/><p className="mt-3 text-sm text-slate-400">Sin solicitudes</p></div>
          :solicitudes.map(s=>{
            const urg = URGENCIA_CONFIG[s.urgencia]||URGENCIA_CONFIG.normal;
            const UrgIcon = urg.icon;
            return (
              <div key={s.id} className="rounded-xl border border-slate-200 bg-white p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1">
                    {esGestor&&s.solicitante_nombre&&<p className="text-xs font-bold text-slate-500 mb-1">👤 {s.solicitante_nombre}</p>}
                    <div className="flex gap-2 mb-2">
                      <span className={`flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold ${urg.bg} ${urg.color}`}><UrgIcon size={10}/>{urg.label}</span>
                      <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${ESTADO_BADGE[s.estado]||'bg-slate-100 text-slate-600'}`}>{s.estado}</span>
                    </div>
                    <div className="space-y-1">
                      {s.items.map((it,i)=>(
                        <p key={i} className="text-sm text-slate-700">• {it.cantidad} {it.unidad} de <strong>{it.nombre}</strong></p>
                      ))}
                    </div>
                    {s.notas&&<p className="mt-2 text-xs text-slate-500">📝 {s.notas}</p>}
                    {s.comentario_respuesta&&<p className="mt-2 rounded-lg bg-slate-50 px-3 py-2 text-xs text-slate-700">💬 {s.comentario_respuesta}</p>}
                    <p className="mt-2 text-[11px] text-slate-400">{new Date(s.created_at).toLocaleDateString('es-CL',{day:'numeric',month:'short',hour:'2-digit',minute:'2-digit'})}</p>
                  </div>
                </div>
                {esGestor&&s.estado==='pendiente'&&(
                  <div className="mt-3 flex gap-2">
                    <button onClick={()=>responder(s.id,'aprobada','Solicitud aprobada')} className="flex items-center gap-1 rounded-lg bg-emerald-100 px-3 py-1.5 text-xs font-semibold text-emerald-700 hover:bg-emerald-200"><Check size={12}/> Aprobar</button>
                    <button onClick={()=>responder(s.id,'entregada','Herramientas entregadas')} className="flex items-center gap-1 rounded-lg bg-blue-100 px-3 py-1.5 text-xs font-semibold text-blue-700 hover:bg-blue-200"><Check size={12}/> Entregada</button>
                    <button onClick={()=>responder(s.id,'rechazada','')} className="flex items-center gap-1 rounded-lg bg-red-100 px-3 py-1.5 text-xs font-semibold text-red-700 hover:bg-red-200"><X size={12}/> Rechazar</button>
                  </div>
                )}
              </div>
            );
          })}
      </div>

      {showForm&&(
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 sm:items-center p-4">
          <div className="w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-2xl bg-white shadow-2xl">
            <div className="sticky top-0 flex items-center justify-between border-b border-slate-200 bg-white px-5 py-4">
              <h2 className="text-base font-bold">Solicitar Herramientas / Insumos</h2>
              <button onClick={()=>setShowForm(false)} className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100"><X size={18}/></button>
            </div>
            <div className="space-y-4 p-5">
              <div>
                <div className="mb-2 flex items-center justify-between">
                  <label className="text-xs font-bold text-slate-600">ÍTEMS SOLICITADOS</label>
                  <button onClick={addItem} className="flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-semibold text-white" style={{backgroundColor:'var(--brand-primary)'}}><Plus size={12}/> Agregar</button>
                </div>
                <div className="space-y-2">
                  {items.map((item,i)=>(
                    <div key={i} className="flex gap-2 items-end">
                      <div className="flex-1">
                        <select value={item.nombre} onChange={e=>setItem(i,'nombre',e.target.value)} className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none">
                          <option value="">— Seleccionar —</option>
                          {HERRAMIENTAS_COMUNES.map(h=><option key={h} value={h}>{h}</option>)}
                        </select>
                        {item.nombre==='Otro'&&<input placeholder="Especificar..." onChange={e=>setItem(i,'nombre',e.target.value)} className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none"/>}
                      </div>
                      <div className="w-20"><input type="number" min="1" value={item.cantidad} onChange={e=>setItem(i,'cantidad',Number(e.target.value))} className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none"/></div>
                      <div className="w-24">
                        <select value={item.unidad} onChange={e=>setItem(i,'unidad',e.target.value)} className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none">
                          {['unidad','caja','litro','metro','kilo','rollo'].map(u=><option key={u} value={u}>{u}</option>)}
                        </select>
                      </div>
                      {items.length>1&&<button onClick={()=>removeItem(i)} className="rounded-lg p-2 text-slate-400 hover:text-red-500"><X size={16}/></button>}
                    </div>
                  ))}
                </div>
              </div>
              <div>
                <label className="mb-1 block text-xs font-bold text-slate-600">URGENCIA</label>
                <div className="flex gap-2">
                  {Object.entries(URGENCIA_CONFIG).map(([k,v])=>(
                    <button key={k} onClick={()=>setUrgencia(k)} className={`flex-1 rounded-lg border px-3 py-2 text-xs font-semibold transition ${urgencia===k?`${v.bg} ${v.color} border-transparent`:'border-slate-200 text-slate-500 hover:bg-slate-50'}`}>{v.label}</button>
                  ))}
                </div>
              </div>
              <div><label className="mb-1 block text-xs font-semibold text-slate-600">Notas adicionales</label><textarea value={notas} onChange={e=>setNotas(e.target.value)} rows={2} placeholder="Ej: Para trabajo en Vitacura el viernes" className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none resize-none"/></div>
              {error&&<p className="rounded-lg bg-red-50 px-3 py-2 text-xs text-red-700">{error}</p>}
            </div>
            <div className="sticky bottom-0 flex gap-3 border-t border-slate-200 bg-white px-5 py-4">
              <button onClick={()=>setShowForm(false)} className="flex-1 rounded-lg border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-600">Cancelar</button>
              <button onClick={submit} disabled={saving} className="flex flex-1 items-center justify-center rounded-lg px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-60" style={{backgroundColor:'var(--brand-primary)'}}>
                {saving?'Enviando...':'Enviar Solicitud'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
