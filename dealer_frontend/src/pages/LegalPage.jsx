import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { FileText, Loader2, AlertCircle, ArrowLeft } from 'lucide-react';
import Navbar from '../components/home/Navbar';
import Footer from '../components/home/Footer';
import api from '../services/api';

const DOC_LABELS = {
  privacy_policy: 'Privacy Policy',
  terms_conditions: 'Terms & Conditions',
  return_policy: 'Return Policy',
};

const CLEAN_URLS = {
  PRIVACY_POLICY: '/privacy-policy',
  TERMS_CONDITIONS: '/terms',
  RETURN_POLICY: '/returns',
};

const LegalPage = ({ docType: docTypeProp }) => {
  const { docType: docTypeParam } = useParams();
  const docType = docTypeProp || docTypeParam;     // prop wins, then URL param
  const [doc, setDoc] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchDoc = async () => {
      try {
        setLoading(true);
        setError(null);
        const data = await api.get(`/config/legal/?doc_type=${docType.toUpperCase()}`);
        const list = Array.isArray(data) ? data : data.results ?? [];
        if (list.length > 0) {
          setDoc(list[0]);
        } else {
          setError('Document not found.');
        }
      } catch {
        setError('Failed to load the document.');
      } finally {
        setLoading(false);
      }
    };
    fetchDoc();
  }, [docType]);

  const pageTitle = DOC_LABELS[docType?.toLowerCase()] || docType?.replace(/_/g, ' ') || 'Legal';

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <Navbar />

      <main className="flex-1 w-full max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Breadcrumb */}
        <Link
          to="/"
          className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-brand-600 transition-colors mb-6"
        >
          <ArrowLeft size={14} />
          Back to Home
        </Link>

        {loading ? (
          <div className="flex flex-col items-center justify-center py-24 text-gray-400">
            <Loader2 className="h-8 w-8 animate-spin mb-3" />
            <p className="text-sm">Loading {pageTitle}…</p>
          </div>
        ) : error ? (
          <div className="flex flex-col items-center justify-center py-24 text-gray-400">
            <AlertCircle className="h-8 w-8 mb-3" />
            <p className="text-sm font-medium">{error}</p>
          </div>
        ) : doc ? (
          <article className="rounded-2xl bg-white border border-gray-100 shadow-sm p-6 sm:p-10">
            <div className="flex items-center gap-3 mb-6">
              <FileText className="h-6 w-6 text-brand-600" />
              <h1 className="text-2xl sm:text-3xl font-bold text-slate-800">
                {doc.title || pageTitle}
              </h1>
            </div>
            {doc.last_updated && (
              <p className="text-xs text-gray-400 mb-8">
                Last updated: {new Date(doc.last_updated).toLocaleDateString('en-US', {
                  year: 'numeric', month: 'long', day: 'numeric'
                })}
              </p>
            )}
            {doc.content ? (
              <div
                className="prose prose-slate max-w-none
                  prose-headings:text-slate-800 prose-h1:text-2xl prose-h2:text-xl prose-h3:text-lg
                  prose-p:text-gray-600 prose-strong:text-slate-700 prose-a:text-brand-600
                  prose-li:text-gray-600"
                dangerouslySetInnerHTML={{ __html: doc.content }}
              />
            ) : (
              <p className="text-gray-400 italic">This page has not been published yet.</p>
            )}
          </article>
        ) : null}

        {/* Quick links to other legal pages */}
        <div className="mt-10 flex flex-wrap gap-3 justify-center">
          {Object.entries(CLEAN_URLS).map(([key, url]) => (
            <Link
              key={key}
              to={url}
              className={`text-sm px-4 py-2 rounded-full border transition-colors
                ${key === docType?.toUpperCase()
                  ? 'bg-brand-600 text-white border-brand-600'
                  : 'bg-white text-gray-600 border-gray-200 hover:border-brand-600 hover:text-brand-600'
                }`}
            >
              {DOC_LABELS[key.toLowerCase()] || key}
            </Link>
          ))}
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default LegalPage;
