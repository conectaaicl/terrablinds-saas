/**
 * Averías y Fallas — Panel del Instalador
 * Permite reportar fallas encontradas durante instalaciones y servicios.
 */
import { useState, useRef, useCallback } from 'react';
import { useApi } from '../../hooks/useApi';
import { api } from '../../services/api';
import { Spinner, ErrorMessage } from '../../components/LoadingStates';
import {
  AlertTriangle, Plus, RefreshCw, X, Camera, Check,
  Loader2, ChevronDown, Clock, Wrench, User, Package,
} from 'lucide-react';

const TIPOS_SERVICIO = [
  { value: 'cortinas_roller', label: 'Cortinas Roller' },
  { value: 'persianas', label: 'Persianas' },
  { value: 'electricidad', label: 'Electricidad' },
  { value: 'puertas', label: 'Puertas' },
  { value: 'ventanas', label: 'Ventanas' },
  { value: 'maderas', label: 'Maderas / Carpintería' },
  { value: 'muebles', label: 'Muebles' },
  { value: 'climatizacion', label: 'Climatización' },
  { value: 'iluminacion', label: 'Iluminación' },
  { value: 'plomeria', label: 'Plomería' },
  { value: 'automatizacion', label: 'Automatización' },
  { value: 'seguridad', label: 'Seguridad' },
  { value: 'otro', label: 'Otro' },
];

const SEVERIDAD_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  baja:    { label: 'Baja',    color: 'text-emerald-700', bg: 'bg-emerald-100' },
  media:   { label: 'Media',   color: 'text-amber-700',   bg: 'bg-amber-100'   },
  alta:    { label: 'Alta',    color: 'text-orange-700',  bg: 'bg-orange-100'  },
  critica: { label: 'Crítica', color: 'text-red-700',     bg: 'bg-red-100'     },
};

const ESTADO_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  reportada:     { label: 'Reportada',     color: 'text-sky-700',     bg: 'bg-sky-100'     },
  en_revision:   { label: 'En Revisión',   color: 'text-amber-700',   bg: 'bg-amber-100'   },
  en_reparacion: { label: 'En Reparación', color: 'text-violet-700',  bg: 'bg-violet-100'  },
  reparada:      { label: 'Reparada',      color: 'text-emerald-700', bg: 'bg-emerald-100' },
  cerrada:       { label: 'Cerrada',       color: 'text-slate-600',   bg: 'bg-slate-100'   },
};

// ── Camera Capture ───────────────────────────────────────────────────────────
function CameraCapture({ onCapture, onCancel }: { onCapture: (data: string) => void; onCancel: () => void }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [streaming, setStreaming] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);
  const [error, setError] = useState('');

  const startCamera = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
        setStreaming(true);
      }
    } catch {
      setError('No se pudo acceder a la cámara. Verifica los permisos.');
    }
  }, []);

  const stopStream = () => {
    const v = videoRef.current;
    if (v && v.srcObject) {
      (v.srcObject as MediaStream).getTracks().forEach(t => t.stop());
      v.srcObject = null;
    }
    setStreaming(false);
  };

  const capture = () => {
    const v = videoRef.current;
    const c = canvasRef.current;
    if (!v || !c) return;
    c.width = v.videoWidth;
    c.height = v.videoHeight;
    c.getContext('2d')!.drawImage(v, 0, 0);
    const data = c.toDataURL('image/jpeg', 0.8);
    stopStream();
    setPreview(data);
  };

  const confirm = () => { if (preview) onCapture(preview); };
  const retry = () => { setPreview(null); startCamera(); };

  const handleCancel = () => { stopStream(); onCancel(); };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-sm rounded-2xl bg-white overflow-hidden shadow-2xl">
        <div className="flex items-center justify-between px-4 py-3 border-b">
          <span className="font-semibold text-slate-800">Capturar Foto</span>
          <button onClick={handleCancel} className="p-1 rounded-lg hover:bg-slate-100"><X size={18} /></button>
        </div>
        {!streaming && !preview && (
          <div className="p-6 flex flex-col items-center gap-4">
            {error && <p className="text-red-600 text-sm text-center">{error}</p>}
            <Camera size={48} className="text-slate-300" />
            <button onClick={startCamera}
              className="w-full py-2.5 rounded-xl bg-slate-900 text-white font-semibold text-sm hover:bg-slate-700">
              Abrir Cámara
            </button>
          </div>
        )}
        {streaming && !preview && (
          <div className="flex flex-col items-center gap-3 p-3">
            <video ref={videoRef} className="w-full rounded-lg" playsInline />
            <button onClick={capture}
              className="w-12 h-12 rounded-full bg-slate-900 text-white flex items-center justify-center hover:bg-slate-700">
              <Camera size={20} />
            </button>
          </div>
        )}
        {preview && (
          <div className="flex flex-col items-center gap-3 p-3">
            <img src={preview} className="w-full rounded-lg" alt="preview" />
            <div className="flex gap-2 w-full">
              <button onClick={retry} className="flex-1 py-2 rounded-xl border border-slate-300 text-sm font-medium hover:bg-slate-50">
                Reintentar
              </button>
              <button onClick={confirm} className="flex-1 py-2 rounded-xl bg-emerald-600 text-white text-sm font-semibold hover:bg-emerald-700">
                Usar Foto
              </button>
            </div>
          </div>
        )}
      </div>
      <canvas ref={canvasRef} className="hidden" />
    </div>
  );
}

// ── Create Modal ─────────────────────────────────────────────────────────────
function NuevaAveriaModal({
  clients,
  orders,
  onSave,
  onClose,
}: {
  clients: any[];
  orders: any[];
  onSave: (data: Record<string, any>) => Promise<void>;
  onClose: () => void;
}) {
  const [form, setForm] = useState({
    tipo_servicio: '',
    titulo: '',
    descripcion: '',
    severidad: 'media',
    client_id: '',
    order_id: '',
    notas_tecnicas: '',
  });
  const [fotos, setFotos] = useState<string[]>([]);
  const [showCamera, setShowCamera] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const set = (k: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
    setForm(p => ({ ...p, [k]: e.target.value }));

  const handleCapture = (data: string) => {
    setFotos(prev => [...prev, data]);
    setShowCamera(false);
  };

  const removePhoto = (idx: number) => setFotos(prev => prev.filter((_, i) => i !== idx));

  const submit = async () => {
    if (!form.tipo_servicio) return setError('Selecciona el tipo de servicio');
    if (!form.titulo.trim()) return setError('El título es requerido');
    setSaving(true);
    setError('');
    try {
      const payload: Record<string, any> = {
        tipo_servicio: form.tipo_servicio,
        titulo: form.titulo.trim(),
        descripcion: form.descripcion || undefined,
        severidad: form.severidad,
        fotos,
        notas_tecnicas: form.notas_tecnicas || undefined,
      };
      if (form.client_id) payload.client_id = parseInt(form.client_id);
      if (form.order_id) payload.order_id = parseInt(form.order_id);
      await onSave(payload);
    } catch (e: any) {
      setError(e?.message || 'Error al guardar');
    } finally {
      setSaving(false);
    }
  };

  const field = 'block w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:ring-2 focus:ring-slate-900 focus:border-transparent outline-none';

  return (
    <>
      {showCamera && <CameraCapture onCapture={handleCapture} onCancel={() => setShowCamera(false)} />}
      <div className="fixed inset-0 z-40 bg-black/50 flex items-end sm:items-center justify-center p-0 sm:p-4">
        <div className="w-full sm:max-w-lg max-h-[90vh] overflow-y-auto rounded-t-2xl sm:rounded-2xl bg-white shadow-2xl">
          <div className="sticky top-0 bg-white flex items-center justify-between px-5 py-4 border-b z-10">
            <div>
              <h2 className="font-bold text-slate-900">Reportar Avería / Falla</h2>
              <p className="text-xs text-slate-500 mt-0.5">Describe el problema encontrado</p>
            </div>
            <button onClick={onClose} className="p-2 rounded-xl hover:bg-slate-100"><X size={18} /></button>
          </div>

          <div className="p-5 space-y-4">
            {/* Tipo de servicio */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Tipo de Servicio *</label>
              <select value={form.tipo_servicio} onChange={set('tipo_servicio')} className={field}>
                <option value="">Seleccionar...</option>
                {TIPOS_SERVICIO.map(t => (
                  <option key={t.value} value={t.value}>{t.label}</option>
                ))}
              </select>
            </div>

            {/* Titulo */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Título *</label>
              <input value={form.titulo} onChange={set('titulo')} placeholder="Ej: Motor cortina atascado, persiana rota..." className={field} />
            </div>

            {/* Severidad */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Severidad</label>
              <div className="flex gap-2 flex-wrap">
                {Object.entries(SEVERIDAD_CONFIG).map(([v, cfg]) => (
                  <button key={v} onClick={() => setForm(p => ({ ...p, severidad: v }))}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all
                      ${form.severidad === v ? `${cfg.bg} ${cfg.color} border-transparent shadow-sm` : 'border-slate-200 text-slate-600 hover:bg-slate-50'}`}>
                    {cfg.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Cliente */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                <User size={11} className="inline mr-1" />Cliente (opcional)
              </label>
              <select value={form.client_id} onChange={set('client_id')} className={field}>
                <option value="">Sin cliente asociado</option>
                {clients.map((c: any) => (
                  <option key={c.id} value={c.id}>{c.nombre} {c.telefono ? `— ${c.telefono}` : ''}</option>
                ))}
              </select>
            </div>

            {/* OT */}
            {orders.length > 0 && (
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  <Package size={11} className="inline mr-1" />OT Asociada (opcional)
                </label>
                <select value={form.order_id} onChange={set('order_id')} className={field}>
                  <option value="">Sin OT asociada</option>
                  {orders.map((o: any) => (
                    <option key={o.id} value={o.id}>#{o.numero_ot || o.id} — {o.cliente_nombre || 'Sin cliente'}</option>
                  ))}
                </select>
              </div>
            )}

            {/* Descripcion */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Descripción</label>
              <textarea value={form.descripcion} onChange={set('descripcion')}
                placeholder="Describe detalladamente el problema encontrado..."
                rows={3} className={field} />
            </div>

            {/* Notas técnicas */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Notas Técnicas</label>
              <textarea value={form.notas_tecnicas} onChange={set('notas_tecnicas')}
                placeholder="Observaciones técnicas, materiales necesarios, procedimiento recomendado..."
                rows={2} className={field} />
            </div>

            {/* Fotos */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-2">Fotos del Problema</label>
              <div className="flex flex-wrap gap-2">
                {fotos.map((f, i) => (
                  <div key={i} className="relative">
                    <img src={f} className="w-20 h-20 object-cover rounded-xl border border-slate-200" alt={`foto ${i + 1}`} />
                    <button onClick={() => removePhoto(i)}
                      className="absolute -top-1.5 -right-1.5 bg-red-500 text-white rounded-full p-0.5 hover:bg-red-600">
                      <X size={12} />
                    </button>
                  </div>
                ))}
                <button onClick={() => setShowCamera(true)}
                  className="w-20 h-20 rounded-xl border-2 border-dashed border-slate-300 flex flex-col items-center justify-center gap-1 text-slate-400 hover:border-slate-400 hover:text-slate-500 text-xs">
                  <Camera size={20} />
                  Foto
                </button>
              </div>
            </div>

            {error && <p className="text-red-600 text-sm bg-red-50 rounded-xl px-3 py-2">{error}</p>}
          </div>

          <div className="sticky bottom-0 bg-white border-t px-5 py-4 flex gap-3">
            <button onClick={onClose} className="flex-1 py-2.5 rounded-xl border border-slate-200 text-sm font-medium hover:bg-slate-50">
              Cancelar
            </button>
            <button onClick={submit} disabled={saving}
              className="flex-1 py-2.5 rounded-xl bg-slate-900 text-white text-sm font-semibold hover:bg-slate-700 disabled:opacity-50 flex items-center justify-center gap-2">
              {saving ? <Loader2 size={16} className="animate-spin" /> : <Check size={16} />}
              {saving ? 'Guardando...' : 'Reportar Avería'}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}

// ── Main Page ────────────────────────────────────────────────────────────────
export default function InstaladorAverias() {
  const [showNew, setShowNew] = useState(false);
  const [filterEstado, setFilterEstado] = useState('');
  const [success, setSuccess] = useState('');

  const { data: averias, loading, error, refetch } = useApi(() => api.getAverias());
  const { data: clients } = useApi(() => api.getClients());
  const { data: orders } = useApi(() => api.getOrders());

  const handleCreate = async (data: Record<string, any>) => {
    await api.createAveria(data);
    setShowNew(false);
    setSuccess('Avería reportada exitosamente');
    refetch();
    setTimeout(() => setSuccess(''), 4000);
  };

  if (loading) return <Spinner />;
  if (error) return <ErrorMessage message={error} onRetry={refetch} />;

  const list: any[] = averias || [];
  const filtered = filterEstado ? list.filter((a: any) => a.estado === filterEstado) : list;
  const clientList: any[] = clients || [];
  const orderList: any[] = orders || [];

  return (
    <div className="min-h-screen bg-slate-50 p-4 pb-8">
      {/* Header */}
      <div className="mb-5">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-slate-900 flex items-center gap-2">
              <AlertTriangle size={22} className="text-orange-500" />
              Averías y Fallas
            </h1>
            <p className="text-sm text-slate-500 mt-0.5">Reporta problemas encontrados en los servicios</p>
          </div>
          <button onClick={() => setShowNew(true)}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-900 text-white text-sm font-semibold hover:bg-slate-700">
            <Plus size={16} />
            Reportar
          </button>
        </div>

        {success && (
          <div className="mt-3 flex items-center gap-2 rounded-xl bg-emerald-50 border border-emerald-200 px-4 py-2.5 text-emerald-700 text-sm font-medium">
            <Check size={16} />
            {success}
          </div>
        )}
      </div>

      {/* Filter */}
      <div className="flex gap-2 overflow-x-auto pb-1 mb-4 scrollbar-hide">
        <button onClick={() => setFilterEstado('')}
          className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap border transition-all
            ${!filterEstado ? 'bg-slate-900 text-white border-transparent' : 'border-slate-200 text-slate-600 hover:bg-slate-50'}`}>
          Todas ({list.length})
        </button>
        {Object.entries(ESTADO_CONFIG).map(([v, cfg]) => {
          const count = list.filter((a: any) => a.estado === v).length;
          if (!count && filterEstado !== v) return null;
          return (
            <button key={v} onClick={() => setFilterEstado(v === filterEstado ? '' : v)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap border transition-all
                ${filterEstado === v ? `${cfg.bg} ${cfg.color} border-transparent` : 'border-slate-200 text-slate-600 hover:bg-slate-50'}`}>
              {cfg.label} ({count})
            </button>
          );
        })}
      </div>

      {/* List */}
      {filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 gap-3 text-slate-400">
          <Wrench size={40} className="opacity-30" />
          <p className="text-sm font-medium">
            {list.length === 0 ? 'No has reportado averías aún' : 'No hay averías con ese filtro'}
          </p>
          {list.length === 0 && (
            <button onClick={() => setShowNew(true)}
              className="mt-1 px-4 py-2 rounded-xl bg-slate-900 text-white text-sm font-semibold">
              Reportar primera avería
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((a: any) => {
            const sev = SEVERIDAD_CONFIG[a.severidad] || SEVERIDAD_CONFIG.media;
            const est = ESTADO_CONFIG[a.estado] || ESTADO_CONFIG.reportada;
            return (
              <div key={a.id} className="bg-white rounded-2xl border border-slate-100 p-4 shadow-sm">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <span className={`px-2 py-0.5 rounded-lg text-xs font-semibold ${sev.bg} ${sev.color}`}>{sev.label}</span>
                      <span className={`px-2 py-0.5 rounded-lg text-xs font-semibold ${est.bg} ${est.color}`}>{est.label}</span>
                      <span className="text-xs text-slate-500 bg-slate-100 px-2 py-0.5 rounded-lg">
                        {TIPOS_SERVICIO.find(t => t.value === a.tipo_servicio)?.label || a.tipo_servicio}
                      </span>
                    </div>
                    <h3 className="font-semibold text-slate-900 text-sm truncate">{a.titulo}</h3>
                    {a.descripcion && <p className="text-xs text-slate-500 mt-0.5 line-clamp-2">{a.descripcion}</p>}
                    <div className="flex items-center gap-3 mt-2 flex-wrap">
                      {a.client_nombre && (
                        <span className="flex items-center gap-1 text-xs text-slate-500">
                          <User size={11} />{a.client_nombre}
                        </span>
                      )}
                      {a.asignado_nombre && (
                        <span className="flex items-center gap-1 text-xs text-violet-600">
                          <Wrench size={11} />Asignado: {a.asignado_nombre}
                        </span>
                      )}
                      <span className="flex items-center gap-1 text-xs text-slate-400">
                        <Clock size={11} />
                        {a.created_at ? new Date(a.created_at).toLocaleDateString('es-CL') : '—'}
                      </span>
                    </div>
                  </div>
                  {a.fotos?.length > 0 && (
                    <img src={a.fotos[0]} className="w-14 h-14 rounded-xl object-cover border border-slate-100 flex-shrink-0" alt="foto" />
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Refresh */}
      <div className="mt-6 flex justify-center">
        <button onClick={refetch} className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-slate-600">
          <RefreshCw size={13} />Actualizar
        </button>
      </div>

      {showNew && (
        <NuevaAveriaModal
          clients={clientList}
          orders={orderList}
          onSave={handleCreate}
          onClose={() => setShowNew(false)}
        />
      )}
    </div>
  );
}
