import { useState, useCallback } from 'react';
import DocViewer, { DocViewerRenderers } from '@cyntler/react-doc-viewer';
import {
  X, Download, Link2, Loader2, CheckCircle, AlertCircle,
} from 'lucide-react';
import api from '../../services/api';

/* ─── Helpers ──────────────────────────────────────────────── */

const IMAGE_EXTS = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'bmp', 'svg'];
const PDF_EXT = 'pdf';

/**
 * Determine the render strategy from the file name / mimeType.
 * Returns: 'image' | 'pdf' | 'office' | 'unknown'
 */
function resolveType(fileName, mimeType) {
  const ext = (fileName || '').split('.').pop().toLowerCase();

  if (IMAGE_EXTS.includes(ext) || mimeType?.startsWith('image/')) return 'image';
  if (ext === PDF_EXT || mimeType === 'application/pdf') return 'pdf';
  if (
    ['doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx', 'csv', 'txt'].includes(ext) ||
    mimeType?.includes('officedocument') ||
    mimeType?.includes('msword') ||
    mimeType?.includes('ms-excel')
  ) {
    return 'office';
  }
  return 'unknown';
}

/* ─── Toast (self-contained, auto-dismiss) ─────────────────── */

function Toast({ message, type = 'success', onDismiss }) {
  const colors = {
    success: 'bg-emerald-50 border-emerald-200 text-emerald-800',
    error: 'bg-red-50 border-red-200 text-red-800',
  };
  const Icon = type === 'success' ? CheckCircle : AlertCircle;

  return (
    <div
      className={`fixed bottom-6 left-1/2 -translate-x-1/2 z-[100] flex items-center gap-2 px-5 py-3 rounded-xl border shadow-lg text-sm font-medium ${colors[type]}`}
    >
      <Icon className="h-4 w-4 flex-shrink-0" />
      {message}
      <button onClick={onDismiss} className="ml-2 opacity-60 hover:opacity-100">
        <X className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════ */
/*  FilePreviewModal                                          */
/* ═══════════════════════════════════════════════════════════ */

export default function FilePreviewModal({
  isOpen,
  onClose,
  fileUrl,
  fileName = '',
  mimeType = '',
}) {
  const [sharing, setSharing] = useState(false);
  const [toast, setToast] = useState(null);

  /* ── Share action ──────────────────────────────────────── */
  const handleShare = useCallback(async () => {
    if (sharing) return;
    setSharing(true);
    setToast(null);

    try {
      const data = await api.post('/documents/generate-link/', {
        file_url: fileUrl,
      });

      const shareUrl = data.share_url;

      // Copy to clipboard
      await navigator.clipboard.writeText(shareUrl);
      setToast({ type: 'success', message: 'Secure link copied! Expires in 7 days.' });
    } catch (err) {
      console.error('Share failed:', err);
      setToast({ type: 'error', message: err.message || 'Failed to generate link.' });
    } finally {
      setSharing(false);
    }
  }, [fileUrl, sharing]);

  /* Auto-dismiss toast after 4s */
  if (toast) {
    setTimeout(() => setToast(null), 4000);
  }

  if (!isOpen) return null;

  const type = resolveType(fileName, mimeType);
  const displayName = fileName || fileUrl?.split('/').pop() || 'Document';

  /* ── Absolute URL (browser needs full path for iframe / img) */
  const fullUrl = fileUrl?.startsWith('http')
    ? fileUrl
    : `${window.location.origin}${fileUrl}`;

  return (
    <>
      {/* ─── Backdrop ──────────────────────────────────── */}
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div
          className="absolute inset-0 bg-black/70 backdrop-blur-sm"
          onClick={onClose}
        />

        {/* ─── Modal Shell ─────────────────────────────── */}
        <div className="relative w-full max-w-5xl bg-white rounded-2xl shadow-2xl max-h-[95vh] flex flex-col overflow-hidden z-10">
          {/* ── Header ─────────────────────────────────── */}
          <div className="flex items-center justify-between border-b border-gray-100 px-6 py-3">
            <h3 className="text-sm font-semibold text-slate-800 truncate max-w-[50%]">
              {displayName}
            </h3>

            <div className="flex items-center gap-2">
              {/* Download */}
              <a
                href={fullUrl}
                download={displayName}
                className="inline-flex items-center gap-1.5 text-xs font-medium text-gray-600 hover:text-brand-600 px-3 py-1.5 rounded-lg hover:bg-brand-50 transition-colors"
              >
                <Download className="h-4 w-4" /> Download
              </a>

              {/* Share */}
              <button
                onClick={handleShare}
                disabled={sharing}
                className="inline-flex items-center gap-1.5 text-xs font-medium text-white bg-brand-600 hover:bg-brand-700 px-3 py-1.5 rounded-lg transition-colors disabled:opacity-60"
              >
                {sharing ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Link2 className="h-4 w-4" />
                )}
                Share
              </button>

              {/* Close */}
              <button
                onClick={onClose}
                className="p-1.5 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
          </div>

          {/* ── Body (render strategy) ─────────────────── */}
          <div className="flex-1 overflow-auto bg-gray-100">
            {type === 'image' && (
              <div className="flex items-center justify-center p-6 min-h-[60vh]">
                <img
                  src={fullUrl}
                  alt={displayName}
                  className="max-w-full max-h-[80vh] rounded-lg shadow-md object-contain"
                />
              </div>
            )}

            {type === 'pdf' && (
              <iframe
                src={fullUrl}
                title={displayName}
                className="w-full h-[80vh] border-0"
              />
            )}

            {type === 'office' && (
              <div className="h-[80vh]">
                <DocViewer
                  documents={[{ uri: fullUrl, fileName: displayName }]}
                  pluginRenderers={DocViewerRenderers}
                  config={{
                    header: { disableHeader: true },
                  }}
                  style={{ height: '100%' }}
                />
              </div>
            )}

            {type === 'unknown' && (
              <div className="flex flex-col items-center justify-center py-20 text-gray-400 gap-3">
                <AlertCircle className="h-12 w-12" />
                <p className="text-sm font-medium">
                  Preview not available for this file type.
                </p>
                <a
                  href={fullUrl}
                  download={displayName}
                  className="text-sm text-brand-600 font-medium hover:underline"
                >
                  Download to view
                </a>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ─── Toast ─────────────────────────────────────── */}
      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onDismiss={() => setToast(null)}
        />
      )}
    </>
  );
}
