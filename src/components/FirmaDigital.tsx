import { useRef, useState, useEffect } from 'react';
import { PenLine, Trash2, Check, X } from 'lucide-react';

interface FirmaDigitalProps {
  onFirmar: (firmaBase64: string, firmante: { nombre: string; rut?: string; email?: string }) => void;
  onCancelar?: () => void;
  loading?: boolean;
}

export default function FirmaDigital({ onFirmar, onCancelar, loading }: FirmaDigitalProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [dibujando, setDibujando] = useState(false);
  const [firmaTrazada, setFirmaTrazada] = useState(false);
  const [nombre, setNombre] = useState('');
  const [rut, setRut] = useState('');
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');

  // Inicializar canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.fillStyle = '#f8fafc';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.strokeStyle = '#1e293b';
    ctx.lineWidth = 2.5;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
  }, []);

  function getPos(e: React.MouseEvent | React.TouchEvent, canvas: HTMLCanvasElement) {
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    if ('touches' in e) {
      const touch = e.touches[0];
      return {
        x: (touch.clientX - rect.left) * scaleX,
        y: (touch.clientY - rect.top) * scaleY,
      };
    }
    return {
      x: (e.clientX - rect.left) * scaleX,
      y: (e.clientY - rect.top) * scaleY,
    };
  }

  function iniciar(e: React.MouseEvent | React.TouchEvent) {
    e.preventDefault();
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const pos = getPos(e, canvas);
    ctx.beginPath();
    ctx.moveTo(pos.x, pos.y);
    setDibujando(true);
    setFirmaTrazada(true);
  }

  function dibujar(e: React.MouseEvent | React.TouchEvent) {
    e.preventDefault();
    if (!dibujando) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const pos = getPos(e, canvas);
    ctx.lineTo(pos.x, pos.y);
    ctx.stroke();
  }

  function terminar(e: React.MouseEvent | React.TouchEvent) {
    e.preventDefault();
    setDibujando(false);
  }

  function limpiar() {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.fillStyle = '#f8fafc';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    setFirmaTrazada(false);
  }

  function confirmar() {
    setError('');
    if (!nombre.trim()) {
      setError('El nombre del firmante es obligatorio');
      return;
    }
    if (!firmaTrazada) {
      setError('Dibuja tu firma en el recuadro');
      return;
    }
    const canvas = canvasRef.current;
    if (!canvas) return;
    const firmaBase64 = canvas.toDataURL('image/png');
    onFirmar(firmaBase64, {
      nombre: nombre.trim(),
      rut: rut.trim() || undefined,
      email: email.trim() || undefined,
    });
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <PenLine size={17} className="text-violet-600" />
        <h3 className="text-base font-semibold text-slate-900">Firma de Conformidad</h3>
      </div>

      {/* Datos del firmante */}
      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <label className="mb-1 block text-xs font-semibold text-slate-600">
            Nombre completo <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            value={nombre}
            onChange={e => setNombre(e.target.value)}
            placeholder="Nombre del cliente"
            className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 placeholder:text-slate-400 focus:border-violet-400 focus:outline-none focus:ring-2 focus:ring-violet-100"
          />
        </div>
        <div>
          <label className="mb-1 block text-xs font-semibold text-slate-600">RUT (opcional)</label>
          <input
            type="text"
            value={rut}
            onChange={e => setRut(e.target.value)}
            placeholder="12.345.678-9"
            className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 placeholder:text-slate-400 focus:border-violet-400 focus:outline-none focus:ring-2 focus:ring-violet-100"
          />
        </div>
        <div className="sm:col-span-2">
          <label className="mb-1 block text-xs font-semibold text-slate-600">Email (opcional)</label>
          <input
            type="email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            placeholder="cliente@email.com"
            className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 placeholder:text-slate-400 focus:border-violet-400 focus:outline-none focus:ring-2 focus:ring-violet-100"
          />
        </div>
      </div>

      {/* Canvas de firma */}
      <div>
        <div className="mb-1.5 flex items-center justify-between">
          <label className="text-xs font-semibold text-slate-600">
            Firma digital <span className="text-red-500">*</span>
          </label>
          {firmaTrazada && (
            <button
              type="button"
              onClick={limpiar}
              className="flex items-center gap-1 text-xs font-medium text-slate-500 hover:text-red-600"
            >
              <Trash2 size={12} /> Limpiar
            </button>
          )}
        </div>
        <div className="rounded-xl border-2 border-dashed border-slate-300 bg-slate-50 overflow-hidden touch-none">
          <canvas
            ref={canvasRef}
            width={600}
            height={200}
            className="w-full cursor-crosshair"
            style={{ touchAction: 'none' }}
            onMouseDown={iniciar}
            onMouseMove={dibujar}
            onMouseUp={terminar}
            onMouseLeave={terminar}
            onTouchStart={iniciar}
            onTouchMove={dibujar}
            onTouchEnd={terminar}
          />
        </div>
        {!firmaTrazada && (
          <p className="mt-1 text-center text-xs text-slate-400">Firma aquí con el dedo o mouse</p>
        )}
      </div>

      {error && (
        <p className="rounded-lg bg-red-50 px-3 py-2 text-sm font-medium text-red-700">{error}</p>
      )}

      {/* Botones */}
      <div className="flex gap-3">
        {onCancelar && (
          <button
            type="button"
            onClick={onCancelar}
            disabled={loading}
            className="flex flex-1 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:opacity-60"
          >
            <X size={16} /> Cancelar
          </button>
        )}
        <button
          type="button"
          onClick={confirmar}
          disabled={loading}
          className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-emerald-500 px-4 py-3 text-sm font-semibold text-white transition hover:bg-emerald-600 disabled:opacity-60"
        >
          <Check size={16} />
          {loading ? 'Guardando...' : 'Confirmar Firma'}
        </button>
      </div>
    </div>
  );
}
