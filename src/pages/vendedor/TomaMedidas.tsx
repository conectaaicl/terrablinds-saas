import { useState, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useApi } from '../../hooks/useApi';
import { useMutation } from '../../hooks/useMutation';
import { api } from '../../services/api';
import { TIPOS_PRODUCTO, TELAS, COLORES } from '../../types';
import { Spinner } from '../../components/LoadingStates';
import {
  Plus, Trash2, ArrowLeft, Ruler, CheckCircle, ExternalLink,
  Camera, X, Zap, FileText, Settings, ChevronDown, ChevronUp,
  Loader2,
} from 'lucide-react';

const fmt = (n: number) => n ? '$' + n.toLocaleString('es-CL') : '—';

const TIPOS_INSTALACION = ['empotrado', 'sobrepuesto', 'con cajón', 'sin cajón', 'en nicho', 'otro'];
const TIPOS_SISTEMA = ['cadena', 'motor', 'manual', 'cordón', 'zigzag'];
const TIPOS_SOPORTE = ['riel simple', 'riel doble', 'tubo', 'tensor', 'brackets', 'otro'];
const AMBIENTES = ['Sala comedor', 'Dormitorio principal', 'Dormitorio 2', 'Dormitorio 3', 'Estudio', 'Cocina', 'Baño', 'Terraza', 'Oficina', 'Otro'];

type Ambiente = {
  nombre: string;
  tipo: string;
  ancho: number;
  alto: number;
  tela: string;
  color: string;
  precio: number;
  observaciones: string;
  tipo_instalacion: string;
  tipo_sistema: string;
  tipo_soporte: string;
  tiene_motor: boolean;
  foto?: string; // base64
};

const ambienteVacio = (): Ambiente => ({
  nombre: AMBIENTES[0],
  tipo: TIPOS_PRODUCTO[0],
  ancho: 100,
  alto: 100,
  tela: TELAS[0],
  color: COLORES[0],
  precio: 0,
  observaciones: '',
  tipo_instalacion: 'empotrado',
  tipo_sistema: 'cadena',
  tipo_soporte: 'riel simple',
  tiene_motor: false,
});

// ── Camera capture ────────────────────────────────────────────────────────────

function CameraCapture({ onCapture, onClose }: { onCapture: (b64: string) => void; onClose: () => void }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [captured, setCaptured] = useState<string | null>(null);
  const [error, setError] = useState('');

  const startCamera = useCallback(async () => {
    try {
      const s = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
      setStream(s);
      if (videoRef.current) videoRef.current.srcObject = s;
    } catch {
      setError('No se pudo acceder a la cámara');
    }
  }, []);

  const stopCamera = useCallback(() => {
    stream?.getTracks().forEach(t => t.stop());
    setStream(null);
  }, [stream]);

  const capture = useCallback(() => {
    if (!videoRef.current || !canvasRef.current) return;
    const v = videoRef.current;
    const c = canvasRef.current;
    c.width = v.videoWidth;
    c.height = v.videoHeight;
    c.getContext('2d')!.drawImage(v, 0, 0);
    const b64 = c.toDataURL('image/jpeg', 0.8);
    setCaptured(b64);
    stopCamera();
  }, [stopCamera]);

  const confirm = () => {
    if (captured) onCapture(captured);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-black">
      <div className="absolute top-4 right-4">
        <button onClick={() => { stopCamera(); onClose(); }} className="rounded-full bg-white/20 p-2 text-white">
          <X size={20} />
        </button>
      </div>

      {!stream && !captured && (
        <div className="text-center">
          {error ? (
            <p className="mb-4 text-red-400">{error}</p>
          ) : (
            <button onClick={startCamera}
              className="flex flex-col items-center gap-3 rounded-2xl bg-white/10 px-8 py-6 text-white hover:bg-white/20">
              <Camera size={40} />
              <span className="font-semibold">Activar cámara</span>
            </button>
          )}
        </div>
      )}

      {stream && !captured && (
        <>
          <video ref={videoRef} autoPlay playsInline className="max-h-[70vh] w-full object-contain" />
          <button onClick={capture}
            className="mt-4 flex items-center gap-2 rounded-full bg-white px-6 py-3 font-bold text-slate-900">
            <Camera size={20} /> Capturar
          </button>
        </>
      )}

      {captured && (
        <>
          <img src={captured} alt="preview" className="max-h-[70vh] w-full object-contain" />
          <div className="mt-4 flex gap-4">
            <button onClick={() => { setCaptured(null); startCamera(); }}
              className="rounded-xl border border-white/30 px-5 py-2.5 text-white hover:bg-white/10">
              Repetir
            </button>
            <button onClick={confirm}
              className="rounded-xl bg-emerald-500 px-5 py-2.5 font-semibold text-white hover:bg-emerald-600">
              Usar foto
            </button>
          </div>
        </>
      )}
      <canvas ref={canvasRef} className="hidden" />
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export default function TomaMedidas() {
  const { user } = useAuth();
  const nav = useNavigate();

  const [selCliente, setSelCliente] = useState<number | null>(null);
  const [isNew, setIsNew] = useState(false);
  const [nc, setNc] = useState({ nombre: '', email: '', telefono: '', direccion: '' });
  const [ambientes, setAmbientes] = useState<Ambiente[]>([ambienteVacio()]);
  const [saving, setSaving] = useState(false);
  const [savedCotId, setSavedCotId] = useState<string | null>(null);
  const [savedOtId, setSavedOtId] = useState<number | null>(null);
  const [cameraFor, setCameraFor] = useState<number | null>(null);
  const [expanded, setExpanded] = useState<number[]>([0]);

  const { data: clientes, loading: loadingCli } = useApi(() => api.getClients());
  const { execute: crearCliente } = useMutation(api.createClient);
  const { execute: crearCotizacion } = useMutation(api.createCotizacion);
  const { execute: crearOrden } = useMutation(api.createOrder);

  const clienteList: any[] = clientes || [];
  const total = ambientes.reduce((s, a) => s + (a.precio || 0), 0);

  const addAmbiente = () => {
    const next = ambientes.length;
    setAmbientes(prev => [...prev, ambienteVacio()]);
    setExpanded(prev => [...prev, next]);
  };

  const rmAmbiente = (i: number) => {
    setAmbientes(prev => prev.filter((_, j) => j !== i));
    setExpanded(prev => prev.filter(x => x !== i).map(x => x > i ? x - 1 : x));
  };

  const updateAmbiente = (i: number, field: keyof Ambiente, val: any) => {
    setAmbientes(prev => prev.map((a, j) => j === i ? { ...a, [field]: val } : a));
  };

  const toggleExpanded = (i: number) => {
    setExpanded(prev => prev.includes(i) ? prev.filter(x => x !== i) : [...prev, i]);
  };

  const buildProductos = () =>
    ambientes.filter(a => a.precio > 0).map(a => ({
      tipo: a.tipo,
      ancho: a.ancho,
      alto: a.alto,
      tela: a.tela,
      color: a.color,
      precio: a.precio,
      ubicacion: a.nombre,
      accionamiento: `${a.tipo_sistema}${a.tiene_motor ? ' + motor' : ''} · ${a.tipo_instalacion} · ${a.tipo_soporte}`,
      notas: a.observaciones || undefined,
    }));

  const getOrCreateClient = async () => {
    if (isNew) {
      const cli = await crearCliente({ nombre: nc.nombre, email: nc.email || undefined, telefono: nc.telefono || undefined, direccion: nc.direccion || undefined });
      return cli?.id ?? null;
    }
    return selCliente;
  };

  const canSave = (isNew ? nc.nombre.length > 0 : selCliente !== null) && ambientes.some(a => a.precio > 0);

  const guardarCotizacion = async () => {
    if (!user || !canSave) return;
    setSaving(true);
    try {
      const clienteId = await getOrCreateClient();
      if (!clienteId) return;
      const productos = buildProductos();
      const cot = await crearCotizacion({
        cliente_id: clienteId,
        productos,
        precio_total: total,
        notas: `Toma de medidas in situ — ${ambientes.length} ambiente(s)`,
      });
      if (cot) setSavedCotId(cot.id);
    } finally {
      setSaving(false);
    }
  };

  const crearOT = async () => {
    if (!user || !canSave) return;
    setSaving(true);
    try {
      const clienteId = await getOrCreateClient();
      if (!clienteId) return;
      const productos = buildProductos();
      const ot = await crearOrden({
        cliente_id: clienteId,
        productos,
        precio_total: total,
      });
      if (ot) setSavedOtId(ot.id);
    } finally {
      setSaving(false);
    }
  };

  const clienteSeleccionado = clienteList.find(c => c.id === selCliente);
  const direccionCliente = isNew ? nc.direccion : clienteSeleccionado?.direccion;

  if (loadingCli) return <Spinner />;

  // Success state
  if (savedCotId || savedOtId) {
    return (
      <div className="mx-auto max-w-lg space-y-5">
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-6 text-center">
          <CheckCircle className="mx-auto mb-3 text-emerald-500" size={40} />
          <h2 className="text-lg font-bold text-emerald-800">
            {savedOtId ? '¡Orden de Trabajo creada!' : '¡Cotización guardada!'}
          </h2>
          <p className="mt-1 text-sm text-emerald-700">
            {savedOtId ? 'La OT fue creada y está lista para producción.' : 'El borrador fue guardado. Puedes enviarlo al cliente.'}
          </p>
          <div className="mt-4 flex flex-col gap-2">
            {savedCotId && (
              <button onClick={() => nav(`/vendedor/cotizacion/${savedCotId}`)}
                className="flex items-center justify-center gap-2 rounded-xl bg-emerald-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-emerald-700">
                <FileText size={15} /> Ver Cotización
              </button>
            )}
            {savedOtId && (
              <button onClick={() => nav(`/jefe/${savedOtId}`)}
                className="flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-blue-700">
                <Zap size={15} /> Ver Orden de Trabajo
              </button>
            )}
            <button onClick={() => { setSavedCotId(null); setSavedOtId(null); setAmbientes([ambienteVacio()]); setExpanded([0]); }}
              className="rounded-xl border border-slate-200 px-5 py-2.5 text-sm font-medium text-slate-600 hover:bg-slate-50">
              Nueva medición
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl space-y-5">
      <button onClick={() => nav('/vendedor')} className="flex items-center gap-1 text-sm font-medium text-slate-500 hover:text-slate-800">
        <ArrowLeft size={15} /> Volver
      </button>

      <div>
        <h1 className="text-2xl font-bold text-slate-900">Toma de Medidas</h1>
        <p className="text-sm text-slate-500">Registra las medidas en terreno para generar cotización u OT directamente</p>
      </div>

      {/* Cliente */}
      <div className="rounded-2xl border border-slate-200 bg-white p-5">
        <h2 className="mb-3 text-base font-semibold text-slate-900">Cliente</h2>
        <div className="mb-3 flex gap-2">
          <TabBtn active={!isNew} onClick={() => setIsNew(false)}>Existente</TabBtn>
          <TabBtn active={isNew} onClick={() => setIsNew(true)}>Nuevo</TabBtn>
        </div>

        {!isNew ? (
          <select value={selCliente ?? ''} onChange={e => setSelCliente(Number(e.target.value) || null)}
            className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:border-blue-400 focus:outline-none">
            <option value="">— Seleccionar cliente —</option>
            {clienteList.map(c => (
              <option key={c.id} value={c.id}>{c.nombre}{c.direccion ? ` · ${c.direccion}` : ''}</option>
            ))}
          </select>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2">
            <Input label="Nombre *" value={nc.nombre} onChange={v => setNc(n => ({ ...n, nombre: v }))} />
            <Input label="Teléfono" value={nc.telefono} onChange={v => setNc(n => ({ ...n, telefono: v }))} />
            <Input label="Email" value={nc.email} onChange={v => setNc(n => ({ ...n, email: v }))} />
            <Input label="Dirección" value={nc.direccion} onChange={v => setNc(n => ({ ...n, direccion: v }))} />
          </div>
        )}

        {direccionCliente && (
          <a href={`https://maps.google.com/?q=${encodeURIComponent(direccionCliente)}`}
            target="_blank" rel="noopener noreferrer"
            className="mt-2 flex items-center gap-1 text-xs text-blue-600 hover:underline">
            <ExternalLink size={11} /> Ver en Google Maps
          </a>
        )}
      </div>

      {/* Ambientes */}
      {ambientes.map((a, i) => {
        const isOpen = expanded.includes(i);
        return (
          <div key={i} className="rounded-2xl border border-slate-200 bg-white overflow-hidden">
            {/* Accordion header */}
            <button onClick={() => toggleExpanded(i)}
              className="flex w-full items-center justify-between px-5 py-4 text-left hover:bg-slate-50 transition-colors">
              <div className="flex items-center gap-3">
                <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-blue-100 text-xs font-bold text-blue-700">
                  {i + 1}
                </div>
                <div>
                  <p className="text-sm font-semibold text-slate-800">{a.nombre}</p>
                  <p className="text-xs text-slate-400">{a.tipo} · {a.ancho}×{a.alto} cm{a.precio ? ` · ${fmt(a.precio)}` : ''}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {a.foto && <span className="text-[10px] font-semibold text-emerald-600">📷 foto</span>}
                {ambientes.length > 1 && (
                  <button onClick={e => { e.stopPropagation(); rmAmbiente(i); }}
                    className="rounded-lg p-1 text-red-400 hover:bg-red-50 hover:text-red-600">
                    <Trash2 size={14} />
                  </button>
                )}
                {isOpen ? <ChevronUp size={16} className="text-slate-400" /> : <ChevronDown size={16} className="text-slate-400" />}
              </div>
            </button>

            {isOpen && (
              <div className="border-t border-slate-100 px-5 pb-5 pt-4 space-y-4">
                {/* Basic info */}
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="sm:col-span-2">
                    <Sel label="Nombre del ambiente" value={a.nombre} opts={AMBIENTES}
                      onChange={v => updateAmbiente(i, 'nombre', v)} />
                  </div>
                  <Sel label="Tipo de producto" value={a.tipo} opts={TIPOS_PRODUCTO}
                    onChange={v => updateAmbiente(i, 'tipo', v)} />
                  <Sel label="Tela" value={a.tela} opts={TELAS}
                    onChange={v => updateAmbiente(i, 'tela', v)} />
                  <Input label="Ancho (cm)" type="number" value={String(a.ancho)}
                    onChange={v => updateAmbiente(i, 'ancho', +v)} />
                  <Input label="Alto (cm)" type="number" value={String(a.alto)}
                    onChange={v => updateAmbiente(i, 'alto', +v)} />
                  <Sel label="Color" value={a.color} opts={COLORES}
                    onChange={v => updateAmbiente(i, 'color', v)} />
                  <Input label="Precio estimado ($)" type="number"
                    value={a.precio ? String(a.precio) : ''}
                    onChange={v => updateAmbiente(i, 'precio', +v)} placeholder="0" />
                </div>

                {/* Technical details */}
                <div className="rounded-xl bg-slate-50 p-3 space-y-3">
                  <p className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide text-slate-500">
                    <Settings size={12} /> Detalles Técnicos
                  </p>
                  <div className="grid gap-3 sm:grid-cols-3">
                    <Sel label="Tipo instalación" value={a.tipo_instalacion} opts={TIPOS_INSTALACION}
                      onChange={v => updateAmbiente(i, 'tipo_instalacion', v)} />
                    <Sel label="Sistema" value={a.tipo_sistema} opts={TIPOS_SISTEMA}
                      onChange={v => updateAmbiente(i, 'tipo_sistema', v)} />
                    <Sel label="Tipo soporte" value={a.tipo_soporte} opts={TIPOS_SOPORTE}
                      onChange={v => updateAmbiente(i, 'tipo_soporte', v)} />
                  </div>
                  <label className="flex cursor-pointer items-center gap-2.5 text-sm">
                    <div
                      onClick={() => updateAmbiente(i, 'tiene_motor', !a.tiene_motor)}
                      className={`relative h-5 w-9 rounded-full transition-colors ${a.tiene_motor ? 'bg-blue-600' : 'bg-slate-300'}`}>
                      <div className={`absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-transform ${a.tiene_motor ? 'translate-x-4' : 'translate-x-0.5'}`} />
                    </div>
                    <span className="font-medium text-slate-700">Incluye motor</span>
                    {a.tiene_motor && <span className="rounded-full bg-blue-100 px-2 py-0.5 text-[10px] font-bold text-blue-700">Motor</span>}
                  </label>
                </div>

                {/* Observaciones */}
                <div>
                  <label className="mb-1 block text-xs font-medium text-slate-600">Observaciones técnicas</label>
                  <textarea value={a.observaciones}
                    onChange={e => updateAmbiente(i, 'observaciones', e.target.value)}
                    rows={2}
                    placeholder="Ej: techo en ángulo, rieles existentes, acceso difícil..."
                    className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:border-blue-400 focus:outline-none resize-none" />
                </div>

                {/* Photo */}
                <div>
                  {a.foto ? (
                    <div className="relative">
                      <img src={a.foto} alt="foto ambiente" className="h-32 w-full rounded-xl object-cover" />
                      <button onClick={() => updateAmbiente(i, 'foto', undefined)}
                        className="absolute right-2 top-2 rounded-full bg-red-500 p-1 text-white hover:bg-red-600">
                        <X size={12} />
                      </button>
                    </div>
                  ) : (
                    <button onClick={() => setCameraFor(i)}
                      className="flex w-full items-center justify-center gap-2 rounded-xl border-2 border-dashed border-slate-300 py-3 text-sm font-medium text-slate-500 hover:border-blue-400 hover:text-blue-600 transition-colors">
                      <Camera size={16} /> Tomar foto del lugar
                    </button>
                  )}
                </div>

                {/* Preview row */}
                {a.precio > 0 && (
                  <div className="flex items-center gap-1.5 rounded-lg bg-blue-50 px-3 py-2 text-xs text-blue-700">
                    <Ruler size={12} />
                    <span>{a.ancho}×{a.alto} cm · {a.tela} · {a.color} · {a.tipo_instalacion}</span>
                    <span className="ml-auto font-bold">{fmt(a.precio)}</span>
                  </div>
                )}
              </div>
            )}
          </div>
        );
      })}

      <button onClick={addAmbiente}
        className="flex w-full items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-slate-300 py-3 text-sm font-medium text-slate-500 hover:border-slate-400 hover:text-slate-700 transition-colors">
        <Plus size={16} /> Agregar Ambiente
      </button>

      {/* Actions */}
      <div className="rounded-2xl border border-slate-200 bg-white p-5">
        <div className="mb-4 flex items-center justify-between">
          <p className="text-base font-semibold text-slate-700">Total estimado</p>
          <p className="text-2xl font-black text-slate-900">{fmt(total)}</p>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <button onClick={guardarCotizacion} disabled={!canSave || saving}
            className="flex items-center justify-center gap-2 rounded-xl border-2 border-emerald-500 px-4 py-3 text-sm font-semibold text-emerald-700 hover:bg-emerald-50 disabled:opacity-50 transition-colors">
            {saving ? <Loader2 size={15} className="animate-spin" /> : <FileText size={15} />}
            Guardar como Cotización
          </button>
          <button onClick={crearOT} disabled={!canSave || saving}
            className="flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-3 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50 transition-colors">
            {saving ? <Loader2 size={15} className="animate-spin" /> : <Zap size={15} />}
            Crear OT Directamente
          </button>
        </div>
        <p className="mt-2 text-center text-xs text-slate-400">
          "Crear OT" genera la orden de producción directamente sin pasar por cotización
        </p>
      </div>

      {/* Camera modal */}
      {cameraFor !== null && (
        <CameraCapture
          onCapture={b64 => updateAmbiente(cameraFor, 'foto', b64)}
          onClose={() => setCameraFor(null)}
        />
      )}
    </div>
  );
}

// ── Micro components ─────────────────────────────────────────────────────────

function TabBtn({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button onClick={onClick}
      className={`rounded-xl px-4 py-2 text-sm font-medium transition ${active ? 'bg-blue-100 text-blue-700' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'}`}>
      {children}
    </button>
  );
}

function Input({ label, value, onChange, type = 'text', placeholder }: {
  label: string; value: string; onChange: (v: string) => void; type?: string; placeholder?: string;
}) {
  return (
    <div>
      <label className="mb-1 block text-xs font-medium text-slate-600">{label}</label>
      <input type={type} value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder}
        className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:border-blue-400 focus:outline-none" />
    </div>
  );
}

function Sel({ label, value, opts, onChange }: {
  label: string; value: string; opts: string[]; onChange: (v: string) => void;
}) {
  return (
    <div>
      <label className="mb-1 block text-xs font-medium text-slate-600">{label}</label>
      <select value={value} onChange={e => onChange(e.target.value)}
        className="w-full rounded-xl border border-slate-200 px-2 py-2 text-sm focus:border-blue-400 focus:outline-none">
        {opts.map(o => <option key={o} value={o}>{o}</option>)}
      </select>
    </div>
  );
}
