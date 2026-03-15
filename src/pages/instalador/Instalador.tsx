/**
 * Panel del Instalador — GPS Tracking, Tareas, Fotos y Firma Digital
 */
import { useCallback, useRef, useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useApi } from '../../hooks/useApi';
import { useMutation } from '../../hooks/useMutation';
import { api } from '../../services/api';
import { ESTADO_CONFIG, PRIORIDAD_CONFIG, TASK_ESTADO_CONFIG } from '../../types';
import type { DailyTask } from '../../types';
import { Spinner, ErrorMessage } from '../../components/LoadingStates';
import FirmaDigital from '../../components/FirmaDigital';
import {
  Wrench, ChevronRight, ArrowLeft, MapPin,
  CheckCircle2, AlertTriangle, Clock, User, Ruler, Palette,
  Camera, Navigation, Upload, Loader2, ExternalLink,
  ListTodo, WifiOff, PenLine,
  RefreshCw, Package,
} from 'lucide-react';

const API_URL = (import.meta as any).env?.VITE_API_URL ?? 'http://localhost:8000';
const fmtDate = (s: string) => s ? new Date(s).toLocaleDateString('es-CL') : '—';

const ACTIVE_ESTADOS = ['instalacion_programada', 'en_camino', 'instalando', 'instalacion_completada',
  // Retrocompatibilidad
  'agendado', 'en_ruta', 'en_instalacion', 'pendiente_firma'];
const DONE_ESTADOS = ['cerrada', 'cerrado'];

// ─── Google Maps Link ────────────────────────────────────────
function GoogleMapsLink({ direccion }: { direccion: string }) {
  const url = `https://maps.google.com/?q=${encodeURIComponent(direccion)}`;
  return (
    <a href={url} target="_blank" rel="noopener noreferrer"
      className="flex items-center gap-1 text-blue-600 hover:underline text-xs">
      <ExternalLink size={11} /> {direccion}
    </a>
  );
}

// ─── GPS Tracker (hook) ──────────────────────────────────────
function useGpsTracker(orderId: number | undefined, enabled: boolean) {
  const [tracking, setTracking] = useState(false);
  const [error, setError] = useState('');
  const watchId = useRef<number | null>(null);

  const startTracking = useCallback(() => {
    if (!navigator.geolocation) {
      setError('GPS no disponible en este dispositivo');
      return;
    }
    setTracking(true);
    setError('');
    watchId.current = navigator.geolocation.watchPosition(
      (pos) => {
        api.sendGpsPing({
          lat: pos.coords.latitude,
          lon: pos.coords.longitude,
          precision_m: Math.round(pos.coords.accuracy),
          velocidad_kmh: pos.coords.speed ? pos.coords.speed * 3.6 : undefined,
          heading: pos.coords.heading ?? undefined,
          order_id: orderId,
        }).catch(() => {}); // silencioso
      },
      (err) => {
        setError('Error GPS: ' + err.message);
        setTracking(false);
      },
      { enableHighAccuracy: true, maximumAge: 10_000, timeout: 30_000 }
    );
  }, [orderId]);

  const stopTracking = useCallback(() => {
    if (watchId.current !== null) {
      navigator.geolocation.clearWatch(watchId.current);
      watchId.current = null;
    }
    setTracking(false);
  }, []);

  // Auto-start cuando enabled=true
  useEffect(() => {
    if (enabled && !tracking) startTracking();
    if (!enabled && tracking) stopTracking();
  }, [enabled]);

  // Cleanup
  useEffect(() => () => stopTracking(), []);

  return { tracking, startTracking, stopTracking, gpsError: error };
}

// ─── Fotos de Instalación ────────────────────────────────────
function FotosInstalacion({ orderId }: { orderId: number }) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState('');

  const { data: fotos, loading, refetch } = useApi(() => api.getOrderPhotos(orderId), [orderId]);
  const fotoList: any[] = fotos || [];

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadError('');
    setUploading(true);
    try {
      await api.uploadPhoto(orderId, file, 'durante');
      refetch();
    } catch (err: any) {
      setUploadError(err.message || 'Error al subir foto');
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  };

  if (loading) return <Spinner />;

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="flex items-center gap-2 text-base font-semibold text-slate-900">
          <Camera size={16} /> Fotos ({fotoList.length}/10)
        </h2>
        {fotoList.length < 10 && (
          <label className="flex cursor-pointer items-center gap-1.5 rounded-lg bg-violet-50 px-3 py-1.5 text-xs font-semibold text-violet-700 hover:bg-violet-100">
            {uploading ? <Loader2 size={13} className="animate-spin" /> : <Upload size={13} />}
            {uploading ? 'Subiendo...' : 'Agregar foto'}
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              capture="environment"
              className="hidden"
              onChange={handleFile}
              disabled={uploading}
            />
          </label>
        )}
      </div>
      {uploadError && (
        <p className="mb-2 rounded-lg bg-red-50 px-3 py-2 text-xs text-red-700">{uploadError}</p>
      )}
      {fotoList.length === 0 ? (
        <div className="rounded-lg border-2 border-dashed border-slate-200 p-6 text-center">
          <Camera size={22} className="mx-auto text-slate-300" />
          <p className="mt-2 text-xs text-slate-400">Agrega fotos antes y después de la instalación</p>
        </div>
      ) : (
        <div className="grid grid-cols-3 gap-2">
          {fotoList.map((f: any) => (
            <a key={f.id} href={`${API_URL}${f.url}`} target="_blank" rel="noopener noreferrer"
              className="aspect-square overflow-hidden rounded-lg border border-slate-200 bg-slate-100">
              <img src={`${API_URL}${f.url}`} alt="Foto instalación"
                className="h-full w-full object-cover transition hover:opacity-90" />
            </a>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Checklist de Instalación ────────────────────────────────
const CHECKLIST_ITEMS = [
  { id: 'llegada',    label: 'Llegué al domicilio del cliente' },
  { id: 'materiales', label: 'Verifiqué materiales y herramientas' },
  { id: 'medidas',    label: 'Confirmé medidas en terreno' },
  { id: 'instalacion',label: 'Instalación realizada conforme' },
  { id: 'limpieza',   label: 'Zona de trabajo limpia y ordenada' },
  { id: 'cliente_ok', label: 'Cliente revisó y aprobó el trabajo' },
  { id: 'fotos_ok',   label: 'Fotos de antes y después tomadas' },
];

function ChecklistInstalacion({ orderId }: { orderId: number }) {
  const { data: remote, loading } = useApi(() => api.getChecklist(orderId), [orderId]);
  const [checked, setChecked] = useState<Record<string, boolean>>({});
  const [saving, setSaving] = useState(false);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Cargar desde backend cuando lleguen los datos
  useEffect(() => {
    if (remote?.items) setChecked(remote.items);
  }, [remote]);

  const total = CHECKLIST_ITEMS.length;
  const done = Object.values(checked).filter(Boolean).length;

  const toggle = (id: string) => {
    const next = { ...checked, [id]: !checked[id] };
    setChecked(next);
    // Auto-guardar con debounce de 800ms
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(async () => {
      setSaving(true);
      try { await api.saveChecklist(orderId, next); } catch { /* silencioso */ }
      finally { setSaving(false); }
    }, 800);
  };

  if (loading) return null;

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="flex items-center gap-2 text-base font-semibold text-slate-900">
          <ListTodo size={16} /> Checklist de Instalación
        </h2>
        <span className={`rounded-full px-2 py-0.5 text-xs font-bold ${done === total ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}>
          {saving ? '...' : `${done}/${total}`}
        </span>
      </div>
      <div className="space-y-2">
        {CHECKLIST_ITEMS.map(item => (
          <label key={item.id}
            className={`flex cursor-pointer items-center gap-3 rounded-lg border p-3 transition ${checked[item.id] ? 'border-emerald-200 bg-emerald-50' : 'border-slate-100 hover:bg-slate-50'}`}>
            <input type="checkbox" checked={!!checked[item.id]} onChange={() => toggle(item.id)}
              className="h-4 w-4 rounded accent-emerald-500" />
            <span className={`text-sm ${checked[item.id] ? 'font-medium text-emerald-800 line-through opacity-70' : 'text-slate-700'}`}>
              {item.label}
            </span>
          </label>
        ))}
      </div>
      {done === total && (
        <div className="mt-3 rounded-lg bg-emerald-50 p-2 text-center text-xs font-semibold text-emerald-700">
          Checklist completo — puedes cerrar la OT con firma del cliente
        </div>
      )}
    </div>
  );
}


// ─── Mis Tareas del Día ──────────────────────────────────────
function MisTareasHoy() {
  const { data: tareas, loading, refetch } = useApi(() => api.getMisTareas());
  const { execute: updateTask } = useMutation((id: string, data: any) => api.updateTask(id, data));
  const taskList: DailyTask[] = tareas || [];

  const cambiarEstado = async (id: string, estado: string) => {
    await updateTask(id, { estado });
    refetch();
  };

  if (loading) return null;
  if (taskList.length === 0) return null;

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5">
      <h2 className="mb-3 flex items-center gap-2 text-base font-semibold text-slate-900">
        <ListTodo size={16} /> Mis Tareas de Hoy ({taskList.length})
      </h2>
      <div className="space-y-2">
        {taskList.map(t => {
          const pr = PRIORIDAD_CONFIG[t.prioridad] || PRIORIDAD_CONFIG.normal;
          const est = TASK_ESTADO_CONFIG[t.estado] || TASK_ESTADO_CONFIG.pendiente;
          return (
            <div key={t.id} className="flex items-start gap-2.5 rounded-lg border border-slate-100 p-3">
              <div className={`mt-1 h-2.5 w-1 shrink-0 rounded-full ${pr.dot}`} />
              <div className="flex-1 min-w-0">
                <p className={`text-sm font-medium text-slate-800 ${t.estado === 'completada' ? 'line-through opacity-60' : ''}`}>
                  {t.titulo}
                </p>
                {t.descripcion && <p className="text-xs text-slate-500">{t.descripcion}</p>}
                <div className="mt-1 flex gap-1.5">
                  <span className={`rounded-full px-1.5 py-0.5 text-[10px] font-semibold ${pr.bg} ${pr.color}`}>{pr.label}</span>
                  <span className={`rounded-full px-1.5 py-0.5 text-[10px] font-semibold ${est.bg} ${est.color}`}>{est.label}</span>
                </div>
              </div>
              {t.estado === 'pendiente' && (
                <button onClick={() => cambiarEstado(t.id, 'en_progreso')}
                  className="shrink-0 rounded-lg bg-blue-50 px-2 py-1 text-[10px] font-semibold text-blue-700 hover:bg-blue-100">
                  Iniciar
                </button>
              )}
              {t.estado === 'en_progreso' && (
                <button onClick={() => cambiarEstado(t.id, 'completada')}
                  className="shrink-0 rounded-lg bg-emerald-50 px-2 py-1 text-[10px] font-semibold text-emerald-700 hover:bg-emerald-100">
                  Listo
                </button>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// MIS INSTALACIONES (lista)
// ═══════════════════════════════════════════════════════════════
export function MisInstalaciones() {
  const { data: orders, loading, error, refetch } = useApi(() => api.getMyOrders());

  if (loading) return <Spinner />;
  if (error) return <ErrorMessage message={error} onRetry={refetch} />;

  const all: any[] = orders || [];
  const activas = all.filter(o => ACTIVE_ESTADOS.includes(o.estado));
  const completadas = all.filter(o => DONE_ESTADOS.includes(o.estado));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Mis Instalaciones</h1>
          <p className="text-sm text-slate-500">{all.length} asignadas total</p>
        </div>
        <button onClick={refetch}
          className="flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-600 hover:bg-slate-50">
          <RefreshCw size={13} />
        </button>
      </div>

      {/* Tareas del día */}
      <MisTareasHoy />

      {/* Estadísticas */}
      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <div className="flex items-center gap-2.5">
            <div className="rounded-lg bg-violet-100 p-2"><Wrench size={18} className="text-violet-600" /></div>
            <div>
              <p className="text-xl font-bold text-slate-900">{activas.length}</p>
              <p className="text-xs text-slate-500">Activas</p>
            </div>
          </div>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <div className="flex items-center gap-2.5">
            <div className="rounded-lg bg-emerald-100 p-2"><CheckCircle2 size={18} className="text-emerald-600" /></div>
            <div>
              <p className="text-xl font-bold text-slate-900">{completadas.length}</p>
              <p className="text-xs text-slate-500">Completadas</p>
            </div>
          </div>
        </div>
      </div>

      {activas.length > 0 && (
        <div>
          <h2 className="mb-2 text-sm font-bold text-slate-700">Activas</h2>
          <div className="space-y-2">
            {activas.map(o => {
              const cfg = ESTADO_CONFIG[o.estado] || ESTADO_CONFIG.instalacion_programada;
              const isEnRoute = o.estado === 'en_camino' || o.estado === 'en_ruta';
              return (
                <Link key={o.id} to={`/instalador/${o.id}`}
                  className={`block rounded-xl border border-l-4 bg-white p-4 shadow-sm transition hover:shadow-md ${
                    isEnRoute ? 'border-violet-400 border-l-violet-500' : 'border-slate-200 border-l-violet-400'
                  }`}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-violet-100">
                        {isEnRoute ? <Navigation size={17} className="text-violet-600 animate-pulse" /> : <Wrench size={17} className="text-violet-600" />}
                      </div>
                      <div>
                        <p className="text-sm font-bold text-slate-800">OT #{o.numero}</p>
                        <p className="text-xs text-slate-500">{o.productos?.length || 0} producto(s)</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${cfg.bg} ${cfg.color}`}>{cfg.label}</span>
                      <ChevronRight size={15} className="text-slate-300" />
                    </div>
                  </div>
                  {(o.cliente_nombre || o.cliente_direccion) && (
                    <div className="mt-2.5 rounded-lg bg-slate-50 p-2.5 text-xs text-slate-600">
                      {o.cliente_nombre && <p className="font-semibold">{o.cliente_nombre}</p>}
                      {o.cliente_direccion && (
                        <p className="flex items-center gap-1 text-blue-600">
                          <MapPin size={10} /> {o.cliente_direccion}
                        </p>
                      )}
                    </div>
                  )}
                </Link>
              );
            })}
          </div>
        </div>
      )}

      {completadas.length > 0 && (
        <div>
          <h2 className="mb-2 text-sm font-bold text-slate-700">Completadas</h2>
          <div className="space-y-2">
            {completadas.map(o => (
              <Link key={o.id} to={`/instalador/${o.id}`}
                className="flex items-center justify-between rounded-xl border border-slate-200 border-l-4 border-l-emerald-400 bg-white p-4 shadow-sm transition hover:shadow-md">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-emerald-100">
                    <CheckCircle2 size={17} className="text-emerald-600" />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-slate-800">OT #{o.numero}</p>
                    <p className="text-xs text-slate-500">{o.cliente_nombre || '—'} · Cerrada</p>
                  </div>
                </div>
                <ChevronRight size={15} className="text-slate-300" />
              </Link>
            ))}
          </div>
        </div>
      )}

      {all.length === 0 && (
        <div className="rounded-xl border border-slate-200 bg-white p-14 text-center">
          <Package size={40} className="mx-auto text-slate-300" />
          <p className="mt-3 text-sm text-slate-500">No tienes instalaciones asignadas</p>
        </div>
      )}
    </div>
  );
}


// ═══════════════════════════════════════════════════════════════
// DETALLE INSTALACIÓN (con GPS + Firma)
// ═══════════════════════════════════════════════════════════════
export function DetalleInstalacion() {
  const { id } = useParams();
  const nav = useNavigate();
  const numId = Number(id);

  const [showFirma, setShowFirma] = useState(false);
  const [firmaSaved, setFirmaSaved] = useState(false);

  const { data: orden, loading, error, refetch } = useApi(
    () => api.getOrder(numId), [numId]
  );

  const { execute: cambiarEstado, loading: changing } = useMutation(
    (estado: string, notas?: string) => api.changeEstado(numId, estado, notas)
  );

  const { execute: guardarFirma, loading: savingFirma } = useMutation(
    (firma: string, firmante: any) => api.saveSignature(numId, { firma_data: firma, ...firmante })
  );

  // GPS automático cuando está en_camino o en_ruta
  const estadoActual = orden?.estado || '';
  const gpsAutoEnabled = estadoActual === 'en_camino' || estadoActual === 'en_ruta';
  const { tracking, startTracking, stopTracking, gpsError } = useGpsTracker(numId, gpsAutoEnabled);

  const doChange = useCallback(async (estado: string, notas?: string) => {
    const res = await cambiarEstado(estado, notas);
    if (res) refetch();
  }, [cambiarEstado, refetch]);

  const reportarProblema = useCallback(async () => {
    const notas = prompt('Describe el problema brevemente:');
    if (!notas) return;
    await doChange('problema', notas);
  }, [doChange]);

  const handleFirma = async (firmaBase64: string, firmante: any) => {
    const res = await guardarFirma(firmaBase64, firmante);
    if (res) {
      setFirmaSaved(true);
      setShowFirma(false);
      await doChange('cerrada');
    }
  };

  if (loading) return <Spinner />;
  if (error) return <ErrorMessage message={error} onRetry={refetch} />;
  if (!orden) return <div className="py-20 text-center text-slate-400">Instalación no encontrada</div>;

  const cfg = ESTADO_CONFIG[orden.estado] || ESTADO_CONFIG.instalacion_programada;
  const mostrarFotos = ['instalando', 'instalacion_completada', 'cerrada', 'cerrado',
    'en_instalacion', 'pendiente_firma'].includes(orden.estado);
  const mostrarFirma = ['instalacion_completada', 'pendiente_firma'].includes(orden.estado) && !firmaSaved;

  return (
    <div className="mx-auto max-w-2xl space-y-5">
      <button onClick={() => nav('/instalador')}
        className="flex items-center gap-1 text-sm font-medium text-slate-500 hover:text-slate-800">
        <ArrowLeft size={15} /> Volver
      </button>

      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">OT #{orden.numero}</h1>
          <p className="text-sm text-slate-500">Detalle de Instalación</p>
        </div>
        <span className={`rounded-full px-3 py-1 text-sm font-bold ${cfg.bg} ${cfg.color}`}>{cfg.label}</span>
      </div>

      {/* GPS Status Banner */}
      {(gpsAutoEnabled || gpsError) && (
        <div className={`flex items-center gap-2 rounded-xl border px-4 py-3 text-sm font-medium ${
          tracking
            ? 'border-emerald-200 bg-emerald-50 text-emerald-800'
            : 'border-amber-200 bg-amber-50 text-amber-800'
        }`}>
          {tracking ? (
            <>
              <div className="h-2.5 w-2.5 rounded-full bg-emerald-500 animate-pulse" />
              GPS activo — el coordinador puede ver tu ubicación en tiempo real
              <button onClick={stopTracking} className="ml-auto text-xs underline opacity-60">Pausar</button>
            </>
          ) : (
            <>
              <WifiOff size={15} />
              {gpsError || 'GPS no activo'}
              <button onClick={startTracking} className="ml-auto text-xs underline">Activar GPS</button>
            </>
          )}
        </div>
      )}

      {/* Cliente */}
      {(orden.cliente_nombre || orden.cliente_direccion) && (
        <div className="rounded-xl border border-slate-200 bg-white p-5">
          <h2 className="mb-3 text-base font-semibold text-slate-900">Datos del Cliente</h2>
          <div className="rounded-lg bg-violet-50 p-3">
            <div className="flex items-start gap-3">
              <MapPin size={16} className="mt-0.5 shrink-0 text-violet-600" />
              <div className="min-w-0">
                <p className="text-[11px] font-bold uppercase text-violet-600">Cliente</p>
                <p className="text-sm font-semibold text-slate-800">{orden.cliente_nombre}</p>
                {orden.cliente_direccion && (
                  <div className="mt-1">
                    <GoogleMapsLink direccion={orden.cliente_direccion} />
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Productos */}
      <div className="rounded-xl border border-slate-200 bg-white p-5">
        <h2 className="mb-3 text-base font-semibold text-slate-900">
          Productos a Instalar ({orden.productos?.length || 0})
        </h2>
        <div className="space-y-2">
          {(orden.productos || []).map((p: any, i: number) => (
            <div key={p.id || i} className="rounded-lg border border-slate-200 p-3">
              <p className="text-sm font-semibold text-slate-800">{i + 1}. {p.tipo}</p>
              <div className="mt-1 flex flex-wrap gap-3 text-xs text-slate-500">
                <span className="flex items-center gap-1"><Ruler size={11} />{p.ancho}×{p.alto} cm</span>
                <span className="flex items-center gap-1"><Palette size={11} />{p.tela} · {p.color}</span>
              </div>
              {p.ubicacion && <p className="mt-1 text-xs text-slate-400">📍 {p.ubicacion}</p>}
              {p.accionamiento && <p className="text-xs text-slate-400">⚙️ {p.accionamiento}</p>}
            </div>
          ))}
        </div>
      </div>

      {/* Checklist */}
      {['instalando', 'instalacion_completada', 'en_instalacion', 'pendiente_firma'].includes(orden.estado) && (
        <ChecklistInstalacion orderId={numId} />
      )}

      {/* Fotos */}
      {mostrarFotos && <FotosInstalacion orderId={numId} />}

      {/* Firma digital */}
      {mostrarFirma && (
        <div className="rounded-xl border border-orange-200 bg-white p-5">
          {showFirma ? (
            <FirmaDigital
              onFirmar={handleFirma}
              onCancelar={() => setShowFirma(false)}
              loading={savingFirma}
            />
          ) : (
            <div className="text-center py-4">
              <PenLine size={28} className="mx-auto text-orange-400" />
              <p className="mt-2 text-sm font-semibold text-slate-800">Firma del Cliente Requerida</p>
              <p className="mt-1 text-xs text-slate-500">El cliente debe firmar para confirmar la instalación</p>
              <button onClick={() => setShowFirma(true)}
                className="mt-3 flex items-center gap-2 mx-auto rounded-lg bg-orange-500 px-4 py-2 text-sm font-semibold text-white hover:bg-orange-600">
                <PenLine size={15} /> Solicitar Firma
              </button>
            </div>
          )}
        </div>
      )}

      {/* Historial */}
      <div className="rounded-xl border border-slate-200 bg-white p-5">
        <h2 className="mb-3 flex items-center gap-2 text-base font-semibold text-slate-900">
          <Clock size={15} /> Historial de la OT
        </h2>
        <div className="space-y-0">
          {[...(orden.historial || [])].reverse().map((h: any, i: number) => {
            const c = ESTADO_CONFIG[h.estado] || ESTADO_CONFIG.cotizacion;
            return (
              <div key={i} className="flex gap-3">
                <div className="flex flex-col items-center">
                  <div className={`mt-0.5 h-2.5 w-2.5 rounded-full ${i === 0 ? c.dot : 'bg-slate-300'}`} />
                  {i < (orden.historial?.length || 0) - 1 && (
                    <div className="h-full w-px bg-slate-200" />
                  )}
                </div>
                <div className="pb-3">
                  <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${c.bg} ${c.color}`}>{c.label}</span>
                  <p className="mt-0.5 flex items-center gap-1 text-[11px] text-slate-500">
                    <User size={10} /> {h.usuario_nombre}
                  </p>
                  <p className="text-[11px] text-slate-400">{fmtDate(h.fecha)}</p>
                  {h.notas && <p className="text-[11px] text-slate-400 italic">"{h.notas}"</p>}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ─── ACCIONES según estado ─────────────────────────── */}

      {/* Instalación Programada → En Camino */}
      {(orden.estado === 'instalacion_programada' || orden.estado === 'agendado') && (
        <div className="flex gap-3">
          <button onClick={reportarProblema} disabled={changing}
            className="flex flex-1 items-center justify-center gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-bold text-red-700 hover:bg-red-100 disabled:opacity-60">
            <AlertTriangle size={16} /> Problema
          </button>
          <button onClick={() => doChange('en_camino')} disabled={changing}
            className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-violet-500 px-4 py-3 text-sm font-bold text-white hover:bg-violet-600 disabled:opacity-60">
            <Navigation size={16} /> Salir a Terreno
          </button>
        </div>
      )}

      {/* En Camino → Instalando */}
      {(orden.estado === 'en_camino' || orden.estado === 'en_ruta') && (
        <div className="space-y-2">
          <div className="rounded-xl border border-violet-200 bg-violet-50 px-4 py-2.5 text-xs font-medium text-violet-700 flex items-center gap-2">
            <div className="h-2 w-2 rounded-full bg-violet-500 animate-pulse" />
            GPS activo — el cliente puede ver que vas en camino
          </div>
          <div className="flex gap-3">
            <button onClick={reportarProblema} disabled={changing}
              className="flex flex-1 items-center justify-center gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-bold text-red-700 hover:bg-red-100 disabled:opacity-60">
              <AlertTriangle size={16} /> Problema
            </button>
            <button onClick={() => doChange('instalando')} disabled={changing}
              className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-purple-500 px-4 py-3 text-sm font-bold text-white hover:bg-purple-600 disabled:opacity-60">
              <Wrench size={16} /> Iniciar Instalación
            </button>
          </div>
        </div>
      )}

      {/* Instalando → Completada */}
      {(orden.estado === 'instalando' || orden.estado === 'en_instalacion') && (
        <div className="flex gap-3">
          <button onClick={reportarProblema} disabled={changing}
            className="flex flex-1 items-center justify-center gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-bold text-red-700 hover:bg-red-100 disabled:opacity-60">
            <AlertTriangle size={16} /> Problema
          </button>
          <button onClick={() => doChange('instalacion_completada')} disabled={changing}
            className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-orange-500 px-4 py-3 text-sm font-bold text-white hover:bg-orange-600 disabled:opacity-60">
            <CheckCircle2 size={16} /> Instalación Completa
          </button>
        </div>
      )}

      {/* Instalación Completada — firma requerida */}
      {(orden.estado === 'instalacion_completada' || orden.estado === 'pendiente_firma') && !showFirma && !firmaSaved && (
        <div className="flex gap-3">
          <button onClick={reportarProblema} disabled={changing}
            className="flex flex-1 items-center justify-center gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-bold text-red-700 hover:bg-red-100 disabled:opacity-60">
            <AlertTriangle size={16} /> Problema
          </button>
          <button onClick={() => setShowFirma(true)} disabled={changing}
            className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-emerald-500 px-4 py-3 text-sm font-bold text-white hover:bg-emerald-600 disabled:opacity-60">
            <PenLine size={16} /> Firmar y Cerrar
          </button>
        </div>
      )}

      {/* Cerrada */}
      {(orden.estado === 'cerrada' || orden.estado === 'cerrado') && (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-4 text-center">
          <CheckCircle2 size={28} className="mx-auto text-emerald-500" />
          <p className="mt-2 text-sm font-bold text-emerald-800">OT Cerrada Exitosamente</p>
          <p className="text-xs text-emerald-600">Trabajo completo</p>
        </div>
      )}
    </div>
  );
}
