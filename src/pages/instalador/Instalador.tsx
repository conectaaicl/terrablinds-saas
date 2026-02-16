import { useState, useMemo, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { Store } from '../../data/store';
import { useAuth } from '../../context/AuthContext';
import { ESTADO_CONFIG } from '../../types';
import type { EstadoOrden } from '../../types';
import {
  Wrench, ChevronRight, ArrowLeft, MapPin, Phone,
  CheckCircle2, AlertTriangle, Clock, User, Ruler, Palette, Camera
} from 'lucide-react';

export function MisInstalaciones() {
  const { user } = useAuth();

  const ordenes = useMemo(() => {
    return Store.getOrdenes(user?.tenantId).filter(o =>
      o.instaladorId === user?.id && ['en_instalacion', 'instalado'].includes(o.estado)
    );
  }, [user]);

  const pendientes = ordenes.filter(o => o.estado === 'en_instalacion');
  const completadas = ordenes.filter(o => o.estado === 'instalado');

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Mis Instalaciones</h1>
        <p className="text-sm text-slate-500">{ordenes.length} asignadas</p>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="rounded-xl border border-slate-200 bg-white p-5">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-violet-100 p-2"><Wrench size={19} className="text-violet-600" /></div>
            <div>
              <p className="text-2xl font-bold text-slate-900">{pendientes.length}</p>
              <p className="text-xs text-slate-500">Pendientes</p>
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

      {pendientes.length > 0 && (
        <div>
          <h2 className="mb-2 text-sm font-semibold text-slate-700">Por Instalar</h2>
          <div className="space-y-2">
            {pendientes.map(o => {
              const cli = Store.getClienteById(o.clienteId);
              return (
                <Link key={o.id} to={`/instalador/${o.id}`}
                  className="block rounded-xl border border-slate-200 border-l-4 border-l-violet-400 bg-white p-4 shadow-sm transition hover:shadow-md">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-violet-100">
                        <Wrench size={17} className="text-violet-600" />
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-slate-800">{o.id}</p>
                        <p className="text-xs text-slate-500">{o.productos.length} producto(s)</p>
                      </div>
                    </div>
                    <ChevronRight size={16} className="text-slate-300" />
                  </div>
                  {cli && (
                    <div className="mt-3 flex flex-wrap gap-3 rounded-lg bg-slate-50 p-2.5 text-xs text-slate-600">
                      <span className="flex items-center gap-1"><MapPin size={12} />{cli.direccion}</span>
                      <span className="flex items-center gap-1"><Phone size={12} />{cli.telefono}</span>
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
                    <p className="text-sm font-semibold text-slate-800">{o.id}</p>
                    <p className="text-xs text-slate-500">{o.productos.length} prod. · Instalado</p>
                  </div>
                </div>
                <ChevronRight size={16} className="text-slate-300" />
              </Link>
            ))}
          </div>
        </div>
      )}

      {ordenes.length === 0 && (
        <div className="rounded-xl border border-slate-200 bg-white p-14 text-center">
          <Wrench size={40} className="mx-auto text-slate-300" />
          <p className="mt-3 text-sm text-slate-500">No tienes instalaciones asignadas</p>
        </div>
      )}
    </div>
  );
}

export function DetalleInstalacion() {
  const { id } = useParams();
  const nav = useNavigate();
  const { user } = useAuth();
  const [v, setV] = useState(0);

  const orden = useMemo(() => { void v; return id ? Store.getOrdenById(id) : undefined; }, [id, v]);
  const cli = useMemo(() => orden ? Store.getClienteById(orden.clienteId) : undefined, [orden]);

  const completar = useCallback(() => {
    if (!orden || !user) return;
    Store.cambiarEstado(orden.id, 'instalado', user);
    setV(x => x + 1);
  }, [orden, user]);

  const problema = useCallback(() => {
    if (!orden || !user) return;
    Store.cambiarEstado(orden.id, 'problema', user);
    setV(x => x + 1);
  }, [orden, user]);

  if (!orden) return <div className="py-20 text-center text-slate-400">Instalación no encontrada</div>;
  const cfg = ESTADO_CONFIG[orden.estado];

  return (
    <div className="mx-auto max-w-2xl space-y-5">
      <button onClick={() => nav('/instalador')} className="flex items-center gap-1 text-sm font-medium text-slate-500 hover:text-slate-800">
        <ArrowLeft size={15} /> Volver
      </button>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">{orden.id}</h1>
          <p className="text-sm text-slate-500">Detalle de Instalación</p>
        </div>
        <span className={`rounded-full px-3 py-1 text-sm font-semibold ${cfg.bg} ${cfg.color}`}>{cfg.label}</span>
      </div>

      {cli && (
        <div className="rounded-xl border border-slate-200 bg-white p-5">
          <h2 className="mb-3 text-base font-semibold text-slate-900">Datos de Contacto</h2>
          <div className="space-y-2.5">
            <div className="flex items-start gap-3 rounded-lg bg-violet-50 p-3">
              <MapPin size={17} className="mt-0.5 shrink-0 text-violet-600" />
              <div>
                <p className="text-[11px] font-semibold uppercase text-violet-600">Dirección</p>
                <p className="text-sm font-medium text-slate-800">{cli.direccion}</p>
              </div>
            </div>
            <div className="flex items-start gap-3 rounded-lg bg-blue-50 p-3">
              <Phone size={17} className="mt-0.5 shrink-0 text-blue-600" />
              <div>
                <p className="text-[11px] font-semibold uppercase text-blue-600">Contacto</p>
                <p className="text-sm font-medium text-slate-800">{cli.nombre}</p>
                <p className="text-xs text-slate-600">{cli.telefono} · {cli.email}</p>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="rounded-xl border border-slate-200 bg-white p-5">
        <h2 className="mb-3 text-base font-semibold text-slate-900">Productos a Instalar ({orden.productos.length})</h2>
        <div className="space-y-2">
          {orden.productos.map((p, i) => (
            <div key={p.id} className="rounded-lg border border-slate-200 p-3">
              <p className="text-sm font-medium text-slate-800">{i + 1}. {p.tipo}</p>
              <div className="mt-1 flex flex-wrap gap-3 text-xs text-slate-500">
                <span className="flex items-center gap-1"><Ruler size={12} />{p.ancho}×{p.alto} cm</span>
                <span className="flex items-center gap-1"><Palette size={12} />{p.tela} · {p.color}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {orden.estado === 'en_instalacion' && (
        <div className="rounded-xl border-2 border-dashed border-slate-300 bg-white p-8 text-center">
          <Camera size={28} className="mx-auto text-slate-400" />
          <p className="mt-2 text-sm font-medium text-slate-600">Fotos de instalación</p>
          <p className="text-xs text-slate-400">Disponible próximamente</p>
        </div>
      )}

      <div className="rounded-xl border border-slate-200 bg-white p-5">
        <h2 className="mb-3 flex items-center gap-2 text-base font-semibold text-slate-900"><Clock size={16} /> Historial</h2>
        <div className="space-y-0">
          {[...orden.historial].reverse().map((h, i) => {
            const c = ESTADO_CONFIG[h.estado as EstadoOrden];
            return (
              <div key={i} className="flex gap-3">
                <div className="flex flex-col items-center">
                  <div className={`mt-0.5 h-2.5 w-2.5 rounded-full ${i === 0 ? c.dot : 'bg-slate-300'}`} />
                  {i < orden.historial.length - 1 && <div className="h-full w-px bg-slate-200" />}
                </div>
                <div className="pb-3">
                  <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${c.bg} ${c.color}`}>{c.label}</span>
                  <p className="mt-0.5 flex items-center gap-1 text-[11px] text-slate-500"><User size={10} />{h.usuarioNombre}</p>
                  <p className="text-[11px] text-slate-400">{h.fecha}</p>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {orden.estado === 'en_instalacion' && (
        <div className="flex gap-3">
          <button onClick={problema}
            className="flex flex-1 items-center justify-center gap-2 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700 transition hover:bg-red-100">
            <AlertTriangle size={17} /> Problema
          </button>
          <button onClick={completar}
            className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-emerald-500 px-4 py-3 text-sm font-semibold text-white transition hover:bg-emerald-600">
            <CheckCircle2 size={17} /> Completada
          </button>
        </div>
      )}
    </div>
  );
}
