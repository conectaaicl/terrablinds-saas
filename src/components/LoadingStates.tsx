import { AlertCircle, Loader2 } from 'lucide-react';

export function Spinner({ className = '' }: { className?: string }) {
  return (
    <div className={`flex items-center justify-center py-20 ${className}`}>
      <Loader2 size={28} className="animate-spin text-slate-400" />
    </div>
  );
}

export function ErrorMessage({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center py-20">
      <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-red-100">
        <AlertCircle size={24} className="text-red-500" />
      </div>
      <p className="mt-3 text-sm font-medium text-slate-700">{message}</p>
      {onRetry && (
        <button
          onClick={onRetry}
          className="mt-3 rounded-lg bg-slate-100 px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-200"
        >
          Reintentar
        </button>
      )}
    </div>
  );
}

export function EmptyState({ message, icon }: { message: string; icon?: React.ReactNode }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-xl border border-slate-200 bg-white py-14">
      {icon && <div className="text-slate-300">{icon}</div>}
      <p className="mt-3 text-sm text-slate-500">{message}</p>
    </div>
  );
}
