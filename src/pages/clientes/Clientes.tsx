'use client'
import { useState, useEffect, useRef } from 'react'
import {
  Search, Plus, X, ChevronDown, User2, Building2, Phone, Mail,
  MapPin, Tag, Edit3, Trash2, SlidersHorizontal, FileText, RefreshCw,
  CheckCircle2, AlertCircle, TrendingUp
} from 'lucide-react'
import { useApi } from '../../hooks/useApi'
import { useMutation } from '../../hooks/useMutation'
import { api } from '../../services/api'

const ORIGENES = ['web','referido','cotizacion','visita','llamada','redes_sociales','directo','otro']
const REGIONES = ['Metropolitana de Santiago','Valparaíso',"O'Higgins",'Maule','Biobío',
  'La Araucanía','Los Lagos','Arica y Parinacota','Tarapacá','Antofagasta','Atacama',
  'Coquimbo','Ñuble','Los Ríos','Aysén','Magallanes']
const TIPOS = ['persona','empresa']
const ORIGEN_LABELS: Record<string,string> = {
  web:'Web',referido:'Referido',cotizacion:'Cotización',visita:'Visita',
  llamada:'Llamada',redes_sociales:'Redes Sociales',directo:'Directo',otro:'Otro'
}
const ORIGEN_COLORS: Record<string,string> = {
  web:'bg-blue-100 text-blue-700',referido:'bg-green-100 text-green-700',
  cotizacion:'bg-purple-100 text-purple-700',visita:'bg-amber-100 text-amber-700',
  llamada:'bg-cyan-100 text-cyan-700',redes_sociales:'bg-pink-100 text-pink-700',
  directo:'bg-slate-100 text-slate-700',otro:'bg-gray-100 text-gray-700'
}

interface Client {
  id: number; tenant_id: string; nombre: string; rut?: string
  tipo_cliente: string; empresa?: string; email?: string; email2?: string
  telefono?: string; telefono2?: string; direccion?: string; ciudad?: string
  region?: string; origen: string; tags: string[]; notas?: string
  vendedor_id?: number; created_at?: string
}

const EMPTY_FORM: Omit<Client,'id'|'tenant_id'> = {
  nombre:'', rut:'', tipo_cliente:'persona', empresa:'', email:'', email2:'',
  telefono:'', telefono2:'', direccion:'', ciudad:'', region:'', origen:'directo',
  tags:[], notas:''
}

export default function Clientes() {
  const [search, setSearch] = useState('')
  const [filterOrigen, setFilterOrigen] = useState('')
  const [filterTipo, setFilterTipo] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [editClient, setEditClient] = useState<Client|null>(null)
  const [form, setForm] = useState<typeof EMPTY_FORM>(EMPTY_FORM)
  const [tagInput, setTagInput] = useState('')
  const [selected, setSelected] = useState<Client|null>(null)
  const [showFilters, setShowFilters] = useState(false)
  const searchRef = useRef<HTMLInputElement>(null)

  const params: Record<string,string> = {}
  if (search) params.q = search
  if (filterOrigen) params.origen = filterOrigen
  if (filterTipo) params.tipo_cliente = filterTipo

  const { data: rawClients, loading, refetch } = useApi<Client[]>(
    () => api.getClients(Object.keys(params).length ? params : undefined),
    [search, filterOrigen, filterTipo]
  )
  const clients = rawClients ?? []

  const { execute: createClient, loading: creating } = useMutation(api.createClient)
  const { execute: updateClient, loading: updating } = useMutation(api.updateClient)
  const { execute: deleteClient } = useMutation(api.deleteClient)

  function openNew() {
    setForm(EMPTY_FORM); setEditClient(null); setTagInput(''); setShowForm(true)
  }
  function openEdit(c: Client) {
    setForm({
      nombre:c.nombre, rut:c.rut||'', tipo_cliente:c.tipo_cliente, empresa:c.empresa||'',
      email:c.email||'', email2:c.email2||'', telefono:c.telefono||'', telefono2:c.telefono2||'',
      direccion:c.direccion||'', ciudad:c.ciudad||'', region:c.region||'',
      origen:c.origen, tags:c.tags||[], notas:c.notas||''
    })
    setEditClient(c); setTagInput(''); setShowForm(true)
  }

  function addTag() {
    const t = tagInput.trim()
    if (t && !form.tags.includes(t)) {
      setForm(f => ({ ...f, tags: [...f.tags, t] }))
    }
    setTagInput('')
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const payload = { ...form, tags: form.tags }
    if (editClient) {
      await updateClient(editClient.id, payload)
    } else {
      await createClient(payload)
    }
    setShowForm(false); refetch()
  }

  async function handleDelete(c: Client) {
    if (!confirm(`¿Eliminar cliente "${c.nombre}"? Esta acción no se puede deshacer.`)) return
    await deleteClient(c.id)
    if (selected?.id === c.id) setSelected(null)
    refetch()
  }

  const stats = {
    total: clients.length,
    empresas: clients.filter(c => c.tipo_cliente === 'empresa').length,
    personas: clients.filter(c => c.tipo_cliente === 'persona').length,
    conContacto: clients.filter(c => c.telefono || c.email).length,
  }

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">CRM Clientes</h1>
          <p className="text-sm text-slate-500 mt-0.5">Registro, seguimiento y gestión de clientes</p>
        </div>
        <button onClick={openNew}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold text-white shadow-sm transition-all hover:shadow-md active:scale-95"
          style={{ background: 'linear-gradient(135deg, var(--brand-primary), var(--brand-dark))' }}>
          <Plus size={16} /> Nuevo Cliente
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          { label: 'Total Clientes', value: stats.total, icon: <User2 size={18}/>, color: 'text-blue-600 bg-blue-50' },
          { label: 'Empresas', value: stats.empresas, icon: <Building2 size={18}/>, color: 'text-purple-600 bg-purple-50' },
          { label: 'Personas', value: stats.personas, icon: <User2 size={18}/>, color: 'text-green-600 bg-green-50' },
          { label: 'Con Contacto', value: stats.conContacto, icon: <CheckCircle2 size={18}/>, color: 'text-amber-600 bg-amber-50' },
        ].map(s => (
          <div key={s.label} className="bg-white rounded-2xl border border-slate-100 p-4 shadow-sm flex items-center gap-3">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${s.color}`}>{s.icon}</div>
            <div>
              <p className="text-2xl font-bold text-slate-900">{s.value}</p>
              <p className="text-xs text-slate-500">{s.label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Búsqueda y filtros */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4 space-y-3">
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input ref={searchRef} value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Buscar por nombre, RUT, email, empresa, teléfono..."
              className="w-full pl-9 pr-4 py-2.5 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[--brand-primary]/30 focus:border-[--brand-primary]" />
            {search && <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"><X size={14}/></button>}
          </div>
          <button onClick={() => setShowFilters(f => !f)}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-xl border text-sm font-medium transition-colors ${showFilters ? 'border-[--brand-primary] text-[--brand-primary] bg-[--brand-primary]/5' : 'border-slate-200 text-slate-600 hover:border-slate-300'}`}>
            <SlidersHorizontal size={15}/> Filtros
          </button>
          <button onClick={refetch} className="p-2.5 rounded-xl border border-slate-200 text-slate-500 hover:text-slate-700 hover:border-slate-300 transition-colors">
            <RefreshCw size={15}/>
          </button>
        </div>

        {showFilters && (
          <div className="grid grid-cols-2 gap-2 pt-1">
            <select value={filterOrigen} onChange={e => setFilterOrigen(e.target.value)}
              className="px-3 py-2 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-[--brand-primary]">
              <option value="">Todos los orígenes</option>
              {ORIGENES.map(o => <option key={o} value={o}>{ORIGEN_LABELS[o]}</option>)}
            </select>
            <select value={filterTipo} onChange={e => setFilterTipo(e.target.value)}
              className="px-3 py-2 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-[--brand-primary]">
              <option value="">Persona y Empresa</option>
              <option value="persona">Solo Personas</option>
              <option value="empresa">Solo Empresas</option>
            </select>
          </div>
        )}
      </div>

      {/* Lista + Detalle */}
      <div className="flex gap-4">
        {/* Tabla */}
        <div className={`bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden transition-all ${selected ? 'w-[55%]' : 'flex-1'}`}>
          {loading ? (
            <div className="flex items-center justify-center h-48 text-slate-400">
              <RefreshCw size={22} className="animate-spin mr-2"/> Cargando...
            </div>
          ) : clients.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-48 text-slate-400">
              <User2 size={36} className="mb-2 opacity-30"/>
              <p className="font-medium">No hay clientes</p>
              <p className="text-sm">{search ? 'Intenta con otra búsqueda' : 'Registra tu primer cliente'}</p>
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50">
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">Cliente</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide hidden md:table-cell">Contacto</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide hidden lg:table-cell">Origen</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-slate-500 uppercase tracking-wide">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {clients.map(c => (
                  <tr key={c.id} onClick={() => setSelected(s => s?.id === c.id ? null : c)}
                    className={`cursor-pointer transition-colors hover:bg-slate-50 ${selected?.id === c.id ? 'bg-[--brand-primary]/5' : ''}`}>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2.5">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white flex-shrink-0 ${c.tipo_cliente === 'empresa' ? 'bg-purple-500' : 'bg-blue-500'}`}>
                          {c.nombre.slice(0,2).toUpperCase()}
                        </div>
                        <div>
                          <p className="font-semibold text-slate-900 leading-tight">{c.nombre}</p>
                          {c.empresa && <p className="text-xs text-slate-400">{c.empresa}</p>}
                          {c.rut && <p className="text-xs text-slate-400">RUT: {c.rut}</p>}
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 hidden md:table-cell">
                      <div className="space-y-0.5">
                        {c.telefono && <p className="text-slate-600 flex items-center gap-1"><Phone size={11} className="text-slate-400"/>{c.telefono}</p>}
                        {c.email && <p className="text-slate-400 text-xs truncate max-w-[160px]">{c.email}</p>}
                      </div>
                    </td>
                    <td className="px-4 py-3 hidden lg:table-cell">
                      <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${ORIGEN_COLORS[c.origen] || 'bg-slate-100 text-slate-600'}`}>
                        {ORIGEN_LABELS[c.origen] || c.origen}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button onClick={e => { e.stopPropagation(); openEdit(c) }}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition-colors">
                          <Edit3 size={14}/>
                        </button>
                        <button onClick={e => { e.stopPropagation(); handleDelete(c) }}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50 transition-colors">
                          <Trash2 size={14}/>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Panel de detalle */}
        {selected && (
          <div className="flex-1 bg-white rounded-2xl border border-slate-100 shadow-sm p-5 space-y-4 animate-in slide-in-from-right-4 duration-200">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-sm font-bold text-white ${selected.tipo_cliente === 'empresa' ? 'bg-purple-500' : 'bg-blue-500'}`}>
                  {selected.nombre.slice(0,2).toUpperCase()}
                </div>
                <div>
                  <h3 className="font-bold text-slate-900">{selected.nombre}</h3>
                  {selected.empresa && <p className="text-xs text-slate-500">{selected.empresa}</p>}
                  <span className={`inline-block mt-1 px-2 py-0.5 rounded-full text-xs font-medium ${ORIGEN_COLORS[selected.origen]}`}>
                    {ORIGEN_LABELS[selected.origen]}
                  </span>
                </div>
              </div>
              <button onClick={() => setSelected(null)} className="text-slate-400 hover:text-slate-600 p-1">
                <X size={16}/>
              </button>
            </div>

            <div className="grid grid-cols-1 gap-2 text-sm">
              {selected.rut && <Row icon={<FileText size={13}/>} label="RUT" value={selected.rut}/>}
              {selected.telefono && <Row icon={<Phone size={13}/>} label="Teléfono" value={selected.telefono}/>}
              {selected.telefono2 && <Row icon={<Phone size={13}/>} label="Teléfono 2" value={selected.telefono2}/>}
              {selected.email && <Row icon={<Mail size={13}/>} label="Email" value={selected.email}/>}
              {selected.email2 && <Row icon={<Mail size={13}/>} label="Email 2" value={selected.email2}/>}
              {(selected.direccion || selected.ciudad || selected.region) && (
                <Row icon={<MapPin size={13}/>} label="Dirección"
                  value={[selected.direccion, selected.ciudad, selected.region].filter(Boolean).join(', ')}/>
              )}
            </div>

            {selected.tags && selected.tags.length > 0 && (
              <div>
                <p className="text-xs font-semibold text-slate-500 mb-1.5 flex items-center gap-1"><Tag size={11}/> Etiquetas</p>
                <div className="flex flex-wrap gap-1.5">
                  {selected.tags.map(t => (
                    <span key={t} className="px-2 py-0.5 bg-slate-100 text-slate-700 text-xs rounded-full font-medium">{t}</span>
                  ))}
                </div>
              </div>
            )}

            {selected.notas && (
              <div>
                <p className="text-xs font-semibold text-slate-500 mb-1">Notas</p>
                <p className="text-sm text-slate-600 bg-slate-50 rounded-lg p-2.5">{selected.notas}</p>
              </div>
            )}

            <div className="flex gap-2 pt-1">
              <button onClick={() => openEdit(selected)}
                className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl border border-slate-200 text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors">
                <Edit3 size={14}/> Editar
              </button>
              <button onClick={() => handleDelete(selected)}
                className="flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl border border-red-200 text-sm font-medium text-red-600 hover:bg-red-50 transition-colors">
                <Trash2 size={14}/>
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Modal Formulario */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b border-slate-100">
              <div>
                <h2 className="text-lg font-bold text-slate-900">{editClient ? 'Editar Cliente' : 'Registrar Nuevo Cliente'}</h2>
                <p className="text-sm text-slate-500">Completa la información del cliente</p>
              </div>
              <button onClick={() => setShowForm(false)} className="p-2 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors">
                <X size={18}/>
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-5">
              {/* Tipo */}
              <div className="flex gap-2">
                {TIPOS.map(t => (
                  <button type="button" key={t} onClick={() => setForm(f => ({ ...f, tipo_cliente: t }))}
                    className={`flex-1 py-2.5 rounded-xl border text-sm font-semibold transition-all ${form.tipo_cliente === t ? 'border-[--brand-primary] bg-[--brand-primary]/5 text-[--brand-primary]' : 'border-slate-200 text-slate-600 hover:border-slate-300'}`}>
                    {t === 'persona' ? '👤 Persona Natural' : '🏢 Empresa / Razón Social'}
                  </button>
                ))}
              </div>

              {/* Datos principales */}
              <div className="grid grid-cols-2 gap-3">
                <Field label="Nombre *" req value={form.nombre} onChange={v => setForm(f => ({ ...f, nombre: v }))} col={2}/>
                {form.tipo_cliente === 'empresa' && (
                  <Field label="Empresa / Razón Social" value={form.empresa||''} onChange={v => setForm(f => ({ ...f, empresa: v }))} col={2}/>
                )}
                <Field label="RUT" value={form.rut||''} onChange={v => setForm(f => ({ ...f, rut: v }))} placeholder="12.345.678-9"/>
                <Field label="Teléfono" value={form.telefono||''} onChange={v => setForm(f => ({ ...f, telefono: v }))} placeholder="+56 9 1234 5678"/>
                <Field label="Teléfono 2" value={form.telefono2||''} onChange={v => setForm(f => ({ ...f, telefono2: v }))}/>
                <Field label="Email" value={form.email||''} onChange={v => setForm(f => ({ ...f, email: v }))} type="email"/>
                <Field label="Email 2" value={form.email2||''} onChange={v => setForm(f => ({ ...f, email2: v }))} type="email"/>
              </div>

              {/* Dirección */}
              <div className="grid grid-cols-3 gap-3">
                <Field label="Dirección" value={form.direccion||''} onChange={v => setForm(f => ({ ...f, direccion: v }))} col={3}/>
                <Field label="Ciudad" value={form.ciudad||''} onChange={v => setForm(f => ({ ...f, ciudad: v }))}/>
                <div className="col-span-2">
                  <label className="block text-xs font-semibold text-slate-600 mb-1.5">Región</label>
                  <select value={form.region||''} onChange={e => setForm(f => ({ ...f, region: e.target.value }))}
                    className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[--brand-primary]/30">
                    <option value="">Seleccionar región</option>
                    {REGIONES.map(r => <option key={r} value={r}>{r}</option>)}
                  </select>
                </div>
              </div>

              {/* CRM */}
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1.5">Origen del Cliente</label>
                <div className="grid grid-cols-4 gap-2">
                  {ORIGENES.map(o => (
                    <button type="button" key={o} onClick={() => setForm(f => ({ ...f, origen: o }))}
                      className={`py-2 rounded-xl border text-xs font-medium transition-all ${form.origen === o ? 'border-[--brand-primary] bg-[--brand-primary]/5 text-[--brand-primary]' : 'border-slate-200 text-slate-600 hover:border-slate-300'}`}>
                      {ORIGEN_LABELS[o]}
                    </button>
                  ))}
                </div>
              </div>

              {/* Tags */}
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1.5">Etiquetas</label>
                <div className="flex gap-2 mb-2">
                  <input value={tagInput} onChange={e => setTagInput(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), addTag())}
                    placeholder="Escribe una etiqueta y presiona Enter"
                    className="flex-1 px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[--brand-primary]/30"/>
                  <button type="button" onClick={addTag}
                    className="px-3 py-2 rounded-xl bg-slate-100 text-slate-700 text-sm font-medium hover:bg-slate-200 transition-colors">
                    Agregar
                  </button>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {form.tags.map(t => (
                    <span key={t} className="flex items-center gap-1 px-2 py-0.5 bg-slate-100 text-slate-700 text-xs rounded-full font-medium">
                      {t}
                      <button type="button" onClick={() => setForm(f => ({ ...f, tags: f.tags.filter(x => x !== t) }))}
                        className="hover:text-red-500 transition-colors"><X size={10}/></button>
                    </span>
                  ))}
                </div>
              </div>

              {/* Notas */}
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1.5">Notas</label>
                <textarea value={form.notas||''} onChange={e => setForm(f => ({ ...f, notas: e.target.value }))}
                  rows={3} placeholder="Notas adicionales sobre el cliente..."
                  className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[--brand-primary]/30 resize-none"/>
              </div>

              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowForm(false)}
                  className="flex-1 py-2.5 rounded-xl border border-slate-200 text-sm font-semibold text-slate-700 hover:bg-slate-50 transition-colors">
                  Cancelar
                </button>
                <button type="submit" disabled={creating || updating}
                  className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-white transition-all disabled:opacity-60"
                  style={{ background: 'linear-gradient(135deg, var(--brand-primary), var(--brand-dark))' }}>
                  {creating || updating ? 'Guardando...' : editClient ? 'Actualizar Cliente' : 'Registrar Cliente'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

function Row({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="flex items-start gap-2 py-1">
      <span className="text-slate-400 mt-0.5 flex-shrink-0">{icon}</span>
      <div className="min-w-0">
        <span className="text-xs text-slate-400">{label}: </span>
        <span className="text-slate-800 font-medium break-all">{value}</span>
      </div>
    </div>
  )
}

function Field({ label, value, onChange, type='text', placeholder='', req=false, col=1 }: {
  label: string; value: string; onChange: (v: string) => void
  type?: string; placeholder?: string; req?: boolean; col?: number
}) {
  return (
    <div className={col > 1 ? `col-span-${col}` : ''}>
      <label className="block text-xs font-semibold text-slate-600 mb-1.5">{label}{req && ' *'}</label>
      <input type={type} value={value} onChange={e => onChange(e.target.value)}
        placeholder={placeholder} required={req}
        className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[--brand-primary]/30 focus:border-[--brand-primary] transition-all"/>
    </div>
  )
}
