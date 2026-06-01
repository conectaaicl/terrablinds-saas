import { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useApi } from '../../hooks/useApi';
import { api } from '../../services/api';
import { Spinner, ErrorMessage } from '../../components/LoadingStates';
import { CalendarDays, Plus, ChevronLeft, ChevronRight, Phone, MapPin, User, Clock, AlertTriangle, Send, MessageCircle, X, Check, Trash2, Edit2, Users, ExternalLink, Package, FileText, Calendar } from 'lucide-react';

type TipoVisita = 'instalacion' | 'servicio_tecnico' | 'medicion' | 'otro';
interface TecnicoAsignado { id: number; nombre: string; }
interface ProgramacionItem {
  id: number; fecha: string; hora: string; tipo_visita: TipoVisita;
  cliente_nombre: string; cliente_telefono: string; cliente_direccion: string;
  ot?: string; vendedor_nombre?: string; descripcion_trabajo: string;
  observaciones?: string; tecnicos: TecnicoAsignado[]; tenant_id: string; creado_por: number;
}
const TIPO_CONFIG: Record<TipoVisita, { label: string; color: string; bg: string; border: string; emoji: string }> = {
  instalacion:      { label: 'Instalación',      color: 'text-emerald-700', bg: 'bg-emerald-50', border: 'border-emerald-400', emoji: '🟢' },
  servicio_tecnico: { label: 'Servicio Técnico', color: 'text-red-700',     bg: 'bg-red-50',     border: 'border-red-400',     emoji: '🔴' },
  medicion:         { label: 'Medición',         color: 'text-blue-700',    bg: 'bg-blue-50',    border: 'border-blue-400',    emoji: '📏' },
  otro:             { label: 'Otro',             color: 'text-slate-700',   bg: 'bg-slate-100',  border: 'border-slate-400',   emoji: '📌' },
};
const DIAS = ['Dom','Lun','Mar','Mié','Jue','Vie','Sáb'];
const MESES = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];
function fmtFecha(f: string) { return new Date(f+'T12:00:00').toLocaleDateString('es-CL',{weekday:'long',day:'numeric',month:'long'}); }
function wazeUrl(d: string) { return 'https://waze.com/ul?q='+encodeURIComponent(d); }
function formatWhatsApp(p: ProgramacionItem, fecha: string): string {
  const cfg = TIPO_CONFIG[p.tipo_visita];
  const tecs = p.tecnicos.length > 0 ? '🔹 '+p.tecnicos.map(t=>t.nombre.toUpperCase()).join(', ') : '🔹 TÉCNICO POR ASIGNAR';
  let txt = '📅 '+fmtFecha(fecha).toUpperCase()+'\n'+tecs+'\n\n';
  txt += '🕐 '+p.hora+' '+cfg.emoji+' '+cfg.label+' – '+p.cliente_nombre+'\n';
  txt += '📍 '+p.cliente_direccion+'\n🧭 '+wazeUrl(p.cliente_direccion)+'\n📞 '+p.cliente_telefono+'\n';
  if (p.ot) txt += '📝 OT '+p.ot+'\n';
  if (p.vendedor_nombre) txt += '👨‍💼 Vendedor: '+p.vendedor_nombre+'\n';
  txt += '🔧 '+p.descripcion_trabajo+'\n';
  if (p.observaciones) p.observaciones.split('\n').filter(Boolean).forEach(o=>{txt+='⚠️ '+o+'\n';});
  return txt;
}

function CalendarioMini({fechaSeleccionada,programaciones,onChange}:{fechaSeleccionada:string;programaciones:ProgramacionItem[];onChange:(f:string)=>void;}) {
  const hoy = new Date();
  const [mes, setMes] = useState({year:hoy.getFullYear(),month:hoy.getMonth()});
  const diasConProg = new Set(programaciones.map(p=>p.fecha));
  const primerDia = new Date(mes.year,mes.month,1);
  const totalDias = new Date(mes.year,mes.month+1,0).getDate();
  const celdas:(number|null)[] = [...Array(primerDia.getDay()).fill(null),...Array.from({length:totalDias},(_,i)=>i+1)];
  const nav=(d:number)=>{const nd=new Date(mes.year,mes.month+d,1);setMes({year:nd.getFullYear(),month:nd.getMonth()});};
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4">
      <div className="mb-3 flex items-center justify-between">
        <button onClick={()=>nav(-1)} className="rounded-lg p-1 text-slate-400 hover:bg-slate-100"><ChevronLeft size={16}/></button>
        <span className="text-sm font-bold text-slate-800">{MESES[mes.month]} {mes.year}</span>
        <button onClick={()=>nav(1)} className="rounded-lg p-1 text-slate-400 hover:bg-slate-100"><ChevronRight size={16}/></button>
      </div>
      <div className="grid grid-cols-7 gap-0.5 text-center">
        {DIAS.map(d=><div key={d} className="py-1 text-[10px] font-semibold text-slate-400">{d}</div>)}
        {celdas.map((dia,i)=>{
          if(!dia) return <div key={i}/>;
          const f=`${mes.year}-${String(mes.month+1).padStart(2,'0')}-${String(dia).padStart(2,'0')}`;
          const sel=f===fechaSeleccionada, tieneP=diasConProg.has(f), esHoy=f===hoy.toISOString().split('T')[0];
          return <button key={i} onClick={()=>onChange(f)} className={`relative flex h-8 w-full items-center justify-center rounded-lg text-xs font-medium transition ${sel?'text-white':esHoy?'font-bold text-slate-900':'text-slate-600 hover:bg-slate-100'}`} style={sel?{backgroundColor:'var(--brand-primary)'}:undefined}>{dia}{tieneP&&!sel&&<span className="absolute bottom-0.5 left-1/2 h-1 w-1 -translate-x-1/2 rounded-full bg-violet-500"/>}</button>;
        })}
      </div>
    </div>
  );
}

function FormularioProgramacion({fecha,instaladores,vendedores,editando,onClose,onSaved}:{fecha:string;instaladores:any[];vendedores:any[];editando?:ProgramacionItem|null;onClose:()=>void;onSaved:()=>void;}) {
  const emptyVisita = () => ({fecha,hora:'09:00',tipo_visita:'instalacion' as TipoVisita,cliente_nombre:'',cliente_telefono:'',cliente_direccion:'',ot:'',vendedor_nombre:'',descripcion_trabajo:'',observaciones:'',tecnico_ids:[] as number[]});
  const [visitas,setVisitas]=useState(editando ? [{ fecha:editando.fecha,hora:editando.hora,tipo_visita:editando.tipo_visita,cliente_nombre:editando.cliente_nombre,cliente_telefono:editando.cliente_telefono??'',cliente_direccion:editando.cliente_direccion,ot:editando.ot??'',vendedor_nombre:editando.vendedor_nombre??'',descripcion_trabajo:editando.descripcion_trabajo,observaciones:editando.observaciones??'',tecnico_ids:editando.tecnicos?.map(t=>t.id)??[] as number[] }] : [emptyVisita()]);
  const [saving,setSaving]=useState(false);
  const [error,setError]=useState('');
  const [activeIdx,setActiveIdx]=useState(0);

  const setV=(i:number,k:string,v:any)=>setVisitas(vs=>vs.map((v2,j)=>j===i?{...v2,[k]:v}:v2));
  const toggleTec=(i:number,id:number)=>setVisitas(vs=>vs.map((v,j)=>j===i?{...v,tecnico_ids:v.tecnico_ids.includes(id)?v.tecnico_ids.filter(x=>x!==id):[...v.tecnico_ids,id]}:v));
  const addVisita=()=>{setVisitas(vs=>[...vs,emptyVisita()]);setActiveIdx(visitas.length);};
  const removeVisita=(i:number)=>{if(visitas.length===1)return;setVisitas(vs=>vs.filter((_,j)=>j!==i));setActiveIdx(Math.max(0,i-1));};

  const handleSubmit=async()=>{
    for(const v of visitas){
      if(!v.cliente_nombre.trim()){setError('Falta nombre de cliente en alguna visita');return;}
      if(!v.cliente_direccion.trim()){setError('Falta dirección en alguna visita');return;}
      if(!v.descripcion_trabajo.trim()){setError('Falta descripción en alguna visita');return;}
    }
    setError('');setSaving(true);
    try{
      if(editando){
        await (api as any).updateProgramacion(editando.id,visitas[0]);
      } else {
        for(const v of visitas){ await (api as any).createProgramacion(v); }
      }
      onSaved();onClose();
    }catch(e:any){setError(e.message||'Error al guardar');}finally{setSaving(false);}
  };

  const v=visitas[activeIdx]||visitas[0];

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 sm:items-center p-4">
      <div className="w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-2xl bg-white shadow-2xl">
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-slate-200 bg-white px-5 py-4">
          <h2 className="text-base font-bold text-slate-900">{editando?'Editar Programación':`Nueva Programación (${visitas.length} visita${visitas.length!==1?'s':''})`}</h2>
          <button onClick={onClose} className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100"><X size={18}/></button>
        </div>

        {!editando && visitas.length > 0 && (
          <div className="flex gap-1 overflow-x-auto border-b border-slate-200 bg-slate-50 px-4 py-2">
            {visitas.map((_,i)=>(
              <button key={i} onClick={()=>setActiveIdx(i)} className={`flex shrink-0 items-center gap-1 rounded-lg px-3 py-1.5 text-xs font-semibold transition ${activeIdx===i?'text-white':'bg-white text-slate-600 hover:bg-slate-100'}`} style={activeIdx===i?{backgroundColor:'var(--brand-primary)'}:undefined}>
                Visita {i+1}
                {visitas.length>1&&<span onClick={e=>{e.stopPropagation();removeVisita(i);}} className="ml-1 rounded-full hover:bg-black/20 px-1">×</span>}
              </button>
            ))}
            <button onClick={addVisita} className="flex shrink-0 items-center gap-1 rounded-lg border border-dashed border-slate-300 px-3 py-1.5 text-xs font-semibold text-slate-500 hover:bg-white">
              <Plus size={12}/> Agregar
            </button>
          </div>
        )}

        <div className="space-y-4 p-5">
          <div className="grid grid-cols-2 gap-3">
            <div><label className="mb-1 block text-xs font-semibold text-slate-600">Fecha</label><input type="date" value={v.fecha} min={new Date().toISOString().split('T')[0]} onChange={e=>setV(activeIdx,'fecha',e.target.value)} className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none"/></div>
            <div><label className="mb-1 block text-xs font-semibold text-slate-600">Hora</label><input type="time" value={v.hora} onChange={e=>setV(activeIdx,'hora',e.target.value)} className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none"/></div>
          </div>
          <div><label className="mb-1 block text-xs font-semibold text-slate-600">Tipo de Visita</label>
            <div className="grid grid-cols-2 gap-2">
              {(Object.entries(TIPO_CONFIG) as [TipoVisita,any][]).map(([key,cfg])=>(
                <button key={key} onClick={()=>setV(activeIdx,'tipo_visita',key)} className={`flex items-center gap-2 rounded-lg border px-3 py-2 text-xs font-semibold transition ${v.tipo_visita===key?`${cfg.bg} ${cfg.color} ${cfg.border}`:`border-slate-200 text-slate-600 hover:bg-slate-50`}`}>{cfg.emoji} {cfg.label}</button>
              ))}
            </div>
          </div>
          <div><label className="mb-1 block text-xs font-semibold text-slate-600">Técnicos ({v.tecnico_ids.length} seleccionado{v.tecnico_ids.length!==1?'s':''})</label>
            {instaladores.length===0?<p className="rounded-lg bg-slate-50 px-3 py-2 text-xs text-slate-500">No hay instaladores.</p>:
            <div className="flex flex-wrap gap-2">{instaladores.map((inst:any)=><button key={inst.id} onClick={()=>toggleTec(activeIdx,inst.id)} className={`flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-semibold transition ${v.tecnico_ids.includes(inst.id)?'border-violet-400 bg-violet-100 text-violet-700':'border-slate-200 text-slate-600 hover:bg-slate-50'}`}>{v.tecnico_ids.includes(inst.id)&&<Check size={11}/>} {inst.nombre}</button>)}</div>}
          </div>
          <div><label className="mb-1 block text-xs font-semibold text-slate-600">Cliente *</label><input value={v.cliente_nombre} onChange={e=>setV(activeIdx,'cliente_nombre',e.target.value)} placeholder="Nombre del cliente" className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none"/></div>
          <div><label className="mb-1 block text-xs font-semibold text-slate-600">Teléfono</label><input value={v.cliente_telefono} onChange={e=>setV(activeIdx,'cliente_telefono',e.target.value)} placeholder="56912345678" className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none"/></div>
          <div><label className="mb-1 block text-xs font-semibold text-slate-600">Dirección *</label><input value={v.cliente_direccion} onChange={e=>setV(activeIdx,'cliente_direccion',e.target.value)} placeholder="Calle 123, dpto 45, Comuna" className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none"/></div>
          <div className="grid grid-cols-2 gap-3">
            <div><label className="mb-1 block text-xs font-semibold text-slate-600">OT / Nº Orden</label><input value={v.ot} onChange={e=>setV(activeIdx,'ot',e.target.value)} placeholder="813143" className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none"/></div>
            <div><label className="mb-1 block text-xs font-semibold text-slate-600">Vendedor</label>
              {vendedores.length>0?<select value={v.vendedor_nombre} onChange={e=>setV(activeIdx,'vendedor_nombre',e.target.value)} className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none"><option value="">— Sin asignar —</option>{vendedores.map((vend:any)=><option key={vend.id} value={vend.nombre}>{vend.nombre}</option>)}</select>
              :<input value={v.vendedor_nombre} onChange={e=>setV(activeIdx,'vendedor_nombre',e.target.value)} placeholder="Nombre vendedor" className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none"/>}
            </div>
          </div>
          <div><label className="mb-1 block text-xs font-semibold text-slate-600">Descripción del Trabajo *</label><textarea value={v.descripcion_trabajo} onChange={e=>setV(activeIdx,'descripcion_trabajo',e.target.value)} rows={3} placeholder="Ej: Instalación 4 TOLDOS Screen" className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none resize-none"/></div>
          <div><label className="mb-1 block text-xs font-semibold text-slate-600">Observaciones (una por línea)</label><textarea value={v.observaciones} onChange={e=>setV(activeIdx,'observaciones',e.target.value)} rows={3} className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none resize-none"/></div>
          {error&&<p className="rounded-lg bg-red-50 px-3 py-2 text-xs text-red-700">{error}</p>}
        </div>
        <div className="sticky bottom-0 flex gap-3 border-t border-slate-200 bg-white px-5 py-4">
          <button onClick={onClose} className="flex-1 rounded-lg border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-50">Cancelar</button>
          <button onClick={handleSubmit} disabled={saving} className="flex flex-1 items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-60" style={{backgroundColor:'var(--brand-primary)'}}>
            {saving?'Guardando...':editando?'Guardar Cambios':`Crear ${visitas.length} Visita${visitas.length!==1?'s':''}`}
          </button>
        </div>
      </div>
    </div>
  );
}



function ProgramacionCard({item,canEdit,onEdit,onDelete,onWhatsApp}:{item:ProgramacionItem;canEdit:boolean;onEdit:()=>void;onDelete:()=>void;onWhatsApp:()=>void;}) {
  const cfg=TIPO_CONFIG[item.tipo_visita];
  return (
    <div className={`rounded-xl border-l-4 bg-white p-4 shadow-sm border border-slate-200 ${cfg.border}`}>
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className={`rounded-full px-2 py-0.5 text-[11px] font-bold ${cfg.bg} ${cfg.color}`}>{cfg.emoji} {cfg.label}</span>
          <span className="flex items-center gap-1 text-xs font-semibold text-slate-600"><Clock size={11}/> {item.hora}</span>
        </div>
        {canEdit&&<div className="flex gap-1">
          <button onClick={onEdit} className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700"><Edit2 size={13}/></button>
          <button onClick={onDelete} className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-red-600"><Trash2 size={13}/></button>
        </div>}
      </div>
      {item.tecnicos.length>0&&<div className="mt-2 flex flex-wrap gap-1">{item.tecnicos.map(t=><span key={t.id} className="flex items-center gap-1 rounded-full bg-violet-100 px-2 py-0.5 text-[11px] font-semibold text-violet-700"><Users size={10}/> {t.nombre}</span>)}</div>}
      <div className="mt-2.5 space-y-1">
        <p className="text-sm font-bold text-slate-900">{item.cliente_nombre}</p>
        {item.cliente_telefono&&<a href={`tel:${item.cliente_telefono}`} className="flex items-center gap-1.5 text-xs text-slate-600 hover:text-blue-600"><Phone size={11}/> {item.cliente_telefono}</a>}
        <a href={wazeUrl(item.cliente_direccion)} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 text-xs text-blue-600 hover:underline"><MapPin size={11}/> {item.cliente_direccion} <ExternalLink size={10}/></a>
      </div>
      <div className="mt-2 flex flex-wrap gap-3 text-xs text-slate-500">
        {item.ot&&<span className="flex items-center gap-1"><FileText size={10}/> OT {item.ot}</span>}
        {item.vendedor_nombre&&<span className="flex items-center gap-1"><User size={10}/> {item.vendedor_nombre}</span>}
      </div>
      <div className="mt-2.5 rounded-lg bg-slate-50 px-3 py-2">
        <p className="flex items-center gap-1 text-[11px] font-semibold text-slate-500 mb-1"><Package size={10}/> TRABAJO</p>
        <p className="text-xs text-slate-700">{item.descripcion_trabajo}</p>
      </div>
      {item.observaciones&&<div className="mt-2 space-y-0.5">{item.observaciones.split('\n').filter(Boolean).map((obs,i)=><p key={i} className="flex items-start gap-1 text-xs text-amber-800"><AlertTriangle size={10} className="mt-0.5 shrink-0 text-amber-500"/> {obs}</p>)}</div>}
      <button onClick={onWhatsApp} className="mt-3 flex w-full items-center justify-center gap-2 rounded-lg bg-green-500 px-3 py-2 text-xs font-semibold text-white hover:bg-green-600 transition"><MessageCircle size={13}/> Enviar por WhatsApp</button>
    </div>
  );
}

export function MiProgramacion() {
  const {user}=useAuth();
  const hoy=new Date().toISOString().split('T')[0];
  const [fecha,setFecha]=useState(hoy);
  const {data:rawProg,loading,error,refetch}=useApi(()=>(api as any).getProgramaciones());
  const programaciones:ProgramacionItem[]=rawProg||[];
  const delDia=programaciones.filter(p=>p.fecha===fecha&&p.tecnicos.some(t=>t.id===user?.id)).sort((a,b)=>a.hora.localeCompare(b.hora));
  const handleWA=(p:ProgramacionItem)=>window.open('https://wa.me/?text='+encodeURIComponent(formatWhatsApp(p,fecha)),'_blank');
  if(loading) return <Spinner/>;
  if(error) return <ErrorMessage message={error} onRetry={refetch}/>;
  return (
    <div className="space-y-5">
      <div><h1 className="text-2xl font-bold text-slate-900">Mi Programación</h1><p className="text-sm text-slate-500">Tus visitas del día</p></div>
      <CalendarioMini fechaSeleccionada={fecha} programaciones={programaciones.filter(p=>p.tecnicos.some(t=>t.id===user?.id))} onChange={setFecha}/>
      <div>
        <h2 className="mb-3 text-sm font-bold text-slate-700 capitalize">{fmtFecha(fecha)}</h2>
        {delDia.length===0
          ?<div className="rounded-xl border border-dashed border-slate-200 bg-white p-10 text-center"><Calendar size={32} className="mx-auto text-slate-300"/><p className="mt-2 text-sm text-slate-400">Sin programación para este día</p></div>
          :<div className="space-y-3">{delDia.map(p=><ProgramacionCard key={p.id} item={p} canEdit={false} onEdit={()=>{}} onDelete={()=>{}} onWhatsApp={()=>handleWA(p)}/>)}</div>}
      </div>
    </div>
  );
}

export default function Programacion() {
  const hoy=new Date().toISOString().split('T')[0];
  const manana=new Date(Date.now()+86400000).toISOString().split('T')[0];
  const [fecha,setFecha]=useState(manana);
  const [showForm,setShowForm]=useState(false);
  const [editando,setEditando]=useState<ProgramacionItem|null>(null);
  const [waModal,setWaModal]=useState(false);
  const [waTxt,setWaTxt]=useState('');
  const {data:rawProg,loading,error,refetch}=useApi(()=>(api as any).getProgramaciones());
  const {data:rawInst}=useApi(()=>api.getUsersByRole('instalador'));
  const {data:rawVend}=useApi(()=>api.getUsersByRole('vendedor'));
  const programaciones:ProgramacionItem[]=rawProg||[];
  const instaladores:any[]=rawInst||[];
  const vendedores:any[]=rawVend||[];
  const delDia=programaciones.filter(p=>p.fecha===fecha).sort((a,b)=>a.hora.localeCompare(b.hora));
  const handleDelete=async(id:number)=>{if(!confirm('¿Eliminar esta programación?'))return;try{await (api as any).deleteProgramacion(id);refetch();}catch(e:any){alert(e.message);}};
  const handleWA=(p:ProgramacionItem)=>{setWaTxt(formatWhatsApp(p,fecha));setWaModal(true);};
  const enviarDia=()=>{
    if(!delDia.length)return;
    let txt='📅 '+fmtFecha(fecha).toUpperCase()+'\n\n';
    delDia.forEach((p,i)=>{
      const cfg=TIPO_CONFIG[p.tipo_visita];
      txt+=`${i+1}️⃣ ${p.hora} ${cfg.emoji} ${cfg.label} – ${p.cliente_nombre}\n`;
      txt+='📍 '+p.cliente_direccion+'\n🧭 '+wazeUrl(p.cliente_direccion)+'\n📞 '+p.cliente_telefono+'\n';
      if(p.ot)txt+='📝 OT '+p.ot+'\n';
      if(p.vendedor_nombre)txt+='👨‍💼 Vendedor: '+p.vendedor_nombre+'\n';
      txt+='🔧 '+p.descripcion_trabajo+'\n';
      if(p.observaciones)p.observaciones.split('\n').filter(Boolean).forEach(o=>{txt+='⚠️ '+o+'\n';});
      txt+='\n';
    });
    setWaTxt(txt);setWaModal(true);
  };
  if(loading)return <Spinner/>;
  if(error)return <ErrorMessage message={error} onRetry={refetch}/>;
  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between gap-3">
        <div><h1 className="text-2xl font-bold text-slate-900">Programación</h1><p className="text-sm text-slate-500">Gestión de visitas e instalaciones</p></div>
        <button onClick={()=>{setEditando(null);setShowForm(true);}} className="flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:opacity-90" style={{backgroundColor:'var(--brand-primary)'}}><Plus size={16}/> Nueva</button>
      </div>
      <div className="grid gap-5 lg:grid-cols-[280px_1fr]">
        <div className="space-y-4">
          <CalendarioMini fechaSeleccionada={fecha} programaciones={programaciones} onChange={setFecha}/>
          <div className="grid grid-cols-2 gap-2">
            <button onClick={()=>setFecha(hoy)} className={`rounded-lg border px-3 py-2 text-xs font-semibold transition ${fecha===hoy?'border-violet-300 bg-violet-50 text-violet-700':'border-slate-200 text-slate-600 hover:bg-slate-50'}`}>Hoy</button>
            <button onClick={()=>setFecha(manana)} className={`rounded-lg border px-3 py-2 text-xs font-semibold transition ${fecha===manana?'border-violet-300 bg-violet-50 text-violet-700':'border-slate-200 text-slate-600 hover:bg-slate-50'}`}>Mañana</button>
          </div>
          {instaladores.length>0&&delDia.length>0&&(
            <div className="rounded-xl border border-slate-200 bg-white p-4">
              <h3 className="mb-2 text-xs font-bold uppercase text-slate-600">Técnicos del día</h3>
              <div className="space-y-1.5">{instaladores.map((inst:any)=>{const count=delDia.filter(p=>p.tecnicos.some(t=>t.id===inst.id)).length;if(!count)return null;return <div key={inst.id} className="flex items-center justify-between text-xs"><span className="flex items-center gap-1.5 text-slate-700"><span className="h-2 w-2 rounded-full bg-violet-400"/>{inst.nombre}</span><span className="rounded-full bg-slate-100 px-2 py-0.5 font-semibold text-slate-600">{count} visita{count!==1?'s':''}</span></div>;})}</div>
            </div>
          )}
        </div>
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div><h2 className="text-base font-bold text-slate-900 capitalize">{fmtFecha(fecha)}</h2><p className="text-xs text-slate-500">{delDia.length} visita{delDia.length!==1?'s':''} programada{delDia.length!==1?'s':''}</p></div>
            {delDia.length>0&&<button onClick={enviarDia} className="flex items-center gap-1.5 rounded-lg bg-green-500 px-3 py-2 text-xs font-semibold text-white hover:bg-green-600 transition"><Send size={12}/> Enviar día completo</button>}
          </div>
          {delDia.length===0
            ?<div className="rounded-xl border border-dashed border-slate-200 bg-white p-14 text-center"><CalendarDays size={40} className="mx-auto text-slate-300"/><p className="mt-3 text-sm font-medium text-slate-500">Sin programación para este día</p><button onClick={()=>{setEditando(null);setShowForm(true);}} className="mt-4 inline-flex items-center gap-1.5 rounded-lg px-4 py-2 text-sm font-semibold text-white" style={{backgroundColor:'var(--brand-primary)'}}><Plus size={15}/> Agregar visita</button></div>
            :<div className="space-y-3">{delDia.map(p=><ProgramacionCard key={p.id} item={p} canEdit={true} onEdit={()=>{setEditando(p);setShowForm(true);}} onDelete={()=>handleDelete(p.id)} onWhatsApp={()=>handleWA(p)}/>)}</div>}
        </div>
      </div>
      {showForm&&<FormularioProgramacion fecha={fecha} instaladores={instaladores} vendedores={vendedores} editando={editando} onClose={()=>{setShowForm(false);setEditando(null);}} onSaved={refetch}/>}
      {waModal&&(
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-2xl bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
              <h2 className="text-base font-bold text-slate-900">Enviar por WhatsApp</h2>
              <button onClick={()=>setWaModal(false)} className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100"><X size={18}/></button>
            </div>
            <div className="p-5 space-y-4">
              <textarea value={waTxt} onChange={e=>setWaTxt(e.target.value)} rows={12} className="w-full rounded-lg border border-slate-200 px-3 py-2 text-xs font-mono focus:outline-none resize-none"/>
              <div className="flex gap-3">
                <button onClick={()=>setWaModal(false)} className="flex-1 rounded-lg border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-50">Cancelar</button>
                <button onClick={()=>window.open('https://wa.me/?text='+encodeURIComponent(waTxt),'_blank')} className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-green-500 px-4 py-2.5 text-sm font-semibold text-white hover:bg-green-600"><MessageCircle size={15}/> Abrir WhatsApp</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
