import { useState, useEffect } from 'react';
import { useSearchParams, useLocation } from 'react-router-dom';
import { 
  MapPin, Phone, Mail, Clock, Send, CheckCircle, AlertCircle,
  MessageSquare
} from 'lucide-react';
import Navbar from '../components/home/Navbar';
import Footer from '../components/home/Footer';
import api from '../services/api';

const ContactUs = () => {
  const [searchParams] = useSearchParams();
  const location = useLocation();
  const [form, setForm] = useState({
    name: '',
    email: '',
    phone: '',
    subject: 'General',
    message: '',
  });

  // Pre-fill from URL query params (e.g. from Loan Calculator)
  // or from navigation state (e.g. from ServicesSection links)
  useEffect(() => {
    const subject = searchParams.get('subject') || location.state?.subject;
    const message = searchParams.get('message') || location.state?.message;
    if (subject || message) {
      setForm((prev) => ({
        ...prev,
        ...(subject ? { subject } : {}),
        ...(message ? { message } : {}),
      }));
    }
  }, [searchParams, location.state]);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');

  const handleChange = (e) => {
    setForm(prev => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess(false);

    if (!form.name || !form.email || !form.message) {
      setError('Please fill in all required fields.');
      return;
    }

    try {
      setSubmitting(true);
      await api.post('/crm/leads/', {
        name: form.name,
        email: form.email,
        phone: form.phone,
        source: 'WEBSITE',
        lead_type: 'GENERAL_INQUIRY',
        status: 'NEW',
        notes: `[${form.subject}] ${form.message}`,
      });
      setSuccess(true);
      setForm({ name: '', email: '', phone: '', subject: 'General', message: '' });
    } catch (err) {
      console.error('Failed to submit contact form:', err);
      setError('Something went wrong. Please try again later.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar transparent={false} />

      {/* Hero Banner */}
      <div className="bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white">
        <div className="container mx-auto px-6 sm:px-8 lg:px-12 py-16 md:py-20 text-center">
          <h1 className="text-4xl md:text-5xl font-bold mb-3">Get in Touch</h1>
          <p className="text-lg text-gray-300 max-w-xl mx-auto">
            Have a question or want to schedule a visit? We'd love to hear from you.
          </p>
        </div>
      </div>

      {/* Main Content */}
      <div className="container mx-auto px-6 sm:px-8 lg:px-12 py-12 md:py-16">
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-8 lg:gap-12">

          {/* ========== LEFT SIDE: Contact Info ========== */}
          <div className="lg:col-span-2 space-y-8">
            <div>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">Contact Information</h2>
              <p className="text-gray-500">Reach out through any of these channels or fill out the form.</p>
            </div>

            {/* Info Cards */}
            <div className="space-y-5">
              <div className="flex items-start gap-4">
                <div className="flex-shrink-0 h-11 w-11 rounded-xl bg-brand-100 flex items-center justify-center">
                  <MapPin size={20} className="text-brand-600" />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900">Our Address</h3>
                  <p className="text-sm text-gray-500 mt-0.5">123 Dealership Blvd, Suite 100<br/>Houston, TX 77001</p>
                </div>
              </div>

              <div className="flex items-start gap-4">
                <div className="flex-shrink-0 h-11 w-11 rounded-xl bg-brand-100 flex items-center justify-center">
                  <Phone size={20} className="text-brand-600" />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900">Phone</h3>
                  <a href="tel:+18001234567" className="text-sm text-brand-600 hover:underline mt-0.5 block">
                    +1 (800) 123-4567
                  </a>
                </div>
              </div>

              <div className="flex items-start gap-4">
                <div className="flex-shrink-0 h-11 w-11 rounded-xl bg-brand-100 flex items-center justify-center">
                  <Mail size={20} className="text-brand-600" />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900">Email</h3>
                  <a href="mailto:info@dqmotors.com" className="text-sm text-brand-600 hover:underline mt-0.5 block">
                    info@dqmotors.com
                  </a>
                </div>
              </div>

              <div className="flex items-start gap-4">
                <div className="flex-shrink-0 h-11 w-11 rounded-xl bg-brand-100 flex items-center justify-center">
                  <Clock size={20} className="text-brand-600" />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900">Working Hours</h3>
                  <p className="text-sm text-gray-500 mt-0.5">
                    Mon – Fri: 9:00 AM – 6:00 PM<br/>
                    Sat: 10:00 AM – 4:00 PM<br/>
                    Sun: Closed
                  </p>
                </div>
              </div>
            </div>

            {/* Map Placeholder */}
            <div className="rounded-2xl overflow-hidden border border-gray-200 bg-gray-100 h-56 flex items-center justify-center">
              <iframe
                title="Dealership Location"
                src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3464.123456!2d-95.3698!3d29.7604!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x0%3A0x0!2zMjnCsDQ1JzM3LjQiTiA5NcKwMjInMTEuMyJX!5e0!3m2!1sen!2sus!4v1"
                className="w-full h-full border-0"
                allowFullScreen=""
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
              />
            </div>
          </div>

          {/* ========== RIGHT SIDE: Contact Form ========== */}
          <div className="lg:col-span-3">
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 sm:p-8 lg:p-10">
              <h2 className="text-2xl font-bold text-gray-900 mb-1 flex items-center gap-2">
                <MessageSquare size={24} className="text-brand-600" />
                Send Us a Message
              </h2>
              <p className="text-gray-500 mb-6">Fill out the form below and a representative will get back to you shortly.</p>

              {/* Success Message */}
              {success && (
                <div className="mb-6 flex items-center gap-3 bg-green-50 border border-green-200 text-green-700 rounded-xl p-4">
                  <CheckCircle size={20} className="flex-shrink-0" />
                  <div>
                    <p className="font-semibold">Message sent successfully!</p>
                    <p className="text-sm">Thanks! A sales representative has been notified and will contact you soon.</p>
                  </div>
                </div>
              )}

              {/* Error Message */}
              {error && (
                <div className="mb-6 flex items-center gap-3 bg-red-50 border border-red-200 text-red-700 rounded-xl p-4">
                  <AlertCircle size={20} className="flex-shrink-0" />
                  <p className="font-medium">{error}</p>
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-5">
                {/* Name & Email Row */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Full Name <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      name="name"
                      value={form.name}
                      onChange={handleChange}
                      placeholder="John Doe"
                      className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-brand-600 focus:border-transparent transition"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Email <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="email"
                      name="email"
                      value={form.email}
                      onChange={handleChange}
                      placeholder="john@example.com"
                      className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-brand-600 focus:border-transparent transition"
                      required
                    />
                  </div>
                </div>

                {/* Phone & Subject Row */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
                    <input
                      type="tel"
                      name="phone"
                      value={form.phone}
                      onChange={handleChange}
                      placeholder="+1 (555) 000-0000"
                      className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-brand-600 focus:border-transparent transition"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Subject</label>
                    <select
                      name="subject"
                      value={form.subject}
                      onChange={handleChange}
                      className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-brand-600 focus:border-transparent bg-white transition"
                    >
                      <option value="General">General Inquiry</option>
                      <option value="Sales">Sales</option>
                      <option value="Service">Service</option>
                    </select>
                  </div>
                </div>

                {/* Message */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Message <span className="text-red-500">*</span>
                  </label>
                  <textarea
                    name="message"
                    value={form.message}
                    onChange={handleChange}
                    placeholder="How can we help you?"
                    rows={5}
                    className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-brand-600 focus:border-transparent transition resize-none"
                    required
                  />
                </div>

                {/* Submit Button */}
                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full flex items-center justify-center gap-2 bg-brand-600 text-white py-3 rounded-xl font-semibold hover:bg-[#e65100] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {submitting ? (
                    <>
                      <div className="h-5 w-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      Sending...
                    </>
                  ) : (
                    <>
                      <Send size={18} />
                      Send Message
                    </>
                  )}
                </button>
              </form>
            </div>
          </div>
        </div>
      </div>

      <Footer />
    </div>
  );
};

export default ContactUs;
