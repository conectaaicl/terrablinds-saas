import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';
import { KeyRound, Eye, EyeOff, CheckCircle2, ArrowLeft, Loader2 } from 'lucide-react';

export default function ChangePassword() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [confirm, setConfirm] = useState('');
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNext, setShowNext] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const home = user
    ? `/${user.rol === 'superadmin' ? 'admin' : user.rol === 'jefe' ? 'jefe' : user.rol}`
    : '/login';

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (next !== confirm) {
      setError('Las contraseñas nuevas no coinciden.');
      return;
    }
    if (next.length < 6) {
      setError('La nueva contraseña debe tener al menos 6 caracteres.');
      return;
    }

    setLoading(true);
    try {
      await api.changePassword(current, next);
      setSuccess(true);
      setTimeout(() => navigate(home), 3000);
    } catch (err: any) {
      setError(err.message || 'Error al cambiar la contraseña.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 p-4">
      <div className="w-full max-w-md">
        <button
          onClick={() => navigate(home)}
          className="mb-6 flex items-center gap-1.5 text-sm font-medium text-slate-500 hover:text-slate-800 transition-colors"
        >
          <ArrowLeft size={15} /> Volver al panel
        </button>

        <div className="rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
          <div className="mb-6 flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-rose-50 text-rose-500">
              <KeyRound size={22} />
            </div>
            <div>
              <h1 className="text-xl font-bold text-slate-900">Cambiar Contraseña</h1>
              <p className="text-sm text-slate-500">{user?.email}</p>
            </div>
          </div>

          {success ? (
            <div className="rounded-xl bg-emerald-50 border border-emerald-200 p-6 text-center">
              <CheckCircle2 size={40} className="mx-auto text-emerald-500 mb-3" />
              <p className="font-bold text-emerald-800 mb-1">¡Contraseña cambiada!</p>
              <p className="text-sm text-emerald-600">Redirigiendo al panel...</p>
            </div>
          ) : (
            <form onSubmit={submit} className="space-y-4">
              {error && (
                <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
                  {error}
                </div>
              )}

              {/* Contraseña actual */}
              <div>
                <label className="mb-1.5 block text-sm font-medium text-slate-700">
                  Contraseña actual
                </label>
                <div className="relative">
                  <input
                    type={showCurrent ? 'text' : 'password'}
                    value={current}
                    onChange={e => setCurrent(e.target.value)}
                    required
                    placeholder="••••••••"
                    className="w-full rounded-lg border border-slate-300 px-3.5 py-2.5 pr-10 text-sm outline-none focus:border-rose-400 focus:ring-2 focus:ring-rose-100"
                  />
                  <button type="button" onClick={() => setShowCurrent(v => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                    {showCurrent ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              {/* Nueva contraseña */}
              <div>
                <label className="mb-1.5 block text-sm font-medium text-slate-700">
                  Nueva contraseña
                </label>
                <div className="relative">
                  <input
                    type={showNext ? 'text' : 'password'}
                    value={next}
                    onChange={e => setNext(e.target.value)}
                    required
                    placeholder="Mínimo 6 caracteres"
                    className="w-full rounded-lg border border-slate-300 px-3.5 py-2.5 pr-10 text-sm outline-none focus:border-rose-400 focus:ring-2 focus:ring-rose-100"
                  />
                  <button type="button" onClick={() => setShowNext(v => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                    {showNext ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
                {next.length > 0 && next.length < 6 && (
                  <p className="mt-1 text-xs text-red-500">Muy corta — mínimo 6 caracteres</p>
                )}
              </div>

              {/* Confirmar */}
              <div>
                <label className="mb-1.5 block text-sm font-medium text-slate-700">
                  Confirmar nueva contraseña
                </label>
                <input
                  type="password"
                  value={confirm}
                  onChange={e => setConfirm(e.target.value)}
                  required
                  placeholder="••••••••"
                  className={`w-full rounded-lg border px-3.5 py-2.5 text-sm outline-none focus:ring-2 focus:ring-rose-100 ${
                    confirm && confirm !== next
                      ? 'border-red-400 focus:border-red-400'
                      : 'border-slate-300 focus:border-rose-400'
                  }`}
                />
                {confirm && confirm !== next && (
                  <p className="mt-1 text-xs text-red-500">Las contraseñas no coinciden</p>
                )}
              </div>

              <button
                type="submit"
                disabled={loading || !current || !next || next !== confirm}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-rose-500 py-3 text-sm font-bold text-white shadow-sm transition hover:bg-rose-600 disabled:opacity-50"
              >
                {loading ? <Loader2 size={16} className="animate-spin" /> : <KeyRound size={16} />}
                {loading ? 'Cambiando...' : 'Cambiar Contraseña'}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
