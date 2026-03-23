'use client'
import { useState } from 'react'
import {
  CalendarDays, Plus, X, CheckCircle2, XCircle, Clock,
  ChevronDown, RefreshCw, Plane, Stethoscope, Coffee, FileText
} from 'lucide-react'
import { useApi } from '../../hooks/useApi'
import { useMutation } from '../../hooks/useMutation'
import { api } from '../../services/api'
import { useAuth } from '../../context/AuthContext'

const TIPO_CONFIG: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
  permiso:          { label: 'Permiso',          color: 'text-blue-700 bg-blue-50 border-blue-200',    icon: <Coffee size={13}/> },
  vacacion:         { label: 'Vacaciones',        color: 'text-emerald-700 bg-emerald-50 border-emerald-200', icon: <Plane size={13}/> },
  licencia_medica:  { label: 'Licencia Médica',   color: 'text-red-700 bg-red-50 border-red-200',      icon: <Stethoscope size={13}/> },
  otro:             { label: 'Otro',              color: 'text-slate-700 bg-slate-50 border-slate-200', icon: <FileText size={13}/> },
}

const ESTADO_CONFIG = {
  pendiente:  { label: 'Pendiente',  bg: 'bg-amber-50 text-amber-700 border-amber-200', dot: 'bg-amber-400' },
  aprobada:   { label: 'Aprobada',   bg: 'bg-emerald-50 text-emerald-700 border-emerald-200', dot: 'bg-emerald-500' },
  rechazada:  { label: 'Rechazada',  bg: 'bg-red-50 text-red-700 border-red-200', dot: 'bg-red-500' },
}

interface SolicitudPermiso {
  id: string
  solicitante_id: number
  solicitante_nombre?: string
  solicitante_rol?: string
  tipo: string
  fecha_inicio: string
  fecha_fin: string
  dias: number
  motivo?: string
  estado: string
  respuesta?: string
  revisado_por_nombre?: string
  revisado_at?: string
  created_at: string
}

const ROLES_ADMIN = ['jefe', 'gerente', 'coordinador', 'superadmin']

export default function SolicitudesRRHH() {
  const { user } = useAuth()
  const isAdmin = ROLES_ADMIN.includes(user?.rol || '')

  const [showForm, setShowForm] = useState(false)
  const [revisar, setRevisar] = useState<SolicitudPermiso | null>(null)

  const { data: rawSolicitudes, loading, refetch } = useApi(() => api.getPermisos(), [])
  const solicitudes: SolicitudPermiso[] = rawSolicitudes ?? []

  const pendientes = solicitudes.filter(s => s.estado === 'pendiente')
  const historial = solicitudes.filter(s => s.estado !== 'pendiente')

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">
            {isAdmin ? 'Solicitudes de Permisos' : 'Mis Solicitudes'}
          </h1>
          <p className="text-sm text-slate-500 mt-0.5">
            {isAdmin
              ? `${pendientes.length} pendiente(s) de revisión`
              : 'Permisos, vacaciones y licencias médicas'}
          </p>
        </div>
        <div className="flex gap-2">
          <button onClick={refetch} className="p-2 rounded-xl border border-slate-200 text-slate-500 hover:bg-slate-50">
            <RefreshCw size={15}/>
          </button>
          {!isAdmin && (
            <button onClick={() => setShowForm(true)}
              className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold text-white"
              style={{ background: 'linear-gradient(135deg, var(--brand-primary), var(--brand-dark))' }}>
              <Plus size={15}/> Nueva Solicitud
            </button>
          )}
        </div>
      </div>

      {/* Formulario nueva solicitud */}
      {showForm && (
        <FormularioSolicitud
          onCreated={() => { setShowForm(false); refetch() }}
          onCancel={() => setShowForm(false)}
        />
      )}

      {/* Modal revisión admin */}
      {revisar && isAdmin && (
        <ModalRevisar
          solicitud={revisar}
          onDone={() => { setRevisar(null); refetch() }}
          onCancel={() => setRevisar(null)}
        />
      )}

      {loading ? (
        <div className="flex items-center justify-center h-32 text-slate-400">
          <RefreshCw size={16} className="animate-spin mr-2"/> Cargando...
        </div>
      ) : solicitudes.length === 0 ? (
        <div className="bg-white rounded-2xl border border-dashed border-slate-200 p-12 text-center">
          <CalendarDays size={36} className="mx-auto text-slate-200 mb-3"/>
          <p className="font-medium text-slate-400">Sin solicitudes</p>
          {!isAdmin && <p className="text-sm text-slate-300">Crea una con el botón "Nueva Solicitud"</p>}
        </div>
      ) : (
        <div className="space-y-4">
          {/* Pendientes */}
          {pendientes.length > 0 && (
            <div className="bg-white rounded-2xl border border-amber-100 shadow-sm overflow-hidden">
              <div className="px-5 py-3 bg-amber-50 border-b border-amber-100 flex items-center gap-2">
                <Clock size={14} className="text-amber-600"/>
                <p className="text-sm font-bold text-amber-700">Pendientes de revisión ({pendientes.length})</p>
              </div>
              <div className="divide-y divide-slate-50">
                {pendientes.map(s => (
                  <TarjetaSolicitud
                    key={s.id}
                    solicitud={s}
                    isAdmin={isAdmin}
                    onRevisar={() => setRevisar(s)}
                    onCancelar={async () => { await api.cancelarPermiso(s.id); refetch() }}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Historial */}
          {historial.length > 0 && (
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
              <div className="px-5 py-3 border-b border-slate-100">
                <p className="text-sm font-bold text-slate-700">Historial</p>
              </div>
              <div className="divide-y divide-slate-50">
                {historial.map(s => (
                  <TarjetaSolicitud key={s.id} solicitud={s} isAdmin={isAdmin}/>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ── Tarjeta solicitud ──────────────────────────────────────────
function TarjetaSolicitud({ solicitud: s, isAdmin, onRevisar, onCancelar }: {
  solicitud: SolicitudPermiso
  isAdmin: boolean
  onRevisar?: () => void
  onCancelar?: () => void
}) {
  const tipoCfg = TIPO_CONFIG[s.tipo] || TIPO_CONFIG.otro
  const estadoCfg = ESTADO_CONFIG[s.estado as keyof typeof ESTADO_CONFIG] || ESTADO_CONFIG.pendiente
  const fmtDate = (d: string) => new Date(d).toLocaleDateString('es-CL')

  return (
    <div className="px-5 py-4 flex items-start gap-4">
      {/* Icono tipo */}
      <div className={`mt-0.5 flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl border ${tipoCfg.color}`}>
        {tipoCfg.icon}
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex flex-wrap items-center gap-2 mb-1">
          <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-semibold ${tipoCfg.color}`}>
            {tipoCfg.label}
          </span>
          <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-semibold ${estadoCfg.bg}`}>
            <span className={`h-1.5 w-1.5 rounded-full ${estadoCfg.dot}`}/>
            {estadoCfg.label}
          </span>
          {s.dias > 0 && (
            <span className="text-xs text-slate-500">{s.dias} día{s.dias !== 1 ? 's' : ''}</span>
          )}
        </div>

        {isAdmin && s.solicitante_nombre && (
          <p className="text-sm font-bold text-slate-900">{s.solicitante_nombre}
            <span className="ml-1.5 text-xs font-normal text-slate-400">{s.solicitante_rol}</span>
          </p>
        )}

        <p className="text-sm text-slate-700">
          {fmtDate(s.fecha_inicio)} → {fmtDate(s.fecha_fin)}
        </p>

        {s.motivo && (
          <p className="mt-1 text-xs text-slate-500 italic">"{s.motivo}"</p>
        )}
        {s.respuesta && (
          <p className="mt-1 text-xs text-slate-600 bg-slate-50 rounded px-2 py-1">
            💬 {s.respuesta}
          </p>
        )}
        {s.revisado_por_nombre && (
          <p className="mt-1 text-[11px] text-slate-400">
            Revisado por {s.revisado_por_nombre} · {s.revisado_at ? fmtDate(s.revisado_at) : ''}
          </p>
        )}
      </div>

      {/* Acciones */}
      <div className="flex-shrink-0 flex gap-1.5">
        {isAdmin && s.estado === 'pendiente' && onRevisar && (
          <button onClick={onRevisar}
            className="rounded-lg bg-indigo-50 px-3 py-1.5 text-xs font-semibold text-indigo-700 hover:bg-indigo-100 transition">
            Revisar
          </button>
        )}
        {!isAdmin && s.estado === 'pendiente' && onCancelar && (
          <button onClick={onCancelar}
            className="rounded-lg p-1.5 text-slate-300 hover:bg-red-50 hover:text-red-500 transition">
            <X size={14}/>
          </button>
        )}
      </div>
    </div>
  )
}

// ── Formulario crear solicitud ─────────────────────────────────
function FormularioSolicitud({ onCreated, onCancel }: {
  onCreated: () => void; onCancel: () => void
}) {
  const today = new Date().toISOString().split('T')[0]
  const [tipo, setTipo] = useState('permiso')
  const [fechaInicio, setFechaInicio] = useState(today)
  const [fechaFin, setFechaFin] = useState(today)
  const [motivo, setMotivo] = useState('')
  const [error, setError] = useState('')

  const { execute: create, loading } = useMutation(api.createPermiso)

  const dias = Math.max(1, Math.round(
    (new Date(fechaFin).getTime() - new Date(fechaInicio).getTime()) / 86400000
  ) + 1)

  const submit = async () => {
    if (fechaFin < fechaInicio) { setError('La fecha fin debe ser igual o posterior al inicio'); return }
    setError('')
    const res = await create({ tipo, fecha_inicio: fechaInicio, fecha_fin: fechaFin, dias, motivo: motivo.trim() || undefined })
    if (res) onCreated()
  }

  const inp = 'w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[--brand-primary]/30'

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm font-bold text-slate-900">Nueva Solicitud</p>
        <button onClick={onCancel} className="text-slate-400 hover:text-slate-600"><X size={16}/></button>
      </div>

      {/* Tipo */}
      <div>
        <label className="block text-xs font-semibold text-slate-600 mb-2">Tipo</label>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {Object.entries(TIPO_CONFIG).map(([k, v]) => (
            <button key={k} type="button" onClick={() => setTipo(k)}
              className={`flex items-center gap-2 rounded-xl border px-3 py-2 text-xs font-medium transition ${
                tipo === k ? `border-[--brand-primary] bg-[--brand-primary]/5 text-[--brand-primary]` : 'border-slate-200 text-slate-600 hover:border-slate-300'
              }`}>
              {v.icon} {v.label}
            </button>
          ))}
        </div>
      </div>

      {/* Fechas */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-semibold text-slate-600 mb-1">Desde *</label>
          <input type="date" value={fechaInicio} min={today} onChange={e => setFechaInicio(e.target.value)} className={inp}/>
        </div>
        <div>
          <label className="block text-xs font-semibold text-slate-600 mb-1">Hasta *</label>
          <input type="date" value={fechaFin} min={fechaInicio} onChange={e => setFechaFin(e.target.value)} className={inp}/>
        </div>
      </div>

      {dias > 0 && (
        <p className="text-xs text-slate-500 flex items-center gap-1">
          <CalendarDays size={12}/> Total: <strong>{dias} día{dias !== 1 ? 's' : ''}</strong>
        </p>
      )}

      {/* Motivo */}
      <div>
        <label className="block text-xs font-semibold text-slate-600 mb-1">Motivo (opcional)</label>
        <textarea value={motivo} onChange={e => setMotivo(e.target.value)} rows={2}
          placeholder="Explica brevemente el motivo..."
          className={`${inp} resize-none`}/>
      </div>

      {error && <p className="text-xs text-red-600">{error}</p>}

      <div className="flex gap-3">
        <button onClick={onCancel}
          className="flex-1 rounded-xl border border-slate-200 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-50">
          Cancelar
        </button>
        <button onClick={submit} disabled={loading}
          className="flex-1 rounded-xl py-2.5 text-sm font-bold text-white disabled:opacity-60"
          style={{ background: 'linear-gradient(135deg, var(--brand-primary), var(--brand-dark))' }}>
          {loading ? 'Enviando...' : 'Enviar Solicitud'}
        </button>
      </div>
    </div>
  )
}

// ── Modal revisar solicitud (admin) ────────────────────────────
function ModalRevisar({ solicitud: s, onDone, onCancel }: {
  solicitud: SolicitudPermiso; onDone: () => void; onCancel: () => void
}) {
  const [respuesta, setRespuesta] = useState('')
  const { execute: revisar, loading } = useMutation(api.revisarPermiso)

  const action = async (estado: 'aprobada' | 'rechazada') => {
    await revisar(s.id, { estado, respuesta: respuesta.trim() || undefined })
    onDone()
  }

  const tipoCfg = TIPO_CONFIG[s.tipo] || TIPO_CONFIG.otro
  const fmtDate = (d: string) => new Date(d).toLocaleDateString('es-CL')

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-2xl bg-white shadow-2xl p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-base font-bold text-slate-900">Revisar Solicitud</h3>
          <button onClick={onCancel} className="text-slate-400 hover:text-slate-600"><X size={18}/></button>
        </div>

        {/* Info */}
        <div className="rounded-xl bg-slate-50 border border-slate-100 p-4 space-y-1.5">
          <p className="text-sm font-bold text-slate-900">{s.solicitante_nombre}
            <span className="ml-2 text-xs font-normal text-slate-400">{s.solicitante_rol}</span>
          </p>
          <div className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-semibold ${tipoCfg.color}`}>
            {tipoCfg.icon} {tipoCfg.label}
          </div>
          <p className="text-sm text-slate-700">{fmtDate(s.fecha_inicio)} → {fmtDate(s.fecha_fin)} · <strong>{s.dias} día{s.dias !== 1 ? 's' : ''}</strong></p>
          {s.motivo && <p className="text-xs text-slate-500 italic">"{s.motivo}"</p>}
        </div>

        {/* Respuesta */}
        <div>
          <label className="block text-xs font-semibold text-slate-600 mb-1">Respuesta (opcional)</label>
          <textarea value={respuesta} onChange={e => setRespuesta(e.target.value)} rows={2}
            placeholder="Mensaje al empleado..."
            className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-200 resize-none"/>
        </div>

        <div className="flex gap-3">
          <button onClick={() => action('rechazada')} disabled={loading}
            className="flex-1 flex items-center justify-center gap-1.5 rounded-xl border border-red-200 py-2.5 text-sm font-semibold text-red-600 hover:bg-red-50 disabled:opacity-50">
            <XCircle size={15}/> Rechazar
          </button>
          <button onClick={() => action('aprobada')} disabled={loading}
            className="flex-1 flex items-center justify-center gap-1.5 rounded-xl bg-emerald-500 py-2.5 text-sm font-bold text-white hover:bg-emerald-600 disabled:opacity-50">
            <CheckCircle2 size={15}/> Aprobar
          </button>
        </div>
      </div>
    </div>
  )
}
