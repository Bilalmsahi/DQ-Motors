import { useState } from 'react';
import { PlayCircle } from 'lucide-react';

const VideoGallery = ({ videos, poster }) => {
  const [activeIdx, setActiveIdx] = useState(0);

  if (!videos?.length) return null;

  const activeVideo = videos[activeIdx];

  return (
    <div className="mb-8 rounded-xl border border-gray-100 bg-white p-6 shadow-sm">
      <h3 className="mb-4 text-lg font-bold text-gray-900">Vehicle Videos</h3>

      {/* Main Player */}
      <div className="relative rounded-xl overflow-hidden bg-black">
        <video
          key={activeVideo.video}
          controls
          preload="metadata"
          poster={poster || undefined}
          className="w-full max-h-[500px]"
        >
          <source src={activeVideo.video} />
          Your browser does not support video playback.
        </video>

        {videos.length > 1 && (
          <span className="absolute top-3 right-3 rounded-lg bg-black/60 px-3 py-1 text-xs font-semibold text-white backdrop-blur-sm">
            {activeIdx + 1} / {videos.length}
          </span>
        )}
      </div>

      {/* Thumbnail Strip — only shown when there are multiple videos */}
      {videos.length > 1 && (
        <div className="mt-3 flex gap-2 overflow-x-auto pb-1">
          {videos.map((v, idx) => (
            <button
              key={v.id || idx}
              type="button"
              onClick={() => setActiveIdx(idx)}
              className={`flex-shrink-0 flex items-center justify-center h-16 w-20 md:h-20 md:w-24
                rounded-lg border-2 bg-gray-900 transition-all
                ${activeIdx === idx
                  ? 'border-[#FF5A00] ring-1 ring-[#FF5A00]/30'
                  : 'border-transparent opacity-60 hover:opacity-100'
                }`}
            >
              <PlayCircle
                className={`h-7 w-7 transition-colors ${activeIdx === idx ? 'text-[#FF5A00]' : 'text-white/70'}`}
              />
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

export default VideoGallery;
