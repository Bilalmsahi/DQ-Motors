import { useState } from 'react';

const ImageGallery = ({ images = [] }) => {
  // Default to the first image or a placeholder
  const [activeImage, setActiveImage] = useState(
    images.length > 0 ? images[0].image : 'https://via.placeholder.com/800x600?text=No+Image'
  );

  if (!images || images.length === 0) {
    return (
      <div className="h-96 w-full bg-gray-200 rounded-lg flex items-center justify-center text-gray-500">
        No Images Available
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      {/* Main Large Image */}
      <div className="relative overflow-hidden rounded-lg bg-gray-100 aspect-video">
        <img 
          src={activeImage} 
          alt="Vehicle Main" 
          className="h-full w-full object-cover transition-all duration-500"
        />
      </div>

      {/* Thumbnails */}
      <div className="flex gap-4 overflow-x-auto pb-2">
        {images.map((img) => (
          <button
            key={img.id}
            onClick={() => setActiveImage(img.image)}
            className={`relative h-20 w-24 flex-shrink-0 overflow-hidden rounded-md border-2 transition ${
              activeImage === img.image ? 'border-blue-600 ring-2 ring-blue-100' : 'border-transparent opacity-70 hover:opacity-100'
            }`}
          >
            <img 
              src={img.image} 
              alt="Thumbnail" 
              className="h-full w-full object-cover"
            />
          </button>
        ))}
      </div>
    </div>
  );
};

export default ImageGallery;