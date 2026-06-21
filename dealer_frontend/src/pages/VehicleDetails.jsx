import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { FileText, Image, FileCheck, FileWarning, Shield, ClipboardCheck, Wrench, CheckCircle, Calendar, Eye, ArrowLeftRight } from 'lucide-react';
import api from '../services/api';
import FilePreviewModal from '../components/common/FilePreviewModal';

// Components
import Navbar from '../components/home/Navbar';
import Footer from '../components/home/Footer';
import WishlistButton from '../components/common/WishlistButton';

// Detail Components
import ImageGallery from '../components/vehicle-details/ImageGallery';
import VideoGallery from '../components/vehicle-details/VideoGallery';
import ContentTabs from '../components/vehicle-details/ContentTabs';
import Features from '../components/vehicle-details/Features';
import LoanCalculator from '../components/vehicle-details/LoanCalculator';
import PriceCard from '../components/vehicle-details/PriceCard';
import OverviewSidebar from '../components/vehicle-details/OverviewSidebar';
import TestDriveModal from '../components/vehicle-details/TestDriveModal';
import TransparencyTimeline from '../components/vehicle-details/TransparencyTimeline';

/* ── Recommended Cars sidebar widget ──────────────────── */
const PLACEHOLDER_IMG = 'https://images.unsplash.com/photo-1552519507-da3b142c6e3d?q=80&w=400&auto=format&fit=crop';

const RecommendedCars = ({ currentVehicleId }) => {
  const [cars, setCars] = useState([]);

  useEffect(() => {
    (async () => {
      try {
        const res = await api.get(`/inventory/vehicles/recommended/?exclude=${currentVehicleId}`);
        const all = Array.isArray(res) ? res : res.results || [];
        setCars(all.slice(0, 3));
      } catch {
        /* silent */
      }
    })();
  }, [currentVehicleId]);

  if (cars.length === 0) return null;

  return (
    <div className="rounded-xl border border-gray-100 bg-white p-6 shadow-sm">
      <h3 className="mb-4 text-lg font-bold text-gray-900">Recommended Used Cars</h3>
      <div className="space-y-4">
        {cars.map((c) => {
          const img = c.images?.[0]?.image || PLACEHOLDER_IMG;
          return (
            <Link
              key={c.id}
              to={`/vehicles/${c.slug}`}
              className="flex gap-4 group"
            >
              <img
                src={img}
                alt={`${c.year} ${c.make} ${c.model}`}
                className="h-20 w-24 rounded-lg object-cover bg-gray-100"
              />
              <div>
                <h4 className="font-bold text-sm text-gray-900 group-hover:text-brand-600 transition-colors">
                  {c.make} {c.model} {c.year}
                </h4>
                <p className="text-brand-600 font-bold text-sm">
                  ${parseFloat(c.price)?.toLocaleString()}
                </p>
                <p className="text-xs text-gray-400">{c.mileage?.toLocaleString()} km</p>
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
};

const VehicleDetails = () => {
  const { slug } = useParams();
  const [vehicle, setVehicle] = useState(null);
  const [documents, setDocuments] = useState([]);
  const [serviceHistory, setServiceHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isTestDriveModalOpen, setIsTestDriveModalOpen] = useState(false);
  const [previewDoc, setPreviewDoc] = useState(null);

  // Document type configuration
  const DOC_TYPE_CONFIG = {
    INSPECTION: { label: 'Inspection Report', icon: ClipboardCheck, color: 'text-emerald-600' },
    SERVICE_RECORD: { label: 'Service Record', icon: FileCheck, color: 'text-blue-600' },
    OWNERSHIP: { label: 'Ownership Papers', icon: FileText, color: 'text-purple-600' },
    WARRANTY: { label: 'Warranty', icon: Shield, color: 'text-amber-600' },
    CARFAX: { label: 'CARFAX Report', icon: FileWarning, color: 'text-indigo-600' },
    OTHER: { label: 'Document', icon: FileText, color: 'text-gray-600' },
  };

  // Check if file is an image
  const isImageFile = (filename) => {
    if (!filename) return false;
    const imageExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.bmp'];
    const lowerName = filename.toLowerCase();
    return imageExtensions.some(ext => lowerName.endsWith(ext));
  };

  // Service type labels
  const SERVICE_TYPE_LABELS = {
    OIL_CHANGE: 'Oil Change',
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

  // Format date for service history
  const formatServiceDate = (dateStr) => {
    return new Date(dateStr).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  useEffect(() => {
    const fetchVehicle = async () => {
      try {
        const data = await api.get(`/inventory/vehicles/${slug}/`);
        setVehicle(data);
        
        // Fetch public documents for this vehicle
        try {
          const docs = await api.get(`/inventory/documents/?vehicle=${data.id}`);
          setDocuments(docs);
        } catch (docErr) {
          console.log('No documents available');
        }

        // Fetch public service history for this vehicle
        try {
          const history = await api.get(`/financials/vehicle/${data.id}/service-history/`);
          setServiceHistory(history.service_records || []);
        } catch (historyErr) {
          console.log('No service history available');
        }
      } catch (err) {
        setError("Vehicle not found");
      } finally {
        setLoading(false);
      }
    };
    fetchVehicle();
  }, [slug]);

  if (loading) return <div className="flex h-screen items-center justify-center text-brand-600 font-bold">Loading...</div>;
  if (error || !vehicle) return <div className="flex h-screen items-center justify-center text-red-600 font-bold">Vehicle not found</div>;

  // ── SEO: Primary image URL ──────────────────────────
  const primaryImage = vehicle.images?.[0]?.image || '';
  const seoTitle = `${vehicle.year} ${vehicle.make} ${vehicle.model} for Sale | DQ Motors`;
  const seoDescription = vehicle.description
    ? vehicle.description.slice(0, 150)
    : `Browse this ${vehicle.condition?.toLowerCase() || 'used'} ${vehicle.year} ${vehicle.make} ${vehicle.model} at DQ Motors. Priced at $${Number(vehicle.price).toLocaleString()}.`;

  // ── JSON-LD Schema Markup (schema.org/Car) ──────────
  const schemaData = {
    '@context': 'https://schema.org',
    '@type': 'Car',
    name: `${vehicle.year} ${vehicle.make} ${vehicle.model}`,
    image: primaryImage,
    description: vehicle.description || seoDescription,
    brand: { '@type': 'Brand', name: vehicle.make },
    model: vehicle.model,
    vehicleModelDate: String(vehicle.year),
    color: vehicle.color || undefined,
    vehicleIdentificationNumber: vehicle.vin,
    mileageFromOdometer: {
      '@type': 'QuantitativeValue',
      value: vehicle.mileage,
      unitCode: 'KMT',
    },
    offers: {
      '@type': 'Offer',
      priceCurrency: 'CAD',
      price: vehicle.price,
      itemCondition:
        vehicle.condition === 'NEW'
          ? 'https://schema.org/NewCondition'
          : 'https://schema.org/UsedCondition',
      availability: 'https://schema.org/InStock',
    },
  };

  return (
    <div className="min-h-screen bg-gray-50 font-sans text-gray-900">
      {/* ── SEO Meta Tags & JSON-LD ─────────────────── */}
      <Helmet>
        <title>{seoTitle}</title>
        <meta name="description" content={seoDescription} />
        <meta property="og:title" content={seoTitle} />
        <meta property="og:description" content={seoDescription} />
        <meta property="og:image" content={primaryImage} />
        <meta property="og:type" content="product" />
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content={seoTitle} />
        <meta name="twitter:description" content={seoDescription} />
        <meta name="twitter:image" content={primaryImage} />
        <script type="application/ld+json">{JSON.stringify(schemaData)}</script>
      </Helmet>

      <Navbar />

      {/* Breadcrumbs */}
      <div className="container mx-auto px-6 py-6 text-sm text-gray-500">
        <Link to="/" className="hover:text-brand-600">Home</Link> / <Link to="/inventory" className="hover:text-brand-600">Listings</Link> / <span className="text-gray-900">{vehicle.make} {vehicle.model}</span>
      </div>

      <div className="container mx-auto px-6 pb-20">
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
          
          {/* --- LEFT COLUMN (Content) --- */}
          <div className="lg:col-span-2">
            
            <ImageGallery images={vehicle.images} vehicleTitle={`${vehicle.year} ${vehicle.make} ${vehicle.model}`} />

            <VideoGallery videos={vehicle.videos} poster={primaryImage} />

            <ContentTabs />

            {/* Description Section */}
            <div id="description" className="mb-8 scroll-mt-24 rounded-xl border border-gray-100 bg-white p-8 shadow-sm">
                <h3 className="mb-4 text-xl font-bold text-gray-900">Description</h3>
                {vehicle.description ? (
                  <div
                    className="leading-relaxed text-gray-600 prose prose-sm max-w-none"
                    dangerouslySetInnerHTML={{ __html: vehicle.description }}
                  />
                ) : (
                  <p className="leading-relaxed text-gray-600">
                    {vehicle.year} {vehicle.make} {vehicle.model} — {vehicle.condition?.toLowerCase() || 'used'} vehicle
                    with {vehicle.mileage?.toLocaleString()} km. Contact us for more details.
                  </p>
                )}
            </div>

            {/* Transparency Timeline - Comprehensive History */}
            <div className="mb-8">
              <TransparencyTimeline vehicleId={vehicle.id} />
            </div>

            {/* Vehicle History & Documents Section */}
            {documents.length > 0 && (
              <div id="documents" className="mb-8 scroll-mt-24 rounded-xl border border-gray-100 bg-white p-8 shadow-sm">
                <div className="flex items-center gap-3 mb-6">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-100">
                    <FileCheck className="h-5 w-5 text-emerald-600" />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-gray-900">Vehicle History & Documents</h3>
                    <p className="text-sm text-gray-500">Verified documentation for this vehicle</p>
                  </div>
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                  {documents.map((doc) => {
                    const config = DOC_TYPE_CONFIG[doc.doc_type] || DOC_TYPE_CONFIG.OTHER;
                    const IconComponent = isImageFile(doc.file_name) ? Image : config.icon;
                    const iconColor = isImageFile(doc.file_name) ? 'text-pink-600' : config.color;
                    
                    return (
                      <button
                        key={doc.id}
                        onClick={() => setPreviewDoc(doc)}
                        className="group flex items-center gap-4 rounded-xl border border-gray-100 bg-gray-50 p-4 
                          hover:border-brand-600/30 hover:bg-brand-50/50 transition-all text-left w-full"
                      >
                        {/* File Icon */}
                        <div className={`flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-lg 
                          ${isImageFile(doc.file_name) ? 'bg-pink-100' : 'bg-white'} shadow-sm`}>
                          <IconComponent className={`h-6 w-6 ${iconColor}`} />
                        </div>

                        {/* Document Info */}
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold text-gray-900 group-hover:text-brand-600 transition-colors truncate">
                            {doc.title}
                          </p>
                          <p className="text-sm text-gray-500">
                            {config.label} • {isImageFile(doc.file_name) ? 'Image' : 'PDF'}
                          </p>
                        </div>

                        {/* View Icon */}
                        <Eye className="h-5 w-5 text-gray-400 group-hover:text-brand-600 transition-colors flex-shrink-0" />
                      </button>
                    );
                  })}
                </div>

                {/* Trust Badge */}
                <div className="mt-6 flex items-center gap-2 rounded-lg bg-emerald-50 px-4 py-3">
                  <Shield className="h-5 w-5 text-emerald-600" />
                  <p className="text-sm text-emerald-700">
                    All documents are verified and provided by the dealership for your peace of mind.
                  </p>
                </div>
              </div>
            )}

            {/* Service History Section */}
            {serviceHistory.length > 0 && (
              <div id="service-history" className="mb-8 scroll-mt-24 rounded-xl border border-gray-100 bg-white p-8 shadow-sm">
                <div className="flex items-center gap-3 mb-6">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-amber-100">
                    <Wrench className="h-5 w-5 text-amber-600" />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-gray-900">Service History</h3>
                    <p className="text-sm text-gray-500">Verified maintenance records for this vehicle</p>
                  </div>
                </div>

                {/* Service Timeline */}
                <div className="space-y-4">
                  {serviceHistory.map((record) => {
                    const serviceLabel = SERVICE_TYPE_LABELS[record.service_type] || record.service_type_display || 'Service Completed';
                    const description = record.description || serviceLabel;
                    
                    return (
                      <div 
                        key={record.id} 
                        className="flex items-start gap-4 rounded-xl border border-gray-100 bg-gray-50 p-4 hover:bg-gray-100/50 transition-colors"
                      >
                        {/* Date Badge */}
                        <div className="flex flex-col items-center justify-center rounded-lg bg-white px-3 py-2 shadow-sm border border-gray-100 min-w-[70px]">
                          <Calendar className="h-4 w-4 text-gray-400 mb-1" />
                          <span className="text-xs font-semibold text-gray-900">
                            {formatServiceDate(record.date)}
                          </span>
                        </div>

                        {/* Service Info */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <p className="font-semibold text-gray-900">{description}</p>
                            
                            {/* Verified Invoice Badge - shown if invoice exists */}
                            {record.invoice_url && (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 text-xs font-medium">
                                <CheckCircle className="h-3 w-3" />
                                Verified Invoice
                              </span>
                            )}
                          </div>
                          
                          {/* Vendor info if available */}
                          {record.vendor_display && record.vendor_display !== 'N/A' && (
                            <p className="text-sm text-gray-500 mt-1">
                              Performed by <span className="font-medium text-gray-700">{record.vendor_display}</span>
                            </p>
                          )}

                          {/* Before/After Photos - if any */}
                          {record.images && record.images.length > 0 && (
                            <div className="flex gap-2 mt-3">
                              {record.images.slice(0, 4).map((img, idx) => (
                                <button
                                  key={img.id}
                                  onClick={() => setPreviewDoc({
                                    file_url: img.image_url,
                                    file_name: img.caption_display || 'Service photo',
                                    title: img.caption_display || 'Service photo',
                                  })}
                                  className="relative group"
                                >
                                  <img
                                    src={img.image_url}
                                    alt={img.caption_display || 'Service photo'}
                                    className="h-14 w-14 rounded-lg object-cover border border-gray-200 group-hover:ring-2 group-hover:ring-brand-600 transition-all"
                                  />
                                  <span className="absolute bottom-0 left-0 right-0 text-[10px] bg-black/60 text-white text-center py-0.5 rounded-b-lg truncate">
                                    {img.caption_display}
                                  </span>
                                </button>
                              ))}
                              {record.images.length > 4 && (
                                <div className="h-14 w-14 rounded-lg bg-gray-200 flex items-center justify-center text-gray-500 text-xs font-medium">
                                  +{record.images.length - 4}
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Trust Footer */}
                <div className="mt-6 flex items-center gap-2 rounded-lg bg-amber-50 px-4 py-3">
                  <Shield className="h-5 w-5 text-amber-600" />
                  <p className="text-sm text-amber-700">
                    All service records are verified by the dealership. Invoices available upon request.
                  </p>
                </div>
              </div>
            )}

            {/* Features Section */}
            <div className="mb-8">
                <Features features={vehicle.features} />
            </div>

            {/* Calculator Section */}
            <div className="mb-8">
                <LoanCalculator defaultPrice={parseFloat(vehicle.price)} vehicleTitle={`${vehicle.year} ${vehicle.make} ${vehicle.model}`} vehicleId={vehicle.id} />
            </div>

          </div>

          {/* --- RIGHT COLUMN (Sidebar) --- */}
          <div className="lg:col-span-1 space-y-6">
            
            {/* Wishlist Button Card */}
            <div className="flex items-center justify-between rounded-xl border border-gray-100 bg-white p-4 shadow-sm">
              <span className="text-sm font-medium text-gray-600">Save this car</span>
              <WishlistButton vehicleId={vehicle.id} size="lg" />
            </div>
            
            <PriceCard vehicle={vehicle} />
            
            <OverviewSidebar vehicle={vehicle} />
            
            {/* Book Test Drive — Primary CTA */}
            <button
              onClick={() => setIsTestDriveModalOpen(true)}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-brand-600 py-4 text-base font-bold text-white shadow-lg shadow-brand-200 transition hover:bg-[#e04f00]"
            >
              <Calendar className="h-5 w-5" />
              Book a Test Drive
            </button>

            {/* Value Your Trade-In — Secondary CTA */}
            <Link
              to="/trade-in"
              className="flex w-full items-center justify-center gap-2 rounded-xl border-2 border-brand-600 py-4 text-base font-bold text-brand-600 transition hover:bg-brand-50"
            >
              <ArrowLeftRight className="h-5 w-5" />
              Value Your Trade-In
            </Link>

            {/* Recommended Used Cars — fetched from API */}
            <RecommendedCars currentVehicleId={vehicle.id} />

          </div>

        </div>
      </div>

      <Footer />

      {/* Test Drive / Inspection Modal */}
      <TestDriveModal 
        isOpen={isTestDriveModalOpen}
        onClose={() => setIsTestDriveModalOpen(false)}
        vehicle={vehicle}
      />

      {/* File Preview Modal */}
      {previewDoc && (
        <FilePreviewModal
          isOpen={!!previewDoc}
          onClose={() => setPreviewDoc(null)}
          fileUrl={previewDoc.file_url}
          fileName={previewDoc.file_name || previewDoc.title}
          mimeType=""
        />
      )}
    </div>
  );
};

export default VehicleDetails;