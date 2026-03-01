import { useCallback, useRef, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useApi } from '../../hooks/useApi';
import { useMutation } from '../../hooks/useMutation';
import { api } from '../../services/api';
import { ESTADO_CONFIG } from '../../types';
import type { EstadoOrden } from '../../types';
import { Spinner, ErrorMessage } from '../../components/LoadingStates';
import {
  Wrench, ChevronRight, ArrowLeft, MapPin, Phone,
  CheckCircle2, AlertTriangle, Clock, User, Ruler, Palette, Camera, Navigation,
  Upload, X, Loader2, ExternalLink
} from 'lucide-react';

const API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:8000';
const fmtDate = (s: string) => s ? new Date(s).toLocaleDateString('es-CL') : '—';

const ACTIVE_ESTADOS = ['agendado', 'en_ruta', 'en_instalacion', 'pendiente_firma'];
const DONE_ESTADOS = ['cerrado'];

function GoogleMapsLink({ direccion }: { direccion: string }) {
  const url = `https://maps.google.com/?q=${encodeURIComponent(direccion)}`;
  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className="flex items-center gap-1 text-blue-600 hover:underline"
    >
      <ExternalLink size={12} />
      {direccion}
    </a>
  );
}

// ═══════════════════════════════════════════════
// FOTOS DE INSTALACIÓN
// ═══════════════════════════════════════════════
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
          <Camera size={16} /> Fotos de Instalación ({fotoList.length}/10)
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
        <div className="rounded-lg border-2 border-dashed border-slate-200 p-8 text-center">
          <Camera size={24} className="mx-auto text-slate-300" />
          <p className="mt-2 text-xs text-slate-400">Sin fotos aún</p>
        </div>
      ) : (
        <div className="grid grid-cols-3 gap-2">
          {fotoList.map((f: any) => (
            <a
              key={f.id}
              href={`${API_URL}${f.url}`}
              target="_blank"
              rel="noopener noreferrer"
              className="aspect-square overflow-hidden rounded-lg border border-slate-200 bg-slate-100"
            >
              <img
                src={`${API_URL}${f.url}`}
                alt="Foto instalación"
                className="h-full w-full object-cover transition hover:opacity-90"
              />
            </a>
          ))}
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════
// MIS INSTALACIONES
// ═══════════════════════════════════════════════
export function MisInstalaciones() {
  const { data: orders, loading, error, refetch } = useApi(() => api.getMyOrders());

  if (loading) return <Spinner />;
  if (error) return <ErrorMessage message={error} onRetry={refetch} />;

  const all: any[] = orders || [];
  const activas = all.filter(o => ACTIVE_ESTADOS.includes(o.estado));
  const completadas = all.filter(o => DONE_ESTADOS.includes(o.estado));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Mis Instalaciones</h1>
        <p className="text-sm text-slate-500">{all.length} asignadas</p>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="rounded-xl border border-slate-200 bg-white p-5">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-violet-100 p-2"><Wrench size={19} className="text-violet-600" /></div>
            <div>
              <p className="text-2xl font-bold text-slate-900">{activas.length}</p>
              <p className="text-xs text-slate-500">Activas</p>
            </div>
          </div>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-5">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-emerald-100 p-2"><CheckCircle2 size={19} className="text-emerald-600" /></div>
            <div>
              <p className="text-2xl font-bold text-slate-900">{completadas.length}</p>
              <p className="text-xs text-slate-500">Completadas</p>
            </div>
          </div>
        </div>
      </div>

      {activas.length > 0 && (
        <div>
          <h2 className="mb-2 text-sm font-semibold text-slate-700">Activas</h2>
          <div className="space-y-2">
            {activas.map(o => {
              const cfg = ESTADO_CONFIG[o.estado as EstadoOrden] || ESTADO_CONFIG.agendado;
              return (
                <Link key={o.id} to={`/instalador/${o.id}`}
                  className="block rounded-xl border border-slate-200 border-l-4 border-l-violet-400 bg-white p-4 shadow-sm transition hover:shadow-md">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-violet-100">
                        <Wrench size={17} className="text-violet-600" />
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-slate-800">#{o.numero}</p>
                        <p className="text-xs text-slate-500">{o.productos?.length || 0} producto(s)</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${cfg.bg} ${cfg.color}`}>{cfg.label}</span>
                      <ChevronRight size={16} className="text-slate-300" />
                    </div>
                  </div>
                  {o.cliente_nombre && (
                    <div className="mt-3 flex flex-wrap gap-3 rounded-lg bg-slate-50 p-2.5 text-xs text-slate-600">
                      <span className="font-medium">{o.cliente_nombre}</span>
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
          <h2 className="mb-2 text-sm font-semibold text-slate-700">Completadas</h2>
          <div className="space-y-2">
            {completadas.map(o => (
              <Link key={o.id} to={`/instalador/${o.id}`}
                className="flex items-center justify-between rounded-xl border border-slate-200 border-l-4 border-l-emerald-400 bg-white p-4 shadow-sm transition hover:shadow-md">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-emerald-100">
                    <CheckCircle2 size={17} className="text-emerald-600" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-slate-800">#{o.numero}</p>
                    <p className="text-xs text-slate-500">{o.productos?.length || 0} prod. · Cerrado</p>
                  </div>
                </div>
                <ChevronRight size={16} className="text-slate-300" />
              </Link>
            ))}
          </div>
        </div>
      )}

      {all.length === 0 && (
        <div className="rounded-xl border border-slate-200 bg-white p-14 text-center">
          <Wrench size={40} className="mx-auto text-slate-300" />
          <p className="mt-3 text-sm text-slate-500">No tienes instalaciones asignadas</p>
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════
// DETALLE INSTALACIÓN
// ═══════════════════════════════════════════════
export function DetalleInstalacion() {
  const { id } = useParams();
  const nav = useNavigate();
  const numId = Number(id);

  const { data: orden, loading, error, refetch } = useApi(
    () => api.getOrder(numId),
    [numId]
  );

  const { execute: cambiarEstado, loading: changing } = useMutation(
    (estado: string, notas?: string) => api.changeEstado(numId, estado, notas)
  );

  const doChange = useCallback(async (estado: string, notas?: string) => {
    const res = await cambiarEstado(estado, notas);
    if (res) refetch();
  }, [cambiarEstado, refetch]);

  const reportarProblema = useCallback(async () => {
    const notas = prompt('Describe el problema:');
    if (!notas) return;
    await doChange('problema', notas);
  }, [doChange]);

  if (loading) return <Spinner />;
  if (error) return <ErrorMessage message={error} onRetry={refetch} />;
  if (!orden) return <div className="py-20 text-center text-slate-400">Instalación no encontrada</div>;

  const cfg = ESTADO_CONFIG[orden.estado as EstadoOrden] || ESTADO_CONFIG.agendado;
  const mostrarFotos = ['en_instalacion', 'pendiente_firma', 'cerrado'].includes(orden.estado);

  return (
    <div className="mx-auto max-w-2xl space-y-5">
      <button onClick={() => nav('/instalador')} className="flex items-center gap-1 text-sm font-medium text-slate-500 hover:text-slate-800">
        <ArrowLeft size={15} /> Volver
      </button>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">#{orden.numero}</h1>
          <p className="text-sm text-slate-500">Detalle de Instalación</p>
        </div>
        <span className={`rounded-full px-3 py-1 text-sm font-semibold ${cfg.bg} ${cfg.color}`}>{cfg.label}</span>
      </div>

      {/* Cliente */}
      {orden.cliente_nombre && (
        <div className="rounded-xl border border-slate-200 bg-white p-5">
          <h2 className="mb-3 text-base font-semibold text-slate-900">Datos de Contacto</h2>
          <div className="flex items-start gap-3 rounded-lg bg-violet-50 p-3">
            <MapPin size={17} className="mt-0.5 shrink-0 text-violet-600" />
            <div className="min-w-0">
              <p className="text-[11px] font-semibold uppercase text-violet-600">Cliente</p>
              <p className="text-sm font-medium text-slate-800">{orden.cliente_nombre}</p>
              {orden.cliente_direccion && (
                <div className="mt-0.5 text-xs">
                  <GoogleMapsLink direccion={orden.cliente_direccion} />
                </div>
              )}
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
              <p className="text-sm font-medium text-slate-800">{i + 1}. {p.tipo}</p>
              <div className="mt-1 flex flex-wrap gap-3 text-xs text-slate-500">
                <span className="flex items-center gap-1"><Ruler size={12} />{p.ancho}×{p.alto} cm</span>
                <span className="flex items-center gap-1"><Palette size={12} />{p.tela} · {p.color}</span>
              </div>
              {p.ubicacion && <p className="mt-1 text-xs text-slate-500">📍 {p.ubicacion}</p>}
            </div>
          ))}
        </div>
      </div>

      {/* Fotos */}
      {mostrarFotos && <FotosInstalacion orderId={numId} />}

      {/* Historial */}
      <div className="rounded-xl border border-slate-200 bg-white p-5">
        <h2 className="mb-3 flex items-center gap-2 text-base font-semibold text-slate-900">
          <Clock size={16} /> Historial
        </h2>
        <div className="space-y-0">
          {[...(orden.historial || [])].reverse().map((h: any, i: number) => {
            const c = ESTADO_CONFIG[h.estado as EstadoOrden] || ESTADO_CONFIG.cotizado;
            return (
              <div key={i} className="flex gap-3">
                <div className="flex flex-col items-center">
                  <div className={`mt-0.5 h-2.5 w-2.5 rounded-full ${i === 0 ? c.dot : 'bg-slate-300'}`} />
                  {i < (orden.historial?.length || 0) - 1 && <div className="h-full w-px bg-slate-200" />}
                </div>
                <div className="pb-3">
                  <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${c.bg} ${c.color}`}>{c.label}</span>
                  <p className="mt-0.5 flex items-center gap-1 text-[11px] text-slate-500">
                    <User size={10} />{h.usuario_nombre}
                  </p>
                  <p className="text-[11px] text-slate-400">{fmtDate(h.fecha)}</p>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Botones de acción según estado */}
      {orden.estado === 'agendado' && (
        <div className="flex gap-3">
          <button onClick={reportarProblema} disabled={changing}
            className="flex flex-1 items-center justify-center gap-2 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700 transition hover:bg-red-100 disabled:opacity-60">
            <AlertTriangle size={17} /> Problema
          </button>
          <button onClick={() => doChange('en_ruta')} disabled={changing}
            className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-indigo-500 px-4 py-3 text-sm font-semibold text-white transition hover:bg-indigo-600 disabled:opacity-60">
            <Navigation size={17} /> En Ruta
          </button>
        </div>
      )}

      {orden.estado === 'en_ruta' && (
        <div className="flex gap-3">
          <button onClick={reportarProblema} disabled={changing}
            className="flex flex-1 items-center justify-center gap-2 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700 transition hover:bg-red-100 disabled:opacity-60">
            <AlertTriangle size={17} /> Problema
          </button>
          <button onClick={() => doChange('en_instalacion')} disabled={changing}
            className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-violet-500 px-4 py-3 text-sm font-semibold text-white transition hover:bg-violet-600 disabled:opacity-60">
            <Wrench size={17} /> Iniciar Instalación
          </button>
        </div>
      )}

      {orden.estado === 'en_instalacion' && (
        <div className="flex gap-3">
          <button onClick={reportarProblema} disabled={changing}
            className="flex flex-1 items-center justify-center gap-2 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700 transition hover:bg-red-100 disabled:opacity-60">
            <AlertTriangle size={17} /> Problema
          </button>
          <button onClick={() => doChange('pendiente_firma')} disabled={changing}
            className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-orange-500 px-4 py-3 text-sm font-semibold text-white transition hover:bg-orange-600 disabled:opacity-60">
            <CheckCircle2 size={17} /> Solicitar Firma
          </button>
        </div>
      )}

      {orden.estado === 'pendiente_firma' && (
        <div className="flex gap-3">
          <button onClick={reportarProblema} disabled={changing}
            className="flex flex-1 items-center justify-center gap-2 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700 transition hover:bg-red-100 disabled:opacity-60">
            <AlertTriangle size={17} /> Problema
          </button>
          <button onClick={() => doChange('cerrado')} disabled={changing}
            className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-emerald-500 px-4 py-3 text-sm font-semibold text-white transition hover:bg-emerald-600 disabled:opacity-60">
            <CheckCircle2 size={17} /> Cerrar Orden
          </button>
        </div>
      )}
    </div>
  );
}
