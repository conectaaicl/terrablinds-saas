import { Link } from 'react-router-dom';

export function QuotationActions({ emailApiLabel }: { emailApiLabel?: string }) {
  return (
    <div className="mt-4 grid gap-2 sm:grid-cols-2">
      <button
        type="button"
        className="inline-flex items-center justify-center gap-2 rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50"
      >
        <span>Descargar PDF</span>
        <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] text-slate-500">
          Conecta tu API de PDF
        </span>
      </button>
      <button
        type="button"
        className="inline-flex items-center justify-center gap-2 rounded-lg border border-blue-300 bg-blue-50 px-3 py-2 text-xs font-medium text-blue-800 hover:bg-blue-100"
      >
        <span>Enviar por Email</span>
        <span className="rounded-full bg-white/80 px-2 py-0.5 text-[10px] text-blue-500">
          {emailApiLabel || 'Conecta Resend / SMTP'}
        </span>
      </button>
    </div>
  );
}

export function ChatIntegrationHint() {
  return (
    <div className="mt-4 rounded-lg border border-slate-200 bg-slate-50 p-3 text-[11px] text-slate-600">
      <p className="font-semibold text-slate-700">Chat interno / WhatsApp</p>
      <p className="mt-1">
        Aqu	 se integrar	 un chat en tiempo real entre roles (Jefe, Coordinador, Vendedor, F	brica, Instalaci	) o enlaces directos a WhatsApp.
        Puedes conectar tu propia API (WebSocket, Firebase RTDB, Supabase, etc.) manteniendo el mismo dise	o.
      </p>
      <p className="mt-1 text-[10px] text-slate-500">
        Sugerencia: expone un endpoint REST `/messages` y/o un canal WebSocket `/ws/chat` por tenant; este frontend est	 listo para consumirlo.
      </p>
    </div>
  );
}

export function WhatsAppLinkPlaceholder({ phone }: { phone?: string }) {
  const url = phone ? `https://wa.me/${phone.replace(/[^0-9]/g, '')}` : '#';
  return (
    <Link
      to={url}
      target="_blank"
      className="inline-flex items-center gap-1 rounded-full border border-emerald-500 bg-emerald-50 px-3 py-1 text-[11px] font-semibold text-emerald-700 hover:bg-emerald-100"
    >
      Abrir WhatsApp
      <span className="rounded-full bg-emerald-600 px-1.5 py-0.5 text-[9px] font-bold text-white">API</span>
    </Link>
  );
}
