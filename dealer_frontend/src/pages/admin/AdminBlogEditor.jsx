import { useState, useEffect, useCallback } from 'react';
import {
  PenSquare,
  Sparkles,
  Loader2,
  Save,
  Eye,
  FileText,
  Search,
  Trash2,
  ChevronDown,
  ChevronUp,
  Plus,
  Clock,
  Image as ImageIcon,
  Type,
  Hash,
  AlignLeft,
  Globe,
  CheckCircle2,
  XCircle,
  ArrowLeft,
} from 'lucide-react';
import api from '../../services/api';

/* ─── helpers ───────────────────────────────────────────── */
function slugify(text) {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
    .slice(0, 250);
}

function fmtDate(iso) {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export default function AdminBlogEditor() {
  /* ─── view state ─────────────────────────────────────── */
  const [view, setView] = useState('list'); // 'list' | 'editor'
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState('ALL');

  /* ─── editor state ───────────────────────────────────── */
  const [editingId, setEditingId] = useState(null);
  const [topic, setTopic] = useState('');
  const [title, setTitle] = useState('');
  const [slug, setSlug] = useState('');
  const [content, setContent] = useState('');
  const [featuredImage, setFeaturedImage] = useState(null);
  const [existingImage, setExistingImage] = useState('');
  const [statusField, setStatusField] = useState('DRAFT');
  const [metaTitle, setMetaTitle] = useState('');
  const [metaDescription, setMetaDescription] = useState('');
  const [focusKeywords, setFocusKeywords] = useState('');
  const [saving, setSaving] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [saveMsg, setSaveMsg] = useState(null);
  const [showPreview, setShowPreview] = useState(false);
  const [showSeo, setShowSeo] = useState(true);

  /* ─── fetch posts ────────────────────────────────────── */
  const fetchPosts = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get('/blog/posts/');
      setPosts(res.results || res);
    } catch {
      /* silent */
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchPosts(); }, [fetchPosts]);

  /* ─── reset editor ───────────────────────────────────── */
  const resetEditor = () => {
    setEditingId(null);
    setTopic('');
    setTitle('');
    setSlug('');
    setContent('');
    setFeaturedImage(null);
    setExistingImage('');
    setStatusField('DRAFT');
    setMetaTitle('');
    setMetaDescription('');
    setFocusKeywords('');
    setSaveMsg(null);
    setShowPreview(false);
  };

  /* ─── open editor for new post ───────────────────────── */
  const openNew = () => {
    resetEditor();
    setView('editor');
  };

  /* ─── open editor for existing post ──────────────────── */
  const openEdit = (post) => {
    resetEditor();
    setEditingId(post.slug);
    setTitle(post.title || '');
    setSlug(post.slug || '');
    setContent(post.content || '');
    setStatusField(post.status || 'DRAFT');
    setMetaTitle(post.meta_title || '');
    setMetaDescription(post.meta_description || '');
    setFocusKeywords(post.focus_keywords || '');
    setExistingImage(post.featured_image || '');
    setView('editor');
  };

  /* ─── AI generate ────────────────────────────────────── */
  const handleGenerate = async () => {
    if (!topic.trim()) return;
    setGenerating(true);
    setSaveMsg(null);
    try {
      const res = await api.post('/blog/posts/generate/', { topic: topic.trim() });
      setTitle(res.title || '');
      setSlug(slugify(res.title || topic));
      setContent(res.html_content || '');
      setMetaTitle(res.meta_title || '');
      setMetaDescription(res.meta_description || '');
      setFocusKeywords(res.keywords || '');
    } catch {
      setSaveMsg({ type: 'error', text: 'AI generation failed. Please try again.' });
    } finally {
      setGenerating(false);
    }
  };

  /* ─── save / update ──────────────────────────────────── */
  const handleSave = async () => {
    if (!title.trim()) {
      setSaveMsg({ type: 'error', text: 'Title is required.' });
      return;
    }
    setSaving(true);
    setSaveMsg(null);

    try {
      const fd = new FormData();
      fd.append('title', title);
      fd.append('content', content);
      fd.append('status', statusField);
      fd.append('meta_title', metaTitle);
      fd.append('meta_description', metaDescription);
      fd.append('focus_keywords', focusKeywords);
      if (featuredImage) fd.append('featured_image', featuredImage);

      if (editingId) {
        await api.uploadPatch(`/blog/posts/${editingId}/`, fd);
        setSaveMsg({ type: 'success', text: 'Post updated successfully!' });
      } else {
        await api.upload('/blog/posts/', fd);
        setSaveMsg({ type: 'success', text: 'Post created successfully!' });
      }

      fetchPosts();
    } catch (err) {
      const detail = err?.response?.data?.detail || err?.message || 'Save failed.';
      setSaveMsg({ type: 'error', text: typeof detail === 'string' ? detail : 'Save failed.' });
    } finally {
      setSaving(false);
    }
  };

  /* ─── delete ─────────────────────────────────────────── */
  const handleDelete = async (slug) => {
    if (!window.confirm('Delete this post permanently?')) return;
    try {
      await api.delete(`/blog/posts/${slug}/`);
      fetchPosts();
    } catch {
      /* silent */
    }
  };

  /* ─── auto-slug from title ───────────────────────────── */
  const handleTitleChange = (val) => {
    setTitle(val);
    if (!editingId) setSlug(slugify(val));
  };

  /* ─── filtered posts ─────────────────────────────────── */
  const filtered = filterStatus === 'ALL'
    ? posts
    : posts.filter((p) => p.status === filterStatus);

  const publishedCount = posts.filter((p) => p.status === 'PUBLISHED').length;
  const draftCount = posts.filter((p) => p.status === 'DRAFT').length;

  /* ═══════════════════ RENDER ═══════════════════════════ */

  /* ─── LIST VIEW ──────────────────────────────────────── */
  if (view === 'list') {
    return (
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
              <PenSquare className="w-7 h-7 text-brand-600" />
              Blog Manager
            </h1>
            <p className="text-gray-500 text-sm mt-1">Create AI-powered blog posts & manage content</p>
          </div>
          <button
            onClick={openNew}
            className="flex items-center gap-2 bg-brand-600 hover:bg-brand-700 text-white px-5 py-2.5 rounded-xl font-medium transition-colors shadow-sm"
          >
            <Plus className="w-4 h-4" /> New Post
          </button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-blue-50 rounded-xl"><FileText className="w-5 h-5 text-blue-600" /></div>
              <div>
                <p className="text-2xl font-bold text-slate-800">{posts.length}</p>
                <p className="text-xs text-gray-500">Total Posts</p>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-green-50 rounded-xl"><CheckCircle2 className="w-5 h-5 text-green-600" /></div>
              <div>
                <p className="text-2xl font-bold text-slate-800">{publishedCount}</p>
                <p className="text-xs text-gray-500">Published</p>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-yellow-50 rounded-xl"><Clock className="w-5 h-5 text-yellow-600" /></div>
              <div>
                <p className="text-2xl font-bold text-slate-800">{draftCount}</p>
                <p className="text-xs text-gray-500">Drafts</p>
              </div>
            </div>
          </div>
        </div>

        {/* Filter */}
        <div className="flex gap-2">
          {['ALL', 'PUBLISHED', 'DRAFT'].map((s) => (
            <button
              key={s}
              onClick={() => setFilterStatus(s)}
              className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                filterStatus === s
                  ? 'bg-brand-600 text-white'
                  : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'
              }`}
            >
              {s === 'ALL' ? 'All' : s === 'PUBLISHED' ? 'Published' : 'Drafts'}
            </button>
          ))}
        </div>

        {/* Table */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          {loading ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="w-6 h-6 animate-spin text-brand-600" />
            </div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-16 text-gray-400">
              <FileText className="w-10 h-10 mx-auto mb-2 opacity-50" />
              <p className="font-medium">No posts found</p>
              <p className="text-sm mt-1">Click "New Post" to get started</p>
            </div>
          ) : (
            <table className="w-full block md:table text-left">
              <thead className="hidden md:table-header-group bg-gray-50/80">
                <tr>
                  <th className="px-5 py-3 text-xs font-semibold text-gray-500 uppercase">Title</th>
                  <th className="px-5 py-3 text-xs font-semibold text-gray-500 uppercase">Status</th>
                  <th className="px-5 py-3 text-xs font-semibold text-gray-500 uppercase">Author</th>
                  <th className="px-5 py-3 text-xs font-semibold text-gray-500 uppercase">Created</th>
                  <th className="px-5 py-3 text-xs font-semibold text-gray-500 uppercase text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="block md:table-row-group">
                {filtered.map((post) => (
                  <tr key={post.id} className="block md:table-row bg-white border border-gray-200 md:border-b md:border-x-0 md:border-t-0 rounded-xl md:rounded-none mb-4 md:mb-0 shadow-sm md:shadow-none p-4 md:p-0 hover:bg-gray-50/60 transition-colors">
                    <td className="flex justify-between items-center md:table-cell py-3 md:py-4 md:px-5 border-b border-gray-100 md:border-0 last:border-0 text-sm">
                      <span className="md:hidden font-semibold text-gray-500">Title</span>
                      <div className="text-right md:text-left">
                        <p className="font-medium text-slate-800 line-clamp-1">{post.title}</p>
                        <p className="text-xs text-gray-400 mt-0.5">/{post.slug}</p>
                      </div>
                    </td>
                    <td className="flex justify-between items-center md:table-cell py-3 md:py-4 md:px-5 border-b border-gray-100 md:border-0 last:border-0 text-sm">
                      <span className="md:hidden font-semibold text-gray-500">Status</span>
                      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${
                        post.status === 'PUBLISHED'
                          ? 'bg-green-50 text-green-700'
                          : 'bg-yellow-50 text-yellow-700'
                      }`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${
                          post.status === 'PUBLISHED' ? 'bg-green-500' : 'bg-yellow-500'
                        }`} />
                        {post.status_display || post.status}
                      </span>
                    </td>
                    <td className="flex justify-between items-center md:table-cell py-3 md:py-4 md:px-5 border-b border-gray-100 md:border-0 last:border-0 text-sm">
                      <span className="md:hidden font-semibold text-gray-500">Author</span>
                      <span className="text-gray-600">{post.author_name || '—'}</span>
                    </td>
                    <td className="flex justify-between items-center md:table-cell py-3 md:py-4 md:px-5 border-b border-gray-100 md:border-0 last:border-0 text-sm">
                      <span className="md:hidden font-semibold text-gray-500">Created</span>
                      <span className="text-gray-500">{fmtDate(post.created_at)}</span>
                    </td>
                    <td className="flex justify-end gap-2 mt-2 md:mt-0 pt-2 md:pt-0 border-t border-gray-100 md:border-0 md:table-cell md:py-4 md:px-5 text-sm w-full md:w-auto">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => openEdit(post)}
                          className="p-2 rounded-lg hover:bg-brand-50 text-gray-400 hover:text-brand-600 transition-colors"
                          title="Edit"
                        >
                          <PenSquare className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(post.slug)}
                          className="p-2 rounded-lg hover:bg-red-50 text-gray-400 hover:text-red-500 transition-colors"
                          title="Delete"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    );
  }

  /* ─── EDITOR VIEW ────────────────────────────────────── */
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button
            onClick={() => { resetEditor(); setView('list'); }}
            className="p-2 rounded-lg hover:bg-gray-100 text-gray-500 transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-slate-800">
              {editingId ? 'Edit Post' : 'Create New Post'}
            </h1>
            <p className="text-gray-500 text-sm">
              {editingId ? 'Update your blog post' : 'Use AI to auto-generate or write manually'}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowPreview(!showPreview)}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium border transition-colors ${
              showPreview
                ? 'bg-blue-50 border-blue-200 text-blue-700'
                : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'
            }`}
          >
            <Eye className="w-4 h-4" /> Preview
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-2 bg-brand-600 hover:bg-brand-700 disabled:opacity-50 text-white px-5 py-2 rounded-xl font-medium transition-colors shadow-sm"
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            {saving ? 'Saving…' : 'Save Post'}
          </button>
        </div>
      </div>

      {/* Save feedback */}
      {saveMsg && (
        <div className={`flex items-center gap-2 px-4 py-3 rounded-xl text-sm font-medium ${
          saveMsg.type === 'success'
            ? 'bg-green-50 text-green-700 border border-green-200'
            : 'bg-red-50 text-red-700 border border-red-200'
        }`}>
          {saveMsg.type === 'success' ? <CheckCircle2 className="w-4 h-4" /> : <XCircle className="w-4 h-4" />}
          {saveMsg.text}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* ── Main column (2/3) ─────────────────────────── */}
        <div className="lg:col-span-2 space-y-5">
          {/* AI Generator Card */}
          {!editingId && (
            <div className="bg-gradient-to-r from-brand-50 to-amber-50 rounded-2xl p-5 border border-brand-100">
              <h3 className="text-sm font-semibold text-slate-700 flex items-center gap-2 mb-3">
                <Sparkles className="w-4 h-4 text-brand-600" /> AI Blog Generator
              </h3>
              <div className="flex gap-3">
                <input
                  type="text"
                  value={topic}
                  onChange={(e) => setTopic(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && !generating && handleGenerate()}
                  placeholder="e.g., Best SUVs for Families in 2025"
                  className="flex-1 px-4 py-2.5 rounded-xl border border-brand-200 bg-white text-sm focus:ring-2 focus:ring-brand-600/20 focus:border-brand-600 outline-none"
                />
                <button
                  onClick={handleGenerate}
                  disabled={generating || !topic.trim()}
                  className="flex items-center gap-2 bg-brand-600 hover:bg-brand-700 disabled:opacity-50 text-white px-5 py-2.5 rounded-xl font-medium text-sm transition-colors whitespace-nowrap"
                >
                  {generating ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      AI is writing…
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4" />
                      Auto-Generate Post
                    </>
                  )}
                </button>
              </div>
              {generating && (
                <p className="text-xs text-brand-700 mt-2 animate-pulse">
                  ✨ AI is writing your article… This may take 10-20 seconds.
                </p>
              )}
            </div>
          )}

          {/* Title */}
          <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100 space-y-4">
            <div>
              <label className="text-sm font-medium text-slate-700 flex items-center gap-1.5 mb-1.5">
                <Type className="w-3.5 h-3.5 text-gray-400" /> Title
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => handleTitleChange(e.target.value)}
                placeholder="Enter post title…"
                className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm focus:ring-2 focus:ring-brand-600/20 focus:border-brand-600 outline-none"
              />
            </div>
            <div>
              <label className="text-sm font-medium text-slate-700 flex items-center gap-1.5 mb-1.5">
                <Globe className="w-3.5 h-3.5 text-gray-400" /> Slug
              </label>
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-400">/blog/</span>
                <input
                  type="text"
                  value={slug}
                  onChange={(e) => setSlug(e.target.value)}
                  placeholder="auto-generated-slug"
                  className="flex-1 px-4 py-2.5 rounded-xl border border-gray-200 text-sm focus:ring-2 focus:ring-brand-600/20 focus:border-brand-600 outline-none bg-gray-50"
                  readOnly={!!editingId}
                />
              </div>
            </div>
          </div>

          {/* Content */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="flex items-center justify-between px-5 py-3 border-b border-gray-100 bg-gray-50/60">
              <label className="text-sm font-medium text-slate-700 flex items-center gap-1.5">
                <AlignLeft className="w-3.5 h-3.5 text-gray-400" /> Content (HTML)
              </label>
              <span className="text-xs text-gray-400">{content.length.toLocaleString()} chars</span>
            </div>
            {showPreview ? (
              <div
                className="prose prose-sm max-w-none p-5 min-h-[350px]"
                dangerouslySetInnerHTML={{ __html: content }}
              />
            ) : (
              <textarea
                value={content}
                onChange={(e) => setContent(e.target.value)}
                rows={18}
                placeholder="Write HTML content or use AI to generate…"
                className="w-full px-5 py-4 text-sm font-mono text-slate-700 resize-y focus:outline-none min-h-[350px]"
              />
            )}
          </div>
        </div>

        {/* ── Sidebar column (1/3) ─────────────────────── */}
        <div className="space-y-5">
          {/* Publish Settings */}
          <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
            <h3 className="text-sm font-semibold text-slate-700 mb-4">Publish Settings</h3>
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">Status</span>
              <button
                onClick={() => setStatusField(statusField === 'DRAFT' ? 'PUBLISHED' : 'DRAFT')}
                className={`relative inline-flex h-7 w-14 items-center rounded-full transition-colors ${
                  statusField === 'PUBLISHED' ? 'bg-green-500' : 'bg-gray-300'
                }`}
              >
                <span
                  className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition-transform ${
                    statusField === 'PUBLISHED' ? 'translate-x-8' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>
            <p className="text-xs text-gray-400 mt-2">
              {statusField === 'PUBLISHED'
                ? '✅ This post will be visible to the public.'
                : '📝 Saved as draft — not yet visible.'}
            </p>
          </div>

          {/* Featured Image */}
          <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
            <h3 className="text-sm font-semibold text-slate-700 flex items-center gap-1.5 mb-3">
              <ImageIcon className="w-3.5 h-3.5 text-gray-400" /> Featured Image
            </h3>
            {(existingImage || featuredImage) && (
              <div className="mb-3 rounded-xl overflow-hidden border border-gray-100">
                <img
                  src={featuredImage ? URL.createObjectURL(featuredImage) : existingImage}
                  alt="Featured"
                  className="w-full h-36 object-cover"
                />
              </div>
            )}
            <label className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border-2 border-dashed border-gray-200 hover:border-brand-600 cursor-pointer transition-colors text-sm text-gray-500 hover:text-brand-600">
              <ImageIcon className="w-4 h-4" />
              {featuredImage ? featuredImage.name : 'Upload image'}
              <input
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => {
                  if (e.target.files?.[0]) setFeaturedImage(e.target.files[0]);
                }}
              />
            </label>
          </div>

          {/* SEO Panel */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
            <button
              onClick={() => setShowSeo(!showSeo)}
              className="w-full flex items-center justify-between px-5 py-4 hover:bg-gray-50/60 transition-colors"
            >
              <h3 className="text-sm font-semibold text-slate-700 flex items-center gap-1.5">
                <Search className="w-3.5 h-3.5 text-gray-400" /> SEO Settings
              </h3>
              {showSeo ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
            </button>
            {showSeo && (
              <div className="px-5 pb-5 space-y-4 border-t border-gray-100 pt-4">
                {/* Meta Title */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-xs font-medium text-slate-600">Meta Title</label>
                    <span className={`text-xs ${metaTitle.length > 60 ? 'text-red-500' : 'text-gray-400'}`}>
                      {metaTitle.length}/60
                    </span>
                  </div>
                  <input
                    type="text"
                    value={metaTitle}
                    onChange={(e) => setMetaTitle(e.target.value)}
                    maxLength={60}
                    placeholder="SEO page title…"
                    className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm focus:ring-2 focus:ring-brand-600/20 focus:border-brand-600 outline-none"
                  />
                </div>

                {/* Meta Description */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-xs font-medium text-slate-600">Meta Description</label>
                    <span className={`text-xs ${metaDescription.length > 160 ? 'text-red-500' : 'text-gray-400'}`}>
                      {metaDescription.length}/160
                    </span>
                  </div>
                  <textarea
                    value={metaDescription}
                    onChange={(e) => setMetaDescription(e.target.value)}
                    maxLength={160}
                    rows={3}
                    placeholder="Brief page description for search engines…"
                    className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm focus:ring-2 focus:ring-brand-600/20 focus:border-brand-600 outline-none resize-none"
                  />
                </div>

                {/* Keywords */}
                <div>
                  <label className="text-xs font-medium text-slate-600 flex items-center gap-1 mb-1.5">
                    <Hash className="w-3 h-3" /> Focus Keywords
                  </label>
                  <input
                    type="text"
                    value={focusKeywords}
                    onChange={(e) => setFocusKeywords(e.target.value)}
                    placeholder="keyword1, keyword2, keyword3"
                    className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm focus:ring-2 focus:ring-brand-600/20 focus:border-brand-600 outline-none"
                  />
                </div>

                {/* Google Preview */}
                {(metaTitle || title) && (
                  <div className="mt-3 p-3 bg-gray-50 rounded-lg border border-gray-100">
                    <p className="text-xs text-gray-400 mb-1">Google Preview</p>
                    <p className="text-blue-700 text-sm font-medium line-clamp-1">
                      {metaTitle || title}
                    </p>
                    <p className="text-green-700 text-xs">
                      dqmotors.ca/{slug || 'post-url'}
                    </p>
                    <p className="text-xs text-gray-500 line-clamp-2 mt-0.5">
                      {metaDescription || 'No description set.'}
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
