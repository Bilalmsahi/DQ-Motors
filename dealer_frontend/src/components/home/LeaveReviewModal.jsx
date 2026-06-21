import { useState } from 'react';
import { X, Star } from 'lucide-react';
import api from '../../services/api';

/**
 * LeaveReviewModal
 *
 * A clean modal overlay with a 5-star picker.
 * On submit → POST /api/config/testimonials/ (public, PENDING/WEBSITE)
 */
export default function LeaveReviewModal({ isOpen, onClose }) {
  const [form, setForm] = useState({ customer_name: '', rating: 0, review_text: '' });
  const [hoveredStar, setHoveredStar] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const handleClose = () => {
    // Reset state on close
    setForm({ customer_name: '', rating: 0, review_text: '' });
    setHoveredStar(0);
    setSubmitting(false);
    setSubmitted(false);
    setError('');
    onClose();
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!form.customer_name.trim()) {
      setError('Please enter your name.');
      return;
    }
    if (form.rating < 1) {
      setError('Please select a star rating.');
      return;
    }
    if (!form.review_text.trim()) {
      setError('Please write a short review.');
      return;
    }

    setSubmitting(true);
    try {
      await api.post('/config/testimonials/', {
        customer_name: form.customer_name.trim(),
        rating: form.rating,
        review_text: form.review_text.trim(),
      });
      setSubmitted(true);
    } catch (err) {
      setError(err.message || 'Something went wrong. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={handleClose}
      />

      {/* Modal */}
      <div className="relative w-full max-w-md mx-4 bg-white rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95">
        {/* Header */}
        <div className="flex items-center justify-between px-6 pt-6 pb-2">
          <h2 className="text-xl font-medium text-gray-900">Leave a Review</h2>
          <button
            onClick={handleClose}
            className="p-1 rounded-full text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Success State */}
        {submitted ? (
          <div className="px-6 pb-8 pt-4 text-center">
            <div className="mx-auto w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-4">
              <svg className="w-8 h-8 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Thank You!</h3>
            <p className="text-gray-600 mb-6">
              Your review is pending moderation. We appreciate your feedback!
            </p>
            <button
              onClick={handleClose}
              className="px-6 py-2.5 bg-brand-600 text-white rounded-xl font-semibold hover:bg-[#e04f00] transition"
            >
              Close
            </button>
          </div>
        ) : (
          /* Form */
          <form onSubmit={handleSubmit} className="px-6 pb-6 pt-2 space-y-5">
            {/* Name */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Your Name
              </label>
              <input
                type="text"
                value={form.customer_name}
                onChange={(e) => setForm({ ...form, customer_name: e.target.value })}
                placeholder="John Doe"
                className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-brand-600/20 focus:border-brand-600 outline-none transition"
              />
            </div>

            {/* Star Rating */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Rating
              </label>
              <div className="flex gap-1">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    type="button"
                    onClick={() => setForm({ ...form, rating: star })}
                    onMouseEnter={() => setHoveredStar(star)}
                    onMouseLeave={() => setHoveredStar(0)}
                    className="p-0.5 transition-transform hover:scale-110"
                  >
                    <Star
                      className={`w-8 h-8 transition-colors ${
                        star <= (hoveredStar || form.rating)
                          ? 'fill-brand-600 text-brand-600'
                          : 'fill-gray-200 text-gray-200'
                      }`}
                    />
                  </button>
                ))}
              </div>
            </div>

            {/* Review Text */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Your Review
              </label>
              <textarea
                value={form.review_text}
                onChange={(e) => setForm({ ...form, review_text: e.target.value })}
                rows={4}
                placeholder="Tell us about your experience..."
                className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-brand-600/20 focus:border-brand-600 outline-none transition resize-none"
              />
            </div>

            {/* Error */}
            {error && (
              <p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg">
                {error}
              </p>
            )}

            {/* Submit */}
            <button
              type="submit"
              disabled={submitting}
              className="w-full py-3 bg-brand-600 text-white rounded-xl font-semibold hover:bg-[#e04f00] transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {submitting ? 'Submitting...' : 'Submit Review'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}

