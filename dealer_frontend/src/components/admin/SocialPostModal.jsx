import { useState, useEffect } from 'react';
import {
  X,
  Facebook,
  Loader2,
  CheckCircle2,
  XCircle,
  ImageOff,
  Send,
  ChevronDown,
} from 'lucide-react';
import api from '../../services/api';

/**
 * SocialPostModal
 *
 * Props:
 *   vehicle  – The vehicle object { id, year, make, model, price, mileage, color, images, ... }
 *   onClose  – () => void
 */
export default function SocialPostModal({ vehicle, onClose }) {
  const [credentials, setCredentials] = useState([]);
  const [selectedCred, setSelectedCred] = useState(null);
  const [caption, setCaption] = useState('');
  const [posting, setPosting] = useState(false);
  const [result, setResult] = useState(null); // { type, text }
  const [loadingCreds, setLoadingCreds] = useState(true);

  // Build default caption
  useEffect(() => {
    if (vehicle) {
      const price = Number(vehicle.price).toLocaleString('en-US', {
        style: 'currency',
        currency: 'USD',
        minimumFractionDigits: 0,
      });
      const mileage = Number(vehicle.mileage).toLocaleString('en-US');
      let text = `🚗 Check out this ${vehicle.year} ${vehicle.make} ${vehicle.model}!\n\n`;
      text += `💰 Price: ${price}\n`;
      text += `📏 Mileage: ${mileage} mi\n`;
      if (vehicle.color) text += `🎨 Color: ${vehicle.color}\n`;
      text += `\n🔗 View details on our website!`;
      setCaption(text);
    }
  }, [vehicle]);

  // Fetch connected credentials
  useEffect(() => {
    (async () => {
      try {
        const res = await api.get('/social/credentials/');
        const list = Array.isArray(res) ? res : res.results || [];
        setCredentials(list);
        if (list.length > 0) setSelectedCred(list[0]);
      } catch {
        /* silent */
      } finally {
        setLoadingCreds(false);
      }
    })();
  }, []);

  const handlePost = async () => {
    if (!selectedCred) return;
    setPosting(true);
    setResult(null);

    try {
      const data = await api.post('/social/post-now/', {
        vehicle_id: vehicle.id,
        credential_id: selectedCred.id,
        custom_caption: caption,
      });
      setResult({ type: 'success', text: data.message || 'Posted successfully!' });
    } catch (err) {
      const detail = err?.response?.data?.error || err?.message || 'Posting failed.';
      setResult({ type: 'error', text: typeof detail === 'string' ? detail : 'Posting failed.' });
    } finally {
      setPosting(false);
    }
  };

  // First image
  const imgSrc = vehicle?.images?.[0]?.image || null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 shrink-0">
          <div>
            <h3 className="text-lg font-semibold text-slate-800 flex items-center gap-2">
              <Facebook className="w-5 h-5 text-[#1877F2]" />
              Post to Facebook
            </h3>
            <p className="text-sm text-gray-500">
              {vehicle.year} {vehicle.make} {vehicle.model}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-gray-100 text-gray-400 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">
          {/* Preview image */}
          <div className="rounded-xl overflow-hidden border border-gray-100 bg-gray-50 h-48">
            {imgSrc ? (
              <img
                src={imgSrc}
                alt={`${vehicle.year} ${vehicle.make} ${vehicle.model}`}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full flex flex-col items-center justify-center text-gray-300">
                <ImageOff className="w-10 h-10 mb-1" />
                <span className="text-sm">No image available</span>
              </div>
            )}
          </div>

          {/* Select page / credential */}
          <div>
            <label className="text-sm font-medium text-slate-700 mb-1.5 block">Post to Page</label>
            {loadingCreds ? (
              <div className="flex items-center gap-2 text-gray-400 text-sm py-2">
                <Loader2 className="w-4 h-4 animate-spin" /> Loading connected pages…
              </div>
            ) : credentials.length === 0 ? (
              <div className="flex items-center gap-2 px-4 py-3 rounded-xl bg-yellow-50 border border-yellow-200 text-yellow-700 text-sm">
                <XCircle className="w-4 h-4 shrink-0" />
                No pages connected. Go to Social Media Settings to connect a Facebook Page first.
              </div>
            ) : (
              <div className="relative">
                <select
                  value={selectedCred?.id || ''}
                  onChange={(e) => {
                    const c = credentials.find((cr) => cr.id === Number(e.target.value));
                    setSelectedCred(c || null);
                  }}
                  className="w-full appearance-none px-4 py-2.5 pr-10 rounded-xl border border-gray-200 text-sm focus:ring-2 focus:ring-brand-600/20 focus:border-brand-600 outline-none bg-white"
                >
                  {credentials.map((cred) => (
                    <option key={cred.id} value={cred.id}>
                      {cred.page_name} ({cred.platform_display})
                    </option>
                  ))}
                </select>
                <ChevronDown className="w-4 h-4 text-gray-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              </div>
            )}
          </div>

          {/* Caption */}
          <div>
            <label className="text-sm font-medium text-slate-700 mb-1.5 block">Caption</label>
            <textarea
              value={caption}
              onChange={(e) => setCaption(e.target.value)}
              rows={6}
              placeholder="Write your post caption…"
              className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm focus:ring-2 focus:ring-brand-600/20 focus:border-brand-600 outline-none resize-none"
            />
            <p className="text-xs text-gray-400 mt-1">{caption.length} characters</p>
          </div>

          {/* Result */}
          {result && (
            <div className={`flex items-center gap-2 px-4 py-3 rounded-xl text-sm font-medium ${
              result.type === 'success'
                ? 'bg-green-50 text-green-700 border border-green-200'
                : 'bg-red-50 text-red-700 border border-red-200'
            }`}>
              {result.type === 'success'
                ? <CheckCircle2 className="w-4 h-4 shrink-0" />
                : <XCircle className="w-4 h-4 shrink-0" />}
              {result.text}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-100 flex items-center justify-end gap-3 shrink-0">
          <button
            onClick={onClose}
            className="px-4 py-2.5 rounded-xl border border-gray-200 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
          >
            {result?.type === 'success' ? 'Done' : 'Cancel'}
          </button>
          {result?.type !== 'success' && (
            <button
              onClick={handlePost}
              disabled={posting || !selectedCred || credentials.length === 0}
              className="flex items-center gap-2 bg-[#1877F2] hover:bg-[#166FE5] disabled:opacity-50 text-white px-5 py-2.5 rounded-xl font-medium text-sm transition-colors"
            >
              {posting ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Send className="w-4 h-4" />
              )}
              {posting ? 'Posting…' : 'Post to Facebook'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
