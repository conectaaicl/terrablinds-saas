import { useMemo, useState } from 'react';
import { Store } from '../../data/store';
import { useAuth } from '../../context/AuthContext';
import type { ChatMessage, Usuario } from '../../types';

export default function Chat() {
  const { user, tenant } = useAuth();
  const [v, setV] = useState(0);
  const [text, setText] = useState('');

  const mensajes = useMemo<ChatMessage[]>(() => {
    void v;
    const raw = localStorage.getItem('wl_chat');
    if (!raw) return [];
    try {
      const all: ChatMessage[] = JSON.parse(raw);
      return all.filter(m => m.tenantId === (user?.tenantId || ''));
    } catch {
      return [];
    }
  }, [v, user?.tenantId]);

  const usuarios = useMemo<Usuario[]>(() => {
    if (!user) return [];
    return Store.getUsuariosByTenant(user.tenantId).filter(u => u.activo);
  }, [tenant, user]);

  const send = (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !text.trim()) return;
    const raw = localStorage.getItem('wl_chat');
    let all: ChatMessage[] = [];
    try {
      all = raw ? JSON.parse(raw) : [];
    } catch {
      all = [];
    }
    const msg: ChatMessage = {
      id: Store.uid(),
      tenantId: user.tenantId,
      fromUserId: user.id,
      channel: 'global',
      text: text.trim(),
      createdAt: new Date().toISOString(),
    };
    all.push(msg);
    localStorage.setItem('wl_chat', JSON.stringify(all));
    setText('');
    setV(x => x + 1);
  };

  if (!user || !tenant) return null;

  // const me = usuarios.find(u => u.id === user.id);

  return (
    <div className="flex h-full flex-col gap-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Chat del Taller</h1>
          <p className="text-xs text-slate-500">Todos los usuarios activos del taller pueden ver y escribir aquí.</p>
        </div>
      </div>
      <div className="flex flex-1 flex-col gap-3 overflow-hidden rounded-2xl border border-slate-200 bg-white">
        <div className="flex-1 space-y-2 overflow-y-auto p-3 text-sm">
          {mensajes.length === 0 && (
            <p className="text-center text-xs text-slate-400">Aún no hay mensajes. Escribe el primero 👋</p>
          )}
          {mensajes.map(m => {
            const u = usuarios.find(x => x.id === m.fromUserId);
            const isMe = m.fromUserId === user.id;
            return (
              <div key={m.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[75%] rounded-2xl px-3 py-2 text-xs shadow-sm ${isMe ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-800'}`}>
                  <div className="mb-0.5 flex items-center gap-2">
                    <span className="text-[10px] font-semibold opacity-80">{u?.nombre || 'Usuario'}</span>
                    <span className="text-[9px] opacity-60">{new Date(m.createdAt).toLocaleTimeString()}</span>
                  </div>
                  <p className="whitespace-pre-wrap break-words">{m.text}</p>
                </div>
              </div>
            );
          })}
        </div>
        <form onSubmit={send} className="flex items-center gap-2 border-t border-slate-200 bg-slate-50 p-2">
          <input
            value={text}
            onChange={e => setText(e.target.value)}
            placeholder="Escribe un mensaje para tu equipo..."
            className="flex-1 rounded-full border border-slate-300 bg-white px-3 py-2 text-xs outline-none focus:border-slate-500"
          />
          <button
            type="submit"
            className="rounded-full bg-blue-600 px-4 py-2 text-xs font-semibold text-white shadow-sm hover:bg-blue-700 disabled:opacity-50"
            disabled={!text.trim()}
          >
            Enviar
          </button>
        </form>
      </div>
    </div>
  );
}
