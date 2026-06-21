import { useState } from 'react';

const FALLBACK_IMG = 'https://images.unsplash.com/photo-1552519507-da3b142c6e3d?q=80&w=800&auto=format&fit=crop';

const ImageGallery = ({ images, vehicleTitle }) => {
  const imageList = images?.length ? images : [];
  const [activeImage, setActiveImage] = useState(imageList[0]?.image || FALLBACK_IMG);
  const altText = vehicleTitle || 'Vehicle';

  return (
    <div className="mb-8">
      {/* Main Image */}
      <div className="relative h-[400px] w-full overflow-hidden rounded-xl bg-gray-100 md:h-[500px]">
        <img
          src={activeImage}
          alt={`${altText} - Main Photo`}
          className="h-full w-full object-cover transition-all duration-300"
        />
        {/* Image counter badge */}
        {imageList.length > 1 && (
          <span className="absolute top-4 right-4 rounded-lg bg-black/60 px-3 py-1.5 text-xs font-semibold text-white backdrop-blur-sm">
            {imageList.findIndex((img) => img.image === activeImage) + 1} / {imageList.length}
          </span>
        )}
      </div>

      {/* Thumbnail Strip */}
      {imageList.length > 1 && (
        <div className="mt-3 flex gap-2 overflow-x-auto pb-2">
          {imageList.map((img, idx) => (
            <button
              key={img.id || idx}
              onClick={() => setActiveImage(img.image)}
              className={`flex-shrink-0 h-16 w-20 md:h-20 md:w-24 rounded-lg overflow-hidden border-2 transition-all ${
                activeImage === img.image
                  ? 'border-brand-600 ring-1 ring-brand-600/30'
                  : 'border-transparent opacity-70 hover:opacity-100'
              }`}
            >
              <img
                src={img.image}
                alt={`${altText} - Photo ${idx + 1}`}
                className="h-full w-full object-cover"
              />
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

export default ImageGallery;