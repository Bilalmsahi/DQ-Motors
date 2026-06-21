import { X, Calendar, Clock, Car, User, MapPin, QrCode, Download, Loader2 } from 'lucide-react';

const TicketModal = ({ isOpen, onClose, appointment }) => {
  if (!isOpen || !appointment) return null;

  const handleDownload = () => {
    if (appointment.qr_code_url) {
      // Open QR code in new tab for download
      window.open(appointment.qr_code_url, '_blank');
    }
  };

  const formatDate = (dateStr) => {
    return new Date(dateStr + 'T00:00:00').toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Ticket Modal */}
      <div className="relative w-full max-w-md bg-white rounded-2xl shadow-2xl overflow-hidden">
        {/* Header with gradient */}
        <div className="bg-gradient-to-r from-brand-600 to-brand-700 px-6 py-5 text-white">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-white/20 rounded-xl">
                <QrCode size={24} />
              </div>
              <div>
                <h2 className="text-lg font-bold">Appointment Ticket</h2>
                <p className="text-brand-100 text-sm">
                  {appointment.appointment_type === 'TEST_DRIVE' ? 'Test Drive' : 'Inspection'}
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 rounded-full hover:bg-white/20 transition"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Ticket Body */}
        <div className="p-6">
          {/* QR Code Section */}
          <div className="bg-gray-50 rounded-xl p-6 mb-6 text-center border-2 border-dashed border-gray-200">
            {appointment.qr_code_url ? (
              <>
                <img
                  src={appointment.qr_code_url}
                  alt="Appointment QR Code"
                  className="w-48 h-48 mx-auto mb-3 rounded-lg shadow-md"
                />
                <p className="text-xs text-gray-500">
                  Present this QR code at check-in
                </p>
              </>
            ) : (
              <div className="py-8">
                <Loader2 className="w-12 h-12 mx-auto text-gray-300 animate-spin mb-3" />
                <p className="text-gray-500 text-sm">QR Code generating...</p>
              </div>
            )}
          </div>

          {/* Appointment Details */}
          <div className="space-y-4">
            {/* Date & Time */}
            <div className="flex items-center gap-4 p-4 bg-brand-50 rounded-xl">
              <Calendar className="h-6 w-6 text-brand-600" />
              <div>
                <p className="text-sm text-gray-500">Date & Time</p>
                <p className="font-semibold text-gray-900">
                  {formatDate(appointment.date)}
                </p>
                <p className="text-brand-700 font-medium">
                  {appointment.time_slot_display || appointment.time_slot}
                </p>
              </div>
            </div>

            {/* Vehicle */}
            <div className="flex items-center gap-4 p-4 bg-gray-50 rounded-xl">
              <Car className="h-6 w-6 text-gray-500" />
              <div className="flex-1">
                <p className="text-sm text-gray-500">Vehicle</p>
                <p className="font-semibold text-gray-900">
                  {appointment.vehicle_title}
                </p>
                {appointment.vehicle_vin && (
                  <p className="text-xs text-gray-400 mt-0.5">
                    VIN: {appointment.vehicle_vin}
                  </p>
                )}
              </div>
              {appointment.vehicle_image && (
                <img
                  src={appointment.vehicle_image}
                  alt={appointment.vehicle_title}
                  className="w-16 h-12 object-cover rounded-lg"
                />
              )}
            </div>

            {/* Status Badge */}
            <div className="flex items-center justify-between p-4 bg-green-50 rounded-xl border border-green-100">
              <div className="flex items-center gap-3">
                <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
                <span className="font-medium text-green-700">
                  {appointment.status_display || appointment.status}
                </span>
              </div>
              <span className="text-xs text-green-600 bg-green-100 px-2 py-1 rounded-full">
                ID: #{appointment.id}
              </span>
            </div>
          </div>

          {/* Actions */}
          <div className="mt-6 flex gap-3">
            <button
              onClick={handleDownload}
              disabled={!appointment.qr_code_url}
              className="flex-1 flex items-center justify-center gap-2 py-3 bg-gray-100 text-gray-700 font-medium rounded-xl hover:bg-gray-200 transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Download size={18} />
              Save QR Code
            </button>
            <button
              onClick={onClose}
              className="flex-1 py-3 bg-brand-600 text-white font-medium rounded-xl hover:bg-brand-700 transition"
            >
              Done
            </button>
          </div>
        </div>

        {/* Decorative Ticket Perforations */}
        <div className="absolute left-0 top-1/3 -translate-x-1/2 w-6 h-6 bg-gray-100 rounded-full"></div>
        <div className="absolute right-0 top-1/3 translate-x-1/2 w-6 h-6 bg-gray-100 rounded-full"></div>
      </div>
    </div>
  );
};

export default TicketModal;
