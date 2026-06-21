import { useState, useEffect, useCallback } from 'react';
import {
  FileText, Sparkles, Save, Eye, Loader2, AlertCircle,
  Shield, BookOpen, RotateCcw, CheckCircle, ExternalLink
} from 'lucide-react';
import api from '../../services/api';
import {
  PRIVACY_POLICY_TEMPLATE,
  TERMS_CONDITIONS_TEMPLATE,
  RETURN_POLICY_TEMPLATE,
} from '../../constants/legalTemplates';

// ── Tab config ──────────────────────────────────────────────
const TABS = [
  { key: 'PRIVACY_POLICY',    label: 'Privacy Policy',    icon: Shield },
  { key: 'TERMS_CONDITIONS',  label: 'Terms & Conditions', icon: BookOpen },
  { key: 'RETURN_POLICY',     label: 'Return Policy',     icon: RotateCcw },
];

const TEMPLATE_MAP = {
  PRIVACY_POLICY: PRIVACY_POLICY_TEMPLATE,
  TERMS_CONDITIONS: TERMS_CONDITIONS_TEMPLATE,
  RETURN_POLICY: RETURN_POLICY_TEMPLATE,
};

// ════════════════════════════════════════════════════════════
// Main Component
// ════════════════════════════════════════════════════════════
const AdminLegal = () => {
  const [activeTab, setActiveTab] = useState('PRIVACY_POLICY');
  const [docs, setDocs] = useState({});          // { PRIVACY_POLICY: {...}, ... }
  const [content, setContent] = useState('');     // current editor content
  const [title, setTitle] = useState('');
  const [isActive, setIsActive] = useState(true);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [dirty, setDirty] = useState(false);      // unsaved changes

  // ── Fetch all legal docs ──────────────────────────────────
  const fetchDocs = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await api.get('/config/legal/');
      const list = Array.isArray(data) ? data : data.results ?? [];
      const mapped = {};
      list.forEach(d => { mapped[d.doc_type] = d; });
      setDocs(mapped);
      // Load current tab's content
      const current = mapped[activeTab];
      if (current) {
        setContent(current.content || '');
        setTitle(current.title || '');
        setIsActive(current.is_active ?? true);
      }
    } catch (err) {
      setError(err.message || 'Failed to load documents');
    } finally {
      setLoading(false);
    }
  }, []);  // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { fetchDocs(); }, [fetchDocs]);

  // ── Switch tab ────────────────────────────────────────────
  const switchTab = (key) => {
    if (dirty && !window.confirm('You have unsaved changes. Switch anyway?')) return;
    setActiveTab(key);
    setSuccess(null);
    setError(null);
    const doc = docs[key];
    if (doc) {
      setContent(doc.content || '');
      setTitle(doc.title || '');
      setIsActive(doc.is_active ?? true);
    } else {
      setContent('');
      setTitle('');
      setIsActive(true);
    }
    setDirty(false);
  };

  // ── Load template ─────────────────────────────────────────
  const loadTemplate = () => {
    const confirmed = window.confirm(
      'This will replace the current editor content with a standard template.\n\nAny unsaved changes will be lost. Continue?'
    );
    if (!confirmed) return;
    const template = TEMPLATE_MAP[activeTab] || '';
    setContent(template);
    setDirty(true);
    setSuccess(null);
  };

  // ── Save changes ──────────────────────────────────────────
  const saveChanges = async () => {
    const doc = docs[activeTab];
    if (!doc) return;
    try {
      setSaving(true);
      setError(null);
      setSuccess(null);
      const payload = { title, content, is_active: isActive };
      const updated = await api.patch(`/config/legal/${doc.id}/`, payload);
      setDocs(prev => ({ ...prev, [activeTab]: updated }));
      setDirty(false);
      setSuccess('Saved successfully!');
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      setError(err.message || 'Failed to save');
    } finally {
      setSaving(false);
    }
  };

  // ── Derived ───────────────────────────────────────────────
  const currentDoc = docs[activeTab];
  const lastUpdated = currentDoc?.last_updated
    ? new Date(currentDoc.last_updated).toLocaleString()
    : null;

  // ── Render ────────────────────────────────────────────────
  return (
    <div className="space-y-6">
      {/* ── Header ─────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
            <FileText className="h-7 w-7 text-brand-600" />
            Legal &amp; Compliance
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Manage your dealership's legal pages — Privacy, Terms, and Returns.
          </p>
        </div>
        {lastUpdated && (
          <p className="text-xs text-gray-400">
            Last saved: {lastUpdated}
          </p>
        )}
      </div>

      {/* ── Tabs ───────────────────────────────────────────── */}
      <div className="flex gap-1 rounded-xl bg-gray-100 p-1">
        {TABS.map(tab => {
          const Icon = tab.icon;
          const active = activeTab === tab.key;
          return (
            <button
              key={tab.key}
              onClick={() => switchTab(tab.key)}
              className={`flex-1 flex items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-medium transition-all
                ${active
                  ? 'bg-white text-brand-600 shadow-sm'
                  : 'text-gray-500 hover:text-slate-700 hover:bg-gray-50'
                }`}
            >
              <Icon size={16} />
              <span className="hidden sm:inline">{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* ── Content area ───────────────────────────────────── */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-24 text-gray-400">
          <Loader2 className="h-8 w-8 animate-spin mb-3" />
          <p className="text-sm">Loading legal documents…</p>
        </div>
      ) : (
        <div className="rounded-2xl bg-white border border-gray-100 shadow-sm overflow-hidden">
          {/* Action bar */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 border-b border-gray-100 p-4">
            <div className="flex items-center gap-3 flex-wrap">
              {/* Load template button */}
              <button
                onClick={loadTemplate}
                className="inline-flex items-center gap-2 rounded-xl border border-brand-200 bg-brand-50 px-4 py-2.5
                  text-sm font-semibold text-brand-600 hover:bg-brand-100 transition-colors"
              >
                <Sparkles size={16} />
                Load Standard Template
              </button>

              {/* View live page link */}
              <a
                href={{
                  PRIVACY_POLICY: '/privacy-policy',
                  TERMS_CONDITIONS: '/terms',
                  RETURN_POLICY: '/returns',
                }[activeTab] || `/legal/${activeTab.toLowerCase()}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 rounded-xl border border-gray-200 bg-white px-4 py-2.5
                  text-sm font-medium text-slate-700 hover:bg-gray-50 transition-colors"
              >
                <Eye size={16} />
                View Live Page
                <ExternalLink size={12} className="text-gray-400" />
              </a>
            </div>

            <div className="flex items-center gap-3">
              {/* Active toggle */}
              <label className="flex items-center gap-2 text-sm text-slate-700 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={isActive}
                  onChange={(e) => { setIsActive(e.target.checked); setDirty(true); }}
                  className="h-4 w-4 rounded border-gray-300 text-brand-600 focus:ring-brand-200 accent-brand-600"
                />
                Published
              </label>

              {/* Save button */}
              <button
                onClick={saveChanges}
                disabled={saving || !dirty}
                className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-5 py-2.5
                  text-sm font-semibold text-white hover:bg-blue-700 transition-colors
                  disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                {saving ? 'Saving…' : 'Save Changes'}
              </button>
            </div>
          </div>

          {/* Feedback messages */}
          {(error || success) && (
            <div className="px-4 pt-3">
              {error && (
                <div className="flex items-center gap-2 rounded-lg bg-red-50 border border-red-200 px-4 py-2.5 text-sm text-red-600">
                  <AlertCircle size={16} />
                  {error}
                </div>
              )}
              {success && (
                <div className="flex items-center gap-2 rounded-lg bg-emerald-50 border border-emerald-200 px-4 py-2.5 text-sm text-emerald-600">
                  <CheckCircle size={16} />
                  {success}
                </div>
              )}
            </div>
          )}

          {/* Title input */}
          <div className="px-4 pt-4">
            <label className="block text-xs font-medium text-gray-500 mb-1.5">Page Title</label>
            <input
              type="text"
              value={title}
              onChange={(e) => { setTitle(e.target.value); setDirty(true); }}
              placeholder="e.g. Privacy Policy"
              className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-2.5 text-sm text-slate-800
                placeholder-gray-400 focus:border-brand-600 focus:bg-white focus:outline-none
                focus:ring-2 focus:ring-brand-100 transition-all"
            />
          </div>

          {/* Editor */}
          <div className="p-4">
            <label className="block text-xs font-medium text-gray-500 mb-1.5">Content (Markdown / HTML)</label>
            <textarea
              value={content}
              onChange={(e) => { setContent(e.target.value); setDirty(true); }}
              placeholder="Write your legal content here… Use Markdown headings (# Title, ## Section) and formatting (**bold**, *italic*) for structure."
              rows={24}
              className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-slate-800
                font-mono leading-relaxed placeholder-gray-400 resize-y
                focus:border-brand-600 focus:bg-white focus:outline-none
                focus:ring-2 focus:ring-brand-100 transition-all"
              style={{ whiteSpace: 'pre-wrap', tabSize: 4 }}
            />
          </div>

          {/* Preview panel */}
          {content && (
            <div className="border-t border-gray-100 p-4">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-gray-500 mb-3 flex items-center gap-1.5">
                <Eye size={12} />
                Preview
              </h3>
              <div
                className="prose prose-sm prose-slate max-w-none rounded-xl border border-gray-200 bg-white p-6
                  prose-headings:text-slate-800 prose-h1:text-2xl prose-h2:text-lg prose-h3:text-base
                  prose-strong:text-slate-700 prose-a:text-brand-600"
                style={{ whiteSpace: 'pre-wrap' }}
              >
                {/* Render as pre-wrapped text — a Markdown renderer could be added later */}
                {content}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default AdminLegal;
