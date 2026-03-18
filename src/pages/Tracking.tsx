import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { MapPin, RefreshCw, Navigation, AlertCircle } from 'lucide-react';
import { api } from '../services/api';

interface TrackingData {
  estado: string;
  tecnico_nombre?: string;
  posicion?: {
    lat: number;
    lon: number;
    precision_m?: number;
    velocidad_kmh?: number;
    maps_url: string;
    last_seen: string;
  };
  mensaje?: string;
}

function formatTimeAgo(iso: string): string {
  const diff = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (diff < 60) return `hace ${diff} seg`;
  if (diff < 3600) return `hace ${Math.floor(diff / 60)} min`;
  return `hace ${Math.floor(diff / 3600)} h`;
}

export default function Tracking() {
  const { token } = useParams<{ token: string }>();
  const [data, setData] = useState<TrackingData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [lastRefresh, setLastRefresh] = useState(Date.now());

  const load = async () => {
    try {
      const data = await api.getGpsTracking(token!);
      setData(data);
      setError('');
    } catch (err: any) {
      const detail = err?.response?.data?.detail ?? err?.message;
      setError(typeof detail === 'string' ? detail : 'Enlace no válido o expirado.');
    } finally {
      setLoading(false);
      setLastRefresh(Date.now());
    }
  };

  useEffect(() => {
    load();
    // Actualizar posición cada 30 segundos
    const interval = setInterval(load, 30_000);
    return () => clearInterval(interval);
  }, [token]);

  const ESTADO_LABELS: Record<string, string> = {
    en_camino: '🚗 En camino a tu domicilio',
    instalando: '🔧 Instalando en tu domicilio',
    instalacion_completada: '✅ Instalación completada',
    cerrada: '✅ Trabajo finalizado',
  };

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-br from-slate-900 to-slate-800 p-4">
      <div className="w-full max-w-sm space-y-4">
        {/* Header */}
        <div className="text-center space-y-1">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-rose-400 to-rose-600 text-2xl">&#9889;</div>
          <h1 className="text-lg font-bold text-white">Seguimiento de técnico</h1>
          <p className="text-xs text-slate-400">WorkShopOS — Tu instalación en tiempo real</p>
        </div>

        {loading && (
          <div className="rounded-xl bg-white/10 p-8 text-center">
            <RefreshCw size={24} className="mx-auto animate-spin text-rose-400" />
            <p className="mt-3 text-sm text-slate-300">Obteniendo ubicación...</p>
          </div>
        )}

        {error && !loading && (
          <div className="rounded-xl bg-red-900/40 border border-red-700 p-5 text-center space-y-3">
            <AlertCircle size={32} className="mx-auto text-red-400" />
            <p className="text-sm text-red-200 font-medium">{error}</p>
            <p className="text-xs text-red-400">
              El enlace de seguimiento expira 8 horas después de ser generado.
            </p>
          </div>
        )}

        {data && !loading && (
          <>
            {/* Estado */}
            <div className="rounded-xl bg-white/10 backdrop-blur p-4 text-center">
              <p className="text-base font-bold text-white">
                {ESTADO_LABELS[data.estado] ?? `Estado: ${data.estado}`}
              </p>
              {data.tecnico_nombre && (
                <p className="mt-1 text-xs text-slate-300">Técnico: {data.tecnico_nombre}</p>
              )}
            </div>

            {/* Posición */}
            {data.posicion ? (
              <div className="rounded-xl bg-white/10 backdrop-blur p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-emerald-400">
                    <div className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
                    <span className="text-xs font-semibold">GPS activo</span>
                  </div>
                  <span className="text-xs text-slate-400">{formatTimeAgo(data.posicion.last_seen)}</span>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  {data.posicion.precision_m && (
                    <div className="rounded-lg bg-white/5 p-2.5">
                      <p className="text-[10px] text-slate-400 uppercase tracking-wide">Precisión</p>
                      <p className="text-sm font-semibold text-white">{data.posicion.precision_m}m</p>
                    </div>
                  )}
                  {data.posicion.velocidad_kmh !== undefined && data.posicion.velocidad_kmh !== null && (
                    <div className="rounded-lg bg-white/5 p-2.5">
                      <p className="text-[10px] text-slate-400 uppercase tracking-wide">Velocidad</p>
                      <p className="text-sm font-semibold text-white">{Math.round(data.posicion.velocidad_kmh)} km/h</p>
                    </div>
                  )}
                </div>

                <a
                  href={data.posicion.maps_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex w-full items-center justify-center gap-2 rounded-lg bg-rose-500 py-3 text-sm font-semibold text-white hover:bg-rose-600 transition"
                >
                  <Navigation size={16} />
                  Ver en Google Maps
                </a>

                <div className="text-center">
                  <p className="text-[10px] text-slate-500">
                    Lat: {data.posicion.lat.toFixed(6)} · Lon: {data.posicion.lon.toFixed(6)}
                  </p>
                </div>
              </div>
            ) : (
              <div className="rounded-xl bg-white/10 backdrop-blur p-5 text-center space-y-2">
                <MapPin size={28} className="mx-auto text-slate-400" />
                <p className="text-sm text-slate-300">{data.mensaje ?? 'El técnico aún no ha enviado su posición.'}</p>
                <p className="text-xs text-slate-500">Esta página se actualiza automáticamente.</p>
              </div>
            )}

            {/* Refresh manual */}
            <button
              onClick={load}
              className="flex w-full items-center justify-center gap-2 rounded-lg border border-white/10 bg-white/5 py-2.5 text-sm text-slate-300 hover:bg-white/10 transition"
            >
              <RefreshCw size={14} />
              Actualizar posición
            </button>
          </>
        )}

        <p className="text-center text-[10px] text-slate-600">
          Esta página se actualiza cada 30 segundos &middot; WorkShopOS
        </p>
      </div>
    </div>
  );
}
