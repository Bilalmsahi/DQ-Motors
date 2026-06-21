import { useState, useEffect } from 'react';
import {
  Car,
  Wrench,
  ClipboardCheck,
  DollarSign,
  Download,
  CheckCircle,
  Calendar,
  Shield,
  FileText,
  Image as ImageIcon,
  ChevronDown,
  ChevronUp,
  Loader2,
  AlertCircle,
  History
} from 'lucide-react';
import api from '../../services/api';

// Event type configuration with icons and colors
const EVENT_TYPE_CONFIG = {
  'Vehicle Acquired': {
    icon: Car,
    color: 'bg-blue-500',
    bgColor: 'bg-blue-50',
    textColor: 'text-blue-700',
    borderColor: 'border-blue-200',
  },
  'Service Record': {
    icon: Wrench,
    color: 'bg-amber-500',
    bgColor: 'bg-amber-50',
    textColor: 'text-amber-700',
    borderColor: 'border-amber-200',
  },
  'Inspection': {
    icon: ClipboardCheck,
    color: 'bg-emerald-500',
    bgColor: 'bg-emerald-50',
    textColor: 'text-emerald-700',
    borderColor: 'border-emerald-200',
  },
  'Vehicle Sold': {
    icon: DollarSign,
    color: 'bg-purple-500',
    bgColor: 'bg-purple-50',
    textColor: 'text-purple-700',
    borderColor: 'border-purple-200',
  },
};

// Service type labels for display
const SERVICE_TYPE_LABELS = {
  OIL_CHANGE: 'Oil Change & Filter',
  TIRE_ROTATION: 'Tire Rotation',
  TIRE_REPLACEMENT: 'New Tires Installed',
  BRAKE_SERVICE: 'Brake Service',
  TRANSMISSION: 'Transmission Service',
  ENGINE_REPAIR: 'Engine Repair',
  BODY_WORK: 'Body Work',
  PAINT: 'Paint / Touch-up',
  ELECTRICAL: 'Electrical Repair',
  AC_HEATING: 'AC / Heating Service',
  SUSPENSION: 'Suspension Work',
  EXHAUST: 'Exhaust System Service',
  INSPECTION: 'Inspection Completed',
  DETAILING: 'Professional Detailing',
  OTHER: 'Service Completed',
};

/**
 * TransparencyTimeline Component
 * 
 * Displays a comprehensive vehicle history timeline aggregating:
 * - Vehicle acquisition
 * - Service records (with verified invoice badges)
 * - Inspections (with downloadable PDFs)
 * - Sale status
 */
const TransparencyTimeline = ({ vehicleId }) => {
  const [timelineData, setTimelineData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [expandedEvents, setExpandedEvents] = useState({});

  useEffect(() => {
    const fetchTimeline = async () => {
      if (!vehicleId) return;
      
      setLoading(true);
      setError(null);
      
      try {
        const data = await api.get(`/inventory/vehicle/${vehicleId}/history-timeline/`);
        setTimelineData(data);
      } catch (err) {
        console.error('Failed to fetch timeline:', err);
        setError('Unable to load vehicle history');
      } finally {
        setLoading(false);
      }
    };

    fetchTimeline();
  }, [vehicleId]);

  // Format date for display
  const formatDate = (dateStr) => {
    return new Date(dateStr).toLocaleDateString('en-US', {
      month: 'long',
      day: 'numeric',
      year: 'numeric'
    });
  };

  // Toggle event expansion
  const toggleExpand = (eventId) => {
    setExpandedEvents(prev => ({
      ...prev,
      [eventId]: !prev[eventId]
    }));
  };

  // Check if file is an image
  const isImageFile = (filename) => {
    if (!filename) return false;
    const imageExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.bmp'];
    const lowerName = filename.toLowerCase();
    return imageExtensions.some(ext => lowerName.endsWith(ext));
  };

  // Render loading state
  if (loading) {
    return (
      <div className="rounded-xl border border-gray-100 bg-white p-8 shadow-sm">
        <div className="flex items-center justify-center gap-3 py-12">
          <Loader2 className="h-6 w-6 animate-spin text-brand-600" />
          <span className="text-gray-600 font-medium">Loading vehicle history...</span>
        </div>
      </div>
    );
  }

  // Render error state
  if (error) {
    return (
      <div className="rounded-xl border border-gray-100 bg-white p-8 shadow-sm">
        <div className="flex items-center justify-center gap-3 py-12 text-gray-500">
          <AlertCircle className="h-6 w-6" />
          <span>{error}</span>
        </div>
      </div>
    );
  }

  // Render empty state
  if (!timelineData || timelineData.events.length === 0) {
    return (
      <div className="rounded-xl border border-gray-100 bg-white p-8 shadow-sm">
        <div className="flex flex-col items-center justify-center gap-3 py-12 text-gray-500">
          <History className="h-10 w-10 text-gray-300" />
          <p className="text-center">No history available for this vehicle yet.</p>
        </div>
      </div>
    );
  }

  return (
    <div id="history" className="scroll-mt-24 rounded-xl border border-gray-100 bg-white p-8 shadow-sm">
      {/* Header */}
      <div className="flex items-center gap-3 mb-8">
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br from-brand-600 to-brand-400 shadow-lg">
          <History className="h-6 w-6 text-white" />
        </div>
        <div>
          <h3 className="text-xl font-bold text-gray-900">Transparency Report</h3>
          <p className="text-sm text-gray-500">
            Complete history with {timelineData.total_events} verified events
          </p>
        </div>
      </div>

      {/* Timeline */}
      <div className="relative">
        {/* Vertical Line */}
        <div className="absolute left-6 top-0 bottom-0 w-0.5 bg-gradient-to-b from-gray-200 via-gray-300 to-gray-200" />

        {/* Events */}
        <div className="space-y-6">
          {timelineData.events.map((event) => {
            const config = EVENT_TYPE_CONFIG[event.event_type] || EVENT_TYPE_CONFIG['Service Record'];
            const IconComponent = config.icon;
            const isExpanded = expandedEvents[event.id];
            const hasDetails = event.description || (event.images && event.images.length > 0) || event.file_url;
            const displayTitle = event.service_type 
              ? SERVICE_TYPE_LABELS[event.service_type] || event.service_type_display || event.title
              : event.title;

            return (
              <div key={event.id} className="relative pl-16">
                {/* Timeline Node */}
                <div className={`absolute left-4 -translate-x-1/2 flex h-5 w-5 items-center justify-center rounded-full 
                  ${config.color} ring-4 ring-white shadow-md`}>
                  <div className="h-2 w-2 rounded-full bg-white" />
                </div>

                {/* Event Card */}
                <div className={`rounded-xl border ${config.borderColor} ${config.bgColor} p-5 
                  hover:shadow-md transition-all duration-200`}>
                  
                  {/* Event Header */}
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-start gap-3 flex-1 min-w-0">
                      {/* Icon */}
                      <div className={`flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg 
                        bg-white shadow-sm border ${config.borderColor}`}>
                        <IconComponent className={`h-5 w-5 ${config.textColor}`} />
                      </div>

                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          {/* Title */}
                          <h4 className="font-semibold text-gray-900">{displayTitle}</h4>
                          
                          {/* Verified Invoice Badge */}
                          {event.invoice_url && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full 
                              bg-emerald-100 text-emerald-700 text-xs font-medium">
                              <CheckCircle className="h-3 w-3" />
                              Verified
                            </span>
                          )}

                          {/* Event Type Badge */}
                          <span className={`inline-flex items-center px-2 py-0.5 rounded-full 
                            ${config.bgColor} ${config.textColor} text-xs font-medium border ${config.borderColor}`}>
                            {event.event_type}
                          </span>
                        </div>

                        {/* Date */}
                        <div className="flex items-center gap-1 mt-1 text-sm text-gray-500">
                          <Calendar className="h-3.5 w-3.5" />
                          <span>{formatDate(event.date)}</span>
                        </div>
                      </div>
                    </div>

                    {/* Expand Button (if has details) */}
                    {hasDetails && (
                      <button
                        onClick={() => toggleExpand(event.id)}
                        className="flex h-8 w-8 items-center justify-center rounded-lg 
                          bg-white hover:bg-gray-50 border border-gray-200 transition-colors"
                      >
                        {isExpanded 
                          ? <ChevronUp className="h-4 w-4 text-gray-600" />
                          : <ChevronDown className="h-4 w-4 text-gray-600" />
                        }
                      </button>
                    )}
                  </div>

                  {/* Expanded Details */}
                  {isExpanded && hasDetails && (
                    <div className="mt-4 pt-4 border-t border-gray-200/50 space-y-4">
                      {/* Description */}
                      {event.description && (
                        <p className="text-sm text-gray-600 leading-relaxed">
                          {event.description}
                        </p>
                      )}

                      {/* Document Download (for Inspections) */}
                      {event.file_url && (
                        <a
                          href={event.file_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg 
                            bg-white border border-gray-200 text-sm font-medium text-gray-700
                            hover:border-brand-600 hover:text-brand-600 transition-colors"
                        >
                          {isImageFile(event.file_name) 
                            ? <ImageIcon className="h-4 w-4" />
                            : <FileText className="h-4 w-4" />
                          }
                          <span>Download {event.file_name || 'Document'}</span>
                          <Download className="h-4 w-4 ml-1" />
                        </a>
                      )}

                      {/* Service Photos */}
                      {event.images && event.images.length > 0 && (
                        <div>
                          <p className="text-xs font-medium text-gray-500 mb-2 uppercase tracking-wide">
                            Service Photos
                          </p>
                          <div className="flex gap-2 flex-wrap">
                            {event.images.map((img) => (
                              <a
                                key={img.id}
                                href={img.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="relative group"
                              >
                                <img
                                  src={img.url}
                                  alt={img.caption_display || 'Service photo'}
                                  className="h-16 w-16 rounded-lg object-cover border border-gray-200 
                                    group-hover:ring-2 group-hover:ring-brand-600 transition-all"
                                />
                                {img.caption_display && (
                                  <span className="absolute bottom-0 left-0 right-0 text-[10px] 
                                    bg-black/60 text-white text-center py-0.5 rounded-b-lg truncate">
                                    {img.caption_display}
                                  </span>
                                )}
                              </a>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Trust Footer */}
      <div className="mt-8 flex items-center gap-3 rounded-xl bg-gradient-to-r from-emerald-50 to-teal-50 px-5 py-4 border border-emerald-100">
        <Shield className="h-6 w-6 text-emerald-600 flex-shrink-0" />
        <div>
          <p className="text-sm font-medium text-emerald-800">
            Verified Vehicle History
          </p>
          <p className="text-xs text-emerald-600">
            All records are verified by the dealership. Documents and invoices available upon request.
          </p>
        </div>
      </div>
    </div>
  );
};

export default TransparencyTimeline;
