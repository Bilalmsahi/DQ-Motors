import { useState, useEffect, useRef } from 'react';
import {
  Video,
  Upload,
  Sparkles,
  Send,
  Loader2,
  CheckCircle2,
  AlertCircle,
  X,
  Film,
  Instagram,
  Facebook,
} from 'lucide-react';
import api from '../../services/api';

const AdminReelComposer = () => {
  // ── Vehicle selection ──────────────────────────────────
  const [vehicles, setVehicles] = useState([]);
  const [selectedVehicleId, setSelectedVehicleId] = useState('');
  const [selectedVehicle, setSelectedVehicle] = useState(null);

  // ── Video upload ───────────────────────────────────────
  const [videoFile, setVideoFile] = useState(null);
  const [videoPreviewUrl, setVideoPreviewUrl] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [uploadSuccess, setUploadSuccess] = useState(false);
  const fileInputRef = useRef(null);

  // ── Caption & platforms ────────────────────────────────
  const [caption, setCaption] = useState('');
  const [generatingCaption, setGeneratingCaption] = useState(false);
  const [platforms, setPlatforms] = useState({ INSTAGRAM: true, FACEBOOK: true });

  // ── Publishing ─────────────────────────────────────────
  const [publishing, setPublishing] = useState(false);
  const [publishResult, setPublishResult] = useState(null);

  // ── Feedback ───────────────────────────────────────────
  const [error, setError] = useState('');

  // ── Load vehicles on mount ─────────────────────────────
  useEffect(() => {
    const fetchVehicles = async () => {
      try {
        const data = await api.get('/inventory/vehicles/?page_size=200');
        setVehicles(data.results || data || []);
      } catch (err) {
        console.error('Failed to load vehicles:', err);
      }
    };
    fetchVehicles();
  }, []);

  // ── When vehicle selection changes ─────────────────────
  useEffect(() => {
    if (!selectedVehicleId) {
      setSelectedVehicle(null);
      setVideoPreviewUrl(null);
      setUploadSuccess(false);
      return;
    }
    const v = vehicles.find((v) => String(v.id) === String(selectedVehicleId));
    setSelectedVehicle(v || null);

    // If the vehicle already has a video, show the first one
    if (v?.videos?.length) {
      setVideoPreviewUrl(v.videos[0].video);
      setUploadSuccess(true);
      setVideoFile(null);
    } else {
      setVideoPreviewUrl(null);
      setUploadSuccess(false);
    }
  }, [selectedVehicleId, vehicles]);

  // ── Handle file selection ──────────────────────────────
  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const validTypes = ['video/mp4', 'video/quicktime', 'video/x-msvideo', 'video/webm'];
    if (!validTypes.includes(file.type)) {
      setError('Only MP4, MOV, AVI, and WebM files are accepted.');
      return;
    }
    if (file.size > 200 * 1024 * 1024) {
      setError('Video must be under 200 MB.');
      return;
    }

    setError('');
    setVideoFile(file);
    setVideoPreviewUrl(URL.createObjectURL(file));
    setUploadSuccess(false);
  };

  // ── Handle drag & drop ─────────────────────────────────
  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    const file = e.dataTransfer.files?.[0];
    if (file) {
      // Simulate as if the user selected through input
      const dt = new DataTransfer();
      dt.items.add(file);
      if (fileInputRef.current) {
        fileInputRef.current.files = dt.files;
        handleFileChange({ target: { files: dt.files } });
      }
    }
  };

  // ── Upload video to vehicle's videos ──────────────────
  const handleUploadVideo = async () => {
    if (!videoFile || !selectedVehicle) return;
    setError('');
    setUploading(true);

    try {
      const formData = new FormData();
      formData.append('vehicle', selectedVehicle.id);
      formData.append('video', videoFile);

      const newVideo = await api.upload('/inventory/videos/', formData);

      setVideoPreviewUrl(newVideo.video);
      setUploadSuccess(true);
      setVideoFile(null);

      // Update vehicle in the list with the new video appended
      setVehicles((prev) =>
        prev.map((v) =>
          v.id === selectedVehicle.id
            ? { ...v, videos: [...(v.videos || []), newVideo] }
            : v
        )
      );
    } catch (err) {
      setError(err.message || 'Failed to upload video.');
    } finally {
      setUploading(false);
    }
  };

  // ── Generate AI caption ────────────────────────────────
  const handleGenerateCaption = async () => {
    if (!selectedVehicle) return;
    setError('');
    setGeneratingCaption(true);

    try {
      const data = await api.post('/social/generate-reel-caption/', {
        vehicle_id: selectedVehicle.id,
      });
      setCaption(data.caption || '');
    } catch (err) {
      setError(err.message || 'Failed to generate caption.');
    } finally {
      setGeneratingCaption(false);
    }
  };

  // ── Publish reel ───────────────────────────────────────
  const handlePublish = async () => {
    setError('');
    setPublishResult(null);

    const activePlatforms = Object.entries(platforms)
      .filter(([, v]) => v)
      .map(([k]) => k);

    if (!activePlatforms.length) {
      setError('Select at least one platform.');
      return;
    }
    if (!selectedVehicle) {
      setError('Select a vehicle first.');
      return;
    }
    if (!uploadSuccess) {
      setError('Upload a video first.');
      return;
    }
    if (!caption.trim()) {
      setError('Write or generate a caption before publishing.');
      return;
    }

    setPublishing(true);
    try {
      const data = await api.post('/social/post-reel/', {
        vehicle_id: selectedVehicle.id,
        caption,
        platforms: activePlatforms,
      });
      setPublishResult(data);
    } catch (err) {
      setError(err.message || 'Publishing failed.');
    } finally {
      setPublishing(false);
    }
  };

  // ── Clear video ────────────────────────────────────────
  const clearVideo = () => {
    setVideoFile(null);
    setVideoPreviewUrl(null);
    setUploadSuccess(false);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="p-2 bg-brand-100 rounded-xl">
          <Film className="w-6 h-6 text-brand-600" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Create Social Reel</h1>
          <p className="text-sm text-gray-500">Upload a promo video and publish it as an Instagram Reel or Facebook Video</p>
        </div>
      </div>

      {/* Error banner */}
      {error && (
        <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
          <button onClick={() => setError('')} className="ml-auto">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Publishing overlay */}
      {publishing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="bg-white rounded-2xl p-8 max-w-md w-full mx-4 shadow-2xl text-center space-y-4">
            <Loader2 className="w-12 h-12 text-brand-600 animate-spin mx-auto" />
            <h2 className="text-xl font-bold text-slate-800">Publishing…</h2>
            <p className="text-gray-500 text-sm">
              Meta is processing your video. This can take 30–60 seconds.<br />
              <strong>Please do not close this window.</strong>
            </p>
            <div className="w-full bg-gray-200 rounded-full h-1.5 overflow-hidden">
              <div className="h-full bg-brand-600 rounded-full animate-pulse w-3/4" />
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* ═══ LEFT COLUMN: Media ═════════════════════════ */}
        <div className="space-y-5">
          {/* Vehicle selector */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 space-y-4">
            <h2 className="text-lg font-semibold text-slate-800">Select Vehicle</h2>
            <select
              value={selectedVehicleId}
              onChange={(e) => setSelectedVehicleId(e.target.value)}
              className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-brand-600/30 focus:border-brand-600 outline-none"
            >
              <option value="">— Choose a vehicle —</option>
              {vehicles.map((v) => (
                <option key={v.id} value={v.id}>
                  {v.year} {v.make} {v.model} {v.trim ? `(${v.trim})` : ''} — {v.vin}
                </option>
              ))}
            </select>
          </div>

          {/* Video upload / preview */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 space-y-4">
            <h2 className="text-lg font-semibold text-slate-800">Promo Video</h2>

            {videoPreviewUrl ? (
              <div className="space-y-3">
                <div className="relative rounded-xl overflow-hidden bg-black">
                  <video
                    src={videoPreviewUrl}
                    controls
                    className="w-full max-h-80 object-contain"
                  />
                  {!uploadSuccess && (
                    <button
                      onClick={clearVideo}
                      className="absolute top-2 right-2 bg-black/60 text-white rounded-full p-1 hover:bg-black/80 transition"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  )}
                </div>

                {uploadSuccess ? (
                  <div className="flex items-center gap-2 text-green-600 text-sm font-medium">
                    <CheckCircle2 className="w-4 h-4" />
                    Video saved to S3 — ready to publish
                  </div>
                ) : (
                  <button
                    onClick={handleUploadVideo}
                    disabled={uploading || !selectedVehicle}
                    className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-brand-600 text-white rounded-xl font-medium text-sm hover:bg-brand-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {uploading ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Uploading to S3…
                      </>
                    ) : (
                      <>
                        <Upload className="w-4 h-4" />
                        Save Video to Vehicle
                      </>
                    )}
                  </button>
                )}
              </div>
            ) : (
              <div
                onDrop={handleDrop}
                onDragOver={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                }}
                onClick={() => selectedVehicle && fileInputRef.current?.click()}
                className={`border-2 border-dashed rounded-xl p-10 text-center cursor-pointer transition ${
                  selectedVehicle
                    ? 'border-gray-300 hover:border-brand-600 hover:bg-brand-50/30'
                    : 'border-gray-200 bg-gray-50 cursor-not-allowed'
                }`}
              >
                <Video className="w-10 h-10 text-gray-400 mx-auto mb-3" />
                <p className="text-sm text-gray-500 font-medium">
                  {selectedVehicle
                    ? 'Drag & drop an MP4/MOV file here, or click to browse'
                    : 'Select a vehicle first'}
                </p>
                <p className="text-xs text-gray-400 mt-1">Max 200 MB</p>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="video/mp4,video/quicktime,video/x-msvideo,video/webm"
                  onChange={handleFileChange}
                  className="hidden"
                />
              </div>
            )}
          </div>
        </div>

        {/* ═══ RIGHT COLUMN: Content ══════════════════════ */}
        <div className="space-y-5">
          {/* AI Caption */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-slate-800">Caption & Hashtags</h2>
              <button
                onClick={handleGenerateCaption}
                disabled={!selectedVehicle || generatingCaption}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-lg text-xs font-semibold hover:from-purple-600 hover:to-pink-600 transition disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {generatingCaption ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    Generating…
                  </>
                ) : (
                  <>
                    <Sparkles className="w-3.5 h-3.5" />
                    Generate Viral Caption
                  </>
                )}
              </button>
            </div>

            <textarea
              value={caption}
              onChange={(e) => setCaption(e.target.value)}
              rows={10}
              placeholder="Your reel caption will appear here… Click the magic button above or write your own."
              className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm resize-none focus:ring-2 focus:ring-brand-600/30 focus:border-brand-600 outline-none"
            />
            <p className="text-xs text-gray-400 text-right">{caption.length} characters</p>
          </div>

          {/* Platforms */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 space-y-4">
            <h2 className="text-lg font-semibold text-slate-800">Platforms</h2>
            <div className="flex flex-col gap-3">
              <label className="flex items-center gap-3 cursor-pointer group">
                <input
                  type="checkbox"
                  checked={platforms.INSTAGRAM}
                  onChange={(e) =>
                    setPlatforms((p) => ({ ...p, INSTAGRAM: e.target.checked }))
                  }
                  className="w-4 h-4 rounded border-gray-300 text-brand-600 focus:ring-brand-600"
                />
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-yellow-400 via-pink-500 to-purple-600 flex items-center justify-center">
                    <Instagram className="w-4 h-4 text-white" />
                  </div>
                  <span className="text-sm font-medium text-slate-700 group-hover:text-slate-900">
                    Instagram Reels
                  </span>
                </div>
              </label>
              <label className="flex items-center gap-3 cursor-pointer group">
                <input
                  type="checkbox"
                  checked={platforms.FACEBOOK}
                  onChange={(e) =>
                    setPlatforms((p) => ({ ...p, FACEBOOK: e.target.checked }))
                  }
                  className="w-4 h-4 rounded border-gray-300 text-brand-600 focus:ring-brand-600"
                />
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center">
                    <Facebook className="w-4 h-4 text-white" />
                  </div>
                  <span className="text-sm font-medium text-slate-700 group-hover:text-slate-900">
                    Facebook Video
                  </span>
                </div>
              </label>
            </div>
          </div>

          {/* Publish button */}
          <button
            onClick={handlePublish}
            disabled={publishing || !uploadSuccess || !caption.trim()}
            className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-brand-600 text-white rounded-xl font-semibold hover:bg-brand-700 transition disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-brand-200"
          >
            <Send className="w-5 h-5" />
            Publish Reel Now
          </button>

          {/* Publish results */}
          {publishResult && (
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 space-y-3">
              <h3 className="font-semibold text-slate-800">{publishResult.message}</h3>
              {publishResult.results?.map((r, i) => (
                <div
                  key={i}
                  className={`flex items-center gap-2 text-sm p-2 rounded-lg ${
                    r.success ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'
                  }`}
                >
                  {r.success ? (
                    <CheckCircle2 className="w-4 h-4 shrink-0" />
                  ) : (
                    <AlertCircle className="w-4 h-4 shrink-0" />
                  )}
                  <span className="font-medium">{r.page_name}</span>
                  <span className="text-xs opacity-70">({r.platform})</span>
                  {r.error && <span className="ml-auto text-xs">{r.error}</span>}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AdminReelComposer;
