import { useState, useEffect, useCallback } from 'react';
import FacebookLogin from '@greatsumini/react-facebook-login';
import {
  Facebook,
  Instagram,
  Loader2,
  CheckCircle2,
  XCircle,
  Unplug,
  Plug,
  Trash2,
  X,
  Globe,
  Image as ImageIcon,
  Share2,
  Copy,
  Link,
  ExternalLink,
  Rss,
} from 'lucide-react';
import api from '../../services/api';

const FB_APP_ID = import.meta.env.VITE_FACEBOOK_APP_ID || '';
const FB_SCOPES = 'public_profile,pages_show_list,pages_read_engagement,pages_manage_posts,instagram_basic,instagram_content_publish,business_management';

const SITE_URL = import.meta.env.VITE_SITE_URL || 'https://dqmotors.ca';
const CATALOG_FEED_URL = `${SITE_URL}/api/inventory/feeds/facebook.csv`;
const GOOGLE_FEED_URL  = `${SITE_URL}/api/inventory/feeds/google.csv`;

export default function AdminSocialSettings() {
  /* ─── state ──────────────────────────────────────────── */
  const [credentials, setCredentials] = useState([]);
  const [loading, setLoading] = useState(true);
  const [connecting, setConnecting] = useState(false);
  const [saving, setSaving] = useState(null); // page_id being saved
  const [pages, setPages] = useState([]);     // pages returned after connect
  const [showModal, setShowModal] = useState(false);
  const [msg, setMsg] = useState(null);       // { type, text }
  const [copied, setCopied] = useState(false);
  const [copiedGoogle, setCopiedGoogle] = useState(false);

  /* ─── fetch connected accounts ───────────────────────── */
  const fetchCredentials = useCallback(async () => {
    try {
      const res = await api.get('/social/credentials/');
      setCredentials(Array.isArray(res) ? res : res.results || []);
    } catch {
      /* silent */
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchCredentials(); }, [fetchCredentials]);

  /* ─── Facebook login success ─────────────────────────── */
  const handleFacebookSuccess = async (response) => {
    const token = response?.accessToken;
    if (!token) return;

    setConnecting(true);
    setMsg(null);

    try {
      // Step A: Send short-lived token to our backend
      const data = await api.post('/social/facebook/connect/', {
        short_lived_token: token,
      });

      if (data.pages && data.pages.length > 0) {
        // Step B: Show page selection modal
        setPages(data.pages);
        setShowModal(true);
      } else {
        setMsg({ type: 'error', text: 'No Facebook Pages found for this account.' });
      }
    } catch (err) {
      const detail = err?.response?.data?.error || err?.message || 'Connection failed.';
      setMsg({ type: 'error', text: typeof detail === 'string' ? detail : 'Connection failed.' });
    } finally {
      setConnecting(false);
    }
  };

  /* ─── Facebook login failure ─────────────────────────── */
  const handleFacebookFail = (error) => {
    console.error('Facebook login failed:', error);
    setMsg({ type: 'error', text: 'Facebook login was cancelled or failed.' });
  };

  /* ─── select & save a page ───────────────────────────── */
  const handleSelectPage = async (page) => {
    setSaving(page.page_id);
    setMsg(null);

    try {
      // Step C: Save the selected page token
      await api.post('/social/facebook/save-page/', {
        page_id: page.page_id,
        page_name: page.page_name,
        page_access_token: page.page_access_token,
        platform: page.platform || 'FACEBOOK',
      });

      setMsg({ type: 'success', text: `"${page.page_name}" connected successfully!` });
      setShowModal(false);
      setPages([]);

      // Step D: Refresh the list
      fetchCredentials();
    } catch (err) {
      const detail = err?.response?.data?.error || err?.message || 'Save failed.';
      setMsg({ type: 'error', text: typeof detail === 'string' ? detail : 'Save failed.' });
    } finally {
      setSaving(null);
    }
  };

  /* ─── disconnect a credential ────────────────────────── */
  const handleDisconnect = async (cred) => {
    if (!window.confirm(`Disconnect "${cred.page_name}"?`)) return;
    try {
      await api.delete(`/social/credentials/${cred.id}/`);
      setMsg({ type: 'success', text: `"${cred.page_name}" disconnected.` });
      fetchCredentials();
    } catch {
      setMsg({ type: 'error', text: 'Failed to disconnect.' });
    }
  };

  /* ═══════════════════ RENDER ═══════════════════════════ */
  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
          <Share2 className="w-7 h-7 text-brand-600" />
          Social Media Settings
        </h1>
        <p className="text-gray-500 text-sm mt-1">
          Connect your social accounts to post directly from the dashboard
        </p>
      </div>

      {/* Feedback message */}
      {msg && (
        <div className={`flex items-center gap-2 px-4 py-3 rounded-xl text-sm font-medium ${
          msg.type === 'success'
            ? 'bg-green-50 text-green-700 border border-green-200'
            : 'bg-red-50 text-red-700 border border-red-200'
        }`}>
          {msg.type === 'success'
            ? <CheckCircle2 className="w-4 h-4 shrink-0" />
            : <XCircle className="w-4 h-4 shrink-0" />}
          {msg.text}
        </div>
      )}

      {/* ── Connect Card ────────────────────────────────── */}
      <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
        <h2 className="text-lg font-semibold text-slate-800 mb-1">Connect Your Social Accounts</h2>
        <p className="text-sm text-gray-500 mb-6">
          Link your Facebook Page to publish inventory posts, promotions, and blog articles directly.
        </p>

        <div className="flex flex-wrap gap-4">
          {/* Facebook Connect Button */}
          {FB_APP_ID ? (
            <FacebookLogin
              appId={FB_APP_ID}
              scope={FB_SCOPES}
              onSuccess={handleFacebookSuccess}
              onFail={handleFacebookFail}
              render={({ onClick }) => (
                <button
                  onClick={onClick}
                  disabled={connecting}
                  className="flex items-center gap-3 bg-[#1877F2] hover:bg-[#166FE5] disabled:opacity-50 text-white px-6 py-3 rounded-xl font-medium transition-colors shadow-sm"
                >
                  {connecting ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    <Facebook className="w-5 h-5" />
                  )}
                  {connecting ? 'Connecting…' : 'Connect Facebook Page'}
                </button>
              )}
            />
          ) : (
            <div className="flex items-center gap-3 bg-gray-100 text-gray-500 px-6 py-3 rounded-xl text-sm">
              <XCircle className="w-5 h-5" />
              <span>
                <strong>VITE_FACEBOOK_APP_ID</strong> is not set. Add it to your <code>.env</code> file.
              </span>
            </div>
          )}

          {/* Instagram placeholder (future) */}
          <button
            disabled
            className="flex items-center gap-3 bg-gradient-to-r from-purple-500 to-pink-500 opacity-40 text-white px-6 py-3 rounded-xl font-medium cursor-not-allowed"
          >
            <Globe className="w-5 h-5" />
            Instagram (Coming Soon)
          </button>
        </div>
      </div>

      {/* ── Connected Accounts ──────────────────────────── */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100">
          <h2 className="text-lg font-semibold text-slate-800 flex items-center gap-2">
            <Plug className="w-5 h-5 text-green-500" />
            Connected Accounts
          </h2>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-6 h-6 animate-spin text-brand-600" />
          </div>
        ) : credentials.length === 0 ? (
          <div className="text-center py-12 text-gray-400">
            <Unplug className="w-10 h-10 mx-auto mb-2 opacity-50" />
            <p className="font-medium text-gray-500">No accounts connected</p>
            <p className="text-sm mt-1">Click "Connect Facebook Page" above to get started</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {credentials.map((cred) => (
              <div
                key={cred.id}
                className="flex items-center justify-between px-6 py-4 hover:bg-gray-50/60 transition-colors"
              >
                <div className="flex items-center gap-4">
                  <div className={`w-11 h-11 rounded-full flex items-center justify-center ${
                    cred.platform === 'INSTAGRAM'
                      ? 'bg-gradient-to-br from-purple-500/10 to-pink-500/10'
                      : 'bg-[#1877F2]/10'
                  }`}>
                    {cred.platform === 'INSTAGRAM'
                      ? <Instagram className="w-6 h-6 text-pink-600" />
                      : <Facebook className="w-6 h-6 text-[#1877F2]" />}
                  </div>
                  <div>
                    <p className="font-medium text-slate-800">{cred.page_name}</p>
                    <p className="text-xs text-gray-400">
                      {cred.platform_display} &middot; Page ID: {cred.page_id}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-green-50 text-green-700">
                    <span className="w-1.5 h-1.5 rounded-full bg-green-500" />
                    Active
                  </span>
                  <button
                    onClick={() => handleDisconnect(cred)}
                    className="p-2 rounded-lg hover:bg-red-50 text-gray-400 hover:text-red-500 transition-colors"
                    title="Disconnect"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── Marketplace & Catalog Feeds ─────────────────── */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100">
          <h2 className="text-lg font-semibold text-slate-800 flex items-center gap-2">
            <Rss className="w-5 h-5 text-brand-600" />
            Marketplace &amp; Catalog Feeds
          </h2>
        </div>

        <div className="px-6 py-5 space-y-5">
          {/* Facebook Automotive Catalog URL */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-700 flex items-center gap-1.5">
              <Facebook className="w-4 h-4 text-[#1877F2]" />
              Facebook Automotive Catalog URL
            </label>
            <div className="flex gap-2">
              <div className="flex-1 flex items-center gap-2 bg-gray-50 border border-gray-200 rounded-xl px-4 py-2.5">
                <Link className="w-4 h-4 text-gray-400 shrink-0" />
                <input
                  readOnly
                  value={CATALOG_FEED_URL}
                  className="flex-1 bg-transparent text-sm text-slate-700 outline-none select-all font-mono"
                  onClick={(e) => e.target.select()}
                />
              </div>
              <button
                onClick={() => {
                  navigator.clipboard.writeText(CATALOG_FEED_URL);
                  setCopied(true);
                  setTimeout(() => setCopied(false), 2000);
                }}
                className={`flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-sm font-medium transition-colors shrink-0 ${
                  copied
                    ? 'bg-green-50 text-green-700 border border-green-200'
                    : 'bg-brand-600 text-white hover:bg-brand-700'
                }`}
              >
                {copied ? (
                  <><CheckCircle2 className="w-4 h-4" /> Copied!</>
                ) : (
                  <><Copy className="w-4 h-4" /> Copy URL</>
                )}
              </button>
            </div>
          </div>

          {/* Instructions */}
          <div className="bg-blue-50/60 border border-blue-100 rounded-xl p-4 text-sm text-blue-800 space-y-2">
            <p className="font-semibold">How to connect to Facebook Marketplace:</p>
            <ol className="list-decimal list-inside space-y-1 text-blue-700">
              <li>Open <a href="https://business.facebook.com/commerce" target="_blank" rel="noopener noreferrer" className="underline font-medium inline-flex items-center gap-0.5">Facebook Commerce Manager <ExternalLink className="w-3 h-3 inline" /></a></li>
              <li>Create or select your <strong>Automotive Inventory</strong> catalog</li>
              <li>Go to <strong>Data Sources → Data Feed</strong></li>
              <li>Choose <strong>Scheduled Feed</strong>, paste the URL above, and set the frequency to <strong>Hourly</strong></li>
              <li>Facebook will automatically sync your READY inventory every hour</li>
            </ol>
            <p className="text-xs text-blue-500 mt-2">Only vehicles with status "Ready" are included. User ads and non-ready vehicles are excluded.</p>
          </div>
        </div>
      </div>

      {/* ── Google Vehicle Ads Feed ─────────────────────── */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100">
          <h2 className="text-lg font-semibold text-slate-800 flex items-center gap-2">
            <Rss className="w-5 h-5 text-[#4285F4]" />
            Google Vehicle Ads Feed
          </h2>
        </div>

        <div className="px-6 py-5 space-y-5">
          {/* Google Merchant Center Feed URL */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-700 flex items-center gap-1.5">
              <Globe className="w-4 h-4 text-[#4285F4]" />
              Google Merchant Center Feed URL
            </label>
            <div className="flex gap-2">
              <div className="flex-1 flex items-center gap-2 bg-gray-50 border border-gray-200 rounded-xl px-4 py-2.5">
                <Link className="w-4 h-4 text-gray-400 shrink-0" />
                <input
                  readOnly
                  value={GOOGLE_FEED_URL}
                  className="flex-1 bg-transparent text-sm text-slate-700 outline-none select-all font-mono"
                  onClick={(e) => e.target.select()}
                />
              </div>
              <button
                onClick={() => {
                  navigator.clipboard.writeText(GOOGLE_FEED_URL);
                  setCopiedGoogle(true);
                  setTimeout(() => setCopiedGoogle(false), 2000);
                }}
                className={`flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-sm font-medium transition-colors shrink-0 ${
                  copiedGoogle
                    ? 'bg-green-50 text-green-700 border border-green-200'
                    : 'bg-[#4285F4] text-white hover:bg-[#3367D6]'
                }`}
              >
                {copiedGoogle ? (
                  <><CheckCircle2 className="w-4 h-4" /> Copied!</>
                ) : (
                  <><Copy className="w-4 h-4" /> Copy URL</>
                )}
              </button>
            </div>
          </div>

          {/* Instructions */}
          <div className="bg-blue-50/60 border border-blue-100 rounded-xl p-4 text-sm text-blue-800 space-y-2">
            <p className="font-semibold">How to connect to Google Vehicle Ads:</p>
            <ol className="list-decimal list-inside space-y-1 text-blue-700">
              <li>Open <a href="https://merchants.google.com" target="_blank" rel="noopener noreferrer" className="underline font-medium inline-flex items-center gap-0.5">Google Merchant Center <ExternalLink className="w-3 h-3 inline" /></a></li>
              <li>Go to <strong>Products → Feeds</strong> and click <strong>+ Add Feed</strong></li>
              <li>Select <strong>Scheduled fetch</strong> and paste the URL above</li>
              <li>Set fetch frequency to <strong>Daily</strong> (or more frequent)</li>
              <li>Once verified, create a <strong>Performance Max</strong> campaign in Google Ads linked to this feed</li>
            </ol>
            <p className="text-xs text-blue-500 mt-2">Only vehicles with status "Ready" are included. The feed uses your VIN as the product ID.</p>
          </div>
        </div>
      </div>

      {/* ── Page Selection Modal ────────────────────────── */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden">
            {/* Modal Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <div>
                <h3 className="text-lg font-semibold text-slate-800">Select Accounts</h3>
                <p className="text-sm text-gray-500">Choose which Facebook Pages / Instagram accounts to connect</p>
              </div>
              <button
                onClick={() => { setShowModal(false); setPages([]); }}
                className="p-2 rounded-lg hover:bg-gray-100 text-gray-400 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Page List */}
            <div className="max-h-80 overflow-y-auto divide-y divide-gray-100">
              {pages.map((page) => {
                const alreadyConnected = credentials.some((c) => c.page_id === page.page_id);

                return (
                  <div
                    key={page.page_id}
                    className="flex items-center justify-between px-6 py-4 hover:bg-gray-50/60 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      {page.platform === 'INSTAGRAM' ? (
                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-500/10 to-pink-500/10 flex items-center justify-center">
                          <Instagram className="w-5 h-5 text-pink-600" />
                        </div>
                      ) : page.picture_url ? (
                        <img
                          src={page.picture_url}
                          alt={page.page_name}
                          className="w-10 h-10 rounded-full object-cover border border-gray-200"
                        />
                      ) : (
                        <div className="w-10 h-10 rounded-full bg-[#1877F2]/10 flex items-center justify-center">
                          <Facebook className="w-5 h-5 text-[#1877F2]" />
                        </div>
                      )}
                      <div>
                        <p className="font-medium text-slate-800">{page.page_name}</p>
                        <p className="text-xs text-gray-400">
                          {page.category || 'Page'} &middot; ID: {page.page_id}
                        </p>
                      </div>
                    </div>

                    {alreadyConnected ? (
                      <span className="text-xs font-medium text-green-600 bg-green-50 px-3 py-1.5 rounded-lg">
                        Connected
                      </span>
                    ) : (
                      <button
                        onClick={() => handleSelectPage(page)}
                        disabled={saving === page.page_id}
                        className="flex items-center gap-1.5 bg-brand-600 hover:bg-brand-700 disabled:opacity-50 text-white px-4 py-2 rounded-xl text-sm font-medium transition-colors"
                      >
                        {saving === page.page_id ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <Plug className="w-4 h-4" />
                        )}
                        {saving === page.page_id ? 'Saving…' : 'Connect'}
                      </button>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Modal Footer */}
            <div className="px-6 py-3 bg-gray-50 border-t border-gray-100 text-right">
              <button
                onClick={() => { setShowModal(false); setPages([]); }}
                className="px-4 py-2 rounded-xl text-sm font-medium text-gray-600 hover:bg-gray-100 transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
