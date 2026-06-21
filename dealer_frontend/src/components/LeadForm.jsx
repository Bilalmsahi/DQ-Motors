import { useState } from 'react';
import { Send, CheckCircle, AlertCircle } from 'lucide-react';
import api from '../services/api';

const LeadForm = ({ vehicleId }) => {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    message: 'I am interested in this vehicle. Please contact me.',
  });
  
  const [status, setStatus] = useState('IDLE'); // IDLE, SUBMITTING, SUCCESS, ERROR
  const [errorMessage, setErrorMessage] = useState('');

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setStatus('SUBMITTING');
    setErrorMessage('');

    try {
      // 1. Create (or Find) the Customer
      // Note: In a real app, the backend usually handles "Get or Create" logic in one endpoint.
      // Here, we attempt to create a customer. If email exists, specific backend logic is needed,
      // but for this example, we assume standard creation.
      const customerRes = await api.post('/crm/customers/', {
        name: formData.name,
        email: formData.email,
        phone: formData.phone,
        address: 'Online Inquiry'
      });

      // 2. Create the Lead using the new Customer ID
      await api.post('/crm/leads/', {
        customer: customerRes.id,
        status: 'NEW',
        source: 'WEBSITE',
        notes: `Vehicle Inquiry: ${formData.message}`
        // assigned_to: null (Backend will handle logic or leave null)
      });

      setStatus('SUCCESS');
      setFormData({ name: '', email: '', phone: '', message: '' });

    } catch (error) {
      console.error(error);
      setStatus('ERROR');
      setErrorMessage(error.message || 'Something went wrong. Please try again.');
    }
  };

  if (status === 'SUCCESS') {
    return (
      <div className="rounded-xl bg-green-50 p-8 text-center border border-green-100">
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-green-100">
          <CheckCircle className="h-6 w-6 text-green-600" />
        </div>
        <h3 className="text-lg font-bold text-green-800">Inquiry Sent!</h3>
        <p className="mt-2 text-sm text-green-600">
          Our team will reach out to you shortly regarding this vehicle.
        </p>
        <button 
          onClick={() => setStatus('IDLE')}
          className="mt-6 text-sm font-semibold text-green-700 hover:text-green-800 underline"
        >
          Send another message
        </button>
      </div>
    );
  }

  return (
    <div className="rounded-xl bg-white p-6 shadow-lg border border-gray-100">
      <h3 className="text-xl font-bold text-gray-900">Interested?</h3>
      <p className="mb-6 text-sm text-gray-500">Send us a message and schedule a test drive.</p>

      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <div>
          <label className="mb-1 block text-xs font-medium text-gray-700">Full Name</label>
          <input
            type="text"
            name="name"
            required
            value={formData.name}
            onChange={handleChange}
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
            placeholder="John Doe"
          />
        </div>

        <div>
          <label className="mb-1 block text-xs font-medium text-gray-700">Email Address</label>
          <input
            type="email"
            name="email"
            required
            value={formData.email}
            onChange={handleChange}
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
            placeholder="john@example.com"
          />
        </div>

        <div>
          <label className="mb-1 block text-xs font-medium text-gray-700">Phone Number</label>
          <input
            type="tel"
            name="phone"
            required
            value={formData.phone}
            onChange={handleChange}
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
            placeholder="(555) 000-0000"
          />
        </div>

        <div>
          <label className="mb-1 block text-xs font-medium text-gray-700">Message</label>
          <textarea
            name="message"
            rows="3"
            value={formData.message}
            onChange={handleChange}
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
          ></textarea>
        </div>

        {status === 'ERROR' && (
          <div className="flex items-center gap-2 rounded bg-red-50 p-2 text-xs text-red-600">
            <AlertCircle className="h-4 w-4" />
            <span>{errorMessage}</span>
          </div>
        )}

        <button
          type="submit"
          disabled={status === 'SUBMITTING'}
          className="mt-2 flex items-center justify-center gap-2 rounded-md bg-blue-600 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:bg-blue-400"
        >
          {status === 'SUBMITTING' ? 'Sending...' : 'Send Message'}
          {!status === 'SUBMITTING' && <Send className="h-4 w-4" />}
        </button>
      </form>
    </div>
  );
};

export default LeadForm;