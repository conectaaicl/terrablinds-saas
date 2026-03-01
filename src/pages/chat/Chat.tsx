import { useEffect, useRef, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useApi } from '../../hooks/useApi';
import { useWebSocket, type WsMessage } from '../../hooks/useWebSocket';
import { api } from '../../services/api';
import { Hash, MessageCircle, Send, Wifi, WifiOff } from 'lucide-react';

type Canal = {
  id: string;
  type: string;
  name: string;
};

// Icono y color según tipo de canal
function CanalIcon({ type }: { type: string }) {
  if (type === 'ventas') return <Hash size={14} className="text-blue-400" />;
  if (type === 'operaciones') return <Hash size={14} className="text-orange-400" />;
  return <Hash size={14} className="text-emerald-400" />;
}

function rolColor(rol: string): string {
  const map: Record<string, string> = {
    jefe: 'bg-purple-500',
    gerente: 'bg-indigo-500',
    coordinador: 'bg-blue-500',
    vendedor: 'bg-emerald-500',
    fabricante: 'bg-amber-500',
    instalador: 'bg-violet-500',
    superadmin: 'bg-red-500',
  };
  return map[rol] || 'bg-slate-500';
}

function Initials({ nombre, rol }: { nombre: string; rol: string }) {
  const init = nombre.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();
  return (
    <div className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[10px] font-bold text-white ${rolColor(rol)}`}>
      {init}
    </div>
  );
}

function fmtTime(iso: string) {
  return new Date(iso).toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' });
}

export default function Chat() {
  const { user } = useAuth();
  const [canalActivo, setCanalActivo] = useState<Canal | null>(null);
  const [texto, setTexto] = useState('');
  const [historial, setHistorial] = useState<WsMessage[]>([]);
  const bottomRef = useRef<HTMLDivElement>(null);

  const { data: canales, loading: loadingCanales } = useApi(() => api.getChannels());
  const canalList: Canal[] = canales || [];

  // Cargar historial REST cuando cambia el canal
  useEffect(() => {
    if (!canalActivo) return;
    setHistorial([]);
    api.getMessages(canalActivo.id).then((msgs: WsMessage[]) => {
      setHistorial(msgs || []);
    }).catch(() => {});
  }, [canalActivo]);

  // Seleccionar el primer canal disponible
  useEffect(() => {
    if (canalList.length > 0 && !canalActivo) {
      setCanalActivo(canalList[0]);
    }
  }, [canalList, canalActivo]);

  const { status, messages: wsMessages, sendMessage } = useWebSocket(canalActivo?.id ?? null);

  // Combinar historial REST + mensajes WS nuevos (evitar duplicados por id)
  const idsHistorial = new Set(historial.map(m => m.id));
  const mensajesNuevos = wsMessages.filter(m => !idsHistorial.has(m.id));
  const todos = [...historial, ...mensajesNuevos];

  // Scroll al fondo cuando llegan mensajes
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [todos.length]);

  const enviar = (e: React.FormEvent) => {
    e.preventDefault();
    if (!texto.trim() || status !== 'connected') return;
    sendMessage(texto.trim());
    setTexto('');
  };

  if (!user) return null;

  return (
    <div className="flex h-[calc(100vh-8rem)] overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      {/* Sidebar de canales */}
      <aside className="flex w-[200px] shrink-0 flex-col border-r border-slate-200 bg-slate-50">
        <div className="px-3 py-3">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">Canales</p>
        </div>
        <nav className="flex-1 space-y-0.5 px-2">
          {loadingCanales && (
            <p className="px-2 text-xs text-slate-400">Cargando...</p>
          )}
          {canalList.map(c => (
            <button
              key={c.id}
              onClick={() => setCanalActivo(c)}
              className={`flex w-full items-center gap-2 rounded-lg px-2 py-2 text-left text-sm transition ${
                canalActivo?.id === c.id
                  ? 'bg-slate-200 font-semibold text-slate-900'
                  : 'text-slate-600 hover:bg-slate-100 hover:text-slate-800'
              }`}
            >
              <CanalIcon type={c.type} />
              {c.name}
            </button>
          ))}
        </nav>

        {/* Estado WS */}
        <div className="border-t border-slate-200 px-3 py-2">
          <div className="flex items-center gap-1.5 text-[11px]">
            {status === 'connected' ? (
              <><Wifi size={12} className="text-emerald-500" /><span className="text-emerald-600">Conectado</span></>
            ) : status === 'connecting' ? (
              <><Wifi size={12} className="text-amber-500 animate-pulse" /><span className="text-amber-600">Conectando...</span></>
            ) : (
              <><WifiOff size={12} className="text-slate-400" /><span className="text-slate-400">Desconectado</span></>
            )}
          </div>
        </div>
      </aside>

      {/* Área de mensajes */}
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Header del canal */}
        {canalActivo && (
          <div className="flex items-center gap-2 border-b border-slate-200 bg-white px-4 py-3">
            <CanalIcon type={canalActivo.type} />
            <span className="text-sm font-semibold text-slate-800">{canalActivo.name}</span>
          </div>
        )}

        {/* Mensajes */}
        <div className="flex-1 space-y-3 overflow-y-auto px-4 py-4 text-sm">
          {todos.length === 0 && (
            <div className="flex flex-col items-center justify-center pt-16 text-slate-400">
              <MessageCircle size={36} className="mb-2 opacity-30" />
              <p className="text-sm">No hay mensajes aún. Escribe el primero.</p>
            </div>
          )}

          {todos.map((m) => {
            const isMe = m.user_id === user.id;
            return (
              <div key={m.id} className={`flex gap-2 ${isMe ? 'justify-end' : 'justify-start'}`}>
                {!isMe && <Initials nombre={m.user_nombre} rol={m.user_rol} />}
                <div className={`max-w-[75%] ${isMe ? 'items-end' : 'items-start'} flex flex-col`}>
                  {!isMe && (
                    <p className="mb-0.5 flex items-baseline gap-1.5 text-[11px]">
                      <span className="font-semibold text-slate-700">{m.user_nombre}</span>
                      <span className="text-slate-400">{m.user_rol}</span>
                    </p>
                  )}
                  <div
                    className={`rounded-2xl px-3.5 py-2 text-[13px] shadow-sm ${
                      isMe
                        ? 'rounded-tr-sm bg-blue-600 text-white'
                        : 'rounded-tl-sm bg-slate-100 text-slate-800'
                    }`}
                  >
                    <p className="whitespace-pre-wrap break-words">{m.content}</p>
                  </div>
                  <p className={`mt-0.5 text-[10px] text-slate-400 ${isMe ? 'text-right' : ''}`}>
                    {fmtTime(m.created_at)}
                  </p>
                </div>
                {isMe && <Initials nombre={m.user_nombre} rol={m.user_rol} />}
              </div>
            );
          })}
          <div ref={bottomRef} />
        </div>

        {/* Input */}
        <form onSubmit={enviar} className="flex items-center gap-2 border-t border-slate-200 bg-slate-50 p-3">
          <input
            value={texto}
            onChange={e => setTexto(e.target.value)}
            placeholder={status === 'connected' ? 'Escribe un mensaje...' : 'Conectando...'}
            disabled={status !== 'connected'}
            className="flex-1 rounded-full border border-slate-300 bg-white px-4 py-2 text-sm outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100 disabled:opacity-50"
          />
          <button
            type="submit"
            disabled={!texto.trim() || status !== 'connected'}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-blue-600 text-white shadow-sm transition hover:bg-blue-700 disabled:opacity-40"
          >
            <Send size={15} />
          </button>
        </form>
      </div>
    </div>
  );
}
