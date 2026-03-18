import { useState, useCallback, useRef, useEffect } from 'react';
import { api } from '../../services/api';
import { useApi } from '../../hooks/useApi';
import {
  Navigation, MapPin, Radio, CheckCircle2, Clock,
  Copy, ExternalLink, RefreshCw, AlertTriangle, Wrench,
  Phone, User,
} from 'lucide-react';

interface InstaladorOrden {
  id: number;
  numero: number;
  estado: string;
  tracking_activo: boolean;
  tracking_token: string | null;
  tracking_url: string | null;
  cliente_nombre: string;
  cliente_direccion: string | null;
  cliente_telefono: string | null;
}

const ESTADO_LABELS: Record<string, string> = {
  instalacion_programada: 'Programada',
  en_camino: 'En camino',
  instalando: 'Instalando',
  agendado: 'Agendada',
  en_ruta: 'En ruta',
  en_instalacion: 'En instalación',
  pendiente_firma: 'Pendiente firma',
};

const ESTADO_COLORS: Record<string, string> = {
  instalacion_programada: 'bg-blue-100 text-blue-700',
  en_camino: 'bg-amber-100 text-amber-700',
  instalando: 'bg-green-100 text-green-700',
  agendado: 'bg-blue-100 text-blue-700',
  en_ruta: 'bg-amber-100 text-amber-700',
  en_instalacion: 'bg-green-100 text-green-700',
  pendiente_firma: 'bg-purple-100 text-purple-700',
};

// ── GPS watch hook ───────────────────────────────────────────
function useGpsWatch(orderId: number | null, active: boolean) {
  const watchId = useRef<number | null>(null);
  const [gpsError, setGpsError] = useState('');
  const [position, setPosition] = useState<{ lat: number; lon: number } | null>(null);

  const start = useCallback(() => {
    if (!navigator.geolocation || !orderId) return;
    setGpsError('');
    watchId.current = navigator.geolocation.watchPosition(
      (pos) => {
        const { latitude: lat, longitude: lon, accuracy, speed, heading } = pos.coords;
        setPosition({ lat, lon });
        api.sendGpsPing({
          lat,
          lon,
          precision_m: Math.round(accuracy),
          velocidad_kmh: speed ? speed * 3.6 : undefined,
          heading: heading ?? undefined,
          order_id: orderId,
        }).catch(() => {});
      },
      (err) => setGpsError('GPS: ' + err.message),
      { enableHighAccuracy: true, maximumAge: 10_000, timeout: 30_000 }
    );
  }, [orderId]);

  const stop = useCallback(() => {
    if (watchId.current !== null) {
      navigator.geolocation.clearWatch(watchId.current);
      watchId.current = null;
    }
    setPosition(null);
  }, []);

  useEffect(() => {
    if (active) start();
    else stop();
    return stop;
  }, [active]);

  return { gpsError, position };
}

// ── Orden Card ───────────────────────────────────────────────
function OrdenCard({
  orden,
  onActivate,
  onDeactivate,
  busy,
}: {
  orden: InstaladorOrden;
  onActivate: (id: number) => void;
  onDeactivate: (id: number) => void;
  busy: boolean;
}) {
  const [copied, setCopied] = useState(false);
  const { gpsError, position } = useGpsWatch(
    orden.id,
    orden.tracking_activo
  );

  const copyLink = () => {
    if (!orden.tracking_url) return;
    navigator.clipboard.writeText(orden.tracking_url).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const estadoLabel = ESTADO_LABELS[orden.estado] || orden.estado;
  const estadoColor = ESTADO_COLORS[orden.estado] || 'bg-slate-100 text-slate-600';

  return (
    <div className={`bg-white rounded-2xl border shadow-sm overflow-hidden transition-all ${
      orden.tracking_activo
        ? 'border-emerald-200 shadow-emerald-100'
        : 'border-slate-100'
    }`}>
      {/* Indicator bar */}
      {orden.tracking_activo && (
        <div className="h-1 bg-gradient-to-r from-emerald-400 to-teal-500" />
      )}

      <div className="p-4 space-y-4">
        {/* Header row */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className={`flex h-10 w-10 items-center justify-center rounded-xl shrink-0 ${
              orden.tracking_activo
                ? 'bg-emerald-50 text-emerald-600'
                : 'bg-slate-100 text-slate-500'
            }`}>
              <Wrench size={18} />
            </div>
            <div>
              <p className="font-bold text-slate-900 text-sm">Orden #{orden.numero}</p>
              <span className={`inline-flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-full ${estadoColor}`}>
                <Clock size={10} /> {estadoLabel}
              </span>
            </div>
          </div>
          {orden.tracking_activo && (
            <div className="flex items-center gap-1.5 text-emerald-600 text-xs font-semibold animate-pulse">
              <Radio size={13} />
              <span>Transmitiendo</span>
            </div>
          )}
        </div>

        {/* Client info */}
        <div className="space-y-1.5">
          <div className="flex items-center gap-2 text-sm text-slate-700">
            <User size={13} className="text-slate-400 shrink-0" />
            <span className="font-medium">{orden.cliente_nombre}</span>
          </div>
          {orden.cliente_direccion && (
            <div className="flex items-start gap-2 text-sm text-slate-500">
              <MapPin size={13} className="text-slate-400 mt-0.5 shrink-0" />
              <span>{orden.cliente_direccion}</span>
            </div>
          )}
          {orden.cliente_telefono && (
            <div className="flex items-center gap-2 text-sm text-slate-500">
              <Phone size={13} className="text-slate-400 shrink-0" />
              <a href={`tel:${orden.cliente_telefono}`} className="hover:text-blue-600">
                {orden.cliente_telefono}
              </a>
            </div>
          )}
        </div>

        {/* GPS position */}
        {position && (
          <div className="flex items-center gap-2 rounded-xl bg-emerald-50 px-3 py-2 text-xs text-emerald-700">
            <Navigation size={12} className="shrink-0" />
            <span className="font-mono">{position.lat.toFixed(5)}, {position.lon.toFixed(5)}</span>
            <a
              href={`https://maps.google.com/?q=${position.lat},${position.lon}`}
              target="_blank"
              rel="noopener noreferrer"
              className="ml-auto text-emerald-600 hover:text-emerald-800"
            >
              <ExternalLink size={12} />
            </a>
          </div>
        )}

        {gpsError && (
          <div className="flex items-center gap-2 rounded-xl bg-red-50 px-3 py-2 text-xs text-red-700">
            <AlertTriangle size={12} /> {gpsError}
          </div>
        )}

        {/* Tracking link */}
        {orden.tracking_activo && orden.tracking_url && (
          <div className="rounded-xl border border-emerald-100 bg-emerald-50 p-3 space-y-2">
            <p className="text-[11px] font-semibold text-emerald-700 uppercase tracking-wide">
              Enlace para el cliente
            </p>
            <div className="flex items-center gap-2">
              <p className="flex-1 truncate text-xs text-emerald-800 font-mono bg-white rounded-lg px-2 py-1.5 border border-emerald-100">
                {orden.tracking_url}
              </p>
              <button
                onClick={copyLink}
                className="flex items-center gap-1 shrink-0 rounded-lg px-2.5 py-1.5 text-xs font-semibold transition-colors bg-emerald-600 text-white hover:bg-emerald-700"
              >
                {copied ? <CheckCircle2 size={12} /> : <Copy size={12} />}
                {copied ? 'Copiado' : 'Copiar'}
              </button>
              <a
                href={orden.tracking_url}
                target="_blank"
                rel="noopener noreferrer"
                className="shrink-0 rounded-lg p-1.5 text-emerald-600 hover:bg-emerald-100 transition-colors"
                title="Abrir enlace"
              >
                <ExternalLink size={14} />
              </a>
            </div>
            <p className="text-[10px] text-emerald-600">
              Comparte este enlace por WhatsApp al cliente para que vea tu ubicación en tiempo real.
            </p>
          </div>
        )}

        {/* Action button */}
        <div>
          {orden.tracking_activo ? (
            <button
              onClick={() => onDeactivate(orden.id)}
              disabled={busy}
              className="w-full flex items-center justify-center gap-2 rounded-xl py-2.5 text-sm font-semibold transition-colors bg-red-50 text-red-600 hover:bg-red-100 disabled:opacity-50"
            >
              {busy ? <RefreshCw size={15} className="animate-spin" /> : <Radio size={15} />}
              Detener tracking
            </button>
          ) : (
            <button
              onClick={() => onActivate(orden.id)}
              disabled={busy}
              className="w-full flex items-center justify-center gap-2 rounded-xl py-2.5 text-sm font-semibold transition-colors text-white disabled:opacity-50"
              style={{ background: 'linear-gradient(135deg, var(--brand-light), var(--brand-primary))' }}
            >
              {busy ? <RefreshCw size={15} className="animate-spin" /> : <Navigation size={15} />}
              Salir a instalar — Activar GPS
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Main Page ────────────────────────────────────────────────
export default function InstaladorTracking() {
  const [busyId, setBusyId] = useState<number | null>(null);
  const [ordenes, setOrdenes] = useState<InstaladorOrden[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const loadOrdenes = async () => {
    setLoading(true);
    setError('');
    try {
      const data = await api.getInstaladorOrders();
      setOrdenes(data || []);
    } catch {
      setError('Error al cargar órdenes');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadOrdenes(); }, []);

  const handleActivate = async (orderId: number) => {
    setBusyId(orderId);
    try {
      const res = await api.activateTracking(orderId);
      setOrdenes(prev =>
        prev.map(o =>
          o.id === orderId
            ? { ...o, tracking_activo: true, tracking_token: res.tracking_token, tracking_url: res.tracking_url }
            : o
        )
      );
    } catch {
      alert('Error al activar tracking');
    } finally {
      setBusyId(null);
    }
  };

  const handleDeactivate = async (orderId: number) => {
    setBusyId(orderId);
    try {
      await api.deactivateTracking(orderId);
      setOrdenes(prev =>
        prev.map(o => o.id === orderId ? { ...o, tracking_activo: false } : o)
      );
    } catch {
      alert('Error al detener tracking');
    } finally {
      setBusyId(null);
    }
  };

  const activeCount = ordenes.filter(o => o.tracking_activo).length;

  return (
    <div className="space-y-5 max-w-lg mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">GPS / Tracking</h1>
          <p className="text-sm text-slate-500 mt-0.5">
            Comparte tu ubicación con el cliente en tiempo real
          </p>
        </div>
        <button
          onClick={loadOrdenes}
          disabled={loading}
          className="flex items-center gap-1.5 rounded-xl px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 transition-colors"
        >
          <RefreshCw size={15} className={loading ? 'animate-spin' : ''} />
          Actualizar
        </button>
      </div>

      {/* Active tracking banner */}
      {activeCount > 0 && (
        <div className="flex items-center gap-3 rounded-2xl bg-emerald-500 px-4 py-3 text-white shadow-lg shadow-emerald-200">
          <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-white/20">
            <Radio size={16} className="animate-pulse" />
          </div>
          <div className="flex-1">
            <p className="font-bold text-sm">Tracking activo</p>
            <p className="text-xs text-emerald-100">
              Transmitiendo ubicación GPS · {activeCount} orden{activeCount > 1 ? 'es' : ''}
            </p>
          </div>
        </div>
      )}

      {/* Content */}
      {loading ? (
        <div className="flex flex-col items-center justify-center h-48 text-slate-400 gap-3">
          <RefreshCw size={24} className="animate-spin" />
          <p className="text-sm">Cargando órdenes...</p>
        </div>
      ) : error ? (
        <div className="flex items-center gap-3 rounded-2xl border border-red-100 bg-red-50 p-4 text-red-700">
          <AlertTriangle size={18} />
          <p className="text-sm">{error}</p>
        </div>
      ) : ordenes.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-48 text-slate-400 gap-3 bg-white rounded-2xl border border-dashed border-slate-200">
          <Wrench size={36} className="opacity-30" />
          <div className="text-center">
            <p className="font-medium">Sin instalaciones asignadas</p>
            <p className="text-sm">No tienes órdenes en estado activo por ahora</p>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          {ordenes.map(orden => (
            <OrdenCard
              key={orden.id}
              orden={orden}
              onActivate={handleActivate}
              onDeactivate={handleDeactivate}
              busy={busyId === orden.id}
            />
          ))}
        </div>
      )}

      {/* How it works */}
      {!loading && ordenes.length > 0 && (
        <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4 space-y-2">
          <p className="text-xs font-semibold text-slate-600 uppercase tracking-wide">¿Cómo funciona?</p>
          <ol className="space-y-1.5 text-xs text-slate-500">
            <li className="flex items-start gap-2">
              <span className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-slate-300 text-[10px] font-bold text-white">1</span>
              Presiona <strong className="text-slate-700">Salir a instalar</strong> cuando vayas en camino
            </li>
            <li className="flex items-start gap-2">
              <span className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-slate-300 text-[10px] font-bold text-white">2</span>
              El cliente recibe automáticamente el enlace de seguimiento por WhatsApp
            </li>
            <li className="flex items-start gap-2">
              <span className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-slate-300 text-[10px] font-bold text-white">3</span>
              También puedes copiar el enlace y enviarlo manualmente
            </li>
            <li className="flex items-start gap-2">
              <span className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-slate-300 text-[10px] font-bold text-white">4</span>
              Al terminar, presiona <strong className="text-slate-700">Detener tracking</strong>
            </li>
          </ol>
        </div>
      )}
    </div>
  );
}
