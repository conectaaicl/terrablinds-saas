import { useState } from 'react';
import {
  Star, Plus, MessageCircle, RefreshCw, CheckCircle2, Clock,
  AlertTriangle, Wrench, Sparkles, X, FileText,
} from 'lucide-react';
import { useApi } from '../../hooks/useApi';
import { useMutation } from '../../hooks/useMutation';
import { api } from '../../services/api';

interface PostVentaItem {
  id: string; tenant_id: string; order_id: number; client_id: number;
  client_nombre?: string; client_telefono?: string;
  tipo: string; estado: string; descripcion?: string;
  calificacion?: number; ai_mensaje?: string;
  notas: Array<{ texto: string; fecha: string; usuario_id: number }>;
  fecha_programada?: string; fecha_resolucion?: string; created_at: string;
}

interface Stats {
  total: number; pendientes: number; resueltos: number; garantias_activas: number;
  calificacion_promedio?: number;
  por_tipo: Record<string, number>;
  por_estado: Record<string, number>;
}

const TIPOS: Record<string, { label: string; icon: React.ReactNode; color: string }> = {
  satisfaccion: { label: 'Satisfacción', icon: <Star size={14} />, color: 'text-amber-600 bg-amber-50 border-amber-200' },
  garantia:     { label: 'Garantía',     icon: <AlertTriangle size={14} />, color: 'text-red-600 bg-red-50 border-red-200' },
  servicio:     { label: 'Servicio',     icon: <Wrench size={14} />, color: 'text-blue-600 bg-blue-50 border-blue-200' },
  mantencion:   { label: 'Mantención',   icon: <RefreshCw size={14} />, color: 'text-green-600 bg-green-50 border-green-200' },
  otro:         { label: 'Otro',         icon: <FileText size={14} />, color: 'text-slate-600 bg-slate-50 border-slate-200' },
};

const ESTADOS: Record<string, { label: string; color: string }> = {
  pendiente:   { label: 'Pendiente',  color: 'bg-amber-100 text-amber-700' },
  contactado:  { label: 'Contactado', color: 'bg-blue-100 text-blue-700' },
  en_proceso:  { label: 'En Proceso', color: 'bg-purple-100 text-purple-700' },
  resuelto:    { label: 'Resuelto',   color: 'bg-green-100 text-green-700' },
  cerrado:     { label: 'Cerrado',    color: 'bg-slate-100 text-slate-600' },
};

export default function PostVenta() {
  const [filterEstado, setFilterEstado] = useState('');
  const [filterTipo, setFilterTipo] = useState('');
  const [selected, setSelected] = useState<PostVentaItem | null>(null);
  const [showNew, setShowNew] = useState(false);
  const [notaText, setNotaText] = useState('');
  const [newForm, setNewForm] = useState({ order_id: '', client_id: '', tipo: 'satisfaccion', descripcion: '' });
  const [emailSent, setEmailSent] = useState(false);

  const { data: rawItems, loading, refetch } = useApi(
    () => api.getPostVenta({ estado: filterEstado || undefined, tipo: filterTipo || undefined }),
    [filterEstado, filterTipo]
  );
  const { data: stats, refetch: refetchStats } = useApi(() => api.getPostVentaStats());

  const items: PostVentaItem[] = rawItems || [];

  const { execute: createPV, loading: creating } = useMutation(api.createPostVenta);
  const { execute: updatePV } = useMutation(
    (id: string, data: Parameters<typeof api.updatePostVenta>[1]) => api.updatePostVenta(id, data)
  );
  const { execute: addNota, loading: addingNota } = useMutation(
    (id: string, texto: string) => api.addPostVentaNota(id, texto)
  );
  const { execute: generateAI, loading: generatingAI } = useMutation(api.generatePostVentaAI);
  const { execute: sendEmail, loading: sendingEmail } = useMutation(api.sendPostVentaEmail);
  const { execute: deletePV } = useMutation(api.deletePostVenta);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!newForm.order_id || !newForm.client_id) return;
    await createPV({ ...newForm, order_id: +newForm.order_id, client_id: +newForm.client_id });
    setShowNew(false);
    refetch();
    refetchStats();
  }

  async function handleAddNota() {
    if (!selected || !notaText.trim()) return;
    const updated = await addNota(selected.id, notaText.trim());
    setNotaText('');
    refetch();
    if (updated) setSelected(updated as PostVentaItem);
  }

  async function handleGenerateAI() {
    if (!selected) return;
    setEmailSent(false);
    const updated = await generateAI(selected.id);
    refetch();
    if (updated) setSelected(updated as PostVentaItem);
  }

  async function handleSendEmail() {
    if (!selected) return;
    const res = await sendEmail(selected.id);
    if (res) {
      setEmailSent(true);
      refetch();
    }
  }

  async function handleEstado(estado: string) {
    if (!selected) return;
    const updated = await updatePV(selected.id, { estado });
    refetch();
    refetchStats();
    if (updated) setSelected(updated as PostVentaItem);
  }

  async function handleCalificacion(cal: number) {
    if (!selected) return;
    const updated = await updatePV(selected.id, { calificacion: cal });
    refetch();
    refetchStats();
    if (updated) setSelected(updated as PostVentaItem);
  }

  async function handleDelete(id: string) {
    await deletePV(id);
    setSelected(null);
    refetch();
    refetchStats();
  }

  const s = (stats as Stats | null);
  const statsCards = [
    { label: 'Total',       value: s?.total || 0,                              sub: 'registros',    icon: <FileText size={18} />,   color: 'text-blue-600 bg-blue-50'  },
    { label: 'Pendientes',  value: s?.pendientes || 0,                         sub: 'sin contactar', icon: <Clock size={18} />,     color: 'text-amber-600 bg-amber-50' },
    { label: 'Garantías',   value: s?.garantias_activas || 0,                  sub: 'activas',       icon: <AlertTriangle size={18}/>, color: 'text-red-600 bg-red-50' },
    { label: 'Satisfacción',value: s?.calificacion_promedio ? `${s.calificacion_promedio}★` : '—', sub: 'promedio', icon: <Star size={18} />, color: 'text-amber-600 bg-amber-50' },
  ];

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Post-Venta</h1>
          <p className="text-sm text-slate-500 mt-0.5">Seguimiento post-instalación, garantías y satisfacción del cliente</p>
        </div>
        <button onClick={() => setShowNew(true)}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold text-white shadow-sm"
          style={{ background: 'linear-gradient(135deg, var(--brand-primary), var(--brand-dark))' }}>
          <Plus size={16} /> Nuevo Seguimiento
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {statsCards.map(sc => (
          <div key={sc.label} className="bg-white rounded-2xl border border-slate-100 p-4 shadow-sm flex items-center gap-3">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${sc.color}`}>{sc.icon}</div>
            <div>
              <p className="text-2xl font-bold text-slate-900">{sc.value}</p>
              <p className="text-xs text-slate-500">{sc.label} · {sc.sub}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Filtros */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4 flex gap-3 flex-wrap">
        <select value={filterEstado} onChange={e => setFilterEstado(e.target.value)}
          className="px-3 py-2 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-[--brand-primary]">
          <option value="">Todos los estados</option>
          {Object.entries(ESTADOS).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
        </select>
        <select value={filterTipo} onChange={e => setFilterTipo(e.target.value)}
          className="px-3 py-2 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-[--brand-primary]">
          <option value="">Todos los tipos</option>
          {Object.entries(TIPOS).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
        </select>
        <button onClick={refetch} className="p-2 rounded-xl border border-slate-200 text-slate-500 hover:text-slate-700 transition-colors">
          <RefreshCw size={15} />
        </button>
      </div>

      {/* Lista + Detalle */}
      <div className="flex gap-4">
        {/* Tarjetas */}
        <div className={`space-y-2 transition-all ${selected ? 'w-[50%]' : 'flex-1'}`}>
          {loading ? (
            <div className="flex items-center justify-center h-32 text-slate-400 bg-white rounded-2xl border border-slate-100">
              <RefreshCw size={20} className="animate-spin mr-2" /> Cargando...
            </div>
          ) : items.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-32 text-slate-400 bg-white rounded-2xl border border-slate-100">
              <CheckCircle2 size={32} className="mb-2 opacity-30" />
              <p>No hay registros de post-venta</p>
            </div>
          ) : items.map(item => (
            <div key={item.id} onClick={() => { setSelected(s => s?.id === item.id ? null : item); setEmailSent(false); }}
              className={`bg-white rounded-2xl border cursor-pointer transition-all hover:shadow-md p-4 ${selected?.id === item.id ? 'border-[--brand-primary]/40 shadow-md ring-1 ring-[--brand-primary]/20' : 'border-slate-100 shadow-sm'}`}>
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1.5">
                    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium border ${TIPOS[item.tipo]?.color}`}>
                      {TIPOS[item.tipo]?.icon} {TIPOS[item.tipo]?.label}
                    </span>
                    <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${ESTADOS[item.estado]?.color}`}>
                      {ESTADOS[item.estado]?.label}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-full bg-slate-200 flex items-center justify-center text-xs font-bold text-slate-600">
                      {(item.client_nombre || 'C').slice(0, 2).toUpperCase()}
                    </div>
                    <div>
                      <p className="font-semibold text-slate-900 text-sm">{item.client_nombre || `Cliente #${item.client_id}`}</p>
                      {item.client_telefono && <p className="text-xs text-slate-400">{item.client_telefono}</p>}
                    </div>
                  </div>
                  {item.descripcion && <p className="text-xs text-slate-500 mt-1.5 line-clamp-1">{item.descripcion}</p>}
                </div>
                <div className="flex-shrink-0 text-right">
                  {item.calificacion && (
                    <div className="flex items-center gap-0.5 justify-end mb-1">
                      {[1, 2, 3, 4, 5].map(n => (
                        <Star key={n} size={11} className={n <= item.calificacion! ? 'fill-amber-400 text-amber-400' : 'text-slate-200'} />
                      ))}
                    </div>
                  )}
                  <p className="text-xs text-slate-400">{new Date(item.created_at).toLocaleDateString('es-CL')}</p>
                  <p className="text-xs text-slate-400">Orden #{item.order_id}</p>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Panel de detalle */}
        {selected && (
          <div className="flex-1 bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
            <div className="p-5 border-b border-slate-100 flex items-start justify-between">
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium border ${TIPOS[selected.tipo]?.color}`}>
                    {TIPOS[selected.tipo]?.icon} {TIPOS[selected.tipo]?.label}
                  </span>
                </div>
                <p className="font-bold text-slate-900">{selected.client_nombre}</p>
                <p className="text-xs text-slate-500">Orden #{selected.order_id}</p>
              </div>
              <div className="flex items-center gap-1">
                <button onClick={() => handleDelete(selected.id)}
                  className="p-1.5 rounded-lg text-red-400 hover:text-red-600 hover:bg-red-50" title="Eliminar">
                  <X size={14} />
                </button>
                <button onClick={() => setSelected(null)} className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600">
                  <X size={16} />
                </button>
              </div>
            </div>

            <div className="p-5 space-y-4 overflow-y-auto max-h-[calc(100vh-350px)]">
              {/* Estado */}
              <div>
                <p className="text-xs font-semibold text-slate-500 mb-2">Cambiar Estado</p>
                <div className="grid grid-cols-3 gap-1.5">
                  {Object.entries(ESTADOS).map(([k, v]) => (
                    <button key={k} onClick={() => handleEstado(k)}
                      className={`py-1.5 rounded-lg text-xs font-medium transition-all border ${selected.estado === k ? 'border-[--brand-primary] bg-[--brand-primary]/5 text-[--brand-primary]' : 'border-slate-200 text-slate-600 hover:border-slate-300'}`}>
                      {v.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Calificación */}
              <div>
                <p className="text-xs font-semibold text-slate-500 mb-2">Calificación del Cliente</p>
                <div className="flex gap-2">
                  {[1, 2, 3, 4, 5].map(n => (
                    <button key={n} onClick={() => handleCalificacion(n)}
                      className={`w-9 h-9 rounded-xl border transition-all text-sm ${selected.calificacion === n ? 'border-amber-400 bg-amber-50 text-amber-600' : 'border-slate-200 text-slate-400 hover:border-amber-300'}`}>
                      {n}★
                    </button>
                  ))}
                </div>
              </div>

              {/* Descripción */}
              {selected.descripcion && (
                <div>
                  <p className="text-xs font-semibold text-slate-500 mb-1">Descripción</p>
                  <p className="text-sm text-slate-600 bg-slate-50 rounded-xl p-3">{selected.descripcion}</p>
                </div>
              )}

              {/* Mensaje IA */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <p className="text-xs font-semibold text-slate-500 flex items-center gap-1">
                    <Sparkles size={12} /> Mensaje IA Groq
                  </p>
                  <button onClick={handleGenerateAI} disabled={generatingAI}
                    className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-purple-50 border border-purple-200 text-purple-700 text-xs font-medium hover:bg-purple-100 transition-colors disabled:opacity-60">
                    <Sparkles size={11} /> {generatingAI ? 'Generando...' : 'Generar'}
                  </button>
                </div>
                {selected.ai_mensaje ? (
                  <div className="space-y-2">
                    <div className="bg-gradient-to-br from-purple-50 to-blue-50 border border-purple-100 rounded-xl p-3 text-sm text-slate-700 leading-relaxed">
                      {selected.ai_mensaje}
                    </div>
                    {emailSent ? (
                      <div className="flex items-center gap-2 rounded-xl bg-emerald-50 border border-emerald-200 px-3 py-2 text-xs font-semibold text-emerald-700">
                        <CheckCircle2 size={13} /> Email enviado al cliente
                      </div>
                    ) : (
                      <button onClick={handleSendEmail} disabled={sendingEmail}
                        className="flex w-full items-center justify-center gap-1.5 rounded-xl border border-blue-200 bg-blue-50 px-3 py-2 text-xs font-semibold text-blue-700 hover:bg-blue-100 transition-colors disabled:opacity-60">
                        {sendingEmail ? <RefreshCw size={12} className="animate-spin" /> : <MessageCircle size={12} />}
                        {sendingEmail ? 'Enviando...' : 'Enviar por Email al Cliente'}
                      </button>
                    )}
                  </div>
                ) : (
                  <div className="border border-dashed border-slate-200 rounded-xl p-3 text-center text-xs text-slate-400">
                    Presiona "Generar" para crear un mensaje de seguimiento personalizado con IA
                  </div>
                )}
              </div>

              {/* Timeline notas */}
              <div>
                <p className="text-xs font-semibold text-slate-500 mb-2">Timeline de Seguimiento</p>
                <div className="space-y-2 mb-3">
                  {selected.notas.length === 0 ? (
                    <p className="text-xs text-slate-400 text-center py-2">Sin notas de seguimiento</p>
                  ) : selected.notas.map((n, i) => (
                    <div key={i} className="flex gap-2.5">
                      <div className="w-5 h-5 rounded-full bg-slate-200 flex items-center justify-center flex-shrink-0 mt-0.5">
                        <MessageCircle size={10} className="text-slate-500" />
                      </div>
                      <div className="flex-1 bg-slate-50 rounded-xl p-2.5">
                        <p className="text-sm text-slate-700">{n.texto}</p>
                        <p className="text-xs text-slate-400 mt-0.5">
                          {new Date(n.fecha).toLocaleString('es-CL', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="flex gap-2">
                  <input value={notaText} onChange={e => setNotaText(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && handleAddNota()}
                    placeholder="Agregar nota de seguimiento..."
                    className="flex-1 px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[--brand-primary]/30" />
                  <button onClick={handleAddNota} disabled={addingNota || !notaText.trim()}
                    className="px-3 py-2 rounded-xl text-sm font-medium text-white disabled:opacity-60"
                    style={{ background: 'var(--brand-primary)' }}>
                    {addingNota ? '...' : 'Agregar'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Modal Nuevo */}
      {showNew && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
            <div className="flex items-center justify-between p-6 border-b border-slate-100">
              <h2 className="text-lg font-bold text-slate-900">Nuevo Seguimiento Post-Venta</h2>
              <button onClick={() => setShowNew(false)} className="p-2 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100"><X size={18} /></button>
            </div>
            <form onSubmit={handleCreate} className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1.5">N° Orden *</label>
                  <input type="number" required value={newForm.order_id} onChange={e => setNewForm(f => ({ ...f, order_id: e.target.value }))}
                    className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[--brand-primary]/30" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1.5">ID Cliente *</label>
                  <input type="number" required value={newForm.client_id} onChange={e => setNewForm(f => ({ ...f, client_id: e.target.value }))}
                    className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[--brand-primary]/30" />
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1.5">Tipo</label>
                <div className="grid grid-cols-3 gap-2">
                  {Object.entries(TIPOS).map(([k, v]) => (
                    <button type="button" key={k} onClick={() => setNewForm(f => ({ ...f, tipo: k }))}
                      className={`py-2 rounded-xl border text-xs font-medium transition-all flex items-center justify-center gap-1 ${newForm.tipo === k ? 'border-[--brand-primary] bg-[--brand-primary]/5 text-[--brand-primary]' : 'border-slate-200 text-slate-600'}`}>
                      {v.icon} {v.label}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1.5">Descripción</label>
                <textarea value={newForm.descripcion} onChange={e => setNewForm(f => ({ ...f, descripcion: e.target.value }))}
                  rows={3} placeholder="Describe el motivo del seguimiento..."
                  className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[--brand-primary]/30 resize-none" />
              </div>
              <div className="flex gap-3 pt-1">
                <button type="button" onClick={() => setShowNew(false)}
                  className="flex-1 py-2.5 rounded-xl border border-slate-200 text-sm font-semibold text-slate-700 hover:bg-slate-50">
                  Cancelar
                </button>
                <button type="submit" disabled={creating}
                  className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-white disabled:opacity-60"
                  style={{ background: 'linear-gradient(135deg, var(--brand-primary), var(--brand-dark))' }}>
                  {creating ? 'Creando...' : 'Crear Seguimiento'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
