import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Calendar, ArrowLeft, User, Tag, Loader2, FileText } from 'lucide-react';
import Navbar from '../components/home/Navbar';
import Footer from '../components/home/Footer';
import api from '../services/api';

const MEDIA_BASE = import.meta.env.VITE_API_BASE_URL?.replace('/api', '') || 'http://127.0.0.1:8000';

function fmtDate(iso) {
  if (!iso) return '';
  return new Date(iso).toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });
}

/* ── SEO helpers (native DOM, no extra dependency) ──────── */
function setMeta(name, content) {
  if (!content) return;
  let el = document.querySelector(`meta[name="${name}"]`);
  if (!el) {
    el = document.createElement('meta');
    el.setAttribute('name', name);
    document.head.appendChild(el);
  }
  el.setAttribute('content', content);
}

function setOgMeta(property, content) {
  if (!content) return;
  let el = document.querySelector(`meta[property="${property}"]`);
  if (!el) {
    el = document.createElement('meta');
    el.setAttribute('property', property);
    document.head.appendChild(el);
  }
  el.setAttribute('content', content);
}

export default function BlogPost() {
  const { slug } = useParams();
  const [post, setPost] = useState(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    (async () => {
      setLoading(true);
      setNotFound(false);
      try {
        const detail = await api.get(`/blog/posts/${slug}/`);
        setPost(detail);
      } catch {
        setNotFound(true);
      } finally {
        setLoading(false);
      }
    })();
  }, [slug]);

  /* ── Inject SEO meta tags ────────────────────────────── */
  useEffect(() => {
    if (!post) return;

    const prevTitle = document.title;
    document.title = post.meta_title || post.title || 'Blog';

    setMeta('description', post.meta_description);
    setMeta('keywords', post.focus_keywords);
    setOgMeta('og:title', post.meta_title || post.title);
    setOgMeta('og:description', post.meta_description);
    setOgMeta('og:type', 'article');
    if (post.featured_image) {
      const imgUrl = post.featured_image.startsWith('http')
        ? post.featured_image
        : `${MEDIA_BASE}${post.featured_image}`;
      setOgMeta('og:image', imgUrl);
    }

    return () => {
      document.title = prevTitle;
    };
  }, [post]);

  /* ── Loading ─────────────────────────────────────────── */
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col">
        <Navbar transparent={false} />
        <div className="flex-1 flex items-center justify-center">
          <Loader2 className="w-8 h-8 animate-spin text-brand-600" />
        </div>
        <Footer />
      </div>
    );
  }

  /* ── Not found ───────────────────────────────────────── */
  if (notFound || !post) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col">
        <Navbar transparent={false} />
        <div className="flex-1 flex flex-col items-center justify-center text-center px-6">
          <FileText className="w-14 h-14 text-gray-300 mb-4" />
          <h1 className="text-2xl font-bold text-slate-800 mb-2">Post Not Found</h1>
          <p className="text-gray-500 mb-6">The article you're looking for doesn't exist or has been removed.</p>
          <Link
            to="/blog"
            className="flex items-center gap-2 bg-brand-600 hover:bg-brand-700 text-white px-6 py-2.5 rounded-xl font-medium transition-colors"
          >
            <ArrowLeft className="w-4 h-4" /> Back to Blog
          </Link>
        </div>
        <Footer />
      </div>
    );
  }

  /* ── image URL ───────────────────────────────────────── */
  const imgUrl = post.featured_image
    ? post.featured_image.startsWith('http')
      ? post.featured_image
      : `${MEDIA_BASE}${post.featured_image}`
    : null;

  /* ── keywords array ──────────────────────────────────── */
  const keywords = (post.focus_keywords || '')
    .split(',')
    .map((k) => k.trim())
    .filter(Boolean);

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <Navbar transparent={false} />

      {/* Hero / Featured Image */}
      {imgUrl ? (
        <div className="relative h-72 md:h-96 bg-slate-900">
          <img
            src={imgUrl}
            alt={post.title}
            className="w-full h-full object-cover opacity-60"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-slate-900/80 to-transparent" />
          <div className="absolute bottom-0 left-0 right-0 container mx-auto px-6 pb-10">
            <div className="flex items-center gap-3 text-white/70 text-sm mb-3">
              <span className="flex items-center gap-1.5">
                <Calendar className="w-4 h-4" /> {fmtDate(post.created_at)}
              </span>
              {post.author_name && (
                <span className="flex items-center gap-1.5">
                  <User className="w-4 h-4" /> {post.author_name}
                </span>
              )}
            </div>
            <h1 className="text-3xl md:text-4xl font-bold text-white max-w-3xl leading-tight">
              {post.title}
            </h1>
          </div>
        </div>
      ) : (
        <section className="bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white py-16">
          <div className="container mx-auto px-6">
            <div className="flex items-center gap-3 text-white/70 text-sm mb-3">
              <span className="flex items-center gap-1.5">
                <Calendar className="w-4 h-4" /> {fmtDate(post.created_at)}
              </span>
              {post.author_name && (
                <span className="flex items-center gap-1.5">
                  <User className="w-4 h-4" /> {post.author_name}
                </span>
              )}
            </div>
            <h1 className="text-3xl md:text-4xl font-bold max-w-3xl leading-tight">
              {post.title}
            </h1>
          </div>
        </section>
      )}

      {/* Content */}
      <article className="flex-1 container mx-auto px-6 py-12">
        <div className="max-w-3xl mx-auto">
          {/* Back link */}
          <Link
            to="/blog"
            className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-brand-600 transition-colors mb-8"
          >
            <ArrowLeft className="w-4 h-4" /> Back to all articles
          </Link>

          {/* Article body */}
          <div
            className="prose prose-lg max-w-none prose-headings:text-slate-800 prose-a:text-brand-600 prose-img:rounded-xl"
            dangerouslySetInnerHTML={{ __html: post.content }}
          />

          {/* Keywords / Tags */}
          {keywords.length > 0 && (
            <div className="mt-10 pt-6 border-t border-gray-200">
              <div className="flex flex-wrap items-center gap-2">
                <Tag className="w-4 h-4 text-gray-400" />
                {keywords.map((kw) => (
                  <span
                    key={kw}
                    className="px-3 py-1 bg-gray-100 text-gray-600 rounded-full text-xs font-medium"
                  >
                    {kw}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Author card */}
          {post.author_name && (
            <div className="mt-8 p-5 bg-white rounded-2xl border border-gray-100 shadow-sm flex items-center gap-4">
              <div className="w-12 h-12 rounded-full bg-brand-600/10 flex items-center justify-center">
                <User className="w-6 h-6 text-brand-600" />
              </div>
              <div>
                <p className="font-semibold text-slate-800">{post.author_name}</p>
                <p className="text-sm text-gray-500">Author</p>
              </div>
            </div>
          )}
        </div>
      </article>

      <Footer />
    </div>
  );
}
