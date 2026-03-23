'use client'
import { useState, useRef } from 'react'
import {
  Upload, FileText, Image, Trash2, Download, X, User2,
  Eye, Shield, RefreshCw, Plus, CheckCircle2, AlertCircle
} from 'lucide-react'
import { useApi } from '../../hooks/useApi'
import { api, getAccessToken } from '../../services/api'
import SolicitudesRRHH from './SolicitudesRRHH'

const TIPOS_DOC: Record<string, { label: string; icon: React.ReactNode; color: string }> = {
  contrato:           { label: 'Contrato',          icon: <FileText size={14}/>,  color: 'text-blue-600 bg-blue-50 border-blue-200' },
  cedula:             { label: 'Cédula de Identidad',icon: <Shield size={14}/>,    color: 'text-purple-600 bg-purple-50 border-purple-200' },
  licencia:           { label: 'Licencia',           icon: <CheckCircle2 size={14}/>, color: 'text-green-600 bg-green-50 border-green-200' },
  certificado_medico: { label: 'Certificado Médico', icon: <AlertCircle size={14}/>, color: 'text-red-600 bg-red-50 border-red-200' },
  finiquito:          { label: 'Finiquito',          icon: <FileText size={14}/>,  color: 'text-amber-600 bg-amber-50 border-amber-200' },
  otro:               { label: 'Otro',               icon: <FileText size={14}/>,  color: 'text-slate-600 bg-slate-50 border-slate-200' },
}

const ROL_LABELS: Record<string, string> = {
  jefe:'Jefe', gerente:'Gerente', coordinador:'Coordinador', vendedor:'Vendedor',
  fabricante:'Fabricante', instalador:'Instalador', bodegas:'Bodegas'
}

interface Empleado {
  user_id: number; nombre: string; rol: string; activo: boolean; total_documentos: number
}
interface Documento {
  id: string; user_id: number; subido_por?: number; tipo: string
  nombre_archivo: string; mime_type: string; tamano_bytes: number
  created_at: string; url?: string
}

export default function RRHH() {
  const [activeTab, setActiveTab] = useState<'documentos' | 'solicitudes'>('documentos')
  const [selectedUser, setSelectedUser] = useState<Empleado | null>(null)
  const [uploading, setUploading] = useState(false)
  const [uploadError, setUploadError] = useState('')
  const [uploadTipo, setUploadTipo] = useState('contrato')
  const [previewDoc, setPreviewDoc] = useState<Documento | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  const { data: empleados = [], loading: loadingEmp, refetch: refetchEmp } = useApi<Empleado[]>(
    () => api.getRrhhEmpleados(), []
  )
  const { data: docs = [], loading: loadingDocs, refetch: refetchDocs } = useApi<Documento[]>(
    () => selectedUser ? api.getRrhhDocumentos(selectedUser.user_id) : Promise.resolve([]),
    [selectedUser?.user_id]
  )

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file || !selectedUser) return
    setUploadError('')

    const allowed = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'application/pdf']
    if (!allowed.includes(file.type)) {
      setUploadError('Solo JPG, PNG, WEBP o PDF'); return
    }
    if (file.size > 15 * 1024 * 1024) {
      setUploadError('Archivo demasiado grande (máx. 15 MB)'); return
    }

    setUploading(true)
    try {
      await api.uploadRrhhDoc(selectedUser.user_id, uploadTipo, file)
      refetchDocs(); refetchEmp()
    } catch (err: any) {
      setUploadError(err.message || 'Error al subir')
    } finally {
      setUploading(false)
      if (fileRef.current) fileRef.current.value = ''
    }
  }

  async function handleDelete(doc: Documento) {
    if (!confirm(`¿Eliminar "${doc.nombre_archivo}"?`)) return
    await api.deleteRrhhDoc(doc.id)
    refetchDocs(); refetchEmp()
  }

  function formatSize(bytes: number) {
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
    return `${(bytes / 1024 / 1024).toFixed(1)} MB`
  }

  const isPDF = (mime: string) => mime === 'application/pdf'
  const isImage = (mime: string) => mime.startsWith('image/')

  return (
    <div className="space-y-5">
      {/* Header + Tabs */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900">RRHH</h1>
        <div className="mt-3 flex gap-1 bg-slate-100 rounded-xl p-1 w-fit">
          <button
            onClick={() => setActiveTab('documentos')}
            className={`px-4 py-1.5 rounded-lg text-sm font-semibold transition ${activeTab === 'documentos' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
          >
            Documentos
          </button>
          <button
            onClick={() => setActiveTab('solicitudes')}
            className={`px-4 py-1.5 rounded-lg text-sm font-semibold transition ${activeTab === 'solicitudes' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
          >
            Solicitudes
          </button>
        </div>
      </div>

      {activeTab === 'solicitudes' && <SolicitudesRRHH />}

      {activeTab === 'documentos' && <div className="flex gap-4">
        {/* Lista de empleados */}
        <div className="w-64 flex-shrink-0 bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
          <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between">
            <p className="text-sm font-semibold text-slate-700">Empleados</p>
            <button onClick={refetchEmp} className="text-slate-400 hover:text-slate-600"><RefreshCw size={14}/></button>
          </div>
          {loadingEmp ? (
            <div className="flex items-center justify-center h-32 text-slate-400 text-sm">
              <RefreshCw size={16} className="animate-spin mr-2"/> Cargando...
            </div>
          ) : (
            <div className="divide-y divide-slate-50">
              {empleados.map(emp => (
                <button key={emp.user_id} onClick={() => setSelectedUser(emp)}
                  className={`w-full flex items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-slate-50 ${selectedUser?.user_id === emp.user_id ? 'bg-[--brand-primary]/5 border-r-2 border-[--brand-primary]' : ''}`}>
                  <div className="w-8 h-8 rounded-full bg-slate-200 flex items-center justify-center text-xs font-bold text-slate-600 flex-shrink-0">
                    {emp.nombre.slice(0,2).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-slate-800 truncate">{emp.nombre}</p>
                    <p className="text-xs text-slate-400">{ROL_LABELS[emp.rol] || emp.rol}</p>
                  </div>
                  {emp.total_documentos > 0 && (
                    <span className="flex-shrink-0 w-5 h-5 rounded-full bg-[--brand-primary] text-white text-[10px] font-bold flex items-center justify-center">
                      {emp.total_documentos}
                    </span>
                  )}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Panel de documentos */}
        <div className="flex-1">
          {!selectedUser ? (
            <div className="bg-white rounded-2xl border border-dashed border-slate-200 h-64 flex flex-col items-center justify-center text-slate-400 shadow-sm">
              <User2 size={40} className="mb-3 opacity-30"/>
              <p className="font-medium">Selecciona un empleado</p>
              <p className="text-sm">para ver y gestionar sus documentos</p>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Encabezado empleado */}
              <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4 flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-slate-400 to-slate-600 flex items-center justify-center text-sm font-bold text-white">
                  {selectedUser.nombre.slice(0,2).toUpperCase()}
                </div>
                <div className="flex-1">
                  <h3 className="font-bold text-slate-900">{selectedUser.nombre}</h3>
                  <p className="text-sm text-slate-500">{ROL_LABELS[selectedUser.rol] || selectedUser.rol}</p>
                </div>
                <div className="text-right">
                  <p className="text-2xl font-bold text-slate-900">{docs.length}</p>
                  <p className="text-xs text-slate-500">documentos</p>
                </div>
              </div>

              {/* Upload */}
              <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4">
                <p className="text-sm font-semibold text-slate-700 mb-3">Subir Documento</p>
                <div className="flex gap-2 flex-wrap items-start">
                  <div className="flex-1 min-w-[200px]">
                    <label className="block text-xs text-slate-500 mb-1.5">Tipo de documento</label>
                    <select value={uploadTipo} onChange={e => setUploadTipo(e.target.value)}
                      className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-1 focus:ring-[--brand-primary]">
                      {Object.entries(TIPOS_DOC).map(([k, v]) => (
                        <option key={k} value={k}>{v.label}</option>
                      ))}
                    </select>
                  </div>
                  <div className="flex-1 min-w-[200px]">
                    <label className="block text-xs text-slate-500 mb-1.5">Archivo (JPG, PNG, PDF — máx. 15MB)</label>
                    <label className={`flex items-center gap-2 px-4 py-2 rounded-xl border-2 border-dashed cursor-pointer transition-all text-sm font-medium ${uploading ? 'opacity-60 cursor-not-allowed border-slate-200 text-slate-400' : 'border-[--brand-primary]/40 text-[--brand-primary] hover:bg-[--brand-primary]/5 hover:border-[--brand-primary]/60'}`}>
                      {uploading ? <RefreshCw size={16} className="animate-spin"/> : <Upload size={16}/>}
                      {uploading ? 'Subiendo...' : 'Seleccionar archivo'}
                      <input ref={fileRef} type="file" accept=".jpg,.jpeg,.png,.webp,.pdf" onChange={handleUpload} disabled={uploading} className="hidden"/>
                    </label>
                  </div>
                </div>
                {uploadError && (
                  <p className="mt-2 text-sm text-red-600 flex items-center gap-1"><AlertCircle size={14}/> {uploadError}</p>
                )}
              </div>

              {/* Lista de documentos */}
              <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
                <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between">
                  <p className="text-sm font-semibold text-slate-700">Documentos</p>
                  <button onClick={refetchDocs} className="text-slate-400 hover:text-slate-600"><RefreshCw size={14}/></button>
                </div>

                {loadingDocs ? (
                  <div className="flex items-center justify-center h-24 text-slate-400 text-sm">
                    <RefreshCw size={16} className="animate-spin mr-2"/> Cargando...
                  </div>
                ) : docs.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-24 text-slate-400">
                    <FileText size={28} className="mb-1 opacity-30"/>
                    <p className="text-sm">Sin documentos cargados</p>
                  </div>
                ) : (
                  <div className="divide-y divide-slate-50">
                    {docs.map(doc => (
                      <div key={doc.id} className="flex items-center gap-3 px-4 py-3 hover:bg-slate-50 transition-colors">
                        <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 border ${TIPOS_DOC[doc.tipo]?.color || TIPOS_DOC.otro.color}`}>
                          {isPDF(doc.mime_type) ? <FileText size={16}/> : <Image size={16}/>}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-slate-800 truncate">{doc.nombre_archivo}</p>
                          <div className="flex items-center gap-2 mt-0.5">
                            <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] font-medium border ${TIPOS_DOC[doc.tipo]?.color || TIPOS_DOC.otro.color}`}>
                              {TIPOS_DOC[doc.tipo]?.label}
                            </span>
                            <span className="text-[11px] text-slate-400">{formatSize(doc.tamano_bytes)}</span>
                            <span className="text-[11px] text-slate-400">
                              {new Date(doc.created_at).toLocaleDateString('es-CL')}
                            </span>
                          </div>
                        </div>
                        <div className="flex items-center gap-1">
                          {doc.url && (
                            <a href={doc.url} target="_blank" rel="noopener noreferrer"
                              onClick={() => isImage(doc.mime_type) && (e => { e.preventDefault(); setPreviewDoc(doc) })(new Event('click'))}
                              className="p-1.5 rounded-lg text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition-colors" title="Ver">
                              <Eye size={14}/>
                            </a>
                          )}
                          {doc.url && (
                            <a href={doc.url} download={doc.nombre_archivo}
                              className="p-1.5 rounded-lg text-slate-400 hover:text-green-600 hover:bg-green-50 transition-colors" title="Descargar">
                              <Download size={14}/>
                            </a>
                          )}
                          <button onClick={() => handleDelete(doc)}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50 transition-colors" title="Eliminar">
                            <Trash2 size={14}/>
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>}

      {/* Preview modal */}
      {previewDoc && previewDoc.url && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm"
          onClick={() => setPreviewDoc(null)}>
          <div className="relative max-w-2xl max-h-[80vh] overflow-auto" onClick={e => e.stopPropagation()}>
            <button onClick={() => setPreviewDoc(null)}
              className="absolute top-2 right-2 z-10 p-1.5 bg-white/90 rounded-full text-slate-700 hover:text-slate-900 shadow">
              <X size={16}/>
            </button>
            <img src={previewDoc.url} alt={previewDoc.nombre_archivo}
              className="max-w-full max-h-[80vh] rounded-xl shadow-2xl object-contain"/>
          </div>
        </div>
      )}
    </div>
  )
}
