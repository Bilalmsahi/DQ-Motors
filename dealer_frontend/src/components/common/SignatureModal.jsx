import { useState, useEffect, useRef } from 'react';
import { PenTool, X, Check, Loader2, Eraser } from 'lucide-react';

/**
 * SignatureModal
 * ─────────────
 * Reusable digital-signature capture modal.
 *
 * Props
 * ─────
 *  onClose    – called when the user cancels / clicks X
 *  onSave     – called with the signature Data URL (base64 PNG string)
 *  saving     – boolean – disables buttons while parent is uploading
 *  title      – optional modal title  (default: "Customer Signature")
 *  subtitle   – optional helper text above the canvas
 *
 * Internals
 * ─────────
 *  • Dynamically imports `react-signature-canvas`.
 *  • Falls back to a plain <canvas> with manual mouse/touch drawing
 *    if the package is missing so the app never hard-crashes.
 *  • "Clear" wipes the pad; "Save Signature" fires onSave(dataURL).
 */
export default function SignatureModal({
  onClose,
  onSave,
  saving = false,
  title = 'Customer Signature',
  subtitle,
}) {
  const canvasRef = useRef(null);
  const [SignatureCanvas, setSignatureCanvas] = useState(null);
  const [loadError, setLoadError] = useState(false);

  // ── Dynamically load react-signature-canvas ──────────────────────────
  useEffect(() => {
    import('react-signature-canvas')
      .then((mod) => setSignatureCanvas(() => mod.default))
      .catch(() => setLoadError(true));
  }, []);

  // ── Clear handler ────────────────────────────────────────────────────
  const handleClear = () => {
    if (!canvasRef.current) return;
    // react-signature-canvas exposes .clear()
    if (typeof canvasRef.current.clear === 'function') {
      canvasRef.current.clear();
    } else {
      // plain <canvas> fallback
      const ctx = canvasRef.current.getContext?.('2d');
      if (ctx) {
        ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
      }
    }
  };

  // ── Save handler ─────────────────────────────────────────────────────
  const handleSave = () => {
    if (!canvasRef.current) return;

    // react-signature-canvas path
    if (typeof canvasRef.current.isEmpty === 'function') {
      if (canvasRef.current.isEmpty()) return; // nothing drawn – ignore
      const dataUrl = canvasRef.current.toDataURL('image/png');
      onSave(dataUrl);
      return;
    }

    // plain canvas path
    if (typeof canvasRef.current.toDataURL === 'function') {
      const dataUrl = canvasRef.current.toDataURL('image/png');
      onSave(dataUrl);
    }
  };

  // ── Plain-canvas mouse/touch drawing helpers ─────────────────────────
  const startDrawing = (clientX, clientY) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    ctx.lineWidth = 2;
    ctx.lineCap = 'round';
    ctx.strokeStyle = '#1e293b';
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    const x = (clientX - rect.left) * scaleX;
    const y = (clientY - rect.top) * scaleY;
    ctx.beginPath();
    ctx.moveTo(x, y);

    const draw = (cx, cy) => {
      const dx = (cx - rect.left) * scaleX;
      const dy = (cy - rect.top) * scaleY;
      ctx.lineTo(dx, dy);
      ctx.stroke();
    };

    const onMouseMove = (ev) => draw(ev.clientX, ev.clientY);
    const onTouchMove = (ev) => {
      ev.preventDefault();
      const t = ev.touches[0];
      draw(t.clientX, t.clientY);
    };
    const stop = () => {
      canvas.removeEventListener('mousemove', onMouseMove);
      canvas.removeEventListener('mouseup', stop);
      canvas.removeEventListener('mouseleave', stop);
      canvas.removeEventListener('touchmove', onTouchMove);
      canvas.removeEventListener('touchend', stop);
    };

    canvas.addEventListener('mousemove', onMouseMove);
    canvas.addEventListener('mouseup', stop);
    canvas.addEventListener('mouseleave', stop);
    canvas.addEventListener('touchmove', onTouchMove, { passive: false });
    canvas.addEventListener('touchend', stop);
  };

  const onCanvasMouseDown = (e) => startDrawing(e.clientX, e.clientY);
  const onCanvasTouchStart = (e) => {
    e.preventDefault();
    const t = e.touches[0];
    startDrawing(t.clientX, t.clientY);
  };

  // ── Render ───────────────────────────────────────────────────────────
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg mx-4 overflow-hidden">
        {/* ── Header ─────────────────────────────────────────────────── */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
            <PenTool className="w-5 h-5 text-brand-600" /> {title}
          </h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* ── Canvas area ────────────────────────────────────────────── */}
        <div className="px-6 py-4">
          <p className="text-sm text-gray-500 mb-3">
            {subtitle || (
              <>
                Sign below to accept the deal. This will mark the deal as{' '}
                <span className="font-semibold text-green-600">Accepted</span>.
              </>
            )}
          </p>

          <div className="border-2 border-dashed border-gray-200 rounded-xl overflow-hidden bg-gray-50">
            {!loadError && SignatureCanvas ? (
              /* ── react-signature-canvas ──────────────────────────── */
              <SignatureCanvas
                ref={canvasRef}
                penColor="#1e293b"
                canvasProps={{
                  width: 460,
                  height: 200,
                  className: 'w-full cursor-crosshair',
                }}
              />
            ) : (
              /* ── Plain canvas fallback (mouse + touch) ───────────── */
              <canvas
                ref={canvasRef}
                width={460}
                height={200}
                className="w-full cursor-crosshair"
                onMouseDown={onCanvasMouseDown}
                onTouchStart={onCanvasTouchStart}
              />
            )}
          </div>
        </div>

        {/* ── Footer ─────────────────────────────────────────────────── */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-gray-100 bg-gray-50">
          <button
            onClick={handleClear}
            className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 transition"
          >
            <Eraser className="w-4 h-4" /> Clear
          </button>

          <div className="flex gap-2">
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-sm font-medium text-gray-600 hover:bg-gray-100 transition"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={saving}
              className="flex items-center gap-2 bg-brand-600 hover:bg-[#e65100] text-white px-5 py-2 rounded-xl text-sm font-medium transition disabled:opacity-50"
            >
              {saving ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Check className="w-4 h-4" />
              )}
              Save Signature
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
