import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Calendar, ArrowRight, Loader2, FileText, Search } from 'lucide-react';
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

export default function Blog() {
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    (async () => {
      try {
        const res = await api.get('/blog/posts/');
        setPosts(res.results || res);
      } catch {
        /* silent */
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const filtered = search.trim()
    ? posts.filter(
        (p) =>
          p.title.toLowerCase().includes(search.toLowerCase()) ||
          (p.focus_keywords || '').toLowerCase().includes(search.toLowerCase())
      )
    : posts;

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <Navbar transparent={false} />

      {/* Hero banner */}
      <section className="bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white py-16">
        <div className="container mx-auto px-6 text-center">
          <h1 className="text-4xl md:text-5xl font-bold mb-3">Our Blog</h1>
          <p className="text-white/70 text-lg max-w-xl mx-auto">
            Tips, guides, and insights from the world of cars &amp; auto deals
          </p>

          {/* Search */}
          <div className="mt-8 max-w-md mx-auto relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search articles…"
              className="w-full pl-12 pr-4 py-3 rounded-xl bg-white/10 backdrop-blur-sm border border-white/20 text-white placeholder-white/50 focus:ring-2 focus:ring-brand-600/40 focus:border-brand-600 outline-none text-sm"
            />
          </div>
        </div>
      </section>

      {/* Posts Grid */}
      <section className="flex-1 container mx-auto px-6 py-12">
        {loading ? (
          <div className="flex items-center justify-center py-24">
            <Loader2 className="w-8 h-8 animate-spin text-brand-600" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-24 text-gray-400">
            <FileText className="w-12 h-12 mx-auto mb-3 opacity-40" />
            <p className="text-lg font-medium text-gray-500">No articles found</p>
            <p className="text-sm mt-1">Check back soon — new posts are on the way!</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
            {filtered.map((post) => (
              <Link
                key={post.id}
                to={`/blog/${post.slug}`}
                className="group bg-white rounded-2xl overflow-hidden shadow-sm border border-gray-100 hover:shadow-lg transition-all duration-300 flex flex-col"
              >
                {/* Image */}
                <div className="relative h-52 bg-gradient-to-br from-slate-100 to-slate-200 overflow-hidden">
                  {post.featured_image ? (
                    <img
                      src={
                        post.featured_image.startsWith('http')
                          ? post.featured_image
                          : `${MEDIA_BASE}${post.featured_image}`
                      }
                      alt={post.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <FileText className="w-12 h-12 text-gray-300" />
                    </div>
                  )}
                </div>

                {/* Body */}
                <div className="p-5 flex flex-col flex-1">
                  {/* Date */}
                  <div className="flex items-center gap-1.5 text-xs text-gray-400 mb-2">
                    <Calendar className="w-3.5 h-3.5" />
                    {fmtDate(post.created_at)}
                  </div>

                  {/* Title */}
                  <h2 className="text-lg font-semibold text-slate-800 line-clamp-2 group-hover:text-brand-600 transition-colors mb-3">
                    {post.title}
                  </h2>

                  {/* Meta description excerpt */}
                  {post.meta_description && (
                    <p className="text-sm text-gray-500 line-clamp-2 mb-4">
                      {post.meta_description}
                    </p>
                  )}

                  {/* Read More */}
                  <div className="mt-auto pt-3 border-t border-gray-100 flex items-center justify-between">
                    <span className="text-sm font-medium text-brand-600 group-hover:gap-2 flex items-center gap-1 transition-all">
                      Read More <ArrowRight className="w-4 h-4" />
                    </span>
                    {post.author_name && (
                      <span className="text-xs text-gray-400">by {post.author_name}</span>
                    )}
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>

      <Footer />
    </div>
  );
}
